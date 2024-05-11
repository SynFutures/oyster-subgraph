/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable prefer-const */
import { ethereum, Bytes, BigInt } from '@graphprotocol/graph-ts';
import {
    CancelEvent,
    ClaimProtocolFeeEvent,
    DepositEvent,
    FillEvent,
    FundingFeeEvent,
    LiquidateEvent,
    PlaceEvent,
    SettleEvent,
    SweepEvent,
    TradeEvent,
    Transaction,
    TransactionEvent,
    UpdateFeeStateEvent,
    UpdateFundingIndexEvent,
    UpdatePositionEvent,
    WithdrawEvent,
    NewInstrumentEvent,
    VirtualTrade,
    ScatterEvent,
    GatherEvent,
    SetPendingDurationEvent,
    SetThresholdEvent,
    UpdatePendingEvent,
    RecycleInsuranceFundEvent,
    DonateInsuranceFundEvent,
    UpdateConditionEvent,
    AddEvent,
    RemoveEvent,
    AdjustEvent,
    UpdateAmmStatusEvent,
    UpdateParamEvent,
    UpdateSocialLossInsuranceFundEvent,
    DeleteContextEvent,
    UpdateMarginRatioEvent,
    Order,
} from '../../generated/schema';
import {
    MASK_128,
    MAX_INPUT_LENGTH,
    NEG_ONE,
    ONE,
    PERP_EXPIRY,
    SELECTOR_LENGTH_IN_STRING,
    VIRTUAL_TRADE_TYPE_LIMIT,
    VIRTUAL_TRADE_TYPE_MARKET,
    VIRTUAL_TRADE_TYPE_RANGE,
    VIRTUAL_TRADE_TYPE_TAKE_OVER,
    WAD,
    ZERO,
    ZERO_ADDRESS,
} from '../const';
import {
    asInt128,
    concatId,
    decodeReferralCode,
    findArg,
    getAmmId,
    getMarkPrice,
    getQuoteTypeStr,
    getTransactionEventId,
    serializeParameters,
} from '../utils/common';
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
} from '../../generated/templates/InstrumentContract/Instrument';
import { Deposit, Withdraw, NewInstrument } from '../../generated/Gate/Gate';
import { StatisticsDataChange, updateStatisticsData } from './stats';
import { Address } from '@graphprotocol/graph-ts';
import { VIRTUAL_TRADE_TYPE_LIQUIDATION } from '../const';
import { Gather, Scatter } from '../../generated/Gate/Gate';
import { loadOrNewAmm, loadOrNewInstrument } from './instrument';
import { r2w, wmul } from '../utils/number';
import { getProtocolFeeRatio } from '../mappings/instrument';
import { SetPendingDuration, SetThreshold, UpdatePending } from '../../generated/Gate/Gate';

export function loadOrNewTransaction(event: ethereum.Event, instrument: Address | null): Transaction {
    let id = event.transaction.hash.toHexString();
    let tx = Transaction.load(id);

    if (tx === null) {
        tx = new Transaction(id);

        tx.blockNumber = event.block.number;
        tx.timestamp = event.block.timestamp;
        tx.index = event.transaction.index;
        tx.from = Bytes.fromHexString(event.transaction.from.toHexString());
        tx.to = event.transaction.to === null ? ZERO_ADDRESS : (event.transaction.to as Bytes);
        // only stores the transaction function selector if input is too long,
        // to avoid the graph's failure
        if (event.transaction.input.length > MAX_INPUT_LENGTH) {
            tx.input = Bytes.fromHexString(
                event.transaction.input.toHexString().slice(0, SELECTOR_LENGTH_IN_STRING),
            ) as Bytes;
            // do not record tx.input for contract creation tx
        } else {
            tx.input = event.transaction.input;
        }
        tx.value = event.transaction.value;
        tx.gasUsed = event.receipt !== null ? event.receipt!.gasUsed : ZERO;
        tx.gasPrice = event.transaction.gasPrice;
        tx.instrumentList = [];
        tx.save();

        let dataChange = new StatisticsDataChange();
        dataChange.traderAddr = event.transaction.from;
        dataChange.timestamp = event.block.timestamp;
        dataChange.deltaTxCount = ONE;
        updateStatisticsData(dataChange);
    }

    let instrumentList = tx.instrumentList!;
    if (instrument !== null && !instrumentList.includes(instrument.toHexString())) {
        instrumentList.push(instrument.toHexString());
        tx.instrumentList = instrumentList;
        tx.save();
    }
    return tx as Transaction;
}

