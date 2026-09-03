import axios from "axios";

/**
 * Fetches a fresh CSRF token from a SAP OData endpoint.
 * SAP issues these tokens per-session via the standard
 * "x-csrf-token: fetch" handshake on a GET request.
 *
 *
 */

const extractCookieHeader = (setCookieArray) => {
  if (!setCookieArray || setCookieArray.length === 0) {
    return "";
  }

  return setCookieArray
    .map((cookieString) => cookieString.split(";")[0].trim())
    .join("; ");
};

export const fetchSapCsrfToken = async (sapUrl) => {
  const response = await axios.get(sapUrl, {
    headers: {
      "x-csrf-token": "fetch",
      Accept: "application/json",
    },
    auth: {
      username: "USERTALLY",
      password: "WJuly@2026",
    },
    // Axios throws on non-2xx by default, but we want to inspect
    // the response ourselves in that case, so let it pass through.
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`SAP token request failed with status ${response.status}`);
  }

  const token = response.headers["x-csrf-token"];
  const cookie = extractCookieHeader(response.headers["set-cookie"]);

  if (!token) {
    // SAP responded, but didn't issue a token — worth distinguishing
    // from a network/auth failure since the fix differs.
    throw new Error("SAP response did not include an x-csrf-token header");
  }

  return { csrfToken: token, cookie, sapBody: response.data };
};
