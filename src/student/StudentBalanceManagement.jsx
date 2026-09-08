import React, { useEffect, useState, useContext } from "react";
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button,
  useTheme, useMediaQuery, Alert,
} from "@mui/material";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import { SettingsContext } from "../App";
import { useNavigate } from "react-router-dom";
import SchoolIcon from "@mui/icons-material/School";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CreditCardIcon from "@mui/icons-material/CreditCard";

const fmt = (val) =>
  Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

const ProgramPayment = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const navigate = useNavigate();
  const theme = useTheme();

  // Card layout for phones AND small/portrait tablets (< 900px);
  // scrollable table for larger tablets (landscape) and desktop.
  const isCardLayout = useMediaQuery(theme.breakpoints.down("md"));

  const [assessmentData, setAssessmentData] = useState([]);
  const [student, setStudent] = useState(null);
  const [isOfficiallyEnrolled, setIsOfficiallyEnrolled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [titleColor, setTitleColor] = useState("#000");
  const [borderColor, setBorderColor] = useState("#000");

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.border) setBorderColor(colors.border);
  }, [settings]);

  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const person_id = localStorage.getItem("person_id");
        if (!person_id) return;
        const response = await axios.get(`${API_BASE_URL}/api/student-assessment/${person_id}`, {
          params: { enrolled_status: 1 },
        });
        if (!response.data.success) { console.error(response.data.error); return; }
        setStudent(response.data.student || null);
        const rows = response.data.rows || [];
        setIsOfficiallyEnrolled(rows.length > 0);
        setAssessmentData(
          rows.map((row) => ({
            ...row,
            enrolled_status: Number(row.enrolled_status || 0),
            school_year: row.school_year || "",
            semester: row.semester || "",
            year_level: row.year_level || "",
            scholarship: row.scholarship || "",
            payment_type: row.payment_type || "",
            payment_status: row.payment_status || "",
            assessment: Number(row.assessment ?? row.fees?.grandTotal ?? 0),
            payment: Number(row.payment ?? 0),
            balance: Number(row.balance ?? row.fees?.grandTotal ?? 0),
          }))
        );
      } catch (error) {
        console.error("FULL ERROR:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAssessment();
  }, []);

  // 🔒 Disable right-click + block DevTools shortcuts (properly scoped with cleanup,
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

  const grandTotal = assessmentData.reduce((sum, row) => sum + Number(row.balance || 0), 0);

  const handleRowClick = (row) => {
    const params = new URLSearchParams({
      school_year: String(row.school_year || ""),
      semester: String(row.semester || ""),
      active_school_year_id: String(row.active_school_year_id || ""),
    });
    navigate(`/student_account_balance/info?${params.toString()}`, {
      state: { assessmentRow: row, student },
    });
  };


  return (
    <Box sx={{ minHeight: "calc(100vh - 150px)", overflowY: "auto", backgroundColor: "transparent", mt: 1, p: { xs: 1, sm: 2 } }}>

      {/* ── Header ── */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: { xs: "18px", sm: "24px", md: "30px", lg: "36px" } }}>
          STUDENT ACCOUNT BALANCE
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
            Accounts/Balance reflected in the system are subject for correction
            or adjustment at the STUDENTS ACCOUNT SECTION.
          </Typography>
        </Box>

        {/* ── Student Info ── */}
        <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", mb: 2, px: { xs: 0, sm: 2 }, gap: { xs: 0.5, sm: 1 } }}>
          <Box sx={{ display: "flex", gap: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: "bold", fontSize: { xs: 12.5, sm: 15 }, whiteSpace: "nowrap" }}>Student Name :</Typography>
            <Typography sx={{ fontSize: { xs: 12.5, sm: 15 }, wordBreak: "break-word" }}>
              {student ? `${student.last_name}, ${student.first_name}` : ""}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: "bold", fontSize: { xs: 12.5, sm: 15 }, whiteSpace: "nowrap" }}>Student No. :</Typography>
            <Typography sx={{ fontSize: { xs: 12.5, sm: 15 } }}>{student?.student_number}</Typography>
          </Box>
        </Box>

        {/* ── Mobile & small tablet: cards | Larger tablet/Desktop: table ── */}
        {!loading && !isOfficiallyEnrolled && (
          <Alert
            severity="warning"
            sx={{
              borderRadius: 2,
              mb: 3,
              mx: { xs: 0, sm: 2 },
              border: "1px solid #f59e0b",
              backgroundColor: "#fffbeb",
              color: "#7c2d12",
              "& .MuiAlert-icon": { color: "#d97706" },
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: { xs: 14, sm: 16 }, mb: 0.5 }}>
              Student Account Balance is only available for officially enrolled students.
            </Typography>
            <Typography sx={{ fontSize: { xs: 12.5, sm: 14 } }}>
              Your account balance will be displayed once your enrollment status is marked as officially enrolled.
            </Typography>
          </Alert>
        )}

        {loading && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography sx={{ color: "#888", fontSize: 14 }}>Loading account balance...</Typography>
          </Box>
        )}

        {!loading && isOfficiallyEnrolled && (isCardLayout ? (
          <Box>
            {assessmentData.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography sx={{ color: "#888", fontSize: 14 }}>No assessment records found.</Typography>
              </Box>
            ) : (
              assessmentData.map((row, index) => (
                <Box key={index} sx={{
                  border: `1px solid ${borderColor}`,
                  borderLeft: `5px solid ${headerColor}`,
                  borderRadius: "8px", p: 1.5, mb: 1.5,
                  backgroundColor: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                }}>
                  {/* School year + semester link */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5, gap: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                      {row.school_year} - {Number(row.school_year) + 1}
                    </Typography>
                    <Button variant="text" onClick={() => handleRowClick(row)} sx={{
                      color: "#b22222", fontWeight: 700, textTransform: "none",
                      textDecoration: "underline", p: 0, minWidth: "auto", fontSize: 13,
                    }}>
                      {row.semester}
                    </Button>
                  </Box>

                  {/* ── Info chips (MUI icons replacing emojis) ── */}
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", mb: 0.8 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <SchoolIcon sx={{ fontSize: 14, color: "#555" }} />
                      <Typography sx={{ fontSize: 11.5, color: "#555" }}>{row.year_level}</Typography>
                    </Box>
                    {row.scholarship && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <EmojiEventsIcon sx={{ fontSize: 14, color: "#555" }} />
                        <Typography sx={{ fontSize: 11.5, color: "#555" }}>{row.scholarship}</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
                      <CreditCardIcon sx={{ fontSize: 14, color: "#555", flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 11.5, color: "#555", wordBreak: "break-word" }}>
                        {row.payment_type ? `${row.payment_type} - ${row.payment_status}` : "TOTAL AMOUNT DUE"}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", gap: 1, justifyContent: "space-between", pt: 0.8, borderTop: `1px solid ${borderColor}` }}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography sx={{ fontSize: 10, color: "#888", fontWeight: 600 }}>ASSESSMENT</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{fmt(row.assessment)}</Typography>
                    </Box>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography sx={{ fontSize: 10, color: "#888", fontWeight: 600 }}>PAYMENT</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{fmt(row.payment)}</Typography>
                    </Box>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography sx={{ fontSize: 10, color: "#888", fontWeight: 600 }}>BALANCE</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: "red" }}>{fmt(row.balance)}</Typography>
                    </Box>
                  </Box>
                </Box>
              ))
            )}

            {/* Grand total strip */}
            <Box sx={{
              display: "flex", justifyContent: "space-between",
              px: 1.5, py: 1, mt: 1, gap: 1,
              borderRadius: "8px", backgroundColor: "#fff1f1",
              border: `1px solid ${borderColor}`,
              flexWrap: "wrap",
            }}>
              <Typography sx={{ fontWeight: "bold", fontSize: { xs: 12.5, sm: 14 } }}>Grand Total Balance/(Refund) :</Typography>
              <Typography sx={{ fontWeight: "bold", color: "red", fontSize: { xs: 12.5, sm: 14 } }}>{fmt(grandTotal)}</Typography>
            </Box>
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <Table sx={{ minWidth: 960 }}>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#990000" }}>
                  {["School Year", "Semester", "Year Level", "Scholarship", "Payment Description", "O.R. Date", "O.R. No.", "Assessment", "Payment", "Balance"].map((h) => (
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
                {assessmentData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ border: `1px solid ${borderColor}`, py: 4 }}>
                      No assessment records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  assessmentData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ border: `1px solid ${borderColor}` }}>{row.school_year} - {Number(row.school_year) + 1}</TableCell>
                      <TableCell sx={{ border: `1px solid ${borderColor}`, color: "#b22222" }}>
                        <Button variant="text" onClick={() => handleRowClick(row)}
                          sx={{ color: "#b22222", fontWeight: 700, textTransform: "none", textDecoration: "underline", p: 0, minWidth: "auto" }}>
                          {row.semester}
                        </Button>
                      </TableCell>
                      <TableCell sx={{ border: `1px solid ${borderColor}` }}>{row.year_level}</TableCell>
                      <TableCell sx={{ border: `1px solid ${borderColor}` }}>{row.scholarship || ""}</TableCell>
                      <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                        {row.payment_type ? `${row.payment_type} - ${row.payment_status}` : "TOTAL AMOUNT DUE"}
                      </TableCell>
                      <TableCell sx={{ border: `1px solid ${borderColor}` }}>{row.or_date || ""}</TableCell>
                      <TableCell sx={{ border: `1px solid ${borderColor}` }}>TOTAL AMOUNT DUE</TableCell>
                      <TableCell align="right" sx={{ border: `1px solid ${borderColor}` }}>{fmt(row.assessment)}</TableCell>
                      <TableCell align="right" sx={{ border: `1px solid ${borderColor}` }}>{fmt(row.payment)}</TableCell>
                      <TableCell align="right" sx={{ border: `1px solid ${borderColor}` }}>{fmt(row.balance)}</TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow>
                  <TableCell colSpan={9} align="right" sx={{ fontWeight: "bold", border: `1px solid ${borderColor}`, fontSize: "16px" }}>
                    Grand Total Balance/(Refund) :
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold", color: "red", fontSize: "16px", border: `1px solid ${borderColor}` }}>
                    {fmt(grandTotal)}
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

export default ProgramPayment;
