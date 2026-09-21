import {
  Box,
  Button,
  Typography,
  TextField,
  Snackbar,
  Alert,
  Avatar,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Checkbox,
  FormControl,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Switch,

  FormControlLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import DateField from "../components/DateField";
import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import { InsertPageBreak, Search } from "@mui/icons-material";
import { useLocation } from "react-router-dom";
import axios from "axios";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import RegistrarEnrollmentTabs from "../components/RegistrarEnrollmentTabs";
import SearchIcon from "@mui/icons-material/Search";
import { FcPrint } from "react-icons/fc";
import API_BASE_URL from "../apiConfig";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RuleIcon from "@mui/icons-material/Rule";
import BagongPilipinasLogo from "../assets/bagongpilipinas.png";
import Ukas from "../assets/ukas.png";
import Act from "../assets/act.png";
import Iaf from "../assets/iaf.png";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import PhotoCaptureDialog from "../components/PhotoCaptureDialog";
import SaveIcon from "@mui/icons-material/Save";

const cleanSuggestionValue = (value) => {
  if (value === null || value === undefined) return "";

  const text = String(value).trim();

  return ["null", "undefined"].includes(text.toLowerCase())
    ? ""
    : text;
};

const formatSuggestionName = (student) =>
  [
    cleanSuggestionValue(student?.first_name),
    cleanSuggestionValue(student?.middle_name),
    cleanSuggestionValue(student?.last_name),
  ]
    .filter(Boolean)
    .join(" ");


const formatStudentFullName = (student) => {
  if (!student) return "";

  const clean = (value) => {
    if (value === null || value === undefined) return "";

    const text = String(value).trim();

    if (
      !text ||
      text.toLowerCase() === "null" ||
      text.toLowerCase() === "undefined"
    ) {
      return "";
    }

    return text;
  };

  const lastName = clean(
    student.last_name ??
    student.family_name ??
    student.lastname ??
    student.lastName
  );

  const firstName = clean(
    student.first_name ??
    student.given_name ??
    student.firstname ??
    student.firstName
  );

  const middleName = clean(
    student.middle_name ??
    student.middleName ??
    student.middlename
  );

  const extension = clean(
    student.extension ??
    student.ext ??
    student.name_extension ??
    student.suffix
  );

  const nameParts = [
    firstName,
    middleName,
    extension,
  ].filter(Boolean);

  if (lastName && nameParts.length > 0) {
    return `${lastName}, ${nameParts.join(" ")}`.toUpperCase();
  }

  if (lastName) {
    return lastName.toUpperCase();
  }

  return nameParts.join(" ").toUpperCase();
};

const TOR_EDIT_OPTIONS = [
  {
    key: "capturePhoto",
    label: "Capture Photo",
    description: "Take a photo and save it as the student's profile image",
    icon: <CameraAltIcon sx={{ fontSize: 32 }} />,
    color: "#0277bd",
    bg: "#e1f5fe",
  },

  {
    key: "documentNumber",
    label: "Edit Document Number",
    description: "Set the document number printed on every page",
    icon: <EditNoteIcon sx={{ fontSize: 32 }} />,
    color: "#00695c",
    bg: "#e0f2f1",
  },
  {
    key: "remarks",
    label: "Edit Remarks",
    description: "Note shown in the REMARKS field on every page",
    icon: <EditNoteIcon sx={{ fontSize: 32 }} />,
    color: "#1976d2",
    bg: "#e3f2fd",
  },
  {
    key: "admissionCredentials",
    label: "Edit Admission Credentials",
    description: "Text shown in the ADMISSION CREDENTIALS field",
    icon: <EditNoteIcon sx={{ fontSize: 32 }} />,
    color: "#c2410c",
    bg: "#fff3e0",
  },
  {
    key: "footerNotes",
    label: "Edit Credits / Institution Note",
    description: "Credits line and institution note in the footer",
    icon: <EditNoteIcon sx={{ fontSize: 32 }} />,
    color: "#6a1b9a",
    bg: "#f3e5f5",
  },
  {
    key: "gradingSystem",
    label: "Edit Grading System",
    description: "Grade, score range, and description rows",
    icon: <RuleIcon sx={{ fontSize: 32 }} />,
    color: "#2e7d32",
    bg: "#e8f5e9",
  },
  {
    key: "signatories",
    label: "Edit Signatories",
    description: "Names, designations, and signature images",
    icon: <EditNoteIcon sx={{ fontSize: 32 }} />,
    color: "#0288d1",
    bg: "#e0f7fa",
  },
];

const VALID_TOR_ROLES = ["prepared_by", "checked_by", "registrar"];

const TranscriptOfRecords = () => {
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
    setBranches(settings?.branches || []);
  }, [settings]);



  const [logoDataUris, setLogoDataUris] = useState({
    bagongPilipinas: null,
    school: null,
    act: null,
    ukas: null,
    iaf: null,
  });
  const toDataUri = async (url) => {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error("Failed to convert logo to data URI:", url, err);
      return null;
    }
  };

  // Bagong Pilipinas logo — bundled asset, only needs to run once
  useEffect(() => {
    (async () => {
      const bp = await toDataUri(BagongPilipinasLogo);
      setLogoDataUris((prev) => ({ ...prev, bagongPilipinas: bp }));
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const [actUri, ukasUri, iafUri] = await Promise.all([
        toDataUri(Act),
        toDataUri(Ukas),
        toDataUri(Iaf),
      ]);
      setLogoDataUris((prev) => ({ ...prev, act: actUri, ukas: ukasUri, iaf: iafUri }));
    })();
  }, []);

  // School logo — re-run if the dynamic settings logo changes
  useEffect(() => {
    (async () => {
      const sl = await toDataUri(fetchedLogo || EaristLogo);
      setLogoDataUris((prev) => ({ ...prev, school: sl }));
    })();
  }, [fetchedLogo]);

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

  const [campusAddress, setCampusAddress] = useState("");
  const [gradeConversion, setGradeConversions] = useState([]);



  const [remarks, setRemarks] = useState("");
  const [admissionCredentialsNote, setAdmissionCredentialsNote] = useState("");
  const [creditsNote, setCreditsNote] = useState("");
  const [institutionNote, setInstitutionNote] = useState("");
  const [institutionWebsite, setInstitutionWebsite] = useState("");

  const [documentNumbers, setDocumentNumbers] = useState([]);
  const [printOnSecurityPaper, setPrintOnSecurityPaper] = useState(false);

  const getDocumentNumber = (pageIndex) => documentNumbers[pageIndex] || "";

  const setDocumentNumberForPage = (pageIndex, value) => {
    setDocumentNumbers((prev) => {
      const next = [...prev];
      next[pageIndex] = value;
      return next;
    });
  };

  const [documentNumberDialogOpen, setDocumentNumberDialogOpen] = useState(false);
  const [documentNumberDraft, setDocumentNumberDraft] = useState([]); // array, index = page

  const openDocumentNumberDialog = () => {
    const totalPages = Math.max(paginatedSubjects.length, 1);
    setDocumentNumberDraft(
      Array.from({ length: totalPages }, (_, i) => documentNumbers[i] || "")
    );
    setDocumentNumberDialogOpen(true);
  };

  const closeDocumentNumberDialog = () => setDocumentNumberDialogOpen(false);

  const handleDocumentNumberDraftChange = (pageIndex, value) => {
    setDocumentNumberDraft((prev) => {
      const next = [...prev];
      next[pageIndex] = value;
      return next;
    });
  };

  const handleSaveDocumentNumber = () => {
    const cleaned = documentNumberDraft.map((v) => (v || "").trim());
    setDocumentNumbers(cleaned);
    setSnackbarSeverity("success");
    setSnackbarMessage("Document numbers saved.");
    setOpenSnackbar(true);
    setDocumentNumberDialogOpen(false);
  };

  const [remarksDialogOpen, setRemarksDialogOpen] = useState(false);
  const [remarksDraft, setRemarksDraft] = useState("");

  const [footerNotesDialogOpen, setFooterNotesDialogOpen] = useState(false);
  const [creditsNoteDraft, setCreditsNoteDraft] = useState("");
  const [institutionNoteDraft, setInstitutionNoteDraft] = useState("");


  const fetchTorSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/tor-settings`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      const data = res.data?.data;
      if (data) {
        setRemarks(data.remarks ?? "");
        setAdmissionCredentialsNote(data.admission_credentials ?? "");
        setCreditsNote(data.credits_note ?? "");
        setInstitutionNote(data.institution_note ?? "");
        setInstitutionWebsite(data.institution_website ?? "");
        setGraduationDate(data.graduation_date ?? ""); // ✅ NEW
      }
    } catch (err) {
      console.error("Failed to fetch TOR settings:", err);
    }
  };

  useEffect(() => {
    fetchTorSettings();
  }, []);

  // Shared saver — always sends the full row so a save from one dialog
  // never blanks out the fields owned by the other two dialogs.
  const saveTorSettings = async (overrides) => {
    const payload = {
      remarks,
      admission_credentials: admissionCredentialsNote,
      credits_note: creditsNote,
      institution_note: institutionNote,
      institution_website: institutionWebsite,
      ...overrides,
    };
    await axios.put(`${API_BASE_URL}/api/tor-settings`, payload, {
      headers: getFlatAuditHeaders({
        "x-employee-id": employeeID,
        "x-page-id": pageId,
      }),
    });
  };

  const openRemarksDialog = () => {
    setRemarksDraft(remarks);
    setRemarksDialogOpen(true);
  };
  const closeRemarksDialog = () => setRemarksDialogOpen(false);


  const handleSaveRemarks = async () => {
    const cleaned = remarksDraft.trim();
    try {
      await saveTorSettings({ remarks: cleaned });
      setRemarks(cleaned);
      setSnackbarSeverity("success");
      setSnackbarMessage("Remarks saved successfully.");
      setOpenSnackbar(true);
    } catch (err) {
      console.error("Failed to save remarks:", err);
      setSnackbarSeverity("warning");
      setSnackbarMessage("Failed to save remarks.");
      setOpenSnackbar(true);
      return;
    }
    setRemarksDialogOpen(false);
  };


  const closeAdmissionCredentialsDialog = () => setAdmissionCredentialsDialogOpen(false);

  const [institutionWebsiteDraft, setInstitutionWebsiteDraft] = useState("");

  const openFooterNotesDialog = () => {
    setCreditsNoteDraft(creditsNote);
    setInstitutionNoteDraft(institutionNote);
    setInstitutionWebsiteDraft(institutionWebsite);
    setFooterNotesDialogOpen(true);
  };

  const closeFooterNotesDialog = () => {
    setFooterNotesDialogOpen(false);
  };

  const handleSaveFooterNotes = async () => {
    const cleanedCredits = creditsNoteDraft.trim();
    const cleanedInstitution = institutionNoteDraft.trim();
    const cleanedWebsite = institutionWebsiteDraft.trim();
    try {
      await saveTorSettings({
        credits_note: cleanedCredits,
        institution_note: cleanedInstitution,
        institution_website: cleanedWebsite,
      });
      setCreditsNote(cleanedCredits);
      setInstitutionNote(cleanedInstitution);
      setInstitutionWebsite(cleanedWebsite);
      setSnackbarSeverity("success");
      setSnackbarMessage("Footer info saved successfully.");
      setOpenSnackbar(true);
    } catch (err) {
      console.error("Failed to save footer notes:", err);
      setSnackbarSeverity("warning");
      setSnackbarMessage("Failed to save footer notes.");
      setOpenSnackbar(true);
      return;
    }
    setFooterNotesDialogOpen(false);
  };

  // ---- Grading system: toggle visibility of existing grade_conversion rows ----
  const [gradingSystemRows, setGradingSystemRows] = useState([]); // rows currently shown on the TOR
  const [gradingSystemDialogOpen, setGradingSystemDialogOpen] = useState(false);
  const [gradingSystemDraft, setGradingSystemDraft] = useState([]); // full list + checked state, dialog-only

  const fetchTorGradingSystem = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/tor-grading-system`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setGradingSystemRows(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch TOR grading system:", err);
      setGradingSystemRows([]);
    }
  };

  useEffect(() => {
    fetchTorGradingSystem();
  }, []);

  const openGradingSystemDialog = () => {
    const shownIds = new Set(gradingSystemRows.map((r) => r.id));
    setGradingSystemDraft(
      gradeConversion.map((row) => ({ ...row, show_on_tor: shownIds.has(row.id) })),
    );
    setGradingSystemDialogOpen(true);
  };
  const closeGradingSystemDialog = () => setGradingSystemDialogOpen(false);

  const handleToggleGradingSystemRow = (id) => {
    setGradingSystemDraft((prev) =>
      prev.map((row) => (row.id === id ? { ...row, show_on_tor: !row.show_on_tor } : row)),
    );
  };

  const handleSaveGradingSystem = async () => {
    const shownIds = new Set(gradingSystemRows.map((r) => r.id));
    const changedRows = gradingSystemDraft.filter(
      (row) => Boolean(row.show_on_tor) !== shownIds.has(row.id),
    );

    if (changedRows.length === 0) {
      setGradingSystemDialogOpen(false);
      return;
    }

    try {
      await Promise.all(
        changedRows.map((row) =>
          axios.put(
            `${API_BASE_URL}/api/tor-grading-system/${row.id}/toggle`,
            { show_on_tor: row.show_on_tor },
            {
              headers: getFlatAuditHeaders({
                "x-employee-id": employeeID,
                "x-page-id": pageId,
              }),
            },
          ),
        ),
      );
      await fetchTorGradingSystem();
      setSnackbarSeverity("success");
      setSnackbarMessage("Grading system saved successfully.");
      setOpenSnackbar(true);
    } catch (err) {
      console.error("Failed to save grading system:", err);
      setSnackbarSeverity("warning");
      setSnackbarMessage("Failed to save grading system changes.");
      setOpenSnackbar(true);
      return;
    }
    setGradingSystemDialogOpen(false);
  };
  // Split rows currently shown on the TOR into two visual columns,
  // matching the original two-block layout (left block / right block).
  const gradingSystemHalf = Math.ceil(gradingSystemRows.length / 2);
  const gradingSystemFirstHalf = gradingSystemRows.slice(0, gradingSystemHalf);
  const gradingSystemSecondHalf = gradingSystemRows.slice(gradingSystemHalf);

  const [graduationDate, setGraduationDate] = useState("");
  const [savingGraduationDate, setSavingGraduationDate] = useState(false);
  const [saving, setSaving] = useState(false);


  const handleGraduationDateChange = (e) => {
    setGraduationDate(e.target.value); // local only — click Save to persist
  };

  const handleSaveGraduationDate = async () => {
    setSavingGraduationDate(true);
    try {
      await saveTorSettings({ graduation_date: graduationDate || null });
      setSnackbarSeverity("success");
      setSnackbarMessage("Date of graduation saved.");
      setOpenSnackbar(true);
    } catch (err) {
      console.error("Failed to save graduation date:", err);
      setSnackbarSeverity("warning");
      setSnackbarMessage("Failed to save date of graduation.");
      setOpenSnackbar(true);
    } finally {
      setSavingGraduationDate(false);
    }
  };

  const formattedDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatScoreRange = (min, max) => {
    if (min === null || min === undefined || min === "") {
      if (max === null || max === undefined || max === "") {
        return "";
      }
    }

    const roundNum = (v) =>
      v === null || v === undefined || v === "" ? null : Math.round(Number(v));

    const roundedMin = roundNum(min);
    const roundedMax = roundNum(max);

    if (roundedMin === null && roundedMax === null) return "";
    if (roundedMin === null) return `${roundedMax}`;
    if (roundedMax === null) return `${roundedMin}`;

    return `${roundedMin}-${roundedMax}`;
  };

  const todayDate = new Date().toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const formattedGraduationDate = graduationDate
    ? formattedDate(graduationDate)
    : "____________________";

  const dateIssuedDisplay = graduationDate ? formattedDate(graduationDate) : todayDate;

  const getPageRemarksText = (isLastPage, degree) => {
    if (isLastPage) {
      const degreeLabel = degree || "____________________";
      return `GRADUATED with the Degree of ${degreeLabel} from this Institute on ${formattedGraduationDate}`;
    }
    return remarks;
  };



  const [admissionCredentialsDialogOpen, setAdmissionCredentialsDialogOpen] = useState(false);
  const [admissionCredentialsDraft, setAdmissionCredentialsDraft] = useState("");


  const openAdmissionCredentialsDialog = () => {
    setAdmissionCredentialsDraft(admissionCredentialsNote);
    setAdmissionCredentialsDialogOpen(true);
  };

  const handleSaveAdmissionCredentials = async () => {
    const cleaned = admissionCredentialsDraft.trim();
    try {
      await saveTorSettings({ admission_credentials: cleaned });
      setAdmissionCredentialsNote(cleaned);
      setSnackbarSeverity("success");
      setSnackbarMessage("Admission credentials saved successfully.");
      setOpenSnackbar(true);
    } catch (err) {
      console.error("Failed to save admission credentials:", err);
      setSnackbarSeverity("warning");
      setSnackbarMessage("Failed to save admission credentials.");
      setOpenSnackbar(true);
      return;
    }
    setAdmissionCredentialsDialogOpen(false);
  };

  // ✅ Fetch person data from backend
  const fetchPersonData = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/person/enrollment/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setPerson(res.data); // make sure backend returns the correct format
    } catch (error) {
      console.error("Failed to fetch person:", error);
    }
  };

  const location = useLocation();


  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setUserRole(storedRole);
      setUserID(storedID);

      if (storedRole === "applicant" || ["administrator", "superadmin", "technical"].includes(storedRole)) {
        fetchPersonData(storedID);
      } else {
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [studentData, setStudentData] = useState([]);
  const [studentNumber, setStudentNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [studentDetails, setStudentDetails] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState("warning");


  const allBranchNames = branches
    .map((b) => b?.branch || b?.branch_name)
    .filter(Boolean)
    .join(" | ")
    .toUpperCase();

  useEffect(() => {
    if (!settings) return;

    const branchId =
      studentData?.campus ||
      studentData?.branch_id ||
      person?.campus ||
      person?.branch_id;
    const matchedBranch = branches.find(
      (branch) =>
        String(branch?.id ?? branch?.branch_id) === String(branchId),
    );

    if (
      matchedBranch?.address ||
      matchedBranch?.branch_address ||
      matchedBranch?.campus_address
    ) {
      setCampusAddress(
        matchedBranch.address ||
        matchedBranch.branch_address ||
        matchedBranch.campus_address,
      );
      return;
    }

    if (branding.campusAddress) {
      setCampusAddress(branding.campusAddress);
      return;
    }

    setCampusAddress(branding.campusAddress || "");
  }, [
    settings,
    branches,
    studentData?.campus,
    studentData?.branch_id,
    person?.campus,
    person?.branch_id,
    branding.campusAddress,
  ]);

  // Auto-fill/search from URL person_id or student_number (same pattern as Report of Grades / Search COR)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const studentNumberFromUrl = params.get("student_number")?.trim();
    const personIdFromUrl = params.get("person_id")?.trim();

    if (!studentNumberFromUrl && !personIdFromUrl) return;

    let cancelled = false;

    const applyStudentNumber = (resolvedStudentNumber) => {
      if (cancelled || !resolvedStudentNumber) return;
      setSearchQuery(resolvedStudentNumber);
      sessionStorage.setItem("edit_student_number", resolvedStudentNumber);
    };

    const skipAutoSearchForInactiveTerm = async () => {
      const listYearId = sessionStorage.getItem("edit_list_year_id");
      const listSemesterId = sessionStorage.getItem("edit_list_semester_id");

      // Only gate auto-search when the student was picked under a specific list term.
      if (!listYearId || !listSemesterId) return false;

      try {
        const res = await axios.get(`${API_BASE_URL}/api/active_school_year`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        const active =
          Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null;
        if (!active) return false;

        const sameYear = String(active.year_id) === String(listYearId);
        const sameSemester =
          String(active.semester_id) === String(listSemesterId);
        if (sameYear && sameSemester) return false;

        setSearchQuery("");
        setSelectedStudent(null);
        setStudentData([]);
        setStudentDetails([]);
        setSnackbarMessage(
          "Selected student is from a different school year/semester than the active term. Search manually if needed.",
        );
        setOpenSnackbar(true);
        return true;
      } catch (err) {
        console.error(
          "Failed to verify active school year for auto-search:",
          err,
        );
        return false;
      }
    };

    const runAutoSearch = async () => {
      const shouldSkip = await skipAutoSearchForInactiveTerm();
      if (cancelled || shouldSkip) return;

      if (studentNumberFromUrl) {
        applyStudentNumber(studentNumberFromUrl);
        return;
      }

      setSearchQuery("");
      setSelectedStudent(null);
      setStudentData([]);
      setStudentDetails([]);

      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/student-person-data/${personIdFromUrl}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );
        if (cancelled) return;
        const resolvedStudentNumber = res.data?.student_number;
        if (resolvedStudentNumber) {
          applyStudentNumber(resolvedStudentNumber);
          sessionStorage.setItem("edit_person_id", personIdFromUrl);
        } else {
          setSnackbarMessage(
            "No student number found for the selected person.",
          );
          setOpenSnackbar(true);
        }
      } catch (err) {
        console.error("Auto Transcript of Records search failed:", err);
        setSnackbarMessage(
          "Unable to load student number for the selected person.",
        );
        setOpenSnackbar(true);
      }
    };

    runAutoSearch();
    return () => {
      cancelled = true;
    };
  }, [location.search]);

  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const pageId = 62;


  //Put this After putting the code of the past code
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

      if (["administrator", "superadmin", "technical"].includes(storedRole)) {
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
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
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
    if (!searchQuery || searchQuery.length < 5) {
      setSelectedStudent(null);
      setStudentData([]);
      return;
    }

    const fetchStudent = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/program_evaluation/${searchQuery}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );
        const data = await res.json();

        if (data) {
          setSelectedStudent(data);
          setStudentData(data);

          if (searchQuery) {
            localStorage.setItem("admin_edit_person_id", searchQuery);
          }

          const detailsRes = await fetch(
            `${API_BASE_URL}/api/program_evaluation/details/${searchQuery}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
          );
          const detailsData = await detailsRes.json();
          if (Array.isArray(detailsData) && detailsData.length > 0) {
            setStudentDetails(detailsData);
          } else {
            setStudentDetails([]);
            setSnackbarMessage("No enrolled subjects found for this student.");
            setOpenSnackbar(true);
          }
        } else {
          setSelectedStudent(null);
          setStudentData([]);
          setStudentDetails([]);
          setSnackbarMessage("No student data found.");
          setOpenSnackbar(true);
        }
      } catch (err) {
        console.error("Error fetching student", err);
        setSnackbarMessage("Server error. Please try again.");
        localStorage.removeItem("admin_edit_person_id");
        setOpenSnackbar(true);
      }
    };

    fetchStudent();
  }, [searchQuery]);

  useEffect(() => {
    const query = studentNumber.trim();

    if (!suggestionsOpen || query.length < 2) {
      setStudentSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    let cancelled = false;
    setSuggestionsLoading(true);

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/cor-student-suggestions`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
          params: { query, limit: 10 },
        });

        if (!cancelled) {
          setStudentSuggestions(res.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch Transcript student suggestions:", err);
        if (!cancelled) setStudentSuggestions([]);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(delayDebounce);
    };
  }, [studentNumber, suggestionsOpen]);

  const handleSuggestionSelect = (suggestion) => {
    const nextStudentNumber = String(suggestion?.student_number || "");
    if (!nextStudentNumber) return;

    setStudentNumber(nextStudentNumber);
    setSearchQuery(nextStudentNumber);
    setSuggestionsOpen(false);
    setStudentSuggestions([]);
  };



  useEffect(() => {
    fetchGradeConversionDic();
  }, [])

  const fetchGradeConversionDic = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/grade-conversion`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setGradeConversions(Array.isArray(res.data) ? res.data : []);

      console.log("Fetch successful");
    } catch (err) {
      console.log("Error Fetching Data: ", err);
      setGradeConversions([]);
    }
  };


  const getSignatureImageSrc = (signature) =>
    signature?.signature_image
      ? `${API_BASE_URL}/uploads/${signature.signature_image}`
      : "";

  const totalUnitPerSubject = (course_unit, lab_unit) => {
    const lec = Number(course_unit) || 0;
    const lab = Number(lab_unit) || 0;
    return lec + lab;
  };

  const groupedDetails = {};
  if (Array.isArray(studentDetails)) {
    studentDetails.forEach((item) => {
      const key = `${item.school_year}-${item.semester_description}`;
      if (!groupedDetails[key]) {
        groupedDetails[key] = [];
      }
      groupedDetails[key].push(item);
    });
  }

  const convertSemester = (p) => {
    if (!p) return "";

    // ✅ Single source of truth — comes straight from semester_table.ordinal_label
    if (p.ordinal_label) return p.ordinal_label;

    // Fallback: no hardcoded mapping, just show whatever the DB already has
    return p.semester_description || "";
  };

  const groupedSubjects = Object.entries(groupedDetails).map(
    ([key, courses]) => ({
      termKey: key,
      year: courses[0]?.current_year,
      nextYear: courses[0]?.next_year,
      semester: courses[0]?.semester_description,
      subjects: courses,
    }),
  );

  // Constants
  const MAX_PAGE_HEIGHT_REM = 47;
  const SUBJECT_HEIGHT_REM = 1.1;
  const MAX_SUBJECTS_PER_PAGE = Math.floor(
    MAX_PAGE_HEIGHT_REM / SUBJECT_HEIGHT_REM,
  );

  // Function to chunk subjects into pages
  const chunkArray = (arr, maxSubjects) => {
    const result = [];
    let currentPage = [];
    let currentCount = 0;

    for (const group of arr) {
      let remainingSubjects = [...group.subjects];
      let isContinuation = false;

      while (remainingSubjects.length > 0) {
        const availableSpace = maxSubjects - currentCount;

        if (remainingSubjects.length <= availableSpace) {
          // All subjects fit on this page
          currentPage.push({
            ...group,
            subjects: remainingSubjects,
            isContinuation,
          });
          currentCount += remainingSubjects.length;
          remainingSubjects = [];
        } else {
          // Some subjects fit, others overflow → split group
          const fitSubjects = remainingSubjects.slice(0, availableSpace);
          const overflowSubjects = remainingSubjects.slice(availableSpace);

          currentPage.push({
            ...group,
            subjects: fitSubjects,
            isContinuation,
          });
          result.push(currentPage);

          // start new page with remaining subjects
          currentPage = [];
          currentCount = 0;
          remainingSubjects = overflowSubjects;
          isContinuation = true; // mark next split as continuation
        }

        if (currentCount >= maxSubjects) {
          result.push(currentPage);
          currentPage = [];
          currentCount = 0;
        }
      }
    }

    if (currentPage.length > 0) result.push(currentPage);

    return result;
  };

  const paginatedSubjects = chunkArray(groupedSubjects, MAX_SUBJECTS_PER_PAGE);

  const divToPrintRef = useRef();

  const [torQrStatus, setTorQrStatus] = useState({ has_qr: false, tor_qr_image_url: null });

  useEffect(() => {
    const studentNumberValue = studentData?.student_number;

    if (!studentNumberValue) {
      setTorQrStatus({ has_qr: false, tor_qr_image_url: null });
      return;
    }

    let cancelled = false;

    const fetchTorQrStatus = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/tor-qr-status/${studentNumberValue}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        if (!cancelled) {
          setTorQrStatus({
            has_qr: Boolean(res.data?.has_qr),
            tor_qr_image_url: res.data?.tor_qr_image_url || null,
          });
        }
      } catch (err) {
        console.error("Failed to check TOR QR status:", err);
        if (!cancelled) setTorQrStatus({ has_qr: false, tor_qr_image_url: null });
      }
    };

    fetchTorQrStatus();
    return () => {
      cancelled = true;
    };
  }, [studentData?.student_number]);

  const buildTorPageHtml = (pageGroups, pageIndex) => {
    const logoSrc = logoDataUris.school || fetchedLogo || EaristLogo;
    const name = companyName?.trim() || "";
    const words = name.split(" ");
    const middle = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, middle).join(" ");
    const secondLine = words.slice(middle).join(" ");

    const studentName = formatStudentFullName(studentData);

    const admissionCredentials = admissionCredentialsNote;

    const dateIssuedDisplay = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const degreeTitle = studentData?.program_description
      ? studentData.program_description.toUpperCase()
      : "";
    const major = studentData?.major ? studentData.major.toUpperCase() : "";

    const photoSrc = studentData?.profile_image
      ? `${API_BASE_URL}/uploads/Student1by1/${studentData.profile_image}`
      : "";

    const hideOnSecurityPaper = printOnSecurityPaper ? "visibility:hidden;" : "";

    const headerHtml = `
  <div style="position:relative; width:80rem; margin:0 auto;">
    <div style="position:absolute; top:0; right:0; display:flex; flex-direction:column; align-items:center; z-index:2;">
      <div style="display:flex; align-items:center; gap:4px;">
        <img src="${logoDataUris.act || Act}" alt="ACT" style="width:50px; height:50px; object-fit:contain; display:block;" />
        <img src="${logoDataUris.ukas || Ukas}" alt="UKAS" style="width:50px; height:50px; object-fit:contain; display:block;" />
        <img src="${logoDataUris.iaf || Iaf}" alt="IAF" style="width:50px; height:50px; object-fit:contain; display:block;" />
      </div>
      <div style="font-size:11px; text-align:center; margin-top:20px; line-height:1.2; font-family:Arial, sans-serif;">
        ${(shortTerm || "").toUpperCase()} FORM NO. I-A<br/>
        REVISED 2025
      </div>
    </div>

    <div style="display:flex; align-items:center; justify-content:center; margin-top: -20px;">
      <div style="display:flex; align-items:center; gap:0.5rem; margin-left:-10rem; padding-right:3rem;">
        <img src="${logoDataUris.bagongPilipinas || BagongPilipinasLogo}" alt="Bagong Pilipinas" style="width:8.5rem; height:8rem; display:block;" />
        <img src="${logoSrc}" alt="Logo" style="width:8rem; height:8rem; border-radius:50%; display:block; ${hideOnSecurityPaper}" />
      </div>
      <div style="text-align:center; ${hideOnSecurityPaper}">
        <div style="font-family:Arial, sans-serif; font-size:13px;">Republic of the Philippines</div>
   ${name ? `
<div style="line-height:1; font-size:1.6rem; letter-spacing:-1px; font-weight:600; font-family:'Arial'; text-transform:uppercase;">${firstLine.toUpperCase()}</div>
${secondLine ? `<div style="line-height:1; font-size:1.6rem; letter-spacing:-1px; font-weight:600; font-family:'Arial'; text-transform:uppercase;">${secondLine.toUpperCase()}</div>` : ""}
` : ""}
        ${allBranchNames ? `
          <div style="font-size:14px; font-weight:bold; letter-spacing:0.5px; margin-top:-2px;">
            ${allBranchNames}
          </div>
        ` : ""}
        <div style="font-family:Arial, sans-serif; font-size:13px;">${campusAddress || ""}</div>
      </div>
    </div>

    <div style="text-align:center; margin-top: 30px; font-size:1.6rem; letter-spacing:-1px; font-weight:500; ${hideOnSecurityPaper}">
      OFFICE OF THE REGISTRAR
    </div>
    <div style="text-align:center; margin-top:-0.5rem; font-size:2.75rem; letter-spacing:-1px; font-weight:600; ${hideOnSecurityPaper}">
      OFFICIAL TRANSCRIPT OF RECORDS
    </div>
  </div>
