/**
 * whatsapp-api.js — WhatsApp Cloud API wrapper for PO Tracker
 *
 * Message types used:
 *  - Text           → simple text replies
 *  - Interactive    → buttons (Check Another / Main Menu)
 *  - Template       → for outbound notifications (outside 24h window)
 */

export class WhatsAppAPI {
  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.WHATSAPP_PERMANENT_ACCESS_TOKEN;
    this.baseUrl = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;
  }

  // ─── Core send ────────────────────────────────────────────────────────
  async _send(payload) {
    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`WhatsApp API error: ${JSON.stringify(err)}`);
    }

    return res.json();
  }

  // ─── Plain text ───────────────────────────────────────────────────────
  async sendText(to, text) {
    return this._send({
      recipient_type: "individual",
      to,
      type: "text",
      text: { body: text },
    });
  }

  // ─── Welcome message ──────────────────────────────────────────────────
  async sendWelcome(to) {
    return this._send({
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: "po_status_utility_template",
        language: { code: "en" },
        components: [
          {
            type: "button",
            sub_type: "flow",
            index: "0",
            parameters: [
              {
                type: "action",
                action: {
                  // required for NAVIGATE flows
                  flow_token: "po_status_utility_template_flow_token", // can be any string
                },
              },
            ],
          },
        ],
      },
    });
  }

  // ─── Help / fallback message ───────────────────────────────────────────
  async sendHelp(to, name) {
    return this.sendText(
      to,
      `Hi ${name}! 👋 I'm your *PO Status Bot*.\n\n` +
        `Just send me a Purchase Order number and I'll look it up immediately.\n\n` +
        `*Examples:*\n` +
        `• 4500012345.`,
    );
  }
}
