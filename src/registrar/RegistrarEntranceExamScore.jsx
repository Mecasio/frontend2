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
import { Snackbar, Alert } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { FcPrint } from "react-icons/fc";
import EaristLogo from "../assets/EaristLogo.png";
import { Link } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import PeopleIcon from "@mui/icons-material/People";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import _ from "lodash";
import {
  isRegistrarCurriculumMatch,
  isRegistrarProgramSelectionLocked,
  restrictToRegistrarCurriculum,
  syncRegistrarScopeFromAdminData,
  getDepartmentIdsFromAdminData,
} from "../utils/registrarCurriculumRestriction";
import useRegistrarScopeRevision from "../hooks/useRegistrarScopeRevision";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import SearchIcon from "@mui/icons-material/Search";
import KeyIcon from "@mui/icons-material/Key";
import API_BASE_URL from "../apiConfig";
import CampaignIcon from "@mui/icons-material/Campaign";
import DateField from "../components/DateField";
import { getLoginMacPayload } from "../utils/userMacAddress";
import useAuditMac from "../utils/useAuditMac";
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

const RegistrarEntranceExamScore = () => {
  useAuditMac();
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

    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    setBranches(settings?.branches || []);
  }, [settings]);

  const words = companyName.trim().split(" ");
  const middle = Math.ceil(words.length / 2);
  const firstLine = words.slice(0, middle).join(" ");
  const secondLine = words.slice(middle).join(" ");

  const location = useLocation();

  const handleRowClick = (applicant) => {
    const personId = applicant?.person_id;
    if (!personId) return;

    const searchValue =
      applicant?.applicant_number ||
      `${applicant?.last_name ?? ""}, ${applicant?.first_name ?? ""}`.trim();

    sessionStorage.setItem("admin_edit_person_id", String(personId));
    sessionStorage.setItem("edit_person_id", String(personId));
    sessionStorage.setItem(
      "admin_edit_person_id_source",
      "applicant_list_registrar",
    );
    sessionStorage.setItem("admin_edit_person_id_ts", String(Date.now()));
    sessionStorage.setItem("admin_edit_person_data", JSON.stringify(applicant));

    if (searchValue) {
      sessionStorage.setItem("admin_edit_search_query", String(searchValue));
      sessionStorage.setItem("edit_applicant_number", String(searchValue));
    }

    navigate(`/applicant_registrar_personal_information?person_id=${personId}`);
  };

  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const pageId = 168;

  const [employeeID, setEmployeeID] = useState("");

  const auditActor = () => ({
    audit_actor_id:
      employeeID ||
      localStorage.getItem("employee_id") ||
      localStorage.getItem("email") ||
      "unknown",
    audit_actor_role: userRole || localStorage.getItem("role") || "registrar",
    ...getLoginMacPayload(),
  });

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
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  useEffect(() => {
    if (location.search.includes("person_id")) {
      navigate("/registrar_entrance_examination_score", { replace: true });
    }
  }, [location, navigate]);

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
  const scopeRevision = useRegistrarScopeRevision();

  const fetchPersonData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin_data/${user}`);
      setAdminData(res.data);
      syncRegistrarScopeFromAdminData(res.data);
    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  };

  useEffect(() => {
    if (user) fetchPersonData();
  }, [user]);

  const queryParams = new URLSearchParams(location.search);
  const queryPersonId = queryParams.get("person_id")?.trim() || "";

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

  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [searchError, setSearchError] = useState("");
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
    generalAverage1: "",
    program: "",
    created_at: "",
    middle_code: "",
  });

  useEffect(() => {
    if (!settings) return;

    const branchId = person?.campus;
    const matchedBranch = branches.find(
      (branch) => String(branch?.id) === String(branchId),
    );

    if (matchedBranch?.address) {
      setCampusAddress(matchedBranch.address);
      return;
    }

    if (branding.campusAddress) {
      setCampusAddress(branding.campusAddress);
      return;
    }

    setCampusAddress(branding.campusAddress || "");
  }, [settings, branches, person?.campus, branding.campusAddress]);
  const [allApplicants, setAllApplicants] = useState([]);

  // ⬇️ Add this inside ApplicantList component, before useEffect
  const fetchApplicants = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/api-applicant-scoring`);

      // ✅ NEW: extract properly
      const { data, subjects } = res.data;

      // ✅ set subjects (IMPORTANT for your scoring logic)
      setSubjects(subjects);

      // ✅ Remove duplicates based on applicant_number
      const uniqueData = Object.values(
        data.reduce((acc, curr) => {
          acc[curr.applicant_number] = curr;
          return acc;
        }, {}),
      );

      setPersons(uniqueData);
    } catch (err) {
      console.error("❌ Error fetching applicants with scores:", err);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

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
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim() === "") return; // Don't search empty

      try {
        const res = await axios.get(`${API_BASE_URL}/api/search-person`, {
          params: { query: searchQuery },
        });

        if (res.data && res.data.person_id) {
          const details = await axios.get(
            `${API_BASE_URL}/api/person_with_applicant/${res.data.person_id}`,
          );
          setPerson(details.data);

          sessionStorage.setItem(
            "admin_edit_person_id",
            details.data.person_id,
          );
          setUserID(details.data.person_id);
          setSearchError("");
        } else {
          console.error("No valid person ID found in search result");
          setSearchError("Invalid search result");
        }
      } catch (err) {
        console.error("Search failed:", err);
        setSearchError("Applicant not found");
      }
    }, 500); // debounce

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const [curriculumOptions, setCurriculumOptions] = useState([]);
  const [allCurriculums, setAllCurriculums] = useState([]);

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

  useEffect(() => {
    const departmentIds =
      Array.isArray(adminData.dprtmnt_ids) && adminData.dprtmnt_ids.length
        ? adminData.dprtmnt_ids
        : adminData.dprtmnt_id
          ? [adminData.dprtmnt_id]
          : [];

    if (departmentIds.length) return;

    axios.get(`${API_BASE_URL}/api/applied_program`).then((res) => {
      const restrictedCurriculums = restrictToRegistrarCurriculum(res.data);
      setAllCurriculums(restrictedCurriculums);
      setCurriculumOptions(restrictedCurriculums);
    });
  }, [adminData.dprtmnt_id, adminData.dprtmnt_ids, scopeRevision]);

  const [selectedApplicantStatus, setSelectedApplicantStatus] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  const [selectedRegistrarStatus, setSelectedRegistrarStatus] = useState("");

  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
  const [selectedProgramFilter, setSelectedProgramFilter] = useState("");
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
  const parseDateOnlyLocal = (value) => {
    if (!value) return null;
    const datePart = String(value).split("T")[0];
    const [y, m, d] = datePart.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };
  const [showSubmittedOnly, setShowSubmittedOnly] = useState(false);

  const [minTotal, setMinTotal] = useState("");
  const [minScorePercent, setMinScorePercent] = useState("");
  const [minFinalRating, setMinFinalRating] = useState("");

  const filteredPersons = persons
    .filter((personData) => {
      /* 🔎 SEARCH */
      const fullText =
        `${personData.first_name} ${personData.middle_name} ${personData.last_name} ${personData.emailAddress ?? ""} ${personData.applicant_number ?? ""}`.toLowerCase();
      const matchesSearch = fullText.includes(searchQuery.toLowerCase());

      /* 🏫 CAMPUS */
      const matchesCampus =
        !person.campus || String(personData.campus) === String(person.campus);

      /* 📄 DOCUMENT STATUS */
      const matchesApplicantStatus =
        selectedApplicantStatus === "" ||
        normalize(personData.document_status) ===
          normalize(selectedApplicantStatus);

      /* 📝 REGISTRAR STATUS */
      const matchesRegistrarStatus =
        selectedRegistrarStatus === "" ||
        (selectedRegistrarStatus === "Submitted" &&
          personData.registrar_status === 1) ||
        (selectedRegistrarStatus === "Unsubmitted / Incomplete" &&
          personData.registrar_status === 0);

      /* 🎓 PROGRAM / DEPARTMENT */
      const programInfo = allCurriculums.find(
        (opt) =>
          opt.curriculum_id?.toString() === personData.program?.toString(),
      );
      const matchesRegistrarCurriculum = isRegistrarCurriculumMatch(
        personData.program,
        allCurriculums,
      );

      const matchesProgram =
        selectedProgramFilter === "" ||
        String(personData.program) === String(selectedProgramFilter);

      const matchesDepartment =
        selectedDepartmentFilter === "" ||
        String(programInfo?.dprtmnt_id) === String(selectedDepartmentFilter);

      /* 📅 CREATED AT */
      const appliedDate = parseDateOnlyLocal(personData.created_at);
      if (!appliedDate) return true;

      const applicantAppliedYear = appliedDate.getFullYear();

      const schoolYear = schoolYears.find(
        (sy) => sy.year_id === selectedSchoolYear,
      );

      const matchesSchoolYear =
        selectedSchoolYear === "" ||
        (schoolYear &&
          String(applicantAppliedYear) === String(schoolYear.current_year));

      /* 🕒 SEMESTER */
      const matchesSemester =
        selectedSchoolSemester === "" ||
        normalize(personData.middle_code) ===
          normalize(selectedSemester?.semester_code);

      /* 📆 DATE RANGE */
      let matchesDateRange = true;

      let from = parseDateOnlyLocal(person.fromDate);
      let to = parseDateOnlyLocal(person.toDate);
      if (to) to.setHours(23, 59, 59, 999);

      if (from && to && from > to) {
        const swappedFrom = parseDateOnlyLocal(person.toDate);
        const swappedTo = parseDateOnlyLocal(person.fromDate);
        if (swappedTo) swappedTo.setHours(23, 59, 59, 999);
        from = swappedFrom;
        to = swappedTo;
      }

      if (from && appliedDate < from) matchesDateRange = false;
      if (to && appliedDate > to) matchesDateRange = false;

      /* 📥 SUBMITTED DOCUMENTS */
      const matchesSubmittedDocs =
        !showSubmittedOnly || personData.submitted_documents === 1;

      /* 🧮 SCORES */
      const subjectScores = subjects.map((subject) =>
        Number(personData.scores?.[subject.id] ?? 0),
      );

      const total = subjectScores.reduce((sum, score) => sum + score, 0);

      const maxTotal = subjects.reduce(
        (sum, subject) => sum + Number(subject.max_score || 0),
        0,
      );

      const scorePercent = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

      const finalRating =
        subjectScores.length > 0 ? Math.round(total / subjectScores.length) : 0;

      const matchesTotal =
        minTotal === "" ||
        (total >= Number(minTotal) && total < Number(minTotal) + 1);

      const matchesScorePercent =
        minScorePercent === "" ||
        (scorePercent >= Number(minScorePercent) &&
          scorePercent < Number(minScorePercent) + 1);

      const matchesFinalRating =
        minFinalRating === "" ||
        (finalRating >= Number(minFinalRating) &&
          finalRating < Number(minFinalRating) + 1);
      /* FINAL RESULT */
      return (
        matchesSearch &&
        matchesCampus &&
        matchesApplicantStatus &&
        matchesRegistrarStatus &&
        matchesSubmittedDocs &&
        matchesDepartment &&
        matchesProgram &&
        matchesRegistrarCurriculum &&
        matchesSchoolYear &&
        matchesSemester &&
        matchesDateRange &&
        matchesTotal &&
        matchesScorePercent &&
        matchesFinalRating
      );
    })

    /* 🔽 SORTING */
    .sort((a, b) => {
      const getFinalRating = (person) => {
        const scores = subjects.map((subject) =>
          Number(person.scores?.[subject.id] ?? 0),
        );

        const total = scores.reduce((sum, score) => sum + score, 0);

        return scores.length > 0 ? total / scores.length : 0;
      };

      const aFinal = getFinalRating(a);
      const bFinal = getFinalRating(b);

      /* ⭐ IF TIE → FIRST COME FIRST SERVE */
      const dateA = parseDateOnlyLocal(a.created_at) || new Date(0);
      const dateB = parseDateOnlyLocal(b.created_at) || new Date(0);

      return dateA - dateB;
    });

  const [itemsPerPage, setItemsPerPage] = useState(100);

  const totalPages = Math.ceil(filteredPersons.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPersons = filteredPersons.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
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

  const handleApplicantSuggestionSelect = async (applicant) => {
    const nextValue = getApplicantSuggestionValue(applicant);
    setSearchQuery(nextValue);
    setCurrentPage(1);
    setSuggestionsOpen(false);

    if (!applicant?.person_id) return;

    try {
      const details = await axios.get(
        `${API_BASE_URL}/api/person_with_applicant/${applicant.person_id}`,
      );
      setPerson(details.data);
      sessionStorage.setItem("admin_edit_person_id", details.data.person_id);
      setUserID(details.data.person_id);
      setSearchError("");
    } catch (err) {
      console.error("Search failed:", err);
      setSearchError("Applicant not found");
    }
  };

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
    if (!department.length) return;

    if (department.length === 1) {
      const onlyDeptId = String(department[0].dprtmnt_id);
      if (String(selectedDepartmentFilter) !== onlyDeptId) {
        handleDepartmentChange(onlyDeptId);
      }
    } else if (
      selectedDepartmentFilter &&
      !department.some(
        (dep) => String(dep.dprtmnt_id) === String(selectedDepartmentFilter),
      )
    ) {
      handleDepartmentChange("");
    }
  }, [department]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [filteredPersons.length, totalPages]);

  const handleSnackClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  const handleCampusChange = (branchId) => {
    setPerson((prev) => ({ ...prev, campus: branchId }));
    setSelectedDepartmentFilter("");
    setSelectedProgramFilter("");
    setCurrentPage(1);
  };

  const handleDepartmentChange = (departmentId) => {
    setSelectedDepartmentFilter(departmentId);
    setSelectedProgramFilter("");
    setCurrentPage(1);
  };

  const handleProgramFilterChange = (curriculumId) => {
    setSelectedProgramFilter(curriculumId);
    setCurrentPage(1);
  };

  const [applicants, setApplicants] = useState([]);

  const [file, setFile] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [editScores, setEditScores] = useState({});
  const [saving, setSaving] = useState(false);

  // Handlers
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    document.getElementById("excel-upload").value = "";
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleImport = async (userID) => {
    try {
      if (!selectedFile) {
        setSnack({
          open: true,
          message: "Please choose a file first!",
          severity: "warning",
        });
        return;
      }

      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("userID", userID);
      const actor = auditActor();
      fd.append("audit_actor_id", actor.audit_actor_id);
      fd.append("audit_actor_role", actor.audit_actor_role);
      const macAddress = getLoginMacPayload().user_mac_address;
      if (macAddress) fd.append("user_mac_address", macAddress);

      const res = await axios.post(`${API_BASE_URL}/api/exam/import`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const errors = res.data.errors || [];

      // ✅ ALL SUCCESS
      if (res.data.success && errors.length === 0) {
        setSnack({
          open: true,
          message: "✅ All applicants imported successfully!",
          severity: "success",
        });
      }

      // ⚠️ PARTIAL SUCCESS (THIS IS YOUR CASE)
      else if (errors.length > 0) {
        // extract applicant IDs only
        const failedApplicants = errors
          .map((e) => {
            const match = e.match(/Applicant (\d+)/);
            return match ? match[1] : null;
          })
          .filter(Boolean);

        setSnack({
          open: true,
          message:
            `⚠️ Some applicants were NOT uploaded.\n\n` +
            `Failed: ${failedApplicants.join(", ")}\n\n` +
            `Others were successfully imported.`,
          severity: "warning",
        });

        console.warn("❌ Import errors:", errors);
      }

      // ❌ FULL FAILURE
      else {
        setSnack({
          open: true,
          message: res.data.message || res.data.error || "Failed to import",
          severity: "error",
        });
      }

      await fetchApplicants();
      setSelectedFile(null);

      // ✅ Reset the file input so the same file can be re-imported without reload
      const fileInput = document.getElementById("excel-upload");
      if (fileInput) fileInput.value = "";
    } catch (err) {
      console.error("❌ Import error:", err);
      setSnack({
        open: true,
        message: "Import failed: " + (err.response?.data?.error || err.message),
        severity: "error",
      });
    }
  };

  const saveTimers = useRef({});

  const handleScoreChange = (personId, subjectId, value) => {
    const subject = subjects.find((s) => s.id === subjectId);
    const max = Number(subject?.max_score || 0);
    const numericValue = Number(value);

    // ❌ VALIDATION
    if (numericValue > max) {
      setSnack({
        open: true,
        message: `Score cannot exceed max score (${max})`,
        severity: "error",
      });
      return; // ⛔ stop update
    }

    if (numericValue < 0) {
      setSnack({
        open: true,
        message: "Score cannot be negative",
        severity: "error",
      });
      return;
    }

    // ✅ NORMAL UPDATE
    setEditScores((prev) => ({
      ...prev,
      [personId]: {
        ...prev[personId],
        [subjectId]: value,
      },
    }));
  };

  const buildPayload = (person) => {
    const editedScores = editScores[person.person_id] || {};

    const subjectScores = subjects.map((subject) => ({
      subject_id: subject.id,
      score: Number(
        editedScores[subject.id] ?? person.scores?.[subject.id] ?? 0,
      ),
    }));

    const total = subjectScores.reduce((sum, item) => sum + item.score, 0);

    const maxTotal = subjects.reduce(
      (sum, subject) => sum + Number(subject.max_score || 0),
      0,
    );

    const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

    return {
      applicant_number: person.applicant_number,
      scores: subjectScores,
      total,
      percentage,

      status:
        editedScores.status !== undefined
          ? editedScores.status // 0, 1, or ""
          : person.status !== null && person.status !== undefined
            ? person.status
            : null,
    };
  };

  const saveSingleRow = async (person) => {
    try {
      setSaving(true);

      const payload = buildPayload(person);

      const res = await axios.post(
        `${API_BASE_URL}/api/exam/save`,
        {
          ...payload,
          ...auditActor(),
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (!res.data?.success) {
        throw new Error(res.data?.error || "Save failed");
      }

      // convert array → object for frontend table
      const updatedScores = payload.scores.reduce((acc, curr) => {
        acc[curr.subject_id] = curr.score;
        return acc;
      }, {});

      // update current row immediately
      setPersons((prev) =>
        prev.map((p) =>
          p.person_id === person.person_id
            ? {
                ...p,
                scores: updatedScores,
                total_score: payload.total,
                percentage: payload.percentage,

                status: payload.status,
              }
            : p,
        ),
      );

      // clear temporary edits
      setEditScores((prev) => {
        const copy = { ...prev };
        delete copy[person.person_id];
        return copy;
      });

      setSnack({
        open: true,
        message: "Row saved successfully!",
        severity: "success",
      });
    } catch (err) {
      console.error("SAVE ERROR:", err);

      setSnack({
        open: true,
        message: "Save failed: " + (err.response?.data?.error || err.message),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveAllRows = async () => {
    try {
      setSaving(true);

      for (const person of persons) {
        const payload = buildPayload(person);

        const res = await axios.post(
          `${API_BASE_URL}/api/exam/save`,
          {
            ...payload,
            ...auditActor(),
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        if (!res.data?.success) {
          throw new Error(
            res.data?.error || `Failed saving ${person.applicant_number}`,
          );
        }
      }

      // refresh latest records from backend
      await fetchApplicants();

      // clear all temporary edits
      setEditScores({});

      setSnack({
        open: true,
        message: "All scores saved successfully!",
        severity: "success",
      });
    } catch (err) {
      console.error("SAVE ALL ERROR:", err);

      setSnack({
        open: true,
        message:
          "Save All failed: " + (err.response?.data?.error || err.message),
        severity: "error",
      });
    } finally {
      setSaving(false);
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
  //     const isBlockedKey =
  //         e.key === "F12" ||
  //         e.key === "F11" ||
  //         (e.ctrlKey &&
  //             e.shiftKey &&
  //             (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j")) ||
  //         (e.ctrlKey && e.key.toLowerCase() === "u") ||
  //         (e.ctrlKey && e.key.toLowerCase() === "p");

  //     if (isBlockedKey) {
  //         e.preventDefault();
  //         e.stopPropagation();
  //     }
  // });

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
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: "36px",
          }}
        >
          ENTRANCE EXAMINATION SCORING
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
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
              },
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
                        handleApplicantSuggestionSelect(applicant);
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
                Entrance Examination Score
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
          {/* Left Side: From and To Date */}
          <Box display="flex" flexDirection="column" gap={2}>
            {/* From Date + Print Button */}
            <Box display="flex" alignItems="flex-end" gap={2}>
              {/* From Date */}
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

            {/* To Date */}
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

          {/* Right Side: Campus Dropdown */}
          <Box display="flex" alignItems="flex-end" gap={2}>
            {/* Campus Dropdown */}
            <Box display="flex" flexDirection="column" gap={1}>
              <Typography fontSize={13}>Campus:</Typography>

              <FormControl size="small" sx={{ width: "200px" }}>
                <InputLabel id="campus-label">Campus</InputLabel>
                <Select
                  labelId="campus-label"
                  id="campus-select"
                  name="campus"
                  value={person.campus ?? ""}
                  onChange={(e) => handleCampusChange(e.target.value)}
                >
                  <MenuItem value="">
                    <em>All Campuses</em>
                  </MenuItem>

                  {branches.map((branch) => (
                    <MenuItem key={branch.id} value={String(branch.id)}>
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
                  {/* Left: Total Count */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Applicants: {filteredPersons.length}
                  </Typography>

                  {/* Right: Pagination Controls */}
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
                          "& svg": {
                            color: "white",
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              backgroundColor: "#fff",
                            },
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
          {/* LEFT COLUMN: Sorting */}
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
          </Box>

          {/* MIDDLE COLUMN: SY & Semester */}
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

          {/* RIGHT COLUMN: Department & Program */}
          <Box display="flex" flexDirection="column" gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "100px" }}>
                Department:
              </Typography>
              <FormControl size="small" sx={{ width: "400px" }}>
                <Select
                  value={selectedDepartmentFilter}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  displayEmpty
                >
                  {department.length > 1 && (
                    <MenuItem value="">All Departments</MenuItem>
                  )}
                  {filteredDepartments.map((dep) => (
                    <MenuItem
                      key={dep.dprtmnt_id}
                      value={String(dep.dprtmnt_id)}
                    >
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
                  onChange={(e) => handleProgramFilterChange(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">All Programs</MenuItem>
                  {filteredCurriculumOptions.map((prog) => (
                    <MenuItem
                      key={prog.curriculum_id}
                      value={String(prog.curriculum_id)}
                    >
                      {prog.program_code} - {prog.program_description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Box>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          flexWrap="wrap"
          mt={3}
        >
          {/* LEFT SIDE (SCORE FILTERS) */}
          <Box>
            <Typography color="maroon" sx={{ mb: 1, fontWeight: "bold" }}>
              Entrance Exam Total Score:
            </Typography>

            <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
              <Typography fontSize={13}>Total:</Typography>
              <TextField
                label="Total"
                size="small"
                type="number"
                value={minTotal}
                onChange={(e) => setMinTotal(e.target.value)}
              />

              <Typography fontSize={13}>Score:</Typography>
              <TextField
                label="Score %"
                size="small"
                type="number"
                value={minScorePercent}
                onChange={(e) => setMinScorePercent(e.target.value)}
              />
            </Box>
          </Box>
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
                  width: "25%",
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
                  width: "10%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Program
              </TableCell>

              {subjects.map((subject) => (
                <TableCell
                  sx={{
                    color: "white",
                    textAlign: "center",
                    width: "6%",
                    py: 0.5,
                    fontSize: "12px",
                    border: `1px solid ${borderColor}`,
                  }}
                  key={subject.id}
                >
                  {subject.name}
                </TableCell>
              ))}

              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "6%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Total
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "6%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Score %
              </TableCell>

              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "5%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Date Applied
              </TableCell>

              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "12%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentPersons.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={13}
                  sx={{
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                    color: "#777",
                    py: 3,
                  }}
                >
                  There's no applicant in the record.
                </TableCell>
              </TableRow>
            )}
            {currentPersons.map((person, index) => {
              const subjectScores = subjects.map((subject) => {
                return Number(person.scores?.[subject.id] ?? 0);
              });

              const totalScore = subjectScores.reduce(
                (sum, score) => sum + score,
                0,
              );

              const maxTotal = subjects.reduce(
                (sum, subject) => sum + Number(subject.max_score || 0),
                0,
              );

              const computedConvertedRating =
                maxTotal > 0 ? (totalScore / maxTotal) * 50 + 50 : 0;

              return (
                <TableRow
                  key={person.person_id}
                  sx={{
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "lightgray",
                  }}
                >
                  <TableCell
                    sx={{
                      color: "black",
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                      py: 0.5,
                      fontSize: "15px",
                    }}
                  >
                    {index + 1}
                  </TableCell>

                  <TableCell
                    sx={{
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                      cursor: "pointer",
                      color: "blue",
                      fontSize: "12px",
                    }}
                    onClick={() => handleRowClick(person)}
                  >
                    {person.applicant_number}
                  </TableCell>

                  <TableCell
                    sx={{
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                      cursor: "pointer",
                      color: "blue",
                      fontSize: "12px",
                    }}
                    onClick={() => handleRowClick(person)}
                  >
                    {`${person.last_name}, ${person.first_name} ${person.middle_name ?? ""}`}
                  </TableCell>

                  <TableCell
                    sx={{
                      color: "black",
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                      py: 0.5,
                      fontSize: "15px",
                    }}
                  >
                    {allCurriculums.find(
                      (item) =>
                        item.curriculum_id?.toString() ===
                        person.program?.toString(),
                    )?.program_code ?? "N/A"}
                  </TableCell>

                  {/* READ-ONLY SCORE CELLS */}
                  {subjects.map((subject) => (
                    <TableCell
                      key={subject.id}
                      sx={{
                        textAlign: "center",
                        border: `1px solid ${borderColor}`,
                        color: "black",
                        fontSize: "14px",
                        py: 0.5,
                      }}
                    >
                      {Number(person.scores?.[subject.id] ?? 0)}
                      <Typography
                        component="span"
                        sx={{
                          color: "#888",
                          fontSize: "12px",
                          ml: 0.5,
                        }}
                      >
                        /{Number(subject.max_score || 0)}
                      </Typography>
                    </TableCell>
                  ))}

                  <TableCell
                    sx={{
                      color: "black",
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                      py: 0.5,
                      fontSize: "15px",
                    }}
                  >
                    {totalScore}
                  </TableCell>

                  <TableCell
                    sx={{
                      color: "black",
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                      py: 0.5,
                      fontSize: "15px",
                    }}
                  >
                    {Number(computedConvertedRating).toFixed(2)}
                  </TableCell>

                  {/* DATE APPLIED */}
                  <TableCell
                    sx={{
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                      fontSize: "12px",
                    }}
                  >
                    {(() => {
                      if (!person.created_at.split("T")[0]) return "";

                      const date = new Date(person.created_at.split("T")[0]);

                      if (isNaN(date)) return person.created_at.split("T")[0];

                      return date.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      });
                    })()}
                  </TableCell>

                  {/* READ-ONLY STATUS */}
                  <TableCell
                    sx={{
                      color: "black",
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                      py: 0.5,
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    {person.status === 0 ? (
                      <Typography
                        sx={{
                          color: "green",
                          fontWeight: "bold",
                          fontSize: "14px",
                        }}
                      >
                        Passed
                      </Typography>
                    ) : person.status === 1 ? (
                      <Typography
                        sx={{
                          color: "red",
                          fontWeight: "bold",
                          fontSize: "14px",
                        }}
                      >
                        Failed
                      </Typography>
                    ) : (
                      <Typography sx={{ color: "#888", fontSize: "13px" }}>
                        — No Status —
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
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
                  {/* Left: Total Count */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Applicants: {filteredPersons.length}
                  </Typography>

                  {/* Right: Pagination Controls */}
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
                          "& svg": {
                            color: "white",
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              backgroundColor: "#fff",
                            },
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

export default RegistrarEntranceExamScore;