`;

    // ── Student info + photo ──
    const infoRow = (label, value) => `
  <div style="display:flex; height:20px; align-items:center; font-size:20px; letter-spacing:-1px; margin-top:2px;">
    <span style="width:15rem;">${label}</span>
    <span style="width:1rem;">:</span>
    <span style="font-weight:500; margin-left:0.3rem;">${value || ""}</span>
  </div>
`;

    const studentInfoHtml = `
  <div style="display:flex; margin-top:1rem; width:80rem; margin-left:auto; margin-right:auto; border-bottom:solid black 1px; padding-bottom:0.5rem;">
    <div style="flex:1 1 auto;">
      <div style="display:flex; align-items:center; font-size:22px; font-weight:600; letter-spacing:-1px;">
        <span style="width:15rem;">NAME</span>
        <span style="width:1rem;">:</span>
        <span style="margin-left:0.3rem;">${studentName}</span>
      </div>
      ${infoRow("DATE OF BIRTH", formattedDate(studentData.birthOfDate))}
      ${infoRow("ADMISSION CREDENTIALS", admissionCredentials)}
      ${infoRow("LAST SCHOOL ATTENDED", studentData.schoolLastAttended1)}
      ${infoRow("DATE GRADUATED", formatYearGraduatedRange(studentData.yearGraduated1))}
      ${infoRow("STUDENT NUMBER", studentData.student_number)}
      ${infoRow("DEGREE/TITLE EARNED", degreeTitle)}
      ${infoRow("MAJOR", major)}
      ${infoRow("DATE OF GRADUATION", dateIssuedDisplay)}
    </div>
  <div style="flex:0 0 225px; margin-left:1rem;">
