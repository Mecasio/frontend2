import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  Typography,
  Box,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  Paper,
  Button,
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Chip,
  Stack,
  Divider,
  Tooltip,
} from "@mui/material";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import API_BASE_URL from "../apiConfig";

import {
  getScheduleTimeValidationError,
  validateScheduleTimeRange,
  SCHEDULE_TIME_INPUT_MIN,
  SCHEDULE_TIME_INPUT_MAX,
  SCHEDULE_TIME_INPUT_STEP,
} from "../utils/scheduleTimeValidation";
import SearchIcon from "@mui/icons-material/Search";
import { postAuditEvent } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import {
  checkProfessorWorkloadWarning,
  combineScheduleMessage,
} from "../utils/professorWorkloadWarning";
import {
  getScopedProgramIds,
  restrictProgramsToScope,
  syncRegistrarScopeFromAdminData,
  resolveRegistrarDepartmentIds,
  filterCollegeScheduleSections,
  mergeUniqueByKey,
} from "../utils/registrarCurriculumRestriction";
import useRegistrarScopeRevision from "../hooks/useRegistrarScopeRevision";
import { DEPARTMENT_PLOTTING_ACCESS_EVENT } from "../pages/SchedulePlottingFilter";
import { downloadClassProgramPdf } from "../utils/classProgramPrintLayout";
import EaristLogo from "../assets/EaristLogo.png";
import { FcPrint } from "react-icons/fc";

const PLOTTING_DISABLED_MESSAGE =
  "The administrator has turned off schedule plotting for all enrolling officers in this department.";

const isDesignationEntry = (entry) =>
  entry?.department_section_id == null ||
  entry?.department_section_id === "" ||
  Number(entry?.department_section_id) === 0;

// ---------------------------------------------------------------------------
// Shared transaction confirm dialog
// Every yes/no confirmation in this page (delete, honorarium, service credit,
// professor-substitution update, etc.) now renders through this single
// component so they all share one look: colored header, boxed message body,
// "Cancel" / colored confirm button. Content-heavy dialogs (Review Schedule,
// Pick professor from other department) keep their own layout but reuse the
// same header coloring for visual consistency.
// ---------------------------------------------------------------------------
const TransactionConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  icon = "✅",
  title,
  children,
  confirmLabel = "Yes, Confirm",
  headerColor,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="sm"
    PaperProps={{ sx: { borderRadius: 3 } }}
  >
    <DialogTitle
      sx={{
        background: headerColor || "#9E0000",
        color: "#fff",
        fontWeight: 700,
        fontSize: "1.2rem",
        py: 2,
      }}
    >
      {icon} {title}
    </DialogTitle>

    <DialogContent sx={{ maxHeight: 400, overflowY: "auto", p: 3, mt: 2 }}>
      <Box
        sx={{
          backgroundColor: "#fdfdfd",
          borderRadius: "8px",
          px: 2,
          py: 2,
          border: "1px solid #ddd",
          fontSize: "0.95rem",
          lineHeight: 1.8,
        }}
      >
        {children}
      </Box>
    </DialogContent>

    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button
        color="error"
        variant="outlined"
        onClick={onClose}>
        Cancel
      </Button>
      <Button
        variant="contained"
        onClick={onConfirm}
        sx={{
          backgroundColor: headerColor || "#9E0000",
          "&:hover": {
            backgroundColor: headerColor ? `${headerColor}cc` : "#7a0000",
          },
        }}
      >
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

// ---------------------------------------------------------------------------
// Time-grid configuration
// The grid used to be ~1,400 lines of hand-copied JSX (one block per hour,
// duplicated 14 times). It is now generated from these small tables so the
// same slot/merge logic only has to be written once, is far easier to audit,
// and can't drift out of sync between rows.
// ---------------------------------------------------------------------------
const TIME_POINTS = [
  "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM",
  "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM",
];

const HOUR_HEADER_LABELS = [
  "07:00 AM - 08:00 AM", "08:00 AM - 09:00 AM", "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM", "12:00 PM - 01:00 PM",
  "01:00 PM - 02:00 PM", "02:00 PM - 03:00 PM", "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM", "05:00 PM - 06:00 PM", "06:00 PM - 07:00 PM",
  "07:00 PM - 08:00 PM", "08:00 PM - 09:00 PM",
];

const HOUR_BLOCKS = HOUR_HEADER_LABELS.map((label, i) => ({
  label,
  start: TIME_POINTS[i * 2],
  mid: TIME_POINTS[i * 2 + 1],
  end: TIME_POINTS[i * 2 + 2],
}));

const SCHEDULE_DAY_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_DISPLAY_NAMES = {
  MON: "MONDAY",
  TUE: "TUESDAY",
  WED: "WEDNESDAY",
  THU: "THURSDAY",
  FRI: "FRIDAY",
  SAT: "SATURDAY",
  SUN: "SUNDAY",
};

const getDayColWidthClass = (day) =>
  day === "WED" ? "min-w-[7rem]" : day === "THU" ? "min-w-[6.9rem]" : "min-w-[6.8rem]";

// Legend describing what each block color on the grid means, so the meaning
// isn't hidden inside the code that computes it.