// general transaction event
export function newTransactionEvent(
    event: ethereum.Event,
    name: string,
    instrument: Address | null,
    expiry: BigInt | null,
): TransactionEvent {
    let txEventId = getTransactionEventId(event);
    let txEvent = TransactionEvent.load(txEventId);
    if (txEvent === null) {
        txEvent = new TransactionEvent(txEventId);
        txEvent.transaction = event.transaction.hash.toHexString();
        txEvent.logIndex = event.logIndex.toI32();
        txEvent.name = name;
        txEvent.address = event.address;
        txEvent.blockNumber = event.block.number;
        txEvent.timestamp = event.block.timestamp;
        txEvent.instrument = instrument ? instrument.toHexString() : null;
        txEvent.amm = instrument ? getAmmId(instrument.toHexString(), expiry) : null;

        if (name == 'Liquidate') {
            let trader = findArg(event.parameters, 'target');
            if (trader != null) {
                txEvent.trader = trader.value.toAddress();
            }

            let liquidator = findArg(event.parameters, 'trader');
            if (liquidator != null) {
                txEvent.liquidator = liquidator.value.toAddress();
            }
        } else {
            let trader = findArg(event.parameters, 'trader');
            if (trader != null) {
                txEvent.trader = trader.value.toAddress();
            }
        }

        if (name === 'Remove' && instrument !== null && expiry !== null) {
            // we need to calculate the unrealizedPnl for Remove event
            let pic = findArg(event.parameters, 'pic');

            if (pic !== null) {
                let size = pic.value.toTuple()[1];
                let entryNotional = pic.value.toTuple()[2];

                let mark = getMarkPrice(instrument, expiry);
                let unrealizedPnl: BigInt = wmul(mark, size.toBigInt().abs()).minus(entryNotional.toBigInt());

                let pnlParam = new ethereum.EventParam('unrealizedPnl', ethereum.Value.fromSignedBigInt(unrealizedPnl));

                let markParam = new ethereum.EventParam('mark', ethereum.Value.fromUnsignedBigInt(mark));

                event.parameters.push(pnlParam);
                event.parameters.push(markParam);
            }

            let amm = loadOrNewAmm(instrument, expiry, event.block.timestamp);
            let fairParam = new ethereum.EventParam('sqrtPX96', ethereum.Value.fromUnsignedBigInt(amm.sqrtPX96));
            event.parameters.push(fairParam);
        }

        txEvent.args = serializeParameters(event.parameters);

        txEvent.save();
    }
    return txEvent as TransactionEvent;
}
/////////////////////// Gate ///////////////////////
// event NewInstrument(bytes32 index, address instrument, address base, address quote, string symbol)
export function createNewInstrumentEvent(event: NewInstrument): NewInstrumentEvent {
    loadOrNewTransaction(event, event.params.instrument);

    newTransactionEvent(event, 'NewInstrument', event.params.instrument, null);

    let entity = new NewInstrumentEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.index = event.params.index;
    entity.instrument = event.params.instrument;
    entity.base = event.params.base;
    entity.quote = event.params.quote;
    entity.symbol = event.params.symbol;

    entity.save();
    return entity;
}

// event Deposit(address indexed quote, address indexed trader, uint amount);
export function createDepositEvent(event: Deposit): DepositEvent {
    loadOrNewTransaction(event, null);
    newTransactionEvent(event, 'Deposit', null, null);

    let entity = new DepositEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.quote = event.params.quote;
    entity.trader = event.params.trader;
    entity.quantity = event.params.quantity;

    entity.save();
    return entity;
}

