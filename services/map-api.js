/**
 * services/map-api.js
 */
import { messageAxios } from "../helper/utils/http-client.js";
import logger from "../helper/utils/logger.js";

const MAP_BASE_URL = process.env.MAP_SERVICE_URL;
const MAP_API_KEY = process.env.MAP_API_KEY;

export const mapApi = {
  async registerOperator(payload) {
    logger.debug("MAP API request", { endpoint: "/api/v1/operator/register" });

    const { data } = await messageAxios.post(
      `${MAP_BASE_URL}/api/v1/operator/register`,
      payload,
      {
        timeout: 10000,
        headers: {
          "x-api-key": MAP_API_KEY,
        },
      },
    );

    return data;
  },
};
