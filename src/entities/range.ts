/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/ban-types */
import { Address, BigInt } from '@graphprotocol/graph-ts';
import { Range, RangeIdCounter } from '../../generated/schema';
import { ONE, RANGE_STATUS_OPEN, ZERO } from '../const';

export function loadOrNewRange(
    trader: Address,
    instrument: Address,
    expiry: BigInt,
    tickLower: BigInt,
    tickUpper: BigInt,
): Range {
    let rangeIdCounter = loadRangeIdCounter(trader, instrument, expiry, tickLower, tickUpper);

    let id =
        trader.toHexString() +
        '-' +
        instrument.toHexString() +
        '-' +
        expiry.toString() +
        '-' +
        tickLower.toString() +
        '-' +
        tickUpper.toString() +
        '-' +
        rangeIdCounter.counter.toString();

    let range = Range.load(id);
    if (range === null) {
        range = new Range(id);
        range.trader = trader;
        range.amm = instrument.toHexString() + '-' + expiry.toString();

        range.tickLower = tickLower.toI32();
        range.tickUpper = tickUpper.toI32();

        range.status = RANGE_STATUS_OPEN;

        range.liquidity = ZERO;
        range.balance = ZERO;
        range.sqrtEntryPX96 = ZERO;
        range.entryFeeIndex = ZERO;

        range.save();
    }
    return range as Range;
}


export function increaseRangeIdCounter(
    trader: Address,
    instrument: Address,
    expiry: BigInt,
    tickLower: BigInt,
    tickUpper: BigInt,
): RangeIdCounter {
    let id =
        trader.toHexString() +
        '-' +
        instrument.toHexString() +
        '-' +
        expiry.toString() +
        '-' +
        tickLower.toString() +
        '-' +
        tickUpper.toString();

        let rangeIdCounter = RangeIdCounter.load(id);
        if (rangeIdCounter === null) {
            rangeIdCounter = new RangeIdCounter(id);
            rangeIdCounter.counter = ZERO;
        } else {
            let counter = rangeIdCounter.counter;
            rangeIdCounter.counter = counter.plus(ONE);
        }
        rangeIdCounter.save();
        return rangeIdCounter as RangeIdCounter;        
}

export function loadRangeIdCounter(
    trader: Address,
    instrument: Address,
    expiry: BigInt,
    tickLower: BigInt,
    tickUpper: BigInt,
): RangeIdCounter {
    let id =
        trader.toHexString() +
        '-' +
        instrument.toHexString() +
        '-' +
        expiry.toString() +
        '-' +
        tickLower.toString() +
        '-' +
        tickUpper.toString();

    return RangeIdCounter.load(id) as RangeIdCounter;
}
