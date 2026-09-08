import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Box, Button, CircularProgress, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography,
  useTheme, useMediaQuery,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import axios from "axios";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import API_BASE_URL from "../apiConfig";
import { SettingsContext } from "../App";

const money = (value) =>
  Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

// ─── Mobile fee row ───────────────────────────────────────────────
const FeeRow = ({ label, amount, bold, red, large, borderColor }) => (
  <Box sx={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    py: 0.6, px: 1,
    borderBottom: `1px solid ${borderColor}`,
    backgroundColor: bold ? "#f5f5f5" : "transparent",
    gap: 1,
  }}>
    <Typography sx={{ fontSize: large ? 14 : 12, fontWeight: bold ? 700 : 400, flex: 1, wordBreak: "break-word" }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: large ? 14 : 12, fontWeight: bold ? 700 : 400, color: red ? "red" : "#1a1a1a", ml: 1, whiteSpace: "nowrap" }}>
      {amount}
    </Typography>
  </Box>
);

const StudentBalanceInfo = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const theme = useTheme();

  // Card layout for phones AND small/portrait tablets (< 900px);
  // scrollable table for larger tablets (landscape) and desktop.
  const isCardLayout = useMediaQuery(theme.breakpoints.down("md"));

  const [student, setStudent] = useState(location.state?.student || null);
  const [assessmentRow, setAssessmentRow] = useState(location.state?.assessmentRow || null);
  const [loading, setLoading] = useState(!location.state?.assessmentRow);

  const titleColor = colors.title || "#000";
  const borderColor = colors.border || "#000";

  useEffect(() => {
    if (assessmentRow) return;
    const fetchAssessment = async () => {
      try {
        const personId = localStorage.getItem("person_id");
        if (!personId) return;
        const { data } = await axios.get(`${API_BASE_URL}/api/student-assessment/${personId}`, {
          params: { enrolled_status: 1 },
        });
        setStudent(data.student || null);
        const activeSchoolYearId = searchParams.get("active_school_year_id");
        const schoolYear = searchParams.get("school_year");
        const semester = searchParams.get("semester");
        const match = (data.rows || []).find((row) => {
          if (activeSchoolYearId) return String(row.active_school_year_id || "") === activeSchoolYearId;
          return String(row.school_year || "") === String(schoolYear || "") &&
            String(row.semester || "") === String(semester || "");
        });
        setAssessmentRow(match || null);
      } catch (error) {
        console.error("Failed to fetch student balance info:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAssessment();
  }, [assessmentRow, searchParams]);

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

  const subjects = (assessmentRow?.subjects || []).filter(
    (s) => String(s?.course_code || "").trim() !== ""
  );
  const fees = assessmentRow?.fees || {};

  const totals = useMemo(() => {
    const courseUnits = subjects.reduce((sum, s) => sum + Number(s.course_unit || 0), 0);
    const lectureFees = subjects.reduce((sum, s) => sum + Number(s.lec_fee || 0), 0);
    const labFees = subjects.reduce((sum, s) => sum + Number(s.lab_fee || 0), 0);
    return { courseUnits, lectureFees, labFees };
  }, [subjects]);

  if (loading) return <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}><CircularProgress /></Box>;

  return (
    <Box sx={{ minHeight: "calc(100vh - 150px)", overflowY: "auto", backgroundColor: "transparent", mt: 1, p: { xs: 1, sm: 2 } }}>

      {/* ── Header ── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 1.5 }, mb: 2, flexWrap: "wrap" }}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/student_account_balance")}
          sx={{ textTransform: "none", fontWeight: 700, flexShrink: 0, fontSize: { xs: 12, sm: 14 } }}>
          Back
        </Button>
        <Typography variant="h4" sx={{
          fontWeight: "bold", color: titleColor,
          fontSize: { xs: "16px", sm: "20px", md: "26px", lg: "32px" },
        }}>
          STUDENT BALANCE BREAKDOWN
        </Typography>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />

      {!assessmentRow ? (
        <Paper sx={{ mt: 3, p: 3, border: `1px solid ${borderColor}` }}>
          <Typography>No balance breakdown found for this semester.</Typography>
        </Paper>
      ) : (
        <Paper sx={{ mt: 3, p: { xs: 1.25, sm: 2, md: 3 }, border: `1px solid ${borderColor}`, backgroundColor: "white" }}>

          {/* ── Student info strip ── */}
          <Box sx={{
            display: "flex", flexWrap: "wrap", gap: { xs: 1, sm: 1.5 },
            mb: 2, p: { xs: 1, sm: 2 },
            border: `1px solid ${borderColor}`, borderRadius: "8px",
            backgroundColor: "#fafafa",
          }}>
            {[
              { label: "Student Name", value: student ? `${student.last_name}, ${student.first_name} ${student.middle_name || ""}` : "" },
              { label: "Student No.", value: student?.student_number || "" },
              { label: "Term", value: `${assessmentRow.school_year} - ${Number(assessmentRow.school_year) + 1} / ${assessmentRow.semester}` },
              { label: "Year Level", value: assessmentRow.year_level },
            ].map(({ label, value }) => (
              <Box key={label} sx={{ minWidth: { xs: "45%", sm: "22%" }, flex: "1 1 auto" }}>
                <Typography sx={{ fontWeight: 700, fontSize: { xs: 11, sm: 12 }, color: "#555" }}>{label}</Typography>
                <Typography sx={{ fontSize: { xs: 12, sm: 13 }, wordBreak: "break-word" }}>{value}</Typography>
              </Box>
            ))}
          </Box>

          {/* ── Mobile & small tablet: cards + fee list | Larger tablet/Desktop: table ── */}
          {isCardLayout ? (
            <Box>
              {/* Subject cards */}
              <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 1, color: titleColor }}>Subjects</Typography>
              {subjects.map((subject, index) => (
                <Box key={`${subject.course_id}-${index}`} sx={{
                  border: `1px solid ${borderColor}`, borderRadius: "8px",
                  p: 1.2, mb: 1, backgroundColor: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.3, gap: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{subject.course_code}</Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>
                      {money(Number(subject.lec_fee || 0) + Number(subject.lab_fee || 0))}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 11.5, color: "#555", mb: 0.5, wordBreak: "break-word" }}>{subject.course_description}</Typography>
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <Typography sx={{ fontSize: 11 }}>Units: {Number(subject.course_unit)}</Typography>
                    <Typography sx={{ fontSize: 11 }}>Lec: {money(subject.lec_fee)}</Typography>
                    <Typography sx={{ fontSize: 11 }}>Lab: {money(subject.lab_fee)}</Typography>
                  </Box>
                </Box>
              ))}

              {/* Totals + fees list */}
              <Box sx={{ mt: 2, border: `1px solid ${borderColor}`, borderRadius: "8px", overflow: "hidden" }}>
                <Box sx={{ px: 1, py: 0.8, backgroundColor: headerColor }}>
                  <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 12 }}>Fee Summary</Typography>
                </Box>

                <FeeRow label={`Course Totals (${totals.courseUnits} units)`} amount={money(fees.tuitionFee)} bold borderColor={borderColor} />

                <Box sx={{ px: 1, py: 0.5, backgroundColor: "#f9f9f9" }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 12 }}>Tuition Fee</Typography>
                </Box>
                <FeeRow label="Tuition Fee" amount={money(fees.tuitionFee)} borderColor={borderColor} />
                {Number(fees.nstpFee || 0) > 0 && <FeeRow label="NSTP Fee" amount={money(fees.nstpFee)} borderColor={borderColor} />}
                <FeeRow label="Total Tuition" amount={money(fees.totalTuition)} bold borderColor={borderColor} />

                <Box sx={{ px: 1, py: 0.5, backgroundColor: "#f9f9f9" }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 12 }}>Miscellaneous & Other Fees</Typography>
                </Box>
                {(fees.miscellaneousBreakdown || []).map((fee) => (
                  <FeeRow key={fee.label} label={fee.label} amount={money(fee.amount)} borderColor={borderColor} />
                ))}
                <FeeRow label="Total Miscellaneous Fee" amount={money(fees.miscellaneousFee)} bold borderColor={borderColor} />

                {Number(fees.discountAmount || 0) > 0 && (
                  <>
                    <FeeRow label="Gross Assessment" amount={money(fees.originalGrandTotal)} bold borderColor={borderColor} />
                    <FeeRow label="Discount / Scholarship" amount={`-${money(fees.discountAmount)}`} bold red borderColor={borderColor} />
                  </>
                )}
                <Box sx={{ display: "flex", justifyContent: "space-between", px: 1, py: 1, backgroundColor: "#fff1f1", gap: 1 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 14 }}>Total Assessment</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: 14, color: "red", whiteSpace: "nowrap" }}>{money(fees.grandTotal)}</Typography>
                </Box>
              </Box>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <Table size="small" sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: headerColor }}>
                    {["#", "Course Code", "Description", "Units", "Lec Fee", "Lab Fee", "Total"].map((h) => (
                      <TableCell key={h} sx={{ color: "white", fontWeight: "bold", border: `1px solid ${borderColor}`, textAlign: "center", whiteSpace: "nowrap" }}>{h}</TableCell>
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
                  {subjects.map((subject, index) => (
                    <TableRow key={`${subject.course_id}-${index}`}>
                      <TableCell align="center" sx={{ border: `1px solid ${borderColor}` }}>{index + 1}</TableCell>
                      <TableCell sx={{ border: `1px solid ${borderColor}` }}>{subject.course_code}</TableCell>
                      <TableCell sx={{ border: `1px solid ${borderColor}` }}>{subject.course_description}</TableCell>
                      <TableCell align="center" sx={{ border: `1px solid ${borderColor}` }}>{Number(subject.course_unit).toString()}</TableCell>
                      <TableCell align="right" sx={{ border: `1px solid ${borderColor}` }}>{money(subject.lec_fee)}</TableCell>
                      <TableCell align="right" sx={{ border: `1px solid ${borderColor}` }}>{money(subject.lab_fee)}</TableCell>
                      <TableCell align="right" sx={{ border: `1px solid ${borderColor}` }}>{money(Number(subject.lec_fee || 0) + Number(subject.lab_fee || 0))}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell colSpan={3} align="right" sx={{ border: `1px solid ${borderColor}`, fontWeight: 700 }}>Course Totals</TableCell>
                    <TableCell align="center" sx={{ border: `1px solid ${borderColor}`, fontWeight: 700 }}>{totals.courseUnits}</TableCell>
                    <TableCell align="right" sx={{ border: `1px solid ${borderColor}`, fontWeight: 700 }}>{money(totals.lectureFees)}</TableCell>
                    <TableCell align="right" sx={{ border: `1px solid ${borderColor}`, fontWeight: 700 }}>{money(totals.labFees)}</TableCell>
                    <TableCell align="right" sx={{ border: `1px solid ${borderColor}`, fontWeight: 700 }}>{money(fees.tuitionFee)}</TableCell>
                  </TableRow>
                  <TableRow><TableCell colSpan={7} sx={{ border: `1px solid ${borderColor}`, fontWeight: 700, fontSize: 18 }}>Tuition Fee</TableCell></TableRow>
                  <TableRow>
                    <TableCell colSpan={6} sx={{ border: `1px solid ${borderColor}` }}>Tuition Fee</TableCell>
                    <TableCell align="right" sx={{ border: `1px solid ${borderColor}` }}>{money(fees.tuitionFee)}</TableCell>
                  </TableRow>
                  {Number(fees.nstpFee || 0) > 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ border: `1px solid ${borderColor}` }}>NSTP Fee</TableCell>
                      <TableCell align="right" sx={{ border: `1px solid ${borderColor}` }}>{money(fees.nstpFee)}</TableCell>
                    </TableRow>
                  )}
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell colSpan={6} align="right" sx={{ border: `1px solid ${borderColor}`, fontWeight: 700 }}>Total Tuition</TableCell>
                    <TableCell align="right" sx={{ border: `1px solid ${borderColor}`, fontWeight: 700 }}>{money(fees.totalTuition)}</TableCell>
                  </TableRow>
                  <TableRow><TableCell colSpan={7} sx={{ border: `1px solid ${borderColor}`, fontWeight: 700, fontSize: 18 }}>Miscellaneous and Other Fees</TableCell></TableRow>
                  {(fees.miscellaneousBreakdown || []).map((fee) => (
                    <TableRow key={fee.label}>
                      <TableCell colSpan={6} sx={{ border: `1px solid ${borderColor}` }}>{fee.label}</TableCell>
                      <TableCell align="right" sx={{ border: `1px solid ${borderColor}` }}>{money(fee.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell colSpan={6} align="right" sx={{ border: `1px solid ${borderColor}`, fontWeight: 700 }}>Total Miscellaneous Fee</TableCell>
                    <TableCell align="right" sx={{ border: `1px solid ${borderColor}`, fontWeight: 700 }}>{money(fees.miscellaneousFee)}</TableCell>
                  </TableRow>
                  {Number(fees.discountAmount || 0) > 0 && (
                    <>
                      <TableRow>
                        <TableCell colSpan={6} align="right" sx={{ border: `1px solid ${borderColor}`, fontWeight: 700 }}>Gross Assessment</TableCell>
                        <TableCell align="right" sx={{ border: `1px solid ${borderColor}`, fontWeight: 700 }}>{money(fees.originalGrandTotal)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={6} align="right" sx={{ border: `1px solid ${borderColor}`, fontWeight: 700 }}>Discount / Scholarship</TableCell>
                        <TableCell align="right" sx={{ border: `1px solid ${borderColor}`, fontWeight: 700, color: "red" }}>-{money(fees.discountAmount)}</TableCell>
                      </TableRow>
                    </>
                  )}
                  <TableRow sx={{ backgroundColor: "#fff1f1" }}>
                    <TableCell colSpan={6} align="right" sx={{ border: `1px solid ${borderColor}`, fontWeight: 800, fontSize: 16 }}>Total Assessment</TableCell>
                    <TableCell align="right" sx={{ border: `1px solid ${borderColor}`, fontWeight: 800, color: "red", fontSize: 16 }}>{money(fees.grandTotal)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default StudentBalanceInfo;
