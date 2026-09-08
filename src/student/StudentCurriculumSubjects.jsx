import React, { useEffect, useState, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import API_BASE_URL from "../apiConfig";

import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import SchoolIcon from "@mui/icons-material/School";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ScienceIcon from "@mui/icons-material/Science";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

// ─── Term Sorting (API-driven, same approach as StudentGradePage) ──
const ordinalSuffix = (n) => {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

const parseTerm = (term) => {
  const parts = String(term || "").split(" ");
  const yearLabel = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : term;
  const semesterLabel = parts.slice(2).join(" ");
  return { yearLabel, semesterLabel };
};

const sortTerms = (terms, yearOrder, semesterOrder) =>
  [...terms].sort((a, b) => {
    const tA = parseTerm(a);
    const tB = parseTerm(b);
    const yA = yearOrder[tA.yearLabel] || 0;
    const yB = yearOrder[tB.yearLabel] || 0;
    if (yA !== yB) return yB - yA;
    return (
      (semesterOrder[tB.semesterLabel] || 0) -
      (semesterOrder[tA.semesterLabel] || 0)
    );
  });

const formatAcademicYear = (year) => {
  if (!year) return "";
  if (typeof year === "string" && year.includes("-")) return year;
  const startYear = Number(year);
  if (isNaN(startYear)) return "";
  return `${startYear}-${startYear + 1}`;
};
const formatUnit = (value) => {
  if (value === null || value === undefined) return "0";
  const num = Number(value);
  if (isNaN(num)) return "0";
  return num.toString();
};

// ─── Mobile / tablet subject card ──────────────────────────────────
const MobileSubjectCard = ({
  row,
  index,
  borderColor,
  titleColor,
  subtitleColor,
}) => (
  <Box
    sx={{
      border: `1px solid ${borderColor}`,
      borderRadius: "8px",
      p: { xs: 1.5, sm: 2 },
      mb: 1.5,
      backgroundColor: index % 2 === 0 ? "#ffffff" : "lightgray",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}
  >
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        mb: 0.5,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: { xs: 13, sm: 14 },
            color: titleColor,
            mb: 0.2,
          }}
        >
          {row.course_code}
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: 11.5, sm: 13 },
            color: subtitleColor,
            lineHeight: 1.3,
          }}
        >
          {row.course_description}
        </Typography>
      </Box>
      {/* Units badge */}
      <Box
        sx={{
          ml: 1,
          flexShrink: 0,
          px: 1,
          py: 0.3,
          borderRadius: "6px",
          backgroundColor: "#f0f4ff",
          border: `1px solid #c7d4f0`,
          textAlign: "center",
        }}
      >
        <Typography
          sx={{
            fontSize: { xs: 10, sm: 11 },
            color: "#444",
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {formatUnit(row.course_unit)} unit
          {formatUnit(row.course_unit) !== "1" ? "s" : ""}
        </Typography>
      </Box>
    </Box>

    <Box sx={{ display: "flex", flexWrap: "wrap", gap: "5px 14px", mt: 0.8 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <MenuBookIcon sx={{ fontSize: { xs: 13, sm: 15 }, color: "#000" }} />
        <Typography sx={{ fontSize: { xs: 11, sm: 12.5 }, color: "#000" }}>
          Lec: {formatUnit(row.lec_unit)}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <ScienceIcon sx={{ fontSize: { xs: 13, sm: 15 }, color: "#000" }} />
        <Typography sx={{ fontSize: { xs: 11, sm: 12.5 }, color: "#000" }}>
          Lab: {formatUnit(row.lab_unit)}
        </Typography>
      </Box>
      {row.schedule && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <AccessTimeIcon
            sx={{ fontSize: { xs: 13, sm: 15 }, color: "#000" }}
          />
          <Typography
            sx={{
              fontSize: { xs: 11, sm: 12.5 },
              color: "#000",
              whiteSpace: "pre-line",
            }}
          >
            {row.schedule}
          </Typography>
        </Box>
      )}
    </Box>
  </Box>
);

// ─── Main Component ───────────────────────────────────────────────
const StudentCurriculumSubjects = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const theme = useTheme();
  // Card layout for phones + small/medium tablets, table layout from
  // tablet-landscape / small-laptop (md) up. Driven by MUI's breakpoint
  // system instead of a manual window.innerWidth resize listener, so it
  // stays in sync with every other responsive value on the page.
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
  }, [settings]);

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const storedID = localStorage.getItem("person_id");
    if (!storedID) {
      window.location.href = "/login";
      return;
    }
    fetchSubjects(storedID);
  }, []);

  const fetchSubjects = async (id) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/student/${id}/curriculum-subjects`,
      );
      setSubjects(res.data);

      // ADD THIS
      const curriculumId =
        res.data[0]?.curriculum_id ?? res.data[0]?.program ?? null;
      setDepartment(await resolveDepartmentByCurriculum(curriculumId));
    } catch (err) {
      console.error(err);
      setMessage("Failed to fetch curriculum subjects");
    } finally {
      setLoading(false);
    }
  };

  const [department, setDepartment] = useState("");

  const resolveDepartmentByCurriculum = async (curriculumId) => {
    if (!curriculumId) return "";
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/department_by_curriculum/${curriculumId}`,
      );
      return res.data?.dprtmnt_name || "";
    } catch (error) {
      console.error("Error resolving department by curriculum:", error);
      return "";
    }
  };

  // ─── Year Levels / Semesters (fetched from API, same as StudentGradePage) ──
  const [yearLevelList, setYearLevelList] = useState([]);
  const [semesterList, setSemesterList] = useState([]);

  useEffect(() => {
    fetchYearLevels();
    fetchSemesters();
  }, []);

  const fetchYearLevels = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/year-levels`);
      setYearLevelList(res.data);
    } catch (err) {
      console.error("Error fetching year levels:", err);
    }
  };

  const fetchSemesters = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/semesters`);
      setSemesterList(res.data);
    } catch (err) {
      console.error("Error fetching semesters:", err);
    }
  };

  const yearOrder = yearLevelList.reduce((acc, yl) => {
    acc[yl.year_level_description] = yl.year_level_id;
    return acc;
  }, {});

  const semesterOrder = semesterList.reduce((acc, s) => {
    acc[s.semester_description] = s.semester_id;
    return acc;
  }, {});

  const yearLabelMap = yearLevelList.reduce((acc, yl) => {
    acc[yl.year_level_description] =
      yl.level_type === "year"
        ? `${yl.year_level_id}${ordinalSuffix(yl.year_level_id)} Year`
        : yl.year_level_description;
    return acc;
  }, {});

  const formatYearLabel = (year) => yearLabelMap[year] || year;

  const formatSchoolYearRange = (subject) => {
    if (subject?.school_year) return String(subject.school_year);
    if (subject?.sy_label) return String(subject.sy_label);
    if (subject?.school_year_description)
      return String(subject.school_year_description);

    const startYear = parseInt(subject?.year_description, 10);
    if (Number.isFinite(startYear) && startYear > 0) {
      return `${startYear}-${startYear + 1}`;
    }
    return "";
  };

  // document.addEventListener("contextmenu", (e) => e.preventDefault());

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

  const rawTerms = [
    ...new Set(
      subjects.map(
        (row) => `${row.year_level_description} ${row.semester_description}`,
      ),
    ),
  ];
  const sortedTerms = sortTerms(rawTerms, yearOrder, semesterOrder);
  const headerBg = headerColor || "#800000";
  const programInfo = subjects[0];

  const headCell = {
    backgroundColor: headerBg,
    color: "#fff",
    fontWeight: 600,
    fontSize: { md: 11, lg: 12 },
    textTransform: "uppercase",
    border: `1px solid ${borderColor}`,
  };
  const colStyle = {
    border: `1px solid ${borderColor}`,
    fontSize: { md: 12, lg: 13 },
    wordWrap: "break-word",
    overflowWrap: "break-word",
    whiteSpace: "normal",
  };
  const bodyCell = {
    fontSize: { md: 12, lg: 13 },
    border: `1px solid ${borderColor}`,
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography sx={{ fontSize: { xs: 14, sm: 16 } }}>
          Loading...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: { xs: "100vh", md: "calc(100vh - 150px)" },
        overflowY: { md: "auto" },
        backgroundColor: { xs: "#f5f5f5", md: "transparent" },
        mt: { md: 1 },
        p: { xs: 0, sm: 2 },
        pb: { xs: 6, sm: 2 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 2.5,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              color: titleColor,
              fontSize: { xs: "20px", sm: "26px", md: "32px", lg: "36px" },
              lineHeight: 1.2,
            }}
          >
            STUDENT CURRICULUM
          </Typography>
          {programInfo && (
            <Typography
              variant="body2"
              sx={{
                color: subtitleColor,
                mt: "6px",
                fontSize: { xs: 12.5, sm: 15, md: 17 },
              }}
            >
              {programInfo.program_description} ({programInfo.program_code})
            </Typography>
          )}
        </Box>
      </Box>
      <Box sx={{ borderTop: "1px solid #ccc", width: "100%" }} />
      <Box sx={{ height: { xs: 16, sm: 20 } }} />

      {/* ── Term blocks ── */}
      <Box sx={{ px: { xs: 1.5, sm: 0 } }}>
        {sortedTerms.map((term, idx) => {
          const termSubjects = subjects.filter(
            (row) =>
              `${row.year_level_description} ${row.semester_description}` ===
              term,
          );
          const yearLevel = termSubjects[0]?.year_level_description;
          const semesterLabel = termSubjects[0]?.semester_description;
          const sectionDescription = termSubjects[0]?.section_description;
          const schoolYearRange = formatSchoolYearRange(termSubjects[0]);

          const totalLec = termSubjects.reduce(
            (sum, row) => sum + Number(row.lec_unit || 0),
            0,
          );
          const totalLab = termSubjects.reduce(
            (sum, row) => sum + Number(row.lab_unit || 0),
            0,
          );
          const totalCourse = termSubjects.reduce(
            (sum, row) => sum + Number(row.course_unit || 0),
            0,
          );

          return (
            <Box key={idx} sx={{ mb: 4 }}>
              {/* ── Student Info Card ── */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  mb: 2,
                  p: { xs: 1.5, sm: 2.5 },
                  borderRadius: "10px",
                  backgroundColor: "#fff",
                  border: `1px solid ${borderColor}`,
                  boxShadow: 2,
                  gap: { xs: 1, sm: 3 },
                }}
              >
                {/* Icon */}
                <Box
                  sx={{
                    width: { xs: 34, sm: 42, md: 48 },
                    height: { xs: 34, sm: 42, md: 48 },
                    borderRadius: "50%",
                    backgroundColor: headerBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  <SchoolIcon sx={{ fontSize: { xs: 18, sm: 22, md: 24 } }} />
                </Box>

                {/* Accent bar */}
                <Box
                  sx={{
                    width: 4,
                    borderRadius: 2,
                    backgroundColor: headerBg,
                    flexShrink: 0,
                    alignSelf: "stretch",
                  }}
                />

                {/* Info — stacks on mobile/tablet, side-by-side on desktop */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {programInfo && (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: { xs: "column", lg: "row" },
                        justifyContent: "space-between",
                        gap: { xs: 0.5, lg: 0 },
                      }}
                    >
                      {/* LEFT */}
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: { xs: 11.5, sm: 13, md: 14 },
                            fontWeight: 700,
                            color: titleColor,
                          }}
                        >
                          STUDENT NUMBER:{" "}
                          <Box component="span" sx={{ fontWeight: 400, ml: 1 }}>
                            {programInfo.student_number}
                          </Box>
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: { xs: 11.5, sm: 13, md: 14 },
                            fontWeight: 700,
                            color: titleColor,
                          }}
                        >
                          NAME:{" "}
                          <Box component="span" sx={{ fontWeight: 400, ml: 1 }}>
                            {programInfo.last_name}, {programInfo.first_name}{" "}
                            {programInfo.middle_name}
                          </Box>
                        </Typography>
                        {/* ADD THIS */}
                        <Typography
                          sx={{
                            fontSize: { xs: 11.5, sm: 13, md: 14 },
                            fontWeight: 700,
                            color: titleColor,
                          }}
                        >
                          DEPARTMENT:{" "}
                          <Box component="span" sx={{ fontWeight: 400, ml: 1 }}>
                            {department || "—"}
                          </Box>
                        </Typography>
                      </Box>

                      {/* RIGHT */}
                      <Box
                        sx={{
                          textAlign: { xs: "left", lg: "right" },
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: { xs: 11.5, sm: 13, md: 14 },
                            fontWeight: 700,
                            color: titleColor,
                          }}
                        >
                          PROGRAM:{" "}
                          <Box component="span" sx={{ fontWeight: 400, ml: 1 }}>
                            ({programInfo.program_code}){" "}
                            {programInfo.program_description}{" "}
                            {programInfo.major}
                          </Box>
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: { xs: 11.5, sm: 13, md: 14 },
                            fontWeight: 700,
                            color: titleColor,
                          }}
                        >
                          AY / YEAR / SEMESTER:{" "}
                          <Box component="span" sx={{ fontWeight: 400, ml: 1 }}>
                            {[
                              schoolYearRange,
                              formatYearLabel(yearLevel),
                              semesterLabel,
                            ]
                              .filter(Boolean)
                              .join(" - ")
                              .toUpperCase()}
                          </Box>
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: { xs: 11.5, sm: 13, md: 14 },
                            fontWeight: 700,
                            color: titleColor,
                          }}
                        >
                          SECTION:{" "}
                          <Box component="span" sx={{ fontWeight: 400, ml: 1 }}>
                            {sectionDescription || "—"}
                          </Box>
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* ── Mobile & tablet: cards | Desktop (md+): table ── */}
              {isMobile ? (
                <Box>
                  {termSubjects.map((row, i) => (
                    <MobileSubjectCard
                      key={i}
                      row={row}
                      index={i}
                      borderColor={borderColor}
                      titleColor={titleColor}
                      subtitleColor={subtitleColor}
                    />
                  ))}

                  {/* Mobile totals strip */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      flexWrap: "wrap",
                      mt: 1,
                      px: 1.5,
                      py: 1,
                      borderRadius: "8px",
                      backgroundColor: "#f5f5f5",
                      border: `1px solid ${borderColor}`,
                    }}
                  >
                    <Typography
                      sx={{ fontSize: { xs: 11.5, sm: 13 }, fontWeight: 700 }}
                    >
                      TOTAL — Lec: {totalLec} | Lab: {totalLab} | Course:{" "}
                      {totalCourse}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
                  <Table size="small" sx={{ minWidth: 900 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...headCell, width: "40px" }}>
                          #
                        </TableCell>
                        <TableCell sx={{ ...headCell, width: "110px" }}>
                          Subject Code
                        </TableCell>
                        <TableCell sx={{ ...headCell, width: "320px" }}>
                          Description
                        </TableCell>
                        <TableCell sx={{ ...headCell, width: "90px" }}>
                          Section
                        </TableCell>
                        <TableCell sx={{ ...headCell, width: "90px" }}>
                          Lec Units
                        </TableCell>
                        <TableCell sx={{ ...headCell, width: "90px" }}>
                          Lab Units
                        </TableCell>
                        <TableCell sx={{ ...headCell, width: "110px" }}>
                          Course Units
                        </TableCell>
                        <TableCell sx={{ ...headCell, width: "220px" }}>
                          Schedule
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {termSubjects.map((row, i) => (
                        <TableRow
                          key={i}
                          sx={{
                            backgroundColor:
                              i % 2 === 0 ? "#ffffff" : "lightgray",
                            "&:hover": {
                              backgroundColor:
                                i % 2 === 0 ? "#f5f5f5" : "lightgray",
                            },
                            "&:last-child td": {
                              borderBottom: "none",
                            },
                          }}
                        >
                          <TableCell sx={{ ...colStyle, width: "40px" }}>
                            {i + 1}
                          </TableCell>
                          <TableCell sx={{ ...colStyle, width: "110px" }}>
                            {row.course_code}
                          </TableCell>
                          <TableCell sx={{ ...colStyle, width: "320px" }}>
                            {row.course_description}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...colStyle,
                              width: "90px",
                              textAlign: "center",
                            }}
                          >
                            {row.section_description || "—"}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...colStyle,
                              width: "90px",
                              textAlign: "center",
                            }}
                          >
                            {formatUnit(row.lec_unit)}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...colStyle,
                              width: "90px",
                              textAlign: "center",
                            }}
                          >
                            {formatUnit(row.lab_unit)}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...colStyle,
                              width: "110px",
                              textAlign: "center",
                            }}
                          >
                            {formatUnit(row.course_unit)}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...colStyle,
                              width: "220px",
                              textAlign: "center",
                              whiteSpace: "pre-line",
                            }}
                          >
                            {row.schedule}
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Total row */}
                      <TableRow
                        sx={{ backgroundColor: headerBg, color: "white" }}
                      >
                        <TableCell
                          sx={{
                            ...bodyCell,
                            fontWeight: 700,
                            color: "white",
                            height: "35px",
                          }}
                          colSpan={4}
                        >
                          TOTAL
                        </TableCell>
                        <TableCell
                          sx={{
                            ...bodyCell,
                            fontWeight: 700,
                            textAlign: "center",
                            color: "white",
                            height: "35px",
                          }}
                        >
                          {totalLec}
                        </TableCell>
                        <TableCell
                          sx={{
                            ...bodyCell,
                            fontWeight: 700,
                            textAlign: "center",
                            color: "white",
                            height: "35px",
                          }}
                        >
                          {totalLab}
                        </TableCell>
                        <TableCell
                          sx={{
                            ...bodyCell,
                            fontWeight: 700,
                            textAlign: "center",
                            color: "white",
                            height: "35px",
                          }}
                        >
                          {totalCourse}
                        </TableCell>
                        <TableCell
                          sx={{
                            ...bodyCell,
                            fontWeight: 700,
                            textAlign: "center",
                            color: "white",
                            height: "35px",
                          }}
                        ></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          );
        })}
      </Box>

      <Snackbar
        open={!!message}
        autoHideDuration={4000}
        onClose={() => setMessage("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error">{message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentCurriculumSubjects;
