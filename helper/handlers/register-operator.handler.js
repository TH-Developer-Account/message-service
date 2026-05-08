/**
 * helper/handlers/register-operator.handler.js
 */
import { mapApi } from "../../services/map-api.js";
import { whatsappApi as api } from "../../services/whatsapp-api.js";
import logger from "../utils/logger.js";

export async function handleRegisterOperator(from, details) {
  logger.info("Registering operator via MAP service", { from });

  try {
    const result = await mapApi.registerOperator({
      // Map only the fields MAP expects — never forward the raw
      // flow details object, which may contain internal tokens.
      name: details.operator_name,
      phone: details.operator_number,
      machine: details.machine_serial_number,
      submittedBy: from,
    });

    logger.info("Operator registered successfully", { from, result });

    await api.sendText(
      from,
      `✅ Operator *${details.operator_name}* has been registered successfully.`,
    );
  } catch (err) {
    // Distinguish a MAP-side rejection (4xx) from a network/infra failure
    if (err.response) {
      logger.error("MAP service rejected operator registration", {
        from,
        status: err.response.status,
        data: err.response.data,
      });
      await api.sendText(
        from,
        "❌ Registration failed. Please check the details and try again.",
      );
    } else {
      logger.error("MAP service unreachable", { from, err: err.message });
      await api.sendText(
        from,
        "❌ We could not reach the registration service. Please try again in a few minutes.",
      );
    }
  }
}
