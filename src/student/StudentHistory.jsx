import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
  Alert,
} from "@mui/material";
import API_BASE_URL from "../apiConfig";
import { SettingsContext } from "../App";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatName = (person) => {
  if (!person) return "Student";
  return (
    [person.last_name, person.first_name, person.middle_name]
      .filter(Boolean)
      .join(", ") || "Student"
  );
};

const getEmployeeName = (log = {}) =>
  [log.last_name, log.first_name, log.middle_name]
    .filter(Boolean)
    .join(", ") || log.employee_code || log.employee_id || "System";

const StudentHistory = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const theme = useTheme();

  // Card layout for phones AND small/portrait tablets (< 900px);
  // scrollable table for larger tablets (landscape) and desktop.
  const isCardLayout = useMediaQuery(theme.breakpoints.down("md"));

  const [student, setStudent] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [titleColor, setTitleColor] = useState("#000");
  const [borderColor, setBorderColor] = useState("#000");

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.border) setBorderColor(colors.border);
  }, [settings]);

  useEffect(() => {
    const fetchHistory = async () => {
      const storedRole = localStorage.getItem("role");
      const storedID = localStorage.getItem("person_id");

      if (!storedID) {
        window.location.href = "/login";
        return;
      }

      if (storedRole !== "student") {
        window.location.href = "/login";
        return;
      }

      try {
        setLoading(true);
        setError("");

        const gradeRes = await axios.get(`${API_BASE_URL}/api/student_grade/${storedID}`);
        const gradeRows = Array.isArray(gradeRes.data) ? gradeRes.data : [];
        const studentNumber =
          gradeRows[0]?.student_number ||
          localStorage.getItem("student_number") ||
          localStorage.getItem("studentNumber");

        if (!studentNumber) {
          setError("Unable to find your student number.");
          return;
        }

        const historyRes = await axios.get(
          `${API_BASE_URL}/api/student-history-logs/${studentNumber}`,
        );

        setStudent(historyRes.data?.student || gradeRows[0] || { student_number: studentNumber });
        setLogs(Array.isArray(historyRes.data?.logs) ? historyRes.data.logs : []);
      } catch (err) {
        console.error("Error fetching student history:", err);
        setError(err.response?.data?.message || "Failed to fetch student history logs.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const sortedLogs = useMemo(
    () =>
      [...logs].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime() || 0;
        const dateB = new Date(b.created_at).getTime() || 0;
        return dateB - dateA;
      }),
    [logs],
  );


  return (
    <Box sx={{ minHeight: "calc(100vh - 150px)", overflowY: "auto", backgroundColor: "transparent", mt: 1, p: { xs: 1, sm: 2 } }}>

      {/* ── Header ── */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: { xs: "18px", sm: "24px", md: "30px", lg: "36px" } }}>
         STUDENT HISTORY LOGS
        </Typography>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      <Paper sx={{ mt: 3, p: { xs: 1.25, sm: 2, md: 3 }, border: `1px solid ${borderColor}`, minHeight: "75vh", backgroundColor: "white" }}>

        {/* ── Announcement ── */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography sx={{ fontSize: { xs: "14px", sm: "18px", md: "22px", lg: "24px" }, textDecoration: "underline" }}>
            Announcement :
          </Typography>
          <Typography sx={{ fontSize: { xs: "12.5px", sm: "16px", md: "20px", lg: "22px" }, mt: 1, px: { xs: 1, sm: 0 } }}>
            This page shows a record of actions taken on your student account.
            If you notice anything unfamiliar, please report it to the REGISTRAR'S OFFICE.
          </Typography>
        </Box>

        {/* ── Student Info ── */}
        <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", mb: 2, px: { xs: 0, sm: 2 }, gap: { xs: 0.5, sm: 1 } }}>
          <Box sx={{ display: "flex", gap: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: "bold", fontSize: { xs: 12.5, sm: 15 }, whiteSpace: "nowrap" }}>Student Name :</Typography>
            <Typography sx={{ fontSize: { xs: 12.5, sm: 15 }, wordBreak: "break-word" }}>
              {formatName(student)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: "bold", fontSize: { xs: 12.5, sm: 15 }, whiteSpace: "nowrap" }}>Student No. :</Typography>
            <Typography sx={{ fontSize: { xs: 12.5, sm: 15 } }}>{student?.student_number || "N/A"}</Typography>
          </Box>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{
              borderRadius: 2,
              mb: 3,
              mx: { xs: 0, sm: 2 },
            }}
          >
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography sx={{ color: "#888", fontSize: 14 }}>Loading history logs...</Typography>
          </Box>
        )}

        {/* ── Mobile & small tablet: cards | Larger tablet/Desktop: table ── */}
        {!loading && !error && (isCardLayout ? (
          <Box>
            {sortedLogs.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography sx={{ color: "#888", fontSize: 14 }}>No history logs found.</Typography>
              </Box>
            ) : (
              sortedLogs.map((log) => (
                <Box key={log.id} sx={{
                  border: `1px solid ${borderColor}`,
                  borderLeft: `5px solid ${headerColor}`,
                  borderRadius: "8px", p: 1.5, mb: 1.5,
                  backgroundColor: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}>
                  {/* Date/time */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                    <AccessTimeIcon sx={{ fontSize: 14, color: "#555" }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 12.5, color: "#555" }}>
                      {formatDate(log.created_at)}
                    </Typography>
                  </Box>

                  {/* Message */}
                  <Typography sx={{ fontSize: 13, color: "#111827", lineHeight: 1.5, mb: 0.8 }}>
                    {log.message || "No message provided."}
                  </Typography>

                  {/* Recorded by */}
                  <Box sx={{
                    display: "flex", alignItems: "center", gap: 0.5,
                    pt: 0.8, borderTop: `1px solid ${borderColor}`,
                  }}>
                    <PersonOutlineIcon sx={{ fontSize: 14, color: "#555" }} />
                    <Typography sx={{ fontSize: 11.5, color: "#555" }}>
                      Recorded by: {getEmployeeName(log)}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}

            {/* Total logs strip */}
            <Box sx={{
              display: "flex", justifyContent: "space-between",
              px: 1.5, py: 1, mt: 1, gap: 1,
              borderRadius: "8px", backgroundColor: "#fff1f1",
              border: `1px solid ${borderColor}`,
              flexWrap: "wrap",
            }}>
              <Typography sx={{ fontWeight: "bold", fontSize: { xs: 12.5, sm: 14 } }}>Total Records :</Typography>
              <Typography sx={{ fontWeight: "bold", color: "red", fontSize: { xs: 12.5, sm: 14 } }}>{sortedLogs.length}</Typography>
            </Box>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <Table sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: headerColor }}>
                  {["Date/Time", "Message", "Recorded By"].map((h) => (
                    <TableCell key={h} sx={{ color: "white", fontWeight: "bold", border: `1px solid ${borderColor}`, textAlign: "center", padding: "6px", whiteSpace: "nowrap" }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody
                sx={{
                  border: `1px solid ${borderColor}`,
                  "& .MuiTableRow-root:nth-of-type(odd)": {
                    backgroundColor: "#ffffff",
                  },
                  "& .MuiTableRow-root:nth-of-type(even)": {
                    backgroundColor: "lightgray",
                  },
                }}
              >
                {sortedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ border: `1px solid ${borderColor}`, py: 4 }}>
                      No history logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell sx={{ border: `1px solid ${borderColor}`, whiteSpace: "nowrap" }}>
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell sx={{ border: `1px solid ${borderColor}`, whiteSpace: "pre-line" }}>
                        {log.message || "No message provided."}
                      </TableCell>
                      <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                        {getEmployeeName(log)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow>
                  <TableCell colSpan={2} align="right" sx={{ fontWeight: "bold", border: `1px solid ${borderColor}`, fontSize: "16px" }}>
                    Total Records :
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold", color: "red", fontSize: "16px", border: `1px solid ${borderColor}` }}>
                    {sortedLogs.length}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ))}
      </Paper>
    </Box>
  );
};

export default StudentHistory;
