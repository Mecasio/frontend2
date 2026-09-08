import axios from "axios";
import API_BASE_URL from "../apiConfig";

const STORAGE_KEY = "user_mac_address";
const MAC_HEADER = "x-user-mac-address";

let interceptorInstalled = false;
let preloadStarted = false;

export const getStoredUserMacAddress = () =>
  localStorage.getItem(STORAGE_KEY) || "";

export const setStoredUserMacAddress = (macAddress) => {
  const normalized = String(macAddress || "").trim();
  if (!normalized) {
    localStorage.removeItem(STORAGE_KEY);
    return "";
  }
  localStorage.setItem(STORAGE_KEY, normalized);
  return normalized;
};

export const fetchAndStoreUserMacAddress = async () => {
  const cached = getStoredUserMacAddress();
  if (cached) return cached;

  try {
    const { data } = await axios.get(`${API_BASE_URL}/api/user-mac-address`);
    return setStoredUserMacAddress(data?.mac_address);
  } catch (err) {
    console.error("Failed to resolve user MAC address:", err);
    return "";
  }
};

export const getLoginMacPayload = () => {
  const user_mac_address = getStoredUserMacAddress();
  return user_mac_address ? { user_mac_address } : {};
};

export const ensureAxiosMacInterceptor = () => {
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  axios.interceptors.request.use((config) => {
    const mac = getStoredUserMacAddress();
    if (!mac) return config;

    const headers = config.headers || {};
    const existing =
      headers[MAC_HEADER] ||
      headers["X-User-Mac-Address"] ||
      (typeof headers.get === "function" ? headers.get(MAC_HEADER) : null);

    if (!existing) {
      if (typeof headers.set === "function") {
        headers.set(MAC_HEADER, mac);
      } else {
        headers[MAC_HEADER] = mac;
      }
      config.headers = headers;
    }

    return config;
  });
};

export const ensureUserMacAddressSetup = () => {
  ensureAxiosMacInterceptor();

  if (preloadStarted) return;
  preloadStarted = true;

  fetchAndStoreUserMacAddress().catch((err) => {
    console.error("Unable to preload MAC address for audit logs:", err);
  });
};

ensureUserMacAddressSetup();
