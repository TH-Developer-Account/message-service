// helper/http-client.js — create once, import everywhere
import axios from "axios";
import https from "https";

export const messageAxios = axios.create({
  timeout: 30000,
  httpsAgent: new https.Agent({
    keepAlive: true,
    maxSockets: 25, // max concurrent connections to any one host
  }),
});
