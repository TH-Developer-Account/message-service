/**
 * routes/ticket-notification.route.js
 *
 * POST /ticket-notifications
 *
 * Called by the external party (not Meta) when a service ticket's status
 * changes. This side only knows the reference number — the contact store
 * maps it back to the WhatsApp number that originally created the ticket.
 */
import { Router } from "express";
import { internalAuth } from "../middleware/internal-auth.js";
import { getTicketContact } from "../helper/utils/ticket-contact-store.js";
import { whatsappApi as api } from "../services/whatsapp-api.js";
import logger from "../helper/utils/logger.js";

export const ticketNotificationRouter = Router();

ticketNotificationRouter.post("/", internalAuth, async (req, res) => {
  const { referenceNumber, c4cReferenceNumber } = req.body ?? {};

  if (!referenceNumber || typeof referenceNumber !== "string") {
    return res.status(400).json({ error: "referenceNumber is required" });
  }

  try {
    const phoneNumber = await getTicketContact(referenceNumber);

    if (!phoneNumber) {
      return res.status(200).json({
        message:
          "No contact found for this reference number — mapping may have expired or never existed",
      });
    }

    await api.sendText(
      phoneNumber,
      `✅ Your service request has been submitted successfully!\n\n*Ticket ID:* ${c4cReferenceNumber}`,
    );

    logger.info("Ticket status notification sent", {
      referenceNumber,
      phoneNumber,
    });
    return res.sendStatus(200);
  } catch (err) {
    logger.error("Failed to send ticket status notification", {
      referenceNumber,
      err: err.message,
    });
    return res.status(502).json({ error: "Failed to deliver notification" });
  }
});
