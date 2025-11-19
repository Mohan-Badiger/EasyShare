import { io } from "socket.io-client";
import {configDotenv} from 'dotenv'

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL; // backend URL

// Single shared socket instance (do NOT create multiple)
export const socket = io(SOCKET_URL, {
  autoConnect: false, // we'll connect manually
});

export default socket;
