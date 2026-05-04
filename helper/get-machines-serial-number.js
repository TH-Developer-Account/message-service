import { fetchMachineDetails } from "../services/edost-create-service-ticket.handler.js";
import { withMachineTokenRetry } from "./utils/edost-token-entry.js";
import logger from "./utils/logger.js";

export const getMachinesFromDB = async (phoneNumber) => {
  logger.info("Machine serial lookup started", { phoneNumber });

  const machines = await withMachineTokenRetry((token) =>
    fetchMachineDetails(phoneNumber, token),
  );

  if (!machines || machines.length === 0) {
    logger.info("No machines found", { phoneNumber });
    return null;
  }

  return machines.map((machine) => ({
    serialNumber: machine.equipementSerialNumber,
    machineName: machine.machineName,
  }));
};
