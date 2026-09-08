import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  IconButton,
  Button,
  Stack,
  Tooltip,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import CampaignIcon from "@mui/icons-material/Campaign";
import GradingIcon from "@mui/icons-material/Grading";
import ListAltIcon from "@mui/icons-material/ListAlt";
import WorkIcon from "@mui/icons-material/Work";
import SchoolIcon from "@mui/icons-material/School";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import CloseIcon from "@mui/icons-material/Close";
import { ArrowBackIos, ArrowForwardIos } from "@mui/icons-material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { motion, AnimatePresence } from "framer-motion";
import API_BASE_URL from "../apiConfig";
import LoadingOverlay from "../components/LoadingOverlay";

const MAROON = "#8B1A1A";
const CALENDAR_WEEKS = 6;
const CALENDAR_DAY_ROW_HEIGHT = 32;

const abbrevDay = (day) => {
  const map = {
    Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
    Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
  };
  return map[day] || String(day || "").slice(0, 3);
};

const StatCardHeader = ({ title, subtitle, value, unit, valueColor = "#222" }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#222", lineHeight: 1.3 }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: 11, color: "#999", mt: 0.35, lineHeight: 1.3 }}>
        {subtitle}
      </Typography>
    </Box>
    <Box sx={{ textAlign: "right", flexShrink: 0 }}>
      <Typography sx={{ fontSize: { xs: 30, lg: 28, xl: 32 }, fontWeight: 800, color: valueColor, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: 11, color: "#999", mt: 0.35, lineHeight: 1.3, whiteSpace: "nowrap" }}>
        {unit}
      </Typography>
    </Box>
  </Box>
);

const StatMetric = ({ label, value, dotColor }) => (
  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.35, gap: 0.75 }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
      <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: dotColor, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 12, color: "#555", lineHeight: 1.3 }} noWrap>{label}</Typography>
    </Box>
    <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#222", lineHeight: 1.3, flexShrink: 0 }}>{value}</Typography>
  </Box>
);

