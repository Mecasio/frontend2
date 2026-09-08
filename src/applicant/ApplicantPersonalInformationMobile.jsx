import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
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
  Modal,
  IconButton,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
  CircularProgress,
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
import ExamPermit from "./ExamPermit";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FormalExample from "../assets/formalexample.png";
import PersonalDataForm from "./PersonalDataForm";
import OfficeOfTheRegistrar from "./OfficeOfTheRegistrar";
import AdmissionServices from "./ApplicantServicesSurvey";
import ECATApplicationForm from "./ECATApplicationForm";

// ─── Reusable field components (responsive) ──────────────────────────────────
const Field = ({ label, required, error, helperText, children }) => (
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
      </label>
    )}
    {children}
    {error && helperText && (
      <div style={{ color: "#d32f2f", fontSize: 11, marginTop: 3 }}>{helperText}</div>
    )}
  </div>
);

const inputStyle = (hasError, extra = {}) => ({
  width: "100%",
  height: 42,
  padding: "0 12px",
  border: `1px solid ${hasError ? "#d32f2f" : "#ccc"}`,
  borderRadius: 8,
  fontSize: "clamp(13px, 1.6vw, 14px)",
  backgroundColor: "#fff",
  boxSizing: "border-box",
  outline: "none",
  color: "#222",
  appearance: "none",
  WebkitAppearance: "none",
  ...extra,
});

const selectStyle = (hasError) => ({
  ...inputStyle(hasError),
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23666' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: 32,
});

const MInput = ({ error, style, ...props }) => (
  <input style={{ ...inputStyle(error), ...style }} {...props} />
);

const MSelect = ({ error, style, children, ...props }) => (
  <select style={{ ...selectStyle(error), ...style }} {...props}>
    {children}
  </select>
);

const CheckRow = ({ checked, onChange, name, children }) => (
  <label
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
      fontSize: "clamp(12px, 1.5vw, 14px)",
      color: "#333",
      cursor: "pointer",
    }}
  >
    <input
      type="checkbox"
      name={name}
      checked={checked}
      onChange={onChange}
      style={{ width: 18, height: 18, accentColor: "#6D2323", cursor: "pointer" }}
    />
    {children}
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

