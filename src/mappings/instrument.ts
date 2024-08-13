/* eslint-disable prefer-const */
import { BigInt } from '@graphprotocol/graph-ts';
import {
    Add,
    Adjust,
    UpdateAmmStatus,
    Cancel,
    ClaimProtocolFee,
    DonateInsuranceFund,
    Fill,
    FundingFee,
    Liquidate,
    Place,
    RecycleInsuranceFund,
    Remove,
    Settle,
    Sweep,
    Trade,
    UpdateCondition,
    UpdateFeeState,
    UpdateFundingIndex,
    UpdatePosition,
    UpdateParam,
    DeleteContext,
    UpdateSocialLossInsuranceFund,
    UpdateMarginRatio,
    WithdrawRangeFee,
} from '../../generated/templates/InstrumentContract/Instrument';
import {
    PERP_EXPIRY,
    ORDER_STATUS_CANCELLED,
    RANGE_STATUS_OPEN,
    RANGE_STATUS_REMOVED,
    ZERO,
    WAD,
    ONE,
    ORDER_STATUS_FILLED,
    MASK_128,
    STABILITY_FEE_CHANGE_BLOCK,
} from '../const';
import {
    createAddEvent,
    createUpdateAmmStatusEvent,
    createCancelEvent,
    createClaimProtocolFeeEvent,
    createDonateInsuranceFundEvent,
    createFillEvent,
    createFundingFeeEvent,
    createLiquidateEvent,
    createPlaceEvent,
    createRecycleInsuranceFundEvent,
    createRemoveEvent,
    createSettleEvent,
    createSweepEvent,
    createTradeEvent,
    createUpdateConditionEvent,
    createUpdateFeeStateEvent,
    createUpdateFundingIndexEvent,
    createUpdatePositionEvent,
    createAdjustEvent,
    createUpdateParamEvent,
    createDeleteContextEvent,
    createUpdateMarginRatioEvent,
    createUpdateSocialLossInsuranceFundEvent,
} from '../entities/event';
import { loadOrNewAmm, loadOrNewInstrument, loadOrNewInstrumentSetting } from '../entities/instrument';
import { increaseOrderIdCounter, loadOrNewOrder } from '../entities/order';
import { loadOrNewPosition } from '../entities/position';
import {
    asInt128,
    concatId,
    decodeReferralCode,
    getAmmStatusStr,
    getConditionStr,
    getQuoteTypeStr,
    getTransactionEventId,
    parseTicks,
} from '../utils/common';
import { increaseRangeIdCounter, loadOrNewRange } from '../entities/range';
import {
    StatisticsDataChange,
    updateHourlyAmmData,
    updateHourlyAmmDataOfFundingIndex,
    updateStatisticsData,
} from '../entities/stats';
import { loadOrNewQuoteParam } from '../entities/config';
import { r2w } from '../utils/number';
import { Address } from '@graphprotocol/graph-ts';
import { Instrument, InstrumentSetting, OrderIdCounter } from '../../generated/schema';

export function handleDonateInsuranceFund(event: DonateInsuranceFund): void {
    createDonateInsuranceFundEvent(event);

    let amm = loadOrNewAmm(event.address, event.params.expiry, event.block.timestamp);
    amm.insuranceFund = amm.insuranceFund.plus(event.params.amount);
    amm.save();
}

export function handleRecycleInsuranceFund(event: RecycleInsuranceFund): void {
    createRecycleInsuranceFundEvent(event);

    let amm = loadOrNewAmm(event.address, event.params.expiry, event.block.timestamp);
    amm.insuranceFund = amm.insuranceFund.minus(event.params.amount);
    amm.save();
}

export function handleClaimProtocolFee(event: ClaimProtocolFee): void {
    createClaimProtocolFeeEvent(event);
}

export function handleTrade(event: Trade): void {
    createTradeEvent(event);

    let amm = loadOrNewAmm(event.address, event.params.expiry, event.block.timestamp);
    amm.sqrtPX96 = event.params.sqrtPX96;
    amm.save();

    let dataChange = buildTradeDataChange(event);
    dataChange.timestamp = event.block.timestamp;
    dataChange.deltaTradeCount = ONE;
    updateStatisticsData(dataChange);
}

