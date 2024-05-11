import { DEXV2, ZERO_ADDRESS_STR } from '../const';
import { updateCexMarket } from '../entities/cexMarket';
import { updateQuoteParam } from '../entities/config';
import { updateDexV2Market } from '../entities/dexV2Market';
import { SetMarketInfo, SetQuoteParam } from '../../generated/Config/Config';
import { Config, Quote } from '../../generated/schema';
import { Address } from '@graphprotocol/graph-ts';

export function createConfig(address: Address): void {
    let config = Config.load(ZERO_ADDRESS_STR);
    if (config == null) {
        config = new Config(ZERO_ADDRESS_STR);
        config.address = address;
        config.save();
    }
}

export function handleSetMarketInfo(event: SetMarketInfo): void {
    createConfig(event.address);

    if (event.params.mtype == DEXV2) {
        updateDexV2Market(event);
    } else {
        updateCexMarket(event);
    }
}

export function handleSetQuoteParam(event: SetQuoteParam): void {
    createConfig(event.address);

    let quote = Quote.load(event.params.quote.toHexString());
    if (quote == null) {
        // invalid quote, we skip
        return;
    }
    updateQuoteParam(event.params.quote, event.params.param);
}
