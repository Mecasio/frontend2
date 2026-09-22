import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import "../styles/TempStyles.css";
import axios from "axios";
import { createAppSocket } from "../utils/socketClient";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Divider,
  Stack,
  Avatar,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  Tooltip,
  FormControlLabel,
  Checkbox,
  Button,
  Chip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import DescriptionIcon from "@mui/icons-material/Description";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import EventIcon from "@mui/icons-material/Event";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckIcon from "@mui/icons-material/Check";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import PhoneIcon from "@mui/icons-material/Phone";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import EaristLogo from "../assets/EaristLogo.png";
import API_BASE_URL from "../apiConfig";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { ArrowBackIos, ArrowForwardIos, Campaign, } from "@mui/icons-material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import FacebookIcon from "@mui/icons-material/Facebook";
import EmailIcon from "@mui/icons-material/Email";
import FactCheckIcon from "@mui/icons-material/FactCheck";
// ─────────────────────────────────────────────────────────────────────────
// ✅ small presentational helpers used by the "Application Snapshot"
// cards below (Application Progress / Details / Requirements Status).
// Defined once, outside the component, so they aren't recreated every render.
// ─────────────────────────────────────────────────────────────────────────
const ProgressRing = ({ percentage, color = "#1976d2", size = 96 }) => {
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percentage, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#eee" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#222" }}>{clamped}%</Typography>
      </Box>
    </Box>
  );
};

