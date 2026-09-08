import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import { Virtuoso } from "react-virtuoso";
import API_BASE_URL from "../apiConfig";
import { getAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const PRINTING_APPLICANT_ACTION = "PRINTING_APPLICANT_DOCS";
const PRINTING_STUDENT_ACTION = "PRINTING_STUDENT_DOCS";
const DOWNLOAD_EXAM_PDF_ACTION = "DOWNLOAD_EXAM_PDF";
const PAGE_SIZE = 30;

const severityDotColors = {
  INFO: "#38bdf8",
  WARN: "#f59e0b",
  WARNING: "#f59e0b",
  ERROR: "#ef4444",
  CRITICAL: "#dc2626",
};

const formatHistoryTimestamp = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
};

const getCurrentEmployeeId = (employeeId) =>
  String(
    employeeId ||
      localStorage.getItem("employee_id") ||
      "",
  ).trim();

const sortNewestFirst = (items) =>
  [...items].sort((a, b) => {
    const timeDiff = new Date(b.timestamp) - new Date(a.timestamp);
    if (timeDiff !== 0) return timeDiff;
    return String(b.log_key || "").localeCompare(String(a.log_key || ""));
  });

const HistoryLogCard = ({ log, actorEmployeeId }) => {
  const severityValue = String(log.severity || "INFO").toUpperCase();
  const severityColor =
    severityDotColors[severityValue] || severityDotColors.INFO;

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        px: 2.25,
        py: 1.75,
        mb: 1.75,
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          alignSelf: "flex-start",
        }}
      >
        <Tooltip title={`Severity: ${severityValue}`} arrow>
          <Box
            component="span"
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: severityColor,
              flexShrink: 0,
              boxShadow: `0 0 0 3px ${severityColor}22`,
            }}
          />
        </Tooltip>
        <Typography
          sx={{
            fontSize: "0.85rem",
            fontWeight: 700,
            color: "#0f172a",
            letterSpacing: "0.01em",
          }}
        >
          {log.email || actorEmployeeId || "unknown"}
        </Typography>
      </Box>

      <Typography
        sx={{
          fontSize: "0.95rem",
          lineHeight: 1.55,
          textAlign: "justify",
          color: "#334155",
          whiteSpace: "pre-line",
          wordBreak: "break-word",
          px: 0.5,
        }}
      >
        {log.message || "—"}
      </Typography>

      <Typography
        sx={{
          fontSize: "0.78rem",
          color: "#64748b",
          alignSelf: "flex-end",
        }}
      >
        {formatHistoryTimestamp(log.timestamp)}
      </Typography>
    </Box>
  );
};

const PrintingHistoryDialog = ({
  buttonLabel = "View Printing History",
  employeeId = "",
  action = PRINTING_APPLICANT_ACTION,
  title = "My Printing History",
  disabled = false,
}) => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const requestRef = useRef(false);
  const actorEmployeeId = getCurrentEmployeeId(employeeId);
  const historyAction = String(action || PRINTING_APPLICANT_ACTION).trim();

  const fetchLogs = useCallback(
    async ({ pageToLoad = 1, replace = false } = {}) => {
      if (requestRef.current) return;
      if (!replace && !hasMore) return;

      const safeActorId = getCurrentEmployeeId(employeeId);
      if (!safeActorId) {
        setLogs([]);
        setError("No employee ID found for the current user.");
        setHasMore(false);
        return;
      }

      requestRef.current = true;
      if (replace) {
        setLoading(true);
        setError("");
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await axios.get(`${API_BASE_URL}/api/audit-logs`, {
          params: {
            action: historyAction,
            actor_id: safeActorId,
            limit: PAGE_SIZE,
            page: pageToLoad,
          },
          headers: getAuditHeaders(),
        });

        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        const filtered = rows.filter(
          (row) =>
            String(row.action || "").trim() === historyAction &&
            String(row.email || "").trim() === safeActorId,
        );

        setLogs((prev) => {
          if (replace) return sortNewestFirst(filtered);
          const seen = new Set(prev.map((item) => item.log_key));
          return sortNewestFirst([
            ...prev,
            ...filtered.filter((item) => !seen.has(item.log_key)),
          ]);
        });
        setHasMore(Boolean(res.data?.hasMore));
        setPage(pageToLoad + 1);

        if (replace && !filtered.length) {
          setError(`No history found for employee ${safeActorId}.`);
        }
      } catch (err) {
        console.error("Failed to load printing history:", err);
        if (replace) {
          setLogs([]);
          setError("Failed to load printing history.");
        }
        setHasMore(false);
      } finally {
        requestRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [employeeId, hasMore, historyAction],
  );

  useEffect(() => {
    if (!open) return;
    setLogs([]);
    setPage(1);
    setHasMore(true);
    setError("");
    fetchLogs({ pageToLoad: 1, replace: true });
  }, [open, employeeId, historyAction]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || loadingMore || requestRef.current) return;
    fetchLogs({ pageToLoad: page, replace: false });
  }, [fetchLogs, hasMore, loading, loadingMore, page]);

  return (
    <>
      <Button
        variant="contained"
        startIcon={<HistoryIcon />}
        disabled={disabled || !actorEmployeeId}
        onClick={() => setOpen(true)}
        sx={{
          backgroundColor: headerColor,
          color: "#fff",
          textTransform: "none",
          fontWeight: 700,
          borderRadius: "10px",
          "&:hover": { backgroundColor: headerColor, opacity: 0.9 },
        }}
      >
        {buttonLabel}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: headerColor,
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: "bold",
            px: 3,
            py: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: "50%",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <HistoryIcon />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
                {title}
              </Typography>
              <Typography sx={{ fontSize: "0.8rem", opacity: 0.9 }}>
                Action: {historyAction}
                {actorEmployeeId ? ` · Employee ID ${actorEmployeeId}` : ""}
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setOpen(false)}
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

        <DialogContent dividers sx={{ px: 3, py: 2.5, backgroundColor: "#f8fafc" }}>
          {loading && !logs.length ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress sx={{ color: headerColor }} />
            </Box>
          ) : error && !logs.length ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
              {error}
            </Typography>
          ) : (
            <Box sx={{ height: "55vh" }}>
              <Virtuoso
                style={{ height: "100%" }}
                data={logs}
                endReached={loadMore}
                overscan={200}
                itemContent={(index, log) => (
                  <HistoryLogCard
                    log={log}
                    actorEmployeeId={actorEmployeeId}
                  />
                )}
                components={{
                  Footer: () =>
                    loadingMore ? (
                      <Box display="flex" justifyContent="center" py={1.5}>
                        <CircularProgress size={22} sx={{ color: headerColor }} />
                      </Box>
                    ) : !hasMore && logs.length > 0 ? (
                      <Typography
                        sx={{
                          textAlign: "center",
                          color: "#94a3b8",
                          fontSize: "0.8rem",
                          py: 1,
                        }}
                      >
                        End of history
                      </Typography>
                    ) : null,
                }}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            color="error"
            variant="outlined"
            onClick={() => setOpen(false)}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PrintingHistoryDialog;
export { PRINTING_APPLICANT_ACTION, PRINTING_STUDENT_ACTION, DOWNLOAD_EXAM_PDF_ACTION };
