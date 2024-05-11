/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/ban-types */
/**
 * @description Data loader and saver for trading stats data such as InstrumentData, AmmData,
 * DailyAmmData, tradingVolume, fee...
 * @file stats.ts
 * @version 1.0.0
 * @author Eric Fan <eric.fan@syninstrument.com>
 * @copyright (c) 2021 Syninstrument.Inc
 * @license MIT license
 * @date 2023-06-14 14:46:25
 */
import { ZERO, ZERO_ADDRESS_STR, ZERO_ADDRESS } from '../const';
import {
    QuoteData,
    AmmData,
    DailyQuoteData,
    DailyAmmData,
    HourlyAmmData,
    InstrumentData,
    DailyInstrumentData,
    UserData,
    UserQuoteData,
    DailyUserQuoteData,
    GlobalStatsData,
    WeeklyAmmData,
    DailyGlobalStatsData,
    Per4HourAmmData,
} from '../../generated/schema';
import {
    concatId,
    dayIdFromTimestamp,
    getQuoteParam,
    hourIdFromTimestamp,
    per4HourIdFromTimestamp,
    weekIdFromTimestamp,
} from '../utils/common';
import { Address } from '@graphprotocol/graph-ts';
import { BigInt } from '@graphprotocol/graph-ts';
import { loadOrNewAmm, loadOrNewInstrumentSetting } from './instrument';

const RATIO_BASE = BigInt.fromU64(10000);

export function loadOrNewGlobalStatsData(): GlobalStatsData {
    let globalData = GlobalStatsData.load(ZERO_ADDRESS_STR);
    if (globalData === null) {
        globalData = new GlobalStatsData(ZERO_ADDRESS_STR);
        globalData.totalUsers = ZERO;
        globalData.totalInstruments = ZERO;
        globalData.totalAmms = ZERO;
        globalData.totalTxCount = ZERO;
        globalData.totalTradeCount = ZERO;
        globalData.totalDepositCount = ZERO;
        globalData.totalWithdrawCount = ZERO;
        globalData.totalLiquidationCount = ZERO;
        globalData.totalLiquidityCount = ZERO;
        globalData.save();
    }
    return globalData as GlobalStatsData;
}

export function loadOrNewDailyGlobalStatsData(timestamp: BigInt): DailyGlobalStatsData {
    let id = concatId(ZERO_ADDRESS_STR, dayIdFromTimestamp(timestamp).toString());
    let globalData = DailyGlobalStatsData.load(id);
    if (globalData === null) {
        globalData = new DailyGlobalStatsData(id);
        globalData.timestamp = dayIdFromTimestamp(timestamp);
        globalData.totalUsers = ZERO;
        globalData.totalInstruments = ZERO;
        globalData.totalAmms = ZERO;
        globalData.totalTxCount = ZERO;
        globalData.totalTradeCount = ZERO;
        globalData.totalDepositCount = ZERO;
        globalData.totalWithdrawCount = ZERO;
        globalData.totalLiquidationCount = ZERO;
        globalData.totalLiquidityCount = ZERO;
        globalData.save();
    }
    return globalData as DailyGlobalStatsData;
}

export function loadOrNewInstrumentData(instrumentAddr: string): InstrumentData {
    let instrumentData = InstrumentData.load(instrumentAddr);
    if (instrumentData === null) {
        instrumentData = new InstrumentData(instrumentAddr);
        instrumentData.instrument = instrumentAddr;

        instrumentData.totalUsers = ZERO;
        instrumentData.totalAmms = ZERO;
        instrumentData.totalBaseVolume = ZERO;
        instrumentData.totalVolume = ZERO;
        instrumentData.totalValueLocked = ZERO;
        instrumentData.totalPoolFee = ZERO;
        instrumentData.totalLiquidityFee = ZERO;
        instrumentData.totalProtocolFee = ZERO;

        instrumentData.save();
    }
    return instrumentData as InstrumentData;
}