<div style="text-align:center; font-size:14px; font-weight:600; margin-bottom:4px; letter-spacing:0.3px; ${hideOnSecurityPaper}">
${documentNumbers[pageIndex] || ""}
</div>
${photoSrc
        ? `<img src="${photoSrc}" style="width:225px; height:225px; object-fit:cover; border:1px solid black; display:block;" />`
        : `<div style="width:225px; height:225px; border:1px solid black;"></div>`
      }
    </div>
  </div>
`;
    // ── Subjects table (div-based, no table/flex hybrid) ──
    const tableHeaderHtml = `
  <div style="display:flex; height:65px; align-items:center; border-bottom:solid 1px black; font-weight:600; font-size:20px;">
    <div style="width:13rem; text-align:center;">TERM</div>
    <div style="width:38rem; text-align:center; letter-spacing:-1px;">
      SUBJECTS<br/>
      <span style="font-weight:600;">CODE NUMBER WITH DESCRIPTIVE TITLE</span>
    </div>
    <div style="width:13rem; text-align:center;">
      GRADES
      <div style="display:flex; margin-top:2px;">
        <div style="width:6rem; text-align:center;">FINAL</div>
        <div style="width:7rem; text-align:center;">RE-EXAM</div>
      </div>
    </div>
    <div style="width:7rem; text-align:center;">CREDITS</div>
    <div style="width:8.9rem; text-align:center;">REMARKS</div>
  </div>
`;

    const programRowHtml = `
  <div style="text-decoration:underline; text-underline-offset:3px; font-weight:500; letter-spacing:-1px; padding-left:1.5rem; font-size:20px;">
    ${degreeTitle}
  </div>
`;

    let subjectRowsHtml = "";
    pageGroups.forEach((group) => {
      group.subjects.forEach((p, index) => {
        const componentLabel =
          p.component === 1 ? "CWTS" :
            p.component === 2 ? "LTS" :
              p.component === 3 ? "MTS" : "";
        const finalGrade = handleGradeConversion(p.final_grade || p.numeric_grade);
        const totalUnits = totalUnitPerSubject(p.course_unit, p.lab_unit);
        const remarks =
          p.en_remarks === 0 ? "Ongoing" :
            p.en_remarks === 1 ? "Passed" :
              p.en_remarks === 2 ? "Failed" :
                p.en_remarks === 3 ? "Incomplete" :
                  p.en_remarks === 4 ? "Dropped" : "";

        subjectRowsHtml += `
  <div style="display:flex; align-items:flex-start; line-height:22px;">
    <div style="width:13rem; position:relative;">
      ${!group.isContinuation && index === 0 ? `
        <span style="display:block; font-size:18px; text-align:center; width:13rem; font-weight:500; line-height:22px;">${convertSemester(p)}</span>
        <span style="position:absolute; top:22px; left:0; font-size:17px; text-align:center; width:13rem; font-weight:500; line-height:22px;">${p.current_year} - ${p.next_year}</span>
      ` : ""}
    </div>
    <div style="display:flex; width:38rem; line-height:22px;">
      <span style="width:9.5rem; flex:0 0 9.5rem; font-size:18px; letter-spacing:-0.5px;">${p.course_code || ""}</span>
      <span style="flex:1 1 auto; font-size:18px; letter-spacing:-0.5px;">${p.course_description ? p.course_description.toUpperCase() : ""} ${componentLabel}</span>
    </div>
    <div style="width:13rem; display:flex; align-items:center;">
      <div style="width:6rem; text-align:center; font-size:18px;">${finalGrade}</div>
      <div style="width:7rem; text-align:center; font-size:18px;"></div>
    </div>
    <div style="width:7rem; text-align:center; font-size:18px;">${totalUnits}</div>
    <div style="width:8.9rem; text-align:center; font-size:18px;">${remarks}</div>
  </div>
`;
      });
    });

    const isLastPage = pageIndex === paginatedSubjects.length - 1;
    const nothingFollowsHtml = isLastPage
      ? `
    <div style="text-align:center; font-size:17px; margin-top: 25px; font-weight:600; white-space:normal; overflow:visible; line-height:1.3; word-break:break-word;">
    <span style="font-size:14px;">${repeatShortTermWithSpaces(shortTerm)} xxx</span>
&nbsp;NOTHING FOLLOWS&nbsp;
<span style="font-size:14px;">xxx ${repeatShortTermWithSpaces(shortTerm)}</span>
    </div>
  `
      : `
    <div style="text-align:center; border-top:dashed 1px black; font-size:17px; font-weight:600;">
      - continued on next page -
    </div>
  `;

    const subjectsTableHtml = `
  <div style="margin-top:0.5rem; width:80rem; margin-left:auto; margin-right:auto; border-top:solid black 1px;">
    ${tableHeaderHtml}
    ${programRowHtml}
    ${subjectRowsHtml}
    ${nothingFollowsHtml}
  </div>
`;

    const gradeCol = (rows, width) => `
<div style="display:flex; flex-direction:column; align-items:flex-start; width:${width};">
  ${rows.map((r) => `<div style="font-size:16px; letter-spacing:-1px;">${r}</div>`).join("")}
</div>
`;

    const gradingSystemHtml = `
<div style="display:flex; height:145px; border-top:solid 1px black; font-size:18px; align-items:flex-start; padding-top:3px;">
  <div style="width:13rem;">GRADING SYSTEM</div>
  ${gradeCol(gradingSystemFirstHalf.map((r) => r.equivalent_grade), "4.5rem")}
  ${gradeCol(gradingSystemFirstHalf.map((r) => `(${formatScoreRange(r.min_score, r.max_score)})`), "6.5rem")}
  ${gradeCol(gradingSystemFirstHalf.map((r) => r.descriptive_rating), "15.5rem")}
  ${gradeCol(gradingSystemSecondHalf.map((r) => r.equivalent_grade), "4.5rem")}
  ${gradeCol(gradingSystemSecondHalf.map((r) => `(${formatScoreRange(r.min_score, r.max_score)})`), "14rem")}
  ${gradeCol(gradingSystemSecondHalf.map((r) => r.descriptive_rating), "22rem")}
</div>
`;

    const pageRemarksText = getPageRemarksText(isLastPage, degreeTitle);

    const creditsNoteHtml = `
  <div style="padding-left:2rem; height:30px; border-bottom:solid 1px black; font-size:18px; display:flex; align-items:center;">
    <span>${creditsNote}</span>
  </div>
  <div style="padding-left:2rem; height:60px; border-bottom:solid 1px black; font-size:17px; padding-top:5px;">
    <span style="font-size:18px; letter-spacing:-0.8px;">${(companyName || "").toUpperCase()}</span>
    <span style="letter-spacing:-0.8px;"> ${institutionNote}</span>
  </div>
  <div style="padding-left:1rem; height:60px; border-top:solid 1px black; border-bottom:solid 1px black; font-size:18px; padding-top:4px;">
    <span style="font-weight:600;">REMARKS: </span>
    <span style="font-weight:400;">${pageRemarksText}</span>
  </div>
  <div style="padding-left:1rem; height:35px; font-size:18px; padding-top:3px;">
    <span>DATE ISSUED: </span><span>${dateIssuedDisplay}</span>
  </div>
`;

    const signatureBlock = (label, signature) => `
<div style="width:20rem; text-align:center;">
  <span style="font-size:18px; letter-spacing:-0.8px;">${label}</span>
  <div style="margin-top:0.3rem; text-align:center;">
    ${signature?.signature_image
        ? `<img src="${getSignatureImageSrc(signature)}" style="width:16rem; height:4rem; object-fit:contain; display:block; margin:0 auto -0.2rem;" />`
        : `<div style="width:16rem; height:4rem; margin:0 auto;"></div>`
      }
    <span style="display:block; font-size:18px; font-weight:500; letter-spacing:-1px; white-space:normal; word-break:break-word; line-height:1.15; max-width:19rem; margin:0 auto;">
      ${signature?.full_name?.toUpperCase() || ""}
    </span>
  </div>
</div>
`;

    const registrarBlock = `
<div style="width:21rem; text-align:center; display:flex; flex-direction:column; align-items:center;">
  ${torSignatories.registrar?.signature_image
        ? `<img src="${getSignatureImageSrc(torSignatories.registrar)}" style="width:11rem; height:2.7rem; object-fit:contain; display:block; margin-bottom:-0.2rem;" />`
        : `<div style="width:11rem; height:2.7rem; margin-bottom:-0.2rem;"></div>`
      }
  <span style="font-size:22px; letter-spacing:-1px; white-space:normal; word-break:break-word; max-width:20rem; line-height:1.15;">${torSignatories.registrar?.full_name?.toUpperCase() || ""}</span>
  <span style="font-size:18px; letter-spacing:-1px;">REGISTRAR</span>
</div>
`;

    const verificationQrBlock = torQrStatus.has_qr && torQrStatus.tor_qr_image_url
      ? `
<div style="width:8rem; text-align:center; display:flex; flex-direction:column; align-items:center; margin-left:auto;">
  <img src="${API_BASE_URL}${torQrStatus.tor_qr_image_url}" alt="Scan to verify this Transcript of Records" style="width:6.5rem; height:6.5rem; object-fit:contain; display:block;" />
  <span style="font-size:11px; letter-spacing:-0.3px; margin-top:0.2rem; line-height:1.1;">SCAN TO VERIFY</span>
</div>
`
      : "";

    const signaturesHtml = `
<div style="display:flex; padding-left:0.8rem; height:8rem; border-bottom:solid black 1px; align-items:flex-start;">
<div style="width:8rem; height:8rem; position:relative; text-align:center; font-size:12px; font-style:italic;">
<div style="position:absolute; bottom:0.5rem; left:60%; transform:translateX(-50%); z-index:0;">
  <span style="white-space:nowrap; display:block;">NOT VALID WITHOUT OFFICIAL</span>
  <span style="white-space:nowrap; display:block;">SEAL OF THE INSTITUTE</span>
</div>
</div>
  <div style="width:3rem;"></div>
  ${signatureBlock("PREPARED BY:", torSignatories.prepared_by)}
  ${signatureBlock("CHECKED BY:", torSignatories.checked_by)}
  ${registrarBlock}
  ${verificationQrBlock}
</div>
`;

    const allCampusAddressesHtml = `
<div style="width:80rem; margin-left:auto; margin-right:auto; padding-top:0.5rem; display:flex; align-items:center; justify-content:center; white-space:nowrap;">
  ${institutionWebsite ? `
    <span style="font-size:13px; font-weight:700; letter-spacing:0.3px;">
      ${institutionWebsite}
      ${branches.filter((b) => b?.address || b?.branch_address || b?.campus_address).length > 0
          ? `<span style="margin:0 0.75rem; font-weight:400;">|</span>`
          : ""
        }
    </span>
  ` : ""}
  ${branches
        .filter((b) => b?.address || b?.branch_address || b?.campus_address)
        .map(
          (b, index, arr) => `
      <span style="font-size:14px; letter-spacing:-0.3px; line-height:1.3;">
        <span style="font-weight:700;">${(b.branch || b.branch_name || "").toUpperCase()}:</span>
        ${b.address || b.branch_address || b.campus_address}
        ${index < arr.length - 1 ? `<span style="margin:0 0.75rem; font-weight:400;">|</span>` : ""}
      </span>
    `,
        )
        .join("")}
</div>
`;

    return `
<div class="tor-page">
${headerHtml}
${studentInfoHtml}
${subjectsTableHtml}
<div style="width:80rem; margin-left:auto; margin-right:auto; margin-top:0.4rem;">
  ${gradingSystemHtml}
  ${creditsNoteHtml}
  ${signaturesHtml}
  ${allCampusAddressesHtml}
