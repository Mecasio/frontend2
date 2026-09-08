import React, { useEffect, useState, useContext, useMemo } from "react";
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Radio,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { SettingsContext } from "../App";
import API_BASE_URL from "../apiConfig";
import SearchIcon from "@mui/icons-material/Search";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import ListOutlinedIcon from "@mui/icons-material/ListOutlined";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import BusinessIcon from "@mui/icons-material/Business";
import { DeleteOutline } from "@mui/icons-material";
import axios from "axios";
import Unauthorized from "../components/Unauthorized";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

// ── Constants ──────────────────────────────────────────────────────────────
const REASONS = [
  "Financial",
  "Academics",
  "Change of residence",
  "Residence too far from school",
  "Health",
  "Work",
  "Abroad",
  "Personal",
  "Others",
];

const SUBJECT_HEADERS_FULL = [
  "",
  "Course Code",
  "Description",
  "Credited Units",
  "Schedule",
  "Enrolled By",
  "Registered By",
  "Adjusted By",
];
const SUBJECT_HEADERS_NO_RADIO = SUBJECT_HEADERS_FULL.slice(1);
const COURSE_LIST_HEIGHT = 420;
const COURSE_ROW_HEIGHT = 48;
const COURSE_LIST_OVERSCAN = 6;

// ── Helpers ────────────────────────────────────────────────────────────────
const getInitials = (name = "") =>
  name.trim()
    ? name
        .trim()
        .split(/\s+/)
        .map((w) => w[0].toUpperCase())
        .slice(0, 2)
        .join("")
    : "?";

const hCell = (extraColor) => ({
  fontSize: "10px !important",
  py: "7px !important",
  px: "12px !important",
  bgcolor: "#fafafa",
  whiteSpace: "nowrap",
  ...(extraColor ? { color: `${extraColor} !important` } : {}),
});

const bCell = { fontSize: "12px !important", px: "12px !important" };

// ── Stat Card ──────────────────────────────────────────────────────────────
const StatCard = ({ label, value, accent, color }) => (
  <Box
    sx={{
      flex: 1,
      minWidth: 110,
      bgcolor: accent ? alpha(color, 0.06) : "#f8fafc",
      border: `1px solid ${accent ? alpha(color, 0.2) : "#e2e8f0"}`,
      borderRadius: 2,
      px: 2,
      py: 1.25,
    }}
  >
    <Typography
      sx={{
        fontSize: 10,
        fontWeight: 700,
        color: "#94a3b8",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: 14,
        fontWeight: 700,
        color: accent ? color : "text.primary",
        mt: 0.25,
      }}
    >
      {value || "—"}
    </Typography>
  </Box>
);

