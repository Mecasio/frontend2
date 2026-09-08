import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";

import axios from "axios";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  MenuItem,
  FormControl,
  IconButton,
  Select,
  InputLabel,
  Avatar,
  Button,
  Tooltip,
} from "@mui/material";
import { ArrowBackIos, ArrowForwardIos } from "@mui/icons-material";
import {
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  Tooltip as RechartsTooltip,
} from "recharts";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";

const EnrollingOfficerDashboard = ({ profileImage, setProfileImage }) => {
  const settings = useContext(SettingsContext);
  const navigate = useNavigate();

  // â”€â”€ Theme â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const colors = settings?.colors || {};
  const assets = settings?.assets || {};
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


  // â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [userID, setUserID] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userAccessList, setUserAccessList] = useState({});
  const pageId = 102;

  useEffect(() => {
    const email = localStorage.getItem("email");
    const role = localStorage.getItem("role");
    const id = localStorage.getItem("person_id");
    const empID = localStorage.getItem("employee_id");
    if (email && role && id && empID) {
      setUserRole(role);
      setUserID(id);
      setEmployeeID(empID);
      if (role === "registrar") {
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
        `${API_BASE_URL}/api/page_access/${empID}/${pageId}`,
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
        `${API_BASE_URL}/api/page_access/${empID}`,
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

  // â”€â”€ Reference data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [years, setYears] = useState([]);
  const [programOptions, setProgramOptions] = useState([]);
  const [userDep, setUserDepartment] = useState("");
  const [personData, setPersonData] = useState(null);
  const [hovered, setHovered] = useState(false);
  const fileInputRef = useRef(null);

  // â”€â”€ All students (raw from API) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // /api/student_number returns one row per student per enrolled subject
  // Fields include: student_number, campus, program_code, curriculum_id,
  // dprtmnt_id, semester_id, year_id, en_remarks, created_at,
  // year_level_description, semester_description, first_name, last_name
  const [allStudents, setAllStudents] = useState([]);

  // â”€â”€ Shared filter state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");

  // â”€â”€ Derived chart / stat state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [enrollmentData, setEnrollmentData] = useState([
    { name: "Techvoc", value: 0 },
    { name: "Graduate", value: 0 },
    { name: "Undergraduate", value: 0 },
    { name: "Returnee", value: 0 },
    { name: "Shiftee", value: 0 },
    { name: "Foreign Student", value: 0 },
    { name: "Transferee", value: 0 },
  ]);
  const [programStats, setProgramStats] = useState({
    total_applicants: 0,
    applicants_week: 0,
    applicants_month: 0,
  });
  const [sectionData, setSectionData] = useState([]);

  // â”€â”€ Misc counts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [professorCount, setProfessorCount] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [registrarCount, setRegistrarCount] = useState(0);

  // â”€â”€ Calendar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [date, setDate] = useState(new Date());
  const [holidays, setHolidays] = useState({});
  const calYear = date.getFullYear();
  const calMonth = date.getMonth();

  // â”€â”€ Load reference data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/year_table`)
      .then((res) => setYears(res.data))
      .catch(console.error);

    axios
      .get(`${API_BASE_URL}/api/enrolled-count`)
      .then((res) => setEnrolledCount(res.data.total))
      .catch(console.error);

    axios
      .get(`${API_BASE_URL}/api/professors`)
      .then((res) =>
        setProfessorCount(Array.isArray(res.data) ? res.data.length : 0),
      )
      .catch(console.error);

    axios
      .get(`${API_BASE_URL}/api/accepted-students-count`)
      .then((res) => setAcceptedCount(res.data.total))
      .catch(console.error);

    axios
      .get(`${API_BASE_URL}/api/registrar_count`)
      .then((res) => setRegistrarCount(res.data.count || 0))
      .catch(console.error);
  }, []);

  // â”€â”€ Set active school year as default â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/active_school_year`)
      .then((res) => {
        const active = res.data?.[0];
        if (active?.year_id) setSelectedYear(active.year_id);
      })
      .catch(console.error);
  }, []);

  // â”€â”€ Load user's department â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const email = localStorage.getItem("email");
    if (!email) return;
    axios
      .get(`${API_BASE_URL}/api/admin_data/${email}`)
      .then((res) => setUserDepartment(res.data?.dprtmnt_id || ""))
      .catch(console.error);
  }, []);

  // â”€â”€ Load programs for this department â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!userDep) return;
    axios
      .get(`${API_BASE_URL}/api/applied_program/${userDep}`)
      .then((res) => {
        const options = Array.isArray(res.data) ? res.data : [];
        setProgramOptions(options);
        // default to first program
        if (options.length > 0) {
          setSelectedProgram(String(options[0].curriculum_id));
        }
      })
      .catch(console.error);
  }, [userDep]);

  // â”€â”€ Fetch ALL students once â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/student_number`)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setAllStudents(data);
      })
      .catch((err) => console.error("Failed to fetch students:", err));
  }, []);

  // â”€â”€ Person data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const person_id = localStorage.getItem("person_id");
    const role = localStorage.getItem("role");
    if (person_id && role) {
      axios
        .get(`${API_BASE_URL}/api/person_data/${person_id}/${role}`)
        .then((res) => setPersonData(res.data))
        .catch(console.error);
    }
  }, []);

  useEffect(() => {
    const handleProfileImageUpdated = (event) => {
      if (event.detail?.role !== "registrar") return;
      if (event.detail.profileImage) {
        setProfileImage(event.detail.profileImage);
      }
      if (event.detail.profileFile) {
        setPersonData((prev) =>
          prev ? { ...prev, profile_image: event.detail.profileFile } : prev,
        );
      }
    };

    window.addEventListener("profile-image-updated", handleProfileImageUpdated);
    return () => {
      window.removeEventListener("profile-image-updated", handleProfileImageUpdated);
    };
  }, [setProfileImage]);

  // â”€â”€ Holidays â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    axios
      .get(`https://date.nager.at/api/v3/PublicHolidays/${calYear}/PH`)
      .then((res) => {
        const lookup = {};
        res.data.forEach((h) => {
          lookup[h.date] = h;
        });
        setHolidays(lookup);
      })
      .catch(() => setHolidays({}));
  }, [calYear]);

  // â”€â”€ CORE: recompute everything when filters or data changes â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!allStudents.length) return;

    // â”€â”€ Step 1: apply filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let filtered = [...allStudents];

    if (selectedYear) {
      filtered = filtered.filter(
        (s) => String(s.year_id) === String(selectedYear),
      );
    }

    if (selectedProgram) {
      filtered = filtered.filter(
        (s) => String(s.curriculum_id) === String(selectedProgram),
      );
    }

    if (userDep) {
      filtered = filtered.filter(
        (s) => String(s.dprtmnt_id) === String(userDep),
      );
    }

    // â”€â”€ Step 2: deduplicate by student_number â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Each student appears once per enrolled subject â€” collapse to unique students
    const seen = new Set();
    const unique = filtered.filter((s) => {
      if (seen.has(s.student_number)) return false;
      seen.add(s.student_number);
      return true;
    });

    // â”€â”€ Step 3: Enrollment Statistics pie chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // academicProgram: "0" = Undergraduate, "1" = Graduate, "2" = Techvoc
    // classifiedAs: "Returnee" | "Shiftee" | "Foreign Student" | "Transferee" | others
    const countBy = (field, val) =>
      unique.filter((s) => String(s[field]) === String(val)).length;

    setEnrollmentData([
      { name: "Techvoc", value: countBy("academicProgram", "2") },
      { name: "Graduate", value: countBy("academicProgram", "1") },
      { name: "Undergraduate", value: countBy("academicProgram", "0") },
      { name: "Returnee", value: countBy("classifiedAs", "Returnee") },
      { name: "Shiftee", value: countBy("classifiedAs", "Shiftee") },
      {
        name: "Foreign Student",
        value: countBy("classifiedAs", "Foreign Student"),
      },
      { name: "Transferee", value: countBy("classifiedAs", "Transferee") },
    ]);

    // â”€â”€ Step 4: Program stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const now = new Date();

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    setProgramStats({
      total_applicants: unique.length,
      applicants_week: unique.filter((s) => {
        const d = new Date(s.created_at);
        return d >= weekStart && d <= weekEnd;
      }).length,
      applicants_month: unique.filter((s) => {
        const d = new Date(s.created_at);
        return d >= monthStart && d <= monthEnd;
      }).length,
    });

    // â”€â”€ Step 5: Class Population Tracker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Group unique students by year_level_description
    const groups = {};
    unique.forEach((s) => {
      const key =
        s.year_level_description || s.semester_description || "Unknown";
      if (!groups[key]) groups[key] = 0;
      groups[key]++;
    });

    setSectionData(
      Object.entries(groups)
        .map(([name, students]) => ({ name, students }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }, [allStudents, selectedYear, selectedProgram, userDep]);

  // â”€â”€ Pie chart: fallback to enrollment stats API if allStudents â”€â”€
  // fields don't include academicProgram / classifiedAs
  // This effect only runs when allStudents is populated but the
  // pie chart is still all zeros (meaning those fields are missing)
  useEffect(() => {
    const allZero = enrollmentData.every((d) => d.value === 0);
    if (!allZero) return; // already computed from client data
    if (!selectedYear || !userDep) return;

    const yearDesc =
      years.find((y) => String(y.year_id) === String(selectedYear))
        ?.year_description || "";

    if (!yearDesc) return;

    axios
      .get(
        `${API_BASE_URL}/api/get_enrollment_statistic/college/${yearDesc}/${userDep}`,
      )
      .then((res) => {
        const d = res.data;
        if (!d) return;
        setEnrollmentData([
          { name: "Techvoc", value: Number(d.Techvoc) || 0 },
          { name: "Graduate", value: Number(d.Graduate) || 0 },
          { name: "Undergraduate", value: Number(d.Undergraduate) || 0 },
          { name: "Returnee", value: Number(d.Returnee) || 0 },
          { name: "Shiftee", value: Number(d.Shiftee) || 0 },
          { name: "Foreign Student", value: Number(d.ForeignStudent) || 0 },
          { name: "Transferee", value: Number(d.Transferee) || 0 },
        ]);
      })
      .catch(console.error);
  }, [enrollmentData, selectedYear, userDep, years]);

  // â”€â”€ Profile upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const role = localStorage.getItem("role");
      const accountRes = await axios.get(
        `${API_BASE_URL}/api/get_user_account_id/${personData.person_id}`,
      );
      const user_account_id = accountRes.data.user_account_id;
      const formData = new FormData();
      formData.append("profile_picture", file);
      await axios.post(
        `${API_BASE_URL}/api/update_registrar/${user_account_id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const refreshed = await axios.get(
        `${API_BASE_URL}/api/person_data/${personData.person_id}/${role}`,
      );
      setPersonData(refreshed.data);
      setProfileImage(
        `${API_BASE_URL}/uploads/Admin1by1/${refreshed.data.profile_image}?t=${Date.now()}`,
      );
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  // â”€â”€ Calendar helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const nowDate = new Date();
  const manilaDate = new Date(
    nowDate.toLocaleString("en-US", { timeZone: "Asia/Manila" }),
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
      week.push(currentDay > 0 && currentDay <= totalDays ? currentDay : null);
      currentDay++;
    }
    weeks.push(week);
  }
  const handlePrevMonth = () => setDate(new Date(calYear, calMonth - 1, 1));
  const handleNextMonth = () => setDate(new Date(calYear, calMonth + 1, 1));
  const days = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const enrollmentColors = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#7E57C2",
    "#26A69A",
    "#EC407A",
  ];

  const backgroundImage =
    assets.backgroundImage || "linear-gradient(to right, #e0e0e0, #bdbdbd)";

  if (loading || hasAccess === null)
    return <LoadingOverlay open={loading} message="Loading..." />;
  if (!hasAccess) return <Unauthorized />;

     // ðŸ”’ Disable right-click
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    // ðŸ”’ Block DevTools shortcuts + Ctrl+P silently
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
        height: "calc(100vh - 100px)",
        width: "100%",
        backgroundImage,
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
          backgroundColor: "rgba(0, 0, 0, 0.1)",
          backdropFilter: "blur(0.5px)",
          WebkitBackdropFilter: "blur(0.5px)",
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
          padding: 2,
        }}
      >
        {/* â”€â”€ Welcome card â”€â”€ */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card
              sx={{
                border: `2px solid ${borderColor}`,
                boxShadow: 3,
                height: "140px",
                marginLeft: "10px",
                backgroundColor: "#fff9ec",
                p: 2,
                width: "99%",
                borderRadius: 3,
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
                "&:hover": { transform: "scale(1.05)", boxShadow: 6 },
              }}
            >
              <CardContent>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box display="flex" alignItems="center">
                    <Box
                      position="relative"
                      display="inline-block"
                      mr={2}
                      onMouseEnter={() => setHovered(true)}
                      onMouseLeave={() => setHovered(false)}
                    >
                      <Avatar
                        src={
                          profileImage ||
                          (personData?.profile_image
                            ? `${API_BASE_URL}/uploads/Admin1by1/${personData.profile_image}`
                            : undefined)
                        }
                        alt={personData?.fname}
                        sx={{
                          width: 90,
                          height: 90,
                          border: `2px solid ${borderColor}`,
                          cursor: "pointer",
                          mt: -1.5,
                        }}
                        onClick={() => fileInputRef.current.click()}
                      >
                        {personData?.fname?.[0]}
                      </Avatar>

                      {hovered && (
                        <label
                          onClick={() => fileInputRef.current.click()}
                          style={{
                            position: "absolute",
                            bottom: "-5px",
                            right: 0,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                            backgroundColor: "#ffffff",
                            border: `2px solid ${borderColor}`,
                            width: "36px",
                            height: "36px",
                          }}
                        >
                          <AddCircleIcon
                            sx={{
                              color: headerColor,
                              fontSize: 32,
                              borderRadius: "50%",
                            }}
                          />
                        </label>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                      />
                    </Box>

                    <Box sx={{ color: titleColor }}>
                      <Typography variant="h4" fontWeight="bold" mt={-1}>
                        Welcome back!{" "}
                        {personData
                          ? `${personData.lname}, ${personData.fname} ${
                              personData.mname || ""
                            }`
                          : ""}
                      </Typography>
                      <Typography variant="body1" color="black" fontSize={20}>
                        <b>Employee ID:</b> {personData?.employee_id || "N/A"}
                      </Typography>
                    </Box>
                  </Box>

                  <Box textAlign="right" sx={{ color: "black" }}>
                    <Typography variant="body1" fontSize="20px">
                      {formattedDate}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box style={{ display: "flex" }}>
          {/* â”€â”€ Left: Enrollment Statistics â”€â”€ */}
          <Card
            sx={{
              width: 600,
              height: 610,
              p: 3,
              borderRadius: 3,
              marginTop: 2.5,
              marginLeft: 1.5,
              boxShadow: 3,
              border: `2px solid ${borderColor}`,
              background: "#ffffff",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography
              variant="h6"
              fontWeight="bold"
              color={subtitleColor}
              sx={{ textAlign: "center", mb: 1 }}
            >
              Enrollment Statistics
            </Typography>

            {/* Shared filters â€” control ALL three sections */}
            <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>School Year</InputLabel>
                <Select
                  value={selectedYear}
                  label="School Year"
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {years.map((yr) => (
                    <MenuItem key={yr.year_id} value={yr.year_id}>
                      {yr.year_description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Program</InputLabel>
                <Select
                  value={selectedProgram}
                  label="Program"
                  onChange={(e) => setSelectedProgram(e.target.value)}
                >
                  <MenuItem value="">All Programs</MenuItem>
                  {programOptions.map((opt) => (
                    <MenuItem
                      key={opt.curriculum_id}
                      value={String(opt.curriculum_id)}
                    >
                      {opt.program_code} - {opt.program_description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Pie chart */}
            <Box
              sx={{
                flex: 1,
                background: "#f1f3f4",
                borderRadius: 3,
                border: "1px dashed #bfc4cc",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {enrollmentData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={enrollmentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label
                    >
                      {enrollmentData.map((_, i) => (
                        <Cell
                          key={`cell-${i}`}
                          fill={enrollmentColors[i % enrollmentColors.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary">
                  No data available
                </Typography>
              )}
            </Box>
          </Card>

          {/* â”€â”€ Middle column â”€â”€ */}
          <Box>
            {/* Total Student Per Program */}
            <Card
              sx={{
                marginTop: 2.5,
                marginLeft: 2.1,
                width: 480,
                height: 220,
                p: 2,
                borderRadius: 3,
                boxShadow: 3,
                background: "#ffffff",
                display: "flex",
                border: `2px solid ${borderColor}`,
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color={subtitleColor}
                >
                  Total Student Per Program
                </Typography>
              </Box>

              {/* Active filter label */}
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.5, fontSize: 12 }}
              >
                {selectedProgram
                  ? programOptions.find(
                      (o) =>
                        String(o.curriculum_id) === String(selectedProgram),
                    )?.program_description || "Selected program"
                  : "All Programs"}
                {selectedYear
                  ? ` Â· ${
                      years.find(
                        (y) => String(y.year_id) === String(selectedYear),
                      )?.year_description || ""
                    }`
                  : ""}
              </Typography>

              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: "#fef9e1",
                      border: "2px solid black",
                      textAlign: "center",
                      height: 90,
                    }}
                  >
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      sx={{ marginTop: "9px" }}
                    >
                      {programStats.total_applicants}
                    </Typography>
                    <Typography fontSize={12}>Total Students</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: "#fef9e1",
                      border: "2px solid black",
                      textAlign: "center",
                      height: 90,
                    }}
                  >
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      sx={{ marginTop: "9px" }}
                    >
                      {programStats.applicants_week}
                    </Typography>
                    <Typography fontSize={12}>This Week</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 2,
                      backgroundColor: "#fef9e1",
                      border: "2px solid black",
                      textAlign: "center",
                      height: 90,
                    }}
                  >
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      sx={{ marginTop: "9px" }}
                    >
                      {programStats.applicants_month}
                    </Typography>
                    <Typography fontSize={12}>This Month</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Card>

            {/* Class Population Tracker */}
            <Card
              sx={{
                width: 480,
                height: 370,
                p: 3,
                marginTop: 2.5,
                marginLeft: 2,
                border: `2px solid ${borderColor}`,
                borderRadius: 3,
                boxShadow: 3,
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography
                variant="h6"
                fontWeight="bold"
                sx={{ textAlign: "center", mb: 2, color: subtitleColor }}
              >
                Class Population Tracker
              </Typography>

              <Box
                sx={{
                  flexGrow: 1,
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
              >
                {sectionData.length > 0 ? (
                  sectionData.map((section, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                        p: 1,
                        borderRadius: 2,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        border: "2px solid black",
                        "&:hover": {
                          backgroundColor: mainButtonColor,
                          color: "white",
                        },
                      }}
                    >
                      <Typography
                        fontWeight="medium"
                        style={{ padding: "5px" }}
                      >
                        {section.name}
                      </Typography>
                      <Typography style={{ padding: "5px" }}>
                        {section.students} student
                        {section.students !== 1 ? "s" : ""} enrolled
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography
                    color="text.secondary"
                    sx={{ textAlign: "center", mt: 2 }}
                  >
                    No data available
                  </Typography>
                )}
              </Box>
            </Card>
          </Box>

          {/* â”€â”€ Right column â”€â”€ */}
          <Box>
            {/* Calendar */}
            <Card
              sx={{
                border: `2px solid ${borderColor}`,
                marginLeft: 2.2,
                boxShadow: 3,
                p: 2,
                width: 425,
                height: 400,
                marginTop: 2.5,
                display: "flex",
                borderRadius: "10px",
                transition: "transform 0.2s ease",
                "&:hover": { transform: "scale(1.03)" },
                flexDirection: "column",
                justifyContent: "flex-start",
                alignItems: "center",
              }}
            >
              <CardContent sx={{ p: 0, width: "100%" }}>
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
                      onClick={handlePrevMonth}
                      sx={{ color: "white" }}
                    >
                      <ArrowBackIos fontSize="small" />
                    </IconButton>
                  </Grid>
                  <Grid item>
                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                      {date.toLocaleString("default", { month: "long" })}{" "}
                      {calYear}
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
                            sx={{
                              height: 45,
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
                        calMonth + 1,
                      ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const isHoliday = holidays[dateKey];

                      const dayCell = (
                        <Box
                          sx={{
                            height: 45,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                            backgroundColor: isToday
                              ? headerColor
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
                          {dayCell}
                        </Tooltip>
                      ) : (
                        <React.Fragment key={`${i}-${j}`}>
                          {dayCell}
                        </React.Fragment>
                      );
                    }),
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* Enrolled Student actions */}
            <Card
              sx={{
                marginTop: 2.5,
                marginLeft: 2.1,
                width: 425,
                height: 190,
                p: 3,
                borderRadius: 3,
                boxShadow: 3,
                border: `2px solid ${borderColor}`,
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Typography
                variant="h6"
                fontWeight="bold"
                color={subtitleColor}
                sx={{ mb: 2 }}
              >
                Enrolled Student
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  width: "100%",
                }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ textTransform: "none" }}
                  onClick={() => navigate("/student_numbering_per_college")}
                >
                  Assign Student Number
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  sx={{ textTransform: "none" }}
                  onClick={() => navigate("/course_tagging_for_college")}
                >
                  Assign Subject To Student
                </Button>
              </Box>
            </Card>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default EnrollingOfficerDashboard;