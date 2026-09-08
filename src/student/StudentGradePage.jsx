import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
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
  AlertTitle,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import PersonIcon from "@mui/icons-material/Person";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ClassIcon from "@mui/icons-material/Class";
import FilterNoneIcon from "@mui/icons-material/FilterNone";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { FcPrint } from "react-icons/fc";
import { downloadStudentGradesPdf } from "../utils/studentGradePrintLayout";

// ─── Remark Badge ─────────────────────────────────────────────────
const REMARK_MAP = {
  0: { label: "Ongoing", bg: "#E8F5E9", color: "#9e9c1e", border: "#807700" },
  1: { label: "Passed", bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7" },
  2: { label: "Failed", bg: "#FFEBEE", color: "#C62828", border: "#EF9A9A" },
  3: {
    label: "Incomplete",
    bg: "#FFF8E1",
    color: "#E65100",
    border: "#FFE082",
  },
  4: { label: "Dropped", bg: "#F3F4F6", color: "#4B5563", border: "#D1D5DB" },
};

const RemarkBadge = ({ value }) => {
  const style = REMARK_MAP[value];
  if (!style) return <span style={{ color: "#9CA3AF", fontSize: 12 }}>—</span>;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {style.label}
    </span>
  );
};

const getUnitDisplay = (row) => {
  const course = parseInt(row.course_unit) || 0;
  const lab = parseInt(row.lab_unit) || 0;
  if (course === 0 && lab === 0) return "—";
  if (course === 0) return lab;
  if (lab === 0) return course;
  return course + lab;
};

// ─── Term Sorting ─────────────────────────────────────────────────
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

const getTermSortValue = (subject, semesterOrder) => {
  const schoolYear = Number(subject?.year_description) || 0;
  const semester =
    Number(subject?.semester_id) ||
    semesterOrder?.[subject?.semester_description] ||
    0;
  const schoolYearId = Number(subject?.active_school_year_id) || 0;
  return schoolYear * 10000 + semester * 100 + schoolYearId;
};

const getLatestMigratedTermKey = (subjects, semesterOrder) => {
  const latestMigratedSubject = subjects
    .filter(isMigratedGrade)
    .sort(
      (a, b) =>
        getTermSortValue(b, semesterOrder) - getTermSortValue(a, semesterOrder),
    )[0];

  return latestMigratedSubject
    ? getAcademicTermKey(latestMigratedSubject)
    : null;
};

const isMigratedGrade = (subject) =>
  Number(subject?.is_migrated) === 1 || subject?.is_migrated === true;
const isEvaluatedGrade = (subject) => Number(subject?.fe_status) === 1;
const isPostedGrade = (subject) => Number(subject?.is_posted) === 1;

const getAcademicTermKey = (subject) =>
  `${subject?.active_school_year_id || subject?.year_description || "N/A"}-${subject?.semester_id || subject?.semester_description || "N/A"}`;

// Returns: 'show' | 'not_posted' | 'hidden'
const getGradeVisibility = (subject, latestMigratedTermKey) => {
  if (isMigratedGrade(subject)) {
    if (isEvaluatedGrade(subject)) return "show";
    if (getAcademicTermKey(subject) !== latestMigratedTermKey) return "show";
    return "hidden";
  }

  if (!isEvaluatedGrade(subject)) return "hidden";
  if (isPostedGrade(subject)) return "show";
  return "not_posted";
};

const applyGradeVisibility = (subject, visibility) => {
  if (visibility === "show") return subject;

  if (visibility === "not_posted") {
    return {
      ...subject,
      final_grade: null,
      numeric_grade: null,
      descriptive_grade: null,
      grade_display: "Not Posted",
    };
  }

  return {
    ...subject,
    final_grade: null,
    numeric_grade: null,
    descriptive_grade: null,
    en_remarks: null,
    gwa: null,
  };
};

