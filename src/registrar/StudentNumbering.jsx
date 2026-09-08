import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import axios from "axios";
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  TableContainer,
  Table,
  FormControl,
  Select,
  MenuItem,
  TableHead,
  TableRow,
  TableCell,
  Dialog,
  DialogTitle,
  DialogContent,
  Card,
  InputLabel,
  DialogActions,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { io } from "socket.io-client";
import { Snackbar, Alert } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { IconButton, InputAdornment } from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import SearchIcon from "@mui/icons-material/Search";

import API_BASE_URL from "../apiConfig";
import CloseIcon from "@mui/icons-material/Close";
import {
  isRegistrarCurriculumMatch,
  isRegistrarProgramSelectionLocked,
  refreshRegistrarCurriculumId,
  restrictToRegistrarCurriculum,
  syncRegistrarScopeFromAdminData,
} from "../utils/registrarCurriculumRestriction";
import useRegistrarScopeRevision from "../hooks/useRegistrarScopeRevision";
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

const StudentNumbering = () => {
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
    if (colors.subButton) setSubButtonColor(colors.subButton); // ✅ NEW
    if (colors.stepper) setStepperColor(colors.stepper); // ✅ NEW

    // 🏫 Logo
    if (assets.logoUrl) {
      setFetchedLogo(assets.logoUrl);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Information
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
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

  // Also put it at the very top
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");

  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const pageId = 59;

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
      setLoading(false);
    }
  };

  const [person, setPerson] = useState({
    profile_img: "",
    campus: "",
    academicProgram: "",
    classifiedAs: "",
    program: "",
    program2: "",
    program3: "",
    yearLevel: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    extension: "",
    nickname: "",
    height: "",
    weight: "",
    lrnNumber: "",
    gender: "",
    pwdType: "",
    pwdId: "",
    birthOfDate: "",
    age: "",
    birthPlace: "",
    languageDialectSpoken: "",
    citizenship: "",
    religion: "",
    civilStatus: "",
    tribeEthnicGroup: "",
    otherEthnicGroup: "",
    cellphoneNumber: "",
    emailAddress: "",
    telephoneNumber: "",
    facebookAccount: "",
    presentStreet: "",
    presentBarangay: "",
    presentZipCode: "",
    presentRegion: "",
    presentProvince: "",
    presentMunicipality: "",
    presentDswdHouseholdNumber: "",
    permanentStreet: "",
    permanentBarangay: "",
    permanentZipCode: "",
    permanentRegion: "",
    permanentProvince: "",
    permanentMunicipality: "",
    permanentDswdHouseholdNumber: "",
    father_deceased: "",
    father_family_name: "",
    father_given_name: "",
    father_middle_name: "",
    father_ext: "",
    father_contact: "",
    father_occupation: "",
    father_income: "",
    father_email: "",
    mother_deceased: "",
    mother_family_name: "",
    mother_given_name: "",
    mother_middle_name: "",
    mother_contact: "",
    mother_occupation: "",
    mother_income: "",
    guardian: "",
    guardian_family_name: "",
    guardian_given_name: "",
    guardian_middle_name: "",
    guardian_ext: "",
    guardian_nickname: "",
    guardian_address: "",
    guardian_contact: "",
    guardian_email: "",
    schoolLevel: "",
    schoolLastAttended: "",
    schoolAddress: "",
    courseProgram: "",
    honor: "",
    generalAverage: "",
    yearGraduated: "",
    schoolLevel1: "",
    schoolLastAttended1: "",
    schoolAddress1: "",
    courseProgram1: "",
    honor1: "",
    generalAverage1: "",
    yearGraduated1: "",
    strand: "",
  });

  const location = useLocation();
  const navigate = useNavigate();

  const [authOpen, setAuthOpen] = useState(true);
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authPassed, setAuthPassed] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  // 🔒 NEW: Lockout states
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const lockIntervalRef = useRef(null);


  const [assignedStudentData, setAssignedStudentData] = useState(null);
  const [tempPasswordResult, setTempPasswordResult] = useState("");
  const [emailSubject, setEmailSubject] = useState(
    "Welcome - Acceptance Confirmation"
  );
  const [emailMessage, setEmailMessage] = useState("");
  const [finalPreview, setFinalPreview] = useState("");
  const [importantReminders, setImportantReminders] = useState(
    `⚠️ Important Reminder:
    
- Please keep your temporary password confidential and change it upon first login.
- Visit your respective college office to tag your schedule and obtain your class schedule.
`
  );




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

  const handleAuthSubmit = async () => {
    if (isLocked) return;
    if (!authPassword) {
      setAuthError("Password is required.");
      return;
    }
    try {
      const personId = localStorage.getItem("person_id");
      const res = await axios.post(`${API_BASE_URL}/api/verify-password`, {
        person_id: personId,
        password: authPassword,
      });

      if (res.data.success) {
        setAuthPassed(true);
        setAuthOpen(false);
        setIsLocked(false);
        setLockTimer(0);
        if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
      }
    } catch (err) {
      const data = err.response?.data;

      if (data?.locked) {
        // 🔒 Backend says locked — start countdown from remainingSeconds
        setIsLocked(true);
        setLockTimer(data.remainingSeconds);
        setAuthError(data.message);
        setAuthPassword("");

        if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);

        lockIntervalRef.current = setInterval(() => {
          setLockTimer((prev) => {
            if (prev <= 1) {
              clearInterval(lockIntervalRef.current);
              setIsLocked(false);
              setAuthError("");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // ❌ Wrong password but not locked yet
        setAuthPassword("");
        setAuthError(
          data?.attemptsLeft !== undefined
            ? `❌ Invalid password. ${data.attemptsLeft} attempt(s) remaining.`
            : data?.message || "❌ Invalid password.",
        );
      }
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);
    };
  }, []);

  // 🔒 Check lock status on mount (handles page reload)
  useEffect(() => {
    const personId = localStorage.getItem("person_id");
    if (!personId) return;

    axios
      .get(`${API_BASE_URL}/api/check-lock-status/${personId}`)
      .then((res) => {
        if (res.data.locked) {
          setIsLocked(true);
          setLockTimer(res.data.remainingSeconds);
          setAuthError(
            `Account locked. Try again in ${Math.ceil(res.data.remainingSeconds / 60)} minute(s).`,
          );

          if (lockIntervalRef.current) clearInterval(lockIntervalRef.current);

          lockIntervalRef.current = setInterval(() => {
            setLockTimer((prev) => {
              if (prev <= 1) {
                clearInterval(lockIntervalRef.current);
                setIsLocked(false);
                setAuthError("");
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      })
      .catch((err) => console.error("Lock check failed:", err));
  }, []);

  const [explicitSelection, setExplicitSelection] = useState(false);

  const [persons, setPersons] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [assignedNumber, setAssignedNumber] = useState("");
  const [error, setError] = useState("");
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const [currentPage, setCurrentPage] = useState(1);

  const [showPassword, setShowPassword] = useState(false);

  // 🔑 For modal
  const [openModal, setOpenModal] = useState(false);
  const [password, setPassword] = useState("");
  const [isAssigning, setIsAssigning] = useState(false); // 🔒 prevents double submit

  const [itemsPerPage, setItemsPerPage] = useState(100);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [searchError, setSearchError] = useState("");


  useEffect(() => {
    if (!openModal) return;
    setFinalPreview(`${emailMessage}\n\n${importantReminders}`);
  }, [importantReminders, emailMessage, openModal]);


  const openAssignModal = () => {
    if (!selectedPerson) return;
    setPassword("");
    const base = buildAcceptanceEmailPreview();
    setEmailMessage(base);
    setFinalPreview(`${base}\n\n${importantReminders}`);
    setOpenModal(true);
  };

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim() === "") return;

      try {
        const res = await axios.get(`${API_BASE_URL}/api/search-person`, {
          params: { query: searchQuery },
        });

        setPerson(res.data); // ❌ don't do this
      } catch (err) {
        setSearchError("Applicant not found");
      }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const startIndex = (currentPage - 1) * itemsPerPage;

  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
  const [selectedProgramFilter, setSelectedProgramFilter] = useState("");
  const [selectedCampus, setSelectedCampus] = useState("");
  const [schoolYears, setSchoolYears] = useState([]);
  const [semesters, setSchoolSemester] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedSchoolSemester, setSelectedSchoolSemester] = useState("");
  const [selectedActiveSchoolYear, setSelectedActiveSchoolYear] = useState("");
  const selectedSchoolYearValue = schoolYears.some(
    (sy) => String(sy.year_id) === String(selectedSchoolYear),
  )
    ? selectedSchoolYear
    : "";
  const selectedSchoolSemesterValue = semesters.some(
    (sem) => String(sem.semester_id) === String(selectedSchoolSemester),
  )
    ? selectedSchoolSemester
    : "";

  const [department, setDepartment] = useState([]);
  const [curriculumOptions, setCurriculumOptions] = useState([]);
  const [allCurriculums, setAllCurriculums] = useState([]);
  const [adminData, setAdminData] = useState({
    dprtmnt_id: "",
    dprtmnt_ids: [],
    scopes: [],
  });
  const scopeRevision = useRegistrarScopeRevision();
  const isProgramLocked = isRegistrarProgramSelectionLocked();
  const selectedDepartmentFilterValue =
    selectedDepartmentFilter === "" ||
      department.some(
        (dep) => String(dep.dprtmnt_name) === String(selectedDepartmentFilter),
      )
      ? selectedDepartmentFilter
      : "";
  const selectedProgramFilterValue =
    selectedProgramFilter === "" ||
      curriculumOptions.some(
        (prog) => String(prog.program_code) === String(selectedProgramFilter),
      )
      ? selectedProgramFilter
      : "";
  const normalize = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase();
  const selectedSemester = semesters.find(
    (sem) => String(sem.semester_id) === String(selectedSchoolSemester),
  );

  const filteredPersons = persons.filter((personData) => {
    const fullText =
      `${personData.first_name ?? ""} ${personData.middle_name ?? ""} ${personData.last_name ?? ""} ${personData.emailAddress ?? ""} ${personData.applicant_number ?? ""}`.toLowerCase();
    const matchesSearch = fullText.includes(searchQuery.toLowerCase());
    const matchesCampus =
      !selectedCampus || String(personData.campus) === String(selectedCampus);

    const programInfo = allCurriculums.find(
      (opt) => opt.curriculum_id?.toString() === personData.program?.toString(),
    );
    const matchesRegistrarCurriculum = isRegistrarCurriculumMatch(
      personData.program,
      allCurriculums,
    );

    const matchesDepartment =
      selectedDepartmentFilter === "" ||
      programInfo?.dprtmnt_name === selectedDepartmentFilter;

    const matchesProgramFilter =
      selectedProgramFilter === "" ||
      programInfo?.program_code === selectedProgramFilter;

    const applicantAppliedYear = new Date(personData.created_at).getFullYear();
    const schoolYear = schoolYears.find(
      (sy) => sy.year_id === selectedSchoolYear,
    );
    const overrideBySearch = searchQuery.trim() !== "";

    const matchesSchoolYear =
      overrideBySearch ||
      selectedSchoolYear === "" ||
      (schoolYear &&
        String(applicantAppliedYear) === String(schoolYear.current_year));

    const matchesSemester =
      overrideBySearch ||
      selectedSchoolSemester === "" ||
      normalize(personData.middle_code) ===
      normalize(selectedSemester?.semester_code);

    return (
      matchesSearch &&
      matchesCampus &&
      matchesRegistrarCurriculum &&
      matchesDepartment &&
      matchesProgramFilter &&
      matchesSchoolYear &&
      matchesSemester
    );
  });

  const sortedPersons = [...filteredPersons].sort((a, b) => {
    if (sortBy === "name") {
      // ✅ sort by last name first, then first + middle
      const nameA =
        `${a.last_name ?? ""} ${a.first_name ?? ""} ${a.middle_name ?? ""}`.toLowerCase();
      const nameB =
        `${b.last_name ?? ""} ${b.first_name ?? ""} ${b.middle_name ?? ""}`.toLowerCase();
      return sortOrder === "asc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    }

    if (sortBy === "id") {
      const idA = a.applicant_number ?? "";
      const idB = b.applicant_number ?? "";
      return sortOrder === "asc" ? idA - idB : idB - idA;
    }

    if (sortBy === "email") {
      const emailA = a.emailAddress?.toLowerCase() ?? "";
      const emailB = b.emailAddress?.toLowerCase() ?? "";
      return sortOrder === "asc"
        ? emailA.localeCompare(emailB)
        : emailB.localeCompare(emailA);
    }

    return 0;
  });

  // ✅ Step 3: Pagination (use sortedPersons instead of filteredPersons)
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

  useEffect(() => {
    if (userRole !== "registrar" || !employeeID) return;
    refreshRegistrarCurriculumId(employeeID).catch((err) => {
      console.error("Error refreshing registrar scope:", err);
    });
  }, [userRole, employeeID]);

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
        const restricted = dedupeByProgramCode(restrictToRegistrarCurriculum(merged));
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
    if (currentPage > totalPages) {
      setCurrentPage(totalPages || 1);
    }
  }, [filteredPersons.length, totalPages]);

  useEffect(() => {
    fetchPersons();
  }, []);

  const fetchPersons = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/college/persons`);
      setPersons(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePersonClick = (person) => {
    setSelectedPerson(person);
    setAssignedNumber("");
    setError("");
  };

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

  useEffect(() => {
    if (!isProgramLocked) return;
    const assignedCurriculum = curriculumOptions.find((prog) =>
      isRegistrarCurriculumMatch(prog.curriculum_id),
    );
    if (assignedCurriculum?.program_code) {
      setSelectedProgramFilter(assignedCurriculum.program_code);
    }
  }, [curriculumOptions, isProgramLocked]);




  const buildAcceptanceEmailPreview = () => {
    const schoolName = companyName || "our school";
    const firstName = selectedPerson?.first_name || "";
    const middleName = selectedPerson?.middle_name || "";
    const lastName = selectedPerson?.last_name || "";
    const emailAddress = selectedPerson?.emailAddress || "";
    const loginUrl = "https://ap.earist.edu.ph/login";

    return `
          Hi, ${firstName} ${middleName || ""} ${lastName},

          🎉 Congratulations! You are now officially accepted and part of the ${schoolName} community.

          Please visit your respective college offices to tag your schedule to your account and obtain your class schedule.

          Your Student Number is: [Assigned after confirmation]
          Your Email Address is: ${emailAddress}

          Your temporary password is: [Generated automatically]

          You may change your password and keep it secure.

          👉 Click the link below to log in:
          ${loginUrl}
      `;
  };

  const [userEmail, setUserEmail] = useState("");

  // fetch logged-in user email once (e.g. from localStorage or auth context)
  useEffect(() => {
    const storedEmail = localStorage.getItem("userEmail"); // adjust to your storage key
    if (storedEmail) setUserEmail(storedEmail);
  }, []);

  const confirmAssignNumber = async () => {
    if (isAssigning) return; // already in progress, ignore extra clicks
    setIsAssigning(true);

    try {
      socket.current.emit("assign-student-number", {
        person_id: selectedPerson.person_id,
        audit_actor_id:
          employeeID ||
          localStorage.getItem("employee_id") ||
          localStorage.getItem("email") ||
          "unknown",
        audit_actor_role:
          userRole || localStorage.getItem("role") || "registrar",
        ...getLoginMacPayload(),
      });

      socket.current.once("assign-student-number-result", (data) => {
        setIsAssigning(false); // 🔓 release lock once server responds

        if (data.success) {
          setAssignedNumber(data.student_number);
          setAssignedStudentData(data.student_data || null);
          setTempPasswordResult(data.temp_password || "");
          setOpenModal(false);
          setSnack({
            open: true,
            message:
              data.message ||
              (data.email_sent
                ? "Student number assigned and email sent."
                : "Student number assigned, but email was not sent."),
            severity: data.email_sent ? "success" : "warning",
          });
          fetchPersons();
          setSelectedPerson(null);
        } else {
          setSnack({
            open: true,
            message: data.message || "❌ Failed to assign student number.",
            severity: "error",
          });
        }
      });
    } catch (err) {
      setIsAssigning(false); // 🔓 release lock on error too
      setAuthError("Invalid Password please try Again");
    }
  };

  const handleSnackClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
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

  // Put this at the very bottom before the return
  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }

  if (!authPassed) {
    const minutes = Math.floor(lockTimer / 60);
    const seconds = lockTimer % 60;

    return (
      <Dialog
        open={authOpen}
        onClose={(_, reason) => {
          if (reason === "backdropClick" || isLocked) return;
          setAuthOpen(false);
          navigate("/registrar_dashboard");
        }}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            overflow: "hidden",
            minWidth: 420,
            boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          },
        }}
      >
        {/* ✅ NEW: Flat DialogTitle header matching the reference style */}
        <DialogTitle
          sx={{
            bgcolor: isLocked ? "#7a0000" : headerColor,
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: "bold",
            px: 3,
            py: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: "50%",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              {isLocked ? "🔒" : "🔐"}
            </Box>
            <Box>
              <Typography
                fontWeight="bold"
                fontSize={16}
                color="white"
                lineHeight={1.2}
              >
                {isLocked ? "Access Locked" : "Identity Verification"}
              </Typography>
              <Typography
                fontSize={12}
                color="rgba(255,255,255,0.8)"
                lineHeight={1.2}
              >
                {isLocked
                  ? "Too many failed attempts"
                  : "Confirm your credentials to continue"}
              </Typography>
            </Box>
          </Box>
          {!isLocked && (
            <IconButton
              onClick={() => {
                setAuthOpen(false);
                navigate("/registrar_dashboard");
              }}
              sx={{
                color: "white",
                border: "2px solid rgba(255,255,255,0.6)",
                borderRadius: "50%",
                width: 38,
                height: 38,
                padding: 0,
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.2)",
                  border: "2px solid white",
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent sx={{ px: 3, pt: 2.5, pb: 1 }}>
          {isLocked ? (
            <Box textAlign="center" py={2}>
              <Box
                sx={{
                  width: 90,
                  height: 90,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #fff0f0, #ffe0e0)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  border: "3px solid #f44336",
                }}
              >
                <Typography fontSize={38}>🔒</Typography>
              </Box>
              <Typography
                fontWeight="bold"
                fontSize={18}
                color="#c62828"
                mb={1}
              >
                Account Temporarily Locked
              </Typography>
              <Typography fontSize={13} color="#555" mb={3}>
                You've exceeded the maximum number of password attempts. Please
                wait before trying again.
              </Typography>
              <Box
                sx={{
                  background: "linear-gradient(135deg, #fff3e0, #ffe0b2)",
                  borderRadius: "12px",
                  border: "1px solid #ffb74d",
                  py: 2.5,
                  px: 3,
                  mb: 2,
                }}
              >
                <Typography
                  fontSize={12}
                  color="#e65100"
                  fontWeight="bold"
                  mb={0.5}
                >
                  TIME REMAINING
                </Typography>
                <Typography
                  fontSize={40}
                  fontWeight="bold"
                  color="#bf360c"
                  fontFamily="monospace"
                  letterSpacing={4}
                >
                  {String(minutes).padStart(2, "0")}:
                  {String(seconds).padStart(2, "0")}
                </Typography>
                <Typography fontSize={11} color="#e65100" mt={0.5}>
                  minutes : seconds
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box>
              {/* ✅ NEW: 4-step flow diagram matching the image */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0,
                  mb: 2.5,
                  mt: 3,
                }}
              >
                {[
                  {
                    label: "Verify identity",
                    sub: "Your password",
                    active: true,
                  },
                  {
                    label: "Assign number",
                    sub: "Student ID minted",
                    active: false,
                  },
                  {
                    label: "Send email",
                    sub: "Credentials sent",
                    active: false,
                  },
                  {
                    label: "Mark enrolled",
                    sub: "Cannot be undone",
                    active: false,
                  },
                ].map((step, i, arr) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "center" }}>
                    <Box
                      sx={{
                        border: step.active
                          ? `2px solid ${headerColor}`
                          : "2px solid #bbb",
                        borderRadius: "8px",
                        px: 1.2,
                        py: 0.6,
                        textAlign: "center",
                        minWidth: 90,
                        backgroundColor: step.active
                          ? `${headerColor}15`
                          : "transparent",
                      }}
                    >
                      <Typography
                        fontSize={11}
                        fontWeight="bold"
                        color={
                          step.active
                            ? headerColor
                            : "#555"
                        }
                      >
                        {step.label}
                      </Typography>
                      <Typography fontSize={10} color="#888">
                        {step.sub}
                      </Typography>
                    </Box>
                    {i < arr.length - 1 && (
                      <Typography sx={{ color: "#aaa", mx: 0.3, fontSize: 16 }}>
                        →
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>

              {/* Warning Notice */}
              <Box
                sx={{
                  border: "1px solid #f5a623",
                  borderRadius: "8px",
                  p: 1.5,
                  mb: 2.5,
                  display: "flex",
                  gap: 1,
                  alignItems: "flex-start",
                  backgroundColor: "#fffbf2",
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
                <Typography fontSize={12.5} color="#5d4037" lineHeight={1.5}>
                  All four steps above run automatically and{" "}
                  <strong>cannot be reversed</strong>. The student will receive
                  login credentials immediately.
                </Typography>
              </Box>

              {/* Password Field */}
              <Typography
                fontSize={13}
                fontWeight="bold"
                color="#333"
                mb={0.75}
              >
                Enter your password
              </Typography>
              <TextField
                type={showAuthPassword ? "text" : "password"}
                fullWidth
                size="small"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                autoComplete="new-password"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAuthSubmit();
                }}
                disabled={isLocked}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    fontSize: 14,
                    "&.Mui-focused fieldset": {
                      borderColor: headerColor,
                      borderWidth: 2,
                    },
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowAuthPassword(!showAuthPassword)}
                        size="small"
                        edge="end"
                      >
                        {showAuthPassword ? (
                          <VisibilityOff fontSize="small" />
                        ) : (
                          <Visibility fontSize="small" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Error Message */}
              {authError && !isLocked && (
                <Box
                  sx={{
                    mt: 1.5,
                    p: 1.25,
                    backgroundColor: "#ffebee",
                    borderRadius: "8px",
                    border: "1px solid #ef9a9a",
                  }}
                >
                  <Typography fontSize={12.5} color="#c62828">
                    {authError}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1.5, gap: 1 }}>
          {!isLocked && (
            <>
              <Button
                onClick={() => {
                  setAuthOpen(false);
                  navigate("/registrar_dashboard");
                }}
                color="error"
                variant="outlined"
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleAuthSubmit}
                disabled={isLocked}
                sx={{
                  borderRadius: "10px",
                  textTransform: "none",
                  px: 3,
                  fontWeight: "bold",
                  backgroundColor: headerColor,
                  "&:hover": { opacity: 0.9 },
                }}
              >
                Yes, confirm enrollment
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    );
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
        <Typography variant="h4" fontWeight="bold" sx={{ color: titleColor }}>
          ASSIGN STUDENT NUMBER FOR REGISTRAR
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
                        setSearchQuery(getApplicantSuggestionValue(applicant));
                        setSelectedPerson(applicant);
                        setAssignedNumber("");
                        setError("");
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
                Student Numbering Panel
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
            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13}>Campus:</Typography>
              <FormControl size="small" sx={{ width: "200px" }}>
                <Select
                  labelId="campus-label"
                  id="campus-select"
                  name="campus"
                  value={selectedCampus}
                  onChange={(e) => {
                    setSelectedCampus(e.target.value);
                    setCurrentPage(1);
                  }}
                  displayEmpty
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
                  value={selectedSchoolYearValue}
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
                  value={selectedSchoolSemesterValue}
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
                  value={selectedDepartmentFilterValue}
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
                  value={selectedProgramFilterValue}
                  onChange={(e) => setSelectedProgramFilter(e.target.value)}
                  disabled={isProgramLocked}
                  displayEmpty
                >
                  {!isProgramLocked && <MenuItem value="">All Programs</MenuItem>}
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
      </TableContainer>

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead
            sx={{
              backgroundColor: headerColor,
              color: "white",
            }}
          >
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
                  {/* Left: Applicant List Count */}
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

      {/* ✅ Applicant List */}
      <Box
        sx={{
          display: "flex",
          gap: 4,
          border: `1px solid ${borderColor}`,
          padding: "10px",
        }}
      >
        <Box flex={1}>
          {currentPersons.length === 0 && (
            <Typography>No matching students.</Typography>
          )}
          {currentPersons.map((person, index) => (
            <Paper
              key={person.person_id}
              onClick={() => handlePersonClick(person)}
              elevation={2}
              sx={{
                p: 1,
                mb: 0.5,
                border: "2px solid #800000",
                cursor: "pointer",

                backgroundColor:
                  selectedPerson?.person_id === person.person_id
                    ? "#800000"
                    : index % 2 === 0
                      ? "#ffffff"
                      : "lightgray",

                color:
                  selectedPerson?.person_id === person.person_id
                    ? "white"
                    : "#800000",

                "&:hover": {
                  backgroundColor: "#800000",
                  color: "white",
                },
              }}
            >
              <Box
                sx={{ display: "flex", gap: "10px", px: 2, fontSize: "14px" }}
              >
                <span>{startIndex + index + 1}.</span>
                <span>{person.applicant_number || "N/A"}</span> |
                <span>
                  {person.first_name} {person.middle_name} {person.last_name}
                </span>{" "}
                |<span>{person.emailAddress}</span>
              </Box>
            </Paper>
          ))}
        </Box>

        {/* Selected Person + Assignment */}
        <Box flex={1}>
          <Typography
            fontSize={16}
            fontWeight="bold"
            gutterBottom
            color="#800000"
          >
            Selected Person:
          </Typography>

          {selectedPerson ? (
            <Box>
              <Typography style={{ fontSize: "16px" }}>
                <strong>Applicant ID:</strong>{" "}
                {selectedPerson.applicant_number || "N/A"} <br />
                <strong>Name:</strong> {selectedPerson.first_name}{" "}
                {selectedPerson.middle_name} {selectedPerson.last_name}
                <br />
                <strong>Birth Of Date:</strong>{" "}
                {selectedPerson.birthOfDate
                  ? new Date(selectedPerson.birthOfDate).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )
                  : "N/A"}
                <br />
                <strong>Age:</strong> {selectedPerson.age}
                <br />
                <strong>Program Applied:</strong> ({selectedPerson.program_code}
                ) - {selectedPerson.program_description}
                {selectedPerson.major} -
                <br />
                <strong>Email Address:</strong> {selectedPerson.emailAddress}
              </Typography>

              <Button
                variant="contained"
                sx={{ marginTop: "15px" }}
                onClick={openAssignModal}
              >
                Assign Student Number
              </Button>
            </Box>
          ) : (
            <Typography>No person selected.</Typography>
          )}

          {assignedStudentData && (
            <Card sx={{ mt: 2, p: 2, border: "1px solid #2e7d32" }}>
              <Typography fontWeight="bold" color="green" mb={1}>
                ✅ Student Number Assigned
              </Typography>
              <Typography fontSize={14}>
                <strong>Student Number:</strong> {assignedStudentData.student_number}
                <br />
                <strong>Name:</strong> {assignedStudentData.last_name},{" "}
                {assignedStudentData.first_name} {assignedStudentData.middle_name}
                <br />
                <strong>Email:</strong> {assignedStudentData.email}
                <br />
                <strong>Temporary Password:</strong> {tempPasswordResult}
              </Typography>
            </Card>
          )}

          {error && (
            <Typography mt={2} color="error">
              {error}
            </Typography>
          )}
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead
            sx={{
              backgroundColor: headerColor,
              color: "white",
            }}
          >
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
                  {/* Left: Applicant List Count */}
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

      <Dialog
        open={openModal}
        onClose={(event, reason) => {
          if (reason === "backdropClick" || isAssigning) return;
          setOpenModal(false);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor: headerColor,
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: "bold",
            px: 3,
            py: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: "50%",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              🔐
            </Box>
            <Box>
              <Typography
                fontWeight="bold"
                fontSize={16}
                color="white"
                lineHeight={1.2}
              >
                Confirm Student Number Assignment
              </Typography>
              <Typography
                fontSize={12}
                color="rgba(255,255,255,0.8)"
                lineHeight={1.2}
              >
                Review the email before confirming
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setOpenModal(false)}
            sx={{
              color: "white",
              border: "2px solid rgba(255,255,255,0.6)",
              borderRadius: "50%",
              width: 38,
              height: 38,
              padding: 0,
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.2)",
                border: "2px solid white",
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          <TextField
            label="Email Subject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            fullWidth
            sx={{ mb: 3 }}
          />

          <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                👁️ Email Preview
              </Typography>
              <TextField
                value={finalPreview}
                fullWidth
                multiline
                minRows={18}
                InputProps={{ readOnly: true }}
                sx={{ "& .MuiInputBase-root": { backgroundColor: "#f9f9f9" } }}
              />
            </Box>

            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                ✏️ Important Reminders
              </Typography>
              <TextField
                value={importantReminders}
                onChange={(e) => setImportantReminders(e.target.value)}
                fullWidth
                multiline
                minRows={10}
                placeholder="Edit reminders here..."
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenModal(false)}
            color="error"
            variant="outlined"
            disabled={isAssigning}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmAssignNumber}
            variant="contained"
            disabled={isAssigning}
          >
            {isAssigning ? "Processing..." : "Confirm Assign & Send Email"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentNumbering;
