/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/ban-types */
import { BigInt, ethereum } from '@graphprotocol/graph-ts';
import { Amm, Instrument, InstrumentSetting } from '../../generated/schema';
import { DEFAULT_INITIAL_MARGIN_RATIO, DEFAULT_MAINTENANCE_MARGIN_RATIO, ONE, ZERO, ZERO_ADDRESS_STR } from '../const';
import { concatId, formatExpiry, getAmmStatusStr, getQuoteTypeStr } from '../utils/common';
import { StatisticsDataChange, updateStatisticsData } from './stats';
import { Address } from '@graphprotocol/graph-ts';
import { loadOrNewQuote, loadOrNewQuoteParam } from './config';

export function loadOrNewInstrument(instrumentAddr: Address): Instrument {
    let instrument = Instrument.load(instrumentAddr.toHexString());
    if (instrument === null) {
        instrument = new Instrument(instrumentAddr.toHexString());
        instrument.symbol = '';
        instrument.base = '';
        instrument.createdAt = ZERO;
        instrument.marketType = '';
        instrument.quote = ZERO_ADDRESS_STR;
        instrument.setting = instrumentAddr.toHexString();
        instrument.condition = 'NORMAL';
        instrument.save();
    }
    return instrument as Instrument;
}

export function loadOrNewAmm(instrumentAddr: Address, expiry: BigInt, timestamp: BigInt): Amm {
    let amm = Amm.load(concatId(instrumentAddr.toHexString(), expiry.toString()));
    if (amm === null) {
        amm = new Amm(concatId(instrumentAddr.toHexString(), expiry.toString()));
        let instrument = loadOrNewInstrument(instrumentAddr);
        amm.symbol = instrument.symbol + '-' + formatExpiry(expiry);
        amm.instrument = instrumentAddr.toHexString();
        amm.expiry = expiry;

        amm.balance = ZERO;
        amm.timestamp = ZERO;
        amm.status = getAmmStatusStr(0);
        amm.createdAt = ZERO;
        amm.sqrtInitialPX96 = ZERO;
        amm.sqrtPX96 = ZERO;

        amm.feeIndex = ZERO;
        amm.protocolFee = ZERO;

        amm.longSocialLossIndex = ZERO;
        amm.shortSocialLossIndex = ZERO;

        amm.longFundingIndex = ZERO;
        amm.shortFundingIndex = ZERO;

        amm.insuranceFund = ZERO;
        amm.settlementPrice = ZERO;

        amm.save();

        let dataChange = new StatisticsDataChange();
        dataChange.timestamp = timestamp;
        dataChange.instrumentAddr = instrumentAddr;
        dataChange.deltaAmmCount = ONE;
        updateStatisticsData(dataChange);
    }
    return amm as Amm;
}

export function loadOrNewInstrumentSetting(instrument: Address, quote: Address): InstrumentSetting {
    let instrumentSetting = InstrumentSetting.load(instrument.toHexString());
    if (instrumentSetting == null) {
        // create new quote first
        loadOrNewQuote(quote);

        let quoteParam = loadOrNewQuoteParam(quote);

        instrumentSetting = new InstrumentSetting(instrument.toHexString());
        instrumentSetting.instrument = instrument.toHexString();
        instrumentSetting.quote = quote.toHexString();
        instrumentSetting.tradingFeeRatio = quoteParam.tradingFeeRatio;
        instrumentSetting.stabilityFeeRatioParam = quoteParam.stabilityFeeRatioParam;
        instrumentSetting.protocolFeeRatio = quoteParam.protocolFeeRatio;
        instrumentSetting.minMarginAmount = quoteParam.minMarginAmount;
        instrumentSetting.tip = quoteParam.tip;
        // default IMR & MMR
        instrumentSetting.initialMarginRatio = DEFAULT_INITIAL_MARGIN_RATIO;
        instrumentSetting.maintenanceMarginRatio = DEFAULT_MAINTENANCE_MARGIN_RATIO;
        instrumentSetting.qtype = getQuoteTypeStr(0);
        instrumentSetting.save();
    }
    return instrumentSetting as InstrumentSetting;
}