export function loadOrNewDailyInstrumentData(instrumentAddr: string, timestamp: BigInt): DailyInstrumentData {
    let id = concatId(instrumentAddr, dayIdFromTimestamp(timestamp).toString());
    let dailyInstrumentData = DailyInstrumentData.load(id);
    if (dailyInstrumentData === null) {
        dailyInstrumentData = new DailyInstrumentData(id);
        dailyInstrumentData.instrument = instrumentAddr;
        dailyInstrumentData.timestamp = dayIdFromTimestamp(timestamp);

        dailyInstrumentData.volume = ZERO;
        dailyInstrumentData.baseVolume = ZERO;
        dailyInstrumentData.valueLocked = ZERO;
        dailyInstrumentData.poolFee = ZERO;
        dailyInstrumentData.liquidityFee = ZERO;
        dailyInstrumentData.protocolFee = ZERO;

        dailyInstrumentData.totalBaseVolume = ZERO;
        dailyInstrumentData.totalVolume = ZERO;
        dailyInstrumentData.totalValueLocked = ZERO;
        dailyInstrumentData.totalPoolFee = ZERO;
        dailyInstrumentData.totalLiquidityFee = ZERO;
        dailyInstrumentData.totalProtocolFee = ZERO;

        dailyInstrumentData.save();
    }
    return dailyInstrumentData as DailyInstrumentData;
}

export function loadOrNewQuoteData(quoteId: string): QuoteData {
    let quoteData = QuoteData.load(quoteId);
    if (quoteData === null) {
        quoteData = new QuoteData(quoteId);
        quoteData.quote = quoteId;

        quoteData.totalVolume = ZERO;
        quoteData.totalValueLocked = ZERO;
        quoteData.totalPoolFee = ZERO;
        quoteData.totalLiquidityFee = ZERO;
        quoteData.totalProtocolFee = ZERO;

        quoteData.save();
    }
    return quoteData as QuoteData;
}

export function loadOrNewDailyQuoteData(quoteId: string, timestamp: BigInt): DailyQuoteData {
    let id = concatId(quoteId, dayIdFromTimestamp(timestamp).toString());
    let dailyQuoteData = DailyQuoteData.load(id);
    if (dailyQuoteData === null) {
        dailyQuoteData = new DailyQuoteData(id);
        dailyQuoteData.quote = quoteId;
        dailyQuoteData.timestamp = dayIdFromTimestamp(timestamp);

        dailyQuoteData.volume = ZERO;
        dailyQuoteData.valueLocked = ZERO;
        dailyQuoteData.poolFee = ZERO;
        dailyQuoteData.liquidityFee = ZERO;
        dailyQuoteData.protocolFee = ZERO;

        dailyQuoteData.totalVolume = ZERO;
        dailyQuoteData.totalValueLocked = ZERO;
        dailyQuoteData.totalPoolFee = ZERO;
        dailyQuoteData.totalLiquidityFee = ZERO;
        dailyQuoteData.totalProtocolFee = ZERO;

        dailyQuoteData.save();
    }
    return dailyQuoteData as DailyQuoteData;
}

export function loadOrNewAmmData(ammId: string): AmmData {
    let pairData = AmmData.load(ammId);
    if (pairData === null) {
        pairData = new AmmData(ammId);
        pairData.amm = ammId;

        pairData.totalBaseVolume = ZERO;
        pairData.totalVolume = ZERO;
        pairData.totalPoolFee = ZERO;
        pairData.totalLiquidityFee = ZERO;
        pairData.totalProtocolFee = ZERO;
        pairData.totalValueLocked = ZERO;
        pairData.save();
    }
    return pairData as AmmData;
}

export function loadOrNewHourlyAmmData(ammId: string, timestamp: BigInt): HourlyAmmData {
    let id = concatId(ammId, hourIdFromTimestamp(timestamp).toString());
    let hourlyAmmData = HourlyAmmData.load(id);
    if (hourlyAmmData === null) {
        hourlyAmmData = new HourlyAmmData(id);
        hourlyAmmData.amm = ammId;
        hourlyAmmData.timestamp = hourIdFromTimestamp(timestamp);

        hourlyAmmData.baseVolume = ZERO;
        hourlyAmmData.volume = ZERO;
        hourlyAmmData.poolFee = ZERO;
        hourlyAmmData.liquidityFee = ZERO;
        hourlyAmmData.protocolFee = ZERO;

        hourlyAmmData.open = ZERO;
        hourlyAmmData.close = ZERO;
        hourlyAmmData.high = ZERO;
        hourlyAmmData.low = ZERO;

        hourlyAmmData.firstFundingIndex = ZERO;
        hourlyAmmData.lastFundingIndex = ZERO;
        hourlyAmmData.firstMarkPrice = ZERO;
        hourlyAmmData.lastMarkPrice = ZERO;

        hourlyAmmData.save();
    }
    return hourlyAmmData as HourlyAmmData;
}

