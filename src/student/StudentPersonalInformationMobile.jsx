import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { SettingsContext } from "../App";
import API_BASE_URL from "../apiConfig";
import DateField from "../components/DateField";
import regions from "../data/region.json";
import provinces from "../data/province.json";
import cities from "../data/city.json";
import barangays from "../data/barangay.json";
import {
  Button,
  Box,
  Typography,
  Card,
  IconButton,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
  Modal
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from "@mui/icons-material/Error";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { motion } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FormalExample from "../assets/formalexample.png";
import useStudentEditPermissions from "../account_management/useStudentEditPermissions";
import { CircularProgress } from "@mui/material"; // add to your existing MUI import line
import StudentECATApplicationForm from "./StudentECATApplicationForm";
import StudentPersonalDataForm from "./StudentPersonalDataForm";
import StudentOfficeOfTheRegistrar from "./StudentOfficeOfTheRegistrar";
import StudentServicesSurvey from "./StudentServicesSurvey";

// ─── Reusable field components (responsive, same visual language as the ────
// ─── Applicant Personal Information screen) ─────────────────────────────────
const Field = ({ label, required, error, helperText, lockedBadge, children }) => (
  <div style={{ marginBottom: 14 }}>
    {label && (
      <label
        style={{
          display: "block",
          fontSize: "clamp(11px, 1.4vw, 13px)",
          fontWeight: 600,
          color: "#444",
          marginBottom: 5,
        }}
      >
        {label}
        {required && <span style={{ color: "#d32f2f" }}> *</span>}
        {lockedBadge && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              marginLeft: 6,
              padding: "1px 6px",
              borderRadius: 4,
              backgroundColor: "#fce4ec",
              color: "#c62828",
              fontSize: 10,
              fontWeight: 700,
              verticalAlign: "middle",
            }}
          >
            🔒 Locked by Admin
          </span>
        )}
      </label>
    )}
    {children}
    {error && helperText && (
      <div style={{ color: "#d32f2f", fontSize: 11, marginTop: 3 }}>{helperText}</div>
    )}
  </div>
);

const inputStyle = (hasError, locked = false, extra = {}) => ({
  width: "100%",
  height: 42,
  padding: "0 12px",
  border: `1px solid ${hasError ? "#d32f2f" : "#ccc"}`,
  borderRadius: 8,
  fontSize: "clamp(13px, 1.6vw, 14px)",
  backgroundColor: locked ? "#f5f5f5" : "#fff",
  boxSizing: "border-box",
  outline: "none",
  color: "#222",
  appearance: "none",
  WebkitAppearance: "none",
  ...extra,
});

const selectStyle = (hasError, locked = false) => ({
  ...inputStyle(hasError, locked),
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23666' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: 32,
});

const MInput = ({ error, locked, style, ...props }) => (
  <input style={{ ...inputStyle(error, locked), ...style }} {...props} />
);

const MSelect = ({ error, locked, style, children, ...props }) => (
  <select style={{ ...selectStyle(error, locked), ...style }} {...props}>
    {children}
  </select>
);

const CheckRow = ({ checked, onChange, name, disabled, lockedBadge, children }) => (
  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
      fontSize: "clamp(12px, 1.5vw, 14px)",
      color: "#333",
      cursor: disabled ? "not-allowed" : "pointer",
    }}
  >
    <input
      type="checkbox"
      name={name}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      style={{ width: 18, height: 18, accentColor: "#6D2323", cursor: disabled ? "not-allowed" : "pointer" }}
    />
    {children}
    {lockedBadge && (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
          marginLeft: 4,
          padding: "1px 6px",
          borderRadius: 4,
          backgroundColor: "#fce4ec",
          color: "#c62828",
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        🔒 Locked by Admin
      </span>
    )}
  </label>
);

const overlayStyle = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.55)",
  zIndex: 500,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