// event Withdraw(address indexed quote, address indexed trader, uint amount);
export function createWithdrawEvent(event: Withdraw): WithdrawEvent {
    loadOrNewTransaction(event, null);
    newTransactionEvent(event, 'Withdraw', null, null);

    let entity = new WithdrawEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.quote = event.params.quote;
    entity.trader = event.params.trader;
    entity.quantity = event.params.quantity;

    entity.save();
    return entity;
}

// event Scatter(address indexed quote, address indexed trader, address indexed instrument, uint32 expiry, uint quantity);
export function createScatterEvent(event: Scatter): ScatterEvent {
    loadOrNewTransaction(event, event.params.instrument);

    newTransactionEvent(event, 'Scatter', event.params.instrument, event.params.expiry);

    let entity = new ScatterEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;
    entity.expiry = event.params.expiry;
    entity.trader = event.params.trader;
    entity.quote = event.params.quote;
    entity.quantity = event.params.quantity;
    entity.instrument = event.params.instrument;

    entity.save();
    return entity;
}

// event Gather(address indexed quote, address indexed trader, address indexed instrument, uint32 expiry, uint quantity);
export function createGatherEvent(event: Gather): GatherEvent {
    loadOrNewTransaction(event, event.params.instrument);

    newTransactionEvent(event, 'Gather', event.params.instrument, event.params.expiry);

    let entity = new GatherEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;
    entity.expiry = event.params.expiry;
    entity.trader = event.params.trader;
    entity.quote = event.params.quote;
    entity.quantity = event.params.quantity;
    entity.instrument = event.params.instrument;

    entity.save();
    return entity;
}

// event SetPendingDuration(uint duration);
export function createSetPendingDurationEvent(event: SetPendingDuration): SetPendingDurationEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'SetPendingDuration', null, null);

    let entity = new SetPendingDurationEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;
    entity.duration = event.params.duration;

    entity.save();
    return entity;
}

// event SetThreshold(uint threshold);
export function createSetThresholdEvent(event: SetThreshold): SetThresholdEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'SetThreshold', null, null);

    let entity = new SetThresholdEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;
    entity.quote = event.params.quote;
    entity.threshold = event.params.threshold;

    entity.save();
    return entity;
}

// event UpdatePending(address indexed trader, uint32 expiry, uint pending);
export function createUpdatePendingEvent(event: UpdatePending): UpdatePendingEvent {
    loadOrNewTransaction(event, event.address);
    newTransactionEvent(event, 'UpdatePending', null, null);

    let entity = new UpdatePendingEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;
    entity.quote = event.params.quote;
    entity.trader = event.params.trader;
    entity.timestamp = event.params.pending.timestamp;
    entity.native = event.params.pending.native;
    entity.amount = event.params.pending.amount;
    entity.exemption = event.params.pending.exemption;

    entity.save();
    return entity;
}

/////////////////////// Instrument ///////////////////////
export function createDonateInsuranceFundEvent(event: DonateInsuranceFund): DonateInsuranceFundEvent {
    loadOrNewTransaction(event, event.address);
    newTransactionEvent(event, 'DonateInsuranceFund', event.address, event.params.expiry);

    let entity = new DonateInsuranceFundEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.expiry = event.params.expiry;
    entity.donator = event.params.donator;
    entity.amount = event.params.amount;

    entity.save();
    return entity;
}

export function createRecycleInsuranceFundEvent(event: RecycleInsuranceFund): RecycleInsuranceFundEvent {
    loadOrNewTransaction(event, event.address);
    newTransactionEvent(event, 'RecycleInsuranceFund', event.address, event.params.expiry);

    let entity = new RecycleInsuranceFundEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.expiry = event.params.expiry;
    entity.amount = event.params.amount;

    entity.save();
    return entity;
}

export function createClaimProtocolFeeEvent(event: ClaimProtocolFee): ClaimProtocolFeeEvent {
    loadOrNewTransaction(event, event.address);
    newTransactionEvent(event, 'ClaimProtocolFee', event.address, event.params.expiry);

    let entity = new ClaimProtocolFeeEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.expiry = event.params.expiry;
    entity.amount = event.params.amount;

    entity.save();
    return entity;
}

