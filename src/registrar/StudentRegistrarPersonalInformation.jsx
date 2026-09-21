import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";

import axios from "axios";
import {
  Button,
  Box,
  TextField,
  Container,
  Typography,
  Card,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  FormHelperText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Modal,
  FormControlLabel,
  Checkbox,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CloseIcon from "@mui/icons-material/Close";
import ErrorIcon from "@mui/icons-material/Error";
import regions from "../data/region.json";
import provinces from "../data/province.json";
import cities from "../data/city.json";
import barangays from "../data/barangay.json";
import { useNavigate } from "react-router-dom";
import Search from "@mui/icons-material/Search";
import { motion } from "framer-motion";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { FaFileExcel } from "react-icons/fa";
import API_BASE_URL from "../apiConfig";
import { postAuditEvent } from "../utils/auditEvents";
import { getLoginMacPayload } from "../utils/userMacAddress";
import useAuditMac from "../utils/useAuditMac";
import PrintingHistoryDialog, {
  PRINTING_STUDENT_ACTION,
} from "../components/PrintingHistoryDialog";
import ExamPermit from "../applicant/ExamPermit";
import { Snackbar, Alert } from "@mui/material";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import RegistrarEnrollmentTabs from "../components/RegistrarEnrollmentTabs";
import SearchIcon from "@mui/icons-material/Search";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DateField from "../components/DateField";
import FormalExample from "../assets/formalexample.png";
import StudentECATApplicationForm from "../student/StudentECATApplicationForm";
import StudentPersonalDataForm from "../student/StudentPersonalDataForm";
import StudentOfficeOfTheRegistrar from "../student/StudentOfficeOfTheRegistrar";
import StudentServicesSurvey from "../student/StudentServicesSurvey";
import useRegistrarScopeRevision from "../hooks/useRegistrarScopeRevision";
import {
  getRegistrarCurriculumId,
  isRegistrarProgramSelectionLocked,
  restrictToRegistrarCurriculum,
} from "../utils/registrarCurriculumRestriction";
import SaveIcon from "@mui/icons-material/Save";

const cleanStudentValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const fallback =
      value.label ??
      value.name ??
      value.description ??
      value.program_description ??
      value.program_code ??
      "";
    if (fallback === value) return "";
    return cleanStudentValue(fallback);
  }
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const formatStudentSuggestionName = (student) =>
  [
    cleanStudentValue(student?.last_name),
    cleanStudentValue(student?.first_name),
    cleanStudentValue(student?.middle_name),
    cleanStudentValue(student?.extension),
  ]
    .filter(Boolean)
    .join(" ");

const getStudentSuggestionText = (student) =>
  [
    student?.student_number,
    student?.first_name,
    student?.middle_name,
    student?.last_name,
    student?.extension,
    student?.emailAddress,
    student?.program_code,
    student?.program_description,
  ]
    .map(cleanStudentValue)
    .join(" ")
    .toLowerCase();

const getStudentSuggestionValue = (student) =>
  cleanStudentValue(student?.student_number) ||
  formatStudentSuggestionName(student) ||
  cleanStudentValue(student?.emailAddress);

