import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  MenuItem,
} from "@mui/material";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  Select,
} from "@mui/material";
import { Snackbar, Alert } from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import SuperAdminResetPasswordTabs from "../components/SuperAdminResetPasswordTabs";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import { getAuditConfig } from "../utils/auditEvents";
import useAccountAuditMac from "./useAccountAuditMac";
import { getLoginMacPayload } from "../utils/userMacAddress";

const cleanSuggestionValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const getRegistrarSuggestionText = (registrar) =>
  [
    registrar?.employee_id,
    registrar?.fullName,
    registrar?.first_name,
    registrar?.middle_name,
    registrar?.last_name,
    registrar?.email,
  ]
    .map(cleanSuggestionValue)
    .join(" ")
    .toLowerCase();

const SuperAdminRegistrarResetPassword = () => {
  useAccountAuditMac();
  const getAuditRequestConfig = (overrides = {}) => getAuditConfig(overrides);
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff"); // ✅ NEW
  const [stepperColor, setStepperColor] = useState("#000000"); // ✅ NEW

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");

  useEffect(() => {
    if (!settings) return;

    // 🎨 Colors
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton); // ✅ NEW
    if (colors.stepper) setStepperColor(colors.stepper); // ✅ NEW

    // 🏫 Logo
    if (assets.logoUrl) {
      setFetchedLogo(`${assets.logoUrl}`);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Information
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const pageId = 83;

  const [employeeID, setEmployeeID] = useState("");
  const [searchLoading, setSearchLoading] = useState(false); // for search/reset

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setUserRole(storedRole);
      setUserID(storedID);
      setEmployeeID(storedEmployeeID);

      if (storedRole === "registrar") {
        checkAccess(storedEmployeeID);
      } else {
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const checkAccess = async (employeeID) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`,
      );
      if (response.data && response.data.page_privilege === 1) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
      if (error.response && error.response.data.message) {
        console.log(error.response.data.message);
      } else {
        console.log("An unexpected error occurred.");
      }
      setLoading(false);
    }
  };

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const auditFields = () => ({

    audit_actor_id:
      employeeID ||
      localStorage.getItem("employee_id") ||
      localStorage.getItem("email") ||
      "unknown",
    audit_actor_role: userRole || localStorage.getItem("role") || "registrar",
    ...getLoginMacPayload(),
  });

  const [registrars, setRegistrars] = useState([]);

  useEffect(() => {
    const fetchRegistrars = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/superadmin-get-all-registrar`,
        );
        setRegistrars(res.data);
      } catch (err) {
        console.error("Failed to fetch registrars", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRegistrars();
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  const totalPages = Math.ceil(registrars.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = registrars.slice(indexOfFirstRow, indexOfLastRow);
  const registrarSuggestions =
    searchQuery.trim().length >= 2
      ? registrars
        .filter((registrar) =>
          getRegistrarSuggestionText(registrar).includes(searchQuery.trim().toLowerCase()),
        )
        .slice(0, 8)
      : [];

  const handleNameClick = (r) => {
    setSearchQuery(r.employee_id); // or r.email if backend supports
    setUserInfo(r); // 🔥 instantly fill panel without waiting backend
  };

  const [resetMsg, setResetMsg] = useState("");

  useEffect(() => {
    const fetchInfo = async () => {
      if (!searchQuery?.trim()) {
        setUserInfo(null);
        setSearchError("");
        return;
      }

      setSearchLoading(true);
      setSearchError("");

      try {
        const res = await axios.post(
          `${API_BASE_URL}/api/superadmin-get-registrar`,
          {
            search: searchQuery.trim(),
          }
        );

        setUserInfo(res.data);
      } catch (err) {
        setSearchError(
          err.response?.data?.message ||
          "No registrar found."
        );

        setUserInfo(null);
      } finally {
        setSearchLoading(false);
      }
    };

    const delayDebounce = setTimeout(fetchInfo, 600);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const [statusLoading, setStatusLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);


  const handleReset = async () => {
    if (!userInfo?.email) {
      setSnackbar({
        open: true,
        message: "Please select a registrar first.",
        severity: "warning",
      });
      return;
    }

    setResetLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/superadmin-reset-registrar`,
        {
          email: userInfo.email,
          ...auditFields(),
        },
        getAuditRequestConfig(),
      );

      setSnackbar({
        open: true,
        message:
          res.data.message ||
          "Password reset successfully.",
        severity: "success",
      });
    } catch (err) {
      console.error("Reset error:", err);

      setSnackbar({
        open: true,
        message:
          err.response?.data?.message ||
          err.message ||
          "Error resetting password",
        severity: "error",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const handleStatusChange = (e) => {
    const newStatus = parseInt(e.target.value, 10);

    setUserInfo((prev) => ({
      ...prev,
      status: newStatus,
    }));
  };

  const handleUpdateStatus = async () => {
    if (!userInfo) return;

    setStatusLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/superadmin-update-status-registrar`,
        {
          email: userInfo.email,
          status: userInfo.status,
          ...auditFields(),
        },
        getAuditRequestConfig(),
      );

      setRegistrars((prev) =>
        prev.map((r) =>
          r.email === userInfo.email
            ? { ...r, status: userInfo.status }
            : r
        )
      );

      setSnackbar({
        open: true,
        message:
          res.data.message || "Registrar status updated successfully",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message:
          err.response?.data?.message ||
          "Failed to update registrar status",
        severity: "error",
      });
    } finally {
      setStatusLoading(false);
    }
  };

  /* =====================================
     DATE FORMAT
  ===================================== */
  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // ================= STYLES =================
  const headerCellStyle = {
    color: "white",
    textAlign: "center",
    fontSize: "12px",
    border: `1px solid ${borderColor}`,
  };

  const headerStyle = {
    textAlign: "center",
    fontSize: "12px",
    border: `1px solid ${borderColor}`,
  };

  const paginationSelectStyle = {
    fontSize: "12px",
    height: 36,
    color: "white",
    border: "2px solid white",
    backgroundColor: "transparent",
    ".MuiOutlinedInput-notchedOutline": {
      borderColor: "white",
    },
    "& svg": {
      color: "white",
    },
  };

  const paginationButtonStyle = {
    minWidth: 70,
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
  };

  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Checking Access..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }

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

  // ✅ Main Component
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
      {/* Header */}
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
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: "36px",
          }}
        >
          REGISTRAR RESET PASSWORD
        </Typography>


        <Box sx={{ position: "relative", width: 450 }}>
          <TextField
            size="small"
            placeholder="Search Employee ID / Name / Email Address"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
              setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
            sx={{
              width: "100%",
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
          {suggestionsOpen && searchQuery.trim().length >= 2 && (
            <Box sx={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, mt: 0.5, maxHeight: 260, overflowY: "auto", backgroundColor: "#fff", border: "1px solid #d6d6d6", borderRadius: 1, boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}>
              {registrarSuggestions.length > 0 ? (
                registrarSuggestions.map((registrar) => (
                  <Box key={`${registrar?.employee_id}-${registrar?.email}`} onMouseDown={(e) => { e.preventDefault(); handleNameClick(registrar); setCurrentPage(1); setSuggestionsOpen(false); }} sx={{ px: 2, py: 1, cursor: "pointer", display: "flex", alignItems: "center", gap: 1, fontSize: 14, borderBottom: "1px solid #f0f0f0", "&:hover": { backgroundColor: "#f5f7fb" } }}>
                    <Typography component="span" sx={{ fontWeight: 700, minWidth: 120 }}>{cleanSuggestionValue(registrar?.employee_id) || "No employee ID"}</Typography>
                    <Typography component="span" sx={{ color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[cleanSuggestionValue(registrar?.fullName), cleanSuggestionValue(registrar?.email)].filter(Boolean).join(" - ")}</Typography>
                  </Box>
                ))
              ) : (
                <Box sx={{ px: 2, py: 1, color: "#777", fontSize: 14 }}>No matching registrars</Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />
      <SuperAdminResetPasswordTabs />
      <br />
      <br />

      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}` }}
      >
        <Table>
          <TableHead
            sx={{ backgroundColor: headerColor || "#1976d2" }}
          >
            <TableRow>
              <TableCell sx={{ color: "white", textAlign: "Center" }}>
                Registrar Information
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>
      <Paper sx={{ p: 3, border: `1px solid ${borderColor}` }}>
        <Box
          display="grid"
          gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
          gap={2}
        >
          <TextField
            label="Employee ID"
            value={userInfo?.employee_id || ""}
            fullWidth
            InputProps={{ readOnly: true }}
          />
          <TextField
            label="Email"
            value={userInfo?.email || ""}
            fullWidth
            InputProps={{ readOnly: true }}
          />
          <TextField
            label="Full Name"
            value={userInfo?.fullName || ""}
            fullWidth
            InputProps={{ readOnly: true }}
          />
          <TextField
            select
            label="Status"
            value={userInfo?.status ?? ""}
            fullWidth
            onChange={handleStatusChange}
          >
            <MenuItem value={1}>Active</MenuItem>
            <MenuItem value={0}>Inactive</MenuItem>
          </TextField>
        </Box>

        <Box mt={3} display="flex" gap={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdateStatus}
            disabled={!userInfo || statusLoading}
          >
            {statusLoading ? "Updating..." : "Update Status"}
          </Button>

          <Button
            variant="contained"
            color="secondary"
            onClick={handleReset}
            disabled={!userInfo?.email || resetLoading}
          >
            {resetLoading ? "Sending Email..." : "Reset Password"}
          </Button>
        </Box>
      </Paper>

      <br />
      <br />
      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          {/* 🔥 TOP HEADER (Pagination + Total) */}
          <TableHead>
            <TableRow>
              <TableCell
                colSpan={6}
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
                  {/* LEFT: TOTAL COUNT */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Registrar's Records: {registrars.length}
                  </Typography>

                  {/* RIGHT: PAGINATION CONTROLS */}
                  <Box display="flex" alignItems="center" gap={1}>
                    {/* FIRST */}
                    <Button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyle}
                    >
                      First
                    </Button>

                    {/* PREV */}
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyle}
                    >
                      Prev
                    </Button>

                    {/* PAGE DROPDOWN */}
                    <FormControl size="small" sx={{ minWidth: 90 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                        sx={paginationSelectStyle}
                        MenuProps={{
                          PaperProps: { sx: { maxHeight: 200 } },
                        }}
                      >
                        {Array.from({ length: totalPages }, (_, i) => (
                          <MenuItem key={i + 1} value={i + 1}>
                            Page {i + 1}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Typography fontSize="12px" color="white">
                      of {totalPages} page{totalPages > 1 ? "s" : ""}
                    </Typography>

                    {/* NEXT */}
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyle}
                    >
                      Next
                    </Button>

                    {/* LAST */}
                    <Button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyle}
                    >
                      Last
                    </Button>
                  </Box>
                </Box>
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell
                sx={{
                  ...headerStyle,
                  backgroundColor: "white",
                  color: "black",
                }}
              >
                #
              </TableCell>
              <TableCell
                sx={{
                  ...headerStyle,
                  backgroundColor: "white",
                  color: "black",
                }}
              >
                Employee ID
              </TableCell>
              <TableCell
                sx={{
                  ...headerStyle,
                  backgroundColor: "white",
                  color: "black",
                }}
              >
                Full Name
              </TableCell>
              <TableCell
                sx={{
                  ...headerStyle,
                  backgroundColor: "white",
                  color: "black",
                }}
              >
                Email
              </TableCell>
              <TableCell
                sx={{
                  ...headerStyle,
                  backgroundColor: "white",
                  color: "black",
                }}
              >
                Status
              </TableCell>
            </TableRow>
          </TableHead>

          {/* BODY */}
          <TableBody>
            {currentRows.map((r, index) => (
              <TableRow
                key={index}
                sx={{
                  backgroundColor: index % 2 === 0 ? "#ffffff" : "lightgray", // 👈 alternating
                }}
              >
                <TableCell
                  align="center"
                  sx={{ border: `1px solid ${borderColor}` }}
                >
                  {indexOfFirstRow + index + 1}
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    border: `1px solid ${borderColor}`,
                    color: "blue",
                    cursor: "pointer",

                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                  onClick={() => handleNameClick(r)}
                >
                  {r.employee_id}
                </TableCell>

                <TableCell
                  align="left"
                  sx={{
                    border: `1px solid ${borderColor}`,
                    color: "blue",
                    cursor: "pointer",

                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                  onClick={() => handleNameClick(r)}
                >
                  {r.fullName}
                </TableCell>

                <TableCell
                  align="center"
                  sx={{ border: `1px solid ${borderColor}` }}
                >
                  {r.email}
                </TableCell>

                <TableCell
                  sx={{
                    border: `1px solid ${borderColor}`,
                    fontWeight: "bold",
                    color: r.status === 1 ? "green" : "red",
                    textAlign: "center",
                  }}
                >
                  {r.status === 1 ? "Active" : "Inactive"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            {/* PAGINATION BAR */}
            <TableRow>
              <TableCell
                colSpan={6}
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
                  {/* LEFT: TOTAL COUNT */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Registrar's Records: {registrars.length}
                  </Typography>

                  {/* RIGHT: PAGINATION CONTROLS */}
                  <Box display="flex" alignItems="center" gap={1}>
                    {/* FIRST */}
                    <Button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyle}
                    >
                      First
                    </Button>

                    {/* PREV */}
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyle}
                    >
                      Prev
                    </Button>

                    {/* PAGE DROPDOWN */}
                    <FormControl size="small" sx={{ minWidth: 90 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                        sx={paginationSelectStyle}
                        MenuProps={{
                          PaperProps: { sx: { maxHeight: 200 } },
                        }}
                      >
                        {Array.from({ length: totalPages }, (_, i) => (
                          <MenuItem key={i + 1} value={i + 1}>
                            Page {i + 1}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Typography fontSize="12px" color="white">
                      of {totalPages} page{totalPages > 1 ? "s" : ""}
                    </Typography>

                    {/* NEXT */}
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyle}
                    >
                      Next
                    </Button>

                    {/* LAST */}
                    <Button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={paginationButtonStyle}
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



      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SuperAdminRegistrarResetPassword;