export function handleSweep(event: Sweep): void {
    createSweepEvent(event);

    let amm = loadOrNewAmm(event.address, event.params.expiry, event.block.timestamp);
    amm.sqrtPX96 = event.params.sqrtPX96;
    amm.save();

    let dataChange = buildSweepDataChange(event);
    dataChange.timestamp = event.block.timestamp;
    dataChange.deltaLiquidationCount = ONE;
    updateStatisticsData(dataChange);
}

function buildSweepDataChange(event: Sweep): StatisticsDataChange {
    let furures = loadOrNewInstrument(event.address);

    let quoteParam = getLiteQuoteParam(event.address);
    let protocolFeeRatio = quoteParam.protocolFeeRatio;
    let tradingFeeRatio = quoteParam.tradingFeeRatio;

    if (event.block.number.lt(STABILITY_FEE_CHANGE_BLOCK)) {
        // stability fee goes to insurance fund after STABILITY_FEE_CHANGE_BLOCK
        tradingFeeRatio = BigInt.fromI32(event.params.feeRatio);
    }

    let dataChange = new StatisticsDataChange();
    dataChange.instrumentAddr = event.address;
    dataChange.expiry = event.params.expiry;
    dataChange.traderAddr = event.params.trader;
    dataChange.timestamp = event.block.timestamp;
    dataChange.quote = furures.quote;

    dataChange.tradePrice = event.params.entryNotional.times(WAD).div(event.params.size.abs());
    dataChange.deltaBaseVolume = event.params.size.abs();
    dataChange.deltaVolume = event.params.entryNotional;
    dataChange.deltaPoolFee = event.params.entryNotional.minus(event.params.takenValue).times(r2w(tradingFeeRatio)).div(WAD);
    dataChange.deltaLiquidityFee = event.params.entryNotional.times(r2w(tradingFeeRatio)).div(WAD);
    dataChange.deltaProtocolFee = event.params.entryNotional.times(r2w(protocolFeeRatio)).div(WAD);
    dataChange.markPrice = event.params.mark;
    return dataChange;
}

function buildTradeDataChange(event: Trade): StatisticsDataChange {
    let furures = loadOrNewInstrument(event.address);

    let quoteParam = getLiteQuoteParam(event.address);
    let protocolFeeRatio = quoteParam.protocolFeeRatio;
    let tradingFeeRatio = quoteParam.tradingFeeRatio;

    if (event.block.number.lt(STABILITY_FEE_CHANGE_BLOCK)) {
        // stability fee goes to insurance fund after STABILITY_FEE_CHANGE_BLOCK
        tradingFeeRatio = BigInt.fromI32(event.params.feeRatio);
    }

    let dataChange = new StatisticsDataChange();
    dataChange.instrumentAddr = event.address;
    dataChange.expiry = event.params.expiry;
    dataChange.traderAddr = event.params.trader;
    dataChange.timestamp = event.block.timestamp;
    dataChange.quote = furures.quote;

    dataChange.tradePrice = event.params.entryNotional.times(WAD).div(event.params.size.abs());
    dataChange.deltaBaseVolume = event.params.size.abs();
    dataChange.deltaVolume = event.params.entryNotional;
    dataChange.deltaPoolFee = event.params.entryNotional.minus(event.params.takenValue).times(r2w(tradingFeeRatio)).div(WAD);
    dataChange.deltaLiquidityFee = event.params.entryNotional.times(r2w(tradingFeeRatio)).div(WAD);
    dataChange.deltaProtocolFee = event.params.entryNotional.times(r2w(protocolFeeRatio)).div(WAD);

    dataChange.markPrice = event.params.mark;

    return dataChange;
}

export function handleAdjust(event: Adjust): void {
    createAdjustEvent(event);
}

