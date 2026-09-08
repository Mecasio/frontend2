import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
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
  InputLabel,
  Snackbar,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  CircularProgress,
  Tooltip,
  Checkbox,
  TextField,
} from "@mui/material";
import {
  Search as SearchIcon,
  PersonRemove as UnenrollIcon,
  GroupAdd as EnrollAllIcon,
  GroupRemove as UnenrollAllIcon,
} from "@mui/icons-material";
import API_BASE_URL from "../apiConfig";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const DepartmentSectionTagging = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};

  // ── Theme ─────────────────────────────────────────────────────────────────
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [headerColor, setHeaderColor] = useState("#1976d2");
  const [borderColor, setBorderColor] = useState("#c8d8f0");
  const [titleColor, setTitleColor] = useState("#1976d2");

  useEffect(() => {
    if (!settings) return;
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.header) setHeaderColor(colors.header);
    if (colors.border) setBorderColor(colors.border);
    if (colors.title) setTitleColor(colors.title);
  }, [settings]);

  // ── Auth / access ─────────────────────────────────────────────────────────
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [employeeID, setEmployeeID] = useState("");
  const pageId = 149;

  const getAuditHeaders = () => ({
    headers: {
      ...getFlatAuditHeaders(),
      "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-page-id": pageId,
      "x-audit-actor-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-audit-actor-role": localStorage.getItem("role") || "registrar",
    },
  });

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedRole && storedID) {
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

  const checkAccess = async (empID) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/page_access/${empID}/${pageId}`);
      setHasAccess(res.data?.page_privilege === 1);
    } catch {
      setHasAccess(false);
    }
  };

  // ── Dropdown data ─────────────────────────────────────────────────────────
  const [departments, setDepartments] = useState([]);
  const [allCurriculums, setAllCurriculums] = useState([]);
  const [filteredCurriculums, setFilteredCurriculums] = useState([]);
  const [departmentSections, setDepartmentSections] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [activeSchoolYearStart, setActiveSchoolYearStart] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [yearLevels, setYearLevels] = useState([]);

  // ── FILTER SELECTIONS ────────────────────────────────────────────────────
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterCurriculum, setFilterCurriculum] = useState("");
  const [filterYearLevel, setFilterYearLevel] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterSemester, setFilterSemester] = useState("");

  // ── INSERTION SELECTIONS ─────────────────────────────────────────────────
  const [insertSection, setInsertSection] = useState("");

  // ── Search student query ──────────────────────────────────────────────────
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [debouncedStudentSearchQuery, setDebouncedStudentSearchQuery] = useState("");
  const [curriculumScrollTop, setCurriculumScrollTop] = useState(0);
  const [enrolledScrollTop, setEnrolledScrollTop] = useState(0);
  const curriculumTableRef = useRef(null);
  const enrolledTableRef = useRef(null);

  // ── Load all dropdowns once on mount ─────────────────────────────────────
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [deptRes, currRes, secRes, yrRes, semRes, yearLevelRes, activeRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/get_department`),
          axios.get(`${API_BASE_URL}/api/applied_program`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE_URL}/api/department_section`),
          axios.get(`${API_BASE_URL}/api/get_school_year`),
          axios.get(`${API_BASE_URL}/api/get_school_semester`),
          axios.get(`${API_BASE_URL}/api/get_year_level`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE_URL}/api/active_school_year`),
        ]);

        const depts = deptRes.data || [];
        const currs = Array.isArray(currRes.data) ? currRes.data : [];
        const secs = secRes.data || [];
        const yrs = yrRes.data || [];
        const sems = semRes.data || [];
        const yearLevelList = Array.isArray(yearLevelRes.data) ? yearLevelRes.data : [];

        setDepartments(depts);
        setAllCurriculums(currs);
        setDepartmentSections(secs);
        setSchoolYears(yrs);
        setSemesters(sems);
        setYearLevels(yearLevelList);

        if (activeRes.data?.length > 0) {
          const active = activeRes.data[0];
          const activeYearStart = Number(
            active.current_year ||
            String(active.year_description || "").match(/\d{4}/)?.[0]
          );

          if (Number.isInteger(activeYearStart)) {
            setActiveSchoolYearStart(activeYearStart);
          }

          setFilterYear(active.year_id);
          setFilterSemester(active.semester_id);
        }

        if (depts.length > 0) {
          const firstDept = String(depts[0].dprtmnt_id ?? depts[0].id ?? "");
          setFilterDepartment(firstDept);
        }
      } catch (err) {
        console.error("Failed to fetch dropdowns:", err);
      }
    };
    fetchDropdowns();
  }, []);

  // ── Filter curriculums when department changes ────────────────────────────
  useEffect(() => {
    if (!filterDepartment) {
      setFilteredCurriculums([]);
      setFilterCurriculum("");
      return;
    }
    const filtered = allCurriculums.filter(
      (c) => String(c.dprtmnt_id) === String(filterDepartment)
    );
    setFilteredCurriculums(filtered);
    if (filtered.length > 0) {
      setFilterCurriculum(String(filtered[0].curriculum_id ?? ""));
    } else {
      setFilterCurriculum("");
    }
  }, [filterDepartment, allCurriculums]);

  const getSchoolYearStart = (schoolYear) => {
    const year = Number(
      schoolYear?.current_year ||
      String(schoolYear?.year_description || "").match(/\d{4}/)?.[0]
    );

    return Number.isInteger(year) ? year : null;
  };

  const displayedSchoolYears = useMemo(() => {
    if (!Number.isInteger(activeSchoolYearStart)) return schoolYears;

    const earliestYear = activeSchoolYearStart - 10;
    return schoolYears.filter((schoolYear) => {
      const yearStart = getSchoolYearStart(schoolYear);
      return (
        yearStart !== null &&
        yearStart >= earliestYear &&
        yearStart <= activeSchoolYearStart
      );
    });
  }, [schoolYears, activeSchoolYearStart]);

  const displayedYearLevels = useMemo(
    () =>
      yearLevels.filter(
        (yearLevel) =>
          String(yearLevel?.level_type || "").trim().toLowerCase() !== "special"
      ),
    [yearLevels]
  );

  // ── Filter sections when curriculum changes ───────────────────────────────
  const filteredSections = useMemo(
    () =>
      departmentSections.filter(
        (s) => String(s.curriculum_id) === String(filterCurriculum)
      ),
    [departmentSections, filterCurriculum]
  );

  useEffect(() => {
    if (filteredSections.length > 0) {
      setInsertSection(String(filteredSections[0].department_section_id ?? ""));
    } else {
      setInsertSection("");
    }
  }, [filterCurriculum]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resolve active_school_year_id ─────────────────────────────────────────
  const [activeSYID, setActiveSYID] = useState("");

  useEffect(() => {
    if (!filterYear || !filterSemester) return;
    axios
      .get(`${API_BASE_URL}/api/get_selecterd_year/${filterYear}/${filterSemester}`)
      .then((res) => {
        if (res.data?.length > 0) setActiveSYID(res.data[0].school_year_id);
      })
      .catch(() => { });
  }, [filterYear, filterSemester]);

  // ── Table data ────────────────────────────────────────────────────────────
  const [allCurriculumStudents, setAllCurriculumStudents] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [enrolledNumbers, setEnrolledNumbers] = useState(new Set());
  // track which student numbers are currently being toggled to prevent double-clicks
  const [togglingNumbers, setTogglingNumbers] = useState(new Set());
  const latestCurriculumRequestRef = useRef(0);
  const latestEnrolledRequestRef = useRef(0);

  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sectionRefreshing, setSectionRefreshing] = useState(false);

  useEffect(() => {
    if (studentSearchQuery.length <= 5) {
      setDebouncedStudentSearchQuery("");
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setDebouncedStudentSearchQuery(studentSearchQuery);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [studentSearchQuery]);

  // ── Filtered table rows based on student search query ─────────────────────
  const filteredCurriculumStudents = useMemo(() => {
    const q = debouncedStudentSearchQuery.trim().toLowerCase();
    if (!q) return allCurriculumStudents;

    return allCurriculumStudents.filter((s) => {
      const fullName = `${s.last_name}, ${s.first_name} ${s.middle_name || ""}`.toLowerCase();
      return (
        fullName.includes(q) ||
        String(s.student_number).toLowerCase().includes(q) ||
        (s.program_code || "").toLowerCase().includes(q)
      );
    });
  }, [allCurriculumStudents, debouncedStudentSearchQuery]);

  const filteredEnrolledStudents = useMemo(() => {
    const q = debouncedStudentSearchQuery.trim().toLowerCase();
    if (!q) return enrolledStudents;

    return enrolledStudents.filter((s) => {
      const fullName = `${s.last_name}, ${s.first_name} ${s.middle_name || ""}`.toLowerCase();
      return (
        fullName.includes(q) ||
        String(s.student_number).toLowerCase().includes(q) ||
        (s.program_code || "").toLowerCase().includes(q)
      );
    });
  }, [enrolledStudents, debouncedStudentSearchQuery]);

  const VIRTUAL_ROW_HEIGHT = 48;
  const VIRTUAL_TABLE_HEIGHT = 520;
  const VIRTUAL_OVERSCAN = 8;

  const getVirtualRows = (rows, scrollTop) => {
    const total = rows.length;
    const startIndex = Math.min(
      total,
      Math.max(0, Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT) - VIRTUAL_OVERSCAN)
    );
    const endIndex = Math.min(
      total,
      Math.ceil((scrollTop + VIRTUAL_TABLE_HEIGHT) / VIRTUAL_ROW_HEIGHT) + VIRTUAL_OVERSCAN
    );

    return {
      startIndex,
      items: rows.slice(startIndex, endIndex),
      topSpacerHeight: startIndex * VIRTUAL_ROW_HEIGHT,
      bottomSpacerHeight: Math.max(0, (total - endIndex) * VIRTUAL_ROW_HEIGHT),
    };
  };

  const virtualCurriculumStudents = useMemo(
    () => getVirtualRows(filteredCurriculumStudents, curriculumScrollTop),
    [filteredCurriculumStudents, curriculumScrollTop]
  );

  const virtualEnrolledStudents = useMemo(
    () => getVirtualRows(filteredEnrolledStudents, enrolledScrollTop),
    [filteredEnrolledStudents, enrolledScrollTop]
  );

  useEffect(() => {
    setCurriculumScrollTop(0);
    setEnrolledScrollTop(0);
    if (curriculumTableRef.current) curriculumTableRef.current.scrollTop = 0;
    if (enrolledTableRef.current) enrolledTableRef.current.scrollTop = 0;
  }, [debouncedStudentSearchQuery, filterCurriculum, filterYearLevel, insertSection]);

  // ── Fetch all students under the curriculum ───────────────────────────────
  const fetchCurriculumStudents = async () => {
    const requestId = ++latestCurriculumRequestRef.current;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_student_per_curriculum`, {
        params: {
          curriculum_id: filterCurriculum,
          active_school_year_id: activeSYID,
          year_level_id: filterYearLevel || undefined,
        },
      });
      if (requestId === latestCurriculumRequestRef.current) {
        setAllCurriculumStudents(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        if (requestId === latestCurriculumRequestRef.current) {
          setAllCurriculumStudents([]);
        }
      } else {
        throw err;
      }
    }
  };

  // ── Fetch already-tagged students ─────────────────────────────────────────
  const fetchEnrolledStudents = async () => {
    const requestId = ++latestEnrolledRequestRef.current;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_student_already_tagged`, {
        params: {
          curriculum_id: filterCurriculum,
          active_school_year_id: activeSYID,
          department_section_id: insertSection || undefined,
          year_level_id: filterYearLevel || undefined,
        },
      });
      const enrolled = Array.isArray(res.data) ? res.data : [];
      if (requestId === latestEnrolledRequestRef.current) {
        setEnrolledStudents(enrolled);
        setEnrolledNumbers(new Set(enrolled.map((s) => String(s.student_number))));
      }
    } catch (err) {
      if (err.response?.status === 404) {
        if (requestId === latestEnrolledRequestRef.current) {
          setEnrolledStudents([]);
          setEnrolledNumbers(new Set());
        }
      } else {
        console.error("Failed to fetch enrolled students:", err);
      }
    }
  };

  const syncEnrolledState = (students) => {
    setEnrolledStudents(students);
    setEnrolledNumbers(new Set(students.map((s) => String(s.student_number))));
  };

  useEffect(() => {
    if (!searched || !filterCurriculum || !activeSYID || !insertSection) return;

    setSectionRefreshing(true);
    setEnrolledStudents([]);
    setEnrolledNumbers(new Set());

    fetchEnrolledStudents()
      .catch((err) => {
        console.error("Failed to refresh students after section change:", err);
        setSnackbar({
          open: true,
          message: "Failed to refresh students for the selected section.",
          severity: "error",
        });
      })
      .finally(() => {
        setSectionRefreshing(false);
      });
  }, [insertSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!filterCurriculum || !activeSYID) {
      setSnackbar({
        open: true,
        message: "Please select all filters before searching.",
        severity: "warning",
      });
      return;
    }
    setSearching(true);
    try {
      await Promise.all([fetchCurriculumStudents(), fetchEnrolledStudents()]);
      setSearched(true);
    } catch (err) {
      console.error("Search error:", err);
      setSnackbar({
        open: true,
        message: "Failed to fetch students.",
        severity: "error",
      });
    } finally {
      setSearching(false);
    }
  };

  // ── Enroll / Unenroll helpers ─────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingSectionMove, setPendingSectionMove] = useState(null);

  const getEnrollMeta = () => ({
    curriculum_id: filterCurriculum,
    active_school_year_id: activeSYID,
    department_section_id: insertSection,
    year_level_id: filterYearLevel || undefined,
  });

  const insertSectionLabel = useMemo(() => {
    const sec = filteredSections.find(
      (s) => String(s.department_section_id) === String(insertSection)
    );
    if (!sec) return "—";
    return `${sec.program_code || ""} — ${sec.section_description || ""}`;
  }, [filteredSections, insertSection]);

  const getStudentSectionId = (student) =>
    student?.department_section_id && String(student.department_section_id) !== "0"
      ? String(student.department_section_id)
      : "";

  const getStudentSectionLabel = (student) =>
    student?.section_description || student?.section || "another section";

  const updateCurriculumStudentSection = (studentNumber, sectionId, sectionLabel) => {
    setAllCurriculumStudents((prev) =>
      prev.map((student) =>
        String(student.student_number) === String(studentNumber)
          ? {
            ...student,
            department_section_id: sectionId,
            section_description: sectionLabel,
            section: sectionLabel,
          }
          : student
      )
    );
  };

  const addOptimisticEnrollment = (studentNumber) => {
    const student = allCurriculumStudents.find(
      (s) => String(s.student_number) === String(studentNumber)
    );
    if (!student) return;
    const nextStudent = {
      ...student,
      department_section_id: insertSection,
      section_description: insertSectionLabel,
      section: insertSectionLabel,
    };
    setEnrolledStudents((prev) => {
      const next = [
        ...prev.filter((s) => String(s.student_number) !== String(studentNumber)),
        nextStudent,
      ];
      setEnrolledNumbers(new Set(next.map((s) => String(s.student_number))));
      return next;
    });
  };

  const removeOptimisticEnrollment = (studentNumber) => {
    setEnrolledStudents((prev) => {
      const next = prev.filter(
        (s) => String(s.student_number) !== String(studentNumber)
      );
      setEnrolledNumbers(new Set(next.map((s) => String(s.student_number))));
      return next;
    });
  };

  const refreshSelectedSectionStudents = (actionLabel) => {
    fetchEnrolledStudents().catch((err) => {
      console.error(`Background refresh after ${actionLabel} failed:`, err);
    });
  };

  // ── Checkbox toggle: tag on check, untag on uncheck ──────────────────────
  const tagStudent = async (student, { movingFromOtherSection = false } = {}) => {
    const studentNumber = String(student.student_number);

    if (togglingNumbers.has(studentNumber)) return;
    setTogglingNumbers((prev) => new Set(prev).add(studentNumber));

    try {
      await axios.put(
        `${API_BASE_URL}/api/enrolled_student_in_section/${studentNumber}`,
        getEnrollMeta(),
        getAuditHeaders()
      );
      addOptimisticEnrollment(studentNumber);
      updateCurriculumStudentSection(studentNumber, insertSection, insertSectionLabel);
      setSnackbar({
        open: true,
        message: movingFromOtherSection
          ? `Student ${studentNumber} moved to ${insertSectionLabel}.`
          : `Student ${studentNumber} tagged successfully.`,
        severity: "success",
      });
      refreshSelectedSectionStudents("tag");
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Failed to tag ${studentNumber}.`,
        severity: "error",
      });
    } finally {
      setTogglingNumbers((prev) => {
        const next = new Set(prev);
        next.delete(studentNumber);
        return next;
      });
    }
  };

  const handleCheckboxToggle = async (student) => {
    if (!insertSection) {
      setSnackbar({
        open: true,
        message: "Please select a section first.",
        severity: "warning",
      });
      return;
    }

    const studentNumber = String(student.student_number);
    const isEnrolled = enrolledNumbers.has(studentNumber);
    const currentSectionId = getStudentSectionId(student);
    const isTaggedInOtherSection =
      currentSectionId && String(currentSectionId) !== String(insertSection);

    if (!isEnrolled && isTaggedInOtherSection) {
      setPendingSectionMove(student);
      return;
    }

    if (!isEnrolled) {
      await tagStudent(student);
      return;
    }

    // Prevent double-toggle while request is in flight
    if (togglingNumbers.has(studentNumber)) return;
    setTogglingNumbers((prev) => new Set(prev).add(studentNumber));

    try {
      if (isEnrolled) {
        // ── Untag ───────────────────────────────────────────────────────────
        const enrolledStudent = enrolledStudents.find(
          (s) => String(s.student_number) === studentNumber
        );
        const actualSectionId =
          enrolledStudent?.department_section_id || insertSection;

        await axios.put(
          `${API_BASE_URL}/api/unenrolled_student_in_section/${studentNumber}`,
          {
            curriculum_id: filterCurriculum,
            active_school_year_id: activeSYID,
            department_section_id: actualSectionId,
          },
          getAuditHeaders()
        );
        removeOptimisticEnrollment(studentNumber);
        updateCurriculumStudentSection(studentNumber, null, "");
        setSnackbar({
          open: true,
          message: `Student ${studentNumber} untagged successfully.`,
          severity: "success",
        });
        refreshSelectedSectionStudents("untag");
      } else {
        // ── Tag ─────────────────────────────────────────────────────────────
        await axios.put(
          `${API_BASE_URL}/api/enrolled_student_in_section/${studentNumber}`,
          getEnrollMeta(),
          getAuditHeaders()
        );
        addOptimisticEnrollment(studentNumber);
        setSnackbar({
          open: true,
          message: `Student ${studentNumber} tagged successfully.`,
          severity: "success",
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: isEnrolled
          ? `Failed to untag ${studentNumber}.`
          : `Failed to tag ${studentNumber}.`,
        severity: "error",
      });
    } finally {
      setTogglingNumbers((prev) => {
        const next = new Set(prev);
        next.delete(studentNumber);
        return next;
      });
    }
  };

  // ── Enroll All ────────────────────────────────────────────────────────────
  const handleEnrollAll = async () => {
    if (!insertSection) {
      setSnackbar({
        open: true,
        message: "Please select a section before tagging.",
        severity: "warning",
      });
      return;
    }
    setActionLoading(true);
    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/enrolled_student_in_section`,
        getEnrollMeta(),
        getAuditHeaders()
      );
      syncEnrolledState([
        ...enrolledStudents,
        ...allCurriculumStudents
          .filter((student) => !getStudentSectionId(student))
          .map((student) => ({
            ...student,
            department_section_id: insertSection,
            section_description: insertSectionLabel,
            section: insertSectionLabel,
          })),
      ]);
      setAllCurriculumStudents((prev) =>
        prev.map((student) =>
          getStudentSectionId(student)
            ? student
            : {
              ...student,
              department_section_id: insertSection,
              section_description: insertSectionLabel,
              section: insertSectionLabel,
            }
        )
      );
      setSnackbar({
        open: true,
        message: res.data?.message || "All students tagged successfully.",
        severity: "success",
      });
      refreshSelectedSectionStudents("tag all");
    } catch (err) {
      setSnackbar({ open: true, message: "Tag all failed.", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Unenroll All ──────────────────────────────────────────────────────────
  const handleUnenrollAll = async () => {
    if (!insertSection) {
      setSnackbar({
        open: true,
        message: "Please select a section before untagging.",
        severity: "warning",
      });
      return;
    }
    setActionLoading(true);
    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/unenrolled_student_in_section`,
        getEnrollMeta(),
        getAuditHeaders()
      );
      syncEnrolledState([]);
      setAllCurriculumStudents((prev) =>
        prev.map((student) =>
          String(getStudentSectionId(student)) === String(insertSection)
            ? {
              ...student,
              department_section_id: null,
              section_description: "",
              section: "",
            }
            : student
        )
      );
      setSnackbar({
        open: true,
        message: res.data?.message || "All students untagged successfully.",
        severity: "success",
      });
      refreshSelectedSectionStudents("untag all");
    } catch (err) {
      setSnackbar({ open: true, message: "Untag all failed.", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Unenroll Single (from right panel) ───────────────────────────────────
  const handleUnenrollSingle = async (studentNumber) => {
    const enrolledStudent = enrolledStudents.find(
      (s) => String(s.student_number) === String(studentNumber)
    );
    const actualSectionId = enrolledStudent?.department_section_id || insertSection;

    try {
      await axios.put(
        `${API_BASE_URL}/api/unenrolled_student_in_section/${studentNumber}`,
        {
          curriculum_id: filterCurriculum,
          active_school_year_id: activeSYID,
          department_section_id: actualSectionId,
        },
        getAuditHeaders()
      );
      removeOptimisticEnrollment(studentNumber);
      updateCurriculumStudentSection(studentNumber, null, "");
      setSnackbar({
        open: true,
        message: `Student ${studentNumber} untagged successfully.`,
        severity: "success",
      });
      refreshSelectedSectionStudents("untag");
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Failed to untag ${studentNumber}.`,
        severity: "error",
      });
    }
  };

  // ── Snackbar ──────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (loading || hasAccess === null)
    return <LoadingOverlay open={loading} message="Loading..." />;
  if (!hasAccess) return <Unauthorized />;

  // ── Shared table styles ───────────────────────────────────────────────────
  const thStyle = {
    backgroundColor: headerColor || "#1976d2",
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

  const canManageStudents = Boolean(filterCurriculum && insertSection && activeSYID);

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
        p: 2,
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          mb: 2,
          gap: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}
        >
          DEPARTMENT SECTION TAGGING
        </Typography>

        {/* ── Student Search Field ── */}
        <TextField
          variant="outlined"
          placeholder="Search Student Name / Student No. / Program"
          size="small"
          value={studentSearchQuery}
          onChange={(e) => setStudentSearchQuery(e.target.value)}
          sx={{
            width: 450,
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
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />

      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}` }}
      >
        <Table>
          <TableHead sx={{ backgroundColor: headerColor }}>
            <TableRow>
              <TableCell sx={{ color: "white", textAlign: "Center" }}>Student Tagged Section</TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <Paper
        elevation={0}
        sx={{ border: `1px solid ${borderColor}`, p: 2.5, mb: 2, backgroundColor: "#fff" }}
      >
        <Typography
          sx={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#888",
            letterSpacing: "0.08em",
            mb: 1.5,
            textTransform: "uppercase",
          }}
        >
          Filter & Search
        </Typography>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-end" }}>
          {/* Department */}
          <FormControl size="small" sx={{ minWidth: 200, flex: "1 1 200px" }}>
            <InputLabel>Department</InputLabel>
            <Select
              value={String(filterDepartment || "")}
              label="Department"
              onChange={(e) => setFilterDepartment(e.target.value)}
            >
              <MenuItem value="" disabled>Select Department</MenuItem>
              {departments.map((d) => {
                const val = String(d.dprtmnt_id ?? d.id ?? "");
                return (
                  <MenuItem key={val} value={val}>
                    {d.dprtmnt_name || d.name}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* Curriculum */}
          <FormControl size="small" sx={{ minWidth: 260, flex: "1 1 260px" }}>
            <InputLabel>Curriculum</InputLabel>
            <Select
              value={String(filterCurriculum || "")}
              label="Curriculum"
              onChange={(e) => setFilterCurriculum(e.target.value)}
              disabled={filteredCurriculums.length === 0}
            >
              <MenuItem value="" disabled>Select Curriculum</MenuItem>
              {filteredCurriculums.map((c) => {
                const val = String(c.curriculum_id ?? "");
                return (
                  <MenuItem key={val} value={val}>
                    ({c.program_code}) {c.program_description}{" "}
                    {c.major ? `- ${c.major}` : ""} [{c.year_description}]
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* Year Level */}
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Year Level</InputLabel>
            <Select
              value={String(filterYearLevel || "")}
              label="Year Level"
              onChange={(e) => setFilterYearLevel(e.target.value)}
            >
              <MenuItem value="">All Year Levels</MenuItem>
              {displayedYearLevels.map((yl) => (
                <MenuItem key={yl.year_level_id} value={String(yl.year_level_id)}>
                  {yl.year_level_description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* School Year */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>School Year</InputLabel>
            <Select
              value={filterYear}
              label="School Year"
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <MenuItem value="" disabled>Select Year</MenuItem>
              {displayedSchoolYears.map((yr) => (
                <MenuItem key={yr.year_id} value={yr.year_id}>
                  {yr.current_year} – {yr.next_year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Semester */}
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Semester</InputLabel>
            <Select
              value={filterSemester}
              label="Semester"
              onChange={(e) => setFilterSemester(e.target.value)}
            >
              <MenuItem value="" disabled>Select Semester</MenuItem>
              {semesters.map((sem) => (
                <MenuItem key={sem.semester_id} value={sem.semester_id}>
                  {sem.semester_description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Search Button */}
          <Button
            variant="contained"
            startIcon={
              searching ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SearchIcon />
              )
            }
            disabled={searching}
            onClick={handleSearch}
            sx={{
              backgroundColor: mainButtonColor,
              color: "#fff",
              fontWeight: 600,
              height: "40px",
              px: 3,
              borderRadius: "8px",
              textTransform: "none",
              "&:hover": { backgroundColor: mainButtonColor, opacity: 0.88 },
            }}
          >
            {searching ? "Searching…" : "Search"}
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 2, mt: 3, flexWrap: "wrap", alignItems: "flex-end" }}>
          {/* Section */}
          <FormControl size="small" sx={{ minWidth: 280, flex: "1 1 280px" }}>
            <InputLabel>Section</InputLabel>
            <Select
              value={String(insertSection || "")}
              label="Section"
              onChange={(e) => setInsertSection(e.target.value)}
              disabled={filteredSections.length === 0}
            >
              <MenuItem value="" disabled>Select Section</MenuItem>
              {filteredSections.map((s) => {
                const val = String(s.department_section_id ?? "");
                return (
                  <MenuItem key={val} value={val}>
                    {s.program_code} — {s.section_description}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {insertSection && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: "12px", color: "#666" }}>Selected:</Typography>
              <Chip
                label={insertSectionLabel}
                size="small"
                sx={{
                  backgroundColor: "#e3f2fd",
                  color: "#1565c0",
                  fontWeight: 600,
                  fontSize: "11px",
                  height: "24px",
                }}
              />
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── Tag All / Untag All ───────────────────────────────────────────── */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
        <Tooltip
          title={
            canManageStudents
              ? `Tag all students into ${insertSectionLabel}`
              : "Please complete filter and select a section first"
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
                backgroundColor: mainButtonColor,
                color: "#fff",
                fontWeight: 600,
                fontSize: "12px",
                height: "36px",
                px: 2,
                borderRadius: "8px",
                textTransform: "none",
                "&:hover": { backgroundColor: mainButtonColor, opacity: 0.85 },
              }}
            >
              Tag All
            </Button>
          </span>
        </Tooltip>

        <Tooltip
          title={
            canManageStudents
              ? "Untag all students from this section"
              : "Please complete filter and select a section first"
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
                "&:hover": { backgroundColor: "#ffebee", border: "2px solid #c62828" },
              }}
            >
              Untag All
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* ── Two-panel table layout ────────────────────────────────────────── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>

        {/* ── LEFT: All Curriculum Students ────────────────────────────── */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography fontWeight={600} fontSize="14px" color="#333">
              Curriculum Students
            </Typography>
            <Chip
              label={filteredCurriculumStudents.length}
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

          <Paper elevation={0} sx={{ border: `1px solid ${borderColor}`, overflow: "hidden" }}>
            <TableContainer
              ref={curriculumTableRef}
              sx={{ maxHeight: VIRTUAL_TABLE_HEIGHT, overflowY: "auto" }}
              onScroll={(event) => setCurriculumScrollTop(event.currentTarget.scrollTop)}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {/* Tag checkbox column */}
                    <TableCell sx={{ ...thStyle, width: "52px", textAlign: "center", border: `1px solid ${borderColor}` }}>
                      Tag
                    </TableCell>
                    {["#", "Student No.", "Student Name", "Program", "Year Level", "Current Section"].map((h) => (
                      <TableCell key={h} sx={{ ...thStyle, textAlign: "center", border: `1px solid ${borderColor}` }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCurriculumStudents.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        sx={{ textAlign: "center", py: 4, color: "#aaa", fontSize: "13px" }}
                      >
                        {searched
                          ? debouncedStudentSearchQuery
                            ? "No students match your search"
                            : "No students found for this curriculum"
                          : "Select filters and search to load students"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {virtualCurriculumStudents.topSpacerHeight > 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            sx={{
                              p: 0,
                              border: "none",
                              height: `${virtualCurriculumStudents.topSpacerHeight}px`,
                            }}
                          />
                        </TableRow>
                      )}

                      {virtualCurriculumStudents.items.map((s, idx) => {
                        const rowIndex = virtualCurriculumStudents.startIndex + idx;
                        const studentNumber = String(s.student_number);
                        const currentSectionId = getStudentSectionId(s);
                        const isTagged = enrolledNumbers.has(studentNumber);
                        const isTaggedInOtherSection =
                          currentSectionId && String(currentSectionId) !== String(insertSection);
                        const isToggling = togglingNumbers.has(studentNumber);

                        return (
                          <TableRow
                            key={s.student_number}
                            onClick={() => {
                              if (!actionLoading && !isToggling) handleCheckboxToggle(s);
                            }}
                            sx={{
                              backgroundColor: isTagged
                                ? "#e8f5e9"
                                : isTaggedInOtherSection
                                  ? "#fff8e1"
                                  : rowIndex % 2 === 0 ? "#ffffff" : "lightgray",
                              cursor: actionLoading || isToggling ? "wait" : "pointer",
                              transition: "background-color 0.15s ease",
                              height: `${VIRTUAL_ROW_HEIGHT}px`,
                            }}
                          >
                            {/* 25×25 checkbox */}
                            <TableCell
                              sx={{ ...tdStyle, textAlign: "center", width: "52px", border: `1px solid ${borderColor}` }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isToggling ? (
                                <CircularProgress
                                  size={18}
                                  sx={{ color: mainButtonColor, display: "block", mx: "auto" }}
                                />
                              ) : (
                                <Tooltip
                                  title={
                                    isTaggedInOtherSection
                                      ? `Already tagged in ${getStudentSectionLabel(s)}. Click to move with confirmation.`
                                      : ""
                                  }
                                >
                                  <Checkbox
                                    checked={isTagged}
                                    indeterminate={Boolean(isTaggedInOtherSection)}
                                    disabled={actionLoading || !insertSection}
                                    onChange={() => handleCheckboxToggle(s)}
                                    sx={{
                                      p: 0,
                                      width: "35px",
                                      height: "35px",
                                      "& .MuiSvgIcon-root": { fontSize: "25px" },
                                      color: isTaggedInOtherSection ? "#f57c00" : "#000",
                                      "&.Mui-checked": { color: mainButtonColor },
                                      "&.MuiCheckbox-indeterminate": { color: "#f57c00" },
                                    }}
                                  />
                                </Tooltip>
                              )}
                            </TableCell>

                            <TableCell sx={{ ...tdStyle, color: "#888", border: `1px solid ${borderColor}` }}>{rowIndex + 1}</TableCell>
                            <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>{s.student_number}</TableCell>
                            <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>
                              {s.last_name}, {s.first_name} {s.middle_name || ""}
                            </TableCell>
                            <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>{s.program_code}</TableCell>
                            <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>
                              {s.year_level_description || s.year_level}
                            </TableCell>
                            <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>
                              {currentSectionId ? (
                                <Chip
                                  label={getStudentSectionLabel(s)}
                                  size="small"
                                  sx={{
                                    backgroundColor: isTagged ? "#e8f5e9" : "#fff3e0",
                                    color: isTagged ? "#2e7d32" : "#e65100",
                                    fontWeight: 600,
                                    fontSize: "11px",
                                    height: "22px",
                                    border: `1px solid ${isTagged ? "#2e7d32" : "#e65100"}`,
                                  }}
                                />
                              ) : (
                                "Not tagged"
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {virtualCurriculumStudents.bottomSpacerHeight > 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            sx={{
                              p: 0,
                              border: "none",
                              height: `${virtualCurriculumStudents.bottomSpacerHeight}px`,
                            }}
                          />
                        </TableRow>
                      )}
                    </>
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
              label={sectionRefreshing ? "..." : filteredEnrolledStudents.length}
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

          <Paper elevation={0} sx={{ border: `1px solid ${borderColor}`, overflow: "hidden" }}>
            <TableContainer
              ref={enrolledTableRef}
              sx={{ maxHeight: VIRTUAL_TABLE_HEIGHT, overflowY: "auto" }}
              onScroll={(event) => setEnrolledScrollTop(event.currentTarget.scrollTop)}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {["#", "Student No.", "Student Name", "Program", "Year Level", "Section", "Action"].map((h) => (
                      <TableCell key={h} sx={{ ...thStyle, textAlign: "center", border: `1px solid ${borderColor}` }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sectionRefreshing ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        sx={{ textAlign: "center", py: 4, color: "#777", fontSize: "13px" }}
                      >
                        Loading tagged students...
                      </TableCell>
                    </TableRow>
                  ) : filteredEnrolledStudents.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        sx={{ textAlign: "center", py: 4, color: "#aaa", fontSize: "13px" }}
                      >
                        {debouncedStudentSearchQuery ? "No tagged students match your search" : "No tagged students yet"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {virtualEnrolledStudents.topSpacerHeight > 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            sx={{
                              p: 0,
                              border: "none",
                              height: `${virtualEnrolledStudents.topSpacerHeight}px`,
                            }}
                          />
                        </TableRow>
                      )}

                      {virtualEnrolledStudents.items.map((s, idx) => {
                        const rowIndex = virtualEnrolledStudents.startIndex + idx;

                        return (
                          <TableRow
                            key={s.student_number}
                            sx={{ height: `${VIRTUAL_ROW_HEIGHT}px`, "&:hover": { backgroundColor: "#fff8e1" } }}
                          >
                            <TableCell sx={{ ...tdStyle, color: "#888", width: "36px", border: `1px solid ${borderColor}` }}>
                              {rowIndex + 1}
                            </TableCell>
                            <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>{s.student_number}</TableCell>
                            <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>
                              {s.last_name}, {s.first_name} {s.middle_name || ""}
                            </TableCell>
                            <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>{s.program_code}</TableCell>
                            <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>
                              {s.year_level_description || s.year_level}
                            </TableCell>
                            <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>
                              <Chip
                                label={s.section_description || s.section || "—"}
                                size="small"
                                sx={{
                                  backgroundColor: "#e3f2fd",
                                  color: "#1565c0",
                                  fontWeight: 600,
                                  fontSize: "11px",
                                  height: "22px",
                                  border: "1px solid #1565c0",
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ ...tdStyle, border: `1px solid ${borderColor}` }}>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<UnenrollIcon sx={{ fontSize: "14px !important" }} />}
                                onClick={() => handleUnenrollSingle(s.student_number)}
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
                                Untag
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {virtualEnrolledStudents.bottomSpacerHeight > 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            sx={{
                              p: 0,
                              border: "none",
                              height: `${virtualEnrolledStudents.bottomSpacerHeight}px`,
                            }}
                          />
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>

      {/* ── Snackbar ───────────────────────────────────────────────────────── */}
      <Dialog
        open={Boolean(pendingSectionMove)}
        onClose={() => setPendingSectionMove(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#e65100" }}>
          Student Already Tagged
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "14px", color: "#333" }}>
            Student {pendingSectionMove?.student_number} is already tagged in{" "}
            <strong>{pendingSectionMove ? getStudentSectionLabel(pendingSectionMove) : ""}</strong>.
            Do you want to move this student to <strong>{insertSectionLabel}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setPendingSectionMove(null)}
            variant="outlined"
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              const studentToMove = pendingSectionMove;
              setPendingSectionMove(null);
              if (studentToMove) {
                await tagStudent(studentToMove, { movingFromOtherSection: true });
              }
            }}
            variant="contained"
            sx={{
              backgroundColor: mainButtonColor,
              textTransform: "none",
              fontWeight: 600,
              "&:hover": { backgroundColor: mainButtonColor, opacity: 0.88 },
            }}
          >
            Move Student
          </Button>
        </DialogActions>
      </Dialog>

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

export default DepartmentSectionTagging;