const StatCard = ({ title, subtitle, value, unit, valueColor, borderColor = "#000000", children }) => (
  <Box sx={{
    bgcolor: "#fff",
    border: `2px solid ${borderColor}`,
    borderRadius: "8px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  }}>
    <Box sx={{ px: 1.75, pt: 1.75, pb: 1.25, borderBottom: `2px solid ${borderColor}` }}>
      <StatCardHeader
        title={title}
        subtitle={subtitle}
        value={value}
        unit={unit}
        valueColor={valueColor}
      />
    </Box>
    <Box sx={{ px: 1.75, py: 1.25, display: "flex", flexDirection: "column", gap: 0.35, flex: 1 }}>
      {children}
    </Box>
  </Box>
);

const QuickAction = ({ icon: Icon, label, color, onClick }) => (
  <Button
    onClick={onClick}
    fullWidth
    sx={{
      flexDirection: "column",
      gap: 0.5,
      py: 1.25,
      px: 0.5,
      borderRadius: 1.5,
      border: "1px solid #e8e8e8",
      bgcolor: "#fff",
      color: "#444",
      textTransform: "none",
      minHeight: 76,
      boxShadow: "none",
      "&:hover": { bgcolor: "#fafafa", borderColor: color },
    }}
  >
    <Box sx={{
      width: 36, height: 36, borderRadius: 1,
      bgcolor: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Icon sx={{ color, fontSize: 20 }} />
    </Box>
    <Typography sx={{ fontSize: 10, fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>
      {label}
    </Typography>
  </Button>
);

const FacultyDashboard = ({ profileImage, setProfileImage }) => {
  const settings = useContext(SettingsContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const sidebarRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [personData, setPerson] = useState({
    prof_id: "", employee_id: "", fname: "", mname: "", lname: "", profile_image: "",
  });
  const [dashboard, setDashboard] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [currentAnnIndex, setCurrentAnnIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [date, setDate] = useState(new Date());
  const [holidays, setHolidays] = useState({});
  const [sidebarHeight, setSidebarHeight] = useState(null);

  const colors = settings?.colors || {};
  const headerColor = colors.header || MAROON;
  const maroon = colors.header || MAROON;
  const borderColor = colors.border || "#000000";

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedProfID = localStorage.getItem("prof_id");
    const storedEmployeeID = localStorage.getItem("employee_id");
    const storedID = storedProfID || storedEmployeeID;

    if (!storedUser || !storedRole || !storedID) {
      window.location.href = "/login";
      return;
    }
    if (storedRole !== "faculty") {
      window.location.href = "/dashboard";
      return;
    }
    fetchPersonData(storedID);
  }, []);

  useEffect(() => {
    if (personData.prof_id) fetchDashboard(personData.prof_id);
  }, [personData.prof_id]);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/announcements/faculty`)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.data;
        setAnnouncements(data || []);
      })
      .catch(() => setAnnouncements([]));
  }, []);

  useEffect(() => {
    if (announcements.length <= 1) return undefined;
    const interval = setInterval(() => {
      setCurrentAnnIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  const currentAnnouncement = announcements[currentAnnIndex];

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxZoom(1);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setCurrentAnnIndex(lightboxIndex);
    setLightboxOpen(false);
    setLightboxZoom(1);
  };

  const lightboxNext = () => {
    setLightboxIndex((prev) => (prev + 1) % announcements.length);
    setLightboxZoom(1);
  };

  const lightboxPrev = () => {
    setLightboxIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
    setLightboxZoom(1);
  };

  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const handleKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") lightboxNext();
      if (e.key === "ArrowLeft") lightboxPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxOpen, lightboxIndex, announcements.length]);

  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return undefined;

    const updateHeight = () => {
      const nextHeight = Math.ceil(el.getBoundingClientRect().height);
      if (nextHeight > 0) setSidebarHeight(nextHeight);
    };

    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    window.addEventListener("resize", updateHeight);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [loading, announcements.length, currentAnnIndex]);

  const year = date.getFullYear();
  const month = date.getMonth();

  useEffect(() => {
    axios.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/PH`)
      .then((res) => {
        const lookup = {};
        res.data.forEach((h) => { lookup[h.date] = h; });
        setHolidays(lookup);
      })
      .catch(() => setHolidays({}));
  }, [year]);

  const fetchPersonData = async (id) => {
    try {
      const storedProfID = localStorage.getItem("prof_id");
      const storedEmployeeID = localStorage.getItem("employee_id");
      const endpoint = storedProfID
        ? `/api/get_prof_data_by_prof/${storedProfID}`
        : storedEmployeeID
          ? `/api/get_prof_data_by_employee/${storedEmployeeID}`
          : `/api/get_prof_data/${id}`;
      const res = await axios.get(`${API_BASE_URL}${endpoint}`);
      const first = res.data[0];
      localStorage.setItem("prof_id", first.prof_id || "");
      localStorage.setItem("employee_id", first.employee_id || "");
      setPerson({
        prof_id: first.prof_id,
        employee_id: first.employee_id,
        fname: first.fname,
        mname: first.mname,
        lname: first.lname,
        profile_image: first.profile_image,
      });
    } catch {
      setLoading(false);
    }
  };

  const fetchDashboard = async (profId) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/faculty_dashboard_summary/${profId}`);
      setDashboard(res.data);
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const employee_id = localStorage.getItem("employee_id") || personData.employee_id;
      const formData = new FormData();
      formData.append("profile_picture", file);
      formData.append("employee_id", employee_id);
      await axios.post(`${API_BASE_URL}/api/update_faculty`, formData);
      const updated = await axios.get(`${API_BASE_URL}/api/get_prof_data_by_employee/${employee_id}`);
      const updatedFaculty = updated.data[0];
      setPerson((prev) => ({ ...prev, profile_image: updatedFaculty.profile_image }));
      setProfileImage(`${API_BASE_URL}/uploads/Faculty1by1/${updatedFaculty.profile_image}?t=${Date.now()}`);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      e.target.value = "";
    }
  };

  const fullName = personData.lname
    ? `${personData.lname}, ${personData.fname} ${personData.mname || ""}`.trim()
    : "";

  const avatarSrc = profileImage
    || (personData.profile_image
      ? `${API_BASE_URL}/uploads/Faculty1by1/${personData.profile_image}`
      : null);

  const now = new Date();
  const manilaDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const today = manilaDate.getDate();
  const thisMonth = manilaDate.getMonth();
  const thisYear = manilaDate.getFullYear();

  const days = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];

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

  while (weeks.length < CALENDAR_WEEKS) {
    weeks.push(Array(7).fill(null));
  }

  const handlePrevMonth = () => setDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setDate(new Date(year, month + 1, 1));

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

  const dl = dashboard || {};
  const tl = dl.teaching_load || {};
  const ms = dl.my_students || {};
  const ge = dl.grades_encoded || {};
  const fe = dl.faculty_evaluation || {};
  const wh = dl.working_hours || {};
  const sy = dl.school_year || {};

  const panelSx = {
    bgcolor: "#fff",
    border: `2px solid ${borderColor}`,
    borderRadius: "8px",
    overflow: "hidden",
  };

  const bottomPanelSx = {
    ...panelSx,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
  };

  const matchedPanelSx = {
    ...bottomPanelSx,
    height: { xs: "auto", lg: sidebarHeight ?? "auto" },
    maxHeight: { xs: "none", lg: sidebarHeight ?? "none" },
  };

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
    <Box sx={{
      bgcolor: "#f0f0f0",
      p: { xs: 1.5, md: 2 },
    }}>
      <LoadingOverlay open={loading} message="Loading dashboard..." />

      {/* ── Header ── */}
      <Box sx={{ borderRadius: "6px", overflow: "hidden", mb: 2, border: "1px solid #ddd" }}>
        <Box sx={{
          bgcolor: headerColor,
          px: { xs: 2, md: 3 },
          py: 2,
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}>
          <Box position="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            <Avatar
              src={avatarSrc}
              sx={{ width: 64, height: 64, border: "2px solid #fff", cursor: "pointer" }}
              onClick={() => fileInputRef.current?.click()}
            >
              {personData.fname?.[0]}
            </Avatar>
            {hovered && (
              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  position: "absolute", bottom: -2, right: -2,
                  bgcolor: "#fff", borderRadius: "50%", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <AddCircleIcon sx={{ color: headerColor, fontSize: 20 }} />
              </Box>
            )}
            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, color: "#fff", fontSize: { xs: "1rem", md: "1.25rem" }, lineHeight: 1.3 }}>
              Welcome Back! Prof. {fullName}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: 13, mt: 0.25 }}>
              Faculty Portal Dashboard
            </Typography>
          </Box>
        </Box>

        {/* Info bar — 4 equal columns */}
        <Box sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          bgcolor: "#e8e8e8",
          borderTop: "1px solid #ccc",
           border: `2px solid ${borderColor}`,
        }}>
          {[
            ["EMPLOYEE ID", dl.employee_id || personData.employee_id || "N/A"],
            ["DEPARTMENT", dl.department || "N/A"],
            ["ACADEMIC YEAR", sy.year_description || "N/A"],
            ["SEMESTER", sy.semester_description || "N/A"],
          ].map(([label, value], i) => (
            <Box
              key={label}
              sx={{
                px: 2.5,
                py: 1.25,
                borderRight: `2px solid ${borderColor}`,
            
              }}
            >
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#000", letterSpacing: 0.8,  }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#222", mt: 0.25, }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── 5 stat cards ── */}
      <Box sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(5, 1fr)" },
        gap: 1.5,
        mb: 2,
        alignItems: "stretch",
      }}>
        <StatCard
          title="Teaching Load"
          subtitle="Current Semester"
          value={tl.total_units ?? 0}
          unit="Units"
          valueColor="#C62828"
          borderColor={borderColor}
        >
          <StatMetric label="Lecture" value={`${tl.lecture_units ?? 0} units`} dotColor="#43A047" />
          <StatMetric label="Lab" value={`${tl.lab_units ?? 0} units`} dotColor="#F9A825" />
          <StatMetric label="Total Classes" value={tl.total_classes ?? 0} dotColor="#1565C0" />
        </StatCard>

        <StatCard
          title="My Students"
          subtitle="Total Enrolled"
          value={ms.total_students ?? 0}
          unit="Students"
          valueColor="#1565C0"
          borderColor={borderColor}
        >
          <StatMetric label="Active Students" value={ms.active_students ?? 0} dotColor="#1565C0" />
          <StatMetric label="Irregular" value={ms.irregular_students ?? 0} dotColor="#F9A825" />
          <StatMetric label="Dropped" value={ms.dropped_students ?? 0} dotColor="#C62828" />
        </StatCard>

        <StatCard
          title="Grades Encoded"
          subtitle="This Semester"
          value={`${ge.completed_percent ?? 0}%`}
          unit="Completed"
          valueColor="#E65100"
          borderColor={borderColor}
        >
          <StatMetric label="Encoded" value={`${ge.encoded ?? 0}/${ge.total ?? 0}`} dotColor="#1565C0" />
          <StatMetric label="Pending" value={ge.pending ?? 0} dotColor="#43A047" />
          <StatMetric label="Not Started" value={ge.not_started ?? 0} dotColor="#F9A825" />
        </StatCard>

        <StatCard
          title="Faculty Evaluation"
          subtitle="Overall Rating"
          value={Number(fe.overall_rating || 0).toFixed(2)}
          unit={`out of ${fe.rating_scale ?? 5}.00`}
          valueColor="#6A1B9A"
          borderColor={borderColor}
        >
          <StatMetric label="Total Evaluations" value={fe.total_evaluations ?? 0} dotColor="#1565C0" />
          <StatMetric label="Response Rate" value={`${fe.response_rate_percent ?? 0}%`} dotColor="#1565C0" />
          <StatMetric label="Status" value={fe.status || "N/A"} dotColor="#C62828" />
        </StatCard>

        <StatCard
          title="Working Hours"
          subtitle="This Semester"
          value={wh.total_hours ?? 0}
          unit="HRS"
          valueColor="#222"
          borderColor={borderColor}
        >
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 0.75, rowGap: 0.35 }}>
            {(wh.daily || []).map(({ day, hours }) => (
              <StatMetric
                key={day}
                label={abbrevDay(day)}
                value={`${hours} hrs`}
                dotColor={hours > 0 ? "#1565C0" : "#ccc"}
              />
            ))}
          </Box>
          {dl.designation?.total_hours > 0 && (
            <StatMetric
              label="Designation"
              value={`${dl.designation.total_hours} hrs`}
              dotColor="#6A1B9A"
            />
          )}
        </StatCard>
      </Box>

      {/* ── Bottom row — announcements & section match sidebar height ── */}
      <Box sx={{
        display: "flex",
        flexDirection: { xs: "column", lg: "row" },
        gap: 1.5,
        alignItems: { xs: "stretch", lg: "flex-start" },
      }}>
        {/* Announcements — 2/5 width on lg */}
        <Box sx={{
          ...matchedPanelSx,
          flex: { xs: "1 1 auto", lg: "2 1 0" },
          minWidth: 0,
        }}>
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            sx={{
              px: 1.5,
              py: 1,
              backgroundColor: headerColor,
              color: "#fff",
              borderBottom: `2px solid ${borderColor}`,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(6px)",
              }}
            >
              <CampaignIcon sx={{ color: "#fff", fontSize: 20 }} />
            </Box>
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "#fff",
              }}
            >
              Announcements
            </Typography>
          </Stack>

          <Box
            sx={{
              flex: 1,
              p: 1.25,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            {currentAnnouncement?.file_path ? (
              <Box
                sx={{
                  flex: 1,
                  borderRadius: "12px",
                  overflow: "hidden",
                  position: "relative",
                  cursor: "pointer",
                  border: `2px solid ${borderColor}`,
                  background: "#fff",
                  transition: "all 0.3s ease",
                  minHeight: 0,
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: 4,
                  },
                }}
                onClick={() => openLightbox(currentAnnIndex)}
              >
                <Box
                  component="img"
                  src={`${API_BASE_URL}/uploads/Announcement/${currentAnnouncement.file_path}`}
                  alt={currentAnnouncement.title}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transition: "transform 0.35s ease",
                    "&:hover": { transform: "scale(1.05)" },
                  }}
                />

                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.08))",
                  }}
                />

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
                  <ZoomInIcon sx={{ color: "#fff", fontSize: 18 }} />
                </Box>

                <Box sx={{ position: "absolute", bottom: 0, left: 0, right: 0, p: 1.25 }}>
                  <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: 14, lineHeight: 1.2, mb: 0.25 }}>
                    {currentAnnouncement.title}
                  </Typography>
                  <Typography
                    sx={{
                      color: "rgba(255,255,255,0.88)",
                      fontSize: 12,
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {currentAnnouncement.content}
                  </Typography>
                  {currentAnnouncement.expires_at && (
                    <Typography sx={{ mt: 0.5, color: "rgba(255,255,255,0.7)", fontSize: 10 }}>
                      Expires: {new Date(currentAnnouncement.expires_at).toLocaleDateString("en-US")}
                    </Typography>
                  )}
                </Box>
              </Box>
            ) : currentAnnouncement ? (
              <Box
                sx={{
                  flex: 1,
                  borderRadius: "12px",
                  border: `2px solid ${borderColor}`,
                  p: 1.5,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  minHeight: 0,
                  overflow: "auto",
                }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: 14, color: headerColor, mb: 0.5 }}>
                  {currentAnnouncement.title}
                </Typography>
                <Typography sx={{ fontSize: 12, color: "#666", lineHeight: 1.45 }}>
                  {currentAnnouncement.content}
                </Typography>
                {currentAnnouncement.expires_at && (
                  <Typography sx={{ mt: 1, color: "#999", fontSize: 10 }}>
                    Expires: {new Date(currentAnnouncement.expires_at).toLocaleDateString("en-US")}
                  </Typography>
                )}
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
                  fontSize: 13,
                  minHeight: 0,
                }}
              >
                No active announcements.
              </Box>
            )}

            {announcements.length > 1 && (
              <Stack direction="row" spacing={1} justifyContent="center" sx={{ pt: 1, flexShrink: 0 }}>
                {announcements.slice(0, 6).map((item, index) => (
                  <Box
                    key={item.id || index}
                    onClick={() => setCurrentAnnIndex(index)}
                    sx={{
                      width: index === currentAnnIndex ? 22 : 8,
                      height: 8,
                      borderRadius: "999px",
                      bgcolor: index === currentAnnIndex ? headerColor : "#d1d1d1",
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Box>

        {/* Section / Schedule / Room — 2/5 width on lg */}
        <Box sx={{
          ...matchedPanelSx,
          flex: { xs: "1 1 auto", lg: "2 1 0" },
          minWidth: 0,
        }}>
          <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 0.8fr)",
                bgcolor: "#f5f5f5",
                borderBottom: `2px solid ${borderColor}`,
                px: 2,
                py: 1,
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: 13, textAlign: "left" }}>
                Section
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 13, textAlign: "left" }}>
                Schedule
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: 13, textAlign: "left" }}>
                Room
              </Typography>
            </Box>

            {(dl.my_classes || []).length === 0 ? (
              <Box sx={{ py: 3, textAlign: "center", color: "#aaa", fontSize: 13 }}>
                No classes this semester.
              </Box>
            ) : (
              dl.my_classes.map((cls, idx) => (
                <Box
                  key={`${cls.course_id}-${cls.department_section_id}-${idx}`}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 0.8fr)",
                    alignItems: "center",
                    px: 2,
                    py: 1.25,
                    borderBottom: `1px solid ${borderColor}`,
                    "&:hover": { bgcolor: "#fafafa" },
                  }}
                >
                  <Typography sx={{ fontSize: 13, textAlign: "left", pr: 1 }}>
                    {cls.section}
                  </Typography>
                  <Typography sx={{ fontSize: 13, textAlign: "left", whiteSpace: "nowrap", pr: 1 }}>
                    {cls.schedule}
                  </Typography>
                  <Typography sx={{ fontSize: 13, textAlign: "left", whiteSpace: "nowrap" }}>
                    {cls.room || "TBA"}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
          {(dl.my_classes || []).length > 0 && (
            <Box sx={{ px: 2, py: 1, borderTop: `2px solid ${borderColor}`, textAlign: "right" }}>
              <Button
                size="small"
                onClick={() => navigate("/faculty_masterlist")}
                sx={{ textTransform: "none", fontSize: 12, color: headerColor }}
              >
                View All Classes →
              </Button>
            </Box>
          )}
        </Box>

        {/* Right sidebar — height source for left panels */}
        <Box
          ref={sidebarRef}
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: { xs: "1 1 auto", lg: "1 1 0" },
            minWidth: 0,
            alignSelf: "flex-start",
          }}
        >
          {/* Calendar */}
          <Card
            sx={{
              ...panelSx,
              p: 1,
              width: "100%",
              flexShrink: 0,
            }}
          >
            <CardContent sx={{ p: "0 !important" }}>
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

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gridTemplateRows: `auto repeat(${CALENDAR_WEEKS}, ${CALENDAR_DAY_ROW_HEIGHT}px)`,
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
                      py: 0.5,
                      fontWeight: "bold",
                      fontSize: 14,
                      borderBottom: `2px solid ${borderColor}`,
                    }}
                  >
                    {day}
                  </Box>
                ))}

                {weeks.map((week, i) =>
                  week.map((day, j) => {
                    if (!day) {
                      return (
                        <Box
                          key={`${i}-${j}`}
                          sx={{ height: CALENDAR_DAY_ROW_HEIGHT, backgroundColor: "#fff" }}
                        />
                      );
                    }

                    const isToday =
                      day === today &&
                      month === thisMonth &&
                      year === thisYear;

                    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isHoliday = holidays[dateKey];

                    const dayCell = (
                      <Box
                        sx={{
                          height: CALENDAR_DAY_ROW_HEIGHT,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Box
                          sx={{
                            width: 26,
                            height: 26,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                            fontSize: 12,
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
                      </Box>
                    );

                    return isHoliday ? (
                      <Tooltip
                        key={`${i}-${j}`}
                        title={(
                          <>
                            <Typography fontWeight="bold">{isHoliday.localName}</Typography>
                            <Typography variant="caption">{isHoliday.date}</Typography>
                          </>
                        )}
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

          {/* Quick Actions */}
          <Box sx={{ ...panelSx, p: 1.5, width: "100%", mt: "1rem", flexShrink: 0 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#444", mb: 1, pb: 1, borderBottom: `2px solid ${borderColor}` }}>
              Quick Actions
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75 }}>
              <QuickAction icon={WorkIcon} label="View Workload" color="#E65100" onClick={() => navigate("/faculty_workload")} />
              <QuickAction icon={ListAltIcon} label="View Class List" color="#1565C0" onClick={() => navigate("/faculty_masterlist")} />
              <QuickAction icon={GradingIcon} label="Encode Grades" color="#43A047" onClick={() => navigate("/grading_sheet")} />
              <QuickAction icon={SchoolIcon} label="My Evaluation" color="#6A1B9A" onClick={() => navigate("/faculty_evaluation")} />
            </Box>
          </Box>
        </Box>
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
                zIndex: 10000, width: { xs: 44, sm: 60 }, height: { xs: 44, sm: 60 },
                background: "rgba(255,255,255,0.15)", color: "#fff",
                "&:hover": { background: "rgba(255,255,255,0.3)" },
              }}
            >
              <ArrowBackIosNewIcon sx={{ fontSize: { xs: 18, sm: 24 } }} />
            </IconButton>

            {/* Next */}
            <IconButton
              onClick={e => { e.stopPropagation(); lightboxNext(); }}
              sx={{
                position: "fixed", right: { xs: 4, sm: 16 }, top: "50%", transform: "translateY(-50%)",
                zIndex: 10000, width: { xs: 44, sm: 60 }, height: { xs: 44, sm: 60 },
                background: "rgba(255,255,255,0.15)", color: "#fff",
                "&:hover": { background: "rgba(255,255,255,0.3)" },
              }}
            >
              <ArrowForwardIosIcon sx={{ fontSize: { xs: 18, sm: 24 } }} />
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
                {/* Close button — top of details panel */}
                <IconButton
                  onClick={e => { e.stopPropagation(); closeLightbox(); }}
                  sx={{
                    position: "fixed", top: 25, left: 50, zIndex: 10000,
                    width: 75, height: 75,
                    background: "rgba(255,255,255,0.15)", color: "#fff",
                    "&:hover": { background: "rgba(220,50,50,0.75)" },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 28 }} />
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
    </Box>
  );
};

export default FacultyDashboard;