const StatusDot = ({ state }) => {
  const color = state === "done" ? "#2e7d32" : state === "current" ? "#f5a623" : "#ccc";
  return <Box sx={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />;
};

// ✅ small calendar-style date badge (month on top, day number below)
// used in "Important Reminders" for entrance-exam / interview schedules.
// ✅ CHANGED: fixed to a 50px x 50px footprint per user request.
const DateBadge = ({ dateString, color = "#8B0000" }) => {
  const d = dateString ? new Date(dateString) : null;
  const valid = d && !isNaN(d.getTime());
  const month = valid ? d.toLocaleDateString("en-US", { month: "short" }).toUpperCase() : "TBA";
  const day = valid ? d.getDate() : "--";
  return (
    <Box
      sx={{
        width: 50,
        height: 50,
        flexShrink: 0,
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid #e0e0e0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          backgroundColor: color,
          color: "#fff",
          fontSize: 10,
          fontWeight: 800,
          textAlign: "center",
          letterSpacing: "0.03em",
          height: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {month}
      </Box>
      <Box
        sx={{
          backgroundColor: "#fff",
          color: "#222",
          fontSize: 18,
          fontWeight: 800,
          textAlign: "center",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {day}
      </Box>
    </Box>
  );
};

const ApplicantDashboard = (props) => {
  const settings = useContext(SettingsContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));   // < 600px

  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const academic = settings?.academic || {};
  const titleColor = colors.title || "#000000";
  const subtitleColor = colors.subtitle || "#555555";
  const borderColor = colors.border || "#000000";
  const mainButtonColor = colors.mainButton || "#1976d2";
  const stepperColor = colors.stepper || "#000000";
  const headerColor = colors.header || "#1976d2";
  const fetchedLogo = branding.logoUrl || EaristLogo;
  const companyName = branding.companyName || "";
  const shortTerm = branding.shortTerm || "";
  const campusAddress = branding.campusAddress || "";
  const branches = settings?.branches || [];

  const { profileImage, setProfileImage } = props;
  const [hovered, setHovered] = useState(false);
  const fileInputRef = useRef(null);
  const [openImage, setOpenImage] = useState(null);
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [applicantID, setApplicantID] = useState("");
  const [person, setPerson] = useState({
    profile_img: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    extension: "",
    academicProgram: "",
    classifiedAs: "",
    applyingAs: "",
    yearLevel: "",
  });
  const [verifyDocSchedule, setVerifyDocSchedule] = useState(null);

  const fetchVerifyDocumentSchedule = async (applicantNumber) => {
    if (!applicantNumber) return;
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/api/verify-document-schedule/${applicantNumber}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }
      );
      if (data && Number(data.email_sent) === 1) {
        setVerifyDocSchedule(normalizeSchedule(data));
      } else {
        setVerifyDocSchedule(null);
      }
    } catch (err) {
      console.error("Error fetching verify document schedule:", err);
      setVerifyDocSchedule(null);
    }
  };

  const buildGmailComposeUrl = (toEmail) => {
    if (!toEmail) return null;

    const subject = `Admission Concern${applicantID ? ` — Applicant ID: ${applicantID}` : ""}`;

    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: toEmail,
      su: subject,
      body: "",
    });

    return `https://mail.google.com/mail/?${params.toString()}`;
  };

  const [proctor, setProctor] = useState(null);
  const [applicantNumber, setApplicantNumber] = useState(null);

  const { person_id: paramId } = useParams();
  const person_id = paramId || localStorage.getItem("person_id");

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setUserRole(storedRole);
      setUserID(storedID);
      if (storedRole === "applicant") {
        fetchPersonData(storedID);
        fetchApplicantNumber(storedID);
      } else {
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const [openAgreementModal, setOpenAgreementModal] = useState(true);
  const [agreeChecked, setAgreeChecked] = useState(false);

  useEffect(() => {
    setOpenAgreementModal(true);
  }, []);

  const [qualifyingExamScore, setQualifyingExamScore] = useState(null);
  const [qualifyingInterviewScore, setQualifyingInterviewScore] = useState(null);
  const [examScore, setExamScore] = useState(null);

  const normalizeSchedule = (schedule) => {
    if (!schedule) return null;
    return {
      ...schedule,
      schedule_id: schedule.schedule_id ?? schedule.exam_schedule_id ?? null,
      day_description: schedule.day_description ?? schedule.exam_day ?? schedule.date_of_exam ?? null,
      building_description: schedule.building_description ?? schedule.exam_building ?? null,
      room_description: schedule.room_description ?? schedule.exam_room ?? null,
      start_time: schedule.start_time ?? schedule.exam_start_time ?? null,
      end_time: schedule.end_time ?? schedule.exam_end_time ?? null,
    };
  };

  const fetchProctorSchedule = async (applicantNumber) => {
    if (!applicantNumber) return;
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/applicant-schedule/${applicantNumber}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });

      if (Number(data?.email_sent) === 1) {
        setProctor(normalizeSchedule(data));
      } else {
        setProctor(null);
      }

    } catch (err) {
      console.error("Error fetching schedule:", err);
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/exam-schedule/${applicantNumber}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        setProctor(normalizeSchedule(data));
      } catch (fallbackErr) {
        console.error("Fallback schedule fetch failed:", fallbackErr);
        setProctor(null);
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // curriculum options — same source ApplicantPersonalInformation
  // uses to resolve "Course Applied" — so the dashboard's "Program Applied"
  // shows the real course description instead of a raw id/N/A.
  // ─────────────────────────────────────────────────────────────────────
  const [curriculumOptions, setCurriculumOptions] = useState([]);

  useEffect(() => {
    const fetchCurriculums = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/applied_program`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        setCurriculumOptions(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("❌ Failed to fetch curriculum options:", err);
      }
    };
    fetchCurriculums();
  }, []);

  // ✅ NEW: Academic Year — pull the currently-active school year (astatus = 1)
  // from GET /api/active_school_year, the same endpoint the school-year
  // router exposes, instead of relying on person.academic_year / settings
  // fields which aren't always populated.
  const [activeSchoolYear, setActiveSchoolYear] = useState(null);

  useEffect(() => {
    const fetchActiveSchoolYear = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/active_school_year`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        const data = Array.isArray(res.data) ? res.data[0] : res.data;
        setActiveSchoolYear(data || null);
      } catch (err) {
        console.error("❌ Failed to fetch active school year:", err);
      }
    };
    fetchActiveSchoolYear();
  }, []);

  const [admissionContact, setAdmissionContact] = useState(null);

  const formatContactTime = (time) => {
    if (!time) return "";
    const d = new Date(`1970-01-01T${time}`);
    if (isNaN(d.getTime())) return time;
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  useEffect(() => {
    if (!person?.campus) return; // wait until we know the applicant's branch
    const fetchAdmissionContact = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admission_contact/active`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
          params: { branch_id: person.campus },
        });
        setAdmissionContact(res.data || null);
      } catch (err) {
        console.error("❌ Failed to fetch admission contact:", err);
        setAdmissionContact(null);
      }
    };
    fetchAdmissionContact();
  }, [person?.campus]);

  const getBranchLabel = (branchId) => {
    const branch = branches.find((item) => String(item.id) === String(branchId));
    return branch?.branch || "";
  };

  const [requirementsCompleted, setRequirementsCompleted] = useState(
    localStorage.getItem("requirementsCompleted") === "1",
  );
  const [allRequirementsCompleted, setAllRequirementsCompleted] = useState(false);

  const fetchApplicantNumber = async (personID) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/applicant_number/${personID}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      if (res.data && res.data.applicant_number) {
        setApplicantID(res.data.applicant_number);
        setApplicantNumber(res.data.applicant_number);
        fetchEntranceExamScores(res.data.applicant_number);
        fetchProctorSchedule(res.data.applicant_number);
        fetchInterviewSchedule(res.data.applicant_number);
        fetchVerifyDocumentSchedule(res.data.applicant_number);
        fetchCollegeApproval(res.data.applicant_number);
      }
    } catch (error) {
      console.error("Failed to fetch applicant number:", error);
    }
  };

  const fetchPersonData = async (id) => {
    if (!id) return console.warn("fetchPersonData called with empty id");
    try {
      const res = await axios.get(`${API_BASE_URL}/api/person_with_applicant/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setPerson(res.data || {});

      const profileSchedule = normalizeSchedule(res.data);
      const examEmailSent = Number(res.data?.exam_email_sent ?? res.data?.email_sent ?? 0) === 1;
      if (
        examEmailSent &&
        (profileSchedule?.schedule_id || profileSchedule?.day_description)
      ) {
        setProctor(profileSchedule);
      } else {
        setProctor(null);
      }

      let qExam = res.data?.qualifying_exam_score ?? res.data?.qualifying_result ?? res.data?.exam_score ?? null;
      let qInterview = res.data?.qualifying_interview_score ?? res.data?.interview_result ?? null;
      let ex = res.data?.exam_score ?? res.data?.exam_result ?? null;

      const applicantNumber = res.data?.applicant_number ?? res.data?.applicantNumber ?? null;

      if (qExam === null && qInterview === null && ex === null && applicantNumber) {
        try {
          const st = await axios.get(`${API_BASE_URL}/api/person_status_by_applicant/${applicantNumber}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
          console.info("person_status_by_applicant response:", st.data);
          qExam = qExam ?? st.data?.qualifying_result ?? null;
          qInterview = qInterview ?? st.data?.interview_result ?? null;
          ex = ex ?? st.data?.exam_result ?? null;
        } catch (err) {
          console.warn("Fallback status endpoint failed:", err?.response?.data || err.message);
        }
      }

      setQualifyingExamScore(qExam !== undefined && qExam !== null ? normalizeExamStatus(qExam) : null);
      setQualifyingInterviewScore(qInterview !== undefined && qInterview !== null ? normalizeExamStatus(qInterview) : null);
      setExamScore(ex !== undefined && ex !== null ? normalizeExamStatus(ex) : null);

      console.info("final mapped scores:", { qExam, qInterview, ex });
    } catch (err) {
      console.error("fetchPersonData failed:", err?.response?.data || err.message);
    }
  };

  const formatTime = (time) =>
    time
      ? new Date(`1970-01-01T${time}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      : "";

  const [dateTime, setDateTime] = useState(new Date());
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = time.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const [examScores, setExamScores] = useState({
    subjects: {},
    final: null,
    total: null,
    percentage: null,
    status: null,
  });

  const normalizeExamStatus = (status) => {
    if (status === 0 || String(status).trim() === "0") return "PASSED";
    if (status === 1 || String(status).trim() === "1") return "FAILED";
    const normalized = String(status ?? "").trim().toUpperCase();
    if (["PASSED", "PASS"].includes(normalized)) return "PASSED";
    if (["FAILED", "FAIL"].includes(normalized)) return "FAILED";
    return "PENDING";
  };

  const normalizeCollegeApproval = (status) => {
    const normalized = String(status ?? "").trim().toUpperCase();
    if (status === 1 || normalized === "1" || normalized === "ACCEPTED") return "Accepted";
    if (status === 2 || normalized === "2" || normalized === "REJECTED") return "Rejected";
    return "";
  };

  const fetchEntranceExamScores = async (applicantNumber) => {
    if (!applicantNumber) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/applicants-with-number`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      const applicant = res.data.data.find((a) => a.applicant_number === applicantNumber);
      if (applicant) {
        setExamScores({
          subjects: applicant.scores || {},
          final: applicant.final_rating ? Number(applicant.final_rating).toFixed(2) : "0.00",
          total: applicant.total || 0,
          percentage: applicant.percentage || 0,
          status: normalizeExamStatus(applicant.exam_status),
        });
      } else {
        setExamScores({ subjects: {}, final: null, total: null, percentage: null, status: null });
      }
    } catch (err) {
      console.error("❌ Failed to fetch entrance exam scores:", err);
    }
  };

  const hasScores = examScores.subjects && Object.keys(examScores.subjects).length > 0;

  const hasSchedule = !!(
    proctor?.schedule_id ||
    proctor?.day_description ||
    proctor?.building_description ||
    proctor?.room_description ||
    proctor?.start_time ||
    proctor?.end_time
  );

  const [interviewSchedule, setInterviewSchedule] = useState(null);
  const [hasInterviewScores, setHasInterviewScores] = useState(false);

  const fetchInterviewSchedule = async (applicantNumber) => {
    if (!applicantNumber) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/applicant-interview-schedule/${applicantNumber}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      console.info("Interview schedule + scores:", res.data);
      if (Number(res.data?.email_sent ?? 0) !== 1) {
        setInterviewSchedule(null);
        return;
      }
      setInterviewSchedule(res.data);
      const qExam = res.data.qualifying_result ?? null;
      const qInterview = res.data.interview_result ?? null;
      const ex = res.data.exam_result ?? null;
      setQualifyingExamScore(qExam !== null ? normalizeExamStatus(qExam) : null);
      setQualifyingInterviewScore(qInterview !== null ? normalizeExamStatus(qInterview) : null);
      setExamScore(ex !== null ? normalizeExamStatus(ex) : null);
      setHasInterviewScores(qExam !== null || qInterview !== null || ex !== null);
    } catch (err) {
      console.error("❌ Failed to fetch interview schedule:", err);
      setInterviewSchedule(null);
    }
  };

  useEffect(() => {
    if (applicantNumber) fetchEntranceExamScores(applicantNumber);
  }, [applicantNumber]);

  const [collegeApproval, setCollegeApproval] = useState(null);

  const fetchCollegeApproval = async (applicantNumber) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/interview_applicants/${applicantNumber}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setCollegeApproval(normalizeCollegeApproval(res.data?.status));
    } catch (err) {
      console.error("❌ Failed to fetch college approval:", err);
    }
  };

  const [date, setDate] = useState(new Date());
  const days = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];
  const year = date.getFullYear();
  const month = date.getMonth();

  const now = new Date();
  const manilaDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const today = manilaDate.getDate();
  const thisMonth = manilaDate.getMonth();
  const thisYear = manilaDate.getFullYear();

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const weeks = [];
  let currentDay = 1 - firstDay;
  while (currentDay <= totalDays) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      if (currentDay > 0 && currentDay <= totalDays) {
        week.push(currentDay);
      } else {
        week.push(null);
      }
      currentDay++;
    }
    weeks.push(week);
  }

  const handlePrevMonth = () => setDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setDate(new Date(year, month + 1, 1));

  const [docsCompleted, setDocsCompleted] = useState(false);
  const [mainStatus, setMainStatus] = useState(null);
  const [registrarApproved, setRegistrarApproved] = useState(false);

  // Requirement definitions + upload records fetched the same way
  // ApplicantOnlineRequirements does, so the dashboard's numbers always
  // match the Main Requirements page.
  const [requirements, setRequirements] = useState([]);
  const [uploads, setUploads] = useState([]);

  const fetchRequirementsAndUploads = async () => {
    if (!person_id) return;
    try {
      const [reqRes, upRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/requirements/${person_id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
        axios.get(`${API_BASE_URL}/api/uploads/${person_id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
      ]);

      const reqData = Array.isArray(reqRes.data) ? reqRes.data : [];
      const upData = Array.isArray(upRes.data) ? upRes.data : [];
      setRequirements(reqData);
      setUploads(upData);

      // Mirrors ApplicantOnlineRequirements' isFormValid(): only "Main"
      // category requirements marked is_required === 1 must be uploaded.
      const mainRequired = reqData.filter(
        (r) => r.category === "Main" && Number(r.is_required) === 1,
      );
      const uploadedIds = new Set(upData.map((u) => Number(u.requirements_id)));
      const allSubmitted =
        mainRequired.length > 0 &&
        mainRequired.every((r) => uploadedIds.has(Number(r.id)));

      setDocsCompleted(allSubmitted);
      if (allSubmitted) {
        setPerson((prev) => ({ ...prev, document_status: "Documents Verified & ECAT" }));
      }
    } catch (err) {
      console.error("❌ Failed fetching requirements/uploads:", err);
    }
  };

  const fetchRegistrarStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/submitted-status/${person_id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setRegistrarApproved(Number(res.data.submitted_documents) === 1);
    } catch (err) {
      console.error("❌ Failed fetching registrar status:", err);
    }
  };

  const fetchApplicationRegisteredStatus = async () => {
    if (!person_id) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/applicant-status/${person_id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setAllRequirementsCompleted(Number(res.data?.requirements) === 1);
    } catch (err) {
      console.error("❌ Failed fetching applicant-status:", err);
    }
  };

  useEffect(() => {
    if (person_id) {
      fetchRequirementsAndUploads();
      fetchRegistrarStatus();
      fetchApplicationRegisteredStatus(); // ← add this
    }
  }, [person_id]);

  const stepIcons = [
    <DescriptionIcon />,
    <EventIcon />,
    <AssignmentTurnedInIcon />,
    <CheckCircleIcon />,
    <LocalHospitalIcon />,
    <PersonIcon />,
  ];

  const steps = [
    "Documents Submitted",
    "Admission Entrance Exam",
    "Interview /  Qualifying Exam Schedule",
    "College Approval",
    "Medical And Dental Service",
    "Applicant Status",
  ];

  const [hasStudentNumber, setHasStudentNumber] = useState(false);
  const [studentNumber, setStudentNumber] = useState(null);

  const getCurrentStep = () => {
    // ✅ CHANGED: a student number being issued means the applicant has
    // already been accepted and processed, even if `final_status` wasn't
    // explicitly set to "Accepted" yet — so treat it the same as reaching
    // the final "Applicant Status" step (keeps the stepper icon "glowing"
    // and the progress checklist in sync with the step-5 detail text).
    if (
      person?.final_status === "Accepted" ||
      person?.final_status === "Rejected" ||
      hasStudentNumber
    )
      return 5;
    if (registrarApproved) return 5;       // Medical & Registrar done -> now waiting on final Applicant Status
    if (collegeApproval === "Accepted" || collegeApproval === "Rejected") return 4; // College Approval done -> now on Medical And Dental Service
    if (interviewSchedule || hasInterviewScores) return 3; // Interview/Qualifying done -> now on College Approval
    if (hasSchedule) return 2;             // Entrance exam scheduled -> now on Interview/Qualifying step
    if (docsCompleted) return 1;           // Documents submitted -> now on Admission Entrance Exam
    return 0;
  };

  const activeStep = Math.min(getCurrentStep(), steps.length - 1);

  const [holidays, setHolidays] = useState({});
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await axios.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/PH`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        const lookup = {};
        res.data.forEach((h) => { lookup[h.date] = h; });
        setHolidays(lookup);
      } catch (err) {
        console.error("❌ Failed to fetch PH holidays:", err);
        setHolidays({});
      }
    };
    fetchHolidays();
  }, [year]);

  const [announcements, setAnnouncements] = useState([]);
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/announcements/applicant`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        setAnnouncements(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAnnouncements();
  }, []);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  const openLightbox = (index) => { setLightboxIndex(index); setLightboxZoom(1); setLightboxOpen(true); };
  const closeLightbox = () => { setLightboxOpen(false); setLightboxZoom(1); };
  const lightboxNext = () => { setLightboxIndex(prev => (prev + 1) % announcements.length); setLightboxZoom(1); };
  const lightboxPrev = () => { setLightboxIndex(prev => (prev - 1 + announcements.length) % announcements.length); setLightboxZoom(1); };
  const zoomIn = () => setLightboxZoom(prev => Math.min(prev + 0.5, 3));
  const zoomOut = () => setLightboxZoom(prev => Math.max(prev - 0.5, 1));

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") lightboxNext();
      if (e.key === "ArrowLeft") lightboxPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxOpen, lightboxIndex, announcements.length]);

  const formatDate = (dateString) => {
    if (!dateString) return "TBA";
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const person_id = localStorage.getItem("person_id");
      const role = localStorage.getItem("role");
      const formData = new FormData();
      formData.append("profile_picture", file);
      formData.append("person_id", person_id);
      await axios.post(`${API_BASE_URL}/form/upload-profile-picture`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      const updated = await axios.get(`${API_BASE_URL}/api/person_data/${person_id}/${role}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setPerson(updated.data);
      fetchPersonData(person_id, role);
      const baseUrl = `${API_BASE_URL}/uploads/Applicant1by1/${updated.data.profile_image}`;
      setProfileImage(`${baseUrl}?t=${Date.now()}`);
      console.log("✅ Profile updated successfully!");
    } catch (err) {
      console.error("❌ Upload failed:", err);
    }
  };


  const FormattedContent = ({ text }) => {
    if (!text) return null;
    const lines = text.split("\n");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} style={{ height: "6px" }} />;

          const bulletMatch = trimmed.match(/^([•\*\-–])\s+(.*)/);
          if (bulletMatch) {
            return (
              <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <span style={{ color: "#fff", marginTop: "2px", flexShrink: 0, fontSize: "14px" }}>•</span>
                <span style={{ color: "rgba(255,255,255,0.92)", fontSize: "13.5px", lineHeight: 1.55 }}>
                  {bulletMatch[2]}
                </span>
              </div>
            );
          }

          const subBulletMatch = line.match(/^[\s\t]+([•\*\-–])\s+(.*)/);
          if (subBulletMatch) {
            return (
              <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start", paddingLeft: "18px" }}>
                <span style={{ color: "rgba(255,255,255,0.55)", marginTop: "2px", flexShrink: 0, fontSize: "12px" }}>◦</span>
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", lineHeight: 1.55 }}>
                  {subBulletMatch[2]}
                </span>
              </div>
            );
          }

          const isHeading = trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-Z]/.test(trimmed);
          if (isHeading) {
            return (
              <p key={i} style={{ margin: "6px 0 2px", color: "#fff", fontWeight: 700, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.75 }}>
                {trimmed}
              </p>
            );
          }

          return (
            <p key={i} style={{ margin: 0, color: "rgba(255,255,255,0.9)", fontSize: "13.5px", lineHeight: 1.6 }}>
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };



  const checkStudentNumber = async (personId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student_status/${personId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      if (res.data.hasStudentNumber) {
        setHasStudentNumber(true);
        setStudentNumber(res.data.student_number);
      } else {
        setHasStudentNumber(false);
      }
    } catch (err) {
      console.error("❌ Failed to check student number:", err);
    }
  };

  useEffect(() => {
    const storedID = localStorage.getItem("person_id");
    if (storedID) {
      fetchPersonData(storedID);
      fetchApplicantNumber(storedID);
      checkStudentNumber(storedID);
    }
  }, []);

  // ── Step content helper (shared by desktop boxes + mobile accordion) ──────
  const renderStepDetail = (index) => {
    if (index === 0) {
      return person?.document_status === "Documents Verified & ECAT" ? (
        <Box>
          <Typography variant="body2" sx={{ color: "maroon", fontWeight: "bold", lineHeight: 1.6 }}>
            ✅ Your submitted documents have been successfully verified.
          </Typography>
          <Divider sx={{ backgroundColor: "gray", height: "0.5px", my: 1.5, borderRadius: 1 }} />
          <Typography variant="body2" sx={{ color: "maroon", fontWeight: "bold", lineHeight: 1.6 }}>
            <strong>Next Step:</strong><br />
            Go to <strong>Applicant Profile</strong> → <strong>Examination Permit</strong> and <strong>print your permit</strong>.
          </Typography>
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: "maroon", fontWeight: "bold" }}>⏳ Status: Pending</Typography>
      );
    }

    if (index === 1) return (
      <Box sx={{ color: "maroon", fontWeight: "bold", fontSize: "13px", lineHeight: 1.6 }}>
        {!hasSchedule && !hasScores && <span>⏳ Status: Pending</span>}
        {!hasSchedule && hasScores && <span>Schedule: Not assigned</span>}
        {hasSchedule && (
          <Typography variant="body2" component="div" sx={{ color: "maroon", fontWeight: "bold", lineHeight: 1.6 }}>
            📅 Date: {formatDate(proctor?.day_description)}<br />
            🏢 Building: {proctor?.building_description || "TBA"}<br />
            🚪 Room: {proctor?.room_description || "TBA"}<br />
            ⏰ Time: {formatTime(proctor?.start_time)} – {formatTime(proctor?.end_time)}
          </Typography>
        )}
        {(hasSchedule || hasScores) && <Divider sx={{ backgroundColor: "gray", height: "0.5px", my: 1.5, borderRadius: 1 }} />}
        {hasScores && (
          <Typography
            variant="body2"
            sx={{ color: "maroon", fontWeight: "bold", lineHeight: 1.6 }}
          >
            🎯 <strong>Entrance Examination Status:</strong>{" "}

            {normalizeExamStatus(examScores.status) === "PASSED" ? (
              <>
                <span style={{ color: "green" }}>PASSED</span>
                <br />
                Congratulations! You have successfully passed the entrance examination.
                Please wait for your interview or qualifying examination schedule.
              </>
            ) : normalizeExamStatus(examScores.status) === "FAILED" ? (
              <>
                <span style={{ color: "red" }}>FAILED</span>
                <br />
                Thank you for participating in the entrance examination. After careful
                evaluation, you did not meet the required passing standard for this
                admission cycle.
              </>
            ) : (
              <>
                <span>Pending</span>
                <br />
                Your examination is still being evaluated. Please wait for the official
                result.
              </>
            )}
          </Typography>
        )}
      </Box>
    );

    if (index === 2) return (
      <Box sx={{ color: "maroon", fontWeight: "bold", fontSize: "13px", lineHeight: 1.6 }}>
        {!interviewSchedule && !hasInterviewScores && <span>⏳ Status: Pending</span>}
        {interviewSchedule && (
          <Typography variant="body2" component="div" sx={{ color: "maroon", fontWeight: "bold", lineHeight: 1.6 }}>
            📅 Date: {formatDate(interviewSchedule?.day_description)}<br />
            🏫 Building: {interviewSchedule.building_description || "TBA"}<br />
            🏷️ Room: {interviewSchedule.room_description || "TBA"}<br />
            ⏰ Time: {formatTime(interviewSchedule.start_time)} – {formatTime(interviewSchedule.end_time)}
          </Typography>
        )}
        {(interviewSchedule || hasInterviewScores) && <Divider sx={{ backgroundColor: "gray", height: "0.5px", my: 1.5, borderRadius: 1 }} />}
        {hasInterviewScores && (
          <Typography variant="body2" sx={{ color: "maroon", fontWeight: "bold" }}>
            🗣 Interview Status:{" "}
            <span style={{ color: qualifyingInterviewScore === "PASSED" ? "green" : qualifyingInterviewScore === "FAILED" ? "red" : "orange" }}>
              {qualifyingInterviewScore ?? "Pending"}
            </span>
            <br />
            📝 Qualifying Exam Status:{" "}
            <span style={{ color: qualifyingExamScore === "PASSED" ? "green" : qualifyingExamScore === "FAILED" ? "red" : "orange" }}>
              {qualifyingExamScore ?? "Pending"}
            </span>
          </Typography>
        )}
      </Box>
    );

    if (index === 3)
      return (
        <Typography variant="body2" sx={{ color: "maroon", fontWeight: "bold" }}>
          {collegeApproval === "Accepted"
            ? "✅ Congratulations! You have successfully passed the qualifying examination and interview. You may now proceed to the clinic for your medical examination and the completion of your health record requirements."
            : collegeApproval === "Rejected"
              ? `❌ After careful evaluation, we regret to inform you that your application could not be approved at this time as it did not satisfy one or more of the admission requirements or program qualifications. Thank you for your understanding, and we wish you success in your future academic endeavors.`
              : "⏳ Waiting for College Approval"}
        </Typography>
      );

    // ✅ CHANGED: index 4 ("Medical And Dental Service") now keys off
    // `collegeApproval` first — the moment College Approval has data
    // (Accepted), the applicant is told they can proceed to the clinic,
    // instead of staying stuck on "Apply For Medical Processing" until the
    // separate `registrarApproved` flag (a different endpoint) comes back.
    if (index === 4) return (
      <Typography variant="body2" sx={{ color: "maroon", fontWeight: "bold", lineHeight: 1.6 }}>
        {registrarApproved
          ? "⬇️ Your documents have been verified. Please proceed to your respective college to finalize your schedule and subjects."
          : collegeApproval === "Accepted"
            ? "🏥 You have been cleared by the College. Please proceed to the clinic to complete your Medical and Dental examination requirements."
            : collegeApproval === "Rejected"
              ? "❌ Medical and Dental processing is unavailable since your application was not approved by the College."
              : "⏳ Apply For Medical Processing"}
      </Typography>
    );

    if (index === 5) return person?.final_status === "Rejected" ? (
      <Typography variant="body2" sx={{ color: "maroon", fontWeight: "bold" }}>❌ Unfortunately, you were not accepted.</Typography>
    ) : hasStudentNumber ? (
      <Typography variant="body2" component="div" sx={{ color: "maroon", fontWeight: "bold", lineHeight: 1.6 }}>
        🎉 <strong>Congratulations!</strong> You are now accepted at <strong>EARIST</strong>. Please follow the steps below:
        <div style={{ marginTop: "6px", lineHeight: "1.6" }}>
          1. Proceed to your <strong>College</strong> to tag your subjects.<br />
          2. Get your <strong>Class Schedule</strong> from your department.<br />
          {studentNumber && <span style={{ display: "block", fontWeight: "bold", marginTop: "5px" }}>Your Student Number: {studentNumber}</span>}
        </div>
      </Typography>
    ) : person?.final_status === "Accepted" ? (
      <Typography variant="body2" sx={{ color: "maroon", fontWeight: "bold" }}>✅ You have been accepted. Please wait while your student number is being processed.</Typography>
    ) : (
      <Typography variant="body2" sx={{ color: "maroon", fontWeight: "bold" }}>⏳ Application in Progress</Typography>
    );
  };

  // Mobile accordion state
  const [expandedStep, setExpandedStep] = useState(activeStep);

  // ─────────────────────────────────────────────────────────────────────
  // derived values used by the "Application Snapshot" cards
  // (Application Progress / Application Details / Requirements Status).
  // ─────────────────────────────────────────────────────────────────────

  // ✅ CHANGED: Requirements Status — based on "Main" category requirements.
  //   • Total     -> count of Main requirements
  //   • Submitted -> Main requirements that have an uploaded file at all
  //                  ("the applicant just uploaded the documents"), OR — once
  //                  the admin has already marked the whole application as
  //                  verified via `person.document_status ===
  //                  "Documents Verified & ECAT"` — every uploaded file counts
  //                  as Submitted, since the admin's decision overrides the
  //                  per-file status column.
  //   • Pending   -> Main requirements with NO uploaded file yet.
  //   • For Verification -> uploaded files still awaiting an individual
  //                  admin decision (status null/undefined/0) while the
  //                  overall application has not yet been marked verified.
  const reqStats = React.useMemo(() => {
    const mainDocs = requirements.filter((r) => r.category === "Main");
    const uploadedMap = new Map(uploads.map((u) => [Number(u.requirements_id), u]));
    const isDocumentStatusVerified = person?.document_status === "Documents Verified & ECAT";

    const total = mainDocs.length;
    let submitted = 0;
    let forVerification = 0;

    mainDocs.forEach((doc) => {
      const uploaded = uploadedMap.get(Number(doc.id));
      if (!uploaded) return; // no file at all -> falls into "pending" below

      if (isDocumentStatusVerified || Number(uploaded.status) === 1) {
        // Admin already marked the whole application verified, or this
        // particular file was individually verified.
        submitted += 1;
      } else {
        // Uploaded, but still waiting on an admin decision.
        forVerification += 1;
      }
    });

    const pending = Math.max(total - submitted - forVerification, 0);
    return { total, submitted, pending, forVerification };
  }, [requirements, uploads, person?.document_status]);

  // Application Progress — mirrors the real "Application Status"
  // stepper below (same `steps` labels, same `activeStep`, which is itself
  // derived from person.final_status / registrarApproved / collegeApproval /
  // schedules / docsCompleted), so the two can never disagree.
  const progressChecklist = steps.map((label, idx) => {
    const isFinalStep = idx === steps.length - 1;
    // ✅ CHANGED: same reasoning as getCurrentStep — a student number means
    // the applicant is fully accepted, so the last checklist item (and the
    // 100% completion) shouldn't wait on `final_status` alone.
    const done = isFinalStep
      ? (person?.final_status === "Accepted" || person?.final_status === "Rejected" || hasStudentNumber)
      : idx < activeStep;
    return { label, done };
  });

  const firstPendingIndex = progressChecklist.findIndex((item) => !item.done);
  const progressPercentage = Math.round(
    (progressChecklist.filter((item) => item.done).length / progressChecklist.length) * 100,
  );

  // put this above `applicationDetails`
  const resolvedExamStatus =
    (examScore && examScore !== "PENDING" ? examScore : null) ||
    (examScores.status && examScores.status !== "PENDING" ? examScores.status : null) ||
    "Pending";

  const applicationDetails = [
    { label: "Applicant ID", value: applicantID || "N/A" },
    {
      label: "Full Name",
      value: person
        ? `${person.last_name || ""}, ${person.first_name || ""} ${person.middle_name || ""}`.trim()
        : "N/A",
    },
    { label: "Document Status", value: person?.document_status || "Pending" },
    { label: "Exam Status", value: resolvedExamStatus },
    { label: "College Status", value: collegeApproval || "Pending" },
    { label: "Student Number", value: studentNumber || "Not yet assigned" },
  ];

  const APPLYING_AS_LABELS = {
    1: "Senior High School Graduate",
    2: "Senior High School Graduating Student",
    3: "ALS (Alternative Learning System) Passer",
    4: "Transferee from other University/College",
    5: "Cross Enrolee Student",
    6: "Foreign Applicant/Student",
    7: "Baccalaureate Graduate",
    8: "Master Degree Graduate",
  };

  const academicYearValue = (() => {
    if (activeSchoolYear?.current_year && activeSchoolYear?.next_year) {
      // shape from the school-year admin router's /active_school_year
      return `${activeSchoolYear.current_year}-${activeSchoolYear.next_year}`;
    }
    if (activeSchoolYear?.year_description) {
      // shape from the stats/ecat router's /active_school_year (only has year_description)
      return `${activeSchoolYear.year_description}-${Number(activeSchoolYear.year_description) + 1}`;
    }
    return person?.academic_year || academic.academicYear || "N/A";
  })();

  const semesterValue =
    activeSchoolYear?.semester_description ||
    person?.semester ||
    person?.semester_description ||
    "N/A";

  // ⚠️ Adjust these key names to match whatever your API actually returns —
  // I'm guessing based on the initial `person` state shape (classifiedAs/applyingAs).
  const classifiedAsValue =
    person?.classifiedAs || person?.classified_as || "N/A";

  const applyingAsValue =
    APPLYING_AS_LABELS[Number(person?.applyingAs)] ||
    person?.applyingAs ||
    "N/A";


  const selectedCurriculum = curriculumOptions.find(
    (item) => String(item.curriculum_id) === String(person?.program),
  );

  const programAppliedValue = selectedCurriculum
    ? `(${selectedCurriculum.program_code}): ${selectedCurriculum.program_description}${selectedCurriculum.major ? ` (${selectedCurriculum.major})` : ""
    }`
    : (person?.program_applied || person?.program || "N/A");

  const dateAppliedValue = formatDate(person?.date_applied || person?.created_at);

  const infoItems = [
    ["ACADEMIC YEAR", academicYearValue],
    ["SEMESTER", semesterValue],
    ["PROGRAM", programAppliedValue],
    ["CLASSIFIED AS", classifiedAsValue],
    ["APPLYING AS", applyingAsValue],
    ["DATE APPLIED", dateAppliedValue],
  ];

  const overallStatusLabel = hasStudentNumber
    ? "Student"
    : person?.final_status === "Accepted"
      ? "Accepted"
      : person?.final_status === "Rejected"
        ? "Rejected"
        : "In Progress";

  const overallStatusColor = hasStudentNumber
    ? "#1565c0"
    : person?.final_status === "Accepted"
      ? "#2e7d32"
      : person?.final_status === "Rejected"
        ? "#c62828"
        : "#f5a623";
  // Important Reminders — schedule reminders carry a `dateBadge` (rendered
  // as the 50x50 calendar badge) instead of a plain icon, and no longer
  // repeat the date inline in the subtitle text.
  const reminders = [];

  // Missing required documents
  if (!docsCompleted) {
    reminders.push({
      icon: <WarningAmberIcon sx={{ color: "#fff", fontSize: 32 }} />,
      iconBg: "#c62828",
      title: "Please Complete All Required Documents",
      subtitle:
        "Incomplete application requirements may delay the verification and processing of your admission.",
    });
  }

  // Waiting for document verification
  if (!verifyDocSchedule && !hasSchedule) {
    reminders.push({
      icon: <FactCheckIcon sx={{ color: "#fff", fontSize: 32 }} />,
      iconBg: "#1565c0",
      title: "Document Verification is Required",
      subtitle:
        "Please visit the Admission Office to have your documents verified and wait for the Admission Form Process. Your entrance examination schedule will only be issued after your documents have been successfully verified.",
    });
  }

  // Document Verification Schedule
  if (verifyDocSchedule) {
    reminders.push({
      dateBadge: verifyDocSchedule?.day_description,
      dateBadgeColor: "#8B0000",
      title: "Document Verification Schedule",
      subtitle: `${formatTime(
        verifyDocSchedule?.start_time
      )} – ${formatTime(
        verifyDocSchedule?.end_time
      )} • ${verifyDocSchedule?.building_description || "TBA"}, ${verifyDocSchedule?.room_description || "TBA"
        }`,
    });
  }

  // Entrance Examination Schedule
  if (hasSchedule) {
    reminders.push({
      dateBadge: proctor?.day_description,
      dateBadgeColor: "#1976d2",
      title: "Entrance Examination Schedule",
      subtitle: `${formatTime(
        proctor?.start_time
      )} – ${formatTime(
        proctor?.end_time
      )} • ${proctor?.building_description || "TBA"}, ${proctor?.room_description || "TBA"
        }`,
    });
  }

  // Qualifying / Interview Schedule
  if (interviewSchedule) {
    reminders.push({
      dateBadge: interviewSchedule?.day_description,
      dateBadgeColor: "#f5a623",
      title: "Qualifying / Interview Schedule",
      subtitle: `${formatTime(
        interviewSchedule?.start_time
      )} – ${formatTime(
        interviewSchedule?.end_time
      )} • ${interviewSchedule?.building_description || "TBA"}, ${interviewSchedule?.room_description || "TBA"
        }`,
    });
  }

  // No reminders
  if (reminders.length === 0) {
    reminders.push({
      icon: <CheckCircleIcon sx={{ color: "#fff", fontSize: 32 }} />,
      iconBg: "#2e7d32",
      title: "You're All Caught Up",
      subtitle: "There are no pending reminders at the moment.",
    });
  }


  useEffect(() => {
    const socket = createAppSocket();
    socket.on("schedule_updated", () => {
      if (applicantNumber) fetchVerifyDocumentSchedule(applicantNumber);
    });
    return () => socket.disconnect();
  }, [applicantNumber]);

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
        minHeight: "calc(100vh - 100px)",
        width: "100%",
        backgroundColor: "transparent",
        overflowY: "auto",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <Box
        sx={{
          mx: { xs: 1.5, md: 3 },
          mt: { xs: 1.5, md: 2.5 },
        }}
      >
        <Grid container spacing={{ xs: 2, sm: 3 }}>

          {/* ── HEADER ─────────────────────────────────────────────────────── */}
          {/* DESKTOP: original colored banner */}
          {!isMobile && (
            <Grid item xs={12}>
              <Box
                sx={{
                  width: "100%",
                  borderRadius: "12px",
                  overflow: "hidden",
                  backgroundColor: headerColor,
                  color: "#fff",
                  border: `2px solid ${borderColor}`,
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    px: 4,
                    py: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                      position="relative"
                      onMouseEnter={() => setHovered(true)}
                      onMouseLeave={() => setHovered(false)}
                      sx={{ display: "inline-flex" }}
                    >
                      <Avatar
                        src={profileImage || `${API_BASE_URL}/uploads/Applicant1by1/${person?.profile_img}`}
                        alt={person?.fname || "Applicant"}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{ width: 70, height: 70, border: "2px solid white", bgcolor: "rgba(255,255,255,0.15)", cursor: "pointer", color: "white" }}
                      >
                        {person?.fname?.[0]}
                      </Avatar>
                      {hovered && (
                        <IconButton
                          size="small"
                          onClick={() => fileInputRef.current?.click()}
                          sx={{ position: "absolute", bottom: -4, right: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", backgroundColor: "#ffffff", border: `2px solid ${borderColor}`, width: 30, height: 30, "&:hover": { backgroundColor: "#f5f5f5" } }}
                        >
                          <AddCircleIcon sx={{ color: headerColor, fontSize: 24 }} />
                        </IconButton>
                      )}
                      <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: "32px", fontWeight: 800, lineHeight: 1.1, color: "white" }}>
                        Welcome Back!{" "}
                        {person ? `${person.last_name}, ${person.first_name} ${person.middle_name || ""} ${person.extension || ""}` : ""}
                      </Typography>
                      <Typography sx={{ fontSize: "22px", letterSpacing: 0, opacity: 0.9, color: "white", mt: 0.5 }}>
                        <Box component="span" sx={{ fontWeight: 700 }}>Applicant ID:</Box>{" "}
                        {applicantID || "N/A"}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                {/* info strip — Academic Year / Program Applied / Date Applied / Application Status */}
                <Box
                  sx={{
                    backgroundColor: "lightgray",
                    borderTop: "1px solid rgba(255,255,255,0.2)",
                    px: { xs: 2, md: 4 },
                    py: 1.5,
                    display: "flex",
                    flexWrap: "wrap",
                    rowGap: 1.5,
                  }}
                >
                  {infoItems.map(([label, value], idx) => (
                    <Box
                      key={label}
                      sx={{
                        px: 2,
                        textAlign: "center",
                        borderRight: "1px solid rgba(0,0,0,0.2)",   // ← always on, no idx check
                        "&:first-of-type": { pl: 0 },
                      }}
                    >
                      <Typography sx={{ fontSize: 10.5, opacity: 0.75, color: "#000", letterSpacing: "0.05em" }}>
                        {label}
                      </Typography>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#000", whiteSpace: "nowrap" }}>
                        {value}
                      </Typography>
                    </Box>
                  ))}

                  {/* STATUS — last item, no border-right */}
                  <Box sx={{ px: 2 }}>
                    <Typography sx={{ fontSize: 10.5, opacity: 0.75, letterSpacing: "0.05em", color: "#000" }}>
                      APPLICATION STATUS
                    </Typography>
                    <Chip
                      label={overallStatusLabel}
                      size="small"
                      sx={{ backgroundColor: overallStatusColor, color: "#000", fontWeight: 700, fontSize: 11.5 }}
                    />
                  </Box>
                </Box>
              </Box>
            </Grid>
          )}

          {/* MOBILE: same web header design */}
          {isMobile && (
            <Grid item xs={12}>
              <Box
                sx={{
                  width: "100%",
                  borderRadius: "12px",
                  overflow: "hidden",
                  backgroundColor: headerColor,
                  color: "#fff",
                  border: `2px solid ${borderColor}`,
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                  }}
                >
                  {/* TOP ROW */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    {/* LEFT SIDE */}
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box
                        position="relative"
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}
                        sx={{ display: "inline-flex" }}
                      >
                        <Avatar
                          src={
                            profileImage ||
                            `${API_BASE_URL}/uploads/Applicant1by1/${person?.profile_img}`
                          }
                          alt={person?.fname || "Applicant"}
                          onClick={() => fileInputRef.current?.click()}
                          sx={{
                            width: 60,
                            height: 60,
                            border: "2px solid white",
                            bgcolor: "rgba(255,255,255,0.15)",
                            cursor: "pointer",
                            color: "white",
                          }}
                        >
                          {person?.fname?.[0]}
                        </Avatar>

                        {hovered && (
                          <IconButton
                            size="small"
                            onClick={() => fileInputRef.current?.click()}
                            sx={{
                              position: "absolute",
                              bottom: -4,
                              right: 0,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "50%",
                              backgroundColor: "#ffffff",
                              border: `2px solid ${borderColor}`,
                              width: 28,
                              height: 28,
                              "&:hover": {
                                backgroundColor: "#f5f5f5",
                              },
                            }}
                          >
                            <AddCircleIcon
                              sx={{
                                color: headerColor,
                                fontSize: 22,
                              }}
                            />
                          </IconButton>
                        )}

                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          style={{ display: "none" }}
                          onChange={handleFileChange}
                        />
                      </Box>

                      {/* NAME + ID */}
                      <Box>
                        <Typography
                          sx={{
                            fontSize: "18px",
                            fontWeight: 800,
                            lineHeight: 1.2,
                            color: "white",
                          }}
                        >
                          Welcome Back!
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "white",
                            mt: 0.3,
                            lineHeight: 1.3,
                          }}
                        >
                          {person
                            ? `${person.last_name}, ${person.first_name} ${person.middle_name || ""} ${person.extension || ""}`
                            : ""}
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: "13px",
                            opacity: 0.9,
                            color: "white",
                            mt: 0.4,
                          }}
                        >
                          <Box component="span" sx={{ fontWeight: 700 }}>
                            Applicant ID:
                          </Box>{" "}
                          {applicantID || "N/A"}
                        </Typography>
                      </Box>
                    </Stack>

                    {/* DATE/TIME */}

                  </Box>

                  {/* info strip (mobile) */}
                  <Box
                    sx={{
                      backgroundColor: "lightgray",
                      borderTop: "1px solid rgba(255,255,255,0.2)",
                      px: { xs: 2, md: 4 },
                      py: 1.5,
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "center",   // ← add this
                      rowGap: 1.5,
                    }}
                  >
                    {infoItems.map(([label, value], idx) => (
                      <Box
                        key={label}
                        sx={{
                          px: 2,
                          borderRight: "1px solid rgba(0,0,0,0.2)",   // ← always on, no idx check
                          "&:first-of-type": { pl: 0 },
                        }}
                      >
                        <Typography sx={{ fontSize: 10.5, opacity: 0.75, color: "#000", letterSpacing: "0.05em" }}>
                          {label}
                        </Typography>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#000", whiteSpace: "nowrap" }}>
                          {value}
                        </Typography>
                      </Box>
                    ))}

                    {/* STATUS — last item, no border-right */}
                    <Box sx={{ px: 2 }}>
                      <Typography sx={{ fontSize: 10.5, opacity: 0.75, letterSpacing: "0.05em", color: "#000" }}>
                        APPLICATION STATUS
                      </Typography>
                      <Chip
                        label={overallStatusLabel}
                        size="small"
                        sx={{ backgroundColor: overallStatusColor, color: "#000", fontWeight: 700, fontSize: 11.5 }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Grid>
          )}

          {/* ── ACTION ROW (Application Progress card replaces the old Start/Upload cards) ─── */}
          {/* DESKTOP */}
          {!isMobile && (
            <Grid container spacing={2} justifyContent="left" mt={2}>
              <Grid item>
                <Grid container direction="column" spacing={2}>
                  <Grid item>
                    <Card
                      sx={{
                        borderRadius: "14px",
                        boxShadow: 3,
                        border: `2px solid ${borderColor}`,
                        width: 580,
                        marginLeft: "25px",
                        backgroundColor: "#fff",
                      }}
                    >
                      <CardContent>
                        <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#222", mb: 1.5 }}>
                          Application Progress
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: "#999", mb: 1 }}>Overall Completion</Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, flexWrap: "wrap" }}>
                          <ProgressRing percentage={progressPercentage} color={mainButtonColor} />
                          <Stack spacing={0.6} sx={{ flex: 1, minWidth: 240 }}>
                            {progressChecklist.map((item, idx) => {
                              const state = item.done ? "done" : idx === firstPendingIndex ? "current" : "upcoming";
                              return (
                                <Box key={item.label} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <StatusDot state={state} />
                                    <Typography sx={{ fontSize: 12, color: "#333" }}>{item.label}</Typography>
                                  </Stack>
                                  <Typography
                                    sx={{
                                      fontSize: 10.5,
                                      fontWeight: 700,
                                      color: state === "done" ? "#2e7d32" : state === "current" ? "#f5a623" : "#aaa",
                                    }}
                                  >
                                    {state === "done" ? "Completed" : "Pending"}
                                  </Typography>
                                </Box>
                              );
                            })}
                          </Stack>
                        </Box>
                        <Typography sx={{ fontSize: 11.5, color: "#888", mt: 1.5, fontStyle: "italic" }}>
                          {progressPercentage === 100 ? "All done! Congratulations." : "Keep going! You're doing great."}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 2, marginLeft: "25px", transition: "transform 0.2s ease", boxShadow: 3, "&:hover": { transform: "scale(1.03)" }, height: "90px", borderRadius: "10px", backgroundColor: "#fffaf5", border: `2px solid ${borderColor}`, boxShadow: "0px 2px 8px rgba(0,0,0,0.05)", width: "580px" }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: mainButtonColor, borderRadius: "8px", width: 50, height: 50, flexShrink: 0 }}>
                        <WarningAmberIcon sx={{ color: "white", fontSize: 35 }} />
                      </Box>
                      <Typography sx={{ fontSize: "15px", fontFamily: "Arial", fontWeight: "bold", color: "maroon" }}>
                        <span>Notice:&nbsp;</span>
                        <Typography component="span" sx={{ fontSize: "inherit", fontWeight: "inherit" }}>
                          {allRequirementsCompleted ? "Your application is registered." : "Please complete all required documents to register your application."}
                        </Typography>
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Grid>

              {/* Desktop: Announcements */}
              <Grid item xs="auto">
                <Card
                  sx={{
                    borderRadius: "14px",
                    marginLeft: "10px",
                    boxShadow: 3,
                    width: "510px",
                    height: "405px",
                    display: "flex",
                    border: `2px solid ${borderColor}`,
                    flexDirection: "column",
                    overflow: "hidden",
                    transition: "all 0.3s ease",
                    background: "#fff",
                    "&:hover": {
                      transform: "scale(1.02)",
                      boxShadow: 6,
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      p: 0,
                      display: "flex",
                      flexDirection: "column",
                      height: "100%",
                    }}
                  >
                    {/* HEADER */}
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      sx={{
                        px: 2,
                        py: 1.5,
                        backgroundColor: headerColor,
                        color: "#fff",
                        borderBottom: `2px solid ${borderColor}`,
                      }}
                    >
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: "10px",
                          background: "rgba(255,255,255,0.18)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backdropFilter: "blur(6px)",
                        }}
                      >
                        <Campaign sx={{ color: "#fff", fontSize: 24 }} />
                      </Box>

                      <Typography
                        sx={{
                          fontSize: 18,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          color: "#fff",
                        }}
                      >
                        Announcements
                      </Typography>
                    </Stack>

                    {/* CONTENT */}
                    <Box
                      sx={{
                        flex: 1,
                        overflowY: "auto",
                        px: 2,
                        py: 2,
                      }}
                    >
                      {announcements.length === 0 ? (
                        <Box
                          sx={{
                            height: "100%",
                            borderRadius: "12px",
                            border: `1px dashed ${borderColor}`,
                            display: "grid",
                            placeItems: "center",
                            color: "text.secondary",
                          }}
                        >
                          No active announcements.
                        </Box>
                      ) : (
                        <Stack spacing={2}>
                          {Array.isArray(announcements) &&
                            announcements.map((a) => (
                              <Box
                                key={a.id}
                                sx={{
                                  borderRadius: "14px",
                                  overflow: "hidden",
                                  border: `2px solid ${borderColor}`,
                                  background: "#fff",
                                  transition: "all 0.3s ease",
                                  cursor: "pointer",
                                  "&:hover": {
                                    transform: "translateY(-2px)",
                                    boxShadow: 4,
                                  },
                                }}
                              >
                                {/* IMAGE */}
                                {a.file_path && (
                                  <Box
                                    sx={{
                                      width: "100%",
                                      height: 190,
                                      overflow: "hidden",
                                      position: "relative",
                                    }}
                                    onClick={() =>
                                      openLightbox(announcements.indexOf(a))
                                    }
                                  >
                                    <Box
                                      component="img"
                                      src={`${API_BASE_URL}/uploads/announcement/${a.file_path}`}
                                      alt={a.title}
                                      sx={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        transition: "transform 0.35s ease",
                                        "&:hover": {
                                          transform: "scale(1.05)",
                                        },
                                      }}
                                    />

                                    {/* OVERLAY */}
                                    <Box
                                      sx={{
                                        position: "absolute",
                                        inset: 0,
                                        background:
                                          "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.05))",
                                      }}
                                    />

                                    {/* ZOOM ICON */}
                                    <Box
                                      sx={{
                                        position: "absolute",
                                        top: 10,
                                        right: 10,
                                        background: "rgba(0,0,0,0.45)",
                                        borderRadius: "50%",
                                        p: 0.8,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backdropFilter: "blur(4px)",
                                      }}
                                    >
                                      <ZoomInIcon
                                        sx={{
                                          color: "#fff",
                                          fontSize: 18,
                                        }}
                                      />
                                    </Box>

                                    {/* TITLE OVERLAY */}
                                    <Box
                                      sx={{
                                        position: "absolute",
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        p: 1.5,
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          color: "#fff",
                                          fontWeight: 700,
                                          fontSize: 15,
                                          lineHeight: 1.3,
                                        }}
                                      >
                                        {a.title}
                                      </Typography>
                                    </Box>
                                  </Box>
                                )}

                                {/* DETAILS */}
                                <Box
                                  sx={{
                                    p: 1.8,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: 13,
                                      color: "#555",
                                      lineHeight: 1.6,
                                      display: "-webkit-box",
                                      WebkitLineClamp: 3,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {a.content}
                                  </Typography>

                                  <Typography
                                    variant="caption"
                                    sx={{
                                      display: "block",
                                      mt: 1.2,
                                      color: "#999",
                                      fontSize: 11,
                                    }}
                                  >
                                    Expires:{" "}
                                    {new Date(a.expires_at).toLocaleDateString(
                                      "en-US"
                                    )}
                                  </Typography>
                                </Box>
                              </Box>
                            ))}
                        </Stack>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Desktop: Calendar */}
              <Grid item xs="auto">
                <Card sx={{ marginLeft: "10px", boxShadow: 3, p: 2, border: `2px solid ${borderColor}`, borderRadius: "10px", width: "425px", height: "406px", transition: "transform 0.2s ease", "&:hover": { transform: "scale(1.03)" }, display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "center" }}>
                  <CardContent sx={{ p: 0, width: "100%" }}>
                    <Grid container alignItems="center" justifyContent="space-between" sx={{ backgroundColor: headerColor, color: "white", border: `2px solid ${borderColor}`, borderBottom: "none", borderRadius: "8px 8px 0 0", padding: "10px 8px" }}>
                      <Grid item><IconButton size="small" onClick={handlePrevMonth} sx={{ color: "white" }}><ArrowBackIos fontSize="small" /></IconButton></Grid>
                      <Grid item><Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>{date.toLocaleString("default", { month: "long" })} {year}</Typography></Grid>
                      <Grid item><IconButton size="small" onClick={handleNextMonth} sx={{ color: "white" }}><ArrowForwardIos fontSize="small" /></IconButton></Grid>
                    </Grid>
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderLeft: `2px solid ${borderColor}`, borderRight: `2px solid ${borderColor}`, borderBottom: `2px solid ${borderColor}`, borderTop: `2px solid ${borderColor}`, borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
                      {days.map((day, idx) => (
                        <Box key={idx} sx={{ backgroundColor: "#f3f3f3", textAlign: "center", py: 1, fontWeight: "bold", borderBottom: `1px solid ${borderColor}` }}>{day}</Box>
                      ))}
                      {weeks.map((week, i) =>
                        week.map((day, j) => {
                          if (!day) return <Box key={`${i}-${j}`} sx={{ height: 45, backgroundColor: "#fff" }} />;
                          const isToday = day === today && month === thisMonth && year === thisYear;
                          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                          const isHoliday = holidays[dateKey];
                          const dayCell = (
                            <Box sx={{ height: 45, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", backgroundColor: isToday ? headerColor : isHoliday ? "#E8C999" : "#fff", color: isToday ? "white" : "black", fontWeight: isHoliday ? "bold" : "500", cursor: isHoliday ? "pointer" : "default", "&:hover": { backgroundColor: isHoliday ? "#F5DFA6" : "#000", color: isHoliday ? "black" : "white" } }}>
                              {day}
                            </Box>
                          );
                          return isHoliday ? (
                            <Tooltip key={`${i}-${j}`} title={<><Typography fontWeight="bold">{isHoliday.localName}</Typography><Typography variant="caption">{isHoliday.date}</Typography></>} arrow placement="top">{dayCell}</Tooltip>
                          ) : (
                            <React.Fragment key={`${i}-${j}`}>{dayCell}</React.Fragment>
                          );
                        })
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* MOBILE: clean fluid grid layout */}
          {isMobile && (
            <Grid item xs={12}>
              <Grid container spacing={2}>
                {/* Application Progress (replaces Application Form / Upload Requirements cards) */}
                <Grid item xs={12}>
                  <Card sx={{ borderRadius: "14px", boxShadow: 3, border: `2px solid ${borderColor}`, backgroundColor: "#fff" }}>
                    <CardContent>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#222", mb: 1.5 }}>
                        Application Progress
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: "#999", mb: 1 }}>Overall Completion</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                        <ProgressRing percentage={progressPercentage} color={mainButtonColor} size={160} />
                        <Stack spacing={0.6} sx={{ flex: 1, minWidth: 160 }}>
                          {progressChecklist.map((item, idx) => {
                            const state = item.done ? "done" : idx === firstPendingIndex ? "current" : "upcoming";
                            return (
                              <Box key={item.label} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <StatusDot state={state} />
                                  <Typography sx={{ fontSize: 11.5, color: "#333" }}>{item.label}</Typography>
                                </Stack>
                                <Typography
                                  sx={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: state === "done" ? "#2e7d32" : state === "current" ? "#f5a623" : "#aaa",
                                  }}
                                >
                                  {state === "done" ? "Completed" : "Pending"}
                                </Typography>
                              </Box>
                            );
                          })}
                        </Stack>
                      </Box>
                      <Typography sx={{ fontSize: 11, color: "#888", mt: 1.5, fontStyle: "italic" }}>
                        {progressPercentage === 100 ? "All done! Congratulations." : "Keep going! You're doing great."}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Notice */}
                <Grid item xs={12}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, boxShadow: 3, borderRadius: "10px", backgroundColor: "#fffaf5", border: `2px solid ${borderColor}`, minHeight: 70 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: mainButtonColor, borderRadius: "8px", width: 44, height: 44, flexShrink: 0 }}>
                      <WarningAmberIcon sx={{ color: "white", fontSize: 28 }} />
                    </Box>
                    <Typography sx={{ fontSize: "12px", fontFamily: "Arial", fontWeight: "bold", color: "maroon" }}>
                      <span>Notice: </span>
                      <Typography component="span" sx={{ fontSize: "inherit", fontWeight: "inherit" }}>
                        {allRequirementsCompleted ? "Your application is registered." : "Please complete all required documents to register your application."}
                      </Typography>
                    </Typography>
                  </Box>
                </Grid>

                {/* Mobile: Announcements */}
                <Grid item xs={12}>
                  <Card
                    sx={{
                      boxShadow: 3,
                      border: `2px solid ${borderColor}`,
                      borderRadius: "14px",
                      width: "100%",
                      overflow: "hidden",
                      transition: "all 0.3s ease",
                      background: "#fff",
                      "&:hover": {
                        transform: "scale(1.02)",
                        boxShadow: 6,
                      },
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <CardContent
                      sx={{
                        p: 0,
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                      }}
                    >
                      {/* HEADER */}
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        sx={{
                          px: 2,
                          py: 1.5,
                          backgroundColor: headerColor,
                          color: "#fff",
                          borderBottom: `2px solid ${borderColor}`,
                        }}
                      >
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: "10px",
                            background: "rgba(255,255,255,0.18)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backdropFilter: "blur(6px)",
                          }}
                        >
                          <Campaign sx={{ color: "#fff", fontSize: 22 }} />
                        </Box>

                        <Typography
                          sx={{
                            fontSize: 17,
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            color: "#fff",
                          }}
                        >
                          Announcements
                        </Typography>
                      </Stack>

                      {/* IMAGE AREA */}
                      <Box
                        sx={{
                          px: 2,
                          pt: 2,
                          pb: 1,
                        }}
                      >
                        {announcements.length > 0 ? (
                          <>
                            <Box
                              sx={{
                                width: "100%",
                                height: 220,
                                borderRadius: "12px",
                                overflow: "hidden",
                                cursor: "pointer",
                                border: `2px solid ${borderColor}`,
                                position: "relative",
                              }}
                              onClick={() => openLightbox(0)}
                            >
                              <Box
                                component="img"
                                src={`${API_BASE_URL}/uploads/Announcement/${announcements[0].file_path}`}
                                alt={announcements[0].title}
                                sx={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  transition: "transform 0.35s ease",
                                  "&:hover": {
                                    transform: "scale(1.05)",
                                  },
                                }}
                              />

                              {/* overlay */}
                              <Box
                                sx={{
                                  position: "absolute",
                                  inset: 0,
                                  background:
                                    "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0.05))",
                                }}
                              />

                              {/* title overlay */}
                              <Box
                                sx={{
                                  position: "absolute",
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  p: 1.5,
                                }}
                              >
                                <Typography
                                  sx={{
                                    color: "#fff",
                                    fontWeight: 700,
                                    fontSize: 14,
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {announcements[0].title}
                                </Typography>
                              </Box>
                            </Box>

                            {/* dots */}
                            <Stack
                              direction="row"
                              spacing={1}
                              justifyContent="center"
                              sx={{ py: 1.5 }}
                            >
                              {announcements.slice(0, 6).map((a, index) => (
                                <Box
                                  key={a.id || index}
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    bgcolor:
                                      index === 0
                                        ? headerColor
                                        : "#d1d1d1",
                                    transition: "all 0.2s ease",
                                  }}
                                />
                              ))}
                            </Stack>

                            {/* content */}
                            <Box
                              sx={{
                                px: 0.5,
                                pb: 1,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: 13,
                                  color: "#555",
                                  lineHeight: 1.5,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {announcements[0].content}
                              </Typography>

                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  mt: 1,
                                  color: "#999",
                                  fontSize: 11,
                                }}
                              >
                                Expires:{" "}
                                {new Date(
                                  announcements[0].expires_at
                                ).toLocaleDateString("en-US")}
                              </Typography>
                            </Box>
                          </>
                        ) : (
                          <Box
                            sx={{
                              height: 220,
                              borderRadius: "12px",
                              border: `1px dashed ${borderColor}`,
                              display: "grid",
                              placeItems: "center",
                              color: "text.secondary",
                              m: 2,
                            }}
                          >
                            No active announcements.
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                {/* Mobile: Calendar */}
                <Grid item xs={12}>
                  <Card
                    sx={{
                      boxShadow: 3,
                      p: 2,
                      border: `2px solid ${borderColor}`,
                      borderRadius: "10px",
                      width: "100%",
                      transition: "transform 0.2s ease",
                      "&:hover": { transform: "scale(1.03)" },
                      backgroundColor: "#fff",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <CardContent sx={{ p: 0, width: "100%" }}>
                      {/* Month header — own border, radius top only, no bottom border
          (so it visually joins the day-grid below it), just like desktop */}
                      <Grid
                        container
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                          backgroundColor: headerColor,
                          color: "white",
                          border: `2px solid ${borderColor}`,
                          borderBottom: "none",
                          borderRadius: "8px 8px 0 0",
                          padding: "10px 8px",
                        }}
                      >
                        <Grid item>
                          <IconButton size="small" onClick={handlePrevMonth} sx={{ color: "white" }}>
                            <ArrowBackIos fontSize="small" />
                          </IconButton>
                        </Grid>
                        <Grid item>
                          <Typography variant="subtitle1" sx={{ fontWeight: "bold", fontSize: "14px" }}>
                            {date.toLocaleString("default", { month: "long" })} {year}
                          </Typography>
                        </Grid>
                        <Grid item>
                          <IconButton size="small" onClick={handleNextMonth} sx={{ color: "white" }}>
                            <ArrowForwardIos fontSize="small" />
                          </IconButton>
                        </Grid>
                      </Grid>

                      {/* Day-name row + date grid — own border on the remaining 3 sides,
          radius bottom only, matching desktop's inner frame */}
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "repeat(7, 1fr)",
                          borderLeft: `2px solid ${borderColor}`,
                          borderRight: `2px solid ${borderColor}`,
                          borderBottom: `2px solid ${borderColor}`,
                          borderTop: `2px solid ${borderColor}`,
                          borderRadius: "0 0 8px 8px",
                          overflow: "hidden",
                        }}
                      >
                        {days.map((day, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              backgroundColor: "#f3f3f3",
                              textAlign: "center",
                              py: 1,
                              fontWeight: "bold",
                              borderBottom: `1px solid ${borderColor}`,
                              fontSize: "11px",
                            }}
                          >
                            {day}
                          </Box>
                        ))}
                        {weeks.map((week, i) =>
                          week.map((day, j) => {
                            if (!day) return <Box key={`${i}-${j}`} sx={{ height: 42, backgroundColor: "#fff" }} />;
                            const isToday = day === today && month === thisMonth && year === thisYear;
                            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                            const isHoliday = holidays[dateKey];
                            const dayCell = (
                              <Box
                                sx={{
                                  height: 42,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: "50%",
                                  backgroundColor: isToday ? headerColor : isHoliday ? "#E8C999" : "#fff",
                                  color: isToday ? "white" : "black",
                                  fontWeight: isHoliday ? "bold" : "500",
                                  cursor: isHoliday ? "pointer" : "default",
                                  fontSize: "12px",
                                  "&:hover": { backgroundColor: isHoliday ? "#F5DFA6" : "#000", color: isHoliday ? "black" : "white" },
                                }}
                              >
                                {day}
                              </Box>
                            );
                            return isHoliday ? (
                              <Tooltip
                                key={`${i}-${j}`}
                                title={
                                  <>
                                    <Typography fontWeight="bold">{isHoliday.localName}</Typography>
                                    <Typography variant="caption">{isHoliday.date}</Typography>
                                  </>
                                }
                                arrow
                                placement="top"
                              >
                                {dayCell}
                              </Tooltip>
                            ) : (
                              <React.Fragment key={`${i}-${j}`}>{dayCell}</React.Fragment>
                            );
                          })
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          )}

          {/* ── APPLICATION SNAPSHOT (Details / Requirements / Reminders / Need Help) ──── */}
          <Grid item xs={12}>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {/* Application Details */}
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    borderRadius: "14px",
                    boxShadow: 3,
                    border: `2px solid ${borderColor}`,
                    height: "100%",
                    backgroundColor: "#fff",
                    transition: "transform 0.2s ease",
                    "&:hover": { transform: "scale(1.02)" },
                  }}
                >
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                      <DescriptionIcon sx={{ color: mainButtonColor, fontSize: 32 }} />
                      <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#222" }}>Application Details</Typography>
                    </Stack>
                    <Stack divider={<Divider sx={{ my: 0.6 }} />} spacing={0.6}>
                      {applicationDetails.map((row) => (
                        <Box key={row.label} sx={{ display: "flex", justifyContent: "space-between", py: 0.4 }}>
                          <Typography sx={{ fontSize: 12, color: "#888" }}>{row.label}</Typography>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#222", textAlign: "right" }}>
                            {row.value}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      onClick={() => {
                        let keys = JSON.parse(localStorage.getItem("dashboardKeys"));
                        if (!keys) {
                          const g = () => Math.random().toString(36).substring(2, 10);
                          keys = {
                            step1: g(),
                            step2: g(),
                            step3: g(),
                            step4: g(),
                            step5: g(),
                          };
                          localStorage.setItem("dashboardKeys", JSON.stringify(keys));
                        }
                        window.location.href = `/applicant_personal_information/${keys.step1}`;
                      }}
                      sx={{ mt: 2, textTransform: "none", fontWeight: 700, borderRadius: "8px" }}
                    >
                      View / Edit Profile
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              {/* Requirements Status */}
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    borderRadius: "14px",
                    boxShadow: 3,
                    border: `2px solid ${borderColor}`,
                    height: "100%",
                    backgroundColor: "#fff",
                    transition: "transform 0.2s ease",
                    "&:hover": { transform: "scale(1.02)" },
                  }}
                >
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                      <CloudUploadIcon sx={{ color: mainButtonColor, fontSize: 32 }} />
                      <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#222" }}>Requirements Status</Typography>
                    </Stack>
                    <Stack divider={<Divider sx={{ my: 0.6 }} />} spacing={0.6}>
                      {[
                        ["Total Requirements", reqStats.total],
                        ["Submitted", reqStats.submitted],
                        ["Pending", reqStats.pending],
                        ["For Verification", reqStats.forVerification],
                      ].map(([label, value]) => (
                        <Box key={label} sx={{ display: "flex", justifyContent: "space-between", py: 0.4 }}>
                          <Typography sx={{ fontSize: 12, color: "#888" }}>{label}</Typography>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#222" }}>{value}</Typography>
                        </Box>
                      ))}
                    </Stack>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => (window.location.href = "/applicant_online_requirements")}
                      sx={{ mt: 2, backgroundColor: mainButtonColor, textTransform: "none", fontWeight: 700, borderRadius: "8px", "&:hover": { backgroundColor: mainButtonColor } }}
                    >
                      Upload Requirements
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              {/* Important Reminders — schedule entries show the 50x50 calendar date-badge */}
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    borderRadius: "14px",
                    boxShadow: 3,
                    border: `2px solid ${borderColor}`,
                    height: "100%",
                    backgroundColor: "#fff",
                    transition: "transform 0.2s ease",
                    "&:hover": { transform: "scale(1.02)" },
                  }}
                >
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                      <Campaign sx={{ color: mainButtonColor, fontSize: 32 }} />
                      <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#222" }}>Important Reminders</Typography>
                    </Stack>
                    <Stack divider={<Divider sx={{ my: 1 }} />} spacing={1}>
                      {reminders.map((r, idx) => (
                        <Stack key={idx} direction="row" spacing={1.5} alignItems="flex-start">
                          {r.dateBadge ? (
                            <DateBadge dateString={r.dateBadge} color={r.dateBadgeColor} />
                          ) : (
                            <Box
                              sx={{
                                width: 50,
                                height: 50,
                                borderRadius: "8px",
                                backgroundColor: r.iconBg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {r.icon}
                            </Box>
                          )}
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#222", lineHeight: 1.35 }}>{r.title}</Typography>
                            <Typography sx={{ fontSize: 11, color: "#888", lineHeight: 1.35 }}>{r.subtitle}</Typography>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => (announcements.length ? openLightbox(0) : null)}
                      sx={{ mt: 2, borderColor: mainButtonColor, color: mainButtonColor, textTransform: "none", fontWeight: 700, borderRadius: "8px" }}
                    >
                      View All Announcements
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              {/* Need Help? */}
              {/* Need Help? */}
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    borderRadius: "14px",
                    boxShadow: 3,
                    border: `2px solid ${borderColor}`,
                    height: "100%",
                    backgroundColor: "#fff",
                    transition: "transform 0.2s ease",
                    "&:hover": { transform: "scale(1.02)" },
                  }}
                >
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                      <HeadsetMicIcon sx={{ color: mainButtonColor, fontSize: 32 }} />
                      <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#222" }}>Need Help?</Typography>
                    </Stack>

                    <Stack divider={<Divider sx={{ my: 1 }} />} spacing={1}>
                      {[
                        ...(admissionContact?.contact_number
                          ? [{
                            icon: <PhoneIcon sx={{ color: "#fff", fontSize: 34 }} />,
                            iconBg: mainButtonColor,
                            title: "Admissions Office",
                            subtitle: admissionContact.contact_number,
                          }]
                          : []),
                        ...(admissionContact?.email
                          ? [{
                            icon: <EmailIcon sx={{ color: "#fff", fontSize: 34 }} />,
                            iconBg: "#c62828",
                            title: "Email",
                            subtitle: admissionContact.email,
                            link: buildGmailComposeUrl(admissionContact.email),
                          }]
                          : []),
                        ...(admissionContact?.office_days_start && admissionContact?.office_days_end && admissionContact?.office_time_start && admissionContact?.office_time_end
                          ? [{
                            icon: <AccessTimeIcon sx={{ color: "#fff", fontSize: 34 }} />,
                            iconBg: "#f5a623",
                            title: "Office Hours",
                            subtitle: `${admissionContact.office_days_start} – ${admissionContact.office_days_end} • ${formatContactTime(
                              admissionContact.office_time_start
                            )} – ${formatContactTime(admissionContact.office_time_end)}`,
                          }]
                          : []),
                        ...(admissionContact?.facebook_url
                          ? [{
                            icon: <FacebookIcon sx={{ color: "#fff", fontSize: 34 }} />,
                            iconBg: "#1877F2",
                            title: "Facebook",
                            subtitle: admissionContact.facebook_url,
                            link: admissionContact.facebook_url,
                          }]
                          : []),
                      ].map((r, idx) => (
                        <Stack key={idx} direction="row" spacing={1.5} alignItems="flex-start">
                          <Box
                            sx={{
                              width: 50,
                              height: 50,
                              borderRadius: "8px",
                              backgroundColor: r.iconBg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {r.icon}
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#222", lineHeight: 1.35 }}>
                              {r.title}
                            </Typography>
                            {r.link ? (
                              <Typography
                                component="a"
                                href={r.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{
                                  fontSize: 11,
                                  color: mainButtonColor,
                                  lineHeight: 1.35,
                                  textDecoration: "none",
                                  wordBreak: "break-all",
                                  "&:hover": { textDecoration: "underline" },
                                }}
                              >
                                {r.subtitle}
                              </Typography>
                            ) : (
                              <Typography sx={{ fontSize: 11, color: "#888", lineHeight: 1.35 }}>{r.subtitle}</Typography>
                            )}
                          </Box>
                        </Stack>
                      ))}
                    </Stack>


                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* ── LIGHTBOX (shared) ─────────────────────────────────────────── */}
          <AnimatePresence>
            {lightboxOpen && announcements[lightboxIndex] && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={closeLightbox}
                style={{
                  position: "fixed", inset: 0, zIndex: 9999,
                  background: "rgba(0,0,0,0.92)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {/* Prev */}
                <IconButton
                  onClick={e => { e.stopPropagation(); lightboxPrev(); }}
                  sx={{
                    position: "fixed", left: { xs: 4, sm: 16 }, top: "50%", transform: "translateY(-50%)",
                    zIndex: 10000, width: 44, height: 44, p: 0,
                    background: "rgba(255,255,255,0.15)", color: "#fff",
                    "&:hover": { background: "rgba(255,255,255,0.3)" },
                  }}
                >
                  <ArrowBackIosNewIcon sx={{ fontSize: 18 }} />
                </IconButton>

                {/* Next */}
                <IconButton
                  onClick={e => { e.stopPropagation(); lightboxNext(); }}
                  sx={{
                    position: "fixed", right: { xs: 4, sm: 16 }, top: "50%", transform: "translateY(-50%)",
                    zIndex: 10000, width: 44, height: 44, p: 0,
                    background: "rgba(255,255,255,0.15)", color: "#fff",
                    "&:hover": { background: "rgba(255,255,255,0.3)" },
                  }}
                >
                  <ArrowForwardIosIcon sx={{ fontSize: 18 }} />
                </IconButton>

                {/* Main card */}
                <motion.div
                  key={announcements[lightboxIndex].id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  onClick={e => e.stopPropagation()}
                  style={{
                    display: "flex",
                    flexDirection: window.innerWidth <= 768 ? "column" : "row",
                    width: window.innerWidth <= 768 ? "92vw" : "80vw",
                    maxWidth: "1200px",
                    maxHeight: window.innerWidth <= 768 ? "88vh" : "82vh",
                    borderRadius: "16px",
                    overflow: "hidden",
                    background: "#111",
                  }}
                >
                  {/* LEFT — image */}
                  {announcements[lightboxIndex].file_path && (
                    <div style={{
                      flex: window.innerWidth <= 768 ? "0 0 auto" : "0 0 60%",
                      width: window.innerWidth <= 768 ? "100%" : "60%",
                      maxHeight: window.innerWidth <= 768 ? "45vh" : "82vh",
                      background: "#000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}>
                      <AnimatePresence mode="wait">
                        <motion.img
                          key={announcements[lightboxIndex].id}
                          src={`${API_BASE_URL}/uploads/announcement/${announcements[lightboxIndex].file_path}`}
                          alt={announcements[lightboxIndex].title}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            display: "block",
                            userSelect: "none",
                          }}
                          draggable={false}
                        />
                      </AnimatePresence>
                    </div>
                  )}

                  {/* RIGHT — details */}
                  <div style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
                    padding: window.innerWidth <= 768 ? "20px 16px" : "32px 28px",
                    overflowY: "auto",
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgba(255,255,255,0.2) transparent",
                  }}>
                    {/* Close button — top left */}
                    <IconButton
                      onClick={e => { e.stopPropagation(); closeLightbox(); }}
                      sx={{
                        position: "fixed", top: 25, left: { xs: 4, sm: 16 }, zIndex: 10001,
                        width: 44, height: 44, p: 0,
                        background: "rgba(255,255,255,0.15)", color: "#fff",
                        "&:hover": { background: "rgba(220,50,50,0.75)" },
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>

                    {/* Title */}
                    <h2 style={{
                      margin: "0 0 4px",
                      color: "#fff",
                      fontSize: window.innerWidth <= 768 ? "16px" : "20px",
                      fontWeight: 700,
                      lineHeight: 1.4,
                    }}>
                      {announcements[lightboxIndex].title}
                    </h2>

                    {/* Divider */}
                    <div style={{
                      width: "40px", height: "3px",
                      background: "rgba(255,255,255,0.35)",
                      borderRadius: "2px",
                      margin: "10px 0 18px",
                    }} />

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <FormattedContent text={announcements[lightboxIndex].content} />
                    </div>

                    {/* Expiry */}
                    <p style={{
                      margin: "12px 0 0",
                      color: "rgba(255,255,255,0.45)",
                      fontSize: "11px",
                    }}>
                      Expires: {new Date(announcements[lightboxIndex].expires_at).toLocaleDateString("en-US")}
                    </p>

                    {/* Slide counter dots */}
                    {announcements.length > 1 && (
                      <div style={{
                        marginTop: "20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}>
                        {announcements.map((_, i) => (
                          <div
                            key={i}
                            onClick={e => { e.stopPropagation(); setLightboxIndex(i); }}
                            style={{
                              width: i === lightboxIndex ? 18 : 6,
                              height: 6,
                              borderRadius: 3,
                              background: i === lightboxIndex ? "#fff" : "rgba(255,255,255,0.3)",
                              transition: "all 0.3s",
                              cursor: "pointer",
                            }}
                          />
                        ))}
                        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginLeft: "4px" }}>
                          {lightboxIndex + 1} / {announcements.length}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── APPLICATION STATUS ─────────────────────────────────────────── */}
          <Grid item xs={12}>
            <Box sx={{ width: "100%", mt: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 2 }}>
                <Typography sx={{ fontSize: { xs: "22px", sm: "30px", md: "42px" }, fontWeight: "bold", color: "black", textAlign: "center" }}>
                  APPLICATION STATUS
                </Typography>
              </Box>

              {/* DESKTOP: original horizontal stepper + boxes */}
              {!isMobile && (
                <>
                  <Stepper
                    alternativeLabel
                    activeStep={activeStep}
                    sx={{
                      "& .MuiStepConnector-root": { top: "30px", left: "calc(-50% + 30px)", right: "calc(50% + 30px)" },
                      "& .MuiStepConnector-line": { borderColor: "#000", borderTopWidth: 3, borderRadius: 8 },
                    }}
                  >
                    {steps.map((label, index) => (
                      <Step key={index} completed={index < activeStep}>
                        <StepLabel
                          StepIconComponent={(stepProps) => {
                            const isActive = stepProps.active;
                            const isCompleted = stepProps.completed;
                            return (
                              <Box sx={{ width: 60, height: 60, borderRadius: "50%", backgroundColor: isActive || isCompleted ? mainButtonColor : "#E8C999", border: `2px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                                {React.cloneElement(stepIcons[index], { sx: { color: isActive || isCompleted ? "white" : mainButtonColor, fontSize: 30 } })}
                              </Box>
                            );
                          }}
                        >
                          <Typography sx={{ fontSize: "12px", fontWeight: "bold", color: "black", textAlign: "center" }}>{label}</Typography>
                        </StepLabel>
                      </Step>
                    ))}
                  </Stepper>

                  <Grid container justifyContent="space-between" sx={{ mt: 3, mb: 5 }}>
                    {steps.map((label, index) => (
                      <Grid item xs={2} key={index} sx={{ display: "flex", justifyContent: "center" }}>
                        <Box sx={{ height: 380, width: "100%", maxWidth: 230, border: `2px solid ${borderColor}`, borderRadius: 2, p: 2, overflowY: "auto", fontSize: "13px", backgroundColor: "#fff9ec", transition: "transform 0.2s ease", boxShadow: 3, "&:hover": { transform: "scale(1.03)" }, color: "maroon", fontWeight: "bold", lineHeight: 1.6 }}>
                          {renderStepDetail(index)}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}

              {/* MOBILE: vertical accordion stepper */}
              {isMobile && (
                <Box sx={{ px: 1, mb: 5 }}>
                  {steps.map((label, index) => {
                    const isActive = index === activeStep;
                    const isCompleted = index < activeStep;
                    const isExpanded = expandedStep === index;

                    return (
                      <Box key={index} sx={{ mb: 1.5 }}>
                        <Box
                          onClick={() => setExpandedStep(isExpanded ? -1 : index)}
                          sx={{
                            display: "flex", alignItems: "center", gap: 1.5, p: 1.5,
                            backgroundColor: isActive || isCompleted ? mainButtonColor : "#E8C999",
                            borderRadius: isExpanded ? "8px 8px 0 0" : "8px",
                            border: `2px solid ${borderColor}`,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            WebkitTapHighlightColor: "transparent",
                          }}
                        >
                          <Box sx={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {React.cloneElement(stepIcons[index], { sx: { color: isActive || isCompleted ? "white" : mainButtonColor, fontSize: 22 } })}
                          </Box>
                          <Typography sx={{ fontWeight: "bold", color: isActive || isCompleted ? "white" : "#555", fontSize: "13px", flex: 1 }}>{label}</Typography>
                          <Typography sx={{ color: isActive || isCompleted ? "white" : "#888", fontSize: "18px", lineHeight: 1 }}>
                            {isExpanded ? "▲" : "▼"}
                          </Typography>
                        </Box>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              style={{
                                overflow: "hidden",
                                backgroundColor: "#fff9ec",
                                border: `2px solid ${borderColor}`,
                                borderTop: "none",
                                borderRadius: "0 0 8px 8px",
                              }}
                            >
                              <Box sx={{ p: 2, fontSize: "13px" }}>{renderStepDetail(index)}</Box>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          </Grid>

        </Grid>
      </Box>

      {/* ── AGREEMENT MODAL ──────────────────────────────────────────────── */}
      <Dialog
        open={openAgreementModal}
        disableEscapeKeyDown
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            overflow: "hidden",
            mx: { xs: 1, sm: 2 },
            minWidth: { xs: "unset", sm: 420 },
            boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          },
        }}
      >
        <DialogTitle sx={{ bgcolor: mainButtonColor, color: "white", display: "flex", alignItems: "center", fontWeight: "bold", px: { xs: 2, sm: 3 }, py: 2 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <WarningAmberIcon sx={{ color: "white", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography fontWeight="bold" fontSize={{ xs: 14, sm: 16 }} color="white" lineHeight={1.2}>Important Notice Before Proceeding</Typography>
              <Typography fontSize={12} color="rgba(255,255,255,0.8)" lineHeight={1.2}>Please read carefully before continuing</Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: 2.5, pb: 1 }}>
          <Box sx={{ border: "1px solid #f5a623", borderRadius: "8px", p: 1.5, mb: 2, mt: 2, display: "flex", gap: 1, alignItems: "flex-start", backgroundColor: "#fffbf2" }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
            <Typography fontSize={12.5} color="#5d4037" lineHeight={1.5}>
              Failure to complete the required information or document uploads may <strong>delay the evaluation of your application</strong>.
            </Typography>
          </Box>
          <Typography sx={{ fontSize: "13.5px", color: "#333", lineHeight: 1.6 }}>
            Welcome to the <strong>{companyName}</strong> Applicant Dashboard. Before continuing, please make sure that you will:
          </Typography>
          <Box sx={{ mt: 1.5, pl: 1, display: "flex", flexDirection: "column", gap: 0.6 }}>
            {[
              "Fill out all required personal information.",
              <>Fields marked with <span style={{ color: "red" }}>*</span> (Asterisk) are required to fill up.</>,
              "Upload your 2 by 2 Formal Picture.",
              "Upload All Main Required Online Documents.",
              "Ensure that the information you provide is accurate and correct.",
              "Regularly check your Applicant Dashboard or Your provided Gmail Account for updates.",
            ].map((item, i) => (
              <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <Typography sx={{ fontSize: "13.5px", color: "#555", lineHeight: 1, mt: "4px" }}>•</Typography>
                <Typography sx={{ fontSize: "13.5px", color: "#333", lineHeight: 1.6 }}>{item}</Typography>
              </Box>
            ))}
          </Box>
          <Box component="label" htmlFor="agreementCheck" sx={{ display: "flex", alignItems: "center", gap: 1.5, border: "1.5px solid #cc3333", borderRadius: "4px", px: 1.5, py: 1.25, mt: 2.5, mb: 0.5, cursor: "pointer", "&:hover": { backgroundColor: "#fff5f5" }, transition: "background 0.15s" }}>
            <Checkbox id="agreementCheck" checked={agreeChecked} onChange={(e) => setAgreeChecked(e.target.checked)} sx={{ p: 0, color: "#cc3333", "&.Mui-checked": { color: "#cc3333" } }} size="small" />
            <Typography sx={{ fontSize: "13px", color: "#333", userSelect: "none" }}>
              I confirm that I will complete all required information and upload all required documents.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "center", px: 3, pb: 2.5, pt: 1, mt: 1 }}>
          <Button
            variant="contained"
            disabled={!agreeChecked}
            onClick={() => setOpenAgreementModal(false)}
            sx={{ backgroundColor: agreeChecked ? mainButtonColor : "#b0b8c8", color: "#fff", fontWeight: 600, fontSize: "14px", px: 4, py: 1.25, textTransform: "none", letterSpacing: "0.02em", boxShadow: "none", "&:hover": { backgroundColor: agreeChecked ? mainButtonColor : "#b0b8c8", boxShadow: "none" }, "&.Mui-disabled": { backgroundColor: "#b0b8c8", color: "#fff", opacity: 0.7 } }}
          >
            I Agree & Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApplicantDashboard;
