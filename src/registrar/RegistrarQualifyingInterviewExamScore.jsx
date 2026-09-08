import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Button,
  Typography,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  FormControl,
  Select,
  TableCell,
  TextField,
  MenuItem,
  InputLabel,
  TableBody,
} from "@mui/material";
import API_BASE_URL from "../apiConfig";
import { Snackbar, Alert } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { FcPrint } from "react-icons/fc";
import EaristLogo from "../assets/EaristLogo.png";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import {
  isRegistrarCurriculumMatch,
  isRegistrarProgramSelectionLocked,
  restrictToRegistrarCurriculum,
  syncRegistrarScopeFromAdminData,
  getDepartmentIdsFromAdminData,
} from "../utils/registrarCurriculumRestriction";
import useRegistrarScopeRevision from "../hooks/useRegistrarScopeRevision";
import SearchIcon from "@mui/icons-material/Search";
import DateField from "../components/DateField";
import useAuditMac from "../utils/useAuditMac";
import { io } from "socket.io-client";
import RegistrarApplicantProcessTabs from "../components/RegistrarApplicantProcessTabs";

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

const RegistrarQualifyingInterviewExamScore = () => {
  useAuditMac();
  const socket = useRef(null);

  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff"); // ✅ NEW
  const [stepperColor, setStepperColor] = useState("#000000"); // ✅ NEW

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (!settings) return;

    // 🎨 Colors
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

    // 🏫 Logo
    if (assets.logoUrl) {
      setFetchedLogo(assets.logoUrl);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Info
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    // ✅ Branches (JSON stored in DB)
    setBranches(settings?.branches || []);
  }, [settings]);

  useEffect(() => {
    socket.current = io(API_BASE_URL, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);
  const words = companyName.trim().split(" ");
  const middle = Math.ceil(words.length / 2);
  const firstLine = words.slice(0, middle).join(" ");
  const secondLine = words.slice(middle).join(" ");

  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);

  const queryPersonId = (queryParams.get("person_id") || "").trim();

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
    sessionStorage.setItem("admin_edit_person_data", JSON.stringify(applicant));

    if (searchValue) {
      sessionStorage.setItem("admin_edit_search_query", String(searchValue));
      sessionStorage.setItem("edit_applicant_number", String(searchValue));
    }

    navigate(`/applicant_registrar_personal_information?person_id=${personId}`);
  };

  const COLLEGE_APPROVAL_STATUS = {
    WAITING_LIST: 0,
    ACCEPTED: 1,
    REJECTED: 2,
  };

  const isCollegeStatusLocked = (person) =>
    Number(person?.applicant_interview_status) === 1;

  const buildPayload = (person, overrides = {}, options = {}) => {
    const edits = { ...(editScores[person.person_id] || {}), ...overrides };
    const selectedStatus = Number(
      edits.status ?? person.college_approval_status ?? 0,
    );
    const includeStatus = options.includeStatus !== false;

    return {
      applicant_number: person.applicant_number,
      qualifying_exam_score:
        edits.qualifying_exam_score ?? person.qualifying_exam_score ?? 0,
      qualifying_interview_score:
        edits.qualifying_interview_score ??
        person.qualifying_interview_score ??
        0,
      qualifying_status:
        edits.qualifying_status !== undefined
          ? edits.qualifying_status
          : (person.qualifying_status ?? null), // ✅ NEW
      interview_status_result:
        edits.interview_status_result !== undefined
          ? edits.interview_status_result
          : (person.interview_status_result ?? null), // ✅ NEW
      ...(includeStatus ? { status: selectedStatus } : {}),
      user_person_id: userID,
      audit_actor_id:
        employeeID ||
        localStorage.getItem("employee_id") ||
        localStorage.getItem("email") ||
        "unknown",
      audit_actor_role:
        localStorage.getItem("access_description") ||
        userRole ||
        localStorage.getItem("role") ||
        "registrar",
      audit_actor_email: localStorage.getItem("email") || "",
      ...getLoginMacPayload(),
    };
  };

  const auditPayload = (extra = {}) => ({
    ...extra,
    audit_actor_id:
      employeeID ||
      localStorage.getItem("employee_id") ||
      localStorage.getItem("email") ||
      "unknown",
    audit_actor_role:
      localStorage.getItem("access_description") ||
      userRole ||
      localStorage.getItem("role") ||
      "registrar",
    audit_actor_email: localStorage.getItem("email") || "",
    ...getLoginMacPayload(),
  });

  const saveSingleRow = async (person) => {
    try {
      setLoading(true);

      const payload = buildPayload(person);

      const res = await axios.post(
        `${API_BASE_URL}/api/interview/save`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (!res.data?.success) {
        throw new Error("Saving failed");
      }

      setSnack({
        open: true,
        message: "Score saved successfully!",
        severity: "success",
      });
    } catch (err) {
      console.error(err);

      setSnack({
        open: true,
        message: "Save failed: " + (err.response?.data?.error || err.message),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAllRows = async () => {
    try {
      setLoading(true);

      for (const person of persons) {
        const payload = buildPayload(person);
        const token = localStorage.getItem("token");

        await axios.post(`${API_BASE_URL}/api/interview/save`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      // Refresh table from DB for safety
      await fetchApplicants();

      setSnack({
        open: true,
        message: "All scores saved!",
        severity: "success",
      });
    } catch (err) {
      console.error(err);
      setSnack({
        open: true,
        message:
          "Save All failed: " + (err.response?.data?.error || err.message),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const [persons, setPersons] = useState([]);

  const [selectedPerson, setSelectedPerson] = useState(null);
  const [assignedNumber, setAssignedNumber] = useState("");
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [adminData, setAdminData] = useState({
    dprtmnt_id: "",
    dprtmnt_ids: [],
  });
  const [loading, setLoading] = useState(false);
  const [loading2, setLoading2] = useState(false);

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

  useEffect(() => {
    if (location.search.includes("person_id")) {
      navigate("/registrar_qualifying_interview_score", { replace: true });
      return;
    }
  }, [location.search, navigate]);

  const [hasAccess, setHasAccess] = useState(null);

  const pageId = 169;

  const [employeeID, setEmployeeID] = useState("");

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
      setLoading2(false);
    }
  };

  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [person, setPerson] = useState({
    campus: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    document_status: "",
    extension: "",
    strand: "",
    generalAverage1: "",
    program: "",
    created_at: "",
    middle_code: "",
    emailAddress: "",
  });
  const [allApplicants, setAllApplicants] = useState([]);

  const fetchApplicants = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/applicants-with-number`);

      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      const fetchedSubjects = Array.isArray(res.data?.subjects)
        ? res.data.subjects
        : [];

      const withAssignedFlag = data.map((p) => ({
        ...p,
        assigned: false,
        college_approval_status: Number(p.college_approval_status ?? 0),
        qualifying_exam_score: Number(p.qualifying_exam_score) || 0,
        qualifying_interview_score: Number(p.qualifying_interview_score) || 0,
        qualifying_status: p.qualifying_status ?? null, // ✅ NEW
        interview_status_result: p.interview_status_result ?? null, // ✅ NEW
      }));

      setPersons(withAssignedFlag);
      setSubjects(fetchedSubjects);
    } catch (err) {
      console.error("Error fetching applicants:", err);
      setPersons([]);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, [adminData.dprtmnt_id, adminData.dprtmnt_ids]);

  useEffect(() => {
    fetchApplicants();
  }, []);

  const fetchPersonData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin_data/${user}`);
      setAdminData(res.data);
      syncRegistrarScopeFromAdminData(res.data);
    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  };

  const [subjects, setSubjects] = useState([]);

  const fetchSubjects = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/subjects`);

      setSubjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPersonData();
    }
  }, [user]);

  const [curriculumOptions, setCurriculumOptions] = useState([]);
  const scopeRevision = useRegistrarScopeRevision();
  const [allCurriculums, setAllCurriculums] = useState([]);

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

  const [selectedApplicantStatus, setSelectedApplicantStatus] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  const [selectedRegistrarStatus, setSelectedRegistrarStatus] = useState("");

  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
  const [selectedProgramFilter, setSelectedProgramFilter] = useState("");
  const isProgramLocked = isRegistrarProgramSelectionLocked();
  const [department, setDepartment] = useState([]);
  const filteredDepartments = department.filter((dep) =>
    allCurriculums.some(
      (curriculum) =>
        String(curriculum.dprtmnt_id) === String(dep.dprtmnt_id) &&
        (!person.campus ||
          String(curriculum.components) === String(person.campus)),
    ),
  );
  const filteredCurriculumOptions = allCurriculums.filter(
    (curriculum) =>
      (!person.campus ||
        String(curriculum.components) === String(person.campus)) &&
      (!selectedDepartmentFilter ||
        String(curriculum.dprtmnt_id) === String(selectedDepartmentFilter)),
  );
  const [schoolYears, setSchoolYears] = useState([]);
  const [semesters, setSchoolSemester] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedSchoolSemester, setSelectedSchoolSemester] = useState("");
  const [selectedActiveSchoolYear, setSelectedActiveSchoolYear] = useState("");

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

  // helper to make string comparisons robust
  const normalize = (s) => (s ?? "").toString().trim().toLowerCase();
  const selectedSemester = semesters.find(
    (sem) => String(sem.semester_id) === String(selectedSchoolSemester),
  );
  const [showSubmittedOnly, setShowSubmittedOnly] = useState(false);
  const [topCount, setTopCount] = useState(100);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [exactRating, setExactRating] = useState("");
  const [editScores, setEditScores] = useState({});

  const [minTotal, setMinTotal] = useState("");
  const [minScorePercent, setMinScorePercent] = useState("");

  const filteredPersons = persons.filter((personData) => {
    /* 🔎 SEARCH */
    const query = searchQuery.toLowerCase();
    const fullName =
      `${personData.first_name ?? ""} ${personData.middle_name ?? ""} ${personData.last_name ?? ""}`.toLowerCase();

    const matchesApplicantID = personData.applicant_number
      ?.toString()
      .toLowerCase()
      .includes(query);

    const matchesName = fullName.includes(query);
    const matchesEmail = personData.emailAddress?.toLowerCase().includes(query);

    /* 🏫 CAMPUS */
    const matchesCampus = !person.campus || personData.campus === person.campus;

    /* 🎓 PROGRAM */
    const programInfo = allCurriculums.find(
      (opt) => opt.curriculum_id?.toString() === personData.program?.toString(),
    );
    const matchesRegistrarCurriculum = isRegistrarCurriculumMatch(
      personData.program,
    );

    const matchesProgramQuery = programInfo?.program_code
      ?.toLowerCase()
      .includes(query);

    const matchesDepartment =
      selectedDepartmentFilter === "" ||
      programInfo?.dprtmnt_name === selectedDepartmentFilter;

    const matchesProgramFilter =
      selectedProgramFilter === "" ||
      programInfo?.program_code === selectedProgramFilter;

    /* 📅 CREATED_AT */
    const appliedDate = new Date(personData.created_at.split("T")[0]);
    const applicantAppliedYear = appliedDate.getFullYear();

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

    /* 🧮 SCORE COMPUTATION (MUST COME BEFORE FILTERS) */
    const subjectScores = subjects.map((subject) =>
      Number(personData.scores?.[subject.id] ?? 0),
    );

    const total = subjectScores.reduce((sum, score) => sum + score, 0);

    const maxTotal = subjects.reduce(
      (sum, subject) => sum + Number(subject.max_score || 0),
      0,
    );

    const scorePercent = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

    const matchesTotal =
      minTotal === "" ||
      (total >= Number(minTotal) && total < Number(minTotal) + 1);

    const matchesScorePercent =
      minScorePercent === "" ||
      (scorePercent >= Number(minScorePercent) &&
        scorePercent < Number(minScorePercent) + 1);

    /* FINAL FILTER RESULT */
    return (
      (matchesApplicantID ||
        matchesName ||
        matchesEmail ||
        matchesProgramQuery) &&
      matchesDepartment &&
      matchesRegistrarCurriculum &&
      matchesProgramFilter &&
      matchesSchoolYear &&
      matchesSemester &&
      matchesCampus &&
      matchesTotal &&
      matchesScorePercent
    );
  });

  /* ⭐ SORTING (ALSO FIXED CREATED_AT) */
  const sortedPersons = React.useMemo(() => {
    return filteredPersons
      .slice()
      .sort((a, b) => {
        const aExam = Number(
          editScores[a.person_id]?.qualifying_exam_score ??
            a.qualifying_exam_score ??
            0,
        );
        const aInterview = Number(
          editScores[a.person_id]?.qualifying_interview_score ??
            a.qualifying_interview_score ??
            0,
        );
        const aTotal = (aExam + aInterview) / 2;

        const bExam = Number(
          editScores[b.person_id]?.qualifying_exam_score ??
            b.qualifying_exam_score ??
            0,
        );
        const bInterview = Number(
          editScores[b.person_id]?.qualifying_interview_score ??
            b.qualifying_interview_score ??
            0,
        );
        const bTotal = (bExam + bInterview) / 2;

        /* ⭐ SORT BY TOTAL SCORE FIRST */
        if (bTotal !== aTotal) return bTotal - aTotal;

        /* ⭐ THEN BY CREATED_AT USING MANILA SAFE PARSING */
        const dateA = new Date(a.created_at.split("T")[0]);
        const dateB = new Date(b.created_at.split("T")[0]);

        return dateA - dateB; // earliest first
      })
      .slice(0, topCount);
  }, [filteredPersons, editScores, topCount]);

  // ✅ 3. Pagination logic AFTER sortedPersons exists
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
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [sortedPersons.length, totalPages]);

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
    const departmentIds = getDepartmentIdsFromAdminData(adminData);
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

  const handleSnackClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    if (!isProgramLocked) return;
    const assignedCurriculum = curriculumOptions.find((prog) =>
      isRegistrarCurriculumMatch(prog.curriculum_id),
    );
    if (assignedCurriculum?.program_code) {
      setSelectedProgramFilter(assignedCurriculum.program_code);
    }
  }, [curriculumOptions, isProgramLocked]);

  const handleDepartmentChange = (selectedDept) => {
    setSelectedDepartmentFilter(selectedDept);
    if (!selectedDept) {
      setCurriculumOptions(allCurriculums);
    } else {
      setCurriculumOptions(
        allCurriculums.filter((opt) => opt.dprtmnt_name === selectedDept),
      );
    }
    if (!isProgramLocked) setSelectedProgramFilter("");
  };

  const [applicants, setApplicants] = useState([]);

  useEffect(() => {
    const personIdFromQuery = queryParams.get("person_id");

    // ✅ If specific applicant → fetch single
    if (personIdFromQuery) {
      axios
        .get(`${API_BASE_URL}/api/person_with_applicant/${personIdFromQuery}`)
        .then((res) => {
          const fixed = {
            ...res.data,
            qualifying_exam_score: res.data.qualifying_exam_score ?? 0,
            qualifying_interview_score:
              res.data.qualifying_interview_score ?? 0,
            final_rating: res.data.final_rating ?? 0,
            college_approval_status: Number(
              res.data.college_approval_status ?? 0,
            ),
            qualifying_status: res.data.qualifying_status ?? null,
            interview_status_result: res.data.interview_status_result ?? null,
          };

          setPersons([fixed]); // ✅ correct
        })
        .catch((err) => {
          console.error("❌ Error fetching single applicant:", err);
          setPersons([]);
        });
    } else {
      // ✅ USE YOUR EXISTING FUNCTION (IMPORTANT)
      fetchApplicants();
    }
  }, [queryPersonId]);

  const handleStatusChange = async (applicantId, newStatus) => {
    const nextStatus = Number(newStatus);
    try {
      const targetPerson = persons.find(
        (p) => p.applicant_number === applicantId,
      );

      if (isCollegeStatusLocked(targetPerson)) {
        setSnack({
          open: true,
          message:
            "Status can no longer be changed after interview_status is set.",
          severity: "warning",
        });
        return;
      }

      if (targetPerson?.person_id) {
        setEditScores((prev) => ({
          ...prev,
          [targetPerson.person_id]: {
            ...prev[targetPerson.person_id],
            status: nextStatus,
          },
        }));
      }

      // ✅ Optimistic update first so UI doesn't flicker
      setPersons((prev) =>
        prev.map((p) =>
          p.applicant_number === applicantId
            ? { ...p, college_approval_status: nextStatus }
            : p,
        ),
      );

      await axios.put(
        `${API_BASE_URL}/api/interview_applicants/${applicantId}/status`,
        {
          status: nextStatus,
          ...auditPayload(),
        },
      );

      setSnack({
        open: true,
        message: "Status updated successfully.",
        severity: "success",
      });

      // ✅ Re-fetch to sync with DB (will now return correct string labels)
      await fetchApplicants();
    } catch (err) {
      console.error("Error updating status:", err);

      const targetPerson = persons.find(
        (p) => p.applicant_number === applicantId,
      );
      if (targetPerson?.person_id) {
        setEditScores((prev) => {
          const next = { ...prev };
          const row = { ...(next[targetPerson.person_id] || {}) };
          delete row.status;

          if (Object.keys(row).length === 0) {
            delete next[targetPerson.person_id];
          } else {
            next[targetPerson.person_id] = row;
          }

          return next;
        });
      }

      // ✅ Revert optimistic update on failure
      await fetchApplicants();

      setSnack({
        open: true,
        message:
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to update status.",
        severity: "error",
      });
    }
  };

  const [file, setFile] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);

  const handleClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  // when file chosen
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    document.getElementById("excel-upload").value = "";
  };

  // when import button clicked
  const handleImport = async () => {
    try {
      if (!selectedFile) {
        setSnack({
          open: true,
          message: "Please choose a file first!",
          severity: "warning",
        });
        return;
      }

      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];

      let sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: "",
      });

      sheet = sheet
        .filter((row) => row["Applicant ID"])
        .map((row) => ({
          applicant_number: String(row["Applicant ID"] || "").trim(),

          qualifying_exam_score: Number(row["Qualifying Exam Score"]) || 0,

          qualifying_interview_score: Number(row["Interview Exam Score"]) || 0,

          qualifying_status: String(row["Qualifying Result"] || "").trim(),

          interview_status_result: String(row["Interview Result"] || "").trim(),

          status: String(row["College Status"] || "").trim(),
        }));

      if (sheet.length === 0) {
        setSnack({
          open: true,
          message: "Excel file had no valid rows!",
          severity: "warning",
        });
        return;
      }

      setLoading(true);

      const res = await axios.post(
        `${API_BASE_URL}/api/qualifying_exam/import`,
        { userID, data: sheet, ...auditPayload() },
        { headers: { "Content-Type": "application/json" } },
      );

      const errors = res.data.errors || [];

      // ✅ STEP 1: Patch state immediately from updatedRows (instant UI update)
      if (
        Array.isArray(res.data.updatedRows) &&
        res.data.updatedRows.length > 0
      ) {
        const patchMap = {};
        res.data.updatedRows.forEach((r) => {
          patchMap[r.applicant_number] = r;
        });

        setPersons((prev) =>
          prev.map((p) => {
            const patch = patchMap[p.applicant_number];
            if (!patch) return p;
            return {
              ...p,
              qualifying_exam_score: Number(patch.qualifying_result) || 0,
              qualifying_interview_score: Number(patch.interview_result) || 0,
              exam_result: Number(patch.exam_result) || 0,
              college_approval_status: Number(
                patch.college_approval_status ?? 0,
              ),
            };
          }),
        );
      }

      // ✅ STEP 2: Wait briefly for DB to fully commit, then re-fetch to sync
      await new Promise((resolve) => setTimeout(resolve, 500));
      await fetchApplicants(); // ✅ now awaited — guarantees fresh data replaces state

      setSelectedFile(null);

      if (res.data.success && errors.length === 0) {
        setSnack({
          open: true,
          message: "✅ All applicants imported successfully!",
          severity: "success",
        });
      } else if (errors.length > 0) {
        const failedApplicants = errors
          .map((e) => {
            const m = e.match(/Applicant (\S+)/);
            return m ? m[1] : null;
          })
          .filter(Boolean);
        setSnack({
          open: true,
          message: `⚠️ Some applicants skipped. Failed: ${failedApplicants.join(", ")}`,
          severity: "warning",
        });
      } else {
        setSnack({
          open: true,
          message: res.data.message || "Import failed",
          severity: "error",
        });
      }
    } catch (err) {
      console.error("❌ Import error:", err.response?.data || err.message);
      setSnack({
        open: true,
        message: "Import failed: " + (err.response?.data?.error || err.message),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const syncPendingScores = async () => {
      const pending = JSON.parse(
        localStorage.getItem("pendingQualifying") || "[]",
      );
      if (pending.length === 0) return;

      const stillPending = [];
      for (const p of pending) {
        try {
          await axios.post(`${API_BASE_URL}/api/interview`, p);
          console.log("✅ Synced pending qualifying:", p);
        } catch {
          stillPending.push(p); // keep if still failing
        }
      }
      localStorage.setItem("pendingQualifying", JSON.stringify(stillPending));
    };

    // run once + whenever internet comes back
    syncPendingScores();
    window.addEventListener("online", syncPendingScores);
    return () => window.removeEventListener("online", syncPendingScores);
  }, []);

  const debounceTimers = useRef({});
  const manualSaveRef = useRef({});

  const saveResultStatusChange = async (person, field, value) => {
    try {
      const payload = buildPayload(
        person,
        { [field]: value },
        { includeStatus: false },
      );

      const res = await axios.post(
        `${API_BASE_URL}/api/interview/save`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (!res.data?.success) {
        throw new Error("Saving failed");
      }

      setPersons((prev) =>
        prev.map((p) =>
          p.person_id === person.person_id ? { ...p, [field]: value } : p,
        ),
      );

      setSnack({
        open: true,
        message: "Result status updated successfully.",
        severity: "success",
      });
    } catch (err) {
      console.error("Error updating result status:", err);

      setEditScores((prev) => {
        const next = { ...prev };
        const row = { ...(next[person.person_id] || {}) };
        delete row[field];

        if (Object.keys(row).length === 0) {
          delete next[person.person_id];
        } else {
          next[person.person_id] = row;
        }

        return next;
      });

      await fetchApplicants();

      setSnack({
        open: true,
        message: "Failed to update result status.",
        severity: "error",
      });
    }
  };

  const handleScoreChange = (person, field, value) => {
    setEditScores((prev) => ({
      ...prev,
      [person.person_id]: {
        ...prev[person.person_id],
        [field]: value,
      },
    }));

    if (field === "qualifying_status" || field === "interview_status_result") {
      saveResultStatusChange(person, field, value);
    }
  };

  const [customCount, setCustomCount] = useState(0);
  const [selectedSchedule, setSelectedSchedule] = useState("");

  useEffect(() => {
    socket.current.on("schedule_updated", ({ schedule_id }) => {
      console.log("📢 Schedule updated:", schedule_id);

      fetchApplicants();
    });

    return () => socket.current.off("schedule_updated");
  }, []);

  const applyLocalCollegeStatus = (applicantNumber, status) => {
    applyLocalCollegeStatusForApplicants([applicantNumber], status);
  };

  const applyLocalCollegeStatusForApplicants = (applicantNumbers, status) => {
    const nextStatus = Number(status);
    const applicantNumberSet = new Set(
      applicantNumbers.map((applicantNumber) => String(applicantNumber)),
    );

    setPersons((prev) =>
      prev.map((p) =>
        applicantNumberSet.has(String(p.applicant_number))
          ? {
              ...p,
              assigned: nextStatus === COLLEGE_APPROVAL_STATUS.ACCEPTED,
              college_approval_status: nextStatus,
              applicant_interview_status:
                nextStatus === COLLEGE_APPROVAL_STATUS.WAITING_LIST
                  ? 0
                  : p.applicant_interview_status,
            }
          : p,
      ),
    );

    setEditScores((prev) => {
      const next = { ...prev };

      persons.forEach((p) => {
        if (!p.person_id || !applicantNumberSet.has(String(p.applicant_number)))
          return;
        next[p.person_id] = {
          ...next[p.person_id],
          status: nextStatus,
        };
      });

      return next;
    });
  };

  const getCurrentCollegeApprovalStatus = (personData) =>
    Number(
      editScores[personData.person_id]?.status ??
        personData.college_approval_status ??
        0,
    );

  const handleAssignSingle = (applicant_number) => {
    applyLocalCollegeStatus(applicant_number, COLLEGE_APPROVAL_STATUS.ACCEPTED);

    axios
      .put(
        `${API_BASE_URL}/api/interview_applicants/assign/${applicant_number}`,
        auditPayload({ assignment_mode: "single" }),
      )
      .then((res) => {
        console.log("Assign response:", res.data);

        setSnack({
          open: true,
          message: `Applicant ${applicant_number} assigned.`,
          severity: "success",
        });
      })
      .catch((err) => {
        console.error("Failed to assign applicant:", err);
        fetchApplicants();
        setSnack({
          open: true,
          message: "Failed to assign applicant.",
          severity: "error",
        });
      });
  };

  const handleAssignMax = () => {
    // ✅ Get only unassigned applicants in the selected department
    const unassigned = persons.filter((p) => {
      if (
        getCurrentCollegeApprovalStatus(p) === COLLEGE_APPROVAL_STATUS.ACCEPTED
      )
        return false;

      const programInfo = allCurriculums.find(
        (opt) => opt.curriculum_id?.toString() === p.program?.toString(),
      );

      // School year filter: compare applicant year with selectedSchoolYear
      const applicantAppliedYear = new Date(
        p.created_at.split("T")[0],
      ).getFullYear();
      const schoolYear = schoolYears.find(
        (sy) => sy.year_id === selectedSchoolYear,
      );

      const matchesDepartment =
        !selectedDepartmentFilter ||
        programInfo?.dprtmnt_name === selectedDepartmentFilter;

      const matchesProgram =
        !selectedProgramFilter ||
        programInfo?.program_code === selectedProgramFilter;

      const matchesSchoolYear =
        !selectedSchoolYear ||
        (schoolYear &&
          String(applicantAppliedYear) === String(schoolYear.current_year));

      const matchesSemester =
        !selectedSchoolSemester ||
        normalize(p.middle_code) === normalize(selectedSemester?.semester_code);

      return (
        matchesDepartment &&
        matchesProgram &&
        matchesSchoolYear &&
        matchesSemester
      );
    });

    if (unassigned.length === 0) {
      setSnack({
        open: true,
        message: "No applicants available to assign in this department.",
        severity: "warning",
      });
      return;
    }

    // Limit to 100 applicants
    const maxToAssign = Math.min(unassigned.length, 100);
    const toAssign = unassigned.slice(0, maxToAssign);

    const applicantNumbersToAssign = toAssign.map((a) => a.applicant_number);
    applyLocalCollegeStatusForApplicants(
      applicantNumbersToAssign,
      COLLEGE_APPROVAL_STATUS.ACCEPTED,
    );

    axios
      .put(`${API_BASE_URL}/api/interview_applicants/assign`, {
        applicant_numbers: applicantNumbersToAssign,
        ...auditPayload({
          assignment_mode: "max",
          selected_department: selectedDepartmentFilter,
        }),
      })
      .then((res) => {
        console.log("Updated statuses:", res.data);
        setSnack({
          open: true,
          message: `Assigned ${toAssign.length} applicant${toAssign.length > 1 ? "s" : ""} in ${selectedDepartmentFilter}.`,
          severity: "success",
        });
      })
      .catch((err) => {
        console.error("Failed to update applicant statuses:", err);
        fetchApplicants();
      });
  };

  const handleAssignCustom = (countParam) => {
    let count =
      typeof countParam === "number" && !isNaN(countParam)
        ? countParam
        : Number(customCount);

    if (isNaN(count) || count <= 0) {
      setSnack({
        open: true,
        message: "Please enter a valid number.",
        severity: "warning",
      });
      return;
    }

    // ✅ Get only unassigned applicants in the selected department
    const unassigned = persons.filter((p) => {
      if (
        getCurrentCollegeApprovalStatus(p) === COLLEGE_APPROVAL_STATUS.ACCEPTED
      )
        return false;

      const programInfo = allCurriculums.find(
        (opt) => opt.curriculum_id?.toString() === p.program?.toString(),
      );

      // School year filter: compare applicant year with selectedSchoolYear
      const applicantAppliedYear = new Date(
        p.created_at.split("T")[0],
      ).getFullYear();
      const schoolYear = schoolYears.find(
        (sy) => sy.year_id === selectedSchoolYear,
      );

      const matchesDepartment =
        !selectedDepartmentFilter ||
        programInfo?.dprtmnt_name === selectedDepartmentFilter;

      const matchesProgram =
        !selectedProgramFilter ||
        programInfo?.program_code === selectedProgramFilter;

      const matchesSchoolYear =
        !selectedSchoolYear ||
        (schoolYear &&
          String(applicantAppliedYear) === String(schoolYear.current_year));

      const matchesSemester =
        !selectedSchoolSemester ||
        normalize(p.middle_code) === normalize(selectedSemester?.semester_code);

      return (
        matchesDepartment &&
        matchesProgram &&
        matchesSchoolYear &&
        matchesSemester
      );
    });

    if (unassigned.length === 0) {
      setSnack({
        open: true,
        message: "No applicants available to assign in this department.",
        severity: "warning",
      });
      return;
    }

    // ✅ Sort applicants by total average score (highest first)
    const sortedUnassigned = [...unassigned].sort((a, b) => {
      const aExam =
        editScores[a.person_id]?.qualifying_exam_score ??
        a.qualifying_exam_score ??
        0;
      const aInterview =
        editScores[a.person_id]?.qualifying_interview_score ??
        a.qualifying_interview_score ??
        0;
      const aScore = (Number(aExam) + Number(aInterview)) / 2;

      const bExam =
        editScores[b.person_id]?.qualifying_exam_score ??
        b.qualifying_exam_score ??
        0;
      const bInterview =
        editScores[b.person_id]?.qualifying_interview_score ??
        b.qualifying_interview_score ??
        0;
      const bScore = (Number(bExam) + Number(bInterview)) / 2;

      return bScore - aScore; // higher scores first
    });

    // ✅ Take only up to the requested count
    const maxToAssign = Math.min(sortedUnassigned.length, count);
    const toAssign = sortedUnassigned.slice(0, maxToAssign);

    // ✅ Update persons list (mark assigned)
    const applicantNumbersToAssign = toAssign.map((a) => a.applicant_number);
    applyLocalCollegeStatusForApplicants(
      applicantNumbersToAssign,
      COLLEGE_APPROVAL_STATUS.ACCEPTED,
    );

    axios
      .put(`${API_BASE_URL}/api/interview_applicants/assign`, {
        applicant_numbers: applicantNumbersToAssign,
        ...auditPayload({
          assignment_mode: "custom",
          selected_department: selectedDepartmentFilter,
        }),
      })
      .then((res) => {
        console.log("Updated statuses:", res.data);
        setSnack({
          open: true,
          message: `Assigned ${toAssign.length} applicant${toAssign.length > 1 ? "s" : ""} in ${selectedDepartmentFilter}.`,
          severity: "success",
        });
      })
      .catch((err) => {
        console.error("Failed to update applicant statuses:", err);
        fetchApplicants();
      });
  };

  const handleUnassignImmediate = (applicant_number) => {
    applyLocalCollegeStatus(
      applicant_number,
      COLLEGE_APPROVAL_STATUS.WAITING_LIST,
    );

    axios
      .put(
        `${API_BASE_URL}/api/interview_applicants/unassign/${applicant_number}`,
        auditPayload({ assignment_mode: "single" }),
      )
      .then((res) => {
        setSnack({
          open: true,
          message: `Applicant ${applicant_number} unassigned.`,
          severity: "info",
        });
        console.log("Unassign response:", res.data);
      })
      .catch((err) => {
        console.error("Failed to unassign applicant:", err);
        fetchApplicants();
        setSnack({
          open: true,
          message: "Failed to unassign applicant.",
          severity: "error",
        });
      });
  };

  // handleUnassignAll
  const handleUnassignAll = () => {
    setPersons((prev) =>
      prev.map((p) => ({
        ...p,
        assigned: false,
        college_approval_status: COLLEGE_APPROVAL_STATUS.WAITING_LIST,
        applicant_interview_status: 0,
      })),
    );
    setEditScores((prev) => {
      const next = { ...prev };
      persons.forEach((p) => {
        if (!p.person_id) return;
        next[p.person_id] = {
          ...next[p.person_id],
          status: COLLEGE_APPROVAL_STATUS.WAITING_LIST,
        };
      });
      return next;
    });

    axios
      .put(`${API_BASE_URL}/api/interview_applicants/unassign-all`, {
        applicant_numbers: persons.map((a) => a.applicant_number),
        ...auditPayload({ assignment_mode: "all" }),
      })
      .then((res) => {
        console.log("Updated statuses:", res.data);
        setSnack({
          open: true,
          message: "All applicants unassigned. They can be assigned again.",
          severity: "info",
        });
      })
      .catch((err) => {
        console.error("Failed to update applicant statuses:", err);
        fetchApplicants();
      });
  };

  const [selectedApplicants, setSelectedApplicants] = useState(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [singleConfirmOpen, setSingleConfirmOpen] = useState(false);
  const [finalizeConfirmOpen, setFinalizeConfirmOpen] = useState(false);
  const [finalizeConfirmMode, setFinalizeConfirmMode] = useState("bulk");
  const [dprtmntName, setDepartmentName] = useState("");

  const resolveSenderForApplicant = async (applicant) => {
    const currentEmployeeId = employeeID || localStorage.getItem("employee_id");
    const programId = applicant?.program; // this is curriculum_id from admission.person_table

    // Try to find in allCurriculums (which has enrollment curriculum_ids like 8736)
    const curriculumMatch = allCurriculums.find(
      (c) => String(c.curriculum_id) === String(programId),
    );

    const departmentId =
      curriculumMatch?.dprtmnt_id ||
      getDepartmentIdsFromAdminData(adminData)[0] ||
      adminData.dprtmnt_id;

    console.log("🔍 resolveSender:", {
      applicant_program: programId,
      curriculumMatch: curriculumMatch || "NOT FOUND in allCurriculums",
      departmentId,
      currentEmployeeId,
    });

    if (!currentEmployeeId) {
      throw new Error("No employee ID found. Please log out and log in again.");
    }
    if (!programId) {
      throw new Error("Program ID missing for this applicant.");
    }

    const res = await axios.get(
      `${API_BASE_URL}/api/email-templates/active-senders`,
      {
        params: {
          department_id: departmentId,
          program_id: programId, // send the raw value — backend will resolve it
          employee_id: currentEmployeeId,
        },
      },
    );

    if (!Array.isArray(res.data) || res.data.length === 0) {
      throw new Error(
        `No active email account for employee ${currentEmployeeId}, program=${programId}, department=${departmentId}.`,
      );
    }

    return res.data[0].sender_name;
  };

  useEffect(() => {
    const departmentIds = getDepartmentIdsFromAdminData(adminData);
    const primaryDepartmentId = departmentIds[0];
    if (!primaryDepartmentId) return;

    const fetchDepartment = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/dprtmnt_curriculum/${primaryDepartmentId}`,
        );
        setDepartmentName(res.data[0]?.dprtmnt_name);
      } catch (err) {
        console.error("Error fetching active senders:", err);
      }
    };

    fetchDepartment();
  }, [adminData.dprtmnt_id, adminData.dprtmnt_ids]);

  const [emailMessage, setEmailMessage] = useState("");

  const [customReminders, setCustomReminders] = useState(
    `⚠️ Important Reminder:

1. Proceed to the Clinic for your Medical Examination.
   - Bring and present your Admission Form Process so they can verify if you're eligible to take the Medical Examination.

2. After completing your Medical Examination, proceed to the Registrar's Office to submit your Original Documents within 7 days.
   - Submissions are accepted only during working hours, Monday to Friday, from 8:00 AM to 5:00 PM.

3. Please note that failure to comply within 7 days may result in your slot being given to another applicant.

You have until May 11, 2026 to complete the admission process.`,
  );

  const [finalPreview, setFinalPreview] = useState("");

  useEffect(() => {
    if (!confirmOpen && !singleConfirmOpen) return;
    setFinalPreview(
      emailMessage + "\n\n" + customReminders + "\n\nThank you and good luck!",
    );
  }, [emailMessage, customReminders, confirmOpen, singleConfirmOpen]);

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

  const [selectedCopies, setSelectedCopies] = useState({});

  const handleSelect = (reqId, type = null) => {
    setSelectedCopies((prev) => {
      const updated = { ...prev };

      // ✅ Remove selection if null
      if (type === null) {
        delete updated[reqId];
      } else {
        updated[reqId] = type;
      }

      const applicant = persons.find(
        (p) => p.applicant_number === selectedApplicant,
      );

      const reqText = buildRequirementsText(applicant, requirements, updated);

      const newMessage = buildFullMessage(applicant, reqText);

      setEmailMessage(newMessage);

      return updated;
    });
  };

  const buildFullMessage = (applicant, reqText) => {
    return `Dear ${applicant?.last_name || ""}, ${applicant?.first_name || ""} ${applicant?.middle_name || ""}

Congratulations on passing the Interview/Qualifying Exam!

Please follow the steps below to complete your Admission process:

📄 REQUIRED DOCUMENTS:
${reqText}`.trim();
  };

  const buildRequirementsText = (
    applicant,
    list = requirements,
    copies = selectedCopies,
  ) => {
    const filtered = filterRequirementsForApplicant(applicant, list);

    if (!filtered || filtered.length === 0) {
      return "No requirements listed.";
    }

    const mainReqs = filtered.filter(
      (r) => !r.category?.toLowerCase().includes("medical"),
    );

    const medReqs = filtered.filter((r) =>
      r.category?.toLowerCase().includes("medical"),
    );

    let text = "";

    if (mainReqs.length > 0) {
      text += "Main Requirements:\n";

      mainReqs.forEach((req, i) => {
        const sel = copies[req.id];

        text += `${i + 1}. ${req.description}`;

        // optional label
        if (Number(req.is_optional) === 1) {
          text += " (Optional)";
        }

        if (sel === "original") {
          text += " (Original Copy)";
        }

        if (sel === "xerox") {
          text += " (Xerox Copy)";
        }

        text += "\n";
      });
    }

    if (medReqs.length > 0) {
      text += "\nMedical Requirements:\n";

      medReqs.forEach((req, i) => {
        const sel = copies[req.id];

        text += `${i + 1}. ${req.description}`;

        // optional label
        if (Number(req.is_optional) === 1) {
          text += " (Optional)";
        }

        if (sel === "original") {
          text += " (Original Copy)";
        }

        if (sel === "xerox") {
          text += " (Xerox Copy)";
        }

        text += "\n";
      });
    }

    return text.trim();
  };

  const handleOpenDialog = (applicant = null) => {
    const today = new Date();
    const validUntil = new Date(today);
    validUntil.setDate(today.getDate() + 7);

    const formattedValidUntil = validUntil.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const reqText = buildRequirementsText(applicant, requirements);

    // ✅ Use dynamic company name from settings
    const companyName = branding.companyName || "Student Information System";

    const defaultMessage = `
Dear ${applicant?.last_name || ""}, ${applicant?.first_name || ""} ${applicant?.middle_name || ""}

Congratulations on passing the Interview/Qualifying Exam!

Please follow the steps below to complete your Admission process:

📄 REQUIRED DOCUMENTS:
${reqText}

1. Proceed to the Clinic for your Medical Examination.  
   - Bring and present your Admission Form Process so they can verify if you're eligible to take the Medical Examination.

2. After completing your Medical Examination, proceed to the Registrar’s Office to submit your Original Documents within 7 days.  
   - Submissions are accepted only during working hours, Monday to Friday, from 8:00 AM to 5:00 PM.

3. Please note that failure to comply within 7 days may result in your slot being given to another applicant.

You have until ${formattedValidUntil} to complete the admission process.

Thank you, best regards
`.trim();

    setSelectedApplicant(applicant?.applicant_number || null);
    const message = buildFullMessage(applicant, reqText);
    setEmailMessage(message);
    setConfirmOpen(true);
  };

  const handleOpenDialogSingle = (applicant) => {
    const today = new Date();
    const validUntil = new Date(today);
    validUntil.setDate(today.getDate() + 7);

    const formattedValidUntil = validUntil.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const reqText = buildRequirementsText(applicant, requirements);

    // ✅ Use dynamic company name from settings
    const companyName = branding.companyName || "Student Information System";

    const defaultMessage = `
Dear ${applicant?.last_name || ""}, ${applicant?.first_name || ""} ${applicant?.middle_name || ""}

Congratulations on passing the Interview/Qualifying Exam!

Please follow the steps below to complete your Admission process:

📄 REQUIRED DOCUMENTS:
${reqText}

1. Proceed to the Clinic for your Medical Examination.  
   - Bring and present your Admission Form Process so they can verify if you're eligible to take the Medical Examination.

2. After completing your Medical Examination, proceed to the Registrar’s Office to submit your Original Documents within 7 days.  
   - Submissions are accepted only during working hours, Monday to Friday, from 8:00 AM to 5:00 PM.

3. Please note that failure to comply within 7 days may result in your slot being given to another applicant.

You have until ${formattedValidUntil} to complete the admission process.

Thank you, best regards
`.trim();

    setSelectedApplicant(applicant?.applicant_number || null);
    const message = buildFullMessage(applicant, reqText);
    setEmailMessage(message);
    setSingleConfirmOpen(true);
  };

  const getEmailTargets = (mode = finalizeConfirmMode) => {
    if (mode === "single") {
      return selectedApplicant
        ? persons.filter((p) => p.applicant_number === selectedApplicant)
        : [];
    }

    return selectedApplicant
      ? persons.filter((p) => p.applicant_number === selectedApplicant)
      : persons.filter(
          (p) =>
            Number(p.college_approval_status) ===
              COLLEGE_APPROVAL_STATUS.ACCEPTED &&
            Number(p.applicant_interview_status) !== 1,
        );
  };

  const getApplicantDisplayName = (applicant) =>
    [
      applicant?.last_name,
      [applicant?.first_name, applicant?.middle_name].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ") ||
    applicant?.applicant_number ||
    "this applicant";

  const openFinalizeConfirmation = (mode) => {
    const targets = getEmailTargets(mode);

    if (targets.length === 0) {
      setSnack({
        open: true,
        message:
          mode === "single"
            ? "Please select one applicant first."
            : "No applicants to send email to.",
        severity: "warning",
      });
      return;
    }

    setFinalizeConfirmMode(mode);
    setFinalizeConfirmOpen(true);
  };

  const handleFinalizeConfirmed = () => {
    setFinalizeConfirmOpen(false);
    if (finalizeConfirmMode === "single") {
      confirmSendEmailSingle();
      return;
    }
    confirmSendEmails();
  };

  const confirmSendEmailSingle = async () => {
    setLoading2(true);
    const targets = selectedApplicant
      ? persons.filter((p) => p.applicant_number === selectedApplicant)
      : [];

    if (targets.length === 0) {
      setLoading2(false);
      setSnack({
        open: true,
        message: "Please select one applicant first.",
        severity: "warning",
      });
      return;
    }

    const loggedInPersonId = localStorage.getItem("person_id");

    let successCount = 0;
    const successfulApplicantNumbers = new Set();

    for (const applicant of targets) {
      const recipientEmail =
        applicant.email || applicant.email_address || applicant.emailAddress;

      if (!recipientEmail) {
        console.warn(
          `⚠️ Applicant ${applicant.applicant_number} has no email field`,
        );
        continue;
      }

      try {
        // ✅ Resolve department_id and program_id
        const programId = applicant?.program;
        const curriculumMatch = allCurriculums.find(
          (curriculum) =>
            String(curriculum.curriculum_id) === String(programId),
        );
        const departmentId =
          curriculumMatch?.dprtmnt_id ||
          getDepartmentIdsFromAdminData(adminData)[0] ||
          adminData.dprtmnt_id;

        const resolvedSender = await resolveSenderForApplicant(applicant);

        await axios.post(`${API_BASE_URL}/api/send-email`, {
          to: recipientEmail,
          subject: emailSubject,
          html: finalPreview.replace(/\n/g, "<br/>"),
          senderName: resolvedSender,
          user_person_id: loggedInPersonId,
          applicant_number: applicant.applicant_number,
          update_interview_status: true,
          interview_status_value: 1,
          department_id: departmentId, // ✅ ADDED
          program_id: programId, // ✅ ADDED
          applicant_name: [
            applicant.first_name,
            applicant.middle_name,
            applicant.last_name,
          ]
            .filter(Boolean)
            .join(" "),
          ...auditPayload(),
        });

        successCount++;
        successfulApplicantNumbers.add(applicant.applicant_number);
      } catch (err) {
        console.error(`❌ Failed for ${applicant.applicant_number}`, err);
      }

      await new Promise((res) => setTimeout(res, 200));
    }

    setPersons((prev) =>
      prev.map((p) =>
        successfulApplicantNumbers.has(p.applicant_number)
          ? { ...p, applicant_interview_status: 1 }
          : p,
      ),
    );

    setSnack({
      open: true,
      message: `Emails sent to ${successCount} out of ${targets.length} applicants`,
      severity: successCount === targets.length ? "success" : "warning",
    });

    setSingleConfirmOpen(false);
    setSelectedApplicant(null);
    setLoading2(false);
  };

  const confirmSendEmails = async () => {
    setLoading2(true);
    const targets = selectedApplicant
      ? persons.filter((p) => p.applicant_number === selectedApplicant)
      : persons.filter(
          (p) =>
            Number(p.college_approval_status) ===
              COLLEGE_APPROVAL_STATUS.ACCEPTED &&
            Number(p.applicant_interview_status) !== 1,
        );

    if (targets.length === 0) {
      setLoading2(false);
      setSnack({
        open: true,
        message: "No applicants to send email to.",
        severity: "warning",
      });
      return;
    }

    let successCount = 0;
    const successfulApplicantNumbers = new Set();

    for (const applicant of targets) {
      const recipientEmail =
        applicant.email || applicant.email_address || applicant.emailAddress;

      if (!recipientEmail) {
        console.warn(
          `⚠️ Applicant ${applicant.applicant_number} has no email field`,
        );
        continue;
      }

      try {
        // ✅ Resolve department_id and program_id per applicant
        const programId = applicant?.program;
        const curriculumMatch = allCurriculums.find(
          (curriculum) =>
            String(curriculum.curriculum_id) === String(programId),
        );
        const departmentId =
          curriculumMatch?.dprtmnt_id ||
          getDepartmentIdsFromAdminData(adminData)[0] ||
          adminData.dprtmnt_id;

        const resolvedSender = await resolveSenderForApplicant(applicant);

        await axios.post(`${API_BASE_URL}/api/send-email`, {
          to: recipientEmail,
          subject: emailSubject,
          html: finalPreview.replace(/\n/g, "<br/>"),
          senderName: resolvedSender,
          user_person_id: userID,
          applicant_number: applicant.applicant_number,
          update_interview_status: true,
          interview_status_value: 1,
          department_id: departmentId, // ✅ ADDED
          program_id: programId, // ✅ ADDED
          applicant_name: [
            applicant.first_name,
            applicant.middle_name,
            applicant.last_name,
          ]
            .filter(Boolean)
            .join(" "),
          ...auditPayload(),
        });

        successCount++;
        successfulApplicantNumbers.add(applicant.applicant_number);
      } catch (err) {
        console.error(`❌ Failed for ${applicant.applicant_number}`, err);
      }

      await new Promise((res) => setTimeout(res, 200));
    }

    setPersons((prev) =>
      prev.map((p) =>
        successfulApplicantNumbers.has(p.applicant_number)
          ? { ...p, applicant_interview_status: 1 }
          : p,
      ),
    );

    setSnack({
      open: true,
      message: `Emails sent to ${successCount} out of ${targets.length} applicants`,
      severity: successCount === targets.length ? "success" : "warning",
    });

    setConfirmOpen(false);
    setSelectedApplicant(null);
    setLoading2(false);
  };

  // Email fields - start empty
  const [emailSubject, setEmailSubject] = useState(
    "Submission of Original Documents",
  );

  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/interview_schedules_with_count`,
        );
        setSchedules(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching schedules:", err);
      }
    };

    fetchSchedules();
  }, []);

  const [selectedApplicant, setSelectedApplicant] = useState(null);

  const [acceptCount, setAcceptCount] = useState(10);
  const handleAcceptTop = async () => {
    try {
      if (!acceptCount || acceptCount <= 0) {
        return setSnack({
          open: true,
          message: "Please enter a valid number of applicants to accept.",
          severity: "error",
        });
      }

      const unassigned = persons.filter((p) => {
        if (
          getCurrentCollegeApprovalStatus(p) ===
          COLLEGE_APPROVAL_STATUS.ACCEPTED
        )
          return false;

        const programInfo = allCurriculums.find(
          (opt) => opt.curriculum_id?.toString() === p.program?.toString(),
        );

        // School year filter: compare applicant year with selectedSchoolYear
        const applicantAppliedYear = new Date(
          p.created_at.split("T")[0],
        ).getFullYear();
        const schoolYear = schoolYears.find(
          (sy) => sy.year_id === selectedSchoolYear,
        );

        const matchesDepartment =
          !selectedDepartmentFilter ||
          programInfo?.dprtmnt_name === selectedDepartmentFilter;

        const matchesProgram =
          !selectedProgramFilter ||
          programInfo?.program_code === selectedProgramFilter;

        const matchesSchoolYear =
          !selectedSchoolYear ||
          (schoolYear &&
            String(applicantAppliedYear) === String(schoolYear.current_year));

        const matchesSemester =
          !selectedSchoolSemester ||
          normalize(p.middle_code) ===
            normalize(selectedSemester?.semester_code);

        return (
          matchesDepartment &&
          matchesProgram &&
          matchesSchoolYear &&
          matchesSemester
        );
      });

      if (unassigned.length === 0) {
        setSnack({
          open: true,
          message: "No applicants available to assign in this department.",
          severity: "warning",
        });
        return;
      }

      const sortedUnassigned = [...unassigned].sort((a, b) => {
        const aExam =
          editScores[a.person_id]?.qualifying_exam_score ??
          a.qualifying_exam_score ??
          0;
        const aInterview =
          editScores[a.person_id]?.qualifying_interview_score ??
          a.qualifying_interview_score ??
          0;
        const aScore = (Number(aExam) + Number(aInterview)) / 2;

        const bExam =
          editScores[b.person_id]?.qualifying_exam_score ??
          b.qualifying_exam_score ??
          0;
        const bInterview =
          editScores[b.person_id]?.qualifying_interview_score ??
          b.qualifying_interview_score ??
          0;
        const bScore = (Number(bExam) + Number(bInterview)) / 2;

        return bScore - aScore; // higher scores first
      });

      // ✅ Take only up to the requested count
      const maxToAssign = Math.min(sortedUnassigned.length, acceptCount);
      const toAssign = sortedUnassigned.slice(0, maxToAssign);

      const applicantNumbersToAssign = toAssign.map((a) => a.applicant_number);
      applyLocalCollegeStatusForApplicants(
        applicantNumbersToAssign,
        COLLEGE_APPROVAL_STATUS.ACCEPTED,
      );

      axios
        .put(`${API_BASE_URL}/api/interview_applicants/assign`, {
          applicant_numbers: applicantNumbersToAssign,
          ...auditPayload({
            assignment_mode: "top",
            selected_department: selectedDepartmentFilter,
          }),
        })
        .then((res) => {
          console.log("Updated statuses:", res.data);
          setSnack({
            open: true,
            message: `Top ${acceptCount} applicants in ${selectedDepartmentFilter} are now accepted.`,
            severity: "success",
          });
        })
        .catch((err) => {
          console.error("Failed to update applicant statuses:", err);
          fetchApplicants();
        });
    } catch (err) {
      console.error("Error accepting top applicants:", err);
      setSnack({
        open: true,
        message: err.response?.data?.message || "Failed to accept applicants.",
        severity: "error",
      });
    }
  };

  // Put this at the very bottom before the return
  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }

  // 🔒 Disable right-click
  // document.addEventListener("contextmenu", (e) => e.preventDefault());

  // // 🔒 Block DevTools shortcuts + Ctrl+P silently
  // document.addEventListener("keydown", (e) => {
  //   const isBlockedKey =
  //     e.key === "F12" ||
  //     e.key === "F11" ||
  //     (e.ctrlKey &&
  //       e.shiftKey &&
  //       (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j")) ||
  //     (e.ctrlKey && e.key.toLowerCase() === "u") ||
  //     (e.ctrlKey && e.key.toLowerCase() === "p");

  //   if (isBlockedKey) {
  //     e.preventDefault();
  //     e.stopPropagation();
  //   }
  // });

  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }

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
          sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}
        >
          QUALIFYING / INTERVIEW EXAMINATION SCORE
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
              "& .MuiOutlinedInput-root": { borderRadius: "10px" },
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
                  const applicantNumber = cleanApplicantValue(applicant?.applicant_number);
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
                        "&:hover": { backgroundColor: "#f5f7fb" },
                      }}
                    >
                      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                        {applicantNumber || "N/A"}
                      </Typography>
                      <Typography sx={{ fontSize: 14, color: "#555" }}>|</Typography>
                      <Typography sx={{ fontSize: 14 }} noWrap>
                        {name || cleanApplicantValue(applicant?.emailAddress) || "Unnamed Applicant"}
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

      <RegistrarApplicantProcessTabs />

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
                Qualifying / Interview Examination Score
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}`, p: 2 }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          flexWrap="wrap"
          rowGap={2}
        >
          <Box display="flex" flexDirection="column" gap={2}>
            <Box display="flex" alignItems="flex-end" gap={2}>
              <FormControl size="small" sx={{ width: 200 }}>
                <InputLabel shrink htmlFor="from-date">
                  From Date
                </InputLabel>
                <DateField
                  id="from-date"
                  size="small"
                  name="fromDate"
                  value={person.fromDate || ""}
                  onChange={(e) =>
                    setPerson((prev) => ({ ...prev, fromDate: e.target.value }))
                  }
                />
              </FormControl>
            </Box>

            <Box display="flex" alignItems="flex-end" gap={2}>
              <FormControl size="small" sx={{ width: 200 }}>
                <InputLabel shrink htmlFor="to-date">
                  To Date
                </InputLabel>
                <DateField
                  id="to-date"
                  size="small"
                  name="toDate"
                  value={person.toDate || ""}
                  onChange={(e) =>
                    setPerson((prev) => ({ ...prev, toDate: e.target.value }))
                  }
                />
              </FormControl>
            </Box>
          </Box>

          <Box display="flex" alignItems="flex-end" gap={2}>
            <Box display="flex" flexDirection="column" gap={1}>
              <Typography fontSize={13}>Campus:</Typography>
              <FormControl size="small" sx={{ width: "200px" }}>
                <InputLabel id="campus-label">Campus</InputLabel>
                <Select
                  labelId="campus-label"
                  id="campus-select"
                  name="campus"
                  value={person.campus ?? ""}
                  onChange={(e) => {
                    setPerson((prev) => ({ ...prev, campus: e.target.value }));
                    setCurrentPage(1);
                  }}
                >
                  <MenuItem value="">
                    <em>All Campuses</em>
                  </MenuItem>
                  {branches.map((branch) => (
                    <MenuItem key={branch.id} value={branch.id}>
                      {branch.branch}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Box>
      </TableContainer>

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: "#6D2323", color: "white" }}>
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
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Applicants: {filteredPersons.length}
                  </Typography>

                  <Box display="flex" alignItems="center" gap={1}>
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
                          "& svg": { color: "white" },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: { maxHeight: 200, backgroundColor: "#fff" },
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
        sx={{ width: "100%", border: `1px solid ${borderColor}`, p: 2 }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          flexWrap="wrap"
          rowGap={3}
          columnGap={5}
        >
          <Box display="flex" flexDirection="column" gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "10px" }}>
                Sort By:
              </Typography>
              <FormControl size="small" sx={{ width: "200px" }}>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">Select Field</MenuItem>
                  <MenuItem value="name">Applicant's Name</MenuItem>
                  <MenuItem value="id">Applicant ID</MenuItem>
                  <MenuItem value="email">Email Address</MenuItem>
                </Select>
              </FormControl>
              <Typography fontSize={13} sx={{ minWidth: "10px" }}>
                Sort Order:
              </Typography>
              <FormControl size="small" sx={{ width: "200px" }}>
                <Select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">Select Order</MenuItem>
                  <MenuItem value="asc">Ascending</MenuItem>
                  <MenuItem value="desc">Descending</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <Typography
                fontSize={13}
                sx={{ minWidth: "80px", textAlign: "right" }}
              >
                Top Highest:
              </Typography>
              <FormControl size="small" sx={{ width: 120 }}>
                <Select
                  value={topCount}
                  onChange={(e) => {
                    setTopCount(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <MenuItem value={10}>Top 10</MenuItem>
                  <MenuItem value={25}>Top 25</MenuItem>
                  <MenuItem value={50}>Top 50</MenuItem>
                  <MenuItem value={100}>Top 100</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Box display="flex" flexDirection="column" gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "100px" }}>
                School Year:
              </Typography>
              <FormControl size="small" sx={{ width: "200px" }}>
                <InputLabel id="school-year-label">School Years</InputLabel>
                <Select
                  labelId="school-year-label"
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

            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "100px" }}>
                Semester:
              </Typography>
              <FormControl size="small" sx={{ width: "200px" }}>
                <InputLabel id="semester-label">School Semester</InputLabel>
                <Select
                  labelId="semester-label"
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

          <Box display="flex" flexDirection="column" gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "100px" }}>
                Department:
              </Typography>
              <FormControl size="small" sx={{ width: "400px" }}>
                <Select
                  value={selectedDepartmentFilter}
                  onChange={(e) => {
                    const selectedDept = e.target.value;
                    setSelectedDepartmentFilter(selectedDept);
                    handleDepartmentChange(selectedDept);
                  }}
                  displayEmpty
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {department.map((dep) => (
                    <MenuItem key={dep.dprtmnt_id} value={dep.dprtmnt_name}>
                      {dep.dprtmnt_name} ({dep.dprtmnt_code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "100px" }}>
                Program:
              </Typography>
              <FormControl size="small" sx={{ width: "350px" }}>
                <Select
                  value={selectedProgramFilter}
                  onChange={(e) => {
                    setSelectedProgramFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  disabled={isProgramLocked}
                  displayEmpty
                >
                  {!isProgramLocked && (
                    <MenuItem value="">All Programs</MenuItem>
                  )}
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
          </Box>
        </Box>

        <Typography
          textAlign="left"
          color="maroon"
          sx={{ mb: 1, mt: 3, fontWeight: "bold" }}
        >
          Entrance Exam Total Score:
        </Typography>
        <Box display="flex" gap={2} mt={2} flexWrap="wrap">
          <Typography fontSize={13} sx={{ minWidth: "70px" }}>
            Total:
          </Typography>
          <TextField
            label="Total"
            size="small"
            type="number"
            value={minTotal}
            onChange={(e) => setMinTotal(e.target.value)}
          />
          <Typography fontSize={13} sx={{ minWidth: "70px" }}>
            Score:
          </Typography>
          <TextField
            label="Score %"
            size="small"
            type="number"
            value={minScorePercent}
            onChange={(e) => setMinScorePercent(e.target.value)}
          />
        </Box>
      </TableContainer>

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead
            sx={{ backgroundColor: headerColor }}
          >
            <TableRow>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "2%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                #
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "8%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Applicant ID
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "22%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Name
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "15%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Program
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "8%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                SHS GWA
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "8%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Qualifying Exam Score
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "8%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Qualifying Result
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "8%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Interview Exam Score
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "8%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Interview Result
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "8%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Total Ave.
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "8%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                College Status
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "8%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Date
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentPersons.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={12}
                  sx={{
                    textAlign: "center",
                    py: 3,
                    fontStyle: "italic",
                    color: "gray",
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  No Applicants available.
                </TableCell>
              </TableRow>
            ) : (
              currentPersons.map((p, index) => {
                const qualifyingExam = p.qualifying_exam_score ?? 0;
                const qualifyingInterview = p.qualifying_interview_score ?? 0;
                const computedTotalAve =
                  (Number(qualifyingExam) + Number(qualifyingInterview)) / 2;

                const qualifyingStatusLabel =
                  p.qualifying_status === 0
                    ? "Passed"
                    : p.qualifying_status === 1
                      ? "Failed"
                      : "—";
                const interviewStatusLabel =
                  p.interview_status_result === 0
                    ? "Passed"
                    : p.interview_status_result === 1
                      ? "Failed"
                      : "—";

                const collegeStatusLabel =
                  Number(p.college_approval_status) === 1
                    ? "Accepted"
                    : Number(p.college_approval_status) === 2
                      ? "Rejected"
                      : "Waiting List";

                return (
                  <TableRow
                    key={p.person_id}
                    sx={{
                      backgroundColor:
                        index % 2 === 0 ? "#ffffff" : "lightgray",
                    }}
                  >
                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontSize: "12px",
                      }}
                    >
                      {index + 1}
                    </TableCell>

                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontSize: "12px",
                        color: "blue",
                        cursor: "pointer",
                      }}
                      onClick={() => handleRowClick(p)}
                    >
                      {p.applicant_number ?? "N/A"}
                    </TableCell>

                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontSize: "12px",
                        color: "blue",
                        cursor: "pointer",
                      }}
                      onClick={() => handleRowClick(p)}
                    >
                      {`${p.last_name}, ${p.first_name} ${p.middle_name ?? ""} ${p.extension ?? ""}`}
                    </TableCell>

                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontSize: "12px",
                      }}
                    >
                      {allCurriculums.find(
                        (item) =>
                          item.curriculum_id?.toString() ===
                          p.program?.toString(),
                      )?.program_code ?? "N/A"}
                    </TableCell>

                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontSize: "12px",
                      }}
                    >
                      {p.generalAverage1 || "0"}
                    </TableCell>

                    {/* READ-ONLY score / status display */}
                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontSize: "13px",
                      }}
                    >
                      {qualifyingExam}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontSize: "13px",
                      }}
                    >
                      {qualifyingStatusLabel}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontSize: "13px",
                      }}
                    >
                      {qualifyingInterview}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontSize: "13px",
                      }}
                    >
                      {interviewStatusLabel}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontSize: "13px",
                      }}
                    >
                      {computedTotalAve.toFixed(2)}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontSize: "13px",
                        fontWeight: "bold",
                      }}
                    >
                      {collegeStatusLabel}
                    </TableCell>

                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontSize: "12px",
                      }}
                    >
                      {(() => {
                        if (!p.created_at?.split("T")[0]) return "";
                        const date = new Date(p.created_at.split("T")[0]);
                        if (isNaN(date)) return p.created_at.split("T")[0];
                        return date.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        });
                      })()}
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
          <TableHead sx={{ backgroundColor: "#6D2323", color: "white" }}>
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
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Applicants: {filteredPersons.length}
                  </Typography>

                  <Box display="flex" alignItems="center" gap={1}>
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
                          "& svg": { color: "white" },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: { maxHeight: 200, backgroundColor: "#fff" },
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
        onClose={handleSnackClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackClose}
          severity={snack.severity}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RegistrarQualifyingInterviewExamScore;
