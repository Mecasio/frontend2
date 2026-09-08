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
  Card,
  TableCell,
  TextField,
  MenuItem,
  InputLabel,
  Checkbox,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControlLabel,
  DialogActions,
  Modal,
  Grid
} from "@mui/material";
import { io } from "socket.io-client";
import { Snackbar, Alert } from "@mui/material";
import API_BASE_URL from "../apiConfig";
import { getAuditConfig, getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import { useNavigate, useLocation } from "react-router-dom";
import { FcPrint } from "react-icons/fc";
import EaristLogo from "../assets/EaristLogo.png";

import SearchIcon from "@mui/icons-material/Search";

import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import DateField from "../components/DateField";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  isRegistrarCurriculumMatch,
  refreshRegistrarCurriculumId,
  restrictToRegistrarCurriculum,
  syncRegistrarScopeFromAdminData,
} from "../utils/registrarCurriculumRestriction";
import useRegistrarScopeRevision from "../hooks/useRegistrarScopeRevision";
import SaveIcon from "@mui/icons-material/Save";

const cleanSuggestionValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const getApplicantSuggestionText = (applicant) =>
  [
    applicant?.applicant_number,
    applicant?.first_name,
    applicant?.middle_name,
    applicant?.last_name,
    applicant?.emailAddress,
    applicant?.email,
  ]
    .map(cleanSuggestionValue)
    .join(" ")
    .toLowerCase();

const getApplicantSuggestionValue = (applicant) =>
  cleanSuggestionValue(applicant?.applicant_number) ||
  cleanSuggestionValue(applicant?.emailAddress) ||
  cleanSuggestionValue(applicant?.email);