export function handleAdd(event: Add): void {
    let amm = loadOrNewAmm(event.address, event.params.expiry, event.block.timestamp);
    amm.balance = amm.balance.plus(event.params.range.balance);
    if (amm.sqrtInitialPX96.equals(ZERO)) {
        amm.sqrtInitialPX96 = event.params.range.sqrtEntryPX96;
    }
    if (amm.sqrtPX96.equals(ZERO)) {
        amm.sqrtPX96 = event.params.range.sqrtEntryPX96;
    }
    if (amm.createdAt.equals(ZERO)) {
        amm.createdAt = event.block.timestamp;
    }
    amm.save();
    createAddEvent(event);

    increaseRangeIdCounter(
        event.params.trader,
        event.address,
        event.params.expiry,
        BigInt.fromI32(event.params.tickLower),
        BigInt.fromI32(event.params.tickUpper),
    );

    let range = loadOrNewRange(
        event.params.trader,
        event.address,
        event.params.expiry,
        BigInt.fromI32(event.params.tickLower),
        BigInt.fromI32(event.params.tickUpper),
    );
    range.liquidity = event.params.range.liquidity;
    range.balance = event.params.range.balance;
    range.sqrtEntryPX96 = event.params.range.sqrtEntryPX96;
    range.entryFeeIndex = event.params.range.entryFeeIndex;
    range.status = RANGE_STATUS_OPEN;
    range.save();

    let dataChange = new StatisticsDataChange();
    dataChange.instrumentAddr = event.address;
    dataChange.expiry = event.params.expiry;
    dataChange.traderAddr = event.params.trader;
    dataChange.timestamp = event.block.timestamp;
    dataChange.deltaLiquidityCount = ONE;
    updateStatisticsData(dataChange);
}

export function handleRemove(event: Remove): void {
    createRemoveEvent(event);

    let range = loadOrNewRange(
        event.params.trader,
        event.address,
        event.params.expiry,
        BigInt.fromI32(event.params.tickLower),
        BigInt.fromI32(event.params.tickUpper),
    );

    let amm = loadOrNewAmm(event.address, event.params.expiry, event.block.timestamp);
    amm.balance = amm.balance.minus(range.balance);
    amm.save();

    range.liquidity = ZERO;
    range.balance = ZERO;
    range.sqrtEntryPX96 = ZERO;
    range.entryFeeIndex = ZERO;
    range.status = RANGE_STATUS_REMOVED;
    range.save();

    let dataChange = new StatisticsDataChange();
    dataChange.instrumentAddr = event.address;
    dataChange.expiry = event.params.expiry;
    dataChange.traderAddr = event.params.trader;
    dataChange.timestamp = event.block.timestamp;
    dataChange.deltaLiquidityCount = ONE;
    updateStatisticsData(dataChange);
}

export function handlePlace(event: Place): void {
    createPlaceEvent(event);

    increaseOrderIdCounter(
        event.params.trader,
        event.address,
        event.params.expiry,
        BigInt.fromI32(event.params.tick),
        event.params.nonce,
    );

    let order = loadOrNewOrder(
        event.params.trader,
        event.address,
        event.params.expiry,
        BigInt.fromI32(event.params.tick),
        event.params.nonce,
        event.block.timestamp,
    );
    order.balance = event.params.order.balance;
    order.size = event.params.order.size;

    order.placeEvent = getTransactionEventId(event);
    order.referralCode = decodeReferralCode(event.transaction.input);
    order.save();
}

export function handleCancel(event: Cancel): void {
    let order = loadOrNewOrder(
        event.params.trader,
        event.address,
        event.params.expiry,
        BigInt.fromI32(event.params.tick),
        event.params.nonce,
        event.block.timestamp,
    );
    order.status = ORDER_STATUS_CANCELLED;
    order.timestamp = event.block.timestamp;
    order.filledSize = event.params.pic.size;
    order.tradeValue = event.params.pic.entryNotional;
    if (event.params.pic.size.notEqual(ZERO)) {
        order.price = event.params.pic.entryNotional.times(WAD).div(event.params.pic.size.abs());
    }
    order.fee = event.params.fee;
    order.cancelEvent = getTransactionEventId(event);
    order.save();

    createCancelEvent(event, order.referralCode);
}

