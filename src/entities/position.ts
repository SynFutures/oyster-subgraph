/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/ban-types */
import { Address, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { Position } from '../../generated/schema';
import { ONE, ZERO } from '../const';
import { StatisticsDataChange, updateStatisticsData } from './stats';

export function loadOrNewPosition(trader: Address, instrument: Address, expiry: BigInt, block: ethereum.Block): Position {
    let id = trader.toHexString() + '-' + instrument.toHexString() + '-' + expiry.toString();
    let position = Position.load(id);
    if (position === null) {
        position = new Position(id);
        position.trader = trader;
        position.amm = instrument.toHexString() + '-' + expiry.toString();

        position.balance = ZERO;
        position.size = ZERO;
        position.entryNotional = ZERO;
        position.entrySocialLossIndex = ZERO;
        position.entryFundingIndex = ZERO;

        // new position indicates a new account
        let dataChange = new StatisticsDataChange();
        dataChange.instrumentAddr = instrument;
        dataChange.expiry = expiry;
        dataChange.traderAddr = trader;
        dataChange.deltaAccountCount = ONE;
        dataChange.timestamp = block.timestamp;
        updateStatisticsData(dataChange);

        position.save();
    }
    return position as Position;
}
