/**
 * helper/flow-screens/phone-input.screen.js
 *
 * PHONE_INPUT screen: the user has entered their phone number.
 * Look up registered machines in the DB and route to:
 *  - SERIAL_SELECT   if machines are found
 *  - NOT_REGISTERED  if no machines are on record
 */
import { getMachinesFromDB } from "../get-machines-serial-number.js";

export async function handlePhoneInput(data) {
  const machines = await getMachinesFromDB(data.phone_number);

  if (machines?.length > 0) {
    return {
      version: "3.0",
      screen: "SERIAL_SELECT",
      data: {
        phone_number: data.phone_number,
        serial_numbers: machines.map((m) => ({
          id: m.serialNumber,
          title: `${m.serialNumber} — ${m.machineName}`,
        })),
      },
    };
  }

  return { version: "3.0", screen: "NOT_REGISTERED", data: {} };
}
