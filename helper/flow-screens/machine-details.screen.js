/**
 * helper/flow-screens/machine-details.screen.js
 *
 * MACHINE_DETAILS screen: the user has selected a state and we need to
 * return the matching district list along with all other dropdown data.
 * All dropdown arrays must be re-sent on every response because WhatsApp
 * Flows do not persist previous server data between data-exchange calls.
 */
import {
  INDIA_STATES,
  ISSUE_TYPES,
  LANGUAGES,
  getDistrictsByState,
} from "../constant.js";

export function handleMachineDetails(data) {
  return {
    version: "3.0",
    screen: "MACHINE_DETAILS",
    data: {
      selected_serial: data.selected_serial,
      phone_number: data.phone_number,
      states: INDIA_STATES,
      districts: getDistrictsByState(data.selected_state),
      issue_types: ISSUE_TYPES,
      languages: LANGUAGES,
    },
  };
}
