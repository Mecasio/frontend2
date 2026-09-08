import { useEffect } from "react";
import { fetchAndStoreUserMacAddress } from "../utils/userMacAddress";

const useAccountAuditMac = () => {
  useEffect(() => {
    fetchAndStoreUserMacAddress().catch((err) => {
      console.error("Failed to preload MAC address for audit logs:", err);
    });
  }, []);
};

export default useAccountAuditMac;
