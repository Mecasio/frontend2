import axios from "axios";
import API_BASE_URL from "../apiConfig";
import {
  ensureUserMacAddressSetup,
  getStoredUserMacAddress,
} from "./userMacAddress";

ensureUserMacAddressSetup();

const accessDescriptionExcludedRoles = new Set([
  "student",
  "applicant",
  "faculty",
  "professor",
]);

const getAuditActorRole = () => {
  const role = localStorage.getItem("role") || "";
  const normalizedRole = role.trim().toLowerCase().replace(/[\s_-]+/g, "_");

  if (accessDescriptionExcludedRoles.has(normalizedRole)) {
    return role;
  }

  return localStorage.getItem("access_description") || role || "";
};

export const getAuditHeaders = () => {
  const token = localStorage.getItem("token") || "";
  const userMacAddress = getStoredUserMacAddress();

  return {
    Authorization: token ? `Bearer ${token}` : "",
    "x-audit-actor-id":
      localStorage.getItem("employee_id") ||
      localStorage.getItem("person_id") ||
      localStorage.getItem("email") ||
      "unknown",
    "x-audit-actor-person-id": localStorage.getItem("person_id") || "",
    "x-audit-actor-email": localStorage.getItem("email") || "",
    "x-audit-actor-role": getAuditActorRole(),
    ...(userMacAddress ? { "x-user-mac-address": userMacAddress } : {}),
  };
};

export const getAuditConfig = (overrides = {}) => ({
  headers: {
    ...getAuditHeaders(),
    ...overrides,
  },
});

export const getFlatAuditHeaders = (overrides = {}) => ({
  ...getAuditHeaders(),
  ...overrides,
});

export const withAuditActorPayload = (payload = {}, overrides = {}) => {
  const user_mac_address = getStoredUserMacAddress();

  return {
    ...payload,
    audit_actor_id:
      overrides.audit_actor_id ||
      localStorage.getItem("employee_id") ||
      localStorage.getItem("person_id") ||
      localStorage.getItem("email") ||
      "unknown",
    audit_actor_role:
      overrides.audit_actor_role ||
      getAuditActorRole() ||
      "registrar",
    ...(user_mac_address ? { user_mac_address } : {}),
  };
};

export const postAuditEvent = async (eventType, details = {}) => {
  const user_mac_address = getStoredUserMacAddress();

  await axios.post(
    `${API_BASE_URL}/api/audit/event`,
    {
      event_type: eventType,
      details,
      actor_person_id: localStorage.getItem("person_id") || "",
      actor_employee_id: localStorage.getItem("employee_id") || "",
      ...(user_mac_address ? { user_mac_address } : {}),
    },
    { headers: getAuditHeaders() },
  );
};
