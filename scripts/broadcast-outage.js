/**
 * scripts/broadcast-outage.js
 *
 * One-off broadcast: sends the "outlook_outage_template" WhatsApp template
 * (static, no body/button variables) to every valid employee mobile number
 * found across one or more Excel files.
 *
 * Usage:
 *   node scripts/broadcast-outage.js [file1.xlsx] [file2.xlsx] ...
 *
 *   If no files are passed, it looks for the two default filenames below
 *   next to wherever this script is run from.
 *
 * Requires the same env vars as the running service:
 *   WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_PERMANENT_ACCESS_TOKEN, GRAPH_API_VERSION
 *
 * Needs the `xlsx` package: npm install xlsx
 *
 * Output (written next to this script):
 *   broadcast-results-<timestamp>.csv   per-recipient send status + message id/error
 *   broadcast-skipped-<timestamp>.csv   rows with missing/invalid mobile numbers
 */

import "dotenv/config";
import xlsx from "xlsx";
import fs from "fs";
import path from "path";
import { whatsappApi as api } from "../services/whatsapp-api.js";
import logger from "../helper/utils/logger.js";

// ─── Config ──────────────────────────────────────────────────────────────
const TEMPLATE_NAME = "outlook_outage_template";
const TEMPLATE_LANGUAGE = "en";
const COUNTRY_CODE = "91";

// ~1 msg/sec. Conservative default since the account's current messaging
// tier/quality rating isn't known — safe to lower once that's confirmed.
const SEND_INTERVAL_MS = 1100;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2000;

const DEFAULT_INPUT_FILES = [
  "./Company_provided_mobile_number.xlsx",
  "./Copy_of_Company_provided_mobile_number.xlsx",
];

const INPUT_FILES = (
  process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_INPUT_FILES
).map((p) => path.resolve(p));

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const RESULTS_PATH = path.resolve(`./broadcast-results-${timestamp}.csv`);
const SKIPPED_PATH = path.resolve(`./broadcast-skipped-${timestamp}.csv`);

// ─── Pure helpers ────────────────────────────────────────────────────────

/** Normalize a raw mobile-number cell to a 10-digit string, or null if invalid. */
function normalizeMobile(raw) {
  if (raw === null || raw === undefined) return null;
  const digitsOnly = String(raw).replace(/\D/g, "");
  return digitsOnly.length === 10 ? digitsOnly : null;
}

/** Read a workbook's first sheet into row objects. */
function readSheet(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet, { defval: null });
}

/** Mobile-number header differs in case between the two source files ("Mobile No." vs "Mobile no."). */
function getMobileField(row) {
  const key = Object.keys(row).find(
    (k) => k.trim().toLowerCase() === "mobile no.",
  );
  return key ? row[key] : null;
}

/**
 * Merge rows from all input files into valid (deduped) and skipped lists.
 * @returns {{ valid: {to:string,name:string,empNo:string}[], skipped: object[] }}
 */
function buildRecipientLists(filePaths) {
  const seen = new Map(); // normalized number -> recipient, dedupes across files
  const skipped = [];

  for (const filePath of filePaths) {
    const rows = readSheet(filePath);
    for (const row of rows) {
      const rawMobile = getMobileField(row);
      const normalized = normalizeMobile(rawMobile);
      if (!normalized) {
        skipped.push({
          name: row.Name ?? "",
          empNo: row["T.No."] ?? "",
          division: row.Division ?? "",
          location: row.Location ?? "",
          rawMobile: rawMobile ?? "",
        });
        continue;
      }
      if (!seen.has(normalized)) {
        seen.set(normalized, {
          to: `${COUNTRY_CODE}${normalized}`,
          name: row.Name ?? "",
          empNo: row["T.No."] ?? "",
        });
      }
    }
  }

  return { valid: [...seen.values()], skipped };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toCsvRow(fields) {
  return fields
    .map((f) => `"${String(f ?? "").replace(/"/g, '""')}"`)
    .join(",");
}

function writeCsv(filePath, header, rows) {
  const lines = [toCsvRow(header), ...rows.map(toCsvRow)];
  fs.writeFileSync(filePath, lines.join("\n") + "\n");
}

// ─── Send with retry ─────────────────────────────────────────────────────

function isRateLimited(err) {
  // Meta returns HTTP 429, or a 130429/80007-style error code for pacing/throughput limits.
  return (
    err.status === 429 ||
    /130429|80007/.test(JSON.stringify(err.apiError ?? ""))
  );
}

async function sendWithRetry(recipient) {
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt += 1) {
    try {
      const response = await api.sendStaticTemplate(
        recipient.to,
        TEMPLATE_NAME,
        TEMPLATE_LANGUAGE,
      );
      return { status: "sent", messageId: response?.messages?.[0]?.id ?? "" };
    } catch (err) {
      const isLastAttempt = attempt > MAX_RETRIES;
      if (!isRateLimited(err) || isLastAttempt) {
        return { status: "failed", error: err.message };
      }
      const backoff = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      logger.warn("Rate limited, backing off", {
        to: recipient.to,
        attempt,
        backoff,
      });
      await sleep(backoff);
    }
  }
}

// ─── Orchestration ───────────────────────────────────────────────────────

async function run() {
  const { valid, skipped } = buildRecipientLists(INPUT_FILES);

  logger.info("Broadcast starting", {
    template: TEMPLATE_NAME,
    validRecipients: valid.length,
    skippedRows: skipped.length,
  });

  writeCsv(
    SKIPPED_PATH,
    ["Name", "T.No.", "Division", "Location", "RawMobile"],
    skipped.map((s) => [s.name, s.empNo, s.division, s.location, s.rawMobile]),
  );

  const results = [];
  for (let i = 0; i < valid.length; i += 1) {
    const recipient = valid[i];
    const outcome = await sendWithRetry(recipient);
    results.push({ ...recipient, ...outcome });

    logger.info(`[${i + 1}/${valid.length}] ${outcome.status}`, {
      to: recipient.to,
      name: recipient.name,
    });

    if (i < valid.length - 1) await sleep(SEND_INTERVAL_MS);
  }

  writeCsv(
    RESULTS_PATH,
    ["Name", "T.No.", "To", "Status", "MessageId", "Error"],
    results.map((r) => [
      r.name,
      r.empNo,
      r.to,
      r.status,
      r.messageId ?? "",
      r.error ?? "",
    ]),
  );

  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.length - sent;

  logger.info("Broadcast complete", { sent, failed, skipped: skipped.length });
  //   console.log(
  //     `\nDone. Sent: ${sent}  Failed: ${failed}  Skipped (bad numbers): ${skipped.length}`,
  //   );
  //   console.log(`Results: ${RESULTS_PATH}`);
  //   console.log(`Skipped: ${SKIPPED_PATH}`);
}

run().catch((err) => {
  logger.error("Broadcast crashed", { error: err.message });
  process.exit(1);
});
