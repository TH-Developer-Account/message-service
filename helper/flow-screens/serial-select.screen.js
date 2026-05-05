/**
 * helper/flow-screens/serial-select.screen.js
 *
 * SERIAL_SELECT screen: the user has chosen a serial number.
 * Advance to MACHINE_DETAILS, pre-loading all dropdown data so the
 * next screen renders without a second round-trip.
 */
import { INDIA_STATES, ISSUE_TYPES, LANGUAGES } from "../constant.js";

export function handleSerialSelect(data) {
  return {
    version: "3.0",
    screen: "MACHINE_DETAILS",
    data: {
      selected_serial: data.selected_serial,
      phone_number: data.phone_number,
      states: INDIA_STATES,
      districts: [{ id: "NONE", title: "— Select a state first —" }],
      issue_types: ISSUE_TYPES,
      languages: LANGUAGES,
    },
  };
}
