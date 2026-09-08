import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box, Typography, Switch, Button, Chip, Collapse, IconButton,
  Snackbar, Alert, Tooltip, Paper, Divider, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import LockIcon from "@mui/icons-material/Lock";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SaveIcon from "@mui/icons-material/Save";
import RestoreIcon from "@mui/icons-material/Restore";
import SecurityIcon from "@mui/icons-material/Security";
import GavelIcon from "@mui/icons-material/Gavel";
import DescriptionIcon from "@mui/icons-material/Description";
import API_BASE_URL from "../apiConfig";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import { getAuditConfig } from "../utils/auditEvents";
import useAccountAuditMac from "./useAccountAuditMac";

// ─────────────────────────────────────────────────────────────────────────────
// FIELD DEFINITIONS FOR DASHBOARD 5 (Other Information)
//
//   system: true  → always read-only — these are legal/privacy policy text
//                   blocks that only the institution controls; students cannot
//                   and should never be able to edit them.
//   system: false → admin can allow or lock student editing
//   defaultOn     → initial state when no config is saved yet
//
// The only student-facing interactive element in Step 5 is the
// "Terms of Agreement" checkbox. Everything else is static legal copy.
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: "consent_form",
    title: "Data Subject Consent Form (Legal Text — System Locked)",
    icon: <DescriptionIcon />,
    fields: [
      {
        id: "dataPrivacyText",
        label: "Data Privacy Act consent statement (RA 10173)",
        system: true,
        defaultOn: false,
      },
      {
        id: "certificationText",
        label: "Student certification & accuracy statement",
        system: true,
        defaultOn: false,
      },
    ],
  },
  {
    id: "terms_agreement",
    title: "Terms of Agreement",
    icon: <GavelIcon />,
    fields: [
      {
        id: "termsOfAgreement",
        label: "I agree to Terms of Agreement (checkbox)",
        system: false,
        defaultOn: true,
      },
    ],
  },
];

// ─── helpers ─────────────────────────────────────────────────────────────────
const buildDefaultState = () => {
  const s = {};
  SECTIONS.forEach((sec) =>
    sec.fields.forEach((f) => {
      if (!f.system) s[f.id] = f.defaultOn;
    })
  );
  return s;
};

