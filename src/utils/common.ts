/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable prefer-const */
import { Address, ethereum, BigInt, log, Bytes } from '@graphprotocol/graph-ts';
import { ERC20 as ERC20Contract } from '../../generated/Gate/ERC20';
import { CexMarket as CexMarketContract } from '../../generated/Config/CexMarket';
import { DexV2Market as DexV2MarketContract } from '../../generated/Config/DexV2Market';
import { Config as ConfigContract, Config__getQuoteParamResultValue0Struct } from '../../generated/Config/Config';
import { Config } from '../../generated/schema';

import {
    DEXV2,
    MASK_24,
    MAX_INT_128,
    MAX_INT_24,
    ONE,
    PERP_EXPIRY,
    SECONDS_PER_4HOUR,
    SECONDS_PER_DAY,
    SECONDS_PER_HOUR,
    ZERO,
    ZERO_ADDRESS,
    ZERO_ADDRESS_STR,
} from '../const';
import { dayMonthYearFromTimestamp } from './date';
import { loadOrNewAmm, loadOrNewInstrument } from '../entities/instrument';
import { CexMarket, DexV2Market } from '../../generated/schema';

export function toBigInt(integer: i32): BigInt {
    return BigInt.fromI32(integer);
}

export class TokenInfo {
    address: string;
    name: string;
    symbol: string;
    decimals: BigInt;
}

export function getErc20Info(address: Address): TokenInfo {
    let contract = ERC20Contract.bind(address);
    return {
        address: address.toHexString(),
        name: contract.name(),
        symbol: contract.symbol(),
        decimals: BigInt.fromI32(contract.decimals()),
    };
}

export function getMarkPrice(instrumentAddr: Address, expiry: BigInt): BigInt {
    let instrument = loadOrNewInstrument(instrumentAddr);
    let amm = loadOrNewAmm(instrumentAddr, expiry, ZERO);
    if (amm.status == 'SETTLED') {
        return amm.settlementPrice;
    }
    if (instrument.cexMarket !== null) {
        let cexMarket = CexMarket.load(instrument.cexMarket!)!;
        let cexMarketContract = CexMarketContract.bind(Address.fromString(cexMarket.id));
        let status = getAmmStatusFromStr(amm.status);
        let callResult = cexMarketContract.try_getMarkPrice(instrumentAddr, expiry, status);
        if (callResult.reverted) {
            log.debug('getMarkPrice reverted on chainlink {} instrument {} expiry {} status {}', [
                cexMarket.id,
                instrumentAddr.toHexString(),
                expiry.toHexString(),
                status.toString(),
            ]);
            return ZERO;
        } else {
            return callResult.value;
        }
    } else if (instrument.dexV2Market !== null) {
        let dexv2Market = DexV2Market.load(instrument.dexV2Market!)!;
        let dexv2MarketContract = DexV2MarketContract.bind(Address.fromString(dexv2Market.id));
        let status = getAmmStatusFromStr(amm.status);
        let callResult = dexv2MarketContract.try_getMarkPrice(instrumentAddr, expiry, status);
        if (callResult.reverted) {
            log.debug('getMarkPrice reverted on dexv2 {} instrument {} expiry {} status {}', [
                dexv2Market.id,
                instrumentAddr.toHexString(),
                expiry.toHexString(),
                status.toString(),
            ]);
            return ZERO;
        } else {
            return callResult.value;
        }
    } else {
        return ZERO;
    }
}

export function getMarketAddress(type: string): Address {
    let config = Config.load(ZERO_ADDRESS_STR);
    if (config == null) {
        return ZERO_ADDRESS;
    }
    let contract = ConfigContract.bind(Address.fromBytes(config.address));
    let info = contract.getMarketInfo(type);
    return info.market;
}

export function getCompactEmaParam(marketType: string, marketAddr: Address): BigInt {
    if (marketType === DEXV2) {
        return DexV2MarketContract.bind(marketAddr).getCompactEmaParam();
    } else {
        return CexMarketContract.bind(marketAddr).getCompactEmaParam();
    }
}

