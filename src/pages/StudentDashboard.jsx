import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import "../styles/TempStyles.css";
import axios from "axios";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Avatar,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import SchoolIcon from "@mui/icons-material/School";
import PersonIcon from "@mui/icons-material/Person";
import EaristLogo from "../assets/EaristLogo.png";
import {
  AccountBalanceWallet,
  AssignmentTurnedIn,
  BadgeOutlined,
  Campaign,
  CalendarMonth,
  CreditCard,
  FactCheck,
  MenuBook,
  StarBorder,
  WarningAmber,
  ArrowBackIos,
  ArrowForwardIos,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import KeyboardBackspaceIcon from "@mui/icons-material/KeyboardBackspace";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import API_BASE_URL from "../apiConfig";
import { motion, AnimatePresence } from "framer-motion";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { FcPrint } from "react-icons/fc";

// Small blob-download helper (same pattern used in Search COR / CORExportingModule)
const downloadBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const StudentDashboard = ({ profileImage, setProfileImage }) => {
  const navigate = useNavigate();
  const settings = useContext(SettingsContext);

  const isMobile = useMediaQuery("(max-width:600px)");
  const isTablet = useMediaQuery("(max-width:960px)");

  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const titleColor = colors.title || "#000000";
  const subtitleColor = colors.subtitle || "#555555";
  const borderColor = colors.border || "#000000";
  const mainButtonColor = colors.mainButton || "#1976d2";
  const fetchedLogo = branding.logoUrl || EaristLogo;
  const companyName = branding.companyName || "";
  const shortTerm = branding.shortTerm || "";
  const campusAddress = branding.campusAddress || "";
  const headerColor = colors.header || "#1976d2";

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hovered, setHovered] = useState(false);
  const fileInputRef = useRef(null);
  const [personData, setPerson] = useState({
    student_number: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    profile_image: "",
    student_status: "",
    year_level_description: "",
  });
  const [studentDetails, setStudent] = useState({
    program_description: "",
    section_description: "",
    program_code: "",
    year_level: "",
  });
  const [sy, setActiveSY] = useState({
    current_year: "",
    next_year: "",
    semester_description: "",
  });
  const [courseCount, setCourseCount] = useState({
    initial_course: 0,
    passed_course: 0,
    failed_course: 0,
    inc_course: 0,
    dropped_course: 0,
  });
  const [studentAssessment, setStudentAssessment] = useState(null);
  const [studentAssessmentRows, setStudentAssessmentRows] = useState([]);
  const [isOfficiallyEnrolledForBalance, setIsOfficiallyEnrolledForBalance] =
    useState(null);
  const [isOfficiallyEnrolled, setIsOfficiallyEnrolled] = useState(null);
  const [honorStanding, setHonorStanding] = useState({
    title: null,
    standing: null,
    overallGwa: null,
    subjectCount: 0,
    loading: true,
    error: false,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [gwaPrintStatus, setGwaPrintStatus] = useState({
    overall: false,
    per_semester: false,
    loading: true,
  });

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/honors/gwa_printing_status`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) =>
        setGwaPrintStatus({
          overall: Boolean(res.data?.overall),
          per_semester: Boolean(res.data?.per_semester),
          loading: false,
        }),
      )
      .catch((err) => {
        console.error("Failed to fetch GWA printing status:", err);
        setGwaPrintStatus({
          overall: false,
          per_semester: false,
          loading: false,
        });
      });
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setUserRole(storedRole);
      setUserID(storedID);

      if (storedRole !== "student") {
        window.location.href = "/dashboard";
      } else {
        fetchPersonData(storedID);
        fetchStudentDetails(storedID);
        fetchActiveEnrollmentStatus(storedID);
        fetchTotalCourse(storedID);
        fetchStudentAssessment(storedID);
        fetchTermGwa(storedID);
        console.log("you are an student");
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const fetchPersonData = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setPerson(res.data);

      try {
        const honorRes = await axios.get(
          `${API_BASE_URL}/api/student/latin-honor-standing/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );

        setHonorStanding({
          title: honorRes.data?.latin_honor || null,
          standing: honorRes.data?.standing || null,
          overallGwa: honorRes.data?.overall_gwa || null,
          subjectCount: honorRes.data?.subject_count || 0,
          loading: false,
          error: false,
        });
      } catch (error) {
        console.error("Failed to fetch Latin honors standing:", error);
        setHonorStanding({
          title: null,
          standing: null,
          overallGwa: null,
          subjectCount: 0,
          loading: false,
          error: true,
        });
      }
    } catch (error) {
      console.error(error);
      setHonorStanding({
        title: null,
        standing: null,
        overallGwa: null,
        subjectCount: 0,
        loading: false,
        error: true,
      });
    }
  };

  const fetchTotalCourse = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/course_count/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      console.log("course count:", res.data);
      setCourseCount(res.data || { initial_course: 0 });
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStudentDetails = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student_details/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setStudent(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchActiveEnrollmentStatus = async (id) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/student_active_enrollment_status/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
      );
      setIsOfficiallyEnrolled(Number(res.data?.enrolled_status) === 1);
    } catch (error) {
      console.error(error);
      setIsOfficiallyEnrolled(false);
    }
  };

  const fetchStudentAssessment = async (id) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/student-assessment/${id}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` }, params: { enrolled_status: 1 } },
      );
      const rows = Array.isArray(res.data?.rows) ? res.data.rows : [];
      setIsOfficiallyEnrolledForBalance(rows.length > 0);
      setStudentAssessmentRows(rows);
      setStudentAssessment(rows[rows.length - 1] || null);
    } catch (error) {
      console.error(error);
      setStudentAssessmentRows([]);
      setStudentAssessment(null);
      setIsOfficiallyEnrolledForBalance(false);
    }
  };

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/active_school_year`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => setActiveSY(res.data[0] || {}))
      .catch((err) => console.error(err));
  }, []);

  // Course status value
  const passed = courseCount?.passed_course || 0;
  const failed = courseCount?.failed_course || 0;
  const incomplete = courseCount?.inc_course || 0;
  const dropped = courseCount?.dropped_course || 0;
  const total = courseCount?.initial_course || 0;
  const displayedStatusTotal = passed + failed + incomplete + dropped;


  const statusRingBase = displayedStatusTotal || total;
  const statusSlices = [
    { value: passed, color: "#75a843" },
    { value: failed, color: "#bf2d35" },
    { value: incomplete, color: "#dd8a12" },
    { value: dropped, color: "#1d4ed8" },
  ];
  let statusRingCursor = 0;
  const statusRingSegments = statusSlices
    .filter((slice) => slice.value > 0 && statusRingBase > 0)
    .map((slice) => {
      const start = statusRingCursor;
      const end = statusRingCursor + (slice.value / statusRingBase) * 360;
      statusRingCursor = end;
      return `${slice.color} ${start}deg ${end}deg`;
    });
  if (statusRingBase > displayedStatusTotal) {
    statusRingSegments.push(`#dedcda ${statusRingCursor}deg 360deg`);
  }
  const statusRingBackground =
    statusRingSegments.length > 0
      ? `conic-gradient(${statusRingSegments.join(", ")})`
      : "#dedcda";

  const [dateTime, setDateTime] = useState(new Date());

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formattedTime = time.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // ===== COR PDF generation (server-side export job pipeline, same as Search COR) =====
  const [isGeneratingCorPdf, setIsGeneratingCorPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");

  const [termGwaList, setTermGwaList] = useState([]);
  const [termGwaLoading, setTermGwaLoading] = useState(true);

  const downloadCorPdf = async () => {
    if (isGeneratingCorPdf) return;

    const studentNumberForExport = String(
      personData.student_number || "",
    ).trim();
    if (!studentNumberForExport) {
      window.alert(
        "Student number is not available yet. Please try again in a moment.",
      );
      return;
    }

    setIsGeneratingCorPdf(true);
    setExportProgress(0);
    setExportStatus("Downloading PDF...");

    try {
      const personId = localStorage.getItem("person_id") || "";

      // 1) Create the export job
      const startRes = await axios.post(`${API_BASE_URL}/api/cor-export/jobs`, {
        students: [
          {
            student_number: studentNumberForExport,
            person_id: personId,
            preload: null, // export renderer fetches this student's own data
          },
        ],
        file_name: `${studentNumberForExport}_Certificate_Of_Registration`,
        frontend_origin: window.location.origin,
      }, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });

      const jobId = startRes.data?.job_id;
      if (!jobId) throw new Error("Server did not return an export job id.");

      // 2) Poll status until done/error (status text stays fixed at "Downloading PDF...";
      // only the progress bar value reflects the server's actual progress)
      let job = null;
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const statusRes = await axios.get(
          `${API_BASE_URL}/api/cor-export/jobs/${jobId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );
        job = statusRes.data;

        setExportProgress(Number(job.progress || 0));

        if (job.status === "done") break;
        if (job.status === "error") {
          throw new Error(job.error || "Server export failed.");
        }
      }

      // 3) Download the finished PDF
      const downloadRes = await axios.get(
        `${API_BASE_URL}/api/cor-export/jobs/${jobId}/download`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` }, responseType: "blob" },
      );

      downloadBlob(
        downloadRes.data,
        job?.file_name ||
          `${studentNumberForExport}_Certificate_Of_Registration.pdf`,
      );

      setExportProgress(100);
      setExportStatus("Download complete.");
    } catch (error) {
      console.error("Failed to generate COR PDF:", error);
      window.alert(
        error?.message ||
          "Failed to generate Certificate of Registration PDF. Please try again.",
      );
    } finally {
      setIsGeneratingCorPdf(false);
      setExportProgress(0);
      setExportStatus("");
    }
  };

  const [date, setDate] = useState(new Date());

  const days = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];

  const year = date.getFullYear();
  const month = date.getMonth();

  const now = new Date();
  const manilaDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Manila" }),
  );
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

  const [holidays, setHolidays] = useState({});

  const ordinalYear = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return String(n);
    const s = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return `${num}${s[(v - 20) % 10] || s[v] || s[0]} Yr`;
  };

  const getTermSortValue = (row) => {
    const schoolYear = Number(row?.year_description) || 0;
    const semester = Number(row?.semester_id) || 0;
    const schoolYearId = Number(row?.active_school_year_id) || 0;
    return schoolYear * 10000 + semester * 100 + schoolYearId;
  };

  const getAcademicTermKey = (row) =>
    `${row?.active_school_year_id || row?.year_description || "N/A"}-${row?.semester_id || row?.semester_description || "N/A"}`;

  const isMigratedGrade = (row) =>
    Number(row?.is_migrated) === 1 || row?.is_migrated === true;

  const isEvaluatedGrade = (row) => Number(row?.fe_status) === 1;
  const isPostedGrade = (row) => Number(row?.is_posted) === 1;

  const getLatestMigratedTermKey = (rows) => {
    const latestMigratedRow = rows
      .filter(isMigratedGrade)
      .sort((a, b) => getTermSortValue(b) - getTermSortValue(a))[0];

    return latestMigratedRow ? getAcademicTermKey(latestMigratedRow) : null;
  };

  const getGradeVisibility = (row, latestMigratedTermKey) => {
    if (isMigratedGrade(row)) {
      if (isEvaluatedGrade(row)) return "show";
      if (getAcademicTermKey(row) !== latestMigratedTermKey) return "show";
      return "hidden";
    }

    if (!isEvaluatedGrade(row)) return "hidden";
    if (isPostedGrade(row)) return "show";
    return "not_posted";
  };

  const fetchTermGwa = async (id) => {
    setTermGwaLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student_grade/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      const rows = Array.isArray(res.data) ? res.data : [];
      const latestMigratedTermKey = getLatestMigratedTermKey(rows);

      const groupedByTerm = {};
      rows.forEach((row) => {
        // key on the real IDs, not the description text
        const key = `${row.year_level_id}||${row.semester_id}`;
        if (!groupedByTerm[key]) {
          groupedByTerm[key] = {
            year_level_id: row.year_level_id,
            year_level_description: row.year_level_description,
            level_type: row.level_type,
            semester_id: row.semester_id,
            semester_description: row.semester_description,
            total: 0,
            units: 0,
          };
        }
        if (Number(row.is_gwa_excluded) === 1) return;
        if (getGradeVisibility(row, latestMigratedTermKey) !== "show") return;

        const grade = Number(row.numeric_grade);
        const units = Number(row.gwa_units) || 0;
        if (!Number.isFinite(grade) || grade <= 0 || units <= 0) return;

        groupedByTerm[key].total += grade * units;
        groupedByTerm[key].units += units;
      });

      // masteral/doctoral terms are excluded here to keep the strip readable.
      // (Adjust the "<= 4" below if a program legitimately needs 5th year shown.)
      const MAX_YEAR_LEVEL_TO_SHOW = 4;

      const list = Object.values(groupedByTerm)
        .filter(
          (t) =>
            t.level_type === "year" &&
            Number(t.year_level_id) <= MAX_YEAR_LEVEL_TO_SHOW,
        )
        .map((t) => ({
          label: `${ordinalYear(t.year_level_id)} - ${t.semester_description}`,
          yearOrder: Number(t.year_level_id) || 0,
          semOrder: Number(t.semester_id) || 0,
          gwa: t.units > 0 ? t.total / t.units : null,
        }))
        // Ascending: 1st Yr Sem 1 -> ... -> 4th Yr Sem 2, reads like a timeline
        .sort((a, b) => a.yearOrder - b.yearOrder || a.semOrder - b.semOrder);

      setTermGwaList(list);
    } catch (error) {
      console.error("Failed to fetch per-semester GWA:", error);
      setTermGwaList([]);
    } finally {
      setTermGwaLoading(false);
    }
  };

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await axios.get(
          `https://date.nager.at/api/v3/PublicHolidays/${year}/PH`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );
        const lookup = {};
        res.data.forEach((h) => {
          lookup[h.date] = h;
        });
        setHolidays(lookup);
      } catch (err) {
        console.error("Failed to fetch PH holidays:", err);
        setHolidays({});
      }
    };
    fetchHolidays();
  }, [year]);

  const [openImage, setOpenImage] = useState(null);

  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const email = localStorage.getItem("email");

        const res = await axios.get(
          `${API_BASE_URL}/api/announcements/user/${email}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );

        setAnnouncements(res.data.announcements || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchAnnouncements();
  }, []);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  // Lightbox helpers
  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxZoom(1);
    setLightboxOpen(true);
  };
  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxZoom(1);
  };
  const lightboxNext = () => {
    setLightboxIndex((prev) => (prev + 1) % announcements.length);
    setLightboxZoom(1);
  };
  const lightboxPrev = () => {
    setLightboxIndex(
      (prev) => (prev - 1 + announcements.length) % announcements.length,
    );
    setLightboxZoom(1);
  };
  const zoomIn = () => setLightboxZoom((prev) => Math.min(prev + 0.5, 3));
  const zoomOut = () => setLightboxZoom((prev) => Math.max(prev - 0.5, 1));

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

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const person_id = localStorage.getItem("person_id");
      const role = localStorage.getItem("role");

      const formData = new FormData();

      formData.append("profile_picture", file);
      formData.append("person_id", person_id);

      await axios.post(`${API_BASE_URL}/api/update_student`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });

      const updated = await axios.get(
        `${API_BASE_URL}/api/person_data/${person_id}/${role}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
      );

      setPerson((prev) => ({
        ...prev,
        profile_image: updated.data.profile_image,
      }));
      const baseUrl = `${API_BASE_URL}/uploads/Student1by1/${updated.data.profile_image}`;
      setProfileImage(`${baseUrl}?t=${Date.now()}`);
    } catch (error) {
      console.error("Upload failed:", error);
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
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    color: "#fff",
                    marginTop: "2px",
                    flexShrink: 0,
                    fontSize: "14px",
                  }}
                >
                  •
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.92)",
                    fontSize: "13.5px",
                    lineHeight: 1.55,
                  }}
                >
                  {bulletMatch[2]}
                </span>
              </div>
            );
          }

        const subBulletMatch = line.match(/^[\s\t]+([•*\-–])\s+(.*)/);
          if (subBulletMatch) {
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                  paddingLeft: "18px",
                }}
              >
                <span
                  style={{
                    color: "rgba(255,255,255,0.55)",
                    marginTop: "2px",
                    flexShrink: 0,
                    fontSize: "12px",
                  }}
                >
                  •
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.8)",
                    fontSize: "13px",
                    lineHeight: 1.55,
                  }}
                >
                  {subBulletMatch[2]}
                </span>
              </div>
            );
          }

          const isHeading =
            trimmed === trimmed.toUpperCase() &&
            trimmed.length > 3 &&
            /[A-Z]/.test(trimmed);
          if (isHeading) {
            return (
              <p
                key={i}
                style={{
                  margin: "6px 0 2px",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "12px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  opacity: 0.75,
                }}
              >
                {trimmed}
              </p>
            );
          }

          return (
            <p
              key={i}
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.9)",
                fontSize: "13.5px",
                lineHeight: 1.6,
              }}
            >
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  const maroon = headerColor || "#9b2f35";
  const darkMaroon = "#7d252b";
  const softBorder = "#e6ded9";
  const cardSx = {
    height: "100%",
    border: `1px solid ${softBorder}`,
    borderRadius: "8px",
    boxShadow: "0 10px 24px rgba(82, 48, 48, 0.06)",
    backgroundColor: "#fff",
  };
  const iconBoxSx = {
    width: 42,
    height: 42,
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: maroon,
    backgroundColor: "rgba(155, 47, 53, 0.08)",
    border: "1px solid rgba(155, 47, 53, 0.18)",
    flexShrink: 0,
  };
  const money = (value) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(value || 0));
  const assessmentRows = studentAssessmentRows.length
    ? studentAssessmentRows
    : studentAssessment
      ? [studentAssessment]
      : [];
  const assessment = assessmentRows.reduce(
    (sum, row) => sum + Number(row.assessment ?? row.fees?.grandTotal ?? 0),
    0,
  );
  const paidAmount = assessmentRows.reduce(
    (sum, row) => sum + Number(row.payment_total ?? row.payment ?? 0),
    0,
  );
  const remainingBalance = assessmentRows.reduce(
    (sum, row) => sum + Number(row.balance ?? row.fees?.grandTotal ?? 0),
    0,
  );
  const firstAnnouncement =
    announcements.find((item) => item.file_path) || announcements[0];
  const statusText = String(personData.student_status || "Student");
  const studentProgram =
    studentDetails.program_description ||
    personData.program_description ||
    personData.program_code ||
    (personData.curriculum_id
      ? `Curriculum ${personData.curriculum_id}`
      : "N/A");
  const studentYearLevel =
    personData.year_level_description ||
    studentDetails.year_level ||
    personData.year_level_id ||
    "N/A";
  const quickLinks = [
    { label: "Schedule", icon: <CalendarMonth />, href: "/student_schedule" },
    { label: "Grades", icon: <StarBorder />, href: "/student_grades_page" },
    {
      label: "Curriculum",
      icon: <MenuBook />,
      href: "/student_section_offering",
    },
    {
      label: "Faculty Evaluation",
      icon: <AssignmentTurnedIn />,
      href: "/student_faculty_evaluation",
    },
    {
      label: "Student Profile",
      icon: <BadgeOutlined />,
      href: "/student_personal_data_form",
    },
    {
      label: "Account Balance",
      icon: <CreditCard />,
      href: "/student_account_balance",
    },
  ];


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

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 100px)",
        width: "100%",
        backgroundColor: "#f7f6f4",
        overflowY: "auto",
        overflowX: "hidden",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <Box
        sx={{
          mx: { xs: 1, sm: 1.5, md: 3 },
          mt: { xs: 1.5, md: 2.5 },
          borderRadius: "12px",
          overflow: "hidden",
          backgroundColor: headerColor,
          color: "#fff",
          border: `2px solid ${borderColor}`,
        }}
      >
        <Box
          sx={{
            px: { xs: 1.5, sm: 2, md: 4 },
            py: { xs: 2, md: 3 },
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={{ xs: 1.25, sm: 2 }}
          >
            <Box
              position="relative"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              sx={{ display: "inline-flex" }}
            >
              <Avatar
                src={
                  profileImage ||
                  (personData?.profile_image
                    ? `${API_BASE_URL}/uploads/Student1by1/${personData.profile_image}`
                    : "")
                }
                alt={personData?.first_name || "Student"}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  width: { xs: 48, sm: 56, md: 64 },
                  height: { xs: 48, sm: 56, md: 64 },
                  border: "1px solid white",
                  bgcolor: "rgba(255,255,255,0.15)",
                  cursor: "pointer",
                  color: "white",
                }}
              >
                {personData?.first_name?.[0] || <PersonIcon />}
              </Avatar>
              {hovered && (
                <IconButton
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
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
                    width: 30,
                    height: 30,
                  }}
                >
                  <AddCircleIcon
                    sx={{ color: mainButtonColor, fontSize: 26 }}
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
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: { xs: 18, sm: 22, md: 28, lg: 32 },
                  fontWeight: 800,
                  lineHeight: 1.2,
                  color: "white",
                  wordBreak: "break-word",
                }}
              >
                Welcome Back! {personData.last_name || "Student"},{" "}
                {personData.first_name || ""} {personData.middle_name || ""}
              </Typography>

              <Typography
                sx={{
                  fontSize: { xs: 13, sm: 15, md: 18, lg: 22 },
                  letterSpacing: 0,
                  opacity: 0.86,
                  color: "white",
                  wordBreak: "break-word",
                }}
              >
                <Box component="span" sx={{ fontWeight: 700 }}>
                  Student No.
                </Box>{" "}
                {personData.student_number || "N/A"} - {statusText}
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Box
          sx={{
            px: { xs: 1.5, sm: 2, md: 4 },
            py: 1.5,
            backgroundColor: "lightgray",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            rowGap: 1.5,
            borderTop: `2px solid ${borderColor}`,
          }}
        >
          {[
            ["School Year", `${sy.current_year || ""}-${sy.next_year || ""}`],
            ["Semester", sy.semester_description || "N/A"],
            ["Program", studentProgram],
            [
              "Section",
              `${studentDetails.program_code || ""}${studentDetails.section_description ? ` ${studentDetails.section_description}` : ""}` ||
                "N/A",
            ],
            ["Year Level", studentYearLevel],
          ].map(([label, value], idx, arr) => (
            <Box
              key={label}
              sx={{
                px: 2,
                textAlign: "center",
                borderRight:
                  idx < arr.length - 1 ? "1px solid rgba(0,0,0,0.2)" : "none",
                "&:first-of-type": { pl: 0 },
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: 11, sm: 12 },
                  textTransform: "uppercase",
                  opacity: 0.78,
                  color: "black",
                  letterSpacing: "0.05em",
                }}
              >
                {label}
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: 13, sm: 15 },
                  fontWeight: 600,
                  color: "black",
                  whiteSpace: "nowrap",
                }}
              >
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          py: { xs: 2, md: 2.5 },
          mx: { xs: 1, sm: 1.5, md: 3 },
          maxWidth: "none",
        }}
      >
        <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ width: "100%" }}>
          <Grid item xs={12} md={6} lg={3} sx={{}}>
            <Card sx={{ ...cardSx, border: `2px solid ${borderColor}` }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                >
                  <Box>
                    <Typography
                      sx={{ fontSize: { xs: 16, sm: 20 }, fontWeight: 700 }}
                    >
                      Course Status
                    </Typography>
                    <Typography
                      sx={{ mt: 0.5, color: "text.secondary", fontSize: 13 }}
                    >
                      Academic year {sy.current_year || "N/A"}-
                      {sy.next_year || ""} -{" "}
                      {sy.semester_description || "Semester"}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      sx={{
                        color: maroon,
                        fontSize: { xs: 36, sm: 44, md: 52 },
                        lineHeight: 0.9,
                        fontWeight: 800,
                      }}
                    >
                      {total}
                    </Typography>
                    <Typography
                      sx={{
                        color: maroon,
                        textTransform: "uppercase",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Courses
                    </Typography>
                  </Box>
                </Stack>
                <Divider sx={{ my: { xs: 2, sm: 3 } }} />
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  {[
                    ["Passed", passed, "#75a843"],
                    ["Failed", failed, "#bf2d35"],
                    ["Incomplete", incomplete, "#dd8a12"],
                    ["Dropped", dropped, "#1d4ed8"],
                  ].map(([label, value, color]) => (
                    <Box
                      key={label}
                      sx={{
                        px: 1.4,
                        py: 0.7,
                        borderRadius: 10,
                        bgcolor: "#f6f4ef",
                        display: "flex",
                        gap: 1,
                        alignItems: "center",
                      }}
                    >
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor: color,
                        }}
                      />
                      <Typography sx={{ fontSize: 13 }}>{label}</Typography>
                      <Typography
                        sx={{ fontSize: 13, color: "text.secondary" }}
                      >
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
                <Divider sx={{ my: { xs: 2, sm: 3 } }} />
                <Stack direction="row" spacing={2.5} alignItems="center">
                  <Box
                    sx={{
                      width: { xs: 76, sm: 92 },
                      height: { xs: 76, sm: 92 },
                      minWidth: { xs: 76, sm: 92 },
                      borderRadius: "50%",
                      background: statusRingBackground,
                      display: "grid",
                      placeItems: "center",
                      p: "9px",
                    }}
                  >
                    <Box
                      sx={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        bgcolor: "#fff",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 17,
                        fontWeight: 800,
                      }}
                    >
                      {total}
                    </Box>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 14 }}>
                      All {total} courses are enrolled for this semester.
                    </Typography>
                    <Typography
                      sx={{ mt: 1, color: "text.secondary", fontSize: 14 }}
                    >
                      Grades are not yet posted.
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ ...cardSx, border: `2px solid ${borderColor}` }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ mb: 2.5 }}
                >
                  <Box sx={iconBoxSx}>
                    <PersonIcon />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>
                      Enrollment Status
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        mt: 0.8,
                        display: "inline-block",
                        px: 1.4,
                        py: 0.4,
                        borderRadius: 10,
                        bgcolor:
                          isOfficiallyEnrolled === null
                            ? "#f3f4f6"
                            : isOfficiallyEnrolled
                              ? "#e7efd4"
                              : "#fee2e2",
                        color:
                          isOfficiallyEnrolled === null
                            ? "#4b5563"
                            : isOfficiallyEnrolled
                              ? "#496b21"
                              : "#991b1b",
                        fontSize: 12,
                      }}
                    >
                      {isOfficiallyEnrolled === null
                        ? "Checking Status"
                        : isOfficiallyEnrolled
                          ? "Officially Enrolled"
                          : "Not Officially Enrolled"}
                    </Typography>
                  </Box>
                </Stack>
                {[
                  [
                    "Academic Year",
                    `${sy.current_year || ""}-${sy.next_year || ""}`,
                  ],
                  ["Semester", sy.semester_description || "N/A"],
                  ["Student Type", statusText || "N/A"],
                ].map(([label, value]) => (
                  <Stack
                    key={label}
                    direction="row"
                    justifyContent="space-between"
                    sx={{ py: 1 }}
                  >
                    <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                      {label}
                    </Typography>
                    <Typography
                      sx={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}
                    >
                      {value}
                    </Typography>
                  </Stack>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ ...cardSx, border: `2px solid ${borderColor}` }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{ mb: 2.5 }}
                >
                  <Box sx={iconBoxSx}>
                    <AccountBalanceWallet />
                  </Box>
                  <Typography sx={{ fontWeight: 700 }}>
                    Account Balance
                  </Typography>
                </Stack>
                {[
                  ["Total Assessment", money(assessment)],
                  ["Paid Amount", money(paidAmount)],
                  ["Remaining Balance", money(remainingBalance)],
                  ["Due Date", "Not set"],
                ].map(([label, value], idx) => (
                  <Stack
                    key={label}
                    direction="row"
                    justifyContent="space-between"
                    sx={{ py: 0.8 }}
                  >
                    <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                      {label}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        color:
                          idx === 2 && remainingBalance > 0
                            ? "error.main"
                            : "text.primary",
                      }}
                    >
                      {value}
                    </Typography>
                  </Stack>
                ))}
                {isOfficiallyEnrolledForBalance === false ? (
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                      mt: 2,
                      p: 1.4,
                      borderRadius: "8px",
                      bgcolor: "#fffbeb",
                      color: "#b45309",
                    }}
                  >
                    <WarningAmber fontSize="small" />
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                        Account balance is not available.
                      </Typography>
                      <Typography
                        sx={{ fontSize: 12, color: "text.secondary" }}
                      >
                        Student Account Balance is only displayed for officially
                        enrolled students.
                      </Typography>
                    </Box>
                  </Stack>
                ) : (
                  remainingBalance > 0 && (
                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{
                        mt: 2,
                        p: 1.4,
                        borderRadius: "8px",
                        bgcolor: "#fff0ee",
                        color: "#c41922",
                      }}
                    >
                      <WarningAmber fontSize="small" />
                      <Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                          You have a remaining balance.
                        </Typography>
                        <Typography
                          sx={{ fontSize: 12, color: "text.secondary" }}
                        >
                          Grade viewing and some student services may be
                          unavailable until it is settled.
                        </Typography>
                      </Box>
                    </Stack>
                  )
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card
              sx={{
                ...cardSx,
                p: { xs: 1, sm: 2 },
                flexShrink: 0,
                border: `2px solid ${borderColor}`,
              }}
            >
              <CardContent sx={{ p: "0 !important" }}>
                {/* Header */}
                <Grid
                  container
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    backgroundColor: maroon,
                    color: "white",
                    border: `2px solid ${borderColor}`,
                    borderBottom: "none",
                    borderRadius: "8px 8px 0 0",
                    padding: "10px 8px",
                  }}
                >
                  <Grid item>
                    <IconButton
                      size="small"
                      onClick={handlePrevMonth}
                      sx={{ color: "white" }}
                    >
                      <ArrowBackIos fontSize="small" />
                    </IconButton>
                  </Grid>

                  <Grid item>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: "bold",
                        fontSize: "14px",
                      }}
                    >
                      {date.toLocaleString("default", {
                        month: "long",
                      })}{" "}
                      {year}
                    </Typography>
                  </Grid>

                  <Grid item>
                    <IconButton
                      size="small"
                      onClick={handleNextMonth}
                      sx={{ color: "white" }}
                    >
                      <ArrowForwardIos fontSize="small" />
                    </IconButton>
                  </Grid>
                </Grid>

                {/* Calendar Body */}
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
                  {/* Days */}
                  {days.map((day, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        backgroundColor: "#f3f3f3",
                        textAlign: "center",
                        py: 0.5,
                        fontWeight: "bold",
                        fontSize: { xs: 11, sm: 14 },
                        borderBottom: `2px solid ${borderColor}`,
                      }}
                    >
                      {day}
                    </Box>
                  ))}

                  {/* Dates */}
                  {weeks.map((week, i) =>
                    week.map((day, j) => {
                      if (!day) {
                        return (
                          <Box
                            key={`${i}-${j}`}
                            sx={{
                              height: { xs: 38, sm: 50 },
                              backgroundColor: "#fff",
                            }}
                          />
                        );
                      }

                      const isToday =
                        day === today &&
                        month === thisMonth &&
                        year === thisYear;

                      const dateKey = `${year}-${String(month + 1).padStart(
                        2,
                        "0",
                      )}-${String(day).padStart(2, "0")}`;

                      const isHoliday = holidays[dateKey];

                      const dayCell = (
                        <Box
                          sx={{
                            height: { xs: 30, sm: 38 },
                            width: { xs: 30, sm: 38 },
                            mx: "auto",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                            fontSize: { xs: 11, sm: 12 },
                            backgroundColor: isToday
                              ? maroon
                              : isHoliday
                                ? "#E8C999"
                                : "#fff",
                            color: isToday ? "white" : "black",
                            fontWeight: isHoliday ? "bold" : "500",
                            cursor: isHoliday ? "pointer" : "default",

                            "&:hover": {
                              backgroundColor: isHoliday ? "#F5DFA6" : "#000",
                              color: isHoliday ? "black" : "white",
                            },
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
                              <Typography fontWeight="bold">
                                {isHoliday.localName}
                              </Typography>

                              <Typography variant="caption">
                                {isHoliday.date}
                              </Typography>
                            </>
                          }
                          arrow
                          placement="top"
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              height: { xs: 38, sm: 50 },
                            }}
                          >
                            {dayCell}
                          </Box>
                        </Tooltip>
                      ) : (
                        <Box
                          key={`${i}-${j}`}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: { xs: 38, sm: 50 },
                          }}
                        >
                          {dayCell}
                        </Box>
                      );
                    }),
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ ...cardSx, border: `2px solid ${borderColor}` }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ mb: 2 }}
                >
                  <Box sx={iconBoxSx}>
                    <StarBorder />
                  </Box>
                  <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
                    Per Semester General Weighted Average
                  </Typography>
                </Stack>

                {!gwaPrintStatus.loading && !gwaPrintStatus.per_semester ? (
                  <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                    Per-semester GWA is currently closed by the Registrar.
                  </Typography>
                ) : termGwaLoading || gwaPrintStatus.loading ? (
                  <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                    Loading...
                  </Typography>
                ) : termGwaList.length === 0 ? (
                  <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                    No GWA available yet.
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "repeat(4, 1fr)",
                        sm: `repeat(${termGwaList.length}, 1fr)`,
                      },
                      gap: { xs: 0.75, sm: 1.25 },
                    }}
                  >
                    {termGwaList.map((t) => (
                      <Box
                        key={t.label}
                        sx={{
                          width: "100%",
                          aspectRatio: { xs: "auto", sm: "1 / 1" },
                          minHeight: { xs: 76, sm: "auto" },
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          border: `1px solid ${softBorder}`,
                          borderRadius: "8px",
                          backgroundColor: "#faf8f6",
                          px: 0.5,
                          py: { xs: 0.75, sm: 0 },
                          minWidth: 0,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: { xs: 9, sm: 12 },
                            fontWeight: 700,
                            letterSpacing: "0.01em",
                            textTransform: "uppercase",
                            color: "text.secondary",
                            lineHeight: 1.2,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            display: { xs: "block", sm: "-webkit-box" },
                            WebkitLineClamp: { sm: 2 },
                            WebkitBoxOrient: { sm: "vertical" },
                            overflow: { xs: "visible", sm: "hidden" },
                          }}
                        >
                          {t.label}
                        </Typography>
                        <Typography
                          sx={{
                            mt: 0.4,
                            fontSize: { xs: 12, sm: 24 },
                            fontWeight: 800,
                            color: t.gwa !== null ? maroon : "#c9c3c0",
                            lineHeight: 1,
                          }}
                        >
                          {t.gwa !== null ? t.gwa.toFixed(3) : ""}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Card sx={{ ...cardSx, border: `2px solid ${borderColor}`, mb: 2 }}>
              <CardContent sx={{ p: 0 }}>
                <Grid container>
                  <Grid
                    item
                    xs={12}
                    md={5.2}
                    sx={{
                      p: { xs: 2, sm: 2.5 },
                      borderRight: { md: `1px solid ${softBorder}` },
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      sx={{ mb: 2 }}
                    >
                      <Box sx={iconBoxSx}>
                        <StarBorder />
                      </Box>
                      <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
                        Latin Honors Eligibility
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        border: `2px solid ${borderColor}`,
                        borderRadius: "8px",
                        p: { xs: 2, sm: 2.5 },
                        textAlign: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          mt: 1.25,
                          fontSize: { xs: 18, sm: 24 },
                          color: maroon,
                          fontWeight: 800,
                        }}
                      >
                        {honorStanding.loading
                          ? "Loading..."
                          : honorStanding.title ||
                            (honorStanding.standing === "disqualified"
                              ? "Disqualified"
                              : honorStanding.standing === "not_in_standing"
                                ? "Not In Standing"
                                : "No Current Standing")}
                      </Typography>
                      {!honorStanding.loading &&
                        honorStanding.overallGwa &&
                        gwaPrintStatus.overall && (
                          <Typography
                            sx={{
                              mt: 0.75,
                              color: maroon,
                              fontSize: 14,
                              fontWeight: 700,
                            }}
                          >
                            Weighted Overall GWA:{" "}
                            {Number(honorStanding.overallGwa).toFixed(4)}
                          </Typography>
                        )}
                      <Typography
                        sx={{
                          mt: 1.25,
                          color: "text.secondary",
                          fontSize: 13,
                          lineHeight: 1.5,
                        }}
                      >
                        {honorStanding.error
                          ? "Unable to load your honors standing at this time."
                          : honorStanding.title
                            ? "You are currently eligible to apply for Latin honors based on the student handbook rules."
                            : honorStanding.standing === "disqualified"
                              ? "You are currently disqualified from applying for Latin honors based on the student handbook rules."
                              : honorStanding.standing === "not_in_standing"
                                ? "You are not currently in standing to apply for Latin honors based on the student handbook rules."
                                : "There are no posted grades available for Latin honors evaluation yet."}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6.8} sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 2 }}>
                      Quick Access
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "repeat(2, 1fr)",
                          sm: "repeat(3, 1fr)",
                        },
                        gap: { xs: 1, sm: 1.5 },
                      }}
                    >
                      {quickLinks.map((link) => (
                        <Button
                          key={link.label}
                          type="button"
                          onClick={() => navigate(link.href)}
                          variant="outlined"
                          sx={{
                            height: { xs: 74, sm: 86 },
                            borderRadius: "8px",
                            borderColor: softBorder,
                            color: "text.primary",
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.8,
                            textTransform: "none",
                            "& svg": { color: maroon },
                            "&:hover": {
                              borderColor: maroon,
                              bgcolor: "rgba(155,47,53,0.04)",
                            },
                            border: `2px solid ${borderColor}`,
                          }}
                        >
                          {link.icon}
                          <Typography
                            sx={{
                              fontSize: { xs: 11.5, sm: 13 },
                              lineHeight: 1.1,
                              textAlign: "center",
                            }}
                          >
                            {link.label}
                          </Typography>
                        </Button>
                      ))}
                    </Box>
                  </Grid>
                </Grid>

                <Divider />
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                  sx={{ p: { xs: 2, sm: 2.5 } }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ ...iconBoxSx, width: 64, height: 64 }}>
                      <FactCheck sx={{ fontSize: 34 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
                        Certificate of Registration
                      </Typography>
                      <Typography
                        sx={{ mt: 0.5, color: "text.secondary", fontSize: 14 }}
                      >
                        Download your official enrollment certificate for this
                        semester.
                      </Typography>
                    </Box>
                  </Stack>
                  <button
                    onClick={downloadCorPdf}
                    disabled={isGeneratingCorPdf}
                    style={{
                      marginBottom: "1rem",
                      padding: "10px 20px",
                      border: "2px solid black",
                      backgroundColor: "#f0f0f0",
                      color: "black",
                      borderRadius: "5px",
                      marginTop: "20px",
                      cursor: isGeneratingCorPdf ? "not-allowed" : "pointer",
                      fontSize: "16px",
                      fontWeight: "bold",
                      opacity: isGeneratingCorPdf ? 0.6 : 1,
                      width: isMobile ? "100%" : "auto",
                      transition: "background-color 0.3s, transform 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (isGeneratingCorPdf) return;
                      e.target.style.backgroundColor = "#d3d3d3";
                    }}
                    onMouseLeave={(e) => {
                      if (isGeneratingCorPdf) return;
                      e.target.style.backgroundColor = "#f0f0f0";
                    }}
                    onMouseDown={(e) => {
                      if (isGeneratingCorPdf) return;
                      e.target.style.transform = "scale(0.95)";
                    }}
                    onMouseUp={(e) => {
                      if (isGeneratingCorPdf) return;
                      e.target.style.transform = "scale(1)";
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <FcPrint size={20} />
                      {isGeneratingCorPdf
                        ? exportStatus || "Generating PDF..."
                        : "Download Certificate of Registration"}
                    </span>
                  </button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={7}>
            <Card
              sx={{
                borderRadius: "14px",
                border: `2px solid ${borderColor}`,
                boxShadow: 3,
                mb: 2,
                height: { xs: 420, sm: 480, md: 600 },
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                transition: "all 0.3s ease",
                background: "#fff",
                "&:hover": {
                  transform: { xs: "none", md: "scale(1.01)" },
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
                      flexShrink: 0,
                    }}
                  >
                    <Campaign sx={{ color: "#fff", fontSize: 24 }} />
                  </Box>

                  <Typography
                    sx={{
                      fontSize: { xs: 15, sm: 18 },
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
                    flex: 1,
                    p: { xs: 1.25, sm: 2 },
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                  }}
                >
                  {firstAnnouncement?.file_path ? (
                    <Box
                      sx={{
                        flex: 1,
                        minHeight: 0,
                        borderRadius: "14px",
                        overflow: "hidden",
                        position: "relative",
                        cursor: "pointer",
                        border: `2px solid ${borderColor}`,
                        background: "#fff",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: { xs: "none", md: "translateY(-2px)" },
                          boxShadow: 4,
                        },
                      }}
                      onClick={() =>
                        openLightbox(announcements.indexOf(firstAnnouncement))
                      }
                    >
                      {/* IMAGE */}
                      <Box
                        component="img"
                        src={`${API_BASE_URL}/uploads/Announcement/${firstAnnouncement.file_path}`}
                        alt={firstAnnouncement.title}
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transition: "transform 0.35s ease",
                          "&:hover": {
                            transform: { xs: "none", md: "scale(1.05)" },
                          },
                        }}
                      />

                      {/* OVERLAY */}
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          background:
                            "linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.08))",
                        }}
                      />

                      {/* ZOOM ICON */}
                      <Box
                        sx={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          background: "rgba(0,0,0,0.45)",
                          borderRadius: "50%",
                          p: 0.9,
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

                      {/* TITLE + CONTENT OVERLAY */}
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          p: { xs: 1.5, sm: 2 },
                        }}
                      >
                        <Typography
                          sx={{
                            color: "#fff",
                            fontWeight: 800,
                            fontSize: { xs: 16, sm: 20 },
                            lineHeight: 1.2,
                            mb: 0.5,
                          }}
                        >
                          {firstAnnouncement.title}
                        </Typography>

                        <Typography
                          sx={{
                            color: "rgba(255,255,255,0.88)",
                            fontSize: 13,
                            lineHeight: 1.5,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {firstAnnouncement.content}
                        </Typography>

                        <Typography
                          sx={{
                            mt: 1,
                            color: "rgba(255,255,255,0.7)",
                            fontSize: 11,
                          }}
                        >
                          Expires:{" "}
                          {new Date(
                            firstAnnouncement.expires_at,
                          ).toLocaleDateString("en-US")}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        flex: 1,
                        borderRadius: "12px",
                        border: `1px dashed ${borderColor}`,
                        display: "grid",
                        placeItems: "center",
                        color: "text.secondary",
                      }}
                    >
                      No active announcements.
                    </Box>
                  )}

                  {/* INDICATORS */}
                  <Stack
                    direction="row"
                    spacing={1}
                    justifyContent="center"
                    sx={{ pt: 1.5 }}
                  >
                    {(announcements.length ? announcements : [0])
                      .slice(0, 6)
                      .map((a, index) => (
                        <Box
                          key={a.id || index}
                          sx={{
                            width: index === 0 ? 22 : 8,
                            height: 8,
                            borderRadius: "999px",
                            bgcolor:
                              index === 0
                                ? headerColor || maroon
                                : "#d1d1d1",
                            transition: "all 0.3s ease",
                          }}
                        />
                      ))}
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <AnimatePresence>
        {lightboxOpen && announcements[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeLightbox}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0,0,0,0.92)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: isMobile ? 0 : undefined,
            }}
          >
            {/* Prev */}
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                lightboxPrev();
              }}
              sx={{
                position: "fixed",
                left: { xs: 4, sm: 16 },
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 10000,
                width: { xs: 40, sm: 60 },
                height: { xs: 40, sm: 60 },
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                "&:hover": { background: "rgba(255,255,255,0.3)" },
              }}
            >
              <ArrowBackIosNewIcon sx={{ fontSize: { xs: 16, sm: 24 } }} />
            </IconButton>

            {/* Next */}
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                lightboxNext();
              }}
              sx={{
                position: "fixed",
                right: { xs: 4, sm: 16 },
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 10000,
                width: { xs: 40, sm: 60 },
                height: { xs: 40, sm: 60 },
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                "&:hover": { background: "rgba(255,255,255,0.3)" },
              }}
            >
              <ArrowForwardIosIcon sx={{ fontSize: { xs: 16, sm: 24 } }} />
            </IconButton>

            {/* Main card */}
            <motion.div
              key={announcements[lightboxIndex].id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                flexDirection: isTablet ? "column" : "row",
                width: isTablet ? "94vw" : "80vw",
                maxWidth: "1200px",
                maxHeight: isTablet ? "90vh" : "82vh",
                borderRadius: isMobile ? 12 : 16,
                overflow: "hidden",
                background: "#111",
              }}
            >
              {announcements[lightboxIndex].file_path && (
                <div
                  style={{
                    flex: isTablet ? "0 0 auto" : "0 0 60%",
                    width: isTablet ? "100%" : "60%",
                    maxHeight: isTablet ? "40vh" : "82vh",
                    background: "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={announcements[lightboxIndex].id}
                      src={`${API_BASE_URL}/uploads/Announcement/${announcements[lightboxIndex].file_path}`}
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

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  background:
                    "linear-gradient(160deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
                  padding: isMobile
                    ? "18px 14px"
                    : isTablet
                      ? "20px 16px"
                      : "32px 28px",
                  overflowY: "auto",
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(255,255,255,0.2) transparent",
                }}
              >
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    closeLightbox();
                  }}
                  sx={{
                    position: "fixed",
                    top: { xs: 10, sm: 25 },
                    left: { xs: 10, sm: 50 },
                    zIndex: 10000,
                    width: { xs: 44, sm: 75 },
                    height: { xs: 44, sm: 75 },
                    background: "rgba(255,255,255,0.15)",
                    color: "#fff",
                    "&:hover": { background: "rgba(220,50,50,0.75)" },
                  }}
                >
                  <CloseIcon sx={{ fontSize: { xs: 20, sm: 28 } }} />
                </IconButton>

                {/* Title */}
                <h2
                  style={{
                    margin: "0 0 4px",
                    color: "#fff",
                    fontSize: isMobile ? "15px" : isTablet ? "16px" : "20px",
                    fontWeight: 700,
                    lineHeight: 1.4,
                    paddingTop: isMobile ? "36px" : 0,
                  }}
                >
                  {announcements[lightboxIndex].title}
                </h2>

                {/* Divider */}
                <div
                  style={{
                    width: "40px",
                    height: "3px",
                    background: "rgba(255,255,255,0.35)",
                    borderRadius: "2px",
                    margin: "10px 0 18px",
                  }}
                />

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <FormattedContent
                    text={announcements[lightboxIndex].content}
                  />
                </div>
                {/* Expiry */}
                <p
                  style={{
                    margin: "12px 0 0",
                    color: "rgba(255,255,255,0.45)",
                    fontSize: "11px",
                  }}
                >
                  Expires:{" "}
                  {new Date(
                    announcements[lightboxIndex].expires_at,
                  ).toLocaleDateString("en-US")}
                </p>

                {/* Slide counter dots */}
                {announcements.length > 1 && (
                  <div
                    style={{
                      marginTop: "20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    {announcements.map((_, i) => (
                      <div
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxIndex(i);
                        }}
                        style={{
                          width: i === lightboxIndex ? 18 : 6,
                          height: 6,
                          borderRadius: 3,
                          background:
                            i === lightboxIndex
                              ? "#fff"
                              : "rgba(255,255,255,0.3)",
                          transition: "all 0.3s",
                          cursor: "pointer",
                        }}
                      />
                    ))}
                    <span
                      style={{
                        fontSize: "11px",
                        color: "rgba(255,255,255,0.4)",
                        marginLeft: "4px",
                      }}
                    >
                      {lightboxIndex + 1} / {announcements.length}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default StudentDashboard;
