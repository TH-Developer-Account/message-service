import { messageAxios } from "./utils/http-client.js";
import logger from "./utils/logger.js";

export const loginAndGetToken = async () => {
  try {
    const url =
      "https://s4wpxl9869.execute-api.ap-south-1.amazonaws.com/Prod/api/User/Login";

    const { data } = await messageAxios.post(url, {
      username: process.env.MOBILITY_USERNAME,
      password: process.env.MOBILITY_PASSWORD,
    });

    // adjust based on actual response shape
    return data?.idToken;
  } catch (error) {
    logger.error("Error while logging into sales mobility", {
      code: error.code,
      response: error.response,
    });
    throw new Error("Error while logging into sales mobility", error.message);
  }
};

export const fetchServiceDetails = async (srNo, token) => {
  const url = `https://s4wpxl9869.execute-api.ap-south-1.amazonaws.com/Prod/api/Service/GetServiceDetailsByServiceOrderId/${encodeURIComponent(srNo)}`;

  const { data } = await messageAxios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return data;
};
