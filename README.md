# 📦 WhatsApp PO Tracker — SAP Integration

A WhatsApp Cloud API bot that lets users check **Purchase Order status from SAP** by simply sending a PO number in WhatsApp.

---

## How It Works

```
User sends PO number          Bot replies with SAP status
──────────────────            ──────────────────────────────────────
"4500012345"          →       📋 Purchase Order Status
                              ━━━━━━━━━━━━━━━━━━━━━
                              🔢 PO Number: 4500012345
                              📅 Order Date: Feb 15, 2024
                              🏢 Vendor: Acme Supplies Ltd.
                              💰 Total Value: $12,500.00

                              📦 Delivery: 🔄 Partially Delivered
                              🧾 Invoice: 📄 Not Yet Invoiced

                              📌 Line Items:
                                • Industrial Bolts M12
                                  Qty: 600/1000 PC ▓▓▓▓▓▓░░░░ 60%
                                  Delivery: Mar 20, 2024
                                ...
```

---

## SAP Connection Options

### Option A: SAP OData (S/4HANA / Fiori) — Recommended

Set in `.env`:
```
SAP_CONNECTION_TYPE=odata
SAP_ODATA_BASE_URL=https://your-s4hana-host
SAP_USERNAME=your_user
SAP_PASSWORD=your_password
```

Uses: `/sap/opu/odata/sap/MM_PUR_PO_MAINT_V2_SRV/C_PurchaseOrderTP`

### Option B: RFC / BAPI (classic SAP ECC or S/4HANA)

Set in `.env`:
```
SAP_CONNECTION_TYPE=rfc
SAP_HOST=your-sap-host
SAP_SYSNR=00
SAP_CLIENT=100
SAP_USERNAME=your_user
SAP_PASSWORD=your_password
```

Uses: `BAPI_PO_GETDETAIL1`

Requires:
1. SAP NWRFC SDK installed on your server
2. `npm install node-rfc`

### Option C: Mock (Development)
```
SAP_CONNECTION_TYPE=mock
```

Pre-loaded PO numbers for testing: `4500012345`, `4500012346`, `4500012347`

---

## Project Structure

```
whatsapp-po-tracker/
├── server/
│   ├── server.js           # Express app + webhook verification
│   ├── webhook.js          # Message handler + PO detection logic
│   ├── sap-service.js      # SAP integration (OData / RFC / Mock)
│   ├── whatsapp-api.js     # Cloud API wrapper (send messages)
│   └── flow-endpoint.js    # Optional: WhatsApp Flow data exchange
├── flow/
│   └── po-tracker-flow.json # Optional: WhatsApp Flow UI (button → form)
├── .env.example
└── package.json
```

---

## Setup

```bash
npm install
cp .env.example .env
# Fill in .env values

npm run dev           # start server
npm run tunnel        # expose to internet for webhook
```

Set Meta webhook URL to: `https://your-tunnel-url/webhook`

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/webhook` | Meta webhook verification |
| `POST` | `/webhook` | Incoming WhatsApp messages |
| `GET` | `/api/po/:poNumber` | Manual PO lookup |
| `POST` | `/api/notify-po-update` | Trigger proactive status notification |
| `GET` | `/health` | Server health check |

### Proactive Notification

Call this from your SAP event handler when a PO status changes:

```bash
curl -X POST http://localhost:3000/api/notify-po-update \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "po_number": "4500012345",
    "previous_status": "Not Yet Delivered"
  }'
```

---

## Extending the SAP Query

To fetch additional data, modify `sap-service.js`:

```js
// Add GR (Goods Receipt) history via BAPI_GOODSMVT_GETITEMS
// Add invoice list via FI_ITEMS_BY_PO
// Add delivery schedule via BAPI_PO_GETDETAIL1 SCHEDULES param
```

---

## Message Template for Proactive Notifications

Submit this template in Meta Business Manager:

**Template name:** `po_status_update`
**Body:**
```
Your Purchase Order *{{1}}* status has been updated.
Previous: {{2}} → New: {{3}}
Vendor: {{4}}

Reply or tap below to view full details.
```

**Button:** Quick Reply — "View Details"