export function loadOrNewPer4HourAmmData(ammId: string, timestamp: BigInt): Per4HourAmmData {
    let id = concatId(ammId, per4HourIdFromTimestamp(timestamp).toString());
    let per4HourAmmData = Per4HourAmmData.load(id);
    if (per4HourAmmData === null) {
        per4HourAmmData = new Per4HourAmmData(id);
        per4HourAmmData.amm = ammId;
        per4HourAmmData.timestamp = per4HourIdFromTimestamp(timestamp);

        per4HourAmmData.baseVolume = ZERO;
        per4HourAmmData.volume = ZERO;
        per4HourAmmData.poolFee = ZERO;
        per4HourAmmData.liquidityFee = ZERO;
        per4HourAmmData.protocolFee = ZERO;

        per4HourAmmData.open = ZERO;
        per4HourAmmData.close = ZERO;
        per4HourAmmData.high = ZERO;
        per4HourAmmData.low = ZERO;

        per4HourAmmData.save();
    }
    return per4HourAmmData as Per4HourAmmData;
}

export function loadOrNewDailyAmmData(ammId: string, timestamp: BigInt): DailyAmmData {
    let id = concatId(ammId, dayIdFromTimestamp(timestamp).toString());
    let dailyAmmData = DailyAmmData.load(id);
    if (dailyAmmData === null) {
        dailyAmmData = new DailyAmmData(id);
        dailyAmmData.amm = ammId;
        dailyAmmData.timestamp = dayIdFromTimestamp(timestamp);

        dailyAmmData.baseVolume = ZERO;
        dailyAmmData.volume = ZERO;
        dailyAmmData.poolFee = ZERO;
        dailyAmmData.liquidityFee = ZERO;
        dailyAmmData.protocolFee = ZERO;

        dailyAmmData.totalValueLocked = ZERO;
        dailyAmmData.totalBaseVolume = ZERO;
        dailyAmmData.totalVolume = ZERO;
        dailyAmmData.totalPoolFee = ZERO;
        dailyAmmData.totalLiquidityFee = ZERO;
        dailyAmmData.totalProtocolFee = ZERO;

        dailyAmmData.open = ZERO;
        dailyAmmData.close = ZERO;
        dailyAmmData.high = ZERO;
        dailyAmmData.low = ZERO;
        dailyAmmData.save();
    }
    return dailyAmmData as DailyAmmData;
}

export function loadOrNewWeeklyAmmData(ammId: string, timestamp: BigInt): WeeklyAmmData {
    let id = concatId(ammId, weekIdFromTimestamp(timestamp).toString());
    let weeklyAmmData = WeeklyAmmData.load(id);
    if (weeklyAmmData === null) {
        weeklyAmmData = new WeeklyAmmData(id);
        weeklyAmmData.amm = ammId;
        weeklyAmmData.timestamp = weekIdFromTimestamp(timestamp);

        weeklyAmmData.baseVolume = ZERO;
        weeklyAmmData.volume = ZERO;
        weeklyAmmData.poolFee = ZERO;
        weeklyAmmData.liquidityFee = ZERO;
        weeklyAmmData.protocolFee = ZERO;

        weeklyAmmData.open = ZERO;
        weeklyAmmData.close = ZERO;
        weeklyAmmData.high = ZERO;
        weeklyAmmData.low = ZERO;
        weeklyAmmData.save();
    }
    return weeklyAmmData as WeeklyAmmData;
}

export function loadOrNewUserData(trader: Address): UserData {
    let userData = UserData.load(trader.toHexString());
    if (userData === null) {
        userData = new UserData(trader.toHexString());
        userData.id = trader.toHexString();
        userData.user = trader.toHexString();
        userData.txCount = ZERO;
        userData.tradeCount = ZERO;
        userData.depositCount = ZERO;
        userData.withdrawCount = ZERO;
        userData.liquidationCount = ZERO;
        userData.liquidityCount = ZERO;
        userData.save();
    }
    return userData as UserData;
}

export function loadOrNewUserQuoteData(trader: Address, quoteId: string): UserQuoteData {
    // UserQuoteData
    let id = concatId(trader.toHexString(), quoteId);
    let userQuoteData = UserQuoteData.load(id);
    if (userQuoteData === null) {
        userQuoteData = new UserQuoteData(id);
        userQuoteData.user = trader.toHexString();
        userQuoteData.quote = quoteId;
        userQuoteData.volume = ZERO;
        userQuoteData.save();
    }
    return userQuoteData as UserQuoteData;
}