</div>
</div>
`;
  };

  const handleExportTorPdf = async () => {
    if (paginatedSubjects.length === 0) {
      setSnackbarMessage("No subjects found to generate the transcript.");
      setOpenSnackbar(true);
      return;
    }

    if (!studentData?.student_number) {
      setSnackbarMessage("Please search and select a student first.");
      setOpenSnackbar(true);
      return;
    }

    let allPagesHtml;
    try {
      allPagesHtml = paginatedSubjects
        .map((pageGroups, pageIndex) => buildTorPageHtml(pageGroups, pageIndex))
        .join("");
    } catch (err) {
      console.error("Failed to build TOR page HTML:", err);
      setSnackbarMessage("Failed to prepare the Transcript of Records for download.");
      setOpenSnackbar(true);
      return;
    }

    // ✅ NEW — Clicking Download TOR is the trigger that officially records
    // graduation. The backend re-runs the same "passed every final-term
    // subject" check and, if eligible, upserts a row into
    // student_graduation_table (keyed by student_number, so re-downloading
    // just refreshes the date instead of duplicating). GWA/honor is
    // intentionally left out — not required here. This does NOT block the
    // PDF from generating either way.
    try {
      const markGraduateRes = await axios.post(
        `${API_BASE_URL}/api/mark-graduate/${studentData.student_number}`,
        {
          verified_by: employeeID,
          graduation_date: graduationDate || undefined,
          remarks: remarks || undefined,
        },
        {
          headers: getFlatAuditHeaders({
            "x-employee-id": employeeID,
            "x-page-id": pageId,
          }),
        },
      );

      if (markGraduateRes.data?.success) {
        setSnackbarSeverity("success");
        setSnackbarMessage(
          `Recorded as an official graduate (${formattedDate(
            markGraduateRes.data.graduation_date,
          )}). This now shows on the verification QR.`,
        );
        setOpenSnackbar(true);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        // Student hasn't passed every final-term subject yet — don't block
        // the TOR download, just don't mark them as an official graduate.
        console.warn(
          "Not yet eligible for graduation record:",
          err.response.data?.message,
        );
      } else {
        console.error("Failed to record graduation:", err);
      }
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/generate-tor-pdf`,
        {
          html: allPagesHtml,
          student_number: studentData.student_number || "",
          last_name: studentData?.last_name || "",
          first_name: studentData?.first_name || "",
          audit_print_action: "PRINTING_STUDENT_DOCS",
          document_label: "Transcript of Records",
        },
        {
          responseType: "blob",
          headers: getFlatAuditHeaders({
            "x-employee-id": employeeID,
            "x-page-id": pageId,
          }),
        },
      );

      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute(
        "download",
        `TOR_${(studentData?.last_name || "Student").replace(/\s+/g, "_")}${studentData.student_number ? "_" + studentData.student_number : ""}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to generate TOR PDF:", err);
      setSnackbarMessage("Failed to generate Transcript of Records PDF.");
      setOpenSnackbar(true);
    }
  };

  const handleTorEditCardClick = (key) => {
    switch (key) {
      case "capturePhoto":
        if (!studentData?.person_id) {
          setSnackbarMessage("Please search and select a student first.");
          setOpenSnackbar(true);
          return;
        }
        setPhotoCaptureOpen(true);
        break;
      case "documentNumber":
        openDocumentNumberDialog();
        break;
      case "remarks":
        openRemarksDialog();
        break;
      case "admissionCredentials":
        openAdmissionCredentialsDialog();
        break;
      case "footerNotes":
        openFooterNotesDialog();
        break;
      case "gradingSystem":
        openGradingSystemDialog();
        break;
      case "signatories":
        openSignatoriesDialog();
        break;
      default:
        break;
    }
  };





  // ============================================================
  // TOR SIGNATORIES
  // ============================================================

  const [torSignatories, setTorSignatories] = useState({
    prepared_by: null,
    checked_by: null,
    registrar: null,
  });
  const [signaturePage, setSignaturePage] = useState(0);

  // Convert the object returned by /api/tor-signatories
  // into an array that can be displayed by the signature table.
  const signatures = [
    torSignatories?.prepared_by,
    torSignatories?.checked_by,
    torSignatories?.registrar,
  ].filter(Boolean);

  const SIGNATURES_PER_PAGE = 10;

  const totalSignaturePages = Math.max(
    1,
    Math.ceil(signatures.length / SIGNATURES_PER_PAGE)
  );

  const paginatedSignatures = signatures.slice(
    signaturePage * SIGNATURES_PER_PAGE,
    (signaturePage + 1) * SIGNATURES_PER_PAGE
  );
  // ============================================================
  // SELECTED SIGNATORIES
  // ============================================================

  const [selectedPreparedBy, setSelectedPreparedBy] = useState(null);

  const [selectedCheckedBy, setSelectedCheckedBy] = useState(null);

  const [selectedRegistrar, setSelectedRegistrar] = useState(null);

  // ============================================================
  // CHECK IF SIGNATURE IS ALREADY USED
  // ============================================================

  const isSignatureSelectedForAnotherRole = (signature, role) => {
    if (!signature) return false;

    const signatureId = signature.id;

    if (!signatureId) return false;

    if (
      role !== "prepared" &&
      selectedPreparedBy?.id === signatureId
    ) {
      return true;
    }

    if (
      role !== "checked" &&
      selectedCheckedBy?.id === signatureId
    ) {
      return true;
    }

    if (
      !["administrator", "superadmin", "technical"].includes(role) &&
      selectedRegistrar?.id === signatureId
    ) {
      return true;
    }

    return false;
  };

  // ============================================================
  // SIGNATURE SELECTION HANDLERS
  // ============================================================

  const handlePreparedByChange = (signature) => {
    setSelectedPreparedBy((previous) => {
      if (previous?.id === signature?.id) {
        return null;
      }

      return signature || null;
    });
  };

  const handleCheckedByChange = (signature) => {
    setSelectedCheckedBy((previous) => {
      if (previous?.id === signature?.id) {
        return null;
      }

      return signature || null;
    });
  };

  const handleRegistrarChange = (signature) => {
    setSelectedRegistrar((previous) => {
      if (previous?.id === signature?.id) {
        return null;
      }

      return signature || null;
    });
  };

  // ============================================================
  // FETCH TOR SIGNATORIES
  // ============================================================

  const fetchTorSignatories = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/tor-signatories`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }
      );

      const data = response.data?.data || {};

      const normalizedData = {
        prepared_by: data?.prepared_by || null,
        checked_by: data?.checked_by || null,
        registrar: data?.registrar || null,
      };

      setTorSignatories(normalizedData);

      setSelectedPreparedBy(
        normalizedData.prepared_by
      );

      setSelectedCheckedBy(
        normalizedData.checked_by
      );

      setSelectedRegistrar(
        normalizedData.registrar
      );

      // Reset pagination whenever the records are refreshed.
      setSignaturePage(0);

    } catch (error) {
      console.error(
        "Failed to fetch TOR signatories:",
        error
      );

      setTorSignatories({
        prepared_by: null,
        checked_by: null,
        registrar: null,
      });

      setSelectedPreparedBy(null);
      setSelectedCheckedBy(null);
      setSelectedRegistrar(null);
    }
  };

  useEffect(() => {
    fetchTorSignatories();
  }, []);

  // ============================================================
  // YEAR GRADUATED FORMATTER
  // ============================================================

  const formatYearGraduatedRange = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "";
    }

    const text = String(value).trim();

    if (!text) {
      return "";
    }

    // Already formatted as a range.
    if (
      text.includes("-") ||
      text.includes("–") ||
      text.includes("—")
    ) {
      return text;
    }

    // Normal school year / calendar year.
    if (/^\d{4}$/.test(text)) {
      return text;
    }

    // Handle date values.
    const parsedDate = new Date(text);

    if (!Number.isNaN(parsedDate.getTime())) {
      return String(parsedDate.getFullYear());
    }

    return text;
  };



  const repeatShortTermWithSpaces = (value, times = 12) => {
    if (value === null || value === undefined) {
      return "";
    }

    const text = String(value).trim().toLowerCase();

    if (!text) {
      return "";
    }

    return Array(times).fill(text).join(" ");
  };


  const [signatoriesDialogOpen, setSignatoriesDialogOpen] =
    useState(false);

  const [signatoriesDraft, setSignatoriesDraft] = useState({
    prepared_by: {
      full_name: "",
      designation: "",
      file: null,
      preview: null,
      removed: false, // ✅ NEW
    },

    checked_by: {
      full_name: "",
      designation: "",
      file: null,
      preview: null,
      removed: false, // ✅ NEW
    },

    registrar: {
      full_name: "",
      designation: "",
      file: null,
      preview: null,
      removed: false, // ✅ NEW
    },
  });

  const openSignatoriesDialog = () => {
    setSignatoriesDraft({
      prepared_by: {
        full_name: torSignatories?.prepared_by?.full_name || "",
        designation: torSignatories?.prepared_by?.designation || "",
        file: null,
        preview: null,
        removed: false, // ✅ NEW
      },
      checked_by: {
        full_name: torSignatories?.checked_by?.full_name || "",
        designation: torSignatories?.checked_by?.designation || "",
        file: null,
        preview: null,
        removed: false, // ✅ NEW
      },
      registrar: {
        full_name: torSignatories?.registrar?.full_name || "",
        designation: torSignatories?.registrar?.designation || "",
        file: null,
        preview: null,
        removed: false, // ✅ NEW
      },
    });

    setSignatoriesDialogOpen(true);
  };



  const closeSignatoriesDialog = () => {
    setSignatoriesDialogOpen(false);
  };

  // ============================================================
  // SIGNATORY FIELD CHANGE
  // ============================================================

  const handleSignatoryFieldChange = (
    role,
    field,
    value
  ) => {
    setSignatoriesDraft((previous) => ({
      ...previous,

      [role]: {
        ...previous[role],
        [field]: value,
      },
    }));
  };

  const handleSignatoryFileChange = (role, file) => {
    if (!file) {
      return;
    }

    const preview = URL.createObjectURL(file);

    setSignatoriesDraft((previous) => ({
      ...previous,
      [role]: {
        ...previous[role],
        file,
        preview,
        removed: false, // uploading a new file cancels any pending removal
      },
    }));
  };

  // ✅ NEW — mark this role's signature for removal on save
  const handleRemoveSignature = (role) => {
    setSignatoriesDraft((previous) => ({
      ...previous,
      [role]: {
        ...previous[role],
        file: null,
        preview: null,
        removed: true,
      },
    }));
  };



  const handleSaveSignatories = async () => {
    try {
      await Promise.all(
        VALID_TOR_ROLES.map(async (role) => {
          const draft = signatoriesDraft?.[role];
          if (!draft) return;

          const formData = new FormData();
          formData.append("full_name", draft.full_name || "");
          formData.append("designation", draft.designation || "");
          if (draft.file) {
            formData.append("signature", draft.file);
          } else if (draft.removed) {
            formData.append("remove_signature", "true"); // ✅ NEW
          }

          await axios.put(
            `${API_BASE_URL}/api/tor-signatories/${role}`,
            formData,
            {
              headers: getFlatAuditHeaders({
                "x-employee-id": employeeID,
                "x-page-id": pageId,
                "Content-Type": "multipart/form-data",
              }),
            },
          );
        })
      );

      await fetchTorSignatories();
      setSignatoriesDialogOpen(false);
      setSnackbarSeverity("success");
      setSnackbarMessage("TOR signatories saved successfully.");
      setOpenSnackbar(true);
    } catch (error) {
      console.error("Failed to save TOR signatories:", error);
      setSnackbarSeverity("warning");
      setSnackbarMessage("Failed to save signatories.");
      setOpenSnackbar(true);
    }
  };

  const handleGradeConversion = (grade) => {
    if (grade === null || grade === undefined || grade === "") return "";

    const normalizedGrade = String(grade).trim().toUpperCase();

    if (normalizedGrade === "0" || Number(normalizedGrade) === 0) return "";
    if (normalizedGrade === "INC") return "INC";
    if (normalizedGrade === "DROP" || normalizedGrade === "DRP") return "DRP";

    const numericGrade = Number(normalizedGrade);
    if (Number.isNaN(numericGrade)) return grade;

    if (numericGrade > 0 && numericGrade <= 5) {
      return Number.isInteger(numericGrade)
        ? String(numericGrade)
        : numericGrade.toFixed(2);
    }

    const matchedConversion = gradeConversion.find((row) => {
      const minScore = Number(row.min_score);
      const maxScore = Number(row.max_score);

      return (
        Number.isFinite(minScore) &&
        Number.isFinite(maxScore) &&
        numericGrade >= minScore &&
        numericGrade <= maxScore
      );
    });

    if (!matchedConversion?.equivalent_grade) {
      return grade;
    }

    const equivalentGrade = Number(matchedConversion.equivalent_grade);
    return Number.isNaN(equivalentGrade)
      ? matchedConversion.equivalent_grade
      : equivalentGrade.toFixed(2);
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
        className="navbars"
        sx={{
          display: "flex",
          background: "white",
          alignItems: "center",
          justifyContent: "space-between",

          mb: 2,
        }}
      >
        {/* Left: Title */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: "36px",
            background: "white",
            display: "flex",
            alignItems: "center",
          }}
        >
          TRANSCRIPT OF RECORDS
        </Typography>

        {/* Right: Search + Print grouped together */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ position: "relative", width: 450 }}>
            <TextField
              variant="outlined"
              placeholder="Search student number or name"
              size="small"
              value={studentNumber}
              onChange={(e) => {
                const nextValue = e.target.value;
                const trimmedValue = nextValue.trim();
                setStudentNumber(nextValue);
                setSearchQuery(/^\d/.test(trimmedValue) ? nextValue : "");
                setSuggestionsOpen(true);
              }}
              onFocus={() => {
                if (studentNumber.trim().length >= 2) setSuggestionsOpen(true);
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
            {suggestionsOpen && studentNumber.trim().length >= 2 && (
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
                {suggestionsLoading ? (
                  <Box sx={{ px: 2, py: 1.25, fontSize: 13, color: "#666" }}>
                    Searching...
                  </Box>
                ) : studentSuggestions.length > 0 ? (
                  studentSuggestions.map((suggestion) => {
                    const name = formatSuggestionName(suggestion);
                    return (
                      <Box
                        key={`${suggestion.student_number}-${suggestion.person_id}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSuggestionSelect(suggestion);
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
                          {suggestion.student_number}
                        </Typography>
                        <Typography sx={{ fontSize: 14, color: "#555" }}>
                          |
                        </Typography>
                        <Typography sx={{ fontSize: 14 }} noWrap>
                          {name || "Unnamed Student"}
                        </Typography>
                      </Box>
                    );
                  })
                ) : (
                  <Box sx={{ px: 2, py: 1.25, fontSize: 13, color: "#666" }}>
                    No matching students found
                  </Box>
                )}
              </Box>
            )}
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={printOnSecurityPaper}
                onChange={(e) => setPrintOnSecurityPaper(e.target.checked)}
                color="success"
              />
            }
            label={
              <Typography sx={{ fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap" }}>
                Print on Security Paper
              </Typography>
            }
            sx={{ mr: 1 }}
          />


          <button
            onClick={handleExportTorPdf}

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
            Download TOR
          </button>
        </Box>
      </Box>



      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      <br />
      <RegistrarEnrollmentTabs />
      <br />
      <br />
      <style>
        {`
            /* ===== Screen-only "separate pages" look =====
               These rules are NOT inside @media print, so they apply
               only to normal on-screen viewing. Each print-container
               (one per physical page) gets its own card styling with
               a fixed page size, border, shadow and gap so pages look
               visually separated instead of one continuous block. */
            .page-container {
                background: #e7e7e7;
                padding-top: 2rem;
            }
            .page-card {
                background: white;
                border: 1px solid #b8b8b8;
                box-shadow: 0 6px 18px rgba(0, 0, 0, 0.14);
                box-sizing: border-box;
                width: fit-content;
                min-width: 215.9mm;
               min-height: 355.6mm;
                padding: 10mm 12mm;
                margin: 0 auto 2.5rem;
            }

            @media print {
                @page {
                    margin: 0 !important; 
                    padding: 0 !important;
                      size: 215.9mm 355.6mm;
                }
                html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    height: auto;
                    position: relative
                }
                body * {
                    visibility: hidden;
                }
                .body, .page {
                    display: block !important;
                    overflow: visible !important;
                    height: auto !important;
                    max-height: none !important;
                }
                .page {
                    zoom: 0.85 !important;
                    position: absolute;
                    top: 0;
                    left: 26%;
                }
                .print-container, .print-container *, .page, .page *{
                    visibility: visible;
                }
                .print-container {
                    display: block;
                    width: 100%;
                    position: relative;
                    margin-top: 0 !mportant;
                    margin-bottom: 0 !mportant;
                    margin-right: 0 !mportant;
                    padding: 0 !important;
                    min-height: 13.5in;
                    margin-left: -23.5%;
                    font-family: "Arial";
                }
                .print-container:first-child {
                    page-break-after: auto;
                }
                .page-container{
                    display: block !important;
                    background: transparent !important;
                    padding: 0 !important;
                }   
                .print-container:last-child {
                    page-break-after: auto;
                    margin-top: 0;
                }
                .print-container:first-child .page-header{
                    top: 0;
                }
                .page-header{
                    margin-top: -0.5rem !important;
                    height: 10rem !important;
                }
                .table{
                    height: auto !important;
                    min-height: 0 !important;
                    max-height: none !important;
                    border-collapse: collapse !important;
                }
                .no-border{
                    border-bottom: none !important;
                }
                button {
                    display: none !important; /* hide buttons */
                }

                /* ✅ The screen-only "page card" look (border/shadow/fixed
                   size/gap) must disappear when printing, since the print
                   layout already handles page sizing via .print-container
                   and the @page rule above. Note: we deliberately do NOT
                   reset margin-left here, because .print-container relies
                   on margin-left: -23.5% (set above) to center the page —
                   resetting the full margin shorthand would break that. */
                .page-card {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    width: 100% !important;
                    min-height: 13.5in !important;
                    margin-top: 0 !important;
                    margin-right: 0 !important;
                    margin-bottom: 0 !important;
                }

            }
        `}
      </style>

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table>
          <TableHead
            sx={{
              backgroundColor: headerColor,
              border: `1px solid ${borderColor}`,
            }}
          >
            <TableRow>
              {/* Left cell: Student Number */}
              <TableCell
                sx={{
                  color: "white",
                  fontSize: "20px",
                  fontFamily: "Arial",
                  border: "none",
                }}
              >
                Student Number:&nbsp;
                <span
                  style={{
                    fontFamily: "Arial",
                    fontWeight: "normal",
                    textDecoration: "underline",
                  }}
                >
                  {studentData.student_number || "N/A"}
                </span>
              </TableCell>

              {/* Right cell: Student Name */}
              <TableCell
                align="right"
                sx={{
                  color: "white",
                  fontSize: "20px",
                  fontFamily: "Arial",
                  border: "none",
                }}
              >
                Student Name:&nbsp;
                <span
                  style={{
                    fontFamily: "Arial",
                    fontWeight: "normal",
                    textDecoration: "underline",
                  }}
                >
                  {formatStudentFullName(studentData)}
                </span>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          mb: 4,
        }}
      >
        <Box
          sx={{
            background: "white",
            border: `1px solid ${borderColor}`,

            width: "100%",
            p: 2,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <Typography
            sx={{
              fontWeight: "bold",
              color: titleColor,
              fontSize: "16px",
              mb: 2,
            }}
          >
            QUICK ACTIONS
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(140px, 1fr))",
              gap: 2,
              overflowX: { xs: "auto", md: "visible" },
              pb: { xs: 1, md: 0 },
            }}
          >
            {TOR_EDIT_OPTIONS.map((option) => (
              <Box
                key={option.key}
                onClick={() => handleTorEditCardClick(option.key)}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  cursor: "pointer",
                  borderRadius: 2,
                  border: `1px solid ${option.color}`,
                  backgroundColor: option.bg,
                  color: option.color,
                  padding: "16px 10px",
                  minHeight: "110px",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  "&:hover": {
                    transform: "translateY(-3px)",
                    boxShadow: "0 6px 14px rgba(0,0,0,0.14)",
                  },
                }}
              >
                {option.icon}
                <Typography
                  sx={{
                    fontSize: "13px",
                    fontWeight: "bold",
                    mt: 1,
                    lineHeight: 1.3,
                  }}
                >
                  {option.label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "11px",
                    color: "text.secondary",
                    mt: 0.3,
                    lineHeight: 1.2,
                  }}
                >
                  {option.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      <br />
      <br />

      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          width: "100%",
          mb: 4,
        }}
      >
        <Box
          sx={{
            background: "white",
            width: "100%",

          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
              px: 2,
              py: 1.5,
              backgroundColor: headerColor,
              color: "white",
              borderTop: `1px solid ${borderColor}`,
            }}
          >
            <Typography fontSize="14px" fontWeight="bold" color="white">
              Total Admin's Records: {signatures.length}
            </Typography>

            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Button
                onClick={() => setSignaturePage(0)}
                disabled={signaturePage === 0}
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
                  setSignaturePage((prev) => Math.max(prev - 1, 0))
                }
                disabled={signaturePage === 0}
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

              <FormControl size="small" sx={{ minWidth: 90 }}>
                <Select
                  value={signaturePage + 1}
                  onChange={(e) => setSignaturePage(Number(e.target.value) - 1)}
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
                  {Array.from({ length: totalSignaturePages }, (_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      Page {i + 1}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography fontSize="11px" color="white">
                of {totalSignaturePages} page
                {totalSignaturePages > 1 ? "s" : ""}
              </Typography>

              <Button
                onClick={() =>
                  setSignaturePage((prev) =>
                    Math.min(prev + 1, totalSignaturePages - 1),
                  )
                }
                disabled={signaturePage >= totalSignaturePages - 1}
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
                onClick={() => setSignaturePage(totalSignaturePages - 1)}
                disabled={signaturePage >= totalSignaturePages - 1}
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
          <TableContainer
            component={Paper}
            elevation={2}
            sx={{
              overflowX: "auto",
              width: "100%",
              margin: "0 auto",
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["#", "Full Name", "Designation", "Prepared By", "Checked By", "Registrar", "Date of Graduation",].map((header) => (
                    <TableCell
                      key={header}
                      sx={{
                        border: `1px solid ${borderColor}`,
                        fontWeight: 600,
                        color: titleColor,
                        textAlign: "center",
                        fontSize: "13px",
                        padding: "6px 10px", // smaller height
                      }}
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedSignatures.map((signature, index) => (
                  <TableRow key={signature.id}>
                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontSize: "12px",
                        color: titleColor,
                        padding: "4px 8px",
                      }}
                    >
                      {signaturePage * SIGNATURES_PER_PAGE + index + 1}
                    </TableCell>

                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontSize: "12px",
                        color: titleColor,
                        padding: "4px 8px",
                      }}
                    >
                      {signature.full_name}
                    </TableCell>

                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        color: titleColor,
                        fontSize: "12px",
                        padding: "4px 8px",
                      }}
                    >
                      {signature.designation}
                    </TableCell>

                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        color: titleColor,
                        padding: "4px 6px",
                      }}
                    >
                      <Checkbox
                        size="small"
                        color="primary"
                        checked={selectedPreparedBy?.id === signature.id}
                        onChange={() => handlePreparedByChange(signature)}
                        disabled={isSignatureSelectedForAnotherRole(signature, "prepared")}
                      />
                    </TableCell>

                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        color: titleColor,
                        padding: "4px 6px",
                      }}
                    >
                      <Checkbox
                        size="small"
                        color="secondary"
                        checked={selectedCheckedBy?.id === signature.id}
                        onChange={() => handleCheckedByChange(signature)}
                        disabled={isSignatureSelectedForAnotherRole(signature, "checked")}
                      />
                    </TableCell>

                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        color: titleColor,
                        padding: "4px 6px",
                      }}
                    >
                      <Checkbox
                        size="small"
                        color="success"
                        checked={selectedRegistrar?.id === signature.id}
                        onChange={() => handleRegistrarChange(signature)}
                        disabled={isSignatureSelectedForAnotherRole(signature, "registrar")}
                      />
                    </TableCell>

                  {index === 0 && (
  <TableCell
    rowSpan={paginatedSignatures.length}
    sx={{
      border: `1px solid ${borderColor}`,
      textAlign: "center",
      verticalAlign: "middle",
      color: titleColor,
      padding: "4px 6px",
    }}
  >
    <Box
      sx={{
        display: "flex",
        flexWrap: "nowrap",
        justifyContent: "center",
        alignItems: "center",
        gap: 1,
        width: "100%",
      }}
    >
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box sx={{ width: 190, flexShrink: 0 }}>
          <DateField
            label="Date of Graduation"
            value={graduationDate}
            onChange={handleGraduationDateChange}
            slotProps={{ textField: { size: "small", fullWidth: true } }}
          />
        </Box>
      </LocalizationProvider>

      <Button
        onClick={handleSaveGraduationDate}
        disabled={savingGraduationDate}
        variant="contained"
        size="small"
        startIcon={<SaveIcon fontSize="small" />}
        sx={{
          textTransform: "none",
          fontWeight: "bold",
          flexShrink: 0,
          whiteSpace: "nowrap",
          width: "150px",
          height: "40px"
        }}
      >
        {savingGraduationDate ? "Saving..." : "Save"}
      </Button>
    </Box>
  </TableCell>
)}


                  </TableRow>
                ))}

                {paginatedSignatures.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align="center"
                      sx={{
                        border: `1px solid ${borderColor}`,
                        color: titleColor,
                        padding: "8px",
                        fontSize: "12px",
                      }}
                    >
                      No signatures found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
              px: 2,
              py: 1.5,
              backgroundColor: headerColor,
              color: "white",
              borderTop: `1px solid ${borderColor}`,
            }}
          >
            <Typography fontSize="14px" fontWeight="bold" color="white">
              Total Admin's Records: {signatures.length}
            </Typography>

            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Button
                onClick={() => setSignaturePage(0)}
                disabled={signaturePage === 0}
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
                  setSignaturePage((prev) => Math.max(prev - 1, 0))
                }
                disabled={signaturePage === 0}
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

              <FormControl size="small" sx={{ minWidth: 90 }}>
                <Select
                  value={signaturePage + 1}
                  onChange={(e) => setSignaturePage(Number(e.target.value) - 1)}
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
                  {Array.from({ length: totalSignaturePages }, (_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      Page {i + 1}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography fontSize="11px" color="white">
                of {totalSignaturePages} page
                {totalSignaturePages > 1 ? "s" : ""}
              </Typography>

              <Button
                onClick={() =>
                  setSignaturePage((prev) =>
                    Math.min(prev + 1, totalSignaturePages - 1),
                  )
                }
                disabled={signaturePage >= totalSignaturePages - 1}
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
                onClick={() => setSignaturePage(totalSignaturePages - 1)}
                disabled={signaturePage >= totalSignaturePages - 1}
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
        </Box>



      </Box>



      <Box
        style={{ width: "100%", display: "flex", justifyContent: "center" }}
        className="page-container"
      >
        <Box
          ref={divToPrintRef}
          className="page"
          style={{ minWidth: "215.9mm" }}
        >
          {paginatedSubjects.map((pageGroups, pageIndex) => (
            <Box
              key={pageIndex}
              className={`print-container print-container-${pageIndex + 1} page-card`}
              style={{
                pageBreakAfter: "always",
                breakAfter: "page",
                marginTop: "3rem",
                paddingBottom: "1.5rem",
                position: "relative",
              }}
            >
              <Box
                style={{
                  position: "relative",
                  width: "80rem",
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                <Box
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    zIndex: 2,
                    marginTop: "50px",
                  }}
                >
                  <Box style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <img src={Act} alt="ACT" style={{ width: "50px", height: "50px", objectFit: "contain" }} />
                    <img src={Ukas} alt="UKAS" style={{ width: "50px", height: "50px", objectFit: "contain" }} />
                    <img src={Iaf} alt="IAF" style={{ width: "50px", height: "50px", objectFit: "contain" }} />
                  </Box>
                  <Typography
                    style={{
                      fontSize: "11px",
                      textAlign: "center",
                      marginTop: "20px",
                      lineHeight: 1.2,
                      fontFamily: "Arial",
                    }}
                  >
                    {(shortTerm || "").toUpperCase()} FORM NO. I-A
                    <br />
                    REVISED 2025
                  </Typography>
                </Box>

                {/* Start Of Header */}
                <Box
                  className="page-header"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: "10rem",
                    width: "80rem",
                    justifyContent: "center",
                  }}
                >
                  <Box
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      paddingTop: "1.5rem",
                      marginLeft: "-10rem",
                      paddingRight: "3rem",
                    }}
                  >
                    <img
                      src={BagongPilipinasLogo}
                      alt="Bagong Pilipinas"
                      style={{ width: "130px", height: "120px" }}
                    />
                    <img
                      src={fetchedLogo || EaristLogo}
                      alt="Logo"
                      style={{
                        width: "120px",
                        height: "120px",
                        borderRadius: "50%",
                      }}
                    />
                  </Box>
                  <Box style={{ marginTop: "1.5rem", textAlign: "center" }}>
                    <div style={{ fontFamily: "Arial", fontSize: "13px" }}>
                      Republic of the Philippines
                    </div>

                    {companyName &&
                      (() => {
                        const words = companyName.trim().split(" ");
                        const middle = Math.ceil(words.length / 2);
                        const firstLine = words.slice(0, middle).join(" ");
                        const secondLine = words.slice(middle).join(" ");
                        return (
                          <>
                            <Typography
                              style={{
                                marginTop: "0rem",
                                lineHeight: "1",
                                fontSize: "1.6rem",
                                letterSpacing: "-1px",
                                fontWeight: "600",
                                fontFamily: "Arial",
                                textTransform: "uppercase",
                              }}
                            >
                              {firstLine}
                            </Typography>
                            {secondLine && (
                              <Typography
                                style={{
                                  lineHeight: "1",
                                  fontSize: "1.6rem",
                                  letterSpacing: "-1px",
                                  fontWeight: "600",
                                  fontFamily: "Arial",
                                  textTransform: "uppercase",
                                }}
                              >
                                {secondLine}
                              </Typography>
                            )}
                          </>
                        );
                      })()}

                    <Typography style={{ fontFamily: "Arial", fontSize: "13px", fontWeight: "bold" }}>
                      {allBranchNames}
                    </Typography>
                  </Box>
                </Box>
                <Typography
                  style={{
                    height: "1.5rem",
                    textAlign: "center",
                    width: "80rem",
                    fontSize: "1.6rem",
                    letterSpacing: "-1px",
                    fontWeight: "500",
                  }}
                >
                  OFFICE OF THE REGISTRAR
                </Typography>
                <Typography
                  style={{
                    height: "2.5rem",
                    marginTop: "-0.5rem",
                    width: "80rem",
                    textAlign: "center",
                    fontSize: "2.75rem",
                    letterSpacing: "-1px",
                    fontWeight: "600",
                  }}
                >
                  OFFICIAL TRANSCRIPT OF RECORDS
                </Typography>
              </Box>

              <Box style={{ display: "flex", marginTop: "1rem", width: "80rem", marginLeft: "auto", marginRight: "auto" }}>
                <Box style={{ width: "100%" }}>
                  <Box
                    style={{
                      display: "flex",
                      height: "17.5rem",
                      width: "80rem",
                      marginLeft: "auto",
                      marginRight: "auto",
                      borderBottom: "solid black 1px",
                    }}
                  >
                    <Box
                      sx={{
                        padding: "1rem",
                        flex: "1 1 auto",
                        minWidth: 0,
                      }}
                    >
                      <Box>
                        <Box style={{ display: "flex", width: "70rem" }}>
                          <Typography
                            style={{
                              width: "20rem",
                              fontSize: "22px",
                              letterSpacing: "-2px",
                              wordSpacing: "14rem",
                            }}
                          >
                            NAME :
                          </Typography>

                          <Typography
                            style={{
                              display: "flex",
                              fontSize: "24px",
                              fontWeight: "600",
                              letterSpacing: "-1.5px",
                              wordSpacing: "3px",
                              alignItems: "center",
                              height: "36px",
                            }}
                          >
                            {formatStudentFullName(studentData)}
                          </Typography>
                        </Box>
                        <Box style={{ display: "flex", marginTop: "-6px" }}>
                          <Typography
                            style={{
                              display: "flex",
                              width: "17.8rem",
                              height: "20px",
                              alignItems: "center",
                              fontSize: "22px",
                              letterSpacing: "-1px",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>DATE OF BIRTH</span>
                            <span>:</span>
                          </Typography>
                          <Typography
                            style={{
                              fontSize: "21px",
                              marginTop: "-5px",
                              marginLeft: "2.3rem",
                              fontWeight: "400",
                              letterSpacing: "-1px",
                              wordSpacing: "3px",
                            }}
                          >
                            {formattedDate(studentData.birthOfDate)}
                          </Typography>
                        </Box>
                      </Box>
                      <Box>
                        <Box
                          style={{
                            display: "flex",
                            width: "62rem",
                            marginTop: "0.6rem",
                          }}
                        >
                          <Typography
                            style={{
                              display: "flex",
                              width: "17.8rem",
                              height: "20px",
                              alignItems: "center",
                              fontSize: "22px",
                              letterSpacing: "-2.3px",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>ADMISSION CREDENTIALS</span>
                            <span>:</span>
                          </Typography>
                          {studentData && studentData.requirements && (
                            <Typography
                              style={{
                                fontSize: "21px",
                                marginTop: "-5px",
                                height: "30px",
                                marginLeft: "2.3rem",
                                fontWeight: "400",
                                letterSpacing: "-2px",
                                wordSpacing: "1px",
                              }}
                            >
                              {admissionCredentialsNote}
                            </Typography>
                          )}
                        </Box>
                        <Box style={{ display: "flex", marginTop: "-1px" }}>
                          <Typography
                            style={{
                              display: "flex",
                              width: "17.8rem",
                              height: "20px",
                              alignItems: "center",
                              fontSize: "22px",
                              letterSpacing: "-2.3px",
                              justifyContent: "space-between",
                            }}
                          >
                            <span style={{ wordSpacing: "2px" }}>
                              LAST SCHOOL ATTENDED
                            </span>
                            <span>:</span>
                          </Typography>
                          <Typography
                            style={{
                              fontSize: "22px",
                              marginTop: "-5px",
                              marginLeft: "2.3rem",
                              fontWeight: "400",
                              letterSpacing: "-1.5px",
                              wordSpacing: "5px",
                              textTransform: "uppercase"
                            }}
                          >
                            {studentData.schoolLastAttended1}
                          </Typography>
                        </Box>
                        <Box style={{ display: "flex", marginTop: "-3px" }}>
                          <Typography
                            style={{
                              display: "flex",
                              width: "17.8rem",
                              height: "30px",
                              alignItems: "center",
                              fontSize: "22px",
                              letterSpacing: "-2.3px",
                              justifyContent: "space-between",
                            }}
                          >
                            <span style={{ wordSpacing: "3px" }}>
                              DATE GRADUATED
                            </span>
                            <span>:</span>
                          </Typography>
                          <Typography
                            style={{
                              fontSize: "22px",
                              marginTop: "-5px",
                              marginLeft: "2.3rem",
                              fontWeight: "400",
                              letterSpacing: "-1.5px",
                              wordSpacing: "5px",
                            }}
                          >
                            {formatYearGraduatedRange(studentData.yearGraduated1)}
                          </Typography>
                        </Box>
                      </Box>
                      <Box>
                        <Box
                          style={{
                            display: "flex",
                            width: "38rem",
                            marginTop: "0.9rem",
                          }}
                        >
                          <Typography
                            style={{
                              display: "flex",
                              width: "17.8rem",
                              height: "20px",
                              alignItems: "center",
                              fontSize: "22px",
                              letterSpacing: "-1px",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>STUDENT NUMBER</span>
                            <span>:</span>
                          </Typography>

                          <Typography
                            style={{
                              fontSize: "21px",
                              marginTop: "-5px",
                              marginLeft: "2.3rem",
                              fontWeight: "500",
                              letterSpacing: "-1px",
                              wordSpacing: "3px",
                              height: "30px",
                            }}
                          >
                            {studentData.student_number}
                          </Typography>
                        </Box>
                        <Box style={{ display: "flex" }}>
                          <Typography
                            style={{
                              display: "flex",
                              width: "17.8rem",
                              height: "20px",
                              alignItems: "center",
                              fontSize: "22px",
                              letterSpacing: "-1px",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>DEGREE/TITLE EARNED</span>
                            <span>:</span>
                          </Typography>
                          <Typography
                            style={{
                              fontSize: "22px",
                              marginLeft: "2.3rem",
                              marginTop: "-5.5px",
                              fontWeight: "500",
                              letterSpacing: "-1.5px",
                              wordSpacing: "5px",
                              height: "30px",
                            }}
                          >
                            {studentData && studentData.program_description
                              ? `${studentData.program_description?.toUpperCase()}`
                              : ""}
                          </Typography>
                        </Box>
                        <Box style={{ display: "flex", marginTop: "1px" }}>
                          <Typography
                            style={{
                              display: "flex",
                              width: "17.8rem",
                              height: "20px",
                              alignItems: "center",
                              fontSize: "22px",
                              letterSpacing: "-1.5px",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>MAJOR</span>
                            <span>:</span>
                          </Typography>
                          <Typography
                            style={{
                              fontSize: "22px",
                              marginTop: "-5px",
                              marginLeft: "2.3rem",
                              fontWeight: "500",
                              letterSpacing: "-1.5px",
                              wordSpacing: "5px",
                              height: "30px",
                            }}
                          >
                            {studentData && studentData.major
                              ? `${studentData.major?.toUpperCase()}`
                              : ""}
                          </Typography>
                        </Box>
                        <Box style={{ display: "flex", marginTop: "1px" }}>
                          <Typography
                            style={{
                              display: "flex",
                              width: "17.8rem",
                              height: "20px",
                              alignItems: "center",
                              fontSize: "22px",
                              letterSpacing: "-2px",
                              justifyContent: "space-between",
                              wordSpacing: "4px",
                            }}
                          >
                            <span>DATE OF GRADUATION</span>
                            <span>:</span>
                          </Typography>
                          <Typography
                            style={{
                              fontSize: "22px",
                              marginTop: "-5px",
                              marginLeft: "2.3rem",
                              fontWeight: "500",
                              letterSpacing: "-1.5px",
                              wordSpacing: "5px",
                            }}
                          >
                            {formattedGraduationDate}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box
                      style={{ marginLeft: "-12.6rem", marginTop: "1.3rem", flexShrink: 0 }}
                    >
                      <TextField
                        variant="outlined"
                        placeholder="Enter Document No."
                        value={getDocumentNumber(pageIndex)}
                        onChange={(e) => setDocumentNumberForPage(pageIndex, e.target.value)}
                        size="small"
                        inputProps={{
                          style: {
                            textAlign: "center",
                            fontSize: "14px",
                            fontWeight: 600,
                            padding: "6px 8px",
                          },
                        }}
                        sx={{
                          width: "280px",
                          mb: "4px",
                          backgroundColor: "#fff",
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "6px",
                          },
                          "& input::placeholder": {
                            fontSize: "16px",
                            opacity: 0.6,
                          },
                        }}
                      />
                      {!studentData?.profile_image ? (
                        <Avatar
                          sx={{
                            width: 225,
                            height: 225,
                            mx: "auto",
                            border: "1px solid black",
                            color: "maroon",
                            bgcolor: "transparent",
                          }}
                          variant="square"
                        />
                      ) : (
                        <Avatar
                          src={`${API_BASE_URL}/uploads/Student1by1/${studentData.profile_image}`}
                          sx={{
                            width: 225,
                            height: 225,
                            mx: "auto",
                            border: "1px solid black",
                          }}
                          variant="square"
                        />
                      )}
                    </Box>
                  </Box>
                  {/* End of Header */}
                  {/* Start of Main Content */}
                  <Box
                    style={{
                      display: "flex",
                      marginTop: "0.5rem",
                      width: "80rem",
                      marginLeft: "auto",
                      marginRight: "auto",
                      borderTop: "solid black 1px",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      style={{
                        flex: "1 1 auto",
                        minWidth: 0,
                        marginBottom: "1rem",
                        boxSizing: "border-box",
                      }}
                    >
                      <table
                        className="table"
                        style={{
                          height: "auto",
                          minHeight: 0,
                          width: "80rem",
                          borderCollapse: "collapse",
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              display: "flex",
                              height: "65px",
                              borderBottom: "solid 1px black",
                            }}
                          >
                            <td
                              style={{
                                fontWeight: "600",
                                fontSize: "20px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                letterSpacing: "0.8px",
                                width: "13rem",
                              }}
                            >
                              <span>TERM</span>
                            </td>
                            <td
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "38rem",
                              }}
                            >
                              <div
                                style={{
                                  margin: "-1px",
                                  fontWeight: "600",
                                  fontSize: "20px",
                                  textAlign: "center",
                                  letterSpacing: "-1px",
                                  width: "28rem",
                                }}
                              >
                                SUBJECTS
                              </div>
                              <div
                                style={{
                                  margin: "-1px",
                                  fontWeight: "600",
                                  fontSize: "20px",
                                  textAlign: "center",
                                  letterSpacing: "-1px",
                                  width: "28rem",
                                  wordSpacing: "3px",
                                }}
                              >
                                CODE NUMBER WITH DESCRIPTIVE TITLE
                              </div>
                            </td>
                            <td>
                              <div
                                style={{
                                  fontWeight: "600",
                                  textAlign: "center",
                                  fontSize: "20px",
                                  letterSpacing: "-1px",
                                  width: "13rem",
                                }}
                              >
                                <span style={{ marginLeft: "-1.6rem" }}>
                                  GRADES
                                </span>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <div
                                  style={{
                                    fontWeight: "600",
                                    fontSize: "20px",
                                    textAlign: "center",
                                    letterSpacing: "-1px",
                                    width: "6rem",
                                  }}
                                >
                                  <span>FINAL</span>
                                </div>
                                <div
                                  style={{
                                    textAlign: "center",
                                    fontWeight: "600",
                                    fontSize: "20px",
                                    marginLeft: "-2rem",
                                    letterSpacing: "-1px",
                                    width: "7rem",
                                  }}
                                >
                                  <span>RE-EXAM</span>
                                </div>
                              </div>
                            </td>
                            <td
                              style={{
                                fontWeight: "600",
                                display: "flex",
                                fontSize: "20px",
                                alignItems: "center",
                                justifyContent: "center",
                                letterSpacing: "-1px",
                                width: "7rem",
                              }}
                            >
                              <span>CREDITS</span>
                            </td>
                            <td
                              style={{
                                fontWeight: "600",
                                display: "flex",
                                fontSize: "20px",
                                alignItems: "center",
                                justifyContent: "center",
                                letterSpacing: "-1px",
                                width: "8.9rem",
                              }}
                            >
                              <span>REMARKS</span>
                            </td>
                          </tr>
                        </thead>
                        <tbody
                          style={{ maxWidth: "650px", overflowY: "hidden" }}
                        >
                          <tr>
                            <td
                              style={{
                                fontWeight: "500",
                                textUnderlineOffset: "3px",
                                textDecoration: "underline",
                                letterSpacing: "-1px",
                                paddingLeft: "1.5rem",
                                fontSize: "20px",
                              }}
                            >
                              {studentData && studentData.program_description
                                ? `${studentData.program_description?.toUpperCase()}`
                                : ""}
                            </td>
                          </tr>

                          {pageGroups.map((group, groupIndex) => {
                            const compactTermLabel =
                              pageIndex === paginatedSubjects.length - 1 &&
                              groupIndex === pageGroups.length - 1 &&
                              group.subjects.length <= 6;

                            return (
                              <React.Fragment key={group.termKey}>
                                {group.subjects.map((p, index) => {
                                  const isCompactTermRow =
                                    compactTermLabel && index === 0;

                                  return (
                                    <tr
                                      style={{
                                        display: "flex",

                                        alignItems: isCompactTermRow
                                          ? "center"
                                          : "flex-start",
                                        lineHeight: "22px",
                                        minHeight: isCompactTermRow
                                          ? "38px"
                                          : "22px",
                                      }}
                                      key={p.enrolled_id}
                                    >
                                      <td
                                        style={{
                                          width: "13rem",
                                          fontWeight: "400",
                                          position: "relative", // anchor for the year line below
                                          lineHeight: compactTermLabel ? "18px" : "22px",
                                        }}
                                      >
                                        {!group.isContinuation && index === 0 && (
                                          <>
                                            <span
                                              style={{
                                                display: "block",
                                                fontSize: compactTermLabel ? "17px" : "18px",
                                                textAlign: "center",
                                                width: "14rem",
                                                fontWeight: "500",
                                                lineHeight: compactTermLabel ? "18px" : "22px",
                                              }}
                                            >
                                              {convertSemester(p)}
                                            </span>
                                            <span
                                              style={{
                                                position: "absolute",
                                                top: compactTermLabel ? "18px" : "22px", // exactly one row's own line-height, not an arbitrary "3rem"
                                                left: 0,
                                                fontSize: compactTermLabel ? "16px" : "17px",
                                                textAlign: "center",
                                                width: "13.5rem",
                                                fontWeight: "500",
                                                lineHeight: compactTermLabel ? "18px" : "22px",
                                              }}
                                            >
                                              {p.current_year} - {p.next_year}
                                            </span>
                                          </>
                                        )}
                                      </td>
                                      <td
                                        style={{
                                          display: "flex",
                                          alignItems: isCompactTermRow
                                            ? "center"
                                            : "flex-start",
                                          width: "38rem",
                                          lineHeight: "22px",
                                          padding: 0,
                                        }}
                                      >
                                        <span
                                          style={{
                                            width: "9.5rem",
                                            flex: "0 0 9.5rem",
                                            margin: "0",
                                            padding: "0",
                                            fontSize: "18px",
                                            lineHeight: "22px",
                                            letterSpacing: "-0.5px",
                                            whiteSpace: "normal",
                                          }}
                                        >
                                          {p.course_code}
                                        </span>
                                        <span
                                          style={{
                                            flex: "1 1 auto",
                                            marginLeft: 0,
                                            padding: "0",
                                            fontSize: "18px",
                                            lineHeight: "22px",
                                            letterSpacing: "-0.5px",
                                          }}
                                        >
                                          {p.course_description
                                            ? p.course_description?.toUpperCase()
                                            : ""}
                                          &nbsp;
                                          {p.component === 1
                                            ? "CWTS"
                                            : p.component === 2
                                              ? "LTS"
                                              : p.component === 3
                                                ? "MTS"
                                                : ""}
                                        </span>
                                      </td>
                                      <td>
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            minHeight: isCompactTermRow
                                              ? "38px"
                                              : "22px",
                                            lineHeight: "22px",
                                          }}
                                        >
                                          <div
                                            style={{
                                              fontSize: "18px",
                                              width: "6rem",
                                              textAlign: "center",
                                              lineHeight: "22px",
                                            }}
                                          >
                                            <span>
                                              {handleGradeConversion(
                                                p.final_grade || p.numeric_grade,
                                              )}
                                            </span>
                                          </div>
                                          <div
                                            style={{
                                              fontSize: "18px",
                                              textAlign: "center",
                                              width: "7rem",
                                              marginLeft: "-2rem",
                                              lineHeight: "22px",
                                            }}
                                          >
                                            <span></span>
                                          </div>
                                        </div>
                                      </td>
                                      <td>
                                        <div
                                          style={{
                                            display: "flex",
                                            fontSize: "18px",
                                            alignItems: "center",
                                            minHeight: isCompactTermRow
                                              ? "38px"
                                              : "22px",
                                            width: "7rem",
                                            marginLeft: "1.7rem",
                                            justifyContent: "center",
                                            lineHeight: "22px",
                                          }}
                                        >
                                          {totalUnitPerSubject(
                                            p.course_unit,
                                            p.lab_unit,
                                          )}
                                        </div>
                                      </td>
                                      <td>
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            minHeight: isCompactTermRow
                                              ? "38px"
                                              : "22px",
                                            width: "8.9rem",
                                            fontSize: "18px",
                                            justifyContent: "center",
                                            lineHeight: "22px",
                                          }}
                                        >
                                          {p.en_remarks === 0
                                            ? "Ongoing"
                                            : p.en_remarks === 1
                                              ? "Passed"
                                              : p.en_remarks === 2
                                                ? "Failed"
                                                : p.en_remarks === 3
                                                  ? "Incomplete"
                                                  : p.en_remarks === 4
                                                    ? "Dropped"
                                                    : ""}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}

                          <tr
                            style={{
                              display: "flex",
                              height: "auto",
                              lineHeight: 1,
                              marginTop: "15px"

                            }}
                          >
                            {pageIndex === paginatedSubjects.length - 1 ? (
                              <td
                                className="table-cell-padding"
                                style={{
                                  textAlign: "center",
                                  width: "80rem",
                                  padding: "1px 0 0",
                                  lineHeight: 1,
                                }}
                              >
                                <span
                                  style={{
                                    display: "block",
                                    fontSize: "17px",
                                    fontWeight: "600",
                                    lineHeight: 1.3,
                                    whiteSpace: "normal",
                                    width: "100%",
                                    overflow: "visible",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "block",
                                      fontSize: "17px",
                                      fontWeight: "600",
                                      lineHeight: 1.3,
                                      whiteSpace: "normal",
                                      width: "100%",
                                      overflow: "visible",
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    <span style={{ fontSize: "14px", marginRight: "2px" }}>
                                      {repeatShortTermWithSpaces(shortTerm)} xxx{" "}
                                    </span>
                                    NOTHING FOLLOWS
                                    <span style={{ fontSize: "14px", marginLeft: "2px" }}>
                                      {" "}
                                      xxx {repeatShortTermWithSpaces(shortTerm)}
                                    </span>
                                  </span>
                                </span>
                              </td>
                            ) : (
                              <td
                                style={{
                                  textAlign: "center",
                                  borderTop: "dashed 1px black",
                                  width: "80rem",
                                  padding: "1px 0 0",
                                  lineHeight: 1,
                                  marginTop: "20px"
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "17px",
                                    fontWeight: "600",
                                  }}
                                >
                                  - continued on next page -
                                </span>
                              </td>
                            )}
                          </tr>
                        </tbody>
                      </table>
                      <Box
                        className="page-footer"
                        style={{
                          display: "flex",

                          width: "80rem",
                          marginLeft: "auto",
                          marginRight: "auto",
                          flexWrap: "wrap",
                        }}
                      >
                        <Box
                          style={{
                            flex: "1 1 auto",
                            minWidth: 0,
                            marginBottom: "1rem",
                            boxSizing: "border-box",
                          }}
                        >
                          <table style={{ width: "80rem", borderCollapse: "collapse" }}>
                            <thead>
                              <tr
                                className="grading_sytse_tble"
                                style={{
                                  display: "flex",
                                  height: "145px",
                                  borderTop: "solid 1px black",
                                }}
                              >
                                <td
                                  style={{
                                    fontWeight: "400",
                                    fontSize: "18px",
                                    display: "flex",
                                    alignItems: "start",
                                    justifyContent: "center",
                                    letterSpacing: "-1px",
                                    width: "13rem",
                                  }}
                                >
                                  <span>GRADING SYSTEM</span>
                                </td>

                                {/* grade — first half */}
                                <td style={{ display: "flex", flexDirection: "column", alignItems: "start", width: "4.5rem" }}>
                                  {gradingSystemFirstHalf.map((row, i) => (
                                    <div key={`gs-grade-1-${row.id}`} style={{ margin: "-1px", fontWeight: "400", fontSize: "16px", letterSpacing: "0px", paddingTop: i === 0 ? "3px" : 0 }}>
                                      {row.equivalent_grade}
                                    </div>
                                  ))}
                                </td>

                                {/* score range — first half */}
                                <td style={{ display: "flex", flexDirection: "column", alignItems: "start", width: "6.5rem" }}>
                                  {gradingSystemFirstHalf.map((row, i) => (
                                    <div key={`gs-score-1-${row.id}`} style={{ margin: "-1px", fontWeight: "400", fontSize: "16px", letterSpacing: "-2px", paddingTop: i === 0 ? "3px" : 0 }}>
                                      ({formatScoreRange(row.min_score, row.max_score)})
                                    </div>
                                  ))}
                                </td>

                                {/* description — first half (FIXED) */}
                                <td style={{ display: "flex", flexDirection: "column", alignItems: "start", width: "15.5rem" }}>
                                  {gradingSystemFirstHalf.map((row, i) => (
                                    <div key={`gs-desc-1-${row.id}`} style={{ margin: "-1px", fontWeight: "400", fontSize: "16px", letterSpacing: "-1px", paddingTop: i === 0 ? "3px" : 0 }}>
                                      {row.descriptive_rating}
                                    </div>
                                  ))}
                                </td>

                                {/* grade — second half */}
                                <td style={{ display: "flex", flexDirection: "column", alignItems: "start", width: "4.5rem" }}>
                                  {gradingSystemSecondHalf.map((row, i) => (
                                    <div key={`gs-grade-2-${row.id}`} style={{ margin: "-1px", fontWeight: "400", fontSize: "16px", letterSpacing: "-1px", paddingTop: i === 0 ? "3px" : 0 }}>
                                      {row.equivalent_grade}
                                    </div>
                                  ))}
                                </td>

                                {/* score range — second half */}
                                <td style={{ display: "flex", flexDirection: "column", alignItems: "start", width: "14rem" }}>
                                  {gradingSystemSecondHalf.map((row, i) => (
                                    <div key={`gs-score-2-${row.id}`} style={{ margin: "-1px", fontWeight: "400", fontSize: "16px", letterSpacing: "-2px", paddingTop: i === 0 ? "3px" : 0 }}>
                                      ({formatScoreRange(row.min_score, row.max_score)})
                                    </div>
                                  ))}
                                </td>

                                {/* description — second half (FIXED) */}
                                <td style={{ display: "flex", flexDirection: "column", alignItems: "start", width: "22rem" }}>
                                  {gradingSystemSecondHalf.map((row, i) => (
                                    <div key={`gs-desc-2-${row.id}`} style={{ margin: "-1px", fontWeight: "400", fontSize: "16px", letterSpacing: "-1px", paddingTop: i === 0 ? "3px" : 0 }}>
                                      {row.descriptive_rating}
                                    </div>
                                  ))}
                                </td>
                              </tr>
                              <tr
                                style={{
                                  display: "flex",
                                  paddingLeft: "2rem",
                                  height: "35px",
                                  marginTop: "10px",
                                  borderBottom: "solid 1px black",
                                }}
                              >
                                <td>
                                  <span style={{ fontSize: "18px" }}>{creditsNote}</span>
                                </td>
                              </tr>
                              <tr
                                style={{
                                  display: "flex",
                                  paddingLeft: "2rem",
                                  height: "65px",
                                  borderBottom: "solid 1px black",
                                }}
                              >
                                <td style={{ marginTop: "8px" }}>
                                  <span
                                    style={{
                                      fontSize: "18px",
                                      marginRight: "8px",
                                      letterSpacing: "-0.8px",
                                      wordSpacing: "1px",
                                    }}
                                  >
                                    {companyName?.toUpperCase()}
                                  </span>
                                  <span style={{ letterSpacing: "-0.8px", fontSize: "17px", wordSpacing: "1px" }}>
                                    {institutionNote}
                                  </span>
                                </td>
                              </tr>
                              <tr
                                style={{
                                  display: "flex",
                                  paddingLeft: "1rem",
                                  marginTop: "0.3rem",
                                  height: "65px",
                                  borderTop: "solid 1px black",
                                  borderBottom: "solid 1px black",
                                  alignItems: "center",
                                }}
                              >
                                <td style={{ marginTop: "8px" }}>
                                  <span
                                    style={{
                                      fontSize: "18px",
                                      fontWeight: "600",
                                      marginRight: "8px",
                                      letterSpacing: "-0.8px",
                                      wordSpacing: "1px",
                                    }}
                                  >
                                    REMARKS:
                                  </span>
                                  <span style={{ fontSize: "18px", fontWeight: "400", letterSpacing: "-0.5px" }}>
                                    {getPageRemarksText(
                                      pageIndex === paginatedSubjects.length - 1,
                                      studentData?.program_description
                                        ? studentData.program_description.toUpperCase()
                                        : "",
                                    )}
                                  </span>
                                </td>
                              </tr>
                              <tr
                                className="no-border"
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  paddingLeft: "1rem",
                                  marginTop: "0.3rem",
                                  height: "9rem",
                                  borderBottom: "solid black 1px",
                                }}
                              >
                                <td
                                  style={{
                                    marginTop: "3px",
                                    width: "8rem",
                                    height: "9rem",
                                    position: "relative",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "flex-end",
                                    alignItems: "center",
                                    fontSize: "13px",
                                    paddingBottom: "0.5rem",
                                    lineHeight: 1.3,
                                  }}
                                >
                                  <div
                                    style={{
                                      position: "absolute",
                                      bottom: "0.5rem",
                                      left: "60%",
                                      transform: "translateX(-50%)",
                                      textAlign: "center",
                                      zIndex: 0,
                                      pointerEvents: "none",
                                    }}
                                  >
                                    <span style={{ whiteSpace: "nowrap", display: "block" }}>NOT VALID WITHOUT OFFICIAL</span>
                                    <span style={{ whiteSpace: "nowrap", display: "block" }}>SEAL OF THE INSTITUTE</span>
                                  </div>
                                </td>
                                <td style={{ marginTop: "3px", width: "3rem" }}>
                                  <div>
                                    <span
                                      style={{
                                        fontSize: "18px",
                                        letterSpacing: "-1px",
                                        wordSpacing: "3px",
                                      }}
                                    ></span>
                                    <span></span>
                                  </div>
                                </td>
                                <td style={{ marginTop: "3px", width: "20rem" }}>
                                  <span
                                    style={{
                                      fontSize: "18px",
                                      fontWeight: "400",
                                      marginRight: "2.4rem",
                                      letterSpacing: "-0.8px",
                                      wordSpacing: "1px",
                                    }}
                                  >
                                    PREPARED BY:
                                  </span>
                                  <div style={{ marginTop: "0.4rem", textAlign: "center" }}>
                                    {selectedPreparedBy?.signature_image ? (
                                      <img
                                        src={getSignatureImageSrc(selectedPreparedBy)}
                                        alt={selectedPreparedBy.signature_name || "Prepared by signature"}
                                        style={{
                                          width: "16rem",
                                          height: "4rem",
                                          objectFit: "contain",
                                          display: "block",
                                          margin: "0 auto -0.2rem",
                                        }}
                                      />
                                    ) : (
                                      <div style={{ width: "16rem", height: "4rem", margin: "0 auto" }} />
                                    )}
                                    <span
                                      style={{
                                        display: "block",
                                        fontSize: "18px",
                                        fontWeight: "500",
                                        letterSpacing: "-1px",
                                        wordSpacing: "3px",
                                        whiteSpace: "normal",
                                        wordBreak: "break-word",
                                        lineHeight: "1.15",
                                        maxWidth: "19rem",
                                      }}
                                    >
                                      {selectedPreparedBy?.full_name?.toUpperCase() || ""}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ marginTop: "3px", width: "20rem" }}>
                                  <span
                                    style={{
                                      fontSize: "18px",
                                      fontWeight: "400",
                                      marginRight: "2.4rem",
                                      letterSpacing: "-0.8px",
                                      wordSpacing: "1px",
                                    }}
                                  >
                                    CHECKED BY:
                                  </span>
                                  <div style={{ marginTop: "0.4rem", textAlign: "center" }}>
                                    {selectedCheckedBy?.signature_image ? (
                                      <img
                                        src={getSignatureImageSrc(selectedCheckedBy)}
                                        alt={selectedCheckedBy.signature_name || "Checked by signature"}
                                        style={{
                                          width: "16rem",
                                          height: "4rem",
                                          objectFit: "contain",
                                          display: "block",
                                          margin: "0 auto -0.2rem",
                                        }}
                                      />
                                    ) : (
                                      <div style={{ width: "16rem", height: "4rem", margin: "0 auto" }} />
                                    )}
                                    <span
                                      style={{
                                        display: "block",
                                        fontSize: "18px",
                                        fontWeight: "500",
                                        letterSpacing: "-1px",
                                        wordSpacing: "3px",
                                        whiteSpace: "normal",
                                        wordBreak: "break-word",
                                        lineHeight: "1.15",
                                        maxWidth: "19rem",
                                      }}
                                    >
                                      {selectedCheckedBy?.full_name?.toUpperCase() || ""}
                                    </span>
                                  </div>
                                </td>
                                <td
                                  style={{
                                    marginTop: "3px",
                                    width: "21rem",
                                    justifyContent: "center",
                                    alignContent: "center",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      textAlign: "center",
                                    }}
                                  >
                                    {selectedRegistrar?.signature_image ? (
                                      <img
                                        src={getSignatureImageSrc(selectedRegistrar)}
                                        alt={selectedRegistrar.signature_name || "Registrar signature"}
                                        style={{
                                          width: "16rem",
                                          height: "4rem",
                                          objectFit: "contain",
                                          display: "block",
                                          margin: "0 auto -0.2rem",
                                        }}
                                      />
                                    ) : (
                                      <div style={{ width: "16rem", height: "4rem", margin: "0 auto" }} />
                                    )}
                                    <span
                                      style={{
                                        fontSize: "22px",
                                        letterSpacing: "-1px",
                                        whiteSpace: "normal",
                                        wordBreak: "break-word",
                                        maxWidth: "20rem",
                                        lineHeight: "1.15",
                                      }}
                                    >
                                      {selectedRegistrar?.full_name?.toUpperCase() || ""}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: "18px",
                                        letterSpacing: "-1px",
                                        wordSpacing: "3px",
                                      }}
                                    >
                                      REGISTRAR
                                    </span>
                                  </div>
                                </td>

                                <td
                                  style={{
                                    marginTop: "3px",
                                    width: "8rem",
                                    marginLeft: "auto",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      width: "6.5rem",
                                      height: "6.5rem",
                                      border: torQrStatus.has_qr ? "none" : "1px dashed #aaa",
                                      borderRadius: "4px",
                                      backgroundColor: torQrStatus.has_qr ? "transparent" : "#fafafa",
                                      mx: "auto",
                                    }}
                                  >
                                    {studentData?.student_number && torQrStatus.has_qr && torQrStatus.tor_qr_image_url ? (
                                      <img
                                        src={`${API_BASE_URL}/api/graduate-qr/${studentData.student_number}`}
                                        alt="Scan to verify this Transcript of Records"
                                        style={{ width: "6.5rem", height: "6.5rem", objectFit: "contain", display: "block" }}
                                      />
                                    ) : (
                                      <Typography
                                        sx={{
                                          fontSize: "9px",
                                          color: "#999",
                                          textAlign: "center",
                                          lineHeight: 1.2,
                                          px: 0.5,
                                        }}
                                      >
                                        No QR issued
                                      </Typography>
                                    )}
                                  </Box>
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      letterSpacing: "-0.3px",
                                      marginTop: "0.2rem",
                                      lineHeight: 1.1,
                                      textAlign: "center",
                                      display: "block",
                                    }}
                                  >
                                    SCAN TO VERIFY
                                  </span>
                                </td>
                              </tr>

                              <tr
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  marginTop: "0.4rem",
                                  paddingTop: "0.3rem",
                                }}
                              >
                                <td
                                  style={{
                                    width: "80rem",
                                    textAlign: "center",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {institutionWebsite && (
                                    <span
                                      style={{
                                        fontSize: "13px",
                                        fontWeight: 700,
                                        letterSpacing: "0.3px",
                                      }}
                                    >
                                      {institutionWebsite}
                                      {branches.filter((b) => b?.address || b?.branch_address || b?.campus_address).length > 0 && (
                                        <span style={{ margin: "0 0.75rem", fontWeight: 400 }}>|</span>
                                      )}
                                    </span>
                                  )}
                                  {branches
                                    .filter((b) => b?.address || b?.branch_address || b?.campus_address)
                                    .map((b, index, arr) => (
                                      <span
                                        key={b.id ?? b.branch}
                                        style={{
                                          fontSize: "14px",
                                          letterSpacing: "-0.3px",
                                          lineHeight: 1.3,
                                        }}
                                      >
                                        <span style={{ fontWeight: 700 }}>
                                          {(b.branch || b.branch_name || "").toUpperCase()}:
                                        </span>{" "}
                                        {b.address || b.branch_address || b.campus_address}
                                        {index < arr.length - 1 && (
                                          <span style={{ margin: "0 0.75rem", fontWeight: 400 }}>|</span>
                                        )}
                                      </span>
                                    ))}
                                </td>
                              </tr>
                            </thead>
                          </table>
                        </Box>
                      </Box>
                    </Box>
                  </Box>

                </Box>
              </Box>

            </Box>
          ))}


        </Box>
      </Box>

      <PhotoCaptureDialog
        open={photoCaptureOpen}
        onClose={() => setPhotoCaptureOpen(false)}
        personId={studentData?.person_id}
        onUploaded={(filename) => {
          setStudentData((prev) => ({ ...prev, profile_image: filename }));
          setSnackbarMessage("Student photo updated successfully.");
          setOpenSnackbar(true);
        }}
      />

      <Dialog open={remarksDialogOpen} onClose={closeRemarksDialog} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            bgcolor: mainButtonColor || "#1976d2",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          📝 Edit Remarks
          <IconButton
            onClick={closeRemarksDialog}
            sx={{
              color: "white",
              border: "2px solid rgba(255,255,255,0.6)",
              borderRadius: "50%",
              width: 40,
              height: 40,
              padding: 0,
              "&:hover": { backgroundColor: "rgba(255,255,255,0.2)", border: "2px solid white" },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This text appears in the REMARKS field on every page of the Transcript
            of Records, except the last page — which automatically shows the
            graduation remark based on the Date of Graduation you set above.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Remarks"
            value={remarksDraft}
            onChange={(e) => setRemarksDraft(e.target.value)}
          />
        </DialogContent>

        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
          <Button onClick={closeRemarksDialog} color="error" variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSaveRemarks} variant="contained" color="success">
            Save Remarks
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={gradingSystemDialogOpen}
        onClose={closeGradingSystemDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor: "#2e7d32",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          📊 Edit Grading System
          <IconButton
            onClick={closeGradingSystemDialog}
            sx={{
              color: "white",
              border: "2px solid rgba(255,255,255,0.6)",
              borderRadius: "50%",
              width: 40,
              height: 40,
              padding: 0,
              "&:hover": { backgroundColor: "rgba(255,255,255,0.2)", border: "2px solid white" },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Check the grade conversion rows that should appear in the GRADING SYSTEM
            block printed on every page of the Transcript of Records. To add or edit
            a row itself, use Admin → Grade Conversion.
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, width: "10%" }} align="center">Show</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: "18%" }}>Grade</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: "27%" }}>Score Range</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: "45%" }}>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gradingSystemDraft.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell align="center">
                      <Checkbox
                        checked={!!row.show_on_tor}
                        onChange={() => handleToggleGradingSystemRow(row.id)}
                      />
                    </TableCell>
                    <TableCell>{row.equivalent_grade}</TableCell>
                    <TableCell>{row.min_score}–{row.max_score}</TableCell>
                    <TableCell>{row.descriptive_rating}</TableCell>
                  </TableRow>
                ))}
                {gradingSystemDraft.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ color: "text.secondary" }}>
                      No grade conversion rows found. Add them in Admin → Grade Conversion first.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>

        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
          <Button onClick={closeGradingSystemDialog} color="error" variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSaveGradingSystem} variant="contained" color="success">
            Save Grading System
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={footerNotesDialogOpen} onClose={closeFooterNotesDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: "#6a1b9a", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          📄 Edit Credits & Institution Note
          <IconButton onClick={closeFooterNotesDialog} sx={{ color: "white", border: "2px solid rgba(255,255,255,0.6)", borderRadius: "50%", width: 40, height: 40, padding: 0 }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <TextField
            fullWidth multiline minRows={2} label="Credits line"
            value={creditsNoteDraft} onChange={(e) => setCreditsNoteDraft(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Shown after the school name (which is filled in automatically).
          </Typography>
          <TextField
            fullWidth multiline minRows={3} label="Institution note"
            value={institutionNoteDraft} onChange={(e) => setInstitutionNoteDraft(e.target.value)}
          />
          <TextField
            fullWidth
            label="Institute website"
            placeholder="Enter Institute Website"
            value={institutionWebsiteDraft}
            onChange={(e) => setInstitutionWebsiteDraft(e.target.value)}
            sx={{ mt: 3 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
          <Button onClick={closeFooterNotesDialog} color="error" variant="outlined">Cancel</Button>
          <Button onClick={handleSaveFooterNotes} variant="contained" color="success">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={admissionCredentialsDialogOpen}
        onClose={closeAdmissionCredentialsDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            bgcolor: "#c2410c",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          🎓 Edit Admission Credentials
          <IconButton
            onClick={closeAdmissionCredentialsDialog}
            sx={{
              color: "white",
              border: "2px solid rgba(255,255,255,0.6)",
              borderRadius: "50%",
              width: 40,
              height: 40,
              padding: 0,
              "&:hover": { backgroundColor: "rgba(255,255,255,0.2)", border: "2px solid white" },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This text appears in the ADMISSION CREDENTIALS field on every page of
            the Transcript of Records, both on-screen and in the downloaded PDF.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Admission Credentials"
            value={admissionCredentialsDraft}
            onChange={(e) => setAdmissionCredentialsDraft(e.target.value)}
          />
        </DialogContent>

        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
          <Button onClick={closeAdmissionCredentialsDialog} color="error" variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSaveAdmissionCredentials} variant="contained" color="success">
            Save
          </Button>
        </DialogActions>
      </Dialog>


      <Dialog open={signatoriesDialogOpen} onClose={closeSignatoriesDialog} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            bgcolor: "#0288d1",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          ✍️ Edit Signatories
          <IconButton
            onClick={closeSignatoriesDialog}
            sx={{
              color: "white",
              border: "2px solid rgba(255,255,255,0.6)",
              borderRadius: "50%",
              width: 40,
              height: 40,
              padding: 0,
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3, bgcolor: "#f7f9fc" }}>
          {[
            { role: "prepared_by", label: "Prepared By", color: "#0288d1" },
            { role: "checked_by", label: "Checked By", color: "#7b1fa2" },
            { role: "registrar", label: "Registrar", color: "#2e7d32" },
          ].map(({ role, label, color }, i, arr) => {
            const draft = signatoriesDraft[role];
            const currentImage = torSignatories[role]?.signature_image;
            return (
              <Paper
                key={role}
                variant="outlined"
                sx={{
                  p: 2.5,
                  mb: i < arr.length - 1 ? 2 : 0,
                  borderRadius: 2,
                  borderLeft: `4px solid ${color}`,
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, color, mb: 1.5, letterSpacing: 0.3 }}
                >
                  {label}
                </Typography>

                {/* Signature preview — full width, tall, so it's actually legible */}
                <Box
                  sx={{
                    width: "100%",
                    height: 160,
                    border: "1px dashed #bbb",
                    borderRadius: 1.5,
                    bgcolor: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    mb: 1.5,
                  }}
                >
                  {draft.removed ? (
                    <Typography sx={{ fontSize: 13, color: "#c62828", fontStyle: "italic" }}>
                      Signature will be removed on save
                    </Typography>
                  ) : draft.preview || currentImage ? (
                    <img
                      src={draft.preview || `${API_BASE_URL}/uploads/${currentImage}`}
                      alt={`${label} signature`}
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <Typography sx={{ fontSize: 13, color: "#999" }}>
                      No signature uploaded
                    </Typography>
                  )}
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <Button
                    component="label"
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: color, color, textTransform: "none", flexShrink: 0 }}
                  >
                    Upload image
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => handleSignatoryFileChange(role, e.target.files?.[0])}
                    />
                  </Button>

                  {/* ✅ NEW — only show if there's something to remove and it isn't already marked removed */}
                  {(draft.preview || currentImage) && !draft.removed && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteOutlineIcon />}
                      sx={{ textTransform: "none", flexShrink: 0 }}
                      onClick={() => handleRemoveSignature(role)}
                    >
                      Remove signature
                    </Button>
                  )}

                  <TextField
                    label="Full name"
                    size="small"
                    value={draft.full_name}
                    onChange={(e) => handleSignatoryFieldChange(role, "full_name", e.target.value)}
                    sx={{ width: 220 }}
                  />
                  <TextField
                    label="Designation"
                    size="small"
                    value={draft.designation}
                    onChange={(e) => handleSignatoryFieldChange(role, "designation", e.target.value)}
                    sx={{ width: 220 }}
                  />
                </Box>
              </Paper>
            );
          })}
        </DialogContent>

        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
          <Button onClick={closeSignatoriesDialog} color="error" variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSaveSignatories} variant="contained" color="success">
            Save Signatories
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={documentNumberDialogOpen} onClose={closeDocumentNumberDialog} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            bgcolor: "#00695c",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          🔢 Edit Document Number
          <IconButton
            onClick={closeDocumentNumberDialog}
            sx={{
              color: "white",
              border: "2px solid rgba(255,255,255,0.6)",
              borderRadius: "50%",
              width: 40,
              height: 40,
              padding: 0,
              "&:hover": { backgroundColor: "rgba(255,255,255,0.2)", border: "2px solid white" },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This transcript currently has <strong>{documentNumberDraft.length}</strong> page
            {documentNumberDraft.length !== 1 ? "s" : ""}. Each page can have its own document number,
            printed at its top-right corner — you can still edit an individual page's number directly
            above its photo as well.
          </Typography>

          {documentNumberDraft.map((value, pageIndex) => (
            <TextField
              key={pageIndex}
              fullWidth
              label={`Page ${pageIndex + 1} Document Number`}
              placeholder="Enter Document No."
              value={value}
              onChange={(e) => handleDocumentNumberDraftChange(pageIndex, e.target.value)}
              sx={{ mb: pageIndex < documentNumberDraft.length - 1 ? 2 : 0 }}
            />
          ))}
        </DialogContent>

        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
          <Button onClick={closeDocumentNumberDialog} color="error" variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSaveDocumentNumber} variant="contained" color="success">
            Save Document Number{documentNumberDraft.length !== 1 ? "s" : ""}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setOpenSnackbar(false)}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TranscriptOfRecords;
