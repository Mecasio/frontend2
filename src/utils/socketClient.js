import { io } from "socket.io-client";
import API_BASE_URL from "../apiConfig";

/**
 * Create an authenticated Socket.IO client (HRIS-style handshake.auth.token).
 * Path stays `/api/socket.io` to match the backend socket server.
 */
export function createAppSocket(extra = {}) {
  const token = localStorage.getItem("token");

  return io(API_BASE_URL, {
    path: "/api/socket.io",
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    auth: token ? { token } : {},
    ...extra,
  });
}

export default createAppSocket;
