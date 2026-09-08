import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  Typography,
  Box,
  Snackbar,
  Alert,
  FormControl,
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
  Chip,
  Divider,
  Tooltip,
} from "@mui/material";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import API_BASE_URL from "../apiConfig";
import {
  getScheduleTimeValidationError,
  validateScheduleTimeRange,
  SCHEDULE_TIME_INPUT_MIN,
  SCHEDULE_TIME_INPUT_MAX,
  SCHEDULE_TIME_INPUT_STEP,
} from "../utils/scheduleTimeValidation";
import { postAuditEvent } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import {
  checkProfessorWorkloadWarning,
  combineScheduleMessage,
} from "../utils/professorWorkloadWarning";
import { downloadClassProgramPdf } from "../utils/classProgramPrintLayout";
import EaristLogo from "../assets/EaristLogo.png";
import { FcPrint } from "react-icons/fc";

const isDesignationEntry = (entry) =>
  entry?.department_section_id == null ||
  entry?.department_section_id === "" ||
  Number(entry?.department_section_id) === 0;

// ---------------------------------------------------------------------------
// Shared transaction confirm dialog — same component used in
// CollegeScheduleChecker so both pages share one visual language for every
// yes/no confirmation (delete, honorarium, service credit, substitution).
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
      <Button color="error" variant="outlined" onClick={onClose}>
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
// Time-grid configuration — same generator used in CollegeScheduleChecker.
// Replaces the previous ~1,400 lines of hand-copied JSX (one block per hour,
// duplicated 14 times) with a single loop over HOUR_BLOCKS.
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

