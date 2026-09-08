import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import { SettingsContext } from "../App";
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  FormControl,
  Select,
  TableCell,
  MenuItem,
  InputLabel,
  TableBody,
  Button,
  Tooltip,
} from '@mui/material';
import { FcPrint } from "react-icons/fc";
import EaristLogo from "../assets/EaristLogo.png";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import { useLocation, useNavigate } from "react-router-dom";

import {
  getDepartmentIdsFromAdminData,
  isRegistrarCurriculumMatch,
  isRegistrarProgramSelectionLocked,
  isRegistrarStudentScopeMatch,
  restrictDepartmentsToScope,
  restrictToRegistrarCurriculum,
  syncRegistrarScopeFromAdminData,
} from "../utils/registrarCurriculumRestriction";
import useRegistrarScopeRevision from "../hooks/useRegistrarScopeRevision";
import { filterSchoolYearsFromActive } from "../utils/schoolYearOptions";
import {
  buildRegistrarClassListPrintHtml,
  CLASS_LIST_PRINT_CSS,
  mapStudentToPrintRow,
  resolveLogoDataUrl,
} from "../utils/classListPrintLayout";
import {
  fetchClassListStudents,
  resolveClassListDepartmentIds,
} from "../utils/classListStudentFetch";
import useClassListProfSectionFilters from "../hooks/useClassListProfSectionFilters";
import {
  formatProfessorLabel,
  formatSectionLabel,
  getSectionOptionId,
} from "../utils/classListProfSection";

// ✅ Ported from StudentListForEnrollment: dedupe by program_code + major
// (NOT curriculum_id). The same program (e.g. "BSCS") can be stored under
// multiple curriculum_id rows (different curriculum revisions/years).
// Deduping by curriculum_id never collapsed those, so "BSCS" would show up
// twice in the Program dropdown. Keying on program_code+major treats those
// rows as the same option while still keeping distinct majors
// (e.g. BSED-Math vs BSED-Filipino) separate even if they share a
// program_code.
const programKey = (item) =>
  `${String(item.program_code ?? "").trim().toLowerCase()}|${String(item.major ?? "").trim().toLowerCase()}`;

const formatStudentSection = (student) =>
  formatSectionLabel({
    program_code: student?.section_program_code || student?.program_code,
    section_description: student?.section_description,
    description: student?.section_description,
  });

const dedupeCurriculumOptions = (list) => {
  const seen = new Map();
  for (const item of list) {
    const key = programKey(item);
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }
  return [...seen.values()];
};

