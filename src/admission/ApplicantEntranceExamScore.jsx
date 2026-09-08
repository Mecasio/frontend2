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
import { FaFileExcel } from "react-icons/fa";
import _ from "lodash";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import AdmissionProcessTabs from "../components/AdmissionProcessTabs";
import SearchIcon from "@mui/icons-material/Search";
import KeyIcon from "@mui/icons-material/Key";
import API_BASE_URL from "../apiConfig";
import { getAuditConfig, getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import { getLoginMacPayload } from "../utils/userMacAddress";
import {
  isRegistrarCurriculumMatch,
  refreshRegistrarCurriculumId,
  restrictToRegistrarCurriculum,
  syncRegistrarScopeFromAdminData,
} from "../utils/registrarCurriculumRestriction";
import useRegistrarScopeRevision from "../hooks/useRegistrarScopeRevision";
import CampaignIcon from "@mui/icons-material/Campaign";
import DateField from "../components/DateField";
import SaveIcon from "@mui/icons-material/Save";

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

const ApplicantEntranceExamScore = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);

  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#000000";
  const headerColor = colors.header || "#1976d2";
  const fetchedLogo = assets.logoUrl || EaristLogo;
  const companyName = branding.companyName || "";
  const campusAddressFallback = branding.campusAddress || "";
  const branches = settings?.branches || [];

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
    sessionStorage.setItem("admin_edit_person_id_source", "applicant_list");
    sessionStorage.setItem("admin_edit_person_id_ts", String(Date.now()));
    sessionStorage.setItem("admin_edit_person_data", JSON.stringify(applicant));

    if (searchValue) {
      sessionStorage.setItem("admin_edit_search_query", String(searchValue));
      sessionStorage.setItem("edit_applicant_number", String(searchValue));
    }

    // ✅ Always pass person_id in the URL
    navigate(`//admission_personal_information?person_id=${personId}`);
  };

  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const pageId = 8;

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
      setEmployeeID(storedEmployeeID);
      if (storedRole === "applicant") {
        setUserID(storedID);
      }

      if (storedRole === "registrar") {
        checkAccess(storedEmployeeID);
      } else if (storedRole !== "applicant" && storedRole !== "superadmin") {
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
      navigate("/applicant_entrance_exam_score", { replace: true });
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

  useEffect(() => {
    if (userRole !== "registrar" || !employeeID) return;
    refreshRegistrarCurriculumId(employeeID).catch((err) => {
      console.error("Error refreshing registrar scope:", err);
    });
  }, [userRole, employeeID]);

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

  const matchedBranch = branches.find(
    (branch) => String(branch?.id) === String(person?.campus),
  );
  const campusAddress = matchedBranch?.address || campusAddressFallback;
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
  const divToPrintRef = useRef();

  const handleExportExamScoresPdf = async () => {
    const logoSrc = fetchedLogo || EaristLogo;
    const name = companyName?.trim() || "";

    const words = name.split(" ");
    const middleIndex = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, middleIndex).join(" ");
    const secondLine = words.slice(middleIndex).join(" ");

    const resolvedCampusAddress = campusAddress || "No address set in Settings";

    const selectedProgramLabel = selectedProgramFilter
      ? filteredCurriculumOptions.find(
          (p) => p.curriculum_id?.toString() === selectedProgramFilter,
        )?.program_description || "N/A"
      : "All Programs";

    const selectedDepartmentLabel = selectedDepartmentFilter
      ? department.find(
          (d) => String(d.dprtmnt_id) === String(selectedDepartmentFilter),
        )?.dprtmnt_name || "N/A"
      : "All Departments";

    // ✅ NEW: totals for the summary row at the bottom of the table
    const totalPassed = filteredPersons.filter(
      (p) => Number(p.status) === 0,
    ).length;
    const totalFailed = filteredPersons.filter(
      (p) => Number(p.status) === 1,
    ).length;

    // Total column count = Applicant ID + Applicant Name + one per subject + Total + Score % + Status
    const totalColumnCount = 5 + subjects.length;

    // Only the .print-container's INNER markup — no <html>/<head>/<body>,
    // no onload print script. The server wraps this with matching CSS.
    const innerHtml = `
    <div class="print-header">
      <div class="print-corner-label left">
        Department:<br/>${selectedDepartmentLabel}
      </div>

      <div class="print-corner-label right">
        Program:<br/>${selectedProgramLabel}
      </div>

      <div class="header-content">
        <img src="${logoSrc}" alt="School Logo" />

        <div class="header-text">
          <div style="font-size: 12px; font-family: Arial">
            Republic of the Philippines
          </div>

          ${
            name
              ? `
                <b style="letter-spacing: 1px; font-size: 18px; font-family: Arial, sans-serif;">
                  ${firstLine}
                </b>
                ${
                  secondLine
                    ? `<div style="letter-spacing: 1px; font-size: 18px; font-family: Arial, sans-serif;">
                         <b>${secondLine}</b>
                       </div>`
                    : ""
                }
              `
              : ""
          }

          <div style="font-size: 12px; font-family: Arial">
            ${resolvedCampusAddress}
          </div>
        </div>
      </div>

      <div style="margin-top: 20px; text-align: center;">
        <b style="font-size: 20px; letter-spacing: 1px;">
          Entrance Examination Scores
        </b>
      </div>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th style="width:9%">Applicant ID</th>
            <th style="width:26%">Applicant Name</th>
            ${subjects.map((subject) => `<th style="width:6%">${subject.name}</th>`).join("")}
            <th style="width:6%">Total</th>
            <th style="width:6%">Score %</th>
            <th style="width:7%">Status</th>
          </tr>
        </thead>

        <tbody>
          ${filteredPersons
            .map((person) => {
              const subjectScores = subjects.map((subject) =>
                Number(
                  editScores[person.person_id]?.[subject.id] ??
                    person.scores?.[subject.id] ??
                    0,
                ),
              );

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

              // Fixed: this was previously written with invalid
              // template-literal syntax outside of backticks
              // (`${person.last_name},,`), which is a syntax error.
              const fullName = [
                person.last_name,
                person.first_name,
                person.middle_name,
                person.extension,
              ]
                .filter(Boolean)
                .join(" ");

              return `
                <tr>
                  <td>${person.applicant_number || ""}</td>
                  <td class="applicant-name">${fullName}</td>
                  ${subjects
                    .map((subject) => {
                      const score = Number(
                        editScores[person.person_id]?.[subject.id] ??
                          person.scores?.[subject.id] ??
                          0,
                      );
                      return `<td>${score}</td>`;
                    })
                    .join("")}
                  <td>${totalScore}</td>
                  <td>${Number(computedConvertedRating).toFixed(2)}</td>
                  <td>${
                    person.status === 0
                      ? "PASSED"
                      : person.status === 1
                        ? "FAILED"
                        : ""
                  }</td>
                </tr>
              `;
            })
            .join("")}

          <tr>
            <td
              colspan="${totalColumnCount}"
              style="border: 1.5px solid black; background-color: lightgray; -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 6px 10px; font-weight: bold; text-align: right;"
            >
              <span style="margin-right: 32px;">Total Passed: ${totalPassed}</span>
              <span>Total Failed: ${totalFailed}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/generate-exam-scores-pdf`,
        { html: innerHtml },
        {
          responseType: "blob",
          headers: {
            "x-audit-actor-id":
              localStorage.getItem("employee_id") ||
              localStorage.getItem("email") ||
              "unknown",
            "x-audit-actor-role": localStorage.getItem("role") || "registrar",
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
        `Entrance_Exam_Scores_${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to generate Exam Scores PDF:", err);
      // swap in your component's own snackbar/toast here if you have one
      alert("Failed to generate PDF. Please try again.");
    }
  };

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
                  const applicantNumber = cleanApplicantValue(
                    applicant?.applicant_number,
                  );
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
                        "&:hover": {
                          backgroundColor: "#f5f7fb",
                        },
                      }}
                    >
                      <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                        {applicantNumber || "N/A"}
                      </Typography>
                      <Typography sx={{ fontSize: 14, color: "#555" }}>
                        |
                      </Typography>
                      <Typography sx={{ fontSize: 14 }} noWrap>
                        {name ||
                          cleanApplicantValue(applicant?.emailAddress) ||
                          "Unnamed Applicant"}
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

      <AdmissionProcessTabs />

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

              <div style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    window.location.href = `${API_BASE_URL}/api/ecat_scores_template`;
                  }}
                  style={{
                    padding: "5px 20px",
                    border: "2px solid black",
                    backgroundColor: "#f0f0f0",
                    color: "black",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "bold",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "225px",
                    pointerEvents: "auto",
                  }}
                >
                  📥 Download Template
                </button>
              </div>
            </Box>

            {/* To Date + Import Button */}
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

              {/* JSX — Import Section */}
              <Box display="flex" flexDirection="column" gap={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                    id="excel-upload"
                  />

                  {/* Choose Excel button */}
                  <button
                    onClick={() =>
                      document.getElementById("excel-upload").click()
                    }
                    style={{
                      padding: "5px 20px",
                      border: "2px solid green",
                      backgroundColor: "#f0fdf4",
                      color: "green",
                      borderRadius: "5px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "bold",
                      height: "40px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "200px",
                    }}
                    type="button"
                  >
                    <FaFileExcel size={20} />
                    Choose Excel
                  </button>

                  {/* Import button — disabled until file is selected */}
                  <Button
                    variant="contained"
                    disabled={!selectedFile}
                    sx={{
                      height: "40px",
                      width: "200px",
                      backgroundColor: selectedFile ? "green" : undefined,
                      "&:hover": { backgroundColor: "#166534" },
                      fontWeight: "bold",
                    }}
                    onClick={() => handleImport(userID)}
                  >
                    Import Applicants
                  </Button>
                </Box>

                {/* ✅ FILE PREVIEW — shows only when a file is chosen */}
                {selectedFile && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      border: "1px solid #bbf7d0",
                      backgroundColor: "#f0fdf4",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      mt: 0.5,
                    }}
                  >
                    <FaFileExcel size={28} color="#16a34a" />
                    <Box flex={1} minWidth={0}>
                      <Typography
                        sx={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#14532d",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {selectedFile.name}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: "#15803d" }}>
                        {selectedFile.type || "Excel Workbook"} ·{" "}
                        {formatFileSize(selectedFile.size)}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      onClick={handleRemoveFile}
                      sx={{
                        fontSize: 12,
                        color: "#15803d",
                        border: "1px solid #86efac",
                        borderRadius: "6px",
                        textTransform: "none",
                        minWidth: "unset",
                        px: 1.5,
                        flexShrink: 0,
                      }}
                    >
                      Remove
                    </Button>
                  </Box>
                )}
              </Box>
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

            {/* Print ECAT Score */}
            <div style={{ position: "relative", zIndex: 999 }}>
              <button
                onClick={handleExportExamScoresPdf}
                style={{
                  padding: "5px 20px",
                  border: "2px solid black",
                  backgroundColor: "#f0f0f0",
                  color: "black",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                  transition: "background-color 0.3s, transform 0.2s",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  textAlign: "center",
                  gap: "8px",
                  userSelect: "none",
                  width: "230px",
                  pointerEvents: "auto",
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
                onMouseUp={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
                type="button"
              >
                <FcPrint size={20} />
                Download ECAT Score
              </button>
            </div>
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
                    Total Applicant's Records: {filteredPersons.length}
                  </Typography>

                  {/* Right: Pagination Controls */}
                  <Box display="flex" alignItems="center" gap={1}>
                    {/* First & Prev */}
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

                    {/* Page Dropdown */}
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
                            color: "white", // dropdown arrow icon color
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              backgroundColor: "#fff", // dropdown background
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

                    {/* Next & Last */}
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
          {/* LEFT COLUMN: Sorting & Status Filters */}
          <Box display="flex" flexDirection="column" gap={2}>
            {/* Sort By */}
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
          {/* ✅ LEFT SIDE (FILTERS) */}
          <Box>
            <Typography color="maroon" sx={{ mb: 1, fontWeight: "bold" }}>
              Entrance Exam Score Filter:
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

          {/* ✅ RIGHT SIDE (BUTTON) */}
          <Box>
            <Button
              variant="contained"
              color="primary"
              onClick={saveAllRows}
              sx={{
                width: "220px",
                height: "45px",
                fontWeight: "bold",
                mt: 4,
                mr: 2,
              }}
              disabled={saving}
            >
              <SaveIcon fontSize="small" /> SAVE ALL SCORES
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => navigate("/applicant_exam_subjects")}
              sx={{
                width: "220px",
                height: "45px",
                fontWeight: "bold",
                mt: 4,
              }}
            >
              SUBJECT MANAGEMENT
            </Button>
          </Box>
        </Box>
      </TableContainer>

      <div ref={divToPrintRef}></div>

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
                Action
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
                return Number(
                  editScores[person.person_id]?.[subject.id] ??
                    person.scores?.[subject.id] ??
                    0,
                );
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
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "lightgray", // white / light gray
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

                  {/* SCORE INPUTS */}
                  {subjects.map((subject) => (
                    <TableCell
                      key={subject.id}
                      sx={{
                        textAlign: "center",
                        border: `1px solid ${borderColor}`,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.75,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <TextField
                          size="small"
                          type="number"
                          value={
                            editScores[person.person_id]?.[subject.id] ??
                            person.scores?.[subject.id] ??
                            ""
                          }
                          onChange={(e) =>
                            handleScoreChange(
                              person.person_id,
                              subject.id,
                              e.target.value,
                            )
                          }
                          inputProps={{
                            min: 0,
                            max: subject.max_score,
                            style: { textAlign: "center" },
                          }}
                          sx={{
                            width: "70px",
                          }}
                        />
                        <Typography
                          component="span"
                          sx={{
                            color: "black",
                            fontSize: "14px",
                            fontWeight: 500,
                          }}
                        >
                          /{Number(subject.max_score || 0)}
                        </Typography>
                      </Box>
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
                  {/* STATUS */}
                  <TableCell
                    sx={{
                      color: "black",
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                      py: 0.5,
                      fontSize: "15px",
                    }}
                  >
                    <FormControl fullWidth size="small">
                      <Select
                        value={
                          editScores[person.person_id]?.status ??
                          person.status ??
                          ""
                        }
                        onChange={(e) =>
                          setEditScores((prev) => ({
                            ...prev,
                            [person.person_id]: {
                              ...prev[person.person_id],
                              status: e.target.value, // stores 0, 1, or ""
                            },
                          }))
                        }
                      >
                        <MenuItem value="">
                          <em>— No Status —</em>
                        </MenuItem>
                        <MenuItem value={0}>Passed</MenuItem>
                        <MenuItem value={1}>Failed</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>

                  {/* SAVE ROW BUTTON */}
                  <TableCell
                    sx={{
                      color: "black",
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                      py: 0.5,
                      fontSize: "15px",
                    }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => saveSingleRow(person)}
                      disabled={saving}
                    >
                      <SaveIcon fontSize="small" /> Save
                    </Button>
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
                    Total Applicant's Records: {filteredPersons.length}
                  </Typography>

                  {/* Right: Pagination Controls */}
                  <Box display="flex" alignItems="center" gap={1}>
                    {/* First & Prev */}
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

                    {/* Page Dropdown */}
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
                            color: "white", // dropdown arrow icon color
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              backgroundColor: "#fff", // dropdown background
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

                    {/* Next & Last */}
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

export default ApplicantEntranceExamScore;
