/* eslint-disable @typescript-eslint/ban-types */
import { BigInt } from '@graphprotocol/graph-ts';
import { TWO, WAD } from '../const';

// convert config ratio(r) to Wad(w)
// eg: 1000 => 1000 * 10 ** 18 / 10 ** 4
export function r2w(x: BigInt): BigInt {
    return x.times(BigInt.fromI32(10).pow(14));
}

export function wmul(x: BigInt, y: BigInt): BigInt {
    // eslint-disable-next-line prefer-const
    let prod = x.times(y).plus(WAD.div(TWO));
    return prod.div(WAD);
}
