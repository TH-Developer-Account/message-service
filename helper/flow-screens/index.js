/**
 * helper/flow-screens/index.js
 *
 * Central registry for WhatsApp Flow screen handlers.
 * The flow route looks up the active screen name here and calls the
 * matching handler. Adding a new screen = one import + one map entry.
 */
import { handlePhoneInput } from "./phone-input.screen.js";
import { handleSerialSelect } from "./serial-select.screen.js";
import { handleMachineDetails } from "./machine-details.screen.js";

export const SCREEN_HANDLERS = {
  PHONE_INPUT: handlePhoneInput,
  SERIAL_SELECT: handleSerialSelect,
  MACHINE_DETAILS: handleMachineDetails,
};
