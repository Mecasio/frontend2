import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Button,
  TextField,
  Input,
  InputLabel,
  Typography,
  Paper,
  Divider,
  Snackbar,
  Alert,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  Stack,
  Chip,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import SchoolIcon from "@mui/icons-material/School";
import PaletteIcon from "@mui/icons-material/Palette";
import ImageIcon from "@mui/icons-material/Image";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import SaveIcon from "@mui/icons-material/Save";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import { getStoredUserMacAddress } from "../utils/userMacAddress";

// ─── Static design tokens (non-dynamic values only) ───────────────────────────
const C = {
  gold: "#c9a84c",
  goldLight: "#e4c46a",
  goldPale: "#fdf6e3",
  cream: "#fafaf7",
  textMain: "#1a1a2e",
  textMuted: "#6b6b80",
  white: "#ffffff",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, headerColor }) {
  return (
    <Box
      sx={{
        backgroundColor: headerColor,
        px: 3,
        py: 1.75,
        display: "flex",
        alignItems: "center",
        gap: 1.25,
      }}
    >
      <Box
        sx={{
          color: C.white,
          display: "flex",
          alignItems: "center",
          opacity: 0.9,
        }}
      >
        {icon}
      </Box>
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: "0.97rem",
          color: C.white,
          letterSpacing: "0.02em",
        }}
      >
        {title}
      </Typography>
    </Box>
  );
}

function LabeledField({
  label,
  value,
  onChange,
  multiline,
  rows,
  borderColor,
}) {
  return (
    <Stack spacing={0.75}>
      <InputLabel
        sx={{
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: C.textMuted,
        }}
      >
        {label}
      </InputLabel>
      <TextField
        value={value}
        onChange={onChange}
        fullWidth
        size="small"
        multiline={multiline}
        rows={rows}
        sx={{
          "& .MuiOutlinedInput-root": {
            fontSize: "0.92rem",
            borderRadius: 2,
            backgroundColor: C.cream,
            "& fieldset": { borderColor: borderColor },
            "&:hover fieldset": { borderColor: borderColor, opacity: 0.7 },
            "&.Mui-focused fieldset": {
              borderColor: borderColor,
              borderWidth: "2px",
            },
          },
        }}
      />
    </Stack>
  );
}