export function loadOrNewDailyUserQuoteData(trader: Address, quoteId: string, timestamp: BigInt): DailyUserQuoteData {
    let dayId = dayIdFromTimestamp(timestamp);
    let id = concatId(trader.toHexString(), concatId(quoteId, dayId.toString()));
    let dailyUserQuoteData = DailyUserQuoteData.load(id);
    if (dailyUserQuoteData === null) {
        dailyUserQuoteData = new DailyUserQuoteData(id);
        dailyUserQuoteData.user = trader.toHexString();
        dailyUserQuoteData.quote = quoteId;
        dailyUserQuoteData.timestamp = dayId;
        dailyUserQuoteData.volume = ZERO;
        dailyUserQuoteData.save();
    }
    return dailyUserQuoteData as DailyUserQuoteData;
}

export class StatisticsDataChange {
    instrumentAddr: Address = ZERO_ADDRESS;
    expiry: BigInt = ZERO;
    traderAddr: Address = ZERO_ADDRESS;
    timestamp: BigInt = ZERO;
    quote: string = '';

    tradePrice: BigInt = ZERO;

    // size.abs()
    deltaBaseVolume: BigInt = ZERO;
    deltaVolume: BigInt = ZERO;
    deltaPoolFee: BigInt = ZERO;
    deltaLiquidityFee: BigInt = ZERO;
    deltaProtocolFee: BigInt = ZERO;
    deltaLockedValue: BigInt = ZERO;

    deltaAccountCount: BigInt = ZERO;
    deltaUserCount: BigInt = ZERO;
    deltaAmmCount: BigInt = ZERO;
    deltaInstrumentCount: BigInt = ZERO;
    deltaQuoteCount: BigInt = ZERO;

    deltaTxCount: BigInt = ZERO;
    deltaTradeCount: BigInt = ZERO;
    deltaDepositCount: BigInt = ZERO;
    deltaWithdrawCount: BigInt = ZERO;
    deltaLiquidityCount: BigInt = ZERO;
    deltaLiquidationCount: BigInt = ZERO;

    // funding rate related
    fundingIndex: BigInt = ZERO;
    markPrice: BigInt = ZERO;
}

export function updateStatisticsData(dataChange: StatisticsDataChange): void {
    updateGlobalData(dataChange);

    updateUserData(dataChange);
    updateUserQuoteData(dataChange);
    updateDailyUserQuoteData(dataChange);

    updateQuoteData(dataChange);
    updateDailyQuoteData(dataChange);

    updateInstrumentData(dataChange);
    updateDailyInstrumentData(dataChange);

    updateAmmData(dataChange);
    updateHourlyAmmData(dataChange);
    updatePer4HourAmmData(dataChange);
    updateDailyAmmData(dataChange);
    updateWeeklyAmmData(dataChange);
}

export function updateGlobalData(data: StatisticsDataChange): void {
    let globalData = loadOrNewGlobalStatsData();

    globalData.totalUsers = globalData.totalUsers.plus(data.deltaUserCount);
    globalData.totalInstruments = globalData.totalInstruments.plus(data.deltaInstrumentCount);
    globalData.totalAmms = globalData.totalAmms.plus(data.deltaAmmCount);

    globalData.totalTxCount = globalData.totalTxCount.plus(data.deltaTxCount);
    globalData.totalTradeCount = globalData.totalTradeCount.plus(data.deltaTradeCount);
    globalData.totalDepositCount = globalData.totalDepositCount.plus(data.deltaDepositCount);
    globalData.totalWithdrawCount = globalData.totalWithdrawCount.plus(data.deltaWithdrawCount);
    globalData.totalLiquidityCount = globalData.totalLiquidityCount.plus(data.deltaLiquidityCount);
    globalData.totalLiquidationCount = globalData.totalLiquidationCount.plus(data.deltaLiquidationCount);
    globalData.save();

    if (data.timestamp === ZERO) {
        return;
    }
    let dailyGlobalData = loadOrNewDailyGlobalStatsData(data.timestamp);
    dailyGlobalData.timestamp = dayIdFromTimestamp(data.timestamp);
    dailyGlobalData.totalUsers = globalData.totalUsers;
    dailyGlobalData.totalInstruments = globalData.totalInstruments;
    dailyGlobalData.totalAmms = globalData.totalAmms;
    dailyGlobalData.totalTxCount = globalData.totalTxCount;
    dailyGlobalData.totalTradeCount = globalData.totalTradeCount;
    dailyGlobalData.totalDepositCount = globalData.totalDepositCount;
    dailyGlobalData.totalWithdrawCount = globalData.totalWithdrawCount;
    dailyGlobalData.totalLiquidityCount = globalData.totalLiquidityCount;
    dailyGlobalData.totalLiquidationCount = globalData.totalLiquidationCount;
    dailyGlobalData.save();
}