const CollegeScheduleChecker = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");   // ✅ NEW
  const [stepperColor, setStepperColor] = useState("#000000");       // ✅ NEW

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");

  useEffect(() => {
    if (!settings) return;

    // 🎨 Colors
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);   // ✅ NEW
    if (colors.stepper) setStepperColor(colors.stepper);           // ✅ NEW

    // 🏫 Logo
    if (assets.logoUrl) {
      setFetchedLogo(assets.logoUrl);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Information
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);

  }, [settings]);


  // Also put it at the very top
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [adminData, setAdminData] = useState({ dprtmnt_id: "", dprtmnt_ids: [] });
  const scopeDepartmentIds = resolveRegistrarDepartmentIds(adminData);
  const [departmentAccessMap, setDepartmentAccessMap] = useState({});
  const allowedDepartmentIds = scopeDepartmentIds.filter(
    (id) => Number(departmentAccessMap[String(id)]?.is_allowed ?? 1) === 1,
  );
  const disabledDepartmentLabels = scopeDepartmentIds
    .filter((id) => Number(departmentAccessMap[String(id)]?.is_allowed ?? 1) !== 1)
    .map((id) => {
      const entry = departmentAccessMap[String(id)];
      return entry?.dprtmnt_name || entry?.dprtmnt_code || `Department ${id}`;
    });
  const hasAnyPlottingAccess = allowedDepartmentIds.length > 0;
  const isPlottingFullyBlocked =
    scopeDepartmentIds.length > 0 && allowedDepartmentIds.length === 0;
  const scopeRevision = useRegistrarScopeRevision();
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);


  const pageId = 108;

  //Put this After putting the code of the past code
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
      const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`);
      if (response.data && response.data.page_privilege === 1) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
      if (error.response && error.response.data.message) {
        console.log(error.response.data.message);
      } else {
        console.log("An unexpected error occurred.");
      }
      setLoading(false);
    }
  };

  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [selectedEndTime, setSelectedEndTime] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedProf, setSelectedProf] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [roomList, setRoomList] = useState([]);
  const [courseList, setCourseList] = useState([]);
  const [schoolYearList, setSchoolYearList] = useState([]);
  const [profList, setProfList] = useState([]);
  const [dayList, setDayList] = useState([]);
  const [sectionList, setSectionList] = useState([]);
  const [programList, setProgramList] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [allschedules, setSchedules] = useState([]);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [openDialogue, setOpenDialogue] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [originalScheduleSnapshot, setOriginalScheduleSnapshot] = useState(null);
  const [isDesignationMode, setIsDesignationMode] = useState(false);
  const [isHonorarium, setIsHonorarium] = useState(false);
  const [isServiceCredit, setIsServiceCredit] = useState(false);
  const [isTemporarySubstitution, setIsTemporarySubstitution] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [openServiceCreditConfirmDialog, setOpenServiceCreditConfirmDialog] =
    useState(false);
  const [openUpdateConfirmDialog, setOpenUpdateConfirmDialog] = useState(false);
  const [schoolYears, setSchoolYears] = useState([]);
  const [semesters, setSchoolSemester] = useState([]);
  const [selectedAcademicSchoolYear, setSelectedAcademicSchoolYear] = useState("");
  const [selectedAcademicSchoolSemester, setSelectedAcademicSchoolSemester] = useState('');
  const [programFilter, setProgramFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [openReviewDialog, setOpenReviewDialog] = useState(false);
  const [selectedReviewEmployeeId, setSelectedReviewEmployeeId] = useState("");
  const [reviewSchedules, setReviewSchedules] = useState([]);
  const [reviewScheduleLoading, setReviewScheduleLoading] = useState(false);
  const [reviewViewMode, setReviewViewMode] = useState("professor");
  const [reviewFilterProfessor, setReviewFilterProfessor] = useState("");
  const [reviewFilterRoom, setReviewFilterRoom] = useState("");
  const [reviewFilterDay, setReviewFilterDay] = useState("");
  const [reviewFilterSection, setReviewFilterSection] = useState("");
  const [reviewFilterDepartment, setReviewFilterDepartment] = useState("");
  const [reviewDialogSchedules, setReviewDialogSchedules] = useState([]);
  const [reviewDepartmentProfList, setReviewDepartmentProfList] = useState([]);
  const [reviewDialogLoading, setReviewDialogLoading] = useState(false);
  const [professorSchedule, setProfessorSchedule] = useState([]);
  const [pickOtherDepartmentProfessor, setPickOtherDepartmentProfessor] =
    useState(false);
  const [otherDepartmentDialogOpen, setOtherDepartmentDialogOpen] =
    useState(false);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [otherDepartmentId, setOtherDepartmentId] = useState("");
  const [otherDepartmentProfList, setOtherDepartmentProfList] = useState([]);
  const [otherDepartmentProfessor, setOtherDepartmentProfessor] =
    useState(null);
  const [otherDepartmentProfessorSchedule, setOtherDepartmentProfessorSchedule] =
    useState([]);
  const otherDepartmentDraftRef = useRef({ selectedRoom: "" });
  const scheduleDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  const filterPlottedScheduleByDepartmentAccess = (entries = []) => {
    if (!Array.isArray(entries)) return [];
    if (!hasAnyPlottingAccess) return [];

    const allowedDeptSet = new Set(allowedDepartmentIds.map(String));
    const allowedSectionSet = new Set(
      sectionList.map((section) => String(section.dep_section_id)),
    );
    const scopedProgramIds = getScopedProgramIds();

    return entries.filter((entry) => {
      if (entry.dprtmnt_id != null && entry.dprtmnt_id !== "") {
        return allowedDeptSet.has(String(entry.dprtmnt_id));
      }

      if (!isDesignationEntry(entry) && allowedSectionSet.size > 0) {
        return allowedSectionSet.has(String(entry.department_section_id ?? ""));
      }

      if (scopedProgramIds.length > 0 && entry.program_id != null) {
        return scopedProgramIds.includes(String(entry.program_id));
      }

      return isDesignationEntry(entry);
    });
  };

  const fetchPersonData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin_data/${user}`);
      setAdminData(res.data);
      syncRegistrarScopeFromAdminData(res.data);
    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  };

  const syncPlottingAccessForDepartments = async (departmentIds = []) => {
    if (!departmentIds.length) {
      setDepartmentAccessMap({});
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_department`);
      const rows = Array.isArray(res.data) ? res.data : [];
      const nextMap = {};

      departmentIds.forEach((departmentId) => {
        const department = rows.find(
          (row) => String(row.dprtmnt_id) === String(departmentId),
        );
        nextMap[String(departmentId)] = {
          is_allowed: Number(department?.is_allowed ?? 1) === 1,
          dprtmnt_name: department?.dprtmnt_name || "",
          dprtmnt_code: department?.dprtmnt_code || "",
        };
      });

      setDepartmentAccessMap(nextMap);
    } catch (err) {
      console.error("Error fetching department plotting access:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPersonData();
    }
  }, [user]);

  useEffect(() => {
    if (!scopeDepartmentIds.length) {
      setDepartmentAccessMap({});
      return;
    }

    syncPlottingAccessForDepartments(scopeDepartmentIds);
  }, [scopeDepartmentIds.join("|")]);

  useEffect(() => {
    if (!user) return undefined;

    const refreshPlottingAccess = () => {
      fetchPersonData();
      const departmentIds = resolveRegistrarDepartmentIds(adminData);
      if (departmentIds.length) {
        syncPlottingAccessForDepartments(departmentIds);
      }
    };

    const handleAccessChange = () => {
      refreshPlottingAccess();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshPlottingAccess();
      }
    };

    window.addEventListener(DEPARTMENT_PLOTTING_ACCESS_EVENT, handleAccessChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener(DEPARTMENT_PLOTTING_ACCESS_EVENT, handleAccessChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, adminData.dprtmnt_id, adminData.dprtmnt_ids, adminData.scopes]);

  const fetchRoom = async () => {
    if (!allowedDepartmentIds.length) {
      setRoomList([]);
      return;
    }

    try {
      const responses = await Promise.all(
        allowedDepartmentIds.map((departmentId) =>
          axios.get(`${API_BASE_URL}/api/room_list/${departmentId}`),
        ),
      );
      setRoomList(mergeUniqueByKey(responses.flatMap((res) => res.data || []), "room_id"));
    } catch (error) {
      console.log(error);
      setRoomList([]);
    }
  };

  const fetchCourseList = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/course_list`);
      setCourseList(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchDesignationList = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/designation_list`);
      setCourseList(response.data); // reusing courseList but content changes
    } catch (error) {
      console.log(error);
    }
  };

  const fetchSchoolYearList = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/get_active_school_years`
      );
      setSchoolYearList(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchProfList = async () => {
    if (!allowedDepartmentIds.length) {
      setProfList([]);
      return;
    }

    try {
      const responses = await Promise.all(
        allowedDepartmentIds.map((departmentId) =>
          axios.get(`${API_BASE_URL}/api/prof_list/${departmentId}`),
        ),
      );
      setProfList(mergeUniqueByKey(responses.flatMap((res) => res.data || []), "prof_id"));
    } catch (err) {
      console.error("Error fetching professors:", err);
      setProfList([]);
    }
  };

  const fetchDayList = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/schedule-plotting/day_list`
      );
      setDayList(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchSectionList = async () => {
    if (!allowedDepartmentIds.length) {
      setSectionList([]);
      return;
    }

    try {
      const responses = await Promise.all(
        allowedDepartmentIds.map((departmentId) =>
          axios.get(`${API_BASE_URL}/api/section_table/${departmentId}`),
        ),
      );
      const rows = mergeUniqueByKey(
        responses.flatMap((res) => res.data || []),
        "dep_section_id",
      );
      setSectionList(filterCollegeScheduleSections(rows, adminData));
    } catch (error) {
      console.log(error);
      setSectionList([]);
    }
  };

  const fetchProgramList = async () => {
    if (!allowedDepartmentIds.length) {
      setProgramList([]);
      return;
    }

    try {
      const responses = await Promise.all(
        allowedDepartmentIds.map((departmentId) =>
          axios.get(`${API_BASE_URL}/api/program_list/${departmentId}`),
        ),
      );
      const rows = mergeUniqueByKey(
        responses.flatMap((res) => res.data || []),
        "program_id",
      );
      setProgramList(restrictProgramsToScope(rows));
    } catch (error) {
      console.log(error);
      setProgramList([]);
    }
  };

  const fetchDepartmentOptions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/get_department`);
      const rows = Array.isArray(response.data) ? response.data : [];
      const blockedDepartmentIds = new Set(allowedDepartmentIds.map(String));

      setAllDepartments(rows);
      setDepartmentOptions(
        rows.filter(
          (department) =>
            !blockedDepartmentIds.has(String(department.dprtmnt_id)),
        ),
      );
    } catch (error) {
      console.error("Error fetching departments:", error);
      setAllDepartments([]);
      setDepartmentOptions([]);
    }
  };

  const fetchSchedule = async () => {
    if (!selectedRoom || !hasAnyPlottingAccess) {
      setSchedule([]);
      return;
    }

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/get/all_schedule/${selectedRoom}`
      );
      setSchedule(filterPlottedScheduleByDepartmentAccess(response.data || []));
    } catch (error) {

      if (error.response && error.response.status === 404) {
        setMessage(
          "Schedule not found. Please assign a schedule."
        );
      } else {
        setMessage("Failed to fetch schedule. Please try again later.");
      }

      setSchedule([]);
      setOpenSnackbar(true);
    }
  };

  const fetchProfessorReviewSchedule = async (employeeId) => {
    if (!employeeId) {
      setReviewSchedules([]);
      return;
    }

    setReviewScheduleLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/get_professor_schedule/${employeeId}`
      );
      setReviewSchedules(filterPlottedScheduleByDepartmentAccess(response.data || []));
    } catch (error) {
      console.error("Error fetching professor review schedule:", error);
      setReviewSchedules([]);
    } finally {
      setReviewScheduleLoading(false);
    }
  };

  const resetReviewFilters = () => {
    setReviewFilterProfessor("");
    setReviewFilterRoom("");
    setReviewFilterDay("");
    setReviewFilterSection("");
    setReviewFilterDepartment("");
    setReviewDepartmentProfList([]);
    setReviewDialogSchedules([]);
    setSelectedReviewEmployeeId("");
    setReviewSchedules([]);
  };

  const loadReviewSchedulesForDepartments = async (departmentIds = []) => {
    if (!departmentIds.length) {
      setReviewDialogSchedules([]);
      return;
    }

    setReviewDialogLoading(true);
    try {
      const responses = await Promise.all(
        departmentIds.map((departmentId) =>
          axios
            .get(
              `${API_BASE_URL}/api/get_college_professor_schedule/${departmentId}`,
            )
            .then((res) => (Array.isArray(res.data) ? res.data : []))
            .catch(() => []),
        ),
      );
      setReviewDialogSchedules(responses.flat());
    } catch (error) {
      console.error("Error loading review schedules:", error);
      setReviewDialogSchedules([]);
    } finally {
      setReviewDialogLoading(false);
    }
  };

  const handleOpenReviewDialog = () => {
    resetReviewFilters();
    setReviewViewMode("professor");
    setOpenReviewDialog(true);
    loadReviewSchedulesForDepartments(allowedDepartmentIds);
  };

  const handleReviewViewModeChange = (mode) => {
    setReviewViewMode(mode);
    resetReviewFilters();
    if (mode === "professor") {
      loadReviewSchedulesForDepartments(allowedDepartmentIds);
    }
  };

  const fetchReviewDepartmentSchedule = async (departmentId) => {
    if (!departmentId) {
      setReviewDialogSchedules([]);
      setReviewDepartmentProfList([]);
      return;
    }

    setReviewDialogLoading(true);
    try {
      const [scheduleRows, profRes] = await Promise.all([
        axios
          .get(
            `${API_BASE_URL}/api/get_college_professor_schedule/${departmentId}`,
          )
          .then((res) => (Array.isArray(res.data) ? res.data : []))
          .catch(() => []),
        axios.get(`${API_BASE_URL}/api/prof_list/${departmentId}`),
      ]);
      setReviewDialogSchedules(scheduleRows);
      setReviewDepartmentProfList(
        Array.isArray(profRes.data) ? profRes.data : [],
      );
    } catch (error) {
      console.error("Error fetching department review schedule:", error);
      setReviewDialogSchedules([]);
      setReviewDepartmentProfList([]);
    } finally {
      setReviewDialogLoading(false);
    }
  };

  const handleReviewDepartmentChange = (departmentId) => {
    setReviewFilterDepartment(departmentId);
    setReviewFilterProfessor("");
    setReviewFilterRoom("");
    setReviewFilterDay("");
    setReviewFilterSection("");
    fetchReviewDepartmentSchedule(departmentId);
  };

  const userDepartmentOptions = allDepartments;

  const reviewProfessorOptions =
    reviewViewMode === "department"
      ? reviewDepartmentProfList
      : profList;

  const fetchAllCollegeSchedule = async () => {
    if (!allowedDepartmentIds.length) {
      setSchedules([]);
      return;
    }

    try {
      const responses = await Promise.all(
        allowedDepartmentIds.map((departmentId) =>
          axios.get(`${API_BASE_URL}/api/get_college_professor_schedule/${departmentId}`),
        ),
      );
      const schedules = mergeUniqueByKey(
        responses.flatMap((res) => (Array.isArray(res.data) ? res.data : [])),
        "id",
      );
      const scopedProgramIds = getScopedProgramIds();

      let filtered = schedules;
      if (scopedProgramIds.length) {
        filtered = filtered.filter((sched) =>
          scopedProgramIds.includes(String(sched.program_id ?? "")),
        );
      }

      setSchedules(filtered);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setMessage(
          "Schedule not found. Please assign a schedule."
        );
      } else {
        setMessage("Failed to fetch schedule. Please try again later.");
      }
      setSchedules([]);
    }
  }
  const getScheduleTypeLabel = (row) => {
    if (Number(row.ishonorarium) === 1) return "Honorarium";
    if (Number(row.is_servicecredit) === 1) return "Service Credit";
    if (Number(row.is_temporary_substitution) === 1) {
      return "Temporary Substitution";
    }
    return "Regular Class";
  };

  const clearScheduleLoadTypes = () => {
    setIsHonorarium(false);
    setIsServiceCredit(false);
    setIsTemporarySubstitution(false);
  };

  const handleHonorariumToggle = (checked) => {
    if (checked) {
      setOpenConfirmDialog(true);
      return;
    }
    setIsHonorarium(false);
  };

  const handleServiceCreditToggle = (checked) => {
    if (checked) {
      if (editingScheduleId) {
        setOpenServiceCreditConfirmDialog(true);
        return;
      }
      setIsHonorarium(false);
      setIsServiceCredit(true);
      setIsTemporarySubstitution(false);
      return;
    }
    setIsServiceCredit(false);
  };

  const handleTemporarySubstitutionToggle = (checked) => {
    setIsHonorarium(false);
    setIsTemporarySubstitution(checked);
    if (checked) {
      setIsServiceCredit(false);
    }
  };

  const getSelectedScheduleType = () => {
    if (isHonorarium) return "honorarium";
    if (isServiceCredit) return "service_credit";
    if (isTemporarySubstitution) return "temporary_substitution";
    return "regular";
  };

  const getEntryLoadType = (row) => {
    if (!row) return "regular";
    if (Number(row.ishonorarium) === 1) return "honorarium";
    if (Number(row.is_servicecredit) === 1) return "service_credit";
    if (Number(row.is_temporary_substitution) === 1) {
      return "temporary_substitution";
    }
    return "regular";
  };

  const convert12hTo24h = (time12) => {
    if (!time12) return "";
    const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return "";
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const modifier = match[3].toUpperCase();
    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  };

  const clearEditMode = () => {
    setEditingScheduleId(null);
    setOriginalScheduleSnapshot(null);
  };

  const resetScheduleForm = () => {
    setSelectedDay("");
    setSelectedSection("");
    setSelectedSubject("");
    setSelectedProf("");
    setSelectedStartTime("");
    setSelectedEndTime("");
    if (schoolYearList.length > 0) {
      setSelectedSchoolYear(schoolYearList[0].id);
    } else {
      setSelectedSchoolYear("");
    }
  };

  const getSelectedSchoolYearEntry = () =>
    schoolYearList.find(
      (sy) => String(sy.id) === String(selectedSchoolYear)
    );





  const handleSelectScheduleForEdit = (entry) => {
    if (!hasAnyPlottingAccess) return;
    if (isDesignationEntry(entry) !== isDesignationMode) return;
    setEditingScheduleId(entry.id);
    setOriginalScheduleSnapshot(entry);
    setSelectedDay(String(entry.room_day));
    setSelectedSection(String(entry.department_section_id));
    setSelectedSubject(String(entry.course_id));
    setSelectedProf(String(entry.professor_id));
    if (entry.school_year_id) {
      setSelectedSchoolYear(String(entry.school_year_id));
    }
    setSelectedStartTime(convert12hTo24h(entry.school_time_start));
    setSelectedEndTime(convert12hTo24h(entry.school_time_end));
    setIsHonorarium(entry.ishonorarium == 1);
    setIsServiceCredit(entry.is_servicecredit == 1);
    setIsTemporarySubstitution(entry.is_temporary_substitution == 1);
  };

  const hasValidUpdate = () => {
    if (!editingScheduleId || !originalScheduleSnapshot) return false;
    if (isTemporarySubstitution) {
      return String(selectedProf) !== String(originalScheduleSnapshot.professor_id);
    }
    if (isHonorarium) {
      return getEntryLoadType(originalScheduleSnapshot) !== "honorarium";
    }
    if (isServiceCredit) {
      return getEntryLoadType(originalScheduleSnapshot) !== "service_credit";
    }
    return false;
  };

  const getProfessorNameById = (profId) => {
    const prof = profList.find((p) => String(p.prof_id) === String(profId));
    if (!prof) return "the selected professor";
    return `${prof.lname || ""}, ${prof.fname || ""} ${prof.mname || ""}`.trim();
  };

  const getProfessorLabel = (prof) => {
    if (!prof) return "";
    return `${prof.lname || ""}, ${prof.fname || ""} ${prof.mname || ""}`.trim();
  };

  const getSectionLabelById = (sectionId) => {
    const section = sectionList.find(
      (entry) => String(entry.dep_section_id) === String(sectionId),
    );
    return (
      section?.section_name ||
      section?.bsis ||
      section?.bsit ||
      "Not selected"
    );
  };

  const getCourseLabelById = (courseId) => {
    const course = courseList.find(
      (entry) => String(entry.course_id) === String(courseId),
    );
    return (
      course?.course_code ||
      course?.course_description ||
      course?.description ||
      "Not selected"
    );
  };

  const getRoomLabelById = (roomId) => {
    const room = roomList.find(
      (entry) => String(entry.room_id) === String(roomId),
    );
    return room?.room_description || "Not selected";
  };

  const getScheduleEntryDay = (entry) =>
    String(entry?.day_description || entry?.room_day || "")
      .toUpperCase()
      .trim();

  const renderScheduleBlocks = (entries = [], emptyMessage) => {
    const safeEntries = Array.isArray(entries) ? entries : [];

    return (
      <Box
        sx={{
          border: "1px solid #d1d5db",
          borderRadius: 2,
          p: 1.5,
          maxHeight: 320,
          overflowY: "auto",
          backgroundColor: "#fafafa",
        }}
      >
        {safeEntries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        ) : (
          <Box sx={{ display: "grid", gap: 1 }}>
            {scheduleDays.map((day) => {
              const dayEntries = safeEntries.filter(
                (entry) => getScheduleEntryDay(entry) === day,
              );

              return (
                <Box
                  key={day}
                  sx={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 1.5,
                    p: 1,
                    backgroundColor: "white",
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                    {day}
                  </Typography>
                  {dayEntries.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      No plotted schedule
                    </Typography>
                  ) : (
                    <Box sx={{ display: "grid", gap: 0.75 }}>
                      {dayEntries.map((entry, index) => (
                        <Box
                          key={`${day}-${entry.id || entry.schedule_id || index}`}
                          sx={{
                            borderLeft: "4px solid #1976d2",
                            borderRadius: 1,
                            px: 1,
                            py: 0.75,
                            backgroundColor: "#eef5ff",
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {entry.school_time_start} - {entry.school_time_end}
                          </Typography>
                          <Typography variant="caption" display="block">
                            {entry.course_code ||
                              entry.course_description ||
                              entry.description ||
                              "Schedule"}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            {entry.section_name ||
                              entry.program_code ||
                              entry.room_description ||
                              ""}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    );
  };

  const handleOpenOtherDepartmentDialog = () => {
    otherDepartmentDraftRef.current = {
      selectedRoom,
    };
    setOtherDepartmentDialogOpen(true);
  };

  const handleOtherDepartmentCheckboxChange = (event) => {
    const checked = event.target.checked;

    if (checked) {
      setPickOtherDepartmentProfessor(true);
      handleOpenOtherDepartmentDialog();
      return;
    }

    setPickOtherDepartmentProfessor(false);
    setOtherDepartmentDialogOpen(false);
    setOtherDepartmentId("");
    setOtherDepartmentProfList([]);
    setOtherDepartmentProfessor(null);
    setOtherDepartmentProfessorSchedule([]);
    setSelectedProf("");
  };

  const handleCloseOtherDepartmentDialog = () => {
    setOtherDepartmentDialogOpen(false);
    setOtherDepartmentId("");
    setOtherDepartmentProfList([]);
    setOtherDepartmentProfessor(null);
    setOtherDepartmentProfessorSchedule([]);
    setSelectedRoom(otherDepartmentDraftRef.current.selectedRoom || "");
    if (!selectedProf) {
      setPickOtherDepartmentProfessor(false);
    }
  };

  const handleApplyOtherDepartmentProfessor = () => {
    if (!otherDepartmentProfessor?.prof_id) {
      setMessage("Select a professor from the chosen department.");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
      return;
    }

    setProfList((prev) => {
      if (
        prev.some(
          (prof) =>
            String(prof.prof_id) === String(otherDepartmentProfessor.prof_id),
        )
      ) {
        return prev;
      }
      return [...prev, otherDepartmentProfessor];
    });
    setSelectedProf(otherDepartmentProfessor.prof_id);
    setOtherDepartmentDialogOpen(false);
  };

  const formatTimeTo12Hour = (time24) => {
    const [hours, minutes] = time24.split(":");
    const h = parseInt(hours);
    const suffix = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${suffix}`;
  };

  const showScheduleTimeError = (errorMessage) => {
    setMessage(errorMessage);
    setOpenSnackbar(true);
  };

  const ensureValidScheduleTimes = () => {
    const errorMessage = validateScheduleTimeRange(
      selectedStartTime,
      selectedEndTime,
    );
    if (errorMessage) {
      showScheduleTimeError(errorMessage);
      return false;
    }
    return true;
  };

  const ensureScheduleFormComplete = () => {
    const missingFields = [];

    if (!selectedDay) missingFields.push("Day");
    if (!selectedSubject) {
      missingFields.push(isDesignationMode ? "Designation" : "Course");
    }
    if (!selectedProf) missingFields.push("Professor");
    if (!selectedSchoolYear) missingFields.push("School Year");
    if (!selectedStartTime) missingFields.push("Start Time");
    if (!selectedEndTime) missingFields.push("End Time");

    if (!isDesignationMode) {
      if (!selectedSection) missingFields.push("Section");
      if (!selectedRoom) missingFields.push("Room");
    }

    if (missingFields.length > 0) {
      setMessage(`Please complete all fields: ${missingFields.join(", ")}.`);
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return false;
    }

    return true;
  };

  const handleStartTimeChange = (value) => {
    if (!value) {
      setSelectedStartTime("");
      return;
    }

    const errorMessage = getScheduleTimeValidationError(value, "Start time");
    if (errorMessage) {
      showScheduleTimeError(errorMessage);
      return;
    }

    setSelectedStartTime(value);
  };

  const handleEndTimeChange = (value) => {
    if (!value) {
      setSelectedEndTime("");
      return;
    }

    const errorMessage = getScheduleTimeValidationError(value, "End time");
    if (errorMessage) {
      showScheduleTimeError(errorMessage);
      return;
    }

    setSelectedEndTime(value);
  };


  useEffect(() => {
    if (!allowedDepartmentIds.length) {
      setRoomList([]);
      setProfList([]);
      setSectionList([]);
      setProgramList([]);
      setSchedules([]);
      setSelectedRoom("");
      setSelectedSection("");
      setSelectedProf("");
      return;
    }

    fetchRoom();
    fetchProfList();
    fetchSectionList();
    fetchProgramList();
    fetchDepartmentOptions();
    fetchAllCollegeSchedule();
  }, [
    allowedDepartmentIds.join("|"),
    scopeRevision,
    (adminData.allowed_curriculum_ids || []).join("|"),
  ]);

  const [workloadTypeList, setWorkloadTypeList] = useState([]);

  const fetchWorkloadTypeList = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/workload`);
      setWorkloadTypeList(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.log(error);
      setWorkloadTypeList([]);
    }
  };



  useEffect(() => {
    fetchCourseList();
    fetchSchoolYearList();
    fetchDayList();
    fetchWorkloadTypeList(); // ADD THIS
  }, []);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/get_school_year/`)
      .then((res) => setSchoolYears(res.data))
      .catch((err) => console.error(err));
  }, [])

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/get_school_semester/`)
      .then((res) => setSchoolSemester(res.data))
      .catch((err) => console.error(err));
  }, [])

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/active_school_year`)
      .then((res) => {
        if (res.data.length > 0) {
          setSelectedAcademicSchoolYear(res.data[0].year_id);
          setSelectedAcademicSchoolSemester(res.data[0].semester_id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSchoolYearChange = (event) => {
    setSelectedAcademicSchoolYear(event.target.value);
  };

  const handleSchoolSemesterChange = (event) => {
    setSelectedAcademicSchoolSemester(event.target.value);
  };

  useEffect(() => {
    if (roomList.length > 0 && !selectedRoom) {
      setSelectedRoom(String(roomList[0].room_id));
    }
  }, [roomList]);

  useEffect(() => {
    if (selectedRoom && hasAnyPlottingAccess) {
      fetchSchedule();
    } else {
      setSchedule([]);
    }
  }, [selectedRoom, allowedDepartmentIds.join("|"), sectionList.length]);

  useEffect(() => {
    if (!isDesignationMode || !selectedProf) {
      setProfessorSchedule([]);
      return;
    }

    axios
      .get(`${API_BASE_URL}/api/professor-schedule/${selectedProf}`)
      .then((res) =>
        setProfessorSchedule(filterPlottedScheduleByDepartmentAccess(res.data || [])),
      )
      .catch(() => setProfessorSchedule([]));
  }, [isDesignationMode, selectedProf, allowedDepartmentIds.join("|"), sectionList.length]);

  useEffect(() => {
    fetchProfessorReviewSchedule(selectedReviewEmployeeId);
  }, [selectedReviewEmployeeId, allowedDepartmentIds.join("|"), sectionList.length]);

  useEffect(() => {
    if (schoolYearList.length > 0) {
      setSelectedSchoolYear(schoolYearList[0].id);
    }
  }, [schoolYearList]);

  useEffect(() => {
    if (!otherDepartmentId) {
      setOtherDepartmentProfList([]);
      setOtherDepartmentProfessor(null);
      setOtherDepartmentProfessorSchedule([]);
      return;
    }

    axios
      .get(`${API_BASE_URL}/api/prof_list/${otherDepartmentId}`)
      .then((res) => {
        setOtherDepartmentProfList(res.data || []);
        setOtherDepartmentProfessor(null);
        setOtherDepartmentProfessorSchedule([]);
      })
      .catch((err) => {
        console.error("Error fetching cross-department professors:", err);
        setOtherDepartmentProfList([]);
        setOtherDepartmentProfessor(null);
        setOtherDepartmentProfessorSchedule([]);
      });
  }, [otherDepartmentId]);

  useEffect(() => {
    if (!otherDepartmentProfessor?.prof_id) {
      setOtherDepartmentProfessorSchedule([]);
      return;
    }

    axios
      .get(
        `${API_BASE_URL}/api/professor-schedule/${otherDepartmentProfessor.prof_id}`,
      )
      .then((res) => setOtherDepartmentProfessorSchedule(res.data || []))
      .catch((err) => {
        console.error(
          "Error fetching cross-department professor schedule:",
          err,
        );
        setOtherDepartmentProfessorSchedule([]);
      });
  }, [otherDepartmentProfessor]);

  const insertAuditLog = async (eventType, details = {}) => {
    try {
      await postAuditEvent(eventType, details);
    } catch (err) {
      console.error("Error inserting audit log");
    }
  };

  const showScheduleSnackbar = (baseMessage, workloadWarning = null) => {
    const { message: nextMessage, severity } = combineScheduleMessage(
      baseMessage,
      workloadWarning
    );
    setMessage(nextMessage);
    setSnackbarSeverity(severity);
    setOpenSnackbar(true);
  };

  const rejectPlottingIfDisabled = () => {
    if (hasAnyPlottingAccess) return false;

    setMessage(PLOTTING_DISABLED_MESSAGE);
    setSnackbarSeverity("error");
    setOpenSnackbar(true);
    return true;
  };

  const getWorkloadWarning = async ({
    profId = selectedProf,
    schoolYearId = selectedSchoolYear,
    startTime,
    endTime,
    excludeScheduleId = null,
  } = {}) => {
    if (!profId || !schoolYearId || !startTime || !endTime) {
      return null;
    }

    return checkProfessorWorkloadWarning({
      profId,
      schoolYearId,
      startTime,
      endTime,
      excludeScheduleId,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rejectPlottingIfDisabled()) return;
    setMessage("");
    console.log(selectedSection);

    if (editingScheduleId) {
      if (isTemporarySubstitution) {
        if (String(selectedProf) === String(originalScheduleSnapshot?.professor_id)) {
          setMessage("Select a different professor for substitution.");
          setOpenSnackbar(true);
          return;
        }

        try {
          const formattedStartTime = formatTimeTo12Hour(selectedStartTime);
          const formattedEndTime = formatTimeTo12Hour(selectedEndTime);
          const response = await axios.post(
            `${API_BASE_URL}/api/check-professor-substitution`,
            {
              day: selectedDay,
              start_time: formattedStartTime,
              end_time: formattedEndTime,
              school_year_id: selectedSchoolYear,
              prof_id: selectedProf,
              exclude_schedule_id: editingScheduleId,
            }
          );

          if (response.data.conflict) {
            setMessage(response.data.message);
            setSnackbarSeverity("error");
            setOpenSnackbar(true);
          } else {
            const workloadWarning = await getWorkloadWarning({
              startTime: formattedStartTime,
              endTime: formattedEndTime,
            });
            showScheduleSnackbar(
              "Substitute professor is available. Click Update Schedule to save.",
              workloadWarning
            );
          }
        } catch (error) {
          const errMsg =
            error.response?.data?.message ||
            "Failed to check substitute professor availability.";
          setMessage(errMsg);
          setOpenSnackbar(true);
        }
        return;
      }

      if (isHonorarium || isServiceCredit) {
        setMessage(
          hasValidUpdate()
            ? "Load type change is ready. Click Update Schedule to save."
            : "This entry already has the selected load type."
        );
        setOpenSnackbar(true);
        return;
      }

      setMessage(
        "Check temporary substitution, service credit, or honorarium to enable update."
      );
      setOpenSnackbar(true);
      return;
    }

    try {
      if (!ensureScheduleFormComplete()) return;
      if (!ensureValidScheduleTimes()) return;

      const formattedStartTime = formatTimeTo12Hour(selectedStartTime);
      const formattedEndTime = formatTimeTo12Hour(selectedEndTime);

      const subjectResponse = await axios.post(
        `${API_BASE_URL}/api/check-subject`,
        {
          section_id: selectedSection,
          school_year_id: selectedSchoolYear,
          day_of_week: selectedDay,
          subject_id: selectedSubject,
        }
      );

      if (subjectResponse.data.exists) {
        setMessage(
          "This subject in this section and school year is already assigned in the same day."
        );
        setOpenSnackbar(true);
        return;
      }

      const timeValidation = await axios.post(
        `${API_BASE_URL}/api/check-time`,
        {
          start_time: formattedStartTime,
          end_time: formattedEndTime,
        }
      );

      if (timeValidation.data.conflict) {
        setMessage(timeValidation.data.message);
        setOpenSnackbar(true);
        return;
      }

      const timeResponse = await axios.post(
        `${API_BASE_URL}/api/check-conflict`,
        {
          day: selectedDay,
          start_time: formattedStartTime,
          end_time: formattedEndTime,
          section_id: selectedSection,
          school_year_id: selectedSchoolYear,
          prof_id: selectedProf,
          room_id: selectedRoom,
          subject_id: selectedSubject,
        }
      );

      if (timeResponse.data.conflict) {
        showScheduleSnackbar(
          "Schedule conflict detected! Please choose a different time."
        );
      } else {
        const workloadWarning = await getWorkloadWarning({
          startTime: formattedStartTime,
          endTime: formattedEndTime,
        });
        showScheduleSnackbar(
          "Schedule is available. You can proceed with adding it.",
          workloadWarning
        );
      }
    } catch (error) {
      console.error("Error checking schedule:", error);
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setMessage(error.response.data.message);
      } else {
        setMessage("An unexpected error occurred. Please try again.");
      }
      setOpenSnackbar(true);
    }
  };

  const handleInsert = async (e) => {
    e.preventDefault();
    if (rejectPlottingIfDisabled()) return;
    setMessage("");

    if (!ensureScheduleFormComplete()) return;
    if (!ensureValidScheduleTimes()) return;

    try {
      const formattedStartTime = formatTimeTo12Hour(selectedStartTime);
      const formattedEndTime = formatTimeTo12Hour(selectedEndTime);
      const workloadWarning = await getWorkloadWarning({
        startTime: formattedStartTime,
        endTime: formattedEndTime,
      });

      const response = await axios.post(
        `${API_BASE_URL}/api/insert-schedule`,
        {
          day: selectedDay,
          start_time: formattedStartTime,
          end_time: formattedEndTime,
          section_id: selectedSection,
          school_year_id: selectedSchoolYear,
          prof_id: selectedProf,
          room_id: selectedRoom,
          subject_id: selectedSubject,
          ishonorarium: isHonorarium ? 1 : 0,
          is_servicecredit: isServiceCredit ? 1 : 0,
          is_temporary_substitution: isTemporarySubstitution ? 1 : 0,
        }
      );

      if (response.status === 200) {
        showScheduleSnackbar("Schedule inserted successfully.", workloadWarning);
        const scheduleType = getSelectedScheduleType();
        await insertAuditLog("schedule_inserted", {
          schedule_type: scheduleType,
          page_name: "College Schedule Checker",
        });
      }

      setSelectedDay("");
      setSelectedSection("");
      setSelectedSubject("");
      setSelectedProf("");
      setSelectedStartTime("");
      setSelectedEndTime("");
      clearScheduleLoadTypes();
      fetchSchedule();
    } catch (error) {
      console.error("Error inserting schedule:", error);
      if (error.response && error.response.data) {
        setMessage(error.response.data.message || "Failed to insert schedule.");
      } else {
        setMessage("Network error. Please try again.");
      }
      setOpenSnackbar(true);
    }
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    if (rejectPlottingIfDisabled()) return;
    setMessage("");

    if (!hasValidUpdate()) {
      setMessage(
        "No valid changes to update. Check a load type and make the allowed change."
      );
      setOpenSnackbar(true);
      return;
    }

    if (isTemporarySubstitution) {
      setOpenUpdateConfirmDialog(true);
      return;
    }

    await executeUpdateSchedule();
  };

  const executeUpdateSchedule = async () => {
    if (rejectPlottingIfDisabled()) return;
    setMessage("");

    try {
      let workloadWarning = null;

      if (isTemporarySubstitution) {
        if (originalScheduleSnapshot) {
          workloadWarning = await getWorkloadWarning({
            startTime: originalScheduleSnapshot.school_time_start,
            endTime: originalScheduleSnapshot.school_time_end,
          });
        }

        await axios.put(
          `${API_BASE_URL}/api/update-schedule/${editingScheduleId}`,
          {
            update_mode: "substitution",
            prof_id: selectedProf,
          }
        );
        await insertAuditLog("schedule_substituted", {
          page_name: "College Schedule Checker",
        });
      } else {
        await axios.put(
          `${API_BASE_URL}/api/update-schedule/${editingScheduleId}`,
          {
            update_mode: "load_type",
            ishonorarium: isHonorarium ? 1 : 0,
            is_servicecredit: isServiceCredit ? 1 : 0,
            is_temporary_substitution: 0,
          }
        );
        await insertAuditLog("schedule_load_type_updated", {
          schedule_type: getSelectedScheduleType(),
          page_name: "College Schedule Checker",
        });
      }

      showScheduleSnackbar("Schedule updated successfully.", workloadWarning);
      setOpenUpdateConfirmDialog(false);
      clearEditMode();
      clearScheduleLoadTypes();
      fetchSchedule();
    } catch (error) {
      console.error("Error updating schedule:", error);
      showScheduleSnackbar(
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to update schedule."
      );
    }
  };

  const handleSubmitDesignation = async (e) => {
    e.preventDefault();
    if (rejectPlottingIfDisabled()) return;
    setMessage("");
    console.log(selectedSection);

    try {
      if (!ensureScheduleFormComplete()) return;
      if (!ensureValidScheduleTimes()) return;

      const formattedStartTime = formatTimeTo12Hour(selectedStartTime);
      const formattedEndTime = formatTimeTo12Hour(selectedEndTime);

      const timeValidation = await axios.post(
        `${API_BASE_URL}/api/check-time`,
        {
          start_time: formattedStartTime,
          end_time: formattedEndTime,
        }
      );

      if (timeValidation.data.conflict) {
        setMessage(timeValidation.data.message);
        setOpenSnackbar(true);
        return;
      }

      const timeResponse = await axios.post(
        `${API_BASE_URL}/api/check-conflict-designation`,
        {
          day: selectedDay,
          start_time: formattedStartTime,
          end_time: formattedEndTime,
          section_id: selectedSection,
          school_year_id: selectedSchoolYear,
          prof_id: selectedProf,
          room_id: selectedRoom,
          subject_id: selectedSubject,
        }
      );

      if (timeResponse.data.conflict) {
        showScheduleSnackbar(
          timeResponse.data.message ||
          "Schedule conflict detected! Please choose a different time."
        );
      } else {
        const workloadWarning = await getWorkloadWarning({
          startTime: formattedStartTime,
          endTime: formattedEndTime,
        });
        showScheduleSnackbar(
          "Schedule is available. You can proceed with adding it.",
          workloadWarning
        );
      }
    } catch (error) {
      console.error("Error checking schedule:", error);
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setMessage(error.response.data.message);
      } else {
        setMessage("An unexpected error occurred. Please try again.");
      }
      setOpenSnackbar(true);
    }
  };

  const handleInsertDesignation = async (e) => {
    e.preventDefault();
    if (rejectPlottingIfDisabled()) return;
    setMessage("");

    if (!ensureScheduleFormComplete()) return;
    if (!ensureValidScheduleTimes()) return;

    try {
      const formattedStartTime = formatTimeTo12Hour(selectedStartTime);
      const formattedEndTime = formatTimeTo12Hour(selectedEndTime);
      const workloadWarning = await getWorkloadWarning({
        startTime: formattedStartTime,
        endTime: formattedEndTime,
      });

      const response = await axios.post(
        `${API_BASE_URL}/api/insert-schedule-designation`,
        {
          day: selectedDay,
          start_time: formattedStartTime,
          end_time: formattedEndTime,
          section_id: selectedSection,
          school_year_id: selectedSchoolYear,
          prof_id: selectedProf,
          room_id: selectedRoom,
          subject_id: selectedSubject,
        }
      );

      if (response.status === 200) {
        showScheduleSnackbar("Schedule inserted successfully.", workloadWarning);
        await insertAuditLog("schedule_designation_inserted", {
          page_name: "College Schedule Checker",
        });
      }

      setSelectedDay("");
      setSelectedSection("");
      setSelectedSubject("");
      setSelectedStartTime("");
      setSelectedEndTime("");
      fetchSchedule();
    } catch (error) {
      console.error("Error inserting schedule:", error);
      if (error.response && error.response.data) {
        setMessage(error.response.data.message || "Failed to insert schedule.");
      } else {
        setMessage("Network error. Please try again.");
      }
      setOpenSnackbar(true);
    }
  };

  const handleDelete = async (scheduleId) => {
    if (rejectPlottingIfDisabled()) return;

    try {
      const res = await axios.delete(
        `${API_BASE_URL}/api/delete/schedule/${scheduleId}`
      );
      setMessage(res.data.message);
      setOpenSnackbar(true);

      if (selectedScheduleId === scheduleId || editingScheduleId === scheduleId) {
        setOpenDialogue(false);
        setSelectedScheduleId(null);
        clearEditMode();
        resetScheduleForm();
      }

      fetchSchedule();
      await insertAuditLog("schedule_deleted", {
        page_name: "College Schedule Checker",
      });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      setMessage("Failed to delete schedule.");
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setOpenSnackbar(false);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier) {
      if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
    }

    const ampm = hours >= 12 ? 'PM' : 'AM';
    let displayHours = hours % 12;
    if (displayHours === 0) displayHours = 12;

    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const getDesignationPlotSchedule = () => {
    if (!selectedProf) return [];

    const matchesProfessor = (entry) =>
      String(entry.professor_id) === String(selectedProf);

    const seenIds = new Set();
    const merged = [];

    const addEntry = (entry) => {
      if (entry.id && seenIds.has(entry.id)) return;
      if (entry.id) seenIds.add(entry.id);
      merged.push(entry);
    };

    schedule
      .filter((entry) => isDesignationEntry(entry) && matchesProfessor(entry))
      .forEach(addEntry);

    professorSchedule.filter(matchesProfessor).forEach(addEntry);

    return filterPlottedScheduleByDepartmentAccess(merged);
  };

  const getDayScheduleRange = (day, scheduleEntries = schedule) => {
    const daySchedules = scheduleEntries.filter(entry => entry.day_description.toUpperCase() === day.toUpperCase());
    if (!daySchedules.length) return "";

    const parseTime = (timeStr) => {
      if (!timeStr) return 0;
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!match) return 0;
      let [_, h, m, mod] = match;
      let hours = Number(h);
      const minutes = Number(m);
      if (mod?.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (mod?.toUpperCase() === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const earliest = daySchedules.reduce((min, curr) => {
      return parseTime(curr.school_time_start) < parseTime(min) ? curr.school_time_start : min;
    }, daySchedules[0].school_time_start);

    const latest = daySchedules.reduce((max, curr) => {
      return parseTime(curr.school_time_end) > parseTime(max) ? curr.school_time_end : max;
    }, daySchedules[0].school_time_end);

    return `${formatTime(earliest)} - ${formatTime(latest)}`;
  };

  const isTimeInSchedule = (start, end, day, scheduleEntries = schedule) => {
    const parseTime = (timeStr) => {
      // Converts "5:00 PM" into a Date object
      return new Date(`1970-01-01 ${timeStr}`);
    };

    return scheduleEntries.some((entry) => {
      if (entry.day_description !== day) return false;

      const slotStart = parseTime(start);
      const slotEnd = parseTime(end);
      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);

      return slotStart >= schedStart && slotEnd <= schedEnd;
    });
  };



  const filteredScheduleList = allschedules
    .filter((sched) => {
      const scopedProgramIds = getScopedProgramIds();
      if (
        scopedProgramIds.length > 0 &&
        !scopedProgramIds.includes(String(sched.program_id ?? ""))
      ) {
        return false;
      }

      // PROGRAM FILTER
      if (programFilter !== "all" && sched.program_id !== programFilter) return false;

      // ROOM FILTER
      if (roomFilter !== "all" && sched.room_id !== roomFilter) return false;

      // ACADEMIC YEAR FILTER
      if (selectedAcademicSchoolYear && sched.year_id !== selectedAcademicSchoolYear) return false;

      // SEMESTER FILTER
      if (selectedAcademicSchoolSemester && sched.semester_id !== selectedAcademicSchoolSemester) return false;

      // SEARCH FILTER
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const fullName = `${sched.fname || ""} ${sched.mname?.[0] || ""} ${sched.lname || ""}`.toLowerCase();
        if (
          !(sched.employee_id?.toLowerCase().includes(term) || fullName.includes(term))
        ) return false;
      }

      return true;
    })
    // SORT BY NAME (or any other property)
    .sort((a, b) => {
      if (sortOrder === "asc") {
        return (a.fname || "").localeCompare(b.fname || "");
      } else {
        return (b.fname || "").localeCompare(a.fname || "");
      }
    });


  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // 👈 only 20 now

  const totalPages = Math.ceil(filteredScheduleList.length / itemsPerPage);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  const currentSchedules = filteredScheduleList.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const daySortOrder = {
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
    SUN: 7,
  };

  const parseScheduleTimeToMinutes = (value) => {
    if (!value) return Number.MAX_SAFE_INTEGER;
    const match = value.toString().trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return Number.MAX_SAFE_INTEGER;
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridian = (match[3] || "").toUpperCase();
    if (meridian === "PM" && hours < 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const reviewedProfessorSchedules = selectedReviewEmployeeId
    ? reviewSchedules
      .slice()
      .sort((a, b) => {
        const dayA = daySortOrder[(a.day || "").toUpperCase()] || 99;
        const dayB = daySortOrder[(b.day || "").toUpperCase()] || 99;
        if (dayA !== dayB) return dayA - dayB;

        const startA = parseScheduleTimeToMinutes(a.school_time_start);
        const startB = parseScheduleTimeToMinutes(b.school_time_start);
        if (startA !== startB) return startA - startB;

        const endA = parseScheduleTimeToMinutes(a.school_time_end);
        const endB = parseScheduleTimeToMinutes(b.school_time_end);
        return endA - endB;
      })
    : [];

  const reviewBaseSchedules = reviewDialogSchedules;

  const filteredReviewSchedules = reviewBaseSchedules
    .filter((row) => {
      if (
        reviewFilterProfessor &&
        String(row.employee_id) !== String(reviewFilterProfessor)
      ) {
        return false;
      }

      if (
        reviewFilterRoom &&
        String(row.room_id) !== String(reviewFilterRoom)
      ) {
        return false;
      }

      if (reviewFilterDay) {
        const selectedDay = dayList.find(
          (day) => String(day.day_id) === String(reviewFilterDay),
        );
        if (
          selectedDay &&
          String(row.day || "").toUpperCase() !==
          String(selectedDay.day_description || "").toUpperCase()
        ) {
          return false;
        }
      }

      if (reviewFilterSection) {
        const selectedSection = sectionList.find(
          (section) =>
            String(section.dep_section_id) === String(reviewFilterSection),
        );
        if (selectedSection) {
          const sectionMatch =
            String(row.section_description || "") ===
            String(selectedSection.description || "");
          const programMatch =
            !selectedSection.program_code ||
            String(row.program_code || "") ===
            String(selectedSection.program_code || "");
          if (!sectionMatch || !programMatch) return false;
        }
      }

      return true;
    })
    .slice()
    .sort((a, b) => {
      const dayA = daySortOrder[(a.day || "").toUpperCase()] || 99;
      const dayB = daySortOrder[(b.day || "").toUpperCase()] || 99;
      if (dayA !== dayB) return dayA - dayB;

      const startA = parseScheduleTimeToMinutes(a.school_time_start);
      const startB = parseScheduleTimeToMinutes(b.school_time_start);
      if (startA !== startB) return startA - startB;

      const endA = parseScheduleTimeToMinutes(a.school_time_end);
      const endB = parseScheduleTimeToMinutes(b.school_time_end);
      return endA - endB;
    });

  const [reviewCurrentPage, setReviewCurrentPage] = useState(1);
  const reviewItemsPerPage = 10;

  useEffect(() => {
    setReviewCurrentPage(1);
  }, [
    reviewFilterProfessor,
    reviewFilterRoom,
    reviewFilterDay,
    reviewFilterSection,
    reviewFilterDepartment,
    reviewViewMode,
    reviewDialogSchedules,
  ]);



  const reviewIndexOfLastItem = reviewCurrentPage * reviewItemsPerPage;
  const reviewIndexOfFirstItem = reviewIndexOfLastItem - reviewItemsPerPage;

  const currentReviewSchedules = filteredReviewSchedules.slice(
    reviewIndexOfFirstItem,
    reviewIndexOfLastItem
  );


  const reviewTotalPages =
    Math.ceil(filteredReviewSchedules.length / reviewItemsPerPage) || 1;

  const isReviewLoading = reviewDialogLoading;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    programFilter,
    roomFilter,
    selectedAcademicSchoolYear,
    selectedAcademicSchoolSemester,
    sortOrder,
  ]);


  const officeDutyConversionColor = (course_code) => {
    if (!course_code) return "";

    // STEP 2: Normalize the course code
    const normalized = course_code
      .toUpperCase()
      .replace(/[^A-Z]/g, "");   // remove spaces, numbers, special characters

    // STEP 3 + 4: Match to category and return color
    if (normalized === "DESIGNATION") return "#99ccff";

    if (
      ["RESEARCH", "PRODUCTION", "EXTENSION", "ACCREDITATION",].includes(normalized)
    ) {
      return "#ccffcc";
    }

    if (normalized === "CONSULTATION") return "#fde5d6";

    if (normalized === "LESSONPREPARATION") return "#f7caac";

    return ""; // default if unmatched
  };

  const getDutyColor = (start, day, scheduleEntries = schedule) => {
    const parseTime = (t) => new Date(`1970-01-01 ${t}`);
    const slotStart = parseTime(start);

    for (const entry of scheduleEntries) {
      if (entry.day_description !== day) continue;

      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);

      if (slotStart >= schedStart && slotStart < schedEnd) {
        if (Number(entry.ishonorarium) === 1) {
          return "#ccffff";
        }
        if (Number(entry.is_servicecredit) === 1) {
          return "#e6ccff";
        }
        if (Number(entry.is_temporary_substitution) === 1) {
          return "#ffd9b3";
        }
        if (entry.workload_color) {
          return entry.workload_color;
        }
        return officeDutyConversionColor(entry.course_code);
      }
    }

    return ""; // no color
  };

  const hasAdjacentSchedule = (start, end, day, direction = "top", scheduleEntries = schedule) => {
    const parseTime = (timeStr) => new Date(`1970-01-01 ${timeStr}`);

    const slotStart = parseTime(start);
    const slotEnd = parseTime(end);

    // Find the current schedule block
    const currentEntry = scheduleEntries.find((entry) => {
      if (entry.day_description !== day) return false;
      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);
      return slotStart >= schedStart && slotEnd <= schedEnd;
    });

    if (!currentEntry) return false;

    const schedStart = parseTime(currentEntry.school_time_start);
    const schedEnd = parseTime(currentEntry.school_time_end);

    if (direction === "top") {
      // Only merge if slotStart > schedStart (inside the same block)
      return slotStart > schedStart ? "same" : "different";
    } else {
      // Only merge if slotEnd < schedEnd (inside the same block)
      return slotEnd < schedEnd ? "same" : "different";
    }
  };

  const getScheduleEntryForSlot = (start, end, day, scheduleEntries = schedule) => {
    const parseTime = (timeStr) => new Date(`1970-01-01 ${timeStr}`);
    const slotStart = parseTime(start);
    const slotEnd = parseTime(end);

    return scheduleEntries.find((entry) => {
      if (entry.day_description !== day) return false;
      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);
      return slotStart >= schedStart && slotEnd <= schedEnd;
    });
  };

  const getScheduleSlotBackground = (
    start,
    end,
    day,
    scheduleEntries = schedule,
    maskContinuation = false
  ) => {
    if (!isTimeInSchedule(start, end, day, scheduleEntries)) return undefined;

    const entry = getScheduleEntryForSlot(start, end, day, scheduleEntries);
    if (
      maskContinuation &&
      entry &&
      isDesignationEntry(entry) &&
      hasAdjacentSchedule(start, end, day, "top", scheduleEntries) === "same"
    ) {
      return undefined;
    }
    return getDutyColor(start, day, scheduleEntries) || "rgb(253 224 71)";
  };

  const getCenterText = (start, day, scheduleEntries = schedule, enableGridEdit = !isDesignationMode) => {
    const parseTime = (t) => new Date(`1970-01-01 ${t}`);
    const SLOT_HEIGHT_REM = 2.5;

    const slotStart = parseTime(start);

    for (const entry of scheduleEntries) {
      if (entry.day_description !== day) continue;
      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);

      if (!(slotStart >= schedStart && slotStart < schedEnd)) continue;

      const totalHours = (schedEnd - schedStart) / (1000 * 60 * 60);
      const isTopSlot = slotStart.getTime() === schedStart.getTime();
      const isBottomSlot =
        slotStart.getTime() + 30 * 60 * 1000 >= schedEnd.getTime();
      const showDeleteButton =
        isTopSlot &&
        (isDesignationMode
          ? isDesignationEntry(entry)
          : !isDesignationEntry(entry));
      const selectionHighlightClass =
        editingScheduleId === entry.id
          ? [
            "box-border border-blue-600 border-l-2 border-r-2",
            isTopSlot ? "border-t-2" : "",
            isBottomSlot ? "border-b-2" : "",
          ]
            .filter(Boolean)
            .join(" ")
          : "";

      const blockHeightRem = totalHours * SLOT_HEIGHT_REM;
      const useCompactText = totalHours === 1;
      const useOverlayCentering = isDesignationEntry(entry);
      const dutyColor =
        getDutyColor(entry.school_time_start, day, scheduleEntries) ||
        "rgb(253 224 71)";

      let textContent = null;
      if (isTopSlot) {
        if (useOverlayCentering) {
          textContent = (
            <span
              className={`absolute left-0 right-0 z-[2] box-border border-b border-black flex flex-col items-center justify-center text-center leading-tight pointer-events-none px-0.5 ${useCompactText ? "text-[10px]" : "text-[11px]"
                }`}
              style={{
                top: 0,
                height: `${blockHeightRem}rem`,
                backgroundColor: dutyColor,
              }}
            >
              <span className="block truncate max-w-full">{entry.course_code}</span>
            </span>
          );
        } else if (totalHours === 1) {
          textContent = (
            <>
              <span className="block truncate text-[10px]">{entry.course_code}</span>
              {entry.program_code && entry.section_description && (
                <span className="block truncate text-[8px]">
                  {entry.program_code}-{entry.section_description}
                </span>
              )}
              {entry.section_description &&
                entry.section_description !== 0 &&
                entry.section_description !== "0" &&
                entry.room_description && (
                  <span className="block truncate text-[8px] max-w-[100px]">
                    {entry.room_description}
                  </span>
                )}
            </>
          );
        } else {
          const textHeightRem = 0.5;
          const marginTop = (blockHeightRem - textHeightRem) / 2;

          textContent = (
            <span
              className="absolute inset-0 flex flex-col items-center justify-center text-center text-[11px] leading-tight cursor-pointer"
              style={{ top: `${marginTop}rem` }}
            >
              {entry.course_code} <br />
              {(entry.program_code || entry.section_description) && (
                <>
                  {[entry.program_code, entry.section_description]
                    .filter(Boolean)
                    .join(" - ")}
                  <br />
                </>
              )}
              {entry.section_description &&
                entry.section_description !== 0 &&
                entry.section_description !== "0" &&
                entry.room_description && (
                  <>({entry.room_description})</>
                )}
            </span>
          );
        }
      }

      return (
        <div
          className={`schedule-block relative w-full h-full cursor-pointer text-center ${selectionHighlightClass}`}
          onClick={() => {
            if (enableGridEdit) {
              handleSelectScheduleForEdit(entry);
            }
          }}
        >
          {isTopSlot && textContent}
          {showDeleteButton && hasAnyPlottingAccess && (
            <button
              className="absolute top-[-10px] right-[-10px] z-[100] bg-red-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center hover:bg-red-700"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedScheduleId(entry.id);
                setOpenDialogue(true);
              }}
            >
              <HighlightOffIcon />
            </button>
          )}
        </div>
      );
    }

    return "";
  };

  const handleSubmitWrapper = (e) => {
    e.preventDefault();
    if (rejectPlottingIfDisabled()) return;

    if (isDesignationMode) {
      return handleSubmitDesignation(e); // your designation check
    } else {
      return handleSubmit(e); // your regular-load check
    }
  };

  const handleDownloadClassSchedule = async () => {

    if (!selectedSection) {
      setMessage("Please select a Section before downloading the class schedule.");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return;
    }

    const sectionMeta =
      sectionList.find(
        (section) => String(section.dep_section_id) === String(selectedSection),
      ) || {};

    const collegeFromMap =
      (sectionMeta.dprtmnt_id &&
        departmentAccessMap[String(sectionMeta.dprtmnt_id)]?.dprtmnt_name) ||
      allDepartments.find(
        (dept) => String(dept.dprtmnt_id) === String(sectionMeta.dprtmnt_id),
      )?.dprtmnt_name ||
      "";


    try {
      await downloadClassProgramPdf({
        apiBaseUrl: API_BASE_URL,
        sectionId: selectedSection,
        sectionMeta,
        companyName,
        campusAddress,
        logoUrl: fetchedLogo || EaristLogo,
        collegeName: collegeFromMap,
        signatures: {
          preparedByTitle: "Department Head",
          certifiedByTitle: "Dean",
        },
      });
      setMessage("Class schedule downloaded successfully.");
      setSnackbarSeverity("success");
      setOpenSnackbar(true);
    } catch (error) {
      console.error("Failed to download class schedule:", error);
      setMessage(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to download class schedule. Please try again.",
      );
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    } finally {

    }
  };

  const handleInsertWrapper = (e) => {
    e.preventDefault();
    if (rejectPlottingIfDisabled()) return;

    if (isDesignationMode) {
      return handleInsertDesignation(e); // your designation insert
    }
    if (editingScheduleId) {
      return handleUpdateSchedule(e);
    }
    return handleInsert(e); // your regular insert
  };

  // ---------------------------------------------------------------------
  // Grid renderer — replaces the previous ~1,400 lines of duplicated JSX
  // (one hand-copied block per hour) with a single loop over HOUR_BLOCKS.
  // Visual output and merge/edit behavior are unchanged.
  // ---------------------------------------------------------------------
  const renderScheduleGrid = (plotSchedule, enableEdit, gridKey) => (
    <table className="mt-[0.7rem] mb-6">
      <thead className="bg-[#c0c0c0]">
        <tr className="min-w-[6.5rem] min-h-[2.2rem] flex items-center justify-center border border-black border-b-0 text-[14px] font-semibold">
          {gridKey === "designation"
            ? "Designation Schedule Plotted"
            : "Regular Load Schedule Plotted"}
        </tr>
        <tr className="flex align-center">
          <td className="min-w-[6.5rem] min-h-[2.2rem] flex items-center justify-center border border-black text-[14px]">
            TIME
          </td>
          <td className="p-0 m-0">
            <div className="min-w-[6.6rem] text-center border border-black border-l-0 border-b-0 text-[14px]">
              DAY
            </div>
            <p className="min-w-[6.6rem] text-center border border-black border-l-0 text-[11.5px] font-bold mt-[-3px]">
              Official Time
            </p>
          </td>
          {SCHEDULE_DAY_ORDER.map((day) => (
            <td key={day} className="p-0 m-0">
              <div
                className={`${getDayColWidthClass(day)} text-center border border-black border-l-0 border-b-0 text-[14px]`}
              >
                {DAY_DISPLAY_NAMES[day]}
              </div>
              <p
                className={`h-[20px] ${getDayColWidthClass(day)} text-center border border-black border-l-0 text-[11.5px] mt-[-3px]`}
              >
                {getDayScheduleRange(day, plotSchedule)}
              </p>
            </td>
          ))}
        </tr>
      </thead>
      <tbody className="flex flex-col mt-[-0.1px]">
        {HOUR_BLOCKS.map((block) => (
          <tr key={block.label} className="flex w-full">
            <td className="m-0 p-0 min-w-[13.1rem]">
              <div className="bg-[#eaeaea] h-[2.5rem] border border-black border-t-0 text-[14px] flex items-center justify-center">
                {block.label}
              </div>
            </td>

            {SCHEDULE_DAY_ORDER.map((day) => (
              <td key={day} className={`m-0 p-0 ${getDayColWidthClass(day)}`}>
                <div className="h-[2.5rem] p-0 m-0">
                  {[
                    { start: block.start, end: block.mid, isTop: true },
                    { start: block.mid, end: block.end, isTop: false },
                  ].map(({ start, end, isTop }) => {
                    const inSchedule = isTimeInSchedule(start, end, day, plotSchedule);
                    const mergeTop =
                      inSchedule &&
                      hasAdjacentSchedule(start, end, day, "top", plotSchedule) === "same";
                    const mergeBottom =
                      inSchedule &&
                      hasAdjacentSchedule(start, end, day, "bottom", plotSchedule) === "same";

                    return (
                      <div
                        key={start}
                        style={{
                          borderTop: isTop ? undefined : "none",
                          backgroundColor: getScheduleSlotBackground(
                            start,
                            end,
                            day,
                            plotSchedule,
                            gridKey === "designation",
                          ),
                        }}
                        className={`h-[1.25rem] border border-black border-l-0 flex items-center justify-center
                          ${isTop ? "border-t-0" : ""}
                          ${mergeTop ? "border-t-0" : ""}
                          ${mergeBottom ? "border-b-0" : ""}`}
                      >
                        {getCenterText(start, day, plotSchedule, enableEdit)}
                      </div>
                    );
                  })}
                </div>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  // Put this at the very bottom before the return 
  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return (
      <Unauthorized />
    );
  }

  const loadTypeSection = !isDesignationMode ? (
    <div className="flex mb-4">
      <div className="p-2 w-[12rem]">Load Type:</div>
      <div className="flex flex-col gap-2 pt-1">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isHonorarium}
            onChange={(e) => handleHonorariumToggle(e.target.checked)}
            className="h-4 w-4"
          />
          Honorarium Load
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isServiceCredit}
            onChange={(e) => handleServiceCreditToggle(e.target.checked)}
            className="h-4 w-4"
          />
          Service Credit
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isTemporarySubstitution}
            onChange={(e) => handleTemporarySubstitutionToggle(e.target.checked)}
            className="h-4 w-4"
          />
          Temporary Substitution
        </label>
      </div>
    </div>
  ) : null;

  return (
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
      {/* ---------------------------------------------------------------- */}
      {/* Header                                                          */}
      {/* ---------------------------------------------------------------- */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            mb: 2,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              color: titleColor,
              fontSize: "36px",
            }}
          >
            SCHEDULE CHECKER
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <Button
            variant="outlined"
            onClick={() => {
              const newMode = !isDesignationMode;
              clearEditMode();
              clearScheduleLoadTypes();
              setSelectedProf("");
              setIsDesignationMode(newMode);

              if (newMode) {
                fetchDesignationList();
              } else {
                fetchCourseList();
              }
            }}
            disabled={!hasAnyPlottingAccess}
            startIcon={<AutorenewIcon />}
            sx={{
              height: "40px",
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {isDesignationMode ? "Assign Regular Load" : "Assign Designation"}
          </Button>

          <Button
            variant="outlined"
            onClick={handleOpenReviewDialog}
            startIcon={<VisibilityIcon />}
            sx={{
              height: "40px",
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            View Schedule
          </Button>

          <Tooltip title={!selectedSection ? "Select a section first" : "Download the printable class program"}>
            <span>
              <Button
                variant="contained"
                onClick={handleDownloadClassSchedule}
                startIcon={<FcPrint size={20} />}
                sx={{
                  minWidth: "220px",
                  whiteSpace: "nowrap",
                  height: "40px",
                  px: "20px",
                  py: "5px",
                  border: "2px solid black",
                  borderRadius: "8px",
                  backgroundColor: "#f0f0f0",
                  color: "black",
                  fontSize: "14px",
                  fontWeight: "bold",
                  textTransform: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  userSelect: "none",
                  boxShadow: "none",
                  transition: "background-color 0.3s, transform 0.2s",

                  "&:hover": {
                    backgroundColor: "#d3d3d3",
                    boxShadow: "none",
                  },

                  "&:active": {
                    transform: "scale(0.95)",
                  },

                  "&.Mui-disabled": {
                    backgroundColor: "#f0f0f0",
                    color: "#888",
                    border: "2px solid #999",
                  },
                }}
              >
                Download Class Schedule
              </Button>
            </span>
          </Tooltip>
        </Box>

        <hr style={{ border: "1px solid #ccc", width: "100%" }} />
        <br />


      </Box>

      <TableContainer component={Paper} sx={{ width: "100%", border: `1px solid ${borderColor}`, borderRadius: 2, overflow: "hidden" }}>
        <Table>
          <TableHead sx={{ backgroundColor: headerColor }}>
            <TableRow>
              <TableCell sx={{ color: "white", textAlign: "center", fontWeight: 600, letterSpacing: 0.3 }}>
                College Schedule Plotting and Management
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>
      <Box sx={{ mb: 2 }} />

      {message && (
        <Snackbar
          open={openSnackbar}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={
              snackbarSeverity ||
              (message.includes("success") || message.includes("available")
                ? "success"
                : "error")
            }
            sx={{
              width: "100%",
              whiteSpace: "pre-line",
              alignItems: "center",
              borderRadius: 2,
            }}
          >
            {message}
          </Alert>
        </Snackbar>
      )}

      {disabledDepartmentLabels.length > 0 && hasAnyPlottingAccess && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          Schedule plotting is turned off for: {disabledDepartmentLabels.join(", ")}.
          You can continue plotting only for your remaining allowed departments.
        </Alert>
      )}

      {isPlottingFullyBlocked && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {PLOTTING_DISABLED_MESSAGE}
        </Alert>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Main content: form + grid                                       */}
      {/* ---------------------------------------------------------------- */}
      <Box sx={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Box>
          <fieldset
            disabled={!hasAnyPlottingAccess}
            style={{
              border: 0,
              margin: 0,
              padding: 0,
              minWidth: 0,
            }}
          >
            <form
              onSubmit={handleInsertWrapper}
              style={{
                width: "100%",
                maxWidth: "600px",
                border: `1px solid ${borderColor}`,
                borderRadius: "12px",
                backgroundColor: "white",
                padding: "2rem",
                boxShadow: "0px 2px 12px rgba(0,0,0,0.08)",
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: titleColor }}>
                {editingScheduleId
                  ? "Update Selected Schedule"
                  : isDesignationMode
                    ? "Plot a Designation"
                    : "Plot a Regular Class"}
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {/* Day */}
              <div className="flex mb-2 mt-2">
                <div className="p-2 w-[12rem]">Day:</div>
                <select
                  className="border border-gray-500 outline-none rounded w-full h-10 px-2 disabled:bg-gray-100"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  disabled={Boolean(editingScheduleId)}
                  required
                >
                  <option value="">Select Day</option>
                  {dayList.map((day) => (
                    <option key={day.day_id} value={day.day_id}>
                      {day.day_description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              {!isDesignationMode && (
                <div className="flex mb-2">
                  <div className="p-2 w-[12rem]">Section:</div>
                  <Autocomplete
                    options={sectionList}
                    fullWidth
                    disabled={Boolean(editingScheduleId)}
                    getOptionLabel={(option) =>
                      `${option.description || ""} ${option.program_code || ""}`.trim()
                    }
                    value={
                      sectionList.find(
                        (section) => String(section.dep_section_id) === String(selectedSection)
                      ) || null
                    }
                    onChange={(event, newValue) => {
                      setSelectedSection(newValue ? newValue.dep_section_id : "");
                    }}
                    isOptionEqualToValue={(option, value) =>
                      String(option.dep_section_id) === String(value.dep_section_id)
                    }
                    filterOptions={(options, { inputValue }) => {
                      const input = inputValue.trim().toLowerCase();
                      if (!input) return options;

                      // Exact/starts-with match first, then fallback to includes
                      const exact = options.filter((o) =>
                        `${o.description || ""} ${o.program_code || ""}`
                          .toLowerCase()
                          .startsWith(input)
                      );
                      if (exact.length > 0) return exact;

                      return options.filter((o) =>
                        `${o.description || ""} ${o.program_code || ""}`
                          .toLowerCase()
                          .includes(input)
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Section"
                        size="small"
                        required={!isDesignationMode}
                      />
                    )}
                  />
                </div>
              )}

              {/* Room */}
              {!isDesignationMode && (
                <div className="flex mb-2">
                  <div className="p-2 w-[12rem]">Room:</div>
                  <select
                    className="border border-gray-500 outline-none rounded w-full h-10 px-2 disabled:bg-gray-100"
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    disabled={Boolean(editingScheduleId)}
                    required
                  >
                    <option value="">Select Room</option>
                    {roomList.map((room) => (
                      <option key={room.room_id} value={String(room.room_id)}>
                        {room.room_description}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {/* Search Course & Course Select */}
              <div className="flex flex-col mb-2 w-full">
                <div className="flex mb-1 items-center">
                  <div className="p-2 w-[12rem]">{isDesignationMode ? "Designation:" : "Course:"}</div>
                  <Autocomplete
                    options={courseList}
                    fullWidth
                    disabled={Boolean(editingScheduleId)}
                    getOptionLabel={(option) =>
                      `${option.course_code || ""} - ${option.course_description || ""}`.trim()
                    }
                    value={
                      courseList.find(
                        (course) => String(course.course_id) === String(selectedSubject)
                      ) || null
                    }
                    onChange={(event, newValue) => {
                      setSelectedSubject(newValue ? newValue.course_id : "");
                    }}
                    isOptionEqualToValue={(option, value) =>
                      String(option.course_id) === String(value.course_id)
                    }
                    filterOptions={(options, { inputValue }) => {
                      const input = inputValue.trim().toLowerCase();
                      if (!input) return options;

                      const exact = options.filter((o) =>
                        o.course_code?.toLowerCase() === input ||
                        o.course_description?.toLowerCase() === input
                      );
                      if (exact.length > 0) return exact;

                      const startsWith = options.filter((o) =>
                        o.course_code?.toLowerCase().startsWith(input) ||
                        o.course_description?.toLowerCase().startsWith(input)
                      );
                      if (startsWith.length > 0) return startsWith;

                      return options.filter((o) =>
                        o.course_code?.toLowerCase().includes(input) ||
                        o.course_description?.toLowerCase().includes(input)
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={isDesignationMode ? "Select Designation" : "Select Course"}
                        size="small"
                        required
                      />
                    )}
                  />
                </div>
              </div>

              {editingScheduleId && loadTypeSection}

              {/* Professor Select */}
              <div className="flex flex-col mb-2 w-full">
                <div className="flex mb-1 items-center">
                  <div className="p-2 w-[12rem]">Professor:</div>
                  <Autocomplete
                    options={profList}
                    fullWidth
                    disabled={Boolean(editingScheduleId) && !isTemporarySubstitution}
                    getOptionLabel={(option) =>
                      `${option.lname || ""}, ${option.fname || ""} ${option.mname || ""}`.trim()
                    }
                    value={
                      profList.find(
                        (prof) => String(prof.prof_id) === String(selectedProf)
                      ) || null
                    }
                    onChange={(event, newValue) => {
                      setSelectedProf(newValue ? newValue.prof_id : "");
                    }}
                    isOptionEqualToValue={(option, value) =>
                      String(option.prof_id) === String(value.prof_id)
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Professor"
                        size="small"
                        required
                        helperText={
                          editingScheduleId && !isTemporarySubstitution
                            ? "Check Temporary Substitution above to change the professor."
                            : ""
                        }
                      />
                    )}
                  />
                </div>
                <Box sx={{ pl: "12rem" }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={pickOtherDepartmentProfessor}
                        onChange={handleOtherDepartmentCheckboxChange}
                        disabled={Boolean(editingScheduleId) && !isTemporarySubstitution}
                      />
                    }
                    label="Pick professor from other department"
                  />
                </Box>
              </div>

              {/* School Year */}
              <div className="flex mb-2">
                <div className="p-2 w-[12rem]">School Year:</div>
                <div className="border border-gray-500 rounded w-full h-10 px-2 flex items-center bg-gray-100">
                  {getSelectedSchoolYearEntry()?.year_description}{" "}
                  -{" "}
                  {getSelectedSchoolYearEntry()?.semester_description}
                </div>
              </div>

              {/* Start Time */}
              <div className="flex mb-2">
                <div className="p-2 w-[12rem]">Start Time:</div>
                <input
                  className="border border-gray-500 rounded w-full h-10 px-2 disabled:bg-gray-100"
                  type="time"
                  value={selectedStartTime}
                  min={SCHEDULE_TIME_INPUT_MIN}
                  max={SCHEDULE_TIME_INPUT_MAX}
                  step={SCHEDULE_TIME_INPUT_STEP}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  disabled={Boolean(editingScheduleId)}
                  required
                />
              </div>

              {/* End Time */}
              <div className="flex mb-4">
                <div className="p-2 w-[12rem]">End Time:</div>
                <input
                  className="border border-gray-500 rounded w-full h-10 px-2 disabled:bg-gray-100"
                  type="time"
                  value={selectedEndTime}
                  min={SCHEDULE_TIME_INPUT_MIN}
                  max={SCHEDULE_TIME_INPUT_MAX}
                  step={SCHEDULE_TIME_INPUT_STEP}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  disabled={Boolean(editingScheduleId)}
                  required
                />
              </div>
              {!editingScheduleId && loadTypeSection}
              <div className="flex justify-between items-center gap-2">
                {editingScheduleId && (
                  <Button
                    color="error"
                    variant="outlined"
                    type="button"
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                    onClick={() => {
                      clearEditMode();
                      clearScheduleLoadTypes();
                      resetScheduleForm();
                    }}
                  >
                    Cancel Edit
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    className="bg-[#800000] hover:bg-red-900 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ backgroundColor: mainButtonColor }}
                    onClick={handleSubmitWrapper}
                    disabled={!hasAnyPlottingAccess}
                  >
                    Check Schedule
                  </button>
                  <button
                    className="bg-[#1967d2] hover:bg-[#000000] text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    type="submit"
                    disabled={
                      !hasAnyPlottingAccess ||
                      (Boolean(editingScheduleId) && !hasValidUpdate())
                    }
                  >
                    {editingScheduleId ? "Update Schedule" : "Insert Schedule"}
                  </button>
                </div>
              </div>
            </form>
          </fieldset>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: "0.6rem", flex: 1, minWidth: 300 }}>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              alignItems: "center",
              p: 1.25,
              backgroundColor: "white",
              border: `1px solid ${borderColor}`,
              borderRadius: 2,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: subtitleColor, mr: 1 }}>
              LEGEND
            </Typography>



            {workloadTypeList.map((item) => (
              <Chip
                key={item.id}
                size="small"
                label={item.workload_description}
                sx={{
                  backgroundColor: item.workload_color || "#eeeeee",
                  border: "1px solid rgba(0,0,0,0.15)",
                  fontSize: "11px",
                }}
              />
            ))}
          </Box>

          {(isDesignationMode
            ? [
              {
                key: "designation",
                plotSchedule: getDesignationPlotSchedule(),
                enableEdit: hasAnyPlottingAccess,
              },
            ]
            : [
              {
                key: "regular",
                plotSchedule: filterPlottedScheduleByDepartmentAccess(
                  schedule.filter((entry) => !isDesignationEntry(entry)),
                ),
                enableEdit: hasAnyPlottingAccess,
              },
            ]
          ).map(({ key, plotSchedule, enableEdit }) => (
            <Box
              key={key}
              sx={{
                backgroundColor: "white",
                border: `1px solid ${borderColor}`,
                borderRadius: 2,
                p: 1,
                overflowX: "auto",
                boxShadow: "0px 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              {renderScheduleGrid(plotSchedule, enableEdit, key)}
            </Box>
          ))}
        </Box>
      </Box>

      {/* -------------------------------------------------------------- */}
      {/* Review Schedule dialog — content-heavy, keeps its own layout   */}
      {/* but now uses the same colored-header treatment as the rest.   */}
      {/* -------------------------------------------------------------- */}
      <Dialog
        open={openReviewDialog}
        onClose={() => setOpenReviewDialog(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            pr: 3,
          }}
        >
          <Box component="span">Review Schedule</Box>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              size="small"
              variant={reviewViewMode === "professor" ? "contained" : "outlined"}
              onClick={() => handleReviewViewModeChange("professor")}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                ...(reviewViewMode !== "professor" && {
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.7)",
                }),
              }}
            >
              Per Professor
            </Button>
            <Button
              size="small"
              variant={reviewViewMode === "department" ? "contained" : "outlined"}
              onClick={() => handleReviewViewModeChange("department")}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                ...(reviewViewMode !== "department" && {
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.7)",
                }),
              }}
            >
              Per Department
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              mt: 3,
              mb: 3,
              gridTemplateColumns: {
                xs: "1fr",
                md:
                  reviewViewMode === "department"
                    ? "repeat(3, 1fr)"
                    : "repeat(2, 1fr)",
                lg:
                  reviewViewMode === "department"
                    ? "repeat(5, 1fr)"
                    : "repeat(4, 1fr)",
              },
            }}
          >
            {reviewViewMode === "department" && (
              <Box sx={{ mt: "3px" }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, mb: 0.5 }}
                >
                  Department
                </Typography>

                <FormControl fullWidth size="small">
                  <Select
                    value={reviewFilterDepartment}
                    onChange={(e) =>
                      handleReviewDepartmentChange(e.target.value)
                    }
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>Select Department</em>
                    </MenuItem>

                    {userDepartmentOptions.map((dept) => (
                      <MenuItem
                        key={dept.dprtmnt_id}
                        value={dept.dprtmnt_id}
                      >
                        {dept.dprtmnt_code
                          ? `${dept.dprtmnt_code} - ${dept.dprtmnt_name}`
                          : dept.dprtmnt_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            <Box sx={{ mt: "3px" }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, mb: 0.5 }}
              >
                Professor
              </Typography>

              <Autocomplete
                options={reviewProfessorOptions}
                fullWidth
                size="small"
                getOptionLabel={(option) =>
                  `${option.employee_id || ""} - ${option.fname || ""
                    } ${option.mname?.charAt(0) || ""}${option.mname ? "." : ""
                    } ${option.lname || ""}`.trim()
                }
                value={
                  reviewProfessorOptions.find(
                    (prof) =>
                      String(prof.employee_id) ===
                      String(reviewFilterProfessor)
                  ) || null
                }
                onChange={(event, newValue) => {
                  setReviewFilterProfessor(
                    newValue ? newValue.employee_id : ""
                  );
                }}
                isOptionEqualToValue={(option, value) =>
                  String(option.employee_id) ===
                  String(value.employee_id)
                }
                disabled={
                  reviewViewMode === "department" &&
                  !reviewFilterDepartment
                }
                renderInput={(params) => (
                  <TextField {...params} size="small" />
                )}
              />
            </Box>


            <Box sx={{ mt: "3px" }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, mb: 0.5 }}
              >
                Room
              </Typography>

              <FormControl fullWidth size="small">
                <Select
                  value={reviewFilterRoom}
                  onChange={(e) =>
                    setReviewFilterRoom(e.target.value)
                  }
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>All Rooms</em>
                  </MenuItem>

                  {roomList.map((room) => (
                    <MenuItem
                      key={room.room_id}
                      value={room.room_id}
                    >
                      {room.room_description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>


            <Box sx={{ mt: "3px" }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, mb: 0.5 }}
              >
                Day
              </Typography>

              <FormControl fullWidth size="small">
                <Select
                  value={reviewFilterDay}
                  onChange={(e) =>
                    setReviewFilterDay(e.target.value)
                  }
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>All Days</em>
                  </MenuItem>

                  {dayList.map((day) => (
                    <MenuItem
                      key={day.day_id}
                      value={day.day_id}
                    >
                      {day.day_description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>


            <Box sx={{ mt: "3px" }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, mb: 0.5 }}
              >
                Section
              </Typography>

              <FormControl fullWidth size="small">
                <Select
                  value={reviewFilterSection}
                  onChange={(e) =>
                    setReviewFilterSection(e.target.value)
                  }
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>All Sections</em>
                  </MenuItem>

                  {sectionList.map((section) => (
                    <MenuItem
                      key={section.dep_section_id}
                      value={section.dep_section_id}
                    >
                      {`${section.program_code || ""} ${section.description || ""
                        }`.trim()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          <TableContainer component={Paper} sx={{ width: "100%", mt: 2 }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: headerColor, color: "white" }}>
                <TableRow>
                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                      py: 0.5,
                      backgroundColor: headerColor,
                      color: "white",
                    }}
                  >
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      flexWrap="wrap"
                      sx={{ padding: "6px" }}
                    >
                      <Typography fontSize="14px" fontWeight="bold" color="white">
                        Total Schedule Records: {filteredReviewSchedules.length}
                      </Typography>

                      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Button
                          onClick={() => setReviewCurrentPage(1)}
                          disabled={reviewCurrentPage === 1}
                          variant="outlined"
                          size="small"
                          sx={{
                            minWidth: 80,
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            "&:hover": {
                              borderColor: "white",
                              backgroundColor: "rgba(255,255,255,0.1)",
                            },
                            "&.Mui-disabled": {
                              color: "white",
                              borderColor: "white",
                              backgroundColor: "transparent",
                              opacity: 1,
                            },
                          }}
                        >
                          First
                        </Button>
                        <Button
                          onClick={() => setReviewCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={reviewCurrentPage === 1}
                          variant="outlined"
                          size="small"
                          sx={{
                            minWidth: 80,
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            "&:hover": {
                              borderColor: "white",
                              backgroundColor: "rgba(255,255,255,0.1)",
                            },
                            "&.Mui-disabled": {
                              color: "white",
                              borderColor: "white",
                              backgroundColor: "transparent",
                              opacity: 1,
                            },
                          }}
                        >
                          Prev
                        </Button>

                        <FormControl size="small" sx={{ minWidth: 80 }}>
                          <Select
                            value={reviewCurrentPage}
                            onChange={(e) => setReviewCurrentPage(Number(e.target.value))}
                            displayEmpty
                            sx={{
                              fontSize: "12px",
                              height: 36,
                              color: "white",
                              border: "1px solid white",
                              backgroundColor: "transparent",
                              ".MuiOutlinedInput-notchedOutline": {
                                borderColor: "white",
                              },
                              "&:hover .MuiOutlinedInput-notchedOutline": {
                                borderColor: "white",
                              },
                              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                borderColor: "white",
                              },
                              "& svg": {
                                color: "white",
                              },
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  maxHeight: 200,
                                  backgroundColor: "#fff",
                                },
                              },
                            }}
                          >
                            {Array.from({ length: reviewTotalPages }, (_, i) => (
                              <MenuItem key={i + 1} value={i + 1}>
                                Page {i + 1}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Typography fontSize="11px" color="white">
                          of {reviewTotalPages} page{reviewTotalPages > 1 ? "s" : ""}
                        </Typography>

                        <Button
                          onClick={() => setReviewCurrentPage((prev) => Math.min(prev + 1, reviewTotalPages))}
                          disabled={reviewCurrentPage === reviewTotalPages}
                          variant="outlined"
                          size="small"
                          sx={{
                            minWidth: 80,
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            "&:hover": {
                              borderColor: "white",
                              backgroundColor: "rgba(255,255,255,0.1)",
                            },
                            "&.Mui-disabled": {
                              color: "white",
                              borderColor: "white",
                              backgroundColor: "transparent",
                              opacity: 1,
                            },
                          }}
                        >
                          Next
                        </Button>
                        <Button
                          onClick={() => setReviewCurrentPage(reviewTotalPages)}
                          disabled={reviewCurrentPage === reviewTotalPages}
                          variant="outlined"
                          size="small"
                          sx={{
                            minWidth: 80,
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            "&:hover": {
                              borderColor: "white",
                              backgroundColor: "rgba(255,255,255,0.1)",
                            },
                            "&.Mui-disabled": {
                              color: "white",
                              borderColor: "white",
                              backgroundColor: "transparent",
                              opacity: 1,
                            },
                          }}
                        >
                          Last
                        </Button>
                      </Box>
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
            </Table>
          </TableContainer>

          {isReviewLoading ? (
            <Typography variant="body2" color="text.secondary">
              Loading schedule...
            </Typography>
          ) : reviewViewMode === "department" && !reviewFilterDepartment ? (
            <Typography variant="body2" color="text.secondary">
              Select a department to review schedule.
            </Typography>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", }}>
              <thead>
                <tr>
                  <td style={{ border: "solid black 1px", padding: "5px 0px", textAlign: "center", fontSize: "0.9rem", backgroundColor: "#f5f5f5", fontWeight: "600" }}>#</td>
                  <td style={{ border: "solid black 1px", padding: "5px 0px", textAlign: "center", fontSize: "0.9rem", backgroundColor: "#f5f5f5", fontWeight: "600" }}>Employee ID</td>
                  <td style={{ border: "solid black 1px", padding: "5px 0px", textAlign: "center", fontSize: "0.9rem", backgroundColor: "#f5f5f5", fontWeight: "600" }}>Professor Name</td>
                  <td style={{ border: "solid black 1px", padding: "5px 0px", textAlign: "center", fontSize: "0.9rem", backgroundColor: "#f5f5f5", fontWeight: "600" }}>Course Assigned</td>
                  <td style={{ border: "solid black 1px", padding: "5px 0px", textAlign: "center", fontSize: "0.9rem", backgroundColor: "#f5f5f5", fontWeight: "600" }}>Section Assigned</td>
                  <td style={{ border: "solid black 1px", padding: "5px 0px", textAlign: "center", fontSize: "0.9rem", backgroundColor: "#f5f5f5", fontWeight: "600" }}>Day</td>
                  <td style={{ border: "solid black 1px", padding: "5px 0px", textAlign: "center", fontSize: "0.9rem", backgroundColor: "#f5f5f5", fontWeight: "600" }}>Time Start</td>
                  <td style={{ border: "solid black 1px", padding: "5px 0px", textAlign: "center", fontSize: "0.9rem", backgroundColor: "#f5f5f5", fontWeight: "600" }}>Time End</td>
                  <td style={{ border: "solid black 1px", padding: "5px 0px", textAlign: "center", fontSize: "0.9rem", backgroundColor: "#f5f5f5", fontWeight: "600" }}>Room</td>
                  <td style={{ border: "solid black 1px", padding: "5px 0px", textAlign: "center", fontSize: "0.9rem", backgroundColor: "#f5f5f5", fontWeight: "600" }}>Types</td>
                  <td style={{ border: "solid black 1px", padding: "5px 0px", textAlign: "center", fontSize: "0.9rem", backgroundColor: "#f5f5f5", fontWeight: "600" }}>Academic Year</td>
                </tr>
              </thead>
              <tbody>
                {currentReviewSchedules.map((row, index) => (
                  <tr
                    key={`${row.employee_id}-${row.day}-${row.school_time_start}-${row.school_time_end}-${index}`}
                    style={{
                      backgroundColor: index % 2 === 0 ? "#ffffff" : "lightgray",
                    }}
                  >
                    <td
                      style={{
                        textAlign: "center",
                        border: "solid black 1px",
                        padding: "4px",
                        fontSize: "0.85rem",
                      }}
                    >
                      {reviewIndexOfFirstItem + index + 1}
                    </td>

                    <td
                      style={{
                        textAlign: "center",
                        border: "solid black 1px",
                        padding: "4px",
                        fontSize: "0.85rem",
                      }}
                    >
                      {row.employee_id}
                    </td>

                    <td
                      style={{
                        border: "solid black 1px",
                        padding: "4px 8px",
                        fontSize: "0.85rem",
                      }}
                    >
                      {row.fname} {row.mname?.charAt(0)}. {row.lname}
                    </td>

                    <td
                      style={{
                        border: "solid black 1px",
                        padding: "4px 8px",
                        fontSize: "0.85rem",
                      }}
                    >
                      {row.course_code}
                    </td>

                    <td
                      style={{
                        border: "solid black 1px",
                        padding: "4px 8px",
                        fontSize: "0.85rem",
                      }}
                    >
                      {row.program_code}-{row.section_description}
                    </td>

                    <td
                      style={{
                        textAlign: "center",
                        border: "solid black 1px",
                        padding: "4px",
                        fontSize: "0.85rem",
                      }}
                    >
                      {row.day}
                    </td>

                    <td
                      style={{
                        textAlign: "center",
                        border: "solid black 1px",
                        padding: "4px",
                        fontSize: "0.85rem",
                      }}
                    >
                      {row.school_time_start}
                    </td>

                    <td
                      style={{
                        textAlign: "center",
                        border: "solid black 1px",
                        padding: "4px",
                        fontSize: "0.85rem",
                      }}
                    >
                      {row.school_time_end}
                    </td>

                    <td
                      style={{
                        textAlign: "center",
                        border: "solid black 1px",
                        padding: "4px",
                        fontSize: "0.85rem",
                      }}
                    >
                      {row.room_description}
                    </td>

                    <td
                      style={{
                        textAlign: "center",
                        border: "solid black 1px",
                        padding: "4px",
                        fontSize: "0.85rem",
                      }}
                    >
                      {getScheduleTypeLabel(row)}
                    </td>

                    <td
                      style={{
                        textAlign: "center",
                        border: "solid black 1px",
                        padding: "4px",
                        fontSize: "0.85rem",
                      }}
                    >
                      {row.current_year}-{row.next_year},{" "}
                      {row.semester_description}
                    </td>
                  </tr>
                ))}


                {filteredReviewSchedules.length === 0 && (
                  <tr>
                    <td colSpan={11} style={{ textAlign: "center", border: "solid black 1px", padding: "8px", fontSize: "0.85rem" }}>
                      No schedule found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>

            </table>

          )}
          <TableContainer component={Paper} sx={{ width: "100%", }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: headerColor, color: "white" }}>
                <TableRow>
                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                      py: 0.5,
                      backgroundColor: headerColor,
                      color: "white",
                    }}
                  >
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      flexWrap="wrap"
                      sx={{ padding: "6px" }}
                    >
                      <Typography fontSize="14px" fontWeight="bold" color="white">
                        Total Schedule Records: {filteredReviewSchedules.length}
                      </Typography>

                      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                        <Button
                          onClick={() => setReviewCurrentPage(1)}
                          disabled={reviewCurrentPage === 1}
                          variant="outlined"
                          size="small"
                          sx={{
                            minWidth: 80,
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            "&:hover": {
                              borderColor: "white",
                              backgroundColor: "rgba(255,255,255,0.1)",
                            },
                            "&.Mui-disabled": {
                              color: "white",
                              borderColor: "white",
                              backgroundColor: "transparent",
                              opacity: 1,
                            },
                          }}
                        >
                          First
                        </Button>
                        <Button
                          onClick={() => setReviewCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={reviewCurrentPage === 1}
                          variant="outlined"
                          size="small"
                          sx={{
                            minWidth: 80,
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            "&:hover": {
                              borderColor: "white",
                              backgroundColor: "rgba(255,255,255,0.1)",
                            },
                            "&.Mui-disabled": {
                              color: "white",
                              borderColor: "white",
                              backgroundColor: "transparent",
                              opacity: 1,
                            },
                          }}
                        >
                          Prev
                        </Button>

                        <FormControl size="small" sx={{ minWidth: 80 }}>
                          <Select
                            value={reviewCurrentPage}
                            onChange={(e) => setReviewCurrentPage(Number(e.target.value))}
                            displayEmpty
                            sx={{
                              fontSize: "12px",
                              height: 36,
                              color: "white",
                              border: "1px solid white",
                              backgroundColor: "transparent",
                              ".MuiOutlinedInput-notchedOutline": {
                                borderColor: "white",
                              },
                              "&:hover .MuiOutlinedInput-notchedOutline": {
                                borderColor: "white",
                              },
                              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                borderColor: "white",
                              },
                              "& svg": {
                                color: "white",
                              },
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: {
                                  maxHeight: 200,
                                  backgroundColor: "#fff",
                                },
                              },
                            }}
                          >
                            {Array.from({ length: reviewTotalPages }, (_, i) => (
                              <MenuItem key={i + 1} value={i + 1}>
                                Page {i + 1}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Typography fontSize="11px" color="white">
                          of {reviewTotalPages} page{reviewTotalPages > 1 ? "s" : ""}
                        </Typography>

                        <Button
                          onClick={() => setReviewCurrentPage((prev) => Math.min(prev + 1, reviewTotalPages))}
                          disabled={reviewCurrentPage === reviewTotalPages}
                          variant="outlined"
                          size="small"
                          sx={{
                            minWidth: 80,
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            "&:hover": {
                              borderColor: "white",
                              backgroundColor: "rgba(255,255,255,0.1)",
                            },
                            "&.Mui-disabled": {
                              color: "white",
                              borderColor: "white",
                              backgroundColor: "transparent",
                              opacity: 1,
                            },
                          }}
                        >
                          Next
                        </Button>
                        <Button
                          onClick={() => setReviewCurrentPage(reviewTotalPages)}
                          disabled={reviewCurrentPage === reviewTotalPages}
                          variant="outlined"
                          size="small"
                          sx={{
                            minWidth: 80,
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            "&:hover": {
                              borderColor: "white",
                              backgroundColor: "rgba(255,255,255,0.1)",
                            },
                            "&.Mui-disabled": {
                              color: "white",
                              borderColor: "white",
                              backgroundColor: "transparent",
                              opacity: 1,
                            },
                          }}
                        >
                          Last
                        </Button>
                      </Box>
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReviewDialog(false)}
            color="error"
            variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* -------------------------------------------------------------- */}
      {/* Delete confirmation — now uses the shared transaction dialog   */}
      {/* -------------------------------------------------------------- */}
      <TransactionConfirmDialog
        open={openDialogue}
        onClose={() => {
          setOpenDialogue(false);
          setSelectedScheduleId(null);
        }}
        onConfirm={async () => {
          if (selectedScheduleId) {
            await handleDelete(selectedScheduleId);
          }
        }}
        icon="🗑️"
        title="Confirm Deletion"
        confirmLabel="Yes, Delete"
        headerColor={headerColor}
      >
        <Typography>
          Are you sure you want to delete this schedule?
          <br />
          Deleted by: <strong>{localStorage.getItem("username") || user}</strong>
        </Typography>
      </TransactionConfirmDialog>

      {/* -------------------------------------------------------------- */}
      {/* Professor substitution update — shared transaction dialog     */}
      {/* -------------------------------------------------------------- */}
      <TransactionConfirmDialog
        open={openUpdateConfirmDialog}
        onClose={() => setOpenUpdateConfirmDialog(false)}
        onConfirm={executeUpdateSchedule}
        icon="🔄"
        title="Confirm Professor Change"
        confirmLabel="Yes, Update"
        headerColor={headerColor}
      >
        <Typography>
          Are you sure you want to change the professor of the selected schedule to{" "}
          <strong>{getProfessorNameById(selectedProf)}</strong>?
          <br />
          Updated by: <strong>{localStorage.getItem("username") || user}</strong>
        </Typography>
      </TransactionConfirmDialog>

      {/* -------------------------------------------------------------- */}
      {/* Pick professor from other department — content-heavy dialog,  */}
      {/* keeps its own layout, header recolored for consistency.       */}
      {/* -------------------------------------------------------------- */}
      <Dialog
        open={otherDepartmentDialogOpen}
        onClose={handleCloseOtherDepartmentDialog}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1,
            py: 2,
          }}
        >
          <PersonAddAltIcon fontSize="small" />
          Select Professor From Other Department
        </DialogTitle>

        <DialogContent sx={{ backgroundColor: "#f7f8fa", pb: 3 }}>
          <Box sx={{ display: "grid", gap: 2.5, pt: 3 }}>

            {/* ---------------------------------------------------------- */}
            {/* Step 1: Department & Professor selection                   */}
            {/* ---------------------------------------------------------- */}
            <Box
              sx={{
                p: 2.5,
                border: `1px solid ${borderColor}`,
                borderRadius: 2,
                backgroundColor: "white",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, mb: 2, color: subtitleColor, }}
              >
                Step 1 — Choose Department & Professor
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gap: 2,
                  gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Department
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={otherDepartmentId}
                      displayEmpty
                      onChange={(e) => setOtherDepartmentId(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Select Department</em>
                      </MenuItem>
                      {departmentOptions.map((department) => (
                        <MenuItem
                          key={department.dprtmnt_id}
                          value={String(department.dprtmnt_id)}
                        >
                          {department.dprtmnt_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Professor
                  </Typography>
                  <Autocomplete
                    options={otherDepartmentProfList}
                    value={otherDepartmentProfessor}
                    onChange={(_, value) => setOtherDepartmentProfessor(value)}
                    getOptionLabel={getProfessorLabel}
                    isOptionEqualToValue={(option, value) =>
                      String(option.prof_id) === String(value.prof_id)
                    }
                    disabled={!otherDepartmentId}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        placeholder={
                          otherDepartmentId
                            ? "Select professor"
                            : "Select a department first"
                        }
                      />
                    )}
                  />
                </Box>
              </Box>

              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, mt: 2 }}>
                Room For Plotting Preview
              </Typography>
              <Autocomplete
                options={roomList}
                fullWidth
                size="small"
                getOptionLabel={(option) => option?.room_description || ""}
                value={
                  roomList.find(
                    (room) => String(room.room_id) === String(selectedRoom),
                  ) || null
                }
                onChange={(_, newValue) => {
                  setSelectedRoom(newValue ? String(newValue.room_id) : "");
                }}
                isOptionEqualToValue={(option, value) =>
                  String(option.room_id) === String(value.room_id)
                }
                renderInput={(params) => (
                  <TextField {...params} size="small" placeholder="Select room" />
                )}
              />
            </Box>

            {/* ---------------------------------------------------------- */}
            {/* Current schedule summary                                   */}
            {/* ---------------------------------------------------------- */}
            <Box
              sx={{
                p: 2.5,
                border: `1px solid ${borderColor}`,
                borderRadius: 2,
                backgroundColor: "white",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, mb: 2, color: subtitleColor, }}
              >
                Current Schedule Details
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gap: 1.5,
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
                }}
              >
                {[
                  { label: "Day", value: selectedDay || "Not selected" },
                  { label: "Section", value: getSectionLabelById(selectedSection) },
                  {
                    label: "Course / Designation",
                    value: getCourseLabelById(selectedSubject),
                  },
                  {
                    label: "Time",
                    value: `${selectedStartTime || "--:--"} - ${selectedEndTime || "--:--"}`,
                  },
                  { label: "Room", value: getRoomLabelById(selectedRoom) },
                ].map((item) => (
                  <Box key={item.label}>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontWeight: 600, display: "block" }}
                    >
                      {item.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* ---------------------------------------------------------- */}
            {/* Schedule block previews                                    */}
            {/* ---------------------------------------------------------- */}
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
              }}
            >
              <Box
                sx={{
                  p: 2,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 2,
                  backgroundColor: "white",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, mb: 1.5, color: subtitleColor, }}
                >
                  Selected Room — Schedule Blocks
                </Typography>
                {renderScheduleBlocks(
                  filterPlottedScheduleByDepartmentAccess(
                    schedule.filter((entry) => !isDesignationEntry(entry)),
                  ),
                  "No plotted schedule for the selected room.",
                )}
              </Box>

              <Box
                sx={{
                  p: 2,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 2,
                  backgroundColor: "white",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, mb: 1.5, color: subtitleColor, }}
                >
                  Selected Professor — Schedule Blocks
                </Typography>
                {renderScheduleBlocks(
                  otherDepartmentProfessorSchedule.filter(
                    (entry) => !isDesignationEntry(entry),
                  ),
                  "No schedule found for the selected professor.",
                )}
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button onClick={handleCloseOtherDepartmentDialog} color="error" variant="outlined">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleApplyOtherDepartmentProfessor}
            sx={{ borderRadius: "8px", textTransform: "none" }}
          >
            Use This Professor
          </Button>
        </DialogActions>
      </Dialog>

      {/* -------------------------------------------------------------- */}
      {/* Honorarium confirmation — shared transaction dialog            */}
      {/* -------------------------------------------------------------- */}
      <TransactionConfirmDialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
        onConfirm={() => {
          setIsHonorarium(true);
          setIsServiceCredit(false);
          setIsTemporarySubstitution(false);
          setOpenConfirmDialog(false);
        }}
        icon="💰"
        title="Confirm Honorarium Load"
        headerColor={headerColor}
      >
        <Typography>
          Are you sure you want to assign this schedule as <strong>Honorarium Load</strong>?
          <br />
          Assigned by: <strong>{localStorage.getItem("username") || user}</strong>
        </Typography>
      </TransactionConfirmDialog>

      {/* -------------------------------------------------------------- */}
      {/* Service credit confirmation — shared transaction dialog        */}
      {/* -------------------------------------------------------------- */}
      <TransactionConfirmDialog
        open={openServiceCreditConfirmDialog}
        onClose={() => setOpenServiceCreditConfirmDialog(false)}
        onConfirm={() => {
          setIsHonorarium(false);
          setIsServiceCredit(true);
          setIsTemporarySubstitution(false);
          setOpenServiceCreditConfirmDialog(false);
        }}
        icon="📋"
        title="Confirm Service Credit"
        headerColor={headerColor}
      >
        <Typography>
          Are you sure you want to assign this schedule as <strong>Service Credit</strong>?
          <br />
          Assigned by: <strong>{localStorage.getItem("username") || user}</strong>
        </Typography>
      </TransactionConfirmDialog>
    </Box>
  );
};

export default CollegeScheduleChecker;
