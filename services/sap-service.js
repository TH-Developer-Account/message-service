/**
 * sap-service.js — SAP Integration Layer for Purchase Order Status
 *
 * Supports three SAP connection methods — configure via SAP_CONNECTION_TYPE in .env:
 *
 *  1. "odata"  — SAP OData REST API (S/4HANA, Fiori, BTP)
 *  2. "rfc"    — SAP RFC/BAPI via node-rfc (requires SAP NWRFC SDK)
 *  3. "mock"   — Mock data for development/testing
 *
 * Key BAPIs / OData services used:
 *  - BAPI_PO_GETDETAIL1     → PO header + items
 *  - ME2M / ME2N            → PO list by material/vendor
 *  - OData: /sap/opu/odata/sap/MM_PUR_PO_MAINT_V2_SRV
 */

import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

// ─── PO Status codes → human-readable labels ─────────────────────────────
const PO_STATUS_MAP = {
  "": "Open",
  A: "Created",
  B: "Partially Delivered",
  C: "Fully Delivered",
  D: "Invoiced",
  E: "Closed",
  S: "Blocked",
  U: "Under Review",
  X: "Cancelled",
};

const DELIVERY_STATUS_MAP = {
  "": "Not Delivered",
  A: "Not Yet Delivered",
  B: "Partially Delivered",
  C: "Fully Delivered",
};

const INVOICE_STATUS_MAP = {
  "": "Not Invoiced",
  A: "Not Yet Invoiced",
  B: "Partially Invoiced",
  C: "Fully Invoiced",
};

// ─── Main SAP Service class ───────────────────────────────────────────────
export class SAPService {
  constructor() {
    this.connectionType = process.env.SAP_CONNECTION_TYPE || "mock";
  }

  /**
   * Get full PO details by PO number
   * @param {string} poNumber - e.g. "4500012345"
   * @returns {PODetails|null}
   */
  async getPOStatus(poNumber) {
    const normalized = normalizePONumber(poNumber);

    console.log(`🔍 Fetching PO ${normalized} via [${this.connectionType}]`);

    switch (this.connectionType) {
      case "odata":
        return this._fetchViaOData(normalized);
      case "rfc":
        return this._fetchViaRFC(normalized);
      case "mock":
      default:
        return this._fetchMock(normalized);
    }
  }

