import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Box,
  Button,
  Typography,
  Paper,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  DialogActions,
  Table,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  TableContainer,
  TableCell,
  TableBody,
  TableHead,
  Snackbar,
  Alert,
  IconButton,
} from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import PeopleIcon from "@mui/icons-material/People";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import AdmissionProcessTabs from "../components/AdmissionProcessTabs";
import SearchIcon from "@mui/icons-material/Search";
import KeyIcon from "@mui/icons-material/Key";
import API_BASE_URL from "../apiConfig";
import { getAuditConfig, getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import { getLoginMacPayload } from "../utils/userMacAddress";
import {
  isRegistrarCurriculumMatch,
  refreshRegistrarCurriculumId,
  restrictToRegistrarCurriculum,
  syncRegistrarScopeFromAdminData,
} from "../utils/registrarCurriculumRestriction";
import useRegistrarScopeRevision from "../hooks/useRegistrarScopeRevision";
import CampaignIcon from "@mui/icons-material/Campaign";
import { Toc } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close"; // or use the custom SVG below

const cleanApplicantValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const formatApplicantSuggestionName = (applicant) =>
  [
    cleanApplicantValue(applicant?.last_name),
    cleanApplicantValue(applicant?.first_name),
    cleanApplicantValue(applicant?.middle_name),
    cleanApplicantValue(applicant?.extension),
  ]
    .filter(Boolean)
    .join(" ");

const getApplicantSuggestionText = (applicant) =>
  [
    applicant?.applicant_number,
    applicant?.first_name,
    applicant?.middle_name,
    applicant?.last_name,
    applicant?.extension,
    applicant?.emailAddress,
  ]
    .map(cleanApplicantValue)
    .join(" ")
    .toLowerCase();

const getApplicantSuggestionValue = (applicant) =>
  cleanApplicantValue(applicant?.applicant_number) ||
  formatApplicantSuggestionName(applicant) ||
  cleanApplicantValue(applicant?.emailAddress);

const VerifyDocumentScheduleManagement = () => {
  useAuditMac();
  const socket = useRef(null);

  const settings = useContext(SettingsContext);

  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#000000";
  const headerColor = colors.header || "#1976d2";
  const shortTerm = branding.shortTerm || "";
  const branches = settings?.branches || [];

  useEffect(() => {
    socket.current = io(API_BASE_URL, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const loggedInPersonId = localStorage.getItem("person_id");

    if (!storedUser || !storedRole || !loggedInPersonId) {
      window.location.href = "/login";
      return;
    }

    setUser(storedUser);
    setUserRole(storedRole);

    const allowedRoles = ["registrar", "applicant", "superadmin"];
    if (!allowedRoles.includes(storedRole)) {
      window.location.href = "/login";
      return;
    }

    // Do not auto-load/search an applicant on this screen
    setUserID("");
  }, []);

  const [applicants, setApplicants] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [selectedApplicants, setSelectedApplicants] = useState(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [persons, setPersons] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loading2, setLoading2] = useState(false);
  const [person, setPerson] = useState({
    campus: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    document_status: "",
    extension: "",
    emailAddress: "",
    program: "",
    created_at: "",
  });
  const [selectedApplicantStatus, setSelectedApplicantStatus] = useState("");
  const [curriculumOptions, setCurriculumOptions] = useState([]);
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [adminData, setAdminData] = useState({
    dprtmnt_id: "",
    dprtmnt_ids: [],
  });

  const pageId = 118;

  const [employeeID, setEmployeeID] = useState("");
  const scopeRevision = useRegistrarScopeRevision();
  const [allCurriculums, setAllCurriculums] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [semesters, setSchoolSemester] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedSchoolSemester, setSelectedSchoolSemester] = useState("");
  const [selectedActiveSchoolYear, setSelectedActiveSchoolYear] = useState("");

  const withAuditActor = (payload = {}) => ({
    ...payload,
    audit_actor_id:
      employeeID ||
      localStorage.getItem("employee_id") ||
      localStorage.getItem("email") ||
      "unknown",
    audit_actor_role: userRole || localStorage.getItem("role") || "registrar",
    ...getLoginMacPayload(),
  });

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
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
      if (error.response && error.response.data.message) {
        console.log(error.response.data.message);
      } else {
        console.log("An unexpected error occurred.");
      }
      try {
        await sendEmail();

        await axios.post("/mark-verify-email-sent", {
          applicant_number,
        });

        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    }
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

  useEffect(() => {
    if (user) fetchPersonData();
  }, [user]);

  useEffect(() => {
    if (userRole !== "registrar" || !employeeID) return;
    refreshRegistrarCurriculumId(employeeID).catch((err) => {
      console.error("Error refreshing registrar scope:", err);
    });
  }, [userRole, employeeID]);

  useEffect(() => {
    const departmentIds =
      Array.isArray(adminData.dprtmnt_ids) && adminData.dprtmnt_ids.length
        ? adminData.dprtmnt_ids
        : adminData.dprtmnt_id
          ? [adminData.dprtmnt_id]
          : [];

    if (!departmentIds.length) return;

    const fetchCurriculums = async () => {
      try {
        const responses = await Promise.all(
          departmentIds.map((departmentId) =>
            axios.get(`${API_BASE_URL}/api/applied_program/${departmentId}`),
          ),
        );

        const merged = responses.flatMap((response) => response.data || []);
        const restricted = dedupeByProgramCode(
          restrictToRegistrarCurriculum(merged),
        );
        setCurriculumOptions(restricted);
        setAllCurriculums(restricted);
      } catch (error) {
        console.error("Error fetching curriculum options:", error);
      }
    };

    fetchCurriculums();
  }, [adminData.dprtmnt_id, adminData.dprtmnt_ids, scopeRevision]);

  const dedupeByProgramCode = (list) => {
    const seen = new Map();
    for (const item of list) {
      if (!seen.has(item.program_code)) {
        seen.set(item.program_code, item);
      }
    }
    return [...seen.values()];
  };

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/get_school_year/`)
      .then((res) => setSchoolYears(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/get_school_semester/`)
      .then((res) => setSchoolSemester(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/active_school_year`)
      .then((res) => {
        if (res.data.length > 0) {
          setSelectedSchoolYear(res.data[0].year_id);
          setSelectedSchoolSemester(res.data[0].semester_id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSchoolYearChange = (event) => {
    setSelectedSchoolYear(event.target.value);
  };

  const handleSchoolSemesterChange = (event) => {
    setSelectedSchoolSemester(event.target.value);
  };

  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const handleCloseSnack = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  const getSelectedScheduleData = () =>
    schedules.find((s) => Number(s.schedule_id) === Number(selectedSchedule));

  const handleScheduleChange = (scheduleId) => {
    setSelectedSchedule(scheduleId);

    const schedule = schedules.find(
      (s) => Number(s.schedule_id) === Number(scheduleId),
    );
    const branchId = schedule?.branch ? String(schedule.branch) : "";

    setSelectedCampusFilter(branchId);
    setSelectedDepartmentFilter("");
    setSelectedProgramFilter("");
    setCurrentPage(1);
  };

  // ✅ Always use the verify schedules source with occupancy counts
  const fetchSchedulesWithCount = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/verify_document_schedules_with_count`,
      );
      setSchedules(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching verify schedules with count:", err);
    }
  };

  // ⬇️ Initial load
  useEffect(() => {
    fetchSchedulesWithCount();
    fetchAllApplicants();
  }, []);

  // ⬇️ Socket update refreshes the "with_count" one
  useEffect(() => {
    if (!socket.current) return;

    const handler = ({ schedule_id }) => {
      console.log("📢 Schedule updated:", schedule_id);
      fetchSchedulesWithCount();
      fetchAllApplicants();
    };

    socket.current.on("schedule_updated", handler);

    return () => {
      socket.current?.off("schedule_updated", handler);
    };
  }, []);

  // ⬇️ Add this inside ApplicantList component, before useEffect
  const fetchAllApplicants = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/verified-for-verify-schedule`,
      );
      setPersons(res.data);
    } catch (err) {
      console.error("Error fetching verified ECAT applicants:", err);
    }
  };

  const [admissionContact, setAdmissionContact] = useState(null);

  const formatContactTime = (time) => {
    if (!time) return "";
    const d = new Date(`1970-01-01T${time}`);
    if (isNaN(d.getTime())) return time;
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // ================= FUNCTIONS =================
  const [customCount, setCustomCount] = useState(0);

  const [requirements, setRequirements] = useState([]);

  const fetchRequirements = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/requirements`);
      setRequirements(res.data);
      return res.data; // 👈 useful for email building
    } catch (err) {
      console.error("Failed to fetch requirements:", err);
      return [];
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  const filterRequirementsForApplicant = (applicant, list = requirements) => {
    if (!Array.isArray(list)) return [];

    const applyingAs = String(applicant?.applyingAs ?? "");

    return list.filter((req) => {
      const applicantType = String(req.applicant_type ?? 0);
      return (
        applicantType === applyingAs ||
        applicantType === "0" ||
        applicantType.toLowerCase() === "all"
      );
    });
  };

  const handleAssignSingle = (applicantNumber) => {
    if (!selectedSchedule) {
      setSnack({
        open: true,
        message: "Please select a schedule first.",
        severity: "warning",
      });
      return;
    }

    if (!socket?.current) {
      setSnack({
        open: true,
        message: "Socket not connected yet. Try again.",
        severity: "error",
      });
      return;
    }

    socket.current.emit("update_verify_schedule", {
      ...withAuditActor({
        schedule_id: selectedSchedule,
        applicant_numbers: [applicantNumber],
      }),
    });

    socket.current.once("update_verify_schedule_result", (res) => {
      if (res.success) {
        setPersons((prev) =>
          prev.map((p) =>
            p.applicant_number === applicantNumber
              ? { ...p, schedule_id: selectedSchedule }
              : p,
          ),
        );

        setSnack({
          open: true,
          message: `Applicant ${applicantNumber} assigned successfully.`,
          severity: "success",
        });
        fetchAllApplicants();
        fetchSchedulesWithCount();
      } else {
        setSnack({
          open: true,
          message: res.error || "Failed to assign applicant.",
          severity: "error",
        });
      }
    });
  };

  const handleAssign40 = () => {
    if (!selectedSchedule) {
      setSnack({
        open: true,
        message: "Please select a schedule first.",
        severity: "warning",
      });
      return;
    }

    const schedule = getSelectedScheduleData();
    if (!schedule) {
      setSnack({
        open: true,
        message: "Selected schedule not found.",
        severity: "error",
      });
      return;
    }

    const currentCount = schedule.current_occupancy || 0;
    const maxSlots = schedule.room_quota || 40;
    const availableSlots = maxSlots - currentCount;

    if (availableSlots <= 0) {
      setSnack({
        open: true,
        message: "This schedule is already full.",
        severity: "error",
      });
      return;
    }

    const unassigned = sortedPersons
      .filter((p) => p.schedule_id == null)
      .slice(0, availableSlots)
      .map((p) => p.applicant_number);

    if (!unassigned.length) {
      setSnack({
        open: true,
        message: "No unassigned applicants.",
        severity: "warning",
      });
      return;
    }

    socket.current.emit("update_verify_schedule", {
      ...withAuditActor({
        schedule_id: selectedSchedule,
        applicant_numbers: unassigned,
      }),
    });

    socket.current.once("update_verify_schedule_result", async (res) => {
      if (res.success) {
        setSnack({
          open: true,
          message: "Applicants assigned successfully.",
          severity: "success",
        });
        await fetchAllApplicants();
        await fetchSchedulesWithCount();
      } else {
        setSnack({ open: true, message: res.error, severity: "error" });
      }
    });
  };

  const handleUnassignImmediate = async (applicantNumber) => {
    try {
      await axios.post(`${API_BASE_URL}/api/unassign_verify`, {
        ...withAuditActor({
          applicant_number: applicantNumber,
        }),
      });

      await fetchAllApplicants();
      await fetchSchedulesWithCount();

      setSnack({
        open: true,
        message: `Applicant ${applicantNumber} unassigned successfully.`,
        severity: "success",
      });
    } catch (err) {
      setSnack({
        open: true,
        message: err.response?.data?.error || "Failed to unassign applicant.",
        severity: "error",
      });
    }
  };

  // handleAssignCustom
  const handleAssignCustom = () => {
    if (!selectedSchedule) {
      setSnack({
        open: true,
        message: "Please select a schedule first.",
        severity: "warning",
      });
      return;
    }
    if (customCount <= 0) {
      setSnack({
        open: true,
        message: "Please enter a valid number of applicants.",
        severity: "warning",
      });
      return;
    }

    const schedule = getSelectedScheduleData();
    if (!schedule) {
      setSnack({
        open: true,
        message: "Selected schedule not found.",
        severity: "error",
      });
      return;
    }

    const currentCount = schedule.current_occupancy || 0;
    const maxSlots = schedule.room_quota || 40; // <-- ✅ use DB quota, fallback 40
    const availableSlots = maxSlots - currentCount;

    if (availableSlots <= 0) {
      setSnack({
        open: true,
        message: `This schedule is already full (${maxSlots} applicants).`,
        severity: "error",
      });
      return;
    }

    const assignCount = Math.min(customCount, availableSlots);

    const unassigned = currentPersons
      .filter((a) => a.schedule_id == null)
      .slice(0, assignCount)
      .map((a) => a.applicant_number);

    if (unassigned.length === 0) {
      setSnack({
        open: true,
        message: "No unassigned applicants available.",
        severity: "warning",
      });
      return;
    }

    socket.current.emit(
      "update_verify_schedule",
      withAuditActor({
        schedule_id: selectedSchedule,
        applicant_numbers: unassigned,
      }),
    );

    socket.current.once("update_verify_schedule_result", (res) => {
      if (res.success) {
        setSnack({
          open: true,
          message: `Assigned: ${res.assigned?.length || 0}, Updated: ${res.updated?.length || 0}, Skipped: ${res.skipped?.length || 0}`,
          severity: "success",
        });
        fetchAllApplicants();
        fetchSchedulesWithCount();
        setSchedules((prev) =>
          prev.map((s) =>
            Number(s.schedule_id) === Number(selectedSchedule)
              ? {
                  ...s,
                  current_occupancy: currentCount + (res.assigned?.length || 0),
                }
              : s,
          ),
        );
      } else {
        setSnack({
          open: true,
          message: res.error || "Failed to assign applicants.",
          severity: "error",
        });
      }
    });
  };

  const handleUnassignAll = async () => {
    if (!selectedSchedule) {
      setSnack({
        open: true,
        message: "Please select a schedule first.",
        severity: "warning",
      });
      return;
    }

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/unassign_all_from_verify`,
        withAuditActor({ schedule_id: selectedSchedule }),
      );

      setSnack({ open: true, message: res.data.message, severity: "success" });

      await fetchAllApplicants();
      await fetchSchedulesWithCount();
    } catch (err) {
      setSnack({
        open: true,
        message:
          err.response?.data?.error || "Failed to unassign all applicants.",
        severity: "error",
      });
    }
  };

  const [emailSubject, setEmailSubject] = useState(
    "Document Verification Schedule",
  );

  // Editable only
  const [officeDays, setOfficeDays] = useState("");
  const [officeTime, setOfficeTime] = useState("");

  const [importantReminders, setImportantReminders] = useState(
    `Bring the original copies of:
• Good Moral Certificate
• Form 138 (Senior High School Report Card)
• PSA Birth Certificate
• Printed Online Admission Form/Personal Data Form with Applicant Number
• For previous graduates or gap year applicants, present a School Certification confirming that your Form 137 has not been forwarded to any other school or university (Original and Xerox Copy).

If you are a graduating SHS student with incomplete final grades, bring:
• PSA Birth Certificate (Original)
• Original Copy of 1st Semester Grades
• 1st, 2nd & 3rd Grading Grades (Certified True Copy and sealed by the school)
• Good Moral Certificate (Sealed by the school)

Please also bring:
• One (1) black ballpen
• One (1) sharpened pencils
`,
  );

  const [finalEmailMessage, setFinalEmailMessage] = useState("");

  const buildRequirementsText = (applicant, list = requirements) => {
    const filteredRequirements = filterRequirementsForApplicant(
      applicant,
      list,
    );

    if (!filteredRequirements || filteredRequirements.length === 0) {
      return "• No requirements listed at this time.";
    }

    // Group by category (Regular, Medical, etc.)
    const grouped = filteredRequirements.reduce((acc, req) => {
      const category = req.category || "Other";

      if (!acc[category]) {
        acc[category] = [];
      }

      acc[category].push(req);
      return acc;
    }, {});

    let text = "";

    Object.entries(grouped).forEach(([category, items]) => {
      text += `\n${category} Requirements:\n`;

      items.forEach((req) => {
        text += `• ${req.description}`;

        // show optional label
        if (Number(req.is_optional) === 1) {
          text += " (Optional)";
        }

        text += "\n";
      });
    });

    return text.trim();
  };

  const officeName = `${shortTerm} - Admission Office`;

  // FIX
  useEffect(() => {
    if (!confirmOpen) return;

    // rebuild preview automatically when office days/time/reminders change
    setFinalEmailMessage((prev) => {
      return prev
        .replace(
          /🕘 Office Hours for Admission Evaluation:\n[\s\S]*?(?=\n⚠️ Important Reminders:)/,
          `🕘 Office Hours for Admission Evaluation:\n${officeDays}\n${officeTime}\n`,
        )
        .replace(
          /⚠️ Important Reminders:\n[\s\S]*?(?=\nThank you and good luck!)/,
          `⚠️ Important Reminders:\n${importantReminders}\n`,
        );
    });
  }, [officeDays, officeTime, importantReminders, confirmOpen]);

  const handleSendEmails = (person) => {
    if (!selectedSchedule) {
      setSnack({
        open: true,
        message: "Please select a schedule first.",
        severity: "warning",
      });
      return;
    }

    const sched = getSelectedScheduleData();
    if (!sched) {
      setSnack({
        open: true,
        message: "Schedule not found.",
        severity: "error",
      });
      return;
    }

    const reqText = buildRequirementsText(person, requirements);

    const formatTime = (timeStr) => {
      if (!timeStr) return "";
      const [h, m] = timeStr.split(":");
      let hour = parseInt(h, 10);
      const ampm = hour >= 12 ? "PM" : "AM";
      hour = hour % 12 || 12;
      return `${hour}:${m} ${ampm}`;
    };

    const formatDateLong = (dateStr) => {
      if (!dateStr) return "To be announced";
      const date = new Date(dateStr);
      if (isNaN(date)) return "To be announced";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    const fixedMessage = `Hello, ${person.first_name} ${
      person.middle_name ? person.middle_name.charAt(0) + "." : ""
    } ${person.last_name},

You have been scheduled for Document Verification with the following details:

📅 Evaluation Date: ${formatDateLong(sched.schedule_date)}
🏫 Room: ${sched.room_description}
🕒 Scheduled Time: ${formatTime(sched.start_time)} - ${formatTime(sched.end_time)}
🆔 Applicant No: ${person.applicant_number}

🖨️ Please print the following forms:
• Personal Data Form (with Applicant Number)

📄 REQUIRED DOCUMENTS:
${reqText}

🕘 Office Hours for Admission Evaluation:
${officeDays}
${officeTime}

\n\n⚠️ Important Reminders:
${importantReminders}

Thank you and good luck!

${officeName}`;

    setFinalEmailMessage(fixedMessage);
    setConfirmOpen(true);
  };

  const confirmSendEmails = async () => {
    setConfirmOpen(false);
    setLoading2(true);

    if (!selectedSchedule) {
      setSnack({
        open: true,
        message: "Please select a schedule first.",
        severity: "warning",
      });
      setLoading2(false);
      return;
    }

    const assignedApplicants = persons
      .filter((p) => Number(p.schedule_id) === Number(selectedSchedule))
      .map((p) => p.applicant_number);

    if (assignedApplicants.length === 0) {
      setSnack({
        open: true,
        message: "No applicants assigned to this schedule.",
        severity: "warning",
      });
      setLoading2(false);
      return;
    }

    console.log("Assigned Applicants: ", assignedApplicants);

    // SEND EMAIL (socket)
    socket.current.emit(
      "send_verify_schedule_emails",
      withAuditActor({
        schedule_id: selectedSchedule,
        applicant_numbers: assignedApplicants,
        user_person_id: localStorage.getItem("person_id"),

        subject: emailSubject,
        message: finalEmailMessage,
      }),
    );

    socket.current.once("send_verify_schedule_emails_result", async (res) => {
      if (res.success) {
        try {
          // ✅ MARK ALL AS SENT
          setSnack({
            open: true,
            message: "Schedule sent and marked successfully!",
            severity: "success",
          });

          fetchAllApplicants();
        } catch (err) {
          console.error("Mark sent error:", err);

          setSnack({
            open: true,
            message: "Email sent but failed to update status.",
            severity: "warning",
          });
        }
      } else {
        setSnack({
          open: true,
          message: res.error || "Failed to send schedule in emails.",
          severity: "error",
        });
      }

      setLoading2(false);
    });
  };

  const [schedules, setSchedules] = useState([]);

  const handleRowClick = (applicant) => {
    const personId = applicant?.person_id;
    if (!personId) return;

    const searchValue =
      applicant?.applicant_number ||
      `${applicant?.last_name ?? ""}, ${applicant?.first_name ?? ""}`.trim();

    sessionStorage.setItem("admin_edit_person_id", String(personId));
    sessionStorage.setItem("edit_person_id", String(personId));
    sessionStorage.setItem("admin_edit_person_id_source", "applicant_list");
    sessionStorage.setItem("admin_edit_person_id_ts", String(Date.now()));

    // ✅ Always pass person_id in the URL
    sessionStorage.setItem("admin_edit_person_data", JSON.stringify(applicant));

    if (searchValue) {
      sessionStorage.setItem("admin_edit_search_query", String(searchValue));
      sessionStorage.setItem("edit_applicant_number", String(searchValue));
    }

    navigate(`//admission_personal_information?person_id=${personId}`);
  };

  const [itemsPerPage, setItemsPerPage] = useState(100);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
  const [selectedProgramFilter, setSelectedProgramFilter] = useState("");
  const [department, setDepartment] = useState([]);

  const [selectedCampusFilter, setSelectedCampusFilter] = useState("");
  const filteredDepartments = department.filter((dep) =>
    allCurriculums.some(
      (curriculum) =>
        String(curriculum.dprtmnt_id) === String(dep.dprtmnt_id) &&
        (!selectedCampusFilter ||
          String(curriculum.components) === String(selectedCampusFilter)),
    ),
  );

  const filteredCurriculumOptions = allCurriculums.filter(
    (curriculum) =>
      (!selectedCampusFilter ||
        String(curriculum.components) === String(selectedCampusFilter)) &&
      (!selectedDepartmentFilter ||
        String(curriculum.dprtmnt_id) === String(selectedDepartmentFilter)),
  );

  const handleCampusFilterChange = (branchId) => {
    setSelectedCampusFilter(branchId);
    setSelectedSchedule("");
    setSelectedDepartmentFilter("");
    setSelectedProgramFilter("");
    setCurrentPage(1);
  };

  const handleDepartmentChange = (departmentId) => {
    setSelectedDepartmentFilter(departmentId);
    setSelectedProgramFilter("");
    setCurrentPage(1);
  };

  const handleProgramFilterChange = (curriculumId) => {
    setSelectedProgramFilter(curriculumId);
    setCurrentPage(1);
  };

  useEffect(() => {
    const branchId = selectedCampusFilter || "1";
    const fetchAdmissionContact = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/admission_contact/active`,
          {
            params: { branch_id: branchId },
          },
        );
        const contact = res.data || null;
        setAdmissionContact(contact);

        if (contact) {
          setOfficeDays(
            `${contact.office_days_start} – ${contact.office_days_end}`,
          );
          setOfficeTime(
            `${formatContactTime(contact.office_time_start)} – ${formatContactTime(contact.office_time_end)}`,
          );
        } else {
          setOfficeDays("Not set in Admission Contact Management");
          setOfficeTime("Not set in Admission Contact Management");
        }
      } catch (err) {
        console.error("Error fetching admission contact:", err);
        setOfficeDays("Unable to load office days");
        setOfficeTime("Unable to load office time");
      }
    };
    fetchAdmissionContact();
  }, [selectedCampusFilter]);

  // ✅ Step 1: Filtering
  const normalize = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase();
  const selectedSemester = semesters.find(
    (sem) => String(sem.semester_id) === String(selectedSchoolSemester),
  );

  const filteredPersons = persons.filter((personData) => {
    const emailNotSent = Number(personData.email_sent ?? 0) !== 1;
    const query = searchQuery.toLowerCase();
    const fullName =
      `${personData.first_name ?? ""} ${personData.middle_name ?? ""} ${personData.last_name ?? ""}`.toLowerCase();

    /* 🏫 CAMPUS */
    const personCampus = String(personData.campus ?? "").trim();
    const selectedCampusId = String(selectedCampusFilter ?? "").trim();

    const matchesCampus =
      selectedCampusFilter === "" || personCampus === selectedCampusId;

    const matchesApplicantID = personData.applicant_number
      ?.toString()
      .toLowerCase()
      .includes(query);
    const matchesName = fullName.includes(query);
    const matchesEmail = personData.emailAddress?.toLowerCase().includes(query); // ✅ included

    const programInfo = allCurriculums.find(
      (opt) => opt.curriculum_id?.toString() === personData.program?.toString(),
    );
    const matchesRegistrarCurriculum = isRegistrarCurriculumMatch(
      personData.program,
      allCurriculums,
    );
    const matchesProgramQuery = programInfo?.program_code
      ?.toLowerCase()
      .includes(query);

    const matchesDepartment =
      selectedDepartmentFilter === "" ||
      String(programInfo?.dprtmnt_id) === String(selectedDepartmentFilter);

    const matchesProgramFilter =
      selectedProgramFilter === "" ||
      String(personData.program) === String(selectedProgramFilter);

    const applicantAppliedYear = new Date(personData.created_at).getFullYear();
    const schoolYear = schoolYears.find(
      (sy) => sy.year_id === selectedSchoolYear,
    );

    const matchesSchoolYear =
      selectedSchoolYear === "" ||
      (schoolYear &&
        String(applicantAppliedYear) === String(schoolYear.current_year));

    const matchesSemester =
      selectedSchoolSemester === "" ||
      normalize(personData.middle_code) ===
        normalize(selectedSemester?.semester_code);

    return (
      emailNotSent &&
      (matchesApplicantID ||
        matchesName ||
        matchesEmail ||
        matchesProgramQuery) &&
      matchesDepartment &&
      matchesProgramFilter &&
      matchesRegistrarCurriculum &&
      matchesSchoolYear &&
      matchesSemester &&
      matchesCampus
    );
  });

  const sortedPersons = [...filteredPersons].sort((a, b) => {
    let valueA, valueB;

    switch (sortBy) {
      case "name":
        valueA = `${a.last_name} ${a.first_name}`.toLowerCase();
        valueB = `${b.last_name} ${b.first_name}`.toLowerCase();
        break;

      case "id":
        valueA = a.applicant_number?.toString() || "";
        valueB = b.applicant_number?.toString() || "";
        break;

      case "email":
        valueA = a.emailAddress?.toLowerCase() || "";
        valueB = b.emailAddress?.toLowerCase() || "";
        break;

      default:
        valueA = a.created_at;
        valueB = b.created_at;
        break;
    }

    if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
    if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // ✅ Step 3: Pagination (use sortedPersons instead of filteredPersons)
  const totalPages = Math.ceil(sortedPersons.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPersons = sortedPersons.slice(indexOfFirstItem, indexOfLastItem);
  const applicantSuggestions =
    searchQuery.trim().length >= 2
      ? persons
          .filter((applicant) =>
            getApplicantSuggestionText(applicant).includes(
              searchQuery.trim().toLowerCase(),
            ),
          )
          .slice(0, 10)
      : [];

  useEffect(() => {
    const departmentIds =
      Array.isArray(adminData.dprtmnt_ids) && adminData.dprtmnt_ids.length
        ? adminData.dprtmnt_ids
        : adminData.dprtmnt_id
          ? [adminData.dprtmnt_id]
          : [];

    if (!departmentIds.length) return;

    const fetchDepartments = async () => {
      try {
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
        setDepartment(uniqueDepartments);
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };

    fetchDepartments();
  }, [adminData.dprtmnt_id, adminData.dprtmnt_ids, scopeRevision]);

  useEffect(() => {
    if (!department.length) return;

    if (department.length === 1) {
      const onlyDeptId = String(department[0].dprtmnt_id);
      if (String(selectedDepartmentFilter) !== onlyDeptId) {
        handleDepartmentChange(onlyDeptId);
      }
    } else if (
      selectedDepartmentFilter &&
      !department.some(
        (dep) => String(dep.dprtmnt_id) === String(selectedDepartmentFilter),
      )
    ) {
      handleDepartmentChange("");
    }
  }, [department]);

  const maxButtonsToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtonsToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxButtonsToShow - 1);

  if (endPage - startPage < maxButtonsToShow - 1) {
    startPage = Math.max(1, endPage - maxButtonsToShow + 1);
  }

  const visiblePages = [];
  for (let i = startPage; i <= endPage; i++) {
    visiblePages.push(i);
  }

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [filteredPersons.length, totalPages]);

  const getBranchLabel = (branchId) => {
    const branch = branches.find(
      (item) => String(item.id) === String(branchId),
    );
    return branch?.branch || branchId || "N/A";
  };

  // Put this at the very bottom before the return
  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }

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
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: "36px",
          }}
        >
          VERIFY DOCUMENT SCHEDULE MANAGEMENT
        </Typography>

        <Box sx={{ position: "relative", width: 450, maxWidth: "100%" }}>
          <TextField
            variant="outlined"
            placeholder="Search Applicant Name / Email / Applicant ID"
            size="small"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
              setSuggestionsOpen(true);
            }}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) setSuggestionsOpen(true);
            }}
            onBlur={() => {
              setTimeout(() => setSuggestionsOpen(false), 150);
            }}
            sx={{
              width: "100%",
              backgroundColor: "#fff",
              borderRadius: 1,
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
              },
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: "gray" }} />,
            }}
          />
          {suggestionsOpen && searchQuery.trim().length >= 2 && (
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
              {applicantSuggestions.length > 0 ? (
                applicantSuggestions.map((applicant) => {
                  const applicantNumber = cleanApplicantValue(
                    applicant?.applicant_number,
                  );
                  const name = formatApplicantSuggestionName(applicant);
                  return (
                    <Box
                      key={`${applicantNumber || applicant?.person_id}-${name}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchQuery(getApplicantSuggestionValue(applicant));
                        setCurrentPage(1);
                        setSuggestionsOpen(false);
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
                        {applicantNumber || "N/A"}
                      </Typography>
                      <Typography sx={{ fontSize: 14, color: "#555" }}>
                        |
                      </Typography>
                      <Typography sx={{ fontSize: 14 }} noWrap>
                        {name ||
                          cleanApplicantValue(applicant?.emailAddress) ||
                          "Unnamed Applicant"}
                      </Typography>
                    </Box>
                  );
                })
              ) : (
                <Box sx={{ px: 2, py: 1.25, fontSize: 13, color: "#666" }}>
                  No matching applicants found
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />

      <br />
      <br />

      <AdmissionProcessTabs />

      <br />
      <br />

      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}` }}
      >
        <Table>
          <TableHead
            sx={{ backgroundColor: headerColor }}
          >
            <TableRow>
              <TableCell sx={{ color: "white", textAlign: "Center" }}>
                Verify Schedule Management
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>
      <Paper
        sx={{
          width: "100%",

          p: 3,

          border: `1px solid ${borderColor}`,
          bgcolor: "white",
          boxShadow: "0 3px 12px rgba(0,0,0,0.1)",
        }}
      >
        <Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {/* Select Schedule */}
            <Grid item xs={12} md={3}>
              <Typography
                textAlign="left"
                color="maroon"
                sx={{ mb: 1, fontWeight: "bold" }}
              >
                Select Schedule:
              </Typography>
              <TextField
                select
                fullWidth
                value={selectedSchedule}
                onChange={(e) => handleScheduleChange(e.target.value)}
                variant="outlined"
                sx={{
                  border: `1px solid ${borderColor}`,
                  borderRadius: 2,
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                  bgcolor: "white",
                }}
              >
                <MenuItem value="">-- Select Schedule --</MenuItem>

                {Array.isArray(schedules) &&
                  schedules

                    // Filter schedules by selected campus/branch
                    .filter(
                      (s) =>
                        !selectedCampusFilter ||
                        String(s.branch) === String(selectedCampusFilter),
                    )

                    // ✅ REMOVE FULL ROOMS HERE
                    .filter((s) => {
                      const occupied = Number(
                        s.current_occupancy ?? s.assigned_count ?? 0,
                      );
                      const quota = Number(s.room_quota ?? 0);
                      return occupied < quota;
                    })
                    .sort((a, b) => {
                      const dateA = new Date(a.created_at || 0);
                      const dateB = new Date(b.created_at || 0);
                      return dateB - dateA;
                    })

                    .map((s) => (
                      <MenuItem key={s.schedule_id} value={s.schedule_id}>
                        {getBranchLabel(s.branch)} : {s.evaluator} -{" "}
                        {s.schedule_date} | {s.building_description} |{" "}
                        {s.room_description} |{" "}
                        {new Date(
                          `1970-01-01T${s.start_time}`,
                        ).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}{" "}
                        -{" "}
                        {new Date(
                          `1970-01-01T${s.end_time}`,
                        ).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </MenuItem>
                    ))}
              </TextField>
            </Grid>

            {/* Proctor */}
            <Grid item xs={12} md={3}>
              <Typography
                textAlign="left"
                color="maroon"
                sx={{ mb: 1, fontWeight: "bold" }}
              >
                Evaluator:
              </Typography>
              <TextField
                fullWidth
                value={
                  selectedSchedule
                    ? getSelectedScheduleData()?.evaluator || "Not assigned"
                    : ""
                }
                InputProps={{ readOnly: true }}
                variant="outlined"
                sx={{
                  border: `1px solid ${borderColor}`,
                  borderRadius: 2,
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                  bgcolor: "#f9f9f9",
                }}
              />
            </Grid>

            {/* Room Quota */}
            <Grid item xs={12} md={3}>
              <Typography
                textAlign="left"
                color="maroon"
                sx={{ mb: 1, fontWeight: "bold" }}
              >
                Room Quota:
              </Typography>
              <TextField
                fullWidth
                value={
                  selectedSchedule
                    ? getSelectedScheduleData()?.room_quota || "N/A"
                    : ""
                }
                InputProps={{ readOnly: true }}
                variant="outlined"
                sx={{
                  border: `1px solid ${borderColor}`,
                  borderRadius: 2,
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                  bgcolor: "#f9f9f9",
                }}
              />
            </Grid>

            {/* Current Occupancy */}
            <Grid item xs={12} md={3}>
              <Typography
                textAlign="left"
                color="maroon"
                sx={{ mb: 1, fontWeight: "bold" }}
              >
                Current Occupancy:
              </Typography>
              <TextField
                fullWidth
                value={
                  selectedSchedule
                    ? (() => {
                        const s = getSelectedScheduleData();
                        return s
                          ? `${s.current_occupancy ?? 0}/${s.room_quota}`
                          : "";
                      })()
                    : ""
                }
                InputProps={{ readOnly: true }}
                variant="outlined"
                sx={{
                  border: `1px solid ${borderColor}`,
                  borderRadius: 2,
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                  bgcolor: "#f9f9f9",
                }}
              />
            </Grid>
          </Grid>
        </Box>
        {/* === ROW 1: Sort + Buttons === */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          {/* LEFT SIDE: Sort By + Sort Order */}
          <Box display="flex" alignItems="center" gap={2}>
            {/* Sort By */}
            <Box display="flex" alignItems="center" gap={1} marginLeft={-4}>
              <Typography
                fontSize={13}
                sx={{ minWidth: "80px", textAlign: "right" }}
              >
                Sort By:
              </Typography>
              <FormControl size="small" sx={{ width: "200px" }}>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="name">Applicant's Name</MenuItem>
                  <MenuItem value="id">Applicant ID</MenuItem>
                  <MenuItem value="email">Email Address</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Sort Order */}
            <Box display="flex" alignItems="center" gap={1}>
              <Typography
                fontSize={13}
                sx={{ minWidth: "80px", textAlign: "right" }}
              >
                Sort Order:
              </Typography>
              <FormControl size="small" sx={{ width: "150px" }}>
                <Select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                >
                  <MenuItem value="asc">Ascending</MenuItem>
                  <MenuItem value="desc">Descending</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={2}>
            {/* NEW Cancel Button BEFORE Assign Max */}
            {/* <Button
              variant="contained"
              sx={{
                backgroundColor: "#8B0000",
                color: "white",
                minWidth: 150,
              }}
              onClick={async () => {
                if (!window.confirm("Are you sure? This will cancel ALL unscheduled applicants?")) {
                  return;
                }

                try {
                  const res = await axios.post(`${API_BASE_URL}/cancel-unscheduled-applicants`);
                  alert(res.data.message);
                } catch (err) {
                  console.error(err);
                  alert("Error cancelling applicants.");
                }
              }}
            >
              Reject All
            </Button> */}

            {/* Assign Max */}
            <Button
              variant="contained"
              color="secondary"
              onClick={handleAssign40}
              sx={{ minWidth: 150, height: "40px" }}
            >
              Assign Max
            </Button>

            {/* Custom Input */}
            <TextField
              type="number"
              size="small"
              label="Custom Count"
              value={customCount}
              onChange={(e) => setCustomCount(Number(e.target.value))}
              sx={{ minWidth: 120, height: "40px" }}
            />

            {/* Assign Custom */}
            <Button
              variant="contained"
              color="warning"
              onClick={handleAssignCustom}
              sx={{ minWidth: 150, height: "40px" }}
            >
              Assign Custom
            </Button>

            {/* Unassign All */}
            <Button
              variant="contained"
              color="error"
              onClick={handleUnassignAll}
              sx={{ minWidth: 150, height: "40px" }}
            >
              Unassign All
            </Button>

            {/* Send Emails */}
            <Button
              variant="contained"
              color="success"
              onClick={handleSendEmails}
              sx={{ minWidth: 150, height: "40px" }}
            >
              SEND EMAIL TO ALL
            </Button>
          </Box>
        </Box>

        {/* === Filters Row: Department + Program + School Year + Semester === */}
        <Box display="flex" alignItems="center" gap={3} mb={2} flexWrap="wrap">
          {/* Department Filter */}
          <Box display="flex" alignItems="center" gap={1}>
            <Typography fontSize={13} sx={{ minWidth: "70px" }}>
              Campus:
            </Typography>
            <FormControl size="small" sx={{ width: "180px" }}>
              <InputLabel id="campus-label">Campus</InputLabel>
              <Select
                labelId="campus-label"
                id="campus-select"
                name="campus"
                value={selectedCampusFilter}
                onChange={(e) => handleCampusFilterChange(e.target.value)}
              >
                <MenuItem value="">
                  <em>All Campuses</em>
                </MenuItem>

                {branches.map((branch) => (
                  <MenuItem key={branch.id} value={String(branch.id)}>
                    {branch.branch}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography
              fontSize={13}
              sx={{ minWidth: "70px", marginLeft: "20px" }}
            >
              Department:
            </Typography>
            <FormControl size="small" sx={{ width: "250px" }}>
              <Select
                value={selectedDepartmentFilter}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                displayEmpty
              >
                {department.length > 1 && (
                  <MenuItem value="">All Departments</MenuItem>
                )}
                {filteredDepartments.map((dep) => (
                  <MenuItem key={dep.dprtmnt_id} value={String(dep.dprtmnt_id)}>
                    {dep.dprtmnt_name} ({dep.dprtmnt_code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Program Filter */}
          <Box display="flex" alignItems="center" gap={1}>
            <Typography fontSize={13} sx={{ minWidth: "60px" }}>
              Program:
            </Typography>
            <FormControl size="small" sx={{ width: "250px" }}>
              <Select
                value={selectedProgramFilter}
                onChange={(e) => handleProgramFilterChange(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">All Programs</MenuItem>
                {filteredCurriculumOptions.map((prog) => (
                  <MenuItem
                    key={prog.curriculum_id}
                    value={String(prog.curriculum_id)}
                  >
                    {prog.program_code} - {prog.program_description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* School Year Filter */}
          <Box display="flex" alignItems="center" gap={1}>
            <Typography fontSize={13} sx={{ minWidth: "80px" }}>
              School Year:
            </Typography>
            <FormControl size="small" sx={{ width: "180px" }}>
              <Select
                value={selectedSchoolYear}
                onChange={handleSchoolYearChange}
                displayEmpty
              >
                {schoolYears.length > 0 ? (
                  schoolYears.map((sy) => (
                    <MenuItem value={sy.year_id} key={sy.year_id}>
                      {sy.current_year} - {sy.next_year}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>School Year is not found</MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>

          {/* Semester Filter */}
          <Box display="flex" alignItems="center" gap={1}>
            <Typography fontSize={13} sx={{ minWidth: "70px" }}>
              Semester:
            </Typography>
            <FormControl size="small" sx={{ width: "180px" }}>
              <Select
                value={selectedSchoolSemester}
                onChange={handleSchoolSemesterChange}
                displayEmpty
              >
                {semesters.length > 0 ? (
                  semesters.map((sem) => (
                    <MenuItem value={sem.semester_id} key={sem.semester_id}>
                      {sem.semester_description}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>School Semester is not found</MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead
            sx={{
              backgroundColor: headerColor,
              color: "white",
            }}
          >
            <TableRow>
              <TableCell
                colSpan={10}
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
                >
                  {/* Left: Total Count */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Applicant's Records: {filteredPersons.length}
                  </Typography>

                  {/* Right: Pagination Controls */}
                  <Box display="flex" alignItems="center" gap={1}>
                    {/* First & Prev */}
                    <Button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
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
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
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

                    {/* Page Dropdown */}
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
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
                            color: "white", // dropdown arrow icon color
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              backgroundColor: "#fff", // dropdown background
                            },
                          },
                        }}
                      >
                        {Array.from({ length: totalPages }, (_, i) => (
                          <MenuItem key={i + 1} value={i + 1}>
                            Page {i + 1}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Typography fontSize="11px" color="white">
                      of {totalPages} page{totalPages > 1 ? "s" : ""}
                    </Typography>

                    {/* Next & Last */}
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
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
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
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

      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}` }}
      >
        <Table size="small">
          <TableHead sx={{ backgroundColor: "#F1F1F1" }}>
            <TableRow>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "black",
                  border: `1px solid ${borderColor}`,
                }}
              >
                #
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "black",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Applicant ID
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "black",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Name
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "black",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Program
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "black",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Email Address
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "black",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Date Applied
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  fontSize: "12px",
                  color: "black",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Action
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentPersons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: "center", p: 2 }}>
                  No applicants found.
                </TableCell>
              </TableRow>
            ) : (
              currentPersons.map((person, index) => {
                const id = person.applicant_number;
                const isAssigned = person.schedule_id !== null;

                return (
                  <TableRow
                    key={person.person_id}
                    sx={{
                      backgroundColor:
                        index % 2 === 0 ? "#ffffff" : "lightgray", // white / light gray
                    }}
                  >
                    {/* Auto-increment # */}
                    <TableCell
                      sx={{
                        textAlign: "center",
                        border: `1px solid ${borderColor}`,
                        fontSize: "12px",
                      }}
                    >
                      {indexOfFirstItem + index + 1}
                    </TableCell>

                    <TableCell
                      sx={{
                        color: "blue",
                        cursor: "pointer",
                        textAlign: "center",
                        border: `1px solid ${borderColor}`,

                        py: 0.5,
                        fontSize: "12px",
                      }}
                      onClick={() => handleRowClick(person)}
                    >
                      {person.applicant_number ?? "N/A"}
                    </TableCell>

                    {/* Applicant Name */}
                    <TableCell
                      sx={{
                        color: "blue",
                        cursor: "pointer",
                        textAlign: "left",
                        border: `1px solid ${borderColor}`,

                        py: 0.5,
                        fontSize: "12px",
                      }}
                      onClick={() => handleRowClick(person)}
                    >
                      {`${person.last_name}, ${person.first_name} ${person.middle_name ?? ""} ${person.extension ?? ""}`}
                    </TableCell>

                    {/* Program */}
                    <TableCell
                      sx={{
                        textAlign: "center",
                        border: `1px solid ${borderColor}`,
                        fontSize: "12px",
                      }}
                    >
                      {allCurriculums.find(
                        (item) =>
                          item.curriculum_id?.toString() ===
                          person.program?.toString(),
                      )?.program_code ?? "N/A"}
                    </TableCell>

                    {/* Email */}
                    <TableCell
                      sx={{
                        textAlign: "center",
                        border: `1px solid ${borderColor}`,
                        fontSize: "12px",
                      }}
                    >
                      {person.emailAddress ?? "N/A"}
                    </TableCell>

                    <TableCell
                      sx={{
                        textAlign: "center",
                        border: `1px solid ${borderColor}`,
                        fontSize: "12px",
                      }}
                    >
                      {(() => {
                        if (!person.created_at) return "";

                        const date = new Date(person.created_at);

                        if (isNaN(date)) return person.created_at;

                        return date.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        });
                      })()}
                    </TableCell>

                    {/* Action Buttons (from VerifyDocumentScheduleManagement) */}
                    {/* Action Buttons (from VerifyDocumentScheduleManagement) */}
                    <TableCell
                      sx={{
                        textAlign: "center",
                        border: `1px solid ${borderColor}`,
                      }}
                    >
                      {!isAssigned ? (
                        // ✅ Not assigned → Assign only
                        <Button
                          variant="contained"
                          disabled={!socket?.current}
                          onClick={(e) => {
                            e.stopPropagation(); // ✅ REQUIRED
                            handleAssignSingle(person.applicant_number);
                          }}
                        >
                          Assign
                        </Button>
                      ) : (
                        // ✅ Already assigned → show Unassign + Send Email
                        <Box display="flex" gap={1} justifyContent="center">
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() =>
                              handleUnassignImmediate(person.applicant_number)
                            }
                          >
                            Unassign
                          </Button>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendEmails(person);
                            }}
                          >
                            SEND EMAIL
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead
            sx={{
              backgroundColor: headerColor,
              color: "white",
            }}
          >
            <TableRow>
              <TableCell
                colSpan={10}
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
                >
                  {/* Left: Total Count */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Applicant's Records: {filteredPersons.length}
                  </Typography>

                  {/* Right: Pagination Controls */}
                  <Box display="flex" alignItems="center" gap={1}>
                    {/* First & Prev */}
                    <Button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
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
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
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

                    {/* Page Dropdown */}
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
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
                            color: "white", // dropdown arrow icon color
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              backgroundColor: "#fff", // dropdown background
                            },
                          },
                        }}
                      >
                        {Array.from({ length: totalPages }, (_, i) => (
                          <MenuItem key={i + 1} value={i + 1}>
                            Page {i + 1}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Typography fontSize="11px" color="white">
                      of {totalPages} page{totalPages > 1 ? "s" : ""}
                    </Typography>

                    {/* Next & Last */}
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
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
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
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

      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={handleCloseSnack}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={handleCloseSnack}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>

      {/* Edit & Send Email Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor: headerColor,
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          ✉️ Message
          <IconButton
            onClick={() => setConfirmOpen(false)}
            sx={{
              color: "white",
              border: "2px solid rgba(255,255,255,0.6)",
              borderRadius: "50%",
              width: 48,
              height: 48,
              padding: 0,
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.2)",
                border: "2px solid white",
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {/* Subject - full width on top */}
          <TextField
            label="Email Subject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            fullWidth
            sx={{ mb: 3 }}
          />

          {/* Two-column layout */}
          <Box sx={{ display: "flex", gap: 3 }}>
            {/* RIGHT SIDE - Message Preview */}
            <Box
              sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}
            >
              <Typography
                variant="subtitle2"
                color="text.secondary"
                fontWeight={600}
              >
                👁️ Message Preview
              </Typography>

              <TextField
                label="Email Preview (Read Only)"
                value={finalEmailMessage}
                fullWidth
                multiline
                minRows={18}
                InputProps={{
                  readOnly: true,
                }}
                sx={{
                  "& .MuiInputBase-root": {
                    backgroundColor: "#f9f9f9",
                  },
                }}
              />
            </Box>

            {/* LEFT SIDE - Edit Fields */}
            <Box
              sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}
            >
              <Typography
                variant="subtitle2"
                color="text.secondary"
                fontWeight={600}
              >
                🕘 Office Hours:
              </Typography>

              {/* Editable Office Hours */}
              <TextField
                label="Office Days"
                InputProps={{ readOnly: true }}
                value={officeDays}
                onChange={(e) => setOfficeDays(e.target.value)}
                fullWidth
              />

              <TextField
                label="Office Time"
                value={officeTime}
                InputProps={{ readOnly: true }}
                fullWidth
                sx={{
                  "& .MuiInputBase-root": {
                    backgroundColor: "#f9f9f9",
                  },
                }}
              />

              <Typography
                variant="subtitle2"
                color="text.secondary"
                fontWeight={600}
              >
                ✏️ Edit Fields
              </Typography>

              {/* Editable Important Reminders */}
              <TextField
                label="Important Reminders"
                value={importantReminders}
                onChange={(e) => setImportantReminders(e.target.value)}
                fullWidth
                multiline
                placeholder="Edit reminders here..."
                minRows={10}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            color="error"
            variant="outlined"
          >
            Cancel
          </Button>

          <Button
            onClick={confirmSendEmails}
            variant="contained"
            color="success"
            size="small"
            sx={{ minWidth: 140, height: 40 }}
          >
            Send Emails
          </Button>
        </DialogActions>
      </Dialog>

      <LoadingOverlay
        open={loading2}
        message="Sending emails, please wait..."
      />
    </Box>
  );
};

export default VerifyDocumentScheduleManagement;
