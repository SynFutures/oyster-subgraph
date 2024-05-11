/* eslint-disable prefer-const */
import { Address, BigInt } from '@graphprotocol/graph-ts';
import { Base, Quote } from '../../generated/schema';
import { getErc20Info, getQuoteParam, getQuoteTypeStr } from '../utils/common';
import { SetQuoteParamParamStruct } from '../../generated/Config/Config';
import { QuoteParam } from '../../generated/schema';

export function loadOrNewQuote(quoteAddr: Address): Quote {
    let quote = Quote.load(quoteAddr.toHexString());
    if (quote == null) {
        quote = new Quote(quoteAddr.toHexString());
        let info = getErc20Info(quoteAddr);
        quote.name = info.name;
        quote.symbol = info.symbol;
        quote.decimals = info.decimals;
        quote.save();
    }
    return quote as Quote;
}

export function loadOrNewBase(symbolOrAddr: string): Base {
    let base = Base.load(symbolOrAddr);
    if (base == null) {
        base = new Base(symbolOrAddr);
        if (symbolOrAddr.startsWith('0x')) {
            let info = getErc20Info(Address.fromString(symbolOrAddr));
            base.name = info.name;
            base.symbol = info.symbol;
            base.decimals = info.decimals;
            base.save();
        } else {
            base.name = symbolOrAddr;
            base.symbol = symbolOrAddr;
            base.decimals = BigInt.fromI32(18);
            base.save();
        }
    }
    return base as Base;
}

export function loadOrNewQuoteParam(quote: Address): QuoteParam {
    let quoteParam = QuoteParam.load(quote.toHexString());
    if (quoteParam == null) {
        // create new quote first
        loadOrNewQuote(quote);

        // read quote param from contract
        const p = getQuoteParam(quote);
        quoteParam = new QuoteParam(quote.toHexString());
        quoteParam.quote = quote.toHexString();
        quoteParam.tradingFeeRatio = BigInt.fromI32(p.tradingFeeRatio);
        quoteParam.stabilityFeeRatioParam = p.stabilityFeeRatioParam;
        quoteParam.protocolFeeRatio = BigInt.fromI32(p.protocolFeeRatio);
        quoteParam.minMarginAmount = p.minMarginAmount;
        quoteParam.tip = p.tip;
        quoteParam.qtype = getQuoteTypeStr(p.qtype);
        quoteParam.save();
    }
    return quoteParam as QuoteParam;
}

export function updateQuoteParam(quoteAddr: Address, param: SetQuoteParamParamStruct): QuoteParam {
    let quoteParam = loadOrNewQuoteParam(quoteAddr);
    quoteParam.quote = quoteAddr.toHexString();
    quoteParam.tradingFeeRatio = BigInt.fromI32(param.tradingFeeRatio);
    quoteParam.stabilityFeeRatioParam = param.stabilityFeeRatioParam;
    quoteParam.protocolFeeRatio = BigInt.fromI32(param.protocolFeeRatio);
    quoteParam.minMarginAmount = param.minMarginAmount;
    quoteParam.tip = param.tip;

    quoteParam.qtype = getQuoteTypeStr(param.qtype);
    quoteParam.save();
    return quoteParam as QuoteParam;
}