export function updateUserData(data: StatisticsDataChange): void {
    if (data.traderAddr === ZERO_ADDRESS) {
        return;
    }
    let userData = loadOrNewUserData(data.traderAddr);
    userData.txCount = userData.txCount.plus(data.deltaTxCount);
    userData.tradeCount = userData.tradeCount.plus(data.deltaTradeCount);
    userData.depositCount = userData.depositCount.plus(data.deltaDepositCount);
    userData.withdrawCount = userData.withdrawCount.plus(data.deltaWithdrawCount);
    userData.liquidityCount = userData.liquidityCount.plus(data.deltaLiquidityCount);
    userData.liquidationCount = userData.liquidationCount.plus(data.deltaLiquidationCount);
    userData.save();
}

export function updateUserQuoteData(data: StatisticsDataChange): void {
    if (data.quote === '' || data.traderAddr === ZERO_ADDRESS || data.deltaVolume.equals(ZERO)) {
        return;
    }
    let userQuoteData = loadOrNewUserQuoteData(data.traderAddr, data.quote);
    userQuoteData.volume = userQuoteData.volume.plus(data.deltaVolume);
    userQuoteData.save();
}

export function updateDailyUserQuoteData(data: StatisticsDataChange): void {
    if (
        data.quote === '' ||
        data.timestamp === ZERO ||
        data.traderAddr === ZERO_ADDRESS ||
        data.deltaVolume.equals(ZERO)
    ) {
        return;
    }
    let dailyUserQuoteData = loadOrNewDailyUserQuoteData(data.traderAddr, data.quote, data.timestamp);
    dailyUserQuoteData.volume = dailyUserQuoteData.volume.plus(data.deltaVolume);
    dailyUserQuoteData.save();
}

export function updateQuoteData(data: StatisticsDataChange): void {
    if (data.quote === '') {
        return;
    }
    if (data.deltaVolume.equals(ZERO) && data.deltaLockedValue.equals(ZERO)) {
        return;
    }
    let quoteData = loadOrNewQuoteData(data.quote);
    quoteData.totalVolume = quoteData.totalVolume.plus(data.deltaVolume);
    quoteData.totalPoolFee = quoteData.totalPoolFee.plus(data.deltaPoolFee);
    quoteData.totalLiquidityFee = quoteData.totalLiquidityFee.plus(data.deltaLiquidityFee);
    quoteData.totalProtocolFee = quoteData.totalProtocolFee.plus(data.deltaProtocolFee);
    quoteData.totalValueLocked = quoteData.totalValueLocked.plus(data.deltaLockedValue);
    quoteData.save();
}

export function updateDailyQuoteData(data: StatisticsDataChange): void {
    if (data.quote === '') {
        return;
    }
    if (data.timestamp === ZERO) {
        return;
    }
    if (data.deltaVolume.equals(ZERO) && data.deltaLockedValue.equals(ZERO)) {
        return;
    }
    let quoteData = loadOrNewQuoteData(data.quote);
    let dailyQuoteData = loadOrNewDailyQuoteData(data.quote, data.timestamp);

    dailyQuoteData.totalVolume = quoteData.totalVolume;
    dailyQuoteData.totalPoolFee = quoteData.totalPoolFee;
    dailyQuoteData.totalLiquidityFee = quoteData.totalLiquidityFee;
    dailyQuoteData.totalProtocolFee = quoteData.totalProtocolFee;
    dailyQuoteData.totalValueLocked = quoteData.totalValueLocked;

    dailyQuoteData.volume = dailyQuoteData.volume.plus(data.deltaVolume);
    dailyQuoteData.valueLocked = dailyQuoteData.valueLocked.plus(data.deltaLockedValue);
    dailyQuoteData.poolFee = dailyQuoteData.poolFee.plus(data.deltaPoolFee);
    dailyQuoteData.liquidityFee = dailyQuoteData.liquidityFee.plus(data.deltaLiquidityFee);
    dailyQuoteData.protocolFee = dailyQuoteData.protocolFee.plus(data.deltaProtocolFee);

    dailyQuoteData.save();
}