// ─── Main Component ───────────────────────────────────────────────────────────
const StudentPersonalInformationResponsive = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  // Breakpoints: phone < 600px, tablet 600–959px, desktop >= 960px
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const gridCols2 = { display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr", gap: 16 };

  // ── Permissions (student-specific) ────────────────────────────────────────
  const { canEdit: canEditField, permissionsLoaded } = useStudentEditPermissions();
  const [userRole, setUserRole] = useState("");
  const canEdit = (fieldId) => canEditField(fieldId, userRole);

  // ── Settings colors & info ────────────────────────────────────────────────
  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    setBranches(settings?.branches || []);
  }, [settings]);

  const getBranchLabel = (branchId) => {
    const branch = branches.find((item) => String(item.id) === String(branchId));
    return branch?.branch || "—";
  };

  // ── State ───────────────────────────────────────────────────────────────
  const [userID, setUserID] = useState("");
  const [person, setPerson] = useState({
    profile_img: "",
    campus: "",
    academicProgram: "",
    classifiedAs: "",
    applyingAs: "",
    program: "",
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
    pwdMember: 0,
    pwdType: "",
    pwdId: "",
    birthOfDate: "",
    age: "",
    birthPlace: "",
    languageDialectSpoken: "",
    citizenship: "",
    religion: "",
    civilStatus: "",
    spouse: "",
    facebook_account: "",
    tribeEthnicGroup: "",
    cellphoneNumber: "",
    emailAddress: "",
    presentStreet: "",
    presentBarangay: "",
    presentZipCode: "",
    presentRegion: "",
    presentProvince: "",
    presentMunicipality: "",
    presentDswdChecked: 0,
    presentDswdHouseholdNumber: "",
    sameAsPresentAddress: 0,
    permanentStreet: "",
    permanentBarangay: "",
    permanentZipCode: "",
    permanentRegion: "",
    permanentProvince: "",
    permanentMunicipality: "",
    permanentDswdChecked: 0,
    permanentDswdHouseholdNumber: "",
  });

  const [yearLevelOptions, setYearLevelOptions] = useState([]);
  const [curriculumOptions, setCurriculumOptions] = useState([]);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "warning" });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const showSnackbar = (message, severity = "warning") => {
    setSnackbar({ open: true, message, severity });
  };

  // ── Auth + Person load (student-specific endpoints) ───────────────────────
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const loggedInPersonId = localStorage.getItem("person_id");
    if (!loggedInPersonId) {
      window.location.href = "/login";
      return;
    }
    setUserRole(storedRole);

    const queryParams = new URLSearchParams(location.search);
    const queryPersonId = queryParams.get("person_id");
    const searchedPersonId = sessionStorage.getItem("student_edit_person_id");

    setUserID(queryPersonId || searchedPersonId || loggedInPersonId);
  }, [location.search]);

  const fetchPersonData = React.useCallback(() => {
    if (!userID) return;
    axios
      .get(`${API_BASE_URL}/api/student_data_as_applicant/${userID}`, {
        params: { _: Date.now() },
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      })
      .then((res) => {
        if (res.data) setPerson(res.data);
      })
      .catch((err) => console.error("Error fetching student data:", err));
  }, [userID]);

  useEffect(() => {
    fetchPersonData();
  }, [fetchPersonData]);

  // Re-fetch whenever the tab/app regains focus — catches updates
  // (like a profile photo) made elsewhere (e.g. on desktop) while
  // this mobile session was already open.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchPersonData();
    };
    window.addEventListener("focus", fetchPersonData);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", fetchPersonData);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchPersonData]);

  // ── Reference data ────────────────────────────────────────────────────────
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/year-levels`)
      .then((r) => setYearLevelOptions(r.data))
      .catch((err) => console.error("Error fetching year levels:", err));
    axios
      .get(`${API_BASE_URL}/api/applied_program`)
      .then((r) => setCurriculumOptions(r.data))
      .catch((err) => console.error("Error fetching curriculum options:", err));
  }, []);

  const getYearLevelSelectValue = () => {
    const current = person?.yearLevel;
    if (current === null || current === undefined || current === "") return "";
    const currentText = String(current).trim();
    const byId = yearLevelOptions.find((yl) => String(yl.year_level_id) === currentText);
    if (byId) return String(byId.year_level_id);
    const byDesc = yearLevelOptions.find(
      (yl) =>
        String(yl.year_level_description || "").trim().toLowerCase() === currentText.toLowerCase()
    );
    if (byDesc) return String(byDesc.year_level_id);
    return currentText;
  };

  const filteredYearLevels = yearLevelOptions.filter((yl) => {
    if (Number(person.academicProgram) === 1) {
      return yl.level_type === "graduate";
    }
    return yl.level_type === "year";
  });

  const filteredCurriculum = curriculumOptions.filter((item) => {
    if (person.academicProgram !== "" && person.academicProgram !== null) {
      if (Number(item.academic_program) !== Number(person.academicProgram)) return false;
    }
    return true;
  });

  const [isLrnNA, setIsLrnNA] = useState(false);

  // ── Address states (present) ──────────────────────────────────────────────
  const [regionList, setRegionList] = useState([]);
  const [provinceList, setProvinceList] = useState([]);
  const [cityList, setCityList] = useState([]);
  const [barangayList, setBarangayList] = useState([]);

  useEffect(() => {
    setRegionList(regions);
  }, []);

  useEffect(() => {
    const region = regions.find((r) => r.region_name === person.presentRegion);
    setProvinceList(region ? provinces.filter((p) => p.region_code === region.region_code) : []);
  }, [person.presentRegion]);

  useEffect(() => {
    const province = provinces.find((p) => p.province_name === person.presentProvince);
    setCityList(province ? cities.filter((c) => c.province_code === province.province_code) : []);
  }, [person.presentProvince]);

  useEffect(() => {
    const city = cities.find((c) => c.city_name === person.presentMunicipality);
    setBarangayList(city ? barangays.filter((b) => b.city_code === city.city_code) : []);
  }, [person.presentMunicipality]);

  // ── Address states (permanent) ────────────────────────────────────────────
  const [permanentRegionList, setPermanentRegionList] = useState([]);
  const [permanentProvinceList, setPermanentProvinceList] = useState([]);
  const [permanentCityList, setPermanentCityList] = useState([]);
  const [permanentBarangayList, setPermanentBarangayList] = useState([]);
  const [permanentRegion, setPermanentRegion] = useState("");
  const [permanentProvince, setPermanentProvince] = useState("");
  const [permanentCity, setPermanentCity] = useState("");
  const [permanentBarangay, setPermanentBarangay] = useState("");
   const [studentNumber, setStudentNumber] = useState("");

  useEffect(() => {
    setPermanentRegionList(regions);
  }, []);

  useEffect(() => {
    const region = regions.find((r) => r.region_name === person.permanentRegion);
    setPermanentProvinceList(region ? provinces.filter((p) => p.region_code === region.region_code) : []);
  }, [person.permanentRegion]);

  useEffect(() => {
    const province = provinces.find((p) => p.province_name === person.permanentProvince);
    setPermanentCityList(province ? cities.filter((c) => c.province_code === province.province_code) : []);
  }, [person.permanentProvince]);

  useEffect(() => {
    const city = cities.find((c) => c.city_name === person.permanentMunicipality);
    setPermanentBarangayList(city ? barangays.filter((b) => b.city_code === city.city_code) : []);
  }, [person.permanentMunicipality]);

  const [errors, setErrors] = useState({});

  // ── Helpers (student-specific behaviour preserved) ────────────────────────
  const parseISODate = (dateString) => {
    if (!dateString) return null;
    const [y, m, d] = dateString.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const calculateAge = (birthDateString) => {
    const birthDate = parseISODate(birthDateString);
    if (!birthDate) return "";
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    if (
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age < 0 ? "" : age;
  };

  const autoSave = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, person);
    } catch (err) {
      console.error("Auto-save failed:", err);
    }
  };

  const handleUpdate = async (updatedPerson) => {
    try {
      const { presentDswdChecked, permanentDswdChecked, ...toSave } = updatedPerson;
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, toSave);
    } catch (err) {
      console.error("Auto-save failed:", err);
    }
  };

  const handleChange = (e) => {
    const target = e && e.target ? e.target : {};
    const { name, type, checked, value } = target;

    const updatedValue =
      type === "checkbox"
        ? checked
          ? 1
          : 0
        : ["first_name", "middle_name", "last_name"].includes(name)
          ? value.toUpperCase()
          : value;

    const updatedPerson = { ...person, [name]: updatedValue };

    if (name === "academicProgram") {
      updatedPerson.yearLevel = Number(value) === 1 ? "Master" : "";
    }
    if (name === "birthOfDate") {
      updatedPerson.age = calculateAge(value);
    }
    if (name === "classifiedAs" && value === "Freshman (First Year)") {
      updatedPerson.yearLevel = "First Year";
    }
    if (name === "campus" || name === "academicProgram") {
      updatedPerson.program = "";
    }
    if (name === "civilStatus" && value !== "Married") {
      updatedPerson.spouse = "";
    }

    setPerson(updatedPerson);
    handleUpdate(updatedPerson);
  };

  const isFormValid = () => {
    const requiredFields = [
      "campus",
      "academicProgram",
      "classifiedAs",
      "applyingAs",
      "program",
      "yearLevel",
      "profile_img",
      "last_name",
      "first_name",
      "height",
      "weight",
      "gender",
      "birthOfDate",
      "age",
      "birthPlace",
      "languageDialectSpoken",
      "citizenship",
      "religion",
      "civilStatus",
      "tribeEthnicGroup",
      "cellphoneNumber",
      "emailAddress",
      "facebook_account",
      "presentStreet",
      "presentZipCode",
      "presentRegion",
      "presentProvince",
      "presentMunicipality",
      "presentBarangay",
      "permanentStreet",
      "permanentZipCode",
      "permanentRegion",
      "permanentProvince",
      "permanentMunicipality",
      "permanentBarangay",
    ];

    if (person.civilStatus === "Married") {
      requiredFields.push("spouse");
    }

    const newErrors = {};
    requiredFields.forEach((field) => {
      const value = person[field];
      if (!value && value !== 0) newErrors[field] = true;
    });

    const emailValue = person.emailAddress?.trim();
    const emailPattern = /^[^@]+@[^@]+\.[^@]+$/;
    if (!emailValue || !emailPattern.test(emailValue)) {
      newErrors.emailAddress = true;
    }

    if (!isLrnNA) {
      const lrnValue = person.lrnNumber?.toString().trim();
      if (!lrnValue) newErrors.lrnNumber = true;
    }

    if (person.presentDswdChecked === 1) {
      const value = person.presentDswdHouseholdNumber?.trim();
      if (!value) newErrors.presentDswdHouseholdNumber = true;
    }

    if (person.permanentDswdChecked === 1) {
      const value = person.permanentDswdHouseholdNumber?.trim();
      if (!value) newErrors.permanentDswdHouseholdNumber = true;
    }

    if (person.pwdMember === 1) {
      if (!person.pwdType?.toString().trim()) newErrors.pwdType = true;
      if (!person.pwdId?.toString().trim()) newErrors.pwdId = true;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Photo Upload ──────────────────────────────────────────────────────────
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const MAX_SIZE = 2 * 1024 * 1024;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      setSnackbar({ open: true, message: "Invalid file type. Please select a JPEG or PNG file.", severity: "error" });
      setSelectedFile(null);
      setPreview(null);
      return;
    }
    if (file.size > MAX_SIZE) {
      setSnackbar({ open: true, message: "File is too large. Maximum allowed size is 2MB.", severity: "error" });
      setSelectedFile(null);
      setPreview(null);
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setSnackbar({ open: true, message: "Please select a file first.", severity: "warning" });
      return;
    }
    if (selectedFile.size > MAX_SIZE) {
      setSnackbar({ open: true, message: "File must be 2MB or less.", severity: "error" });
      return;
    }
    const formData = new FormData();
    formData.append("profile_picture", selectedFile);
    formData.append("person_id", userID);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/enrollment/upload-profile-picture`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const fileName = response.data.filename || response.data.profile_img;
      const updatedPerson = { ...person, profile_img: fileName };
      setPerson(updatedPerson);
      await handleUpdate(updatedPerson);
      setSnackbar({ open: true, message: "Upload successful!", severity: "success" });
      setUploadModalOpen(false);
      setSelectedFile(null);
      setPreview(null);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || "Upload failed.";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    }
  };

  // ── Stepper (student routes preserved) ────────────────────────────────────
  const stepsWithPaths = [
    { label: "Personal Information", icon: <PersonIcon />, path: "/student_personal_information" },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: "/student_family_background" },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: "/student_educational_attainment" },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: "/student_health_medical_records" },
    { label: "Other Information", icon: <InfoIcon />, path: "/student_other_information" },
  ];
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => {
    handleUpdate(person);
    if (isFormValid()) {
      showSnackbar("Your record has been saved successfully!", "success");
      setTimeout(() => navigate("/student_family_background"), 1000);
    } else {
      showSnackbar("Please complete all required fields before proceeding.");
    }
  };

  const handleStepClick = (index) => {
    if (isFormValid()) {
      setActiveStep(index);
      showSnackbar("Your record has been saved successfully!", "success");
      setTimeout(() => navigate(stepsWithPaths[index].path), 1000);
    } else {
      showSnackbar("Please fill all required fields before proceeding.", "error");
    }
  };

  const [generatingKey, setGeneratingKey] = useState(null); // "ecat" | "personalData" | "registrar" | "admissionServices"
  const hiddenFormRef = useRef();

  const FORM_CONFIGS = {
    ecat: {
      label: "ECAT Application Form",
      endpoint: "/api/generate-ecat-form-pdf",
      filenamePrefix: "ECAT_Application_Form",
      Component: StudentECATApplicationForm,
    },
    personalData: {
      label: "Personal Data Form",
      endpoint: "/api/generate-personal-data-form-pdf",
      filenamePrefix: "Personal_Data_Form",
      Component: StudentPersonalDataForm,
    },
    registrar: {
      label: `Application For ${shortTerm ? shortTerm.toUpperCase() : ""} College Admission`,
      endpoint: "/api/generate-registrar-form-pdf",
      filenamePrefix: "Office_Of_The_Registrar",
      Component: StudentOfficeOfTheRegistrar,
    },
    admissionServices: {
      label: "Application/Student Satisfactory Survey",
      endpoint: "/api/generate-admission-services-pdf",
      filenamePrefix: "Admission_Services_CSM_Form",
      Component: StudentServicesSurvey,
      dateStamped: true,
    },
  };

  const buildClientFilename = (prefix, { lastName, firstName, studentNo }) => {
    const safeLast = (lastName || "Student").trim().replace(/\s+/g, "_");
    const safeFirst = (firstName || "").trim().replace(/\s+/g, "_");
    const suffix = studentNo ? `_${studentNo}` : "";
    return `${prefix}_${safeLast}${safeFirst ? "_" + safeFirst : ""}${suffix}.pdf`;
  };

 const generateFormPdf = async (key) => {
    const config = FORM_CONFIGS[key];
    if (!config || generatingKey) return;

    setGeneratingKey(key);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // let hidden component finish fetching

      const node = hiddenFormRef.current;
      if (!node) throw new Error(`${config.label} did not render in time.`);

      // ✅ FIX — stamp the live "checked" DOM property onto a cloned copy
      // of the node before reading innerHTML. Without this, checkboxes
      // for gender/civilStatus/etc. always serialize as unchecked even
      // though they render correctly on screen.
      const clonedNode = node.cloneNode(true);
      const liveCheckboxes = node.querySelectorAll('input[type="checkbox"]');
      const clonedCheckboxes = clonedNode.querySelectorAll('input[type="checkbox"]');
      liveCheckboxes.forEach((liveBox, i) => {
        const clonedBox = clonedCheckboxes[i];
        if (liveBox.checked) {
          clonedBox.setAttribute("checked", "checked");
        } else {
          clonedBox.removeAttribute("checked");
        }
      });

      const response = await axios.post(
        `${API_BASE_URL}${config.endpoint}`,
        {
          html: clonedNode.innerHTML, // ⬅️ was node.innerHTML
          person_id: userID || "",
          last_name: person?.last_name || "",
          first_name: person?.first_name || "",
        },
        { responseType: "blob" },
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const fileName = buildClientFilename(config.filenamePrefix, {
        lastName: person?.last_name,
        firstName: person?.first_name,
        studentNo: studentNumber,
      });

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Error generating ${config.label} PDF:`, err);
      setSnackbar({
        open: true,
        message: `⚠️ Unable to generate ${config.label} PDF right now.`,
        severity: "error",
      });
    } finally {
      setGeneratingKey(null);
    }
  };


  const links = [
    { key: "ecat", label: "ECAT Application Form", onClick: () => generateFormPdf("ecat") },
    { key: "personalData", label: "Personal Data Form", onClick: () => generateFormPdf("personalData") },
    { key: "registrar", label: `Application For ${shortTerm ? shortTerm.toUpperCase() : ""} Admission`, onClick: () => generateFormPdf("registrar") },
    { key: "admissionServices", label: "Application/Student Satisfactory Survey", onClick: () => generateFormPdf("admissionServices") },
  ];

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


  // Cards per row depending on viewport
  const cardBasis = isPhone ? "calc(50% - 6px)" : isTablet ? "calc(33.333% - 8px)" : "calc(20% - 13px)";
  const contentMaxWidth = isDesktop ? 1000 : "100%";

  const AddressNotice = () => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: { xs: "column", sm: "row" },
        gap: 1,
        backgroundColor: "#FFF4E5",
        border: "1px solid #FFA726",
        borderRadius: 2,
        p: { xs: 1.5, sm: 2 },
        minHeight: { xs: "auto", sm: "50px" },
        mb: 2,
        textAlign: "center",
      }}
    >
      <WarningAmberIcon sx={{ color: "#FF9800", fontSize: { xs: 28, sm: 24 } }} />
      <Typography
        fontWeight="medium"
        color="#BF360C"
        sx={{ fontSize: { xs: "0.85rem", sm: "1rem" }, lineHeight: 1.5 }}
      >
        NOTICE: Fill up first the{" "}
        <strong>
          REGION <span style={{ margin: "0 6px" }}>➔</span>
          PROVINCE <span style={{ margin: "0 6px" }}>➔</span>
          MUNICIPALITY <span style={{ margin: "0 6px" }}>➔</span>
          BARANGAY
        </strong>
      </Typography>
    </Box>
  );

  if (!permissionsLoaded) return null;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        fontFamily: "'Segoe UI', sans-serif",
        pb: { xs: 8, md: 4 },
      }}
    >

      {generatingKey && FORM_CONFIGS[generatingKey] && (
        <div ref={hiddenFormRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          {React.createElement(FORM_CONFIGS[generatingKey].Component)}
        </div>
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Box sx={{ maxWidth: contentMaxWidth, mx: "auto", px: { xs: 0, md: 2 } }}>
        {/* Header */}
        <Box sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          mb: 1,

          px: { xs: 2, md: 0 },
          pt: { xs: 2, md: 0 },
        }}>
          <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: { xs: "22px", sm: "28px", md: "36px" } }}>
            PERSONAL INFORMATION
          </Typography>
        </Box>
        <hr style={{ border: "1px solid #ccc", width: "100%" }} />
        <br />

        {/* Notice */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1.5,
            mx: { xs: "12px", md: 0 },
            mt: "12px",
            p: { xs: "10px 12px", md: "14px 16px" },
            borderRadius: "8px",
            backgroundColor: "#fffaf5",
            border: "1px solid #6D2323",
            boxShadow: "0px 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#800000",
              borderRadius: "6px",
              width: { xs: 36, md: 48 },
              height: { xs: 36, md: 48 },
              flexShrink: 0,
            }}
          >
            <ErrorIcon sx={{ color: "white", fontSize: { xs: 22, md: 30 } }} />
          </Box>
          <Typography
            sx={{
              fontSize: { xs: "13px", sm: "14px", md: "16px" },
              fontFamily: "Poppins, sans-serif",
              color: "#3e3e3e",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "maroon" }}>Important Notice:</strong>
            <br />
            <span style={{ margin: "0 8px" }}>➔</span>
            Please indicate <strong>“NA”</strong> or <strong>“N/A”</strong> in fields where the
            requested information is not applicable or no response can be provided.
            <br />
            <span style={{ margin: "0 8px" }}>➔</span>
            To enter the letter <strong>“Ñ”</strong>, press and hold the ALT key while typing
            <strong> 165</strong>. For <strong>“ñ”</strong>, press and hold the ALT key while
            typing <strong> 164</strong>.
            <br />
            <span style={{ margin: "0 8px" }}>➔</span>
            Please complete all information from <strong>Personal Information</strong> up to
            <strong> Other Information</strong> before printing your documents.
          </Typography>
        </Box>

        {/* Printable Documents */}
        <Box sx={{ px: { xs: "12px", md: 0 }, pt: "12px" }}>
          <Typography sx={{ fontSize: { xs: "22px", md: "28px" }, fontWeight: "bold", textAlign: "center", color: "black", mt: "20px", mb: 2 }}>
            PRINTABLE DOCUMENTS
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, justifyContent: "center" }}>
            {links.map((lnk, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                style={{ width: cardBasis, minWidth: 140 }}
              >
                <Card
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.75,
                    px: 1.5,
                    py: 1.25,
                    height: { xs: 52, md: 60 },
                    width: "100%",
                    borderRadius: "12px",
                    border: `1px solid ${borderColor || "#6D2323"}`,
                    backgroundColor: "#fff",
                    cursor: generatingKey ? "default" : "pointer",
                    opacity: generatingKey && generatingKey !== lnk.key ? 0.5 : 1,
                    pointerEvents: generatingKey ? "none" : "auto",
                    transition: "all 0.25s ease-in-out",
                    "&:hover": {
                      transform: { md: "scale(1.04)" },
                      backgroundColor: headerColor || "#6D2323",
                      "& .chip-icon": { color: "#fff" },
                      "& .chip-text": { color: "#fff" },
                    },
                  }}
                  onClick={() => { if (generatingKey) return; lnk.onClick(); }}
                >
                  {generatingKey === lnk.key ? (
                    <CircularProgress size={18} sx={{ color: mainButtonColor || "#6D2323" }} />
                  ) : (
                    <PictureAsPdfIcon
                      className="chip-icon"
                      sx={{ fontSize: { xs: 18, md: 22 }, color: mainButtonColor || "#6D2323", flexShrink: 0 }}
                    />
                  )}
                  <Typography
                    className="chip-text"
                    sx={{
                      fontSize: { xs: 11, md: 13 },
                      fontWeight: 600,
                      color: mainButtonColor || "#6D2323",
                      fontFamily: "Poppins, sans-serif",
                      lineHeight: 1.3,
                      textAlign: "center",
                    }}
                  >
                    {generatingKey === lnk.key ? "Generating..." : lnk.label}
                  </Typography>
                </Card>
              </motion.div>
            ))}
          </Box>
        </Box>

        {/* Student Form Intro */}
        <Box sx={{ px: { xs: "14px", md: 0 }, pt: 2, textAlign: "center" }}>
          <Typography
            component="h1"
            sx={{ fontSize: { xs: "24px", sm: "32px", md: "42px" }, fontWeight: "bold", textAlign: "center", color: subtitleColor, mt: "20px" }}
          >
            STUDENT FORM
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, md: 15 }, color: "#555" }}>
            Please update your personal information to keep your student records accurate and up to date for the upcoming academic year at{" "}
            {shortTerm ? (
              <>
                <strong>{shortTerm.toUpperCase()}</strong>
                <br />
                {companyName || ""}
              </>
            ) : (
              companyName || ""
            )}
            .
          </Typography>
        </Box>

        {/* Stepper */}
        <Box sx={{ display: "flex", justifyContent: "center", width: "100%", px: { xs: 2, md: 4 }, py: 1.5, borderBottom: "1px solid #e0e0e0", overflowX: "auto" }}>
          {stepsWithPaths.map((step, index) => (
            <React.Fragment key={index}>
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }} onClick={() => handleStepClick(index)}>
                <Box
                  sx={{
                    width: { xs: 42, md: 52 },
                    height: { xs: 42, md: 52 },
                    borderRadius: "50%",
                    border: `2px solid ${borderColor}`,
                    backgroundColor: activeStep === index ? (headerColor || "#6D2323") : "#E8C999",
                    color: activeStep === index ? "#fff" : "#333",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: { xs: 18, md: 22 },
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                >
                  {step.icon}
                </Box>
                <Typography
                  sx={{
                    mt: 0.75,
                    color: activeStep === index ? "#6D2323" : "#555",
                    fontWeight: activeStep === index ? 700 : 400,
                    fontSize: { xs: 10, sm: 12, md: 13 },
                    textAlign: "center",
                    maxWidth: { xs: 64, md: 96 },
                    lineHeight: 1.3,
                  }}
                >
                  {step.label}
                </Typography>
              </Box>
              {index < stepsWithPaths.length - 1 && (
                <Box
                  sx={{
                    height: "2px",
                    backgroundColor: mainButtonColor,
                    flex: 1,
                    minWidth: { xs: 16, md: 32 },
                    alignSelf: "center",
                    mx: { xs: 0.75, md: 1.5 },
                    mb: 3,
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </Box>

        {/* ── SECTION: Personal Information ─────────────────────────────── */}
        <Box sx={{ backgroundColor: "#fff", borderRadius: "10px", mx: { xs: "12px", md: 0 }, mt: "12px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: `1px solid ${borderColor}` }}>
          <Box sx={{ backgroundColor: headerColor || "#1976d2", color: "#fff", p: { xs: "10px 14px", md: "12px 18px" }, fontSize: { xs: 13, md: 15 }, fontWeight: 700, letterSpacing: 0.3 }}>
            Personal Information
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <div style={gridCols2}>
              <Field label="Campus" required error={errors.campus} helperText="This field is required.">
                <MSelect name="campus" value={person.campus || ""} onChange={handleChange} error={errors.campus} disabled>
                  <option value="">Select Campus</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.branch.toUpperCase()}
                    </option>
                  ))}
                </MSelect>
              </Field>

              <Field label="Academic Program" required error={errors.academicProgram} helperText="This field is required.">
                <MSelect name="academicProgram" value={person.academicProgram || ""} onChange={handleChange} error={errors.academicProgram} disabled>
                  <option value="">Select Program</option>
                  <option value="0">Undergraduate</option>
                  <option value="1">Graduate</option>
                  <option value="2">Techvoc</option>
                </MSelect>
              </Field>

              <Field
                label="Classified As"
                required
                error={errors.classifiedAs}
                helperText="This field is required."
                lockedBadge={!canEdit("classifiedAs")}
              >
                <MSelect
                  name="classifiedAs"
                  value={person.classifiedAs || ""}
                  onChange={canEdit("classifiedAs") ? handleChange : undefined}
                  disabled={!canEdit("classifiedAs")}
                  locked={!canEdit("classifiedAs")}
                  error={errors.classifiedAs}
                >
                  <option value="">Select Classification</option>
                  <option value="Freshman (First Year)">Freshman (First Year)</option>
                  <option value="Transferee">Transferee</option>
                  <option value="Returnee">Returnee</option>
                  <option value="Shiftee">Shiftee</option>
                  <option value="Foreign Student">Foreign Student</option>
                </MSelect>
              </Field>

              <Field
                label="Applying As"
                required
                error={errors.applyingAs}
                helperText="This field is required."
                lockedBadge={!canEdit("applyingAs")}
              >
                <MSelect
                  name="applyingAs"
                  value={person.applyingAs || ""}
                  onChange={canEdit("applyingAs") ? handleChange : undefined}
                  disabled={!canEdit("applyingAs")}
                  locked={!canEdit("applyingAs")}
                  error={errors.applyingAs}
                >
                  <option value="">Select Applying As</option>
                  <option value="1">Senior High School Graduate</option>
                  <option value="2">Senior High School Graduating Student</option>
                  <option value="3">ALS (Alternative Learning System) Passer</option>
                  <option value="4">Transferee from other University/College</option>
                  <option value="5">Cross Enrolee Student</option>
                  <option value="6">Foreign Applicant/Student</option>
                  <option value="7">Baccalaureate Graduate</option>
                  <option value="8">Master Degree Graduate</option>
                </MSelect>
              </Field>
            </div>
          </Box>
        </Box>

        {/* ── SECTION: Course Program ───────────────────────────────────── */}
        <Box sx={{ backgroundColor: "#fff", borderRadius: "10px", mx: { xs: "12px", md: 0 }, mt: "12px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: `1px solid ${borderColor}` }}>
          <Box sx={{ backgroundColor: headerColor || "#1976d2", color: "#fff", p: { xs: "10px 14px", md: "12px 18px" }, fontSize: { xs: 13, md: 15 }, fontWeight: 700, letterSpacing: 0.3 }}>
            Course Program
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            {/* Profile Photo */}
            <Box sx={{ mb: 2 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#444", marginBottom: 5 }}>
                Student Photo <span style={{ color: "#d32f2f" }}>*</span>
                {!canEdit("profile_img") && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      marginLeft: 6,
                      padding: "1px 6px",
                      borderRadius: 4,
                      backgroundColor: "#fce4ec",
                      color: "#c62828",
                      fontSize: 10,
                      fontWeight: 700,
                      verticalAlign: "middle",
                    }}
                  >
                    🔒 Locked by Admin
                  </span>
                )}
              </label>
              <Box
                onClick={() => {
                  if (!canEdit("profile_img")) return;
                  fetchPersonData();
                  setUploadModalOpen(true);
                }}
                sx={{
                  width: "100%",
                  maxWidth: { xs: 140, md: 180 },
                  aspectRatio: "1",
                  border: `2px dashed ${errors.profile_img ? "#d32f2f" : "#6D2323"}`,
                  borderRadius: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  backgroundColor: "#fafafa",
                  cursor: canEdit("profile_img") ? "pointer" : "not-allowed",
                  opacity: canEdit("profile_img") ? 1 : 0.8,
                  margin: "0 auto 12px",
                }}
              >
                {person.profile_img ? (
                  <img
                    src={`${API_BASE_URL}/uploads/Student1by1/${person.profile_img}?t=${Date.now()}`}
                    alt="Profile"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <>
                    <div style={{ fontSize: 32 }}>{canEdit("profile_img") ? "📷" : "🔒"}</div>
                    <div style={{ fontSize: 11, color: errors.profile_img ? "#d32f2f" : "#888", textAlign: "center", padding: "0 8px" }}>
                      {canEdit("profile_img") ? "No photo uploaded" : "Photo locked by admin"}
                    </div>
                  </>
                )}
              </Box>
            </Box>

            <Box sx={{ maxWidth: { md: 600 } }}>
              <Field label="Course Applied" required error={errors.program} helperText="This field is required.">
                <MSelect name="program" value={person.program || ""} onChange={handleChange} error={errors.program} disabled>
                  <option value="">Select Program</option>
                  {filteredCurriculum.map((item, index) => (
                    <option key={index} value={item.curriculum_id}>
                      ({item.program_code}): {item.program_description}
                      {item.major ? ` (${item.major})` : ""} ({getBranchLabel(item.components)})
                    </option>
                  ))}
                </MSelect>
              </Field>

              <Field label="Year Level" required error={errors.yearLevel} helperText="This field is required.">
                <MSelect name="yearLevel" value={getYearLevelSelectValue()} onChange={handleChange} error={errors.yearLevel} disabled>
                  <option value="">Select Year Level</option>
                  {filteredYearLevels.map((yl) => (
                    <option key={yl.year_level_id} value={String(yl.year_level_id)}>
                      {yl.year_level_description}
                    </option>
                  ))}
                </MSelect>
              </Field>
            </Box>
          </Box>
        </Box>

        {/* ── SECTION: Person Details ───────────────────────────────────── */}
        <Box sx={{ backgroundColor: "#fff", borderRadius: "10px", mx: { xs: "12px", md: 0 }, mt: "12px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: `1px solid ${borderColor}` }}>
          <Box sx={{ backgroundColor: headerColor || "#1976d2", color: "#fff", p: { xs: "10px 14px", md: "12px 18px" }, fontSize: { xs: 13, md: 15 }, fontWeight: 700, letterSpacing: 0.3 }}>
            Person Details
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <div style={gridCols2}>
              <Field label="Last Name" required error={errors.last_name} helperText="This field is required.">
                <MInput
                  disabled
                  name="last_name"
                  value={(person.last_name || "").toUpperCase()}
                  onChange={(e) => handleChange({ target: { name: "last_name", value: e.target.value.toUpperCase() } })}
                  error={errors.last_name}
                  placeholder="Enter your Last Name"
                />
              </Field>
              <Field label="First Name" required error={errors.first_name} helperText="This field is required.">
                <MInput
                  disabled
                  name="first_name"
                  value={(person.first_name || "").toUpperCase()}
                  onChange={(e) => handleChange({ target: { name: "first_name", value: e.target.value.toUpperCase() } })}
                  error={errors.first_name}
                  placeholder="Enter your First Name"
                />
              </Field>
            </div>

            <Box sx={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 140px", gap: 2 }}>
              <Field label="Middle Name">
                <MInput
                  disabled
                  name="middle_name"
                  value={(person.middle_name || "").toUpperCase()}
                  onChange={(e) => handleChange({ target: { name: "middle_name", value: e.target.value.toUpperCase() } })}
                  placeholder="Enter your Middle Name"
                />
              </Field>
              <Field label="Extension" lockedBadge={!canEdit("extension")}>
                <MSelect
                  name="extension"
                  value={person.extension || ""}
                  onChange={canEdit("extension") ? handleChange : undefined}
                  disabled={!canEdit("extension")}
                  locked={!canEdit("extension")}
                >
                  <option value="">None</option>
                  {["Jr.", "Sr.", "I", "II", "III", "IV", "V"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </MSelect>
              </Field>
            </Box>

            <Box sx={{ maxWidth: { md: 480 } }}>
              <Field label="Nickname" lockedBadge={!canEdit("nickname")}>
                <MInput
                  name="nickname"
                  value={person.nickname || ""}
                  onChange={canEdit("nickname") ? handleChange : undefined}
                  readOnly={!canEdit("nickname")}
                  locked={!canEdit("nickname")}
                  placeholder="Enter your Nickname"
                />
              </Field>
            </Box>

            <div style={gridCols2}>
              <Field label="Height (cm)" required error={errors.height} helperText="Required" lockedBadge={!canEdit("height")}>
                <MInput
                  type="number"
                  name="height"
                  value={person.height || ""}
                  onChange={canEdit("height") ? handleChange : undefined}
                  readOnly={!canEdit("height")}
                  locked={!canEdit("height")}
                  error={errors.height}
                  placeholder="Enter your Height"
                />
              </Field>
              <Field label="Weight (kg)" required error={errors.weight} helperText="Required" lockedBadge={!canEdit("weight")}>
                <MInput
                  type="number"
                  name="weight"
                  value={person.weight || ""}
                  onChange={canEdit("weight") ? handleChange : undefined}
                  readOnly={!canEdit("weight")}
                  locked={!canEdit("weight")}
                  error={errors.weight}
                  placeholder="Enter your Weight"
                />
              </Field>
            </div>

            {/* LRN — system-locked */}
            <Box sx={{ maxWidth: { md: 480 } }}>
              <Field label="Learning Reference Number (LRN)" required={!isLrnNA} error={errors.lrnNumber} helperText="This field is required.">
                <MInput
                  name="lrnNumber"
                  value={person.lrnNumber === "No LRN Number" ? "" : person.lrnNumber || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  disabled={person.lrnNumber === "No LRN Number"}
                  error={errors.lrnNumber}
                  placeholder="Enter your LRN Number"
                  style={{ opacity: person.lrnNumber === "No LRN Number" ? 0.5 : 1 }}
                />
                <CheckRow
                  checked={person.lrnNumber === "No LRN Number"}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const updatedPerson = { ...person, lrnNumber: checked ? "No LRN Number" : "" };
                    setPerson(updatedPerson);
                    setIsLrnNA(checked);
                    handleUpdate(updatedPerson);
                  }}
                >
                  N/A — No LRN Number
                </CheckRow>
              </Field>
            </Box>

            {/* Gender — system-locked */}
            <Box sx={{ maxWidth: { md: 300 } }}>
              <Field label="Sex / Gender" required error={errors.gender} helperText="This field is required.">
                <MSelect
                  name="gender"
                  value={person.gender == null ? "" : String(person.gender)}
                  onChange={(e) =>
                    handleChange({ target: { name: "gender", value: e.target.value === "" ? null : parseInt(e.target.value, 10) } })
                  }
                  error={errors.gender}
                  disabled
                >
                  <option value="">Select Gender</option>
                  <option value="0">MALE</option>
                  <option value="1">FEMALE</option>
                </MSelect>
              </Field>
            </Box>

            {/* PWD — admin-controlled */}
            <CheckRow
              checked={person.pwdMember === 1}
              disabled={!canEdit("pwdMember")}
              lockedBadge={!canEdit("pwdMember")}
              onChange={(e) => {
                const checked = e.target.checked;
                const updatedPerson = {
                  ...person,
                  pwdMember: checked ? 1 : 0,
                  pwdType: checked ? person.pwdType || "" : "",
                  pwdId: checked ? person.pwdId || "" : "",
                };
                setPerson(updatedPerson);
                handleUpdate(updatedPerson);
              }}
            >
              Person with Disability (PWD)
            </CheckRow>
            {person.pwdMember === 1 && (
              <div style={gridCols2}>
                <Field label="PWD Type" required error={errors.pwdType} helperText="This field is required." lockedBadge={!canEdit("pwdMember")}>
                  <MSelect
                    name="pwdType"
                    value={person.pwdType || ""}
                    onChange={canEdit("pwdMember") ? handleChange : undefined}
                    disabled={!canEdit("pwdMember")}
                    locked={!canEdit("pwdMember")}
                    error={errors.pwdType}
                  >
                    <option value="">Select PWD Type</option>
                    {[
                      "Blindness", "Low-vision", "Leprosy Cured persons", "Hearing Impairment", "Locomotor Disability",
                      "Dwarfism", "Intellectual Disability", "Mental Illness", "Autism Spectrum Disorder", "Cerebral Palsy",
                      "Muscular Dystrophy", "Chronic Neurological conditions", "Specific Learning Disabilities",
                      "Multiple Sclerosis", "Speech and Language disability",
                    ].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </MSelect>
                </Field>
                <Field label="PWD ID" required error={errors.pwdId} helperText="This field is required." lockedBadge={!canEdit("pwdMember")}>
                  <MInput
                    name="pwdId"
                    value={person.pwdId || ""}
                    onChange={canEdit("pwdMember") ? handleChange : undefined}
                    readOnly={!canEdit("pwdMember")}
                    locked={!canEdit("pwdMember")}
                    error={errors.pwdId}
                    placeholder="Enter your PWD ID Number"
                  />
                </Field>
              </div>
            )}

            {/* Birth info — system-locked */}
            <Box sx={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 120px", gap: 2 }}>
              <Field label="Date of Birth" required error={errors.birthOfDate} helperText="Required">
                <DateField
                  disabled
                  name="birthOfDate"
                  value={person.birthOfDate || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  style={inputStyle(errors.birthOfDate)}
                />
              </Field>
              <Field label="Age" required error={errors.age} helperText="Required">
                <MInput
                  name="age"
                  value={person.age || ""}
                  readOnly
                  placeholder="Enter your Age"
                  error={errors.age}
                  style={{ backgroundColor: "#f5f5f5" }}
                />
              </Field>
            </Box>

            <Box sx={{ maxWidth: { md: 600 } }}>
              <Field label="Birth Place" required error={errors.birthPlace} helperText="This field is required.">
                <MInput name="birthPlace" value={person.birthPlace || ""} onChange={handleChange} error={errors.birthPlace} placeholder="Enter your Birth Place" />
              </Field>

              <Field
                label="Language / Dialect Spoken"
                required
                error={errors.languageDialectSpoken}
                helperText="This field is required."
                lockedBadge={!canEdit("languageDialectSpoken")}
              >
                <MInput
                  name="languageDialectSpoken"
                  value={person.languageDialectSpoken || ""}
                  onChange={canEdit("languageDialectSpoken") ? handleChange : undefined}
                  readOnly={!canEdit("languageDialectSpoken")}
                  locked={!canEdit("languageDialectSpoken")}
                  error={errors.languageDialectSpoken}
                  placeholder="Enter your Language Spoken"
                />
              </Field>
            </Box>

            <div style={gridCols2}>
              <Field label="Citizenship" required error={errors.citizenship} helperText="This field is required.">
                <MSelect name="citizenship" value={person.citizenship || ""} onChange={handleChange} error={errors.citizenship} disabled>
                  <option value="">Select Citizenship</option>
                  {[
                    "FILIPINO", "AMERICAN", "AUSTRALIAN", "BRITISH", "CANADIAN", "CHINESE", "FRENCH", "GERMAN",
                    "INDIAN", "INDONESIAN", "JAPANESE", "KOREAN", "MALAYSIAN", "SINGAPOREAN", "THAI", "VIETNAMESE", "Others",
                  ].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </MSelect>
              </Field>

              <Field label="Religion" required error={errors.religion} helperText="This field is required." lockedBadge={!canEdit("religion")}>
                <MSelect
                  name="religion"
                  value={person.religion || ""}
                  onChange={canEdit("religion") ? handleChange : undefined}
                  disabled={!canEdit("religion")}
                  locked={!canEdit("religion")}
                  error={errors.religion}
                >
                  <option value="">Select Religion</option>
                  {[
                    "Catholic", "Born Again", "Christian", "Iglesia Ni Cristo", "Baptist", "Adventis", "Islam",
                    "Protestant", "Aglipay", "Seventh Day Adventist", "Jehovah's Witness", "Buddist", "Others", "None",
                  ].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </MSelect>
              </Field>
            </div>

            <div style={gridCols2}>
              <Field label="Civil Status" required error={errors.civilStatus} helperText="Required">
                <MSelect name="civilStatus" value={person.civilStatus || ""} onChange={handleChange} error={errors.civilStatus} disabled>
                  <option value="">Select</option>
                  {["Single", "Married", "Legally Seperated", "Widowed", "Solo Parent"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </MSelect>
              </Field>
              {person.civilStatus === "Married" && (
                <Box sx={{ maxWidth: { md: 480 } }}>
                  <Field
                    label="Spouse"
                    required
                    error={errors.spouse}
                    helperText="This field is required."
                    lockedBadge={!canEdit("spouse")}
                  >
                    <MInput
                      name="spouse"
                      value={person.spouse || ""}
                      onChange={canEdit("spouse") ? handleChange : undefined}
                      readOnly={!canEdit("spouse")}
                      locked={!canEdit("spouse")}
                      onBlur={() => handleUpdate(person)}
                      error={errors.spouse}
                      placeholder="Enter Spouse Name"
                    />
                  </Field>
                </Box>
              )}
              <Field label="Tribe / Ethnic Group" required error={errors.tribeEthnicGroup} helperText="Required" lockedBadge={!canEdit("tribeEthnicGroup")}>
                <MSelect
                  name="tribeEthnicGroup"
                  value={person.tribeEthnicGroup || ""}
                  onChange={canEdit("tribeEthnicGroup") ? handleChange : undefined}
                  disabled={!canEdit("tribeEthnicGroup")}
                  locked={!canEdit("tribeEthnicGroup")}
                  error={errors.tribeEthnicGroup}
                >
                  <option value="">Select</option>
                  {[
                    "Agta", "Agutaynen", "Aklanon", "Alangan", "Alta", "Amersian", "Ati", "Atta", "Ayta", "B'laan",
                    "Badjao", "Bagobo", "Balangao", "Balangingi", "Bangon", "Bantoanon", "Banwaon", "Batak",
                    "Bicolano", "Binukid", "Bohalano", "Bolinao", "Bontoc", "Buhid", "Butuanon", "Cagyanen",
                    "Caray-a", "Cebuano", "Cuyunon", "Dasen", "Ilocano", "Ilonggo", "Jamah Mapun", "Malay",
                    "Mangyan", "Maranao", "Molbogs", "Palawano", "Panimusan", "Tagbanua", "Tao't Bato",
                    "Tausug", "Waray", "Others",
                  ].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </MSelect>
              </Field>
            </div>
          </Box>
        </Box>

        {/* ── SECTION: Contact Information ─────────────────────────────── */}
        <Box sx={{ backgroundColor: "#fff", borderRadius: "10px", mx: { xs: "12px", md: 0 }, mt: "12px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: `1px solid ${borderColor}` }}>
          <Box sx={{ backgroundColor: headerColor || "#1976d2", color: "#fff", p: { xs: "10px 14px", md: "12px 18px" }, fontSize: { xs: 13, md: 15 }, fontWeight: 700, letterSpacing: 0.3 }}>
            Contact Information
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <div style={gridCols2}>
              <Field
                label="Contact Number"
                required
                error={errors.cellphoneNumber}
                helperText="This field is required."
                lockedBadge={!canEdit("cellphoneNumber")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#444", flexShrink: 0 }}>+63</span>
                  <MInput
                    name="cellphoneNumber"
                    value={person.cellphoneNumber || ""}
                    onChange={
                      canEdit("cellphoneNumber")
                        ? (e) => handleChange({ target: { name: "cellphoneNumber", value: e.target.value.replace(/\D/g, "") } })
                        : undefined
                    }
                    readOnly={!canEdit("cellphoneNumber")}
                    locked={!canEdit("cellphoneNumber")}
                    onBlur={() => handleUpdate(person)}
                    error={errors.cellphoneNumber}
                    placeholder="9XXXXXXXXX"
                    maxLength={10}
                    style={{ flex: 1 }}
                  />
                </div>
              </Field>

              <Field label="Email Address" required error={errors.emailAddress} helperText="This field is required.">
                <MInput name="emailAddress" value={person.emailAddress || ""} readOnly style={{ backgroundColor: "#f0f0f0" }} placeholder="Enter your Email Address" />
              </Field>
            </div>

            <Box sx={{ maxWidth: { md: 480 } }}>
              <Field
                label="Facebook Account"
                required
                error={errors.facebook_account}
                helperText="This field is required."
                lockedBadge={!canEdit("facebook_account")}
              >
                <MInput
                  name="facebook_account"
                  value={person.facebook_account || ""}
                  onChange={canEdit("facebook_account") ? handleChange : undefined}
                  readOnly={!canEdit("facebook_account")}
                  locked={!canEdit("facebook_account")}
                  onBlur={() => handleUpdate(person)}
                  error={errors.facebook_account}
                  placeholder="Enter Facebook Profile Name/Link"
                />
              </Field>
            </Box>
          </Box>
        </Box>

        {/* ── SECTION: Present Address ─────────────────────────────────── */}
        <Box sx={{ backgroundColor: "#fff", borderRadius: "10px", mx: { xs: "12px", md: 0 }, mt: "12px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: `1px solid ${borderColor}` }}>
          <Box sx={{ backgroundColor: headerColor || "#1976d2", color: "#fff", p: { xs: "10px 14px", md: "12px 18px" }, fontSize: { xs: 13, md: 15 }, fontWeight: 700, letterSpacing: 0.3 }}>
            Present Address
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <AddressNotice />

            <div style={gridCols2}>
              <Field label="Street / House No." required error={errors.presentStreet} helperText="This field is required.">
                <MInput name="presentStreet" value={person.presentStreet || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} error={errors.presentStreet} placeholder="Enter your Present Street" />
              </Field>
              <Field
                label="Zip Code"
                required
                error={errors.presentZipCode}
                helperText="This field is required."
                lockedBadge={!canEdit("presentZipCode")}
              >
                <MInput
                  type="number"
                  name="presentZipCode"
                  value={person.presentZipCode || ""}
                  onChange={canEdit("presentZipCode") ? handleChange : undefined}
                  readOnly={!canEdit("presentZipCode")}
                  locked={!canEdit("presentZipCode")}
                  onBlur={() => handleUpdate(person)}
                  error={errors.presentZipCode}
                  placeholder="Enter your Zip Code"
                />
              </Field>
            </div>

            <div style={gridCols2}>
              <Field
                label="Region"
                required
                error={errors.presentRegion}
                helperText="This field is required."
                lockedBadge={!canEdit("presentRegion")}
              >
                <MSelect
                  name="presentRegion"
                  value={person.presentRegion || ""}
                  onChange={
                    canEdit("presentRegion")
                      ? (e) => {
                        handleChange(e);
                        setProvinceList([]);
                        setCityList([]);
                        setBarangayList([]);
                        autoSave();
                      }
                      : undefined
                  }
                  disabled={!canEdit("presentRegion")}
                  locked={!canEdit("presentRegion")}
                  error={errors.presentRegion}
                >
                  <option value="">Select Region</option>
                  {regionList.map((r) => (
                    <option key={r.region_code} value={r.region_name}>
                      {r.region_name}
                    </option>
                  ))}
                </MSelect>
              </Field>

              <Field
                label="Province"
                required
                error={errors.presentProvince}
                helperText="This field is required."
                lockedBadge={!canEdit("presentProvince")}
              >
                <MSelect
                  name="presentProvince"
                  value={person.presentProvince || ""}
                  onChange={
                    canEdit("presentProvince")
                      ? (e) => {
                        handleChange(e);
                        setCityList([]);
                        setBarangayList([]);
                        autoSave();
                      }
                      : undefined
                  }
                  disabled={!canEdit("presentProvince") || !person.presentRegion}
                  locked={!canEdit("presentProvince")}
                  error={errors.presentProvince}
                >
                  <option value="">Select Province</option>
                  {provinceList.map((p) => (
                    <option key={p.province_code} value={p.province_name}>
                      {p.province_name}
                    </option>
                  ))}
                </MSelect>
              </Field>
            </div>

            <div style={gridCols2}>
              <Field
                label="Municipality / City"
                required
                error={errors.presentMunicipality}
                helperText="This field is required."
                lockedBadge={!canEdit("presentMunicipality")}
              >
                <MSelect
                  name="presentMunicipality"
                  value={person.presentMunicipality || ""}
                  onChange={
                    canEdit("presentMunicipality")
                      ? (e) => {
                        handleChange(e);
                        setBarangayList([]);
                        autoSave();
                      }
                      : undefined
                  }
                  disabled={!canEdit("presentMunicipality") || !person.presentProvince}
                  locked={!canEdit("presentMunicipality")}
                  error={errors.presentMunicipality}
                >
                  <option value="">Select Municipality</option>
                  {cityList.map((c) => (
                    <option key={c.city_code} value={c.city_name}>
                      {c.city_name}
                    </option>
                  ))}
                </MSelect>
              </Field>

              <Field
                label="Barangay"
                required
                error={errors.presentBarangay}
                helperText="This field is required."
                lockedBadge={!canEdit("presentBarangay")}
              >
                <MSelect
                  name="presentBarangay"
                  value={person.presentBarangay || ""}
                  onChange={
                    canEdit("presentBarangay")
                      ? (e) => {
                        handleChange(e);
                        autoSave();
                      }
                      : undefined
                  }
                  disabled={!canEdit("presentBarangay") || !person.presentMunicipality}
                  locked={!canEdit("presentBarangay")}
                  error={errors.presentBarangay}
                >
                  <option value="">Select Barangay</option>
                  {barangayList.map((b) => (
                    <option key={b.brgy_code} value={b.brgy_name}>
                      {b.brgy_name}
                    </option>
                  ))}
                </MSelect>
              </Field>
            </div>

            <CheckRow name="presentDswdChecked" checked={person.presentDswdChecked === 1} onChange={handleChange}>
              I have a Present DSWD Household Number
            </CheckRow>
            {person.presentDswdChecked === 1 && (
              <Box sx={{ maxWidth: { md: 480 } }}>
                <Field
                  label="Present DSWD Household Number"
                  required
                  error={errors.presentDswdHouseholdNumber}
                  helperText="This field is required."
                  lockedBadge={!canEdit("presentDswdHouseholdNumber")}
                >
                  <MInput
                    name="presentDswdHouseholdNumber"
                    value={person.presentDswdHouseholdNumber || ""}
                    onChange={canEdit("presentDswdHouseholdNumber") ? handleChange : undefined}
                    readOnly={!canEdit("presentDswdHouseholdNumber")}
                    locked={!canEdit("presentDswdHouseholdNumber")}
                    onBlur={() => handleUpdate(person)}
                    error={errors.presentDswdHouseholdNumber}
                    placeholder="Enter your DSWD Household Number"
                  />
                </Field>
              </Box>
            )}
          </Box>
        </Box>

        {/* ── SECTION: Permanent Address ───────────────────────────────── */}
        <Box sx={{ backgroundColor: "#fff", borderRadius: "10px", mx: { xs: "12px", md: 0 }, mt: "12px", mb: 3, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: `1px solid ${borderColor}` }}>
          <Box sx={{ backgroundColor: headerColor || "#1976d2", color: "#fff", p: { xs: "10px 14px", md: "12px 18px" }, fontSize: { xs: 13, md: 15 }, fontWeight: 700, letterSpacing: 0.3 }}>
            Permanent Address
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <AddressNotice />

            <CheckRow
              name="sameAsPresentAddress"
              checked={person.sameAsPresentAddress === 1}
              onChange={(e) => {
                const checked = e.target.checked;
                const updatedPerson = { ...person, sameAsPresentAddress: checked ? 1 : 0 };
                if (checked) {
                  updatedPerson.permanentStreet = person.presentStreet;
                  updatedPerson.permanentZipCode = person.presentZipCode;
                  updatedPerson.permanentRegion = person.presentRegion;
                  updatedPerson.permanentProvince = person.presentProvince;
                  updatedPerson.permanentMunicipality = person.presentMunicipality;
                  updatedPerson.permanentBarangay = person.presentBarangay;
                  updatedPerson.permanentDswdHouseholdNumber = person.presentDswdHouseholdNumber;
                  setPermanentRegion(person.presentRegion);
                  setPermanentProvince(person.presentProvince);
                  setPermanentCity(person.presentMunicipality);
                  setPermanentBarangay(person.presentBarangay);
                }
                setPerson(updatedPerson);
                handleUpdate(updatedPerson);
              }}
            >
              Same as Present Address
            </CheckRow>

            <div style={gridCols2}>
              <Field label="Street / House No." required error={errors.permanentStreet} helperText="This field is required.">
                <MInput name="permanentStreet" value={person.permanentStreet || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} error={errors.permanentStreet} placeholder="Enter your Permanent Street" />
              </Field>
              <Field
                label="Zip Code"
                required
                error={errors.permanentZipCode}
                helperText="This field is required."
                lockedBadge={!canEdit("permanentZipCode")}
              >
                <MInput
                  type="number"
                  name="permanentZipCode"
                  value={person.permanentZipCode || ""}
                  onChange={canEdit("permanentZipCode") ? handleChange : undefined}
                  readOnly={!canEdit("permanentZipCode")}
                  locked={!canEdit("permanentZipCode")}
                  onBlur={() => handleUpdate(person)}
                  error={errors.permanentZipCode}
                  placeholder="Enter your Zip Code"
                />
              </Field>
            </div>

            <div style={gridCols2}>
              <Field
                label="Region"
                required
                error={errors.permanentRegion}
                helperText="This field is required."
                lockedBadge={!canEdit("permanentRegion")}
              >
                <MSelect
                  name="permanentRegion"
                  value={person.permanentRegion || ""}
                  onChange={
                    canEdit("permanentRegion")
                      ? (e) => {
                        handleChange(e);
                        setPermanentRegion(e.target.value);
                        setPermanentProvince("");
                        setPermanentCity("");
                        setPermanentBarangay("");
                        setPermanentProvinceList([]);
                        setPermanentCityList([]);
                        setPermanentBarangayList([]);
                        autoSave();
                      }
                      : undefined
                  }
                  disabled={!canEdit("permanentRegion")}
                  locked={!canEdit("permanentRegion")}
                  error={errors.permanentRegion}
                >
                  <option value="">Select Region</option>
                  {permanentRegionList.map((r) => (
                    <option key={r.region_code} value={r.region_name}>
                      {r.region_name}
                    </option>
                  ))}
                </MSelect>
              </Field>

              <Field
                label="Province"
                required
                error={errors.permanentProvince}
                helperText="This field is required."
                lockedBadge={!canEdit("permanentProvince")}
              >
                <MSelect
                  name="permanentProvince"
                  value={person.permanentProvince || ""}
                  onChange={
                    canEdit("permanentProvince")
                      ? (e) => {
                        handleChange(e);
                        setPermanentProvince(e.target.value);
                        setPermanentCity("");
                        setPermanentBarangay("");
                        setPermanentCityList([]);
                        setPermanentBarangayList([]);
                        autoSave();
                      }
                      : undefined
                  }
                  disabled={!canEdit("permanentProvince") || !person.permanentRegion}
                  locked={!canEdit("permanentProvince")}
                  error={errors.permanentProvince}
                >
                  <option value="">Select Province</option>
                  {permanentProvinceList.map((p) => (
                    <option key={p.province_code} value={p.province_name}>
                      {p.province_name}
                    </option>
                  ))}
                </MSelect>
              </Field>
            </div>

            <div style={gridCols2}>
              <Field
                label="Municipality / City"
                required
                error={errors.permanentMunicipality}
                helperText="This field is required."
                lockedBadge={!canEdit("permanentMunicipality")}
              >
                <MSelect
                  name="permanentMunicipality"
                  value={person.permanentMunicipality || ""}
                  onChange={
                    canEdit("permanentMunicipality")
                      ? (e) => {
                        handleChange(e);
                        setPermanentCity(e.target.value);
                        setPermanentBarangay("");
                        setPermanentBarangayList([]);
                        autoSave();
                      }
                      : undefined
                  }
                  disabled={!canEdit("permanentMunicipality") || !person.permanentProvince}
                  locked={!canEdit("permanentMunicipality")}
                  error={errors.permanentMunicipality}
                >
                  <option value="">Select Municipality</option>
                  {permanentCityList.map((c) => (
                    <option key={c.city_code} value={c.city_name}>
                      {c.city_name}
                    </option>
                  ))}
                </MSelect>
              </Field>

              <Field
                label="Barangay"
                required
                error={errors.permanentBarangay}
                helperText="This field is required."
                lockedBadge={!canEdit("permanentBarangay")}
              >
                <MSelect
                  name="permanentBarangay"
                  value={person.permanentBarangay || ""}
                  onChange={
                    canEdit("permanentBarangay")
                      ? (e) => {
                        handleChange(e);
                        setPermanentBarangay(e.target.value);
                        autoSave();
                      }
                      : undefined
                  }
                  disabled={!canEdit("permanentBarangay") || !person.permanentMunicipality}
                  locked={!canEdit("permanentBarangay")}
                  error={errors.permanentBarangay}
                >
                  <option value="">Select Barangay</option>
                  {permanentBarangayList.map((b) => (
                    <option key={b.brgy_code} value={b.brgy_name}>
                      {b.brgy_name}
                    </option>
                  ))}
                </MSelect>
              </Field>
            </div>

            <CheckRow name="permanentDswdChecked" checked={person.permanentDswdChecked === 1} onChange={handleChange}>
              I have a Permanent DSWD Household Number
            </CheckRow>
            {person.permanentDswdChecked === 1 && (
              <Box sx={{ maxWidth: { md: 480 } }}>
                <Field
                  label="Permanent DSWD Household Number"
                  required
                  error={errors.permanentDswdHouseholdNumber}
                  helperText="This field is required."
                  lockedBadge={!canEdit("permanentDswdHouseholdNumber")}
                >
                  <MInput
                    name="permanentDswdHouseholdNumber"
                    value={person.permanentDswdHouseholdNumber || ""}
                    onChange={canEdit("permanentDswdHouseholdNumber") ? handleChange : undefined}
                    readOnly={!canEdit("permanentDswdHouseholdNumber")}
                    locked={!canEdit("permanentDswdHouseholdNumber")}
                    onBlur={() => handleUpdate(person)}
                    error={errors.permanentDswdHouseholdNumber}
                    placeholder="Enter your DSWD Household Number"
                  />
                </Field>
              </Box>
            )}

            {/* Action Buttons */}
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column-reverse", sm: "row" },
                justifyContent: "flex-end",
                gap: 1.5,
                mt: 3,
              }}
            >
              <Button
                fullWidth={isPhone}
                variant="contained"
                onClick={() => {
                  fetchPersonData();
                  setUploadModalOpen(true);
                }}
                sx={{
                  backgroundColor: mainButtonColor || "#6D2323",
                  border: `1px solid ${borderColor || "#6D2323"}`,
                  color: "#fff",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: 13,
                  "&:hover": { backgroundColor: "#000" },
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <PhotoCameraIcon sx={{ mr: 1, fontSize: 18 }} />
                Upload Photo / Student Picture
              </Button>

              <Button
                fullWidth={isPhone}
                variant="contained"
                onClick={handleNext}
                endIcon={<ArrowForwardIcon sx={{ color: "#fff" }} />}
                sx={{
                  backgroundColor: mainButtonColor || "#6D2323",
                  border: `1px solid ${borderColor || "#6D2323"}`,
                  color: "#fff",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: 13,
                  "&:hover": { backgroundColor: "#000", color: "#fff", "& .MuiSvgIcon-root": { color: "#fff" } },
                }}
              >
                Next Step
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Photo Upload Modal ────────────────────────────────────────── */}
      <Modal
        open={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setPreview(null);
          setSelectedFile(null);
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            p: { xs: 1, sm: 2 },
          }}
        >
          <Box
            sx={{
              position: "relative",
              width: "90%",
              maxWidth: 1100,
              bgcolor: "background.paper",
              borderRadius: { xs: 2, sm: 3 },
              boxShadow: 24,
              maxHeight: "95vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <Box
              sx={{
                bgcolor: headerColor || "#1976d2",
                color: "white",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                py: { xs: 1.5, sm: 2 },
                px: { xs: 2, sm: 3 },
                flexShrink: 0,
              }}
            >
              <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: 16, sm: 18 } }}>
                Upload Your Photo
              </Typography>
              <IconButton
                onClick={() => {
                  setUploadModalOpen(false);
                  setPreview(null);
                  setSelectedFile(null);
                }}
                sx={{
                  color: "white",
                  border: "2px solid rgba(255,255,255,0.6)",
                  borderRadius: "50%",
                  width: { xs: 36, sm: 40 },
                  height: { xs: 36, sm: 40 },
                  padding: 0,
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.2)",
                    border: "2px solid white",
                  },
                }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>

            {/* Body — always stacked, sample on top, upload below */}
            <Box
              sx={{
                p: { xs: 2, sm: 3 },
                overflowY: "auto",
                borderTop: "1px solid #e0e0e0",
                borderBottom: "1px solid #e0e0e0",
                flex: 1,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: { xs: 3, sm: 3 },
                  alignItems: "stretch",
                }}
              >
                {/* TOP — Sample photo (always visible first) */}
                <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: 13, sm: 14 } }}>
                    ✅ Sample Format (Follow this exactly)
                  </Typography>

                  <Box
                    component="img"
                    src={FormalExample}
                    alt="Formal Photo Example"
                    sx={{
                      width: "100%",
                      maxWidth: 420,
                      height: isPhone ? 220 : 260,
                      objectFit: "cover",
                      mx: "auto",
                      border: `1px solid ${borderColor}`,
                      borderRadius: 2,
                      backgroundColor: "#fff",
                    }}
                  />

                  <Box
                    sx={{
                      border: "2px dashed #ccc",
                      p: { xs: 1.75, sm: 2 },
                      borderRadius: 2,
                      backgroundColor: "#f9f9f9",
                    }}
                  >
                    <Typography variant="body1" fontWeight="bold" mb={1} sx={{ fontSize: { xs: 14, sm: 15 } }}>
                      Guidelines:
                    </Typography>
                    <Box sx={{ ml: 1, fontSize: { xs: 13, sm: 14 }, lineHeight: 1.8 }}>
                      - Size: 2" x 2"<br />
                      - Color: Your photo must be in colored.<br />
                      - Background: White.<br />
                      - Look directly into the camera, face centered.<br />
                      - File types: JPEG, JPG, PNG<br />
                      - Attire must be formal.<br />
                      - Required File Size: 2mb
                    </Box>
                  </Box>
                </Box>

                {/* BOTTOM — Upload area (applicant does this after seeing the sample) */}
                <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Typography variant="subtitle2" color="text.secondary" fontWeight={600} sx={{ fontSize: { xs: 13, sm: 14 } }}>
                    📤 Your Photo
                  </Typography>

                  {(preview || person.profile_img) ? (
                    <Box sx={{ display: "flex", justifyContent: "center", position: "relative" }}>
                      <Box
                        component="img"
                        src={preview || `${API_BASE_URL}/uploads/Student1by1/${person.profile_img}`}
                        alt="Preview"
                        sx={{
                          width: isPhone ? 200 : 192,
                          height: isPhone ? 200 : 192,
                          objectFit: "cover",
                          border: `1px solid ${borderColor}`,
                          borderRadius: 2,
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={async () => {
                          setSelectedFile(null);
                          setPreview(null);
                          const updated = { ...person, profile_img: "" };
                          setPerson(updated);
                          await handleUpdate(updated);
                          setSnackbar({ open: true, message: "Image removed successfully.", severity: "info" });
                        }}
                        sx={{
                          position: "absolute",
                          top: -10,
                          right: `calc(50% - ${isPhone ? 100 : 96}px)`,
                          width: 30,
                          height: 30,
                          color: "#fff",
                          bgcolor: "#d32f2f",
                          "&:hover": { bgcolor: "#b71c1c" },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        height: isPhone ? 180 : 192,
                        border: "1px dashed #ccc",
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "text.secondary",
                        fontSize: 13,
                        textAlign: "center",
                        px: 2,
                      }}
                    >
                      No photo selected yet — match the sample.
                    </Box>
                  )}

                  <Typography sx={{ fontSize: { xs: 14, sm: 16 }, color: mainButtonColor, fontWeight: "bold" }}>
                    Select Your Image:
                  </Typography>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onClick={(e) => (e.target.value = null)}
                    onChange={handleFileChange}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "12px",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />

                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: 12, sm: 13 } }}>
                    Tap the × to remove your preview, choose a new file, then press Upload.
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Footer */}
            <Box
              sx={{
                p: { xs: 2, sm: 2 },
                display: "flex",
                flexDirection: isPhone ? "column-reverse" : "row",
                justifyContent: "space-between",
                gap: 1.5,
                flexShrink: 0,
              }}
            >
              <Button
                fullWidth={isPhone}
                onClick={() => {
                  setUploadModalOpen(false);
                  setPreview(null);
                  setSelectedFile(null);
                }}
                color="error"
                variant="outlined"
                sx={{ height: { xs: 46, sm: 40 }, fontSize: { xs: 14, sm: 14 } }}
              >
                Cancel
              </Button>

              <Button
                fullWidth={isPhone}
                onClick={handleUpload}
                variant="contained"
                color="success"
                sx={{ minWidth: 140, height: { xs: 46, sm: 40 }, fontSize: { xs: 14, sm: 14 } }}
              >
                Upload
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default StudentPersonalInformationResponsive;
