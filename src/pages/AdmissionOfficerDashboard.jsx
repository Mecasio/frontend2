import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import { SettingsContext } from "../App";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import axios from "axios";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  MenuItem,
  Button,
  FormControl,
  IconButton,
  Select,
  InputLabel,
  Avatar,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ArrowBackIos, ArrowForwardIos } from "@mui/icons-material";
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
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import AdmissionsReportPanel from "../components/AdmissionsReportPanel";

const AdmissionOfficerDashboard = ({ profileImage, setProfileImage }) => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const isLaptop = useMediaQuery(theme.breakpoints.down("lg"));

  // ── Theme colors ────────────────────────────────────────────────
  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [stepperColor, setStepperColor] = useState("#000000");
  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState("all");

  useEffect(() => {
    if (!settings) return;
    // company_settings.branches -> [{ id, branch_name }, ...]
    if (Array.isArray(settings.branches)) setCampuses(settings.branches);
  }, [settings]);

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.stepper) setStepperColor(colors.stepper);
    if (assets.logoUrl)
      setFetchedLogo(assets.logoUrl);
    else setFetchedLogo(EaristLogo);
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);

  // ── Auth ────────────────────────────────────────────────────────
  const [userID, setUserID] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userAccessList, setUserAccessList] = useState({});
  const pageId = 103;

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

  // ── Data state ──────────────────────────────────────────────────
  const [allApplicants, setAllApplicants] = useState([]);
  const [allCurriculums, setAllCurriculums] = useState([]);
  const [curriculumOptions, setCurriculumOptions] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [semesters, setSchoolSemester] = useState([]);
  const [department, setDepartment] = useState([]);

  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedSchoolSemester, setSelectedSchoolSemester] = useState("");
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
  const [selectedProgramFilter, setSelectedProgramFilter] = useState("");

  const [totalApplicants, setTotalApplicants] = useState(0);
  const [weekApplicants, setWeekApplicants] = useState(0);
  const [monthApplicants, setMonthApplicants] = useState(0);
  const [monthlyApplicants, setMonthlyApplicants] = useState([]);
  const [pieData, setPieData] = useState([]);

  const [enrolledCount, setEnrolledCount] = useState(0);
  const [professorCount, setProfessorCount] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [registrarCount, setRegistrarCount] = useState(0);
  const [personData, setPersonData] = useState(null);
  const [hovered, setHovered] = useState(false);
  const fileInputRef = useRef(null);

  const [date, setDate] = useState(new Date());
  const [holidays, setHolidays] = useState({});
  const year = date.getFullYear();
  const month = date.getMonth();

  const dedupeByProgramCode = (list) => {
    const seen = new Map();
    for (const item of list) {
      if (!seen.has(item.program_code)) {
        seen.set(item.program_code, item);
      }
    }
    return [...seen.values()];
  };

  // ── Reference data loads ────────────────────────────────────────
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/applied_program`)
      .then((res) => {
        const deduped = dedupeByProgramCode(res.data);
        setAllCurriculums(deduped);
        setCurriculumOptions(deduped);
      })

      .catch(console.error);

    axios
      .get(`${API_BASE_URL}/api/get_school_year/`)
      .then((res) => setSchoolYears(res.data))
      .catch(console.error);

    axios
      .get(`${API_BASE_URL}/api/get_school_semester/`)
      .then((res) => setSchoolSemester(res.data))
      .catch(console.error);

    axios
      .get(`${API_BASE_URL}/api/departments`)
      .then((res) => setDepartment(res.data))
      .catch(console.error);

    axios
      .get(`${API_BASE_URL}/api/active_school_year`)
      .then((res) => {
        if (res.data.length > 0) {
          setSelectedSchoolYear(res.data[0].year_id);
          setSelectedSchoolSemester(res.data[0].semester_id);
        }
      })
      .catch(console.error);

    axios
      .get(`${API_BASE_URL}/api/professors`)
      .then((res) =>
        setProfessorCount(Array.isArray(res.data) ? res.data.length : 0),
      )
      .catch(console.error);

    axios
      .get(`${API_BASE_URL}/api/registrar_count`)
      .then((res) => setRegistrarCount(res.data.count || 0))
      .catch(console.error);
  }, []);

  // ── Fetch all applicants once ───────────────────────────────────
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/all-applicants`)
      .then((res) => setAllApplicants(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Failed to fetch applicants:", err));
  }, []);

  // ── Person data ─────────────────────────────────────────────────
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
      window.removeEventListener(
        "profile-image-updated",
        handleProfileImageUpdated,
      );
    };
  }, [setProfileImage]);

  // ── Holidays ────────────────────────────────────────────────────
  useEffect(() => {
    axios
      .get(`https://date.nager.at/api/v3/PublicHolidays/${year}/PH`)
      .then((res) => {
        const lookup = {};
        res.data.forEach((h) => {
          lookup[h.date] = h;
        });
        setHolidays(lookup);
      })
      .catch(() => setHolidays({}));
  }, [year]);

  // ── Shared deps & filter ────────────────────────────────────────
  const SHARED_DEPS = [
    allApplicants,
    allCurriculums,
    semesters,
    schoolYears,
    selectedSchoolYear,
    selectedSchoolSemester,
    selectedDepartmentFilter,
    selectedProgramFilter,
    selectedCampus,
  ];

  const applyFilters = () => {
    let filtered = [...allApplicants];

    if (selectedCampus !== "all" && selectedCampus !== "") {
      filtered = filtered.filter(
        (p) => String(p.campus) === String(selectedCampus),
      );
    }

    if (selectedSchoolYear) {
      const sy = schoolYears.find(
        (s) => String(s.year_id) === String(selectedSchoolYear),
      );
      if (sy) {
        const yearNum = Number(sy.current_year);
        filtered = filtered.filter(
          (p) => new Date(p.created_at).getFullYear() === yearNum,
        );
      }
    }

    if (selectedSchoolSemester) {
      const sem = semesters.find(
        (s) => String(s.semester_id) === String(selectedSchoolSemester),
      );
      if (sem) {
        filtered = filtered.filter(
          (p) => String(p.middle_code) === String(sem.semester_code),
        );
      }
    }

    if (selectedDepartmentFilter) {
      const ids = allCurriculums
        .filter((c) => c.dprtmnt_name === selectedDepartmentFilter)
        .map((c) => String(c.curriculum_id));
      filtered = filtered.filter((p) => ids.includes(String(p.program)));
    }

    if (selectedProgramFilter) {
      const ids = allCurriculums
        .filter((c) => c.program_code === selectedProgramFilter)
        .map((c) => String(c.curriculum_id));
      filtered = filtered.filter((p) => ids.includes(String(p.program)));
    }

    return filtered;
  };

  const resolvedSchoolYear = useMemo(() => {
    const sy = schoolYears.find(
      (s) => String(s.year_id) === String(selectedSchoolYear),
    );
    return sy ? Number(sy.current_year) : "";
  }, [schoolYears, selectedSchoolYear]);

  const resolvedSemester = useMemo(() => selectedSchoolSemester, [selectedSchoolSemester]); // ✅ send semester_id directly

  // ── Stats ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!allApplicants.length) return;
    const filtered = applyFilters();
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

    setTotalApplicants(filtered.length);
    setWeekApplicants(
      filtered.filter((p) => {
        const d = new Date(p.created_at);
        return d >= weekStart && d <= weekEnd;
      }).length,
    );
    setMonthApplicants(
      filtered.filter((p) => {
        const d = new Date(p.created_at);
        return d >= monthStart && d <= monthEnd;
      }).length,
    );
  }, SHARED_DEPS); // eslint-disable-line

  // ── Bar chart ───────────────────────────────────────────────────
  useEffect(() => {
    if (!allApplicants.length) return;
    const filtered = applyFilters();
    const currentYear = new Date().getFullYear();
    const monthCounts = {};
    for (let i = 1; i <= 12; i++) {
      monthCounts[`${currentYear}-${String(i).padStart(2, "0")}`] = 0;
    }
    filtered.forEach((p) => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0",
      )}`;
      if (monthCounts[key] !== undefined) monthCounts[key]++;
    });
    setMonthlyApplicants(
      Object.entries(monthCounts).map(([month, total]) => ({
        month,
        total,
      })),
    );
  }, SHARED_DEPS); // eslint-disable-line

  useEffect(() => {
    const params = selectedCampus !== "all" ? { campus: selectedCampus } : {};

    axios
      .get(`${API_BASE_URL}/api/enrolled-count`, { params })
      .then((res) => setEnrolledCount(res.data.total))
      .catch(console.error);

    axios
      .get(`${API_BASE_URL}/api/accepted-students-count`, { params })
      .then((res) => setAcceptedCount(res.data.total))
      .catch(console.error);
  }, [selectedCampus]);

  useEffect(() => {
    const params = {};
    if (selectedCampus !== "all") params.campus = selectedCampus;
    if (resolvedSchoolYear) params.school_year = resolvedSchoolYear;
    if (resolvedSemester) params.semester = resolvedSemester;

    axios
      .get(`${API_BASE_URL}/api/ecat-summary`, { params })
      .then((res) => {
        const s = res.data || {};
        setPieData([
          { name: "Applied", value: Number(s.total_applied) || 0 },
          { name: "Scheduled", value: Number(s.total_scheduled) || 0 },
          { name: "Pending", value: Number(s.total_pending) || 0 },
          { name: "Finished", value: Number(s.total_finished) || 0 },
        ]);
      })
      .catch(console.error);
  }, [selectedCampus, resolvedSchoolYear, resolvedSemester]);
  // ── Department change ───────────────────────────────────────────
  const handleDepartmentChange = (selectedDept) => {
    setSelectedDepartmentFilter(selectedDept);
    setCurriculumOptions(
      selectedDept
        ? allCurriculums.filter((opt) => opt.dprtmnt_name === selectedDept)
        : allCurriculums,
    );
    setSelectedProgramFilter("");
  };

  // ── Profile upload ──────────────────────────────────────────────
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

  // ── Calendar helpers ────────────────────────────────────────────
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
      week.push(currentDay > 0 && currentDay <= totalDays ? currentDay : null);
      currentDay++;
    }
    weeks.push(week);
  }
  const handlePrevMonth = () => setDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setDate(new Date(year, month + 1, 1));
  const days = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];

  const MONTH_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

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
        minHeight: "calc(100vh - 100px)",
        width: "100%",
        backgroundColor: "transparent",
        overflowY: "auto",
        fontFamily: "Poppins, sans-serif",
      }}
    >


      {/* Scrollable content */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          padding: isMobile ? 1 : 2,
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
            boxShadow: 3,
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
            "&:hover": {
              transform: "scale(1.01)",
              boxShadow: 6,
            },
          }}
        >
          <Box
            sx={{
              px: { xs: 2, md: 4 },
              py: { xs: 2, md: 3 },
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            {/* LEFT SIDE */}
            <Box display="flex" alignItems="center" gap={{ xs: 1.5, md: 2 }}>
              {/* AVATAR */}
              <Box
                position="relative"
                display="inline-flex"
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
                  alt={personData?.fname || "Admin"}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    width: { xs: 60, sm: 70, md: 80 },
                    height: { xs: 60, sm: 70, md: 80 },
                    border: "2px solid white",
                    bgcolor: "rgba(255,255,255,0.15)",
                    cursor: "pointer",
                    color: "white",
                    fontSize: { xs: 24, md: 30 },
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
                      bottom: -5,
                      right: -2,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      backgroundColor: "#ffffff",
                      border: `2px solid ${borderColor}`,
                      width: { xs: 28, md: 32 },
                      height: { xs: 28, md: 32 },
                      p: 0,
                      "&:hover": {
                        backgroundColor: "#f5f5f5",
                      },
                    }}
                  >
                    <AddCircleIcon
                      sx={{
                        color: headerColor,
                        fontSize: { xs: 23, md: 27 },
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
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: {
                      xs: "21px",
                      sm: "27px",
                      md: "32px",
                    },
                    fontWeight: 800,
                    lineHeight: 1.1,
                    color: "white",
                    wordBreak: "break-word",
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
                    fontSize: {
                      xs: "14px",
                      sm: "18px",
                      md: "22px",
                    },
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
            </Box>
          </Box>
        </Box>
        {/* ── Main grid ── */}
        <Grid
          container
          spacing={2}
          alignItems="stretch"
          sx={{
            width: "100%",
            margin: 0,
            mb: 2,
            boxSizing: "border-box",
          }}
        >
          {/* ── Left column ── */}
          <Grid
            item
            xs={12}
            sm={6}
            md={4}
            lg={3}
            sx={{ display: "flex", marginLeft: "-0.5rem" }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                gap: 2,
              }}
            >
              {/* ECAT Monitoring Panel */}
              <Card
                sx={{
                  border: `2px solid ${borderColor}`,
                  borderRadius: 3,
                  p: 2,
                  boxShadow: 3,
                  background: "#ffffff",
                  display: "flex",
                  flexDirection: "column",
                  flexGrow: 1,
                  minHeight: 400,
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{
                    textAlign: "center",
                    color: subtitleColor,
                    mb: 1,
                  }}
                >
                  ECAT Monitoring Panel
                </Typography>
                <Box
                  sx={{
                    flexGrow: 1,
                    background: "#f1f3f4",
                    borderRadius: 3,
                    border: "1px dashed #bfc4cc",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={isMobile ? 70 : 90}
                          label
                        >
                          {pieData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={
                                ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"][i]
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

              {/* Admission Create */}
              <Card
                sx={{
                  border: `2px solid ${borderColor}`,
                  borderRadius: 3,
                  p: 2,
                  boxShadow: 3,
                  background: "#ffffff",
                  flexShrink: 0,
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{
                    textAlign: "center",
                    color: subtitleColor,
                    mb: 2,
                  }}
                >
                  Admission Create
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{
                      textTransform: "none",
                      fontSize: isMobile ? 14 : 16,
                      height: "50px",
                      border: `2px solid ${borderColor}`,
                      background: mainButtonColor,
                    }}
                    onClick={() => {
                      window.location.href = "/admission_applicant_list";
                    }}
                  >
                    Applicant List
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{
                      textTransform: "none",
                      fontSize: isMobile ? 14 : 16,
                      height: "50px",
                      background: mainButtonColor,
                      border: `2px solid ${borderColor}`,
                    }}
                    onClick={() => {
                      window.location.href =
                        "/entrance_exam_schedule_management";
                    }}
                  >
                    Entrance Exam Schedule Management
                  </Button>
                </Box>
              </Card>
            </Box>
          </Grid>

          {/* ── Centre: Applicant Overview ── */}
          <Grid item xs={12} sm={12} md={8} lg={6} sx={{ display: "flex" }}>
            <Card
              sx={{
                width: "100%",
                height: "100%",
                minHeight: 650,
                p: 3,
                borderRadius: 3,
                boxShadow: 3,
                display: "flex",
                flexDirection: "column",
                background: "#ffffff",
                border: `2px solid ${borderColor}`,
              }}
            >
              {/* Header + filters */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 2,
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color={subtitleColor}
                >
                  Applicant Overview
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
                    <InputLabel id="campus-label">Campus</InputLabel>
                    <Select
                      labelId="campus-label"
                      value={selectedCampus}
                      label="Campus"
                      onChange={(e) => setSelectedCampus(e.target.value)}
                    >
                      <MenuItem value="all">All Campuses</MenuItem>
                      {campuses.map((c) => (
                        <MenuItem value={c.id} key={c.id}>
                          {c.branch || c.branch_name || "Unnamed Branch"}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
                    <InputLabel id="school-year-label">School Year</InputLabel>
                    <Select
                      labelId="school-year-label"
                      value={selectedSchoolYear}
                      label="School Year"
                      onChange={(e) => setSelectedSchoolYear(e.target.value)}
                    >
                      <MenuItem value="">All Years</MenuItem>
                      {schoolYears.map((sy) => (
                        <MenuItem value={sy.year_id} key={sy.year_id}>
                          {sy.current_year} - {sy.next_year}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 140, flex: 1 }}>
                    <InputLabel>Semester</InputLabel>
                    <Select
                      label="Semester"
                      value={selectedSchoolSemester}
                      onChange={(e) =>
                        setSelectedSchoolSemester(e.target.value)
                      }
                    >
                      <MenuItem value="">All Semesters</MenuItem>
                      {semesters.map((sem) => (
                        <MenuItem value={sem.semester_id} key={sem.semester_id}>
                          {sem.semester_description}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* Stat boxes */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  { label: "Total Applicants", value: totalApplicants },
                  { label: "This Week", value: weekApplicants },
                  { label: "This Month", value: monthApplicants },
                ].map((item) => (
                  <Grid item xs={4} key={item.label}>
                    <Box
                      sx={{
                        p: 1,
                        backgroundColor: "#fef9e1",
                        borderRadius: 2,
                        border: "2px solid black",
                        textAlign: "center",
                        height: 90,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <Typography variant="h5" fontWeight="bold">
                        {item.value}
                      </Typography>
                      <Typography fontSize={13}>{item.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Typography
                variant="subtitle1"
                fontWeight={600}
                sx={{ mb: 1, color: subtitleColor }}
              >
                Applicants Per Month:
              </Typography>

              <Box
                sx={{
                  flexGrow: 1,
                  background: "#f1f3f4",
                  borderRadius: 3,
                  border: "2px solid black",
                  minHeight: 0,
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyApplicants}
                    margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(v) => {
                        const [, m] = v.split("-");
                        return MONTH_SHORT[Number(m) - 1];
                      }}
                    />
                    <YAxis />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.1)" }}
                      formatter={(v) => [`${v} applicants`, "Total"]}
                      labelFormatter={(label) => {
                        const [yr, m] = label.split("-");
                        return `${MONTH_SHORT[Number(m) - 1]} ${yr}`;
                      }}
                    />
                    <Bar dataKey="total">
                      {monthlyApplicants.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={mainButtonColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Card>
          </Grid>

          {/* ── Right column ── */}
          <Grid item xs={12} sm={6} md={4} lg={3} sx={{ display: "flex" }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                gap: 2,
              }}
            >
              {/* Calendar */}
              <Card
                sx={{
                  border: `2px solid ${borderColor}`,
                  boxShadow: 3,
                  p: 2,
                  borderRadius: "10px",
                  transition: "transform 0.2s ease",
                  "&:hover": { transform: "scale(1.02)" },
                  flexShrink: 0,
                }}
              >
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
                        onClick={handlePrevMonth}
                        sx={{ color: "white" }}
                      >
                        <ArrowBackIos fontSize="small" />
                      </IconButton>
                    </Grid>
                    <Grid item>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: "bold" }}
                      >
                        {date.toLocaleString("default", { month: "long" })}{" "}
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
                              height: 38,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: isMobile ? 11 : 13,
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
                      }),
                    )}
                  </Box>
                </CardContent>
              </Card>

              {/* Total Applicant Per Department */}
              <Card
                sx={{
                  p: 2,
                  borderRadius: 3,
                  boxShadow: 3,
                  background: "#ffffff",
                  border: `2px solid ${borderColor}`,
                  flexGrow: 1,
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  sx={{ mb: 1.5 }}
                  color={subtitleColor}
                >
                  Total Applicant Per Department
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    mb: 2,
                  }}
                >
                  <FormControl size="small" fullWidth>
                    <Select
                      value={selectedDepartmentFilter}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">Select College</MenuItem>
                      {department.map((dep) => (
                        <MenuItem key={dep.dprtmnt_id} value={dep.dprtmnt_name}>
                          {dep.dprtmnt_name} ({dep.dprtmnt_code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" fullWidth>
                    <Select
                      value={selectedProgramFilter}
                      onChange={(e) => setSelectedProgramFilter(e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">All Programs</MenuItem>
                      {curriculumOptions.map((prog) => (
                        <MenuItem
                          key={prog.curriculum_id}
                          value={prog.program_code}
                        >
                          {prog.program_code} - {prog.program_description}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Grid container spacing={1}>
                  {[
                    { label: "Total Applicants", value: totalApplicants },
                    { label: "This Week", value: weekApplicants },
                    { label: "This Month", value: monthApplicants },
                  ].map((item) => (
                    <Grid item xs={4} key={item.label}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          background: "#FCBEBB",
                          border: "2px solid black",
                          textAlign: "center",
                          height: 80,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                        }}
                      >
                        <Typography variant="h6" fontWeight="bold">
                          {item.value}
                        </Typography>
                        <Typography fontSize={11}>{item.label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Card>
            </Box>
          </Grid>
        </Grid>
        <AdmissionsReportPanel
          campuses={campuses}
          selectedCampus={selectedCampus}
          schoolYear={resolvedSchoolYear}
          semester={resolvedSemester}
        />
      </Box>
    </Box>
  );
};

export default AdmissionOfficerDashboard;
