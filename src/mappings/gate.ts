/* eslint-disable prefer-const */
import { loadOrNewInstrument, loadOrNewInstrumentSetting } from '../entities/instrument';
import { loadOrNewBase, loadOrNewQuote } from '../entities/config';
import { InstrumentContract } from '../../generated/templates';
import {
    createDepositEvent,
    createGatherEvent,
    createNewInstrumentEvent,
    createScatterEvent,
    createSetPendingDurationEvent,
    createSetThresholdEvent,
    createUpdatePendingEvent,
    createWithdrawEvent,
} from '../entities/event';
import { NEG_ONE, ONE, PENDING_STATUS_RELEASED, SYNFUTURES_NATIVE_TOKEN, WRAPPED_NATIVE_TOKEN, ZERO, ZERO_ADDRESS } from '../const';
import { increasePendingIdCounter, loadOrNewGate, loadOrNewPending, loadOrNewUser, loadOrNewUserVault } from '../entities/gate';
import { StatisticsDataChange, updateStatisticsData } from '../entities/stats';
import {
    Deposit,
    Gather,
    NewInstrument,
    Scatter,
    SetPendingDuration,
    SetThreshold,
    UpdatePending,
    Withdraw,
} from '../../generated/Gate/Gate';
import { concatId, getMarketAddress } from '../utils/common';
import { Address, BigInt } from '@graphprotocol/graph-ts';

export function handleNewInstrument(event: NewInstrument): void {
    createNewInstrumentEvent(event);
    let instrument = loadOrNewInstrument(event.params.instrument);
    instrument.quote = event.params.quote.toHexString();
    instrument.symbol = event.params.symbol;
    instrument.createdAt = event.block.timestamp;

    let dataChange = new StatisticsDataChange();
    dataChange.timestamp = event.block.timestamp;
    dataChange.deltaInstrumentCount = ONE;
    updateStatisticsData(dataChange);
    loadOrNewInstrumentSetting(event.params.instrument, event.params.quote);

    let arr = event.params.symbol.split('-');

    if (event.params.base == ZERO_ADDRESS) {
        // we search backward as 'Base' may possibly have a hyphen
        let base = arr.slice(0, -2).join('-');
        loadOrNewBase(base);
        instrument.base = base;
        instrument.cexFeeder = event.params.instrument.toHexString();
        instrument.marketType = arr[arr.length - 1];
        instrument.cexMarket = getMarketAddress(instrument.marketType).toHexString();
    } else {
        loadOrNewBase(event.params.base.toHexString());
        instrument.base = event.params.base.toHexString();
        instrument.dexV2Feeder = event.params.instrument.toHexString();
        instrument.marketType = arr[arr.length - 1];
        instrument.dexV2Market = getMarketAddress(instrument.marketType).toHexString();
    }
    InstrumentContract.create(event.params.instrument);
    instrument.save();
}

export function handleGather(event: Gather): void {
    loadOrNewUser(event.params.trader, event.block.timestamp);

    createGatherEvent(event);

    let userVault = loadOrNewUserVault(event.params.trader, event.params.quote);
    userVault.balance = userVault.balance.plus(event.params.quantity);
    userVault.save();

    let dataChange = new StatisticsDataChange();
    dataChange.instrumentAddr = event.params.instrument;
    dataChange.timestamp = event.block.timestamp;
    dataChange.traderAddr = event.params.trader;

    let quote = loadOrNewQuote(event.params.quote);
    dataChange.deltaLockedValue = event.params.quantity
        .times(BigInt.fromI32(10).pow((18 - quote.decimals.toI32()) as u8))
        .times(NEG_ONE);
    dataChange.expiry = event.params.expiry;
    updateStatisticsData(dataChange);
}

export function handleScatter(event: Scatter): void {
    loadOrNewUser(event.params.trader, event.block.timestamp);

    createScatterEvent(event);

    let userVault = loadOrNewUserVault(event.params.trader, event.params.quote);
    userVault.balance = userVault.balance.minus(event.params.quantity);
    userVault.save();

    let dataChange = new StatisticsDataChange();
    dataChange.instrumentAddr = event.params.instrument;
    dataChange.timestamp = event.block.timestamp;
    dataChange.traderAddr = event.params.trader;
    let quote = loadOrNewQuote(event.params.quote);
    dataChange.deltaLockedValue = event.params.quantity.times(
        BigInt.fromI32(10).pow((18 - quote.decimals.toI32()) as u8),
    );
    dataChange.expiry = event.params.expiry;
    updateStatisticsData(dataChange);
}

export function handleDeposit(event: Deposit): void {
    loadOrNewUser(event.params.trader, event.block.timestamp);

    createDepositEvent(event);

    // convert synfutures_native_token to wrapped_native_token
    const quote = event.params.quote.toHexString() == SYNFUTURES_NATIVE_TOKEN ? WRAPPED_NATIVE_TOKEN : event.params.quote.toHexString();
    let vault = loadOrNewUserVault(event.params.trader, Address.fromString(quote));
    vault.totalDeposit = vault.totalDeposit.plus(event.params.quantity);
    vault.balance = vault.balance.plus(event.params.quantity);
    vault.save();

    let dataChange = new StatisticsDataChange();
    dataChange.quote = quote;
    dataChange.timestamp = event.block.timestamp;
    dataChange.traderAddr = event.params.trader;
    dataChange.deltaDepositCount = ONE;
    dataChange.deltaLockedValue = event.params.quantity;
    updateStatisticsData(dataChange);
}

export function handleWithdraw(event: Withdraw): void {
    createWithdrawEvent(event);

    // convert synfutures_native_token to wrapped_native_token
    const quote = event.params.quote.toHexString() == SYNFUTURES_NATIVE_TOKEN ? WRAPPED_NATIVE_TOKEN : event.params.quote.toHexString();

    let vault = loadOrNewUserVault(event.params.trader, Address.fromString(quote));
    vault.totalWithdraw = vault.totalWithdraw.plus(event.params.quantity);
    vault.balance = vault.balance.minus(event.params.quantity);
    vault.save();

    let dataChange = new StatisticsDataChange();
    dataChange.quote = quote;
    dataChange.timestamp = event.block.timestamp;
    dataChange.traderAddr = event.params.trader;
    dataChange.deltaWithdrawCount = ONE;
    dataChange.deltaLockedValue = event.params.quantity.times(NEG_ONE);
    updateStatisticsData(dataChange);
}

export function handleSetPendingDuration(event: SetPendingDuration): void {
    createSetPendingDurationEvent(event);

    let gate = loadOrNewGate(event.address);
    gate.pendingDuration = event.params.duration;
    gate.save();
}

export function handleSetThreshold(event: SetThreshold): void {
    createSetThresholdEvent(event);
}

export function handleUpdatePending(event: UpdatePending): void {
    createUpdatePendingEvent(event);
    const params = event.params.pending;
    // if receives and pending event, timestamp and amount are both zero, native is false, 
    // then the pending is due and released
    if (params.timestamp.equals(ZERO) && params.amount.equals(ZERO) && !params.native) {
        let pending = loadOrNewPending(event.params.quote, event.params.trader);
        pending.status = PENDING_STATUS_RELEASED;
        pending.save();
        increasePendingIdCounter(event.params.quote, event.params.trader);
        return;
    }

    let pending = loadOrNewPending(event.params.quote, event.params.trader);
    pending.quote = event.params.quote;
    pending.trader = event.params.trader;
    pending.timestamp = event.params.pending.timestamp;
    pending.native = event.params.pending.native;
    pending.amount = event.params.pending.amount;
    pending.exemption = event.params.pending.exemption;

    pending.save();
}
