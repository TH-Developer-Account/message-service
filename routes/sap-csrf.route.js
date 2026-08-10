import { Router } from "express";
import logger from "../helper/utils/logger.js";
import { fetchSapCsrfToken } from "../services/sap-csrf.js";

export const sapCsrfRouter = Router();

sapCsrfRouter.get("/", async (req, res) => {
  const sapUrl =
    "https://my346415.sapbydesign.com/sap/byd/odata/cust/v1/arcustomertally/ARCustomerTallyRootCollection";

  try {
    const response = await fetchSapCsrfToken(sapUrl);
    res.json({ ...response });
  } catch (error) {
    logger.error("Flow handler error", {
      err: error.message,
      stack: error.stack,
    });
    res.status(502).json({ error: "Failed to retrieve CSRF token from SAP" });
  }
});
