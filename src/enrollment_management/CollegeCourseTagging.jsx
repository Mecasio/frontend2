import React, { useState, useEffect, useContext, useMemo } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Stack,
  Chip,
  Checkbox,
  Select,
} from "@mui/material";
import LinearWithValueLabel from "../components/LinearWithValueLabel";
import { Snackbar, Alert } from "@mui/material";
import { FaFileExcel } from "react-icons/fa";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import { useLocation } from "react-router-dom";
import {
  getDepartmentIdsFromAdminData,
  resolveStudentRegistrarScope,
  syncRegistrarScopeFromAdminData,
  getScopedDepartmentIds
} from "../utils/registrarCurriculumRestriction";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import CollegeEnrollmentTabs from "../components/CollegeEnrollmentTabs";
import { postAuditEvent, getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import {
  formatCourseHistoryLabel,
  formatStudentDisplayName,
  logBulkCourseEnrollmentHistory,
} from "../utils/studentHistoryLogs";
import { CheckBox } from "@mui/icons-material";

/* ─── Design tokens ─── */
const TOKEN = {
  navyLight: "#1a3260",
  accent: "#2563eb",
  accentHover: "#1d4ed8",
  accentSoft: "#eff6ff",
  gold: "#f59e0b",
  green: "#16a34a",
  greenSoft: "#f0fdf4",
  otherDeptGreen: "#c8d9ce",
  otherDeptGreenHover: "#b7ccbf",
  otherDeptOrange: "#e8c9a8",
  otherDeptOrangeHover: "#dbb791",
  otherDeptSectionGray: "#e8eaed",
  otherDeptSectionGrayHover: "#dde1e6",
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
const Card = ({ children, sx = {}, ...rest }) => (
  <Box
    sx={{
      backgroundColor: TOKEN.surface,
      boxShadow: TOKEN.shadow,
      overflow: "hidden",
      ...sx,
    }}
    {...rest}
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

const getStudentSearchErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  "Unable to search student right now. Please try again.";

const CollegeCourseTagging = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  // ── settings state (unchanged) ──
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
    if (assets.logoUrl)
      setFetchedLogo(assets.logoUrl);
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);



  // ── all original state (unchanged) ──
  const [data, setdata] = useState([]);
  const [currentDate, setCurrentDate] = useState("");
  const [personID, setPersonID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [accessLoading, setAccessLoading] = useState(true);
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
  const pageId = 124;
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
      if (storedRole === "registrar") checkAccess(storedEmployeeID);
      else window.location.href = "/login";
    } else {
      window.location.href = "/login";
    }
  }, []);

  const checkAccess = async (employeeID) => {
    setAccessLoading(true);
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
    } finally {
      setAccessLoading(false);
    }
  };

  const location = useLocation();

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
      setCurrentDate(
        `${month} ${day}, ${year} ${hours}:${minutes}:${seconds} ${ampm}`,
      );
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
  const [sectionLoading, setSectionLoading] = useState(false);
  const [departmentLoading, setDepartmentLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [yearLevel, setYearLevel] = useState([]);
  const [subjectCounts, setSubjectCounts] = useState({});
  const [isenrolled, setIsEnrolled] = useState(null);
  const [disableYearButtons, setDisableYearButtons] = useState(false);
  const [activeSemester, setActiveSemester] = useState("");
  const [activeSemesterId, setActiveSemesterId] = useState(null);
  const isBulkEnrollDisabled =
    String(applyingAs) === "7" || String(applyingAs) === "8";
  const [prereqMap, setPrereqMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [confirmDialogMessage, setConfirmDialogMessage] = useState("");
  const [otherDepartmentList, setOtherDepartmentList] = useState([]);
  const [showOtherDepartmentList, setShowOtherDepartmentList] = useState(true);
  const [openOtherDeptDialog, setOpenOtherDeptDialog] = useState(false);
  const [selectedOtherDepartment, setSelectedOtherDepartment] = useState(null);
  const [grantAccessDialogOpen, setGrantAccessDialogOpen] = useState(false);
  const [selectedRequestorDepartment, setSelectedRequestorDepartment] = useState(null);
  const [completeOtherDepList, setCompleteOtherDepList] = useState([]);
  const [otherDeptCourse, setOtherDeptCourse] = useState([]);
  const [otherDeptTaggedCourses, setOtherDeptTaggedCourses] = useState([]);
  const [otherDeptSections, setOtherDeptSections] = useState([]);
  const [otherDeptDataConfirmation, setOtherDeptDataConfirmation] = useState(false);
  const [selectedGrantedDept, setSelectedGrantedDept] = useState(null);
  const [otherDeptCurriculumDialogOpen, setOtherDeptCurriculumDialogOpen] = useState(false);
  const [selectedOtherDeptCurriculum, setSelectedOtherDeptCurriculum] = useState("");
  const [otherDeptCurriculumLoading, setOtherDeptCurriculumLoading] = useState(false);
  // ── all original logic (unchanged) ──
  const fetchSubjectCounts = async (sectionId) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/subject-enrollment-count`,
        { params: { sectionId } },
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

  const applyEnrolledCourses = (data) => {
    const nextEnrolled = Array.isArray(data) ? data : [];
    setEnrolled(nextEnrolled);
    setIsEnrolled(nextEnrolled.length > 0);
    // Year buttons lock via hasNonSpecialEnrollment from enrolled rows.
    // Always clear this sticky flag so it does not carry over to the next student.
    setDisableYearButtons(false);
    if (nextEnrolled.length > 0) {
      setCourseCode(cleanDisplayValue(nextEnrolled[0].program_code));
      setCourseDescription(
        cleanDisplayValue(nextEnrolled[0].program_description),
      );
      setSectionDescription(cleanDisplayValue(nextEnrolled[0].section));
    }
  };

  const refreshEnrolledCourses = async () => {
    if (!userId || !currId) {
      applyEnrolledCourses([]);
      return [];
    }

    const { data } = await axios.get(
      `${API_BASE_URL}/api/enrolled_courses/${userId}/${currId}`,
      { params: { includeOtherCurricula: true } },
    );
    applyEnrolledCourses(data);
    if (selectedSection) await fetchSubjectCounts(selectedSection);
    return data;
  };

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/get_year_level`)
      .then((res) => setYearLevel(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/get_active_semester`)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setActiveSemester(res.data[0].semester_description);
          setActiveSemesterId(res.data[0].semester_id);
        } else {
          setActiveSemester("No Active Semester");
          setActiveSemesterId(null);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedSection) fetchSubjectCounts(selectedSection);
  }, [selectedSection]);

  useEffect(() => {
    if (currId)
      axios
        .get(`${API_BASE_URL}/api/courses/${currId}`)
        .then((res) => setCourses(res.data))
        .catch((err) => console.error(err));
  }, [currId]);

  useEffect(() => {
    if (userId && currId)
      refreshEnrolledCourses().catch((err) => console.error(err));
  }, [userId, currId]);

  useEffect(() => {
    if (selectedDepartment) fetchDepartmentSections();
  }, [selectedDepartment]);

  useEffect(() => {
    const email = localStorage.getItem("email");
    if (!email) {
      setDepartmentLoading(false);
      setError("No department is assigned to your account.");
      return;
    }

    const loadDepartments = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin_data/${email}`);
        syncRegistrarScopeFromAdminData(res.data);
        const departmentIds = getDepartmentIdsFromAdminData(res.data);

        if (!departmentIds.length) {
          setSelectedDepartment(null);
          setDepartments([]);
          setError("No department is assigned to your account.");
          return;
        }

        const responses = await Promise.all(
          departmentIds.map((departmentId) =>
            axios.get(`${API_BASE_URL}/api/departments/${departmentId}`),
          ),
        );
        const mergedDepartments = responses.flatMap(
          (response) => response.data || [],
        );
        const uniqueDepartments = [
          ...new Map(
            mergedDepartments.map((dep) => [String(dep.dprtmnt_id), dep]),
          ).values(),
        ];

        setDepartments(uniqueDepartments);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch admin data:", err);
        setError("Failed to load your department.");
        setSnack({
          open: true,
          message: "Failed to load your department.",
          severity: "error",
        });
      } finally {
        setDepartmentLoading(false);
      }
    };

    loadDepartments();
  }, []);

  useEffect(() => {
    if (departmentLoading) return;
    const ownIds = departments.length
      ? departments.map((d) => d.dprtmnt_id)
      : getScopedDepartmentIds();
    fetchAllAccessibleDepartments(ownIds);
  }, [departmentLoading, departments]);

  useEffect(() => {
    fetchCompleteOtherDepList();
  }, []);

  const fetchAllAccessibleDepartments = async (ownDepartmentIds) => {
    try {
      const [deptRes, grantRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/get_department`),
        axios.get(`${API_BASE_URL}/api/other-departments`, {
          params: { deptIds: ownDepartmentIds },
        }),
      ]);

      const ownIds = new Set(
        (ownDepartmentIds || []).map((id) => String(id))
      );
      const grantedIds = new Set(
        grantRes.data.map((row) => String(row.request_dept_id)),
      );

      const merged = new Map();

      // Step 1: add "granted" departments first
      deptRes.data.forEach((dept) => {
        if (grantedIds.has(String(dept.dprtmnt_id))) {
          merged.set(String(dept.dprtmnt_id), { ...dept, accessType: "granted" });
        }
      });

      // Step 2: add/overwrite with "own" departments — own takes priority
      deptRes.data.forEach((dept) => {
        if (ownIds.has(String(dept.dprtmnt_id))) {
          merged.set(String(dept.dprtmnt_id), { ...dept, accessType: "own" });
        }
      });

      const result = Array.from(merged.values());

      setOtherDepartmentList(result);
      console.log(result);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  };



  const fetchCompleteOtherDepList = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/get_department`);

      setCompleteOtherDepList(response.data);
    } catch (err) {
      console.error("Failed to fetch complete other departments:", err);
    }
  }

  const handleShowDepartmentList = (event) => {
    setShowOtherDepartmentList(event.target.checked);
  }

  const handleOpenOtherDeptDialog = (department) => {
    setOpenOtherDeptDialog(true);
    setSelectedOtherDepartment(department);
  };

  const handleOpenConfirmationDeptDataDialog = (dep) => {
    setOtherDeptDataConfirmation(true);
    setSelectedGrantedDept(dep);
  }

  const handleGrantAccessDialogOpen = () => {
    setGrantAccessDialogOpen(true);
  };

  const handleGrantAccess = async (department) => {
    if (!department) {
      setSnack({
        open: true,
        message: "No department selected for granting access.",
        severity: "error",
      });
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/department/grant-access`,
        {
          request_dept_id: selectedOtherDepartment.dprtmnt_id,
          requesting_dept_id: department,
        },
        auditConfig,
      );
      setSnack({
        open: true,
        message: "Access granted successfully.",
        severity: "success",
      });
      setGrantAccessDialogOpen(false);
      setOpenOtherDeptDialog(false);
    } catch (err) {
      console.error("Failed to grant access:", err);
      setSnack({
        open: true,
        message: "Failed to grant access.",
        severity: "error",
      });
    }
  };

  const handleViewDeptData = async (deptId) => {
    if (!deptId) return;

    try {
      setOtherDeptCurriculumLoading(true);
      setOtherDeptDataConfirmation(false);
      setSelectedOtherDeptCurriculum("");

      const { data } = await axios.get(
        `${API_BASE_URL}/api/dprtmnt_curriculum/${deptId}`,
      );
      const activeCurricula = (Array.isArray(data) ? data : []).filter(
        (c) => Number(c.lock_status) === 1,
      );
      setOtherDeptCourse(activeCurricula);
      setOtherDeptCurriculumDialogOpen(true);
    } catch (err) {
      console.error("Failed to fetch department curriculum:", err);
      setOtherDeptCourse([]);
      setSnack({
        open: true,
        message: "Failed to load department curriculum.",
        severity: "error",
      });
    } finally {
      setOtherDeptCurriculumLoading(false);
    }
  };

  const getOtherDeptCurriculumLabel = (curriculum) => {
    if (!curriculum) return "";
    const year = curriculum.year_description || "";
    const code = curriculum.p_code || curriculum.program_code || "";
    const description =
      curriculum.p_description || curriculum.program_description || "";
    const major = curriculum.p_major || curriculum.major || "";
    return `${year}${code ? `: (${code})` : ""}${description ? ` ${description}` : ""}${major ? ` (${major})` : ""}`.trim();
  };

  const handleContinueOtherDeptCurriculum = async () => {
    if (!selectedOtherDeptCurriculum) return;

    const curriculumId = selectedOtherDeptCurriculum;
    const deptId = selectedGrantedDept?.dprtmnt_id;

    try {
      setOtherDeptCurriculumLoading(true);

      const [courseRes, sectionRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/courses/${curriculumId}`),
        deptId
          ? axios.get(`${API_BASE_URL}/api/department-sections`, {
            params: { departmentId: deptId },
          })
          : Promise.resolve({ data: [] }),
      ]);

      const incomingCourses = Array.isArray(courseRes.data) ? courseRes.data : [];
      const incomingSections = (
        Array.isArray(sectionRes.data) ? sectionRes.data : []
      ).filter((s) => String(s.curriculum_id) === String(curriculumId));

      // Keep other-dept data in separate state so main reload does not wipe it.
      setOtherDeptTaggedCourses((prev) => {
        const existingIds = new Set(prev.map((c) => String(c.course_id)));
        const toAdd = incomingCourses.filter(
          (c) => !existingIds.has(String(c.course_id)),
        );
        return [...prev, ...toAdd];
      });

      setOtherDeptSections((prev) => {
        const existingIds = new Set(
          prev.map((s) => String(s.department_and_program_section_id)),
        );
        const toAdd = incomingSections.filter(
          (s) =>
            !existingIds.has(String(s.department_and_program_section_id)),
        );
        return [...prev, ...toAdd];
      });

      setOtherDeptCurriculumDialogOpen(false);
      setSelectedOtherDeptCurriculum("");
      setSnack({
        open: true,
        message: `Courses and sections from ${selectedGrantedDept?.dprtmnt_name || "other department"} loaded.`,
        severity: "success",
      });
    } catch (err) {
      console.error("Failed to fetch other department courses/sections:", err);
      setSnack({
        open: true,
        message: "Failed to load other department courses or sections.",
        severity: "error",
      });
    } finally {
      setOtherDeptCurriculumLoading(false);
    }
  };

  const availableCourses = useMemo(() => {
    const existingIds = new Set(courses.map((c) => String(c.course_id)));
    const extras = otherDeptTaggedCourses.filter(
      (c) => !existingIds.has(String(c.course_id)),
    );
    return [...courses, ...extras];
  }, [courses, otherDeptTaggedCourses]);

  const otherDeptCourseIds = useMemo(() => {
    const existingIds = new Set(courses.map((c) => String(c.course_id)));
    return new Set(
      otherDeptTaggedCourses
        .filter((c) => !existingIds.has(String(c.course_id)))
        .map((c) => String(c.course_id)),
    );
  }, [courses, otherDeptTaggedCourses]);

  const availableSections = useMemo(() => {
    const existingIds = new Set(
      sections.map((s) => String(s.department_and_program_section_id)),
    );
    const extras = otherDeptSections.filter(
      (s) =>
        !existingIds.has(String(s.department_and_program_section_id)),
    );
    return [...sections, ...extras];
  }, [sections, otherDeptSections]);

  const otherDeptSectionIds = useMemo(() => {
    const existingIds = new Set(
      sections.map((s) => String(s.department_and_program_section_id)),
    );
    return new Set(
      otherDeptSections
        .filter(
          (s) =>
            !existingIds.has(String(s.department_and_program_section_id)),
        )
        .map((s) => String(s.department_and_program_section_id)),
    );
  }, [sections, otherDeptSections]);

  const detectedDepartment = departments.find(
    (dep) => String(dep.dprtmnt_id) === String(selectedDepartment),
  );

  const fetchDepartmentSections = async () => {
    try {
      setSectionLoading(true);
      setError(null);
      const response = await axios.get(
        `${API_BASE_URL}/api/department-sections`,
        { params: { departmentId: selectedDepartment } },
      );
      setSections(response.data);
      setSectionLoading(false);
    } catch (err) {
      console.error("Error fetching department sections:", err);
      setError("Failed to load department sections");
      setSectionLoading(false);
    }
  };

  const handleSectionChange = async (e) => {
    const sectionId = e.target.value;
    const isOtherDeptSection = otherDeptSectionIds.has(String(sectionId));

    // Other-dept sections are view/select only — never change active_curriculum
    // or rewrite the student's program/curriculum fields.
    if (isOtherDeptSection || sectionId === "") {
      setSelectedSection(sectionId);
      return;
    }

    if (!canEdit) {
      setSnack({
        open: true,
        message: "You do not have permission to change active curriculum.",
        severity: "error",
      });
      return;
    }

    setSelectedSection(sectionId);
    try {
      await axios.put(`${API_BASE_URL}/api/update-active-curriculum`, {
        studentId: studentNumber,
        departmentSectionId: sectionId,
      });
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

  const isEnrolled = (course_id) =>
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
      if (typeof data.allowed !== "boolean")
        return {
          allowed: false,
          reason: "ERROR",
          status: data.status,
          message: data.message || "Invalid response from prerequisite API.",
        };
      if (data.allowed)
        return {
          allowed: true,
          reason: "OK",
          status: data.status,
          message: data.message,
        };
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
      if (!userId || availableCourses.length === 0 || !currId) {
        setPrereqMap({});
        return;
      }

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/api/check-prerequisites-batch`,
          {
            student_number: userId,
            curriculum_id: currId,
            courses: availableCourses.map((course) => ({
              course_id: course.course_id,
              semester_id: course.semester_id,
            })),
          },
        );

        const map = {};
        for (const course of availableCourses) {
          const result = data.results?.[String(course.course_id)];
          if (!result) continue;
          map[course.course_id] = {
            allowed: !!result.allowed,
            hasPrereq: !!result.hasPrereq,
          };
        }
        setPrereqMap(map);
      } catch (err) {
        console.error("Failed to load prerequisite status:", err);
        setPrereqMap({});
      }
    };

    computePrereqStatus();
  }, [userId, availableCourses, currId]);

  const addToCart = async (course) => {
    if (!canCreate) {
      setSnack({
        open: true,
        message: "You do not have permission to enroll subjects.",
        severity: "error",
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
    if (isEnrolled(course.course_id)) return;

    const isOtherDeptCourse = otherDeptCourseIds.has(String(course.course_id));

    if (isOtherDeptCourse) {
      if (
        !selectedSection ||
        !otherDeptSectionIds.has(String(selectedSection))
      ) {
        setSnack({
          open: true,
          message:
            "Please select an other department section before enrolling this course.",
          severity: "warning",
        });
        return;
      }

      if (!course.curriculum_id) {
        setSnack({
          open: true,
          message: "Missing curriculum for this other department course.",
          severity: "error",
        });
        return;
      }

      try {
        await axios.post(
          `${API_BASE_URL}/api/add-other-department-enrolled-course/${userId}`,
          {
            subject_id: course.course_id,
            department_section_id: selectedSection,
            curriculum_id: course.curriculum_id,
          },
          auditConfig,
        );
        await refreshEnrolledCourses();
        if (selectedSection) await fetchSubjectCounts(selectedSection);
        setSnack({
          open: true,
          message: `Enrolled ${course.course_code} successfully.`,
          severity: "success",
        });
      } catch (err) {
        setSnack({
          open: true,
          message: "Error enrolling in this course. Please try again.",
          severity: "error",
        });
      }
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

    const payload = {
      subject_id: course.course_id,
      department_section_id: selectedSection,
    };
    try {
      await axios.post(
        `${API_BASE_URL}/api/add-to-enrolled-courses/${userId}/${currId}/`,
        payload,
        auditConfig,
      );
      await refreshEnrolledCourses();
      setSnack({
        open: true,
        message: `Enrolled ${course.course_code} successfully.`,
        severity: "success",
      });
    } catch (err) {
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
    if (!id) return;
    try {
      await axios.delete(
        `${API_BASE_URL}/api/courses/delete/${id}`,
        auditConfig,
      );
      await refreshEnrolledCourses();
      setSnack({
        open: true,
        message: "Subject unenrolled successfully.",
        severity: "success",
      });
    } catch (err) {
      setSnack({
        open: true,
        message: "Error unenrolling subject. Please check the console.",
        severity: "error",
      });
    }
  };

  const getSelectedSectionLabel = () => {
    const section = availableSections.find(
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
    const newCourses = availableCourses.filter(
      (c) =>
        !isEnrolled(c.course_id) &&
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
      const enrolledYearMeta = yearLevel.find(
        (y) => Number(y.year_level_id) === Number(yearLevelId),
      );
      // Special/bridging must not lock the other year-level buttons.
      if (
        String(enrolledYearMeta?.level_type || "")
          .trim()
          .toLowerCase() !== "special"
      ) {
        setDisableYearButtons(true);
      }

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
      await axios.delete(
        `${API_BASE_URL}/api/courses/user/${userId}`,
        auditConfig,
      );
      await refreshEnrolledCourses();
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
    if (departmentLoading) {
      setSnack({
        open: true,
        message: "Department scope is still loading. Please try again.",
        severity: "warning",
      });
      return;
    }
    try {
      const scopeResult = await resolveStudentRegistrarScope(
        studentNumber.trim(),
      );
      if (scopeResult.error) {
        setApplyingAs("");
        setUserId(null);
        setCurr(null);
        setCourses([]);
        setOtherDeptTaggedCourses([]);
        setOtherDeptSections([]);
        setEnrolled([]);
        setIsEnrolled(false);
        setDisableYearButtons(false);
        setCurriculumYear("");
        setStudentYearLevel("");
        setSectionDescription("");
        setUserFirstName(null);
        setUserMiddleName(null);
        setUserLastName(null);
        setSelectedDepartment(null);
        setSelectedSection("");
        setSections([]);
        setSnack({ open: true, message: scopeResult.error, severity: "error" });
        return;
      }

      setSelectedDepartment(scopeResult.dprtmntId);
      setSelectedSection("");
      // Clear previous student's enrollment UI so bulk-enroll buttons unlock
      // until this student's enrolled subjects are loaded.
      setEnrolled([]);
      setDisableYearButtons(false);
      const {
        token2,
        isEnrolled,
        person_id2,
        studentNumber: studentNum,
        section,
        department_section_id: departmentSectionId,
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
      } = scopeResult.preload;
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
      setSelectedSection(
        departmentSectionId != null && String(departmentSectionId).trim() !== ""
          ? String(departmentSectionId)
          : "",
      );
      setIsEnrolled(isEnrolled);
      await logStudentBasicInfoSearch({
        studentNumber: studentNum,
        firstName: first_name,
        middleName: middle_name,
        lastName: last_name,
      });
      setSnack({
        open: true,
        message: "Student found and authenticated!",
        severity: "success",
      });
    } catch (error) {
      setApplyingAs("");
      setUserId(null);
      setCurr(null);
      setCourses([]);
      setOtherDeptTaggedCourses([]);
      setOtherDeptSections([]);
      setEnrolled([]);
      setIsEnrolled(false);
      setDisableYearButtons(false);
      setCurriculumYear("");
      setStudentYearLevel("");
      setSectionDescription("");
      setUserFirstName(null);
      setUserMiddleName(null);
      setUserLastName(null);
      setSelectedDepartment(null);
      setSelectedSection("");
      setSections([]);
      setSnack({
        open: true,
        message: getStudentSearchErrorMessage(error),
        severity: "error",
      });
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const studentNumberFromUrl = params.get("student_number")?.trim();
    const personIdFromUrl = params.get("person_id")?.trim();

    if (!studentNumberFromUrl && !personIdFromUrl) return;

    let cancelled = false;

    const applyStudentNumber = (resolvedStudentNumber) => {
      if (cancelled || !resolvedStudentNumber) return;
      setStudentNumber(resolvedStudentNumber);
      sessionStorage.setItem("edit_student_number", resolvedStudentNumber);
    };

    const skipAutoSearchForInactiveTerm = async () => {
      const listYearId = sessionStorage.getItem("edit_list_year_id");
      const listSemesterId = sessionStorage.getItem("edit_list_semester_id");

      // Only gate auto-search when the student was picked under a specific list term.
      if (!listYearId || !listSemesterId) return false;

      try {
        const res = await axios.get(`${API_BASE_URL}/api/active_school_year`);
        const active = Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
        if (!active) return false;

        const sameYear = String(active.year_id) === String(listYearId);
        const sameSemester = String(active.semester_id) === String(listSemesterId);
        if (sameYear && sameSemester) return false;

        setStudentNumber("");
        setUserId(null);
        setCurr(null);
        setCourses([]);
        setOtherDeptTaggedCourses([]);
        setOtherDeptSections([]);
        setEnrolled([]);
        setIsEnrolled(false);
        setSnack({
          open: true,
          message:
            "Selected student is from a different school year/semester than the active term. Search manually if needed.",
          severity: "info",
        });
        return true;
      } catch (err) {
        console.error("Failed to verify active school year for auto-search:", err);
        return false;
      }
    };

    const runAutoSearch = async () => {
      const shouldSkip = await skipAutoSearchForInactiveTerm();
      if (cancelled || shouldSkip) return;

      if (studentNumberFromUrl) {
        applyStudentNumber(studentNumberFromUrl);
        return;
      }

      setStudentNumber("");
      setUserId(null);
      setCurr(null);
      setCourses([]);
      setOtherDeptTaggedCourses([]);
      setOtherDeptSections([]);
      setEnrolled([]);
      setIsEnrolled(false);

      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/student-person-data/${personIdFromUrl}`,
        );
        if (cancelled) return;
        const resolvedStudentNumber = res.data?.student_number;
        if (resolvedStudentNumber) {
          applyStudentNumber(resolvedStudentNumber);
          sessionStorage.setItem("edit_person_id", personIdFromUrl);
        } else {
          setSnack({
            open: true,
            message: "No student number found for the selected person.",
            severity: "warning",
          });
        }
      } catch (err) {
        console.error("Auto search failed:", err);
      }
    };

    runAutoSearch();
    return () => {
      cancelled = true;
    };
  }, [location.search]);

  const [selectedFile, setSelectedFile] = useState(null);

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
      } else
        setSnack({
          open: true,
          message: res.data.error || "Failed to import",
          severity: "error",
        });
    } catch (err) {
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
    const isOtherDept = otherDeptCourseIds.has(String(course.course_id));
    const hasListedPrereq = Boolean(
      course.prereq && String(course.prereq).trim(),
    );

    // Orange category:
    // 1) API says unmet prerequisite, OR
    // 2) other-dept course has a listed prereq but batch check didn't
    //    recognize it (e.g. description text → hasPrereq:false / allowed)
    const isOrangeCategory =
      (status?.hasPrereq && !status.allowed) ||
      (isOtherDept &&
        hasListedPrereq &&
        !(status?.hasPrereq && status?.allowed));

    if (isOrangeCategory) {
      return isOtherDept
        ? {
          backgroundColor: TOKEN.otherDeptOrange,
          "&:hover": { backgroundColor: TOKEN.otherDeptOrangeHover },
        }
        : {
          backgroundColor: TOKEN.orangeSoft,
          "&:hover": { backgroundColor: "#fed7aa" },
        };
    }

    if (isOtherDept) {
      return {
        backgroundColor: TOKEN.otherDeptGreen,
        "&:hover": { backgroundColor: TOKEN.otherDeptGreenHover },
      };
    }

    if (!status) return {};
    return {
      backgroundColor: TOKEN.greenSoft,
      "&:hover": { backgroundColor: "#dcfce7" },
    };
  };

  const handleEnrollClick = async (course) => {
    const isOtherDeptCourse = otherDeptCourseIds.has(String(course.course_id));

    if (isOtherDeptCourse) {
      if (
        !selectedSection ||
        !otherDeptSectionIds.has(String(selectedSection))
      ) {
        setSnack({
          open: true,
          message:
            "Please select an other department section before enrolling this course.",
          severity: "warning",
        });
        return;
      }
    } else if (!selectedSection) {
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
    if (isEnrolled(course.course_id)) return;
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
    const newCourses = availableCourses.filter(
      (c) =>
        !isEnrolled(c.course_id) &&
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

  const isSpecialYearLevel = (yearLevelRow) =>
    String(yearLevelRow?.level_type || "")
      .trim()
      .toLowerCase() === "special";

  // Same year + semester filter as bulk enroll; button updates after refreshEnrolledCourses.
  const getTaggableCoursesForYearLevel = (yearLevelId) =>
    availableCourses.filter(
      (c) =>
        Number(c.year_level_id) === Number(yearLevelId) &&
        (activeSemesterId
          ? Number(c.semester_id) === Number(activeSemesterId)
          : true),
    );

  // Disable special bulk only when every taggable special subject is already enrolled
  // (partial tagging keeps the button on so remaining subjects can still be bulk-added).
  const isSpecialYearFullyEnrolled = (yearLevelId) => {
    const tagged = getTaggableCoursesForYearLevel(yearLevelId);
    if (tagged.length === 0) return false;
    return tagged.every((c) => isEnrolled(c.course_id));
  };

  // Regular year buttons should ignore special/bridging-only enrollments.
  const hasNonSpecialEnrollment = enrolled.some((row) => {
    const tagged = availableCourses.find(
      (c) => Number(c.course_id) === Number(row.course_id),
    );
    if (!tagged) return true;
    return !isSpecialYearLevel(
      yearLevel.find(
        (y) => Number(y.year_level_id) === Number(tagged.year_level_id),
      ),
    );
  });

  const formatSemester = (semester) => {
    const map = {
      "First Semester": "1st Sem",
      "Second Semester": "2nd Sem",
      Summer: "Summer",
    };
    return map[semester] || semester;
  };

  useEffect(() => {
    if (!studentNumber?.trim()) return;
    if (departmentLoading) return;
    const delayDebounce = setTimeout(() => {
      handleSearchStudent();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [studentNumber, departmentLoading]);

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

  const totalUnits =
    enrolled.reduce(
      (sum, item) => sum + (parseFloat(item.course_unit) || 0),
      0,
    ) +
    enrolled.reduce((sum, item) => sum + (parseFloat(item.lab_unit) || 0), 0);

  if (accessLoading || hasAccess === null)
    return <LoadingOverlay open message="Loading..." />;
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
      {/* ── Header ── */}
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
      <CollegeEnrollmentTabs />
      <br />
      <br />

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

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
            <Checkbox
              checked={showOtherDepartmentList}
              onChange={handleShowDepartmentList}
              sx={{ ml: 2, mt: 1 }}
            />
            <Typography sx={{ mt: 1 }}>Show Other Department</Typography>
          </Box>

          {showOtherDepartmentList && (
            <Box sx={{ p: 2, borderBottom: `1px solid ${TOKEN.border}` }}>
              {otherDepartmentList.length > 0 ? (
                <Stack
                  direction="row"
                  useFlexGap
                  sx={{
                    flexWrap: "wrap",
                    gap: 1,
                    justifyContent: "flex-start",
                  }}
                >
                  {otherDepartmentList.map((dep) => (
                    <Typography
                      onClick={() =>
                        dep.accessType === "own"
                          ? handleOpenOtherDeptDialog(dep)
                          : handleOpenConfirmationDeptDataDialog(dep)
                      }
                      sx={{
                        flex: "0 0 auto",
                        minWidth: 120,
                        padding: "4px 10px",
                        background: dep.accessType === "own" ? "maroon" : "#163600",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                      key={dep.dprtmnt_id}
                    >
                      {dep.dprtmnt_code}
                      {dep.accessType === "granted" && (
                        <span style={{ fontSize: "10px", marginLeft: 6, opacity: 0.85, }}>
                          (Granted Access)
                        </span>
                      )}
                    </Typography>
                  ))}
                </Stack>
              ) : (
                <Typography>No other departments available.</Typography>
              )}
            </Box>
          )}

          {/* Student search */}
          <Box
            sx={{
              p: 2,
              borderBottom: `1px solid ${TOKEN.border}`,
              backgroundColor: "#fafafa",
            }}
          >
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
              <TableHead>
                <TableRow>
                  {[
                    "Code",
                    "Description",
                    "Subject Type",
                    "Credit Unit",
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
                {availableCourses
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
                      <StyledTd sx={{ border: `1px solid ${borderColor}` }}>
                        {c.course_unit}
                      </StyledTd>
                      <StyledTd
                        sx={{
                          fontSize: "11px",
                          color: TOKEN.textMid,
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        {c.prereq
                          ? c.prereq
                            .split(",")
                            .map((p) => p.trim())
                            .join(", ")
                          : "None"}
                      </StyledTd>
                      <StyledTd sx={{ border: `1px solid ${borderColor}` }}>
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
                      <StyledTd sx={{ border: `1px solid ${borderColor}` }}>
                        {!isEnrolled(c.course_id) ? (
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
                {availableCourses.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
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
                  window.open(
                    "/college_search_certification_of_registration",
                    "_blank",
                  );
                } else
                  setSnack({
                    open: true,
                    message: "Please select or provide a student number first",
                    severity: "warning",
                  });
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
            {detectedDepartment && (
              <span
                style={{
                  mb: 1.5,
                  fontSize: "32px",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "start",
                }}
              >
                {`${detectedDepartment.dprtmnt_name} (${detectedDepartment.dprtmnt_code})`}
              </span>
            )}
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
            {departmentLoading || sectionLoading ? (
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
                sx={{ "& .MuiOutlinedInput-root": { fontSize: "13px" } }}
              >
                <MenuItem value="">
                  <em>Select a department section</em>
                </MenuItem>
                {availableSections.map((section) => {
                  const isOtherDeptSection = otherDeptSectionIds.has(
                    String(section.department_and_program_section_id),
                  );
                  return (
                    <MenuItem
                      key={section.department_and_program_section_id}
                      value={section.department_and_program_section_id}
                      sx={{
                        fontSize: "13px",
                        ...(isOtherDeptSection
                          ? {
                            backgroundColor: TOKEN.otherDeptSectionGray,
                            "&:hover": {
                              backgroundColor: TOKEN.otherDeptSectionGrayHover,
                            },
                            "&.Mui-selected": {
                              backgroundColor: TOKEN.otherDeptSectionGrayHover,
                            },
                            "&.Mui-selected:hover": {
                              backgroundColor: TOKEN.otherDeptSectionGrayHover,
                            },
                          }
                          : {}),
                      }}
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
                      {isOtherDeptSection
                        ? ` [${cleanDisplayValue(section.dprtmnt_code) || "Other Dept"}]`
                        : ""}
                    </MenuItem>
                  );
                })}
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
              {yearLevel.map((year_level, index) => {
                const specialYearLevel = isSpecialYearLevel(year_level);
                const specialFullyEnrolled =
                  specialYearLevel &&
                  isSpecialYearFullyEnrolled(year_level.year_level_id);
                return (
                  <Button
                    key={index}
                    variant="contained"
                    title={
                      specialFullyEnrolled
                        ? "All special year subjects for this semester are already enrolled."
                        : undefined
                    }
                    disabled={
                      isBulkEnrollDisabled ||
                      (specialYearLevel
                        ? specialFullyEnrolled
                        : disableYearButtons || hasNonSpecialEnrollment)
                    }
                    onClick={() =>
                      handleBulkEnrollClick(
                        year_level.year_level_id,
                        formatSemester(activeSemester),
                      )
                    }
                    sx={{
                      backgroundColor: specialYearLevel ? "#0f766e" : "green",
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
                );
              })}
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
              <TableHead>
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
                {enrolled.map((e, idx) => {
                  const isOtherDeptEnrolled =
                    currId != null &&
                    e.curriculum_id != null &&
                    String(e.curriculum_id) !== String(currId);

                  return (
                    <TableRow
                      key={e.id ?? idx}
                      sx={{
                        backgroundColor: isOtherDeptEnrolled
                          ? TOKEN.otherDeptSectionGray
                          : TOKEN.surface,
                        "&:hover": {
                          backgroundColor: isOtherDeptEnrolled
                            ? TOKEN.otherDeptSectionGrayHover
                            : TOKEN.accentSoft,
                        },
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
                      <StyledTd sx={{ border: `1px solid ${borderColor}` }}>
                        {e.lec_unit}
                      </StyledTd>
                      <StyledTd sx={{ border: `1px solid ${borderColor}` }}>
                        {e.lab_unit}
                      </StyledTd>
                      <StyledTd sx={{ border: `1px solid ${borderColor}` }}>
                        {e.course_unit}
                      </StyledTd>
                      <StyledTd
                        sx={{
                          whiteSpace: "nowrap",
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        {formatSection(e.program_code, e.description) || "—"}
                      </StyledTd>
                      <StyledTd sx={{ border: `1px solid ${borderColor}` }}>
                        {cleanDisplayValue(e.day_description, "—")}
                      </StyledTd>
                      <StyledTd sx={{ border: `1px solid ${borderColor}` }}>
                        {formatTimeRange(
                          e.school_time_start,
                          e.school_time_end,
                        ) || "—"}
                      </StyledTd>
                      <StyledTd sx={{ border: `1px solid ${borderColor}` }}>
                        {cleanDisplayValue(e.room_description, "—")}
                      </StyledTd>
                      <StyledTd sx={{ border: `1px solid ${borderColor}` }}>
                        {cleanDisplayValue(e.lname)
                          ? `Prof. ${cleanDisplayValue(e.lname)}`
                          : "—"}
                      </StyledTd>
                      <StyledTd sx={{ border: `1px solid ${borderColor}` }}>
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
                  );
                })}
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

      {/* ── OTHER DEPARTMENT REQUEST FORM ── */}
      <Dialog
        open={openOtherDeptDialog}
        onClose={() => setOpenOtherDeptDialog(false)}
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
          ⚠ Grant Access Permission to Other Department
        </DialogTitle>
        <DialogContent
          sx={{
            marginTop: 4,
            whiteSpace: "pre-line",
            color: TOKEN.text,
            fontSize: "13px",
            lineHeight: 1.7,
          }}
        >
          <Box>
            <Typography sx={{ mb: 1.5, fontSize: "13px" }}>
              Requested Department: <strong>{selectedOtherDepartment?.dprtmnt_name}</strong>
            </Typography>
            <Typography sx={{ mb: 1.5, fontSize: "13px" }}>
              Select the department requesting access
            </Typography>
            <Select
              value={selectedRequestorDepartment}
              onChange={(e) => setSelectedRequestorDepartment(e.target.value)}
              displayEmpty
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="" disabled>
                Select a department
              </MenuItem>
              {completeOtherDepList.map((dept) => (
                <MenuItem key={dept.dprtmnt_id} value={dept}>
                  {dept.dprtmnt_name}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            sx={{
              borderColor: TOKEN.red,
              color: TOKEN.red,
              fontWeight: 700,
              textTransform: "none",
              "&:hover": { backgroundColor: TOKEN.redSoft },
            }}
            onClick={() => setOpenOtherDeptDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => handleGrantAccessDialogOpen(selectedRequestorDepartment)}
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
            Grant Access
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── OTHER DEPARTMENT CONFIRMATION DIALOG ── */}
      <Dialog
        open={grantAccessDialogOpen}
        onClose={() => setGrantAccessDialogOpen(false)}
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
          ⚠ Grant Access Permission to Other Department
        </DialogTitle>
        <DialogContent
          sx={{
            marginTop: 4,
            whiteSpace: "pre-line",
            color: TOKEN.text,
            fontSize: "13px",
            lineHeight: 1.7,
          }}
        >
          <DialogContentText>
            Are you sure you want to grant access permission to the department {selectedOtherDepartment?.dprtmnt_name}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            sx={{
              borderColor: TOKEN.red,
              color: TOKEN.red,
              fontWeight: 700,
              textTransform: "none",
              "&:hover": { backgroundColor: TOKEN.redSoft },
            }}
            onClick={() => setGrantAccessDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => handleGrantAccess(selectedRequestorDepartment.dprtmnt_id)}
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
            Yes, Grant Access
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={otherDeptDataConfirmation}
        onClose={() => setOtherDeptDataConfirmation(false)}
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
          ⚠ Access Data of Other Department
        </DialogTitle>
        <DialogContent
          sx={{
            marginTop: 4,
            whiteSpace: "pre-line",
            color: TOKEN.text,
            fontSize: "13px",
            lineHeight: 1.7,
          }}
        >
          <DialogContentText>
            Do you want to display the courses and section of the {selectedGrantedDept?.dprtmnt_name}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            sx={{
              borderColor: TOKEN.red,
              color: TOKEN.red,
              fontWeight: 700,
              textTransform: "none",
              "&:hover": { backgroundColor: TOKEN.redSoft },
            }}
            onClick={() => setOtherDeptDataConfirmation(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={otherDeptCurriculumLoading || !selectedGrantedDept?.dprtmnt_id}
            onClick={() => handleViewDeptData(selectedGrantedDept?.dprtmnt_id)}
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
            {otherDeptCurriculumLoading ? "Loading..." : "Yes, Continue"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── OTHER DEPARTMENT CURRICULUM SELECT ── */}
      <Dialog
        open={otherDeptCurriculumDialogOpen}
        onClose={() => setOtherDeptCurriculumDialogOpen(false)}
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
          Select Curriculum — {selectedGrantedDept?.dprtmnt_name}
        </DialogTitle>
        <DialogContent
          sx={{
            marginTop: 4,
            whiteSpace: "pre-line",
            color: TOKEN.text,
            fontSize: "13px",
            lineHeight: 1.7,
          }}
        >
          <Box>
            <Typography sx={{ mb: 1.5, fontSize: "13px" }}>
              Select a curriculum from{" "}
              <strong>{selectedGrantedDept?.dprtmnt_name}</strong>
            </Typography>
            <Select
              value={selectedOtherDeptCurriculum}
              onChange={(e) => setSelectedOtherDeptCurriculum(e.target.value)}
              displayEmpty
              fullWidth
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="" disabled>
                Select a curriculum
              </MenuItem>
              {otherDeptCourse.length === 0 ? (
                <MenuItem value="__none" disabled>
                  No curriculum found for this department
                </MenuItem>
              ) : (
                otherDeptCourse.map((curriculum) => (
                  <MenuItem
                    key={curriculum.dprtmnt_curriculum_id || curriculum.curriculum_id}
                    value={curriculum.curriculum_id}
                  >
                    {getOtherDeptCurriculumLabel(curriculum)}
                  </MenuItem>
                ))
              )}
            </Select>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            sx={{
              borderColor: TOKEN.red,
              color: TOKEN.red,
              fontWeight: 700,
              textTransform: "none",
              "&:hover": { backgroundColor: TOKEN.redSoft },
            }}
            onClick={() => {
              setOtherDeptCurriculumDialogOpen(false);
              setSelectedOtherDeptCurriculum("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!selectedOtherDeptCurriculum || otherDeptCurriculumLoading}
            onClick={handleContinueOtherDeptCurriculum}
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
            {otherDeptCurriculumLoading ? "Loading..." : "Continue"}
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

export default CollegeCourseTagging;