function UploadButton({
  label,
  icon,
  onChange,
  accept,
  headerColor,
  borderColor,
}) {
  return (
    <Button
      variant="outlined"
      component="label"
      startIcon={icon}
      sx={{
        fontWeight: 700,
        fontSize: "0.78rem",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: headerColor,
        borderColor: borderColor,
        borderRadius: 2,
        px: 2.5,
        py: 1,
        "&:hover": {
          backgroundColor: headerColor,
          color: C.white,
          borderColor: headerColor,
        },
        transition: "all 0.2s ease",
      }}
    >
      {label}
      <input type="file" hidden accept={accept} onChange={onChange} />
    </Button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function Settings({ onUpdate }) {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};

  // School info
  const [companyName, setCompanyName] = useState(branding.companyName || "");
  const [shortTerm, setShortTerm] = useState(branding.shortTerm || "");
  const [logo, setLogo] = useState(null);
  const [previewLogo, setPreviewLogo] = useState(assets.logoUrl || null);
  const [bgImage, setBgImage] = useState(null);
  const [previewBg, setPreviewBg] = useState(assets.backgroundImage || null);
  const [footerText, setFooterText] = useState(branding.footerText || "");

  // Colors
  const [headerColor, setHeaderColor] = useState(colors.header || "");
  const [footerColor, setFooterColor] = useState(colors.footer || "");
  const [mainButtonColor, setMainButtonColor] = useState(colors.mainButton || "");
  const [subButtonColor, setSubButtonColor] = useState(colors.subButton || "");
  const [borderColor, setBorderColor] = useState(colors.border || "");
  const [titleColor, setTitleColor] = useState(colors.title || "");
  const [subtitleColor, setSubtitleColor] = useState(colors.subtitle || "");

  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const handleCloseSnack = (_, reason) => {
    if (reason !== "clickaway") setSnack((p) => ({ ...p, open: false }));
  };

  const [hasAccess, setHasAccess] = useState(null);
  const loading = false;
  const pageId = 74;

  // Resolved dynamic colors from database-backed settings/context.
  const resolvedHeader = colors.header || headerColor;
  const resolvedBorder = colors.border || borderColor;
  const branches = settings?.branches || [];

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedEmployeeID = localStorage.getItem("employee_id");
    if (storedRole === "registrar") {
      checkAccess(storedEmployeeID);
    } else {
      window.location.href = "/login";
    }
  }, []);

  const checkAccess = async (employeeID) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`,
      );
      setHasAccess(response.data?.page_privilege === 1);
    } catch {
      setHasAccess(false);
    }
  };

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/settings`)
      .then(({ data }) => {
        setCompanyName(data.company_name || "");
        setShortTerm(data.short_term || "");
        setPreviewLogo(
          data.logo_url ? `${API_BASE_URL}${data.logo_url}` : null,
        );
        setPreviewBg(data.bg_image ? `${API_BASE_URL}${data.bg_image}` : null);
        setHeaderColor(data.header_color || colors.header || "");
        setFooterText(data.footer_text || branding.footerText || "");
        setFooterColor(data.footer_color || colors.footer || "");
        setMainButtonColor(data.main_button_color || colors.mainButton || "");
        setSubButtonColor(data.sub_button_color || colors.subButton || "");
        setBorderColor(data.border_color || colors.border || "");
        setTitleColor(data.title_color || colors.title || "");
        setSubtitleColor(data.subtitle_color || colors.subtitle || "");
      })
      .catch(() =>
        setSnack({
          open: true,
          message: "Failed to fetch settings",
          severity: "error",
        }),
      );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("company_name", companyName);
    formData.append("short_term", shortTerm);
    if (logo) formData.append("logo", logo);
    if (bgImage) formData.append("bg_image", bgImage);
    formData.append("header_color", headerColor);
    formData.append("footer_text", footerText);
    formData.append("footer_color", footerColor);
    formData.append("main_button_color", mainButtonColor);
    formData.append("sub_button_color", subButtonColor);
    formData.append("border_color", borderColor);
    formData.append("title_color", titleColor);
    formData.append("subtitle_color", subtitleColor);
    formData.append(
      "audit_actor_id",
      localStorage.getItem("employee_id") || "",
    );
    formData.append(
      "audit_actor_role",
      localStorage.getItem("role") || "registrar",
    );
    const mac = getStoredUserMacAddress();
    if (mac) formData.append("user_mac_address", mac);

    try {
      await axios.post(`${API_BASE_URL}/api/settings`, formData, {
        headers: {
          ...getFlatAuditHeaders(),
          "Content-Type": "multipart/form-data",
          "x-employee-id": localStorage.getItem("employee_id") || "",
          "x-page-id": pageId,
          "x-audit-actor-id": localStorage.getItem("employee_id") || "",
          "x-audit-actor-role": localStorage.getItem("role") || "registrar",
        },
      });
      onUpdate?.();
      setSnack({
        open: true,
        message: "Settings updated successfully!",
        severity: "success",
      });
    } catch {
      setSnack({
        open: true,
        message: "Error updating settings",
        severity: "error",
      });
    }
  };

  if (loading || hasAccess === null)
    return <LoadingOverlay open={loading} message="Loading..." />;
  if (!hasAccess) return <Unauthorized />;

  const colorFields = [
    { label: "Header Color", value: headerColor, setter: setHeaderColor },
    { label: "Footer Color", value: footerColor, setter: setFooterColor },
    {
      label: "Main Button / Sidebar BG Color",
      value: mainButtonColor,
      setter: setMainButtonColor,
    },
    {
      label: "Sub Button Color",
      value: subButtonColor,
      setter: setSubButtonColor,
    },
    { label: "Border Color", value: borderColor, setter: setBorderColor },
    { label: "Title / Icons Color", value: titleColor, setter: setTitleColor },
    { label: "Subtitle Color", value: subtitleColor, setter: setSubtitleColor },
  ];

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
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}
        >
          SETTINGS
        </Typography>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      <br />

      {/* ── Two-column grid ──────────────────────────────────────────────── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
          alignItems: "start",
        }}
      >
        {/* ══ LEFT ════════════════════════════════════════════════════════ */}
        <Stack spacing={3}>
          {/* Institution Info */}
          <Paper
            elevation={1}
            sx={{
              border: `1px solid ${resolvedBorder}`,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <SectionHeader
              icon={<SchoolIcon fontSize="small" />}
              title="Institution Information"
              headerColor={resolvedHeader}
            />
            <Stack spacing={2.5} sx={{ p: 3 }}>
              <LabeledField
                label="School Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                borderColor={resolvedBorder}
              />
              <LabeledField
                label="Short Term / Abbreviation"
                value={shortTerm}
                onChange={(e) => setShortTerm(e.target.value)}
                borderColor={resolvedBorder}
              />
              <LabeledField
                label="Footer Text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                borderColor={resolvedBorder}
              />
              <Stack spacing={1}>
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                  }}
                >
                  Branches
                </Typography>
                <Box
                  sx={{
                    border: `1px solid ${resolvedBorder}`,
                    borderRadius: 2,
                    backgroundColor: C.cream,
                    px: 1.5,
                    py: 1.25,
                  }}
                >
                  {branches.length > 0 ? (
                    <Stack spacing={1.25}>
                      {branches.map((branch) => (
                        <Box key={branch.id || branch.branch}>
                          <Typography
                            sx={{
                              fontSize: "0.9rem",
                              fontWeight: 700,
                              color: C.textMain,
                            }}
                          >
                            {branch.branch ||
                              branch.branch_name ||
                              "Unnamed Branch"}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: "0.82rem",
                              color: C.textMuted,
                              mt: 0.25,
                            }}
                          >
                            {branch.address || "No address set"}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography
                      sx={{ fontSize: "0.82rem", color: C.textMuted }}
                    >
                      No branches configured.
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Stack>
          </Paper>

          {/* School Logo */}
          <Paper
            elevation={1}
            sx={{
              border: `1px solid ${resolvedBorder}`,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <SectionHeader
              icon={<PhotoCameraIcon fontSize="small" />}
              title="School Logo"
              headerColor={resolvedHeader}
            />
            <Box sx={{ p: 3 }}>
              <UploadButton
                label="Choose Logo"
                icon={<FolderOpenIcon />}
                accept="image/*"
                headerColor={resolvedHeader}
                borderColor={resolvedBorder}
                onChange={(e) => {
                  setLogo(e.target.files[0]);
                  setPreviewLogo(URL.createObjectURL(e.target.files[0]));
                }}
              />
              {previewLogo && (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={2.5}
                  sx={{
                    mt: 2.5,
                    p: 2,
                    backgroundColor: C.goldPale,
                    borderRadius: 2.5,
                    border: `1px solid ${resolvedBorder}`,
                  }}
                >
                  <Box
                    component="img"
                    src={previewLogo}
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: 2.5,
                      objectFit: "cover",
                      border: `2px solid ${resolvedHeader}`,
                      boxShadow: `0 3px 12px ${resolvedHeader}40`,
                      flexShrink: 0,
                    }}
                  />
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        color: resolvedHeader,
                      }}
                    >
                      Logo Preview
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: C.textMuted,
                        mt: 0.5,
                        lineHeight: 1.5,
                      }}
                    >
                      Appears on documents and the portal header and each
                      Documents.
                    </Typography>
                  </Box>
                </Stack>
              )}
            </Box>
          </Paper>

          {/* Background Image */}
          <Paper
            elevation={1}
            sx={{
              border: `1px solid ${resolvedBorder}`,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <SectionHeader
              icon={<ImageIcon fontSize="small" />}
              title="Background School Image"
              headerColor={resolvedHeader}
            />
            <Box sx={{ p: 3 }}>
              <UploadButton
                label="Choose Background"
                icon={<FolderOpenIcon />}
                accept="image/*"
                headerColor={resolvedHeader}
                borderColor={resolvedBorder}
                onChange={(e) => {
                  setBgImage(e.target.files[0]);
                  setPreviewBg(URL.createObjectURL(e.target.files[0]));
                }}
              />
              {previewBg && (
                <Box
                  sx={{
                    mt: 2.5,
                    position: "relative",
                    borderRadius: 2.5,
                    overflow: "hidden",
                    border: `1px solid ${resolvedBorder}`,
                  }}
                >
                  <Box
                    component="img"
                    src={previewBg}
                    sx={{
                      width: "100%",
                      height: 400,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: `linear-gradient(transparent, ${resolvedHeader}cc)`,
                      px: 2,
                      py: 1.5,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.78rem",
                        color: "rgba(255,255,255,0.9)",
                        fontWeight: 500,
                      }}
                    >
                      Background Preview
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        </Stack>

        {/* ══ RIGHT ═══════════════════════════════════════════════════════ */}
        <Stack spacing={3}>
          {/* Theme Colors */}
          <Paper
            elevation={1}
            sx={{
              border: `1px solid ${resolvedBorder}`,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <SectionHeader
              icon={<PaletteIcon fontSize="small" />}
              title="Theme Colors"
              headerColor={resolvedHeader}
            />
            <Stack sx={{ px: 3, pt: 1, pb: 2 }}>
              {colorFields.map((c, i) => (
                <Box key={c.label}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ py: 1.75 }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.88rem",
                          color: C.textMain,
                        }}
                      >
                        {c.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          color: C.textMuted,
                          mt: 0.25,
                          fontWeight: 500,
                        }}
                      >
                        {c.value.toUpperCase()}
                      </Typography>
                    </Box>

                    {/* Clickable color swatch */}
                    <Box
                      onClick={() =>
                        document.getElementById(`color-pick-${i}`).click()
                      }
                      sx={{
                        position: "relative",
                        width: 400,
                        height: 38,
                        borderRadius: 2,
                        backgroundColor: c.value,
                        border: `2px solid ${resolvedBorder}`,
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                        flexShrink: 0,
                        overflow: "hidden",
                        transition:
                          "transform 0.15s ease, box-shadow 0.15s ease",
                        "&:hover": {
                          transform: "scale(1.07)",
                          boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
                        },
                      }}
                    >
                      {/* Checkerboard hint */}
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          zIndex: 0,
                          opacity: 0.2,
                          backgroundImage: `
                          linear-gradient(45deg,  #aaa 25%, transparent 25%),
                          linear-gradient(-45deg, #aaa 25%, transparent 25%),
                          linear-gradient(45deg,  transparent 75%, #aaa 75%),
                          linear-gradient(-45deg, transparent 75%, #aaa 75%)`,
                          backgroundSize: "8px 8px",
                          backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
                        }}
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          zIndex: 1,
                          backgroundColor: c.value,
                        }}
                      />
                      <Input
                        type="color"
                        id={`color-pick-${i}`}
                        value={c.value}
                        onChange={(e) => c.setter(e.target.value)}
                        sx={{
                          opacity: 0,
                          width: 0,
                          height: 0,
                          position: "absolute",
                          zIndex: 2,
                        }}
                      />
                    </Box>
                  </Stack>

                  {i < colorFields.length - 1 && (
                    <Divider sx={{ borderColor: resolvedBorder }} />
                  )}
                </Box>
              ))}
            </Stack>
          </Paper>

          {/* Save Card */}
          <Paper
            elevation={1}
            sx={{
              border: `1px solid ${resolvedBorder}`,
              borderRadius: 3,
              backgroundColor: C.white,
              overflow: "hidden",
            }}
          >
            <SectionHeader
              icon={<SaveIcon fontSize="small" />}
              title="Save Changes"
              headerColor={resolvedHeader}
            />
            <Box sx={{ p: 3 }}>
              <Typography
                sx={{
                  fontSize: "0.82rem",
                  color: C.textMuted,
                  mb: 2.5,
                  lineHeight: 1.65,
                }}
              >
                Review all changes before saving. Updates will apply across the
                Admission &amp; Enrollment portal immediately.
              </Typography>
              <Button
                variant="contained"
                fullWidth
                startIcon={<SaveIcon />}
                onClick={handleSubmit}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  py: 1.6,
                  borderRadius: 2.5,

                  color: C.white,
                  border: `1px solid ${resolvedBorder}`,
                }}
              >
                Save Settings
              </Button>
            </Box>
          </Paper>
        </Stack>
      </Box>

      {/* ── Hidden legacy TableContainer (preserved for compatibility) ─── */}
      <TableContainer component={Paper} sx={{ display: "none" }}>
        <Table>
          <TableHead sx={{ backgroundColor: resolvedHeader }}>
            <TableRow>
              <TableCell sx={{ color: "white", textAlign: "Center" }}>
                Settings
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      {/* ── Snackbar ─────────────────────────────────────────────────────── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={handleCloseSnack}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={handleCloseSnack}
          sx={{ width: "100%", fontWeight: 500, borderRadius: 2.5 }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Settings;