const ApplicantProcessSuperAdmin = () => {
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
      setFetchedLogo(`${assets.logoUrl}`);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Info
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);

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

  const [documentOptions, setDocumentOptions] = useState([]);

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/requirements`);
        const formatted = res.data.map((r) => ({
          applicant_type: String(r.applicant_type ?? 0),
          category: r.category ?? "Regular",
          is_optional: Number(r.is_optional) === 1,
          label: r.label || r.description,
          key: r.short_label || r.label || r.description?.replace(/\s+/g, ""),
        }));
        setDocumentOptions(formatted);
      } catch (err) {
        console.error("Error fetching requirements:", err);
      }
    };
    fetchRequirements();
  }, []);

  const location = useLocation();
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

    // ✅ Always pass person_id in the URL
    navigate(`//admission_personal_information?person_id=${personId}`);
  };

  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  const handleStepClick = (index, to) => {
    setActiveStep(index);
    const pid = sessionStorage.getItem("admin_edit_person_id");

    if (pid && to !== "/super_admin_applicant_list") {
      navigate(`${to}?person_id=${pid}`);
    } else {
      navigate(to);
    }
  };

  useEffect(() => {
    if (location.search.includes("person_id")) {
      navigate("/super_admin_applicant_list", { replace: true });
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

  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const pageId = 139;

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

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const loggedInPersonId = localStorage.getItem("person_id");
    const searchedPersonId = sessionStorage.getItem("admin_edit_person_id");

    if (!storedUser || !storedRole || !loggedInPersonId) {
      window.location.href = "/login";
      return;
    }

    setUser(storedUser);
    setUserRole(storedRole);

    const allowedRoles = ["registrar", "applicant", "superadmin"];
    if (allowedRoles.includes(storedRole)) {
      const targetId = queryPersonId || searchedPersonId || loggedInPersonId;
      sessionStorage.setItem("admin_edit_person_id", targetId);
      setUserID(targetId);
      return;
    }

    window.location.href = "/login";
  }, [queryPersonId]);

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
    if (user) {
      fetchPersonData();
    }
  }, [user]);

  useEffect(() => {
    if (userRole !== "registrar" || !employeeID) return;
    refreshRegistrarCurriculumId(employeeID).catch((err) => {
      console.error("Error refreshing registrar scope:", err);
    });
  }, [userRole, employeeID]);

  const cleanName = (v) => (v ?? "").trim().toLowerCase();

  const detectDuplicateNames = (list) => {
    const map = {};

    for (const p of list) {
      const ln = cleanName(p.last_name);
      const fn = cleanName(p.first_name);
      const mn = cleanName(p.middle_name);

      // Must have all 3 for strict duplicate match
      if (!ln || !fn || !mn) continue;

      const key = `${ln}|${fn}|${mn}`;

      if (!map[key]) map[key] = 0;
      map[key]++;
    }

    return (person) => {
      const ln = cleanName(person.last_name);
      const fn = cleanName(person.first_name);
      const mn = cleanName(person.middle_name);

      if (!ln || !fn || !mn) return false;

      const key = `${ln}|${fn}|${mn}`;
      return map[key] > 1;
    };
  };

  const isDuplicateApplicant = detectDuplicateNames(persons);

  // ── Name normalizer: strips accents, special chars, spaces ──
  const normalizeName = (v) =>
    (v ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")  // remove accents
      .replace(/[^a-z0-9]/g, "");       // remove dots, commas, spaces, etc.

  // ── DETECTOR 1: Suspicious name (special characters / slight variation) ──
  // Catches: "Montano." vs "Montano", "De Leon" vs "DeLeon"
  const detectSuspiciousDuplicates = (list) => {
    const map = {};
    for (const p of list) {
      const ln = normalizeName(p.last_name);
      const fn = normalizeName(p.first_name);
      const bd = p.birthOfDate ? String(p.birthOfDate).split("T")[0] : "";
      if (!ln || !fn) continue;
      const key = `${ln}|${fn}|${bd}`;
      if (!map[key]) map[key] = 0;
      map[key]++;
    }
    return (person) => {
      const ln = normalizeName(person.last_name);
      const fn = normalizeName(person.first_name);
      const bd = person.birthOfDate ? String(person.birthOfDate).split("T")[0] : "";
      if (!ln || !fn) return false;
      const key = `${ln}|${fn}|${bd}`;
      // Only flag if normalized key has duplicates BUT exact name doesn't
      // (so it doesn't overlap with isDuplicateApplicant)
      const exactLn = cleanName(person.last_name);
      const exactFn = cleanName(person.first_name);
      const exactMn = cleanName(person.middle_name);
      const exactKey = `${exactLn}|${exactFn}|${exactMn}`;
      const exactMap = {};
      for (const p of list) {
        const k = `${cleanName(p.last_name)}|${cleanName(p.first_name)}|${cleanName(p.middle_name)}`;
        if (!exactMap[k]) exactMap[k] = 0;
        exactMap[k]++;
      }
      return map[key] > 1 && exactMap[exactKey] <= 1;
    };
  };

  // ── DETECTOR 2: New account but someone with same name+birthday already took exam ──
  // Catches: person registers fresh while their old account has email_sent=1 or exam_status=1
  const detectExamTakenDuplicates = (list) => {
    const examTakenKeys = new Set();
    for (const p of list) {
      const ln = normalizeName(p.last_name);
      const fn = normalizeName(p.first_name);
      const bd = p.birthOfDate ? String(p.birthOfDate).split("T")[0] : "";
      if (!ln || !fn) continue;
      if (Number(p.email_sent) === 1 || Number(p.exam_status) === 1) {
        examTakenKeys.add(`${ln}|${fn}|${bd}`);
      }
    }
    return (person) => {
      const ln = normalizeName(person.last_name);
      const fn = normalizeName(person.first_name);
      const bd = person.birthOfDate ? String(person.birthOfDate).split("T")[0] : "";
      if (!ln || !fn) return false;
      const key = `${ln}|${fn}|${bd}`;
      // Flag only the NEW account (hasn't taken exam yet)
      return (
        examTakenKeys.has(key) &&
        Number(person.email_sent) !== 1 &&
        Number(person.exam_status) !== 1
      );
    };
  };

  const isSuspiciousDuplicate = detectSuspiciousDuplicates(persons);
  const isExamTakenDuplicate = detectExamTakenDuplicates(persons);

  // Helper to compute applicant status
  const getApplicantStatus = (personData) => {
    const status = (personData.document_status ?? "").trim().toLowerCase();
    const totalRequiredDocs = Number(personData.total_required_docs ?? 0);
    const requiredDocsVerified = Number(personData.required_docs_verified ?? 0);

    if (totalRequiredDocs > 0 && requiredDocsVerified >= totalRequiredDocs) {
      return "Documents Verified & ECAT";
    }

    // Match explicit statuses
    if (status === "disapproved") {
      return "Disapproved";
    }

    if (status === "program closed") {
      return "Program Closed";
    }

    if (status === "on process") {
      return "On Process";
    }

    // Default fallback
    return "On Process";
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
    emailAddress: "",
    extension: "",
    generalAverage: "",
    generalAverage1: "",
    strand: "",
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
  }, [settings, branches, person?.campus]);

  // ⬇️ Add this inside ApplicantList component, before useEffect
  const fetchApplicants = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/all-applicants`);
      const data = await res.json();
      setPersons(data);
    } catch (err) {
      console.error("Error fetching applicants:", err);
    }
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // holds which action to confirm
  const [confirmMessage, setConfirmMessage] = useState("");

  const handleSubmittedDocumentsChange = async (
    upload_id,
    checked,
    person_id,
  ) => {
    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/submitted-documents/${upload_id}`,
        {
          submitted_documents: checked ? 1 : 0,
          user_person_id: localStorage.getItem("person_id"),
        },
      );

      if (checked && res.data.allCompleted) {
        await handleRegistrarStatusChange(person_id, 1);
        setSnack({
          open: true,
          message:
            "All documents completed ✅ Registrar status set to Submitted",
          severity: "success",
        });
      } else if (!checked) {
        await handleRegistrarStatusChange(person_id, 0);
        setSnack({
          open: true,
          message: "Marked as Unsubmitted ❌",
          severity: "warning",
        });
      }

      fetchApplicants();
    } catch (err) {
      console.error("❌ Failed to update submitted documents:", err);
    }
  };

  const handleRegistrarStatusChange = async (person_id, status) => {
    try {
      // Optimistic UI update para sabay silang magreflect
      setPersons((prev) =>
        prev.map((p) =>
          p.person_id === person_id
            ? {
              ...p,
              registrar_status: status,
              submitted_documents: status, // sync with checkbox
              remarks: status ? 1 : 0,
              missing_documents: status ? [] : null,
            }
            : p,
        ),
      );

      await axios.put(`${API_BASE_URL}/api/registrar-status/${person_id}`, {
        registrar_status: status,
      });

      fetchApplicants();
    } catch (err) {
      console.error("❌ Failed to update registrar status:", err);
    }
  };

  useEffect(() => {
    // Replace this with your actual API endpoint
    fetch(`${API_BASE_URL}/api/all-applicants`)
      .then((res) => res.json())
      .then((data) => setPersons(data)); // ✅ Correct
  }, []);

  useEffect(() => {
    socket.current.on("document_status_updated", () => {
      fetch(`${API_BASE_URL}/api/all-applicants`)
        .then((res) => res.json())
        .then((data) => setPersons(data));
    });
    return () => socket.current.off("document_status_updated");
  }, []);

  const [curriculumOptions, setCurriculumOptions] = useState([]);

  const [selectedApplicantStatus, setSelectedApplicantStatus] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  const [selectedRegistrarStatus, setSelectedRegistrarStatus] = useState("");

  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
  const [selectedProgramFilter, setSelectedProgramFilter] = useState("");
  const [department, setDepartment] = useState([]);
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
  const selectedDepartmentFilterValue =
    selectedDepartmentFilter === "" ||
      filteredDepartments.some(
        (dep) => String(dep.dprtmnt_id) === String(selectedDepartmentFilter),
      )
      ? selectedDepartmentFilter
      : "";
  const selectedProgramFilterValue =
    selectedProgramFilter === "" ||
      filteredCurriculumOptions.some(
        (prog) => String(prog.curriculum_id) === String(selectedProgramFilter),
      )
      ? selectedProgramFilter
      : "";

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
      const applicantStatus = getApplicantStatus(personData); // use your derived status

      const matchesApplicantStatus =
        selectedApplicantStatus === "" ||
        normalize(applicantStatus) === normalize(selectedApplicantStatus);

      /* 📝 REGISTRAR STATUS */
      const matchesRegistrarStatus =
        selectedRegistrarStatus === "" ||
        (selectedRegistrarStatus === "Submitted" &&
          personData.registrar_status === 1) ||
        (selectedRegistrarStatus === "Unsubmitted / Incomplete" &&
          personData.registrar_status === 0);

      /* 🎓 PROGRAM / DEPARTMENT FILTERS */
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
        String(programInfo?.program_code) === String(selectedProgramFilter);

      const matchesDepartment =
        selectedDepartmentFilter === "" ||
        String(programInfo?.dprtmnt_id) === String(selectedDepartmentFilter);

      /* 📅 YEAR (safe date parsing) */
      const appliedDate = parseDateOnlyLocal(personData.created_at);
      if (!appliedDate) return false;
      const applicantAppliedYear = appliedDate.getFullYear();

      const schoolYear = schoolYears.find(
        (sy) => sy.year_id === selectedSchoolYear,
      );
      // If search is active, allow ALL years
      const overrideBySearch = searchQuery.trim() !== "";

      // SCHOOL YEAR FILTER
      const matchesSchoolYear =
        overrideBySearch ||
        selectedSchoolYear === "" ||
        (schoolYear &&
          String(applicantAppliedYear) === String(schoolYear.current_year));

      // SEMESTER FILTER
      const matchesSemester =
        overrideBySearch ||
        selectedSchoolSemester === "" ||
        normalize(personData.middle_code) ===
        normalize(selectedSemester?.semester_code);

      /* 📆 FROM–TO DATE RANGE (fixed 100%) */
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

      /* ✅ FINAL MATCHES */
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
        matchesDateRange
      );
    })

    /* 🔽 SORTING */
    .sort((a, b) => {
      const dateA = parseDateOnlyLocal(a.created_at) || new Date(0);
      const dateB = parseDateOnlyLocal(b.created_at) || new Date(0);

      // 🔽 Primary Sorting (what user selects)
      if (sortBy === "name") {
        const A =
          `${a.last_name} ${a.first_name} ${a.middle_name || ""}`.toLowerCase();
        const B =
          `${b.last_name} ${b.first_name} ${b.middle_name || ""}`.toLowerCase();
        const comp = A.localeCompare(B);
        if (comp !== 0) return sortOrder === "asc" ? comp : -comp;
      }

      if (sortBy === "id") {
        const comp = a.applicant_number.localeCompare(b.applicant_number);
        if (comp !== 0) return sortOrder === "asc" ? comp : -comp;
      }

      if (sortBy === "email") {
        const A = a.emailAddress?.toLowerCase() || "";
        const B = b.emailAddress?.toLowerCase() || "";
        const comp = A.localeCompare(B);
        if (comp !== 0) return sortOrder === "asc" ? comp : -comp;
      }

      // 🔽 Secondary: fallback sorting by date
      return dateA - dateB;
    });

  const [itemsPerPage, setItemsPerPage] = useState(100);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPersons.length / itemsPerPage),
  );
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
          getApplicantSuggestionText(applicant).includes(searchQuery.trim().toLowerCase()),
        )
        .slice(0, 8)
      : [];

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
    fetch(`${API_BASE_URL}/api/all-applicants`) // 👈 This is the new endpoint
      .then((res) => res.json())

      .catch((err) => console.error("Error fetching applicants:", err));
  }, []);

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

    if (
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

  const [openDialog, setOpenDialog] = useState(false);
  const [activePerson, setActivePerson] = useState(null);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (activePerson?.missing_documents) {
      try {
        setSelected(activePerson.missing_documents || []);
      } catch {
        setSelected([]);
      }
    } else {
      setSelected([]);
    }
  }, [activePerson]);

  const getDocumentOptionsForPerson = (personData) => {
    if (!personData) return [];

    const applyingAs = String(personData.applyingAs ?? "");

    return documentOptions.filter((doc) => {
      const applicantType = String(doc.applicant_type ?? 0);
      const matchesApplicantType =
        applicantType === applyingAs ||
        applicantType === "0" ||
        applicantType.toLowerCase() === "all";

      return (
        matchesApplicantType && doc.category === "Main" && !doc.is_optional
      );
    });
  };

  const handleOpenDialog = (person) => {
    setActivePerson(person);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setActivePerson(null);
    setOpenDialog(false);
  };

  const handleSaveMissingDocs = async () => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/missing-documents/${activePerson.person_id}`,
        {
          missing_documents: selected, // this is your array of checked keys
        },
      );

      setSnack({
        open: true,
        message: "Missing documents saved!",
        severity: "success",
      });

      fetchApplicants(); // reload table
      setOpenDialog(false);
    } catch (err) {
      console.error("❌ Error saving missing docs:", err);
      alert("Failed to save missing documents");
    }
  };

  const handleSnackClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  const activeDocumentOptions = getDocumentOptionsForPerson(activePerson);

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

  const handleExportApplicantListPdf = async () => {
    const resolvedCampusAddress = campusAddress || "No address set in Settings";

    const logoSrc = fetchedLogo || EaristLogo;
    const name = companyName?.trim() || "";

    const words = name.split(" ");
    const middleIndex = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, middleIndex).join(" ");
    const secondLine = words.slice(middleIndex).join(" ");

    // ✅ Department label (left corner) — selectedDepartmentFilter already
    // stores the dprtmnt_name string (see matchesDepartment filter logic),
    // so no lookup needed, just fall back when nothing's selected.
    const selectedDepartmentLabel = selectedDepartmentFilter || "All Departments";

    // ✅ Program label (right corner) — selectedProgramFilter stores
    // program_code, so look up the full description from curriculumOptions.
    const selectedProgramLabel = selectedProgramFilter
      ? curriculumOptions.find(
        (p) => p.program_code === selectedProgramFilter,
      )?.program_description || selectedProgramFilter
      : "All Programs";

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
           <div style="font-size: 12px; font-family: Arial">Republic of the Philippines</div>
 
           ${name
        ? `
               <b style="letter-spacing: 1px; font-size: 18px; font-family: Arial, sans-serif;">
                 ${firstLine}
               </b>
               ${secondLine
          ? `<div style="letter-spacing: 1px; font-size: 18px; font-family: Arial, sans-serif;">
                        <b>${secondLine}</b>
                      </div>`
          : ""
        }
             `
        : ""
      }
 
           <div style="font-size: 12px; font-family: Arial">${resolvedCampusAddress}</div>
         </div>
       </div>
 
       <div style="margin-top: 20px; text-align: center;">
         <b style="font-size: 20px; letter-spacing: 1px;">Applicant List</b>
       </div>
     </div>
 
     <div class="table-wrapper">
     <table>
       <thead>
         <tr>
           <th style="width:9%">Applicant ID</th>
           <th style="width:28%">Applicant Name</th>
           <th style="width:16%">Department</th>
           <th style="width:11%">Program</th>
           <th style="width:8%">SHS GWA</th>
           <th style="width:10%">Date Applied</th>
           <th style="width:18%">Status</th>
         </tr>
       </thead>
       <tbody>
         ${filteredPersons
        .map((person) => {
          const programInfo = allCurriculums.find(
            (item) =>
              item.curriculum_id?.toString() === person.program?.toString(),
          );
          return `
               <tr>
                 <td>${person.applicant_number || ""}</td>
                 <td class="applicant-name">${person.last_name}, ${person.first_name} ${person.middle_name || ""} ${person.extension || ""}</td>
                 <td>${programInfo?.dprtmnt_name ?? "N/A"}</td>
                 <td>${programInfo?.program_code ?? "N/A"}</td>
                 <td>${person.generalAverage1 || ""}</td>
                 <td>${new Date(
            person.created_at.split("T")[0],
          ).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "2-digit",
          })}</td>
                 <td>${getApplicantStatus(person)}</td>
               </tr>
             `;
        })
        .join("")}
       </tbody>
     </table>
     </div>
   `;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/generate-applicant-list-pdf`,
        { html: innerHtml },
        {
          responseType: "blob",
          headers: getFlatAuditHeaders({
            "x-employee-id": employeeID,
            "x-page-id": pageId,
          }),
        },
      );

      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `Applicant_List_${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to generate Applicant List PDF:", err);
      setSnack({
        open: true,
        message: "Failed to generate Applicant List PDF.",
        severity: "error",
      });
    }
  };

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const handleCloseSnackbar = () =>
    setSnackbar((prev) => ({ ...prev, open: false }));

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [openAddApplicant, setOpenAddApplicant] = useState(false);

  const [applicantForm, setApplicantForm] = useState({
    last_name: "",
    first_name: "",
    middle_name: "",
    birthOfDate: "",
    applyingAs: "",
    academicProgram: "",
    program: "", // ✅ NEW — the actual course/curriculum applied for (curriculum_id)
    email: "",
    password: "",
  });

  const filteredAddApplicantCurriculum = React.useMemo(() => {
    const filtered = curriculumOptions.filter((item) => {
      if (Number(item.e_status ?? 0) === 1) return false;

      if (
        applicantForm.academicProgram !== "" &&
        applicantForm.academicProgram !== null
      ) {
        if (
          Number(item.academic_program) !==
          Number(applicantForm.academicProgram)
        ) {
          return false;
        }
      }

      return true;
    });

    // ✅ De-dupe: /api/applied_program can return the same curriculum more
    // than once (e.g. BSENTREP showing up 4x with identical slot counts).
    // Keep the first occurrence per curriculum_id so the dropdown only
    // lists each program once.
    const seen = new Set();
    const deduped = [];
    for (const item of filtered) {
      const dedupeKey =
        item.curriculum_id ??
        `${item.program_code}|${item.major ?? ""}|${item.components ?? ""}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      deduped.push(item);
    }

    return deduped;
  }, [curriculumOptions, applicantForm.academicProgram]);

  const handleAddApplicant = async () => {
    if (!canCreate) {
      setSnack({
        open: true,
        message: "You do not have permission to create applicants.",
        severity: "warning",
      });
      return;
    }

    if (!applicantForm.program) {
      setSnack({
        open: true,
        message: "Please select the Course/Program the applicant is applying for.",
        severity: "warning",
      });
      return;
    }

    try {
      const payload = {
        email: applicantForm.email,
        password: applicantForm.password,
        first_name: applicantForm.first_name,
        middle_name: applicantForm.middle_name,
        last_name: applicantForm.last_name,
        birthOfDate: applicantForm.birthOfDate,
        academicProgram: applicantForm.academicProgram,
        applyingAs: applicantForm.applyingAs,
        program: applicantForm.program, // ✅ NEW — curriculum_id saved to person_table.program
      };

      const res = await axios.post(
        `${API_BASE_URL}/api/add-applicant`,
        payload,
        auditHeaders(),
      );

      setSnackbar(
        `Applicant created! Applicant Number: ${res.data.applicant_number}`,
      );

      setOpenAddApplicant(false);

      setApplicantForm({
        last_name: "",
        first_name: "",
        middle_name: "",
        birthOfDate: "",
        applyingAs: "",
        academicProgram: "",
        program: "",
        email: "",
        password: "",
      });

      fetchApplicants();
    } catch (error) {
      console.error(error);
      setSnackbar(error.response?.data?.message || "Error adding applicant");
    }
  };

  const handleApplicantChange = (e) => {
    const { name, value } = e.target;
    setApplicantForm((prev) => {
      const updated = { ...prev, [name]: value };
      // Changing Academic Program invalidates whatever Course was picked,
      // since the course list is scoped to the academic program.
      if (name === "academicProgram") {
        updated.program = "";
      }
      return updated;
    });
  };



  const handleDeleteAccount = async (person_id) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/delete-account/${person_id}`, {
        headers: getFlatAuditHeaders({
          "x-employee-id": employeeID,
          "x-page-id": pageId,
        }),
      });

      setSnack({
        open: true,
        message: "Account archived successfully",
        severity: "success",
      });

      fetchApplicants(); // refresh table
    } catch (error) {
      console.error(error);

      setSnack({
        open: true,
        message: "Failed to archive account",
        severity: "error",
      });
    }
  };

  const [programAvailability, setProgramAvailability] = useState([]);
  const [activeYearId, setActiveYearId] = useState(null);
  const [activeSemesterId, setActiveSemesterId] = useState(null);

  useEffect(() => {
    const fetchActiveYearAndAvailability = async () => {
      const yearRes = await axios.get(`${API_BASE_URL}/api/active_school_year`);
      const activeYear = yearRes.data[0];

      if (activeYear) {
        setActiveYearId(activeYear.year_id);
        setActiveSemesterId(activeYear.semester_id);

        const availRes = await axios.get(
          `${API_BASE_URL}/api/programs/availability`,
          {
            params: {
              year_id: activeYear.year_id,
              semester_id: activeYear.semester_id,
            },
          }
        );

        setProgramAvailability(availRes.data);
      }
    };

    fetchActiveYearAndAvailability();
  }, []);

  const availabilityMap = React.useMemo(() => {
    const map = {};
    programAvailability.forEach((p) => {
      map[p.curriculum_id] = {
        remaining: Number(p.remaining),
        isFull: Number(p.remaining) <= 0,
        e_status: Number(p.e_status ?? 0),
      };
    });
    return map;
  }, [programAvailability]);

  const filteredCurriculum = curriculumOptions.filter((item) => {
    // Hide programs with e_status = 1 (except currently selected choice)
    const isSelected =
      String(item.curriculum_id) === String(person.program) ||
      String(item.curriculum_id) === String(person.program2) ||
      String(item.curriculum_id) === String(person.program3);
    const eStatus =
      availabilityMap[item.curriculum_id]?.e_status ?? Number(item.e_status ?? 0);
    if (!isSelected && eStatus === 1) {
      return false;
    }

    // ✅ CAMPUS FILTER


    // ✅ ACADEMIC PROGRAM FILTER
    if (person.academicProgram !== "" && person.academicProgram !== null) {
      if (
        Number(item.academic_program) !==
        Number(person.academicProgram)
      ) {
        return false;
      }
    }

    return true;
  });


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
        <Typography variant="h4" fontWeight="bold" sx={{ color: titleColor }}>
          ADD APPLICANT ACCOUNT / REQUEST ACCOUNT DELETION
        </Typography>
        <Box sx={{ position: "relative", width: 450 }}>
          <TextField
            variant="outlined"
            placeholder="Search Applicant Name / Email / Applicant ID"
            size="small"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Corrected
              setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
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
            <Box sx={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, mt: 0.5, maxHeight: 260, overflowY: "auto", backgroundColor: "#fff", border: "1px solid #d6d6d6", borderRadius: 1, boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}>
              {applicantSuggestions.length > 0 ? (
                applicantSuggestions.map((applicant) => {
                  const applicantNumber = cleanSuggestionValue(applicant?.applicant_number);
                  const name = [applicant?.last_name, applicant?.first_name, applicant?.middle_name]
                    .map(cleanSuggestionValue)
                    .filter(Boolean)
                    .join(", ");
                  const email = cleanSuggestionValue(applicant?.emailAddress || applicant?.email);

                  return (
                    <Box key={`${applicantNumber}-${email}`} onMouseDown={(e) => { e.preventDefault(); setSearchQuery(getApplicantSuggestionValue(applicant)); setCurrentPage(1); setSuggestionsOpen(false); }} sx={{ px: 2, py: 1, cursor: "pointer", display: "flex", alignItems: "center", gap: 1, fontSize: 14, borderBottom: "1px solid #f0f0f0", "&:hover": { backgroundColor: "#f5f7fb" } }}>
                      <Typography component="span" sx={{ fontWeight: 700, minWidth: 120 }}>{applicantNumber || "No applicant ID"}</Typography>
                      <Typography component="span" sx={{ color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[name, email].filter(Boolean).join(" - ")}</Typography>
                    </Box>
                  );
                })
              ) : (
                <Box sx={{ px: 2, py: 1, color: "#777", fontSize: 14 }}>No matching applicants</Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />

      <br />
      <br />

      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}` }}
      >
        <Table>
          <TableHead
            sx={{
              backgroundColor: headerColor || "#1976d2",
            }}
          >
            <TableRow>
              <TableCell sx={{ color: "white", textAlign: "center" }}>
                Application Date
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
          {/* Left Side: Campus Dropdown */}
          {/* Left Side: Campus Dropdown */}
          <Box
            display="flex"
            flexDirection="column"
            gap={1}
            sx={{ minWidth: 200 }}
          >
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



          {/* Right Side: Print Button + Dates (in one row) */}
          <Box display="flex" alignItems="flex-end" gap={2}>
            <Button
              sx={{ width: "250px" }}
              variant="contained"
              onClick={() => setOpenAddApplicant(true)}
            >
              Add Applicant
            </Button>

            {/* Print Button */}

            <button
              onClick={handleExportApplicantListPdf}
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
                gap: "8px",
                userSelect: "none",
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
              Download Applicant List
            </button>

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
      </TableContainer>

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead
            sx={{
              backgroundColor: headerColor || "#1976d2",
              color: "white",
            }}
          >
            <TableRow>
              <TableCell
                colSpan={10}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor || "#1976d2",
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
                    Total Applicant's Records {filteredPersons.length}
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

            {/* Applicant Status */}
            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "140px" }}>
                Applicant Status:
              </Typography>
              <FormControl size="small" sx={{ width: "275px" }}>
                <Select
                  value={selectedApplicantStatus}
                  onChange={(e) => setSelectedApplicantStatus(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">Select status</MenuItem>
                  <MenuItem value="On Process">On Process</MenuItem>
                  <MenuItem value="Documents Verified & ECAT">
                    Documents Verified & ECAT
                  </MenuItem>
                  <MenuItem value="Disapproved / Program Closed">
                    Disapproved / Program Closed
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* 
                          <Typography fontSize={13} sx={{ minWidth: "140px" }}>Registrar Status:</Typography>
                          <FormControl size="small" sx={{ width: "275px" }}>
                              <Select
                                  value={selectedRegistrarStatus}
                                  onChange={(e) => setSelectedRegistrarStatus(e.target.value)}
                                  displayEmpty
                              >
                                  <MenuItem value="">Select status</MenuItem>
                                  <MenuItem value="Submitted">Submitted</MenuItem>
                                  <MenuItem value="Unsubmitted / Incomplete">Unsubmitted / Incomplete</MenuItem>
                              </Select>
                          </FormControl> */}

            <FormControl
              size="small"
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Checkbox
                checked={showSubmittedOnly}
                onChange={(e) => setShowSubmittedOnly(e.target.checked)}
                sx={{ color: "maroon", "&.Mui-checked": { color: "maroon" } }}
              />
              <Typography fontSize={13}>Show Submitted Only</Typography>
            </FormControl>


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
                <InputLabel>School Semester</InputLabel>
                <Select
                  label="School Semester"
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
                  onChange={(e) => {
                    const selectedDept = e.target.value;
                    setSelectedDepartmentFilter(selectedDept);
                    handleDepartmentChange(selectedDept);
                  }}
                  displayEmpty
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {department.map((dep) => (
                    <MenuItem key={dep.dprtmnt_id} value={String(dep.dprtmnt_id)}>
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
                  onChange={(e) => setSelectedProgramFilter(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">All Programs</MenuItem>
                  {filteredCurriculumOptions.map((prog) => (
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

        <Box display="flex" flexDirection="column" alignItems="center" gap={1} mb={1}>
          <Typography fontSize={16} fontWeight="bold">Color Indication</Typography>
          <Box display="flex" justifyContent="center" gap={2} flexWrap="wrap">
            <Box display="flex" alignItems="center" gap={0.5}>
              <Box sx={{ width: 16, height: 16, backgroundColor: "#A5D6A7", border: "1px solid #ccc", borderRadius: 0.5 }} />
              <Typography fontSize={12}>Submitted Documents</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Box sx={{ width: 16, height: 16, backgroundColor: "#EF9A9A", border: "1px solid #ccc", borderRadius: 0.5 }} />
              <Typography fontSize={12}>Exam Schedule Sent</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Box sx={{ width: 16, height: 16, backgroundColor: "#FFCC80", border: "1px solid #ccc", borderRadius: 0.5 }} />
              <Typography fontSize={12}>Duplicate / Suspicious / Re-registration Detected</Typography>
            </Box>
          </Box>
        </Box>
      </TableContainer>

      <div ref={divToPrintRef}></div>

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead
            sx={{ backgroundColor: headerColor || "#1976d2" }}
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
                  width: "3%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Submitted Orig Documents
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "4%",
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
                  width: "6%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Birth of Date
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
                Email Address
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
                JHS GWA
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
                Strand
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
                Date Applied
              </TableCell>

              <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "16%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Applicant Status
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
                Remarks
              </TableCell>
              {/* <TableCell
                sx={{
                  color: "white",
                  textAlign: "center",
                  width: "15%",
                  py: 0.5,
                  fontSize: "12px",
                  border: `1px solid ${borderColor}`,
                }}
              >
                Delete Account
              </TableCell> */}
              {/* <TableCell sx={{ color: "white", textAlign: "center", width: "8%", py: 0.5, fontSize: "12px", border: `1px solid ${borderColor}` }}>
                                Registrar Status
                            </TableCell> */}
            </TableRow>
          </TableHead>
          {/* --- Confirmation Dialog --- */}
          <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogContent>
              {confirmMessage ||
                "Are you sure you want to update this applicant's status?"}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setConfirmOpen(false)}
                color="error"
                variant="outlined"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (confirmAction) await confirmAction();
                  setConfirmOpen(false);
                  fetchApplicants();
                }}
                variant="contained"
              >
                Yes, Confirm
              </Button>
            </DialogActions>
          </Dialog>

          <TableBody>
            {currentPersons.map((person, index) => (
              <TableRow
                key={person.person_id}
                sx={{
                  backgroundColor: (() => {
                    const hasSubmitted = Number(person.submitted_documents) === 1;
                    const isAnyDuplicate =
                      isDuplicateApplicant(person) ||
                      isSuspiciousDuplicate(person) ||
                      isExamTakenDuplicate(person);
                    const hasExamSent = person.schedule_id && Number(person.email_sent) === 1;

                    if (hasSubmitted) return "#A5D6A7";  // green     — submitted documents
                    if (isAnyDuplicate) return "#FFCC80";  // medium salmon orange — duplicate / suspicious
                    if (hasExamSent) return "#90CAF9";  // sky blue  — exam schedule sent

                    return index % 2 === 0 ? "#ffffff" : "lightgray";
                  })(),

                  color: "black",

                  "& td:not(.clickable-cell)": {
                    color: "black",
                  },

                  fontWeight:
                    Number(person.submitted_documents) === 1 ||
                      isDuplicateApplicant(person) ||
                      isSuspiciousDuplicate(person) ||
                      isExamTakenDuplicate(person) ||
                      (person.schedule_id && Number(person.email_sent) === 1)
                      ? "bold"
                      : "normal",
                }}
              >
                {/* # */}
                <TableCell
                  sx={{
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                    fontSize: "12px",
                  }}
                >
                  {index + 1}
                </TableCell>

                {/* Submitted Checkbox */}
                <TableCell
                  sx={{
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                    fontSize: "12px",
                  }}
                >
                  <Checkbox
                    disabled
                    checked={Number(person.submitted_documents) === 1}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setConfirmMessage(
                        `Are you sure you want to mark this applicant's Original Documents as ${checked ? "Submitted" : "Unsubmitted"}?`,
                      );
                      setConfirmAction(() => async () => {
                        setPersons((prev) =>
                          prev.map((p) =>
                            p.person_id === person.person_id
                              ? { ...p, submitted_documents: checked ? 1 : 0 }
                              : p,
                          ),
                        );
                        await handleSubmittedDocumentsChange(
                          person.upload_id,
                          checked,
                          person.person_id,
                        );
                      });
                      setConfirmOpen(true);
                    }}
                    sx={{
                      color: mainButtonColor,
                      "&.Mui-checked": { color: mainButtonColor },
                      width: 25,
                      height: 25,
                      padding: 0,
                      "& svg": { width: 25, height: 25 }, // ensures the check icon scales correctly
                    }}
                  />
                </TableCell>

                {/* Applicant ID */}
                <TableCell
                  className="clickable-cell"
                  sx={{
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                    cursor: "pointer",
                    color: "blue",
                    fontSize: "12px",
                  }}
                  onClick={() => handleRowClick(person)}
                >
                  {person.applicant_number ?? "N/A"}
                </TableCell>

                {/* Name */}
                <TableCell
                  className="clickable-cell"
                  sx={{
                    textAlign: "left",
                    border: `1px solid ${borderColor}`,
                    cursor: "pointer",
                    color: "blue",
                    fontSize: "12px",
                  }}
                  onClick={() => handleRowClick(person)}
                >
                  {`${person.last_name}, ${person.first_name} ${person.middle_name ?? ""} ${person.extension ?? ""}`}
                </TableCell>

                <TableCell
                  sx={{
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                    fontSize: "12px",
                  }}
                >
                  {(() => {
                    if (!person.birthOfDate) return ""; // handle null/undefined

                    const isoDate = person.birthOfDate.split("T")[0]; // get YYYY-MM-DD
                    const date = new Date(isoDate);

                    // If invalid date, just return raw string
                    if (isNaN(date.getTime())) return isoDate;

                    // Format nicely
                    return date.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    });
                  })()}
                </TableCell>

                <TableCell
                  sx={{
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                    fontSize: "12px",
                  }}
                >
                  {person.emailAddress || ""}
                </TableCell>

                {/* Program */}
                <TableCell
                  sx={{
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                    fontSize: "12px",
                  }}
                >
                  {allCurriculums.find(
                    (item) =>
                      item.curriculum_id?.toString() ===
                      person.program?.toString(),
                  )?.program_code ?? "N/A"}
                </TableCell>
                <TableCell
                  sx={{
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                    fontSize: "12px",
                  }}
                >
                  {person.generalAverage || "0"}
                </TableCell>

                <TableCell
                  sx={{
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                    fontSize: "12px",
                  }}
                >
                  {person.generalAverage1 || "0"}
                </TableCell>

                {/* Strand */}
                <TableCell
                  sx={{
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                    fontSize: "12px",
                  }}
                >
                  {person.strand}
                </TableCell>

                {/* Date Applied */}
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

                {/* Status */}
                <TableCell
                  sx={{
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                    fontSize: "12px",
                  }}
                >
                  {getApplicantStatus(person)}
                </TableCell>

                {/* Docs Button */}
                <TableCell
                  sx={{
                    border: `1px solid ${borderColor}`,
                    textAlign: "center",
                    verticalAlign: "middle",

                    p: 0,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                      minHeight: "42px",
                      marginRight: "10px",
                      marginLeft: "10px",
                    }}
                  >
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleOpenDialog(person)}
                      sx={{
                        width: "160px",
                        backgroundColor:
                          person.submitted_documents === 1 &&
                            person.registrar_status === 1 &&
                            Array.isArray(person.missing_documents) &&
                            person.missing_documents.length === 0
                            ? "#4CAF50"
                            : Array.isArray(person.missing_documents) &&
                              person.missing_documents.length > 0
                              ? "#FFD580"
                              : "#D6F0FF",
                        border: `1px solid ${borderColor}`,
                        color:
                          person.submitted_documents === 1 &&
                            person.registrar_status === 1 &&
                            Array.isArray(person.missing_documents) &&
                            person.missing_documents.length === 0
                            ? "white"
                            : "black",
                        fontWeight: "bold",
                        fontSize: "0.875rem",
                        whiteSpace: "nowrap",
                        "&:hover": {
                          backgroundColor:
                            person.submitted_documents === 1 &&
                              person.registrar_status === 1 &&
                              Array.isArray(person.missing_documents) &&
                              person.missing_documents.length === 0
                              ? "#45A049"
                              : Array.isArray(person.missing_documents) &&
                                person.missing_documents.length > 0
                                ? "#FFC04D"
                                : "#B9E3FF",
                        },
                      }}
                    >
                      {person.submitted_documents === 1 &&
                        person.registrar_status === 1 &&
                        Array.isArray(person.missing_documents) &&
                        person.missing_documents.length === 0
                        ? "✅ Completed"
                        : "📋 Missing Docs"}
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

          <Dialog
            open={openDialog}
            onClose={handleCloseDialog}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle
              sx={{
                background: headerColor || "#9E0000",
                color: "#fff",
                fontWeight: 700,
                fontSize: "1.2rem",
                py: 2,
              }}
            >
              {Array.isArray(activePerson?.missing_documents) &&
                activePerson.missing_documents.length === 0 &&
                activePerson?.submitted_documents === 1 &&
                activePerson?.registrar_status === 1
                ? "✅ Completed All Documents"
                : "Mark Missing Documents"}
            </DialogTitle>

            <DialogContent
              sx={{ maxHeight: 400, overflowY: "auto", p: 3, mt: 2 }}
            >
              {activeDocumentOptions.length === 0 ? (
                <Typography sx={{ textAlign: "center", color: "gray", mt: 2 }}>
                  No requirements found in database.
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 1.5,
                    alignItems: "center",
                  }}
                >
                  {activeDocumentOptions.map((doc) => {
                    const selectedArray = Array.isArray(
                      activePerson?.missing_documents,
                    )
                      ? activePerson.missing_documents
                      : [];

                    const isCompleted =
                      selectedArray.length === 0 &&
                      activePerson?.submitted_documents === 1 &&
                      activePerson?.registrar_status === 1;

                    return (
                      <FormControlLabel
                        key={doc.key}
                        control={
                          <Checkbox
                            disabled
                            checked={
                              isCompleted
                                ? true
                                : selectedArray.includes(doc.key)
                            }

                            onChange={(e) => {
                              if (isCompleted) return;
                              const updated = e.target.checked
                                ? [...selectedArray, doc.key]
                                : selectedArray.filter((x) => x !== doc.key);
                              setActivePerson((prev) =>
                                prev
                                  ? { ...prev, missing_documents: updated }
                                  : prev,
                              );
                            }}
                          />
                        }
                        label={doc.label}
                        sx={{
                          backgroundColor: "#fdfdfd",
                          borderRadius: "8px",
                          px: 1,
                          py: 0.5,
                          border: "1px solid #ddd",
                        }}
                      />
                    );
                  })}
                </Box>
              )}
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button
                color="error"
                variant="outlined"
                onClick={handleCloseDialog}
              >
                Cancel
              </Button>
              {!(
                Array.isArray(activePerson?.missing_documents) &&
                activePerson.missing_documents.length === 0 &&
                activePerson?.submitted_documents === 1 &&
                activePerson?.registrar_status === 1
              ) && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSaveMissingDocs}
                  >
                    Save
                  </Button>
                )}
            </DialogActions>
          </Dialog>
        </Table>
      </TableContainer>

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead
            sx={{
              backgroundColor: headerColor || "#1976d2",
              color: "white",
            }}
          >
            <TableRow>
              <TableCell
                colSpan={10}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor || "#1976d2",
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
                    Total Applicant's Records {filteredPersons.length}
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

      <Dialog
        open={openDeleteDialog}
        onClose={() => { setOpenDeleteDialog(false); setAccountToDelete(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{
            background: headerColor || "#9E0000",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.2rem",
            py: 2,
          }}
        >
          Delete Account
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete the account of{" "}
            <strong>{accountToDelete?.first_name} {accountToDelete?.last_name}</strong>{" "}
            (Applicant No.: <strong>{accountToDelete?.applicant_number || "N/A"}</strong>)?
          </Typography>

          <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
            The deleted account will be archived and will no longer appear
            in the applicant list.
            <br />
            It can be restored later if needed.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            color="error"
            variant="outlined"
            onClick={() => { setOpenDeleteDialog(false); setAccountToDelete(null); }}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              handleDeleteAccount(accountToDelete.person_id);
              setOpenDeleteDialog(false);
              setAccountToDelete(null);
            }}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Modal open={openAddApplicant} onClose={() => setOpenAddApplicant(false)}>
        <Box
          sx={{
            width: { xs: "95%", md: 900 },
            bgcolor: "background.paper",
            borderRadius: 3,
            boxShadow: 6,
            overflow: "hidden", // IMPORTANT: fixes header border radius
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)", // perfectly center
            p: 0,
          }}
        >
          {/* HEADER */}
          <Box
            sx={{
              background: headerColor || "#1976d2",
              color: "#fff",
              px: 3,
              py: 2,
              fontWeight: 700,
              fontSize: "1.2rem",
            }}
          >
            Add Applicant
          </Box>

          {/* CONTENT */}
          <Box sx={{ p: 3 }}>
            {/* PERSONAL INFO */}
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              Personal Information
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Last Name"
                  name="last_name"
                  fullWidth
                  value={applicantForm.last_name}
                  onChange={handleApplicantChange}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  label="First Name"
                  name="first_name"
                  fullWidth
                  value={applicantForm.first_name}
                  onChange={handleApplicantChange}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  label="Middle Name"
                  name="middle_name"
                  fullWidth
                  value={applicantForm.middle_name}
                  onChange={handleApplicantChange}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <DateField
                  label="Birthdate"
                  name="birthOfDate"
                  fullWidth
                  value={applicantForm.birthOfDate}
                  onChange={handleApplicantChange}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="applying-as-label">Applying As</InputLabel>

                  <Select
                    labelId="applying-as-label"
                    name="applyingAs"
                    value={applicantForm.applyingAs}
                    label="Applying As"
                    onChange={handleApplicantChange}
                  >
                    <MenuItem value="">
                      <em>Select Applying</em>
                    </MenuItem>
                    <MenuItem value="1">Senior High School Graduate</MenuItem>
                    <MenuItem value="2">
                      Senior High School Graduating Student
                    </MenuItem>
                    <MenuItem value="3">
                      ALS (Alternative Learning System) Passer
                    </MenuItem>
                    <MenuItem value="4">
                      Transferee from other University/College
                    </MenuItem>
                    <MenuItem value="5">Cross Enrolee Student</MenuItem>
                    <MenuItem value="6">Foreign Applicant/Student</MenuItem>
                    <MenuItem value="7">Baccalaureate Graduate</MenuItem>
                    <MenuItem value="8">Master Degree Graduate</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* ACADEMIC DETAILS */}
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ mt: 4, mb: 2 }}
            >
              Academic Details
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="academic-program-label">
                    Academic Program
                  </InputLabel>

                  <Select
                    labelId="academic-program-label"
                    name="academicProgram"
                    value={applicantForm.academicProgram}
                    label="Academic Program"
                    onChange={handleApplicantChange}
                  >
                    <MenuItem value="">
                      <em>Select Program</em>
                    </MenuItem>

                    <MenuItem value="0">Undergraduate</MenuItem>
                    <MenuItem value="1">Graduate</MenuItem>
                    <MenuItem value="2">Techvoc</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* ✅ NEW — Course Applied (curriculum_id). This is the field that
                  actually gets saved into person_table.program and is what the
                  Applicant List table/PDF and Program filter dropdown read from. */}
              <Grid item xs={12} md={6}>
                <FormControl
                  fullWidth
                  required

                >
                  <InputLabel>Course Applied</InputLabel>
                  <Select
                    name="program"
                    value={applicantForm.program || ""}
                    onChange={handleApplicantChange}
                    label="Course Applied"
                  >
                    <MenuItem value="">
                      <em>Select Program</em>
                    </MenuItem>

                    {filteredAddApplicantCurriculum.map((item, index) => {
                      const availability =
                        availabilityMap[item.curriculum_id];
                      const remaining = availability?.remaining ?? 0;
                      const isFull = availability?.isFull;
                      const branchLabel =
                        branches.find(
                          (b) => String(b.id) === String(item.components),
                        )?.branch ?? "";

                      return (
                        <MenuItem
                          key={item.curriculum_id ?? index}
                          value={item.curriculum_id}
                          disabled={isFull}
                          sx={{
                            color: isFull ? "red" : "inherit",
                            fontWeight: isFull ? "bold" : "normal",
                          }}
                        >
                          {`(${item.program_code}): ${item.program_description}${item.major ? ` (${item.major})` : ""
                            }${branchLabel ? ` (${branchLabel})` : ""}`}

                          {/* Slot info */}
                          {isFull ? (
                            <span style={{ marginLeft: 8 }}>
                              — FULL (0 slots left)
                            </span>
                          ) : (
                            <span
                              style={{ marginLeft: 8, color: "#2e7d32" }}
                            >
                              ({remaining} slots left)
                            </span>
                          )}
                        </MenuItem>
                      );
                    })}
                  </Select>


                </FormControl>
              </Grid>
            </Grid>

            {/* ACCOUNT DETAILS */}
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ mt: 4, mb: 2 }}
            >
              Account Details
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  name="email"
                  fullWidth
                  value={applicantForm.email}
                  onChange={handleApplicantChange}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Password"
                  type="password"
                  name="password"
                  fullWidth
                  value={applicantForm.password}
                  onChange={handleApplicantChange}
                />
              </Grid>
            </Grid>
          </Box>

          {/* ACTIONS */}
          <Box
            sx={{
              px: 3,
              py: 2,
              borderTop: "1px solid #e0e0e0",
              display: "flex",
              justifyContent: "flex-end",
              gap: 2,
            }}
          >
            <Button
              onClick={() => setOpenAddApplicant(false)}
              color="error"
              variant="outlined"
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              sx={{
                px: 4,
                fontWeight: 600,
                textTransform: "none",
              }}
              onClick={handleAddApplicant}
              startIcon={<SaveIcon fontSize="small" />}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default ApplicantProcessSuperAdmin;