const btnPrimaryStyle = {
  height: 46,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ApplicantPersonalInformationMobile = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const navigate = useNavigate();
  const theme = useTheme();

  // Breakpoints: phone < 600px, tablet 600–959px, desktop >= 960px
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const gridCols2 = { display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr", gap: 16 };

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
  const [userRole, setUserRole] = useState("");
  const [person, setPerson] = useState({
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
        const res = await axios.get(`${API_BASE_URL}/api/year-levels`);
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
        const availRes = await axios.get(`${API_BASE_URL}/api/programs/availability`, {
          params: { year_id: activeYear.year_id, semester_id: activeYear.semester_id },
        });
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

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "warning" });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const showSnackbar = (message, severity = "warning") => {
    setSnackbar({ open: true, message, severity });
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem("applicantEmail");
    const savedFirst = localStorage.getItem("first_name");
    const savedLast = localStorage.getItem("last_name");
    const savedMiddle = localStorage.getItem("middle_name");
    const savedBirth = localStorage.getItem("birthOfDate");

    setPerson((prev) => ({
      ...prev,
      emailAddress: savedEmail || "",
      first_name: savedFirst || "",
      last_name: savedLast || "",
      middle_name: savedMiddle || "",
      birthOfDate: savedBirth || "",
      age: savedBirth ? calculateAge(savedBirth) : "",
    }));
  }, []);

  useEffect(() => {
    if (person.birthOfDate) {
      setPerson((prev) => ({ ...prev, age: calculateAge(prev.birthOfDate) }));
    }
  }, [person.birthOfDate]);

  const keys = JSON.parse(localStorage.getItem("dashboardKeys") || "{}");

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");

    if (keys.step1) {
      navigate(`/applicant_personal_information/${keys.step1}`);
    }

    const overrideId = undefined;

    if (overrideId) {
      setUserRole("superadmin");
      setUserID(overrideId);
      fetchPersonData(overrideId);
      return;
    }

    if (storedUser && storedRole && storedID) {
      setUserRole(storedRole);
      setUserID(storedID);

      if (storedRole === "applicant") {
        fetchPersonData(storedID);
      } else {
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const stepsWithPaths = [
    { label: "Personal Information", icon: <PersonIcon />, path: `/applicant_personal_information/${keys.step1}` },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: `/applicant_family_background/${keys.step2}` },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: `/applicant_educational_attainment/${keys.step3}` },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: `/applicant_health_medical_records/${keys.step4}` },
    { label: "Other Information", icon: <InfoIcon />, path: `/applicant_other_information/${keys.step5}` },
  ];

  const [activeStep, setActiveStep] = useState(0);
  const [clickedSteps, setClickedSteps] = useState(Array(stepsWithPaths.length).fill(false));

  const fetchPersonData = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/person/${id}`);
      setPerson(res.data);
    } catch (error) { }
  };

  const handleUpdate = async (updatedPerson) => {
    try {
      if (!updatedPerson || Object.keys(updatedPerson).length === 0) {
        console.warn("No data to update — skipping request.");
        return;
      }
      await axios.put(`${API_BASE_URL}/api/person/${userID}`, updatedPerson);
    } catch (error) {
      console.error("Auto-save failed:", error.response?.data || error.message);
    }
  };

  const parseISODate = (dateString) => {
    if (!dateString) return null;
    const [y, m, d] = dateString.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  };

  const getManilaDate = () => {
    const now = new Date();
    const manilaString = now.toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
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
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }
    return age < 0 ? "" : age;
  };

  const handleChange = (e) => {
    const target = e && e.target ? e.target : {};
    const { name, type, checked, value } = target;

    if (name === "program" && person.program && String(value) !== String(person.program)) {
      showSnackbar("Curriculum selected during registration cannot be changed.");
      return;
    }

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

    if (name === "campus" || name === "academicProgram") {
      updatedPerson.program = "";
    }

    // ✅ NEW — clear spouse if civil status changes away from Married
    if (name === "civilStatus" && value !== "Married") {
      updatedPerson.spouse = "";
    }

    setPerson(updatedPerson);
    handleUpdate(updatedPerson);

    setPerson(updatedPerson);
    handleUpdate(updatedPerson);
  };

  const handleBlur = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/person/${userID}`, person);
    } catch (err) {
      console.error("Auto-save failed", err);
    }
  };

  const autoSave = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/person/${userID}`, person);
    } catch (err) {
      console.error("Auto-save failed.");
    }
  };

  const [uploadedImage, setUploadedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    const maxSizeInBytes = 2 * 1024 * 1024;
    if (!validTypes.includes(file.type)) {
      setSnackbar({ open: true, message: "Invalid file type. Please select a JPEG or PNG file.", severity: "error" });
      setSelectedFile(null);
      setPreview(null);
      return;
    }
    if (file.size > maxSizeInBytes) {
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

  const MAX_SIZE = 2 * 1024 * 1024;

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
      const response = await axios.post(`${API_BASE_URL}/api/upload-profile-picture`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const fileName = response.data.filename || response.data.profile_img;
      const updatedPerson = { ...person, profile_img: fileName };
      setPerson(updatedPerson);
      await handleUpdate(updatedPerson);
      setUploadedImage(`${API_BASE_URL}/uploads/${fileName}`);
      setSnackbar({ open: true, message: "Upload successful!", severity: "success" });
      setUploadModalOpen(false);
      setSelectedFile(null);
      setPreview(null);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || "Upload failed.";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    }
  };

  const [isLrnNA, setIsLrnNA] = useState(false);

  // ── Address states ────────────────────────────────────────────────────────
  const [regionList, setRegionList] = useState([]);
  const [provinceList, setProvinceList] = useState([]);
  const [cityList, setCityList] = useState([]);
  const [barangayList, setBarangayList] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedBarangay, setSelectedBarangay] = useState("");

  useEffect(() => {
    setRegionList(regions);
  }, []);

  useEffect(() => {
    const region = regions.find((r) => r.region_name === selectedRegion);
    if (region) {
      setProvinceList(provinces.filter((p) => p.region_code === region.region_code));
    } else {
      setProvinceList([]);
    }
  }, [selectedRegion]);

  useEffect(() => {
    const province = provinces.find((p) => p.province_name === selectedProvince);
    if (province) {
      setCityList(cities.filter((c) => c.province_code === province.province_code));
    } else {
      setCityList([]);
    }
  }, [selectedProvince]);

  useEffect(() => {
    const city = cities.find((c) => c.city_name === selectedCity);
    if (city) {
      setBarangayList(barangays.filter((b) => b.city_code === city.city_code));
    } else {
      setBarangayList([]);
    }
  }, [selectedCity]);

  useEffect(() => {
    const region = regions.find((r) => r.region_name === person.presentRegion);
    if (region) {
      setProvinceList(provinces.filter((p) => p.region_code === region.region_code));
    } else {
      setProvinceList([]);
    }
  }, [person.presentRegion]);

  useEffect(() => {
    const province = provinces.find((p) => p.province_name === person.presentProvince);
    if (province) {
      setCityList(cities.filter((c) => c.province_code === province.province_code));
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

  const [permanentRegionList, setPermanentRegionList] = useState([]);
  const [permanentProvinceList, setPermanentProvinceList] = useState([]);
  const [permanentCityList, setPermanentCityList] = useState([]);
  const [permanentBarangayList, setPermanentBarangayList] = useState([]);
  const [permanentRegion, setPermanentRegion] = useState("");
  const [permanentProvince, setPermanentProvince] = useState("");
  const [permanentCity, setPermanentCity] = useState("");
  const [permanentBarangay, setPermanentBarangay] = useState("");

  useEffect(() => {
    setPermanentRegionList(regions);
  }, []);

  useEffect(() => {
    const region = regions.find((r) => r.region_name === person.permanentRegion);
    if (region) {
      setPermanentProvinceList(provinces.filter((p) => p.region_code === region.region_code));
    } else {
      setPermanentProvinceList([]);
    }
  }, [person.permanentRegion]);

  useEffect(() => {
    const province = provinces.find((p) => p.province_name === person.permanentProvince);
    if (province) {
      setPermanentCityList(cities.filter((c) => c.province_code === province.province_code));
    } else {
      setPermanentCityList([]);
    }
  }, [person.permanentProvince]);

  useEffect(() => {
    const city = cities.find((c) => c.city_name === person.permanentMunicipality);
    if (city) {
      setPermanentBarangayList(barangays.filter((b) => b.city_code === city.city_code));
    } else {
      setPermanentBarangayList([]);
    }
  }, [person.permanentMunicipality]);

  const [curriculumOptions, setCurriculumOptions] = useState([]);

  useEffect(() => {
    const fetchCurriculums = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/applied_program`);
        setCurriculumOptions(response.data);
      } catch (error) {
        console.error("Error fetching curriculum options:", error);
      }
    };
    fetchCurriculums();
  }, []);

  const filteredCurriculum = curriculumOptions.filter((item) => {
    const isSelected =
      String(item.curriculum_id) === String(person.program) ||
      String(item.curriculum_id) === String(person.program2) ||
      String(item.curriculum_id) === String(person.program3);
    const eStatus =
      availabilityMap[item.curriculum_id]?.e_status ?? Number(item.e_status ?? 0);
    if (!isSelected && eStatus === 1) return false;

    if (person.campus !== "" && person.campus !== null) {
      if (Number(item.components) !== Number(person.campus)) return false;
    }
    if (person.academicProgram !== "" && person.academicProgram !== null) {
      if (Number(item.academic_program) !== Number(person.academicProgram)) return false;
    }
    return true;
  });

  const [errors, setErrors] = useState({});

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

    let newErrors = {};
    let isValid = true;

    requiredFields.forEach((field) => {
      const value = person[field];
      if (
        value === null ||
        value === undefined ||
        value === "" ||
        value === "null" ||
        value === "undefined"
      ) {
        newErrors[field] = true;
        isValid = false;
      }
    });

    const emailValue = person.emailAddress?.trim();
    const emailPattern = /^[^@]+@[^@]+\.[^@]+$/;
    if (!emailValue || !emailPattern.test(emailValue)) {
      newErrors.emailAddress = true;
      isValid = false;
    }

    if (!isLrnNA) {
      const lrnValue = person.lrnNumber?.toString().trim();
      if (!lrnValue) {
        newErrors.lrnNumber = true;
        isValid = false;
      }
    }

    if (person.presentDswdChecked === 1) {
      const value = person.presentDswdHouseholdNumber?.trim();
      if (!value) {
        newErrors.presentDswdHouseholdNumber = true;
        isValid = false;
      }
    }

    if (person.civilStatus === "Married") {
      requiredFields.push("spouse");
    }


    if (person.permanentDswdChecked === 1) {
      const value = person.permanentDswdHouseholdNumber?.trim();
      if (!value) {
        newErrors.permanentDswdHouseholdNumber = true;
        isValid = false;
      }
    }

    if (person.pwdMember === 1) {
      if (!person.pwdType?.toString().trim()) {
        newErrors.pwdType = true;
        isValid = false;
      }
      if (!person.pwdId?.toString().trim()) {
        newErrors.pwdId = true;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const divToPrintRef = useRef();
  const [showPrintView, setShowPrintView] = useState(false);
  const [examPermitError, setExamPermitError] = useState("");
  const [examPermitModalOpen, setExamPermitModalOpen] = useState(false);
  const [canPrintPermit, setCanPrintPermit] = useState(false);

  const handleCloseExamPermitModal = () => {
    setExamPermitModalOpen(false);
    setExamPermitError("");
  };

  const printDiv = () => {
    const divToPrint = divToPrintRef.current;
    if (divToPrint) {
      const newWin = window.open("", "Print-Window");
      newWin.document.open();
      newWin.document.write(`
        <html>
          <head>
            <title>Examination Permit</title>
            <style>
              @page { size: A4; margin: 0; }
              body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              .print-container { width: 8.5in; min-height: 11in; margin: auto; background: white; }
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            </style>
          </head>
          <body onload="window.print(); setTimeout(() => window.close(), 100);">
            <div class="print-container">${divToPrint.innerHTML}</div>
          </body>
        </html>
      `);
      newWin.document.close();
    }
  };

  // ── Unified "which card is generating" state ────────────────────────────
  const [generatingKey, setGeneratingKey] = useState(null); // e.g. "ecat" | "personalData" | ...
  const hiddenFormRef = useRef();

  const FORM_CONFIGS = {
    ecat: {
      label: "ECAT Application Form",
      endpoint: "/api/generate-ecat-form-pdf",
      filenamePrefix: "ECAT_Application_Form",
      Component: ECATApplicationForm,
    },
    personalData: {
      label: "Personal Data Form",
      endpoint: "/api/generate-personal-data-form-pdf",
      filenamePrefix: "Personal_Data_Form",
      Component: PersonalDataForm,
    },
    registrar: {
      label: "Office of the Registrar",
      endpoint: "/api/generate-registrar-form-pdf",
      filenamePrefix: "Office_Of_The_Registrar",
      Component: OfficeOfTheRegistrar,
    },
    admissionServices: {
      label: "Application/Student Satisfactory Survey",
      endpoint: "/api/generate-admission-services-pdf",
      filenamePrefix: "Admission_Services_CSM_Form",
      Component: AdmissionServices,
      dateStamped: true,
    },
  };

  const buildClientFilename = (prefix, { lastName, firstName, applicantNumber }) => {
    const safeLast = (lastName || "Applicant").trim().replace(/\s+/g, "_");
    const safeFirst = (firstName || "").trim().replace(/\s+/g, "_");
    const suffix = applicantNumber ? `_${applicantNumber}` : "";
    return `${prefix}_${safeLast}${safeFirst ? "_" + safeFirst : ""}${suffix}.pdf`;
  };

  const generateFormPdf = async (key) => {
    const config = FORM_CONFIGS[key];
    if (!config || generatingKey) return; // ignore clicks while something's already generating

    // ✅ NEW — block printing until Terms of Agreement step is completed
    if (person.termsOfAgreement !== 1) {
      setSnackbar({
        open: true,
        message:
          "⚠️ Please complete all steps and accept the Terms of Agreement before printing your documents.",
        severity: "warning",
      });
      return;
    }

    setGeneratingKey(key);

    try {
      // Give the hidden component time to mount AND finish its own internal
      // fetches (person data, curriculum options, active school year, etc.)
      // before we read its rendered HTML — same trick as downloadExamPermitPDF.
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
        },
        { responseType: "blob" },
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
      setSnackbar({
        open: true,
        message: `⚠️ Unable to generate ${config.label} PDF right now.`,
        severity: "error",
      });
    } finally {
      setGeneratingKey(null);
    }
  };

  const downloadExamPermitPDF = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/verified-exam-applicants`);
      const verified = res.data.some((a) => a.person_id === parseInt(userID));

      if (!verified) {
        setExamPermitError("❌ You cannot download the Exam Permit until all required documents are verified.");
        setExamPermitModalOpen(true);
        return;
      }

      setGeneratingKey("examPermitDownload"); // unified spinner
      setShowPrintView(true);
      await new Promise((resolve) => setTimeout(resolve, 800));

      const divToPrint = divToPrintRef.current;
      if (!divToPrint) throw new Error("Exam permit content did not render in time.");

      const applicantRes = await axios.get(`${API_BASE_URL}/api/applicant_number/${userID}`);
      const applicantNumber = applicantRes.data?.applicant_number || "";

      const response = await axios.post(
        `${API_BASE_URL}/api/generate-exam-permit-pdf`,
        {
          html: divToPrint.innerHTML,
          applicant_number: applicantNumber,
          last_name: person?.last_name || "",
          first_name: person?.first_name || "",
        },
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const lastName = (person?.last_name || "Applicant").trim().replace(/\s+/g, "_");
      const firstName = (person?.first_name || "").trim().replace(/\s+/g, "_");
      const applicantNo = applicantNumber ? `_${applicantNumber}` : "";
      const fileName = `Exam_Permit_${lastName}${firstName ? "_" + firstName : ""}${applicantNo}.pdf`;

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading exam permit PDF:", err);
      setExamPermitError("⚠️ Unable to generate the Exam Permit PDF right now.");
      setExamPermitModalOpen(true);
    } finally {
      setShowPrintView(false);
      setGeneratingKey(null);
    }
  };

  const handleExamPermitClick = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/verified-exam-applicants`);
      const verified = res.data.some((a) => a.person_id === parseInt(userID));
      if (!verified) {
        setExamPermitError("❌ You cannot print the Exam Permit until all required documents are verified.");
        setExamPermitModalOpen(true);
        return;
      }
      setShowPrintView(true);
      setTimeout(() => {
        printDiv();
        setShowPrintView(false);
      }, 500);
    } catch (err) {
      console.error("Error verifying exam permit eligibility:", err);
      setExamPermitError("⚠️ Unable to check document verification status right now.");
      setExamPermitModalOpen(true);
    }
  };

  useEffect(() => {
    if (!userID) return;
    axios.get(`${API_BASE_URL}/api/verified-exam-applicants`).then((res) => {
      const verified = res.data.some((a) => a.person_id === parseInt(userID));
      setCanPrintPermit(verified);
    });
  }, [userID]);

  // ── Links (now generate real PDFs, same as the desktop/web version) ─────
  const links = [
    { key: "ecat", label: "ECAT Application Form", onClick: () => generateFormPdf("ecat") },
    { key: "personalData", label: "Personal Data Form", onClick: () => generateFormPdf("personalData") },
    {
      key: "registrar",
      label: `Application For ${shortTerm ? shortTerm.toUpperCase() : ""} College Admission`,
      onClick: () => generateFormPdf("registrar"),
    },
    {
      key: "admissionServices",
      label: "Application/Student Satisfactory Survey",
      onClick: () => generateFormPdf("admissionServices"),
    },
    { key: "examPermitDownload", label: "Examination Permit", onClick: downloadExamPermitPDF },
  ];

  const handleNext = (e) => {
    handleUpdate(person);
    if (isFormValid()) {
      showSnackbar("Your record has been saved successfully!", "success");
      setTimeout(() => navigate(`/applicant_family_background/${keys.step2}`), 1000);
    } else {
      showSnackbar("Please complete all required fields before proceeding.");
    }
  };

  const handleStepClick = (index) => {
    if (isFormValid()) {
      setActiveStep(index);
      const newClickedSteps = [...clickedSteps];
      newClickedSteps[index] = true;
      setClickedSteps(newClickedSteps);
      showSnackbar("Your record has been saved successfully!", "success");
      setTimeout(() => navigate(stepsWithPaths[index].path), 1000);
    } else {
      showSnackbar("Please fill all required fields before proceeding.", "error");
    }
  };

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

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        fontFamily: "'Segoe UI', sans-serif",
        pb: { xs: 8, md: 4 },
      }}
    >
      {/* Hidden print target for Exam Permit PDF generation */}
      {showPrintView && (
        <div ref={divToPrintRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <ExamPermit />
        </div>
      )}

      {/* Hidden form target used to render the HTML sent to the PDF backend */}
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
            {links.map((lnk, i) => {
              const isGenerating = generatingKey === lnk.key;
              const disabled = generatingKey !== null;

              return (
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
                      cursor: disabled ? "default" : "pointer",
                      opacity: disabled && !isGenerating ? 0.5 : 1,
                      pointerEvents: disabled ? "none" : "auto",
                      transition: "all 0.25s ease-in-out",
                      "&:hover": !disabled && {
                        transform: { md: "scale(1.04)" },
                        backgroundColor: headerColor || "#6D2323",
                        "& .chip-icon": { color: "#fff" },
                        "& .chip-text": { color: "#fff" },
                      },
                    }}
                    onClick={() => {
                      if (disabled) return;
                      if (lnk.onClick) lnk.onClick();
                      else if (lnk.to) navigate(lnk.to);
                    }}
                  >
                    {isGenerating ? (
                      <CircularProgress size={20} sx={{ color: mainButtonColor || "#6D2323" }} />
                    ) : (
                      <PictureAsPdfIcon className="chip-icon" sx={{ fontSize: { xs: 18, md: 22 }, color: mainButtonColor || "#6D2323", flexShrink: 0 }} />
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
                      {isGenerating ? "Generating PDF..." : lnk.label}
                    </Typography>
                  </Card>
                </motion.div>
              );
            })}
          </Box>
        </Box>

        {/* Applicant Form Intro */}
        <Box sx={{ px: { xs: "14px", md: 0 }, pt: 2, textAlign: "center" }}>
          <Typography
            component="h1"
            sx={{ fontSize: { xs: "24px", sm: "32px", md: "42px" }, fontWeight: "bold", textAlign: "center", color: subtitleColor, mt: "20px" }}
          >
            APPLICANT FORM
          </Typography>
          <Typography sx={{ fontSize: { xs: 13, md: 15 }, color: "#555" }}>
            Complete the applicant form to secure your place for the upcoming academic year at{" "}
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

              <Field label="Classified As" required error={errors.classifiedAs} helperText="This field is required.">
                <MSelect name="classifiedAs" value={person.classifiedAs || ""} onChange={handleChange} error={errors.classifiedAs}>
                  <option value="">Select Classification</option>
                  <option value="Freshman (First Year)">Freshman (First Year)</option>
                  <option value="Transferee">Transferee</option>
                  <option value="Returnee">Returnee</option>
                  <option value="Shiftee">Shiftee</option>
                  <option value="Foreign Student">Foreign Student</option>
                </MSelect>
              </Field>

              <Field label="Applying As" required error={errors.applyingAs} helperText="This field is required.">
                <MSelect name="applyingAs" value={person.applyingAs || ""} onChange={handleChange} error={errors.applyingAs} disabled>
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
              </label>
              <Box
                onClick={() => {
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
                  cursor: "pointer",
                  opacity: 1,
                  margin: "0 auto 12px",
                }}
              >
                {person.profile_img ? (
                  <img
                    src={`${API_BASE_URL}/uploads/Applicant1by1/${person.profile_img}?t=${Date.now()}`}
                    alt="Profile"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <>
                    <div style={{ fontSize: 32 }}>📷</div>
                    <div style={{ fontSize: 11, color: errors.profile_img ? "#d32f2f" : "#888", textAlign: "center", padding: "0 8px" }}>
                      Tap to upload photo
                    </div>
                  </>
                )}
              </Box>
            </Box>

            <Box sx={{ maxWidth: { md: 600 } }}>
              <Field label="Course Applied" required error={errors.program} helperText="This field is required.">
                <MSelect name="program" value={person.program || ""} onChange={handleChange} error={errors.program} disabled>
                  <option value="">Select Program</option>
                  {filteredCurriculum.map((item, index) => {
                    const availability = availabilityMap[item.curriculum_id];
                    const remaining = availability?.remaining ?? 0;
                    const isFull = availability?.isFull;
                    return (
                      <option key={index} value={item.curriculum_id} disabled style={{ color: isFull ? "red" : "inherit" }}>
                        ({item.program_code}): {item.program_description}
                        {item.major ? ` (${item.major})` : ""} ({getBranchLabel(item.components)})
                        {isFull ? " — FULL (0 slots left)" : ` (${remaining} slots left)`}
                      </option>
                    );
                  })}
                </MSelect>
                {person.program && !errors.program && (
                  <div style={{ color: "#d32f2f", fontSize: 11, marginTop: 3 }}>
                    Curriculum was selected during registration and cannot be changed.
                  </div>
                )}
              </Field>

              <Field label="Year Level" required error={errors.yearLevel} helperText="This field is required.">
                <MSelect name="yearLevel" value={getYearLevelSelectValue()} onChange={handleChange} error={errors.yearLevel}>
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
              <Field label="Extension">
                <MSelect name="extension" value={person.extension || ""} onChange={handleChange}>
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
              <Field label="Nickname">
                <MInput name="nickname" value={person.nickname || ""} onChange={handleChange} placeholder="Enter your Nickname" />
              </Field>
            </Box>

            <div style={gridCols2}>
              <Field label="Height (cm)" required error={errors.height} helperText="Required">
                <MInput type="number" name="height" value={person.height || ""} onChange={handleChange} error={errors.height} placeholder="Enter your Height" />
              </Field>
              <Field label="Weight (kg)" required error={errors.weight} helperText="Required">
                <MInput type="number" name="weight" value={person.weight || ""} onChange={handleChange} error={errors.weight} placeholder="Enter your Weight" />
              </Field>
            </div>

            {/* LRN */}
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

            {/* Gender */}
            <Box sx={{ maxWidth: { md: 300 } }}>
              <Field label="Sex / Gender" required error={errors.gender} helperText="This field is required.">
                <MSelect
                  name="gender"
                  value={person.gender == null ? "" : String(person.gender)}
                  onChange={(e) =>
                    handleChange({ target: { name: "gender", value: e.target.value === "" ? null : parseInt(e.target.value, 10) } })
                  }
                  error={errors.gender}
                >
                  <option value="">Select Gender</option>
                  <option value="0">MALE</option>
                  <option value="1">FEMALE</option>
                </MSelect>
              </Field>
            </Box>

            {/* PWD */}
            <CheckRow
              checked={person.pwdMember === 1}
              onChange={(e) => {
                const checked = e.target.checked;
                setPerson((prev) => ({
                  ...prev,
                  pwdMember: checked ? 1 : 0,
                  pwdType: checked ? prev.pwdType || "" : "",
                  pwdId: checked ? prev.pwdId || "" : "",
                }));
              }}
            >
              Person with Disability (PWD)
            </CheckRow>
            {person.pwdMember === 1 && (
              <div style={gridCols2}>
                <Field label="PWD Type" required error={errors.pwdType} helperText="This field is required.">
                  <MSelect name="pwdType" value={person.pwdType || ""} onChange={handleChange} error={errors.pwdType}>
                    <option value="">Select PWD Type</option>
                    {[
                      "Blindness", "Low-vision", "Leprosy Cured persons", "Hearing Impairment", "Locomotor Disability",
                      "Dwarfism", "Intellectual Disability", "Mental Illness", "Autism Spectrum Disorder", "Cerebral Palsy",
                      "Muscular Dystrophy", "Chronic Neurological conditions", "Specific Learning Disabilities",
                      "Multiple Sclerosis", "Speech and Language disability", "Thalassemia", "Hemophilia",
                      "Sickle cell disease", "Multiple Disabilities including",
                    ].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </MSelect>
                </Field>
                <Field label="PWD ID" required error={errors.pwdId} helperText="This field is required.">
                  <MInput name="pwdId" value={person.pwdId || ""} onChange={handleChange} error={errors.pwdId} placeholder="Enter your PWD ID Number" />
                </Field>
              </div>
            )}

            {/* Birth info */}
            <Box sx={{ display: "grid", gridTemplateColumns: isPhone ? "1fr" : "1fr 120px", gap: 2 }}>
              <Field label="Date of Birth" required error={errors.birthOfDate} helperText="Required">
                <DateField
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
                <MInput name="birthPlace" value={person.birthPlace || ""} onChange={handleChange} onBlur={handleBlur} error={errors.birthPlace} placeholder="Enter your Birth Place" />
              </Field>

              <Field label="Language / Dialect Spoken" required error={errors.languageDialectSpoken} helperText="This field is required.">
                <MInput
                  name="languageDialectSpoken"
                  value={person.languageDialectSpoken || ""}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.languageDialectSpoken}
                  placeholder="Enter your Language Spoken"
                />
              </Field>
            </Box>

            <div style={gridCols2}>
              <Field label="Citizenship" required error={errors.citizenship} helperText="This field is required.">
                <MSelect name="citizenship" value={person.citizenship || ""} onChange={handleChange} error={errors.citizenship}>
                  <option value="">Select Citizenship</option>
                  {[
                    "AFGHAN", "ALBANIAN", "ARAB", "ARGENTINIAN", "AUSTRALIAN", "AUSTRIAN", "BELGIAN", "BANGLADESHI",
                    "BAHAMIAN", "BHUTANESE", "BERMUDAN", "BOLIVIAN", "BRAZILIAN", "BRUNEI", "BOTSWANIAN", "CANADIAN",
                    "CHILE", "CHINESE", "COLOMBIAN", "COSTA RICAN", "CUBAN", "CYPRIOT", "CZECH", "DANISH", "DOMINICAN",
                    "ALGERIAN", "EGYPTIAN", "SPANISH", "ESTONIAN", "ETHIOPIAN", "FIJI", "FILIPINO", "FINISH", "FRENCH",
                    "BRITISH", "GERMAN", "GHANAIAN", "GREEK", "GUAMANIAN", "GUATEMALAN", "HONG KONG", "CROATIAN",
                    "HAITIAN", "HUNGARIAN", "INDONESIAN", "INDIAN", "IRANIAN", "IRAQI", "IRISH", "ICELANDER",
                    "ISRAELI", "ITALIAN", "JAMAICAN", "JORDANIAN", "JAPANESE", "CAMBODIAN", "KOREAN", "KUWAITI",
                    "KENYAN", "LAOTIAN", "LEBANESE", "LIBYAN", "LUXEMBURGER", "MALAYSIAN", "MOROCCAN", "MEXICAN",
                    "BURMESE", "MYANMAR", "NIGERIAN", "NOT INDICATED", "DUTCH", "NORWEGIAN", "NEPALI", "NEW ZEALANDER",
                    "OMANI", "PAKISTANI", "PANAMANIAN", "PERUVIAN", "PAPUAN", "POLISH", "PUERTO RICAN", "PORTUGUESE",
                    "PARAGUAYAN", "PALESTINIAN", "QATARI", "ROMANIAN", "RUSSIAN", "RWANDAN", "SAUDI ARABIAN",
                    "SUDANESE", "SINGAPOREAN", "SRI LANKAN", "EL SALVADORIAN", "SOMALIAN", "SLOVAK", "SWEDISH",
                    "SWISS", "SYRIAN", "THAI", "TRINIDAD AND TOBAGO", "TUNISIAN", "TURKISH", "TAIWANESE", "UKRAINIAN",
                    "URUGUYAN", "UNITED STATES", "VENEZUELAN", "VIRGIN ISLANDS", "VIETNAMESE", "YEMENI",
                    "YUGOSLAVIAN", "SOUTH AFRICAN", "ZAIREAN", "ZIMBABWEAN", "Others",
                  ].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </MSelect>
              </Field>

              <Field label="Religion" required error={errors.religion} helperText="This field is required.">
                <MSelect name="religion" value={person.religion || ""} onChange={handleChange} error={errors.religion}>
                  <option value="">Select Religion</option>
                  {[
                    "Jehovah's Witness", "Buddist", "Catholic", "Dating Daan", "Pagano", "Atheist", "Born Again",
                    "Adventis", "Baptist", "Mormons", "Free Methodist", "Christian", "Protestant", "Aglipay",
                    "Islam", "LDS", "Seventh Day Adventist", "Iglesia Ni Cristo", "UCCP", "PMCC", "Baha'i Faith",
                    "None", "Others",
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
                <MSelect name="civilStatus" value={person.civilStatus || ""} onChange={handleChange} error={errors.civilStatus}>
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
                  <Field label="Spouse" required error={errors.spouse} helperText="This field is required.">
                    <MInput
                      name="spouse"
                      value={person.spouse || ""}
                      onChange={handleChange}
                      onBlur={() => handleUpdate(person)}
                      error={errors.spouse}
                      placeholder="Enter Spouse Name"
                    />
                  </Field>
                </Box>
              )}
              <Field label="Tribe / Ethnic Group" required error={errors.tribeEthnicGroup} helperText="Required">
                <MSelect name="tribeEthnicGroup" value={person.tribeEthnicGroup || ""} onChange={handleChange} error={errors.tribeEthnicGroup}>
                  <option value="">Select</option>
                  {[
                    "Agta", "Agutaynen", "Aklanon", "Alangan", "Alta", "Amersian", "Ati", "Atta", "Ayta", "B'laan",
                    "Badjao", "Bagobo", "Balangao", "Balangingi", "Bangon", "Bantoanon", "Banwaon", "Batak",
                    "Bicolano", "Binukid", "Bohalano", "Bolinao", "Bontoc", "Buhid", "Butuanon", "Cagyanen",
                    "Caray-a", "Cebuano", "Cuyunon", "Dasen", "Ilocano", "Ilonggo", "Jamah Mapun", "Malay",
                    "Mangyan", "Maranao", "Molbogs", "Palawano", "Panimusan", "Tagbanua", "Tao't", "Bato",
                    "Tausug", "Waray", "None", "Others",
                  ].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </MSelect>
              </Field>
            </div>

            {/* ✅ NEW — Spouse, only shown when Married */}

          </Box>
        </Box>

        {/* ── SECTION: Contact Information ─────────────────────────────── */}
        <Box sx={{ backgroundColor: "#fff", borderRadius: "10px", mx: { xs: "12px", md: 0 }, mt: "12px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: `1px solid ${borderColor}` }}>
          <Box sx={{ backgroundColor: headerColor || "#1976d2", color: "#fff", p: { xs: "10px 14px", md: "12px 18px" }, fontSize: { xs: 13, md: 15 }, fontWeight: 700, letterSpacing: 0.3 }}>
            Contact Information
          </Box>
          <Box sx={{ p: { xs: "14px", md: "20px" } }}>
            <div style={gridCols2}>
              <Field label="Contact Number" required error={errors.cellphoneNumber} helperText="This field is required.">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#444", flexShrink: 0 }}>+63</span>
                  <MInput
                    name="cellphoneNumber"
                    value={person.cellphoneNumber || ""}
                    onChange={(e) => handleChange({ target: { name: "cellphoneNumber", value: e.target.value.replace(/\D/g, "") } })}
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

            {/* ✅ NEW — Facebook Account */}
            <Box sx={{ maxWidth: { md: 480 } }}>
              <Field label="Facebook Account" required error={errors.facebook_account} helperText="This field is required.">
                <MInput
                  name="facebook_account"
                  value={person.facebook_account || ""}
                  onChange={handleChange}
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
              <Field label="Zip Code" required error={errors.presentZipCode} helperText="This field is required.">
                <MInput type="number" name="presentZipCode" value={person.presentZipCode || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} error={errors.presentZipCode} placeholder="Enter your Zip Code" />
              </Field>
            </div>

            <div style={gridCols2}>
              <Field label="Region" required error={errors.presentRegion} helperText="This field is required.">
                <MSelect
                  name="presentRegion"
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
                    autoSave();
                  }}
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

              <Field label="Province" required error={errors.presentProvince} helperText="This field is required.">
                <MSelect
                  name="presentProvince"
                  value={person.presentProvince || ""}
                  onChange={(e) => {
                    handleChange(e);
                    setSelectedProvince(e.target.value);
                    setSelectedCity("");
                    setSelectedBarangay("");
                    setCityList([]);
                    setBarangayList([]);
                    autoSave();
                  }}
                  disabled={!person.presentRegion}
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
              <Field label="Municipality / City" required error={errors.presentMunicipality} helperText="This field is required.">
                <MSelect
                  name="presentMunicipality"
                  value={person.presentMunicipality || ""}
                  onChange={(e) => {
                    handleChange(e);
                    setSelectedCity(e.target.value);
                    setSelectedBarangay("");
                    setBarangayList([]);
                    autoSave();
                  }}
                  disabled={!person.presentProvince}
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

              <Field label="Barangay" required error={errors.presentBarangay} helperText="This field is required.">
                <MSelect
                  name="presentBarangay"
                  value={person.presentBarangay || ""}
                  onChange={(e) => {
                    handleChange(e);
                    setSelectedBarangay(e.target.value);
                    autoSave();
                  }}
                  disabled={!person.presentMunicipality}
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

            <CheckRow
              name="presentDswdChecked"
              checked={person.presentDswdChecked === 1}
              onChange={handleChange}
            >
              I have a Present DSWD Household Number
            </CheckRow>
            {person.presentDswdChecked === 1 && (
              <Box sx={{ maxWidth: { md: 480 } }}>
                <Field label="Present DSWD Household Number" required error={errors.presentDswdHouseholdNumber} helperText="This field is required.">
                  <MInput
                    name="presentDswdHouseholdNumber"
                    value={person.presentDswdHouseholdNumber || ""}
                    onChange={handleChange}
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
              <Field label="Zip Code" required error={errors.permanentZipCode} helperText="This field is required.">
                <MInput type="number" name="permanentZipCode" value={person.permanentZipCode || ""} onChange={handleChange} onBlur={() => handleUpdate(person)} error={errors.permanentZipCode} placeholder="Enter your Zip Code" />
              </Field>
            </div>

            <div style={gridCols2}>
              <Field label="Region" required error={errors.permanentRegion} helperText="This field is required.">
                <MSelect
                  name="permanentRegion"
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
                    autoSave();
                  }}
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

              <Field label="Province" required error={errors.permanentProvince} helperText="This field is required.">
                <MSelect
                  name="permanentProvince"
                  value={person.permanentProvince || ""}
                  onChange={(e) => {
                    handleChange(e);
                    setPermanentProvince(e.target.value);
                    setPermanentCity("");
                    setPermanentBarangay("");
                    setPermanentCityList([]);
                    setPermanentBarangayList([]);
                    autoSave();
                  }}
                  disabled={!person.permanentRegion}
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
              <Field label="Municipality / City" required error={errors.permanentMunicipality} helperText="This field is required.">
                <MSelect
                  name="permanentMunicipality"
                  value={person.permanentMunicipality || ""}
                  onChange={(e) => {
                    handleChange(e);
                    setPermanentCity(e.target.value);
                    setPermanentBarangay("");
                    setPermanentBarangayList([]);
                    autoSave();
                  }}
                  disabled={!person.permanentProvince}
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

              <Field label="Barangay" required error={errors.permanentBarangay} helperText="This field is required.">
                <MSelect
                  name="permanentBarangay"
                  value={person.permanentBarangay || ""}
                  onChange={(e) => {
                    handleChange(e);
                    setPermanentBarangay(e.target.value);
                    autoSave();
                  }}
                  disabled={!person.permanentMunicipality}
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

            <CheckRow
              name="permanentDswdChecked"
              checked={person.permanentDswdChecked === 1}
              onChange={handleChange}
            >
              I have a Permanent DSWD Household Number
            </CheckRow>
            {person.permanentDswdChecked === 1 && (
              <Box sx={{ maxWidth: { md: 480 } }}>
                <Field label="Permanent DSWD Household Number" required error={errors.permanentDswdHouseholdNumber} helperText="This field is required.">
                  <MInput
                    name="permanentDswdHouseholdNumber"
                    value={person.permanentDswdHouseholdNumber || ""}
                    onChange={handleChange}
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
                onClick={() => setUploadModalOpen(true)}
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

      {/* ── Photo Upload Modal (Dialog-style, responsive) ────────────────── */}
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
                        src={preview || `${API_BASE_URL}/uploads/Applicant1by1/${person.profile_img}`}
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

      {/* ── Exam Permit Error Modal ───────────────────────────────────── */}
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
            width: { xs: "90%", sm: 420 },
            bgcolor: "background.paper",
            boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          {/* Header bar */}
          <Box
            sx={{
              bgcolor: mainButtonColor,
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 3,
              py: 2,
            }}
          >
            <Box
              sx={{
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: "50%",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ErrorIcon sx={{ fontSize: 22, color: "#fff" }} />
            </Box>
            <Box>
              <Typography
                id="exam-permit-error-title"
                fontWeight="bold"
                fontSize={16}
                color="white"
                lineHeight={1.2}
              >
                Exam Permit Notice
              </Typography>
              <Typography fontSize={12} color="rgba(255,255,255,0.8)" lineHeight={1.2}>
                Please review the message below
              </Typography>
            </Box>
          </Box>

          {/* Body */}
          <Box sx={{ px: 3, pt: 3, pb: 1, textAlign: "center" }}>
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.9)",
                  border: `3px solid ${mainButtonColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ErrorIcon sx={{ color: mainButtonColor, fontSize: 30 }} />
              </Box>
            </Box>

            <Box
              sx={{
                border: `1.5px solid ${mainButtonColor}`,
                borderRadius: "12px",
                overflow: "hidden",
                mb: 1,
              }}
            >
              <Box sx={{ p: 2, backgroundColor: "#fafcff" }}>
                <Typography
                  id="exam-permit-error-description"
                  sx={{ fontSize: "13.5px", color: "#333", lineHeight: 1.65 }}
                >
                  {examPermitError}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Actions */}
          <Box sx={{ px: 3, pb: 3, pt: 1.5 }}>
            <Button
              fullWidth
              onClick={handleCloseExamPermitModal}
              variant="contained"
              sx={{
                height: 44,
                borderRadius: "10px",
                backgroundColor: mainButtonColor,
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                textTransform: "none",
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "#8B0000",
                  boxShadow: "none",
                },
              }}
            >
              Close
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default ApplicantPersonalInformationMobile;
