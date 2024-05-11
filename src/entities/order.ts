/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/ban-types */
import { Address, BigInt } from '@graphprotocol/graph-ts';
import { Order, OrderIdCounter } from '../../generated/schema';
import { ONE, ORDER_STATUS_OPEN, ZERO } from '../const';

export function loadOrNewOrder(
    trader: Address,
    instrument: Address,
    expiry: BigInt,
    tick: BigInt,
    nonce: BigInt,
    timestamp: BigInt,
): Order {

    let orderIdCounter = loadOrderIdCounter(
        trader,
        instrument,
        expiry,
        tick,
        nonce);
    
    let id =
        trader.toHexString() +
        '-' +
        instrument.toHexString() +
        '-' +
        expiry.toString() +
        '-' +
        tick.toString() +
        '-' +
        nonce.toString() + 
        '-' + 
        orderIdCounter.counter.toString();

    let order = Order.load(id);
    if (order === null) {
        order = new Order(id);
        order.trader = trader;
        order.amm = instrument.toHexString() + '-' + expiry.toString();
        order.status = ORDER_STATUS_OPEN;
        order.tick = tick.toI32();
        order.nonce = nonce;

        order.balance = ZERO;
        order.size = ZERO;
        order.filledSize = ZERO;
        order.tradeValue = ZERO;
        order.price = ZERO;
        order.fee = ZERO;
        order.createdTimestamp = timestamp;
        order.timestamp = timestamp;
        order.placeEvent = '';
        order.referralCode = null;
        order.save();
    }
    return order as Order;
}

export function increaseOrderIdCounter(
    trader: Address,
    instrument: Address,
    expiry: BigInt,
    tick: BigInt,
    nonce: BigInt,
): OrderIdCounter {
    let id =
        trader.toHexString() +
        '-' +
        instrument.toHexString() +
        '-' +
        expiry.toString() +
        '-' +
        tick.toString() +
        '-' +
        nonce.toString();
    let orderIdCounter = OrderIdCounter.load(id);
    if (orderIdCounter === null) {
        orderIdCounter = new OrderIdCounter(id);
        orderIdCounter.counter = ZERO;
    } else {
        let counter = orderIdCounter.counter;
        orderIdCounter.counter = counter.plus(ONE);
    }
    orderIdCounter.save();
    return orderIdCounter as OrderIdCounter;
}

export function loadOrderIdCounter(
    trader: Address,
    instrument: Address,
    expiry: BigInt,
    tick: BigInt,
    nonce: BigInt,
): OrderIdCounter {
    let id =
        trader.toHexString() +
        '-' +
        instrument.toHexString() +
        '-' +
        expiry.toString() +
        '-' +
        tick.toString() +
        '-' +
        nonce.toString();

    return OrderIdCounter.load(id) as OrderIdCounter;
}