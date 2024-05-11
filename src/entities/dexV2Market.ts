/* eslint-disable prefer-const */
import { Address } from '@graphprotocol/graph-ts';
import { DexV2Feeder, DexV2Market } from '../../generated/schema';
import { DEXV2, ZERO, ZERO_ADDRESS } from '../const';
import { getCompactEmaParam, getFeederTypeStr } from '../utils/common';
import { DexV2MarketContract } from '../../generated/templates';
import { SetMarketInfo } from '../../generated/Config/Config';
import { SetFeederFeederStruct } from '../../generated/Config/DexV2Market';


export function loadOrNewDexV2Market(market: Address): DexV2Market {
    let dexV2Market = DexV2Market.load(market.toHexString());
    if (dexV2Market == null) {
        dexV2Market = new DexV2Market(market.toHexString());
        dexV2Market.type = DEXV2;
        dexV2Market.beacon = ZERO_ADDRESS;
        dexV2Market.compactEmaParam = getCompactEmaParam(DEXV2, market);
        dexV2Market.save();
        // first created, we need to listen events on this market
        DexV2MarketContract.create(market);
    }
    return dexV2Market as DexV2Market;
}

export function updateDexV2Market(event: SetMarketInfo): DexV2Market {
    let dexV2Market = loadOrNewDexV2Market(event.params.market);
    dexV2Market.beacon = event.params.beacon;
    dexV2Market.save();
    return dexV2Market as DexV2Market;
}

export function updateDexV2Feeder(market: Address, instrument: Address, feeder: SetFeederFeederStruct): DexV2Feeder {
    let dexV2Feeder = DexV2Feeder.load(instrument.toHexString());;

    if (dexV2Feeder == null) {
        dexV2Feeder = new DexV2Feeder(instrument.toHexString());
        dexV2Feeder.market = market.toHexString();
        dexV2Feeder.feederType = getFeederTypeStr(0);
        dexV2Feeder.isToken0Quote = false;
        dexV2Feeder.scaler0 = ZERO;
        dexV2Feeder.pair = ZERO_ADDRESS;
        dexV2Feeder.scaler1 = ZERO;
        dexV2Feeder.save();
    }

    dexV2Feeder.feederType = getFeederTypeStr(feeder.ftype);
    dexV2Feeder.isToken0Quote = feeder.isToken0Quote;
    dexV2Feeder.scaler0 = feeder.scaler0;
    dexV2Feeder.pair = feeder.pair;
    dexV2Feeder.scaler1 = feeder.scaler1;
    dexV2Feeder.save();

    return dexV2Feeder as DexV2Feeder;
}
