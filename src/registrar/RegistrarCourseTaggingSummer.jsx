import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Button,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Stack,
  Chip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import LinearWithValueLabel from "../components/LinearWithValueLabel";
import { Snackbar, Alert } from "@mui/material";
import { FaFileExcel } from "react-icons/fa";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import RegistrarEnrollmentTabs from "../components/RegistrarEnrollmentTabs";
import SchoolIcon from "@mui/icons-material/School";
import AssignmentIcon from "@mui/icons-material/Assignment";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PeopleIcon from "@mui/icons-material/People";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import API_BASE_URL from "../apiConfig";
import ScoreIcon from "@mui/icons-material/Score";
import { postAuditEvent, getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import {
  formatCourseHistoryLabel,
  formatStudentDisplayName,
  logBulkCourseEnrollmentHistory,
} from "../utils/studentHistoryLogs";

/* ─── Design tokens ─── */
const TOKEN = {
  navyLight: "#1a3260",
  accent: "#2563eb",
  accentHover: "#1d4ed8",
  accentSoft: "#eff6ff",
  gold: "#f59e0b",
  green: "#16a34a",
  greenSoft: "#f0fdf4",
  red: "#dc2626",
  redSoft: "#fef2f2",
  orange: "#ea580c",
  orangeSoft: "#fff7ed",
  bg: "#f4f6fb",
  surface: "#ffffff",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  text: "#0f172a",
  textMid: "#475569",
  textLight: "#94a3b8",
  shadow: "0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.06)",
  shadowMd: "0 4px 24px rgba(0,0,0,.10)",
};

/* ─── Tiny helpers ─── */
const Card = ({ children, sx = {} }) => (
  <Box
    sx={{
      backgroundColor: TOKEN.surface,
      boxShadow: TOKEN.shadow,
      overflow: "hidden",
      ...sx,
    }}
  >
    {children}
  </Box>
);

const SectionHeader = ({ children, headerColor, sx = {} }) => (
  <Box
    sx={{
      px: 2.5,
      py: 1.5,
      backgroundColor: headerColor,
      ...sx,
    }}
  >
    <Typography
      sx={{
        color: "#fff",
        fontWeight: 700,
        fontSize: "13px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </Typography>
  </Box>
);

const StyledTh = ({ children, headerColor, style = {} }) => (
  <TableCell
    sx={{
      backgroundColor: headerColor,
      color: "#fff",
      fontWeight: 700,
      fontSize: "11px",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      textAlign: "center",
      whiteSpace: "nowrap",
      py: 1.25,
      px: 1,
      border: "none",
      borderRight: `1px solid rgba(255,255,255,0.1)`,
      "&:last-child": { borderRight: "none" },
      ...style,
    }}
  >
    {children}
  </TableCell>
);

const StyledTd = ({ children, sx = {}, ...rest }) => (
  <TableCell
    sx={{
      fontSize: "12px",
      textAlign: "center",
      py: 0.9,
      px: 1,
      borderBottom: `1px solid ${TOKEN.border}`,
      color: TOKEN.text,
      ...sx,
    }}
    {...rest}
  >
    {children}
  </TableCell>
);

/* ─── Main component ─── */
const isBlankValue = (value) =>
  value === null ||
  value === undefined ||
  String(value).trim() === "" ||
  ["null", "undefined"].includes(String(value).trim().toLowerCase());

const cleanDisplayValue = (value, fallback = "") =>
  isBlankValue(value) ? fallback : String(value).trim();

const joinDisplayValues = (...values) =>
  values
    .map((value) => cleanDisplayValue(value))
    .filter(Boolean)
    .join(" ");

const setStorageValue = (key, value) => {
  if (isBlankValue(value)) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
};

const formatStudentCurriculum = (yearDesc, courseCode, courseDescription) => {
  const year = cleanDisplayValue(yearDesc);
  const code = cleanDisplayValue(courseCode);
  const description = cleanDisplayValue(courseDescription);
  const program = code || description;
  return [year, program].filter(Boolean).join(" - ");
};

const formatSection = (programCode, description) =>
  [cleanDisplayValue(programCode), cleanDisplayValue(description)]
    .filter(Boolean)
    .join("-");

const formatTimeRange = (start, end) =>
  [cleanDisplayValue(start), cleanDisplayValue(end)].filter(Boolean).join("–");

const logStudentBasicInfoSearch = async ({
  studentNumber,
  firstName,
  middleName,
  lastName,
}) => {
  try {
    await postAuditEvent("student_basic_info_searched", {
      student_name:
        joinDisplayValues(firstName, middleName, lastName) || "Unknown Student",
      student_number: cleanDisplayValue(studentNumber, "N/A"),
    });
  } catch (err) {
    console.error("Student search audit failed:", err);
  }
};

const RegistrarCourseTaggingSummer = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [stepperColor, setStepperColor] = useState("#000000");

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
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);
    if (assets.logoUrl) {
      setFetchedLogo(assets.logoUrl);
    }
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);

  /* derived header color from settings */
  const headerColor = colors.header || "#1976d2";

  const [data, setdata] = useState([]);
  const [currentDate, setCurrentDate] = useState("");
  const [personID, setPersonID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);

  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  const pageId = 140;

  const [employeeID, setEmployeeID] = useState("");
  const auditConfig = {
    headers: {
      ...getFlatAuditHeaders(),
      "x-employee-id":
        employeeID ||
        localStorage.getItem("employee_id") ||
        localStorage.getItem("email") ||
        "unknown",
      "x-audit-actor-id":
        employeeID ||
        localStorage.getItem("employee_id") ||
        localStorage.getItem("email") ||
        "unknown",
      "x-audit-actor-role":
        userRole || localStorage.getItem("role") || "registrar",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
  };

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
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`,
      );
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
      console.error("Error checking access:", error);
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

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      const hours = String(now.getHours() % 12 || 12).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const ampm = now.getHours() >= 12 ? "PM" : "AM";
      const formattedDate = `${month} ${day}, ${year} ${hours}:${minutes}:${seconds} ${ampm}`;
      setCurrentDate(formattedDate);
    };
    updateDate();
    const interval = setInterval(updateDate, 1000);
    return () => clearInterval(interval);
  }, []);

  const [courses, setCourses] = useState([]);
  const [enrolled, setEnrolled] = useState([]);
  const [studentNumber, setStudentNumber] = useState("");
  const [userId, setUserId] = useState(null);
  const [first_name, setUserFirstName] = useState(null);
  const [middle_name, setUserMiddleName] = useState(null);
  const [last_name, setUserLastName] = useState(null);
  const [applyingAs, setApplyingAs] = useState("");
  const [currId, setCurr] = useState(null);
  const [courseCode, setCourseCode] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [curriculumYear, setCurriculumYear] = useState("");
  const [studentYearLevel, setStudentYearLevel] = useState("");
  const [, setSectionDescription] = useState("");
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [pendingSectionId, setPendingSectionId] = useState("");
  const [yearLevel, setYearLevel] = useState([]);
  const [subjectCounts, setSubjectCounts] = useState({});
  const [isenrolled, setIsEnrolled] = useState(null);
  const [disableYearButtons, setDisableYearButtons] = useState(false);
  const [activeSemester, setActiveSemester] = useState("");
  const [activeSemesterId, setActiveSemesterId] = useState(null);
  const [activeSchoolYearId, setActiveSchoolYearId] = useState(null);

  const isBulkEnrollDisabled =
    String(applyingAs) === "7" || String(applyingAs) === "8";

  const [prereqMap, setPrereqMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [confirmDialogMessage, setConfirmDialogMessage] = useState("");

  const fetchSubjectCounts = async (sectionId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/subject-enrollment-count`,
        { params: { sectionId, activeSchoolYearId } },
      );
      const counts = {};
      response.data.forEach((item) => {
        counts[item.course_id] = item.enrolled_count;
      });
      setSubjectCounts(counts);
    } catch (err) {
      console.error("Failed to fetch subject counts", err);
    }
  };

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/get_year_level`)
      .then((res) => setYearLevel(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const fetchSummerContext = async () => {
      try {
        const [semesterRes, activeYearRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/get_semester`),
          axios.get(`${API_BASE_URL}/api/active_school_year`),
        ]);
        const semesters = Array.isArray(semesterRes.data)
          ? semesterRes.data
          : [];
        const summerSemester = semesters.find((semester) =>
          String(semester.semester_description || "")
            .toLowerCase()
            .includes("summer"),
        );
        if (!summerSemester) {
          setSnack({
            open: true,
            message: "Summer semester not found.",
            severity: "warning",
          });
          setActiveSemester("Summer");
          setActiveSemesterId(null);
          return;
        }
        const activeYearRow = Array.isArray(activeYearRes.data)
          ? activeYearRes.data[0]
          : null;
        const yearId = activeYearRow?.year_id ?? null;
        if (!yearId) {
          setSnack({
            open: true,
            message: "Active school year not found.",
            severity: "warning",
          });
          return;
        }
        const selectedYearRes = await axios.get(
          `${API_BASE_URL}/api/get_selecterd_year/${yearId}/${summerSemester.semester_id}`,
        );
        const summerSchoolYearId = Array.isArray(selectedYearRes.data)
          ? selectedYearRes.data[0]?.school_year_id
          : null;
        if (!summerSchoolYearId) {
          setSnack({
            open: true,
            message: "Active school year for Summer not found.",
            severity: "warning",
          });
          return;
        }
        setActiveSemester(summerSemester.semester_description || "Summer");
        setActiveSemesterId(summerSemester.semester_id);
        setActiveSchoolYearId(summerSchoolYearId);
      } catch (err) {
        console.error("Error loading summer context:", err);
        setSnack({
          open: true,
          message: "Failed to load Summer school year context.",
          severity: "error",
        });
      }
    };
    fetchSummerContext();
  }, []);

  useEffect(() => {
    if (selectedSection && activeSchoolYearId) {
      fetchSubjectCounts(selectedSection);
    }
  }, [selectedSection, activeSchoolYearId]);

  useEffect(() => {
    if (currId) {
      axios
        .get(`${API_BASE_URL}/api/courses/${currId}`)
        .then((res) => setCourses(res.data))
        .catch((err) => console.error(err));
    }
  }, [currId]);

  useEffect(() => {
    if (userId && currId && activeSchoolYearId) {
      axios
        .get(`${API_BASE_URL}/api/enrolled_courses/${userId}/${currId}`, {
          params: { activeSchoolYearId },
        })
        .then((res) => setEnrolled(res.data))
        .catch((err) => console.error(err));
    }
  }, [userId, currId, activeSchoolYearId]);

  useEffect(() => {
    setSelectedSection("");
    setSections([]);
    setError(null);
    if (selectedDepartment) fetchDepartmentSections(selectedDepartment);
  }, [selectedDepartment]);

  const fetchDepartmentSections = async (departmentId) => {
    if (!departmentId) return;
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/department-sections`,
        {
          params: { departmentId },
        },
      );
      setSections(response.data);
      if (pendingSectionId) {
        setSelectedSection(String(pendingSectionId));
        setPendingSectionId("");
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching department sections:", err);
      setError("Failed to load department sections");
      setLoading(false);
    }
  };

  const handleSectionChange = async (e) => {
    if (!canEdit) {
      setSnack({
        open: true,
        message: "You do not have permission to change active curriculum.",
        severity: "error",
      });
      return;
    }
    const sectionId = e.target.value;
    setSelectedSection(sectionId);
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/update-active-curriculum`,
        {
          studentId: studentNumber,
          departmentSectionId: sectionId,
        },
      );
      const courseRes = await axios.get(
        `${API_BASE_URL}/api/search-student/${sectionId}`,
      );
      if (courseRes.data.length > 0) {
        setCurr(courseRes.data[0].curriculum_id);
        setCourseCode(cleanDisplayValue(courseRes.data[0].program_code));
        setCourseDescription(
          cleanDisplayValue(courseRes.data[0].program_description),
        );
      }
    } catch (error) {
      console.error("Error updating curriculum:", error);
    }
  };

  const isEnrolledCourse = (course_id) =>
    enrolled.some((item) => item.course_id === course_id);

  const hasCoursePrereq = (course) => {
    const status = prereqMap[course.course_id];
    return status ? status.hasPrereq === true : false;
  };

  const checkPrerequisite = async (student_number, course) => {
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/check-prerequisite`,
        {
          student_number,
          course_id: course.course_id,
          semester_id: course.semester_id,
          curriculum_id: currId,
        },
      );
      if (typeof data.allowed !== "boolean") {
        return {
          allowed: false,
          reason: "ERROR",
          status: data.status,
          message:
            data.message ||
            "Invalid response from prerequisite API. Please contact administrator.",
        };
      }
      if (data.allowed) {
        return {
          allowed: true,
          reason: "OK",
          status: data.status,
          message: data.message,
        };
      }
      let reason = "ERROR";
      if (data.status === "FAILED_PREREQ") reason = "FAILED_PREREQUISITE";
      else if (data.status === "MISSING_PREREQ")
        reason = "MISSING_OR_NOT_PASSED_PREREQUISITE";
      return {
        allowed: false,
        reason,
        status: data.status,
        message: data.message,
        failedPrereq: data.failedPrereq || [],
        missingPrereq: data.missingPrereq || [],
      };
    } catch (err) {
      console.error("Error calling /api/check-prerequisite:", err);
      return {
        allowed: false,
        reason: "ERROR",
        status: "REQUEST_ERROR",
        message: "Error calling prerequisite API.",
      };
    }
  };

  useEffect(() => {
    const computePrereqStatus = async () => {
      if (!userId || courses.length === 0) {
        setPrereqMap({});
        return;
      }
      const map = {};
      for (const course of courses) {
        const res = await checkPrerequisite(userId, course);
        let hasPrereq = true;
        if (res.status === "NO_PREREQ" || res.status === "PREREQ_NOT_FOUND")
          hasPrereq = false;
        map[course.course_id] = { allowed: !!res.allowed, hasPrereq };
      }
      setPrereqMap(map);
    };
    computePrereqStatus();
  }, [userId, courses]);

  const addToCart = async (course) => {
    if (!canCreate) {
      setSnack({
        open: true,
        message: "You do not have permission to enroll subjects.",
        severity: "error",
      });
      return;
    }
    if (!selectedSection) {
      setSnack({
        open: true,
        message:
          "Please select a department section before enrolling in a course.",
        severity: "warning",
      });
      return;
    }
    if (!activeSchoolYearId || !activeSemesterId) {
      setSnack({
        open: true,
        message: "Summer school year is not ready yet.",
        severity: "warning",
      });
      return;
    }
    if (!userId) {
      setSnack({
        open: true,
        message: "Please search and select a student first.",
        severity: "warning",
      });
      return;
    }
    if (isEnrolledCourse(course.course_id)) return;
    const payload = {
      subject_id: course.course_id,
      department_section_id: selectedSection,
      active_school_year_id: activeSchoolYearId,
    };
    try {
      await axios.post(
        `${API_BASE_URL}/api/add-to-enrolled-courses/${userId}/${currId}/`,
        payload,
        auditConfig,
      );
      const { data } = await axios.get(
        `${API_BASE_URL}/api/enrolled_courses/${userId}/${currId}`,
        { params: { activeSchoolYearId } },
      );
      setEnrolled(data);
      setSnack({
        open: true,
        message: `Enrolled ${course.course_code} successfully.`,
        severity: "success",
      });
    } catch (err) {
      console.error("Error adding course or refreshing enrolled list:", err);
      setSnack({
        open: true,
        message: "Error enrolling in this course. Please try again.",
        severity: "error",
      });
    }
  };

  const deleteFromCart = async (id) => {
    if (!canDelete) {
      setSnack({
        open: true,
        message: "You do not have permission to unenroll subjects.",
        severity: "error",
      });
      return;
    }
    if (!id) {
      console.error("No ID provided to deleteFromCart");
      return;
    }
    try {
      const res = await axios.delete(
        `${API_BASE_URL}/api/courses/delete/${id}`,
        auditConfig,
      );
      const { data } = await axios.get(
        `${API_BASE_URL}/api/enrolled_courses/${userId}/${currId}`,
        { params: { activeSchoolYearId } },
      );
      setEnrolled(data);
      setSnack({
        open: true,
        message: "Subject unenrolled successfully.",
        severity: "success",
      });
    } catch (err) {
      console.error(
        "Error deleting course or refreshing enrolled list:",
        err.response?.data || err.message || err,
      );
      setSnack({
        open: true,
        message: "Error unenrolling subject. Please check the console.",
        severity: "error",
      });
    }
  };

  const getSelectedSectionLabel = () => {
    const section = sections.find(
      (item) =>
        String(item.department_and_program_section_id) ===
        String(selectedSection),
    );
    if (!section) return "Unknown Section";
    return [section.program_description, section.major, section.description]
      .map((value) => cleanDisplayValue(value))
      .filter(Boolean)
      .join(" ");
  };

  const addAllToCart = async (yearLevelId) => {
    if (!canCreate) {
      setSnack({
        open: true,
        message: "You do not have permission to bulk enroll subjects.",
        severity: "error",
      });
      return;
    }
    const newCourses = courses.filter(
      (c) =>
        !isEnrolledCourse(c.course_id) &&
        Number(c.year_level_id) === Number(yearLevelId) &&
        (activeSemesterId
          ? Number(c.semester_id) === Number(activeSemesterId)
          : true),
    );
    if (!selectedSection) {
      setSnack({
        open: true,
        message:
          "Please select a department section before adding all the courses.",
        severity: "warning",
      });
      return;
    }
    if (!activeSchoolYearId || !activeSemesterId) {
      setSnack({
        open: true,
        message: "Summer school year is not ready yet.",
        severity: "warning",
      });
      return;
    }
    if (!userId) {
      setSnack({
        open: true,
        message: "Please search and select a student first.",
        severity: "warning",
      });
      return;
    }
    if (newCourses.length === 0) return;
    let enrolledCount = 0;
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/add-all-to-enrolled-courses`,
        {
          subject_ids: newCourses.map((course) => course.course_id),
          user_id: userId,
          curriculumID: currId,
          departmentSectionID: selectedSection,
          year_level: yearLevelId,
        },
        auditConfig,
      );
      enrolledCount = res.data?.enrolledCount || 0;
      setDisableYearButtons(true);

      const data = await refreshEnrolledCourses();
      if (data.length > 0) {
        setCourseCode(cleanDisplayValue(data[0].program_code));
        setCourseDescription(cleanDisplayValue(data[0].program_description));
        setSectionDescription(cleanDisplayValue(data[0].section));
      }
      setSnack({
        open: true,
        message:
          enrolledCount > 0
            ? "Bulk enroll finished. All available subjects were enrolled."
            : "No new subjects were enrolled.",
        severity: enrolledCount > 0 ? "success" : "info",
      });
    } catch (err) {
      console.error("Error during bulk enrollment:", err);
      setSnack({
        open: true,
        message: "Unexpected error during bulk enrollment.",
        severity: "error",
      });
    }
  };

  const deleteAllCart = async () => {
    if (!canDelete) {
      setSnack({
        open: true,
        message: "You do not have permission to unenroll subjects.",
        severity: "error",
      });
      return;
    }
    try {
      if (!activeSchoolYearId) {
        setSnack({
          open: true,
          message: "Summer school year is not ready yet.",
          severity: "warning",
        });
        return;
      }
      await axios.delete(`${API_BASE_URL}/api/courses/user/${userId}`, {
        headers: auditConfig.headers,
        params: { activeSchoolYearId },
      });
      const { data } = await axios.get(
        `${API_BASE_URL}/api/enrolled_courses/${userId}/${currId}`,
        { params: { activeSchoolYearId } },
      );
      setEnrolled(data);
      setDisableYearButtons(false);
    } catch (err) {
      console.error("Error deleting cart or refreshing enrolled list:", err);
    }
  };

  const handleSearchStudent = async () => {
    if (!studentNumber.trim()) {
      setSnack({
        open: true,
        message: "Please fill in the student number",
        severity: "warning",
      });
      return;
    }
    try {
      // Search by student number only (any semester). Still pass a truthy
      // active_school_year_id so the API skips the active-semester filter.
      const response = await axios.post(
        `${API_BASE_URL}/api/student-tagging`,
        {
          studentNumber,
          active_school_year_id: activeSchoolYearId || true,
        },
        { headers: { "Content-Type": "application/json" } },
      );
      const {
        token2,
        isEnrolled,
        person_id2,
        studentNumber: studentNum,
        section,
        department_section_id: departmentSectionId,
        dprtmnt_id: resolvedDepartmentId,
        activeCurriculum: effectiveProgram,
        yearLevel,
        yearDesc,
        yearLevelDescription,
        courseCode: courseCode,
        courseDescription: courseDescription,
        firstName: first_name,
        middleName: middle_name,
        lastName: last_name,
        applyingAs: applyingAsValue,
      } = response.data;
      setStorageValue("token2", token2);
      setStorageValue("person_id2", person_id2);
      setStorageValue("studentNumber", studentNum);
      setStorageValue("activeCurriculum", effectiveProgram);
      setStorageValue("yearLevel", yearLevel);
      setStorageValue("courseCode", courseCode);
      setStorageValue("courseDescription", courseDescription);
      setStorageValue("firstName", first_name);
      setStorageValue("middleName", middle_name);
      setStorageValue("lastName", last_name);
      setStorageValue("section", section);
      setStorageValue("isEnrolled", isEnrolled);
      setUserId(cleanDisplayValue(studentNum));
      setUserFirstName(cleanDisplayValue(first_name));
      setUserMiddleName(cleanDisplayValue(middle_name));
      setUserLastName(cleanDisplayValue(last_name));
      setApplyingAs(cleanDisplayValue(applyingAsValue));
      setCurr(cleanDisplayValue(effectiveProgram));
      setCourseCode(cleanDisplayValue(courseCode));
      setCourseDescription(cleanDisplayValue(courseDescription));
      setCurriculumYear(cleanDisplayValue(yearDesc));
      setStudentYearLevel(cleanDisplayValue(yearLevelDescription));
      setPersonID(cleanDisplayValue(person_id2));
      setSectionDescription(cleanDisplayValue(section));
      const nextSectionId =
        departmentSectionId != null && String(departmentSectionId).trim() !== ""
          ? String(departmentSectionId)
          : "";
      if (resolvedDepartmentId != null && String(resolvedDepartmentId).trim() !== "") {
        setPendingSectionId(nextSectionId);
        setSelectedDepartment(String(resolvedDepartmentId));
      } else {
        setSelectedSection(nextSectionId);
      }
      setIsEnrolled(isEnrolled);
      await logStudentBasicInfoSearch({
        studentNumber: studentNum,
        firstName: first_name,
        middleName: middle_name,
        lastName: last_name,
      });
      const warned = await warnIfNoSummerSubjects(
        effectiveProgram,
        yearLevel,
        joinDisplayValues(
          courseCode ? `(${courseCode})` : "",
          courseDescription,
        ),
      );
      if (!warned) {
        setSnack({
          open: true,
          message: "Student found and authenticated!",
          severity: "success",
        });
      }
    } catch (error) {
      console.log("");
      setApplyingAs("");
      setUserId(null);
      setCurr(null);
      setCourses([]);
      setEnrolled([]);
      setIsEnrolled(false);
      setCurriculumYear("");
      setStudentYearLevel("");
      setSectionDescription("");
      setUserFirstName(null);
      setUserMiddleName(null);
      setUserLastName(null);
      setSnack({
        open: true,
        message: "Student not found or error processing request.",
        severity: "error",
      });
    }
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/get_department`);
        setDepartments(res.data);
      } catch (err) {
        console.error("Error fetching departments:", err);
      }
    };
    fetchDepartments();
  }, []);

  const [selectedFile, setSelectedFile] = useState(null);
  const handleSelect = (departmentId) => setSelectedDepartment(departmentId);

  const handleImport = async () => {
    try {
      if (!selectedFile) {
        setSnack({
          open: true,
          message: "Please choose a file first!",
          severity: "warning",
        });
        return;
      }
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await axios.post(
        `${API_BASE_URL}/api/import-xlsx`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            ...auditConfig.headers,
          },
        },
      );
      if (res.data.success) {
        setSnack({
          open: true,
          message: res.data.message || "Excel imported successfully!",
          severity: "success",
        });
        setSelectedFile(null);
      } else {
        setSnack({
          open: true,
          message: res.data.error || "Failed to import",
          severity: "error",
        });
      }
    } catch (err) {
      console.error("❌ Import error:", err);
      setSnack({
        open: true,
        message: "Import failed: " + (err.response?.data?.error || err.message),
        severity: "error",
      });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0)
      setSelectedFile(e.target.files[0]);
  };

  const getCourseRowSx = (course) => {
    const status = prereqMap[course.course_id];
    if (!status) return {};
    if (!status.hasPrereq || status.allowed)
      return {
        backgroundColor: TOKEN.greenSoft,
        "&:hover": { backgroundColor: "#dcfce7" },
      };
    return {
      backgroundColor: TOKEN.orangeSoft,
      "&:hover": { backgroundColor: "#fed7aa" },
    };
  };

  const handleEnrollClick = async (course) => {
    if (!selectedSection) {
      setSnack({
        open: true,
        message:
          "Please select a department section before enrolling in a course.",
        severity: "warning",
      });
      return;
    }
    if (!userId) {
      setSnack({
        open: true,
        message: "Please search and select a student first.",
        severity: "warning",
      });
      return;
    }
    if (isEnrolledCourse(course.course_id)) return;
    const status = prereqMap[course.course_id];
    if (status && status.hasPrereq) {
      let msg = `The subject ${course.course_code} has prerequisite subject(s).\n\n`;
      msg += status.allowed
        ? "The student meets the prerequisite qualification.\n\nDo you want to continue enrolling this subject?"
        : "The student does NOT meet the prerequisite qualification (failed or not yet passed).\n\nDo you still want to attempt to enroll this subject?";
      setPendingAction({ type: "single", course });
      setConfirmDialogMessage(msg);
      setConfirmDialogOpen(true);
    } else {
      await addToCart(course);
    }
  };

  const handleBulkEnrollClick = async (yearLevelId, semesterLabel) => {
    if (isBulkEnrollDisabled) return;
    if (!activeSchoolYearId || !activeSemesterId) {
      setSnack({
        open: true,
        message: "Summer school year is not ready yet.",
        severity: "warning",
      });
      return;
    }
    if (!selectedSection) {
      setSnack({
        open: true,
        message:
          "Please select a department section before adding all the courses.",
        severity: "warning",
      });
      return;
    }
    if (!userId) {
      setSnack({
        open: true,
        message: "Please search and select a student first.",
        severity: "warning",
      });
      return;
    }
    const newCourses = courses.filter(
      (c) =>
        !isEnrolledCourse(c.course_id) &&
        Number(c.year_level_id) === Number(yearLevelId) &&
        (activeSemesterId
          ? Number(c.semester_id) === Number(activeSemesterId)
          : true),
    );
    if (newCourses.length === 0) return;
    const coursesWithPrereq = newCourses.filter((c) => hasCoursePrereq(c));
    if (coursesWithPrereq.length === 0) {
      await addAllToCart(yearLevelId);
      return;
    }
    const listText = coursesWithPrereq
      .map((c) => {
        const status = prereqMap[c.course_id];
        let tag = status
          ? status.allowed
            ? " (qualified)"
            : " (NOT qualified)"
          : "";
        return `• ${c.course_code}${tag}`;
      })
      .join("\n");
    const msg = `${yearLevelId} - ${semesterLabel || "Semester"}, You are trying to enroll multiple subjects that have prerequisites:\n\n${listText}\n\nGreen-highlighted rows mean the student meets the prerequisite qualification.\nOrange-highlighted rows mean the student does NOT meet the prerequisite qualification.\n\nDo you want to continue with bulk enrollment?`;
    setPendingAction({ type: "bulk", yearLevelId });
    setConfirmDialogMessage(msg);
    setConfirmDialogOpen(true);
  };

  const handleConfirmDialogClose = () => {
    setConfirmDialogOpen(false);
    setPendingAction(null);
    setConfirmDialogMessage("");
  };

  const handleConfirmDialogProceed = async () => {
    if (!pendingAction) {
      handleConfirmDialogClose();
      return;
    }
    try {
      if (pendingAction.type === "single" && pendingAction.course)
        await addToCart(pendingAction.course);
      else if (pendingAction.type === "bulk" && pendingAction.yearLevelId)
        await addAllToCart(pendingAction.yearLevelId);
    } finally {
      handleConfirmDialogClose();
    }
  };

  const formatYear = (year) => {
    const map = {
      "First Year": "1st Year",
      "Second Year": "2nd Year",
      "Third Year": "3rd Year",
      "Fourth Year": "4th Year",
      "Fifth Year": "5th Year",
    };
    return map[year] || year;
  };

  const formatSemester = (semester) => {
    const map = {
      "First Semester": "1st Sem",
      "Second Semester": "2nd Sem",
      Summer: "Summer",
    };
    return map[semester] || semester;
  };

  const warnIfNoSummerSubjects = async (
    curriculumId,
    yearLevelId,
    programLabel,
  ) => {
    if (!curriculumId || !activeSemesterId) return false;

    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/api/program-summer-subjects/check`,
        {
          params: {
            curriculum_id: curriculumId,
            semester_id: activeSemesterId,
            active_school_year_id: activeSchoolYearId,
            year_level_id: yearLevelId,
          },
        },
      );

      if (!data.hasSummerSubjects) {
        const programName =
          programLabel || data.programDescription || "this student's program";
        setSnack({
          open: true,
          message: `${programName} has no dedicated Summer subjects tagged for the student's current year level.`,
          severity: "warning",
        });
        return true;
      }
    } catch (err) {
      console.error("Error checking summer subjects:", err);
      setSnack({
        open: true,
        message:
          "Student found, but summer subject tagging could not be verified.",
        severity: "warning",
      });
      return true;
    }

    return false;
  };

  useEffect(() => {
    if (!studentNumber) return;
    const delayDebounce = setTimeout(() => {
      handleSearchStudent();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [studentNumber]);

  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
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
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /* ── total units ── */
  const totalUnits =
    enrolled.reduce(
      (sum, item) => sum + (parseFloat(item.course_unit) || 0),
      0,
    ) +
    enrolled.reduce((sum, item) => sum + (parseFloat(item.lab_unit) || 0), 0);

  if (loading || hasAccess === null)
    return <LoadingOverlay open={loading} message="Loading..." />;
  if (!hasAccess) return <Unauthorized />;

  /* ════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════ */
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
      {/* ── PAGE HEADER ── */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}
        >
          COURSE TAGGING PANEL
        </Typography>

        {/* Upload controls */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems="center"
        >
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              window.location.href = `${API_BASE_URL}/api/grade_report_template`;
            }}
            sx={{
              height: 40,
              mb: 2,
              color: "black",
              border: "2px solid black",
              backgroundColor: "#f0f0f0",
              textTransform: "none",
              fontWeight: "bold",
              minWidth: 165,
            }}
          >
            📥 Download Template
          </Button>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            style={{ display: "none" }}
            id="excel-upload"
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => document.getElementById("excel-upload").click()}
            startIcon={<FaFileExcel color={TOKEN.green} size={14} />}
            sx={{
              borderColor: TOKEN.green,
              color: TOKEN.green,
              fontSize: "12px",
              fontWeight: 600,
              height: 38,
              px: 2,
              textTransform: "none",
              maxWidth: 200,
              overflow: "hidden",
              "&:hover": { backgroundColor: TOKEN.greenSoft },
            }}
          >
            {selectedFile
              ? selectedFile.name.substring(0, 18) + "…"
              : "Choose Excel"}
          </Button>

          <Button
            variant="contained"
            size="small"
            onClick={handleImport}
            sx={{
              backgroundColor: TOKEN.accent,
              color: "#fff",
              fontSize: "12px",
              fontWeight: 700,
              height: 38,
              px: 2.5,
              textTransform: "none",
              boxShadow: "none",
              "&:hover": {
                backgroundColor: TOKEN.accentHover,
                boxShadow: "none",
              },
            }}
          >
            Upload
          </Button>
        </Stack>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
   
      <br />
      <br />

      {/* ── DEPARTMENT SELECTOR ── */}
      <Card
        sx={{ mb: 3, border: `1px solid ${borderColor}`, textAlign: "center" }}
      >
        <SectionHeader headerColor={headerColor}>
          Select Department
        </SectionHeader>

        <Box
          sx={{
            p: 2,
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {departments.map((dept) => {
            const active = selectedDepartment === dept.dprtmnt_id;
            return (
              <Button
                key={dept.dprtmnt_id}
                variant={active ? "contained" : "outlined"}
                onClick={() => handleSelect(dept.dprtmnt_id)}
                sx={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  height: 38,
                  textAlign: "center",
                  px: 2,
                  textTransform: "none",
                  transition: "all .15s",
                  ...(active
                    ? {
                      backgroundColor: headerColor,
                      color: "#fff",
                      border: "none",
                      boxShadow: "0 2px 8px rgba(15,31,61,.25)",
                      "&:hover": { backgroundColor: TOKEN.navyLight },
                    }
                    : {
                      backgroundColor: "#fff",
                      color: headerColor,
                      border: `1px solid ${TOKEN.borderStrong}`,
                      "&:hover": {
                        backgroundColor: TOKEN.accentSoft,
                        borderColor: TOKEN.accent,
                        color: TOKEN.accent,
                      },
                    }),
                }}
              >
                {dept.dprtmnt_code}
              </Button>
            );
          })}
        </Box>
      </Card>

      {/* ── MAIN TWO-PANEL LAYOUT ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" },
          gap: 3,
        }}
      >
        {/* ═══════ LEFT PANEL — Available Courses ═══════ */}
        <Card sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
          <SectionHeader headerColor={headerColor}>
            Available Courses
          </SectionHeader>

          {/* Student search */}
          <Box
            sx={{
              p: 2,
              borderBottom: `1px solid ${TOKEN.border}`,
              backgroundColor: "#fafafa",
            }}
          >
            {/* Student basic info */}
            {first_name && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 1.5,
                  borderRadius: "10px",
                  backgroundColor: `${headerColor}0D`,
                  border: `1px solid ${headerColor}33`,
                  textAlign: "left",
                }}
              >
                <Typography sx={{ fontWeight: 700, mb: 1.5, color: "#222" }}>
                  Student Information
                </Typography>
                <Grid container spacing={1.5}>
                  {[
                    [
                      "Name",
                      joinDisplayValues(first_name, middle_name, last_name),
                    ],
                    [
                      "Curriculum",
                      formatStudentCurriculum(
                        curriculumYear,
                        courseCode,
                        courseDescription,
                      ),
                    ],
                    ["Current Year Level", studentYearLevel],
                    [
                      "Enrolled Status",
                      isenrolled
                        ? "Currently Enrolled"
                        : "Currently Not Enrolled",
                    ],
                  ].map(([label, value]) => (
                    <Grid item xs={12} sm={6} key={label}>
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
                        {cleanDisplayValue(value, "—")}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}

            <Stack spacing={1}>
              <Typography
                sx={{
                  fontSize: "11px",
                  textAlign: "left",
                  fontWeight: 700,
                  color: TOKEN.textMid,
                  mb: 0.75,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Student Number:
              </Typography>
              <TextField
                label="Student Number"
                fullWidth
                size="small"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchStudent();
                }}
                sx={{ "& .MuiOutlinedInput-root": { fontSize: "13px" } }}
              />
              <Typography
                sx={{
                  fontSize: "11px",
                  textAlign: "left",
                  fontWeight: 700,
                  color: TOKEN.textMid,
                  mb: 0.75,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Search by Course Code or Description:
              </Typography>
              <TextField
                label="Search by Course Code or Description"
                size="small"
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: "13px",
                    marginBottom: 3,
                  },
                }}
              />
              <Button
                variant="contained"
                fullWidth
                onClick={handleSearchStudent}
                sx={{
                  backgroundColor: headerColor,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "13px",
                  mt: 3,
                  textTransform: "none",
                  height: 38,
                  boxShadow: "none",
                }}
              >
                Search Student
              </Button>
            </Stack>
          </Box>

          {/* Courses table */}
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 520 }}>
              <TableHead
                sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}
              >
                <TableRow>
                  {[
                    "Code",
                    "Description",
                    "Subject Type",
                    "Units",
                    "Prerequisites",
                    "Enrolled",
                    "Add Subject",
                  ].map((h) => (
                    <StyledTh key={h} headerColor={headerColor}>
                      {h}
                    </StyledTh>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {courses
                  .filter((c) => {
                    const text = searchQuery.toLowerCase();
                    return (
                      c.course_code.toLowerCase().includes(text) ||
                      c.course_description.toLowerCase().includes(text)
                    );
                  })
                  .map((c) => (
                    <TableRow
                      key={c.course_id}
                      sx={{
                        ...getCourseRowSx(c),
                        transition: "background-color .12s",
                      }}
                    >
                      <StyledTd
                        sx={{
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                        }}
                      >
                        {c.course_code}
                      </StyledTd>
                      <StyledTd
                        sx={{
                          textAlign: "left",
                          px: 1.5,
                          maxWidth: 180,
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        {c.course_description}
                      </StyledTd>
                      <StyledTd sx={{ border: `1px solid ${borderColor}` }}>
                        {c.subject_type_name || "—"}
                      </StyledTd>
                      <StyledTd
                        sx={{
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                        }}
                      >
                        {c.course_unit}
                      </StyledTd>
                      <StyledTd
                        sx={{
                          fontSize: "11px",
                          color: TOKEN.textMid,
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                        }}
                      >
                        {c.prereq
                          ? c.prereq
                            .split(",")
                            .map((p) => p.trim())
                            .join(", ")
                          : "—"}
                      </StyledTd>
                      <StyledTd
                        sx={{
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                        }}
                      >
                        <Chip
                          label={subjectCounts[c.course_id] || 0}
                          size="small"
                          sx={{
                            fontSize: "11px",
                            height: 20,
                            backgroundColor: TOKEN.accentSoft,
                            color: TOKEN.accent,
                            fontWeight: 700,
                          }}
                        />
                      </StyledTd>
                      <StyledTd
                        sx={{
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                        }}
                      >
                        {!isEnrolledCourse(c.course_id) ? (
                          <Button
                            variant="contained"
                            onClick={() => handleEnrollClick(c)}
                            disabled={!userId}
                            sx={{
                              fontSize: "14px",
                              fontWeight: 600,
                              textTransform: "none",
                              height: 36,
                              px: 2,
                            }}
                          >
                            <AddIcon sx={{ fontSize: 18, mr: 0.5 }} />
                            Enroll
                          </Button>
                        ) : (
                          <Chip
                            label="✓ Enrolled"
                            sx={{
                              fontSize: "13px",
                              height: 32,
                              px: 1,
                              backgroundColor: TOKEN.green,
                              color: "#fff",
                              fontWeight: 600,
                            }}
                          />
                        )}
                      </StyledTd>
                    </TableRow>
                  ))}
                {courses.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      sx={{
                        textAlign: "center",
                        color: TOKEN.textLight,
                        py: 4,
                        fontSize: "13px",
                      }}
                    >
                      No courses available. Search for a student to load
                      courses.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Card>

        {/* ═══════ RIGHT PANEL — Enrolled Courses ═══════ */}
        <Card sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2.5,
              py: 1.5,
              backgroundColor: headerColor,
            }}
          >
            <Typography
              sx={{
                color: "#fff",
                fontWeight: 700,
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Enrolled Courses
            </Typography>
            <Button
              size="small"
              onClick={() => {
                if (studentNumber) {
                  localStorage.setItem("studentNumberForCOR", studentNumber);
                  window.open("/registrar_search_certificate_of_registration", "_blank");
                } else {
                  setSnack({
                    open: true,
                    message: "Please select or provide a student number first",
                    severity: "warning",
                  });
                }
              }}
              sx={{
                backgroundColor: TOKEN.gold,
                color: headerColor,
                fontWeight: 800,
                fontSize: "11px",
                textTransform: "none",
                height: 28,
                px: 1.5,
                boxShadow: "none",
                "&:hover": { backgroundColor: "#d97706", boxShadow: "none" },
              }}
            >
              📄 COR
            </Button>
          </Box>

          {/* Section picker */}
          <Box
            sx={{
              p: 2,
              borderBottom: `1px solid ${TOKEN.border}`,
              backgroundColor: "#fafafa",
            }}
          >
            <Typography
              sx={{
                fontSize: "11px",
                textAlign: "left",
                fontWeight: 700,
                color: TOKEN.textMid,
                mb: 0.75,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Department Section
            </Typography>
            {loading ? (
              <Box sx={{ width: "100%", mt: 1 }}>
                <LinearWithValueLabel />
              </Box>
            ) : error ? (
              <Typography color="error" sx={{ fontSize: "12px" }}>
                {error}
              </Typography>
            ) : (
              <TextField
                select
                fullWidth
                value={selectedSection}
                onChange={handleSectionChange}
                size="small"
                label="Select a Department Section"
                sx={{ "& .MuiOutlinedInput-root": { fontSize: "13px" } }}
              >
                <MenuItem value="">
                  <em>Select a department section</em>
                </MenuItem>
                {sections.map((section) => (
                  <MenuItem
                    key={section.department_and_program_section_id}
                    value={section.department_and_program_section_id}
                    sx={{ fontSize: "13px" }}
                  >
                    <strong>
                      {cleanDisplayValue(section.program_code)
                        ? `(${cleanDisplayValue(section.program_code)})`
                        : ""}
                    </strong>
                    &nbsp;
                    {joinDisplayValues(
                      section.program_description,
                      section.major,
                    )}
                    {cleanDisplayValue(section.description)
                      ? ` — ${cleanDisplayValue(section.description)}`
                      : ""}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {/* Year level / bulk buttons */}
            <Typography
              sx={{
                fontSize: "11px",
                textAlign: "left",
                fontWeight: 700,
                color: TOKEN.textMid,
                mt: 1.5,
                mb: 0.75,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Bulk Enroll by Year Level
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
              {yearLevel.map((year_level, index) => (
                <Button
                  key={index}
                  variant="contained"
                  disabled={
                    disableYearButtons ||
                    isBulkEnrollDisabled ||
                    Boolean(isenrolled)
                  }
                  onClick={() =>
                    handleBulkEnrollClick(
                      year_level.year_level_id,
                      formatSemester(activeSemester),
                    )
                  }
                  sx={{
                    backgroundColor: "green",
                    color: "#fff",
                    fontSize: "14px",
                    fontWeight: 600,
                    textTransform: "none",
                    height: 40,
                    px: 2.5,
                    lineHeight: 1.2,
                    boxShadow: "none",
                    "&.Mui-disabled": {
                      backgroundColor: TOKEN.borderStrong,
                      color: TOKEN.textLight,
                    },
                  }}
                >
                  {formatYear(year_level.year_level_description)} ·{" "}
                  {formatSemester(activeSemester)}
                </Button>
              ))}

              <Button
                variant="contained"
                onClick={deleteAllCart}
                sx={{
                  backgroundColor: "#b91c1c",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                  textTransform: "none",
                  height: 40,
                  px: 2.5,
                }}
              >
                Unenroll All
              </Button>
            </Box>
          </Box>

          {/* Enrolled table */}
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 700 }}>
              <TableHead
                sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}
              >
                <TableRow>
                  {[
                    "Code",
                    "Lec",
                    "Lab",
                    "Units",
                    "Section",
                    "Day",
                    "Time",
                    "Room",
                    "Faculty",
                    "Remove Subject",
                  ].map((h) => (
                    <StyledTh key={h} headerColor={headerColor}>
                      {h}
                    </StyledTh>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {enrolled.map((e, idx) => (
                  <TableRow
                    key={idx}
                    sx={{
                      "&:nth-of-type(even)": { backgroundColor: "#f8fafc" },
                      "&:hover": { backgroundColor: TOKEN.accentSoft },
                      transition: "background-color .1s",
                    }}
                  >
                    <StyledTd
                      sx={{
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        color: headerColor,
                        border: `1px solid ${borderColor}`,
                      }}
                    >
                      {e.course_code}
                    </StyledTd>
                    <StyledTd
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                      }}
                    >
                      {e.lec_unit}
                    </StyledTd>
                    <StyledTd
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                      }}
                    >
                      {e.lab_unit}
                    </StyledTd>
                    <StyledTd
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                      }}
                    >
                      {e.course_unit}
                    </StyledTd>
                    <StyledTd
                      sx={{
                        whiteSpace: "nowrap",
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                      }}
                    >
                      {formatSection(e.program_code, e.description) || "—"}
                    </StyledTd>
                    <StyledTd
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                      }}
                    >
                      {cleanDisplayValue(e.day_description, "—")}
                    </StyledTd>
                    <StyledTd
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                      }}
                    >
                      {formatTimeRange(
                        e.school_time_start,
                        e.school_time_end,
                      ) || "—"}
                    </StyledTd>
                    <StyledTd
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                      }}
                    >
                      {cleanDisplayValue(e.room_description, "—")}
                    </StyledTd>
                    <StyledTd
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                      }}
                    >
                      {cleanDisplayValue(e.lname)
                        ? `Prof. ${cleanDisplayValue(e.lname)}`
                        : "—"}
                    </StyledTd>
                    <StyledTd
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                      }}
                    >
                      <Button
                        variant="contained"
                        onClick={() => deleteFromCart(e.id)}
                        sx={{
                          backgroundColor: "#b91c1c",
                          color: "#fff",
                          fontSize: "14px",
                          fontWeight: 600,
                          textTransform: "none",
                          height: 36,
                          px: 2,
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 18, mr: 0.5 }} />
                        Delete
                      </Button>
                    </StyledTd>
                  </TableRow>
                ))}
                {enrolled.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      sx={{
                        textAlign: "center",
                        color: TOKEN.textLight,
                        py: 4,
                        fontSize: "13px",
                      }}
                    >
                      No subjects enrolled yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>

          {/* Total row */}
          {enrolled.length > 0 && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2.5,
                py: 1.25,
                borderTop: `2px solid ${TOKEN.border}`,
                backgroundColor: "#fafafa",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography
                  sx={{ fontWeight: 700, fontSize: "13px", color: headerColor }}
                >
                  Total Units:
                </Typography>
                <Chip
                  label={totalUnits}
                  sx={{
                    backgroundColor: headerColor,
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "13px",
                    height: 26,
                  }}
                />
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={deleteAllCart}
                sx={{
                  borderColor: TOKEN.red,
                  color: TOKEN.red,
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "none",
                  height: 30,
                  "&:hover": { backgroundColor: TOKEN.redSoft },
                }}
              >
                Unenroll All
              </Button>
            </Box>
          )}
        </Card>
      </Box>

      {/* ── CONFIRM DIALOG ── */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleConfirmDialogClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { boxShadow: TOKEN.shadowMd } }}
      >
        <DialogTitle
          sx={{
            backgroundColor: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "15px",
            py: 2,
          }}
        >
          ⚠ Confirm Enrollment
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <DialogContentText
            sx={{
              whiteSpace: "pre-line",
              color: TOKEN.text,
              fontSize: "13px",
              lineHeight: 1.7,
            }}
          >
            {confirmDialogMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleConfirmDialogClose}
            sx={{
              borderColor: TOKEN.red,
              color: TOKEN.red,
              fontWeight: 700,
              textTransform: "none",
              "&:hover": { backgroundColor: TOKEN.redSoft },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmDialogProceed}
            sx={{
              backgroundColor: TOKEN.accent,
              color: "#fff",
              fontWeight: 700,
              textTransform: "none",
              boxShadow: "none",
              "&:hover": {
                backgroundColor: TOKEN.accentHover,
                boxShadow: "none",
              },
            }}
          >
            Yes, Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── SNACKBAR ── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack({ ...snack, open: false })}
          sx={{ width: "100%", fontWeight: 600 }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RegistrarCourseTaggingSummer;
