import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
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
import { Virtuoso } from "react-virtuoso";

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

  const requestRef = useRef(null);
  const virtuosoRef = useRef(null);
  const loadedPageRef = useRef(0);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [severity, setSeverity] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [action, setAction] = useState("");
  const [actionOptions, setActionOptions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const resetList = useCallback(() => {
    setError("");
    virtuosoRef.current?.scrollToIndex({ index: 0, behavior: "auto" });
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
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "administrator",
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

      if (["administrator", "superadmin", "technical"].includes(storedRole)) {
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
      const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
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


  const fetchLogs = useCallback(async (pageToLoad = 1, append = false) => {
    if (requestRef.current) return;

    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");

    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/audit-logs`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        params: {
          page: pageToLoad,
          limit: PAGE_SIZE,
          severity,
          search,
          action,
          start_date: startDate,
          end_date: endDate,
        },
        signal: controller.signal,
      });

      const nextLogs = Array.isArray(data.data) ? data.data : [];
      setLogs((previousLogs) =>
        append ? [...previousLogs, ...nextLogs] : nextLogs,
      );
      setTotalLogs(Number(data.total || 0));
      const nextTotalPages = Math.max(1, Number(data.totalPages || 1));
      setTotalPages(nextTotalPages);
      setCurrentPage(pageToLoad);
      loadedPageRef.current = pageToLoad;
      setHasMore(
        typeof data.hasMore === "boolean"
          ? data.hasMore
          : pageToLoad < nextTotalPages,
      );
    } catch (err) {
      if (axios.isCancel(err) || err.name === "CanceledError") return;
      console.error("Audit logs fetch failed:", err);
      setError(err.response?.data?.message || "Failed to fetch audit logs.");
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }, [search, severity, action, startDate, endDate]);

  useEffect(() => {
    const loadActions = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/audit-logs/actions`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        });
        setActionOptions(Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        console.error("Audit log actions fetch failed:", err);
        setActionOptions([]);
      }
    };

    loadActions();
  }, []);

  useEffect(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    setIsRefreshing(false);
    setLogs([]);
    setCurrentPage(1);
    setTotalPages(1);
    setHasMore(false);
    loadedPageRef.current = 0;
    resetList();
    fetchLogs(1);
  }, [severity, search, action, startDate, endDate, fetchLogs, resetList]);

  const goToPage = useCallback(
    (page) => {
      const nextPage = Math.min(Math.max(page, 1), totalPages);
      resetList();
      fetchLogs(nextPage);
    },
    [fetchLogs, resetList, totalPages],
  );

  const handleEndReached = useCallback(() => {
    if (!hasMore || requestRef.current || loadedPageRef.current >= totalPages) {
      return;
    }

    fetchLogs(loadedPageRef.current + 1, true);
  }, [fetchLogs, hasMore, totalPages]);

  const handleRefresh = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    setIsRefreshing(true);
    setLogs([]);
    setCurrentPage(1);
    setTotalPages(1);
    setHasMore(false);
    loadedPageRef.current = 0;
    resetList();
    fetchLogs(1).finally(() => setIsRefreshing(false));
  }, [fetchLogs, resetList]);

  if (hasAccess === null) {
    return <LoadingOverlay open message="Loading..." />;
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
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: "transparent",
        mt: 1,
        p: 2,
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} sx={{ flexShrink: 0 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}
        >
          AUDIT LOGS
        </Typography>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%", flexShrink: 0 }} />

      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}`, flexShrink: 0, mt: 2 }}
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
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 90,
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
                          opacity: 0.7,
                        },
                      }}
                    >
                      {isRefreshing ? "Refreshing..." : "Refresh"}
                    </Button>

                    <Button
                      onClick={() => goToPage(1)}
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
                        goToPage(currentPage - 1)
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
                        onChange={(e) => goToPage(Number(e.target.value))}
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
                        goToPage(currentPage + 1)
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
                      onClick={() => goToPage(totalPages)}
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
      <Paper
        sx={{
          p: 2,
          border: `1px solid ${borderColor}`,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2} sx={{ flexShrink: 0 }}>
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
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>Action</InputLabel>
            <Select
              label="Action"
              value={action}
              onChange={(event) => setAction(event.target.value)}
            >
              <MenuItem value="">All Actions</MenuItem>
              {actionOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: endDate || undefined }}
            sx={{ minWidth: 180 }}
          />
          <TextField
            label="End Date"
            type="date"
            size="small"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: startDate || undefined }}
            sx={{ minWidth: 180 }}
          />
          <Typography sx={{ ml: "auto", fontSize: 13, color: "text.secondary" }}>
            {totalLogs.toLocaleString()} log{totalLogs === 1 ? "" : "s"}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            border: `1px solid ${borderColor}`,
            backgroundColor: "#f8fafc",
            p: 2,
          }}
        >
          {logs.length > 0 && (
            <Virtuoso
              ref={virtuosoRef}
              data={logs}
              computeItemKey={(_, log) => log.log_key}
              endReached={handleEndReached}
              style={{ height: "100%" }}
              itemContent={(index, log) => {
                const severityValue = String(log.severity || "INFO").toUpperCase();
                const severityStyle = severityColors[severityValue] || severityColors.INFO;

                return (
                  <Box
                    sx={{
                      minHeight: "auto",
                      pb: "12px",
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
                        {log.actor_display || log.email || "unknown"}
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
              }}
              components={{
                Footer: () =>
                  loading ? (
                    <Box sx={{ textAlign: "center", py: 2, color: "text.secondary" }}>
                      Loading more audit logs...
                    </Box>
                  ) : null,
              }}
            />
          )}

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
        </Box>
      </Paper>
    </Box>
  );
};

export default AuditLogs;