export function handleFill(event: Fill): void {
    let order = loadOrNewOrder(
        event.params.trader,
        event.address,
        event.params.expiry,
        BigInt.fromI32(event.params.tick),
        event.params.nonce,
        event.block.timestamp,
    );
    order.status = ORDER_STATUS_FILLED;
    order.timestamp = event.block.timestamp;
    order.filledSize = event.params.pic.size;
    order.price = event.params.pic.entryNotional.times(WAD).div(event.params.pic.size.abs());
    order.tradeValue = event.params.pic.entryNotional;
    order.fee = event.params.fee;

    order.fillEvent = getTransactionEventId(event);
    order.save();

    createFillEvent(event, order.referralCode);
}

export function handleLiquidate(event: Liquidate): void {
    createLiquidateEvent(event);

    let dataChange = new StatisticsDataChange();
    dataChange.instrumentAddr = event.address;
    dataChange.expiry = event.params.expiry;
    dataChange.traderAddr = event.params.target;
    dataChange.timestamp = event.block.timestamp;
    dataChange.deltaLiquidationCount = ONE;
    updateStatisticsData(dataChange);
}

export function handleSettle(event: Settle): void {
    createSettleEvent(event);
}

export function handleFundingFee(event: FundingFee): void {
    // ignore 0 funding fee
    if (event.params.funding.equals(ZERO)) {
        return;
    }
    createFundingFeeEvent(event);
}

export function handleUpdatePosition(event: UpdatePosition): void {
    createUpdatePositionEvent(event);

    let position = loadOrNewPosition(event.params.trader, event.address, event.params.expiry, event.block);
    position.balance = event.params.pic.balance;
    position.size = event.params.pic.size;
    position.entryNotional = event.params.pic.entryNotional;
    position.entrySocialLossIndex = event.params.pic.entrySocialLossIndex;
    position.entryFundingIndex = event.params.pic.entryFundingIndex;

    position.save();
}

export function handleUpdateAmmStatus(event: UpdateAmmStatus): void {
    createUpdateAmmStatusEvent(event);

    let amm = loadOrNewAmm(event.address, event.params.expiry, event.block.timestamp);
    amm.status = getAmmStatusStr(event.params.status);
    // settling
    if (event.params.status == 2) {
        amm.timestamp = event.block.timestamp;
    }
    // settlled
    if (event.params.status === 3) {
        amm.settlementPrice = event.params.mark;
    }
    amm.save();
}

export function handleUpdateFeeState(event: UpdateFeeState): void {
    createUpdateFeeStateEvent(event);

    let amm = loadOrNewAmm(event.address, event.params.expiry, event.block.timestamp);
    amm.feeIndex = event.params.feeIndex;
    amm.protocolFee = event.params.protocolFee;
    amm.save();
}

export function handleUpdateFundingIndex(event: UpdateFundingIndex): void {
    createUpdateFundingIndexEvent(event);

    let amm = loadOrNewAmm(event.address, PERP_EXPIRY, event.block.timestamp);
    amm.shortFundingIndex = asInt128(event.params.fundingIndex.rightShift(128));
    amm.longFundingIndex = asInt128(event.params.fundingIndex.bitAnd(MASK_128));

    amm.timestamp = event.block.timestamp;
    amm.save();

    // update funding rate related
    let dataChange = new StatisticsDataChange();
    dataChange.instrumentAddr = event.address;
    dataChange.expiry = PERP_EXPIRY;
    dataChange.fundingIndex = event.params.fundingIndex;
    dataChange.timestamp = event.block.timestamp;
    updateHourlyAmmDataOfFundingIndex(dataChange);
}

export function handleUpdateMarginRatio(event: UpdateMarginRatio): void {
    createUpdateMarginRatioEvent(event);

    let instrument = loadOrNewInstrument(event.address);
    let instrumentSetting = loadOrNewInstrumentSetting(event.address, Address.fromString(instrument.quote));
    instrumentSetting.initialMarginRatio = event.params.initialMarginRatio;
    instrumentSetting.maintenanceMarginRatio = event.params.maintenanceMarginRatio;
    instrumentSetting.save();
}