export function updateInstrumentData(data: StatisticsDataChange): void {
    if (data.instrumentAddr === ZERO_ADDRESS) {
        return;
    }
    let instrumentData = loadOrNewInstrumentData(data.instrumentAddr.toHexString());
    instrumentData.totalUsers = instrumentData.totalUsers.plus(data.deltaAccountCount);
    instrumentData.totalAmms = instrumentData.totalAmms.plus(data.deltaAmmCount);
    instrumentData.totalBaseVolume = instrumentData.totalBaseVolume.plus(data.deltaBaseVolume);
    instrumentData.totalVolume = instrumentData.totalVolume.plus(data.deltaVolume);
    instrumentData.totalPoolFee = instrumentData.totalPoolFee.plus(data.deltaPoolFee);
    instrumentData.totalLiquidityFee = instrumentData.totalLiquidityFee.plus(data.deltaLiquidityFee);
    instrumentData.totalProtocolFee = instrumentData.totalProtocolFee.plus(data.deltaProtocolFee);
    instrumentData.totalValueLocked = instrumentData.totalValueLocked.plus(data.deltaLockedValue);
    instrumentData.save();
}

export function updateDailyInstrumentData(data: StatisticsDataChange): void {
    if (data.instrumentAddr === ZERO_ADDRESS || data.timestamp === ZERO) {
        return;
    }
    if (data.deltaVolume.equals(ZERO) && data.deltaLockedValue.equals(ZERO)) {
        return;
    }
    let instrumentData = loadOrNewInstrumentData(data.instrumentAddr.toHexString());
    let dailyInstrumentData = loadOrNewDailyInstrumentData(data.instrumentAddr.toHexString(), data.timestamp);

    dailyInstrumentData.totalBaseVolume = instrumentData.totalBaseVolume;
    dailyInstrumentData.totalVolume = instrumentData.totalVolume;
    dailyInstrumentData.totalPoolFee = instrumentData.totalPoolFee;
    dailyInstrumentData.totalLiquidityFee = instrumentData.totalLiquidityFee;
    dailyInstrumentData.totalProtocolFee = instrumentData.totalProtocolFee;
    dailyInstrumentData.totalValueLocked = instrumentData.totalValueLocked;

    dailyInstrumentData.volume = dailyInstrumentData.volume.plus(data.deltaVolume);
    dailyInstrumentData.baseVolume = dailyInstrumentData.baseVolume.plus(data.deltaBaseVolume);
    dailyInstrumentData.valueLocked = dailyInstrumentData.valueLocked.plus(data.deltaLockedValue);
    dailyInstrumentData.poolFee = dailyInstrumentData.poolFee.plus(data.deltaPoolFee);
    dailyInstrumentData.liquidityFee = dailyInstrumentData.liquidityFee.plus(data.deltaLiquidityFee);
    dailyInstrumentData.protocolFee = dailyInstrumentData.protocolFee.plus(data.deltaProtocolFee);

    dailyInstrumentData.save();
}

export function updateAmmData(data: StatisticsDataChange): void {
    if (data.instrumentAddr === ZERO_ADDRESS || data.expiry === ZERO) {
        return;
    }
    let ammId = concatId(data.instrumentAddr.toHexString(), data.expiry.toString());
    let ammData = loadOrNewAmmData(ammId);
    ammData.amm = ammId;
    ammData.totalBaseVolume = ammData.totalBaseVolume.plus(data.deltaBaseVolume);
    ammData.totalVolume = ammData.totalVolume.plus(data.deltaVolume);
    ammData.totalPoolFee = ammData.totalPoolFee.plus(data.deltaPoolFee);
    ammData.totalLiquidityFee = ammData.totalLiquidityFee.plus(data.deltaLiquidityFee);
    ammData.totalProtocolFee = ammData.totalProtocolFee.plus(data.deltaProtocolFee);
    ammData.totalValueLocked = ammData.totalValueLocked.plus(data.deltaLockedValue);
    ammData.save();

    let amm = loadOrNewAmm(data.instrumentAddr, data.expiry, ZERO);
    amm.data = ammId;
    amm.save();
}

export function getMinTradeValueAccountedInCandles(quote: string, instrumentAddr: Address): BigInt {
    const FILTER_RATIO = BigInt.fromI32(10);
    const quoteParam = getQuoteParam(Address.fromString(quote));
    const instrumentSetting = loadOrNewInstrumentSetting(instrumentAddr, Address.fromString(quote));
    const minTradeValueAccountedInCandles = quoteParam.minMarginAmount
        .times(RATIO_BASE)
        .div(BigInt.fromU64(instrumentSetting.initialMarginRatio))
        .div(FILTER_RATIO);
    return minTradeValueAccountedInCandles;
}