const ScheduleChecker = () => {
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
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

    if (assets.logoUrl) {
      setFetchedLogo(assets.logoUrl);
    } else {
      setFetchedLogo(EaristLogo);
    }

    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [adminData, setAdminData] = useState({ dprtmnt_id: "" });
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isGeneratingClassProgramPdf, setIsGeneratingClassProgramPdf] = useState(false);

  const pageId = 53;

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
  const [openServiceCreditConfirmDialog, setOpenServiceCreditConfirmDialog] = useState(false);
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
  const [professorSchedule, setProfessorSchedule] = useState([]);

  // Workload types, fetched straight from the DB (`workload_type` table) so
  // the legend is never hard-coded and always reflects what's configured.
  const [workloadTypeList, setWorkloadTypeList] = useState([]);

  const { dprtmnt_id } = useParams();

  const fetchWorkloadTypeList = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/workload`);
      setWorkloadTypeList(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.log(error);
      setWorkloadTypeList([]);
    }
  };

  const fetchRoom = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/room_list/${dprtmnt_id}`
      );
      setRoomList(response.data);
    } catch (error) {
      console.log(error);
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
    try {
      const res = await axios.get(`${API_BASE_URL}/api/professors`);
      setProfList(res.data);
    } catch (err) {
      console.error("Error fetching professors:", err);
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
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/section_table/${dprtmnt_id}`
      );

      setSectionList(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchProgramList = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/program_list/${dprtmnt_id}`
      );

      setProgramList(response.data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchSchedule = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/get/all_schedule/${selectedRoom}`
      );
      setSchedule(response.data);
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
      setReviewSchedules(response.data || []);
    } catch (error) {
      console.error("Error fetching professor review schedule:", error);
      setReviewSchedules([]);
    } finally {
      setReviewScheduleLoading(false);
    }
  };

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
    if (!dprtmnt_id) return;

    fetchRoom();
    fetchProfList();
    fetchSectionList();
    fetchProgramList();
  }, [dprtmnt_id]);

  useEffect(() => {
    fetchCourseList();
    fetchSchoolYearList();
    fetchDayList();
    fetchWorkloadTypeList();
  }, []);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/get_college_professor_schedule/${dprtmnt_id}`)
      .then((res) => setSchedules(res.data))
      .catch((err) => console.error(err));
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

  useEffect(() => {
    if (roomList.length > 0 && !selectedRoom) {
      setSelectedRoom(String(roomList[0].room_id));
    }
  }, [roomList]);

  useEffect(() => {
    if (selectedRoom) {
      fetchSchedule();
    }
  }, [selectedRoom]);

  useEffect(() => {
    fetchProfessorReviewSchedule(selectedReviewEmployeeId);
  }, [selectedReviewEmployeeId]);

  useEffect(() => {
    if (!isDesignationMode || !selectedProf) {
      setProfessorSchedule([]);
      return;
    }

    axios
      .get(`${API_BASE_URL}/api/professor-schedule/${selectedProf}`)
      .then((res) => setProfessorSchedule(res.data || []))
      .catch(() => setProfessorSchedule([]));
  }, [isDesignationMode, selectedProf]);

  useEffect(() => {
    if (schoolYearList.length > 0) {
      setSelectedSchoolYear(schoolYearList[0].id);
    }
  }, [schoolYearList]);

  // 🔒 Disable right-click and DevTools shortcuts. Moved into a mount-only
  // effect (with cleanup) instead of running on every render, which was
  // stacking a fresh set of document-level listeners on each re-render.
  useEffect(() => {
    const blockContextMenu = (e) => e.preventDefault();
    const blockDevToolsShortcuts = (e) => {
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

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockDevToolsShortcuts);

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockDevToolsShortcuts);
    };
  }, []);

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
    setMessage("");

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
          page_name: "Schedule Checker",
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
          page_name: "Schedule Checker",
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
          page_name: "Schedule Checker",
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

  const handleCheckConflictDesignation = async (e) => {
    e.preventDefault();
    setMessage("");

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
          page_name: "Schedule Checker",
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
        page_name: "Schedule Checker",
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

    return merged;
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
      if (programFilter !== "all" && sched.program_id !== programFilter) return false;
      if (roomFilter !== "all" && sched.room_id !== roomFilter) return false;
      if (selectedAcademicSchoolYear && sched.year_id !== selectedAcademicSchoolYear) return false;
      if (selectedAcademicSchoolSemester && sched.semester_id !== selectedAcademicSchoolSemester) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const fullName = `${sched.fname || ""} ${sched.mname?.[0] || ""} ${sched.lname || ""}`.toLowerCase();
        if (
          !(sched.employee_id?.toLowerCase().includes(term) || fullName.includes(term))
        ) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortOrder === "asc") {
        return (a.fname || "").localeCompare(b.fname || "");
      } else {
        return (b.fname || "").localeCompare(a.fname || "");
      }
    });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

    const normalized = course_code
      .toUpperCase()
      .replace(/[^A-Z]/g, "");

    if (normalized === "DESIGNATION") return "#99ccff";

    if (
      ["RESEARCH", "PRODUCTION", "EXTENSION", "ACCREDITATION",].includes(normalized)
    ) {
      return "#ccffcc";
    }

    if (normalized === "CONSULTATION") return "#fde5d6";

    if (normalized === "LESSONPREPARATION") return "#f7caac";

    return "";
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

    return "";
  };

  const hasAdjacentSchedule = (start, end, day, direction = "top", scheduleEntries = schedule) => {
    const parseTime = (timeStr) => new Date(`1970-01-01 ${timeStr}`);

    const slotStart = parseTime(start);
    const slotEnd = parseTime(end);

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
      return slotStart > schedStart ? "same" : "different";
    } else {
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
              <span className="block truncate text-[10px] mt-[2px]">{entry.course_code}</span>
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
          {showDeleteButton && (
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

    if (isDesignationMode) {
      return handleCheckConflictDesignation(e);
    } else {
      return handleSubmit(e);
    }
  };

  const handleDownloadClassSchedule = async () => {
    if (isGeneratingClassProgramPdf) return;

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

    setIsGeneratingClassProgramPdf(true);
    try {
      await downloadClassProgramPdf({
        apiBaseUrl: API_BASE_URL,
        sectionId: selectedSection,
        sectionMeta,
        companyName,
        campusAddress,
        logoUrl: fetchedLogo || EaristLogo,
        collegeName: "",
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
      setIsGeneratingClassProgramPdf(false);
    }
  };

  const handleInsertWrapper = (e) => {
    e.preventDefault();

    if (isDesignationMode) {
      return handleInsertDesignation(e);
    }
    if (editingScheduleId) {
      return handleUpdateSchedule(e);
    }
    return handleInsert(e);
  };

  // ---------------------------------------------------------------------
  // Grid renderer — same generator as CollegeScheduleChecker: a single
  // loop over HOUR_BLOCKS instead of ~1,400 lines of duplicated JSX.
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
            onClick={() => setOpenReviewDialog(true)}
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
                disabled={isGeneratingClassProgramPdf || isDesignationMode}
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
                {isGeneratingClassProgramPdf ? "Generating PDF..." : "Download Class Schedule"}
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

      {/* ---------------------------------------------------------------- */}
      {/* Main content: form + grid                                       */}
      {/* ---------------------------------------------------------------- */}
      <Box sx={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Box>
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
            <div className="flex mb-2">
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
                >
                  Check Schedule
                </button>
                <button
                  className="bg-[#1967d2] hover:bg-[#000000] text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  type="submit"
                  disabled={Boolean(editingScheduleId) && !hasValidUpdate()}
                >
                  {editingScheduleId ? "Update Schedule" : "Insert Schedule"}
                </button>
              </div>
            </div>
          </form>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: "0.6rem", flex: 1, minWidth: 300 }}>
          {/* -------------------------------------------------------------- */}
          {/* Legend — built from the workload_type table via /api/workload, */}
          {/* not hard-coded. "Regular Load" stays fixed since it's just the */}
          {/* default fallback color, not a workload_type row.              */}
          {/* -------------------------------------------------------------- */}
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

          <Box
            sx={{
              backgroundColor: "white",
              border: `1px solid ${borderColor}`,
              borderRadius: 2,
              p: 1,
              overflowX: "auto",
              boxShadow: "0px 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            {isDesignationMode
              ? renderScheduleGrid(getDesignationPlotSchedule(), true, "designation")
              : renderScheduleGrid(schedule.filter((entry) => !isDesignationEntry(entry)), true, "regular")}
          </Box>
        </Box>
      </Box>

      {/* -------------------------------------------------------------- */}
      {/* Review Schedule dialog                                        */}
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
          }}
        >
          Review Schedule
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Professor
            </Typography>
            <Autocomplete
              options={profList}
              fullWidth
              size="small"
              getOptionLabel={(option) =>
                `${option.employee_id || ""} - ${option.fname || ""} ${option.mname?.charAt(0) || ""}${option.mname ? "." : ""} ${option.lname || ""}`.trim()
              }
              value={
                profList.find(
                  (prof) => String(prof.employee_id) === String(selectedReviewEmployeeId)
                ) || null
              }
              onChange={(event, newValue) => {
                setSelectedReviewEmployeeId(newValue ? newValue.employee_id : "");
              }}
              isOptionEqualToValue={(option, value) =>
                String(option.employee_id) === String(value.employee_id)
              }
              renderInput={(params) => (
                <TextField {...params} size="small" />
              )}
            />
          </Box>

          {selectedReviewEmployeeId && reviewScheduleLoading ? (
            <Typography variant="body2" color="text.secondary">
              Loading professor schedule...
            </Typography>
          ) : selectedReviewEmployeeId ? (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                {reviewedProfessorSchedules.map((row, index) => (
                  <tr
                    key={`${row.employee_id}-${row.day}-${row.school_time_start}-${row.school_time_end}-${index}`}
                    style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "lightgray" }}
                  >
                    <td style={{ textAlign: "center", border: "solid black 1px", padding: "4px", fontSize: "0.85rem" }}>{index + 1}</td>
                    <td style={{ textAlign: "center", border: "solid black 1px", padding: "4px", fontSize: "0.85rem" }}>{row.employee_id}</td>
                    <td style={{ border: "solid black 1px", padding: "4px 8px", fontSize: "0.85rem" }}>
                      {row.fname} {row.mname?.charAt(0)}. {row.lname}
                    </td>
                    <td style={{ border: "solid black 1px", padding: "4px 8px", fontSize: "0.85rem" }}>{row.course_code}</td>
                    <td style={{ border: "solid black 1px", padding: "4px 8px", fontSize: "0.85rem" }}>
                      {row.program_code}-{row.section_description}
                    </td>
                    <td style={{ textAlign: "center", border: "solid black 1px", padding: "4px", fontSize: "0.85rem" }}>{row.day}</td>
                    <td style={{ textAlign: "center", border: "solid black 1px", padding: "4px", fontSize: "0.85rem" }}>{row.school_time_start}</td>
                    <td style={{ textAlign: "center", border: "solid black 1px", padding: "4px", fontSize: "0.85rem" }}>{row.school_time_end}</td>
                    <td style={{ textAlign: "center", border: "solid black 1px", padding: "4px", fontSize: "0.85rem" }}>{row.room_description}</td>
                    <td style={{ textAlign: "center", border: "solid black 1px", padding: "4px", fontSize: "0.85rem" }}>
                      {getScheduleTypeLabel(row)}
                    </td>
                    <td style={{ textAlign: "center", border: "solid black 1px", padding: "4px", fontSize: "0.85rem" }}>
                      {row.current_year}-{row.next_year}, {row.semester_description}
                    </td>
                  </tr>
                ))}
                {reviewedProfessorSchedules.length === 0 && (
                  <tr>
                    <td colSpan={11} style={{ textAlign: "center", border: "solid black 1px", padding: "8px", fontSize: "0.85rem" }}>
                      No schedule found for the selected professor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Select a professor to review schedule.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReviewDialog(false)} color="error" variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* -------------------------------------------------------------- */}
      {/* Delete confirmation                                            */}
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
      {/* Professor substitution update                                  */}
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
      {/* Honorarium confirmation                                        */}
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
      {/* Service credit confirmation                                    */}
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

export default ScheduleChecker;