// ── Section Card ──────────────────────────────────────────────────────────
const SectionCard = ({ label, accentColor, headerBg, children }) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 2,
      border: `1.5px solid ${alpha(accentColor, 0.3)}`,
      overflow: "hidden",
    }}
  >
    <Box
      sx={{
        px: 2,
        py: 1.25,
        bgcolor: headerBg,
        borderBottom: `1.5px solid ${alpha(accentColor, 0.2)}`,
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: accentColor,
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          color: accentColor,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </Typography>
    </Box>
    {children}
  </Paper>
);

// ── In-List Table ─────────────────────────────────────────────────────────
const InListTable = ({ subjects, selectedSubject, onSelect, color }) => (
  <SectionCard
    label="In List"
    accentColor={color}
    headerBg={alpha(color, 0.06)}
  >
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {SUBJECT_HEADERS_FULL.map((h) => (
              <TableCell key={h} sx={hCell(color)}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {subjects.length > 0 ? (
            subjects.map((s) => (
              <TableRow
                key={s.code}
                hover
                selected={selectedSubject === s.code}
                onClick={() => onSelect(s.code)}
                sx={{
                  cursor: "pointer",
                  "&.Mui-selected": { bgcolor: alpha(color, 0.05) },
                }}
              >
                <TableCell padding="checkbox" sx={{ pl: 1.5 }}>
                  <Radio
                    size="small"
                    checked={selectedSubject === s.code}
                    onChange={() => onSelect(s.code)}
                    sx={{ color: "#cbd5e1", "&.Mui-checked": { color: color } }}
                  />
                </TableCell>
                <TableCell sx={{ ...bCell, fontWeight: 700, color: color }}>
                  {s.code}
                </TableCell>
                <TableCell sx={bCell}>{s.description}</TableCell>
                <TableCell align="center" sx={{ ...bCell, fontWeight: 700 }}>
                  {s.creditedUnits}
                </TableCell>
                <TableCell sx={{ ...bCell, color: "text.secondary" }}>
                  {s.schedule}
                </TableCell>
                <TableCell sx={bCell}>{s.enrolledBy || "—"}</TableCell>
                <TableCell sx={bCell}>{s.registeredBy || "—"}</TableCell>
                <TableCell sx={bCell}>{s.adjustedBy || "—"}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={9}
                align="center"
                sx={{ py: 3, color: "text.secondary", fontStyle: "italic" }}
              >
                No Courses 
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  </SectionCard>
);

// ── Enrollment Status Chip ────────────────────────────────────────────────
const EnrollmentStatusChip = ({ status, hasSubjects }) => {
  const isVerified = !!status && hasSubjects;
  return (
    <Chip
      icon={
        isVerified ? (
          <VerifiedOutlinedIcon
            sx={{ fontSize: "12px !important", color: "#166534 !important" }}
          />
        ) : (
          <ErrorOutlineIcon
            sx={{ fontSize: "12px !important", color: "#92400e !important" }}
          />
        )
      }
      label={isVerified ? status : "Unverified"}
      size="small"
      sx={{
        bgcolor: isVerified ? "#f0fdf4" : "#fffbeb",
        color: isVerified ? "#166534" : "#92400e",
        border: `1px solid ${isVerified ? "#bbf7d0" : "#fcd34d"}`,
        height: 20,
        fontWeight: 600,
        fontSize: 11,
      }}
    />
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
const StudentEnrollment = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};

  const [tab, setTab] = useState(0);
  const [reasonAnchor, setReasonAnchor] = useState(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [form137, setForm137] = useState(false);
  const [transcriptRec, setTranscriptRec] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [pendingDeleteSubject, setPendingDeleteSubject] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [pendingDropSubject, setPendingDropSubject] = useState(null);
  const [isDropConfirmOpen, setIsDropConfirmOpen] = useState(false);
  const [isDroppingCourse, setIsDroppingCourse] = useState(false);
  const [courseList, setCourseList] = useState([]);
  const [isCourseListOpen, setIsCourseListOpen] = useState(false);
  const [isLoadingCourseList, setIsLoadingCourseList] = useState(false);
  const [courseListScrollTop, setCourseListScrollTop] = useState(0);
  const [courseListSearch, setCourseListSearch] = useState("");
  const [showAllChangeSubjects, setShowAllChangeSubjects] = useState(false);
  const [changePrograms, setChangePrograms] = useState([]);
  const [selectedChangeDepartment, setSelectedChangeDepartment] = useState("");
  const [selectedChangeCurriculum, setSelectedChangeCurriculum] = useState("");
  const [selectedChangeYearLevel, setSelectedChangeYearLevel] = useState("");
  const [pendingChangeSubject, setPendingChangeSubject] = useState(null);
  const [selectedChangeCourse, setSelectedChangeCourse] = useState(null);
  const [lastChangedCourse, setLastChangedCourse] = useState(null);
  const [isChangeConfirmOpen, setIsChangeConfirmOpen] = useState(false);
  const [isChangingCourse, setIsChangingCourse] = useState(false);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [addCourseSearch, setAddCourseSearch] = useState("");
  const [addCourseScrollTop, setAddCourseScrollTop] = useState(0);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [addPrograms, setAddPrograms] = useState([]);
  const [taggedCourseList, setTaggedCourseList] = useState([]);
  const [showAllAddSubjects, setShowAllAddSubjects] = useState(false);
  const [yearLevelList, setYearLevelList] = useState([]);
  const [selectedAddDepartment, setSelectedAddDepartment] = useState("");
  const [selectedAddCurriculum, setSelectedAddCurriculum] = useState("");
  const [selectedAddYearLevel, setSelectedAddYearLevel] = useState("");
  const [isAddConfirmOpen, setIsAddConfirmOpen] = useState(false);
  const [pendingAddCourse, setPendingAddCourse] = useState(null);
  const [addConfirmMessage, setAddConfirmMessage] = useState("");
  const [, setAddChecked] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [allStudents, setAllStudents] = useState([]);
  const [studentData, setStudentData] = useState([]);
  const [studentCourses, setStudentCourses] = useState([]);
  const [selectedStudentNumber, setSelectedStudentNumber] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [isLoadingStudentDirectory, setIsLoadingStudentDirectory] = useState(false);
  const [isLoadingStudentRecord, setIsLoadingStudentRecord] = useState(false);
  const [hasAccess, setHasAccess] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const pageId = 126;

  const auditConfig = () => ({
    headers: {
      ...getFlatAuditHeaders(),
      "x-employee-id": localStorage.getItem("employee_id") || "",
      "x-page-id": pageId,
      "x-audit-actor-id":
        localStorage.getItem("employee_id") ||
        localStorage.getItem("email") ||
        "unknown",
      "x-audit-actor-role": localStorage.getItem("role") || "registrar",
    },
  });

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (!storedRole || !storedEmployeeID) {
      window.location.href = "/login";
      return;
    }

    if (storedRole !== "registrar") {
      window.location.href = "/login";
      return;
    }

    const checkAccess = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/page_access/${storedEmployeeID}/${pageId}`,
        );
        if (response.data?.page_privilege === 1) {
          setHasAccess(true);
          setCanCreate(response.data?.can_create === 1);
          setCanEdit(response.data?.can_edit === 1);
          setCanDelete(response.data?.can_delete === 1);
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
      }
    };

    checkAccess();
  }, []);

  const [titleColor, setTitleColor] = useState("#7f1d1d");
  const [mainButtonColor, setMainButtonColor] = useState("#7f1d1d");
  const [, setSubtitleColor] = useState("#555555");
  const [, setBorderColor] = useState("#e2e8f0");
  const [, setSubButtonColor] = useState("#ffffff");
  const [, setStepperColor] = useState("#7f1d1d");
  const [, setFetchedLogo] = useState(null);
  const [, setCompanyName] = useState("");
  const [, setShortTerm] = useState("");
  const [, setCampusAddress] = useState("");
  const [branches, setBranches] = useState([]);

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
    setBranches(settings?.branches || []);
  }, [settings]);

  const fetchAllStudents = async () => {
    try {
      setIsLoadingStudentDirectory(true);
      const res = await axios.get(`${API_BASE_URL}/api/student_enrollment`);
      setAllStudents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error preloading students:", err);
      setAllStudents([]);
      setSearchStatus("Failed to preload student directory");
    } finally {
      setIsLoadingStudentDirectory(false);
    }
  };

  const fetchStudentEnrollment = async (student_number) => {
    if (!student_number) {
      setStudentData([]);
      return;
    }

    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/student_enrollment/${student_number}`,
      );
      setStudentData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching student enrollment information:", err);
      setStudentData([]);
      setSearchStatus("Failed to fetch student enrollment information");
    }
  };

  const fetchStudentCourses = async (student_number) => {
    if (!student_number) {
      setStudentCourses([]);
      return;
    }

    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/student-info-for-enrollment/${student_number}`,
      );

      const normalizedCourses = Array.isArray(res.data)
        ? res.data.map((course) => ({
            ...course,
            code: course.course_code,
            description: course.course_description,
            creditedUnits: course.course_unit,
            schedule:
              course.current_year && course.semester_description
                ? `${course.current_year}-${Number(course.current_year) + 1} ${course.semester_description}`
                : "—",
            enrolledBy: course.enrolledBy || "",
            registeredBy: course.registeredBy || "",
            adjustedBy: course.adjustedBy || "",
          }))
        : [];

      setStudentCourses(normalizedCourses);
    } catch (err) {
      console.error("Error fetching student courses:", err);
      setStudentCourses([]);
    }
  };

  const handleSelectStudent = (student) => {
    if (!student) return;

    setSelectedStudentNumber(student.student_number);
    setGlobalSearch(student.student_number);
    setSelectedSubject(null);
    setSearchStatus(`Selected ${student.student_number}`);
  };

  useEffect(() => {
    fetchAllStudents();
  }, []);

  useEffect(() => {
    if (selectedStudentNumber) {
      const loadStudentRecord = async () => {
        setIsLoadingStudentRecord(true);
        await Promise.all([
          fetchStudentEnrollment(selectedStudentNumber),
          fetchStudentCourses(selectedStudentNumber),
        ]);
        setIsLoadingStudentRecord(false);
      };

      loadStudentRecord();
    } else {
      setStudentData([]);
      setStudentCourses([]);
    }
  }, [selectedStudentNumber]);

  const filteredStudents = useMemo(() => {
    const trimmedQuery = globalSearch.trim().toLowerCase();

    if (trimmedQuery.length < 2) return [];

    return allStudents
      .filter((student) => {
        const fullName = `${student.first_name || ""} ${student.middle_name || ""} ${student.last_name || ""}`
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();

        return (
          String(student.student_number || "").toLowerCase().includes(trimmedQuery) ||
          fullName.includes(trimmedQuery)
        );
      })
      .slice(0, 10);
  }, [allStudents, globalSearch]);

  useEffect(() => {
    const trimmedQuery = globalSearch.trim();

    if (trimmedQuery.length === 0) {
      setSearchStatus("");
      return;
    }

    if (trimmedQuery.length < 2) {
      setSearchStatus("Type at least 2 characters to search");
      return;
    }

    setSearchStatus(
      filteredStudents.length
        ? `Showing ${filteredStudents.length} matching student${filteredStudents.length > 1 ? "s" : ""}`
        : "No students found",
    );
  }, [filteredStudents, globalSearch]);

  const s = studentData[0] || {};
  const displaySubjects = useMemo(() => studentCourses, [studentCourses]);
  const studentCurriculumId = displaySubjects[0]?.curriculum_id || s.curriculum_id || "";
  const studentActiveSchoolYearId =
    displaySubjects[0]?.active_school_year_id || s.active_school_year_id || "";
  const studentDepartmentId = s.dprtmnt_id || "";
  const studentYearLevelId = s.year_level_id || "";
  const studentCurriculumLabel = useMemo(() => {
    const taggedCurriculum = taggedCourseList.find(
      (course) => Number(course.curriculum_id) === Number(studentCurriculumId),
    );
    const programCode = taggedCurriculum?.program_code || s.program_code;
    const programDescription =
      taggedCurriculum?.curriculum_description || s.program_description;

    if (programCode && programDescription) {
      return `${programCode} - ${programDescription}`;
    }

    return programDescription || programCode || "Student Current Curriculum";
  }, [s.program_code, s.program_description, studentCurriculumId, taggedCourseList]);
  const pendingDeleteCourse = useMemo(
    () => displaySubjects.find((subject) => subject.code === pendingDeleteSubject),
    [displaySubjects, pendingDeleteSubject],
  );
  const pendingDropCourse = useMemo(
    () => displaySubjects.find((subject) => subject.code === pendingDropSubject),
    [displaySubjects, pendingDropSubject],
  );
  const pendingChangeCourse = useMemo(
    () => displaySubjects.find((subject) => subject.code === pendingChangeSubject),
    [displaySubjects, pendingChangeSubject],
  );
  const changeCourseSource = useMemo(() => {
    if (showAllChangeSubjects) return courseList;

    return taggedCourseList.filter((course) => {
      const matchesCurriculum =
        !selectedChangeCurriculum ||
        Number(course.curriculum_id) === Number(selectedChangeCurriculum);
      const matchesYearLevel =
        !selectedChangeYearLevel ||
        Number(course.year_level_id) === Number(selectedChangeYearLevel);

      return matchesCurriculum && matchesYearLevel;
    });
  }, [
    courseList,
    selectedChangeCurriculum,
    selectedChangeYearLevel,
    showAllChangeSubjects,
    taggedCourseList,
  ]);

  const filteredCourseList = useMemo(() => {
    const query = courseListSearch.trim().toLowerCase();

    if (!query) return changeCourseSource;

    return changeCourseSource.filter((course) =>
      [
        course.course_id,
        course.course_code,
        course.course_description,
        course.course_unit,
        course.prereq,
        course.corequisite,
      ]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [changeCourseSource, courseListSearch]);
  const addCourseSource = useMemo(() => {
    if (showAllAddSubjects) return courseList;

    return taggedCourseList.filter((course) => {
      const matchesCurriculum =
        !selectedAddCurriculum ||
        Number(course.curriculum_id) === Number(selectedAddCurriculum);
      const matchesYearLevel =
        !selectedAddYearLevel ||
        Number(course.year_level_id) === Number(selectedAddYearLevel);

      return matchesCurriculum && matchesYearLevel;
    });
  }, [
    courseList,
    selectedAddCurriculum,
    selectedAddYearLevel,
    showAllAddSubjects,
    taggedCourseList,
  ]);

  const filteredAddCourseList = useMemo(() => {
    const query = addCourseSearch.trim().toLowerCase();

    if (!query) return addCourseSource;

    return addCourseSource.filter((course) =>
      [
        course.course_id,
        course.course_code,
        course.course_description,
        course.course_unit,
        course.prereq,
        course.corequisite,
      ]
        .filter((value) => value !== null && value !== undefined)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [addCourseSearch, addCourseSource]);

  const virtualCourseRows = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(courseListScrollTop / COURSE_ROW_HEIGHT) - COURSE_LIST_OVERSCAN,
    );
    const visibleCount =
      Math.ceil(COURSE_LIST_HEIGHT / COURSE_ROW_HEIGHT) + COURSE_LIST_OVERSCAN * 2;
    const endIndex = Math.min(filteredCourseList.length, startIndex + visibleCount);

    return {
      rows: filteredCourseList.slice(startIndex, endIndex),
      topSpacer: startIndex * COURSE_ROW_HEIGHT,
      bottomSpacer: Math.max(
        0,
        (filteredCourseList.length - endIndex) * COURSE_ROW_HEIGHT,
      ),
    };
  }, [filteredCourseList, courseListScrollTop]);
  const virtualAddCourseRows = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(addCourseScrollTop / COURSE_ROW_HEIGHT) - COURSE_LIST_OVERSCAN,
    );
    const visibleCount =
      Math.ceil(COURSE_LIST_HEIGHT / COURSE_ROW_HEIGHT) + COURSE_LIST_OVERSCAN * 2;
    const endIndex = Math.min(filteredAddCourseList.length, startIndex + visibleCount);

    return {
      rows: filteredAddCourseList.slice(startIndex, endIndex),
      topSpacer: startIndex * COURSE_ROW_HEIGHT,
      bottomSpacer: Math.max(
        0,
        (filteredAddCourseList.length - endIndex) * COURSE_ROW_HEIGHT,
      ),
    };
  }, [addCourseScrollTop, filteredAddCourseList]);
  const changeFromCourses = useMemo(() => {
    if (selectedSubject) {
      return displaySubjects.filter((subject) => subject.code === selectedSubject);
    }

    return lastChangedCourse?.from ? [lastChangedCourse.from] : [];
  }, [displaySubjects, lastChangedCourse, selectedSubject]);
  const changeToCourses = useMemo(
    () => (lastChangedCourse?.to ? [lastChangedCourse.to] : []),
    [lastChangedCourse],
  );
  const isEnrolledCourse = (courseId) =>
    displaySubjects.some((course) => Number(course.course_id) === Number(courseId));

  const fetchCourseList = async () => {
    try {
      setIsLoadingCourseList(true);
      const res = await axios.get(`${API_BASE_URL}/api/course_list`);
      setCourseList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching course list:", err);
      setCourseList([]);
      setSearchStatus("Failed to load course list");
    } finally {
      setIsLoadingCourseList(false);
    }
  };

  const fetchAddCourseFilters = async () => {
    try {
      const [departmentRes, yearLevelRes, taggedCourseRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/get_department`),
        axios.get(`${API_BASE_URL}/api/get_year_level`),
        axios.get(`${API_BASE_URL}/api/program_tagging_list`),
      ]);

      setDepartments(Array.isArray(departmentRes.data) ? departmentRes.data : []);
      setYearLevelList(Array.isArray(yearLevelRes.data) ? yearLevelRes.data : []);
      setTaggedCourseList(
        Array.isArray(taggedCourseRes.data) ? taggedCourseRes.data : [],
      );
    } catch (err) {
      console.error("Error loading add course filters:", err);
      setSearchStatus("Failed to load add course filters");
    }
  };

  const fetchAddPrograms = async (departmentId) => {
    if (!departmentId) {
      setAddPrograms([]);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/api/applied_program/${departmentId}`);
      setAddPrograms(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error loading curriculum list:", err);
      setAddPrograms([]);
      setSearchStatus("Failed to load curriculum list");
    }
  };

  const handleOpenAddCourse = async () => {
    setIsAddCourseOpen(true);
    setAddCourseSearch("");
    setAddCourseScrollTop(0);
    setShowAllAddSubjects(false);
    setSelectedAddDepartment(studentDepartmentId || "");
    setSelectedAddCurriculum(studentCurriculumId || "");
    setSelectedAddYearLevel(studentYearLevelId || "");

    if (!courseList.length) {
      await fetchCourseList();
    }

    if (!departments.length || !yearLevelList.length || !taggedCourseList.length) {
      await fetchAddCourseFilters();
    }

    if (studentDepartmentId) {
      await fetchAddPrograms(studentDepartmentId);
    }
  };

  const fetchChangePrograms = async (departmentId) => {
    if (!departmentId) {
      setChangePrograms([]);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/api/applied_program/${departmentId}`);
      setChangePrograms(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error loading replacement curriculum list:", err);
      setChangePrograms([]);
      setSearchStatus("Failed to load replacement curriculum list");
    }
  };

  const handleCloseAddCourse = () => {
    setIsAddCourseOpen(false);
    setAddCourseSearch("");
    setAddCourseScrollTop(0);
    setShowAllAddSubjects(false);
    setIsAddConfirmOpen(false);
    setPendingAddCourse(null);
    setAddConfirmMessage("");
  };

  const handleAddDepartmentChange = async (departmentId) => {
    setSelectedAddDepartment(departmentId);
    setSelectedAddCurriculum("");
    await fetchAddPrograms(departmentId);
  };

  const handleAddNewCourse = async (course) => {
    if (!canCreate) {
      setSearchStatus("You do not have permission to add courses");
      return;
    }

    if (!selectedStudentNumber || !selectedAddCurriculum || !course?.course_id) {
      setSearchStatus("Select student, department, curriculum, and course first");
      return;
    }

    try {
      setIsAddingCourse(true);
      await axios.post(
        `${API_BASE_URL}/api/add-student-courses/${selectedStudentNumber}`,
        {
          subject_id: course.course_id,
          active_school_year_id: studentActiveSchoolYearId,
          curriculum_id: selectedAddCurriculum,
        },
        auditConfig(),
      );
      await fetchStudentCourses(selectedStudentNumber);
      setIsAddCourseOpen(false);
      setAddCourseSearch("");
      setAddCourseScrollTop(0);
      setSearchStatus("Course added successfully");
    } catch (err) {
      console.error("Error adding selected course:", err);
      setSearchStatus("Failed to add selected course");
    } finally {
      setIsAddingCourse(false);
    }
  };

  const handleAddCourseClick = async (course) => {
    if (isEnrolledCourse(course.course_id)) return;

    if (!selectedStudentNumber || !selectedAddCurriculum || !course?.course_id) {
      setSearchStatus("Select student, department, curriculum, and course first");
      return;
    }

    if (course.prereq) {
      let message = `The subject ${course.course_code} has prerequisite subject(s).`;

      try {
        const { data } = await axios.post(`${API_BASE_URL}/api/check-prerequisite`, {
          student_number: selectedStudentNumber,
          course_id: course.course_id,
          semester_id: course.semester_id,
          curriculum_id: selectedAddCurriculum,
        });

        message += data.allowed
          ? "\n\nThe student meets the prerequisite qualification.\n\nDo you want to continue enrolling this subject?"
          : "\n\nThe student does NOT meet the prerequisite qualification or has not yet passed the prerequisite.\n\nDo you still want to attempt to enroll this subject?";
      } catch (err) {
        console.error("Error checking prerequisite:", err);
        message +=
          "\n\nUnable to verify prerequisite qualification right now.\n\nDo you still want to attempt to enroll this subject?";
      }

      setPendingAddCourse(course);
      setAddConfirmMessage(message);
      setIsAddConfirmOpen(true);
      return;
    }

    await handleAddNewCourse(course);
  };

  const handleCancelAddConfirm = () => {
    setIsAddConfirmOpen(false);
    setPendingAddCourse(null);
    setAddConfirmMessage("");
  };

  const handleProceedAddConfirm = async () => {
    if (!pendingAddCourse) return;
    await handleAddNewCourse(pendingAddCourse);
    handleCancelAddConfirm();
  };

  const handleChangeCourseSelect = async (courseCode) => {
    setSelectedSubject(courseCode);
    setPendingChangeSubject(courseCode);
    setSelectedChangeCourse(null);
    setLastChangedCourse(null);
    setCourseListScrollTop(0);
    setCourseListSearch("");
    setShowAllChangeSubjects(false);
    setSelectedChangeDepartment(studentDepartmentId || "");
    setSelectedChangeCurriculum(studentCurriculumId || "");
    setSelectedChangeYearLevel(studentYearLevelId || "");
    setIsCourseListOpen(true);

    if (!courseList.length) {
      await fetchCourseList();
    }

    if (!departments.length || !yearLevelList.length || !taggedCourseList.length) {
      await fetchAddCourseFilters();
    }

    if (studentDepartmentId) {
      await fetchChangePrograms(studentDepartmentId);
    }
  };

  const handleCloseCourseList = () => {
    setIsCourseListOpen(false);
    setSelectedSubject(null);
    setPendingChangeSubject(null);
    setSelectedChangeCourse(null);
    setIsChangeConfirmOpen(false);
    setCourseListScrollTop(0);
    setCourseListSearch("");
    setShowAllChangeSubjects(false);
  };

  const handleChangeDepartmentChange = async (departmentId) => {
    setSelectedChangeDepartment(departmentId);
    setSelectedChangeCurriculum("");
    await fetchChangePrograms(departmentId);
  };

  const handleOpenChangeConfirm = (course) => {
    setSelectedChangeCourse(course);
    setIsChangeConfirmOpen(true);
  };

  const handleCancelChangeCourse = () => {
    setIsChangeConfirmOpen(false);
    setSelectedChangeCourse(null);
  };

  const handleConfirmChangeCourse = async () => {
    if (!canEdit) {
      setSearchStatus("You do not have permission to change courses");
      return;
    }

    if (!pendingChangeCourse?.id || !selectedChangeCourse?.course_id) return;

    try {
      setIsChangingCourse(true);
      await axios.put(`${API_BASE_URL}/api/courses/change/${pendingChangeCourse.id}`, {
        course_id: selectedChangeCourse.course_id,
      }, auditConfig());
      setLastChangedCourse({
        from: pendingChangeCourse,
        to: {
          code: selectedChangeCourse.course_code,
          description: selectedChangeCourse.course_description,
          creditedUnits: selectedChangeCourse.course_unit,
          schedule: "",
          enrolledBy: "",
          registeredBy: "",
          adjustedBy: "",
        },
      });
      setSelectedSubject(null);
      setPendingChangeSubject(null);
      setSelectedChangeCourse(null);
      setIsChangeConfirmOpen(false);
      setIsCourseListOpen(false);

      if (selectedStudentNumber) {
        await fetchStudentCourses(selectedStudentNumber);
      }
    } catch (err) {
      console.error("Error changing selected course:", err);
      setSearchStatus("Failed to change selected course");
    } finally {
      setIsChangingCourse(false);
    }
  };

  const handleDeleteCourseSelect = (courseCode) => {
    setPendingDeleteSubject(courseCode);
    setIsDeleteConfirmOpen(true);
  };

  const handleCancelDeleteCourse = () => {
    setIsDeleteConfirmOpen(false);
    setPendingDeleteSubject(null);
  };

  const handleConfirmDeleteCourse = async () => {
    if (!canDelete) {
      setSearchStatus("You do not have permission to delete courses");
      return;
    }

    if (!pendingDeleteCourse?.id) return;

    try {
      setIsDeletingCourse(true);
      await axios.delete(`${API_BASE_URL}/api/courses/delete/${pendingDeleteCourse.id}`, auditConfig());
      setStudentCourses((courses) =>
        courses.filter((course) => course.id !== pendingDeleteCourse.id),
      );
      setSelectedSubject(null);
      setIsDeleteConfirmOpen(false);
      setPendingDeleteSubject(null);

      if (selectedStudentNumber) {
        await fetchStudentCourses(selectedStudentNumber);
      }
    } catch (err) {
      console.error("Error deleting selected course:", err);
      setSearchStatus("Failed to delete selected course");
    } finally {
      setIsDeletingCourse(false);
    }
  };

  const handleDropCourseSelect = (courseCode) => {
    setPendingDropSubject(courseCode);
    setIsDropConfirmOpen(true);
  };

  const handleCancelDropCourse = () => {
    setIsDropConfirmOpen(false);
    setPendingDropSubject(null);
  };

  const handleConfirmDropCourse = async () => {
    if (!canEdit) {
      setSearchStatus("You do not have permission to drop courses");
      return;
    }

    if (!pendingDropCourse?.id) return;

    try {
      setIsDroppingCourse(true);
      await axios.put(`${API_BASE_URL}/api/courses/dropped/${pendingDropCourse.id}`, {}, auditConfig());
      setStudentCourses((courses) =>
        courses.filter((course) => course.id !== pendingDropCourse.id),
      );
      setSelectedSubject(null);
      setIsDropConfirmOpen(false);
      setPendingDropSubject(null);

      if (selectedStudentNumber) {
        await fetchStudentCourses(selectedStudentNumber);
      }
    } catch (err) {
      console.error("Error dropping selected course:", err);
      setSearchStatus("Failed to drop selected course");
    } finally {
      setIsDroppingCourse(false);
    }
  };

  const fullName = s.first_name
    ? `${s.first_name} ${s.middle_name ? s.middle_name.charAt(0).toUpperCase() + ". " : ""}${s.last_name}`
    : "Student Name";
  const program =
    s.program_code && s.program_description
      ? `(${s.program_code}) ${s.program_description}`
      : "Program";
  const address = s.presentStreet
    ? `${s.presentStreet}, ${s.presentBarangay} ${s.presentMunicipality}, ${s.presentProvince}`
    : "Address";
  const campusName = (() => {
    const branch = branches.find((b) => String(b?.id) === String(s.campus));
    return branch?.branch || s.campus || "Campus";
  })();

  if (hasAccess === null) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!hasAccess) return <Unauthorized />;

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
        overflowY: "auto",
        paddingRight: 1,
        backgroundColor: "transparent",
        mt: 1,
        padding: 2,
      }}
    >
      {/* ── Page Header ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2.5,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: "36px",
            background: "white",
            display: "flex",
            alignItems: "center",
            mb: 2,
          }}
        >
          STUDENT ENROLLMENT
        </Typography>

        <Dialog
          open={isDeleteConfirmOpen}
          onClose={handleCancelDeleteCourse}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ fontSize: 18, fontWeight: 700 }}>
            Delete selected course?
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: 14 }}>
              Do you want to delete the selected course
              {pendingDeleteCourse
                ? ` ${pendingDeleteCourse.code} - ${pendingDeleteCourse.description}`
                : ""}
              ?
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleCancelDeleteCourse}
              variant="outlined"
              disabled={isDeletingCourse}
              sx={{
                textTransform: "none",
                borderColor: "#e2e8f0",
                color: "text.secondary",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeleteCourse}
              variant="contained"
              disabled={isDeletingCourse}
              sx={{
                textTransform: "none",
                bgcolor: mainButtonColor,
                "&:hover": { bgcolor: alpha(mainButtonColor, 0.85) },
              }}
            >
              {isDeletingCourse ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={isDropConfirmOpen}
          onClose={handleCancelDropCourse}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ fontSize: 18, fontWeight: 700 }}>
            Drop selected course?
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: 14 }}>
              Do you want to drop the selected course
              {pendingDropCourse
                ? ` ${pendingDropCourse.code} - ${pendingDropCourse.description}`
                : ""}
              ?
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleCancelDropCourse}
              variant="outlined"
              disabled={isDroppingCourse}
              sx={{
                textTransform: "none",
                borderColor: "#e2e8f0",
                color: "text.secondary",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDropCourse}
              variant="contained"
              disabled={isDroppingCourse}
              sx={{
                textTransform: "none",
                bgcolor: mainButtonColor,
                "&:hover": { bgcolor: alpha(mainButtonColor, 0.85) },
              }}
            >
              {isDroppingCourse ? "Dropping..." : "Drop"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={isCourseListOpen}
          onClose={handleCloseCourseList}
          maxWidth="lg"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
              Select replacement course
            </Typography>
            <Box sx={{display: "flex", alignItems: "center", gap: "0.8rem"}}>
              <TextField
                size="small"
                value={courseListSearch}
                onChange={(event) => {
                  setCourseListSearch(event.target.value);
                  setCourseListScrollTop(0);
                }}
                placeholder="Search courses"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: { xs: "100%", sm: 320 } }}
              />
              <Button
                variant={showAllChangeSubjects ? "outlined" : "contained"}
                size="small"
                onClick={() => {
                  setShowAllChangeSubjects((current) => !current);
                  setCourseListScrollTop(0);
                }}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  bgcolor: showAllChangeSubjects ? "#fff" : mainButtonColor,
                  color: showAllChangeSubjects ? mainButtonColor : "#fff",
                  borderColor: mainButtonColor,
                  "&:hover": {
                    bgcolor: showAllChangeSubjects
                      ? alpha(mainButtonColor, 0.06)
                      : alpha(mainButtonColor, 0.85),
                    borderColor: mainButtonColor,
                  },
                }}
              >
                {showAllChangeSubjects ? "View Tagged Subject" : "View All Subject"}
              </Button>
            </Box>
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: 14, mb: 1.5 }}>
              Choose a course to replace
              {pendingChangeCourse
                ? ` ${pendingChangeCourse.code} - ${pendingChangeCourse.description}`
                : " the selected course"}
              .
            </DialogContentText>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(3, minmax(0, 1fr))",
                },
                gap: 1.5,
                mb: 1.5,
              }}
            >
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select
                  value={selectedChangeDepartment}
                  label="Department"
                  onChange={(event) =>
                    handleChangeDepartmentChange(event.target.value)
                  }
                >
                  <MenuItem value="">Select Department</MenuItem>
                  {departments.map((department) => (
                    <MenuItem
                      key={department.dprtmnt_id}
                      value={department.dprtmnt_id}
                    >
                      {department.dprtmnt_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Curriculum</InputLabel>
                <Select
                  value={selectedChangeCurriculum}
                  label="Curriculum"
                  onChange={(event) =>
                    setSelectedChangeCurriculum(event.target.value)
                  }
                >
                  {studentCurriculumId && (
                    <MenuItem value={studentCurriculumId}>
                      {studentCurriculumLabel}
                    </MenuItem>
                  )}
                  <MenuItem value="">Select Curriculum</MenuItem>
                  {changePrograms.map((program) => (
                    <MenuItem
                      key={program.curriculum_id}
                      value={program.curriculum_id}
                    >
                      ({program.program_code}-{program.year_description}){" "}
                      {program.program_description} {program.program_major}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Year Level</InputLabel>
                <Select
                  value={selectedChangeYearLevel}
                  label="Year Level"
                  onChange={(event) =>
                    setSelectedChangeYearLevel(event.target.value)
                  }
                >
                  <MenuItem value="">Select Year Level</MenuItem>
                  {yearLevelList.map((year) => (
                    <MenuItem
                      key={year.year_level_id}
                      value={year.year_level_id}
                    >
                      {year.year_level_description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <TableContainer
              component={Paper}
              variant="outlined"
              onScroll={(event) => setCourseListScrollTop(event.currentTarget.scrollTop)}
              sx={{ height: COURSE_LIST_HEIGHT, borderRadius: 1, overflowY: "auto" }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {[
                      "Course ID",
                      "Course Code",
                      "Description",
                      "Course Unit",
                      "Prereq",
                      "Corequisite",
                      "Action",
                    ].map((header) => (
                      <TableCell key={header} sx={hCell(mainButtonColor)}>
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoadingCourseList ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        <CircularProgress size={22} sx={{ color: mainButtonColor }} />
                      </TableCell>
                    </TableRow>
                  ) : filteredCourseList.length > 0 ? (
                    <>
                      {virtualCourseRows.topSpacer > 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            sx={{ height: virtualCourseRows.topSpacer, p: 0, border: 0 }}
                          />
                        </TableRow>
                      )}
                      {virtualCourseRows.rows.map((course, index) => (
                      <TableRow
                        key={course.course_id}
                        hover
                        sx={{ height: COURSE_ROW_HEIGHT }}
                      >
                        <TableCell sx={bCell}>{index + 1}</TableCell>
                        <TableCell
                          sx={{ ...bCell, fontWeight: 700, color: mainButtonColor }}
                        >
                          {course.course_code}
                        </TableCell>
                        <TableCell sx={bCell}>{course.course_description}</TableCell>
                        <TableCell align="center" sx={bCell}>
                          {course.course_unit}
                        </TableCell>
                        <TableCell sx={bCell}>{course.prereq || "—"}</TableCell>
                        <TableCell sx={bCell}>{course.corequisite || "—"}</TableCell>
                        <TableCell sx={bCell}>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleOpenChangeConfirm(course)}
                            disabled={course.course_id === pendingChangeCourse?.course_id}
                            sx={{
                              textTransform: "none",
                              bgcolor: mainButtonColor,
                              "&:hover": { bgcolor: alpha(mainButtonColor, 0.85) },
                            }}
                          >
                            Change
                          </Button>
                        </TableCell>
                      </TableRow>
                      ))}
                      {virtualCourseRows.bottomSpacer > 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            sx={{
                              height: virtualCourseRows.bottomSpacer,
                              p: 0,
                              border: 0,
                            }}
                          />
                        </TableRow>
                      )}
                    </>
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        align="center"
                        sx={{ py: 3, color: "text.secondary", fontStyle: "italic" }}
                      >
                        {showAllChangeSubjects
                          ? "No matching courses found"
                          : "No tagged subjects found for this curriculum"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleCloseCourseList}
              variant="outlined"
              sx={{
                textTransform: "none",
                borderColor: "#e2e8f0",
                color: "text.secondary",
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={isChangeConfirmOpen}
          onClose={handleCancelChangeCourse}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ fontSize: 18, fontWeight: 700 }}>
            Change selected course?
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: 14 }}>
              Do you want to change
              {pendingChangeCourse
                ? ` ${pendingChangeCourse.code} - ${pendingChangeCourse.description}`
                : " the selected course"}{" "}
              into
              {selectedChangeCourse
                ? ` ${selectedChangeCourse.course_code} - ${selectedChangeCourse.course_description}`
                : " this course"}
              ?
            </DialogContentText>
            {selectedChangeCourse?.prereq && (
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: "#fffbeb",
                  border: "1px solid #fcd34d",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#92400e",
                    mb: 0.5,
                  }}
                >
                  Prerequisite warning
                </Typography>
                <Typography sx={{ fontSize: 13, color: "#92400e" }}>
                  The course you want to change to has prerequisite subject(s):{" "}
                  <strong>{selectedChangeCourse.prereq}</strong>
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleCancelChangeCourse}
              variant="outlined"
              disabled={isChangingCourse}
              sx={{
                textTransform: "none",
                borderColor: "#e2e8f0",
                color: "text.secondary",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmChangeCourse}
              variant="contained"
              disabled={isChangingCourse}
              sx={{
                textTransform: "none",
                bgcolor: mainButtonColor,
                "&:hover": { bgcolor: alpha(mainButtonColor, 0.85) },
              }}
            >
              {isChangingCourse ? "Changing..." : "Change"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={isAddCourseOpen}
          onClose={handleCloseAddCourse}
          maxWidth="lg"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
              Add new course
            </Typography>
            <Box sx={{display: "flex", alignItems: "center", gap: "0.8rem"}}>
              <TextField
                size="small"
                value={addCourseSearch}
                onChange={(event) => {
                  setAddCourseSearch(event.target.value);
                  setAddCourseScrollTop(0);
                }}
                placeholder="Search courses"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: { xs: "100%", sm: 320 } }}
              />
              <Button
                variant={showAllAddSubjects ? "outlined" : "contained"}
                size="small"
                onClick={() => {
                  setShowAllAddSubjects((current) => !current);
                  setAddCourseScrollTop(0);
                }}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  bgcolor: showAllAddSubjects ? "#fff" : mainButtonColor,
                  color: showAllAddSubjects ? mainButtonColor : "#fff",
                  borderColor: mainButtonColor,
                  "&:hover": {
                    bgcolor: showAllAddSubjects
                      ? alpha(mainButtonColor, 0.06)
                      : alpha(mainButtonColor, 0.85),
                    borderColor: mainButtonColor,
                  },
                }}
              >
                {showAllAddSubjects ? "View Tagged Subject" : "View All Subject"}
              </Button>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(3, minmax(0, 1fr))",
                },
                gap: 1.5,
                mb: 1.5,
              }}
            >
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select
                  value={selectedAddDepartment}
                  label="Department"
                  onChange={(event) => handleAddDepartmentChange(event.target.value)}
                >
                  <MenuItem value="">Select Department</MenuItem>
                  {departments.map((department) => (
                    <MenuItem
                      key={department.dprtmnt_id}
                      value={department.dprtmnt_id}
                    >
                      {department.dprtmnt_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Curriculum</InputLabel>
                <Select
                  value={selectedAddCurriculum}
                  label="Curriculum"
                  onChange={(event) => setSelectedAddCurriculum(event.target.value)}
                >
                  {studentCurriculumId && (
                    <MenuItem value={studentCurriculumId}>
                      {studentCurriculumLabel}
                    </MenuItem>
                  )}
                  <MenuItem value="">Select Curriculum</MenuItem>
                  {addPrograms.map((program) => (
                    <MenuItem
                      key={program.curriculum_id}
                      value={program.curriculum_id}
                    >
                      ({program.program_code}-{program.year_description}){" "}
                      {program.program_description} {program.program_major}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Year Level</InputLabel>
                <Select
                  value={selectedAddYearLevel}
                  label="Year Level"
                  onChange={(event) => setSelectedAddYearLevel(event.target.value)}
                >
                  <MenuItem value="">Select Year Level</MenuItem>
                  {yearLevelList.map((year) => (
                    <MenuItem
                      key={year.year_level_id}
                      value={year.year_level_id}
                    >
                      {year.year_level_description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <TableContainer
              component={Paper}
              variant="outlined"
              onScroll={(event) => setAddCourseScrollTop(event.currentTarget.scrollTop)}
              sx={{ height: COURSE_LIST_HEIGHT, borderRadius: 1, overflowY: "auto" }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {[
                      "Course ID",
                      "Course Code",
                      "Description",
                      "Course Unit",
                      "Prereq",
                      "Corequisite",
                      "Action",
                    ].map((header) => (
                      <TableCell key={header} sx={hCell(mainButtonColor)}>
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoadingCourseList ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        <CircularProgress size={22} sx={{ color: mainButtonColor }} />
                      </TableCell>
                    </TableRow>
                  ) : filteredAddCourseList.length > 0 ? (
                    <>
                      {virtualAddCourseRows.topSpacer > 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            sx={{
                              height: virtualAddCourseRows.topSpacer,
                              p: 0,
                              border: 0,
                            }}
                          />
                        </TableRow>
                      )}
                      {virtualAddCourseRows.rows.map((course) => (
                        <TableRow
                          key={course.course_id}
                          hover
                          sx={{ height: COURSE_ROW_HEIGHT }}
                        >
                          <TableCell sx={bCell}>{course.course_id}</TableCell>
                          <TableCell
                            sx={{
                              ...bCell,
                              fontWeight: 700,
                              color: mainButtonColor,
                            }}
                          >
                            {course.course_code}
                          </TableCell>
                          <TableCell sx={bCell}>
                            {course.course_description}
                          </TableCell>
                          <TableCell align="center" sx={bCell}>
                            {course.course_unit}
                          </TableCell>
                          <TableCell sx={bCell}>{course.prereq || "—"}</TableCell>
                          <TableCell sx={bCell}>
                            {course.corequisite || "—"}
                          </TableCell>
                          <TableCell sx={bCell}>
                            {isEnrolledCourse(course.course_id) ? (
                              <Typography
                                sx={{ fontSize: 12, color: "text.secondary" }}
                              >
                                Enrolled
                              </Typography>
                            ) : (
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleAddCourseClick(course)}
                                disabled={isAddingCourse || !selectedAddCurriculum}
                                sx={{
                                  textTransform: "none",
                                  bgcolor: mainButtonColor,
                                  "&:hover": {
                                    bgcolor: alpha(mainButtonColor, 0.85),
                                  },
                                }}
                              >
                                {isAddingCourse ? "Adding..." : "Enroll"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {virtualAddCourseRows.bottomSpacer > 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            sx={{
                              height: virtualAddCourseRows.bottomSpacer,
                              p: 0,
                              border: 0,
                            }}
                          />
                        </TableRow>
                      )}
                    </>
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        align="center"
                        sx={{ py: 3, color: "text.secondary", fontStyle: "italic" }}
                      >
                        No matching courses found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleCloseAddCourse}
              variant="outlined"
              disabled={isAddingCourse}
              sx={{
                textTransform: "none",
                borderColor: "#e2e8f0",
                color: "text.secondary",
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={isAddConfirmOpen}
          onClose={handleCancelAddConfirm}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ fontSize: 18, fontWeight: 700 }}>
            Confirm Enrollment
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ fontSize: 14, whiteSpace: "pre-line" }}>
              {addConfirmMessage}
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleCancelAddConfirm}
              variant="outlined"
              disabled={isAddingCourse}
              sx={{
                textTransform: "none",
                borderColor: "#e2e8f0",
                color: "text.secondary",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProceedAddConfirm}
              variant="contained"
              disabled={isAddingCourse}
              sx={{
                textTransform: "none",
                bgcolor: mainButtonColor,
                "&:hover": { bgcolor: alpha(mainButtonColor, 0.85) },
              }}
            >
              Continue
            </Button>
          </DialogActions>
        </Dialog>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Autocomplete
            freeSolo
            filterOptions={(options) => options}
            options={filteredStudents}
            loading={isLoadingStudentDirectory}
            inputValue={globalSearch}
            value={
              allStudents.find(
                (student) => student.student_number === selectedStudentNumber,
              ) || null
            }
            onInputChange={(event, newInputValue, reason) => {
              if (reason === "input" || reason === "clear") {
                setGlobalSearch(newInputValue);
                setSelectedStudentNumber("");
                if (reason === "clear") {
                  setStudentData([]);
                  setStudentCourses([]);
                }
                setSelectedSubject(null);
              }
            }}
            onChange={(event, selectedOption) => {
              if (selectedOption && typeof selectedOption !== "string") {
                handleSelectStudent(selectedOption);
              }
            }}
            getOptionLabel={(option) => {
              if (typeof option === "string") return option;

              const middleInitial = option.middle_name
                ? `${option.middle_name.charAt(0).toUpperCase()}. `
                : "";
              const fullName =
                `${option.first_name || ""} ${middleInitial}${option.last_name || ""}`.trim();

              return option.student_number
                ? `${option.student_number} - ${fullName}`
                : fullName;
            }}
            isOptionEqualToValue={(option, value) =>
              option.student_number === value.student_number
            }
            noOptionsText={
              globalSearch.trim().length >= 2 ? "No students found" : "Type at least 2 characters"
            }
            loadingText="Loading students..."
            sx={{
              width: 420,
              bgcolor: "#fff",
              "& .MuiOutlinedInput-root": { borderRadius: 2 },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Search by name, email, or student number..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredStudents.length > 0) {
                    e.preventDefault();
                    handleSelectStudent(filteredStudents[0]);
                  }
                }}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 17, color: "#94a3b8" }} />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                  endAdornment: (
                    <>
                      {isLoadingStudentDirectory ? (
                        <CircularProgress color="inherit" size={16} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => {
              const middleInitial = option.middle_name
                ? `${option.middle_name.charAt(0).toUpperCase()}. `
                : "";
              const fullName =
                `${option.first_name || ""} ${middleInitial}${option.last_name || ""}`.trim();

              return (
                <Box component="li" {...props} key={option.student_number}>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                      {option.student_number}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      {fullName}
                    </Typography>
                  </Box>
                </Box>
              );
            }}
          />
          {[
            {
              label: "View History",
              icon: <HistoryOutlinedIcon sx={{ fontSize: 14 }} />,
            },
            {
              label: "Certificate of Registration",
              icon: <ArticleOutlinedIcon sx={{ fontSize: 14 }} />,
            },
            {
              label: "View List",
              icon: <ListOutlinedIcon sx={{ fontSize: 14 }} />,
            },
          ].map(({ label, icon }) => (
            <Button
              key={label}
              variant="contained"
              size="small"
              startIcon={icon}
              sx={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "none",
                bgcolor: mainButtonColor,
                color: "#fff",
                borderRadius: 2,
                boxShadow: "none",
                "&:hover": {
                  bgcolor: alpha(mainButtonColor, 0.85),
                  boxShadow: "none",
                },
              }}
            >
              {label}
            </Button>
          ))}
        </Box>
      </Box>
      {(searchStatus || isLoadingStudentRecord) && (
        <Typography
          sx={{
            fontSize: 12,
            color:
              searchStatus === "No students found" ||
              searchStatus === "Failed to fetch student enrollment information" ||
              searchStatus === "Failed to preload student directory" ||
              searchStatus === "Type at least 2 characters to search"
                ? "#b91c1c"
                : "text.secondary",
            mb: 1.5,
          }}
        >
          {isLoadingStudentRecord ? "Loading student enrollment information..." : searchStatus}
        </Typography>
      )}

      {/* ── Student Banner Card ── */}
      <Paper
        variant="outlined"
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: 2,
          mb: 2,
          overflow: "hidden",
        }}
      >
        <Box sx={{ height: 4, bgcolor: mainButtonColor }} />

        <Box
          sx={{
            p: "16px 20px",
            display: "flex",
            gap: 2.5,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          {/* Avatar + identity */}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "center",
              flex: 1,
              minWidth: 260,
            }}
          >
            <Avatar
              sx={{
                width: 52,
                height: 52,
                bgcolor: mainButtonColor,
                borderRadius: 2,
                fontSize: 20,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {getInitials(
                s.first_name ? `${s.first_name} ${s.last_name}` : "",
              )}
            </Avatar>
            <Box>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: 16,
                  color: "text.primary",
                  lineHeight: 1.2,
                }}
              >
                {fullName}
              </Typography>
              <Typography
                sx={{ fontSize: 12, color: "text.secondary", mt: 0.3 }}
              >
                {program}
              </Typography>
              <Box
                sx={{ display: "flex", gap: 0.75, mt: 0.75, flexWrap: "wrap" }}
              >
                <Chip
                  icon={
                    <BusinessIcon
                      sx={{
                        fontSize: "12px !important",
                        color: `${mainButtonColor} !important`,
                      }}
                    />
                  }
                  label={campusName}
                  size="small"
                  sx={{
                    bgcolor: alpha(mainButtonColor, 0.08),
                    color: mainButtonColor,
                    height: 20,
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                />
                <Chip
                  icon={
                    <VerifiedOutlinedIcon
                      sx={{
                        fontSize: "12px !important",
                        color: "#166534 !important",
                      }}
                    />
                  }
                  label={s.status || "Student Status"}
                  size="small"
                  sx={{
                    bgcolor: "#f0fdf4",
                    color: "#166534",
                    border: "1px solid #bbf7d0",
                    height: 20,
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                />
                {/* ── Enrollment Status — Unverified when no subjects or undefined ── */}
                <EnrollmentStatusChip
                  status={s.enrollment_status}
                  hasSubjects={displaySubjects.length > 0}
                />
              </Box>
            </Box>
          </Box>

          {/* Stat cards */}
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flex: 2,
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <StatCard
              label="Student No."
              value={s.student_number}
              color={mainButtonColor}
            />
            <StatCard
              label="Year Level"
              value={s.year_level_description}
              color={mainButtonColor}
            />
            <StatCard
              label="Section"
              value={s.section_description}
              color={mainButtonColor}
            />
            <StatCard
              label="Semester"
              value={s.semester_description}
              color={mainButtonColor}
            />
            <StatCard
              label="School Year"
              value={s.current_academic_year}
              color={mainButtonColor}
            />
            <StatCard
              label="Units"
              value={s.units}
              accent
              color={mainButtonColor}
            />
          </Box>
        </Box>

        {/* Bottom meta row */}
        <Box
          sx={{
            px: "20px",
            py: 1,
            bgcolor: "#fafafa",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            gap: 3,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            📧 {s.emailAddress || "Email Address"}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            📞 {s.cellphoneNumber || "Contact Number"}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            📍 {address}
          </Typography>
          <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={form137}
                  onChange={(e) => setForm137(e.target.checked)}
                  sx={{
                    color: "#cbd5e1",
                    "&.Mui-checked": { color: mainButtonColor },
                    p: 0.5,
                  }}
                />
              }
              label={
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  Form 137-A
                </Typography>
              }
              sx={{ mr: 0 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={transcriptRec}
                  onChange={(e) => setTranscriptRec(e.target.checked)}
                  sx={{
                    color: "#cbd5e1",
                    "&.Mui-checked": { color: mainButtonColor },
                    p: 0.5,
                  }}
                />
              }
              label={
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  Transcript of Records
                </Typography>
              }
              sx={{ mr: 0 }}
            />
          </Box>
        </Box>
      </Paper>

      {/* ── Tabbed Subject Area ── */}
      <Paper
        variant="outlined"
        sx={{
          border: "1px solid #e2e8f0",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        {/* Tab bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #e2e8f0",
            px: 1,
            bgcolor: "#fff",
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => {
              setTab(v);
              setSelectedSubject(null);
              setPendingDeleteSubject(null);
              setIsDeleteConfirmOpen(false);
              setPendingDropSubject(null);
              setIsDropConfirmOpen(false);
              setPendingChangeSubject(null);
              setSelectedChangeCourse(null);
              setLastChangedCourse(null);
              setIsCourseListOpen(false);
              setIsChangeConfirmOpen(false);
              setShowAllChangeSubjects(false);
              setIsAddCourseOpen(false);
              setIsAddConfirmOpen(false);
              setAddChecked(false);
            }}
            sx={{
              "& .MuiTabs-indicator": {
                bgcolor: mainButtonColor,
                height: 2.5,
                borderRadius: "2px 2px 0 0",
              },
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 500,
                fontSize: 13,
                minHeight: 46,
                color: "text.secondary",
              },
              "& .MuiTab-root.Mui-selected": {
                fontWeight: 700,
                color: mainButtonColor,
              },
            }}
          >
            <Tab
              icon={<SwapHorizIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label="Change Courses"
            />
            <Tab
              icon={<AddCircleOutlineIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label="Add Courses"
            />
            <Tab
              icon={<RemoveCircleOutlineIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label="Drop Courses"
            />
            <Tab
              icon={<DeleteOutline sx={{ fontSize: 16 }} />}
              iconPosition="start"
              label="Delete Courses"
            />
          </Tabs>

          <Box sx={{ pr: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={
                <LogoutOutlinedIcon sx={{ fontSize: "14px !important" }} />
              }
              endIcon={
                <KeyboardArrowDownIcon sx={{ fontSize: "14px !important" }} />
              }
              onClick={(e) => setReasonAnchor(e.currentTarget)}
              sx={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "none",
                px: 1.75,
                bgcolor: mainButtonColor,
                color: "#fff",
                borderRadius: 2,
                boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                "&:hover": {
                  bgcolor: alpha(mainButtonColor, 0.85),
                  boxShadow: "none",
                },
              }}
            >
              {selectedReason || "Withdraw Enrollment"}
            </Button>
            {tab === 1 && (
              <Button
                variant="contained"
                size="small"
                startIcon={
                  <AddCircleOutlineIcon sx={{ fontSize: "14px !important" }} />
                }
                onClick={handleOpenAddCourse}
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "none",
                  px: 1.75,
                  bgcolor: mainButtonColor,
                  color: "#fff",
                  borderRadius: 2,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                  "&:hover": {
                    bgcolor: alpha(mainButtonColor, 0.85),
                    boxShadow: "none",
                  },
                }}
              >
                Add New Course
              </Button>
            )}
            <Menu
              anchorEl={reasonAnchor}
              open={Boolean(reasonAnchor)}
              onClose={() => setReasonAnchor(null)}
              PaperProps={{
                sx: {
                  borderRadius: 2,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                  minWidth: 220,
                  mt: 0.5,
                },
              }}
            >
              <MenuItem
                disabled
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "text.secondary",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  opacity: "1 !important",
                }}
              >
                Reason for Withdrawal
              </MenuItem>
              <Divider />
              {REASONS.map((r) => (
                <MenuItem
                  key={r}
                  selected={selectedReason === r}
                  onClick={() => {
                    setSelectedReason(r);
                    setReasonAnchor(null);
                  }}
                  sx={{
                    fontSize: 13,
                    "&.Mui-selected": {
                      color: mainButtonColor,
                      fontWeight: 600,
                      bgcolor: alpha(mainButtonColor, 0.06),
                    },
                  }}
                >
                  {r}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Box>

        {/* ── Tab 0: Change Courses ── */}
        {tab === 0 && (
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <InListTable
              subjects={displaySubjects}
              selectedSubject={selectedSubject}
              onSelect={handleChangeCourseSelect}
              color={mainButtonColor}
            />

            {/* FROM */}
            <SectionCard label="From" accentColor="#b45309" headerBg="#fffbeb">
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {SUBJECT_HEADERS_NO_RADIO.map((h) => (
                        <TableCell key={h} sx={hCell("#b45309")}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {changeFromCourses.length > 0 ? (
                      changeFromCourses.map((s) => (
                          <TableRow key={s.code}>
                            <TableCell
                              sx={{
                                ...bCell,
                                fontWeight: 700,
                                color: "#b45309",
                              }}
                            >
                              {s.code}
                            </TableCell>
                            <TableCell sx={bCell}>{s.description}</TableCell>
                            <TableCell
                              align="center"
                              sx={{ ...bCell, fontWeight: 700 }}
                            >
                              {s.creditedUnits}
                            </TableCell>
                            <TableCell
                              sx={{ ...bCell, color: "text.secondary" }}
                            >
                              {s.schedule}
                            </TableCell>
                            <TableCell sx={bCell}>
                              {s.enrolledBy || "—"}
                            </TableCell>
                            <TableCell sx={bCell}>
                              {s.registeredBy || "—"}
                            </TableCell>
                            <TableCell sx={bCell}>
                              {s.adjustedBy || "—"}
                            </TableCell>
                          </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          align="center"
                          sx={{
                            py: 3,
                            color: "text.secondary",
                            fontStyle: "italic",
                          }}
                        >
                          Select a course from In List above
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>

            {/* TO */}
            <SectionCard label="To" accentColor="#166534" headerBg="#f0fdf4">
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {SUBJECT_HEADERS_NO_RADIO.map((h) => (
                        <TableCell key={h} sx={hCell("#166534")}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {changeToCourses.length > 0 ? (
                      changeToCourses.map((s) => (
                        <TableRow key={s.code}>
                          <TableCell
                            sx={{
                              ...bCell,
                              fontWeight: 700,
                              color: "#166534",
                            }}
                          >
                            {s.code}
                          </TableCell>
                          <TableCell sx={bCell}>{s.description}</TableCell>
                          <TableCell
                            align="center"
                            sx={{ ...bCell, fontWeight: 700 }}
                          >
                            {s.creditedUnits}
                          </TableCell>
                          <TableCell sx={{ ...bCell, color: "text.secondary" }}>
                            {s.schedule || "â€”"}
                          </TableCell>
                          <TableCell sx={bCell}>{s.enrolledBy || "â€”"}</TableCell>
                          <TableCell sx={bCell}>{s.registeredBy || "â€”"}</TableCell>
                          <TableCell sx={bCell}>{s.adjustedBy || "â€”"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          align="center"
                          sx={{
                            py: 3,
                            color: "text.secondary",
                            fontStyle: "italic",
                          }}
                        >
                          No replacement selected
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          </Box>
        )}

        {/* ── Tabs 1 / 2 / 3 ── */}
        {tab === 1 && (
          <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <InListTable
              subjects={displaySubjects}
              selectedSubject={selectedSubject}
              onSelect={setSelectedSubject}
              color={mainButtonColor}
            />

            <SectionCard label="From" accentColor="#166534" headerBg="#f0fdf4">
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {SUBJECT_HEADERS_NO_RADIO.map((h) => (
                        <TableCell key={h} sx={hCell("#166534")}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedSubject ? (
                      displaySubjects
                        .filter((s) => s.code === selectedSubject)
                        .map((s) => (
                          <TableRow key={s.code}>
                            <TableCell
                              sx={{
                                ...bCell,
                                fontWeight: 700,
                                color: "#166534",
                              }}
                            >
                              {s.code}
                            </TableCell>
                            <TableCell sx={bCell}>{s.description}</TableCell>
                            <TableCell
                              align="center"
                              sx={{ ...bCell, fontWeight: 700 }}
                            >
                              {s.creditedUnits}
                            </TableCell>
                            <TableCell
                              sx={{ ...bCell, color: "text.secondary" }}
                            >
                              {s.schedule}
                            </TableCell>
                            <TableCell sx={bCell}>
                              {s.enrolledBy || "—"}
                            </TableCell>
                            <TableCell sx={bCell}>
                              {s.registeredBy || "—"}
                            </TableCell>
                            <TableCell sx={bCell}>
                              {s.adjustedBy || "—"}
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          align="center"
                          sx={{
                            py: 3,
                            color: "text.secondary",
                            fontStyle: "italic",
                          }}
                        >
                          Select a course from In List above
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>

            <SectionCard label="To" accentColor="#166534" headerBg="#f0fdf4">
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {SUBJECT_HEADERS_NO_RADIO.map((h) => (
                        <TableCell key={h} sx={hCell("#166534")}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        align="center"
                        sx={{
                          py: 3,
                          color: "text.secondary",
                          fontStyle: "italic",
                        }}
                      >
                        No course selected to add
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          </Box>
        )}
        {tab === 2 && (
          <Box sx={{ p: 2 }}>
            <InListTable
              subjects={displaySubjects}
              selectedSubject={selectedSubject}
              onSelect={handleDropCourseSelect}
              color={mainButtonColor}
            />
          </Box>
        )}
        {tab === 3 && (
          <Box sx={{ p: 2 }}>
            <InListTable
              subjects={displaySubjects}
              selectedSubject={selectedSubject}
              onSelect={handleDeleteCourseSelect}
              color={mainButtonColor}
            />
          </Box>
        )}

        {/* ── Footer ── */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
            borderTop: "1px solid #f1f5f9",
            bgcolor: "#fafafa",
          }}
        >
          <Button
            variant="outlined"
            startIcon={<RefreshIcon sx={{ fontSize: "16px !important" }} />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: "text.secondary",
              borderColor: "#e2e8f0",
              borderRadius: 2,
              bgcolor: "white",
              "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
            }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            startIcon={
              <SaveOutlinedIcon sx={{ fontSize: "16px !important" }} />
            }
            sx={{
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              borderRadius: 2,
              bgcolor: mainButtonColor,
              color: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              "&:hover": {
                bgcolor: alpha(mainButtonColor, 0.85),
                boxShadow: "none",
              },
            }}
          >
            Save Changes
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default StudentEnrollment;
