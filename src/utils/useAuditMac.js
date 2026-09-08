import { useEffect } from "react";
import {
  ensureUserMacAddressSetup,
  fetchAndStoreUserMacAddress,
} from "./userMacAddress";

ensureUserMacAddressSetup();

const useAuditMac = () => {
  useEffect(() => {
    fetchAndStoreUserMacAddress().catch((err) => {
      console.error("Failed to preload MAC address for audit logs:", err);
    });
  }, []);
};

export default useAuditMac;