export function updateHourlyAmmData(data: StatisticsDataChange): void {
    if (
        data.instrumentAddr === ZERO_ADDRESS ||
        data.expiry === ZERO ||
        data.timestamp === ZERO ||
        data.tradePrice.equals(ZERO)
    ) {
        return;
    }

    let ammId = concatId(data.instrumentAddr.toHexString(), data.expiry.toString());
    let hourlyAmmData = loadOrNewHourlyAmmData(ammId, data.timestamp);

    hourlyAmmData.amm = ammId;
    hourlyAmmData.volume = hourlyAmmData.volume.plus(data.deltaVolume);
    hourlyAmmData.baseVolume = hourlyAmmData.baseVolume.plus(data.deltaBaseVolume);
    hourlyAmmData.poolFee = hourlyAmmData.poolFee.plus(data.deltaPoolFee);
    hourlyAmmData.liquidityFee = hourlyAmmData.liquidityFee.plus(data.deltaLiquidityFee);
    hourlyAmmData.protocolFee = hourlyAmmData.protocolFee.plus(data.deltaProtocolFee);
    if (
        data.tradePrice.gt(ZERO) &&
        data.deltaVolume.gt(getMinTradeValueAccountedInCandles(data.quote, data.instrumentAddr))
    ) {
        if (hourlyAmmData.open.equals(ZERO)) {
            hourlyAmmData.open = data.tradePrice;
        }
        hourlyAmmData.close = data.tradePrice;

        if (data.tradePrice.ge(hourlyAmmData.high)) {
            hourlyAmmData.high = data.tradePrice;
        }

        if (hourlyAmmData.low.equals(ZERO) || data.tradePrice.le(hourlyAmmData.low)) {
            hourlyAmmData.low = data.tradePrice;
        }
    }
    hourlyAmmData.firstMarkPrice = hourlyAmmData.firstMarkPrice.equals(ZERO)
        ? data.markPrice
        : hourlyAmmData.firstMarkPrice;
    hourlyAmmData.lastMarkPrice = data.markPrice;    
    hourlyAmmData.save();
}

export function updateHourlyAmmDataOfFundingIndex(data: StatisticsDataChange): void {
    if (data.instrumentAddr === ZERO_ADDRESS || data.expiry === ZERO || data.timestamp === ZERO) {
        return;
    } 
    let ammId = concatId(data.instrumentAddr.toHexString(), data.expiry.toString());
    let hourlyAmmData = loadOrNewHourlyAmmData(ammId, data.timestamp);    
    // funding rate related
    hourlyAmmData.firstFundingIndex = hourlyAmmData.firstFundingIndex.equals(ZERO)
        ? data.fundingIndex
        : hourlyAmmData.firstFundingIndex;
    hourlyAmmData.lastFundingIndex = data.fundingIndex;

    hourlyAmmData.save();    
}

export function updatePer4HourAmmData(data: StatisticsDataChange): void {
    if (
        data.instrumentAddr === ZERO_ADDRESS ||
        data.expiry === ZERO ||
        data.timestamp === ZERO ||
        data.tradePrice.equals(ZERO)
    ) {
        return;
    }

    let ammId = concatId(data.instrumentAddr.toHexString(), data.expiry.toString());
    let per4HourAmmData = loadOrNewPer4HourAmmData(ammId, data.timestamp);

    per4HourAmmData.amm = ammId;
    per4HourAmmData.volume = per4HourAmmData.volume.plus(data.deltaVolume);
    per4HourAmmData.baseVolume = per4HourAmmData.baseVolume.plus(data.deltaBaseVolume);
    per4HourAmmData.poolFee = per4HourAmmData.poolFee.plus(data.deltaPoolFee);
    per4HourAmmData.liquidityFee = per4HourAmmData.liquidityFee.plus(data.deltaLiquidityFee);
    per4HourAmmData.protocolFee = per4HourAmmData.protocolFee.plus(data.deltaProtocolFee);
    if (
        data.tradePrice.gt(ZERO) &&
        data.deltaVolume.gt(getMinTradeValueAccountedInCandles(data.quote, data.instrumentAddr))
    ) {
        if (per4HourAmmData.open.equals(ZERO)) {
            per4HourAmmData.open = data.tradePrice;
        }
        per4HourAmmData.close = data.tradePrice;

        if (data.tradePrice.ge(per4HourAmmData.high)) {
            per4HourAmmData.high = data.tradePrice;
        }

        if (per4HourAmmData.low.equals(ZERO) || data.tradePrice.le(per4HourAmmData.low)) {
            per4HourAmmData.low = data.tradePrice;
        }
    }
    per4HourAmmData.save();
}