  // ─── 1. OData (S/4HANA / Fiori / BTP) ──────────────────────────────────
  async _fetchViaOData(poNumber) {
    const url = `http://th-s4-qas-ad.tatahitachi.co.in:8001/sap/opu/odata/sap/ZSO_ODATA_SRV/SOSet?$filter=CustRef%20eq%20%27${poNumber}%27`;
    const username = process.env.SAP_USERNAME;
    const password = process.env.SAP_PASSWORD;

    const response = await axios.get(url, {
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
  // ─── 2. RFC / BAPI (via node-rfc) ──────────────────────────────────────
  async _fetchViaRFC(poNumber) {
    // Requires: npm install node-rfc
    // And: SAP NWRFC SDK installed on the system
    let rfcClient;
    try {
      const { Client } = await import("node-rfc");

      rfcClient = new Client({
        ashost: process.env.SAP_HOST,
        sysnr: process.env.SAP_SYSNR,
        client: process.env.SAP_CLIENT,
        user: process.env.SAP_USERNAME,
        passwd: process.env.SAP_PASSWORD,
        lang: "EN",
      });

      await rfcClient.open();

      // Call BAPI_PO_GETDETAIL1 to get PO header + items
      const result = await rfcClient.call("BAPI_PO_GETDETAIL1", {
        PURCHASEORDER: poNumber,
        ITEMS: "X",
        SCHEDULES: "X",
        ACCOUNT_ASSIGNMENT: "X",
        HISTORY: "X",
      });

      if (result.RETURN?.some((r) => r.TYPE === "E")) {
        const errMsg = result.RETURN.find((r) => r.TYPE === "E")?.MESSAGE;
        if (errMsg?.includes("does not exist")) return null;
        throw new Error(`BAPI error: ${errMsg}`);
      }

      return this._mapBAPIResponse(result, poNumber);
    } finally {
      if (rfcClient?.alive) await rfcClient.close();
    }
  }

  _mapBAPIResponse(result, poNumber) {
    const header = result.PO_HEADER || {};
    const items = (result.PO_ITEMS || []).map((item) => ({
      lineNumber: item.PO_ITEM,
      material: item.MATERIAL,
      description: item.SHORT_TEXT,
      quantity: parseFloat(item.QUANTITY || 0),
      unit: item.PO_UNIT,
      deliveredQty: parseFloat(item.DELIV_GOODS || 0),
      netPrice: parseFloat(item.NET_PRICE || 0),
      currency: header.CURRENCY,
      deliveryDate: formatSAPDate(item.DELIVERY_DATE),
      plant: item.PLANT,
      status:
        item.DELIV_GOODS >= item.QUANTITY
          ? "Fully Delivered"
          : "Partially Delivered",
    }));

    return {
      poNumber,
      vendor: {
        id: header.VENDOR,
        name: header.VENDOR_NAME || header.VENDOR,
      },
      status: PO_STATUS_MAP[header.STATUS] || "Unknown",
      orderDate: formatSAPDate(header.CREAT_DATE),
      currency: header.CURRENCY,
      totalAmount: parseFloat(header.GROSSAMOUNT || 0),
      purchasingOrg: header.PURCH_ORG,
      purchasingGroup: header.PUR_GROUP,
      companyCode: header.CO_CODE,
      deliveryStatus: DELIVERY_STATUS_MAP[header.DELIVERY_STATUS] || "Unknown",
      invoiceStatus: INVOICE_STATUS_MAP[header.INVOICE_STATUS] || "Unknown",
      items,
      rawData: result,
    };
  }

  // ─── 3. Mock (development / testing) ────────────────────────────────────
  async _fetchMock(poNumber) {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 300));

    const mockDB = {
      4500012345: {
        poNumber: "4500012345",
        vendor: { id: "V1001", name: "Acme Supplies Ltd." },
        status: "Active",
        orderDate: "2024-02-15",
        currency: "USD",
        totalAmount: 12500.0,
        purchasingOrg: "1000",
        purchasingGroup: "001",
        companyCode: "1000",
        deliveryStatus: "Partially Delivered",
        invoiceStatus: "Not Yet Invoiced",
        items: [
          {
            lineNumber: "00010",
            material: "MAT-001",
            description: "Industrial Bolts M12",
            quantity: 1000,
            unit: "PC",
            deliveredQty: 600,
            netPrice: 0.5,
            currency: "USD",
            deliveryDate: "2024-03-20",
            plant: "1000",
            status: "Partially Delivered",
          },
          {
            lineNumber: "00020",
            material: "MAT-002",
            description: "Steel Washers 12mm",
            quantity: 2000,
            unit: "PC",
            deliveredQty: 0,
            netPrice: 0.1,
            currency: "USD",
            deliveryDate: "2024-03-25",
            plant: "1000",
            status: "Not Yet Delivered",
          },
        ],
      },
      4500012346: {
        poNumber: "4500012346",
        vendor: { id: "V2002", name: "TechParts International" },
        status: "Active",
        orderDate: "2024-02-20",
        currency: "USD",
        totalAmount: 48750.0,
        purchasingOrg: "1000",
        purchasingGroup: "002",
        companyCode: "1000",
        deliveryStatus: "Fully Delivered",
        invoiceStatus: "Partially Invoiced",
        items: [
          {
            lineNumber: "00010",
            material: "ELE-100",
            description: "Control Unit PCB",
            quantity: 50,
            unit: "PC",
            deliveredQty: 50,
            netPrice: 975.0,
            currency: "USD",
            deliveryDate: "2024-03-01",
            plant: "2000",
            status: "Fully Delivered",
          },
        ],
      },
      4500012347: {
        poNumber: "4500012347",
        vendor: { id: "V3003", name: "GlobalChem Corp." },
        status: "Active",
        orderDate: "2024-01-10",
        currency: "EUR",
        totalAmount: 5200.0,
        purchasingOrg: "2000",
        purchasingGroup: "005",
        companyCode: "2000",
        deliveryStatus: "Fully Delivered",
        invoiceStatus: "Fully Invoiced",
        items: [
          {
            lineNumber: "00010",
            material: "CHM-055",
            description: "Industrial Solvent 200L",
            quantity: 20,
            unit: "DR",
            deliveredQty: 20,
            netPrice: 260.0,
            currency: "EUR",
            deliveryDate: "2024-02-01",
            plant: "3000",
            status: "Fully Delivered",
          },
        ],
      },
    };

    return mockDB[poNumber] || null;
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

/**
 * Convert SAP date format (YYYYMMDD or /Date(ms)/) to readable string
 */
function formatSAPDate(sapDate) {
  if (!sapDate) return "N/A";

  // OData format: /Date(1709510400000)/
  const odataMatch = sapDate.toString().match(/\/Date\((\d+)\)\//);
  if (odataMatch) {
    return new Date(parseInt(odataMatch[1])).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // YYYYMMDD format from RFC
  if (/^\d{8}$/.test(sapDate)) {
    const d = new Date(
      `${sapDate.slice(0, 4)}-${sapDate.slice(4, 6)}-${sapDate.slice(6, 8)}`,
    );
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Already formatted
  return sapDate;
}

function formatSAPData(sapData) {
  if (!sapData) return "N/A";

  const salesDocs = sapData.map((item) => item?.SalesDoc).filter(Boolean);

  console.log({ salesDocs });
  return salesDocs;
}
