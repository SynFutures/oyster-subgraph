/* eslint-disable prefer-const */
import { SetFeeder } from "../../generated/Config/DexV2Market";
import { updateDexV2Feeder } from "../entities/dexV2Market";

export function handleSetDexV2Feeder(event: SetFeeder): void {
  updateDexV2Feeder(
    event.address,
    event.params.instrument,
    event.params.feeder
  );
}
