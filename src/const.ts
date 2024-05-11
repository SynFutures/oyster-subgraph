/* eslint-disable prefer-const */
import { Address, BigInt } from '@graphprotocol/graph-ts';

// address(uint160(uint(keccak256("SYNFUTURES-NATIVE")) - 1));
export const SYNFUTURES_NATIVE_TOKEN = '0x1d6b1d2ad091bec4aae6a131c92008701531fdaf';

export const WRAPPED_NATIVE_TOKEN = '0x4300000000000000000000000000000000000004';

export const ZERO_ADDRESS_STR = '0x0000000000000000000000000000000000000000';
export let ZERO_ADDRESS = Address.fromString(ZERO_ADDRESS_STR);

export const DEXV2 = 'DEXV2';

export let MASK_128 = BigInt.fromI32(2).pow(128).minus(BigInt.fromI32(1));
export let ZERO = BigInt.fromI32(0);
export let ONE = BigInt.fromI32(1);
export let TWO = BigInt.fromI32(2);
export let WAD = BigInt.fromI32(10).pow(18);
export let NEG_ONE = BigInt.fromI32(-1);

export let MAX_INT_128 = ONE.leftShift(127).minus(ONE);

export let PERP_EXPIRY = BigInt.fromI32(2).pow(32).minus(BigInt.fromI32(1));

export const MAX_INPUT_LENGTH = 1024;
export const SELECTOR_LENGTH_IN_STRING = 10;

export const ORDER_STATUS_OPEN = 'OPEN';
export const ORDER_STATUS_FILLED = 'FILLED';
export const ORDER_STATUS_CANCELLED = 'CANCELLED';

export const RANGE_STATUS_OPEN = 'OPEN';
export const RANGE_STATUS_REMOVED = 'REMOVED';

export const PENDING_STATUS_PENDING = 'PENDING';
export const PENDING_STATUS_RELEASED = 'RELEASED';

export const VIRTUAL_TRADE_TYPE_MARKET = 'MARKET';
export const VIRTUAL_TRADE_TYPE_LIMIT = 'LIMIT';
export const VIRTUAL_TRADE_TYPE_RANGE = 'RANGE';
export const VIRTUAL_TRADE_TYPE_LIQUIDATION = 'LIQUIDATION';
export const VIRTUAL_TRADE_TYPE_TAKE_OVER = 'TAKE_OVER';

export let SECONDS_PER_HOUR = BigInt.fromI32(3600);
export let SECONDS_PER_4HOUR = BigInt.fromI32(14400);
export let SECONDS_PER_DAY = BigInt.fromI32(86400);
export let SECONDS_PER_WEEK = BigInt.fromI32(604800);

export let DEFAULT_INITIAL_MARGIN_RATIO = 1000;
export let DEFAULT_MAINTENANCE_MARGIN_RATIO = 500;

export let DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
// keccak256("OPERATOR");
export let OPERATOR_ROLE = '0x523a704056dcd17bcf83bed8b68c59416dac1119be77755efe3bde0a64e46e0c';