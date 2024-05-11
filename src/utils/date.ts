/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/ban-types */
import { BigInt } from '@graphprotocol/graph-ts';
import { toBigInt } from './common';
import { ONE, SECONDS_PER_DAY, ZERO } from '../const';

class DayMonthYear {
    day: BigInt;
    month: BigInt;
    year: BigInt;

    constructor(day: BigInt, month: BigInt, year: BigInt) {
        this.day = day;
        this.month = month;
        this.year = year;
    }
}

// Ported from http://howardhinnant.github.io/date_algorithms.html#civil_from_days
export function dayMonthYearFromTimestamp(unixEpoch: BigInt): DayMonthYear {
    // you can have leap seconds apparently - but this is good enough for us ;)
    let daysSinceEpochStart = unixEpoch.div(SECONDS_PER_DAY);
    daysSinceEpochStart = daysSinceEpochStart.plus(toBigInt(719468));

    let d = daysSinceEpochStart >= ZERO ? daysSinceEpochStart : daysSinceEpochStart.minus(toBigInt(146096));

    let era: BigInt = d.div(toBigInt(146097));

    let dayOfEra: BigInt = daysSinceEpochStart.minus(era.times(toBigInt(146097))); // [0, 146096]

    let yearOfEra: BigInt = dayOfEra
        .minus(dayOfEra.div(toBigInt(1460)))
        .plus(dayOfEra.div(toBigInt(36524)))
        .minus(dayOfEra.div(toBigInt(146096)))
        .div(toBigInt(365)); // [0, 399]

    let year: BigInt = yearOfEra.plus(era.times(toBigInt(400)));

    let dayOfYear: BigInt = dayOfEra.minus(
        toBigInt(365)
            .times(yearOfEra)
            .plus(yearOfEra.div(toBigInt(4)))
            .minus(yearOfEra.div(toBigInt(100))),
    ); // [0, 365]

    let monthZeroIndexed = toBigInt(5).times(dayOfYear).plus(toBigInt(2)).div(toBigInt(153)); // [0, 11]

    let day = dayOfYear.minus(
        toBigInt(153).times(monthZeroIndexed).plus(toBigInt(2)).div(toBigInt(5)).plus(toBigInt(1)),
    ); // [1, 31]

    // todo
    day = day.plus(toBigInt(2));

    let month = monthZeroIndexed.plus(monthZeroIndexed < toBigInt(10) ? toBigInt(3) : toBigInt(-9)); // [1, 12]

    year = month <= toBigInt(2) ? year.plus(ONE) : year;

    return new DayMonthYear(day, month, year);
}