export function createTradeEvent(event: Trade): TradeEvent {
    loadOrNewTransaction(event, event.address);
    newTransactionEvent(event, 'Trade', event.address, event.params.expiry);

    let protocolFeeRatio = getProtocolFeeRatio(event.address);
    createVirtualTradeEvent(
        getTransactionEventId(event),
        event.block,
        event.address,
        event.params.expiry,
        event.params.trader,
        event.params.size,
        event.params.entryNotional,
        event.params.entryNotional.times(r2w(BigInt.fromI32(event.params.feeRatio).plus(protocolFeeRatio))).div(WAD),
        VIRTUAL_TRADE_TYPE_MARKET,
        decodeReferralCode(event.transaction.input),
    );

    let entity = new TradeEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.expiry = event.params.expiry;
    entity.trader = event.params.trader;
    entity.mark = event.params.mark;
    entity.feeRatio = BigInt.fromI32(event.params.feeRatio);
    entity.size = event.params.size;
    entity.entryNotional = event.params.entryNotional;
    entity.amount = event.params.amount;
    entity.takenSize = event.params.takenSize;
    entity.takenValue = event.params.takenValue;
    entity.sqrtPX96 = event.params.sqrtPX96;

    entity.referralCode = decodeReferralCode(event.transaction.input);
    entity.save();
    return entity;
}

// event Sweep(uint32 indexed expiry, address indexed trader, uint mark, PositionCache swapPic, int balance, uint16 feeRatio, address operator);
export function createSweepEvent(event: Sweep): SweepEvent {
    loadOrNewTransaction(event, event.address);
    newTransactionEvent(event, 'Sweep', event.address, event.params.expiry);

    let protocolFeeRatio = getProtocolFeeRatio(event.address);

    createVirtualTradeEvent(
        getTransactionEventId(event),
        event.block,
        event.address,
        event.params.expiry,
        event.params.trader,
        event.params.size,
        event.params.entryNotional,
        event.params.entryNotional.times(r2w(BigInt.fromI32(event.params.feeRatio).plus(protocolFeeRatio))).div(WAD),
        VIRTUAL_TRADE_TYPE_LIQUIDATION,
        null,
    );

    let entity = new SweepEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.expiry = event.params.expiry;
    entity.trader = event.params.trader;
    entity.size = event.params.size;
    entity.takenSize = event.params.takenSize;
    entity.takenValue = event.params.takenValue;
    entity.entryNotional = event.params.entryNotional;
    entity.feeRatio = BigInt.fromI32(event.params.feeRatio);
    entity.mark = event.params.mark;
    entity.operator = event.params.operator;
    entity.sqrtPX96 = event.params.sqrtPX96;

    entity.save();
    return entity;
}

// event Adjust(uint32 indexed expiry, address indexed trader, int amount);
export function createAdjustEvent(event: Adjust): AdjustEvent {
    loadOrNewTransaction(event, event.address);
    newTransactionEvent(event, 'Adjust', event.address, event.params.expiry);

    let entity = new AdjustEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.expiry = event.params.expiry;
    entity.trader = event.params.trader;
    entity.net = event.params.net;

    entity.save();
    return entity;
}

// event Add(uint32 indexed expiry, address indexed trader, int32 tickLower, int32 tickUpper, Range range)
export function createAddEvent(event: Add): AddEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'Add', event.address, event.params.expiry);

    let entity = new AddEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.expiry = event.params.expiry;
    entity.trader = event.params.trader;
    entity.tickLower = event.params.tickLower;
    entity.tickUpper = event.params.tickUpper;

    entity.liquidity = event.params.range.liquidity;
    entity.balance = event.params.range.balance;
    entity.sqrtEntryPX96 = event.params.range.sqrtEntryPX96;
    entity.entryFeeIndex = event.params.range.entryFeeIndex;

    entity.referralCode = decodeReferralCode(event.transaction.input);
    entity.save();
    return entity;
}

