import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Avatar,
  useMediaQuery,
  useTheme,
  Stack
} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import PersonIcon from "@mui/icons-material/Person";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { ArrowBackIos, ArrowForwardIos, MenuBook } from "@mui/icons-material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Legend,
  PieChart,
  Pie,
} from "recharts";
import { Tooltip } from "recharts";
import MuiTooltip from "@mui/material/Tooltip";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";

const Dashboard = ({ profileImage, setProfileImage }) => {
  const settings = useContext(SettingsContext);
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  // ── Theme colors ────────────────────────────────────────────────
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const titleColor = colors.title || "#000000";
  const subtitleColor = colors.subtitle || "#555555";
  const borderColor = colors.border || "#000000";
  const mainButtonColor = colors.mainButton || "#1976d2";
  const headerColor = colors.header || "#1976d2";
  const fetchedLogo = branding.logoUrl || EaristLogo;
  const companyName = branding.companyName || "";
  const shortTerm = branding.shortTerm || "";
  const campusAddress = branding.campusAddress || "";

  // ── Auth ────────────────────────────────────────────────────────
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userAccessList, setUserAccessList] = useState({});
  const pageId = 101;

  useEffect(() => {
    const email = localStorage.getItem("email");
    const role = localStorage.getItem("role");
    const id = localStorage.getItem("person_id");
    const empID = localStorage.getItem("employee_id");
    if (email && role && id && empID) {
      setUserRole(role);
      setUserID(id);
      setEmployeeID(empID);
      if (["administrator", "superadmin", "technical"].includes(role)) {
        checkAccess(empID);
        fetchUserAccessList(empID);
      } else {
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const checkAccess = async (empID) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${empID}/${pageId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }
      );
      setHasAccess(response.data?.page_privilege === 1);
    } catch {
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAccessList = async (empID) => {
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/api/page_access/${empID}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }
      );
      const accessMap = data.reduce((acc, item) => {
        acc[item.page_id] = item.page_privilege === 1;
        return acc;
      }, {});
      setUserAccessList(accessMap);
    } catch (err) {
      console.error("Access list failed:", err);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setUserRole(storedRole);
      setUserID(storedID);
      if (!["administrator", "superadmin", "technical"].includes(storedRole)) {
        window.location.href = "/dashboard";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  // ── Counts ──────────────────────────────────────────────────────
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [professorCount, setProfessorCount] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [studentCount, setStudentCount] = useState(0);
  const [yearLevelCounts, setYearLevelCounts] = useState([]);
  const [registrarCount, setRegistrarCount] = useState(0);
  const [currentEnrolledStudentCount, setCurrentEnrolledStudentCount] = useState(0);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/enrolled-count`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => setEnrolledCount(res.data.total))
      .catch(console.error);
    axios
      .get(`${API_BASE_URL}/api/professors`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) =>
        setProfessorCount(Array.isArray(res.data) ? res.data.length : 0)
      )
      .catch(console.error);
    axios
      .get(`${API_BASE_URL}/api/accepted-students-count`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => setAcceptedCount(res.data.total))
      .catch(console.error);
    axios
      .get(`${API_BASE_URL}/api/current-enrolled-students-count`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => setCurrentEnrolledStudentCount(res.data.total))
      .catch(console.error);
    axios
      .get(`${API_BASE_URL}/api/departments`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => setDepartments(res.data))
      .catch(console.error);
    axios
      .get(`${API_BASE_URL}/api/registrar_count`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => setRegistrarCount(res.data.count || 0))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedDepartment) return;
    axios
      .get(
        `${API_BASE_URL}/api/statistics/student_count/department/${selectedDepartment}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }
      )
      .then((res) => setStudentCount(res.data.count))
      .catch(console.error);
    axios
      .get(
        `${API_BASE_URL}/api/statistics/student_count/department/${selectedDepartment}/by_year_level`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }
      )
      .then((res) => setYearLevelCounts(res.data))
      .catch(console.error);
  }, [selectedDepartment]);

  // ── Time ────────────────────────────────────────────────────────
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const formattedTime = time.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // ── Applicant stats ─────────────────────────────────────────────
  const [applicant, setApplicant] = useState({
    totalApplicants: 0,
    male: 0,
    female: 0,
    statusCounts: [],
  });
  const [months, setMonths] = useState("January");

  // ── Active school year (astatus = 1) ────────────────────────────
  const [activeSchoolYear, setActiveSchoolYear] = useState(null);
  const [selectedYear, setSelectedYear] = useState("");

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/active_school_year`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => {
        const active = Array.isArray(res.data) && res.data.length > 0
          ? res.data[0]
          : null;

        setActiveSchoolYear(active);
        if (active?.year_id) {
          setSelectedYear(active.year_id);
        }
      })
      .catch(console.error);
  }, []);

  // ── Charts — all driven by selectedYear ─────────────────────────
  const [monthlyApplicants, setMonthlyApplicants] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [data, setData] = useState(null);
  const [allApplicants, setAllApplicants] = useState([]);

  // Fetch all applicants once
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/all-applicants`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) =>
        setAllApplicants(Array.isArray(res.data) ? res.data : [])
      )
      .catch(console.error);
  }, []);

  // Bar chart + pie chart + applicant stats recompute when year changes
  useEffect(() => {
    if (!allApplicants.length) return;

    let filtered = [...allApplicants];

    if (activeSchoolYear?.current_year) {
      const yearNum = Number(activeSchoolYear.current_year);
      filtered = filtered.filter(
        (p) => new Date(p.created_at).getFullYear() === yearNum
      );
    }

    // Bar chart: applicants per month
    const chartYear = activeSchoolYear?.current_year
      ? Number(activeSchoolYear.current_year)
      : new Date().getFullYear();

    const monthCounts = {};
    for (let i = 1; i <= 12; i++) {
      monthCounts[`${chartYear}-${String(i).padStart(2, "0")}`] = 0;
    }
    filtered.forEach((p) => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}`;
      if (monthCounts[key] !== undefined) monthCounts[key]++;
    });
    setMonthlyApplicants(
      Object.entries(monthCounts).map(([month, total]) => ({
        month,
        total,
      }))
    );

    // Pie chart: ECAT status
    const total_scheduled = filtered.filter(
      (p) => p.schedule_id != null && p.exam_status === 0
    ).length;
    const total_pending = filtered.filter(
      (p) => p.schedule_id == null
    ).length;
    const total_finished = filtered.filter(
      (p) => p.schedule_id != null && p.exam_status === 1
    ).length;
    setPieData([
      { name: "Applied", value: filtered.length },
      { name: "Scheduled", value: total_scheduled },
      { name: "Pending", value: total_pending },
      { name: "Finished", value: total_finished },
    ]);

    // Applicant overview stats
    const male = filtered.filter((p) => String(p.gender) === "0").length;
    const female = filtered.filter((p) => String(p.gender) === "1").length;
    setApplicant({
      totalApplicants: filtered.length,
      male,
      female,
      statusCounts: [],
    });
  }, [allApplicants, activeSchoolYear]);

  // Enrollment statistics bar charts via API
  useEffect(() => {
    if (!selectedYear) return;

    axios
      .get(`${API_BASE_URL}/api/get_enrollment_statistic`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        params: { year: selectedYear },
      })
      .then((res) => setData(res.data))
      .catch(console.error);
  }, [selectedYear]);

  // ── Person data ─────────────────────────────────────────────────
  const [personData, setPersonData] = useState(null);
  const [hovered, setHovered] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const person_id = localStorage.getItem("person_id");
    const role = localStorage.getItem("role");
    if (person_id && role) {
      axios
        .get(`${API_BASE_URL}/api/person_data/${person_id}/${role}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
        .then((res) => setPersonData(res.data))
        .catch(console.error);
    }
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const role = localStorage.getItem("role");
      const personId = personData?.person_id || localStorage.getItem("person_id");
      const formData = new FormData();
      formData.append("profile_picture", file);
      formData.append("person_id", personId);
      await axios.post(`${API_BASE_URL}/api/update_registrar_profile`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      const refreshed = await axios.get(
        `${API_BASE_URL}/api/person_data/${personId}/${role}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }
      );
      setPersonData(refreshed.data);
      setProfileImage(
        `${API_BASE_URL}/uploads/Admin1by1/${refreshed.data.profile_image}?t=${Date.now()}`
      );
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  // ── Calendar ────────────────────────────────────────────────────
  const [calDate, setCalDate] = useState(new Date());
  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];

  const now = new Date();
  const manilaDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Manila" })
  );
  const today = manilaDate.getDate();
  const thisMonth = manilaDate.getMonth();
  const thisYear = manilaDate.getFullYear();

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
  const weeks = [];
  let currentDay = 1 - firstDay;
  while (currentDay <= totalDays) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(
        currentDay > 0 && currentDay <= totalDays ? currentDay : null
      );
      currentDay++;
    }
    weeks.push(week);
  }

  const [holidays, setHolidays] = useState({});
  useEffect(() => {
    axios
      .get(`https://date.nager.at/api/v3/PublicHolidays/${calYear}/PH`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => {
        const lookup = {};
        res.data.forEach((h) => {
          lookup[h.date] = h;
        });
        setHolidays(lookup);
      })
      .catch(() => setHolidays({}));
  }, [calYear]);

  // ── Derived chart data ──────────────────────────────────────────
  const programData = data
    ? [
      { name: "Techvoc", value: Number(data.Techvoc) || 0 },
      { name: "Graduate", value: Number(data.Graduate) || 0 },
      { name: "Undergraduate", value: Number(data.Undergraduate) || 0 },
      {
        name: "Unclassified",
        value: Number(data.AcademicProgramUnclassified) || 0,
      },
    ]
    : [];

  const studentTypeData = data
    ? [
      { name: "Returnee", value: Number(data.Returnee) || 0 },
      { name: "Shiftee", value: Number(data.Shiftee) || 0 },
      { name: "Foreign", value: Number(data.ForeignStudent) || 0 },
      { name: "Transferee", value: Number(data.Transferee) || 0 },
      {
        name: "Unclassified",
        value: Number(data.ClassificationUnclassified) || 0,
      },
    ]
    : [];

  const stats = [
    {
      label: "Total Students Record",
      value: acceptedCount,
      icon: <MenuBookIcon fontSize="large" />,
      color: "#84B082",
    },
    {
      label: "Enrolled Students",
      value: currentEnrolledStudentCount,
      icon: <SchoolIcon fontSize="large" />,
      color: "#84B082",
    },
    {
      label: "Professors",
      value: professorCount,
      icon: <PersonIcon fontSize="large" />,
      color: "#A3C4F3",
    },
    {
      label: "Total Administrators",
      value: registrarCount,
      icon: <AdminPanelSettingsIcon fontSize="large" />,
      color: "#FFD8A9",
    },
  ];


  const cardSx = {
    border: `2px solid ${borderColor}`,
    borderRadius: 3,
    boxShadow: 3,
    transition: "transform 0.2s ease",
    "&:hover": { transform: "scale(1.02)" },
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

  if (!data) {
    return (
      <Box
        sx={{
          height: "calc(100vh - 100px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography sx={{ p: 3 }}>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "calc(100vh - 100px)",
        width: "100%",

        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
      }}
    >
      {/* Overlay */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.1)",
          backdropFilter: "blur(0.5px)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* Scrollable content */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          p: isMobile ? 1 : 2,
          boxSizing: "border-box",
        }}
      >
        {/* ── Welcome Card ── */}
        <Box
          sx={{
            width: "100%",
            mt: 2,
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
              px: { xs: 2, md: 4 },
              py: { xs: 2.5, md: 3 },
              display: "flex",
              alignItems: "center",

              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            {/* LEFT SIDE */}
            <Stack direction="row" alignItems="center" spacing={2}>
              {/* AVATAR */}
              <Box
                position="relative"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                sx={{ display: "inline-flex" }}
              >
                <Avatar
                  src={
                    profileImage ||
                    `${API_BASE_URL}/uploads/Admin1by1/${personData?.profile_image}`
                  }
                  alt={personData?.fname || "Admin"}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    width: 70,
                    height: 70,
                    border: "2px solid white",
                    bgcolor: "rgba(255,255,255,0.15)",
                    cursor: "pointer",
                    display: { xs: "none", sm: "flex" },
                    color: "white",
                  }}
                >
                  {personData?.fname?.[0]}
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
                      width: 30,
                      height: 30,

                      "&:hover": {
                        backgroundColor: "#f5f5f5",
                      },
                    }}
                  >
                    <AddCircleIcon
                      sx={{
                        color: mainButtonColor,
                        fontSize: 24,
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

              {/* TEXT */}
              <Box>
                <Typography
                  sx={{
                    fontSize: "32px",
                    fontWeight: 800,
                    lineHeight: 1.1,
                    color: "white",
                  }}
                >
                  Welcome Back!{" "}
                  {personData
                    ? `${personData.lname}, ${personData.fname} ${personData.mname || ""
                    }`
                    : ""}
                </Typography>

                <Typography
                  sx={{
                    fontSize: "22px",
                    letterSpacing: 0,
                    opacity: 0.9,
                    color: "white",
                    mt: 0.5,
                  }}
                >
                  <Box component="span" sx={{ fontWeight: 700 }}>
                    Employee ID:
                  </Box>{" "}
                  {personData?.employee_id || "N/A"}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Box>
        {/* ── Stats Row ── */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {stats.map((stat, i) => (
            <Grid item xs={12} sm={3} key={i}>
              <Card
                sx={{
                  ...cardSx,
                  backgroundColor: "#fef9e1",
                  display: "flex",
                  alignItems: "center",
                  p: 2,
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    flexShrink: 0,
                    borderRadius: "50%",
                    border: `2px solid ${borderColor}`,
                    backgroundColor: stat.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {stat.icon}
                </Box>
                <Box>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: subtitleColor }}
                    fontSize={16}
                    fontWeight={700}
                  >
                    {stat.label}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {stat.value}
                  </Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* ── Main three columns ── */}
        <Grid
          container
          spacing={2}
          alignItems="stretch"
          sx={{ width: "100%", boxSizing: "border-box" }}
        >
          {/* ── LEFT: Calendar + Bar Chart ── */}
          <Grid item xs={12} md={3} sx={{ display: "flex" }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                gap: 2,
              }}
            >
              {/* Calendar */}
              <Card sx={{ ...cardSx, p: 2, flexShrink: 0 }}>
                <CardContent sx={{ p: "0 !important" }}>
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
                      <IconButton
                        size="small"
                        onClick={() =>
                          setCalDate(new Date(calYear, calMonth - 1, 1))
                        }
                        sx={{ color: "white" }}
                      >
                        <ArrowBackIos fontSize="small" />
                      </IconButton>
                    </Grid>
                    <Grid item>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: "bold", fontSize: "14px" }}
                      >
                        {calDate.toLocaleString("default", {
                          month: "long",
                        })}{" "}
                        {calYear}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setCalDate(new Date(calYear, calMonth + 1, 1))
                        }
                        sx={{ color: "white" }}
                      >
                        <ArrowForwardIos fontSize="small" />
                      </IconButton>
                    </Grid>
                  </Grid>

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
                          py: 0.5,
                          fontWeight: "bold",
                          fontSize: isMobile ? 10 : 12,
                          borderBottom: `1px solid ${borderColor}`,
                        }}
                      >
                        {isMobile ? day.charAt(0) : day}
                      </Box>
                    ))}

                    {weeks.map((week, i) =>
                      week.map((day, j) => {
                        if (!day) {
                          return (
                            <Box
                              key={`${i}-${j}`}
                              sx={{
                                height: 38,
                                backgroundColor: "#fff",
                              }}
                            />
                          );
                        }
                        const isToday =
                          day === today &&
                          calMonth === thisMonth &&
                          calYear === thisYear;
                        const dateKey = `${calYear}-${String(
                          calMonth + 1
                        ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const isHoliday = holidays[dateKey];

                        const dayCell = (
                          <Box
                            sx={{
                              height: 38,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "50%",
                              fontSize: isMobile ? 11 : 12,
                              backgroundColor: isToday
                                ? headerColor
                                : isHoliday
                                  ? "#E8C999"
                                  : "#fff",
                              color: isToday ? "white" : "black",
                              fontWeight: isHoliday ? "bold" : "500",
                              cursor: isHoliday ? "pointer" : "default",
                              "&:hover": {
                                backgroundColor: isHoliday
                                  ? "#F5DFA6"
                                  : "#000",
                                color: isHoliday ? "black" : "white",
                              },
                            }}
                          >
                            {day}
                          </Box>
                        );

                        return isHoliday ? (
                          <MuiTooltip
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
                            {dayCell}
                          </MuiTooltip>
                        ) : (
                          <React.Fragment key={`${i}-${j}`}>
                            {dayCell}
                          </React.Fragment>
                        );
                      })
                    )}
                  </Box>
                </CardContent>
              </Card>

              {/* Applicants Per Month Bar Chart */}
              <Card sx={{ ...cardSx, p: 2, flexGrow: 1 }}>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{ color: "maroon", mb: 1 }}
                >
                  Applicants Per Month
                </Typography>
                <Box sx={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyApplicants}
                      margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tickFormatter={(m) => {
                          const [y, mo] = m.split("-");
                          return new Date(`${y}-${mo}-01`).toLocaleString(
                            "default",
                            { month: "short" }
                          );
                        }}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        wrapperStyle={{ zIndex: 9999 }}
                        labelFormatter={(m) => {
                          const [y, mo] = m.split("-");
                          return new Date(`${y}-${mo}-01`).toLocaleString(
                            "default",
                            { month: "long", year: "numeric" }
                          );
                        }}
                        formatter={(v) => [`${v} applicants`, "Total"]}
                      />
                      <Bar dataKey="total">
                        {monthlyApplicants.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              [
                                "#FF0000",
                                "#00C853",
                                "#2196F3",
                                "#FFD600",
                                "#FF6D00",
                              ][index % 5]
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Card>
            </Box>
          </Grid>

          {/* ── MIDDLE: Enrollment Statistics ── */}
          <Grid item xs={12} md={4.5} sx={{ display: "flex" }}>
            <Card
              sx={{
                ...cardSx,
                p: 3,
                backgroundColor: "#ffffff",
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography
                variant="h6"
                fontWeight="bold"
                color={subtitleColor}
                sx={{ textAlign: "center", mb: 2 }}
              >
                Enrollment Statistics
              </Typography>
              <Typography fontWeight="bold" mb={1}>
                Academic Program Distribution
              </Typography>
              <Box sx={{ width: "100%", height: 245, mb: 3 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={programData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="value">
                      {programData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={
                            ["#5C6BC0", "#26A69A", "#FFA726", "#8D6E63"][
                              index % 4
                            ]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>

              <Typography fontWeight="bold" mb={1}>
                Student Classification
              </Typography>
              <Box sx={{ width: "100%", flexGrow: 1, minHeight: 245 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={studentTypeData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="value">
                      {studentTypeData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={
                            [
                              "#EF5350",
                              "#66BB6A",
                              "#42A5F5",
                              "#FFCA28",
                              "#8D6E63",
                            ][index % 5]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Card>
          </Grid>

          {/* ── RIGHT: Applicant Overview ── */}
          <Grid item xs={12} md={4.5} sx={{ display: "flex" }}>
            <Card
              sx={{
                ...cardSx,
                p: 3,
                backgroundColor: "#ffffff",
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Title + School Year + Month filters */}
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1,
                  mb: 2,
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color={subtitleColor}
                >
                  Applicant Overview
                </Typography>
              </Box>

              {/* Stat boxes */}
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                {[
                  {
                    label: "Total Applicants",
                    value: applicant.totalApplicants,
                  },
                  { label: "Male", value: applicant.male },
                  { label: "Female", value: applicant.female },
                ].map((item, i) => (
                  <Grid item xs={4} key={i}>
                    <Box
                      sx={{
                        p: 2,
                        background: "#FCBEBB",
                        height: 100,
                        borderRadius: 2,
                        border: "2px solid black",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <Typography variant="h5" fontWeight="bold">
                        {item.value}
                      </Typography>
                      <Typography fontSize={12}>{item.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Typography
                variant="subtitle1"
                fontWeight={600}
                sx={{ mb: 1 }}
              >
                ECAT Monitoring Panel:
              </Typography>

              <Box
                sx={{
                  flexGrow: 1,
                  minHeight: 320,
                  background: "#f1f3f4",
                  border: "2px solid black",
                  borderRadius: 3,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={isMobile ? 70 : 100}
                        label
                      >
                        {pieData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={
                              [
                                "#0088FE",
                                "#00C49F",
                                "#FFBB28",
                                "#FF8042",
                              ][i]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography>Loading chart...</Typography>
                )}
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default Dashboard;
