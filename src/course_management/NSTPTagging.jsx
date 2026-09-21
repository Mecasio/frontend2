import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  Snackbar,
  Alert,
  Chip,
  Divider,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  PersonAdd as EnrollIcon,
  PersonRemove as UnenrollIcon,
  GroupAdd as EnrollAllIcon,
  GroupRemove as UnenrollAllIcon,
  CheckCircle as EnrolledIcon,
} from "@mui/icons-material";
import API_BASE_URL from "../apiConfig";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

// ── NSTP type config ──────────────────────────────────────────────────────────
const NSTP_TYPES = [
  {
    key: "CWTS",
    label: "CWTS",
    component: 1,
    color: "#1B5E20",
    bg: "#E8F5E9",
    border: "#2E7D32",
  },
  {
    key: "LTS",
    label: "LTS",
    component: 2,
    color: "#0D47A1",
    bg: "#E3F2FD",
    border: "#1565C0",
  },
  {
    key: "MTS",
    label: "MTS",
    component: 3,
    color: "#4A148C",
    bg: "#F3E5F5",
    border: "#6A1B9A",
  },
];

// Maps NSTP key → numeric component value sent to the backend
// CWTS = 1, LTS = 2, MTS = 3
const NSTP_COMPONENT_MAP = {
  CWTS: 1,
  LTS: 2,
  MTS: 3,
};

// Maps numeric component from backend → NSTP key for display
// 1 = CWTS, 2 = LTS, 3 = MTS
const NSTP_COMPONENT_REVERSE_MAP = {
  1: "CWTS",
  2: "LTS",
  3: "MTS",
};