export function handleUpdateCondition(event: UpdateCondition): void {
    createUpdateConditionEvent(event);

    let instrument = loadOrNewInstrument(event.address);
    instrument.condition = getConditionStr(event.params.condition);
    instrument.save();
}

export function handleDeleteContext(event: DeleteContext): void {
    createDeleteContextEvent(event);

    let amm = loadOrNewAmm(event.address, event.params.expiry, event.block.timestamp);
    // reset amm
    amm.balance = ZERO;
    amm.timestamp = ZERO;
    amm.status = getAmmStatusStr(0);

    amm.feeIndex = ZERO;
    amm.protocolFee = ZERO;

    amm.longSocialLossIndex = ZERO;
    amm.shortSocialLossIndex = ZERO;

    amm.longFundingIndex = ZERO;
    amm.shortFundingIndex = ZERO;

    amm.insuranceFund = ZERO;

    amm.sqrtInitialPX96 = ZERO;
    amm.sqrtPX96 = ZERO;
    amm.settlementPrice = ZERO;

    amm.save();
}

export function handleUpdateParam(event: UpdateParam): void {
    createUpdateParamEvent(event);

    let instrument = loadOrNewInstrument(event.address);
    let quoteAddr = instrument.quote;
    let instrumentSetting = loadOrNewInstrumentSetting(event.address, Address.fromString(quoteAddr));
    instrumentSetting.quote = quoteAddr;
    instrumentSetting.tradingFeeRatio = BigInt.fromI32(event.params.param.tradingFeeRatio);
    instrumentSetting.stabilityFeeRatioParam = event.params.param.stabilityFeeRatioParam;
    instrumentSetting.protocolFeeRatio = BigInt.fromI32(event.params.param.protocolFeeRatio);
    instrumentSetting.minMarginAmount = event.params.param.minMarginAmount;
    instrumentSetting.tip = event.params.param.tip;

    instrumentSetting.qtype = getQuoteTypeStr(event.params.param.qtype);
    instrumentSetting.save();
}

export function handleWithdrawRangeFee(event: WithdrawRangeFee): void {
    let tickRange = parseTicks(event.params.rid);
    let range = loadOrNewRange(
        event.params.trader,
        event.address,
        event.params.expiry,
        tickRange.tickLower,
        tickRange.tickUpper,
    );
    range.liquidity = event.params.range.liquidity;
    range.balance = event.params.range.balance;
    range.sqrtEntryPX96 = event.params.range.sqrtEntryPX96;
    range.entryFeeIndex = event.params.range.entryFeeIndex;
    range.status = RANGE_STATUS_OPEN;
    range.save();
}

export function handleUpdateSocialLossInsuranceFund(event: UpdateSocialLossInsuranceFund): void {
    createUpdateSocialLossInsuranceFundEvent(event);

    let amm = loadOrNewAmm(event.address, event.params.expiry, event.block.timestamp);
    amm.longSocialLossIndex = event.params.longSocialLossIndex;
    amm.shortSocialLossIndex = event.params.shortSocialLossIndex;
    amm.insuranceFund = event.params.insuranceFund;
    amm.save();
}

export class LiteQuoteParam {
    constructor(public tradingFeeRatio: BigInt, public protocolFeeRatio: BigInt) {}
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function getLiteQuoteParam(instrumentAddr: Address): LiteQuoteParam {
    let instrument = Instrument.load(instrumentAddr.toHexString());
    if (instrument == null) {
        throw new Error('instrument not exists');
    }
    // get protocolFeeRatio from InstrumentSetting
    let param = loadOrNewInstrumentSetting(instrumentAddr, Address.fromString(instrument.quote));

    if (param != null) {
        return new LiteQuoteParam(param.tradingFeeRatio, param.protocolFeeRatio);
    }

    // get protocolFeeRatio from QuoteParam
    let quoteParam = loadOrNewQuoteParam(Address.fromString(instrument.quote));
    if (quoteParam == null) {
        throw new Error('quote param not exists');
    }
    return new LiteQuoteParam(quoteParam.tradingFeeRatio, quoteParam.protocolFeeRatio);
}