// event Remove(uint32 indexed expiry, address indexed trader, int32 tickLower, int32 tickUpper, Range range)
export function createRemoveEvent(event: Remove): RemoveEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'Remove', event.address, event.params.expiry);

    createVirtualTradeEvent(
        getTransactionEventId(event),
        event.block,
        event.address,
        event.params.expiry,
        event.params.trader,
        event.params.pic.size,
        event.params.pic.entryNotional,
        event.params.fee,
        VIRTUAL_TRADE_TYPE_RANGE,
        null,
    );

    let entity = new RemoveEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.expiry = event.params.expiry;
    entity.trader = event.params.trader;
    entity.tickLower = event.params.tickLower;
    entity.tickUpper = event.params.tickUpper;
    entity.fee = event.params.fee;
    entity.tip = event.params.tip;
    entity.operator = event.params.operator;

    entity.balance = event.params.pic.balance;
    entity.size = event.params.pic.size;
    entity.entryNotional = event.params.pic.entryNotional;
    entity.entrySocialLossIndex = event.params.pic.entrySocialLossIndex;
    entity.entryFundingIndex = event.params.pic.entryFundingIndex;

    entity.mark = getMarkPrice(event.address, event.params.expiry);
    let unrealizedPnl: BigInt = wmul(entity.mark, entity.size.abs()).minus(entity.entryNotional);
    entity.unrealizedPnl = entity.size.gt(ZERO) ? unrealizedPnl : unrealizedPnl.times(NEG_ONE);
    entity.save();
    return entity;
}

// event Place(uint32 indexed expiry, address indexed trader, int32 tick, uint32 nonce, Order order);
export function createPlaceEvent(event: Place): PlaceEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'Place', event.address, event.params.expiry);

    let entity = new PlaceEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.expiry = event.params.expiry;
    entity.trader = event.params.trader;
    entity.tick = event.params.tick;
    entity.nonce = event.params.nonce;

    entity.balance = event.params.order.balance;
    entity.size = event.params.order.size;
    entity.referralCode = decodeReferralCode(event.transaction.input);
    entity.save();
    return entity;
}

// event Cancel(uint32 indexed expiry, address indexed trader, int32 tick, uint32 nonce, PositionCache pic);
export function createCancelEvent(event: Cancel, referralCode: string|null): CancelEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'Cancel', event.address, event.params.expiry);

    createVirtualTradeEvent(
        getTransactionEventId(event),
        event.block,
        event.address,
        event.params.expiry,
        event.params.trader,
        event.params.pic.size,
        event.params.pic.entryNotional,
        event.params.fee,
        VIRTUAL_TRADE_TYPE_LIMIT,
        referralCode,
    );

    let entity = new CancelEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.expiry = event.params.expiry;
    entity.trader = event.params.trader;
    entity.tick = event.params.tick;
    entity.nonce = event.params.nonce;
    entity.fee = event.params.fee;

    entity.balance = event.params.pic.balance;
    entity.size = event.params.pic.size;
    entity.entryNotional = event.params.pic.entryNotional;
    entity.entrySocialLossIndex = event.params.pic.entrySocialLossIndex;
    entity.entryFundingIndex = event.params.pic.entryFundingIndex;

    entity.save();
    return entity;
}

// event Fill(uint32 indexed expiry, address indexed trader, int32 tick, uint32 nonce, uint fee, PositionCache pic,address operator, uint tip);
export function createFillEvent(event: Fill, referralCode: string | null,): FillEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'Fill', event.address, event.params.expiry);

    createVirtualTradeEvent(
        getTransactionEventId(event),
        event.block,
        event.address,
        event.params.expiry,
        event.params.trader,
        event.params.pic.size,
        event.params.pic.entryNotional,
        event.params.fee,
        VIRTUAL_TRADE_TYPE_LIMIT,
        referralCode,
    );

    let entity = new FillEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.expiry = event.params.expiry;
    entity.trader = event.params.trader;
    entity.tick = event.params.tick;
    entity.nonce = event.params.nonce;
    entity.fee = event.params.fee;
    entity.tip = event.params.tip;
    entity.operator = event.params.operator;

    entity.balance = event.params.pic.balance;
    entity.size = event.params.pic.size;
    entity.entryNotional = event.params.pic.entryNotional;
    entity.entrySocialLossIndex = event.params.pic.entrySocialLossIndex;
    entity.entryFundingIndex = event.params.pic.entryFundingIndex;

    entity.save();
    return entity;
}

