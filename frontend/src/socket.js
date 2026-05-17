import { io } from "socket.io-client";
import {configDotenv} from 'dotenv'
import { BACKEND_URL } from "./config.js";

const SOCKET_URL = BACKEND_URL; // backend URL

// Single shared socket instance (do NOT create multiple)
export const socket = io(SOCKET_URL, {
  autoConnect: false, // we'll connect manually
});

export default socket;