// ─────────────────────────────────────────────────────────────────────────────
const StudentEditPermissions5 = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  useAccountAuditMac();

  const [mainButtonColor, setMainButtonColor] = useState("#6D2323");
  const [borderColor, setBorderColor] = useState("#000");
  const [titleColor, setTitleColor] = useState("#000");

  const [permissions, setPermissions] = useState(buildDefaultState());
  const [expandedSections, setExpandedSections] = useState(
    SECTIONS.reduce((acc, s) => ({ ...acc, [s.id]: true }), {})
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasAccess, setHasAccess] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Uses the same shared /api/student_edit_permissions endpoint as all other
  // permission panels — all dashboard field locks live in one store.
  const pageId = 159; // unique page_id for Other Information permissions

  const getAuditConfigForPage = () =>
    getAuditConfig({
      "x-employee-id":
        localStorage.getItem("employee_id") ||
        localStorage.getItem("email") ||
        "unknown",
      "x-page-id": pageId,
      "x-audit-actor-id":
        localStorage.getItem("employee_id") ||
        localStorage.getItem("email") ||
        "unknown",
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
      "x-audit-change-section": "Other Information",
    });

  // ── Load theme settings ───────────────────────────────────────────────────
  useEffect(() => {
    if (!settings) return;
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.border) setBorderColor(colors.border);
    if (colors.title) setTitleColor(colors.title);
  }, [settings]);

  // ── Auth + access check ───────────────────────────────────────────────────
  useEffect(() => {
    const role = localStorage.getItem("role");
    const employeeId = localStorage.getItem("employee_id");
    if (!role || !employeeId) { window.location.href = "/login"; return; }
    setUserRole(role);
    const allowed = ["registrar", "superadmin"];
    if (!allowed.includes(role)) { window.location.href = "/login"; return; }
    checkAccess(employeeId);
    fetchPermissions();
  }, []);

  const checkAccess = async (employeeId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/page_access/${employeeId}/${pageId}`);
      setHasAccess(res.data?.page_privilege === 1);
    } catch {
      setHasAccess(false);
    }
  };

  // ── Fetch saved permissions ───────────────────────────────────────────────
  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student_edit_permissions`);
      if (res.data && typeof res.data === "object") {
        const pageFieldIds = new Set(
          SECTIONS.flatMap((sec) =>
            sec.fields.filter((field) => !field.system).map((field) => field.id),
          ),
        );
        const next = buildDefaultState();
        Object.entries(res.data).forEach(([fieldId, value]) => {
          if (!pageFieldIds.has(fieldId)) return;
          next[fieldId] = value === true || value === 1 || value === "1";
        });
        setPermissions(next);
      }
    } catch (err) {
      console.warn("Could not fetch permissions (using defaults):", err.message);
    } finally {
      setLoading(false);
    }
  };

  const buildSectionPayload = (sourcePermissions) => {
    const payload = {};
    const field_labels = {};
    const field_sections = {};
    SECTIONS.forEach((sec) => {
      sec.fields
        .filter((field) => !field.system)
        .forEach((field) => {
          payload[field.id] = Boolean(sourcePermissions[field.id]);
          field_labels[field.id] = field.label;
          field_sections[field.id] = sec.title;
        });
    });
    return { permissions: payload, field_labels, field_sections };
  };

  const persistPermissions = async (sourcePermissions, options = {}) => {
    await axios.post(
      `${API_BASE_URL}/api/student_edit_permissions`,
      {
        ...buildSectionPayload(sourcePermissions),
        ...(options.isReset ? { reset_to_defaults: true } : {}),
      },
      getAuditConfigForPage(),
    );
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await persistPermissions(permissions);
      setSnackbar({
        open: true,
        message: "Other Information permissions saved successfully!",
        severity: "success",
      });
    } catch (err) {
      console.error("Save failed:", err);
      setSnackbar({
        open: true,
        message: "Failed to save permissions. Please try again.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = async () => {
    setResetConfirmOpen(false);
    // Locked/off is the intended "safe default" for student-editable fields.
    const lockedDefaults = {};
    SECTIONS.forEach((sec) =>
      sec.fields.forEach((field) => {
        if (!field.system) lockedDefaults[field.id] = false;
      }),
    );
    setPermissions(lockedDefaults);
    setSaving(true);
    try {
      await persistPermissions(lockedDefaults, { isReset: true });
      setSnackbar({
        open: true,
        message: "All fields reset to Locked and saved.",
        severity: "success",
      });
    } catch (err) {
      console.error("Reset save failed:", err);
      setSnackbar({
        open: true,
        message: "Defaults applied on screen, but saving failed. Please click Save.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Per-field toggle ──────────────────────────────────────────────────────
  const handleToggle = (fieldId, checked) => {
    setPermissions((prev) => ({ ...prev, [fieldId]: checked }));
  };

  // ── Section-level toggle all ──────────────────────────────────────────────
  const handleToggleSection = (secId, checked) => {
    const sec = SECTIONS.find((s) => s.id === secId);
    const updates = {};
    sec.fields.filter((f) => !f.system).forEach((f) => { updates[f.id] = checked; });
    setPermissions((prev) => ({ ...prev, ...updates }));
  };

  // ── Expand / collapse ─────────────────────────────────────────────────────
  const toggleExpand = (secId) => {
    setExpandedSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  // ── Section badge ─────────────────────────────────────────────────────────
  const getSectionBadge = (sec) => {
    const editable = sec.fields.filter((f) => !f.system);
    if (editable.length === 0) return null;
    const onCount = editable.filter((f) => permissions[f.id]).length;
    if (onCount === editable.length) return { label: "All editable", color: "success" };
    if (onCount === 0) return { label: "All locked", color: "error" };
    return { label: `${onCount}/${editable.length} editable`, color: "warning" };
  };

  // ── Global stats ──────────────────────────────────────────────────────────
  const allFields = SECTIONS.flatMap((s) => s.fields);
  const systemCount = allFields.filter((f) => f.system).length;
  const editableAll = allFields.filter((f) => !f.system);
  const enabledCount = editableAll.filter((f) => permissions[f.id]).length;
  const lockedCount = editableAll.length - enabledCount;

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading || hasAccess === null) return <LoadingOverlay open message="Loading permissions..." />;
  if (!hasAccess) return <Unauthorized />;

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
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", p: 2, backgroundColor: "transparent" }}>

      {/* ── Page Header ── */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 2 }}>
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: "bold", color: titleColor, fontSize: "30px", display: "flex", alignItems: "center", gap: 1 }}
          >
            <SecurityIcon sx={{ fontSize: 32 }} />
            STUDENT EDIT PERMISSIONS — OTHER INFORMATION
          </Typography>
          <Typography variant="body2" sx={{ color: "#666", mt: 0.5 }}>
            Control which fields students can modify in their{" "}
            <strong>Other Information</strong> form (Step 5). Toggle a field
            OFF to make it read-only for students; the admin can still edit it at
            any time.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RestoreIcon />}
            onClick={() => setResetConfirmOpen(true)}
            disabled={saving}
            sx={{ borderColor, color: mainButtonColor, "&:hover": { backgroundColor: "#f5f5f5", borderColor } }}
          >
            Reset Defaults
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />


      {/* ── Global Stats Bar ── */}
      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 3, display: "flex", gap: 3, flexWrap: "wrap", backgroundColor: "#fffaf5", borderColor: "#ddd" }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <EditIcon sx={{ color: "#2e7d32", fontSize: 18 }} />
          <Typography variant="body2">
            <strong style={{ color: "#2e7d32" }}>{enabledCount}</strong> fields editable by student
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LockIcon sx={{ color: "#c62828", fontSize: 18 }} />
          <Typography variant="body2">
            <strong style={{ color: "#c62828" }}>{lockedCount}</strong> fields locked by admin
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LockIcon sx={{ color: "#888", fontSize: 18 }} />
          <Typography variant="body2">
            <strong style={{ color: "#888" }}>{systemCount}</strong> system-locked (always read-only)
          </Typography>
        </Box>
        <Box sx={{ ml: "auto", display: "flex", alignItems: "center" }}>
          <InfoIcon sx={{ color: mainButtonColor, mr: 1 }} />
          <Typography variant="body2" sx={{ color: mainButtonColor, fontWeight: "bold" }}>
            Step 5 — Other Information
          </Typography>
        </Box>
      </Paper>

      {/* ── Sections ── */}
      {SECTIONS.map((sec) => {
        const badge = getSectionBadge(sec);
        const isOpen = expandedSections[sec.id];
        const editable = sec.fields.filter((f) => !f.system);
        const allOn = editable.length > 0 && editable.every((f) => permissions[f.id]);

        return (
          <Paper key={sec.id} variant="outlined" sx={{ mb: 2, borderColor, borderRadius: 2, overflow: "hidden" }}>

            {/* Section Header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: "12px 18px",
                backgroundColor: headerColor || mainButtonColor,
                color: "#fff",
                cursor: "pointer",
              }}
              onClick={() => toggleExpand(sec.id)}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {sec.icon}
                <Typography sx={{ fontWeight: "bold", fontSize: 16 }}>{sec.title}</Typography>
                {badge && (
                  <Chip
                    label={badge.label}
                    size="small"
                    color={badge.color}
                    sx={{ fontWeight: "bold", fontSize: 11 }}
                  />
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }} onClick={(e) => e.stopPropagation()}>
                {editable.length > 0 && (
                  <Tooltip title={allOn ? "Lock all fields in this section" : "Unlock all fields in this section"}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>Toggle all</Typography>
                      <Switch
                        size="small"
                        checked={allOn}
                        onChange={(e) => handleToggleSection(sec.id, e.target.checked)}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": { color: "#fff" },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "rgba(255,255,255,0.5)" },
                        }}
                      />
                    </Box>
                  </Tooltip>
                )}
                <IconButton size="small" sx={{ color: "#fff" }}>
                  {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
            </Box>

            {/* Section Body */}
            <Collapse in={isOpen}>
              <Box>
                {sec.fields.map((field, idx) => (
                  <Box
                    key={field.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: "10px 18px",
                      backgroundColor: idx % 2 === 0 ? "#fff" : "#fafafa",
                      borderTop: idx === 0 ? "none" : "1px solid #f0f0f0",
                    }}
                  >
                    {/* Field label */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {field.system
                        ? <LockIcon sx={{ fontSize: 16, color: "#bbb" }} />
                        : <EditIcon sx={{ fontSize: 16, color: permissions[field.id] ? "#2e7d32" : "#c62828" }} />
                      }
                      <Typography sx={{ fontSize: 14, color: field.system ? "#999" : "#333" }}>
                        {field.label}
                      </Typography>
                    </Box>

                    {/* Right side: system badge OR toggle */}
                    {field.system ? (
                      <Chip
                        icon={<LockIcon style={{ fontSize: 13 }} />}
                        label="System-locked"
                        size="small"
                        sx={{ fontSize: 11, backgroundColor: "#f5f5f5", color: "#999", border: "1px solid #e0e0e0" }}
                      />
                    ) : (
                      <Tooltip
                        title={
                          permissions[field.id]
                            ? "Click to prevent student from changing their agreement"
                            : "Click to allow student to change their agreement"
                        }
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography
                            sx={{
                              fontSize: 12,
                              color: permissions[field.id] ? "#2e7d32" : "#c62828",
                              fontWeight: "bold",
                              minWidth: 55,
                              textAlign: "right",
                            }}
                          >
                            {permissions[field.id] ? "Editable" : "Locked"}
                          </Typography>
                          <Switch
                            size="small"
                            checked={!!permissions[field.id]}
                            onChange={(e) => handleToggle(field.id, e.target.checked)}
                            sx={{
                              "& .MuiSwitch-switchBase.Mui-checked": { color: "#2e7d32" },
                              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#a5d6a7" },
                              "& .MuiSwitch-switchBase": { color: "#c62828" },
                              "& .MuiSwitch-track": { backgroundColor: "#ef9a9a" },
                            }}
                          />
                        </Box>
                      </Tooltip>
                    )}
                  </Box>
                ))}
              </Box>
            </Collapse>
          </Paper>
        );
      })}

      {/* ── Reset confirmation ── */}
      <Dialog
        open={resetConfirmOpen}
        onClose={() => !saving && setResetConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: mainButtonColor, fontWeight: "bold" }}>
          Reset to Defaults?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will lock all student-editable fields on this page and save
            immediately. Do you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setResetConfirmOpen(false)}
            disabled={saving}
            sx={{ color: "#666" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleReset}
            disabled={saving}
            sx={{ backgroundColor: mainButtonColor, "&:hover": { backgroundColor: mainButtonColor } }}
          >
            {saving ? "Resetting…" : "Yes, Reset"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentEditPermissions5;