// event Liquidate(uint32 indexed expiry, address indexed trader, uint amount, uint mark, address target, int size);
export function createLiquidateEvent(event: Liquidate): LiquidateEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'Liquidate', event.address, event.params.expiry);

    // for target
    createVirtualTradeEvent(
        getTransactionEventId(event),
        event.block,
        event.address,
        event.params.expiry,
        event.params.target,
        event.params.size,
        event.params.size.abs().times(event.params.mark).div(WAD),
        ZERO,
        VIRTUAL_TRADE_TYPE_LIQUIDATION,
        null,
    );

    // for initiator
    createVirtualTradeEvent(
        getTransactionEventId(event),
        event.block,
        event.address,
        event.params.expiry,
        event.params.trader,
        event.params.size,
        event.params.size.abs().times(event.params.mark).div(WAD),
        ZERO,
        VIRTUAL_TRADE_TYPE_TAKE_OVER,
        null,
    );

    let entity = new LiquidateEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.expiry = event.params.expiry;
    entity.trader = event.params.trader;
    entity.amount = event.params.amount;
    entity.mark = event.params.mark;
    entity.target = event.params.target;
    entity.size = event.params.size;

    entity.save();
    return entity;
}

// event Settle(uint32 indexed expiry, address indexed trader, uint settlement, uint balance, address operator);
export function createSettleEvent(event: Settle): SettleEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'Settle', event.address, event.params.expiry);

    let entity = new SettleEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.expiry = event.params.expiry;
    entity.trader = event.params.trader;
    entity.settlement = event.params.settlement;
    entity.balance = event.params.balance;
    entity.operator = event.params.operator;

    entity.save();
    return entity;
}

// event FundingFee(address indexed trader, int funding);
export function createFundingFeeEvent(event: FundingFee): FundingFeeEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'FundingFee', event.address, PERP_EXPIRY);

    let entity = new FundingFeeEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.trader = event.params.trader;
    entity.funding = event.params.funding;
    entity.save();
    return entity;
}

// event UpdatePosition(uint32 indexed expiry, address indexed trader, PositionCache pic);
export function createUpdatePositionEvent(event: UpdatePosition): UpdatePositionEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'UpdatePosition', event.address, event.params.expiry);

    let entity = new UpdatePositionEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;
    entity.expiry = event.params.expiry;

    entity.trader = event.params.trader;

    entity.balance = event.params.pic.balance;
    entity.size = event.params.pic.size;
    entity.entryNotional = event.params.pic.entryNotional;
    entity.entrySocialLossIndex = event.params.pic.entrySocialLossIndex;
    entity.entryFundingIndex = event.params.pic.entryFundingIndex;

    entity.save();
    return entity;
}

// event UpdateFeeState(uint32 indexed expiry, uint128 protocolFee, uint128 feeIndex);
export function createUpdateFeeStateEvent(event: UpdateFeeState): UpdateFeeStateEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'UpdateFeeState', event.address, event.params.expiry);

    let entity = new UpdateFeeStateEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.expiry = event.params.expiry;
    entity.protocolFee = event.params.protocolFee;
    entity.feeIndex = event.params.feeIndex;

    entity.save();
    return entity;
}

export function createUpdateSocialLossInsuranceFundEvent(
    event: UpdateSocialLossInsuranceFund,
): UpdateSocialLossInsuranceFundEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'UpdateSocialLossInsuranceFund', event.address, event.params.expiry);

    let entity = new UpdateSocialLossInsuranceFundEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.expiry = event.params.expiry;
    entity.longSocialLossIndex = event.params.longSocialLossIndex;
    entity.shortSocialLossIndex = event.params.shortSocialLossIndex;
    entity.insuranceFund = event.params.insuranceFund;

    entity.save();
    return entity;
}

