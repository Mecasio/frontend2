import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";

import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  MenuItem,
  FormControl,
  Select,
} from "@mui/material";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { Snackbar, Alert } from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";

import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import SuperAdminResetPasswordTabs from "../components/SuperAdminResetPasswordTabs";

import API_BASE_URL from "../apiConfig";
import { getAuditConfig } from "../utils/auditEvents";
import useAccountAuditMac from "./useAccountAuditMac";
import { getLoginMacPayload } from "../utils/userMacAddress";
import DateField from "../components/DateField";

const cleanSuggestionValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const getStudentSuggestionText = (student) =>
  [
    student?.student_number,
    student?.fullName,
    student?.first_name,
    student?.middle_name,
    student?.last_name,
    student?.email,
  ]
    .map(cleanSuggestionValue)
    .join(" ")
    .toLowerCase();

const SuperAdminStudentResetPassword = () => {
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
      setFetchedLogo(null);
    }

    // 🏷️ School Information
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);

  /* =====================================
     AUTH
  ===================================== */
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const pageId = 91;
  const [employeeID, setEmployeeID] = useState("");

  useEffect(() => {
    const email = localStorage.getItem("email");
    const role = localStorage.getItem("role");
    const empID = localStorage.getItem("employee_id");

    if (!email || role !== "registrar") {
      window.location.href = "/login";
      return;
    }

    setEmployeeID(empID);
    checkAccess(empID);
  }, []);

  const checkAccess = async (id) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/page_access/${id}/${pageId}`,
      );

      setHasAccess(res.data?.page_privilege === 1);
    } catch {
      setHasAccess(false);
    }
  };

  /* =====================================
     SNACKBAR
  ===================================== */
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
    audit_actor_role: localStorage.getItem("role") || "registrar",
    ...getLoginMacPayload(),
  });

  /* =====================================
     SEARCH
  ===================================== */
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [searchError, setSearchError] = useState("");

  /* =====================================
     FETCH SINGLE STUDENT
  ===================================== */
  useEffect(() => {
    if (!searchQuery) {
      setUserInfo(null);
      setSearchError("");
      return;
    }

    const fetchStudent = async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/api/superadmin-get-student`, {
          search: searchQuery,
        });

        setUserInfo(res.data);
      } catch (err) {
        setSearchError(err.response?.data?.message || "Student not found");

        setUserInfo(null);
      }
    };

    const delay = setTimeout(fetchStudent, 600);

    return () => clearTimeout(delay);
  }, [searchQuery]);

  /* =====================================
     FETCH ALL STUDENTS
  ===================================== */
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);

      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/superadmin-get-all-students`,
        );

        setStudents(res.data);
      } catch (err) {
        console.error("Fetch students error", err);
      }

      setLoading(false);
    };

    fetchStudents();
  }, []);

  const [statusLoading, setStatusLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  /* =====================================
     RESET PASSWORD
  ===================================== */
  const handleReset = async () => {
    if (!userInfo) return;

    setResetLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/superadmin-reset-student`,
        {
          search: userInfo.email,
          ...auditFields(),
        },
        getAuditRequestConfig(),
      );


      setSnackbar({
        open: true,
        message: res.data.message,
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || "Reset failed",
        severity: "error",
      });
    } finally {
      setResetLoading(false);
    }
  };

  /* =====================================
     UPDATE STATUS
  ===================================== */
  const handleStatusChange = (e) => {
    const newStatus = Number(e.target.value);

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
        `${API_BASE_URL}/api/superadmin-update-status-student`,
        {
          email: userInfo.email,
          status: userInfo.status,
          ...auditFields(),
        },
        getAuditRequestConfig(),
      );

      setStudents((prev) =>
        prev.map((student) =>
          student.email === userInfo.email
            ? { ...student, status: userInfo.status }
            : student
        )
      );

      setSnackbar({
        open: true,
        message:
          res.data.message || "Student status updated successfully",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message:
          err.response?.data?.message ||
          "Failed to update student status",
        severity: "error",
      });
    } finally {
      setStatusLoading(false);
    }
  };
  /* =====================================
     PAGINATION
  ===================================== */
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 20;

  const totalPages = Math.ceil(students.length / rowsPerPage);

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLast - rowsPerPage;

  const currentRows = students.slice(indexOfFirstRow, indexOfLast);
  const studentSuggestions =
    searchQuery.trim().length >= 2
      ? students
        .filter((student) =>
          getStudentSuggestionText(student).includes(searchQuery.trim().toLowerCase()),
        )
        .slice(0, 8)
      : [];

  /* =====================================
     CLICK NAME
  ===================================== */
  const handleNameClick = (student) => {
    // You can search by email (safest because it's unique)
    setSearchQuery(student.email);

    // Optional: scroll to info panel
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  };

  const headerCellStyle = {
    color: "white",
    textAlign: "center",
    fontSize: "12px",
    border: `1px solid ${borderColor}`,
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

  /* =====================================
     GUARDS
  ===================================== */
  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }

  /* =====================================
     STYLES
  ===================================== */
  const headerStyle = {
    textAlign: "center",
    fontSize: "12px",
    border: `1px solid ${borderColor}`,
  };

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

  /* =====================================
     RENDER
  ===================================== */
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
          STUDENT RESET PASSWORD
        </Typography>

        <Box sx={{ position: "relative", width: 450 }}>
          <TextField
            size="small"
            placeholder="Search Student / Email / Name"
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
              {studentSuggestions.length > 0 ? (
                studentSuggestions.map((student) => (
                  <Box key={`${student?.student_number}-${student?.email}`} onMouseDown={(e) => { e.preventDefault(); handleNameClick(student); setCurrentPage(1); setSuggestionsOpen(false); }} sx={{ px: 2, py: 1, cursor: "pointer", display: "flex", alignItems: "center", gap: 1, fontSize: 14, borderBottom: "1px solid #f0f0f0", "&:hover": { backgroundColor: "#f5f7fb" } }}>
                    <Typography component="span" sx={{ fontWeight: 700, minWidth: 120 }}>{cleanSuggestionValue(student?.student_number) || "No student no."}</Typography>
                    <Typography component="span" sx={{ color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[cleanSuggestionValue(student?.fullName), cleanSuggestionValue(student?.email)].filter(Boolean).join(" - ")}</Typography>
                  </Box>
                ))
              ) : (
                <Box sx={{ px: 2, py: 1, color: "#777", fontSize: 14 }}>No matching students</Box>
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
                Student Information
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <Paper sx={{ p: 3, border: `1px solid ${borderColor}` }}>
        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
          <TextField
            label="Student Number"
            value={userInfo?.student_number || ""}
            InputProps={{ readOnly: true }}
          />

          <TextField
            label="Email"
            value={userInfo?.email || ""}
            InputProps={{ readOnly: true }}
          />

          <TextField
            label="Full Name"
            value={userInfo?.fullName || ""}
            InputProps={{ readOnly: true }}
          />

          <DateField
            label="Birthdate"
            value={userInfo?.birthdate || ""}
            InputProps={{ readOnly: true }}
          />

          <TextField
            select
            label="Status"
            value={userInfo?.status ?? ""}
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
            disabled={!userInfo || statusLoading || resetLoading}
          >
            {statusLoading ? "Updating..." : "Update Status"}
          </Button>

          <Button
            variant="contained"
            color="secondary"
            onClick={handleReset}
            disabled={!userInfo || resetLoading || statusLoading}
          >
            {resetLoading ? "Processing..." : "Reset Password"}
          </Button>
        </Box>
      </Paper>

      <br />
      <br />
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
                    Total Student's Records: {students.length}
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

            {/* COLUMNS */}
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
                Student No.
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
                Birthday
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

          <TableBody>
            {currentRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No students found
                </TableCell>
              </TableRow>
            ) : (
              currentRows.map((s, i) => (
                <TableRow
                  key={i}
                  sx={{
                    backgroundColor: i % 2 === 0 ? "#ffffff" : "lightgray",
                  }}
                >
                  <TableCell
                    align="center"
                    sx={{ border: `1px solid ${borderColor}` }}
                  >
                    {indexOfFirstRow + i + 1}
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
                    onClick={() => handleNameClick(s)}
                  >
                    {s.student_number}
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
                    onClick={() => handleNameClick(s)}
                  >
                    {s.fullName}
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={{ border: `1px solid ${borderColor}` }}
                  >
                    {formatDate(s.birthdate)}
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={{ border: `1px solid ${borderColor}` }}
                  >
                    {s.email}
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={{
                      border: `1px solid ${borderColor}`,
                      fontWeight: "bold",
                      color: s.status === 1 ? "green" : "red",
                    }}
                  >
                    {s.status === 1 ? "Active" : "Inactive"}
                  </TableCell>
                </TableRow>
              ))
            )}
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
                    Total Student's Records: {students.length}
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



      {/* ================= SNACKBAR ================= */}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SuperAdminStudentResetPassword;
