/**
 * sap-service.js — SAP Integration Layer for Purchase Order Status
 *
 * Configure via SAP_CONNECTION_TYPE in .env:
 *  "odata" — SAP OData REST API (S/4HANA, Fiori, BTP)  [default]
 *
 * OData service: /sap/opu/odata/sap/ZSO_ODATA_SRV
 */

import { messageAxios } from "../helper/utils/http-client.js";
import logger from "../helper/utils/logger.js";

const VALID_CONNECTION_TYPES = ["odata"];

// ─── Main SAP Service class ───────────────────────────────────────────────
export class SAPService {
  constructor() {
    this.connectionType = process.env.SAP_CONNECTION_TYPE || "odata";

    if (!VALID_CONNECTION_TYPES.includes(this.connectionType)) {
      throw new Error(
        `Invalid SAP_CONNECTION_TYPE "${this.connectionType}". Valid values: ${VALID_CONNECTION_TYPES.join(", ")}`,
      );
    }
  }

  /**
   * Get full PO details by PO number
   * @param {string} poNumber - e.g. "4500012345"
   * @returns {PODetails|null}
   */
  async getPOStatus(poNumber, isSalesOrder) {
    const normalized = normalizePONumber(poNumber);

    logger.debug(`🔍 Fetching PO ${normalized} via [${this.connectionType}]`);

    return this._fetchViaOData(normalized, isSalesOrder);
  }

  // ─── 1. OData (S/4HANA / Fiori / BTP) ──────────────────────────────────
  async _fetchViaOData(poNumber, isSalesOrder) {
    const url = `http://th-s4-qas-ad.tatahitachi.co.in:8001/sap/opu/odata/sap/ZSO_ODATA_SRV/SOSet?$filter=${isSalesOrder ? "SalesDoc" : "CustRef"}%20eq%20%27${poNumber}%27`;

    const username = process.env.SAP_USERNAME;
    const password = process.env.SAP_PASSWORD;

    const response = await messageAxios.get(url, {
      auth: {
        username,
        password,
      },
      headers: {
        Accept: "application/json",
      },
    });

    const json = response.data.d.results;

    if (!json) return null;

    return formatSAPData(json);
  }

  async _fetchViaBYD(poNumber, isSalesOrder) {
    const url = `${process.env.BYD_BASE_URL}/your/byd/endpoint?$filter=${isSalesOrder ? "SalesDoc" : "CustRef"}%20eq%20%27${poNumber}%27`;

    const response = await messageAxios.get(url, {
      auth: {
        username: process.env.BYD_USERNAME,
        password: process.env.BYD_PASSWORD,
      },
      headers: { Accept: "application/json" },
    });

    const json = response.data.d.results;
    if (!json) return null;

    return `Fetched data via byd`;

    // return formatBYDData(json);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Normalize PO number — SAP usually stores as 10-digit zero-padded
 * Accepts: "45-00012345", "4500012345", "12345"
 */
export function normalizePONumber(input) {
  const digits = input.replace(/\D/g, "");
  return digits;
}

/**
 * Check if a string looks like a PO number
 * Accepts formats like: 4500012345, PO-4500012345, PO4500012345, 12345
 */
export function isPONumber(text) {
  return /^(PO[-\s]?)?\d{5,10}$/i.test(text.trim());
}

function formatSAPData(dataArray) {
  if (!dataArray?.length) return "N/A";

  const check = (val) => val && val.trim() !== "";
  const statusIcon = (val) => (check(val) ? "✅" : "⏳");

  const messages = dataArray
    .map((data) => {
      const lines = [
        `*Status Update for - ${data.SalesDoc}/${data.Material}*`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `📋 *Document Status*`,
        `  ${statusIcon(data.SalesDoc)}Sales Order ${statusIcon(data.DeliveryDoc)}Delivery ${statusIcon(data.BillingDoc)}Billing`,
        ``,
        `🚦 *Dispatch Status*`,
        `  🔖 LR Number     : ${data.LRNO || "N/A"}`,
        `  🚚 Truck No      : ${check(data.TruckNo) ? "🛻 " + data.TruckNo : "⏳ Not Assigned"}`,
        `  🏢 Transporter   : ${check(data.TrName) ? data.TrName : "N/A"}`,
        ``,
        `━━━━━━━━━━━━━━━━━━━━`,
      ];

      return lines.join("\n");
    })
    .join("\n\n");

  return messages;
}