export function createUpdateFundingIndexEvent(event: UpdateFundingIndex): UpdateFundingIndexEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'UpdateFundingIndex', event.address, null);

    let entity = new UpdateFundingIndexEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.fundingIndex = event.params.fundingIndex;

    entity.shortFundingIndex = asInt128(event.params.fundingIndex.rightShift(128));
    entity.longFundingIndex = asInt128(event.params.fundingIndex.bitAnd(MASK_128));

    entity.save();
    return entity;
}

export function createUpdateMarginRatioEvent(event: UpdateMarginRatio): UpdateMarginRatioEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'UpdateMarginRatio', event.address, null);

    let entity = new UpdateMarginRatioEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.initialMarginRatio = event.params.initialMarginRatio;
    entity.maintenanceMarginRatio = event.params.maintenanceMarginRatio;

    entity.save();
    return entity;
}

export function createVirtualTradeEvent(
    eventId: string,
    block: ethereum.Block,
    instrument: Address,
    expiry: BigInt,
    trader: Address,
    size: BigInt,
    entryNotional: BigInt,
    fee: BigInt,
    type: string,
    referralCode: string | null,
): VirtualTrade | null {
    if (size.equals(ZERO)) {
        return null;
    }
    let virtualTrade = new VirtualTrade(concatId(eventId, type));
    virtualTrade.trader = trader;
    virtualTrade.amm = concatId(instrument.toHexString(), expiry.toString());
    virtualTrade.timestamp = block.timestamp;
    virtualTrade.blockNumber = block.number;
    virtualTrade.size = size;
    virtualTrade.tradeValue = entryNotional;
    virtualTrade.price = entryNotional.times(WAD).div(size.abs());
    virtualTrade.fee = fee;
    virtualTrade.type = type;
    virtualTrade.realizedPnl = ZERO;
    virtualTrade.original = eventId;
    virtualTrade.referralCode = referralCode;
    virtualTrade.save();

    return virtualTrade;
}

// event UpdateCondition(uint32 timestamp, Condition condition)
export function createUpdateConditionEvent(event: UpdateCondition): UpdateConditionEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'UpdateCondition', event.address, null);

    let entity = new UpdateConditionEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.timestamp = event.params.timestamp;
    entity.condition = event.params.condition;

    entity.save();
    return entity;
}

//  event UpdateAmmStatus(uint32 indexed expiry, Status status, uint32 timestamp, uint markPWad, address operator);
export function createUpdateAmmStatusEvent(event: UpdateAmmStatus): UpdateAmmStatusEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'UpdateAmmStatus', event.address, event.params.expiry);

    let entity = new UpdateAmmStatusEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.status = event.params.status;
    entity.expiry = event.params.expiry;
    entity.mark = event.params.mark;
    entity.sqrtPX96 = event.params.sqrtPX96;

    entity.save();
    return entity;
}

export function createUpdateParamEvent(event: UpdateParam): UpdateParamEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'UpdateParam', event.address, null);

    let instrument = loadOrNewInstrument(event.address);

    let entity = new UpdateParamEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.quote = instrument.quote;
    entity.tradingFeeRatio = BigInt.fromI32(event.params.param.tradingFeeRatio);
    entity.stabilityFeeRatioParam = event.params.param.stabilityFeeRatioParam;
    entity.protocolFeeRatio = BigInt.fromI32(event.params.param.protocolFeeRatio);
    entity.minMarginAmount = event.params.param.minMarginAmount;
    entity.tip = event.params.param.tip;

    entity.qtype = getQuoteTypeStr(event.params.param.qtype);

    entity.save();
    return entity;
}

export function createDeleteContextEvent(event: DeleteContext): DeleteContextEvent {
    loadOrNewTransaction(event, event.address);

    newTransactionEvent(event, 'DeleteContext', event.address, event.params.expiry);

    let entity = new DeleteContextEvent(getTransactionEventId(event));
    entity.logIndex = event.logIndex.toI32();
    entity.transaction = event.transaction.hash.toHexString();
    entity.address = event.address;

    entity.expiry = event.params.expiry;

    entity.save();
    return entity;
}
