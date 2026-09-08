import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  memo,
} from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Button,
  Typography,
  TextField,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Snackbar,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Menu,
  Autocomplete,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import API_BASE_URL from "../apiConfig";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import {
  convertRawToRatingDynamic,
  setRemarksFromRatingDynamic,
} from "../utils/gradeConversion";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const cleanSuggestionValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const formatSuggestionName = (student) =>
  [
    cleanSuggestionValue(student?.first_name),
    cleanSuggestionValue(student?.middle_name),
    cleanSuggestionValue(student?.last_name),
  ]
    .filter(Boolean)
    .join(" ");

const bodyStyle = {
  fontSize: "15px",
  letterSpacing: "-0.9px",
  wordSpacing: "3px",
  color: "#333",
};

const GRADE_OPTIONS = [
  ...Array.from({ length: 41 }, (_, i) => (100 - i).toString()),
  "INC",
  "DRP",
];

const validateGradeInput = (rawValue) => {
  if (rawValue === null || rawValue === undefined) return "";

  let value = String(rawValue).trim().toUpperCase();

  if (/^INC/.test(value)) return "INC";
  if (/^DRP|^DROP/.test(value)) return "DRP";

  if (/^[A-Z]+$/.test(value)) return "60";
  if (!/^\d{1,3}$/.test(value)) return "60";

  let num = Number(value);
  if (Number.isNaN(num)) return "60";

  if (num > 100) num = 100;
  if (num < 60) num = 60;

  return String(num);
};

const GradeSelect = memo(function GradeSelect({
  value,
  onChange,
  placeholder = "",
}) {
  const [inputValue, setInputValue] = useState(value ?? "");

  useEffect(() => {
    setInputValue(value ?? "");
  }, [value]);

  return (
    <Autocomplete
      freeSolo
      disableClearable
      options={GRADE_OPTIONS}
      inputValue={inputValue}
      value={inputValue}
      onInputChange={(event, newInputValue, reason) => {
        if (reason === "input") {
          setInputValue(newInputValue.toUpperCase());
        }
      }}
      onChange={(event, newValue) => {
        if (newValue !== null) {
          const validated = validateGradeInput(newValue);
          setInputValue(validated);
          onChange(validated);
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          size="small"
          variant="outlined"
          onBlur={() => {
            const validated = validateGradeInput(inputValue);
            setInputValue(validated);
            onChange(validated);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const validated = validateGradeInput(inputValue);
              setInputValue(validated);
              onChange(validated);
            }
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              px: 0.5,
            },
            "& input": {
              textAlign: "center",
              fontWeight: "bold",
              py: 0.5,
            },
          }}
        />
      )}
      sx={{
        minWidth: 90,
        "& .MuiAutocomplete-inputRoot": {
          py: 0,
        },
      }}
    />
  );
});

