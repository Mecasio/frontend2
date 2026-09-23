import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Button,
  Typography,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  FormControl,
  Select,
  Card,
  TableCell,
  TextField,
  MenuItem,
  Checkbox,
  Stack,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControlLabel,
  Snackbar,
  Alert,
  DialogActions,
  Switch,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
} from "@mui/material";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import { getAuditConfig } from "../utils/auditEvents";
import useAccountAuditMac from "./useAccountAuditMac";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

const USER_PAGE_ACCESS_PAGE_ID = 69;
const ALWAYS_USER_PAGE_ACCESS_ROLES = ["superadmin", "technical"];

const normalizeAccessRole = (role) => String(role || "").trim().toLowerCase();

const hasGuaranteedUserPageAccess = (role) =>
  ALWAYS_USER_PAGE_ACCESS_ROLES.includes(normalizeAccessRole(role));

const applyGuaranteedUserPageAccess = (accessMap, role) => {
  if (!hasGuaranteedUserPageAccess(role)) return accessMap;
  return {
    ...accessMap,
    [USER_PAGE_ACCESS_PAGE_ID]: {
      access: true,
      can_create: true,
      can_edit: true,
      can_delete: true,
    },
  };
};

const getCurrentEmployeeId = () => {
  const token = localStorage.getItem("token");

  try {
    const payload = token?.split(".")[1];
    if (payload) {
      const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
      if (decoded?.employee_id !== undefined && decoded?.employee_id !== null) {
        return String(decoded.employee_id).trim();
      }
    }
  } catch (error) {
    console.warn("Unable to read employee ID from access token:", error);
  }

  return String(localStorage.getItem("employee_id") || "").trim();
};

// ─────────────────────────────────────────────────────────────────────────
// Maps each page_id to the menu-group label it belongs to in the sidebar
// (admissionMenuGroups, enrollmentMenuGroups, medicalMenuGroups, etc).
// This is what powers the "Filter by Group" dropdown in the Edit Access modal,
// so the filter options match the app's actual navigation groups rather than
// whatever free-text is stored in each page's `page_group` column.
//
// NOTE: a handful of page_ids are reused across more than one menu group in
// the source config (e.g. 171, 167, 116, 114, 72). Where that happens, the
// id is assigned to the group listed here and the conflicting duplicate is
// left commented out below it - update if a different group should win.
// ─────────────────────────────────────────────────────────────────────────
const PAGE_ID_TO_GROUP = {
  // Admission Management
  7: "Admission Management",
  1: "Admission Management",
  61: "Admission Management",
  115: "Admission Management",
  11: "Admission Management",
  48: "Admission Management",
  8: "Admission Management",
  118: "Admission Management",
  120: "Admission Management",
  9: "Admission Management",
  33: "Admission Management",
  171: "Admission Management", // also appears as Department Management's "Workload Management" - see below
  145: "Admission Management",
  98: "Admission Management",
  139: "Admission Management",
  172: "Admission Management",

  // Enrollment Management
  6: "Enrollment Management",
  43: "Enrollment Management",
  49: "Enrollment Management",
  151: "Enrollment Management",
  12: "Enrollment Management",
  37: "Enrollment Management",
  137: "Enrollment Management",
  124: "Enrollment Management",
  141: "Enrollment Management",
  125: "Enrollment Management",
  152: "Enrollment Management",
  170: "Enrollment Management",
  10: "Enrollment Management",
  36: "Enrollment Management",

  // Medical & Dental Management
  24: "Medical & Dental Management",
  25: "Medical & Dental Management",
  30: "Medical & Dental Management",
  31: "Medical & Dental Management",
  19: "Medical & Dental Management",
  32: "Medical & Dental Management",

  // Registrar's Office
  80: "Registrar's Office",
  161: "Registrar's Office",
  160: "Registrar's Office",
  168: "Registrar's Office",
  169: "Registrar's Office",
  59: "Registrar's Office",
  104: "Registrar's Office",
  38: "Registrar's Office",
  106: "Registrar's Office",
  153: "Registrar's Office",
  174: "Registrar's Office",
  50: "Registrar's Office",
  105: "Registrar's Office",
  62: "Registrar's Office",
  15: "Registrar's Office",
  17: "Registrar's Office",
  140: "Registrar's Office",
  117: "Registrar's Office",

  // Course Management
  34: "Course Management",
  18: "Course Management",
  16: "Course Management",
  35: "Course Management",
  111: "Course Management",
  113: "Course Management",
  112: "Course Management",
  148: "Course Management",

  // Department Management
  53: "Department Management",
  20: "Department Management",
  21: "Department Management",
  22: "Department Management",
  149: "Department Management",
  123: "Department Management",
  107: "Department Management",
  108: "Department Management",
  // 171: "Department Management", // dup of Admission Management's 171 - Admission Management wins above

  // Room Management
  52: "Room Management",

  // Requirements Management
  51: "Requirements Management",

  // Profile & Settings
  74: "Profile & Settings",
  138: "Profile & Settings",

  // Academic Configuration
  144: "Academic Configuration",
  14: "Academic Configuration",
  126: "Academic Configuration",
  146: "Academic Configuration",

  // Communication
  67: "Communication",
  66: "Communication",

  // Slot Configuration
  110: "Slot Configuration",

  // Section Management
  57: "Section Management",
  167: "Section Management", // dup of Registrar's Office's 167 - Section Management wins here

  // Semester Management
  58: "Semester Management",

  // Year Management
  63: "Year Management",
  64: "Year Management",
  55: "Year Management",

  // Evaluation Management
  23: "Evaluation Management",

  // Payment Management
  116: "Payment Management", // also appears as Scholarship Management's "Student Scholarship List" - see below
  122: "Payment Management",
  121: "Payment Management",
  99: "Payment Management",

  // Scholarship Management
  // 116: "Scholarship Management", // dup of Payment Management's 116 - Payment Management wins above

  // System Logs
  154: "System Logs",

  // Account Management
  70: "Account Management",
  71: "Account Management",
  143: "Account Management",
  147: "Account Management",

  // Faculty Management
  109: "Faculty Management",

  // Applicant Management
  75: "Applicant Management",
  84: "Applicant Management",
  142: "Applicant Management",
  166: "Applicant Management",

  // Student Management
  86: "Student Management",
  150: "Student Management",
  155: "Student Management",
  156: "Student Management",
  157: "Student Management",
  158: "Student Management",
  159: "Student Management",
  114: "Student Management",

  // Access Control
  72: "Access Control",

  // Password Management
  81: "Password Management",
  91: "Password Management",
  82: "Password Management",
  83: "Password Management",
  73: "Password Management",
};

// Display order for the "Filter by Group" dropdown - mirrors sidebar order
const ACCESS_GROUP_ORDER = [
  "Admission Management",
  "Enrollment Management",
  "Medical & Dental Management",
  "Registrar's Office",
  "Course Management",
  "Department Management",
  "Room Management",
  "Requirements Management",
  "Profile & Settings",
  "Academic Configuration",
  "Communication",
  "Slot Configuration",
  "Section Management",
  "Semester Management",
  "Year Management",
  "Evaluation Management",
  "Payment Management",
  "Scholarship Management",
  "System Logs",
  "Reset Password",
  "Account Management",
  "Faculty Management",
  "Applicant Management",
  "Student Management",
  "Access Control",
  "Password Management",
];