// ─── Shared "Download" button — styled/behaves like the Class Schedule
//    page's Download Schedule button (StudentSchedule.jsx) ───────────
const DownloadButton = ({ onClick, disabled, label, size = "normal" }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: size === "small" ? "4px 14px" : "5px 20px",
      border: "2px solid black",
      backgroundColor: "#f0f0f0",
      color: "black",
      borderRadius: "5px",
      cursor: disabled ? "not-allowed" : "pointer",
      fontSize: size === "small" ? "12px" : "14px",
      fontWeight: "bold",
      transition: "background-color 0.3s, transform 0.2s",
      height: size === "small" ? "32px" : "40px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      userSelect: "none",
      opacity: disabled ? 0.65 : 1,
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}
    onMouseEnter={(e) => {
      if (!disabled) e.currentTarget.style.backgroundColor = "#d3d3d3";
    }}
    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f0f0f0")}
    onMouseDown={(e) => {
      if (!disabled) e.currentTarget.style.transform = "scale(0.95)";
    }}
    onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
  >
    <FcPrint size={size === "small" ? 16 : 20} />
    {label}
  </button>
);

// ─── Main Component ───────────────────────────────────────────────
const StudentGradePage = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const theme = useTheme();

  // Breakpoints:
  // - card layout for phones AND small/portrait tablets (< 900px)
  // - scrollable table layout for larger tablets (landscape) and desktop (>= 900px)
  const isCardLayout = useMediaQuery(theme.breakpoints.down("md"));
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#e0e0e0");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (assets.logoUrl)
      setFetchedLogo(`${assets.logoUrl}`);
    else setFetchedLogo(EaristLogo);
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);

    // Same fallback chain AdmissionApplicantList.jsx uses: prefer
    // campus_address, but fall back to a plain "address" key so this
    // doesn't end up blank if Settings only ever populated the latter.
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
    else if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);

  // ── Active School Year — same shape/endpoint the dashboard already uses
  // ({ current_year, next_year, semester_description }). Fetched once here
  // too so the PDF letterhead can show "School Year 2026-2027" instead of
  // repeating the report title a second time. ─────────────────────────
  const [activeSY, setActiveSY] = useState({
    current_year: "",
    next_year: "",
    semester_description: "",
  });

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/active_school_year`)
      .then((res) => setActiveSY(res.data[0] || {}))
      .catch((err) => console.error(err));
  }, []);

  const [userID, setUserID] = useState("");
  const [userRole, setUserRole] = useState("");
  const [studentGrade, setStudentGrade] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [gradingActive, setGradingActive] = useState(false);
  const [matriculationBalanceInfo, setMatriculationBalanceInfo] = useState({
    hasBalance: false,
    balance: 0,
  });

  // ── Download-PDF state: one flag for "download everything", one for
  //    tracking which single term card is currently being downloaded ──
  const [isDownloadingAllGrades, setIsDownloadingAllGrades] = useState(false);
  const [downloadingTermKey, setDownloadingTermKey] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    if (storedUser && storedRole && storedID) {
      setUserRole(storedRole);
      setUserID(storedID);
      if (storedRole !== "student") {
        window.location.href = "/faculty_dashboard";
      } else {
        fetchStudentGrade(storedID);
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const fetchMatriculationBalance = async (studentNumber) => {
    if (!studentNumber) return { hasBalance: false, balance: 0 };
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/check-student-balance`,
        { student_number: studentNumber },
      );
      const balance = Number(data?.balance || 0);
      return {
        hasBalance: Boolean(data?.hasBalance) && balance > 0,
        balance: Number.isFinite(balance) ? balance : 0,
      };
    } catch {
      return { hasBalance: false, balance: 0 };
    }
  };

  const hideGradeFields = (subject) => ({
    ...subject,
    final_grade: null,
    numeric_grade: null,
    descriptive_grade: null,
    en_remarks: null,
    gwa: null,
    grade_display: null,
  });

  const recalculateTermGwa = (subjects) => {
    let total = 0;
    let units = 0;

    subjects.forEach((row) => {
      if (row.grade_display) return;
      if (Number(row.is_gwa_excluded) === 1) return; // ✅ policy: excluded subject
      const grade = Number(row.numeric_grade);
      const rowUnits = Number(row.gwa_units ?? row.course_unit) || 0;
      if (!Number.isFinite(grade) || grade <= 0 || rowUnits <= 0) return;
      total += grade * rowUnits;
      units += rowUnits;
    });

    const gwa = units > 0 ? total / units : null;
    return subjects.map((row) => ({ ...row, gwa }));
  };

  const fetchStudentGrade = async (id) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student_grade/${id}`);
      const data = res.data;
      const balanceInfo = await fetchMatriculationBalance(
        data[0]?.student_number,
      );
      setMatriculationBalanceInfo(balanceInfo);

      const curriculumId = data[0]?.curriculum_id ?? data[0]?.program ?? null;
      setDepartment(await resolveDepartmentByCurriculum(curriculumId));

      if (balanceInfo.hasBalance) {
        setStudentGrade(data.map(hideGradeFields));
        return;
      }

      const latestMigratedTermKey = getLatestMigratedTermKey(
        data,
        semesterOrder,
      );
      const groupedByTerm = {};
      data.forEach((subj) => {
        const termKey = getAcademicTermKey(subj);
        if (!groupedByTerm[termKey]) groupedByTerm[termKey] = [];
        groupedByTerm[termKey].push(subj);
      });

      const processedGrades = Object.values(groupedByTerm).flatMap(
        (termSubjects) => {
          const visibleSubjects = termSubjects.map((subj) =>
            applyGradeVisibility(
              subj,
              getGradeVisibility(subj, latestMigratedTermKey),
            ),
          );
          return recalculateTermGwa(visibleSubjects);
        },
      );

      setStudentGrade(processedGrades);
    } catch (error) {
      console.error(error);
      setStudentGrade([]);
      setMatriculationBalanceInfo({ hasBalance: false, balance: 0 });
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

  const fetchGradingStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/grading_status`);
      if (res.data.status === 1) {
        setGradingActive(true);
        setMessage("");
      } else {
        setGradingActive(false);
        setMessage("Grades are not available yet.");
      }
    } catch {
      setMessage("Error fetching grading status.");
    }
  };

  useEffect(() => {
    fetchGradingStatus();
  }, []);

  useEffect(() => {
    if (matriculationBalanceInfo.hasBalance) {
      setMessage("");
      return;
    }
    if (!gradingActive || studentGrade.length === 0) return;
    const latestMigratedTermKey = getLatestMigratedTermKey(
      studentGrade,
      semesterOrder,
    );
    const pending = studentGrade.filter(
      (s) => getGradeVisibility(s, latestMigratedTermKey) === "hidden",
    ).length;
    if (pending > 0)
      setMessage(
        `Grades are available. Please evaluate all your professors. Remaining: ${pending}`,
      );
    else setMessage("");
  }, [gradingActive, matriculationBalanceInfo.hasBalance, studentGrade]);

  const [yearLevelList, setYearLevelList] = useState([]);
  const [semesterList, setSemesterList] = useState([]);

  useEffect(() => {
    fetchYearLevels();
    fetchSemesters();
  }, []);

  const [gwaPrintStatus, setGwaPrintStatus] = useState({
    overall: false,
    per_semester: false,
    loading: true,
  });

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/honors/gwa_printing_status`)
      .then((res) =>
        setGwaPrintStatus({
          overall: Boolean(res.data?.overall),
          per_semester: Boolean(res.data?.per_semester),
          loading: false,
        }),
      )
      .catch((err) => {
        console.error("Failed to fetch GWA printing status:", err);
        // fail-closed: if we can't confirm it's open, don't show/print it
        setGwaPrintStatus({
          overall: false,
          per_semester: false,
          loading: false,
        });
      });
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

  const formatYearLabel = (year) => yearLabelMap[year] || year;

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

  const rawTerms = [
    ...new Set(
      studentGrade.map(
        (row) => `${row.year_level_description} ${row.semester_description}`,
      ),
    ),
  ];
  const sortedTerms = sortTerms(rawTerms, yearOrder, semesterOrder);
  const headerBg = headerColor || "#1976d2";
  const programInfo = studentGrade[0] || null;
  const formattedMatriculationBalance =
    matriculationBalanceInfo.balance.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // ── PDF download helpers ────────────────────────────────────────────
  const resolveLogoUrl = () => {
    const configuredLogoUrl = assets.logoUrl ? String(assets.logoUrl) : "";
    if (configuredLogoUrl) {
      if (/^https?:\/\//i.test(configuredLogoUrl)) return configuredLogoUrl;
      return `${API_BASE_URL}${configuredLogoUrl.startsWith("/") ? "" : "/"}${configuredLogoUrl}`;
    }

    return `${window.location.origin}${EaristLogo}`;
  };

  const buildStudentInfoForPdf = () => {
    if (!programInfo) return null;
    return {
      fullName:
        `${programInfo.last_name || ""}, ${programInfo.first_name || ""} ${programInfo.middle_name || ""}`
          .replace(/\s+/g, " ")
          .trim(),
      firstName: programInfo.first_name || "",
      lastName: programInfo.last_name || "",
      studentNumber: programInfo.student_number || "",
      department: department || "",
      programCode: programInfo.program_code || "",
      programDescription:
        `${programInfo.program_description || ""} ${programInfo.major || ""}`.trim(),
      sectionDescription: programInfo.section_description || "",
    };
  };

  const getTermsPayload = (termsToInclude) =>
    termsToInclude.map((term) => {
      const subjects = studentGrade
        .filter(
          (row) =>
            `${row.year_level_description} ${row.semester_description}` ===
            term,
        )
        .sort((a, b) =>
          (a.course_code || "").localeCompare(b.course_code || ""),
        );
      return { term, subjects };
    });

  // The on-screen list (sortedTerms) is ordered latest-first, which is
  // what students want to see when scrolling the page. The "all
  // semesters" PDF should read like a transcript instead — 1st Year up
  // through 4th Year, oldest to newest — so just reverse it: sortedTerms
  // is already a complete, consistent ordering (year desc, then semester
  // desc), so flipping it gives a complete chronological (year asc,
  // semester asc) ordering for free.
  const chronologicalTerms = [...sortedTerms].reverse();

  // ── Helper: axios with responseType:"blob" returns error bodies as a
  // Blob too, not parsed JSON — this decodes it so we can show the real
  // server message instead of a generic failure.
  const extractErrorMessage = async (error, fallback) => {
    const data = error?.response?.data;
    if (data instanceof Blob) {
      try {
        const text = await data.text();
        const parsed = JSON.parse(text);
        return parsed?.error || parsed?.message || fallback;
      } catch {
        return fallback;
      }
    }
    return data?.error || data?.message || error?.message || fallback;
  };

  const handleDownloadAllGrades = async () => {
    const info = buildStudentInfoForPdf();
    if (!info || !chronologicalTerms.length) return;
    if (!gwaPrintStatus.overall) {
      setMessage("Overall GWA printing is currently closed by the Registrar.");
      return;
    }
    setIsDownloadingAllGrades(true);
    try {
      const resolvedCampusAddress =
        campusAddress || "No address set in Settings";

      await downloadStudentGradesPdf({
        apiBaseUrl: API_BASE_URL,
        studentInfo: info,
        terms: getTermsPayload(chronologicalTerms),
        companyName,
        campusAddress: resolvedCampusAddress,
        logoUrl: resolveLogoUrl(),
        activeSchoolYear: activeSY,
        formatYearLabel,
        scope: "all",
      });
    } catch (error) {
      console.error("Failed to download grades PDF:", error);
      const msg = await extractErrorMessage(
        error,
        "Failed to generate your grades PDF. Please try again in a moment, or contact the Registrar's Office if this keeps happening.",
      );
      setMessage(msg);
    } finally {
      setIsDownloadingAllGrades(false);
    }
  };

  const handleDownloadTermGrades = async (term) => {
    const info = buildStudentInfoForPdf();
    if (!info) return;
    if (!gwaPrintStatus.per_semester) {
      setMessage(
        "Per-semester GWA printing is currently closed by the Registrar.",
      );
      return;
    }
    setDownloadingTermKey(term);
    try {
      const resolvedCampusAddress =
        campusAddress || "No address set in Settings";

      await downloadStudentGradesPdf({
        apiBaseUrl: API_BASE_URL,
        studentInfo: info,
        terms: getTermsPayload([term]),
        companyName,
        campusAddress: resolvedCampusAddress,
        logoUrl: resolveLogoUrl(),
        activeSchoolYear: activeSY,
        formatYearLabel,
        scope: "term",
      });
    } catch (error) {
      console.error("Failed to download term grades PDF:", error);
      const msg = await extractErrorMessage(
        error,
        "Failed to generate the PDF for this semester. Please try again in a moment.",
      );
      setMessage(msg);
    } finally {
      setDownloadingTermKey(null);
    }
  };

  const headCell = {
    backgroundColor: headerBg,
    color: "#fff",
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    padding: "10px 14px",
    borderBottom: "none",
    whiteSpace: "nowrap",
  };
  const bodyCell = {
    fontSize: 13,
    padding: "10px 14px",
    color: "#1a1a1a",
    borderBottom: `1px solid ${borderColor}`,
    verticalAlign: "middle",
  };

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 150px)",
        overflowY: "auto",
        backgroundColor: "transparent",
        mt: 1,
        p: { xs: 1, sm: 2 },
      }}
    >
      {/* ── Snackbar ── */}
      <Snackbar
        open={!!message}
        autoHideDuration={4000}
        onClose={() => setMessage("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{
          maxWidth: { xs: "94vw", sm: 480 },
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <Alert
          onClose={() => setMessage("")}
          severity="warning"
          sx={{ width: "100%" }}
        >
          {message}
        </Alert>
      </Snackbar>

      {/* ── Page Header ── */}
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
            STUDENT GRADES
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

        {/* Right side: Grading Status Pill (top) + Download All Grades button (below) */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              px: { xs: "10px", sm: "14px" },
              py: "6px",
              borderRadius: "20px",
              fontSize: { xs: 11, sm: 12 },
              fontWeight: 600,
              letterSpacing: "0.03em",
              backgroundColor: gradingActive ? "#E8F5E9" : "#FFF3E0",
              color: gradingActive ? "#2E7D32" : "#E65100",
              border: `1px solid ${gradingActive ? "#A5D6A7" : "#FFCC80"}`,
              flexShrink: 0,
              alignSelf: "flex-end",
              whiteSpace: "nowrap",
            }}
          >
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: gradingActive ? "#43A047" : "#FB8C00",
                flexShrink: 0,
              }}
            />
            {gradingActive ? "Grades Available" : "Not Yet Available"}
          </Box>

          {!gwaPrintStatus.loading && gwaPrintStatus.overall && (
            <DownloadButton
              onClick={handleDownloadAllGrades}
              disabled={
                isDownloadingAllGrades ||
                !studentGrade.length ||
                matriculationBalanceInfo.hasBalance
              }
              label={
                isDownloadingAllGrades
                  ? "Preparing PDF..."
                  : "Download All Grades"
              }
            />
          )}
        </Box>
      </Box>

      {/* ── Divider ── */}
      <Box sx={{ height: "1px", backgroundColor: borderColor, mb: 3 }} />

      {/* ── Info Alert ── */}
      <Alert
        severity="info"
        icon={<InfoOutlinedIcon />}
        sx={{
          borderRadius: "12px",
          mt: 2,
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          fontSize: { xs: 12.5, sm: 14 },
          "& .MuiAlert-message": { width: "100%", textAlign: "center" },
          "& .MuiAlert-icon": { alignItems: "center" },
        }}
      >
        <AlertTitle
          sx={{
            fontWeight: 600,
            textAlign: "center",
            fontSize: { xs: 14, sm: 16 },
          }}
        >
          Attention to All Students
        </AlertTitle>
        Viewing grades online through the <b>Student Information System</b> is
        strictly for personal use only. Students who need an official copy must
        submit a request at the Registrar's Office.
        <br />
        <br />
        Grades from previous school years were migrated from the old enrollment
        system and are still subject to checking and validation by the
        Registrar.
      </Alert>

      <br />

      {/* ── Balance Warning ── */}
      {matriculationBalanceInfo.hasBalance && (
        <Alert
          severity="warning"
          sx={{ borderRadius: "12px", mb: 3, fontSize: { xs: 12.5, sm: 14 } }}
        >
          <AlertTitle sx={{ fontWeight: 700 }}>
            Grades Hidden Due to Matriculation Balance
          </AlertTitle>
          Your grades are hidden because you still have a remaining
          matriculation balance of <b>{formattedMatriculationBalance}</b>.
          Please settle your balance to view your grades.
        </Alert>
      )}

      {/* ── Loading / Empty / Grade Tables ── */}
      {loading ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography sx={{ color: subtitleColor, fontSize: 14 }}>
            Loading grades...
          </Typography>
        </Box>
      ) : studentGrade.length > 0 ? (
        sortedTerms.map((term, idx) => {
          const termSubjects = studentGrade
            .filter(
              (row) =>
                `${row.year_level_description} ${row.semester_description}` ===
                term,
            )
            .sort((a, b) =>
              (a.course_code || "").localeCompare(b.course_code || ""),
            );

          const yearLevel = termSubjects[0]?.year_level_description;
          const semesterLabel = termSubjects[0]?.semester_description;
          const gwaValue = termSubjects[0]?.gwa;
          const sectionDescription = termSubjects[0]?.section_description;
          const schoolYearRange = formatSchoolYearRange(termSubjects[0]);

          return (
            <Box key={idx} sx={{ mb: 5 }}>
              {/* ── Student Info Card + per-term Download button ── */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  mb: 2,
                  gap: { xs: 1, sm: 1.5 },
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "flex-start",
                    p: { xs: 1.25, sm: 1.75, md: 2 },
                    borderRadius: "10px",
                    backgroundColor: "#fff",
                    border: `1px solid ${borderColor}`,
                    boxShadow: 2,
                    gap: { xs: 1, sm: 1.5 },
                  }}
                >
                  {/* Person icon */}
                  <Box
                    sx={{
                      width: { xs: 34, sm: 40 },
                      height: { xs: 34, sm: 40 },
                      borderRadius: "50%",
                      flexShrink: 0,
                      backgroundColor: headerBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                    }}
                  >
                    <PersonIcon fontSize="small" />
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

                  {/* Info — stacks vertically on mobile/tablet, side-by-side on larger screens */}
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
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontSize: { xs: 11.5, sm: 13, md: 14 },
                              fontWeight: 700,
                              color: titleColor,
                              wordBreak: "break-word",
                            }}
                          >
                            STUDENT NUMBER:{" "}
                            <Box
                              component="span"
                              sx={{ fontWeight: "normal", ml: "8px" }}
                            >
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
                            <Box
                              component="span"
                              sx={{ fontWeight: 400, ml: 1 }}
                            >
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
                            <Box
                              component="span"
                              sx={{ fontWeight: 400, ml: 1 }}
                            >
                              {department || "—"}
                            </Box>
                          </Typography>
                          {gwaValue && gwaPrintStatus.per_semester && (
                            <Typography
                              sx={{
                                fontSize: { xs: 11.5, sm: 13, md: 14 },
                                fontWeight: 700,
                                color: titleColor,
                              }}
                            >
                              Weighted GWA:{" "}
                              <Box
                                component="span"
                                sx={{
                                  fontWeight: "normal",
                                  ml: "8px",
                                  color: headerBg,
                                }}
                              >
                                {Number(gwaValue).toFixed(3)}
                              </Box>
                            </Typography>
                          )}
                        </Box>

                        {/* RIGHT */}
                        <Box
                          sx={{
                            textAlign: { xs: "left", lg: "right" },
                            minWidth: 0,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: { xs: 11.5, sm: 13, md: 14 },
                              fontWeight: 700,
                              color: titleColor,
                              wordBreak: "break-word",
                            }}
                          >
                            PROGRAM:{" "}
                            <Box
                              component="span"
                              sx={{ fontWeight: "normal", ml: "8px" }}
                            >
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
                            <Box
                              component="span"
                              sx={{ fontWeight: "normal", ml: "8px" }}
                            >
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
                            <Box
                              component="span"
                              sx={{ fontWeight: "normal", ml: "8px" }}
                            >
                              {sectionDescription || "—"}
                            </Box>
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>

                {!gwaPrintStatus.loading && gwaPrintStatus.per_semester && (
                  <DownloadButton
                    onClick={() => handleDownloadTermGrades(term)}
                    disabled={
                      downloadingTermKey === term ||
                      matriculationBalanceInfo.hasBalance
                    }
                    label={downloadingTermKey === term ? "..." : "Download"}
                    size="small"
                  />
                )}
              </Box>

              {isCardLayout ? (
                <Box>
                  {termSubjects.map((row, i) => (
                    <Box
                      key={i}
                      sx={{
                        border: `1px solid ${borderColor}`,
                        borderRadius: "8px",
                        p: { xs: 1.25, sm: 1.5 },
                        mb: 1.5,
                        backgroundColor: i % 2 === 0 ? "#ffffff" : "lightgray",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          mb: 0.5,
                          gap: 1,
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontSize: { xs: 12.5, sm: 13 },
                              color: titleColor,
                              mb: 0.2,
                            }}
                          >
                            {row.course_code}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: { xs: 11, sm: 11.5 },
                              color: subtitleColor,
                              lineHeight: 1.3,
                            }}
                          >
                            {row.course_description}
                          </Typography>
                        </Box>
                        <Box sx={{ ml: 1, flexShrink: 0 }}>
                          {row.grade_display ? (
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: { xs: 12, sm: 13 },
                                color: "#E65100",
                              }}
                            >
                              {row.grade_display}
                            </Typography>
                          ) : row.numeric_grade ? (
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: { xs: 15, sm: 16 },
                                color: titleColor,
                              }}
                            >
                              {row.numeric_grade}
                            </Typography>
                          ) : (
                            <Typography sx={{ color: "#9CA3AF", fontSize: 14 }}>
                              —
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px 12px",
                          mt: 0.8,
                          alignItems: "center",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            minWidth: 0,
                          }}
                        >
                          <PersonOutlineIcon
                            sx={{ fontSize: 13, color: "#000", flexShrink: 0 }}
                          />
                          <Typography
                            sx={{
                              fontSize: 11,
                              color: "#000",
                              wordBreak: "break-word",
                            }}
                          >
                            {row.fname === "TBA" && row.lname === "TBA"
                              ? "TBA"
                              : `Prof. ${row.fname} ${row.lname}`}
                          </Typography>
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <ClassIcon
                            sx={{ fontSize: 13, color: "#000", flexShrink: 0 }}
                          />
                          <Typography sx={{ fontSize: 11, color: "#000" }}>
                            {row.section_description}
                          </Typography>
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <FilterNoneIcon
                            sx={{ fontSize: 13, color: "#000", flexShrink: 0 }}
                          />
                          <Typography sx={{ fontSize: 11, color: "#000" }}>
                            {getUnitDisplay(row)} unit
                            {getUnitDisplay(row) !== 1 ? "s" : ""}
                          </Typography>
                        </Box>

                        {row.schedule && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 0.5,
                              width: "100%",
                            }}
                          >
                            <AccessTimeIcon
                              sx={{
                                fontSize: 13,
                                color: "#000",
                                mt: "1px",
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: "#000",
                                whiteSpace: "pre-line",
                                lineHeight: 1.5,
                                wordBreak: "break-word",
                              }}
                            >
                              {row.schedule}
                            </Typography>
                          </Box>
                        )}

                        <RemarkBadge value={row.en_remarks} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              ) : (
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{
                    border: `1px solid ${borderColor}`,
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  <Table
                    size="small"
                    sx={{ minWidth: 860, tableLayout: "fixed" }}
                  >
                    <TableHead>
                      <TableRow>
                        {[
                          { label: "#", width: "48px", align: "center" },
                          { label: "Code", width: "110px" },
                          { label: "Subject", width: undefined },
                          { label: "Faculty", width: "250px" },
                          {
                            label: "Schedule",
                            width: "170px",
                            align: "center",
                          },
                          { label: "Units", width: "64px", align: "center" },
                          { label: "Section", width: "100px", align: "center" },
                          {
                            label: "Final Grade",
                            width: "100px",
                            align: "center",
                          },
                          { label: "Status", width: "110px", align: "center" },
                        ].map(({ label, width, align }) => (
                          <TableCell
                            key={label}
                            sx={{
                              ...headCell,
                              width,
                              textAlign: align || "left",
                              border: `1px solid ${borderColor}`,
                            }}
                          >
                            {label}
                          </TableCell>
                        ))}
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
                          <TableCell
                            sx={{
                              ...bodyCell,
                              border: `1px solid ${borderColor}`,
                              textAlign: "center",
                              color: subtitleColor,
                              fontSize: 12,
                            }}
                          >
                            {i + 1}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...bodyCell,
                              border: `1px solid ${borderColor}`,
                              fontWeight: 600,
                              fontSize: 12,
                              color: subtitleColor,
                            }}
                          >
                            {row.course_code}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...bodyCell,
                              border: `1px solid ${borderColor}`,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.course_description}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...bodyCell,
                              border: `1px solid ${borderColor}`,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {row.fname === "TBA" && row.lname === "TBA" ? (
                              <span style={{ color: "#9CA3AF" }}>TBA</span>
                            ) : (
                              `Prof. ${row.fname} ${row.lname}`
                            )}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...bodyCell,
                              border: `1px solid ${borderColor}`,
                              textAlign: "center",
                              whiteSpace: "pre-line",
                              fontSize: 12,
                            }}
                          >
                            {row.schedule || "—"}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...bodyCell,
                              border: `1px solid ${borderColor}`,
                              textAlign: "center",
                              fontWeight: 500,
                            }}
                          >
                            {getUnitDisplay(row)}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...bodyCell,
                              border: `1px solid ${borderColor}`,
                              textAlign: "center",
                            }}
                          >
                            {row.section_description}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...bodyCell,
                              border: `1px solid ${borderColor}`,
                              textAlign: "center",
                            }}
                          >
                            {row.grade_display ? (
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: 12,
                                  color: "#E65100",
                                }}
                              >
                                {row.grade_display}
                              </span>
                            ) : row.numeric_grade ? (
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: 14,
                                  color: titleColor,
                                }}
                              >
                                {row.numeric_grade}
                              </span>
                            ) : (
                              <span style={{ color: "#9CA3AF" }}>—</span>
                            )}
                          </TableCell>
                          <TableCell
                            sx={{
                              ...bodyCell,
                              border: `1px solid ${borderColor}`,
                              textAlign: "center",
                            }}
                          >
                            <RemarkBadge value={row.en_remarks} />
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow
                        sx={{ backgroundColor: headerBg, color: "white" }}
                      >
                        <TableCell
                          sx={{
                            ...bodyCell,
                            fontWeight: 700,
                            color: "white",
                            height: "35px",
                            border: `1px solid ${borderColor}`,
                          }}
                          colSpan={4}
                        ></TableCell>
                        <TableCell
                          sx={{
                            ...bodyCell,
                            fontWeight: 700,
                            textAlign: "center",
                            color: "white",
                            height: "35px",
                          }}
                        ></TableCell>
                        <TableCell
                          sx={{
                            ...bodyCell,
                            fontWeight: 700,
                            textAlign: "center",
                            color: "white",
                            height: "35px",
                          }}
                        ></TableCell>
                        <TableCell
                          sx={{
                            ...bodyCell,
                            fontWeight: 700,
                            textAlign: "center",
                            color: "white",
                            height: "35px",
                          }}
                        ></TableCell>
                        <TableCell
                          sx={{
                            ...bodyCell,
                            fontWeight: 700,
                            textAlign: "center",
                            color: "white",
                            height: "35px",
                          }}
                        ></TableCell>
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
        })
      ) : (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography sx={{ color: subtitleColor, fontSize: 14 }}>
            No grades available.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default StudentGradePage;