export function getQuoteParam(quoteAddr: Address): Config__getQuoteParamResultValue0Struct {
    let config = Config.load(ZERO_ADDRESS_STR);
    let contract = ConfigContract.bind(Address.fromBytes(config!.address));
    return contract.getQuoteParam(quoteAddr);
}

export function hourIdFromTimestamp(timestamp: BigInt): BigInt {
    return timestamp.div(SECONDS_PER_HOUR).times(SECONDS_PER_HOUR);
}

export function per4HourIdFromTimestamp(timestamp: BigInt): BigInt {
    return timestamp.div(SECONDS_PER_4HOUR).times(SECONDS_PER_4HOUR);
}

export function dayIdFromTimestamp(timestamp: BigInt): BigInt {
    return timestamp.div(SECONDS_PER_DAY).times(SECONDS_PER_DAY);
}

export function weekIdFromTimestamp(timestamp: BigInt): BigInt {
    const daysOfWeek = BigInt.fromI32(7);
    const dayOfWeek = timestamp
        .div(SECONDS_PER_DAY)
        .plus(BigInt.fromI32(4))
        .mod(daysOfWeek)
        .plus(daysOfWeek)
        .mod(daysOfWeek);
    const diff = timestamp
        .div(SECONDS_PER_DAY)
        .minus(dayOfWeek)
        .plus(dayOfWeek.equals(BigInt.fromI32(0)) ? BigInt.fromI32(-6) : BigInt.fromI32(1));
    return diff.times(SECONDS_PER_DAY);
}

export function getTransactionEventId(event: ethereum.Event): string {
    return concatId(event.transaction.hash.toHexString(), event.logIndex.toHexString());
}

export function getAmmId(instrument: string | null, expiry: BigInt | null): string | null {
    if (!instrument || !expiry) {
        return null;
    }
    return concatId(instrument!, expiry.toString());
}

export function concatId(id1: string, id2: string): string {
    return id1.concat('-').concat(id2);
}

export function serializeParameters(parameters: Array<ethereum.EventParam>): string {
    let json = ``;
    for (let i = 0; i < parameters.length; i++) {
        let parameter = parameters[i];
        let valueStr = serializeValue(parameter.value);
        json = json + `"` + parameter.name + `":` + valueStr + ',';
    }
    json = json.substring(0, json.lastIndexOf(','));
    return '{' + json + '}';
}

function serializeValue(value: ethereum.Value): string {
    switch (value.kind) {
        case ethereum.ValueKind.ADDRESS:
            return `"` + value.toAddress().toHexString() + `"`;
        case ethereum.ValueKind.BOOL:
            return value.toBoolean() ? `"true"` : `"false"`;
        case ethereum.ValueKind.BYTES:
        case ethereum.ValueKind.FIXED_BYTES:
            return `"` + value.toBytes().toHexString() + `"`;
        case ethereum.ValueKind.INT:
        case ethereum.ValueKind.UINT:
            return `"` + value.toBigInt().toString() + `"`;
        case ethereum.ValueKind.STRING:
            return `"` + value.toString() + `"`;
        case ethereum.ValueKind.ARRAY:
        case ethereum.ValueKind.FIXED_ARRAY:
            let arrayValues: Array<string> = [];
            let values: Array<ethereum.Value> = value.toArray();
            for (let i = 0; i < values.length; i++) {
                arrayValues.push(serializeValue(values[i]));
            }
            return '[' + arrayValues.join(',') + ']';
        case ethereum.ValueKind.TUPLE:
            let tupleValues: Array<string> = [];
            let tuple: ethereum.Tuple = value.toTuple();
            for (let i = 0; i < tuple.length; i++) {
                tupleValues.push(serializeValue(tuple[i]));
            }
            return '[' + tupleValues.join(',') + ']';
        default:
            return value.toString();
    }
}