const UserPageAccess = () => {
  useAccountAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";
  const mainButtonColor = colors.mainButton || "#1976d2";

  // UI Colors
  const [titleColor, setTitleColor] = useState("#000000");
  const [borderColor, setBorderColor] = useState("#000000");

  // Access control
  const pageId = USER_PAGE_ACCESS_PAGE_ID;
  const [hasAccess, setHasAccess] = useState(null);
  const [accessModalLoading, setAccessModalLoading] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  // User list
  const [allUsers, setAllUsers] = useState([]);

  // Selected user access data
  const [selectedUser, setSelectedUser] = useState(null);
  const [pages, setPages] = useState([]);
  const [pageAccess, setPageAccess] = useState({});
  const [userRole, setUserRole] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [accessDescription, setAccessDescription] = useState("");
  const createDescriptionInputRef = useRef(null);
  const [createPageAccess, setCreatePageAccess] = useState({});
  const [createPages, setCreatePages] = useState([]);
  const [accessLevels, setAccessLevels] = useState([]);
  const [openEditAccessModal, setOpenEditAccessModal] = useState(false);
  const [editAccessId, setEditAccessId] = useState("");
  const [editAccessDescription, setEditAccessDescription] = useState("");
  const [editPageAccess, setEditPageAccess] = useState({});
  const [editPages, setEditPages] = useState([]);
  const [createAccessSearch, setCreateAccessSearch] = useState("");
  const [editAccessSearch, setEditAccessSearch] = useState("");
  // Tab state for the "Edit Access" modal (0 = Pages With Access, 1 = Pages Without Access)
  const [accessTab, setAccessTab] = useState(0);
  // Page-group filter for the "Edit Access" modal - applies to whichever tab is active
  const [pageGroupFilter, setPageGroupFilter] = useState("");
  const [accessConfirmDialog, setAccessConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success", // success | error | warning | info
  });

  const getAuditConfigForPage = () =>
    getAuditConfig({
      "x-employee-id":
        getCurrentEmployeeId() ||
        localStorage.getItem("email") ||
        "unknown",
      "x-page-id": pageId,
      "x-audit-actor-id":
        getCurrentEmployeeId() ||
        localStorage.getItem("email") ||
        "unknown",
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "administrator",
    });

  const getCreateAccessDescription = () =>
    createDescriptionInputRef.current?.value ?? accessDescription;

  const handleCloseSnack = (event, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  // Load settings
  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.border) setBorderColor(colors.border);
  }, [settings, colors.border, colors.title]);

  // Check page privilege. Superadmin and technical always keep this page.
  // Administrators can open it only when page 69 was granted to them.
  useEffect(() => {
    const storedRole = String(localStorage.getItem("role") || "").trim().toLowerCase();
    const storedEmployeeID = getCurrentEmployeeId();

    if (!["administrator", "superadmin", "technical"].includes(storedRole)) {
      window.location.href = "/login";
      return;
    }

    if (!storedEmployeeID) {
      setHasAccess(false);
      return;
    }

    if (hasGuaranteedUserPageAccess(storedRole)) {
      setHasAccess(true);
      setCanCreate(true);
      setCanEdit(true);
      setCanDelete(true);
      loadAllUsers();
      return;
    }

    checkAccess(storedEmployeeID);
  }, []);

  const checkAccess = async (employeeID) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
      );
      if (response.data && Number(response.data.page_privilege) === 1) {
        setHasAccess(true);
        setCanCreate(Number(response.data?.can_create) === 1);
        setCanEdit(Number(response.data?.can_edit) === 1);
        setCanDelete(Number(response.data?.can_delete) === 1);
        loadAllUsers();
      } else {
        setHasAccess(false);
        setCanCreate(false);
        setCanEdit(false);
        setCanDelete(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
      setCanCreate(false);
      setCanEdit(false);
      setCanDelete(false);
    }
  };

  // Load all users
  const loadAllUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/registrars`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setAllUsers(res.data);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  };

  // Load selected user's access
  const loadUserAccess = async (user) => {
    setSelectedUser(user);
    setPageAccess({});
    setPages([]);
    setUserRole("");
    setAccessTab(0);
    setPageGroupFilter("");
    setAccessModalLoading(true);
    setOpenModal(true);

    try {
      const pagesResp = await axios.get(`${API_BASE_URL}/api/pages`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      const accessResp = await axios.get(
        `${API_BASE_URL}/api/page_access/${user.employee_id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
      );

      const allPages = (pagesResp.data || []).sort((a, b) => a.id - b.id);

      const accessRows = accessResp.data || [];
      const accessMap = buildDefaultPermissionState(allPages);

      accessRows.forEach((row) => {
        const currentPageId = Number(row.page_id);
        accessMap[currentPageId] = {
          access: Number(row.page_privilege) === 1,
          can_create: Number(row.can_create) === 1,
          can_edit: Number(row.can_edit) === 1,
          can_delete: Number(row.can_delete) === 1,
        };
      });

      setPages(allPages);
      setPageAccess(applyGuaranteedUserPageAccess(accessMap, user.role));
    } catch {
      setOpenModal(false);
      setSnack({ open: true, severity: "error", message: "Failed to load access" });
    } finally {
      setAccessModalLoading(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20); // change if you want

  const [searchQuery, setSearchQuery] = useState("");

  const buildDefaultPermissionState = (pagesList) => {
    const defaults = {};
    pagesList.forEach((page) => {
      defaults[page.id] = {
        access: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      };
    });
    return defaults;
  };

  const createEmptyPermission = (access = false) => ({
    access,
    can_create: false,
    can_edit: false,
    can_delete: false,
  });

  const permissionLabels = {
    can_create: "Create",
    can_edit: "Edit",
    can_delete: "Delete",
  };

  const bulkPermissionToggleSx = {
    width: 42,
    height: 22,
    padding: 0,
    flexShrink: 0,
    "& .MuiSwitch-switchBase": {
      padding: "3px",
      transition: "transform 0.2s ease",
      "&.Mui-checked": {
        transform: "translateX(20px)",
        color: headerColor,
        "& + .MuiSwitch-track": {
          backgroundColor: "#fff",
          opacity: 1,
          borderColor: borderColor,
        },
        "& .MuiSwitch-thumb": {
          backgroundColor: headerColor,
        },
      },
      "&.Mui-disabled": {
        opacity: 0.4,
      },
    },
    "& .MuiSwitch-thumb": {
      width: 16,
      height: 16,
      borderRadius: "50%",
      backgroundColor: borderColor,
      boxShadow: "none",
    },
    "& .MuiSwitch-track": {
      borderRadius: "11px",
      backgroundColor: "#fff",
      opacity: 1,
      border: `1.5px solid ${borderColor}`,
      boxSizing: "border-box",
    },
    "& .MuiSwitch-input": {
      left: 0,
      width: "100%",
    },
  };

  const isBulkPermissionGranted = (pagesList, accessMap, permissionKey) =>
    pagesList.length > 0 &&
    pagesList.every((page) => Boolean(accessMap?.[page.id]?.[permissionKey]));

  const renderBulkPermissionToggles = ({
    pagesList,
    accessMap,
    onToggle,
    disabled = false,
    requireManagePermission = true,
    toggleWidth = 42,
  }) => (
    <Stack spacing={1.75} sx={{ width: "100%" }}>
      {Object.entries(permissionLabels).map(([permissionKey, label]) => {
        const checked = isBulkPermissionGranted(
          pagesList,
          accessMap,
          permissionKey,
        );
        const toggleDisabled =
          disabled ||
          (requireManagePermission &&
            !canManageUserPermissions(permissionKey)) ||
          pagesList.length === 0;

        return (
          <Box key={permissionKey} sx={{ width: "100%" }}>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 700,
                color: titleColor || "#111",
                mb: 0.75,
              }}
            >
              {label} (ALL) :
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: toggleDisabled ? "text.disabled" : titleColor || "#111",
                  lineHeight: 1,
                }}
              >
                Grant
              </Typography>
              <Switch
                checked={checked}
                disabled={toggleDisabled}
                disableRipple
                onChange={(e) => onToggle(permissionKey, e.target.checked)}
                sx={{
                  ...bulkPermissionToggleSx,
                  width: toggleWidth,
                  "& .MuiSwitch-switchBase": {
                    ...bulkPermissionToggleSx["& .MuiSwitch-switchBase"],
                    "&.Mui-checked": {
                      ...bulkPermissionToggleSx["& .MuiSwitch-switchBase"]["&.Mui-checked"],
                      transform: `translateX(${toggleWidth - 22}px)`,
                    },
                  },
                }}
              />
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: toggleDisabled ? "text.disabled" : titleColor || "#111",
                  lineHeight: 1,
                }}
              >
                Revoke
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Stack>
  );

  const canManageUserPermissions = (permissionKey) => {
    if (canEdit) return true;
    if (permissionKey === "can_create" && canCreate) return true;
    if (permissionKey === "can_delete" && canDelete) return true;
    return false;
  };

  const formatEmployeeName = (user) =>
    user
      ? `${user.last_name}, ${user.first_name} ${user.middle_name || "."}`.trim()
      : "this user";

  const getPageLabel = (targetPageId) => {
    const page = pages.find((p) => Number(p.id) === Number(targetPageId));
    return page?.page_description || `Page ${targetPageId}`;
  };

  const closeAccessConfirm = () => {
    setAccessConfirmDialog({
      open: false,
      title: "",
      message: "",
      onConfirm: null,
    });
  };

  const confirmAccessChange = ({ requiresConfirm, title, message, onConfirm }) => {
    if (!requiresConfirm) {
      onConfirm();
      return;
    }

    setAccessConfirmDialog({
      open: true,
      title,
      message,
      onConfirm: () => {
        closeAccessConfirm();
        onConfirm();
      },
    });
  };

  const permissionActionLabels = {
    can_create: "create",
    can_edit: "edit",
    can_delete: "delete",
  };

  const setBulkPermissionState = (
    pagesList,
    currentAccess,
    permissionKey,
    enabled,
  ) => {
    const nextAccess = { ...currentAccess };
    pagesList.forEach((page) => {
      const current = nextAccess[page.id] || createEmptyPermission(false);

      // Grant / close only on pages the user/level already has access to
      if (!current.access) return;

      nextAccess[page.id] = {
        ...current,
        [permissionKey]: enabled,
      };
    });
    return nextAccess;
  };

  const buildAccessLevelPermissionState = (pagesList) => {
    const defaults = {};
    pagesList.forEach((page) => {
      defaults[page.id] = createEmptyPermission(false);
    });
    return defaults;
  };

  const parseAccessLevelPermissions = (value) => {
    if (!value) return [];

    const normalizeEntry = (entry) => {
      if (typeof entry === "number" || typeof entry === "string") {
        const pageId = Number(entry);
        return Number.isNaN(pageId)
          ? null
          : { page_id: pageId, ...createEmptyPermission(true) };
      }

      if (!entry || typeof entry !== "object") return null;

      const pageId = Number(entry.page_id ?? entry.pageId ?? entry.id);
      if (Number.isNaN(pageId)) return null;

      return {
        page_id: pageId,
        access: Number(entry.page_privilege ?? entry.access ?? 1) === 1,
        can_create: Number(entry.can_create) === 1,
        can_edit: Number(entry.can_edit) === 1,
        can_delete: Number(entry.can_delete) === 1,
      };
    };

    const normalizeList = (list) => list.map(normalizeEntry).filter(Boolean);

    if (Array.isArray(value)) return normalizeList(value);

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return normalizeList(parsed);
      } catch {
        return normalizeList(value.split(",").map((v) => v.trim()));
      }
    }

    return [];
  };

  const buildAccessLevelPayload = (accessState) =>
    Object.entries(accessState)
      .filter(([, permissions]) => permissions?.access)
      .map(([id, permissions]) => ({
        page_id: Number(id),
        page_privilege: 1,
        can_create: permissions.can_create ? 1 : 0,
        can_edit: permissions.can_edit ? 1 : 0,
        can_delete: permissions.can_delete ? 1 : 0,
      }));

  const filterPagesForAccessModal = (pagesList, query) => {
    const words = query.trim().toLowerCase().split(" ").filter(Boolean);
    if (words.length === 0) return pagesList;

    return pagesList.filter((page) => {
      const searchableText = [
        page.id,
        page.page_description,
        page.page_group,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return words.every((word) => searchableText.includes(word));
    });
  };

  const filteredUsers = allUsers.filter((u) => {
    const q = searchQuery.toLowerCase();
    const fullName =
      `${u.first_name} ${u.middle_name || ""} ${u.last_name}`.toLowerCase();

    return (
      u.employee_id.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      fullName.includes(q)
    );
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  // Split the selected user's pages into "has access" / "no access" buckets
  const pagesWithAccess = pages.filter((p) => pageAccess[p.id]?.access);
  const pagesWithoutAccess = pages.filter((p) => !pageAccess[p.id]?.access);

  // Distinct menu-group labels available for the current user's pages, for the group filter dropdown
  const availablePageGroups = ACCESS_GROUP_ORDER.filter((label) =>
    pages.some((p) => PAGE_ID_TO_GROUP[p.id] === label),
  );

  // Group-filtered versions of the two buckets above - the same filter applies to whichever tab is active
  const matchesGroupFilter = (p) =>
    !pageGroupFilter || PAGE_ID_TO_GROUP[p.id] === pageGroupFilter;

  const filteredPagesWithAccess = pagesWithAccess.filter(matchesGroupFilter);
  const filteredPagesWithoutAccess = pagesWithoutAccess.filter(matchesGroupFilter);
  const bulkActionPages =
    accessTab === 0 ? filteredPagesWithAccess : filteredPagesWithoutAccess;

  const createPagesWithAccess = createPages.filter((p) => createPageAccess[p.id]?.access);
  const createPagesWithoutAccess = createPages.filter((p) => !createPageAccess[p.id]?.access);
  const availableCreatePageGroups = ACCESS_GROUP_ORDER.filter((label) =>
    createPages.some((p) => (PAGE_ID_TO_GROUP[p.id] || p.page_group) === label),
  );
  const matchesCreateGroupFilter = (p) =>
    !pageGroupFilter || (PAGE_ID_TO_GROUP[p.id] || p.page_group) === pageGroupFilter;
  const filteredCreatePagesWithAccess = filterPagesForAccessModal(
    createPagesWithAccess.filter(matchesCreateGroupFilter),
    createAccessSearch,
  );
  const filteredCreatePagesWithoutAccess = filterPagesForAccessModal(
    createPagesWithoutAccess.filter(matchesCreateGroupFilter),
    createAccessSearch,
  );
  const createBulkActionPages =
    accessTab === 0 ? filteredCreatePagesWithAccess : filteredCreatePagesWithoutAccess;
  const editPagesWithAccess = editPages.filter((p) => editPageAccess[p.id]?.access);
  const editPagesWithoutAccess = editPages.filter((p) => !editPageAccess[p.id]?.access);
  const availableEditPageGroups = ACCESS_GROUP_ORDER.filter((label) =>
    editPages.some((p) => (PAGE_ID_TO_GROUP[p.id] || p.page_group) === label),
  );
  const matchesEditGroupFilter = (p) =>
    !pageGroupFilter || (PAGE_ID_TO_GROUP[p.id] || p.page_group) === pageGroupFilter;
  const filteredEditPagesWithAccess = filterPagesForAccessModal(
    editPagesWithAccess.filter(matchesEditGroupFilter),
    editAccessSearch,
  );
  const filteredEditPagesWithoutAccess = filterPagesForAccessModal(
    editPagesWithoutAccess.filter(matchesEditGroupFilter),
    editAccessSearch,
  );
  const editBulkActionPages =
    accessTab === 0 ? filteredEditPagesWithAccess : filteredEditPagesWithoutAccess;
  const bulkActionScopeLabel = pageGroupFilter
    ? ` in ${pageGroupFilter}`
    : "";
  const getBulkScopePayload = (pageList) =>
    pageGroupFilter
      ? {
          pageIds: pageList.map((page) => page.id),
          pageGroup: pageGroupFilter,
        }
      : {};

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Update access privilege
  const executeToggleChange = async (targetPageId, hasAccessNow) => {
    if (!selectedUser) return;
    if (
      hasAccessNow &&
      Number(targetPageId) === USER_PAGE_ACCESS_PAGE_ID &&
      hasGuaranteedUserPageAccess(selectedUser.role)
    ) {
      setSnack({
        open: true,
        severity: "warning",
        message: "Superadmin and Technical users always keep User Page Access",
      });
      return;
    }
    if (hasAccessNow && !canDelete) {
      setSnack({
        open: true,
        severity: "error",
        message: "You do not have permission to revoke page access",
      });
      return;
    }
    if (!hasAccessNow && !canCreate) {
      setSnack({
        open: true,
        severity: "error",
        message: "You do not have permission to grant page access",
      });
      return;
    }

    const newState = !hasAccessNow;
    const previousState = pageAccess[targetPageId] || {
      access: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
    };

    setPageAccess((prev) => ({
      ...prev,
      [targetPageId]: {
        ...previousState,
        access: newState,
        can_create: false,
        can_edit: false,
        can_delete: false,
      },
    }));

    try {
      if (newState) {
        await axios.post(
          `${API_BASE_URL}/api/page_access/${selectedUser.employee_id}/${targetPageId}`,
          {},
          getAuditConfigForPage(),
        );
      } else {
        await axios.delete(
          `${API_BASE_URL}/api/page_access/${selectedUser.employee_id}/${targetPageId}`,
          getAuditConfigForPage(),
        );
      }

      setSnack({
        open: true,
        severity: "success",
        message: newState ? "Access granted" : "Access revoked",
      });
    } catch {
      setPageAccess((prev) => ({ ...prev, [targetPageId]: previousState }));
      setSnack({
        open: true,
        severity: "error",
        message: "Failed to update access",
      });
    }
  };

  const requestToggleChange = (targetPageId, hasAccessNow) => {
    if (!selectedUser) return;
    if (hasAccessNow && !canDelete) {
      setSnack({
        open: true,
        severity: "error",
        message: "You do not have permission to revoke page access",
      });
      return;
    }
    if (!hasAccessNow && !canCreate) {
      setSnack({
        open: true,
        severity: "error",
        message: "You do not have permission to grant page access",
      });
      return;
    }

    const isRevoke = hasAccessNow;
    if (
      isRevoke &&
      Number(targetPageId) === USER_PAGE_ACCESS_PAGE_ID &&
      hasGuaranteedUserPageAccess(selectedUser.role)
    ) {
      setSnack({
        open: true,
        severity: "warning",
        message: "Superadmin and Technical users always keep User Page Access",
      });
      return;
    }
    const employeeName = formatEmployeeName(selectedUser);
    const pageLabel = getPageLabel(targetPageId);

    confirmAccessChange({
      requiresConfirm: isRevoke,
      title: isRevoke ? "Revoke Page Access" : "Modify Page Access",
      message: isRevoke
        ? `Are you sure you want to revoke ${employeeName}'s access to ${pageLabel}?`
        : `Are you sure you want to grant ${employeeName} access to ${pageLabel}?`,
      onConfirm: () => executeToggleChange(targetPageId, hasAccessNow),
    });
  };

  const executePermissionToggle = async (targetPageId, permissionKey) => {
    if (!selectedUser) return;
    if (!canManageUserPermissions(permissionKey)) {
      setSnack({
        open: true,
        severity: "error",
        message: `You do not have permission to manage ${permissionLabels[permissionKey]} access`,
      });
      return;
    }

    const currentState = pageAccess[targetPageId] || {
      access: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
    };

    if (
      Number(targetPageId) === USER_PAGE_ACCESS_PAGE_ID &&
      hasGuaranteedUserPageAccess(selectedUser.role) &&
      currentState[permissionKey]
    ) {
      setSnack({
        open: true,
        severity: "warning",
        message: "Superadmin and Technical users always keep User Page Access permissions",
      });
      return;
    }

    const nextState = {
      ...currentState,
      access: true,
      [permissionKey]: !currentState[permissionKey],
    };

    setPageAccess((prev) => ({
      ...prev,
      [targetPageId]: nextState,
    }));

    try {
      await axios.put(
        `${API_BASE_URL}/api/page_access/${selectedUser.employee_id}/${targetPageId}`,
        {
          page_privilege: nextState.access ? 1 : 0,
          can_create: nextState.can_create ? 1 : 0,
          can_edit: nextState.can_edit ? 1 : 0,
          can_delete: nextState.can_delete ? 1 : 0,
        },
        getAuditConfigForPage(),
      );

      setSnack({
        open: true,
        severity: "success",
        message: "Page permissions updated",
      });
    } catch (err) {
      console.error(err);
      setPageAccess((prev) => ({
        ...prev,
        [targetPageId]: currentState,
      }));
      setSnack({
        open: true,
        severity: "error",
        message: "Failed to update page permissions",
      });
    }
  };

  const requestPermissionToggle = (targetPageId, permissionKey) => {
    if (!selectedUser) return;
    if (!canManageUserPermissions(permissionKey)) {
      setSnack({
        open: true,
        severity: "error",
        message: `You do not have permission to manage ${permissionLabels[permissionKey]} access`,
      });
      return;
    }

    const currentState = pageAccess[targetPageId] || createEmptyPermission(false);
    const isRevoke = Boolean(currentState[permissionKey]);
    const employeeName = formatEmployeeName(selectedUser);
    const pageLabel = getPageLabel(targetPageId);
    const actionLabel = permissionActionLabels[permissionKey];

    confirmAccessChange({
      requiresConfirm: false,
      title: isRevoke ? `Remove ${permissionLabels[permissionKey]} Access` : `Grant ${permissionLabels[permissionKey]} Access`,
      message: isRevoke
        ? `Are you sure you want to remove the capability of ${employeeName} to ${actionLabel} action on ${pageLabel}?`
        : `Are you sure you want to grant ${employeeName} the capability to ${actionLabel} action on ${pageLabel}?`,
      onConfirm: () => executePermissionToggle(targetPageId, permissionKey),
    });
  };

  const openCreateAccessModal = async () => {
    if (!canCreate) {
      setSnack({
        open: true,
        severity: "error",
        message: "You do not have permission to create access levels",
      });
      return;
    }

    try {
      const [pagesRes, accessRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/pages`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
        axios.get(`${API_BASE_URL}/api/access_table`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
      ]);

      const pagesData = (pagesRes.data || []).sort((a, b) => a.id - b.id);
      setAccessLevels(accessRes.data || []);

      const defaultAccess = buildAccessLevelPermissionState(pagesData);

      setCreatePages(pagesData);
      setCreatePageAccess(defaultAccess);
      setAccessDescription("");
      if (createDescriptionInputRef.current) {
        createDescriptionInputRef.current.value = "";
      }
      setCreateAccessSearch("");
      setAccessTab(1);
      setPageGroupFilter("");
      setOpenCreateModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const openEditAccessLevelModal = async () => {
    if (!canEdit) {
      setSnack({
        open: true,
        severity: "error",
        message: "You do not have permission to edit access levels",
      });
      return;
    }

    try {
      const [accessRes, pagesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/access_table`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
        axios.get(`${API_BASE_URL}/api/pages`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
      ]);

      const levels = accessRes.data || [];
      const pagesData = (pagesRes.data || []).sort((a, b) => a.id - b.id);

      const defaultAccess = buildAccessLevelPermissionState(pagesData);

      setAccessLevels(levels);
      setEditPages(pagesData);
      setEditPageAccess(defaultAccess);
      setEditAccessId("");
      setEditAccessDescription("");
      setEditAccessSearch("");
      setAccessTab(1);
      setPageGroupFilter("");
      setOpenEditAccessModal(true);
    } catch (err) {
      console.error(err);
      setSnack({
        open: true,
        severity: "error",
        message: "Failed to load access levels",
      });
    }
  };

  const handleCreateToggle = (pageId) => {
    setCreatePageAccess((prev) => ({
      ...prev,
      [pageId]: prev[pageId]?.access
        ? createEmptyPermission(false)
        : {
          ...(prev[pageId] || createEmptyPermission(false)),
          access: true,
        },
    }));
  };

  const handleCreatePermissionToggle = (pageId, permissionKey) => {
    setCreatePageAccess((prev) => {
      const current = prev[pageId] || createEmptyPermission(false);
      if (!current.access) return prev;

      return {
        ...prev,
        [pageId]: {
          ...current,
          [permissionKey]: !current[permissionKey],
        },
      };
    });
  };

  const handleCreateAssignAll = () => {
    const allAccess = {};
    createPages.forEach((p) => {
      allAccess[p.id] = createEmptyPermission(true);
    });
    setCreatePageAccess(allAccess);
  };

  const handleCreateBulkPermission = async (permissionKey, enabled) => {
    const targetPages = pageGroupFilter
      ? createBulkActionPages
      : createPages.filter((p) => createPageAccess[p.id]?.access);
    const affectedCount = targetPages.length;

    setCreatePageAccess((prev) =>
      setBulkPermissionState(targetPages, prev, permissionKey, enabled),
    );

    try {
      await axios.post(
        `${API_BASE_URL}/api/access-level/bulk-permission-audit`,
        {
          modal_context: "create_access",
          permission: permissionKey,
          enabled: enabled ? 1 : 0,
          access_description: getCreateAccessDescription(),
          affected_count: affectedCount,
        },
        getAuditConfigForPage(),
      );
    } catch (err) {
      console.error("Failed to insert create access bulk permission audit:", err);
    }
  };

  const handleSelectAccessLevel = (accessId) => {
    setEditAccessId(accessId);
    const selected = accessLevels.find(
      (level) => Number(level.access_id) === Number(accessId),
    );
    const selectedPages = parseAccessLevelPermissions(selected?.access_page);

    const nextAccess = buildAccessLevelPermissionState(editPages);
    const permissionByPage = selectedPages.reduce((acc, permission) => {
      acc[permission.page_id] = permission;
      return acc;
    }, {});

    editPages.forEach((p) => {
      if (permissionByPage[p.id]) {
        nextAccess[p.id] = {
          access: permissionByPage[p.id].access,
          can_create: permissionByPage[p.id].can_create,
          can_edit: permissionByPage[p.id].can_edit,
          can_delete: permissionByPage[p.id].can_delete,
        };
      }
    });

    setEditAccessDescription(selected?.access_description || "");
    setEditPageAccess(nextAccess);
  };

  const handleEditToggle = (pageId) => {
    setEditPageAccess((prev) => ({
      ...prev,
      [pageId]: prev[pageId]?.access
        ? createEmptyPermission(false)
        : {
          ...(prev[pageId] || createEmptyPermission(false)),
          access: true,
        },
    }));
  };

  const handleEditPermissionToggle = (pageId, permissionKey) => {
    setEditPageAccess((prev) => {
      const current = prev[pageId] || createEmptyPermission(false);
      if (!current.access) return prev;

      return {
        ...prev,
        [pageId]: {
          ...current,
          [permissionKey]: !current[permissionKey],
        },
      };
    });
  };

  const handleEditSelectAll = () => {
    const allAccess = {};
    editPages.forEach((p) => {
      allAccess[p.id] = createEmptyPermission(true);
    });
    setEditPageAccess(allAccess);
  };

  const handleEditClearAll = () => {
    const allAccess = {};
    editPages.forEach((p) => {
      allAccess[p.id] = createEmptyPermission(false);
    });
    setEditPageAccess(allAccess);
  };

  const handleEditBulkPermission = async (permissionKey, enabled) => {
    const targetPages = pageGroupFilter
      ? editBulkActionPages
      : editPages.filter((p) => editPageAccess[p.id]?.access);
    const affectedCount = targetPages.length;

    setEditPageAccess((prev) =>
      setBulkPermissionState(targetPages, prev, permissionKey, enabled),
    );

    try {
      await axios.post(
        `${API_BASE_URL}/api/access-level/bulk-permission-audit`,
        {
          modal_context: "edit_access_level",
          permission: permissionKey,
          enabled: enabled ? 1 : 0,
          access_id: editAccessId,
          access_description: editAccessDescription,
          affected_count: affectedCount,
        },
        getAuditConfigForPage(),
      );
    } catch (err) {
      console.error("Failed to insert edit access bulk permission audit:", err);
    }
  };

  const saveEditedAccess = async () => {
    if (!canEdit) {
      setSnack({
        open: true,
        severity: "error",
        message: "You do not have permission to edit access levels",
      });
      return;
    }

    if (!editAccessId) {
      setSnack({
        open: true,
        severity: "warning",
        message: "Please select an access level",
      });
      return;
    }

    if (!editAccessDescription.trim()) {
      setSnack({
        open: true,
        severity: "warning",
        message: "Description is required",
      });
      return;
    }

    try {
      const selectedPages = buildAccessLevelPayload(editPageAccess);

      await axios.put(`${API_BASE_URL}/api/access/${editAccessId}`, {
        access_description: editAccessDescription,
        access_page: selectedPages,
      }, getAuditConfigForPage());

      setAccessLevels((prev) =>
        prev.map((level) =>
          Number(level.access_id) === Number(editAccessId)
            ? {
              ...level,
              access_description: editAccessDescription,
              access_page: selectedPages,
            }
            : level,
        ),
      );

      setSnack({
        open: true,
        severity: "success",
        message: "Access level updated successfully",
      });

      setOpenEditAccessModal(false);
    } catch (err) {
      console.error(err);
      setSnack({
        open: true,
        severity: "error",
        message: "Failed to update access level",
      });
    }
  };

  const saveAccess = async () => {
    if (!canCreate) {
      setSnack({
        open: true,
        severity: "error",
        message: "You do not have permission to create access levels",
      });
      return;
    }

    try {
      const selectedPages = buildAccessLevelPayload(createPageAccess);

      const description = getCreateAccessDescription();
      if (!description.trim()) {
        setSnack({
          open: true,
          severity: "warning",
          message: "Description is required",
        });
        return;
      }

      await axios.post(`${API_BASE_URL}/api/access`, {
        access_description: description,
        access_page: selectedPages,
      }, getAuditConfigForPage());

      setSnack({
        open: true,
        severity: "success",
        message: "Access created successfully",
      });

      setOpenCreateModal(false);
    } catch (err) {
      console.error(err);
      setSnack({
        open: true,
        severity: "error",
        message: "Failed to create access",
      });
    }
  };

  const grantAllAccess = async () => {
    if (!selectedUser) return;
    if (!canCreate) {
      setSnack({
        open: true,
        severity: "error",
        message: "You do not have permission to grant page access",
      });
      return;
    }

    const targetPages = pageGroupFilter ? filteredPagesWithoutAccess : pages;
    if (pageGroupFilter && targetPages.length === 0) return;

    try {
      await axios.post(`${API_BASE_URL}/api/page_access/grant-all`, {
        userId: selectedUser.employee_id,
        ...getBulkScopePayload(targetPages),
      }, getAuditConfigForPage());

      if (pageGroupFilter) {
        setPageAccess((prev) => {
          const nextAccess = { ...prev };
          targetPages.forEach((p) => {
            nextAccess[p.id] = {
              access: true,
              can_create: false,
              can_edit: false,
              can_delete: false,
            };
          });
          return applyGuaranteedUserPageAccess(nextAccess, selectedUser.role);
        });
      } else {
        const newAccess = {};
        pages.forEach((p) => {
          newAccess[p.id] = {
            access: true,
            can_create: false,
            can_edit: false,
            can_delete: false,
          };
        });
        setPageAccess(applyGuaranteedUserPageAccess(newAccess, selectedUser.role));
      }

      setSnack({
        open: true,
        severity: "success",
        message: pageGroupFilter
          ? `Access granted${bulkActionScopeLabel}`
          : "All access granted",
      });
    } catch (err) {
      console.error(err);
      setSnack({
        open: true,
        severity: "error",
        message: "Failed to grant all access",
      });
    }
  };

  const revokeAllAccess = async () => {
    if (!selectedUser) return;
    if (!canDelete) {
      setSnack({
        open: true,
        severity: "error",
        message: "You do not have permission to revoke page access",
      });
      return;
    }

    const targetPages = pageGroupFilter ? filteredPagesWithAccess : pages;
    if (pageGroupFilter && targetPages.length === 0) return;

    try {
      await axios.post(`${API_BASE_URL}/api/page_access/revoke-all`, {
        userId: selectedUser.employee_id,
        ...getBulkScopePayload(targetPages),
      }, getAuditConfigForPage());

      if (pageGroupFilter) {
        setPageAccess((prev) => {
          const nextAccess = { ...prev };
          targetPages.forEach((p) => {
            nextAccess[p.id] = createEmptyPermission(false);
          });
          return applyGuaranteedUserPageAccess(nextAccess, selectedUser.role);
        });
      } else {
        const newAccess = {};
        pages.forEach((p) => {
          newAccess[p.id] = createEmptyPermission(false);
        });
        setPageAccess(applyGuaranteedUserPageAccess(newAccess, selectedUser.role));
      }

      setSnack({
        open: true,
        severity: "success",
        message: pageGroupFilter
          ? `Access removed${bulkActionScopeLabel}`
          : "All access removed",
      });
    } catch (err) {
      console.error(err);
      setSnack({
        open: true,
        severity: "error",
        message: "Failed to remove all access",
      });
    }
  };

  const requestRevokeAllAccess = () => {
    if (!selectedUser) return;
    if (!canDelete) {
      setSnack({
        open: true,
        severity: "error",
        message: "You do not have permission to revoke page access",
      });
      return;
    }

    const employeeName = formatEmployeeName(selectedUser);

    confirmAccessChange({
      requiresConfirm: true,
      title: pageGroupFilter ? "Revoke Group Page Access" : "Revoke All Page Access",
      message: pageGroupFilter
        ? `Are you sure you want to revoke ${employeeName}'s page access${bulkActionScopeLabel}?`
        : `Are you sure you want to revoke ALL of ${employeeName}'s page access?`,
      onConfirm: () => revokeAllAccess(),
    });
  };

  const handleUserBulkPermission = async (permissionKey, enabled) => {
    if (!selectedUser) return;
    if (!canManageUserPermissions(permissionKey)) {
      setSnack({
        open: true,
        severity: "error",
        message: `You do not have permission to manage ${permissionLabels[permissionKey]} access`,
      });
      return;
    }

    const targetPages = pageGroupFilter ? filteredPagesWithAccess : pages;
    if (pageGroupFilter && targetPages.length === 0) return;

    const previousAccess = pageAccess;
    const nextAccess = applyGuaranteedUserPageAccess(
      setBulkPermissionState(
        targetPages,
        pageAccess,
        permissionKey,
        enabled,
      ),
      selectedUser.role,
    );

    setPageAccess(nextAccess);

    try {
      await axios.put(
        `${API_BASE_URL}/api/page_access/${selectedUser.employee_id}/bulk-permission`,
        {
          permission: permissionKey,
          enabled: enabled ? 1 : 0,
          ...getBulkScopePayload(targetPages),
        },
        getAuditConfigForPage(),
      );

      setSnack({
        open: true,
        severity: "success",
        message: enabled
          ? `Granted ${permissionLabels[permissionKey]} on pages with access${bulkActionScopeLabel}`
          : `Closed ${permissionLabels[permissionKey]} on pages with access${bulkActionScopeLabel}`,
      });
    } catch (err) {
      console.error(err);
      setPageAccess(previousAccess);
      setSnack({
        open: true,
        severity: "error",
        message: `Failed to update ${permissionLabels[permissionKey]} permissions`,
      });
    }
  };

  const handleUserStatusToggle = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 1 ? 0 : 1;

    // Optimistic update
    setAllUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u)),
    );

    try {
      await axios.put(`${API_BASE_URL}/api/update_student_status/${userId}`, {
        status: nextStatus,
      }, getAuditConfigForPage());

      setSnack({
        open: true,
        severity: "success",
        message: `User status updated to ${nextStatus === 1 ? "Active" : "Inactive"}`,
      });
    } catch (err) {
      console.error(err);
      // Rollback on failure
      setAllUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, status: currentStatus } : u,
        ),
      );
      setSnack({
        open: true,
        severity: "error",
        message: "Failed to update user status",
      });
    }
  };

  if (hasAccess === null) {
    return <LoadingOverlay open message="Loading..." />;
  }

  if (hasAccess === false) return <Unauthorized />;

  // 🔒 Disable right-click
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  // 🔒 Block DevTools shortcuts + Ctrl+P silently
  document.addEventListener("keydown", (e) => {
    const isBlockedKey =
      e.key === "F12" ||
      e.key === "F11" ||
      (e.ctrlKey &&
        e.shiftKey &&
        (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j")) ||
      (e.ctrlKey && e.key.toLowerCase() === "u") ||
      (e.ctrlKey && e.key.toLowerCase() === "p");

    if (isBlockedKey) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  return (
    <Box
      sx={{
        height: "calc(100vh - 150px)",
        overflowY: "auto",
        paddingRight: 1,
        backgroundColor: "transparent",
        mt: 1,
        padding: 2,
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: "36px",
          }}
        >
          USER PAGE ACCESS
        </Typography>

        <TextField
          variant="outlined"
          placeholder="Search Employee ID / Name / Email / Role"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            width: 400,
            backgroundColor: "#fff",
            borderRadius: 1,
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
            },
          }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: "gray" }} />,
          }}
        />
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: "#6D2323", color: "white" }}>
            <TableRow>
              <TableCell
                colSpan={10}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor || "#1976d2",
                  color: "white",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  {/* Left: Total Count */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Admin's Records: {filteredUsers.length}
                  </Typography>

                  {/* Right: Pagination Controls */}
                  <Box display="flex" alignItems="center" gap={1}>
                    {/* First & Prev */}
                    <Button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        "&:hover": {
                          borderColor: "white",
                          backgroundColor: "rgba(255,255,255,0.1)",
                        },
                        "&.Mui-disabled": {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        },
                      }}
                    >
                      First
                    </Button>

                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        "&:hover": {
                          borderColor: "white",
                          backgroundColor: "rgba(255,255,255,0.1)",
                        },
                        "&.Mui-disabled": {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        },
                      }}
                    >
                      Prev
                    </Button>

                    {/* Page Dropdown */}
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                        displayEmpty
                        sx={{
                          fontSize: "12px",
                          height: 36,
                          color: "white",
                          border: "1px solid white",
                          backgroundColor: "transparent",
                          ".MuiOutlinedInput-notchedOutline": {
                            borderColor: "white",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "white",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "white",
                          },
                          "& svg": {
                            color: "white", // dropdown arrow icon color
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              backgroundColor: "#fff", // dropdown background
                            },
                          },
                        }}
                      >
                        {Array.from({ length: totalPages }, (_, i) => (
                          <MenuItem key={i + 1} value={i + 1}>
                            Page {i + 1}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Typography fontSize="11px" color="white">
                      of {totalPages} page{totalPages > 1 ? "s" : ""}
                    </Typography>

                    {/* Next & Last */}
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        "&:hover": {
                          borderColor: "white",
                          backgroundColor: "rgba(255,255,255,0.1)",
                        },
                        "&.Mui-disabled": {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        },
                      }}
                    >
                      Next
                    </Button>

                    <Button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        "&:hover": {
                          borderColor: "white",
                          backgroundColor: "rgba(255,255,255,0.1)",
                        },
                        "&.Mui-disabled": {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        },
                      }}
                    >
                      Last
                    </Button>
                    {canCreate && (
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={openCreateAccessModal}
                      >
                        Create Access
                      </Button>
                    )}
                    {canEdit && (
                      <Button
                        variant="contained"
                        color="info"
                        size="small"
                        onClick={openEditAccessLevelModal}
                      >
                        Edit Access Level
                      </Button>
                    )}
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>
      {/* USER LIST TABLE */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: "#F5F5F5" }}>
              <TableRow>
                <TableCell
                  sx={{
                    color: "black",
                    fontWeight: "bold",
                    border: `1px solid ${borderColor}`,
                    textAlign: "center",
                  }}
                >
                  Employee ID
                </TableCell>
                <TableCell
                  sx={{
                    color: "black",
                    fontWeight: "bold",
                    border: `1px solid ${borderColor}`,
                    textAlign: "center",
                  }}
                >
                  Name
                </TableCell>
                <TableCell
                  sx={{
                    color: "black",
                    fontWeight: "bold",
                    border: `1px solid ${borderColor}`,
                    textAlign: "center",
                  }}
                >
                  Email
                </TableCell>
                <TableCell
                  sx={{
                    color: "black",
                    fontWeight: "bold",
                    border: `1px solid ${borderColor}`,
                    textAlign: "center",
                  }}
                >
                  Role
                </TableCell>
                <TableCell
                  sx={{
                    color: "black",
                    fontWeight: "bold",
                    border: `1px solid ${borderColor}`,
                    textAlign: "center",
                  }}
                >
                  Access Level
                </TableCell>
                <TableCell
                  sx={{
                    color: "black",
                    fontWeight: "bold",
                    border: `1px solid ${borderColor}`,
                    textAlign: "center",
                  }}
                >
                  Status
                </TableCell>
                <TableCell
                  sx={{
                    color: "black",
                    fontWeight: "bold",
                    border: `1px solid ${borderColor}`,
                    textAlign: "center",
                  }}
                >
                  Action
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedUsers.map((u, i) => (

                <TableRow
                  key={u.id}
                  sx={{
                    backgroundColor: i % 2 === 0 ? "#ffffff" : "lightgray",
                  }}
                >
                  <TableCell
                    sx={{
                      color: "black",
                      border: `1px solid ${borderColor}`,
                      textAlign: "center",
                    }}
                  >
                    {u.employee_id}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "black",
                      border: `1px solid ${borderColor}`,
                      textAlign: "center",
                    }}
                  >{`${u.last_name}, ${u.first_name} ${u.middle_name || "."}`}</TableCell>
                  <TableCell
                    sx={{
                      color: "black",
                      border: `1px solid ${borderColor}`,
                      textAlign: "center",
                    }}
                  >
                    {u.email}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "black",
                      border: `1px solid ${borderColor}`,
                      textAlign: "center",
                    }}
                  >
                    {u.role}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "black",
                      border: `1px solid ${borderColor}`,
                      textAlign: "center",
                    }}
                  >
                    {u.access_description}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "black",
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                    }}
                    align="center"
                  >
                    <Switch
                      checked={Number(u.status) === 1}
                      onChange={() =>
                        handleUserStatusToggle(u.id, Number(u.status))
                      }
                      color="primary"
                      size="medium"
                    />
                  </TableCell>

                  <TableCell
                    sx={{
                      color: "black",
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      {(canCreate || canEdit || canDelete) && (
                        <Button
                          variant="contained"
                          onClick={() => loadUserAccess(u)}
                          sx={{
                            backgroundColor: "green",
                            color: "white",
                            borderRadius: "5px",
                            padding: "8px 14px",
                            width: "160px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px",
                          }}
                        >
                          <EditIcon fontSize="small" /> Edit Access
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: "#6D2323", color: "white" }}>
            <TableRow>
              <TableCell
                colSpan={10}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor || "#1976d2",
                  color: "white",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  {/* Left: Total Count */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Admin's Records: {filteredUsers.length}
                  </Typography>

                  {/* Right: Pagination Controls */}
                  <Box display="flex" alignItems="center" gap={1}>
                    {/* First & Prev */}
                    <Button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        "&:hover": {
                          borderColor: "white",
                          backgroundColor: "rgba(255,255,255,0.1)",
                        },
                        "&.Mui-disabled": {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        },
                      }}
                    >
                      First
                    </Button>

                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        "&:hover": {
                          borderColor: "white",
                          backgroundColor: "rgba(255,255,255,0.1)",
                        },
                        "&.Mui-disabled": {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        },
                      }}
                    >
                      Prev
                    </Button>

                    {/* Page Dropdown */}
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                        displayEmpty
                        sx={{
                          fontSize: "12px",
                          height: 36,
                          color: "white",
                          border: "1px solid white",
                          backgroundColor: "transparent",
                          ".MuiOutlinedInput-notchedOutline": {
                            borderColor: "white",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "white",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "white",
                          },
                          "& svg": {
                            color: "white", // dropdown arrow icon color
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              backgroundColor: "#fff", // dropdown background
                            },
                          },
                        }}
                      >
                        {Array.from({ length: totalPages }, (_, i) => (
                          <MenuItem key={i + 1} value={i + 1}>
                            Page {i + 1}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Typography fontSize="11px" color="white">
                      of {totalPages} page{totalPages > 1 ? "s" : ""}
                    </Typography>

                    {/* Next & Last */}
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        "&:hover": {
                          borderColor: "white",
                          backgroundColor: "rgba(255,255,255,0.1)",
                        },
                        "&.Mui-disabled": {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        },
                      }}
                    >
                      Next
                    </Button>

                    <Button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        "&:hover": {
                          borderColor: "white",
                          backgroundColor: "rgba(255,255,255,0.1)",
                        },
                        "&.Mui-disabled": {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        },
                      }}
                    >
                      Last
                    </Button>
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      {/* ==================== DIALOG 1: EDIT USER ACCESS ==================== */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            height: "80vh",
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: headerColor || "#1976d2",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: "bold",
            flexShrink: 0,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            🔐 Editing Access For: {selectedUser?.employee_id} |{" "}
            {`${selectedUser?.last_name}, ${selectedUser?.first_name} ${selectedUser?.middle_name || "."}`}
          </Box>
          <IconButton
            onClick={() => setOpenModal(false)}
            sx={{
              color: "white",
              border: "2px solid rgba(255,255,255,0.6)",
              borderRadius: "50%",
              width: 38,
              height: 38,
              padding: 0,
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.2)",
                border: "2px solid white",
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            flex: 1,
            minHeight: 0,
            p: 2,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* ─────────── TABS + GROUP FILTER (filter applies to whichever tab is active) ─────────── */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "250px minmax(0, 1fr) 180px" },
              gap: 2,
              alignItems: "stretch",
              flex: 1,
              minHeight: 0,
            }}
          >
            {accessModalLoading ? (
              <Box
                sx={{
                  gridColumn: "1 / -1",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1.5,
                }}
              >
                <CircularProgress size={36} sx={{ color: mainButtonColor }} />
                <Typography color="text.secondary">Loading page access…</Typography>
              </Box>
            ) : (
            <>
            <Paper variant="outlined" sx={{ p: 1, height: "100%", minHeight: 0, overflowY: "auto" }}>
              <Typography fontWeight={700} sx={{ px: 1, py: 1 }}>Filter by Group</Typography>
              <Button
                fullWidth
                size="small"
                onClick={() => setPageGroupFilter("")}
                variant={!pageGroupFilter ? "contained" : "text"}
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  mb: 0.5,
                  ...(!pageGroupFilter
                    ? {
                        backgroundColor: mainButtonColor,
                        color: "#fff",
                        "&:hover": { backgroundColor: mainButtonColor, opacity: 0.92 },
                      }
                    : {
                        color: mainButtonColor,
                        "&:hover": { backgroundColor: `${mainButtonColor}14` },
                      }),
                }}
              >
                All Groups
              </Button>
              {availablePageGroups.map((group) => (
                <Button
                  key={group}
                  fullWidth
                  size="small"
                  onClick={() => setPageGroupFilter(group)}
                  variant={pageGroupFilter === group ? "contained" : "text"}
                  sx={{
                    justifyContent: "flex-start",
                    textAlign: "left",
                    textTransform: "none",
                    mb: 0.5,
                    ...(pageGroupFilter === group
                      ? {
                          backgroundColor: mainButtonColor,
                          color: "#fff",
                          "&:hover": { backgroundColor: mainButtonColor, opacity: 0.92 },
                        }
                      : {
                          color: mainButtonColor,
                          "&:hover": { backgroundColor: `${mainButtonColor}14` },
                        }),
                  }}
                >
                  {group}
                </Button>
              ))}
            </Paper>

            <Box
              sx={{
                minWidth: 0,
                minHeight: 0,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={2}
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              mb: 2,
              flexShrink: 0,
              backgroundColor: "background.paper",
            }}
          >
            <Tabs
              value={accessTab}
              onChange={(e, newValue) => setAccessTab(newValue)}
              sx={{
                minHeight: 40,
                "& .MuiTab-root": { minHeight: 40, fontWeight: 600, textTransform: "none" },
                "& .Mui-selected": { color: `${mainButtonColor} !important` },
                "& .MuiTabs-indicator": { backgroundColor: mainButtonColor },
              }}
            >
              <Tab
                icon={<LockOpenIcon fontSize="small" />}
                iconPosition="start"
                label={`Pages With Access (${pagesWithAccess.length})`}
              />
              <Tab
                icon={<LockIcon fontSize="small" />}
                iconPosition="start"
                label={`Pages Without Access (${pagesWithoutAccess.length})`}
              />
            </Tabs>

          </Box>

          {/* ─────────── TAB PANEL: PAGES WITH ACCESS ─────────── */}
          {accessTab === 0 && (
            <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <Paper
                sx={{
                  border: `1px solid ${borderColor}`,
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <TableContainer sx={{ flex: 1, overflow: "auto" }}>
                  <Table
                    size="small"
                    stickyHeader
                    sx={{
                      "& .MuiTableCell-root": { py: "7px", px: 1, lineHeight: 1.2 },
                      "& .MuiTableCell-head": { py: 0.75 },
                      "& .MuiSwitch-root": { my: -0.75 },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        {["#", "Page Description", "Access", "CREATE", "EDIT", "DELETE"].map(
                          (header) => (
                            <TableCell
                              key={header}
                              sx={{
                                color: "white",
                                textAlign: "center",
                                fontWeight: "bold",
                                border: `1px solid ${borderColor}`,
                                backgroundColor: headerColor || "#1976d2",
                              }}
                            >
                              {header}
                            </TableCell>
                          ),
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredPagesWithAccess.map((p) => (
                        <TableRow
                          key={p.id}
                          sx={{
                            "&:hover": { backgroundColor: "#f5f5f5" },
                            transition: "background-color 0.2s",
                          }}
                        >
                          <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                            {p.id}
                          </TableCell>
                          <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                            {p.page_description}
                          </TableCell>    
                          <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                            <Switch
                              size="small"
                              checked={pageAccess[p.id]?.access || false}
                              onChange={() =>
                                requestToggleChange(p.id, pageAccess[p.id]?.access || false)
                              }
                              disabled={!canDelete}
                            />
                          </TableCell>
                          <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                            <Switch
                              size="small"
                              checked={pageAccess[p.id]?.can_create || false}
                              onChange={() => requestPermissionToggle(p.id, "can_create")}
                              disabled={!canManageUserPermissions("can_create")}
                            />
                          </TableCell>
                          <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                            <Switch
                              size="small"
                              checked={pageAccess[p.id]?.can_edit || false}
                              onChange={() => requestPermissionToggle(p.id, "can_edit")}
                              disabled={!canManageUserPermissions("can_edit")}
                            />
                          </TableCell>
                          <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                            <Switch
                              size="small"
                              checked={pageAccess[p.id]?.can_delete || false}
                              onChange={() => requestPermissionToggle(p.id, "can_delete")}
                              disabled={!canManageUserPermissions("can_delete")}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredPagesWithAccess.length === 0 && (
                        <TableRow>
                          <TableCell align="center" colSpan={7}>
                            {pagesWithAccess.length === 0
                              ? "No pages granted yet."
                              : "No pages match this filter."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          )}

          {/* ─────────── TAB PANEL: PAGES WITHOUT ACCESS ─────────── */}
          {accessTab === 1 && (
            <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <Paper
                sx={{
                  border: `1px solid ${borderColor}`,
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <TableContainer sx={{ flex: 1, overflow: "auto" }}>
                  <Table
                    size="small"
                    stickyHeader
                    sx={{
                      "& .MuiTableCell-root": { py: "7px", px: 1, lineHeight: 1.2 },
                      "& .MuiTableCell-head": { py: 0.75 },
                      "& .MuiSwitch-root": { my: -0.75 },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        {["#", "Page Description", "Access"].map((header) => (
                          <TableCell
                            key={header}
                            sx={{
                              color: "white",
                              textAlign: "center",
                              fontWeight: "bold",
                              border: `1px solid ${borderColor}`,
                              backgroundColor: "#9e9e9e",
                            }}
                          >
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredPagesWithoutAccess.map((p) => (
                        <TableRow
                          key={p.id}
                          sx={{
                            "&:hover": { backgroundColor: "#f5f5f5" },
                            transition: "background-color 0.2s",
                          }}
                        >
                          <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                            {p.id}
                          </TableCell>
                          <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                            {p.page_description}
                          </TableCell>
                          <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                            <Switch
                              size="small"
                              checked={pageAccess[p.id]?.access || false}
                              onChange={() =>
                                requestToggleChange(p.id, pageAccess[p.id]?.access || false)
                              }
                              disabled={!canCreate}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredPagesWithoutAccess.length === 0 && (
                        <TableRow>
                          <TableCell align="center" colSpan={4}>
                            {pagesWithoutAccess.length === 0
                              ? "All pages have been granted."
                              : "No pages match this filter."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          )}
            </Box>

            {/* RIGHT: bulk access actions */}
            <Paper variant="outlined" sx={{ p: 2, height: "100%", minHeight: 0, overflowY: "auto" }}>
              <Typography fontWeight={700} sx={{ mb: pageGroupFilter ? 0.25 : 1.5, fontSize: 15 }}>
                Access Actions
              </Typography>
              {pageGroupFilter && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  Applies to {pageGroupFilter} only
                </Typography>
              )}

              {accessTab === 0 ? (
                <Stack spacing={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="warning"
                    size="small"
                    startIcon={<LockIcon />}
                    onClick={requestRevokeAllAccess}
                    disabled={!canDelete || bulkActionPages.length === 0}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    Remove All Access
                  </Button>
                  {renderBulkPermissionToggles({
                    pagesList: bulkActionPages,
                    accessMap: pageAccess,
                    onToggle: handleUserBulkPermission,
                  })}
                </Stack>
              ) : (
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<LockOpenIcon />}
                  onClick={grantAllAccess}
                  disabled={!canCreate || bulkActionPages.length === 0}
                  sx={{ textTransform: "none", fontWeight: 600 }}
                >
                  Grant All Access
                </Button>
              )}
            </Paper>
            </>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, flexShrink: 0 }}>
          <Button
            color="error"
            variant="outlined"

            onClick={() => setOpenModal(false)}

          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>


      {/* ==================== DIALOG 2: CREATE NEW ACCESS ==================== */}
      <Dialog
        open={openCreateModal}
        onClose={() => { setOpenCreateModal(false); setCreateAccessSearch(""); }}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            height: "80vh",
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: headerColor || "#1976d2",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: "bold",
            flexShrink: 0,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            ➕ Create New Access
          </Box>
          <IconButton
            onClick={() => { setOpenCreateModal(false); setCreateAccessSearch(""); }}
            sx={{
              color: "white",
              border: "2px solid rgba(255,255,255,0.6)",
              borderRadius: "50%",
              width: 38,
              height: 38,
              padding: 0,
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.2)",
                border: "2px solid white",
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            flex: 1,
            minHeight: 0,
            p: 2,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "250px minmax(0, 1fr) 230px" },
              gap: 2,
              alignItems: "stretch",
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* LEFT: group filter */}
            <Paper variant="outlined" sx={{ p: 1, height: "100%", minHeight: 0, overflowY: "auto" }}>
              <Typography fontWeight={700} sx={{ px: 1, py: 1 }}>Filter by Group</Typography>
              <Button
                fullWidth
                size="small"
                onClick={() => setPageGroupFilter("")}
                variant={!pageGroupFilter ? "contained" : "text"}
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  mb: 0.5,
                  ...(!pageGroupFilter
                    ? { backgroundColor: mainButtonColor, color: "#fff", "&:hover": { backgroundColor: mainButtonColor, opacity: 0.92 } }
                    : { color: mainButtonColor, "&:hover": { backgroundColor: `${mainButtonColor}14` } }),
                }}
              >
                All Groups
              </Button>
              {availableCreatePageGroups.map((group) => (
                <Button
                  key={group}
                  fullWidth
                  size="small"
                  onClick={() => setPageGroupFilter(group)}
                  variant={pageGroupFilter === group ? "contained" : "text"}
                  sx={{
                    justifyContent: "flex-start",
                    textAlign: "left",
                    textTransform: "none",
                    mb: 0.5,
                    ...(pageGroupFilter === group
                      ? { backgroundColor: mainButtonColor, color: "#fff", "&:hover": { backgroundColor: mainButtonColor, opacity: 0.92 } }
                      : { color: mainButtonColor, "&:hover": { backgroundColor: `${mainButtonColor}14` } }),
                  }}
                >
                  {group}
                </Button>
              ))}
            </Paper>

            {/* CENTER: description, search, tabs, and page table */}
            <Box sx={{ minWidth: 0, minHeight: 0, height: "100%", boxSizing: "border-box", pt: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <TextField
                label="Description"
                fullWidth
                defaultValue={accessDescription}
                inputRef={createDescriptionInputRef}
                sx={{ mb: 1.5, flexShrink: 0 }}
              />

              <TextField
                fullWidth
                size="small"
                placeholder="Search Page Description / Group / ID"
                value={createAccessSearch}
                onChange={(e) => setCreateAccessSearch(e.target.value)}
                sx={{ mb: 1.5, flexShrink: 0 }}
                InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: "gray" }} /> }}
              />

              <Box
                sx={{
                  borderBottom: 1,
                  borderColor: "divider",
                  mb: 1.5,
                  flexShrink: 0,
                  backgroundColor: "background.paper",
                }}
              >
                <Tabs
                  value={accessTab}
                  onChange={(e, newValue) => setAccessTab(newValue)}
                  sx={{
                    minHeight: 40,
                    "& .MuiTab-root": { minHeight: 40, fontWeight: 600, textTransform: "none" },
                    "& .Mui-selected": { color: `${mainButtonColor} !important` },
                    "& .MuiTabs-indicator": { backgroundColor: mainButtonColor },
                  }}
                >
                  <Tab icon={<LockOpenIcon fontSize="small" />} iconPosition="start" label={`Pages With Access (${createPagesWithAccess.length})`} />
                  <Tab icon={<LockIcon fontSize="small" />} iconPosition="start" label={`Pages Without Access (${createPagesWithoutAccess.length})`} />
                </Tabs>
              </Box>

              <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <Paper sx={{ border: `1px solid ${borderColor}`, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <TableContainer sx={{ flex: 1, overflow: "auto" }}>
                    <Table size="small" stickyHeader sx={{ "& .MuiTableCell-root": { py: "7px", px: 1, lineHeight: 1.2 }, "& .MuiTableCell-head": { py: 0.75 }, "& .MuiSwitch-root": { my: -0.75 } }}>
                      <TableHead>
                        <TableRow>
                          {(accessTab === 0
                            ? ["#", "Page Description", "Page Group", "Access", "CREATE", "EDIT", "DELETE"]
                            : ["#", "Page Description", "Page Group", "Access"]
                          ).map((header) => (
                            <TableCell
                              key={header}
                              sx={{ color: "white", textAlign: "center", fontWeight: "bold", border: `1px solid ${borderColor}`, backgroundColor: accessTab === 0 ? headerColor || "#1976d2" : "#9e9e9e" }}
                            >
                              {header}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(accessTab === 0 ? filteredCreatePagesWithAccess : filteredCreatePagesWithoutAccess).map((p) => (
                          <TableRow key={p.id} sx={{ "&:hover": { backgroundColor: "#f5f5f5" }, transition: "background-color 0.2s" }}>
                            <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>{p.id}</TableCell>
                            <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>{p.page_description}</TableCell>
                            <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>{p.page_group}</TableCell>
                            <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                              <Switch checked={createPageAccess[p.id]?.access || false} onChange={() => handleCreateToggle(p.id)} />
                            </TableCell>
                            {accessTab === 0 && ["can_create", "can_edit", "can_delete"].map((permissionKey) => (
                              <TableCell key={permissionKey} sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                                <Switch checked={createPageAccess[p.id]?.[permissionKey] || false} onChange={() => handleCreatePermissionToggle(p.id, permissionKey)} />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                        {createBulkActionPages.length === 0 && (
                          <TableRow>
                            <TableCell align="center" colSpan={accessTab === 0 ? 7 : 4}>No pages found.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Box>
            </Box>

            {/* RIGHT: bulk access actions */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", minHeight: 0 }}>
            <Paper variant="outlined" sx={{ p: 2, flexShrink: 0 }}>
              <Typography fontWeight={700} sx={{ mb: pageGroupFilter ? 0.25 : 1.5, fontSize: 15 }}>Access Actions</Typography>
              {pageGroupFilter && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  Applies to {pageGroupFilter} only
                </Typography>
              )}
              <Stack spacing={2}>
                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleCreateAssignAll}
                  disabled={createPages.length === 0}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    width: "200px",
                    backgroundColor: mainButtonColor,
                    "&:hover": {
                      backgroundColor: mainButtonColor,
                      opacity: 0.92,
                    },
                  }}
                >
                  Assign All Access
                </Button>
                {accessTab === 0 && renderBulkPermissionToggles({
                  pagesList: createBulkActionPages,
                  accessMap: createPageAccess,
                  onToggle: handleCreateBulkPermission,
                  requireManagePermission: false,
                  toggleWidth: 102,
                })}
              </Stack>
            </Paper>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
              }}
            >
              <Typography fontWeight={700} sx={{ mb: 1.25, fontSize: 15 }}>
                Existing Access Levels ({accessLevels.length})
              </Typography>
              <Stack spacing={0.75}>
                {accessLevels.length > 0 ? (
                  accessLevels.map((access) => (
                    <Box
                      key={access.access_id}
                      sx={{
                        px: 1,
                        py: 0.9,
                        border: `1px solid ${borderColor}`,
                        borderRadius: 1,
                        backgroundColor: "background.paper",
                      }}
                    >
                      <Typography variant="body2" sx={{ lineHeight: 1.35 }}>
                        {access.access_description || `Access Level ${access.access_id}`}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No existing access levels found.
                  </Typography>
                )}
              </Stack>
            </Paper>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            color="error"
            variant="outlined"

            onClick={() => { setOpenCreateModal(false); setCreateAccessSearch(""); }}

          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveAccess}
            sx={{ px: 4, fontWeight: 600, textTransform: "none", borderRadius: 2 }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>


      {/* ==================== DIALOG 3: EDIT ACCESS LEVEL ==================== */}
      <Dialog
        open={openEditAccessModal}
        onClose={() => { setOpenEditAccessModal(false); setEditAccessSearch(""); }}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            height: "80vh",
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: headerColor || "#1976d2",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: "bold",
            flexShrink: 0,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            ✏️ Edit Access Level
          </Box>
          <IconButton
            onClick={() => { setOpenEditAccessModal(false); setEditAccessSearch(""); }}
            sx={{
              color: "white",
              border: "2px solid rgba(255,255,255,0.6)",
              borderRadius: "50%",
              width: 38,
              height: 38,
              padding: 0,
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.2)",
                border: "2px solid white",
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ flex: 1, minHeight: 0, p: 2, display: "flex", overflow: "hidden" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "250px minmax(0, 1fr) 230px" }, gap: 2, width: "100%", minHeight: 0 }}>
            <Paper variant="outlined" sx={{ p: 1, height: "100%", minHeight: 0, overflowY: "auto" }}>
              <Typography fontWeight={700} sx={{ px: 1, py: 1 }}>Filter by Group</Typography>
              <Button fullWidth size="small" onClick={() => setPageGroupFilter("")} variant={!pageGroupFilter ? "contained" : "text"} sx={{ justifyContent: "flex-start", textTransform: "none", mb: 0.5, ...(!pageGroupFilter ? { backgroundColor: mainButtonColor, color: "#fff" } : { color: mainButtonColor }) }}>
                All Groups
              </Button>
              {availableEditPageGroups.map((group) => (
                <Button key={group} fullWidth size="small" onClick={() => setPageGroupFilter(group)} variant={pageGroupFilter === group ? "contained" : "text"} sx={{ justifyContent: "flex-start", textAlign: "left", textTransform: "none", mb: 0.5, ...(pageGroupFilter === group ? { backgroundColor: mainButtonColor, color: "#fff" } : { color: mainButtonColor }) }}>
                  {group}
                </Button>
              ))}
            </Paper>

            <Box sx={{ minWidth: 0, minHeight: 0, height: "100%", boxSizing: "border-box", pt: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <TextField label="Description" fullWidth value={editAccessDescription} onChange={(e) => setEditAccessDescription(e.target.value)} disabled={!editAccessId} sx={{ mb: 1.5, flexShrink: 0 }} />
              <TextField fullWidth size="small" placeholder="Search Page Description / Group / ID" value={editAccessSearch} onChange={(e) => setEditAccessSearch(e.target.value)} disabled={!editAccessId} sx={{ mb: 1.5, flexShrink: 0 }} InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: "gray" }} /> }} />
              <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 1.5, flexShrink: 0 }}>
                <Tabs value={accessTab} onChange={(e, newValue) => setAccessTab(newValue)} sx={{ minHeight: 40, "& .MuiTab-root": { minHeight: 40, fontWeight: 600, textTransform: "none" }, "& .Mui-selected": { color: `${mainButtonColor} !important` }, "& .MuiTabs-indicator": { backgroundColor: mainButtonColor } }}>
                  <Tab icon={<LockOpenIcon fontSize="small" />} iconPosition="start" label={`Pages With Access (${editPagesWithAccess.length})`} />
                  <Tab icon={<LockIcon fontSize="small" />} iconPosition="start" label={`Pages Without Access (${editPagesWithoutAccess.length})`} />
                </Tabs>
              </Box>
              <Paper sx={{ border: `1px solid ${borderColor}`, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <TableContainer sx={{ flex: 1, overflow: "auto" }}>
                  <Table size="small" stickyHeader sx={{ "& .MuiTableCell-root": { py: "7px", px: 1, lineHeight: 1.2 }, "& .MuiTableCell-head": { py: 0.75 }, "& .MuiSwitch-root": { my: -0.75 } }}>
                    <TableHead>
                      <TableRow>
                        {(accessTab === 0 ? ["#", "Page Description", "Page Group", "Access", "CREATE", "EDIT", "DELETE"] : ["#", "Page Description", "Page Group", "Access"]).map((header) => (
                          <TableCell key={header} sx={{ color: "white", textAlign: "center", fontWeight: "bold", border: `1px solid ${borderColor}`, backgroundColor: accessTab === 0 ? headerColor || "#1976d2" : "#9e9e9e" }}>{header}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(accessTab === 0 ? filteredEditPagesWithAccess : filteredEditPagesWithoutAccess).map((p) => (
                        <TableRow key={p.id} sx={{ "&:hover": { backgroundColor: "#f5f5f5" } }}>
                          <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>{p.id}</TableCell>
                          <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>{p.page_description}</TableCell>
                          <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>{p.page_group}</TableCell>
                          <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}><Switch checked={editPageAccess[p.id]?.access || false} onChange={() => handleEditToggle(p.id)} disabled={!editAccessId} /></TableCell>
                          {accessTab === 0 && ["can_create", "can_edit", "can_delete"].map((permissionKey) => (
                            <TableCell key={permissionKey} sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}><Switch checked={editPageAccess[p.id]?.[permissionKey] || false} onChange={() => handleEditPermissionToggle(p.id, permissionKey)} disabled={!editAccessId || !editPageAccess[p.id]?.access} /></TableCell>
                          ))}
                        </TableRow>
                      ))}
                      {editBulkActionPages.length === 0 && <TableRow><TableCell align="center" colSpan={accessTab === 0 ? 7 : 4}>No pages found.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, height: "100%", minHeight: 0 }}>
              <Paper variant="outlined" sx={{ p: 2, flexShrink: 0 }}>
                <Typography fontWeight={700} sx={{ mb: 1.25, fontSize: 15 }}>Access Actions</Typography>
                <Stack spacing={1}>
                  <Button fullWidth variant="contained" color="success" size="small" startIcon={<LockOpenIcon />} onClick={handleEditSelectAll} disabled={!editAccessId} sx={{ textTransform: "none", fontWeight: 600 }}>Select All</Button>
                  <Button fullWidth variant="contained" color="warning" size="small" startIcon={<LockIcon />} onClick={handleEditClearAll} disabled={!editAccessId} sx={{ textTransform: "none", fontWeight: 600 }}>Clear All</Button>
                  {accessTab === 0 && renderBulkPermissionToggles({ pagesList: editBulkActionPages, accessMap: editPageAccess, onToggle: handleEditBulkPermission, disabled: !editAccessId, requireManagePermission: false })}
                </Stack>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2, flex: 1, minHeight: 0, overflowY: "auto" }}>
                <Typography fontWeight={700} sx={{ mb: 1.25, fontSize: 15 }}>Existing Access Levels ({accessLevels.length})</Typography>
                <Stack spacing={0.75}>
                  {accessLevels.length > 0 ? accessLevels.map((access) => (
                    <Button key={access.access_id} fullWidth onClick={() => handleSelectAccessLevel(access.access_id)} sx={{ justifyContent: "flex-start", textAlign: "left", textTransform: "none", px: 1, py: 0.9, border: `1px solid ${borderColor}`, borderRadius: 1, color: titleColor || "#111", backgroundColor: Number(editAccessId) === Number(access.access_id) ? `${mainButtonColor}18` : "background.paper", borderColor: Number(editAccessId) === Number(access.access_id) ? mainButtonColor : borderColor }}>
                      {access.access_description || `Access Level ${access.access_id}`}
                    </Button>
                  )) : <Typography variant="body2" color="text.secondary">No existing access levels found.</Typography>}
                </Stack>
              </Paper>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            color="error"
            variant="outlined"

            onClick={() => { setOpenEditAccessModal(false); setEditAccessSearch(""); }}

          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveEditedAccess}
            sx={{ px: 4, fontWeight: 600, textTransform: "none", }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={accessConfirmDialog.open}
        onClose={closeAccessConfirm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon color="warning" />
          {accessConfirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <Typography>{accessConfirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="error"
            variant="outlined"
            onClick={closeAccessConfirm}>
            Cancel
          </Button>
          <Button
            color="warning"
            variant="contained"
            onClick={() => accessConfirmDialog.onConfirm?.()}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={handleCloseSnack}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={handleCloseSnack}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserPageAccess;
