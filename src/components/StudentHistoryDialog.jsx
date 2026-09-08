import React, { useContext, useEffect, useState } from "react";
import { SettingsContext } from "../App";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import { fetchStudentHistoryDetails } from "../utils/studentHistoryLogs";

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
  });
};

const StudentHistoryDialog = ({
  studentNumber,
  buttonLabel = "View History",
  disabled = false,
}) => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [error, setError] = useState("");

  const formatValue = (value) => {
    const safeValue = String(value || "").trim();
    return safeValue || "-";
  };

  const renderOriginalCurriculum = () => {
  const entries = Array.isArray(studentInfo?.original_curriculum_entries)
    ? studentInfo.original_curriculum_entries
    : [];

  if (!entries.length) {
    return formatValue(studentInfo?.original_curriculum);
  }

  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      {entries.map((entry, index) => (
        <Box key={`${entry.curriculum_id || entry.program_id || index}-${index}`}>
          <Typography sx={{ fontSize: 14, color: "#333" }}>
            {formatValue(entry.label)}
          </Typography>
          {entry.department_label && (
            <Typography sx={{ fontSize: 12, color: "#555", fontWeight: 600 }}>
              {entry.department_label}
            </Typography>
          )}
          <Typography sx={{ fontSize: 12, color: "#666" }}>
            {formatHistoryTimestamp(entry.created_at)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};
  const infoRows = studentInfo
    ? [
        ["First Name", studentInfo.first_name],
        ["Middle Name", studentInfo.middle_name],
        ["Last Name", studentInfo.last_name],

        ["Email Address", studentInfo.emailAddress],
        ["Student Number", studentInfo.student_number],
        [
          "Year Level",
          studentInfo.year_level_description || studentInfo.year_level_id,
        ],

        ["Scholarship/Discount", studentInfo.scholarship_discount],
        ["Enrollment Date", formatHistoryTimestamp(studentInfo.created_at)],
        ["Current Curriculum", studentInfo.current_curriculum],

        ["Current Department", studentInfo.current_department],
      ]
    : [];

  const loadLogs = async () => {
    const safeStudentNumber = String(studentNumber || "").trim();
    if (!safeStudentNumber) {
      setError("Enter a student number first.");
      setLogs([]);
      setStudentInfo(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { student, logs: rows } =
        await fetchStudentHistoryDetails(safeStudentNumber);
      setStudentInfo(student);
      setLogs(rows);
      if (!rows.length) {
        setError("No student history logs found for this student.");
      }
    } catch (err) {
      console.error("Failed to load student history logs:", err);
      setLogs([]);
      setStudentInfo(null);
      setError("Failed to load student history logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadLogs();
  }, [open, studentNumber]);

  const handleOpen = () => {
    if (!String(studentNumber || "").trim()) return;
    setOpen(true);
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<HistoryIcon />}
        disabled={disabled || !String(studentNumber || "").trim()}
        onClick={handleOpen}
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
            maxWidth: "calc(900px + 15rem)",
          },
        }}
      >
        {/* Flat themed header, consistent with the rest of the Student Numbering dialogs */}
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
              <HistoryIcon fontSize="small" sx={{ color: "white" }} />
            </Box>
            <Box>
              <Typography
                fontWeight="bold"
                fontSize={16}
                color="white"
                lineHeight={1.2}
              >
                Student History Logs
              </Typography>
              <Typography
                fontSize={12}
                color="rgba(255,255,255,0.8)"
                lineHeight={1.2}
              >
                {studentNumber
                  ? `Student Number: ${studentNumber}`
                  : "Activity timeline"}
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

        <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={28} sx={{ color: headerColor }} />
            </Box>
          ) : (
            <>
              {studentInfo && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: "10px",
                    backgroundColor: `${headerColor}0D`,
                    border: `1px solid ${headerColor}33`,
                  }}
                >
                  <Typography sx={{ fontWeight: 700, mb: 1.5, color: "#222" }}>
                    Student Information
                  </Typography>
                  <Grid container spacing={1.5}>
                    {infoRows.map(([label, value]) => (
                      <Grid item xs={12} sm={4} key={label}>
                        <Typography
                          sx={{
                            fontSize: 11,
                            color: headerColor,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                          }}
                        >
                          {label}
                        </Typography>
                        <Typography sx={{ fontSize: 14, color: "#333" }}>
                          {formatValue(value)}
                        </Typography>
                      </Grid>
                    ))}
                    {studentInfo && (
                      <Grid item xs={12} sm={8} key="Original Curriculum">
                        <Typography
                          sx={{
                            fontSize: 11,
                            color: headerColor,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                          }}
                        >
                          Academic History
                        </Typography>
                        {renderOriginalCurriculum()}
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              )}

              <Divider sx={{ mb: 2 }} />

              {error ? (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: "8px",
                    backgroundColor: "#ffebee",
                    border: "1px solid #ef9a9a",
                  }}
                >
                  <Typography fontSize={13} color="#c62828">
                    {error}
                  </Typography>
                </Box>
              ) : (
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ borderRadius: "10px", overflow: "hidden" }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                        <TableCell
                          sx={{ fontWeight: 700, width: 180, color: "#333" }}
                        >
                          Date
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#333" }}>
                          Activity
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow
                          key={log.id}
                          sx={{
                            "&:hover": { backgroundColor: `${headerColor}0A` },
                          }}
                        >
                          <TableCell
                            sx={{
                              verticalAlign: "top",
                              whiteSpace: "nowrap",
                              color: "#666",
                              fontSize: 13,
                            }}
                          >
                            {formatHistoryTimestamp(log.created_at)}
                          </TableCell>
                          <TableCell
                            sx={{
                              verticalAlign: "top",
                              fontSize: 13,
                              color: "#333",
                            }}
                          >
                            {log.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
          <Button
            onClick={() => setOpen(false)}
            color="error"
            variant="outlined"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StudentHistoryDialog;
