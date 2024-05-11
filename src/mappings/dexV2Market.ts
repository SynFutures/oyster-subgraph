/* eslint-disable prefer-const */
import { SetCompactEmaParam, SetFeeder } from '../../generated/Config/DexV2Market';
import { loadOrNewDexV2Market, updateDexV2Feeder } from '../entities/dexV2Market';

export function handleSetDexV2Feeder(event: SetFeeder): void {
    updateDexV2Feeder(event.address, event.params.instrument, event.params.feeder);
}

export function handleSetCompactEmaParam(event: SetCompactEmaParam): void {
    let market = loadOrNewDexV2Market(event.address);
    market.compactEmaParam = event.params.compactEmaParam;
    market.save();
}
