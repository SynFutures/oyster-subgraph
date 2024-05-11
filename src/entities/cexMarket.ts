/* eslint-disable prefer-const */
import { Address } from '@graphprotocol/graph-ts';
import { ZERO, ZERO_ADDRESS } from '../const';
import { getCompactEmaParam, getFeederTypeStr } from '../utils/common';
import { CexFeeder, CexMarket } from '../../generated/schema';
import { SetMarketInfo } from '../../generated/Config/Config';
import { SetFeederFeederStruct } from '../../generated/Config/CexMarket';
import { CexMarketContract } from '../../generated/templates';

export function loadOrNewCexMarket(market: Address, type: string): CexMarket {
    let cexMarket = CexMarket.load(market.toHexString());
    if (cexMarket == null) {
        cexMarket = new CexMarket(market.toHexString());
        cexMarket.type = type;
        cexMarket.beacon = ZERO_ADDRESS;
        cexMarket.compactEmaParam = getCompactEmaParam(type, market);
        cexMarket.save();
        // first created, we need to listen events on this market
        CexMarketContract.create(market);
    }
    return cexMarket as CexMarket;
}

export function updateCexMarket(event: SetMarketInfo): CexMarket {
    let cexMarket = loadOrNewCexMarket(event.params.market, event.params.mtype);
    cexMarket.beacon = event.params.beacon;
    cexMarket.save();
    return cexMarket as CexMarket;
}

// Update CexFeeder
export function updateCexFeeder(market: Address, instrument: Address, feeder: SetFeederFeederStruct): CexFeeder {
    let cexFeeder = CexFeeder.load(instrument.toHexString());

    if (cexFeeder == null) {
        cexFeeder = new CexFeeder(instrument.toHexString());
        cexFeeder.market = market.toHexString();
        cexFeeder.feederType = getFeederTypeStr(0);
        cexFeeder.aggregator0 = ZERO_ADDRESS;
        cexFeeder.heartBeat0 = 0;
        cexFeeder.scaler0 = ZERO;
        cexFeeder.aggregator1 = ZERO_ADDRESS;
        cexFeeder.scaler1 = ZERO;
        cexFeeder.heartBeat1 = 0;
        cexFeeder.save();
    }

    cexFeeder.feederType = getFeederTypeStr(feeder.ftype);
    cexFeeder.aggregator0 = feeder.aggregator0;
    cexFeeder.scaler0 = feeder.scaler0;;
    cexFeeder.heartBeat0 = feeder.heartBeat0;
    cexFeeder.aggregator1 = feeder.aggregator1;
    cexFeeder.scaler1 = feeder.scaler1;
    cexFeeder.heartBeat1 = feeder.heartBeat1;
    cexFeeder.save();

    return cexFeeder as CexFeeder;
}
