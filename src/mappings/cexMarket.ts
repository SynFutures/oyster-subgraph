import { SetFeeder } from "../../generated/Config/CexMarket";
import { updateCexFeeder } from "../entities/cexMarket";

export function handleSetCexFeeder(event: SetFeeder): void {
  updateCexFeeder(event.address, event.params.instrument, event.params.feeder);
}