export function findArg(parameters: Array<ethereum.EventParam>, argName: string): ethereum.EventParam | null {
    for (let i = 0; i < parameters.length; i++) {
        let parameter = parameters[i];
        if (parameter.name == argName) {
            return parameter;
        }
    }
    return null;
}

export function getBaseId(addr: string, symbol: string): string {
    return concatId(addr, symbol);
}

export function getQuoteParamId(marketType: string, quoteAddr: string): string {
    return concatId(marketType, quoteAddr);
}

// solidity can not get the string value of a enum itself
export function getQuoteTypeStr(quoteType: number): string {
    if (quoteType === 1) {
        return 'STABLE';
    } else if (quoteType === 2) {
        return 'NONSTABLE';
    } else {
        return 'INVALID';
    }
}

export function getFeederTypeStr(feederType: number): string {
    if (feederType === 0) {
        return 'NONE_STABLE';
    } else if (feederType === 1) {
        return 'QUOTE_STABLE';
    } else if (feederType === 2) {
        return 'BASE_STABLE';
    } else {
        return 'BOTH_STABLE';
    }
}

export function getAmmStatusStr(status: number): string {
    if (status === 0) {
        return 'DORMANT';
    } else if (status === 1) {
        return 'TRADING';
    } else if (status === 2) {
        return 'SETTLING';
    } else {
        return 'SETTLED';
    }
}

function getAmmStatusFromStr(status: string): i32 {
    if (status == 'DORMANT') {
        return 0;
    } else if (status == 'TRADING') {
        return 1;
    } else if (status == 'SETTLING') {
        return 2;
    } else {
        return 3;
    }
}

export function getConditionStr(condition: number): string {
    if (condition === 0) {
        return 'NORMAL';
    } else if (condition === 1) {
        return 'FROZEN';
    } else {
        return 'RESOLVED';
    }
}

export function formatExpiry(expiry: BigInt): string {
    return expiry == PERP_EXPIRY ? 'PERP' : formatDate(expiry);
}

function formatDate(timestamp: BigInt): string {
    let date = dayMonthYearFromTimestamp(timestamp);
    let formattedDate = date.year.toString() + padZero(date.month) + padZero(date.day);
    return formattedDate;
}

function padZero(value: BigInt): string {
    return value.le(toBigInt(10)) ? '0' + value.toString() : value.toString();
}

export function asInt128(x: BigInt): BigInt {
    if (x.gt(MAX_INT_128)) {
        x = x.minus(ONE.leftShift(128));
    }
    return x;
}

export function asInt24(x: BigInt): BigInt {
    if (x.gt(MAX_INT_24)) {
        x = x.minus(ONE.leftShift(24));
    }
    return x;
}

export function decodeReferralCode(input: Bytes): string {
    // only parse Insturment.sol `add(bytes32[2])` 7dc485ea  `place(bytes32[2])` e9544d84 `trade(bytes32[2])` 50347fcb tx
    let sig = input.toHexString().slice(2, 10).toLowerCase();
    if (sig != '7dc485ea' && sig != 'e9544d84' && sig != '50347fcb') return '';

    let referralCode = input.toHexString().slice(10, 26);
    // convert hex to string
    let decoded = '';
    for (let i = 0; i < referralCode.length; i += 2) {
        let hexPair = referralCode.substr(i, 2);
        if (hexPair === '00') {
            continue;
        }
        let parsedValue = parseInt(hexPair, 16);
        if (isNaN(parsedValue)) {
            throw new Error(`Invalid hex value: ${hexPair}`);
        }
        decoded += String.fromCharCode(i32(parsedValue));
    }
    return decoded;
}

export class TickRange {
    constructor(public tickLower: BigInt, public tickUpper: BigInt) {}
}

// find RangeTicks depending on key
export function parseTicks(key: BigInt): TickRange {
    const tickLower = asInt24(key.rightShift(24));
    const tickUpper = asInt24(key.bitAnd(MASK_24));
    return new TickRange(tickLower, tickUpper);
}