export function updateDailyAmmData(data: StatisticsDataChange): void {
    if (
        data.instrumentAddr === ZERO_ADDRESS ||
        data.expiry === ZERO ||
        data.timestamp === ZERO ||
        data.tradePrice.equals(ZERO)
    ) {
        return;
    }

    let ammId = concatId(data.instrumentAddr.toHexString(), data.expiry.toString());
    let ammData = loadOrNewAmmData(ammId);
    let dailyAmmData = loadOrNewDailyAmmData(ammId, data.timestamp);

    dailyAmmData.amm = ammId;

    dailyAmmData.totalBaseVolume = ammData.totalBaseVolume;
    dailyAmmData.totalVolume = ammData.totalVolume;
    dailyAmmData.totalPoolFee = ammData.totalPoolFee;
    dailyAmmData.totalLiquidityFee = ammData.totalLiquidityFee;
    dailyAmmData.totalProtocolFee = ammData.totalProtocolFee;
    dailyAmmData.totalValueLocked = ammData.totalValueLocked;

    dailyAmmData.volume = dailyAmmData.volume.plus(data.deltaVolume);
    dailyAmmData.baseVolume = dailyAmmData.baseVolume.plus(data.deltaBaseVolume);

    dailyAmmData.poolFee = dailyAmmData.poolFee.plus(data.deltaPoolFee);
    dailyAmmData.liquidityFee = dailyAmmData.liquidityFee.plus(data.deltaLiquidityFee);
    dailyAmmData.protocolFee = dailyAmmData.protocolFee.plus(data.deltaProtocolFee);

    if (
        data.tradePrice.gt(ZERO) &&
        data.deltaVolume.gt(getMinTradeValueAccountedInCandles(data.quote, data.instrumentAddr))
    ) {
        if (dailyAmmData.open.equals(ZERO)) {
            dailyAmmData.open = data.tradePrice;
        }
        dailyAmmData.close = data.tradePrice;

        if (data.tradePrice.ge(dailyAmmData.high)) {
            dailyAmmData.high = data.tradePrice;
        }

        if (dailyAmmData.low.equals(ZERO) || data.tradePrice.le(dailyAmmData.low)) {
            dailyAmmData.low = data.tradePrice;
        }
    }

    dailyAmmData.save();
}

export function updateWeeklyAmmData(data: StatisticsDataChange): void {
    if (
        data.instrumentAddr === ZERO_ADDRESS ||
        data.expiry === ZERO ||
        data.timestamp === ZERO ||
        data.tradePrice.equals(ZERO)
    ) {
        return;
    }

    let ammId = concatId(data.instrumentAddr.toHexString(), data.expiry.toString());
    let weeklyAmmData = loadOrNewWeeklyAmmData(ammId, data.timestamp);

    weeklyAmmData.amm = ammId;

    weeklyAmmData.volume = weeklyAmmData.volume.plus(data.deltaVolume);
    weeklyAmmData.baseVolume = weeklyAmmData.baseVolume.plus(data.deltaBaseVolume);
    weeklyAmmData.poolFee = weeklyAmmData.poolFee.plus(data.deltaPoolFee);
    weeklyAmmData.liquidityFee = weeklyAmmData.liquidityFee.plus(data.deltaLiquidityFee);
    weeklyAmmData.protocolFee = weeklyAmmData.protocolFee.plus(data.deltaProtocolFee);

    if (
        data.tradePrice.gt(ZERO) &&
        data.deltaVolume.gt(getMinTradeValueAccountedInCandles(data.quote, data.instrumentAddr))
    ) {
        if (weeklyAmmData.open.equals(ZERO)) {
            weeklyAmmData.open = data.tradePrice;
        }
        weeklyAmmData.close = data.tradePrice;

        if (data.tradePrice.ge(weeklyAmmData.high)) {
            weeklyAmmData.high = data.tradePrice;
        }

        if (weeklyAmmData.low.equals(ZERO) || data.tradePrice.le(weeklyAmmData.low)) {
            weeklyAmmData.low = data.tradePrice;
        }
    }

    weeklyAmmData.save();
}