const StudentRegistrarPersonalInformation = () => {
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

    // 🏷️ School Info
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    // ✅ Branches (JSON stored in DB)
    setBranches(settings.branches || []);
  }, [settings]);

  const getBranchLabel = (branchId) => {
    const branch = branches.find(
      (item) => String(item.id) === String(branchId),
    );
    return branch?.branch || "—";
  };

  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const navigate = useNavigate();
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [person, setPerson] = useState({
    student_number: "",
    profile_img: "",
    campus: "",
    academicProgram: "",
    classifiedAs: "",
    applyingAs: "",
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
    nolrnNumber: "",
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
    presentDswdHouseholdNumber: "",
    sameAsPresentAddress: "",
    permanentStreet: "",
    permanentBarangay: "",
    permanentZipCode: "",
    permanentRegion: "",
    permanentProvince: "",
    permanentMunicipality: "",
    permanentDswdHouseholdNumber: "",
  });

  const [yearLevelOptions, setYearLevelOptions] = useState([]);

  useEffect(() => {
    const fetchYearLevels = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/year-levels`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        setYearLevelOptions(res.data);
      } catch (err) {
        console.error("Error fetching year levels:", err);
      }
    };

    fetchYearLevels();
  }, []);

  const getYearLevelSelectValue = () => {
    const current = person?.yearLevel;
    if (current === null || current === undefined || current === "") return "";

    const currentText = String(current).trim();
    const byId = yearLevelOptions.find(
      (yl) => String(yl.year_level_id) === currentText,
    );
    if (byId) return String(byId.year_level_id);

    const byDesc = yearLevelOptions.find(
      (yl) =>
        String(yl.year_level_description || "")
          .trim()
          .toLowerCase() === currentText.toLowerCase(),
    );
    if (byDesc) return String(byDesc.year_level_id);

    return currentText;
  };

  const filteredYearLevels = yearLevelOptions.filter((yl) => {
    // If Graduate program → show only Master & Doctor
    if (Number(person.academicProgram) === 1) {
      return yl.level_type === "graduate";
    }

    // If College/Bachelor → show only year levels
    return yl.level_type === "year";
  });

  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const pageId = 131;

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

  // do not alter
  const location = useLocation();

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

    const allowedRoles = ["administrator", "superadmin", "technical", "applicant"];
    if (!allowedRoles.includes(storedRole)) {
      window.location.href = "/login";
      return;
    }

    const lastSelected = sessionStorage.getItem("admin_edit_person_id");

    // ⭐ CASE 1: URL HAS ?person_id=
    if (queryPersonId !== "") {
      sessionStorage.setItem("admin_edit_person_id", queryPersonId);
      setUserID(queryPersonId);
      return;
    }

    // ⭐ CASE 3: No URL ID and no last selected → start blank
    setUserID("");
  }, [queryPersonId]);

  const [activeStep, setActiveStep] = useState(0);


  const steps = [
    { label: "Personal Information", icon: <PersonIcon />, path: "/student_registrar_personal_information" },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: "/student_registrar_family_background" },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: "/student_registrar_educational_attainment" },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: "/student_registrar_health_medical_records" },
    { label: "Other Information", icon: <InfoIcon />, path: "/student_registrar_other_information" },
  ];

  // ✅ Safe handleUpdate function (no DB errors, correct applicant update)
  const handleUpdate = async (updatedData) => {
    if (!person) return;

    try {
      // ✅ Get correct applicant ID
      const targetId =
        selectedPerson?.person_id || queryPersonId || person.person_id;
      if (!targetId) {
        console.warn("⚠️ No valid applicant ID found — skipping update.");
        return;
      }

      // ✅ Only include valid columns existing in person_table
      const allowedFields = [
        "person_id",
        "profile_img",
        "campus",
        "academicProgram",
        "classifiedAs",
        "applyingAs",
        "program",
        "program2",
        "program3",
        "yearLevel",
        "last_name",
        "first_name",
        "middle_name",
        "extension",
        "nickname",
        "height",
        "weight",
        "lrnNumber",
        "nolrnNumber",
        "gender",
        "pwdMember",
        "pwdType",
        "pwdId",
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
        "presentStreet",
        "presentBarangay",
        "presentZipCode",
        "presentRegion",
        "presentProvince",
        "presentMunicipality",
        "presentDswdHouseholdNumber",
        "sameAsPresentAddress",
        "permanentStreet",
        "permanentBarangay",
        "permanentZipCode",
        "permanentRegion",
        "permanentProvince",
        "permanentMunicipality",
        "permanentDswdHouseholdNumber",
        "solo_parent",
        "father_deceased",
        "father_family_name",
        "father_given_name",
        "father_middle_name",
        "father_ext",
        "father_nickname",
        "father_education",
        "father_education_level",
        "father_last_school",
        "father_course",
        "father_year_graduated",
        "father_school_address",
        "father_contact",
        "father_occupation",
        "father_employer",
        "father_income",
        "father_email",
        "mother_deceased",
        "mother_family_name",
        "mother_given_name",
        "mother_middle_name",
        "mother_ext",
        "mother_nickname",
        "mother_education",
        "mother_education_level",
        "mother_last_school",
        "mother_course",
        "mother_year_graduated",
        "mother_school_address",
        "mother_contact",
        "mother_occupation",
        "mother_employer",
        "mother_income",
        "mother_email",
        "guardian",
        "guardian_family_name",
        "guardian_given_name",
        "guardian_middle_name",
        "guardian_ext",
        "guardian_nickname",
        "guardian_address",
        "guardian_contact",
        "guardian_email",
        "annual_income",
        "schoolLevel",
        "schoolLastAttended",
        "schoolAddress",
        "courseProgram",
        "honor",
        "generalAverage",
        "yearGraduated",
        "schoolLevel1",
        "schoolLastAttended1",
        "schoolAddress1",
        "courseProgram1",
        "honor1",
        "generalAverage1",
        "yearGraduated1",
        "strand",
        // 🩺 Health and medical
        "cough",
        "colds",
        "fever",
        "asthma",
        "faintingSpells",
        "heartDisease",
        "tuberculosis",
        "frequentHeadaches",
        "hernia",
        "chronicCough",
        "headNeckInjury",
        "hiv",
        "highBloodPressure",
        "diabetesMellitus",
        "allergies",
        "cancer",
        "smokingCigarette",
        "alcoholDrinking",
        "hospitalized",
        "hospitalizationDetails",
        "medications",
        // 🧬 Covid / Vaccination
        "hadCovid",
        "covidDate",
        "vaccine1Brand",
        "vaccine1Date",
        "vaccine2Brand",
        "vaccine2Date",
        "booster1Brand",
        "booster1Date",
        "booster2Brand",
        "booster2Date",
        // 🧪 Lab results / medical findings
        "chestXray",
        "cbc",
        "urinalysis",
        "otherworkups",
        // 🧍 Additional fields
        "symptomsToday",
        "remarks",
        // ✅ Agreement / Meta
        "termsOfAgreement",
        "created_at",
        "current_step",
      ];

      // ✅ Clean the payload
      const cleanedData = Object.fromEntries(
        Object.entries(updatedData).filter(([key]) =>
          allowedFields.includes(key),
        ),
      );

      if (Object.keys(cleanedData).length === 0) {
        console.warn("⚠️ No valid fields to update — skipping request.");
        return;
      }

      // ✅ Send update request
      await axios.put(`${API_BASE_URL}/api/enrollment/person/${targetId}`, cleanedData, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });


      console.log(`✅ SuperAdmin updated person_id: ${targetId} successfully.`);
    } catch (error) {
      console.error("❌ SuperAdmin update failed:", {
        message: error.message,
        status: error.response?.status,
        details: error.response?.data || error,
      });
      throw error;
    }
  };

  // Helper: parse "YYYY-MM-DD" safely (local date in Asia/Manila)
  const parseISODate = (dateString) => {
    if (!dateString) return null;
    const [y, m, d] = dateString.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  // Helper: get current date in Asia/Manila (no time portion)
  const getManilaDate = () => {
    const now = new Date();
    // Convert current UTC time to Manila time using locale
    const manilaString = now.toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // manilaString format: "MM/DD/YYYY"
    const [month, day, year] = manilaString.split("/");
    return new Date(`${year}-${month}-${day}`);
  };

  // 🧮 Calculate age using Manila time
  const calculateAge = (birthDateString) => {
    const birthDate = parseISODate(birthDateString);
    if (!birthDate) return "";

    const today = getManilaDate();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    // 🎂 Subtract 1 if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }

    return age < 0 ? "" : age;
  };

  // 🧩 Local form updates only — no auto-save. Persisted only via the
  // "Save Changes" button (handleManualSave).
  const handleChange = (e) => {
    const target = e && e.target ? e.target : {};
    const { name, type, checked, value } = target;

    const updatedValue = type === "checkbox" ? (checked ? 1 : 0) : value;

    const updatedPerson = {
      ...person,
      [name]: updatedValue,
    };

    if (name === "academicProgram") {
      if (Number(value) === 1) {
        updatedPerson.yearLevel = "Master";
      } else {
        updatedPerson.yearLevel = "";
      }
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

    setPerson(updatedPerson);
  };

  const [saving, setSaving] = useState(false);

  // 💾 Manual save only — the single source of truth for persisting changes.
  const handleManualSave = async () => {
    if (!userID) {
      setSnack({ open: true, message: "No student selected.", severity: "warning" });
      return;
    }
    try {
      setSaving(true);
      await handleUpdate(person);
      setSnack({ open: true, message: "All changes saved successfully!", severity: "success" });
    } catch (err) {
      setSnack({ open: true, message: "Failed to save changes.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const [uploadedImage, setUploadedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setSelectedFile(null);
    setPreview(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    const maxSizeInBytes = 2 * 1024 * 1024; // 2MB

    // ❌ Invalid file type
    if (!validTypes.includes(file.type)) {
      setSnack({
        open: true,
        message: "Invalid file type. Please select a JPEG or PNG file.",
        severity: "error",
      });
      setSelectedFile(null);
      setPreview(null);
      return;
    }

    // ❌ File too large
    if (file.size > maxSizeInBytes) {
      setSnack({
        open: true,
        message: "File is too large. Maximum allowed size is 2MB.",
        severity: "warning",
      });
      setSelectedFile(null);
      setPreview(null);
      return;
    }

    // ✅ Valid file — set file and preview
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);

    setSnack({
      open: true,
      message: "✅ File selected successfully.",
      severity: "success",
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setSnack({
        open: true,
        message: "⚠️ Please select a file first.",
        severity: "warning",
      });
      return;
    }

    const formData = new FormData();
    formData.append("profile_picture", selectedFile);
    formData.append("person_id", userID);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/upload-profile-picture`,
        formData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}`, "Content-Type": "multipart/form-data" },
        },
      );

      const fileName = response.data.filename || response.data.profile_img;

      // ✅ Set image AND trigger save (explicit user action, not auto-save)
      const updatedPerson = {
        ...person,
        profile_img: fileName,
      };

      setPerson(updatedPerson);
      await handleUpdate(updatedPerson); // push to DB
      setUploadedImage(`${API_BASE_URL}/uploads/${fileName}`);

      setSnack({
        open: true,
        message: "✅ Upload successful!",
        severity: "success",
      });

      handleClose();
    } catch (error) {
      console.error("Upload failed:", error);
      setSnack({
        open: true,
        message: "❌ Upload failed. Please try again.",
        severity: "error",
      });
    }
  };

  const [isLrnNA, setIsLrnNA] = useState(false);

  const handlePwdCheck = (event) => {
    const checked = event.target.checked;

    setPerson((prev) => ({
      ...prev,
      pwdMember: checked ? 1 : 0,
      pwdType: checked ? prev.pwdType || "" : "",
      pwdId: checked ? prev.pwdId || "" : "",
    }));
  };

  // ✅ ADDRESS STATE
  const [regionList, setRegionList] = useState([]);
  const [provinceList, setProvinceList] = useState([]);
  const [cityList, setCityList] = useState([]);
  const [barangayList, setBarangayList] = useState([]);

  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");

  // ✅ REGION LIST STATIC LOAD
  useEffect(() => {
    setRegionList(regions);
  }, []);

  // ✅ PROVINCES BASED ON SELECTED REGION
  useEffect(() => {
    const region = regions.find((r) => r.region_name === selectedRegion);
    if (region) {
      setProvinceList(
        provinces.filter((p) => p.region_code === region.region_code),
      );
    } else {
      setProvinceList([]);
    }
  }, [selectedRegion]);

  // ✅ CITIES BASED ON SELECTED PROVINCE
  useEffect(() => {
    const province = provinces.find(
      (p) => p.province_name === selectedProvince,
    );
    if (province) {
      setCityList(
        cities.filter((c) => c.province_code === province.province_code),
      );
    } else {
      setCityList([]);
    }
  }, [selectedProvince]);

  // ✅ BARANGAYS BASED ON SELECTED CITY
  useEffect(() => {
    const city = cities.find((c) => c.city_name === selectedCity);
    if (city) {
      setBarangayList(barangays.filter((b) => b.city_code === city.city_code));
    } else {
      setBarangayList([]);
    }
  }, [selectedCity]);

  // ✅ UPDATE ON PERSON STATE
  useEffect(() => {
    const region = regions.find((r) => r.region_name === person.presentRegion);
    if (region) {
      setProvinceList(
        provinces.filter((p) => p.region_code === region.region_code),
      );
    } else {
      setProvinceList([]);
    }
  }, [person.presentRegion]);

  useEffect(() => {
    const province = provinces.find(
      (p) => p.province_name === person.presentProvince,
    );
    if (province) {
      setCityList(
        cities.filter((c) => c.province_code === province.province_code),
      );
    } else {
      setCityList([]);
    }
  }, [person.presentProvince]);

  useEffect(() => {
    const city = cities.find((c) => c.city_name === person.presentMunicipality);
    if (city) {
      setBarangayList(barangays.filter((b) => b.city_code === city.city_code));
    } else {
      setBarangayList([]);
    }
  }, [person.presentMunicipality]);

  // ✅ PERMANENT ADDRESS STATES
  const [permanentRegionList, setPermanentRegionList] = useState([]);
  const [permanentProvinceList, setPermanentProvinceList] = useState([]);
  const [permanentCityList, setPermanentCityList] = useState([]);
  const [permanentBarangayList, setPermanentBarangayList] = useState([]);

  const [permanentRegion, setPermanentRegion] = useState("");
  const [permanentProvince, setPermanentProvince] = useState("");
  const [permanentCity, setPermanentCity] = useState("");
  const [permanentBarangay, setPermanentBarangay] = useState("");

  // Initial load of permanent region list
  useEffect(() => {
    setPermanentRegionList(regions);
  }, []);

  // Update provinces when permanent region changes
  useEffect(() => {
    const region = regions.find(
      (r) => r.region_name === person.permanentRegion,
    );
    if (region) {
      setPermanentProvinceList(
        provinces.filter((p) => p.region_code === region.region_code),
      );
    } else {
      setPermanentProvinceList([]);
    }
  }, [person.permanentRegion]);

  // Update cities when permanent province changes
  useEffect(() => {
    const province = provinces.find(
      (p) => p.province_name === person.permanentProvince,
    );
    if (province) {
      setPermanentCityList(
        cities.filter((c) => c.province_code === province.province_code),
      );
    } else {
      setPermanentCityList([]);
    }
  }, [person.permanentProvince]);

  // Update barangays when permanent city changes
  useEffect(() => {
    const city = cities.find(
      (c) => c.city_name === person.permanentMunicipality,
    );
    if (city) {
      setPermanentBarangayList(
        barangays.filter((b) => b.city_code === city.city_code),
      );
    } else {
      setPermanentBarangayList([]);
    }
  }, [person.permanentMunicipality]);

  const [curriculumOptions, setCurriculumOptions] = useState([]);
  const scopeRevision = useRegistrarScopeRevision();
  const isProgramLocked = isRegistrarProgramSelectionLocked();
  const registrarCurriculumId = getRegistrarCurriculumId();

  useEffect(() => {
    const fetchCurriculums = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/applied_program`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        setCurriculumOptions(restrictToRegistrarCurriculum(response.data)); // array of { curriculum_id: "..." }
      } catch (error) {
        console.error("Error fetching curriculum options:", error);
      }
    };

    fetchCurriculums();
  }, [scopeRevision]);

  const filteredCurriculum = curriculumOptions.filter((item) => {
    // ✅ CAMPUS FILTER

    // ✅ ACADEMIC PROGRAM FILTER
    if (person.academicProgram !== "" && person.academicProgram !== null) {
      if (Number(item.academic_program) !== Number(person.academicProgram)) {
        return false;
      }
    }

    return true;
  });

  const [errors, setErrors] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim() === "") return;

      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/search-person-student`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
            params: { query: searchQuery },
          },
        );

        console.log("Search result data:", res.data);
        setPerson(res.data);

        const idToStore = res.data.person_id || res.data.id;
        if (!idToStore) {
          setSearchError("Invalid search result");
          return;
        }

        sessionStorage.setItem("admin_edit_person_id", idToStore);
        sessionStorage.setItem(
          "admin_edit_person_data",
          JSON.stringify(res.data),
        ); // ✅ added
        setUserID(idToStore);
        setSearchError("");
      } catch (err) {
        console.error("Search failed:", err);
        setSearchError("Student not found");
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const [selectedPerson, setSelectedPerson] = useState(null);
  const [persons, setPersons] = useState([]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      // 🔹 If search is empty, clear everything
      setSelectedPerson(null);
      setPerson({
        profile_img: "",
        generalAverage1: "",
        height: "",
        applyingAs: "",
        document_status: "",
        last_name: "",
        first_name: "",
        middle_name: "",
        extension: "",
      });
      return;
    }

    // 🔹 Try to find a matching applicant from the list
    const match = persons.find((p) =>
      getStudentSuggestionText(p).includes(searchQuery.toLowerCase()),
    );

    if (match) {
      // ✅ If found, set this as the "selectedPerson"
      setSelectedPerson(match);
    } else {
      // ❌ If not found, clear again
      setSelectedPerson(null);
      setPerson({
        profile_img: "",
        generalAverage1: "",
        height: "",
        applyingAs: "",
        document_status: "",
        last_name: "",
        first_name: "",
        middle_name: "",
        extension: "",
      });
    }
  }, [searchQuery, persons]);

  useEffect(() => {
    const fetchPersons = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/student_upload_documents_data`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );
        setPersons(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching student suggestions:", err);
      }
    };

    fetchPersons();
  }, []);

  const studentSuggestions =
    searchQuery.trim().length >= 2
      ? persons
        .filter((student) =>
          getStudentSuggestionText(student).includes(
            searchQuery.trim().toLowerCase(),
          ),
        )
        .slice(0, 10)
      : [];

  const handleStudentSuggestionSelect = (student) => {
    const nextValue = getStudentSuggestionValue(student);
    setSearchQuery(nextValue);
    setSelectedPerson(student);
    setSuggestionsOpen(false);
  };

  const [studentData, setStudentData] = useState(null);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState([]);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 9) {
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
    const queryParams = new URLSearchParams(location.search);
    const personIdFromUrl = queryParams.get("person_id");

    if (!personIdFromUrl) return;

    // fetch info of that person
    axios
      .get(`${API_BASE_URL}api/person_with_applicant/${personIdFromUrl}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => {
        if (res.data?.student_number) {
          // AUTO-INSERT applicant_number into search bar
          setSearchQuery(cleanStudentValue(res.data.student_number));

          // If you have a fetchUploads() or fetchExamScore() — call it
          if (typeof fetchUploadsByApplicantNumber === "function") {
            fetchUploadsByApplicantNumber(res.data.student_number);
          }

          if (typeof fetchApplicants === "function") {
            fetchApplicants();
          }
        }
      })
      .catch((err) => console.error("Auto search failed:", err));
  }, [location.search]);

  const handleStepClick = (index) => {
    setActiveStep(index);
  };

  useEffect(() => {
    const storedId = sessionStorage.getItem("edit_student_number");

    if (storedId) {
      setSearchQuery(storedId);
    }
  }, []);

  const [studentNumber, setStudentNumber] = useState(() => {
    return (
      localStorage.getItem("studentNumberForCOR") ||
      localStorage.getItem("admin_edit_person_id") ||
      ""
    );
  });

  const [debouncedStudentNumber, setDebouncedStudentNumber] = useState("");

  // ✅ For Excel Import
  const [excelFile, setExcelFile] = useState(null);

  const handleSnackClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack({ ...snack, open: false });
  };

  const divToPrintRef = useRef();
  const [showPrintView, setShowPrintView] = useState(false);

  const [examPermitError, setExamPermitError] = useState("");
  const [examPermitModalOpen, setExamPermitModalOpen] = useState(false);

  const handleCloseExamPermitModal = () => {
    setExamPermitModalOpen(false);
    setExamPermitError("");
  };


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


  const buildClientFilename = (prefix, { lastName, firstName, applicantNumber }) => {
    const safeLast = (lastName || "Applicant").trim().replace(/\s+/g, "_");
    const safeFirst = (firstName || "").trim().replace(/\s+/g, "_");
    const suffix = applicantNumber ? `_${applicantNumber}` : "";
    return `${prefix}_${safeLast}${safeFirst ? "_" + safeFirst : ""}${suffix}.pdf`;
  };

  const logPrintingStudentDocs = async (documentLabel) => {
    try {
      const middleInitial = person?.middle_name
        ? ` ${String(person.middle_name).trim().charAt(0).toUpperCase()}.`
        : "";
      const studentName = person?.last_name
        ? `${person.last_name}, ${person.first_name || ""}${middleInitial}`.trim()
        : [person?.first_name, person?.middle_name].filter(Boolean).join(" ") ||
        "Unknown Student";

      await postAuditEvent("PRINTING_STUDENT_DOCS", {
        document_label: documentLabel,
        student_name: studentName,
        student_number:
          person?.student_number || person?.applicant_number || "N/A",
        person_id: person?.person_id || userID || "",
      });
    } catch (err) {
      console.error("Printing student docs audit failed:", err);
    }
  };

  const generateFormPdf = async (key) => {
    const config = FORM_CONFIGS[key];
    if (!config || generatingKey) return;

    // 🔒 Require a searched/selected student before generating anything
    if (!userID || !person?.person_id) {
      setSnack({
        open: true,
        message: "Please search and select a student first.",
        severity: "warning",
      });
      return;
    }

    // 🔑 The Student* form components read this exact sessionStorage key
    // (not a "personId" prop) to determine which student to fetch. Without
    // this, they fall back to the logged-in registrar's own person_id.
    sessionStorage.setItem("student_edit_person_id", userID);

    setGeneratingKey(key);

    try {
      // give the hidden Student component time to mount + finish its own
      // fetch for this student before we read its rendered HTML
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const node = hiddenFormRef.current;
      if (!node) throw new Error(`${config.label} did not render in time.`);

      // ✅ FIX — React's `checked` is a DOM property, not an HTML attribute,
      // so it never shows up in node.innerHTML. Clone the node and manually
      // stamp "checked" onto the markup based on the live checkbox state
      // before serializing, otherwise every checkbox renders unchecked in
      // the generated PDF regardless of the actual database value.
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
          applicant_number: person?.applicant_number || "",
          last_name: person?.last_name || "",
          first_name: person?.first_name || "",
          audit_actor_id: employeeID || localStorage.getItem("employee_id") || "unknown",
          audit_actor_role: userRole || "administrator",
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` }, responseType: "blob" },
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const fileName = config.dateStamped
        ? `${config.filenamePrefix}_${new Date().toISOString().slice(0, 10)}.pdf`
        : buildClientFilename(config.filenamePrefix, {
          lastName: person?.last_name,
          firstName: person?.first_name,
          applicantNumber: person?.applicant_number,
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
      setSnack({
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
    {
      key: "registrar",
      label: `Application For ${shortTerm ? shortTerm.toUpperCase() : ""} College Admission`,
      onClick: () => generateFormPdf("registrar"),
    },
    { key: "admissionServices", label: "Application/Student Satisfactory Survey", onClick: () => generateFormPdf("admissionServices") },

  ];


  const [canPrintPermit, setCanPrintPermit] = useState(false);

  useEffect(() => {
    if (!userID) return;
    axios.get(`${API_BASE_URL}/api/verified-exam-applicants`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }).then((res) => {
      const verified = res.data.some((a) => a.person_id === parseInt(userID));
      setCanPrintPermit(verified);
    });
  }, [userID]);

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


  // dot not alter
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

      {showPrintView && (
        <div
          ref={divToPrintRef}
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            width: "8.5in",
            background: "#fff",
          }}
        >
          <ExamPermit personId={userID} />
        </div>
      )}
      {generatingKey && FORM_CONFIGS[generatingKey] && (
        <div ref={hiddenFormRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          {React.createElement(FORM_CONFIGS[generatingKey].Component, { personId: userID })}
        </div>
      )}



      {/* Top header: DOCUMENTS SUBMITTED + Search + Import */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",

          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: "36px",
          }}
        >
          PERSONAL INFORMATION
        </Typography>

        {/* ✅ Right side: Search + Excel Import side by side */}
        <Box display="flex" alignItems="center" gap={2}>
          <Box sx={{ position: "relative", width: 450, maxWidth: "100%" }}>
            <TextField
              size="small"
              placeholder="Search Student Name / Email / Student Number"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
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
                {studentSuggestions.length > 0 ? (
                  studentSuggestions.map((student) => {
                    const studentNumber = cleanStudentValue(student?.student_number);
                    const name = formatStudentSuggestionName(student);
                    return (
                      <Box
                        key={`${studentNumber || student?.person_id}-${name}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleStudentSuggestionSelect(student);
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
                          {studentNumber || "N/A"}
                        </Typography>
                        <Typography sx={{ fontSize: 14, color: "#555" }}>|</Typography>
                        <Typography sx={{ fontSize: 14 }} noWrap>
                          {name || cleanStudentValue(student?.emailAddress) || "Unnamed Student"}
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
          <PrintingHistoryDialog
            employeeId={employeeID}
            action={PRINTING_STUDENT_ACTION}
            title="My Student Printing History"
          />
        </Box>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />
      <RegistrarEnrollmentTabs />
      <br />
      <br />


      <TableContainer component={Paper} sx={{ width: "100%", mb: 1 }}>
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
                  fontFamily: "Poppins, sans-serif",
                  border: "none",
                }}
              >
                Student Number:&nbsp;
                <span
                  style={{
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: "normal",
                    textDecoration: "underline",
                  }}
                >
                  {person?.student_number || "N/A"}
                </span>
              </TableCell>

              {/* Right cell: Student Name */}
              <TableCell
                align="right"
                sx={{
                  color: "white",
                  fontSize: "20px",
                  fontFamily: "Poppins, sans-serif",
                  border: "none",
                }}
              >
                Student Name:&nbsp;
                <span
                  style={{
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: "normal",
                    textDecoration: "underline",
                  }}
                >
                  {person?.last_name?.toUpperCase()},{" "}
                  {person?.first_name?.toUpperCase()}{" "}
                  {person?.middle_name?.toUpperCase()}{" "}
                  {person?.extension?.toUpperCase() || ""}
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

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          mt: "25px",
          px: 2,
          position: "relative",
        }}
      >
        <h1
          style={{
            fontSize: "30px",
            fontWeight: "bold",
            textAlign: "center",
            color: "black",
            margin: 0,
          }}
        >
          PRINTABLE DOCUMENTS
        </h1>
        <Button
          variant="contained"
          onClick={handleManualSave}
          disabled={saving || !userID}
          startIcon={<SaveIcon />}
          sx={{
            position: "absolute",
            right: 16,
            textTransform: "none",
            fontWeight: "bold",
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </Box>

      <Container>
        {/* Cards Section */}

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
                        : headerColor,

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
          <h1 style={{ fontSize: "50px", fontWeight: "bold", textAlign: "center", color: subtitleColor, marginTop: "25px" }}>
            STUDENT FORM
          </h1>
          <div style={{ textAlign: "center" }}>
            Please update your personal information to keep your student records accurate and up to date for the upcoming academic year at{" "}
            {shortTerm ? <><strong>{shortTerm.toUpperCase()}</strong> - {companyName || ""}</> : companyName || ""}.
          </div>
        </Container>

        <br />

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            px: 4,
          }}
        >
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              {/* Wrap the step with Link for routing */}
              <Link to={step.path} style={{ textDecoration: "none" }}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => handleStepClick(index)}
                >
                  {/* Step Icon */}
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      border: `1px solid ${borderColor}`,
                      backgroundColor:
                        activeStep === index
                          ? headerColor
                          : "#E8C999",
                      color: activeStep === index ? "#fff" : "#000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {step.icon}
                  </Box>

                  {/* Step Label */}
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
              </Link>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <Box
                  sx={{
                    height: "2px",
                    backgroundColor: mainButtonColor,
                    flex: 1,
                    alignSelf: "center",
                    mx: 2,
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </Box>

        <br />

        <form>
          <Container
            maxWidth="100%"
            sx={{
              backgroundColor: headerColor,
              border: `1px solid ${borderColor}`,
              maxHeight: "500px",
              overflowY: "auto",
              color: "white",
              borderRadius: 2,
              boxShadow: 3,
              padding: "4px",
            }}
          >
            <Box sx={{ width: "100%" }}>
              <Typography
                style={{
                  fontSize: "20px",
                  padding: "10px",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                Step 1: Personal Information
              </Typography>
            </Box>
          </Container>

          <Container
            maxWidth="100%"
            sx={{
              backgroundColor: "#f1f1f1",
              border: `1px solid ${borderColor}`,
              padding: 4,
              borderRadius: 2,
              boxShadow: 3,
            }}
          >
            <Typography
              style={{
                fontSize: "20px",
                color: mainButtonColor,
                fontWeight: "bold",
              }}
            >
              Personal Information:
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />

            <br />

            <div className="flex items-center mb-4 gap-4">
              <label className="w-40 font-medium">Student Number:</label>

              <TextField
                fullWidth
                id="student-number"
                label="Student Number"
                size="small"
                name="studentNumber"
                placeholder="Enter your Student Number"
                required
                value={person.student_number ?? ""}
                onChange={handleChange}
                error={!!errors.student_number}
                helperText={errors.student_number && "This field is required."}
              />
            </div>

            <div className="flex items-center mb-4 gap-4">
              <label className="w-40 font-medium">Campus:</label>

              <FormControl

                fullWidth
                size="small"
                required
                error={!!errors.campus}
                className="mb-4"
              >
                <Select
                  readOnly
                  id="campus-select"
                  name="campus"
                  value={person.campus || ""}
                  onChange={(e) => {
                    handleChange({
                      target: { name: "campus", value: e.target.value },
                    });
                  }}
                  displayEmpty
                  renderValue={(selected) => {
                    if (!selected) return <em>Select Campus</em>;

                    const branch = branches.find(
                      (b) => String(b.id) === String(selected),
                    );
                    return branch
                      ? branch.branch.toUpperCase()
                      : "Select Campus";
                  }}
                >
                  <MenuItem value="">
                    <em>Select Campus</em>
                  </MenuItem>

                  {branches.map((b) => (
                    <MenuItem key={b.id} value={String(b.id)}>
                      {b.branch.toUpperCase()}
                    </MenuItem>
                  ))}
                </Select>
                {errors.campus && (
                  <FormHelperText>This field is required.</FormHelperText>
                )}
              </FormControl>
            </div>

            <div className="flex items-center mb-4 gap-4">
              <label className="w-40 font-medium">Academic Program:</label>
              <FormControl
                fullWidth
                size="small"
                required
                error={!!errors.academicProgram}
                className="mb-4"
              >
                <InputLabel id="academic-program-label">
                  Academic Program
                </InputLabel>
                <Select
                  readOnly
                  labelId="academic-program-label"
                  id="academic-program-select"
                  name="academicProgram"
                  value={person.academicProgram ?? ""}
                  label="Academic Program"
                  onChange={handleChange}
                >
                  <MenuItem value="">
                    <em>Select Program</em>
                  </MenuItem>
                  <MenuItem value="0">Undergraduate</MenuItem>
                  <MenuItem value="1">Graduate</MenuItem>
                  <MenuItem value="2">Techvoc</MenuItem>
                </Select>
                {errors.academicProgram && (
                  <FormHelperText>This field is required.</FormHelperText>
                )}
              </FormControl>
            </div>

            <div className="flex items-center mb-4 gap-4">
              <label className="w-40 font-medium">Classified As:</label>
              <FormControl
                fullWidth
                size="small"
                required
                error={!!errors.classifiedAs}
                className="mb-4"
              >
                <InputLabel id="classified-as-label">Classified As</InputLabel>
                <Select
                  readOnly
                  labelId="classified-as-label"
                  id="classified-as-select"
                  name="classifiedAs"
                  value={person.classifiedAs ?? ""}
                  label="Classified As"
                  onChange={handleChange}
                >
                  <MenuItem value="">
                    <em>Select Classification</em>
                  </MenuItem>
                  <MenuItem value="Freshman (First Year)">
                    Freshman (First Year)
                  </MenuItem>
                  <MenuItem value="Transferee">Transferee</MenuItem>
                  <MenuItem value="Returnee">Returnee</MenuItem>
                  <MenuItem value="Shiftee">Shiftee</MenuItem>
                  <MenuItem value="Foreign Student">Foreign Student</MenuItem>
                </Select>
                {errors.classifiedAs && (
                  <FormHelperText>This field is required.</FormHelperText>
                )}
              </FormControl>
            </div>

            <div className="flex items-center mb-4 gap-4">
              <label className="w-40 font-medium">Applying As:</label>
              <FormControl
                fullWidth
                size="small"
                required
                error={!!errors.applyingAs}
                className="mb-4"
              >
                <InputLabel id="applying-as-label">Applying As</InputLabel>
                <Select
                  readOnly
                  labelId="applying-as-label"
                  id="applying-as-select"
                  name="applyingAs"
                  value={person.applyingAs ?? ""}
                  label="Applying As"
                  onChange={handleChange}
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
                {errors.applyingAs && (
                  <FormHelperText>This field is required.</FormHelperText>
                )}
              </FormControl>
            </div>

            <br />

            <Typography
              style={{
                fontSize: "20px",
                color: mainButtonColor,
                fontWeight: "bold",
              }}
            >
              Course Program:
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <Box display="flex" width="100%" gap={2}>
              {/* Left Side: TextFields with label beside each input */}
              <Box display="flex" flexDirection="column" sx={{ width: "75%" }}>
                {/* Program Fields */}
                <Box
                  display="flex"
                  flexDirection="column"
                  sx={{ width: "100%" }}
                >
                  {/* Program 1 */}
                  <Box display="flex" alignItems="center" gap={2} mb={3}>
                    <label className="w-40 font-medium">Course Applied:</label>
                    <FormControl
                      fullWidth
                      size="small"
                      required
                      error={!!errors.program}
                    >
                      <InputLabel>Course Applied</InputLabel>
                      <Select

                        name="program"
                        value={isProgramLocked ? registrarCurriculumId : person.program || ""}
                        onChange={handleChange}
                        disabled={isProgramLocked}
                        label="Program"
                      >
                        {!isProgramLocked && (
                          <MenuItem value="">
                            <em>Select Program</em>
                          </MenuItem>
                        )}
                        {filteredCurriculum.map((item, index) => (
                          <MenuItem key={index} value={item.curriculum_id}>
                            {`(${item.program_code}): ${item.program_description}${item.major ? ` (${item.major})` : ""
                              } (${item.current_year}-${item.next_year}) (${getBranchLabel(item.components)})`}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.program && (
                        <FormHelperText>This field is required.</FormHelperText>
                      )}
                    </FormControl>
                  </Box>

                  {/* Year Level */}
                  <div className="flex items-center mb-4 gap-2">
                    <label className="w-40 mt:[2] font-medium ">
                      Year Level:
                    </label>
                    <FormControl
                      fullWidth
                      size="small"
                      required
                      error={!!errors.yearLevel}
                    >
                      <InputLabel id="year-level-label">Year Level</InputLabel>

                      <Select
                        labelId="year-level-label"
                        id="year-level-select"
                        name="yearLevel"
                        value={getYearLevelSelectValue()}
                        label="Year Level"
                        onChange={handleChange}
                      >
                        <MenuItem value="">
                          <em>Select Year Level</em>
                        </MenuItem>

                        {filteredYearLevels.map((yl) => (
                          <MenuItem
                            key={yl.year_level_id}
                            value={String(yl.year_level_id)}
                          >
                            {yl.year_level_description}
                          </MenuItem>
                        ))}
                      </Select>

                      {errors.yearLevel && (
                        <FormHelperText>This field is required.</FormHelperText>
                      )}
                    </FormControl>
                  </div>
                </Box>
              </Box>

              <Box
                sx={{
                  textAlign: "center",
                  marginTop: "10px",
                  marginLeft: "35px",
                  marginBottom: "-10px",
                  border: errors.profile_img
                    ? "1px solid red"
                    : "1px solid black",
                  width: "5.50cm",
                  height: "5.50cm",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexDirection: "column",
                  backgroundColor: "white",
                }}
              >
                {person.profile_img && person.profile_img !== "" ? (
                  <img
                    src={`${API_BASE_URL}/uploads/Student1by1/${person.profile_img}?t=${Date.now()}`}
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <>
                    <Typography
                      fontSize={12}
                      color={errors.profile_img ? "error" : "textSecondary"}
                    >
                      No Profile Image Uploaded
                    </Typography>
                    {errors.profile_img && (
                      <Typography fontSize={12} color="error">
                        This field is required.
                      </Typography>
                    )}
                  </>
                )}
              </Box>
            </Box>

            <Typography
              style={{
                fontSize: "20px",
                color: mainButtonColor,
                fontWeight: "bold",
              }}
            >
              Person Details:
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <Box display="flex" gap={2} mb={2}>
              {/* Last Name */}
              <Box flex="1 1 20%">
                <Typography mb={1} fontWeight="medium">
                  Last Name
                </Typography>
                <TextField

                  fullWidth
                  size="small"
                  name="last_name"
                  required
                  value={person.last_name ?? ""}
                  onChange={handleChange}
                  placeholder="Enter your Last Name"
                  error={errors.last_name}
                  helperText={errors.last_name ? "This field is required." : ""}
                />
              </Box>

              {/* First Name */}
              <Box flex="1 1 20%">
                <Typography mb={1} fontWeight="medium">
                  First Name
                </Typography>
                <TextField

                  fullWidth
                  size="small"
                  name="first_name"
                  required
                  value={person.first_name ?? ""}
                  onChange={handleChange}
                  placeholder="Enter your First Name"
                  error={errors.first_name}
                  helperText={
                    errors.first_name ? "This field is required." : ""
                  }
                />
              </Box>

              {/* Middle Name */}
              <Box flex="1 1 20%">
                <Typography mb={1} fontWeight="medium">
                  Middle Name
                </Typography>
                <TextField

                  fullWidth
                  size="small"
                  name="middle_name"
                  required
                  value={person.middle_name ?? ""}
                  onChange={handleChange}
                  placeholder="Enter your Middle Name"
                  error={errors.middle_name}
                  helperText={
                    errors.middle_name ? "This field is required." : ""
                  }
                />
              </Box>

              {/* Extension */}
              <Box flex="1 1 20%">
                <Typography mb={1} fontWeight="medium">
                  Extension
                </Typography>
                <FormControl fullWidth size="small" error={errors.extension}>
                  <InputLabel id="extension-label">Extension</InputLabel>
                  <Select

                    labelId="extension-label"
                    id="extension-select"
                    name="extension"
                    value={person.extension ?? ""}
                    label="Extension"
                    onChange={handleChange}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    <MenuItem value="Jr.">Jr.</MenuItem>
                    <MenuItem value="Sr.">Sr.</MenuItem>
                    <MenuItem value="I">I</MenuItem>
                    <MenuItem value="II">II</MenuItem>
                    <MenuItem value="III">III</MenuItem>
                    <MenuItem value="IV">IV</MenuItem>
                    <MenuItem value="V">V</MenuItem>
                  </Select>
                  {errors.extension && (
                    <FormHelperText>This field is required.</FormHelperText>
                  )}
                </FormControl>
              </Box>

              {/* Nickname */}
              <Box flex="1 1 20%">
                <Typography mb={1} fontWeight="medium">
                  Nickname
                </Typography>
                <TextField
                  InputProps={{ readOnly: true }}
                  fullWidth
                  size="small"
                  name="nickname"
                  required
                  value={person.nickname ?? ""}
                  onChange={handleChange}
                  placeholder="Enter your Nickname"
                  error={errors.nickname}
                  helperText={errors.nickname ? "This field is required." : ""}
                />
              </Box>
            </Box>

            <Box display="flex" gap={4} mb={2}>
              {/* Height Field */}
              <Box display="flex" flexDirection="column" flex="0 0 26%">
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography fontWeight="medium" minWidth="60px">
                    Height:
                  </Typography>
                  <TextField
                    InputProps={{ readOnly: true }}
                    size="small"
                    type="number"
                    name="height"
                    value={person.height || ""}
                    onChange={handleChange}
                    placeholder="Enter your Height"
                    error={!!errors.height}
                    fullWidth
                  />
                  <Typography variant="body2">cm.</Typography>
                </Box>
                {errors.height && (
                  <Typography color="error" variant="caption" mt={0.5}>
                    This field is required.
                  </Typography>
                )}
              </Box>

              {/* Weight Field */}
              <Box display="flex" flexDirection="column" flex="0 0 26%">
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography fontWeight="medium" minWidth="60px">
                    Weight:
                  </Typography>
                  <TextField
                    InputProps={{ readOnly: true }}
                    size="small"
                    type="number"
                    name="weight"
                    value={person.weight || ""}
                    onChange={handleChange}
                    placeholder="Enter your Weight"
                    error={!!errors.weight}
                    fullWidth
                  />

                  <Typography variant="body2">kg</Typography>
                </Box>
                {errors.weight && (
                  <Typography color="error" variant="caption" mt={0.5}>
                    This field is required.
                  </Typography>
                )}
              </Box>
            </Box>

            <Box
              display="flex"
              alignItems="center"
              gap={2}
              flexWrap="nowrap"
              width="100%"
              mb={2}
            >
              {/* LRN Label */}
              <Typography fontWeight="medium" minWidth="180px">
                Learning Reference Number:
              </Typography>

              {/* LRN Input */}
              <TextField
                id="lrnNumber"
                name="lrnNumber"
                required={person.lrnNumber !== "No LRN Number"}
                label="Enter your LRN Number"
                value={
                  person.lrnNumber === "No LRN Number"
                    ? ""
                    : (person.lrnNumber ?? "")
                }
                onChange={handleChange}
                size="small"
                sx={{ width: 220 }}
                InputProps={{

                  sx: { height: 40 },
                }}
                inputProps={{
                  style: { height: 40, padding: "10.5px 14px" },
                }}
                error={errors.lrnNumber}
                helperText={errors.lrnNumber ? "This field is required." : ""}
              />

              <FormControlLabel
                control={
                  <Checkbox

                    name="lrn_na"
                    checked={person.lrnNumber === "No LRN Number"}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const updatedPerson = {
                        ...person,
                        lrnNumber: checked ? "No LRN Number" : "",
                      };

                      setPerson(updatedPerson);
                      setIsLrnNA(checked); // optional: if you're tracking this separately
                    }}
                  />
                }
                label="N/A"
                sx={{ mr: 2 }}
              />

              <Typography fontWeight="medium">Gender:</Typography>
              {/* Gender */}
              <TextField
                select
                size="small"
                label="Gender"
                name="gender"
                required
                value={person.gender == null ? "" : String(person.gender)}
                onChange={(e) => {
                  const val = e.target.value;
                  handleChange({
                    target: {
                      name: "gender",
                      value: val === "" ? null : parseInt(val, 10),
                    },
                  });
                }}
                error={Boolean(errors.gender)}
                sx={{ width: 150 }}
                InputProps={{
                  readOnly: true, // ✅ makes it non-editable (read-only)
                  sx: { height: 40 },
                }}
                inputProps={{ style: { height: 40 } }}
              >
                <MenuItem value="">
                  <em>Select Gender</em>
                </MenuItem>
                <MenuItem value="0">MALE</MenuItem>
                <MenuItem value="1">FEMALE</MenuItem>
              </TextField>

              {errors.gender && (
                <Typography color="error" variant="caption" ml={1}>
                  This field is required.
                </Typography>
              )}

              {/* PWD Checkbox */}
              <FormControlLabel
                control={
                  <Checkbox
                    disabled
                    checked={person.pwdMember === 1}
                    onChange={handlePwdCheck}
                    inputProps={{ "aria-label": "PWD Checkbox" }}
                  />
                }
                label="PWD"
                sx={{ ml: 2 }}
              />

              {person.pwdMember === 1 && (
                <>
                  {/* PWD Type */}
                  <TextField
                    readOnly
                    select
                    size="small"
                    label="PWD Type"
                    name="pwdType"
                    value={person.pwdType ?? ""}
                    onChange={handleChange}
                    required={person.pwdMember === 1}
                    error={person.pwdMember === 1 && !!errors.pwdType}
                    helperText={
                      person.pwdMember === 1 && errors.pwdType
                        ? "This field is required."
                        : ""
                    }
                    sx={{ width: 220 }}
                    InputProps={{ sx: { height: 40 } }}
                    inputProps={{ style: { height: 40 } }}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    <MenuItem value="Blindness">Blindness</MenuItem>
                    <MenuItem value="Low-vision">Low-vision</MenuItem>
                    <MenuItem value="Leprosy Cured persons">
                      Leprosy Cured persons
                    </MenuItem>
                    <MenuItem value="Hearing Impairment">
                      Hearing Impairment
                    </MenuItem>
                    <MenuItem value="Locomotor Disability">
                      Locomotor Disability
                    </MenuItem>
                    <MenuItem value="Dwarfism">Dwarfism</MenuItem>
                    <MenuItem value="Intellectual Disability">
                      Intellectual Disability
                    </MenuItem>
                    <MenuItem value="Mental Illness">Mental Illness</MenuItem>
                    <MenuItem value="Autism Spectrum Disorder">
                      Autism Spectrum Disorder
                    </MenuItem>
                    <MenuItem value="Cerebral Palsy">Cerebral Palsy</MenuItem>
                    <MenuItem value="Muscular Dystrophy">
                      Muscular Dystrophy
                    </MenuItem>
                    <MenuItem value="Chronic Neurological conditions">
                      Chronic Neurological conditions
                    </MenuItem>
                    <MenuItem value="Specific Learning Disabilities">
                      Specific Learning Disabilities
                    </MenuItem>
                    <MenuItem value="Multiple Sclerosis">
                      Multiple Sclerosis
                    </MenuItem>
                    <MenuItem value="Speech and Language disability">
                      Speech and Language disability
                    </MenuItem>
                    <MenuItem value="Thalassemia">Thalassemia</MenuItem>
                    <MenuItem value="Hemophilia">Hemophilia</MenuItem>
                    <MenuItem value="Sickle cell disease">
                      Sickle cell disease
                    </MenuItem>
                    <MenuItem value="Multiple Disabilities including">
                      Multiple Disabilities including
                    </MenuItem>
                  </TextField>

                  {/* PWD ID */}
                  <TextField
                    disabled
                    size="small"
                    label="PWD ID"
                    name="pwdId"
                    value={person.pwdId ?? ""}
                    onChange={handleChange}
                    required={person.pwdMember === 1}
                    error={person.pwdMember === 1 && !!errors.pwdId}
                    helperText={
                      person.pwdMember === 1 && errors.pwdId
                        ? "This field is required."
                        : ""
                    }
                    sx={{ width: 200 }}
                    InputProps={{ sx: { height: 40 } }}
                    inputProps={{ style: { height: 40 } }}
                  />
                </>
              )}
            </Box>

            {/* Row 1: Birth Place + Citizenship */}

            <Box display="flex" gap={2} mb={2}>
              {/* 🎂 Birth Date */}

              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Birth of Date
                </Typography>
                <DateField

                  fullWidth
                  size="small"
                  name="birthOfDate"
                  required
                  value={person.birthOfDate || ""}
                  onChange={handleChange}
                  error={!!errors.birthOfDate}
                  helperText={
                    errors.birthOfDate ? "This field is required." : ""
                  }
                />
              </Box>
              {/* 👤 Age (auto-filled, read-only) */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Age
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  name="age"
                  value={person.age || ""}
                  placeholder="Enter your Age"
                  required
                  onChange={handleChange}
                  error={!!errors.age}
                  helperText={errors.age ? "This field is required." : ""}
                  InputProps={{ readOnly: true }} // read-only so user can’t manually change
                />
              </Box>
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Birth Place
                </Typography>
                <TextField

                  fullWidth
                  size="small"
                  name="birthPlace"
                  placeholder="Enter your Birth Place"
                  value={person.birthPlace ?? ""}
                  required
                  onChange={handleChange}
                  error={!!errors.birthPlace}
                  helperText={
                    errors.birthPlace ? "This field is required." : ""
                  }
                />
              </Box>
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Language/Dialect Spoken
                </Typography>
                <TextField
                  InputProps={{ readOnly: true }}
                  fullWidth
                  size="small"
                  name="languageDialectSpoken"
                  placeholder="Enter your Language Spoken"
                  value={person.languageDialectSpoken ?? ""}
                  required
                  onChange={handleChange}
                  error={!!errors.languageDialectSpoken}
                  helperText={
                    errors.languageDialectSpoken
                      ? "This field is required."
                      : ""
                  }
                />
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
                    readOnly
                    labelId="citizenship-label"
                    id="citizenship"
                    name="citizenship"
                    value={person.citizenship || ""}
                    onChange={handleChange}
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
                    readOnly
                    labelId="religion-label"
                    id="religion"
                    name="religion"
                    value={person.religion || ""}
                    onChange={handleChange}
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
                    readOnly
                    labelId="tribe-label"
                    id="tribeEthnicGroup"
                    name="tribeEthnicGroup"
                    value={person.tribeEthnicGroup || ""}
                    onChange={handleChange}
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
            <Typography
              style={{
                fontSize: "20px",
                color: mainButtonColor,
                fontWeight: "bold",
              }}
            >
              Contact Information:
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />



            <Box display="flex" gap={2} mb={2}>
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Contact Number:<span style={{ color: "red" }}> *</span>
                </Typography>

                <TextField

                  fullWidth
                  size="small"
                  name="cellphoneNumber"
                  placeholder="9XXXXXXXXX"
                  value={person.cellphoneNumber || ""}
                  onChange={(e) => {
                    const onlyNumbers = e.target.value.replace(/\D/g, ""); // remove letters
                    handleChange({
                      target: {
                        name: "cellphoneNumber",
                        value: onlyNumbers,
                      },
                    });
                  }}
                  error={!!errors.cellphoneNumber}
                  helperText={
                    errors.cellphoneNumber && "This field is required."
                  }
                  InputProps={{
                    readOnly: true,
                    startAdornment: (
                      <Typography sx={{ mr: 1, fontWeight: "bold" }}>
                        +63
                      </Typography>
                    ),
                  }}
                />
              </Box>

              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Email Address:<span style={{ color: "red" }}> *</span>
                </Typography>

                <TextField
                  InputProps={{
                    readOnly: true,
                  }}
                  fullWidth
                  size="small"
                  name="emailAddress"
                  required
                  value={person.emailAddress || ""}
                  placeholder="Your registered email"

                  sx={{
                    backgroundColor: "#f0f0f0",
                  }}
                />
              </Box>

              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Facebook Account:<span style={{ color: "red" }}> *</span>
                </Typography>

                <TextField
                  InputProps={{
                    readOnly: true,
                  }}
                  fullWidth
                  size="small"
                  name="facebook_account"
                  placeholder="Enter Facebook Profile Name/Link"
                  value={person.facebook_account || ""}
                  onChange={handleChange}
                  error={!!errors.facebook_account}
                  helperText={errors.facebook_account ? "This field is required." : ""}
                />
              </Box>
            </Box>


            <Typography
              style={{
                fontSize: "20px",
                color: mainButtonColor,
                fontWeight: "bold",
              }}
            >
              Present Address:
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />
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
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Present Street
                </Typography>
                <TextField
                  fullWidth
                  InputProps={{ readOnly: true }}
                  size="small"
                  name="presentStreet"
                  value={person.presentStreet || ""}
                  placeholder="Enter your Present Street"
                  onChange={handleChange}
                  error={!!errors.presentStreet}
                  helperText={errors.presentStreet && "This field is required."}
                />
              </Box>

              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Present Zip Code
                </Typography>
                <TextField
                  fullWidth
                  InputProps={{ readOnly: true }}
                  type="number"
                  size="small"
                  name="presentZipCode"
                  placeholder="Enter your Zip Code"
                  value={person.presentZipCode || ""}
                  onChange={handleChange}
                  error={!!errors.presentZipCode}
                  helperText={
                    errors.presentZipCode && "This field is required."
                  }
                />
              </Box>
            </Box>

            <Box display="flex" gap={2} mb={2}>
              {/* REGION */}
              <FormControl
                fullWidth
                size="small"
                required
                error={!!errors.presentRegion}
              >
                <Typography mb={1} fontWeight="medium">
                  Present Region
                </Typography>

                <Select
                  name="presentRegion"
                  displayEmpty
                  readOnly
                  value={person.presentRegion || ""}
                  onChange={(e) => {
                    handleChange(e);
                    setSelectedRegion(e.target.value);
                    setSelectedProvince("");
                    setSelectedCity("");
                    setSelectedBarangay("");
                    setProvinceList([]);
                    setCityList([]);
                    setBarangayList([]);
                  }}
                >
                  <MenuItem value="">
                    <em>Select Region</em>
                  </MenuItem>

                  {regionList.map((region) => (
                    <MenuItem
                      key={region.region_code}
                      value={region.region_name}
                    >
                      {region.region_name}
                    </MenuItem>
                  ))}
                </Select>

                {errors.presentRegion && (
                  <FormHelperText>This field is required.</FormHelperText>
                )}
              </FormControl>

              {/* PROVINCE */}
              <FormControl
                fullWidth
                size="small"
                required
                error={!!errors.presentProvince}
              >
                <Typography mb={1} fontWeight="medium">
                  Present Province
                </Typography>

                <Select
                  readOnly
                  name="presentProvince"
                  displayEmpty
                  value={person.presentProvince || ""}
                  onChange={(e) => {
                    handleChange(e);
                    setSelectedProvince(e.target.value);
                    setSelectedCity("");
                    setSelectedBarangay("");
                    setCityList([]);
                    setBarangayList([]);
                  }}
                  disabled={!person.presentRegion}
                >
                  <MenuItem value="">
                    <em>Select Province</em>
                  </MenuItem>

                  {provinceList.map((province) => (
                    <MenuItem
                      key={province.province_code}
                      value={province.province_name}
                    >
                      {province.province_name}
                    </MenuItem>
                  ))}
                </Select>

                {errors.presentProvince && (
                  <FormHelperText>This field is required.</FormHelperText>
                )}
              </FormControl>
            </Box>

            {/* MUNICIPALITY & BARANGAY */}
            <Box display="flex" gap={2} mb={2}>
              {/* MUNICIPALITY */}
              <FormControl
                fullWidth
                size="small"
                required
                error={!!errors.presentMunicipality}
              >
                <Typography mb={1} fontWeight="medium">
                  Present Municipality
                </Typography>

                <Select
                  readOnly
                  name="presentMunicipality"
                  displayEmpty
                  value={person.presentMunicipality || ""}
                  onChange={(e) => {
                    handleChange(e);
                    setSelectedCity(e.target.value);
                    setSelectedBarangay("");
                    setBarangayList([]);
                  }}
                  disabled={!person.presentProvince}
                >
                  <MenuItem value="">
                    <em>Select Municipality</em>
                  </MenuItem>

                  {cityList.map((city) => (
                    <MenuItem key={city.city_code} value={city.city_name}>
                      {city.city_name}
                    </MenuItem>
                  ))}
                </Select>

                {errors.presentMunicipality && (
                  <FormHelperText>This field is required.</FormHelperText>
                )}
              </FormControl>

              {/* BARANGAY */}
              <FormControl
                fullWidth
                size="small"
                required
                error={!!errors.presentBarangay}
              >
                <Typography mb={1} fontWeight="medium">
                  Present Barangay
                </Typography>

                <Select
                  readOnly
                  name="presentBarangay"
                  displayEmpty
                  value={person.presentBarangay || ""}
                  onChange={(e) => {
                    handleChange(e);
                    setSelectedBarangay(e.target.value);
                  }}
                  disabled={!person.presentMunicipality}
                >
                  <MenuItem value="">
                    <em>Select Barangay</em>
                  </MenuItem>

                  {barangayList.map((brgy) => (
                    <MenuItem key={brgy.brgy_code} value={brgy.brgy_name}>
                      {brgy.brgy_name}
                    </MenuItem>
                  ))}
                </Select>

                {errors.presentBarangay && (
                  <FormHelperText>This field is required.</FormHelperText>
                )}
              </FormControl>
            </Box>

            {/* DSWD Household Number */}
            <Box mb={2}>
              <Typography mb={1} fontWeight="medium">
                Present DSWD Household Number
              </Typography>
              <TextField
                InputProps={{ readOnly: true }}
                fullWidth
                size="small"
                name="presentDswdHouseholdNumber"
                value={person.presentDswdHouseholdNumber || ""}
                onChange={handleChange}
                placeholder="Enter your Present DSWD Household Number"
                error={!!errors.presentDswdHouseholdNumber}
                helperText={
                  errors.presentDswdHouseholdNumber && "This field is required."
                }
              />
            </Box>

            <Typography
              style={{
                fontSize: "20px",
                color: mainButtonColor,
                fontWeight: "bold",
              }}
            >
              Permanent Address:
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <FormControlLabel
              control={
                <Checkbox
                  disabled
                  name="sameAsPresentAddress"
                  checked={person.sameAsPresentAddress === 1}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const updatedPerson = {
                      ...person,
                      sameAsPresentAddress: checked ? 1 : 0,
                    };

                    if (checked) {
                      updatedPerson.permanentStreet = person.presentStreet;
                      updatedPerson.permanentZipCode = person.presentZipCode;
                      updatedPerson.permanentRegion = person.presentRegion;
                      updatedPerson.permanentProvince = person.presentProvince;
                      updatedPerson.permanentMunicipality =
                        person.presentMunicipality;
                      updatedPerson.permanentBarangay = person.presentBarangay;
                      updatedPerson.permanentDswdHouseholdNumber =
                        person.presentDswdHouseholdNumber;

                      setPermanentRegion(person.presentRegion);
                      setPermanentProvince(person.presentProvince);
                      setPermanentCity(person.presentMunicipality);
                      setPermanentBarangay(person.presentBarangay);
                    }

                    setPerson(updatedPerson);
                  }}
                />
              }
              label="Same as Present Address"
            />

            <Box display="flex" gap={2} mb={2}>
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Permanent Street
                </Typography>
                <TextField
                  InputProps={{ readOnly: true }}
                  fullWidth
                  size="small"
                  name="permanentStreet"
                  placeholder="Enter your Permanent Street"
                  value={person.permanentStreet || ""}
                  onChange={handleChange}
                  error={!!errors.permanentStreet}
                  helperText={
                    errors.permanentStreet && "This field is required."
                  }
                />
              </Box>

              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Permanent Zip Code
                </Typography>
                <TextField
                  InputProps={{ readOnly: true }}
                  fullWidth
                  size="small"
                  type="number"
                  name="permanentZipCode"
                  placeholder="Enter your Permanent Zip Code"
                  value={person.permanentZipCode || ""}
                  onChange={handleChange}
                  error={!!errors.permanentZipCode}
                  helperText={
                    errors.permanentZipCode && "This field is required."
                  }
                />
              </Box>
            </Box>

            {/* Permanent Region & Province */}
            <Box display="flex" gap={2} mb={2}>
              {/* Permanent Region */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Permanent Region
                </Typography>
                <FormControl
                  fullWidth
                  size="small"
                  required
                  error={!!errors.permanentRegion}
                >
                  <Select
                    readOnly
                    name="permanentRegion"
                    displayEmpty
                    value={person.permanentRegion || ""}
                    onChange={(e) => {
                      handleChange(e);
                      setPermanentRegion(e.target.value);
                      setPermanentProvince("");
                      setPermanentCity("");
                      setPermanentBarangay("");
                      setPermanentProvinceList([]);
                      setPermanentCityList([]);
                      setPermanentBarangayList([]);
                    }}
                  >
                    <MenuItem value="">
                      <em>Select Region</em>
                    </MenuItem>

                    {permanentRegionList.map((region) => (
                      <MenuItem
                        key={region.region_code}
                        value={region.region_name}
                      >
                        {region.region_name}
                      </MenuItem>
                    ))}
                  </Select>

                  {errors.permanentRegion && (
                    <FormHelperText error>
                      This field is required.
                    </FormHelperText>
                  )}
                </FormControl>
              </Box>

              {/* Permanent Province */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Permanent Province
                </Typography>
                <FormControl
                  fullWidth
                  size="small"
                  required
                  error={!!errors.permanentProvince}
                >
                  <Select
                    readOnly
                    name="permanentProvince"
                    displayEmpty
                    value={person.permanentProvince || ""}
                    onChange={(e) => {
                      handleChange(e);
                      setPermanentProvince(e.target.value);
                      setPermanentCity("");
                      setPermanentBarangay("");
                      setPermanentCityList([]);
                      setPermanentBarangayList([]);
                    }}
                    disabled={!person.permanentRegion}
                  >
                    <MenuItem value="">
                      <em>Select Province</em>
                    </MenuItem>

                    {permanentProvinceList.map((province) => (
                      <MenuItem
                        key={province.province_code}
                        value={province.province_name}
                      >
                        {province.province_name}
                      </MenuItem>
                    ))}
                  </Select>

                  {errors.permanentProvince && (
                    <FormHelperText error>
                      This field is required.
                    </FormHelperText>
                  )}
                </FormControl>
              </Box>
            </Box>

            {/* Permanent Municipality & Barangay */}
            <Box display="flex" gap={2} mb={2}>
              {/* Permanent Municipality */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Permanent Municipality
                </Typography>
                <FormControl
                  fullWidth
                  size="small"
                  required
                  error={!!errors.permanentMunicipality}
                >
                  <Select
                    readOnly
                    name="permanentMunicipality"
                    displayEmpty
                    value={person.permanentMunicipality || ""}
                    onChange={(e) => {
                      handleChange(e);
                      setPermanentCity(e.target.value);
                      setPermanentBarangay("");
                      setPermanentBarangayList([]);
                    }}
                    disabled={!person.permanentProvince}
                  >
                    <MenuItem value="">
                      <em>Select Municipality</em>
                    </MenuItem>

                    {permanentCityList.map((city) => (
                      <MenuItem key={city.city_code} value={city.city_name}>
                        {city.city_name}
                      </MenuItem>
                    ))}
                  </Select>

                  {errors.permanentMunicipality && (
                    <FormHelperText error>
                      This field is required.
                    </FormHelperText>
                  )}
                </FormControl>
              </Box>

              {/* Permanent Barangay */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Permanent Barangay
                </Typography>
                <FormControl
                  fullWidth
                  size="small"
                  required
                  error={!!errors.permanentBarangay}
                >
                  <Select
                    readOnly
                    name="permanentBarangay"
                    displayEmpty
                    value={person.permanentBarangay || ""}
                    onChange={(e) => {
                      handleChange(e);
                      setPermanentBarangay(e.target.value);
                    }}
                    disabled={!person.permanentMunicipality}
                  >
                    <MenuItem value="">
                      <em>Select Barangay</em>
                    </MenuItem>

                    {permanentBarangayList.map((brgy) => (
                      <MenuItem key={brgy.brgy_code} value={brgy.brgy_name}>
                        {brgy.brgy_name}
                      </MenuItem>
                    ))}
                  </Select>

                  {errors.permanentBarangay && (
                    <FormHelperText error>
                      This field is required.
                    </FormHelperText>
                  )}
                </FormControl>
              </Box>
            </Box>



            {/* DSWD Household Number */}
            <Box mb={2}>
              <Typography mb={1} fontWeight="medium">
                Permanent DSWD Household Number
              </Typography>
              <TextField
                InputProps={{ readOnly: true }}
                fullWidth
                size="small"
                variant="outlined"
                placeholder="Enter your Permanent DSWD Household Number"
                name="permanentDswdHouseholdNumber"
                value={person.permanentDswdHouseholdNumber || ""}
                onChange={handleChange}
                error={!!errors.permanentDswdHouseholdNumber}
                helperText={
                  errors.permanentDswdHouseholdNumber &&
                  "This field is required."
                }
              />
            </Box>

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
                      bgcolor: headerColor,
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
                              disabled
                              size="small"
                              onClick={async () => {
                                setSelectedFile(null);
                                setPreview(null);

                                const updatedPerson = { ...person, profile_img: "" };
                                setPerson(updatedPerson);
                                await handleUpdate(updatedPerson);

                                setSnack({
                                  open: true,
                                  message: "Image removed successfully.",
                                  severity: "info",
                                });
                              }}
                              sx={{
                                position: "absolute",
                                top: -8,
                                right: "calc(50% - 96px)",
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
                      disabled
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

            <Modal
              open={examPermitModalOpen}
              onClose={handleCloseExamPermitModal}
              aria-labelledby="exam-permit-error-title"
              aria-describedby="exam-permit-error-description"
            >
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 400,
                  bgcolor: "background.paper",
                  border: `1px solid ${borderColor}`,
                  boxShadow: 24,
                  p: 4,
                  borderRadius: 2,
                  textAlign: "center",
                }}
              >
                <ErrorIcon
                  sx={{ color: mainButtonColor, fontSize: 50, mb: 2 }}
                />
                <Typography
                  id="exam-permit-error-title"
                  variant="h6"
                  component="h2"
                  color="maroon"
                >
                  Exam Permit Notice
                </Typography>
                <Typography id="exam-permit-error-description" sx={{ mt: 2 }}>
                  {examPermitError}
                </Typography>
                <Button
                  onClick={handleCloseExamPermitModal}
                  variant="contained"
                  sx={{
                    mt: 3,
                    backgroundcolor: mainButtonColor,
                    "&:hover": { backgroundColor: "#8B0000" },
                  }}
                >
                  Close
                </Button>
              </Box>
            </Modal>

            <Box display="flex" justifyContent="right" mt={4}>
              {/* Previous Page Button */}

              <Button
                variant="contained"
                onClick={handleOpen}
                sx={{
                  backgroundColor: mainButtonColor,
                  border: `1px solid ${borderColor}`,

                  color: "#fff", // Set text color to white
                  marginRight: "5px", // Add margin between buttons
                  "&:hover": {
                    backgroundColor: "#000000", // Adjust hover color to match
                  },
                  display: "flex", // Ensure icon and text are aligned
                  alignItems: "center", // Center the content vertically
                }}
              >
                <PhotoCameraIcon sx={{ marginRight: "8px" }} />{" "}
                {/* Photo Icon */}
                Upload Photo <br /> Student Picture
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  navigate(`/student_registrar_family_background?person_id=${userID}`);
                }}
                endIcon={
                  <ArrowForwardIcon
                    sx={{
                      color: "#fff",
                      transition: "color 0.3s",
                    }}
                  />
                }
                sx={{
                  backgroundColor: mainButtonColor,
                  border: `1px solid ${borderColor}`,
                  color: "#fff",
                  "&:hover": {
                    backgroundColor: "#000000",
                    color: "#fff",
                    "& .MuiSvgIcon-root": {
                      color: "#fff",
                    },
                  },
                }}
              >
                Next Step
              </Button>
            </Box>
          </Container>
        </form>
      </Container>

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

export default StudentRegistrarPersonalInformation;
