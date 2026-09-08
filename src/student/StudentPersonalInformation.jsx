import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Button, Box, TextField, Container, Typography, Card,
  TableContainer, Paper, Table, TableHead, TableRow, TableCell,
  FormHelperText, FormControl, InputLabel, Select, MenuItem,
  Modal, FormControlLabel, Checkbox, IconButton, CircularProgress,
} from "@mui/material";
import { Link } from "react-router-dom";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CloseIcon from "@mui/icons-material/Close";
import ErrorIcon from "@mui/icons-material/Error";
import LockIcon from "@mui/icons-material/Lock";
import Search from "@mui/icons-material/Search";
import regions from "../data/region.json";
import provinces from "../data/province.json";
import cities from "../data/city.json";
import barangays from "../data/barangay.json";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PersonIcon from "@mui/icons-material/Person";
import SchoolIcon from "@mui/icons-material/School";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DateField from "../components/DateField";
import { Snackbar, Alert } from "@mui/material";
import useStudentEditPermissions from "../account_management/useStudentEditPermissions";
import API_BASE_URL from "../apiConfig";
import FormalExample from "../assets/formalexample.png";
import StudentECATApplicationForm from "./StudentECATApplicationForm";
import StudentPersonalDataForm from "./StudentPersonalDataForm";
import StudentOfficeOfTheRegistrar from "./StudentOfficeOfTheRegistrar";
import StudentServicesSurvey from "./StudentServicesSurvey";
const StudentDashboard1 = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  // ── Hook at the very top ──────────────────────────────────────────────────
  const { canEdit: canEditField, permissionsLoaded } = useStudentEditPermissions();

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [stepperColor, setStepperColor] = useState("#000000");
  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [branches, setBranches] = useState([]);
  const [explicitSelection, setExplicitSelection] = useState(false);
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [persons, setPersons] = useState([]);
  const [isLrnNA, setIsLrnNA] = useState(false);
  const [studentNumber, setStudentNumber] = useState("");
  const [errors, setErrors] = useState({});
  const [activeStep, setActiveStep] = useState(0);
  const [clickedSteps, setClickedSteps] = useState(Array(5).fill(false));
  const [open, setOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [yearLevelOptions, setYearLevelOptions] = useState([]);
  const [programAvailability, setProgramAvailability] = useState([]);
  const [activeYearId, setActiveYearId] = useState(null);
  const [activeSemesterId, setActiveSemesterId] = useState(null);
  const [curriculumOptions, setCurriculumOptions] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "warning" });

  const [person, setPerson] = useState({
    profile_img: "", campus: "", academicProgram: "", classifiedAs: "",
    applyingAs: "", program: "", program2: "", program3: "", yearLevel: "",
    last_name: "", first_name: "", middle_name: "", extension: "", nickname: "",
    height: "", weight: "", lrnNumber: "", nolrnNumber: "", gender: "",
    pwdType: "", pwdId: "", birthOfDate: "", age: "", birthPlace: "",
    languageDialectSpoken: "", citizenship: "", religion: "", civilStatus: "",
    spouse: "", facebook_account: "",
    tribeEthnicGroup: "", cellphoneNumber: "", emailAddress: "",
    presentStreet: "", presentBarangay: "", presentZipCode: "",
    presentRegion: "", presentProvince: "", presentMunicipality: "",
    presentDswdHouseholdNumber: "", sameAsPresentAddress: "",
    permanentStreet: "", permanentBarangay: "", permanentZipCode: "",
    permanentRegion: "", permanentProvince: "", permanentMunicipality: "",
    permanentDswdHouseholdNumber: "",
  });

  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const queryPersonId = queryParams.get("person_id");
  const queryStudentNumber = sessionStorage.getItem("student_number");

  // ── canEdit wrapper — reads userRole from state ───────────────────────────
  const canEdit = (fieldId) => canEditField(fieldId, userRole);

  // ── LockedBadge component ─────────────────────────────────────────────────
  const LockedBadge = () => (
    <Box
      component="span"
      sx={{
        display: "inline-flex", alignItems: "center", gap: 0.4,
        ml: 1, px: 0.8, py: 0.2, borderRadius: "4px",
        backgroundColor: "#fce4ec", color: "#c62828",
        fontSize: "11px", fontWeight: "bold", verticalAlign: "middle",
      }}
    >
      <LockIcon sx={{ fontSize: 12 }} />
      Locked by Admin
    </Box>
  );

  // ── ADDRESS STATE ─────────────────────────────────────────────────────────
  const [regionList, setRegionList] = useState([]);
  const [provinceList, setProvinceList] = useState([]);
  const [cityList, setCityList] = useState([]);
  const [barangayList, setBarangayList] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const [permanentRegionList, setPermanentRegionList] = useState([]);
  const [permanentProvinceList, setPermanentProvinceList] = useState([]);
  const [permanentCityList, setPermanentCityList] = useState([]);
  const [permanentBarangayList, setPermanentBarangayList] = useState([]);
  const [permanentRegion, setPermanentRegion] = useState("");
  const [permanentProvince, setPermanentProvince] = useState("");
  const [permanentCity, setPermanentCity] = useState("");
  const [permanentBarangay, setPermanentBarangay] = useState("");

  const isReadOnly = userRole === "student";

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getBranchLabel = (branchId) => {
    const branch = branches.find((item) => String(item.id) === String(branchId));
    return branch?.branch || "—";
  };

  const getYearLevelSelectValue = () => {
    const current = person?.yearLevel;
    if (current === null || current === undefined || current === "") return "";
    const currentText = String(current).trim();
    const byId = yearLevelOptions.find((yl) => String(yl.year_level_id) === currentText);
    if (byId) return String(byId.year_level_id);
    const byDesc = yearLevelOptions.find((yl) => String(yl.year_level_description || "").trim().toLowerCase() === currentText.toLowerCase());
    if (byDesc) return String(byDesc.year_level_id);
    return currentText;
  };

  const filteredYearLevels = yearLevelOptions.filter((yl) => {
    if (Number(person.academicProgram) === 1) return yl.level_type === "graduate";
    return yl.level_type === "year";
  });

  const availabilityMap = React.useMemo(() => {
    const map = {};
    programAvailability.forEach((p) => {
      map[p.curriculum_id] = { remaining: Number(p.remaining), isFull: Number(p.remaining) <= 0 };
    });
    return map;
  }, [programAvailability]);

  const filteredCurriculum = curriculumOptions.filter((item) => {
    if (person.academicProgram !== "" && person.academicProgram !== null) {
      if (Number(item.academic_program) !== Number(person.academicProgram)) return false;
    }
    return true;
  });

  const parseISODate = (dateString) => {
    if (!dateString) return null;
    const [y, m, d] = dateString.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const getManilaDate = () => {
    const now = new Date();
    const manilaString = now.toLocaleString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" });
    const [month, day, year] = manilaString.split("/");
    return new Date(`${year}-${month}-${day}`);
  };

  const calculateAge = (birthDateString) => {
    const birthDate = parseISODate(birthDateString);
    if (!birthDate) return "";
    const today = getManilaDate();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;
    return age < 0 ? "" : age;
  };

  const MAX_SIZE = 2 * 1024 * 1024;

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);
    if (assets.logoUrl) setFetchedLogo(`${assets.logoUrl}`);
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
    setBranches(settings?.branches || []);
  }, [settings]);

  useEffect(() => {
    const fetchYearLevels = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/year-levels`);
        setYearLevelOptions(res.data);
      } catch (err) { console.error("Error fetching year levels:", err); }
    };
    fetchYearLevels();
  }, []);

  useEffect(() => {
    const fetchActiveYearAndAvailability = async () => {
      const yearRes = await axios.get(`${API_BASE_URL}/api/active_school_year`);
      const activeYear = yearRes.data[0];
      if (activeYear) {
        setActiveYearId(activeYear.year_id);
        setActiveSemesterId(activeYear.semester_id);
        const availRes = await axios.get(`${API_BASE_URL}/api/programs/availability`, { params: { year_id: activeYear.year_id, semester_id: activeYear.semester_id } });
        setProgramAvailability(availRes.data);
      }
    };
    fetchActiveYearAndAvailability();
  }, []);

  useEffect(() => {
    if (!queryStudentNumber) return;
    const fetchPersonId = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/person_id/${queryStudentNumber}`);
        setUserID(res.data.person_id);
        setStudentNumber(queryStudentNumber);
        setPerson(normalizePerson(res.data));
        setSelectedPerson(res.data);
      } catch (err) { console.error("❌ Failed to fetch person_id:", err); }
    };
    fetchPersonId();
  }, [queryStudentNumber]);

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const loggedInPersonId = localStorage.getItem("person_id");
    const searchedPersonId = sessionStorage.getItem("student_edit_person_id");
    if (!storedUser || !storedRole || !loggedInPersonId) { window.location.href = "/login"; return; }
    setUser(storedUser);
    setUserRole(storedRole);
    const allowedRoles = ["student", "registrar"];
    if (allowedRoles.includes(storedRole)) {
      const targetId = queryPersonId || searchedPersonId || loggedInPersonId;
      if (studentNumber) sessionStorage.setItem("student_number", studentNumber);
      setUserID(targetId);
      return;
    }
    window.location.href = "/login";
  }, [queryPersonId, studentNumber]);

  useEffect(() => {
    let consumedFlag = false;
    const tryLoad = async () => {
      if (queryPersonId) { await fetchByPersonId(queryPersonId); setExplicitSelection(true); consumedFlag = true; return; }
      const source = sessionStorage.getItem("student_edit_person_id_source");
      const tsStr = sessionStorage.getItem("student_edit_person_id_ts");
      const id = sessionStorage.getItem("student_edit_person_id");
      const ts = tsStr ? parseInt(tsStr, 10) : 0;
      const isFresh = source === "applicant_list" && Date.now() - ts < 5 * 60 * 1000;
      if (id && isFresh) { await fetchByPersonId(id); setExplicitSelection(true); consumedFlag = true; }
    };
    tryLoad().finally(() => {
      if (consumedFlag) {
        sessionStorage.removeItem("student_edit_person_id_source");
        sessionStorage.removeItem("student_edit_person_id_ts");
      }
    });
  }, [queryPersonId]);

  useEffect(() => {
    const fetchPersonById = async () => {
      if (!userID) return;
      try {
        const res = await axios.get(`${API_BASE_URL}/api/student_data_as_applicant/${userID}`);
        if (res.data) { setPerson(normalizePerson(res.data)); setSelectedPerson(res.data); }
      } catch (err) { console.error("❌ Failed to fetch person by ID:", err); }
    };
    fetchPersonById();
  }, [userID]);

  useEffect(() => {
    const fetchPersons = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/enrollment_upload_documents`);
        setPersons(res.data);
      } catch (err) { console.error("❌ Failed to fetch persons list", err); }
    };
    fetchPersons();
  }, []);

  useEffect(() => {
    const fetchCurriculums = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/applied_program`);
        setCurriculumOptions(response.data);
      } catch (error) { console.error("Error fetching curriculum options:", error); }
    };
    fetchCurriculums();
  }, []);

  // Address cascades
  useEffect(() => { setRegionList(regions); }, []);
  useEffect(() => { setPermanentRegionList(regions); }, []);
  useEffect(() => { const region = regions.find((r) => r.region_name === selectedRegion); setProvinceList(region ? provinces.filter((p) => p.region_code === region.region_code) : []); }, [selectedRegion]);
  useEffect(() => { const province = provinces.find((p) => p.province_name === selectedProvince); setCityList(province ? cities.filter((c) => c.province_code === province.province_code) : []); }, [selectedProvince]);
  useEffect(() => { const city = cities.find((c) => c.city_name === selectedCity); setBarangayList(city ? barangays.filter((b) => b.city_code === city.city_code) : []); }, [selectedCity]);
  useEffect(() => { const region = regions.find((r) => r.region_name === person.presentRegion); setProvinceList(region ? provinces.filter((p) => p.region_code === region.region_code) : []); }, [person.presentRegion]);
  useEffect(() => { const province = provinces.find((p) => p.province_name === person.presentProvince); setCityList(province ? cities.filter((c) => c.province_code === province.province_code) : []); }, [person.presentProvince]);
  useEffect(() => { const city = cities.find((c) => c.city_name === person.presentMunicipality); setBarangayList(city ? barangays.filter((b) => b.city_code === city.city_code) : []); }, [person.presentMunicipality]);
  useEffect(() => { const region = regions.find((r) => r.region_name === person.permanentRegion); setPermanentProvinceList(region ? provinces.filter((p) => p.region_code === region.region_code) : []); }, [person.permanentRegion]);
  useEffect(() => { const province = provinces.find((p) => p.province_name === person.permanentProvince); setPermanentCityList(province ? cities.filter((c) => c.province_code === province.province_code) : []); }, [person.permanentProvince]);
  useEffect(() => { const city = cities.find((c) => c.city_name === person.permanentMunicipality); setPermanentBarangayList(city ? barangays.filter((b) => b.city_code === city.city_code) : []); }, [person.permanentMunicipality]);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim() === "") return;
      try {
        const res = await axios.get(`${API_BASE_URL}/api/search-person`, { params: { query: searchQuery } });
        if (res.data && res.data.person_id) {
          const details = await axios.get(`${API_BASE_URL}/api/student_data_as_applicant/${res.data.person_id}`);
          setPerson(normalizePerson(details.data));
          sessionStorage.setItem("student_edit_person_id", details.data.person_id);
          setUserID(details.data.person_id);
          setSearchError("");
        } else { setSearchError("Invalid search result"); }
      } catch (err) { console.error("Search failed:", err); setSearchError("Applicant not found"); }
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const normalizePerson = (data) => {
    if (!data) return data;
    return { ...data };
  };

  const fetchByPersonId = async (personID) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/enrollment_person/${personID}`);
      setPerson(normalizePerson(res.data));
      setSelectedPerson(res.data);
    } catch (err) { console.error("❌ person_with_applicant failed:", err); }
  };

  const handleUpdate = async (updatedPerson) => {
    try {
      const { presentDswdChecked, permanentDswdChecked, ...personToSave } = updatedPerson;
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, personToSave);
    } catch (error) { console.error("❌ Auto-save failed:", error); }
  };

  const handleChange = (e) => {
    const target = e && e.target ? e.target : {};
    const { name, type, checked, value } = target;
    const updatedValue = type === "checkbox" ? (checked ? 1 : 0) : value;
    const updatedPerson = { ...person, [name]: updatedValue };
    if (name === "academicProgram") updatedPerson.yearLevel = Number(value) === 1 ? "Master" : "";
    if (name === "birthOfDate") updatedPerson.age = calculateAge(value);
    if (name === "classifiedAs" && value === "Freshman (First Year)") updatedPerson.yearLevel = "First Year";
    if (name === "campus" || name === "academicProgram") updatedPerson.program = "";
    if (name === "civilStatus" && value !== "Married") updatedPerson.spouse = "";
    setPerson(updatedPerson);
    handleUpdate(updatedPerson);
  };

  const handleBlur = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, person);
    } catch (err) { console.error("❌ Auto-save failed (on blur):", err); }
  };

  const autoSave = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${userID}`, person);
    } catch (err) { console.error("❌ Auto-save failed (manual):", err); }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => { setOpen(false); setSelectedFile(null); setPreview(null); };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    const maxSizeInBytes = 2 * 1024 * 1024;
    if (!validTypes.includes(file.type)) { setSnackbar({ open: true, message: "Invalid file type. Please select a JPEG or PNG file.", severity: "error" }); setSelectedFile(null); setPreview(null); return; }
    if (file.size > maxSizeInBytes) { setSnackbar({ open: true, message: "File is too large. Maximum allowed size is 2MB.", severity: "error" }); setSelectedFile(null); setPreview(null); return; }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) { setSnackbar({ open: true, message: "Please select a file first.", severity: "warning" }); return; }
    if (selectedFile.size > MAX_SIZE) { setSnackbar({ open: true, message: "File must be 2MB or less.", severity: "error" }); return; }
    const formData = new FormData();
    formData.append("profile_picture", selectedFile);
    formData.append("person_id", userID);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/enrollment/upload-profile-picture`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      const fileName = response.data.filename || response.data.profile_img;
      const updatedPerson = { ...person, profile_img: fileName };
      setPerson(updatedPerson);
      await handleUpdate(updatedPerson);
      setUploadedImage(`${API_BASE_URL}/uploads/${fileName}`);
      setSnackbar({ open: true, message: "Upload successful!", severity: "success" });
      handleClose();
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || "Upload failed.";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    }
  };

  const handlePwdCheck = (event) => {
    if (isReadOnly) return;
    const checked = event.target.checked;
    setPerson((prev) => ({ ...prev, pwdMember: checked ? 1 : 0, pwdType: checked ? prev.pwdType || "" : "", pwdId: checked ? prev.pwdId || "" : "" }));
  };

  const isFormValid = () => {
    const requiredFields = [
      "campus", "academicProgram", "classifiedAs", "applyingAs", "program", "yearLevel",
      "profile_img", "last_name", "first_name", "height", "weight", "gender",
      "birthOfDate", "age", "birthPlace", "languageDialectSpoken", "citizenship",
      "religion", "civilStatus", "tribeEthnicGroup", "cellphoneNumber", "emailAddress",
      "facebook_account",
      "presentStreet", "presentZipCode", "presentRegion", "presentProvince", "presentMunicipality", "presentBarangay",
      "permanentStreet", "permanentZipCode", "permanentRegion", "permanentProvince", "permanentMunicipality", "permanentBarangay",
    ];
    if (person.civilStatus === "Married") {
      requiredFields.push("spouse");
    }
    let newErrors = {};
    let isValid = true;
    requiredFields.forEach((field) => {
      const value = person[field];
      if (value === null || value === undefined || value === "" || value === "null" || value === "undefined") { newErrors[field] = true; isValid = false; }
    });
    const emailValue = person.emailAddress?.trim();
    const emailPattern = /^[^@]+@[^@]+\.[^@]+$/;
    if (!emailValue || !emailPattern.test(emailValue)) { newErrors.emailAddress = true; isValid = false; }
    if (!isLrnNA) { const lrnValue = person.lrnNumber?.toString().trim(); if (!lrnValue) { newErrors.lrnNumber = true; isValid = false; } }
    if (person.presentDswdChecked === 1) { if (!person.presentDswdHouseholdNumber?.trim()) { newErrors.presentDswdHouseholdNumber = true; isValid = false; } }
    if (person.permanentDswdChecked === 1) { if (!person.permanentDswdHouseholdNumber?.trim()) { newErrors.permanentDswdHouseholdNumber = true; isValid = false; } }
    if (person.pwdMember === 1) {
      if (!person.pwdType?.toString().trim()) { newErrors.pwdType = true; isValid = false; }
      if (!person.pwdId?.toString().trim()) { newErrors.pwdId = true; isValid = false; }
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleStepClick = async (index) => {
    const valid = isFormValid();
    if (!valid) {
      setSnackbar({
        open: true,
        message: "Please fill all required fields before proceeding.",
        severity: "error",
      });
      return; // hard stop — no navigation
    }
    await handleUpdate(person);
    setSnackbar({
      open: true,
      message: "Your record has been saved successfully!",
      severity: "success",
    });
    setActiveStep(index);
    const newClickedSteps = [...clickedSteps];
    newClickedSteps[index] = true;
    setClickedSteps(newClickedSteps);
    setTimeout(() => { navigate(steps[index].path); }, 1000);
  };

  const steps = [
    { label: "Personal Information", icon: <PersonIcon />, path: `/student_personal_information` },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: `/student_family_background` },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: `/student_educational_attainment` },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: `/student_health_medical_records` },
    { label: "Other Information", icon: <InfoIcon />, path: `/student_other_information` },
  ];

  const [generatingKey, setGeneratingKey] = useState(null); // "ecat" | "personalData" | "registrar" | "admissionServices" | "examPermitDownload"
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
    { key: "registrar", label: `Application For ${shortTerm ? shortTerm.toUpperCase() : ""} College Admission`, onClick: () => generateFormPdf("registrar") },
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
  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
      {generatingKey && FORM_CONFIGS[generatingKey] && (
        <div ref={hiddenFormRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          {React.createElement(FORM_CONFIGS[generatingKey].Component)}
        </div>
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}>PERSONAL INFORMATION</Typography>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          mt: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            p: 2,
            borderRadius: "10px",
            backgroundColor: "#fffaf5",
            border: "1px solid #6D2323",
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.05)",
            width: "100%",
            overflow: "hidden",
          }}
        >
          {/* Icon */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#800000",
              borderRadius: "8px",
              width: 60,
              height: 60,
              flexShrink: 0,
            }}
          >
            <ErrorIcon sx={{ color: "white", fontSize: 40 }} />
          </Box>

          {/* Text */}
          <Typography
            sx={{
              fontSize: "20px",
              fontFamily: "Poppins, sans-serif",
              color: "#3e3e3e",
              lineHeight: 1.3,
              whiteSpace: "normal",
              overflow: "hidden",
            }}
          >
            <strong style={{ color: "maroon" }}>Important Notice:</strong>
            <br />



            <span style={{ fontSize: "1.2em", margin: "0 15px" }}>➔</span>
            Please indicate <strong>“NA”</strong> or <strong>“N/A”</strong> in fields where the
            requested information is not applicable or no response can be provided.
            <br />

            <span style={{ fontSize: "1.2em", margin: "0 15px" }}>➔</span>
            To enter the letter <strong>“Ñ”</strong>, press and hold the ALT key while typing
            <strong> 165</strong>. For <strong>“ñ”</strong>, press and hold the ALT key while
            typing <strong> 164</strong>.
            <br />

            <span style={{ fontSize: "1.2em", margin: "0 15px" }}>➔</span>
            Please complete all information from <strong>Personal Information</strong> up to
            <strong> Other Information</strong> before printing your documents.
            <br />
          </Typography>
        </Box>
      </Box>


      <h1 style={{ fontSize: "30px", fontWeight: "bold", textAlign: "center", color: "black", marginTop: "25px" }}>PRINTABLE DOCUMENTS</h1>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          mt: 2,
          pb: 1,
          justifyContent: "center",
        }}
      >
        {links.map((lnk, i) => {
          const isGenerating = generatingKey === lnk.key;
          const disabled = generatingKey !== null;

          return (
            <motion.div
              key={i}
              style={{ flex: "0 0 calc(30% - 16px)" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <Card
                sx={{
                  minHeight: 60,
                  borderRadius: 2,
                  border: `1px solid ${borderColor}`,
                  backgroundColor: "#fff",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  p: 1.5,
                  cursor: disabled ? "default" : "pointer",
                  opacity: disabled && !isGenerating ? 0.5 : 1,
                  pointerEvents: disabled ? "none" : "auto",
                  transition: "all 0.3s ease-in-out",
                  "&:hover": {
                    transform: disabled ? "none" : "scale(1.05)",
                    backgroundColor: disabled
                      ? "#fff"
                      : headerColor || "#1976d2",

                    "& .card-text": {
                      color: disabled ? mainButtonColor : "#fff",
                    },
                    "& .card-icon": {
                      color: disabled ? mainButtonColor : "#fff",
                    },
                  },
                }}
                onClick={() => {
                  if (disabled) return;

                  if (lnk.onClick) {
                    lnk.onClick();
                  } else if (lnk.to) {
                    navigate(lnk.to);
                  }
                }}
              >
                {/* Icon / Loading */}
                {isGenerating ? (
                  <CircularProgress
                    size={26}
                    sx={{ color: mainButtonColor, mr: 1.5 }}
                  />
                ) : (
                  <PictureAsPdfIcon
                    className="card-icon"
                    sx={{ fontSize: 35, color: mainButtonColor, mr: 1.5 }}
                  />
                )}

                {/* Label */}
                <Typography
                  className="card-text"
                  sx={{
                    color: mainButtonColor,
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: "bold",
                    fontSize: "0.85rem",
                  }}
                >
                  {isGenerating ? "Generating PDF..." : lnk.label}
                </Typography>
              </Card>
            </motion.div>
          );
        })}
      </Box>


      <Container>
        <Container>
          <h1 style={{ fontSize: "50px", fontWeight: "bold", textAlign: "center", color: subtitleColor, marginTop: "25px" }}>
            STUDENT FORM
          </h1>
          <div style={{ textAlign: "center" }}>
            Please update your personal information to keep your student records accurate and up to date for the upcoming academic year at{" "}
            {shortTerm ? <><strong>{shortTerm.toUpperCase()}</strong> - {companyName || ""}</> : companyName || ""}.
          </div>
        </Container>
        <br />

        {/* Stepper */}
        <Box sx={{ display: "flex", justifyContent: "center", width: "100%", px: 4 }}>
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <Box
                sx={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}
                onClick={() => handleStepClick(index)}
              >
                <Box
                  sx={{
                    width: 50, height: 50, borderRadius: "50%",
                    border: `1px solid ${borderColor}`,
                    backgroundColor: activeStep === index ? headerColor || "#1976d2" : "#E8C999",
                    color: activeStep === index ? "#fff" : "#000",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {step.icon}
                </Box>
                <Typography
                  sx={{
                    mt: 1,
                    color: activeStep === index ? "#6D2323" : "#000",
                    fontWeight: activeStep === index ? "bold" : "normal",
                    fontSize: 14,
                  }}
                >
                  {step.label}
                </Typography>
              </Box>
              {index < steps.length - 1 && (
                <Box sx={{ height: "2px", backgroundColor: mainButtonColor, flex: 1, alignSelf: "center", mx: 2 }} />
              )}
            </React.Fragment>
          ))}
        </Box>
        <br />

        <form>
          <Container maxWidth="100%" sx={{ backgroundColor: headerColor || "#1976d2", border: `1px solid ${borderColor}`, color: "white", borderRadius: 2, boxShadow: 3, padding: "4px" }}>
            <Box sx={{ width: "100%" }}>
              <Typography style={{ fontSize: "20px", padding: "10px", fontFamily: "Poppins, sans-serif" }}>Step 1: Personal Information</Typography>
            </Box>
          </Container>

          <Container maxWidth="100%" sx={{ backgroundColor: "#f1f1f1", border: `1px solid ${borderColor}`, padding: 4, borderRadius: 2, boxShadow: 3 }}>
            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Personal Information:</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />

            {/* Campus — system-locked */}
            <div className="flex items-center mb-4 gap-4">
              <label className="w-40 font-medium">Campus:<span style={{ color: "red" }}> *</span></label>
              <FormControl fullWidth size="small" required error={!!errors.campus} className="mb-4">
                <Select readOnly name="campus" value={person.campus || ""} onChange={(e) => handleChange({ target: { name: "campus", value: e.target.value } })} displayEmpty renderValue={(selected) => { if (!selected) return <em>Select Campus</em>; const branch = branches.find(b => String(b.id) === String(selected)); return branch ? branch.branch.toUpperCase() : "Select Campus"; }}>
                  <MenuItem value=""><em>Select Campus</em></MenuItem>
                  {branches.map((b) => (<MenuItem key={b.id} value={String(b.id)}>{b.branch.toUpperCase()}</MenuItem>))}
                </Select>
                {errors.campus && <FormHelperText>This field is required.</FormHelperText>}
              </FormControl>
            </div>

            {/* Academic Program — system-locked */}
            <div className="flex items-center mb-4 gap-4">
              <label className="w-40 font-medium">Academic Program:<span style={{ color: "red" }}> *</span></label>
              <FormControl fullWidth size="small" required error={!!errors.academicProgram} className="mb-4">
                <InputLabel id="academic-program-label">Academic Program</InputLabel>
                <Select readOnly labelId="academic-program-label" name="academicProgram" value={person.academicProgram || ""} label="Academic Program" onChange={handleChange} onBlur={() => handleUpdate(person)}>
                  <MenuItem value=""><em>Select Program</em></MenuItem>
                  <MenuItem value="0">Undergraduate</MenuItem>
                  <MenuItem value="1">Graduate</MenuItem>
                  <MenuItem value="2">Techvoc</MenuItem>
                </Select>
                {errors.academicProgram && <FormHelperText>This field is required.</FormHelperText>}
              </FormControl>
            </div>

            {/* Classified As — admin-controlled */}
            <div className="flex items-center mb-4 gap-4">
              <label className="w-40 font-medium">
                Classified As:<span style={{ color: "red" }}> *</span>
                {!canEdit("classifiedAs") && <LockedBadge />}
              </label>
              <FormControl fullWidth size="small" required error={!!errors.classifiedAs} className="mb-4">
                <InputLabel id="classified-as-label">Classified As</InputLabel>
                <Select labelId="classified-as-label" name="classifiedAs" value={person.classifiedAs || ""} label="Classified As" onChange={canEdit("classifiedAs") ? handleChange : undefined} inputProps={{ readOnly: !canEdit("classifiedAs") }} onBlur={() => handleUpdate(person)}>
                  <MenuItem value=""><em>Select Classification</em></MenuItem>
                  <MenuItem value="Freshman (First Year)">Freshman (First Year)</MenuItem>
                  <MenuItem value="Transferee">Transferee</MenuItem>
                  <MenuItem value="Returnee">Returnee</MenuItem>
                  <MenuItem value="Shiftee">Shiftee</MenuItem>
                  <MenuItem value="Foreign Student">Foreign Student</MenuItem>
                </Select>
                {errors.classifiedAs && <FormHelperText>This field is required.</FormHelperText>}
              </FormControl>
            </div>

            {/* Applying As — admin-controlled */}
            <div className="flex items-center mb-4 gap-4">
              <label className="w-40 font-medium">
                Applying As:<span style={{ color: "red" }}> *</span>
                {!canEdit("applyingAs") && <LockedBadge />}
              </label>
              <FormControl fullWidth size="small" required error={!!errors.applyingAs} className="mb-4">
                <InputLabel id="applying-as-label">Applying As</InputLabel>
                <Select labelId="applying-as-label" name="applyingAs" value={person.applyingAs || ""} label="Applying As" onChange={canEdit("applyingAs") ? handleChange : undefined} inputProps={{ readOnly: !canEdit("applyingAs") }} onBlur={() => handleUpdate(person)}>
                  <MenuItem value=""><em>Select Applying</em></MenuItem>
                  <MenuItem value="1">Senior High School Graduate</MenuItem>
                  <MenuItem value="2">Senior High School Graduating Student</MenuItem>
                  <MenuItem value="3">ALS (Alternative Learning System) Passer</MenuItem>
                  <MenuItem value="4">Transferee from other University/College</MenuItem>
                  <MenuItem value="5">Cross Enrolee Student</MenuItem>
                  <MenuItem value="6">Foreign Applicant/Student</MenuItem>
                  <MenuItem value="7">Baccalaureate Graduate</MenuItem>
                  <MenuItem value="8">Master Degree Graduate</MenuItem>
                </Select>
                {errors.applyingAs && <FormHelperText>This field is required.</FormHelperText>}
              </FormControl>
            </div>

            <br />
            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Course Program:</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />

            <Box display="flex" width="100%" gap={2}>
              <Box display="flex" flexDirection="column" sx={{ width: "75%" }}>
                <Box display="flex" flexDirection="column" sx={{ width: "100%" }}>
                  {/* Course Applied — system-locked */}
                  <Box display="flex" alignItems="center" gap={2} mb={3}>
                    <label className="w-40 font-medium">Course Applied:<span style={{ color: "red" }}> *</span></label>
                    <FormControl fullWidth size="small" required error={!!errors.program}>
                      <InputLabel>Course Applied</InputLabel>
                      <Select readOnly name="program" value={person.program || ""} onBlur={() => handleUpdate(person)} onChange={handleChange} label="Program">
                        <MenuItem value=""><em>Select Program</em></MenuItem>
                        {filteredCurriculum.map((item, index) => (
                          <MenuItem key={index} value={item.curriculum_id}>
                            {`(${item.program_code}): ${item.program_description}${item.major ? ` (${item.major})` : ""} (${item.current_year}-${item.next_year}) (${getBranchLabel(item.components)})`}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.program && <FormHelperText>This field is required.</FormHelperText>}
                    </FormControl>
                  </Box>

                  {/* Year Level — system-locked */}
                  <div className="flex items-center mb-4 gap-2">
                    <label className="w-40 font-medium">Year Level:<span style={{ color: "red" }}> *</span></label>
                    <FormControl fullWidth size="small" required error={!!errors.yearLevel}>
                      <InputLabel id="year-level-label">Year Level</InputLabel>
                      <Select readOnly labelId="year-level-label" name="yearLevel" value={getYearLevelSelectValue()} label="Year Level" onChange={handleChange} onBlur={() => handleUpdate(person)}>
                        <MenuItem value=""><em>Select Year Level</em></MenuItem>
                        {filteredYearLevels.map((yl) => (<MenuItem key={yl.year_level_id} value={String(yl.year_level_id)}>{yl.year_level_description}</MenuItem>))}
                      </Select>
                      {errors.yearLevel && <FormHelperText>This field is required.</FormHelperText>}
                    </FormControl>
                  </div>
                </Box>
              </Box>

              {/* Profile photo box */}
              <Box sx={{ textAlign: "center", marginTop: "10px", marginLeft: "35px", marginBottom: "-10px", border: errors.profile_img ? "1px solid red" : "1px solid black", width: "5.50cm", height: "5.50cm", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", backgroundColor: "white" }}>
                {person.profile_img && person.profile_img !== "" ? (
                  <img src={`${API_BASE_URL}/uploads/Student1by1/${person.profile_img}?t=${Date.now()}`} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <>
                    <Typography fontSize={12} color={errors.profile_img ? "error" : "textSecondary"}>No Profile Image Uploaded</Typography>
                    {errors.profile_img && <Typography fontSize={12} color="error">This field is required.</Typography>}
                  </>
                )}
              </Box>
            </Box>

            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold", mt: "-50px" }}>Person Details:</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />

            <Box display="flex" gap={2} mb={2}>
              {/* Last Name — system-locked */}
              <Box flex="1 1 20%">
                <Typography mb={1} fontWeight="medium">Last Name<span style={{ color: "red" }}> *</span></Typography>
                <TextField InputProps={{ readOnly: true, sx: { textTransform: "uppercase" } }} fullWidth size="small" name="last_name" value={(person.last_name || "").toUpperCase()} onChange={(e) => handleChange({ ...e, target: { ...e.target, value: e.target.value.toUpperCase() } })} onBlur={() => handleUpdate(person)} placeholder="Enter your Last Name" error={errors.last_name} helperText={errors.last_name ? "This field is required." : ""} />
              </Box>

              {/* First Name — system-locked */}
              <Box flex="1 1 20%">
                <Typography mb={1} fontWeight="medium">First Name<span style={{ color: "red" }}> *</span></Typography>
                <TextField fullWidth size="small" name="first_name" InputProps={{ readOnly: true, sx: { textTransform: "uppercase" } }} value={(person.first_name || "").toUpperCase()} onChange={(e) => handleChange({ ...e, target: { ...e.target, value: e.target.value.toUpperCase() } })} onBlur={() => handleUpdate(person)} placeholder="Enter your First Name" error={errors.first_name} helperText={errors.first_name ? "This field is required." : ""} />
              </Box>

              {/* Middle Name — system-locked */}
              <Box flex="1 1 20%">
                <Typography mb={1} fontWeight="medium">Middle Name</Typography>
                <TextField fullWidth size="small" name="middle_name" InputProps={{ readOnly: true, sx: { textTransform: "uppercase" } }} value={(person.middle_name || "").toUpperCase()} onChange={(e) => handleChange({ ...e, target: { ...e.target, value: e.target.value.toUpperCase() } })} onBlur={() => handleUpdate(person)} placeholder="Enter your Middle Name" />
              </Box>

              {/* Extension — admin-controlled */}
              <Box flex="1 1 20%">
                <Typography mb={1} fontWeight="medium">
                  Extension
                  {!canEdit("extension") && <LockedBadge />}
                </Typography>
                <FormControl fullWidth size="small" error={errors.extension}>
                  <InputLabel id="extension-label">Extension</InputLabel>
                  <Select labelId="extension-label" name="extension" value={person.extension || ""} label="Extension" onChange={canEdit("extension") ? handleChange : undefined} inputProps={{ readOnly: !canEdit("extension") }} onBlur={() => handleUpdate(person)}>
                    <MenuItem value=""><em>None</em></MenuItem>
                    {["Jr.", "Sr.", "I", "II", "III", "IV", "V"].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>

              {/* Nickname — admin-controlled */}
              <Box flex="1 1 20%">
                <Typography mb={1} fontWeight="medium">
                  Nickname
                  {!canEdit("nickname") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" name="nickname" value={person.nickname || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} placeholder="Enter your Nickname" InputProps={{ readOnly: !canEdit("nickname") }} sx={!canEdit("nickname") ? { backgroundColor: "#f5f5f5" } : {}} />
              </Box>
            </Box>

            <Box display="flex" gap={4} mb={2}>
              {/* Height — admin-controlled */}
              <Box display="flex" flexDirection="column" flex="0 0 28%">
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography fontWeight="medium" minWidth="75px">
                    Height:<span style={{ color: "red" }}> *</span>
                    {!canEdit("height") && <LockedBadge />}
                  </Typography>
                  <TextField size="small" type="number" name="height" value={person.height || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} placeholder="Enter your Height" error={!!errors.height} fullWidth InputProps={{ readOnly: !canEdit("height") }} sx={!canEdit("height") ? { backgroundColor: "#f5f5f5" } : {}} />
                  <Typography variant="body2">cm.</Typography>
                </Box>
                {errors.height && <Typography color="error" variant="caption" mt={0.5}>This field is required.</Typography>}
              </Box>

              {/* Weight — admin-controlled */}
              <Box display="flex" flexDirection="column" flex="0 0 28%">
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography fontWeight="medium" minWidth="85px">
                    Weight:<span style={{ color: "red" }}> *</span>
                    {!canEdit("weight") && <LockedBadge />}
                  </Typography>
                  <TextField size="small" type="number" name="weight" value={person.weight || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} placeholder="Enter your Weight" error={!!errors.weight} fullWidth InputProps={{ readOnly: !canEdit("weight") }} sx={!canEdit("weight") ? { backgroundColor: "#f5f5f5" } : {}} />
                  <Typography variant="body2">kg</Typography>
                </Box>
                {errors.weight && <Typography color="error" variant="caption" mt={0.5}>This field is required.</Typography>}
              </Box>
            </Box>

            <Box display="flex" alignItems="center" gap={2} flexWrap="nowrap" width="100%" mb={2}>
              <Typography fontWeight="medium" minWidth="180px">Learning Reference Number:<span style={{ color: "red" }}> *</span></Typography>

              {/* LRN — system-locked */}
              <TextField id="lrnNumber" name="lrnNumber" required={person.lrnNumber !== "No LRN Number"} label="Enter your LRN Number" value={person.lrnNumber === "No LRN Number" ? "" : person.lrnNumber || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} disabled={person.lrnNumber === "No LRN Number"} size="small" sx={{ width: 220 }} InputProps={{ readOnly: true }} error={errors.lrnNumber} helperText={errors.lrnNumber ? "This field is required." : ""} />

              <FormControlLabel
                control={
                  <Checkbox name="lrn_na" checked={person.lrnNumber === "No LRN Number"}
                    onChange={(e) => { const checked = e.target.checked; const updatedPerson = { ...person, lrnNumber: checked ? "No LRN Number" : "" }; setPerson(updatedPerson); setIsLrnNA(checked); }}
                    onBlur={() => handleUpdate(person)}
                  />
                }
                label="N/A" sx={{ mr: 2 }}
              />

              <Typography fontWeight="medium">Gender:<span style={{ color: "red" }}> *</span></Typography>

              {/* Gender — system-locked */}
              <TextField select size="small" label="SEX" name="gender" required value={person.gender == null ? "" : String(person.gender)} onChange={(e) => { const val = e.target.value; handleChange({ target: { name: "gender", value: val === "" ? null : parseInt(val, 10) } }); }} onBlur={() => handleUpdate(person)} error={Boolean(errors.gender)} sx={{ width: 150 }} InputProps={{ readOnly: true }}>
                <MenuItem value=""><em>Select Gender</em></MenuItem>
                <MenuItem value="0">MALE</MenuItem>
                <MenuItem value="1">FEMALE</MenuItem>
              </TextField>

              {errors.gender && <Typography color="error" variant="caption" ml={1}>This field is required.</Typography>}

              {/* PWD — admin-controlled */}
              <FormControlLabel
                control={<Checkbox checked={person.pwdMember === 1} onChange={canEdit("pwdMember") ? handlePwdCheck : undefined} disabled={!canEdit("pwdMember")} inputProps={{ "aria-label": "PWD Checkbox" }} />}
                label={<Box sx={{ display: "flex", alignItems: "center" }}>PWD {!canEdit("pwdMember") && <LockedBadge />}</Box>}
                sx={{ ml: 2 }}
              />

              {person.pwdMember === 1 && (
                <>
                  <TextField select size="small" label="PWD Type" name="pwdType" value={person.pwdType || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} required={person.pwdMember === 1} error={person.pwdMember === 1 && !!errors.pwdType} helperText={person.pwdMember === 1 && errors.pwdType ? "This field is required." : ""} sx={{ width: 220 }} InputProps={{ sx: { height: 40 }, readOnly: !canEdit("pwdMember") }} inputProps={{ style: { height: 40 } }}>
                    <MenuItem value=""><em>None</em></MenuItem>
                    {["Blindness", "Low-vision", "Leprosy Cured persons", "Hearing Impairment", "Locomotor Disability", "Dwarfism", "Intellectual Disability", "Mental Illness", "Autism Spectrum Disorder", "Cerebral Palsy", "Muscular Dystrophy", "Chronic Neurological conditions", "Specific Learning Disabilities", "Multiple Sclerosis", "Speech and Language disability", "Thalassemia", "Hemophilia", "Sickle cell disease", "Multiple Disabilities including"].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                  </TextField>
                  <TextField size="small" label="PWD ID" name="pwdId" value={person.pwdId || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} required={person.pwdMember === 1} error={person.pwdMember === 1 && !!errors.pwdId} helperText={person.pwdMember === 1 && errors.pwdId ? "This field is required." : ""} sx={{ width: 200 }} InputProps={{ sx: { height: 40 }, readOnly: !canEdit("pwdMember") }} inputProps={{ style: { height: 40 } }} />
                </>
              )}
            </Box>

            <Box display="flex" gap={2} mb={2}>
              {/* Birth Date — system-locked */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">Birth of Date<span style={{ color: "red" }}> *</span></Typography>
                <DateField fullWidth InputProps={{ readOnly: true }} size="small" name="birthOfDate" required value={person.birthOfDate || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} error={!!errors.birthOfDate} helperText={errors.birthOfDate ? "This field is required." : ""} />
              </Box>

              {/* Age — system-locked (auto-computed) */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">Age<span style={{ color: "red" }}> *</span></Typography>
                <TextField fullWidth size="small" name="age" value={person.age || ""} placeholder="Enter your Age" required onBlur={() => handleUpdate(person)} onChange={handleChange} error={!!errors.age} helperText={errors.age ? "This field is required." : ""} InputProps={{ readOnly: true }} />
              </Box>

              {/* Birth Place — system-locked */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">Birth Place<span style={{ color: "red" }}> *</span></Typography>
                <TextField fullWidth size="small" name="birthPlace" placeholder="Enter your Birth Place" value={person.birthPlace || ""} required onBlur={handleBlur} onChange={handleChange} error={!!errors.birthPlace} InputProps={{ readOnly: true }} helperText={errors.birthPlace ? "This field is required." : ""} />
              </Box>

              {/* Language — admin-controlled */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Language/Dialect Spoken<span style={{ color: "red" }}> *</span>
                  {!canEdit("languageDialectSpoken") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" name="languageDialectSpoken" placeholder="Enter your Language Spoken" value={person.languageDialectSpoken || ""} required onBlur={handleBlur} onChange={handleChange} error={!!errors.languageDialectSpoken} helperText={errors.languageDialectSpoken ? "This field is required." : ""} InputProps={{ readOnly: !canEdit("languageDialectSpoken") }} sx={!canEdit("languageDialectSpoken") ? { backgroundColor: "#f5f5f5" } : {}} />
              </Box>
            </Box>

            <Box display="flex" gap={2}>
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Citizenship<span style={{ color: "red" }}> *</span>
                </Typography>
                <FormControl
                  fullWidth
                  size="small"
                  required
                  error={!!errors.citizenship}
                >
                  <InputLabel id="citizenship-label">Citizenship</InputLabel>
                  <Select
                    labelId="citizenship-label"
                    id="citizenship"
                    name="citizenship"
                    value={person.citizenship || ""}
                    onChange={handleChange}
                    onBlur={() => handleUpdate(person)}
                    label="Citizenship"
                  >
                    <MenuItem value="">
                      <em>Select Citizenship</em>
                    </MenuItem>
                    <MenuItem value="AFGHAN">AFGHAN</MenuItem>
                    <MenuItem value="ALBANIAN">ALBANIAN</MenuItem>
                    <MenuItem value="ARAB">ARAB</MenuItem>
                    <MenuItem value="ARGENTINIAN">ARGENTINIAN</MenuItem>
                    <MenuItem value="AUSTRALIAN">AUSTRALIAN</MenuItem>
                    <MenuItem value="AUSTRIAN">AUSTRIAN</MenuItem>
                    <MenuItem value="BELGIAN">BELGIAN</MenuItem>
                    <MenuItem value="BANGLADESHI">BANGLADESHI</MenuItem>
                    <MenuItem value="BAHAMIAN">BAHAMIAN</MenuItem>
                    <MenuItem value="BHUTANESE">BHUTANESE</MenuItem>
                    <MenuItem value="BERMUDAN">BERMUDAN</MenuItem>
                    <MenuItem value="BOLIVIAN">BOLIVIAN</MenuItem>
                    <MenuItem value="BRAZILIAN">BRAZILIAN</MenuItem>
                    <MenuItem value="BRUNEI">BRUNEI</MenuItem>
                    <MenuItem value="BOTSWANIAN">BOTSWANIAN</MenuItem>
                    <MenuItem value="CANADIAN">CANADIAN</MenuItem>
                    <MenuItem value="CHILE">CHILE</MenuItem>
                    <MenuItem value="CHINESE">CHINESE</MenuItem>
                    <MenuItem value="COLOMBIAN">COLOMBIAN</MenuItem>
                    <MenuItem value="COSTA RICAN">COSTA RICAN</MenuItem>
                    <MenuItem value="CUBAN">CUBAN</MenuItem>
                    <MenuItem value="CYPRIOT">CYPRIOT</MenuItem>
                    <MenuItem value="CZECH">CZECH</MenuItem>
                    <MenuItem value="DANISH">DANISH</MenuItem>
                    <MenuItem value="DOMINICAN">DOMINICAN</MenuItem>
                    <MenuItem value="ALGERIAN">ALGERIAN</MenuItem>
                    <MenuItem value="EGYPTIAN">EGYPTIAN</MenuItem>
                    <MenuItem value="SPANISH">SPANISH</MenuItem>
                    <MenuItem value="ESTONIAN">ESTONIAN</MenuItem>
                    <MenuItem value="ETHIOPIAN">ETHIOPIAN</MenuItem>
                    <MenuItem value="FIJI">FIJI</MenuItem>
                    <MenuItem value="FILIPINO">FILIPINO</MenuItem>
                    <MenuItem value="FINISH">FINISH</MenuItem>
                    <MenuItem value="FRENCH">FRENCH</MenuItem>
                    <MenuItem value="BRITISH">BRITISH</MenuItem>
                    <MenuItem value="GERMAN">GERMAN</MenuItem>
                    <MenuItem value="GHANAIAN">GHANAIAN</MenuItem>
                    <MenuItem value="GREEK">GREEK</MenuItem>
                    <MenuItem value="GUAMANIAN">GUAMANIAN</MenuItem>
                    <MenuItem value="GUATEMALAN">GUATEMALAN</MenuItem>
                    <MenuItem value="HONG KONG">HONG KONG</MenuItem>
                    <MenuItem value="CROATIAN">CROATIAN</MenuItem>
                    <MenuItem value="HAITIAN">HAITIAN</MenuItem>
                    <MenuItem value="HUNGARIAN">HUNGARIAN</MenuItem>
                    <MenuItem value="INDONESIAN">INDONESIAN</MenuItem>
                    <MenuItem value="INDIAN">INDIAN</MenuItem>
                    <MenuItem value="IRANIAN">IRANIAN</MenuItem>
                    <MenuItem value="IRAQI">IRAQI</MenuItem>
                    <MenuItem value="IRISH">IRISH</MenuItem>
                    <MenuItem value="ICELANDER">ICELANDER</MenuItem>
                    <MenuItem value="ISRAELI">ISRAELI</MenuItem>
                    <MenuItem value="ITALIAN">ITALIAN</MenuItem>
                    <MenuItem value="JAMAICAN">JAMAICAN</MenuItem>
                    <MenuItem value="JORDANIAN">JORDANIAN</MenuItem>
                    <MenuItem value="JAPANESE">JAPANESE</MenuItem>
                    <MenuItem value="CAMBODIAN">CAMBODIAN</MenuItem>
                    <MenuItem value="KOREAN">KOREAN</MenuItem>
                    <MenuItem value="KUWAITI">KUWAITI</MenuItem>
                    <MenuItem value="KENYAN">KENYAN</MenuItem>
                    <MenuItem value="LAOTIAN">LAOTIAN</MenuItem>
                    <MenuItem value="LEBANESE">LEBANESE</MenuItem>
                    <MenuItem value="LIBYAN">LIBYAN</MenuItem>
                    <MenuItem value="LUXEMBURGER">LUXEMBURGER</MenuItem>
                    <MenuItem value="MALAYSIAN">MALAYSIAN</MenuItem>
                    <MenuItem value="MOROCCAN">MOROCCAN</MenuItem>
                    <MenuItem value="MEXICAN">MEXICAN</MenuItem>
                    <MenuItem value="BURMESE">BURMESE</MenuItem>
                    <MenuItem value="MYANMAR">MYANMAR</MenuItem>
                    <MenuItem value="NIGERIAN">NIGERIAN</MenuItem>
                    <MenuItem value="NOT INDICATED">NOT INDICATED</MenuItem>
                    <MenuItem value="DUTCH">DUTCH</MenuItem>
                    <MenuItem value="NORWEGIAN">NORWEGIAN</MenuItem>
                    <MenuItem value="NEPALI">NEPALI</MenuItem>
                    <MenuItem value="NEW ZEALANDER">NEW ZEALANDER</MenuItem>
                    <MenuItem value="OMANI">OMANI</MenuItem>
                    <MenuItem value="PAKISTANI">PAKISTANI</MenuItem>
                    <MenuItem value="PANAMANIAN">PANAMANIAN</MenuItem>
                    <MenuItem value="PERUVIAN">PERUVIAN</MenuItem>
                    <MenuItem value="PAPUAN">PAPUAN</MenuItem>
                    <MenuItem value="POLISH">POLISH</MenuItem>
                    <MenuItem value="PUERTO RICAN">PUERTO RICAN</MenuItem>
                    <MenuItem value="PORTUGUESE">PORTUGUESE</MenuItem>
                    <MenuItem value="PARAGUAYAN">PARAGUAYAN</MenuItem>
                    <MenuItem value="PALESTINIAN">PALESTINIAN</MenuItem>
                    <MenuItem value="QATARI">QATARI</MenuItem>
                    <MenuItem value="ROMANIAN">ROMANIAN</MenuItem>
                    <MenuItem value="RUSSIAN">RUSSIAN</MenuItem>
                    <MenuItem value="RWANDAN">RWANDAN</MenuItem>
                    <MenuItem value="SAUDI ARABIAN">SAUDI ARABIAN</MenuItem>
                    <MenuItem value="SUDANESE">SUDANESE</MenuItem>
                    <MenuItem value="SINGAPOREAN">SINGAPOREAN</MenuItem>
                    <MenuItem value="SRI LANKAN">SRI LANKAN</MenuItem>
                    <MenuItem value="EL SALVADORIAN">EL SALVADORIAN</MenuItem>
                    <MenuItem value="SOMALIAN">SOMALIAN</MenuItem>
                    <MenuItem value="SLOVAK">SLOVAK</MenuItem>
                    <MenuItem value="SWEDISH">SWEDISH</MenuItem>
                    <MenuItem value="SWISS">SWISS</MenuItem>
                    <MenuItem value="SYRIAN">SYRIAN</MenuItem>
                    <MenuItem value="THAI">THAI</MenuItem>
                    <MenuItem value="TRINIDAD AND TOBAGO">
                      TRINIDAD AND TOBAGO
                    </MenuItem>
                    <MenuItem value="TUNISIAN">TUNISIAN</MenuItem>
                    <MenuItem value="TURKISH">TURKISH</MenuItem>
                    <MenuItem value="TAIWANESE">TAIWANESE</MenuItem>
                    <MenuItem value="UKRAINIAN">UKRAINIAN</MenuItem>
                    <MenuItem value="URUGUYAN">URUGUYAN</MenuItem>
                    <MenuItem value="UNITED STATES">UNITED STATES</MenuItem>
                    <MenuItem value="VENEZUELAN">VENEZUELAN</MenuItem>
                    <MenuItem value="VIRGIN ISLANDS">VIRGIN ISLANDS</MenuItem>
                    <MenuItem value="VIETNAMESE">VIETNAMESE</MenuItem>
                    <MenuItem value="YEMENI">YEMENI</MenuItem>
                    <MenuItem value="YUGOSLAVIAN">YUGOSLAVIAN</MenuItem>
                    <MenuItem value="SOUTH AFRICAN">SOUTH AFRICAN</MenuItem>
                    <MenuItem value="ZAIREAN">ZAIREAN</MenuItem>
                    <MenuItem value="ZIMBABWEAN">ZIMBABWEAN</MenuItem>
                    <MenuItem value="Others">Others</MenuItem>
                  </Select>
                  {errors.citizenship && (
                    <FormHelperText>This field is required.</FormHelperText>
                  )}
                </FormControl>
              </Box>

              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Religion<span style={{ color: "red" }}> *</span>
                </Typography>
                <FormControl
                  fullWidth
                  size="small"
                  required
                  error={!!errors.religion}
                >
                  <InputLabel id="religion-label">Religion</InputLabel>
                  <Select
                    labelId="religion-label"
                    id="religion"
                    name="religion"
                    value={person.religion || ""}
                    onChange={handleChange}
                    onBlur={() => handleUpdate(person)}
                    label="Religion"
                  >
                    <MenuItem value="">
                      <em>Select Religion</em>
                    </MenuItem>
                    <MenuItem value="Jehovah's Witness">
                      Jehovah's Witness
                    </MenuItem>
                    <MenuItem value="Buddist">Buddist</MenuItem>
                    <MenuItem value="Catholic">Catholic</MenuItem>
                    <MenuItem value="Dating Daan">Dating Daan</MenuItem>
                    <MenuItem value="Pagano">Pagano</MenuItem>
                    <MenuItem value="Atheist">Atheist</MenuItem>
                    <MenuItem value="Born Again">Born Again</MenuItem>
                    <MenuItem value="Adventis">Adventis</MenuItem>
                    <MenuItem value="Baptist">Baptist</MenuItem>
                    <MenuItem value="Mormons">Mormons</MenuItem>
                    <MenuItem value="Free Methodist">Free Methodist</MenuItem>
                    <MenuItem value="Christian">Christian</MenuItem>
                    <MenuItem value="Protestant">Protestant</MenuItem>
                    <MenuItem value="Aglipay">Aglipay</MenuItem>
                    <MenuItem value="Islam">Islam</MenuItem>
                    <MenuItem value="LDS">LDS</MenuItem>
                    <MenuItem value="Seventh Day Adventist">
                      Seventh Day Adventist
                    </MenuItem>
                    <MenuItem value="Iglesia Ni Cristo">
                      Iglesia Ni Cristo
                    </MenuItem>
                    <MenuItem value="UCCP">UCCP</MenuItem>
                    <MenuItem value="PMCC">PMCC</MenuItem>
                    <MenuItem value="Baha'i Faith">Baha'i Faith</MenuItem>
                    <MenuItem value="None">None</MenuItem>
                    <MenuItem value="Others">Others</MenuItem>
                  </Select>
                  {errors.religion && (
                    <FormHelperText>This field is required.</FormHelperText>
                  )}
                </FormControl>
              </Box>

              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Civil Status<span style={{ color: "red" }}> *</span>
                </Typography>
                <FormControl
                  fullWidth
                  size="small"
                  required
                  error={!!errors.civilStatus}
                >
                  <InputLabel id="civil-status-label">Civil Status</InputLabel>
                  <Select
                    labelId="civil-status-label"
                    id="civilStatus"
                    name="civilStatus"
                    value={person.civilStatus || ""}
                    onChange={handleChange}
                    onBlur={() => handleUpdate(person)}
                    label="Civil Status"
                  >
                    <MenuItem value="">
                      <em> Select Status </em>
                    </MenuItem>
                    <MenuItem value="Single">Single</MenuItem>
                    <MenuItem value="Married">Married</MenuItem>
                    <MenuItem value="Legally Seperated">
                      Legally Seperated
                    </MenuItem>
                    <MenuItem value="Widowed">Widowed</MenuItem>
                    <MenuItem value="Solo Parent">Solo Parent</MenuItem>
                  </Select>
                  {errors.civilStatus && (
                    <FormHelperText>This field is required.</FormHelperText>
                  )}
                </FormControl>
              </Box>

              {person.civilStatus === "Married" && (
                <Box flex={1}>
                  <Typography mb={1} fontWeight="medium">
                    Spouse<span style={{ color: "red" }}> *</span>
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    name="spouse"
                    placeholder="Enter Spouse Name"
                    value={person.spouse || ""}
                    onChange={handleChange}
                    onBlur={() => handleUpdate(person)}
                    error={!!errors.spouse}
                    helperText={errors.spouse ? "This field is required." : ""}
                  />
                </Box>
              )}

              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Tribe/Ethnic Group<span style={{ color: "red" }}> *</span>
                </Typography>
                <FormControl
                  fullWidth
                  size="small"
                  required
                  error={!!errors.tribeEthnicGroup}
                >
                  <InputLabel id="tribe-label">Tribe/Ethnic Group</InputLabel>
                  <Select
                    labelId="tribe-label"
                    id="tribeEthnicGroup"
                    name="tribeEthnicGroup"
                    value={person.tribeEthnicGroup || ""}
                    onChange={handleChange}
                    onBlur={() => handleUpdate(person)}
                    label="Tribe/Ethnic Group"
                  >
                    <MenuItem value="">
                      <em>Select Tribe/Ethnic Group</em>
                    </MenuItem>
                    <MenuItem value="Agta">Agta</MenuItem>
                    <MenuItem value="Agutaynen">Agutaynen</MenuItem>
                    <MenuItem value="Aklanon">Aklanon</MenuItem>
                    <MenuItem value="Alangan">Alangan</MenuItem>
                    <MenuItem value="Alta">Alta</MenuItem>
                    <MenuItem value="Amersian">Amersian</MenuItem>
                    <MenuItem value="Ati">Ati</MenuItem>
                    <MenuItem value="Atta">Atta</MenuItem>
                    <MenuItem value="Ayta">Ayta</MenuItem>
                    <MenuItem value="B'laan">B'laan</MenuItem>
                    <MenuItem value="Badjao">Badjao</MenuItem>
                    <MenuItem value="Bagobo">Bagobo</MenuItem>
                    <MenuItem value="Balangao">Balangao</MenuItem>
                    <MenuItem value="Balangingi">Balangingi</MenuItem>
                    <MenuItem value="Bangon">Bangon</MenuItem>
                    <MenuItem value="Bantoanon">Bantoanon</MenuItem>
                    <MenuItem value="Banwaon">Banwaon</MenuItem>
                    <MenuItem value="Batak">Batak</MenuItem>
                    <MenuItem value="Bicolano">Bicolano</MenuItem>
                    <MenuItem value="Binukid">Binukid</MenuItem>
                    <MenuItem value="Bohalano">Bohalano</MenuItem>
                    <MenuItem value="Bolinao">Bolinao</MenuItem>
                    <MenuItem value="Bontoc">Bontoc</MenuItem>
                    <MenuItem value="Buhid">Buhid</MenuItem>
                    <MenuItem value="Butuanon">Butuanon</MenuItem>
                    <MenuItem value="Cagyanen">Cagyanen</MenuItem>
                    <MenuItem value="Caray-a">Caray-a</MenuItem>
                    <MenuItem value="Cebuano">Cebuano</MenuItem>
                    <MenuItem value="Cuyunon">Cuyunon</MenuItem>
                    <MenuItem value="Dasen">Dasen</MenuItem>
                    <MenuItem value="Ilocano">Ilocano</MenuItem>
                    <MenuItem value="Ilonggo">Ilonggo</MenuItem>
                    <MenuItem value="Jamah Mapun">Jamah Mapun</MenuItem>
                    <MenuItem value="Malay">Malay</MenuItem>
                    <MenuItem value="Mangyan">Mangyan</MenuItem>
                    <MenuItem value="Maranao">Maranao</MenuItem>
                    <MenuItem value="Molbogs">Molbogs</MenuItem>
                    <MenuItem value="Palawano">Palawano</MenuItem>
                    <MenuItem value="Panimusan">Panimusan</MenuItem>
                    <MenuItem value="Tagbanua">Tagbanua</MenuItem>
                    <MenuItem value="Tao't">Tao't</MenuItem>
                    <MenuItem value="Bato">Bato</MenuItem>
                    <MenuItem value="Tausug">Tausug</MenuItem>
                    <MenuItem value="Waray">Waray</MenuItem>
                    <MenuItem value="None">None</MenuItem>
                    <MenuItem value="Others">Others</MenuItem>
                  </Select>
                  {errors.tribeEthnicGroup && (
                    <FormHelperText>This field is required.</FormHelperText>
                  )}
                </FormControl>
              </Box>
            </Box>


            <br />
            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Contact Information:</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />

            <Box display="flex" gap={2} mb={2}>
              {/* Contact Number — admin-controlled */}
              <Box flex={1} display="flex" alignItems="center" gap={2}>
                <Typography sx={{ width: 180 }} fontWeight="medium">
                  Contact Number:<span style={{ color: "red" }}> *</span>
                  {!canEdit("cellphoneNumber") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" name="cellphoneNumber" placeholder="9XXXXXXXXX" value={person.cellphoneNumber || ""} onBlur={() => handleUpdate(person)} onChange={(e) => { const onlyNumbers = e.target.value.replace(/\D/g, ""); handleChange({ target: { name: "cellphoneNumber", value: onlyNumbers } }); }} error={!!errors.cellphoneNumber} helperText={errors.cellphoneNumber && "This field is required."} InputProps={{ readOnly: !canEdit("cellphoneNumber"), startAdornment: <Typography sx={{ mr: 1, fontWeight: "bold" }}>+63</Typography> }} sx={!canEdit("cellphoneNumber") ? { backgroundColor: "#f5f5f5" } : {}} />
              </Box>

              {/* Email — always system-locked */}
              <Box flex={1} display="flex" alignItems="center" gap={2}>
                <Typography sx={{ width: 180 }} fontWeight="medium">Email Address:<span style={{ color: "red" }}> *</span></Typography>
                <TextField fullWidth size="small" name="emailAddress" required value={person.emailAddress || ""} placeholder="Your registered email" InputProps={{ readOnly: true }} sx={{ backgroundColor: "#f0f0f0" }} />
              </Box>
            </Box>

            <Box display="flex" gap={2} mb={2}>
              {/* Facebook Account — admin-controlled */}
              <Box flex={1} display="flex" alignItems="center" gap={2}>
                <Typography sx={{ width: 180 }} fontWeight="medium">
                  Facebook Account:<span style={{ color: "red" }}> *</span>
                  {!canEdit("facebook_account") && <LockedBadge />}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  name="facebook_account"
                  placeholder="Enter Facebook Profile Name/Link"
                  value={person.facebook_account || ""}
                  onChange={canEdit("facebook_account") ? handleChange : undefined}
                  onBlur={() => handleUpdate(person)}
                  InputProps={{ readOnly: !canEdit("facebook_account") }}
                  sx={!canEdit("facebook_account") ? { backgroundColor: "#f5f5f5" } : {}}
                  error={!!errors.facebook_account}
                  helperText={errors.facebook_account ? "This field is required." : ""}
                />
              </Box>
            </Box>

            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Present Address:</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />

            <Box
              sx={{
                display: "flex",
                alignItems: "center", // vertically center
                justifyContent: "center", // horizontally center
                backgroundColor: "#FFF4E5",
                border: "1px solid #FFA726",
                borderRadius: 2,
                p: 2,
                height: "50px",
                mb: 2,
                textAlign: "center", // ensures multiline text is centered
              }}
            >
              <WarningAmberIcon sx={{ color: "#FF9800", mr: 1 }} />
              <Typography fontWeight="medium" color="#BF360C">
                NOTICE: Fill up first the{" "}
                <strong>
                  REGION{" "}
                  <span style={{ fontSize: "1.2em", margin: "0 15px" }}>➔</span>
                  PERMANENT PROVINCE{" "}
                  <span style={{ fontSize: "1.2em", margin: "0 15px" }}>➔</span>
                  PERMANENT MUNICIPALITY{" "}
                  <span style={{ fontSize: "1.2em", margin: "0 15px" }}>➔</span>
                  PERMANENT BARANGAY
                </strong>
              </Typography>
            </Box>

            <Box display="flex" gap={2} mb={2}>
              {/* Present Street — system-locked */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">Present Street<span style={{ color: "red" }}> *</span></Typography>
                <TextField InputProps={{ readOnly: true }} fullWidth size="small" name="presentStreet" value={person.presentStreet || ""} onBlur={() => handleUpdate(person)} placeholder="Enter your Present Street" onChange={handleChange} error={!!errors.presentStreet} helperText={errors.presentStreet && "This field is required."} />
              </Box>

              {/* Zip Code — admin-controlled */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Zip Code<span style={{ color: "red" }}> *</span>
                  {!canEdit("presentZipCode") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" name="presentZipCode" placeholder="Enter your Zip Code" type="number" value={person.presentZipCode || ""} onBlur={() => handleUpdate(person)} onChange={handleChange} error={!!errors.presentZipCode} helperText={errors.presentZipCode && "This field is required."} InputProps={{ readOnly: !canEdit("presentZipCode") }} sx={!canEdit("presentZipCode") ? { backgroundColor: "#f5f5f5" } : {}} />
              </Box>
            </Box>

            <Box display="flex" gap={2} mb={2}>
              {/* Present Region — admin-controlled */}
              <FormControl fullWidth size="small" required error={!!errors.presentRegion}>
                <Typography mb={1} fontWeight="medium">
                  Region<span style={{ color: "red" }}> *</span>
                  {!canEdit("presentRegion") && <LockedBadge />}
                </Typography>
                <Select name="presentRegion" displayEmpty value={person.presentRegion || ""} onBlur={() => handleUpdate(person)} onChange={canEdit("presentRegion") ? (e) => { handleChange(e); setSelectedRegion(e.target.value); setSelectedProvince(""); setSelectedCity(""); setSelectedBarangay(""); setProvinceList([]); setCityList([]); setBarangayList([]); autoSave(); } : undefined} inputProps={{ readOnly: !canEdit("presentRegion") }}>
                  <MenuItem value=""><em>Select Region</em></MenuItem>
                  {regionList.map((region) => (<MenuItem key={region.region_code} value={region.region_name}>{region.region_name}</MenuItem>))}
                </Select>
                {errors.presentRegion && <FormHelperText>This field is required.</FormHelperText>}
              </FormControl>

              {/* Present Province — admin-controlled */}
              <FormControl fullWidth size="small" required error={!!errors.presentProvince}>
                <Typography mb={1} fontWeight="medium">
                  Province<span style={{ color: "red" }}> *</span>
                  {!canEdit("presentProvince") && <LockedBadge />}
                </Typography>
                <Select name="presentProvince" displayEmpty value={person.presentProvince || ""} onBlur={() => handleUpdate(person)} onChange={canEdit("presentProvince") ? (e) => { handleChange(e); setSelectedProvince(e.target.value); setSelectedCity(""); setSelectedBarangay(""); setCityList([]); setBarangayList([]); autoSave(); } : undefined} inputProps={{ readOnly: !canEdit("presentProvince") }} disabled={!person.presentRegion}>
                  <MenuItem value=""><em>Select Province</em></MenuItem>
                  {provinceList.map((province) => (<MenuItem key={province.province_code} value={province.province_name}>{province.province_name}</MenuItem>))}
                </Select>
                {errors.presentProvince && <FormHelperText>This field is required.</FormHelperText>}
              </FormControl>
            </Box>

            <Box display="flex" gap={2} mb={2}>
              {/* Present Municipality — admin-controlled */}
              <FormControl fullWidth size="small" required error={!!errors.presentMunicipality}>
                <Typography mb={1} fontWeight="medium">
                  Municipality<span style={{ color: "red" }}> *</span>
                  {!canEdit("presentMunicipality") && <LockedBadge />}
                </Typography>
                <Select name="presentMunicipality" displayEmpty value={person.presentMunicipality || ""} onBlur={() => handleUpdate(person)} onChange={canEdit("presentMunicipality") ? (e) => { handleChange(e); setSelectedCity(e.target.value); setSelectedBarangay(""); setBarangayList([]); autoSave(); } : undefined} inputProps={{ readOnly: !canEdit("presentMunicipality") }} disabled={!person.presentProvince}>
                  <MenuItem value=""><em>Select Municipality</em></MenuItem>
                  {cityList.map((city) => (<MenuItem key={city.city_code} value={city.city_name}>{city.city_name}</MenuItem>))}
                </Select>
                {errors.presentMunicipality && <FormHelperText>This field is required.</FormHelperText>}
              </FormControl>

              {/* Present Barangay — admin-controlled */}
              <FormControl fullWidth size="small" required error={!!errors.presentBarangay}>
                <Typography mb={1} fontWeight="medium">
                  Barangay<span style={{ color: "red" }}> *</span>
                  {!canEdit("presentBarangay") && <LockedBadge />}
                </Typography>
                <Select name="presentBarangay" displayEmpty value={person.presentBarangay || ""} onBlur={() => handleUpdate(person)} onChange={canEdit("presentBarangay") ? (e) => { handleChange(e); setSelectedBarangay(e.target.value); autoSave(); } : undefined} inputProps={{ readOnly: !canEdit("presentBarangay") }} disabled={!person.presentMunicipality}>
                  <MenuItem value=""><em>Select Barangay</em></MenuItem>
                  {barangayList.map((brgy) => (<MenuItem key={brgy.brgy_code} value={brgy.brgy_name}>{brgy.brgy_name}</MenuItem>))}
                </Select>
                {errors.presentBarangay && <FormHelperText>This field is required.</FormHelperText>}
              </FormControl>
            </Box>

            <Box mb={2}>
              <FormControlLabel control={<Checkbox name="presentDswdChecked" checked={person.presentDswdChecked === 1} onChange={handleChange} />} label="I have a Present DSWD Household Number" />
            </Box>

            {person.presentDswdChecked === 1 && (
              <Box mb={2}>
                <Typography mb={1} fontWeight="medium">
                  Present DSWD Household Number <span style={{ color: "red" }}>*</span>
                  {!canEdit("presentDswdHouseholdNumber") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" name="presentDswdHouseholdNumber" value={person.presentDswdHouseholdNumber || ""} onBlur={() => handleUpdate(person)} onChange={handleChange} placeholder="Enter your Present DSWD Household Number" error={!!errors.presentDswdHouseholdNumber} helperText={errors.presentDswdHouseholdNumber && "This field is required."} InputProps={{ readOnly: !canEdit("presentDswdHouseholdNumber") }} sx={!canEdit("presentDswdHouseholdNumber") ? { backgroundColor: "#f5f5f5" } : {}} />
              </Box>
            )}

            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Permanent Address:</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} /><br />

            <FormControlLabel
              control={
                <Checkbox name="sameAsPresentAddress" checked={person.sameAsPresentAddress === 1}
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
                  onBlur={() => handleUpdate(person)}
                />
              }
              label="Same as Present Address"
            />

            <Box display="flex" gap={2} mb={2}>
              {/* Permanent Street — system-locked */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">Permanent Street<span style={{ color: "red" }}> *</span></Typography>
                <TextField InputProps={{ readOnly: true }} fullWidth size="small" name="permanentStreet" placeholder="Enter your Permanent Street" value={person.permanentStreet || ""} onBlur={() => handleUpdate(person)} onChange={handleChange} error={!!errors.permanentStreet} helperText={errors.permanentStreet && "This field is required."} />
              </Box>

              {/* Permanent Zip — admin-controlled */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Zip Code<span style={{ color: "red" }}> *</span>
                  {!canEdit("permanentZipCode") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" name="permanentZipCode" type="number" placeholder="Enter your Permanent Zip Code" value={person.permanentZipCode || ""} onBlur={() => handleUpdate(person)} onChange={handleChange} error={!!errors.permanentZipCode} helperText={errors.permanentZipCode && "This field is required."} InputProps={{ readOnly: !canEdit("permanentZipCode") }} sx={!canEdit("permanentZipCode") ? { backgroundColor: "#f5f5f5" } : {}} />
              </Box>
            </Box>

            <Box display="flex" gap={2} mb={2}>
              {/* Permanent Region — admin-controlled */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Permanent Region<span style={{ color: "red" }}> *</span>
                  {!canEdit("permanentRegion") && <LockedBadge />}
                </Typography>
                <FormControl fullWidth size="small" required error={!!errors.permanentRegion}>
                  <Select name="permanentRegion" displayEmpty value={person.permanentRegion || ""} onBlur={() => handleUpdate(person)} onChange={canEdit("permanentRegion") ? (e) => { handleChange(e); setPermanentRegion(e.target.value); setPermanentProvince(""); setPermanentCity(""); setPermanentBarangay(""); setPermanentProvinceList([]); setPermanentCityList([]); setPermanentBarangayList([]); autoSave(); } : undefined} inputProps={{ readOnly: !canEdit("permanentRegion") }}>
                    <MenuItem value=""><em>Select Region</em></MenuItem>
                    {permanentRegionList.map((region) => (<MenuItem key={region.region_code} value={region.region_name}>{region.region_name}</MenuItem>))}
                  </Select>
                  {errors.permanentRegion && <FormHelperText error>This field is required.</FormHelperText>}
                </FormControl>
              </Box>

              {/* Permanent Province — admin-controlled */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Permanent Province<span style={{ color: "red" }}> *</span>
                  {!canEdit("permanentProvince") && <LockedBadge />}
                </Typography>
                <FormControl fullWidth size="small" required error={!!errors.permanentProvince}>
                  <Select name="permanentProvince" displayEmpty value={person.permanentProvince || ""} onBlur={() => handleUpdate(person)} onChange={canEdit("permanentProvince") ? (e) => { handleChange(e); setPermanentProvince(e.target.value); setPermanentCity(""); setPermanentBarangay(""); setPermanentCityList([]); setPermanentBarangayList([]); autoSave(); } : undefined} inputProps={{ readOnly: !canEdit("permanentProvince") }} disabled={!person.permanentRegion}>
                    <MenuItem value=""><em>Select Province</em></MenuItem>
                    {permanentProvinceList.map((province) => (<MenuItem key={province.province_code} value={province.province_name}>{province.province_name}</MenuItem>))}
                  </Select>
                  {errors.permanentProvince && <FormHelperText error>This field is required.</FormHelperText>}
                </FormControl>
              </Box>
            </Box>

            <Box display="flex" gap={2} mb={2}>
              {/* Permanent Municipality — admin-controlled */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Permanent Municipality<span style={{ color: "red" }}> *</span>
                  {!canEdit("permanentMunicipality") && <LockedBadge />}
                </Typography>
                <FormControl fullWidth size="small" required error={!!errors.permanentMunicipality}>
                  <Select name="permanentMunicipality" displayEmpty value={person.permanentMunicipality || ""} onBlur={() => handleUpdate(person)} onChange={canEdit("permanentMunicipality") ? (e) => { handleChange(e); setPermanentCity(e.target.value); setPermanentBarangay(""); setPermanentBarangayList([]); autoSave(); } : undefined} inputProps={{ readOnly: !canEdit("permanentMunicipality") }} disabled={!person.permanentProvince}>
                    <MenuItem value=""><em>Select Municipality</em></MenuItem>
                    {permanentCityList.map((city) => (<MenuItem key={city.city_code} value={city.city_name}>{city.city_name}</MenuItem>))}
                  </Select>
                  {errors.permanentMunicipality && <FormHelperText error>This field is required.</FormHelperText>}
                </FormControl>
              </Box>

              {/* Permanent Barangay — admin-controlled */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Permanent Barangay<span style={{ color: "red" }}> *</span>
                  {!canEdit("permanentBarangay") && <LockedBadge />}
                </Typography>
                <FormControl fullWidth size="small" required error={!!errors.permanentBarangay}>
                  <Select name="permanentBarangay" displayEmpty value={person.permanentBarangay || ""} onBlur={() => handleUpdate(person)} onChange={canEdit("permanentBarangay") ? (e) => { handleChange(e); setPermanentBarangay(e.target.value); autoSave(); } : undefined} inputProps={{ readOnly: !canEdit("permanentBarangay") }} disabled={!person.permanentMunicipality}>
                    <MenuItem value=""><em>Select Barangay</em></MenuItem>
                    {permanentBarangayList.map((brgy) => (<MenuItem key={brgy.brgy_code} value={brgy.brgy_name}>{brgy.brgy_name}</MenuItem>))}
                  </Select>
                  {errors.permanentBarangay && <FormHelperText error>This field is required.</FormHelperText>}
                </FormControl>
              </Box>
            </Box>

            <Box mb={2}>
              <FormControlLabel control={<Checkbox name="permanentDswdChecked" checked={person.permanentDswdChecked === 1} onChange={handleChange} />} label="I have a Permanent DSWD Household Number" />
            </Box>

            {person.permanentDswdChecked === 1 && (
              <Box mb={2}>
                <Typography mb={1} fontWeight="medium">
                  Permanent DSWD Household Number <span style={{ color: "red" }}>*</span>
                  {!canEdit("permanentDswdHouseholdNumber") && <LockedBadge />}
                </Typography>
                <TextField fullWidth size="small" name="permanentDswdHouseholdNumber" value={person.permanentDswdHouseholdNumber || ""} onBlur={() => handleUpdate(person)} onChange={handleChange} placeholder="Enter your Permanent DSWD Household Number" error={!!errors.permanentDswdHouseholdNumber} helperText={errors.permanentDswdHouseholdNumber && "This field is required."} InputProps={{ readOnly: !canEdit("permanentDswdHouseholdNumber") }} sx={!canEdit("permanentDswdHouseholdNumber") ? { backgroundColor: "#f5f5f5" } : {}} />
              </Box>
            )}

            <Modal open={open} onClose={handleClose}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100vh",
                }}
              >
                <Box
                  sx={{
                    position: "relative",
                    width: 900,
                    maxWidth: "95vw",
                    bgcolor: "background.paper",
                    borderRadius: 3,
                    boxShadow: 24,
                    maxHeight: "90vh",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Header — matches the DialogTitle style from your email modal */}
                  <Box
                    sx={{
                      bgcolor: headerColor || "#1976d2",
                      color: "white",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      py: 2,
                      px: 3,
                    }}
                  >
                    <Typography variant="h6" fontWeight="bold">
                      Upload Your Photo
                    </Typography>
                    <IconButton
                      onClick={handleClose}
                      sx={{
                        color: "white",
                        border: "2px solid rgba(255,255,255,0.6)",
                        borderRadius: "50%",
                        width: 40,
                        height: 40,
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

                  {/* Body — dividers style like DialogContent dividers */}
                  <Box
                    sx={{
                      p: 3,
                      overflowY: "auto",
                      borderTop: "1px solid #e0e0e0",
                      borderBottom: "1px solid #e0e0e0",
                    }}
                  >
                    <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
                      {/* LEFT SIDE — Sample/Reference Photo */}
                      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                          ✅ Sample Format (Follow this exactly)
                        </Typography>

                        <Box
                          component="img"
                          src={FormalExample}
                          alt="Formal Photo Example"
                          sx={{
                            width: "100%",
                            maxWidth: 420,
                            height: 260,
                            mx: "auto",
                            border: `1px solid ${borderColor}`,
                            borderRadius: 2,
                            backgroundColor: "#fff",
                          }}
                        />

                        <Box
                          sx={{
                            border: "2px dashed #ccc",
                            p: 2,
                            borderRadius: 2,
                            backgroundColor: "#f9f9f9",
                          }}
                        >
                          <Typography variant="body1" fontWeight="bold" mb={1}>
                            Guidelines:
                          </Typography>
                          <Box sx={{ ml: 1, fontSize: "14px" }}>
                            - Size: 2" x 2"
                            <br />
                            - Color: Your photo must be in colored.
                            <br />
                            - Background: White.
                            <br />
                            - Head size and position: Look directly into the camera at a
                            straight angle, face centered.
                            <br />
                            - File types: JPEG, JPG, PNG
                            <br />
                            - Attire must be formal.
                            <br />
                            - Required File Size: 2mb
                          </Box>
                        </Box>
                      </Box>

                      {/* RIGHT SIDE — Upload area */}
                      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                          📤 Your Photo
                        </Typography>

                        {/* Preview */}
                        {(preview || person.profile_img) && (
                          <Box sx={{ display: "flex", justifyContent: "center", position: "relative" }}>
                            <Box
                              component="img"
                              src={
                                preview
                                  ? preview
                                  : `${API_BASE_URL}/uploads/Student1by1/${person.profile_img}`
                              }
                              alt="Preview"
                              sx={{
                                width: "192px",
                                height: "192px",
                                objectFit: "cover",
                                border: `1px solid ${borderColor}`,
                                borderRadius: 2,
                              }}
                            />

                            <Button
                              size="small"
                              onClick={async () => {
                                setSelectedFile(null);
                                setPreview(null);

                                const updatedPerson = { ...person, profile_img: "" };
                                setPerson(updatedPerson);
                                await handleUpdate(updatedPerson);

                                setSnackbar({
                                  open: true,
                                  message: "Image removed successfully.",
                                  severity: "info",
                                });
                              }}
                              sx={{
                                position: "absolute",
                                top: -8,
                                right: "calc(50% - 103px)",
                                minWidth: 0,
                                width: 28,
                                height: 28,
                                fontSize: "18px",
                                p: 0,
                                color: "#fff",
                                bgcolor: "#d32f2f",
                                borderRadius: "50%",
                                "&:hover": { bgcolor: "#b71c1c" },
                              }}
                            >
                              ×
                            </Button>
                          </Box>
                        )}

                        {!preview && !person.profile_img && (
                          <Box
                            sx={{
                              height: 192,
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
                            No photo selected yet — match the sample on the left.
                          </Box>
                        )}

                        <Typography
                          sx={{ fontSize: "16px", color: mainButtonColor, fontWeight: "bold" }}
                        >
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
                            padding: "10px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                          }}
                        />

                        <Typography variant="caption" color="text.secondary">
                          Click the × on your preview to remove it, choose a new file, then
                          press Upload.
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Footer — matches DialogActions */}
                  <Box sx={{ p: 2, display: "flex", justifyContent: "space-between" }}>
                    <Button onClick={handleClose} color="error" variant="outlined">
                      Cancel
                    </Button>

                    <Button
                      onClick={handleUpload}
                      variant="contained"
                      color="success"
                      size="small"
                      sx={{ minWidth: "140px", height: "40px" }}
                    >
                      Upload
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Modal>




            <Box display="flex" justifyContent="right" mt={4}>
              {canEdit("profile_img") && (
                <Button variant="contained" onClick={handleOpen} sx={{ backgroundColor: mainButtonColor, border: `1px solid ${borderColor}`, color: "#fff", marginRight: "5px", "&:hover": { backgroundColor: "#000000" }, display: "flex", alignItems: "center" }}>
                  <PhotoCameraIcon sx={{ marginRight: "8px" }} />
                  Upload Photo <br /> Student Picture
                </Button>
              )}
              <Button
                variant="contained"
                onClick={async () => {
                  if (isFormValid()) {
                    await handleUpdate(person);
                    setSnackbar({ open: true, message: "Your record has been saved successfully!", severity: "success" });
                    setTimeout(() => { navigate("/student_family_background"); }, 1200);
                  } else {
                    setSnackbar({ open: true, message: "Please complete all required fields before proceeding.", severity: "error" });
                  }
                }}
                endIcon={<ArrowForwardIcon sx={{ color: "#fff", transition: "color 0.3s" }} />}
                sx={{ backgroundColor: mainButtonColor, border: `1px solid ${borderColor}`, color: "#fff", "&:hover": { backgroundColor: "#000000", color: "#fff" } }}
              >
                Next Step
              </Button>
            </Box>

            <Snackbar open={snackbar.open} autoHideDuration={1000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
              <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>{snackbar.message}</Alert>
            </Snackbar>
          </Container>
        </form>
      </Container>
    </Box>
  );
};

export default StudentDashboard1;
