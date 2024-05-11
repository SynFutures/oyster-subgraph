import { SetCompactEmaParam, SetFeeder } from '../../generated/Config/CexMarket';
import { loadOrNewCexMarket, updateCexFeeder } from '../entities/cexMarket';

export function handleSetCexFeeder(event: SetFeeder): void {
    updateCexFeeder(event.address, event.params.instrument, event.params.feeder);
}

export function handleSetCompactEmaParam(event: SetCompactEmaParam): void {
    let market = loadOrNewCexMarket(event.address, '');
    market.compactEmaParam = event.params.compactEmaParam;
    market.save();
}
