/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/ban-types */
import { Address, BigInt } from '@graphprotocol/graph-ts';
import { Gate, Pending, PendingIdCounter, User, UserVault } from '../../generated/schema';
import { ONE, PENDING_STATUS_PENDING, ZERO } from '../const';
import { StatisticsDataChange, updateStatisticsData } from './stats';
import { Gate as GateContract } from '../../generated/Gate/Gate';

export function loadOrNewUser(trader: Address, timestamp: BigInt): User {
    let user = User.load(trader.toHexString());
    if (user == null) {
        user = new User(trader.toHexString());
        user.createdTime = timestamp;

        let dataChange = new StatisticsDataChange();
        dataChange.timestamp = timestamp;
        dataChange.deltaUserCount = ONE;
        updateStatisticsData(dataChange);
        user.save();
    }
    return user as User;
}

export function loadOrNewUserVault(trader: Address, quote: Address): UserVault {
    let userVault = UserVault.load(trader.toHexString() + '-' + quote.toHexString());
    if (userVault == null) {
        userVault = new UserVault(trader.toHexString() + '-' + quote.toHexString());
        userVault.user = trader.toHexString();
        userVault.balance = ZERO;
        userVault.quote = quote.toHexString();
        userVault.totalDeposit = ZERO;
        userVault.totalWithdraw = ZERO;
        userVault.save();
    }
    return userVault as UserVault;
}

export function loadOrNewGate(gateAddr: Address): Gate {
    let gate = Gate.load(gateAddr.toHexString());
    if (gate == null) {
        gate = new Gate(gateAddr.toHexString());
        gate.pendingDuration = GateContract.bind(gateAddr).pendingDuration();
        gate.save();
    }
    return gate as Gate;
}

export function loadOrNewPending(quote: Address, trader: Address): Pending {
    let pendingIdCounter = loadPendingIdCounter(quote, trader);

    let id = quote.toHexString() + '-' + trader.toHexString() + '-' + pendingIdCounter.counter.toString();

    let pending = Pending.load(id);
    if (pending == null) {
        pending = new Pending(id);
        pending.trader = trader;
        pending.quote = quote;

        pending.timestamp = ZERO;
        pending.native = false;
        pending.amount = ZERO;
        pending.exemption = ZERO;
        pending.status = PENDING_STATUS_PENDING;
        pending.save();
    }
    return pending as Pending;
}

export function increasePendingIdCounter(quote: Address, trader: Address): PendingIdCounter {
    let id = quote.toHexString() + '-' + trader.toHexString();
    let pendingIdCounter = PendingIdCounter.load(id);
    if (pendingIdCounter == null) {
        pendingIdCounter = new PendingIdCounter(id);
        pendingIdCounter.counter = ZERO;
    } else {
        let counter = pendingIdCounter.counter;
        pendingIdCounter.counter = counter.plus(ONE);
    }
    pendingIdCounter.save();
    return pendingIdCounter as PendingIdCounter;
}

export function loadPendingIdCounter(quote: Address, trader: Address): PendingIdCounter {
    let id = quote.toHexString() + '-' + trader.toHexString();
    let pendingIdCounter = PendingIdCounter.load(id);
    if (pendingIdCounter == null) {
        pendingIdCounter = new PendingIdCounter(id);
        pendingIdCounter.counter = ZERO;
    }
    return pendingIdCounter as PendingIdCounter;
}