const StudentGradeFile = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  // Colors State
  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [stepperColor, setStepperColor] = useState("#000000");

  // School Info State
  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [branches, setBranches] = useState([]);

  // Filters
  const [selectedSemester, setSelectedSemester] = useState("");
  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const [studentNumber, setStudentNumber] = useState("");
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [campusFilter, setCampusFilter] = useState("");
  const [selectedStudentNumber, setSelectedStudentNumber] = useState("");
  const [isLoadingStudentRecord, setIsLoadingStudentRecord] = useState(false);

  // Data State
  const [studentInfo, setStudentInfo] = useState(null);
  const [studentGradeList, setStudentGradeList] = useState([]);
  const [yearLevel, setYearLevel] = useState([]);
  const [gradeConversions, setGradeConversions] = useState([]);

  // Selected State
  const [selectedYearLevel, setSelectedYearLevel] = useState(null);

  // 👤 Auth & Loading
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employeeID, setEmployeeID] = useState("");
  const pageId = 126;

  const auditConfig = () => ({
    headers: {
      ...getFlatAuditHeaders(),
      "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-page-id": pageId,
      "x-audit-actor-id":
        employeeID ||
        localStorage.getItem("employee_id") ||
        localStorage.getItem("email") ||
        "unknown",
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
    },
  });

  // ➕ Modals & Dialogs
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [selectedTermContext, setSelectedTermContext] = useState(null);
  const [openAddSubjectDialog, setOpenAddSubjectDialog] = useState(false);
  const [courseList, setCourseList] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");

  // Menu State
  const [yearLevelAnchorEl, setYearLevelAnchorEl] = useState(null);
  const [viewMenuAnchorEl, setViewMenuAnchorEl] = useState(null);

  // ==========================================
  // EFFECTS & LOGIC
  // ==========================================

  useEffect(() => {
    if (!settings) return;

    // 🎨 Apply Colors
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

    // 🏫 Logo
    if (assets.logoUrl) {
      setFetchedLogo(assets.logoUrl);
    }

    // 🏷️ School Information
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    const normalizedBranches = settings?.branches || [];
    setBranches(normalizedBranches);
    if (normalizedBranches?.length > 0) {
      setCampusFilter((prev) => prev || String(normalizedBranches[0].id));
    }
  }, [settings]);

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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYearLevels();
  }, []);

  useEffect(() => {
    // Dynamic grade conversion keeps this editor aligned with the grade_conversion table.
    axios
      .get(`${API_BASE_URL}/api/admin/grade-conversion`)
      .then((res) => setGradeConversions(res.data))
      .catch((err) => {
        console.error("Failed to fetch grade conversions:", err);
        setGradeConversions([]);
      });
  }, []);

  // ==========================================
  // DATA HELPERS (Moved inside component)
  // ==========================================

  // Using useMemo so this only recalculates when studentGradeList changes
  const groupedGrades = useMemo(() => {
    return studentGradeList.reduce((acc, curr) => {
      const year = curr.year_level_description;
      const sem = curr.semester_description;
      const sy = curr.active_school_year_id;

      acc[year] ??= {};
      acc[year][sem] ??= {};
      acc[year][sem][sy] ??= [];

      acc[year][sem][sy].push(curr);

      return acc;
    }, {});
  }, [studentGradeList]);

  const yearLevelOrder = [
    "First Year",
    "Second Year",
    "Third Year",
    "Fourth Year",
    "Fifth Year",
  ];
  const semesterOrder = ["First Semester", "Second Semester", "Summer"];

  const getYearLevelRank = (level) => {
    const index = yearLevelOrder.indexOf(level);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  const getSemesterRank = (semester) => {
    const index = semesterOrder.indexOf(semester);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  const sortedTermGroups = useMemo(() => {
    return Object.entries(groupedGrades)
      .flatMap(([yearLevel, semesters]) =>
        Object.entries(semesters).flatMap(([semester, schoolYears]) =>
          Object.entries(schoolYears).map(([schoolYearId, termData]) => ({
            yearLevel,
            semester,
            schoolYearId,
            termData: [...termData].sort((a, b) => a.id - b.id),
            currentYear: Number(termData?.[0]?.current_year) || 0,
          })),
        ),
      )
      .sort((a, b) => {
        if (a.currentYear !== b.currentYear) {
          return a.currentYear - b.currentYear;
        }

        const yearLevelDiff =
          getYearLevelRank(a.yearLevel) - getYearLevelRank(b.yearLevel);
        if (yearLevelDiff !== 0) {
          return yearLevelDiff;
        }

        const semesterDiff =
          getSemesterRank(a.semester) - getSemesterRank(b.semester);
        if (semesterDiff !== 0) {
          return semesterDiff;
        }

        return Number(a.schoolYearId) - Number(b.schoolYearId);
      });
  }, [groupedGrades]);

  const viewOptions = [
    "HISTORY LOGS",
    "EVALUATION",
    "TRANSCRIPT OF RECORDS",
    "PERMANENT RECORD",
    "HONORABLE DISMISSAL",
    "COPY OF GRADES",
    "REPORT OF GRADES",
    "GOOD MORAL",
    "CERTIFICATE OF HONORS",
    "CERTIFICATE OF GWA",
    "CERTIFICATE OF HONORS AND GWA",
    "APPLICATION FOR EVALUATION",
    "APPLICATION FOR GRADUATION",
    "RESULT OF EVALUATION",
    "CERTIFICATE OF COMPLETE ACADEMIC REPORTS",
  ];

  const gradeOptions = GRADE_OPTIONS;

  // Dynamic helpers replace hardcoded grade ranges with grade_conversion records.
  const convertRawToRating = (value) =>
    convertRawToRatingDynamic(value, gradeConversions);

  const setRemarksFromRating = (rating) =>
    setRemarksFromRatingDynamic(rating, gradeConversions);

  const remarkConversion = (enRemarks) => {
    if (enRemarks === 0) return "ONGOING";
    if (enRemarks === 1) return "PASSED";
    if (enRemarks === 2) return "FAILED";
    if (enRemarks === 3) return "INCOMPLETE";
    if (enRemarks === 4) return "DROPPED";
    if (enRemarks === 5) return "NO GRADE";
    if (enRemarks === 6) return "UNDEFINED GRADE";
    return "-";
  };

  const getDisplayedFinalGrade = (course) => {
    if (course?.__edited) {
      return convertRawToRating(course.final_grade);
    }

    const storedGradeStatus = String(
      course?.grades_status ?? course?.grade_status ?? "",
    ).trim();

    if (storedGradeStatus) {
      return storedGradeStatus;
    }

    if (
      course?.numeric_grade !== null &&
      course?.numeric_grade !== undefined &&
      course?.numeric_grade !== ""
    ) {
      return String(course.numeric_grade);
    }

    const storedFinalGrade = course?.final_grade;
    const normalizedFinalGrade = String(storedFinalGrade ?? "")
      .trim()
      .toUpperCase();

    if (!normalizedFinalGrade || normalizedFinalGrade === "-") {
      return "";
    }

    if (normalizedFinalGrade === "INC") {
      return "Incomplete";
    }

    if (normalizedFinalGrade === "DRP" || normalizedFinalGrade === "DROP") {
      return "Dropped";
    }

    const numericFinalGrade = Number(storedFinalGrade);
    if (
      Number.isFinite(numericFinalGrade) &&
      numericFinalGrade > 0 &&
      numericFinalGrade <= 5
    ) {
      return numericFinalGrade.toFixed(2);
    }

    return convertRawToRating(storedFinalGrade) || String(storedFinalGrade);
  };

  // ==========================================
  // API CALLS
  // ==========================================

  const fetchStudentProfile = async (student_number) => {
    if (!student_number) {
      setStudentInfo(null);
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/api/student-info`, {
        params: {
          searchQuery: student_number,
        },
      });
      setStudentInfo(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching student profile:", err);
      setStudentInfo(null);
      setSnackbar({
        open: true,
        message: "Failed to fetch student information",
        severity: "error",
      });
    }
  };

  const fetchStudentGrade = async (student_number) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/student-info/${student_number}`,
      );
      setStudentGradeList(res.data);
    } catch {
      setStudentGradeList([]);
    }
  };

  const fetchCourses = async () => {
    if (!studentGradeList?.length) return;
    const currId = studentGradeList[0].curriculum_id;
    try {
      setLoadingCourses(true);
      const res = await axios.get(`${API_BASE_URL}/api/courses/${currId}`);
      setCourseList(res.data);
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to load courses",
        severity: "error",
      });
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchYearLevels = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/year-levels`);
      setYearLevel(res.data);
    } catch (err) {
      console.error("Failed to fetch year levels:", err);
    }
  };

  useEffect(() => {
    if (!selectedStudentNumber || String(selectedStudentNumber).trim().length < 5) {
      setStudentInfo(null);
      setStudentGradeList([]);
      return;
    }

    const loadStudentRecord = async () => {
      setIsLoadingStudentRecord(true);
      await Promise.all([
        fetchStudentProfile(selectedStudentNumber),
        fetchStudentGrade(selectedStudentNumber),
      ]);
      setIsLoadingStudentRecord(false);
    };

    loadStudentRecord();
  }, [selectedStudentNumber]);

  useEffect(() => {
    const query = studentNumber.trim();

    if (!suggestionsOpen || query.length < 2) {
      setStudentSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    let cancelled = false;
    setSuggestionsLoading(true);

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/cor-student-suggestions`,
          {
            params: { query, limit: 10 },
          },
        );

        if (!cancelled) {
          setStudentSuggestions(res.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch Student Grade File suggestions:", err);
        if (!cancelled) setStudentSuggestions([]);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(delayDebounce);
    };
  }, [studentNumber, suggestionsOpen]);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleSuggestionSelect = (suggestion) => {
    const nextStudentNumber = String(suggestion?.student_number || "");
    if (!nextStudentNumber) return;

    setStudentNumber(nextStudentNumber);
    setSelectedStudentNumber(nextStudentNumber);
    setSuggestionsOpen(false);
    setStudentSuggestions([]);
  };

  const confirmDelete = (id) => {
    setSelectedSubjectId(id);
    setOpenDialog(true);
  };

  const handleCloseYearLevelMenu = () => {
    setYearLevelAnchorEl(null);
  };

  const handleOpenViewMenu = (event) => {
    setViewMenuAnchorEl(event.currentTarget);
  };

  const handleCloseViewMenu = () => {
    setViewMenuAnchorEl(null);
  };

  const handleSelectViewOption = (option) => {
    console.log("Selected view option:", option);
    // Add logic to handle specific document generation here
    handleCloseViewMenu();
  };

  const handleAddSubject = async () => {
    if (!canCreate) {
      setSnackbar({
        open: true,
        message: "You do not have permission to add subjects.",
        severity: "warning",
      });
      return;
    }

    if (!selectedTermContext || !selectedCourse) return;
    try {
      await axios.post(`${API_BASE_URL}/api/insert_subject`, {
        course_id: selectedCourse,
        student_number: studentGradeList[0].student_number,
        currId: studentGradeList[0].curriculum_id,
        active_school_year_id: selectedTermContext.active_school_year_id,
      }, auditConfig());
      setSnackbar({
        open: true,
        message: "Subject added successfully",
        severity: "success",
      });
      setOpenAddSubjectDialog(false);
      setSelectedCourse("");
      setSelectedTermContext(null);
      fetchStudentGrade(studentGradeList[0].student_number);
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Failed to add subject",
        severity: "error",
      });
    }
  };

  const handleDelete = async () => {
    if (!canDelete) {
      setSnackbar({
        open: true,
        message: "You do not have permission to delete subjects.",
        severity: "warning",
      });
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/delete_subject/${selectedSubjectId}`, auditConfig());
      setStudentGradeList((prev) =>
        prev.filter((s) => s.id !== selectedSubjectId),
      );
      setSnackbar({
        open: true,
        message: "Subject deleted successfully",
        severity: "success",
      });
    } catch {
      setSnackbar({
        open: true,
        message: "Failed to delete subject",
        severity: "error",
      });
    } finally {
      setOpenDialog(false);
      setSelectedSubjectId(null);
    }
  };

  const handleEditSubject = async (yearLevel, semester, schoolYearId) => {
    if (!canEdit) {
      setSnackbar({
        open: true,
        message: "You do not have permission to update grades.",
        severity: "warning",
      });
      return;
    }

    // Safety check
    if (
      !groupedGrades[yearLevel] ||
      !groupedGrades[yearLevel][semester] ||
      !groupedGrades[yearLevel][semester][schoolYearId]
    ) {
      return;
    }

    try {
      const subjectsToUpdate = groupedGrades[yearLevel][semester][
        schoolYearId
      ].filter((s) => s.__edited && s.final_grade !== null);

      if (!subjectsToUpdate.length) {
        setSnackbar({
          open: true,
          message: "No changes to save",
          severity: "info",
        });
        return;
      }

      setLoading(true); // Add loading state for better UX
      await Promise.all(
        subjectsToUpdate.map((subject) =>
          axios.put(`${API_BASE_URL}/api/update_subject`, {
            course_id: subject.course_id,
            student_number: subject.student_number,
            currId: subject.curriculum_id,
            active_school_year_id: subject.active_school_year_id,
            midterm: subject.midterm ?? "",
            finals: subject.finals ?? "",
            final_grade: subject.final_grade ?? "",
            en_remarks: subject.en_remarks,
          }, auditConfig()),
        ),
      );
      setSnackbar({
        open: true,
        message: "Grades updated successfully",
        severity: "success",
      });
      if (selectedStudentNumber) {
        fetchStudentGrade(selectedStudentNumber);
      }
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "Failed to update grades",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (id, field, value) => {
    setStudentGradeList((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updatedItem = {
          ...item,
          [field]: value?.toUpperCase?.() ?? value,
          __edited: true,
        };

        if (updatedItem[field] === "DRP") {
          if (field === "midterm") {
            updatedItem.finals = "DRP";
          } else if (field === "finals") {
            updatedItem.midterm = "DRP";
          }
        }

        const midterm = updatedItem.midterm;
        const finals = updatedItem.finals;

        updatedItem.final_grade = finals;

        if (midterm === "DRP" || finals === "DRP") {
          updatedItem.en_remarks = 4;
        } else if (midterm === "INC" || finals === "INC") {
          updatedItem.en_remarks = 3;
        } else if (finals === "0.00" || finals === 0 || finals === "0") {
          updatedItem.en_remarks = 0;
        } else {
          const rating = convertRawToRating(finals);
          updatedItem.en_remarks = setRemarksFromRating(rating);
        }

        return updatedItem;
      }),
    );
  };

  const handleOpenYearLevelMenu = (
    event,
    currentYearLevel,
    currentSemester,
    schoolYearId,
  ) => {
    const subjects =
      groupedGrades[currentYearLevel]?.[currentSemester]?.[schoolYearId];

    if (!subjects || subjects.length === 0) return;

    setYearLevelAnchorEl(event.currentTarget);

    setSelectedTermContext({
      yearLevel: currentYearLevel,
      semester: currentSemester,
      schoolYearId,
      student_status_id: subjects[0].student_status_id,
      active_school_year_id: subjects[0].active_school_year_id,
    });
  };

  const handleChangeYearLevel = async (newYearLevelId) => {
    if (!canEdit) {
      setSnackbar({
        open: true,
        message: "You do not have permission to update year level.",
        severity: "warning",
      });
      return;
    }

    if (!selectedTermContext) {
      setSnackbar({
        open: true,
        message: "No term selected",
        severity: "error",
      });
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/api/update_student_year_level`, {
        id: selectedTermContext.student_status_id,
        new_year_level_id: newYearLevelId,
      }, auditConfig());

      setSnackbar({
        open: true,
        message: `Year level updated for ${selectedTermContext.yearLevel} - ${selectedTermContext.semester}`,
        severity: "success",
      });

      handleCloseYearLevelMenu();

      // Refresh grades to see the change
      if (selectedStudentNumber) {
        fetchStudentGrade(selectedStudentNumber);
      }
    } catch (err) {
      console.error("Error updating year level:", err);
      setSnackbar({
        open: true,
        message: "Failed to update year level",
        severity: "error",
      });
    }
  };

  const handleSelectYearLevel = async (yearLevelId) => {
    await handleChangeYearLevel(yearLevelId);
  };

  if (loading || hasAccess === null)
    return <LoadingOverlay open={loading} message="Loading..." />;
  
  
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
        ...bodyStyle,
      }}
    >
      {/* HEADER & SEARCH */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        gap={2}
        flexWrap="wrap"
      >
        <Typography
          variant="h4"
          fontWeight="bold"
          style={{ color: titleColor }}
        >
          STUDENT GRADE FILE
        </Typography>

        <Box sx={{ position: "relative", width: 450, maxWidth: "100%" }}>
          <TextField
            variant="outlined"
            placeholder="Search student number or name"
            size="small"
            value={studentNumber}
            onChange={(e) => {
              const nextValue = e.target.value;
              const trimmedValue = nextValue.trim();
              setStudentNumber(nextValue);
              setSelectedStudentNumber(/^\d/.test(trimmedValue) ? nextValue : "");
              setSuggestionsOpen(true);
            }}
            onFocus={() => {
              if (studentNumber.trim().length >= 2) setSuggestionsOpen(true);
            }}
            onBlur={() => {
              setTimeout(() => setSuggestionsOpen(false), 150);
            }}
            sx={{
              width: "100%",
              backgroundColor: "#fff",
              borderRadius: 1,
              "& .MuiOutlinedInput-root": { borderRadius: "10px" },
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: "gray" }} />,
            }}
          />
          {suggestionsOpen && studentNumber.trim().length >= 2 && (
            <Box
              sx={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                zIndex: 20,
                backgroundColor: "#fff",
                border: "1px solid #d0d0d0",
                borderRadius: "8px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
                overflow: "hidden",
                maxHeight: 320,
              }}
            >
              {suggestionsLoading ? (
                <Box sx={{ px: 2, py: 1.25, fontSize: 13, color: "#666" }}>
                  Searching...
                </Box>
              ) : studentSuggestions.length > 0 ? (
                studentSuggestions.map((suggestion) => {
                  const name = formatSuggestionName(suggestion);
                  return (
                    <Box
                      key={`${suggestion.student_number}-${suggestion.person_id}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSuggestionSelect(suggestion);
                      }}
                      sx={{
                        px: 2,
                        py: 1,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        fontSize: 14,
                        borderBottom: "1px solid #f0f0f0",
                        "&:hover": {
                          backgroundColor: "#f5f7fb",
                        },
                      }}
                    >
                      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                        {suggestion.student_number}
                      </Typography>
                      <Typography sx={{ fontSize: 14, color: "#555" }}>
                        |
                      </Typography>
                      <Typography sx={{ fontSize: 14 }} noWrap>
                        {name || "Unnamed Student"}
                      </Typography>
                    </Box>
                  );
                })
              ) : (
                <Box sx={{ px: 2, py: 1.25, fontSize: 13, color: "#666" }}>
                  No matching students found
                </Box>
              )}
            </Box>
          )}
          <Typography sx={{ mt: 0.75, fontSize: 12, color: "text.secondary" }}>
            {isLoadingStudentRecord
              ? "Loading selected student record..."
              : " "}
          </Typography>
        </Box>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />

      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}` }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: headerColor }}>
            <TableRow>
              <TableCell sx={{ color: "white", textAlign: "Center" }}>
                Student Personal Information
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <TableContainer
        component={Paper}
        sx={{
          width: "100%",
          border: `1px solid ${borderColor}`,
          padding: "20px 0px",
        }}
      >
        <Table
          sx={{
            "& td, & th": {
              paddingTop: 0,
              paddingBottom: 0,
              border: "none",
              fontSize: "15px",
              letterSpacing: "-0.9px",
              wordSpacing: "3px",
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Student Name:</TableCell>
              <TableCell sx={{ fontWeight: "700" }}>
                {studentInfo?.[0] ? (
                  <>
                    {studentInfo[0].last_name?.toUpperCase() || ""}{" "}
                    {studentInfo[0].first_name?.toUpperCase() || ""}{" "}
                    {studentInfo[0].middle_name?.toUpperCase() || ""}
                  </>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>Applicant No./Student No.:</TableCell>
              <TableCell>
                {studentInfo?.[0]?.student_number?.toUpperCase() || "-"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Program:</TableCell>
              <TableCell>
                {studentInfo?.[0] ? (
                  <>
                    {studentInfo[0].program_description} (
                    {studentInfo[0].campus === 1
                      ? "MANILA CAMPUS"
                      : "CAVITE CAMPUS"}
                    )
                  </>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>Year Level:</TableCell>
              <TableCell>
                {studentInfo?.[0]?.year_level_description || "-"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Address:</TableCell>
              <TableCell>
                {studentInfo?.[0] ? (
                  <>
                    {studentInfo[0].presentStreet},{" "}
                    {studentInfo[0].presentBarangay},{" "}
                    {studentInfo[0].presentMunicipality},{" "}
                    {studentInfo[0].presentZipCode}
                  </>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>Contact No.:</TableCell>
              <TableCell>{studentInfo?.[0]?.cellphoneNumber || "-"}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Status:</TableCell>
              <TableCell>{studentInfo?.[0]?.student_status || "-"}</TableCell>
              <TableCell>Section:</TableCell>
              <TableCell>{studentInfo?.[0]?.section || "-"}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Curriculum:</TableCell>
              <TableCell>
                {studentInfo?.[0] ? (
                  <>
                    {studentInfo[0].year_description}-
                    {studentInfo[0].year_description + 1}
                  </>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>Email Address:</TableCell>
              <TableCell>{studentInfo?.[0]?.emailAddress || "-"}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>School Year</TableCell>
              <TableCell>
                {studentInfo?.[0] ? (
                  <>
                    {studentInfo[0].current_year}-
                    {studentInfo[0].current_year + 1}
                  </>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>Semester:</TableCell>
              <TableCell>
                {studentInfo?.[0]?.semester_description || "-"}
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            width: "100%",
            justifyContent: "end",
            padding: "0rem 1.5rem",
            marginTop: "1rem",
          }}
        >
          {/* <Button variant="contained">EXPORT GRADES</Button> */}
          <Button
            variant="contained"
            sx={{ background: mainButtonColor }}
            onClick={handleOpenViewMenu}
          >
            VIEW
          </Button>
        </Box>
      </TableContainer>

      {/* GRADE LISTS - COMPACT TABLES */}
      {sortedTermGroups.map(
        ({ yearLevel, semester, schoolYearId, termData }) => (
          <Paper
            key={`${yearLevel}-${semester}-${schoolYearId}`}
            sx={{
              width: "100%",
              border: `1px solid ${borderColor}`,
              mb: 2,
              overflow: "hidden",
            }}
          >
            {/* Term Header Info */}
            <Box
              sx={{
                backgroundColor: headerColor,
                borderBottom: `1px solid ${borderColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography
                sx={{
                  color: "white",
                  padding: 1,
                  fontSize: "17px",
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              >
                ( {yearLevel} ) {termData[0].current_year}-
                {termData[0].current_year + 1} - {semester}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 1,
                  pb: 0,
                  pr: 1,
                }}
              >
                <Button
                  size="small"
                  variant="contained"
                  sx={{
                    border: "1px solid white",
                    background: mainButtonColor,
                  }}
                  onClick={() => {
                    setSelectedTermContext({
                      active_school_year_id: termData[0].active_school_year_id,
                    });
                    fetchCourses();
                    setOpenAddSubjectDialog(true);
                  }}
                >
                  ADD SUBJECTS
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  sx={{
                    border: "1px solid white",
                    background: mainButtonColor,
                  }}
                  onClick={(e) =>
                    handleOpenYearLevelMenu(
                      e,
                      yearLevel,
                      semester,
                      schoolYearId,
                    )
                  }
                >
                  Change Year Level
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  sx={{
                    border: "1px solid white",
                    background: mainButtonColor,
                  }}
                  onClick={() =>
                    handleEditSubject(yearLevel, semester, schoolYearId)
                  }
                >
                  Save Changes
                </Button>
              </Box>
            </Box>

            {/* Compact Subject Table */}
            <TableContainer>
              <Table size="small" sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        width: "3%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        backgroundColor: "#eee",
                      }}
                    >
                      #
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "10%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                      }}
                    >
                      Course Code
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "10%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Professor
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "35%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                      }}
                    >
                      Course Description
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "5%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Units
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "8%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Section
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "8%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Midterm
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "8%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Finals
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "8%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Final Grade
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "5%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Re-Exam
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "8%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Status
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "8%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Remarks
                    </TableCell>
                    <TableCell
                      sx={{
                        width: "5%",
                        py: 1,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        borderRight: "none",
                        backgroundColor: "#eee",
                        textAlign: "center",
                      }}
                    >
                      Action
                    </TableCell>
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
                  {termData.map((course, index) => (
                    <TableRow key={course.course_id} hover>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                        }}
                      >
                        {index + 1}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        {course.course_code}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                        }}
                      >
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        {course.course_description}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                        }}
                      >
                        {course.course_unit || 0}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                        }}
                      >
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 0.5,
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        <GradeSelect
                          value={course.midterm ?? ""}
                          onChange={(value) =>
                            handleGradeChange(course.id, "midterm", value)
                          }
                          placeholder="Enter grade"
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 0.5,
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        <GradeSelect
                          value={course.finals ?? ""}
                          onChange={(value) =>
                            handleGradeChange(course.id, "finals", value)
                          }
                          placeholder="Enter grade"
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 0.5,
                          border: `1px solid ${borderColor}`,
                        }}
                      >
                        <input
                          type="text"
                          value={getDisplayedFinalGrade(course)}
                          readOnly
                          style={{
                            border: "none",
                            textAlign: "center",
                            background: "none",
                            outline: "none",
                            width: "100%",
                            fontWeight: "bold",
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                        }}
                      >
                        {/* Show stored re-exam / grade-status value from the database. */}
                        {course.grades_status || "-"}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                          fontSize: "12px",
                        }}
                      >
                        {remarkConversion(course.en_remarks)}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          textAlign: "center",
                          fontSize: "12px",
                        }}
                      >
                        {course.remarks?.toUpperCase()}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          px: 1,
                          border: `1px solid ${borderColor}`,
                          borderRight: "none",
                          textAlign: "center",
                        }}
                      >
                        <Button
                          color="error"
                          size="small"
                          variant="contained"
                          sx={{
                            background: mainButtonColor,
                            minWidth: "auto",
                            px: 1,
                            py: 0.25,
                            fontSize: "11px",
                          }}
                          onClick={() => confirmDelete(course.id)}
                        >
                          DELETE
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      sx={{
                        py: 0.5,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        textAlign: "right",
                        fontWeight: "700",
                        backgroundColor: "#fafafa",
                      }}
                    >
                      TOTAL UNITS:
                    </TableCell>
                    <TableCell
                      sx={{
                        py: 0.5,
                        px: 1,
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontWeight: "700",
                        backgroundColor: "#fafafa",
                      }}
                    >
                      {termData.reduce(
                        (sum, course) =>
                          sum + (Number(course.course_unit) || 0),
                        0,
                      )}
                    </TableCell>
                    <TableCell
                      colSpan={7}
                      sx={{ border: `1px solid ${borderColor}` }}
                    ></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ),
      )}

      {/* Year Level Dropdown Menu */}
      <Menu
        anchorEl={yearLevelAnchorEl}
        open={Boolean(yearLevelAnchorEl)}
        onClose={handleCloseYearLevelMenu}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={{ mt: 0.5 }}
      >
        {yearLevel.map((option) => (
          <MenuItem
            key={option.year_level_id}
            onClick={() => handleSelectYearLevel(option.year_level_id)}
          >
            {option.year_level_description}
          </MenuItem>
        ))}
      </Menu>

      {/* View Options Dropdown Menu */}
      <Menu
        anchorEl={viewMenuAnchorEl}
        open={Boolean(viewMenuAnchorEl)}
        onClose={handleCloseViewMenu}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          style: {
            maxHeight: 400,
            width: "320px",
            marginTop: "8px",
          },
        }}
      >
        {viewOptions.map((option) => (
          <MenuItem
            key={option}
            onClick={() => handleSelectViewOption(option)}
            sx={{ fontSize: "14px", py: 1.5 }}
          >
            {option}
          </MenuItem>
        ))}
      </Menu>

      {/* Add Subject Dialog */}
      <Dialog
        open={openAddSubjectDialog}
        onClose={() => setOpenAddSubjectDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add Subject</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Select a subject to add for this student.
          </DialogContentText>
          <FormControl fullWidth>
            <InputLabel>Course</InputLabel>
            <Select
              value={selectedCourse}
              label="Course"
              onChange={(e) => setSelectedCourse(e.target.value)}
              disabled={loadingCourses}
            >
              {courseList.map((course) => (
                <MenuItem key={course.course_id} value={course.course_id}>
                  {course.course_code} - {course.course_description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            variant="outlined"
            onClick={() => setOpenAddSubjectDialog(false)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!selectedCourse || loadingCourses}
            onClick={handleAddSubject}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Subject Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Delete Subject</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this subject?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="error"
            variant="outlined" onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentGradeFile;
