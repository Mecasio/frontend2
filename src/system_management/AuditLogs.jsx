import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Table,
  TableBody,
  Button,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import API_BASE_URL from "../apiConfig";
import { SettingsContext } from "../App";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const PAGE_SIZE = 100;


const severityColors = {
  INFO: { bg: "#e0f2fe", color: "#075985", border: "#7dd3fc" },
  WARN: { bg: "#fef3c7", color: "#92400e", border: "#fbbf24" },
  WARNING: { bg: "#fef3c7", color: "#92400e", border: "#fbbf24" },
  ERROR: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  CRITICAL: { bg: "#fecaca", color: "#7f1d1d", border: "#ef4444" },
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
};

const AuditLogs = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#d1d5db";

  const scrollRef = useRef(null);
  const requestRef = useRef(false);
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [severity, setSeverity] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const resetList = useCallback(() => {
    setLogs([]);
    setPage(1);
    setHasMore(true);
    setError("");
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);


  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  const pageId = 154;

  const [employeeID, setEmployeeID] = useState("");

  const getAuditHeaders = () => ({
    headers: {
      ...getFlatAuditHeaders(),
      "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-page-id": pageId,
      "x-audit-actor-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
    },
  });

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
      const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`);
      if (response.data && response.data.page_privilege === 1) {
        setHasAccess(true);
        setCanCreate(Number(response.data?.can_create) === 1);
        setCanEdit(Number(response.data?.can_edit) === 1);
        setCanDelete(Number(response.data?.can_delete) === 1);
      } else {
        setHasAccess(false);
        setCanCreate(false);
        setCanEdit(false);
        setCanDelete(false);
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
      setCanCreate(false);
      setCanEdit(false);
      setCanDelete(false);
      if (error.response && error.response.data.message) {
        console.log(error.response.data.message);
      } else {
        console.log("An unexpected error occurred.");
      }
      setLoading(false);
    }
  };


  const fetchLogs = useCallback(async (pageToLoad = page, replace = false) => {
    if (requestRef.current || (!replace && !hasMore)) return;

    requestRef.current = true;
    setLoading(true);
    setError("");

    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/audit-logs`, {
        params: {
          page: pageToLoad,
          limit: PAGE_SIZE,
          severity,
          search,
        },
      });

      const nextRows = data.data || [];
      setLogs((prev) => {
        if (replace) return nextRows;

        const seen = new Set(prev.map((item) => item.log_key));
        const freshRows = nextRows.filter((item) => !seen.has(item.log_key));
        return [...prev, ...freshRows];
      });
      setHasMore(Boolean(data.hasMore));
      setPage(pageToLoad + 1);
    } catch (err) {
      console.error("Audit logs fetch failed:", err);
      setError(err.response?.data?.message || "Failed to fetch audit logs.");
    } finally {
      requestRef.current = false;
      setLoading(false);
    }
  }, [hasMore, page, search, severity]);

  useEffect(() => {
    resetList();
    fetchLogs(1, true);
  }, [severity, search]);




  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 100;

  const totalPages = Math.ceil(logs.length / logsPerPage);

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * logsPerPage;
    const endIndex = startIndex + logsPerPage;

    return logs.slice(startIndex, endIndex);
  }, [logs, currentPage]);

  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
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

  return (
    <Box
      sx={{
        height: "calc(100vh - 150px)",
        overflowY: "auto",
        backgroundColor: "transparent",
        mt: 1,
        p: 2,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}
        >
          AUDIT LOGS
        </Typography>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />


      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}` }}
      >
        <Table size="small">
          <TableHead
            sx={{
              backgroundColor: headerColor,
            }}
          >
            <TableRow>
              <TableCell
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor,
                  color: "white",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  gap={1}
                  sx={{ height: "50px" }}
                >
                  {/* LEFT SIDE */}
                  <Typography
                    fontSize="16px"
                    fontWeight="bold"
                    color="white"
                  >
                    Audit Logs
                  </Typography>

                  {/* RIGHT SIDE */}
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    flexWrap="wrap"
                  >
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

                    <FormControl size="small" sx={{ minWidth: 90 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) =>
                          setCurrentPage(Number(e.target.value))
                        }
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
                          "& svg": { color: "white" },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              backgroundColor: "#fff",
                            },
                          },
                        }}
                      >
                        {Array.from(
                          { length: totalPages || 1 },
                          (_, i) => (
                            <MenuItem
                              key={i + 1}
                              value={i + 1}
                            >
                              Page {i + 1}
                            </MenuItem>
                          )
                        )}
                      </Select>
                    </FormControl>

                    <Typography
                      fontSize="11px"
                      color="white"
                    >
                      of {totalPages || 1} page
                      {totalPages > 1 ? "s" : ""}
                    </Typography>

                    <Button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages)
                        )
                      }
                      disabled={
                        currentPage === totalPages ||
                        totalPages === 0
                      }
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
                      disabled={
                        currentPage === totalPages ||
                        totalPages === 0
                      }
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
      <Paper sx={{ p: 2, border: `1px solid ${borderColor}` }}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
          <TextField
            label="Search audit trail"
            size="small"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            sx={{ minWidth: 320 }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              label="Severity"
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
            >
              <MenuItem value="">All Severities</MenuItem>
              <MenuItem value="INFO">INFO</MenuItem>
              <MenuItem value="WARN">WARN</MenuItem>
              <MenuItem value="ERROR">ERROR</MenuItem>
              <MenuItem value="CRITICAL">CRITICAL</MenuItem>
            </Select>
          </FormControl>
          <Typography sx={{ ml: "auto", fontSize: 13, color: "text.secondary" }}>
            Loaded {logs.length.toLocaleString()} log{logs.length === 1 ? "" : "s"}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box

          sx={{


            border: `1px solid ${borderColor}`,
            backgroundColor: "#f8fafc",
            p: 2,
          }}
        >
          <Box sx={{}} />

          {paginatedLogs.map((log, index) => {
            const severityValue = String(log.severity || "INFO").toUpperCase();
            const severityStyle = severityColors[severityValue] || severityColors.INFO;

            return (
              <Box
                key={log.log_key}
                sx={{
                  minHeight: "auto",
                  mb: "12px",
                  display: "grid",
                  gridTemplateColumns: "16px 1fr",
                  columnGap: 1.5,
                }}
              >
                <Box
                  sx={{
                    position: "relative",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      mt: 1.2,
                      borderRadius: "50%",
                      backgroundColor: severityStyle.border,
                      border: "2px solid #fff",
                      boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.16)",
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      top: 26,
                      bottom: -12,
                      width: 2,
                      backgroundColor: "#dbe3ea",
                    }}
                  />
                </Box>

                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    border: `1px solid ${borderColor}`,
                    borderLeft: `4px solid ${severityStyle.border}`,
                    borderRadius: 1,
                    backgroundColor: index % 2 === 0 ? "white" : "lightgray",
                  }}
                >
                  <Box display="flex" gap={1} flexWrap="wrap" alignItems="center" mb={0.75}>
                    <Chip
                      label={severityValue}
                      size="small"
                      sx={{
                        backgroundColor: severityStyle.bg,
                        color: severityStyle.color,
                        fontWeight: 700,
                      }}
                    />
                    <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                      {formatDate(log.timestamp)}
                    </Typography>
                  </Box>

                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#1f2937",

                    }}
                  >
                    {log.email || "unknown"}
                  </Typography>

                  {log.user_mac_address && (
                    <Typography
                      sx={{
                        mt: 0.5,
                        fontSize: 12,
                        color: "#6b7280",
                        fontFamily: "monospace",
                      }}
                    >
                      MAC: {log.user_mac_address}
                    </Typography>
                  )}

                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: 14,
                      color: "#374151",
                      lineHeight: 1.45,
                      whiteSpace: "pre-line",

                    }}
                  >
                    {log.message}
                  </Typography>
                </Paper>
              </Box>
            );
          })}

          <Box sx={{}} />

          {logs.length === 0 && !loading && (
            <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
              No audit logs found.
            </Box>
          )}

          {loading && (
            <Box sx={{ textAlign: "center", py: 2, color: "text.secondary" }}>
              Loading audit logs...
            </Box>
          )}

          {!hasMore && logs.length > 0 && (
            <Box sx={{ textAlign: "center", py: 2, color: "text.secondary" }}>
              End of audit logs.
            </Box>
          )}
        </Box>
      </Paper>

      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}` }}
      >
        <Table size="small">
          <TableHead
            sx={{
              backgroundColor: headerColor,
            }}
          >
            <TableRow>
              <TableCell
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor,
                  color: "white",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  gap={1}
                  sx={{ height: "50px" }}
                >
                  {/* LEFT SIDE */}
                  <Typography
                    fontSize="16px"
                    fontWeight="bold"
                    color="white"
                  >
                    Audit Logs
                  </Typography>

                  {/* RIGHT SIDE */}
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    flexWrap="wrap"
                  >
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

                    <FormControl size="small" sx={{ minWidth: 90 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) =>
                          setCurrentPage(Number(e.target.value))
                        }
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
                          "& svg": { color: "white" },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              backgroundColor: "#fff",
                            },
                          },
                        }}
                      >
                        {Array.from(
                          { length: totalPages || 1 },
                          (_, i) => (
                            <MenuItem
                              key={i + 1}
                              value={i + 1}
                            >
                              Page {i + 1}
                            </MenuItem>
                          )
                        )}
                      </Select>
                    </FormControl>

                    <Typography
                      fontSize="11px"
                      color="white"
                    >
                      of {totalPages || 1} page
                      {totalPages > 1 ? "s" : ""}
                    </Typography>

                    <Button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages)
                        )
                      }
                      disabled={
                        currentPage === totalPages ||
                        totalPages === 0
                      }
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
                      disabled={
                        currentPage === totalPages ||
                        totalPages === 0
                      }
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
    </Box>
  );
};

export default AuditLogs;
