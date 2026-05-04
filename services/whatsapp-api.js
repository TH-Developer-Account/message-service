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
    const version = process.env.GRAPH_API_VERSION ?? "v22.0";
    this.baseUrl = `https://graph.facebook.com/${version}/${this.phoneNumberId}/messages`;
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

  // ─── Send Template message ──────────────────────────────────────────────────
  async sendTemplate({ to, templateName, flowToken }) {
    return this._send({
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
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
                  flow_token: flowToken,
                },
              },
            ],
          },
        ],
      },
    });
  }

  async sendWelcome(to) {
    return this._send({
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: "select_option_template",
        language: { code: "en" },
      },
    });
  }

  // ─── Help / fallback message ───────────────────────────────────────────
  async sendHelp(to, name) {
    return this.sendText(
      to,
      `Hi ${name}! 👋 I'm your *Status Bot*.\n\n` +
        `Just send me a Order number and I'll look it up immediately.\n\n` +
        `*Examples:*\n` +
        `• 4500012345.`,
    );
  }
}

export const whatsappApi = new WhatsAppAPI();