const NSTPTagging = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);

  // ── Theme ─────────────────────────────────────────────────────────────────
  const colors = settings?.colors || {};
  const mainButtonColor = colors.mainButton || "#1B5E20";
  const headerColor = colors.header || "#1B5E20";
  const borderColor = colors.border || "#c8e6c9";
  const titleColor = colors.title || "#1B5E20";

  // ── Auth / access ─────────────────────────────────────────────────────────
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [employeeID, setEmployeeID] = useState("");
  const pageId = 148;
  const auditConfig = {
    headers: {
      ...getFlatAuditHeaders(),
      "x-audit-actor-id":
        employeeID ||
        localStorage.getItem("employee_id") ||
        localStorage.getItem("email") ||
        "unknown",
      "x-audit-actor-role": localStorage.getItem("role") || "administrator",
    },
  };

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedRole && storedID) {
      setEmployeeID(storedEmployeeID);
      if (["administrator", "superadmin", "technical"].includes(storedRole)) {
        checkAccess(storedEmployeeID);
      } else {
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const checkAccess = async (empID) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/page_access/${empID}/${pageId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
      );
      setHasAccess(res.data?.page_privilege === 1);
    } catch {
      setHasAccess(false);
    }
  };

  // ── Dropdown data ─────────────────────────────────────────────────────────
  const [departmentSections, setDepartmentSections] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [curriculumList, setCurriculumList] = useState([]);
  const [yearLevels, setYearLevels] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [semesters, setSemesters] = useState([]);

  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [selectedYearLevel, setSelectedYearLevel] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedNstp, setSelectedNstp] = useState("CWTS");

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [secRes, deptRes, curRes, yearLevelRes, yrRes, semRes, activeRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/department_section`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
          axios.get(`${API_BASE_URL}/api/get_department`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
          axios.get(`${API_BASE_URL}/api/get_active_curriculum`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
          axios.get(`${API_BASE_URL}/api/api/year-levels`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
          axios.get(`${API_BASE_URL}/api/get_school_year`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
          axios.get(`${API_BASE_URL}/api/get_school_semester`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
          axios.get(`${API_BASE_URL}/api/active_school_year`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
        ]);
        setDepartmentSections(secRes.data || []);
        setDepartments(deptRes.data || []);
        setCurriculumList(curRes.data || []);
        setYearLevels(yearLevelRes.data || []);
        setSchoolYears(yrRes.data || []);
        setSemesters(semRes.data || []);

        const active = activeRes.data?.[0];
        if (active) {
          setSelectedYear(active.year_id);
          setSelectedSemester(active.semester_id);
        }
      } catch (err) {
        console.error("Failed to fetch dropdowns:", err);
      }
    };
    fetchDropdowns();
  }, []);

  // ── Table data ────────────────────────────────────────────────────────────
  // allSectionStudents — full section list, never filtered out
  const [allSectionStudents, setAllSectionStudents] = useState([]);
  const [taggedStudents, setTaggedStudents] = useState([]);
  // taggedNumbers — Set of student_number strings for O(1) button state lookup
  const [taggedNumbers, setTaggedNumbers] = useState(new Set());

  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  // ── Resolve active_school_year_id ─────────────────────────────────────────
  const [activeSYID, setActiveSYID] = useState("");

  useEffect(() => {
    if (!selectedYear || !selectedSemester) return;
    axios
      .get(
        `${API_BASE_URL}/api/get_selected_year/${selectedYear}/${selectedSemester}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
      )
      .then((res) => {
        if (res.data?.length > 0) setActiveSYID(res.data[0].school_year_id);
      })
      .catch(() => { });
  }, [selectedYear, selectedSemester]);

  useEffect(() => {
    setSelectedCurriculum("");
    setSelectedSection("");
    setAllSectionStudents([]);
    setTaggedStudents([]);
    setTaggedNumbers(new Set());
    setSearched(false);
  }, [selectedDepartment]);

  useEffect(() => {
    setSelectedSection("");
    setAllSectionStudents([]);
    setTaggedStudents([]);
    setTaggedNumbers(new Set());
    setSearched(false);
  }, [selectedCurriculum]);

  useEffect(() => {
    setAllSectionStudents([]);
    setTaggedStudents([]);
    setTaggedNumbers(new Set());
    setSearched(false);
  }, [selectedYearLevel]);

  const formatSchoolYear = (yearDesc) => {
    if (!yearDesc) return "";
    const startYear = Number(yearDesc);
    return Number.isNaN(startYear) ? yearDesc : `${startYear} - ${startYear + 1}`;
  };

  const visibleSchoolYears = React.useMemo(() => {
    const activeSchoolYear = schoolYears.find(
      (year) => String(year.year_id) === String(selectedYear),
    );
    const activeStartYear = Number(activeSchoolYear?.current_year);

    if (Number.isNaN(activeStartYear)) return schoolYears;

    return schoolYears
      .filter((year) => {
        const startYear = Number(year.current_year);
        return (
          !Number.isNaN(startYear) &&
          startYear <= activeStartYear &&
          startYear >= activeStartYear - 10
        );
      })
      .sort((a, b) => Number(a.current_year) - Number(b.current_year));
  }, [schoolYears, selectedYear]);

  const filteredCurriculums = React.useMemo(
    () => {
      const filtered = curriculumList.filter(
        (curriculum) =>
          !selectedDepartment ||
          String(curriculum.dprtmnt_id || "") === String(selectedDepartment),
      );

      return Array.from(
        new Map(filtered.map((curriculum) => [curriculum.curriculum_id, curriculum])).values(),
      );
    },
    [curriculumList, selectedDepartment],
  );

  const filteredDepartmentSections = React.useMemo(
    () => {
      const filtered = departmentSections.filter(
        (section) =>
          (!selectedDepartment ||
            String(section.dprtmnt_id || "") === String(selectedDepartment)) &&
          (!selectedCurriculum ||
            String(section.curriculum_id || "") === String(selectedCurriculum)),
      );

      return Array.from(
        new Map(
          filtered.map((section) => [section.department_section_id, section]),
        ).values(),
      );
    },
    [departmentSections, selectedDepartment, selectedCurriculum],
  );

  useEffect(() => {
    if (selectedDepartment || departments.length === 0) return;
    setSelectedDepartment(String(departments[0].dprtmnt_id));
  }, [departments, selectedDepartment]);

  useEffect(() => {
    if (filteredCurriculums.length === 0) {
      if (selectedCurriculum) setSelectedCurriculum("");
      return;
    }

    const hasSelectedCurriculum = filteredCurriculums.some(
      (curriculum) =>
        String(curriculum.curriculum_id) === String(selectedCurriculum),
    );

    if (!selectedCurriculum || !hasSelectedCurriculum) {
      setSelectedCurriculum(String(filteredCurriculums[0].curriculum_id));
    }
  }, [filteredCurriculums, selectedCurriculum]);

  useEffect(() => {
    if (selectedYearLevel || yearLevels.length === 0) return;
    setSelectedYearLevel(String(yearLevels[0].year_level_id));
  }, [yearLevels, selectedYearLevel]);

  useEffect(() => {
    if (filteredDepartmentSections.length === 0) {
      if (selectedSection) setSelectedSection("");
      return;
    }

    const hasSelectedSection = filteredDepartmentSections.some(
      (section) =>
        String(section.department_section_id) === String(selectedSection),
    );

    if (!selectedSection || !hasSelectedSection) {
      setSelectedSection(String(filteredDepartmentSections[0].department_section_id));
    }
  }, [filteredDepartmentSections, selectedSection]);

  // ── Fetch all students in section — left panel never filters anyone out ───
  const fetchSectionStudents = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/get_student_per_section`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      params: {
        department_section_id: selectedSection,
        active_school_year_id: activeSYID,
        year_level_id: selectedYearLevel || undefined,
      },
    });
    setAllSectionStudents(res.data || []);
  };

  const fetchTaggedStudents = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_nstp_tagged_student`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        params: {
          department_section_id: selectedSection,
          active_school_year_id: activeSYID,
          year_level_id: selectedYearLevel || undefined,
        },
      });
      const tagged = Array.isArray(res.data) ? res.data : [];
      setTaggedStudents(tagged);
      setTaggedNumbers(new Set(tagged.map((s) => String(s.student_number))));
    } catch (err) {
      if (err.response?.status === 404) {
        setTaggedStudents([]);
        setTaggedNumbers(new Set());
      } else {
        console.error("Failed to fetch tagged students:", err);
      }
    }
  };

  // ── Fetch both panels — used after Enroll All / Unenroll All ─────────────
  const fetchBothPanels = async () => {
    await Promise.all([fetchSectionStudents(), fetchTaggedStudents()]);
  };

  const syncTaggedState = (students) => {
    setTaggedStudents(students);
    setTaggedNumbers(new Set(students.map((s) => String(s.student_number))));
  };

  const refreshTaggedStudentsInBackground = () => {
    fetchTaggedStudents().catch((err) => {
      console.error("Background refresh for tagged students failed:", err);
    });
  };

  // ✅ AUTO-SEARCH: fires whenever section/year-level/school-year/semester change,
  // no manual Search button needed
  useEffect(() => {
    if (!selectedSection || !activeSYID) {
      setAllSectionStudents([]);
      setTaggedStudents([]);
      setTaggedNumbers(new Set());
      setSearched(false);
      return;
    }

    let cancelled = false;

    const runAutoSearch = async () => {
      setSearching(true);
      try {
        await Promise.all([fetchSectionStudents(), fetchTaggedStudents()]);
        if (!cancelled) setSearched(true);
      } catch (err) {
        console.error("Search error:", err);
        if (!cancelled) {
          setSnackbar({
            open: true,
            message: "Failed to fetch students.",
            severity: "error",
          });
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    };

    runAutoSearch();

    return () => {
      cancelled = true;
    };
  }, [selectedSection, activeSYID, selectedYearLevel]);

  // ── Enroll / Unenroll ─────────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState(false);

  const getSectionMeta = () => {
    const sec = departmentSections.find(
      (s) => String(s.department_section_id) === String(selectedSection),
    );
    return {
      department_section_id: selectedSection,
      active_school_year_id: activeSYID,
      curriculum_id: sec?.curriculum_id || "",
      year_level_id: selectedYearLevel || undefined,
    };
  };

  const buildOptimisticTaggedStudent = (studentNumber) => {
    const student = allSectionStudents.find(
      (s) => String(s.student_number) === String(studentNumber),
    );

    if (!student) return null;

    return {
      ...student,
      component: NSTP_COMPONENT_MAP[selectedNstp],
    };
  };

  const addOptimisticTaggedStudent = (studentNumber) => {
    const nextStudent = buildOptimisticTaggedStudent(studentNumber);
    if (!nextStudent) return;

    syncTaggedState([
      ...taggedStudents.filter(
        (s) => String(s.student_number) !== String(studentNumber),
      ),
      nextStudent,
    ]);
  };

  const removeOptimisticTaggedStudent = (studentNumber) => {
    syncTaggedState(
      taggedStudents.filter(
        (s) => String(s.student_number) !== String(studentNumber),
      ),
    );
  };

  // ── Enroll All ────────────────────────────────────────────────────────────
  const handleEnrollAll = async () => {
    setActionLoading(true);
    try {
      const meta = getSectionMeta();
      await axios.put(`${API_BASE_URL}/api/enroll_nstp_component`, {
        ...meta,
        nstp_type: NSTP_COMPONENT_MAP[selectedNstp],
      }, auditConfig);
      syncTaggedState(
        allSectionStudents.map((student) => ({
          ...student,
          component: NSTP_COMPONENT_MAP[selectedNstp],
        })),
      );
      setSnackbar({
        open: true,
        message: `All students enrolled in ${selectedNstp}.`,
        severity: "success",
      });
      fetchBothPanels().catch((err) => {
        console.error("Background refresh after NSTP enroll all failed:", err);
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Enroll all failed.",
        severity: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Unenroll All ──────────────────────────────────────────────────────────
  const handleUnenrollAll = async () => {
    setActionLoading(true);
    try {
      const meta = getSectionMeta();
      await axios.put(`${API_BASE_URL}/api/unenroll_nstp_component`, meta, auditConfig);
      syncTaggedState([]);
      setSnackbar({
        open: true,
        message: "All students unenrolled.",
        severity: "success",
      });
      fetchBothPanels().catch((err) => {
        console.error("Background refresh after NSTP unenroll all failed:", err);
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Unenroll all failed.",
        severity: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Enroll Single — sends numeric component, only refreshes tagged panel ──
  const handleEnrollSingle = async (studentNumber) => {
    try {
      const meta = getSectionMeta();
      await axios.put(
        `${API_BASE_URL}/api/enroll_nstp_component/${studentNumber}`,
        {
          ...meta,
          nstp_type: NSTP_COMPONENT_MAP[selectedNstp],
        },
        auditConfig,
      );
      addOptimisticTaggedStudent(studentNumber);
      setSnackbar({
        open: true,
        message: `Student ${studentNumber} enrolled in ${selectedNstp}.`,
        severity: "success",
      });
      // Only refresh tagged panel — left panel stays intact
      refreshTaggedStudentsInBackground();
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Failed to enroll ${studentNumber}.`,
        severity: "error",
      });
    }
  };

  // ── Unenroll Single — only refreshes tagged panel ─────────────────────────
  const handleUnenrollSingle = async (studentNumber) => {
    try {
      const meta = getSectionMeta();
      await axios.put(
        `${API_BASE_URL}/api/unenroll_nstp_component/${studentNumber}`,
        meta,
        auditConfig,
      );
      removeOptimisticTaggedStudent(studentNumber);
      setSnackbar({
        open: true,
        message: `Student ${studentNumber} unenrolled.`,
        severity: "success",
      });
      // Only refresh tagged panel — left panel stays intact
      refreshTaggedStudentsInBackground();
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Failed to unenroll ${studentNumber}.`,
        severity: "error",
      });
    }
  };

  // ── Snackbar ──────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (loading || hasAccess === null)
    return <LoadingOverlay open={loading} message="Loading..." />;
  if (!hasAccess) return <Unauthorized />;

  // ── Shared table styles ───────────────────────────────────────────────────
  const thStyle = {
    backgroundColor: headerColor || "#1B5E20",
    color: "#fff",
    fontWeight: 600,
    fontSize: "13px",
    padding: "10px 12px",
    border: "none",
    whiteSpace: "nowrap",
  };

  const tdStyle = {
    fontSize: "13px",
    padding: "9px 12px",
    borderBottom: `1px solid ${borderColor}`,
  };

  const activeNstp =
    NSTP_TYPES.find((n) => n.key === selectedNstp) || NSTP_TYPES[0];
  const canManageStudents = Boolean(selectedSection && activeSYID);

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
        paddingRight: 2,
        backgroundColor: "transparent",
        mt: 1,
        padding: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",

          mb: 2,
          px: 1,
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
          NSTP TAGGING PANEL
        </Typography>
      </Box>
      <Divider sx={{ mb: 3 }} />

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
         NSTP Filters:
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      {/* ── Filter bar — matches CoursePanel's filter UI/UX ──────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "wrap",
          mb: 2,
          p: 1.5,
          border: "1px solid #ddd",
          borderRadius: "8px",
          backgroundColor: "#fafafa",
        }}
      >
        <Typography sx={{ fontWeight: "bold", fontSize: 14 }}>
          Filters:
        </Typography>

        {/* Department */}
        <FormControl size="small" sx={{ minWidth: 190 }}>
          <Select
            displayEmpty
            value={String(selectedDepartment || "")}
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            <MenuItem value="">Department: All</MenuItem>
            {departments.map((dept) => (
              <MenuItem key={dept.dprtmnt_id} value={String(dept.dprtmnt_id)}>
                {dept.dprtmnt_name} ({dept.dprtmnt_code})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Curriculum */}
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <Select
            displayEmpty
            value={String(selectedCurriculum || "")}
            onChange={(e) => setSelectedCurriculum(e.target.value)}
          >
            <MenuItem value="">Curriculum: All</MenuItem>
            {filteredCurriculums.map((curriculum) => (
              <MenuItem
                key={`${curriculum.curriculum_id}-${curriculum.dprtmnt_id || "all"}`}
                value={String(curriculum.curriculum_id)}
              >
                {formatSchoolYear(curriculum.year_description)} - ({curriculum.program_code}){" "}
                {curriculum.program_description}
                {curriculum.major ? ` (${curriculum.major})` : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Year Level */}
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <Select
            displayEmpty
            value={String(selectedYearLevel || "")}
            onChange={(e) => setSelectedYearLevel(e.target.value)}
          >
            <MenuItem value="">Year Level: All</MenuItem>
            {yearLevels.map((yearLevel) => (
              <MenuItem
                key={yearLevel.year_level_id}
                value={String(yearLevel.year_level_id)}
              >
                {yearLevel.year_level_description}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Department Section */}
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <Select
            displayEmpty
            value={String(selectedSection || "")}
            onChange={(e) => setSelectedSection(e.target.value)}
          >
            <MenuItem value="">Section: Select a Department Section</MenuItem>
            {filteredDepartmentSections.map((sec) => {
              const val = String(sec.department_section_id ?? "");
              return (
                <MenuItem key={val} value={val}>
                  {sec.program_code} {sec.major ? `(${sec.major})` : ""} —{" "}
                  {sec.section_description}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        {/* School Year */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            displayEmpty
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <MenuItem value="" disabled>
              School Year
            </MenuItem>
            {visibleSchoolYears.map((yr) => (
              <MenuItem key={yr.year_id} value={yr.year_id}>
                {yr.current_year} – {yr.next_year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Semester */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select
            displayEmpty
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
          >
            <MenuItem value="" disabled>
              Semester
            </MenuItem>
            {semesters.map((sem) => (
              <MenuItem key={sem.semester_id} value={sem.semester_id}>
                {sem.semester_description}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* ✅ Replaces the Search button — small inline loading indicator only */}
        {searching && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, ml: 0.5 }}>
            <CircularProgress size={16} />
            <Typography sx={{ fontSize: 12, color: "#666" }}>
              Loading students…
            </Typography>
          </Box>
        )}
      </Box>

      {/* ── NSTP Type Selector + Enroll All / Unenroll All ───────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography
          sx={{ fontSize: "13px", fontWeight: 600, color: "#555", mr: 0.5 }}
        >
          NSTP Type:
        </Typography>

        {NSTP_TYPES.map((type) => (
          <Button
            key={type.key}
            onClick={() => setSelectedNstp(type.key)}
            variant={selectedNstp === type.key ? "contained" : "outlined"}
            sx={{
              fontWeight: 700,
              fontSize: "13px",
              height: "36px",
              px: 2.5,
              borderRadius: "8px",
              textTransform: "none",
              border: `2px solid ${type.border}`,
              backgroundColor:
                selectedNstp === type.key ? type.border : "transparent",
              color: selectedNstp === type.key ? "#fff" : type.color,
              "&:hover": {
                backgroundColor:
                  selectedNstp === type.key ? type.border : type.bg,
                border: `2px solid ${type.border}`,
              },
            }}
          >
            {type.label}
          </Button>
        ))}

        <Box sx={{ flex: 1 }} />

        {/* Enroll All */}
        <Tooltip
          title={
            canManageStudents
              ? `Enroll all students in ${selectedNstp} (component ${NSTP_COMPONENT_MAP[selectedNstp]})`
              : "Please select a section, school year, and semester first"
          }
        >
          <span>
            <Button
              variant="contained"
              startIcon={
                actionLoading ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <EnrollAllIcon />
                )
              }
              disabled={actionLoading || !canManageStudents}
              onClick={handleEnrollAll}
              sx={{
                backgroundColor: activeNstp.border,
                color: "#fff",
                fontWeight: 600,
                fontSize: "12px",
                height: "36px",
                px: 2,
                borderRadius: "8px",
                textTransform: "none",
                "&:hover": {
                  backgroundColor: activeNstp.border,
                  opacity: 0.85,
                },
              }}
            >
              Enroll All ({selectedNstp})
            </Button>
          </span>
        </Tooltip>

        {/* Unenroll All */}
        <Tooltip
          title={
            canManageStudents
              ? "Unenroll all tagged students"
              : "Please select a section, school year, and semester first"
          }
        >
          <span>
            <Button
              variant="outlined"
              startIcon={<UnenrollAllIcon />}
              disabled={actionLoading || !canManageStudents}
              onClick={handleUnenrollAll}
              sx={{
                fontWeight: 600,
                fontSize: "12px",
                height: "36px",
                px: 2,
                borderRadius: "8px",
                textTransform: "none",
                border: "2px solid #c62828",
                color: "#c62828",
                "&:hover": {
                  backgroundColor: "#ffebee",
                  border: "2px solid #c62828",
                },
              }}
            >
              Unenroll All
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* ── Two-panel table layout ────────────────────────────────────────── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
        {/* ── LEFT: All Section Students ───────────────────────────────── */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography fontWeight={600} fontSize="14px" color="#333">
              Section Students
            </Typography>
            <Chip
              label={allSectionStudents.length}
              size="small"
              sx={{
                backgroundColor: "#e8f5e9",
                color: "#2e7d32",
                fontWeight: 700,
                fontSize: "11px",
                height: "20px",
              }}
            />
          </Box>

          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${borderColor}`,

              overflow: "hidden",
            }}
          >
            <TableContainer sx={{ maxHeight: 480 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {[
                      "#",
                      "Student No.",
                      "Student Name",
                      "Program",
                      "Year Level",
                      "Action",
                    ].map((h) => (
                      <TableCell key={h} sx={thStyle}>
                        {h}
                      </TableCell>
                    ))}
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
                  {allSectionStudents.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        sx={{
                          textAlign: "center",
                          py: 4,
                          color: "#aaa",
                          fontSize: "13px",
                        }}
                      >
                        {searched
                          ? "No students found in this section"
                          : "Select a section to load students"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    allSectionStudents.map((s, idx) => {
                      const isTagged = taggedNumbers.has(
                        String(s.student_number),
                      );
                      return (
                        <TableRow
                          key={s.student_number}
                          sx={{
                            // Subtle green tint for already-tagged rows
                            backgroundColor: isTagged ? "#f1f8f1" : "inherit",
                            "&:hover": {
                              backgroundColor: isTagged ? "#e8f5e9" : "#f9fbe7",
                            },
                          }}
                        >
                          <TableCell
                            sx={{ ...tdStyle, color: "#888", width: "36px" }}
                          >
                            {idx + 1}
                          </TableCell>
                          <TableCell sx={tdStyle}>{s.student_number}</TableCell>
                          <TableCell sx={tdStyle}>
                            {s.last_name}, {s.first_name} {s.middle_name || ""}
                          </TableCell>
                          <TableCell sx={tdStyle}>{s.program_code}</TableCell>
                          <TableCell sx={tdStyle}>
                            {s.year_level_description || s.year_level}
                          </TableCell>
                          <TableCell sx={tdStyle}>
                            {isTagged ? (
                              // Already tagged — disabled "Enrolled" button
                              <Button
                                size="small"
                                variant="outlined"
                                disabled
                                startIcon={
                                  <EnrolledIcon
                                    sx={{ fontSize: "14px !important" }}
                                  />
                                }
                                sx={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  height: "28px",
                                  px: 1.5,
                                  borderRadius: "6px",
                                  textTransform: "none",
                                  minWidth: "unset",
                                  color: "#2e7d32 !important",
                                  borderColor: "#2e7d32 !important",
                                  opacity: 0.7,
                                }}
                              >
                                Enrolled
                              </Button>
                            ) : (
                              // Not tagged — active "Enroll" button
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={
                                  <EnrollIcon
                                    sx={{ fontSize: "14px !important" }}
                                  />
                                }
                                onClick={() =>
                                  handleEnrollSingle(s.student_number)
                                }
                                sx={{
                                  backgroundColor: activeNstp.border,
                                  color: "#fff",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  height: "28px",
                                  px: 1.5,
                                  borderRadius: "6px",
                                  textTransform: "none",
                                  minWidth: "unset",
                                  "&:hover": {
                                    backgroundColor: activeNstp.border,
                                    opacity: 0.85,
                                  },
                                }}
                              >
                                Enroll
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>

        {/* ── RIGHT: Tagged Students ────────────────────────────────────── */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography fontWeight={600} fontSize="14px" color="#333">
              Tagged Students
            </Typography>
            <Chip
              label={taggedStudents.length}
              size="small"
              sx={{
                backgroundColor: "#e3f2fd",
                color: "#1565c0",
                fontWeight: 700,
                fontSize: "11px",
                height: "20px",
              }}
            />
          </Box>

          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${borderColor}`,

              overflow: "hidden",
            }}
          >
            <TableContainer sx={{ maxHeight: 480 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {[
                      "#",
                      "Student No.",
                      "Student Name",
                      "Program",
                      "Year Level",
                      "NSTP",
                      "Action",
                    ].map((h) => (
                      <TableCell key={h} sx={thStyle}>
                        {h}
                      </TableCell>
                    ))}
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
                  {taggedStudents.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        sx={{
                          textAlign: "center",
                          py: 4,
                          color: "#aaa",
                          fontSize: "13px",
                        }}
                      >
                        No tagged students yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    taggedStudents.map((s, idx) => {
                      // Backend returns numeric component (1, 2, 3) in s.component
                      // Convert back to string key for color/label lookup
                      const nstpKey =
                        NSTP_COMPONENT_REVERSE_MAP[s.component] || "CWTS";
                      const nstpType =
                        NSTP_TYPES.find((n) => n.key === nstpKey) ||
                        NSTP_TYPES[0];

                      return (
                        <TableRow
                          key={s.student_number}
                          sx={{ "&:hover": { backgroundColor: "#fff8e1" } }}
                        >
                          <TableCell
                            sx={{ ...tdStyle, color: "#888", width: "36px" }}
                          >
                            {idx + 1}
                          </TableCell>
                          <TableCell sx={tdStyle}>{s.student_number}</TableCell>
                          <TableCell sx={tdStyle}>
                            {s.last_name}, {s.first_name} {s.middle_name || ""}
                          </TableCell>
                          <TableCell sx={tdStyle}>{s.program_code}</TableCell>
                          <TableCell sx={tdStyle}>
                            {s.year_level_description || s.year_level}
                          </TableCell>
                          <TableCell sx={tdStyle}>
                            <Chip
                              label={nstpKey}
                              size="small"
                              sx={{
                                backgroundColor: nstpType.bg,
                                color: nstpType.color,
                                fontWeight: 700,
                                fontSize: "11px",
                                height: "22px",
                                border: `1px solid ${nstpType.border}`,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={tdStyle}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={
                                <UnenrollIcon
                                  sx={{ fontSize: "14px !important" }}
                                />
                              }
                              onClick={() =>
                                handleUnenrollSingle(s.student_number)
                              }
                              sx={{
                                fontSize: "11px",
                                fontWeight: 600,
                                height: "28px",
                                px: 1.5,
                                borderRadius: "6px",
                                textTransform: "none",
                                minWidth: "unset",
                                border: "1.5px solid #c62828",
                                color: "#c62828",
                                "&:hover": {
                                  backgroundColor: "#ffebee",
                                  border: "1.5px solid #c62828",
                                },
                              }}
                            >
                              Unenroll
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>

      {/* ── Snackbar ───────────────────────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default NSTPTagging;