const RegistrarClassList = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  // ─── Theme colors ────────────────────────────────────────────────────────────
  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [stepperColor, setStepperColor] = useState("#000000");

  // ─── School branding ─────────────────────────────────────────────────────────
  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [user, setUser] = useState("");
  const [adminData, setAdminData] = useState({ dprtmnt_id: "", dprtmnt_ids: [] });
  const [employeeID, setEmployeeID] = useState("");

  // ─── Data ─────────────────────────────────────────────────────────────────────
  const [students, setStudents] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [department, setDepartment] = useState([]);
  const [allCurriculums, setAllCurriculums] = useState([]);
  const [curriculumOptions, setCurriculumOptions] = useState([]);

  // ─── Filters ──────────────────────────────────────────────────────────────────
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedSchoolSemester, setSelectedSchoolSemester] = useState("");
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
  const [selectedProgramFilter, setSelectedProgramFilter] = useState("");
  const isProgramLocked = isRegistrarProgramSelectionLocked();
  const scopeRevision = useRegistrarScopeRevision();
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("");
  const [selectedRemarkFilter, setSelectedRemarkFilter] = useState("");
  const [selectedYearLevelFilter, setSelectedYearLevelFilter] = useState("");
  const [yearLevels, setYearLevels] = useState([]);
  const [sortOrder, setSortOrder] = useState("asc");

  // ─── Pagination ───────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ─── Access control ───────────────────────────────────────────────────────────
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [activeTermReady, setActiveTermReady] = useState(false);
  const studentsAbortRef = useRef(null);
  const pageId = 15;
  const location = useLocation();
  const navigate = useNavigate();

  const remarksMap = { 0: "Ongoing", 1: "Passed", 2: "Failed", 3: "Incomplete", 4: "Drop" };
  const getStudentRegularStatus = (student) =>
    Number(student.official_is_regular ?? student.is_regular ?? student.status);
  const getStudentRegularLabel = (student) =>
    getStudentRegularStatus(student) === 1 ? "Regular" : "Irregular";

  // ✅ Ported from StudentListForEnrollment: resolve the selected Program
  // option's program_code+major (not its raw curriculum_id). Filtering
  // below matches against this, so a student is included as long as they
  // belong to the same program/major — regardless of which specific
  // curriculum_id revision their row happens to carry.
  const selectedProgramOption = curriculumOptions.find(
    (opt) => String(opt.curriculum_id) === String(selectedProgramFilter),
  );

  const departmentIdsForSections = useMemo(
    () =>
      resolveClassListDepartmentIds({
        selectedDepartmentFilter,
        adminData,
        department,
      }),
    [selectedDepartmentFilter, adminData, department],
  );

  const {
    professors,
    sections,
    selectedProfessorFilter,
    selectedSectionFilter,
    handleProfessorChange,
    handleSectionChange,
    matchProfSectionFilter,
  } = useClassListProfSectionFilters({
    selectedDepartmentFilter,
    departmentIds: departmentIdsForSections,
    selectedProgramOption,
    selectedSchoolYear,
    selectedSchoolSemester,
    setCurrentPage,
  });

  // Staff: visiting Class List clears sticky selection (same as Student List)
  // and strips ?person_id= so this screen never auto-loads a student.
  useEffect(() => {
    sessionStorage.removeItem("edit_person_id");
    sessionStorage.removeItem("edit_student_number");
    sessionStorage.removeItem("edit_list_year_id");
    sessionStorage.removeItem("edit_list_semester_id");
    sessionStorage.removeItem("admin_edit_person_id");
    sessionStorage.removeItem("admin_edit_person_id_source");
    sessionStorage.removeItem("admin_edit_person_id_ts");
    sessionStorage.removeItem("admin_edit_search_query");
    sessionStorage.removeItem("admin_edit_person_data");
    sessionStorage.removeItem("student_edit_person_id");

    if (
      location.search.includes("person_id") ||
      location.search.includes("student_number")
    ) {
      navigate("/registrar_class_list", { replace: true });
    }
  }, [location.search, navigate]);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1 & 2 — Auth + access check
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployee = localStorage.getItem("employee_id");

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setEmployeeID(storedEmployee);

      if (storedRole === "registrar") {
        checkAccess(storedEmployee);
      } else {
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const checkAccess = async (empID) => {
    try {
      // ── 1. Check page-level privilege for this specific page ──────────────────
      const pageRes = await axios.get(`${API_BASE_URL}/api/page_access/${empID}/${pageId}`);
      const hasPageAccess = pageRes.data?.page_privilege === 1;
      setHasAccess(hasPageAccess);

    } catch (err) {
      console.error("Error checking access:", err);
      setHasAccess(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1 — Fetch admin data
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const fetchAdminData = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin_data/${user}`);
        setAdminData(res.data);
        syncRegistrarScopeFromAdminData(res.data);
      } catch (err) {
        console.error("Error fetching admin data:", err);
      }
    };

    fetchAdminData();
  }, [user]);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3 — Fetch students for the selected department(s) in one request
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeTermReady) return;

    const scopedIds = getDepartmentIdsFromAdminData(adminData);
    const departmentIdsToFetch = resolveClassListDepartmentIds({
      selectedDepartmentFilter,
      adminData,
      department,
    });

    if (!departmentIdsToFetch.length) {
      if (scopedIds.length > 1 && department.length === 0) return;
      setStudents([]);
      return;
    }

    if (studentsAbortRef.current) {
      studentsAbortRef.current.abort();
    }
    const controller = new AbortController();
    studentsAbortRef.current = controller;

    const loadStudents = async () => {
      try {
        setStudentsLoading(true);
        const mergedStudents = await fetchClassListStudents(API_BASE_URL, {
          selectedDepartmentFilter,
          adminData,
          department,
          yearId: selectedSchoolYear,
          semesterId: selectedSchoolSemester,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setStudents(mergedStudents);
        }
      } catch (err) {
        if (err?.code !== "ERR_CANCELED" && err?.name !== "CanceledError") {
          console.error("Error fetching student data:", err);
        }
        if (!controller.signal.aborted) {
          setStudents([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setStudentsLoading(false);
        }
      }
    };

    loadStudents();

    return () => {
      controller.abort();
    };
  }, [
    activeTermReady,
    selectedDepartmentFilter,
    selectedSchoolYear,
    selectedSchoolSemester,
    scopeRevision,
    adminData,
    department,
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5 — Fetch supporting data (departments, programs, years, semesters)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE_URL}/api/get_school_year/`),
      axios.get(`${API_BASE_URL}/api/active_school_year`),
    ])
      .then(([yearsRes, activeRes]) => {
        const active =
          Array.isArray(activeRes.data) && activeRes.data.length > 0
            ? activeRes.data[0]
            : null;
        setSchoolYears(filterSchoolYearsFromActive(yearsRes.data || [], active));
        if (active) {
          setSelectedSchoolYear(active.year_id);
          setSelectedSchoolSemester(active.semester_id);
        }
      })
      .catch(console.error)
      .finally(() => setActiveTermReady(true));

    axios.get(`${API_BASE_URL}/api/get_school_semester/`)
      .then(res => setSemesters(res.data))
      .catch(console.error);

    axios.get(`${API_BASE_URL}/api/get_year_level`)
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        setYearLevels(
          rows.filter(
            (yl) => String(yl.level_type || "year").toLowerCase() === "year",
          ),
        );
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const departmentIds = getDepartmentIdsFromAdminData(adminData);
    if (!departmentIds.length) return;

    const fetchDepartments = async () => {
      try {
        const responses = await Promise.all(
          departmentIds.map((departmentId) =>
            axios.get(`${API_BASE_URL}/api/departments/${departmentId}`),
          ),
        );
        const mergedDepartments = restrictDepartmentsToScope(
          responses.flatMap((response) => response.data || []),
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
    const departmentIds = getDepartmentIdsFromAdminData(adminData);
    if (!departmentIds.length) return;

    const fetchCurriculums = async () => {
      try {
        const responses = await Promise.all(
          departmentIds.map((departmentId) =>
            axios.get(`${API_BASE_URL}/api/applied_program/${departmentId}`),
          ),
        );
        const merged = responses.flatMap((response) => response.data || []);
        // ✅ Ported from StudentListForEnrollment: dedupe by
        // program_code+major (see programKey/dedupeCurriculumOptions above)
        // — fixes duplicate program entries (e.g. two "BSCS" rows) in the
        // Program dropdown, which were actually two different curriculum_id
        // revisions of the same program.
        const restrictedCurriculums = dedupeCurriculumOptions(
          restrictToRegistrarCurriculum(merged),
        );
        setAllCurriculums(restrictedCurriculums);
        setCurriculumOptions(restrictedCurriculums);
      } catch (error) {
        console.error("Error fetching curriculum options:", error);
      }
    };

    fetchCurriculums();
  }, [adminData.dprtmnt_id, adminData.dprtmnt_ids, scopeRevision]);

  useEffect(() => {
    const departmentIds = getDepartmentIdsFromAdminData(adminData);
    if (departmentIds.length) return;

    axios.get(`${API_BASE_URL}/api/departments`)
      .then(res => setDepartment(res.data))
      .catch(console.error);

    axios.get(`${API_BASE_URL}/api/applied_program`)
      .then(res => {
        // ✅ Same program_code+major dedupe for the fallback ("all
        // departments") path.
        const restrictedCurriculums = dedupeCurriculumOptions(
          restrictToRegistrarCurriculum(res.data),
        );
        setAllCurriculums(restrictedCurriculums);
        setCurriculumOptions(restrictedCurriculums);
      })
      .catch(console.error);
  }, [adminData.dprtmnt_id, adminData.dprtmnt_ids, scopeRevision]);

  // ✅ FIX: previously this called both setSelectedDepartmentFilter(firstDeptId)
  // AND handleDepartmentChange(firstDeptId) — redundant, and the first call
  // stored whatever raw type `dprtmnt_id` came back as (often a number),
  // instead of the normalized string handleDepartmentChange produces.
  useEffect(() => {
    if (department.length === 0 || selectedDepartmentFilter) return;
    const departmentIds = getDepartmentIdsFromAdminData(adminData);
    if (departmentIds.length !== 1) return;
    if (allCurriculums.length === 0) return;

    const firstDeptId = department[0].dprtmnt_id;
    handleDepartmentChange(firstDeptId);
  }, [department, allCurriculums, selectedDepartmentFilter, adminData]);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 6 — Apply UI restrictions based on the user's department
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isProgramLocked) return;
    const assignedCurriculum = curriculumOptions.find((prog) =>
      isRegistrarCurriculumMatch(prog.curriculum_id, curriculumOptions)
    );
    if (assignedCurriculum?.curriculum_id) {
      setSelectedProgramFilter(assignedCurriculum.curriculum_id);
    }
  }, [curriculumOptions, isProgramLocked]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Settings effect
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);
    if (assets.logoUrl) setFetchedLogo(assets.logoUrl);
    else setFetchedLogo(EaristLogo);
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleSchoolYearChange = e => { setSelectedSchoolYear(e.target.value); setCurrentPage(1); };
  const handleSchoolSemesterChange = e => { setSelectedSchoolSemester(e.target.value); setCurrentPage(1); };
  const handleYearLevelChange = (e) => {
    setSelectedYearLevelFilter(e.target.value);
    setCurrentPage(1);
  };

  // ✅ FIX: normalize to a string (matches StudentListForEnrollment's
  // handleDepartmentChange), and fix the curriculumOptions filter to compare
  // with String() instead of strict equality — dprtmnt_id can come back as a
  // number from the API while the Select always gives a string, so `===`
  // silently failed and left curriculumOptions/students unfiltered.
  const handleDepartmentChange = (selectedDept) => {
    const nextDept = selectedDept === "" || selectedDept == null ? "" : String(selectedDept);
    setSelectedDepartmentFilter(nextDept);
    setCurriculumOptions(
      nextDept
        ? allCurriculums.filter((o) => String(o.dprtmnt_id) === nextDept)
        : allCurriculums
    );
    if (!isProgramLocked) setSelectedProgramFilter("");
    handleProfessorChange("");
    setCurrentPage(1);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 7 — Frontend filtering
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredStudents = students
    .filter(s => {
      // ✅ FIX: String() comparison instead of strict equality — this was the
      // actual bug. s.dprtmnt_id often comes back as a number from the API,
      // so `s.dprtmnt_id === selectedDepartmentFilter` (a string) never
      // matched once a specific department was selected.
      const matchDept = selectedDepartmentFilter === "" || String(s.dprtmnt_id) === String(selectedDepartmentFilter);

      // ✅ Ported from StudentListForEnrollment: match by program_code+major
      // instead of curriculum_id. A student's row can carry a different
      // curriculum_id revision than the one kept as the representative
      // option after dedupe, so comparing curriculum_id directly would
      // silently exclude students who really do belong to the selected
      // program. Resolve both sides to program_code+major and compare those.
      const programInfo = allCurriculums.find(
        (opt) => String(opt.curriculum_id) === String(s.curriculum_id),
      );
      const matchProgram =
        selectedProgramFilter === "" ||
        (selectedProgramOption
          ? programInfo
            ? programKey(programInfo) === programKey(selectedProgramOption)
            : false
          : String(s.curriculum_id) === String(selectedProgramFilter));

      const matchRegistrarScope = isRegistrarStudentScopeMatch(s, allCurriculums);
      const matchYear = selectedSchoolYear === "" || String(s.year_id) === String(selectedSchoolYear);
      const matchSemester = selectedSchoolSemester === "" || String(s.semester_id) === String(selectedSchoolSemester);
      const matchStatus = selectedStatusFilter === ""
        || (selectedStatusFilter === "Regular" && getStudentRegularStatus(s) === 1)
        || (selectedStatusFilter === "Irregular" && getStudentRegularStatus(s) !== 1);
      const matchRemark = selectedRemarkFilter === "" || remarksMap[s.en_remarks] === selectedRemarkFilter;
      const matchYearLevel =
        selectedYearLevelFilter === "" ||
        String(s.year_level_id) === String(selectedYearLevelFilter);
      const matchProfSection = matchProfSectionFilter(s);

      return matchDept && matchProgram && matchRegistrarScope && matchYear && matchSemester && matchStatus && matchRemark && matchYearLevel && matchProfSection;
    })
    .sort((a, b) => {
      const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
      const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
      return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Export (Download Class List PDF)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleExportClassListPdf = async () => {
    const selectedDepartment = department.find(
      (d) => String(d.dprtmnt_id) === String(selectedDepartmentFilter),
    );
    const selectedDepartmentLabel =
      selectedDepartment?.dprtmnt_name || "All Departments";

    const selectedProgramLabel = selectedProgramFilter
      ? selectedProgramOption?.program_description || selectedProgramFilter
      : "All Programs";

    const resolveAllProgramsCodeLabel = () => {
      let deptCode = selectedDepartment?.dprtmnt_code || "";
      if (!deptCode) {
        const scopedIds = getDepartmentIdsFromAdminData(adminData);
        if (scopedIds.length === 1) {
          deptCode =
            department.find(
              (d) => String(d.dprtmnt_id) === String(scopedIds[0]),
            )?.dprtmnt_code || "";
        }
      }
      return deptCode ? `All ${deptCode}'s Programs` : "All Programs";
    };

    const programCode = selectedProgramFilter
      ? selectedProgramOption?.program_code || "—"
      : resolveAllProgramsCodeLabel();

    const programDescription = selectedProgramLabel;

    const selectedProfessor = professors.find(
      (prof) => String(prof.prof_id) === String(selectedProfessorFilter),
    );
    const facultyName = selectedProfessor
      ? formatProfessorLabel(selectedProfessor)
      : "";

    const selectedSection = sections.find(
      (section) => getSectionOptionId(section) === String(selectedSectionFilter),
    );
    const classSectionLabel =
      selectedSectionFilter && selectedSection
        ? formatSectionLabel(selectedSection)
        : "All Sections";

    const selectedYearLevelLabel = selectedYearLevelFilter
      ? yearLevels.find(
          (yl) => String(yl.year_level_id) === String(selectedYearLevelFilter),
        )?.year_level_description || "All Year Levels"
      : "All Year Levels";

    const selectedYear = schoolYears.find(
      (sy) => String(sy.year_id) === String(selectedSchoolYear),
    );
    const yearLabel = selectedYear
      ? `${selectedYear.current_year}-${selectedYear.next_year}`
      : "N/A";

    const selectedSemesterLabel =
      semesters.find(
        (sm) => String(sm.semester_id) === String(selectedSchoolSemester),
      )?.semester_description || "N/A";

    const printTimestamp = new Date().toLocaleString("en-PH", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const logoDataUrl = await resolveLogoDataUrl(
      fetchedLogo || EaristLogo || "",
    );

    const footerCenter =
      selectedProgramLabel && selectedProgramLabel !== "All Programs"
        ? selectedProgramLabel
        : "Class List";

    const innerHtml = `
      <style>${CLASS_LIST_PRINT_CSS}</style>
      ${buildRegistrarClassListPrintHtml({
        companyName: companyName?.trim() || "",
        campusAddress: campusAddress?.trim() || "Nagtahan Sampaloc Manila",
        logoUrl: logoDataUrl,
        departmentTitle: selectedDepartmentLabel,
        programCode,
        programDescription,
        classSection: classSectionLabel,
        facultyName,
        yearLevel: selectedYearLevelLabel,
        academicYearLabel: yearLabel,
        semesterLabel: selectedSemesterLabel,
        students: filteredStudents.map(mapStudentToPrintRow),
        printInfoLabel: printTimestamp,
      })}
    `;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/generate-class-list-pdf`,
        {
          html: innerHtml,
          footerLeft: printTimestamp,
          footerCenter,
        },
        {
          responseType: "blob",
          headers: {
            "x-employee-id": employeeID,
            "x-page-id": pageId,
          },
        },
      );

      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute(
        "download",
        `Class_List_${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to generate Class List PDF:", err);
      alert("Failed to generate Class List PDF.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Guards
  // ─────────────────────────────────────────────────────────────────────────────
  if (loading || hasAccess === null) return <LoadingOverlay open={loading} message="Loading..." />;
  if (studentsLoading && students.length === 0) {
    return <LoadingOverlay open message="Loading students..." />;
  }
  if (!hasAccess) return <Unauthorized />;

  const scopedDepartmentIds = getDepartmentIdsFromAdminData(adminData);
  const isDeptLocked = scopedDepartmentIds.length === 1 && department.length === 1;
  const showAllDepartmentsOption = scopedDepartmentIds.length !== 1;
  const selectedDepartmentFilterValue =
    selectedDepartmentFilter === "" ||
      department.some(
        (dep) => String(dep.dprtmnt_id) === String(selectedDepartmentFilter),
      )
      ? selectedDepartmentFilter
      : "";

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

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
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
        <Typography variant="h4"
          sx={{
            fontWeight: 'bold',
            color: titleColor,
            fontSize: '36px',
          }}
        >
          CLASS LIST
        </Typography>

        <button
          onClick={handleExportClassListPdf}
          style={{
            padding: "10px 20px",
            border: "2px solid black",
            backgroundColor: "#f0f0f0",
            color: "black",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
            transition: "background-color 0.3s, transform 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#d3d3d3")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#f0f0f0")
          }
          onMouseDown={(e) =>
            (e.currentTarget.style.transform = "scale(0.95)")
          }
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          type="button"
        >
          <FcPrint size={20} />
          Download Class List
        </button>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />

      <br />

      {/* ── Pagination bar ── */}
      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: headerColor }}>
            <TableRow>
              <TableCell colSpan={10} sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: headerColor, color: "white" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Students: {filteredStudents.length}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {[
                      { label: "First", onClick: () => setCurrentPage(1), disabled: currentPage === 1 },
                      { label: "Prev", onClick: () => setCurrentPage(p => Math.max(p - 1, 1)), disabled: currentPage === 1 },
                    ].map(btn => (
                      <Button key={btn.label} onClick={btn.onClick} disabled={btn.disabled} variant="outlined" size="small"
                        sx={{
                          minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent",
                          "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" },
                          "&.Mui-disabled": { color: "white", borderColor: "white", opacity: 1 }
                        }}>
                        {btn.label}
                      </Button>
                    ))}

                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select value={currentPage} onChange={e => setCurrentPage(Number(e.target.value))}
                        sx={{
                          fontSize: "12px", height: 36, color: "white", border: "1px solid white", backgroundColor: "transparent",
                          ".MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                          "& svg": { color: "white" }
                        }}
                        MenuProps={{ PaperProps: { sx: { maxHeight: 200 } } }}>
                        {Array.from({ length: totalPages }, (_, i) => (
                          <MenuItem key={i + 1} value={i + 1}>Page {i + 1}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Typography fontSize="11px" color="white">{totalPages} page{totalPages > 1 ? "s" : ""}</Typography>

                    {[
                      { label: "Next", onClick: () => setCurrentPage(p => Math.min(p + 1, totalPages)), disabled: currentPage === totalPages },
                      { label: "Last", onClick: () => setCurrentPage(totalPages), disabled: currentPage === totalPages },
                    ].map(btn => (
                      <Button key={btn.label} onClick={btn.onClick} disabled={btn.disabled} variant="outlined" size="small"
                        sx={{
                          minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent",
                          "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" },
                          "&.Mui-disabled": { color: "white", borderColor: "white", opacity: 1 }
                        }}>
                        {btn.label}
                      </Button>
                    ))}

                    <Button onClick={() => setSortOrder(p => p === "asc" ? "desc" : "asc")} variant="outlined" size="small"
                      sx={{
                        minWidth: 100, color: "white", borderColor: "white", backgroundColor: "transparent",
                        "&:hover": { borderColor: "white", backgroundColor: "rgba(255,255,255,0.1)" }
                      }}>
                      Sort: {sortOrder === "asc" ? "A–Z" : "Z–A"}
                    </Button>
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      {/* ── Filter panel ── */}
      <TableContainer component={Paper} sx={{ width: "100%", border: `1px solid ${borderColor}`, p: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          {/* Row 1: status / remarks | school year / semester | department / program */}
          <Box display="flex" justifyContent="space-between">

            {/* Left column */}
            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography fontSize={13} sx={{ minWidth: "100px" }}>Student Status:</Typography>
                <FormControl size="small" sx={{ width: "200px" }}>
                  <Select value={selectedStatusFilter} onChange={e => { setSelectedStatusFilter(e.target.value); setCurrentPage(1); }} displayEmpty>
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="Regular">Regular</MenuItem>
                    <MenuItem value="Irregular">Irregular</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography fontSize={13} sx={{ minWidth: "100px" }}>Remarks:</Typography>
                <FormControl size="small" sx={{ width: "200px" }}>
                  <Select value={selectedRemarkFilter} onChange={e => { setSelectedRemarkFilter(e.target.value); setCurrentPage(1); }} displayEmpty>
                    <MenuItem value="">All</MenuItem>
                    {Object.values(remarksMap).map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Middle column */}
            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography fontSize={13} sx={{ minWidth: "100px" }}>School Year:</Typography>
                <FormControl size="small" sx={{ width: "200px" }}>
                  <InputLabel>School Years</InputLabel>
                  <Select label="School Years" value={selectedSchoolYear} onChange={handleSchoolYearChange} displayEmpty>
                    {schoolYears.length > 0
                      ? schoolYears.map(sy => <MenuItem key={sy.year_id} value={sy.year_id}>{sy.current_year} - {sy.next_year}</MenuItem>)
                      : <MenuItem disabled>Not found</MenuItem>}
                  </Select>
                </FormControl>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography fontSize={13} sx={{ minWidth: "100px" }}>Semester:</Typography>
                <FormControl size="small" sx={{ width: "200px" }}>
                  <InputLabel>School Semester</InputLabel>
                  <Select label="School Semester" value={selectedSchoolSemester} onChange={handleSchoolSemesterChange} displayEmpty>
                    {semesters.length > 0
                      ? semesters.map(s => <MenuItem key={s.semester_id} value={s.semester_id}>{s.semester_description}</MenuItem>)
                      : <MenuItem disabled>Not found</MenuItem>}
                  </Select>
                </FormControl>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography fontSize={13} sx={{ minWidth: "100px" }}>Year Level:</Typography>
                <FormControl size="small" sx={{ width: "200px" }}>
                  <Select
                    value={selectedYearLevelFilter}
                    onChange={handleYearLevelChange}
                    displayEmpty
                  >
                    <MenuItem value="">All Year Levels</MenuItem>
                    {yearLevels.map((yl) => (
                      <MenuItem key={yl.year_level_id} value={String(yl.year_level_id)}>
                        {yl.year_level_description}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Right column — department locked for assigned admins */}
            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography fontSize={13} sx={{ minWidth: "100px" }}>Department:</Typography>
                <Tooltip
                  title={isDeptLocked ? "Your account is assigned to a single department." : ""}
                  placement="top"
                  disableHoverListener={!isDeptLocked}
                >
                  <span style={{ display: "inline-block" }}>
                    <FormControl size="small" sx={{ width: "400px" }} disabled={isDeptLocked}>
                      <Select
                        value={selectedDepartmentFilterValue}
                        onChange={e => { if (!isDeptLocked) handleDepartmentChange(e.target.value); }}
                        displayEmpty
                        sx={isDeptLocked ? { backgroundColor: "#f5f5f5", cursor: "not-allowed" } : {}}
                      >
                        {!isDeptLocked && showAllDepartmentsOption && (
                          <MenuItem value="">All Departments</MenuItem>
                        )}
                        {department.map(dep => (
                          <MenuItem key={dep.dprtmnt_id} value={String(dep.dprtmnt_id)}>
                            {dep.dprtmnt_name} ({dep.dprtmnt_code})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </span>
                </Tooltip>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography fontSize={13} sx={{ minWidth: "100px" }}>Program:</Typography>
                <FormControl size="small" sx={{ width: "400px" }}>
                  <Select value={selectedProgramFilter} onChange={e => { setSelectedProgramFilter(e.target.value); setCurrentPage(1); }} disabled={isProgramLocked} displayEmpty>
                    {!isProgramLocked && <MenuItem value="">All Programs</MenuItem>}
                    {curriculumOptions.map(p => (
                      <MenuItem key={p.curriculum_id} value={p.curriculum_id}>
                        {p.program_code} - {p.program_description}{p.major ? ` (${p.major})` : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

          </Box>

          {/* Row 2: professor / section */}
          <Box display="flex" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "100px" }}>Professor:</Typography>
              <FormControl size="small" sx={{ width: "400px" }}>
                <Select
                  value={selectedProfessorFilter}
                  onChange={(e) => handleProfessorChange(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">All Professors</MenuItem>
                  {professors.map((prof) => (
                    <MenuItem key={prof.prof_id} value={String(prof.prof_id)}>
                      {formatProfessorLabel(prof)}
                      {prof.employee_id ? ` (${prof.employee_id})` : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "100px" }}>Section:</Typography>
              <FormControl size="small" sx={{ width: "400px" }}>
                <Select
                  value={selectedSectionFilter}
                  onChange={(e) => handleSectionChange(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">All Sections</MenuItem>
                  {sections.length === 0 && (
                    <MenuItem disabled value="__none__">
                      No sections found for current filters
                    </MenuItem>
                  )}
                  {sections.map((section) => {
                    const sectionId = getSectionOptionId(section);
                    return (
                      <MenuItem key={sectionId} value={sectionId}>
                        {formatSectionLabel(section)}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Box>
      </TableContainer>

      {/* ── Students table ── */}
      <TableContainer component={Paper} sx={{ width: "100%", marginTop: "2rem" }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: headerColor }}>
            <TableRow>
              {["#", "Student Number", "Name", "Program Description", "Program Code",
                "Year Level", "Semester", "Remarks", "Section", "Student Status"].map(h => (
                  <TableCell key={h} sx={{ color: "white", textAlign: "center", fontSize: "12px", border: `1px solid ${borderColor}` }}>
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
            {paginatedStudents.map((s, i) => (
              <TableRow key={`${s.student_number}-${i}`}>
                <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                  {(currentPage - 1) * itemsPerPage + i + 1}
                </TableCell>
                <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>{s.student_number}</TableCell>
                <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                  {s.last_name}, {s.first_name} {s.middle_name || ""}
                </TableCell>
                <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>{s.program_description}</TableCell>
                <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>{s.program_code}</TableCell>
                <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>{s.year_level_description}</TableCell>
                <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>{s.semester_description}</TableCell>
                <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>{remarksMap[s.en_remarks] || ""}</TableCell>
                <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>{formatStudentSection(s)}</TableCell>
                <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                  {getStudentRegularLabel(s)}
                </TableCell>
              </TableRow>
            ))}
            {paginatedStudents.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} sx={{ textAlign: "center", border: `1px solid ${borderColor}`, color: "#777", py: 3 }}>
                  No students found for the selected filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

    </Box>
  );
};

export default RegistrarClassList;
