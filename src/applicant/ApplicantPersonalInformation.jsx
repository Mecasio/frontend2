import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
//import DatePicker from '@mui/x-date-picker';
import axios from "axios";
import {
  Button, Box, TextField, Container, Card, Typography,
  FormHelperText, FormControl, InputLabel, Select, MenuItem,
  Modal, FormControlLabel, Checkbox, IconButton,
  CircularProgress,        // ← add this
} from "@mui/material";
import { Link } from "react-router-dom";
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
import { motion } from "framer-motion";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ExamPermit from "./ExamPermit";
import { Snackbar, Alert } from "@mui/material";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DateField from "../components/DateField";
import FormalExample from "../assets/formalexample.png";
import DownloadIcon from "@mui/icons-material/Download";
import PersonalDataForm from "./PersonalDataForm";
import OfficeOfTheRegistrar from "./OfficeOfTheRegistrar";
import AdmissionServices from "./ApplicantServicesSurvey";
import ECATApplicationForm from "./ECATApplicationForm";

const ApplicantPersonalInformation = (props) => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");   // ✅ NEW
  const [stepperColor, setStepperColor] = useState("#000000");       // ✅ NEW

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
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
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
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    // ✅ Branches (JSON stored in DB)
    setBranches(settings?.branches || []);

  }, [settings]);

  const getBranchLabel = (branchId) => {
    const branch = branches.find((item) => String(item.id) === String(branchId));
    return branch?.branch || "—";
  };

  const navigate = useNavigate();
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
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




  const [programAvailability, setProgramAvailability] = useState([]);
  const [activeYearId, setActiveYearId] = useState(null);
  const [activeSemesterId, setActiveSemesterId] = useState(null);

  useEffect(() => {
    const fetchActiveYearAndAvailability = async () => {
      const yearRes = await axios.get(`${API_BASE_URL}/api/active_school_year`);
      const activeYear = yearRes.data[0];
      console.log(activeYear);

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
        console.log("Program Availability:", availRes.data);
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

  // Add this state at the top if not already:
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "warning",
  });

  // Snackbar close handler
  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Example: replace previous calls with this:
  const showSnackbar = (message) => {
    setSnackbar({ open: true, message, severity: "warning" });
  };

  const [emailAddress, setEmailAddress] = useState("");

  useEffect(() => {
    const savedEmail = localStorage.getItem("applicantEmail");
    const savedFirst = localStorage.getItem("first_name");
    const savedLast = localStorage.getItem("last_name");
    const savedMiddle = localStorage.getItem("middle_name");
    const savedBirth = localStorage.getItem("birthOfDate");


    setPerson(prev => ({
      ...prev,
      emailAddress: savedEmail || "",
      first_name: savedFirst || "",
      last_name: savedLast || "",
      middle_name: savedMiddle || "",
      birthOfDate: savedBirth || "",
      age: savedBirth ? calculateAge(savedBirth) : ""
    }));
  }, []);

  useEffect(() => {
    if (person.birthOfDate) {
      setPerson(prev => ({
        ...prev,
        age: calculateAge(prev.birthOfDate)
      }));
    }
  }, [person.birthOfDate]);

  // do not alter
  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const keys = JSON.parse(localStorage.getItem("dashboardKeys") || "{}");
    if (keys.step1) {
      navigate(`/applicant_personal_information/${keys.step1}`);
    }
    const userId = localStorage.getItem("person_id");

    const overrideId = props?.adminOverridePersonId; // new

    if (overrideId) {
      // Admin editing other person
      setUserRole("superadmin");
      setUserID(overrideId);
      fetchPersonData(overrideId);
      return;
    }

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
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

  const keys = JSON.parse(localStorage.getItem("dashboardKeys") || "{}");

  const steps = [
    { label: "Personal Information", icon: <PersonIcon />, path: `/applicant_personal_information/${keys.step1}` },
    { label: "Family Background", icon: <FamilyRestroomIcon />, path: `/applicant_family_background/${keys.step2}` },
    { label: "Educational Attainment", icon: <SchoolIcon />, path: `/applicant_educational_attainment/${keys.step3}` },
    { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: `/applicant_health_medical_records/${keys.step4}` },
    { label: "Other Information", icon: <InfoIcon />, path: `/applicant_other_information/${keys.step5}` },
  ];

  const [activeStep, setActiveStep] = useState(0);
  const [clickedSteps, setClickedSteps] = useState(
    Array(steps.length).fill(false),
  );

  const handleStepClick = async (index) => {
    if (isFormValid()) {
      await handleUpdate(person);

      setSnackbar({
        open: true,
        message: `Your record has been saved successfully!`,
        severity: "success",
      });

      setActiveStep(index);

      const newClickedSteps = [...clickedSteps];
      newClickedSteps[index] = true;
      setClickedSteps(newClickedSteps);

      // Delay navigation so snackbar can be seen
      setTimeout(() => {
        navigate(steps[index].path);
      }, 1000);
    } else {
      setSnackbar({
        open: true,
        message: "Please fill all required fields before proceeding.",
        severity: "error",
      });
    }
  };
  // dot not alter

  const fetchPersonData = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/person/${id}`);
      setPerson(res.data);
    } catch (error) { }
  };

  // Do not alter
  const handleUpdate = async (updatedPerson) => {
    try {
      // Prevent sending empty body
      if (!updatedPerson || Object.keys(updatedPerson).length === 0) {
        console.warn("No data to update — skipping request.");
        return;
      }

      await axios.put(`${API_BASE_URL}/api/person/${userID}`, updatedPerson);
      console.log("Auto-saved successfully:", updatedPerson);
    } catch (error) {
      console.error("Auto-save failed:", error.response?.data || error.message);
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

    const updatedPerson = {
      ...person,
      [name]: updatedValue,
    };

    if (name === "academicProgram") {
      if (Number(value) === 1) {
        // Graduate → default to Master
        updatedPerson.yearLevel = "Master";
      } else {
        // Reset for college
        updatedPerson.yearLevel = "";
      }
    }

    // ✅ Auto-calculate age
    if (name === "birthOfDate") {
      updatedPerson.age = calculateAge(value);
    }

    // ✅ Auto yearLevel if Freshman
    if (name === "classifiedAs" && value === "Freshman (First Year)") {
      updatedPerson.yearLevel = "First Year";
    }

    // ✅ Reset program if campus or academicProgram changed
    if (name === "campus" || name === "academicProgram") {
      updatedPerson.program = "";
    }

    setPerson(updatedPerson);
    handleUpdate(updatedPerson); // real-time save
  };

  const handleBlur = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/person/${userID}`, person);
      console.log("Auto-saved");
    } catch (err) {
      console.error("Auto-save failed", err);
    }
  };

  const autoSave = async () => {
    try {
      await axios.put(`${API_BASE_URL}/api/person/${userID}`, person);
      console.log("Auto-saved.");
    } catch (err) {
      console.error("Auto-save failed.");
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

    // Check file type
    if (!validTypes.includes(file.type)) {
      setSnackbar({
        open: true,
        message: "Invalid file type. Please select a JPEG or PNG file.",
        severity: "error",
      });
      setSelectedFile(null);
      setPreview(null);
      return;
    }

    // Check file size
    if (file.size > maxSizeInBytes) {
      setSnackbar({
        open: true,
        message: "File is too large. Maximum allowed size is 2MB.",
        severity: "error",
      });
      setSelectedFile(null);
      setPreview(null);
      return;
    }

    // If valid, set file and preview
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const MAX_SIZE = 2 * 1024 * 1024;

  const handleUpload = async () => {
    if (!selectedFile) {
      setSnackbar({
        open: true,
        message: "Please select a file first.",
        severity: "warning",
      });
      return;
    }
    if (selectedFile.size > MAX_SIZE) {
      setSnackbar({
        open: true,
        message: "File must be 2MB or less.",
        severity: "error",
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
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const fileName = response.data.filename || response.data.profile_img;

      // ✅ Set image AND trigger auto-save
      const updatedPerson = {
        ...person,
        profile_img: fileName,
      };

      setPerson(updatedPerson);
      await handleUpdate(updatedPerson); // ✅ this pushes the profile_img change into DB

      setUploadedImage(`${API_BASE_URL}/uploads/${fileName}`);
      setSnackbar({
        open: true,
        message: "Upload successful!",
        severity: "success",
      });
      handleClose();
    } catch (error) {
      console.error("Upload failed:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Upload failed.";

      setSnackbar({
        open: true,
        message: errorMessage,
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

  useEffect(() => {
    const fetchCurriculums = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/applied_program`);
        setCurriculumOptions(response.data); // array of { curriculum_id: "..." }
      } catch (error) {
        console.error("Error fetching curriculum options:", error);
      }
    };

    fetchCurriculums();
  }, []);

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
    if (person.campus !== "" && person.campus !== null) {
      if (Number(item.components) !== Number(person.campus)) {
        return false;
      }
    }

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

    // ✅ NEW — Spouse required only when Civil Status is Married
    if (person.civilStatus === "Married") {
      requiredFields.push("spouse");
    }

    let newErrors = {};
    let isValid = true;

    // Generic required fields
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

    // ✅ NEW EMAIL VALIDATION (any domain allowed)
    const emailValue = person.emailAddress?.trim();
    const emailPattern = /^[^@]+@[^@]+\.[^@]+$/;

    if (!emailValue || !emailPattern.test(emailValue)) {
      newErrors.emailAddress = true;
      isValid = false;
    }

    // ✅ LRN Number: required only if N/A is NOT checked
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

    // ✅ Permanent DSWD (only if checked)
    if (person.permanentDswdChecked === 1) {
      const value = person.permanentDswdHouseholdNumber?.trim();
      if (!value) {
        newErrors.permanentDswdHouseholdNumber = true;
        isValid = false;
      }
    }

    // ✅ PWD fields: required only if PWD checkbox is checked
    if (person.pwdMember === 1) {
      const pwdTypeValue = person.pwdType?.toString().trim();
      const pwdIdValue = person.pwdId?.toString().trim();

      if (!pwdTypeValue) {
        newErrors.pwdType = true;
        isValid = false;
      }

      if (!pwdIdValue) {
        newErrors.pwdId = true;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };
  const [generatingExamPermitPdf, setGeneratingExamPermitPdf] = useState(false);

  const divToPrintRef = useRef();
  const [showPrintView, setShowPrintView] = useState(false);

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
              body {
                margin: 0;
                padding: 0;
                display: flex;
                margin-left: "
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              .print-container {
                width: 8.5in;
                min-height: 11in;
                margin: auto;
                background: white;
              }
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

  const [generatingKey, setGeneratingKey] = useState(null); // e.g. "ecat" | "admissionForm" | ...
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

      setGeneratingKey("examPermitDownload"); // ← unified spinner
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
        { responseType: "blob" },
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

  const [examPermitError, setExamPermitError] = useState("");
  const [examPermitModalOpen, setExamPermitModalOpen] = useState(false);

  const handleCloseExamPermitModal = () => {
    setExamPermitModalOpen(false);
    setExamPermitError("");
  };

  const handleExamPermitClick = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/verified-exam-applicants`);
      const verified = res.data.some(a => a.person_id === parseInt(userID));

      if (!verified) {
        setExamPermitError("❌ You cannot print the Exam Permit until all required documents are verified.");
        setExamPermitModalOpen(true);
        return;
      }

      // ✅ Render permit and print
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

  const [canPrintPermit, setCanPrintPermit] = useState(false);

  useEffect(() => {
    if (!userID) return;
    axios
      .get(`${API_BASE_URL}/api/verified-exam-applicants`)
      .then((res) => {
        const verified = res.data.some((a) => a.person_id === parseInt(userID));
        setCanPrintPermit(verified);
      });
  }, [userID]);

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
      {/* ✅ Hidden render of ExamPermit for printing */}
      {showPrintView && (
        <div ref={divToPrintRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <ExamPermit />
        </div>
      )}

      {generatingKey && FORM_CONFIGS[generatingKey] && (
        <div ref={hiddenFormRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
          {React.createElement(FORM_CONFIGS[generatingKey].Component)}
        </div>
      )}
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
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />

      <br />
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

      <h1
        style={{
          fontSize: "30px",
          fontWeight: "bold",
          textAlign: "center",
          color: "black",
          marginTop: "25px",
        }}
      >
        PRINTABLE DOCUMENTS
      </h1>

      {/* Cards Section */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          mt: 2,
          pb: 1,
          justifyContent: "center", // Centers all cards horizontally
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
                  transition: "all 0.3s ease-in-out",
                  opacity: disabled && !isGenerating ? 0.5 : 1,
                  pointerEvents: disabled ? "none" : "auto",
                  cursor: disabled ? "default" : "pointer",
                  "&:hover": !disabled && {
                    transform: "scale(1.05)",
                    backgroundColor: headerColor || "#1976d2",
                    "& .card-text": { color: "#fff" },
                    "& .card-icon": { color: "#fff" },
                  },
                }}
                onClick={() => {
                  if (disabled) return;
                  if (lnk.onClick) lnk.onClick();
                  else if (lnk.to) navigate(lnk.to);
                }}
              >
                {isGenerating ? (
                  <CircularProgress size={26} sx={{ color: mainButtonColor, mr: 1.5 }} />
                ) : (
                  <PictureAsPdfIcon className="card-icon" sx={{ fontSize: 35, color: mainButtonColor, mr: 1.5 }} />
                )}
                <Typography
                  className="card-text"
                  sx={{ color: mainButtonColor, fontFamily: "Poppins, sans-serif", fontWeight: "bold", fontSize: "0.85rem" }}
                >
                  {isGenerating ? "Generating PDF..." : lnk.label}
                </Typography>
              </Card>
            </motion.div>
          );
        })}
      </Box>



      {/* Applicant Form Section */}
      <Container>
        <Container>
          <h1
            style={{
              fontSize: "50px",
              fontWeight: "bold",
              textAlign: "center",
              color: subtitleColor,
              marginTop: "25px",
            }}
          >
            APPLICANT FORM
          </h1>
          <div style={{ textAlign: "center" }}>
            Complete the applicant form to secure your place for the upcoming
            academic year at{" "}
            {shortTerm ? (
              <>
                <strong>{shortTerm.toUpperCase()}</strong> <br />
                {companyName || ""}
              </>
            ) : (
              companyName || ""
            )}
            .
          </div>
        </Container>

        <br />

        {/* Steps */}
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
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                }}
                onClick={() => handleStepClick(index)}
              >
                <Box
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    border: `1px solid ${borderColor}`,
                    backgroundColor:
                      activeStep === index
                        ? headerColor || "#1976d2"
                        : "#E8C999",
                    color: activeStep === index ? "#fff" : "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
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
              backgroundColor: headerColor || "#1976d2",
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
              style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}
            >
              Personal Information:
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />
            <div className="flex items-center mb-4 gap-4">
              <label className="w-40 font-medium">Campus:<span style={{ color: "red" }}> *</span></label>

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

                    const branch = branches.find(b => String(b.id) === String(selected));
                    return branch ? branch.branch.toUpperCase() : "Select Campus";
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
              <label className="w-40 font-medium">Academic Program:<span style={{ color: "red" }}> *</span></label>
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
                  value={person.academicProgram || ""}
                  label="Academic Program"
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
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
              <label className="w-40 font-medium">Classified As:<span style={{ color: "red" }}> *</span></label>
              <FormControl
                fullWidth
                size="small"
                required
                error={!!errors.classifiedAs}
                className="mb-4"
              >
                <InputLabel id="classified-as-label">Classified As</InputLabel>
                <Select
                  labelId="classified-as-label"
                  id="classified-as-select"
                  name="classifiedAs"
                  value={person.classifiedAs || ""}
                  label="Classified As"
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
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
              <label className="w-40 font-medium">Applying As:<span style={{ color: "red" }}> *</span></label>
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
                  value={person.applyingAs || ""}
                  label="Applying As"
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                >
                  <MenuItem value="">
                    <em>Select Applying</em>
                  </MenuItem>
                  <MenuItem value="1">
                    Senior High School Graduate
                  </MenuItem>
                  <MenuItem value="2">
                    Senior High School Graduating Student
                  </MenuItem>
                  <MenuItem value="3">
                    ALS (Alternative Learning System) Passer
                  </MenuItem>
                  <MenuItem value="4">
                    Transferee from other University/College
                  </MenuItem>
                  <MenuItem value="5">
                    Cross Enrolee Student
                  </MenuItem>
                  <MenuItem value="6">
                    Foreign Applicant/Student
                  </MenuItem>
                  <MenuItem value="7">
                    Baccalaureate Graduate
                  </MenuItem>
                  <MenuItem value="8">
                    Master Degree Graduate
                  </MenuItem>
                </Select>
                {errors.applyingAs && (
                  <FormHelperText>This field is required.</FormHelperText>
                )}
              </FormControl>
            </div>

            <br />

            <Typography
              style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}
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
                    <label className="w-42 font-medium">Course Applied:<span style={{ color: "red" }}> *</span></label>
                    <FormControl
                      fullWidth
                      size="small"
                      required
                      error={!!errors.program}
                    >
                      <InputLabel>Course Applied</InputLabel>
                      <Select
                        readOnly
                        name="program"
                        value={person.program || ""}
                        onBlur={() => handleUpdate(person)}
                        onChange={handleChange}

                        label="Program"
                      >
                        <MenuItem value="">
                          <em>Select Program</em>
                        </MenuItem>

                        {filteredCurriculum.map((item, index) => {

                          const availability =
                            availabilityMap[item.curriculum_id];
                          const remaining = availability?.remaining ?? 0;
                          const isFull = availability?.isFull;

                          return (
                            <MenuItem
                              key={index}
                              value={item.curriculum_id}
                              disabled={isFull}
                              sx={{
                                color: isFull ? "red" : "inherit",
                                fontWeight: isFull ? "bold" : "normal",
                              }}
                            >
                              {`(${item.program_code}): ${item.program_description}${item.major ? ` (${item.major})` : ""
                                } (${getBranchLabel(item.components)})`}

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

                      {errors.program && (
                        <FormHelperText>This field is required.</FormHelperText>
                      )}
                      {person.program && !errors.program && (
                        <FormHelperText sx={{ color: "red" }}>
                          Curriculum was selected during registration and cannot be changed.
                        </FormHelperText>
                      )}
                    </FormControl>
                  </Box>

                  {/* <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <label className="w-40 font-medium">Course Applied:</label>
                    <FormControl fullWidth size="small" required error={!!errors.program2}>
                      <InputLabel>Course Applied:</InputLabel>
                       <Select
                        name="program2"
                        value={person.program2 || ""}
                        onBlur={() => handleUpdate(person)}
                        onChange={handleChange}
                        label="Program"
                      >
                        <MenuItem value="">
                          <em>Select Program</em>
                        </MenuItem>

                        {filteredCurriculum.map((item, index) => {

                          const availability =
                            availabilityMap[item.curriculum_id];
                          const remaining = availability?.remaining ?? 0;
                          const isFull = availability?.isFull;

                          return (
                            <MenuItem
                              key={index}
                              value={item.curriculum_id}
                              disabled={isFull}
                              sx={{
                                color: isFull ? "red" : "inherit",
                                fontWeight: isFull ? "bold" : "normal",
                              }}
                            >
                              {`(${item.program_code}): ${item.program_description}${item.major ? ` (${item.major})` : ""
                                } (${Number(item.components) === 1
                                  ? "Manila Campus"
                                  : Number(item.components) === 2
                                    ? "Cavite Campus"
                                    : "—"
                                })`}

                              {/* Slot info */}
                  {/* {isFull ? (
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
                      {errors.program2 && (
                        <FormHelperText>This field is required.</FormHelperText>
                      )}
                    </FormControl> */}
                  {/* </Box> */}

                  {/* <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <label className="w-40 font-medium">Course Applied</label>
                    <FormControl fullWidth size="small" required error={!!errors.program3}>
                      <InputLabel>Course Applied</InputLabel>
                       <Select
                        name="program3"
                        value={person.program3 || ""}
                        onBlur={() => handleUpdate(person)}
                        onChange={handleChange}
                        label="Program"
                      >
                        <MenuItem value="">
                          <em>Select Program</em>
                        </MenuItem>

                        {filteredCurriculum.map((item, index) => {

                          const availability =
                            availabilityMap[item.curriculum_id];
                          const remaining = availability?.remaining ?? 0;
                          const isFull = availability?.isFull;

                          return (
                            <MenuItem
                              key={index}
                              value={item.curriculum_id}
                              disabled={isFull}
                              sx={{
                                color: isFull ? "red" : "inherit",
                                fontWeight: isFull ? "bold" : "normal",
                              }}
                            >
                              {`(${item.program_code}): ${item.program_description}${item.major ? ` (${item.major})` : ""
                                } (${Number(item.components) === 1
                                  ? "Manila Campus"
                                  : Number(item.components) === 2
                                    ? "Cavite Campus"
                                    : "—"
                                })`}

                              {/* Slot info */}
                  {/* {isFull ? (
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
                      {errors.program3 && (
                        <FormHelperText>This field is required.</FormHelperText>
                      )}
                    </FormControl> */}
                  {/* </Box> */}



                  {/* Year Level */}
                  <div className="flex items-center mb-4 gap-2">
                    <label className="w-40 mt:[2] font-medium ">
                      Year Level:<span style={{ color: "red" }}> *</span>
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
                        onBlur={() => handleUpdate(person)}
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
                    src={`${API_BASE_URL}/uploads/Applicant1by1/${person.profile_img}?t=${Date.now()}`}
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
                mt: "-50px",
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
                  Last Name<span style={{ color: "red" }}> *</span>
                </Typography>
                <TextField
                  InputProps={{
                    readOnly: true,
                    sx: { textTransform: "uppercase" } // must be inside InputProps
                  }}
                  fullWidth
                  size="small"
                  name="last_name"
                  require
                  value={(person.last_name || "").toUpperCase()}
                  onChange={(e) =>
                    handleChange({
                      ...e,
                      target: {
                        ...e.target,
                        value: e.target.value.toUpperCase()
                      }
                    })
                  }
                  onBlur={() => handleUpdate(person)}
                  placeholder="Enter your Last Name"
                  error={errors.last_name}
                  helperText={errors.last_name ? "This field is required." : ""}
                />
              </Box>

              {/* First Name */}
              <Box flex="1 1 20%">
                <Typography mb={1} fontWeight="medium">
                  First Name<span style={{ color: "red" }}> *</span>
                </Typography>
                <TextField
                  fullWidth
                  InputProps={{
                    readOnly: true,
                    sx: { textTransform: "uppercase" } // must be inside InputProps
                  }}
                  size="small"
                  name="first_name"
                  required
                  value={(person.first_name || "").toUpperCase()}
                  onChange={(e) =>
                    handleChange({
                      ...e,
                      target: {
                        ...e.target,
                        value: e.target.value.toUpperCase()
                      }
                    })
                  }
                  onBlur={() => handleUpdate(person)}
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
                  InputProps={{
                    readOnly: true,
                    sx: { textTransform: "uppercase" } // must be inside InputProps
                  }}
                  size="small"
                  name="middle_name"
                  required
                  value={(person.middle_name || "").toUpperCase()}
                  onChange={(e) =>
                    handleChange({
                      ...e,
                      target: {
                        ...e.target,
                        value: e.target.value.toUpperCase()
                      }
                    })
                  }
                  onBlur={() => handleUpdate(person)}
                  placeholder="Enter your Middle Name"
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
                    value={person.extension || ""}
                    label="Extension"
                    onChange={handleChange}
                    onBlur={() => handleUpdate(person)}
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
                </FormControl>
              </Box>

              {/* Nickname */}
              <Box flex="1 1 20%">
                <Typography mb={1} fontWeight="medium">
                  Nickname
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  name="nickname"
                  required
                  value={person.nickname || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  placeholder="Enter your Nickname"
                />
              </Box>
            </Box>
            <Box display="flex" gap={4} mb={2}>
              {/* Height Field */}
              <Box display="flex" flexDirection="column" flex="0 0 26%">
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography fontWeight="medium" minWidth="70px">
                    Height:<span style={{ color: "red" }}> *</span>
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    name="height"
                    value={person.height || ""}
                    onChange={handleChange}
                    onBlur={() => handleUpdate(person)}
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
                  <Typography fontWeight="medium" minWidth="85px">
                    Weight:<span style={{ color: "red" }}> *</span>
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    name="weight"
                    value={person.weight || ""}
                    onChange={handleChange}
                    onBlur={() => handleUpdate(person)}
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
                Learning Reference Number:<span style={{ color: "red" }}> *</span>
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
                    : person.lrnNumber || ""
                }
                onChange={handleChange}
                onBlur={() => handleUpdate(person)}
                disabled={person.lrnNumber === "No LRN Number"}
                size="small"
                sx={{ width: 220 }}
                InputProps={{ sx: { height: 40 } }}
                inputProps={{ style: { height: 40, padding: "10.5px 14px" } }}
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
                      setLrnNAFlag(checked ? "1" : "0"); // optional: if you're sending this to backend
                    }}
                    onBlur={() => handleUpdate(person)}
                  />
                }
                label="N/A"
                sx={{ mr: 2 }}
              />

              <Typography fontWeight="medium">
                Gender:<span style={{ color: "red" }}> *</span>
              </Typography>
              {/* Gender */}
              <TextField
                select
                size="small"
                label="SEX"
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
                onBlur={() => handleUpdate(person)}
                error={Boolean(errors.gender)}
                sx={{ width: 150 }}
                InputProps={{ sx: { height: 40 } }}
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
                    select
                    size="small"
                    label="PWD Type"
                    name="pwdType"
                    value={person.pwdType || ""}
                    onChange={handleChange}
                    onBlur={() => handleUpdate(person)}
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
                    size="small"
                    label="PWD ID"
                    name="pwdId"
                    value={person.pwdId || ""}
                    onChange={handleChange}
                    onBlur={() => handleUpdate(person)}
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
                  Birth of Date<span style={{ color: "red" }}> *</span>
                </Typography>
                <DateField
                  fullWidth
                  InputProps={{ readOnly: true }}

                  size="small"
                  name="birthOfDate"
                  required
                  value={person.birthOfDate || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  error={!!errors.birthOfDate}
                  helperText={
                    errors.birthOfDate ? "This field is required." : ""
                  }
                />
              </Box>

              {/* 👤 Age (auto-filled, read-only) */}
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Age<span style={{ color: "red" }}> *</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  name="age"
                  value={person.age || ""}
                  placeholder="Enter your Age"
                  required
                  onBlur={() => handleUpdate(person)}
                  onChange={handleChange}
                  error={!!errors.age}
                  helperText={errors.age ? "This field is required." : ""}
                  InputProps={{ readOnly: true }} // read-only so user can’t manually change
                />
              </Box>
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Birth Place<span style={{ color: "red" }}> *</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  name="birthPlace"
                  placeholder="Enter your Birth Place"
                  value={person.birthPlace || ""}
                  required
                  onBlur={handleBlur}
                  onChange={handleChange}
                  error={!!errors.birthPlace}
                  helperText={
                    errors.birthPlace ? "This field is required." : ""
                  }
                />
              </Box>
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Language/Dialect Spoken<span style={{ color: "red" }}> *</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  name="languageDialectSpoken"
                  placeholder="Enter your Language Spoken"
                  value={person.languageDialectSpoken || ""}
                  required
                  onBlur={handleBlur}
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
            <Typography
              style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}
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
                  onBlur={() => handleUpdate(person)}
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
                  fullWidth
                  size="small"
                  name="emailAddress"
                  required
                  value={person.emailAddress || ""}
                  placeholder="Your registered email"
                  InputProps={{
                    readOnly: true,
                  }}
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
                  fullWidth
                  size="small"
                  name="facebook_account"
                  placeholder="Enter Facebook Profile Name/Link"
                  value={person.facebook_account || ""}
                  onChange={handleChange}
                  onBlur={() => handleUpdate(person)}
                  error={!!errors.facebook_account}
                  helperText={errors.facebook_account ? "This field is required." : ""}
                />
              </Box>
            </Box>

            <Typography
              style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}
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
                  Present Street<span style={{ color: "red" }}> *</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  name="presentStreet"
                  value={person.presentStreet || ""}
                  onBlur={() => handleUpdate(person)}
                  placeholder="Enter your Present Street"
                  onChange={handleChange}
                  error={!!errors.presentStreet}
                  helperText={errors.presentStreet && "This field is required."}
                />
              </Box>

              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Zip Code<span style={{ color: "red" }}> *</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  name="presentZipCode"
                  placeholder="Enter your Zip Code"
                  type="number"
                  value={person.presentZipCode || ""}
                  onBlur={() => handleUpdate(person)}
                  onChange={handleChange}
                  error={!!errors.presentZipCode}
                  helperText={errors.presentZipCode && "This field is required."}
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
                  Region<span style={{ color: "red" }}> *</span>
                </Typography>

                <Select
                  name="presentRegion"
                  displayEmpty
                  value={person.presentRegion || ""}
                  onBlur={() => handleUpdate(person)}
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
                  Province<span style={{ color: "red" }}> *</span>
                </Typography>

                <Select
                  name="presentProvince"
                  displayEmpty
                  value={person.presentProvince || ""}
                  onBlur={() => handleUpdate(person)}
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
                  Municipality<span style={{ color: "red" }}> *</span>
                </Typography>

                <Select
                  name="presentMunicipality"
                  displayEmpty
                  value={person.presentMunicipality || ""}
                  onBlur={() => handleUpdate(person)}
                  onChange={(e) => {
                    handleChange(e);
                    setSelectedCity(e.target.value);
                    setSelectedBarangay("");
                    setBarangayList([]);
                    autoSave();
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
                  Barangay<span style={{ color: "red" }}> *</span>
                </Typography>

                <Select
                  name="presentBarangay"
                  displayEmpty
                  value={person.presentBarangay || ""}
                  onBlur={() => handleUpdate(person)}
                  onChange={(e) => {
                    handleChange(e);
                    setSelectedBarangay(e.target.value);
                    autoSave();
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
              <FormControlLabel
                control={
                  <Checkbox
                    name="presentDswdChecked"
                    checked={person.presentDswdChecked === 1}
                    onChange={handleChange}
                  />
                }
                label="I have a Present DSWD Household Number"
              />
            </Box>

            {person.presentDswdChecked === 1 && (
              <Box mb={2}>
                <Typography mb={1} fontWeight="medium">
                  Present DSWD Household Number <span style={{ color: "red" }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  name="presentDswdHouseholdNumber"
                  value={person.presentDswdHouseholdNumber || ""}
                  onBlur={() => handleUpdate(person)}
                  onChange={handleChange}
                  placeholder="Enter your Present DSWD Household Number"
                  error={!!errors.presentDswdHouseholdNumber}
                  helperText={
                    errors.presentDswdHouseholdNumber && "This field is required."
                  }
                />
              </Box>
            )}

            <Typography
              style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}
            >
              Permanent Address:
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <FormControlLabel
              control={
                <Checkbox
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
                    handleUpdate(updatedPerson); // optional: real-time save
                  }}
                  onBlur={() => handleUpdate(person)}
                />
              }
              label="Same as Present Address"
            />

            <Box display="flex" gap={2} mb={2}>
              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Permanent Street<span style={{ color: "red" }}> *</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  name="permanentStreet"
                  placeholder="Enter your Permanent Street"
                  value={person.permanentStreet || ""}
                  onBlur={() => handleUpdate(person)}
                  onChange={handleChange}
                  error={!!errors.permanentStreet}
                  helperText={
                    errors.permanentStreet && "This field is required."
                  }
                />
              </Box>

              <Box flex={1}>
                <Typography mb={1} fontWeight="medium">
                  Zip Code<span style={{ color: "red" }}> *</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  name="permanentZipCode"
                  type="number"
                  placeholder="Enter your Permanent Zip Code"
                  value={person.permanentZipCode || ""}
                  onBlur={() => handleUpdate(person)}
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
                  Permanent Region<span style={{ color: "red" }}> *</span>
                </Typography>
                <FormControl
                  fullWidth
                  size="small"
                  required
                  error={!!errors.permanentRegion}
                >
                  <Select
                    name="permanentRegion"
                    displayEmpty
                    value={person.permanentRegion || ""}
                    onBlur={() => handleUpdate(person)}
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
                  Permanent Province<span style={{ color: "red" }}> *</span>
                </Typography>
                <FormControl
                  fullWidth
                  size="small"
                  required
                  error={!!errors.permanentProvince}
                >
                  <Select
                    name="permanentProvince"
                    displayEmpty
                    value={person.permanentProvince || ""}
                    onBlur={() => handleUpdate(person)}
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
                  Permanent Municipality<span style={{ color: "red" }}> *</span>
                </Typography>
                <FormControl
                  fullWidth
                  size="small"
                  required
                  error={!!errors.permanentMunicipality}
                >
                  <Select
                    name="permanentMunicipality"
                    displayEmpty
                    value={person.permanentMunicipality || ""}
                    onBlur={() => handleUpdate(person)}
                    onChange={(e) => {
                      handleChange(e);
                      setPermanentCity(e.target.value);
                      setPermanentBarangay("");
                      setPermanentBarangayList([]);
                      autoSave();
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
                  Permanent Barangay<span style={{ color: "red" }}> *</span>
                </Typography>
                <FormControl
                  fullWidth
                  size="small"
                  required
                  error={!!errors.permanentBarangay}
                >
                  <Select
                    name="permanentBarangay"
                    displayEmpty
                    value={person.permanentBarangay || ""}
                    onBlur={() => handleUpdate(person)}
                    onChange={(e) => {
                      handleChange(e);
                      setPermanentBarangay(e.target.value);
                      autoSave();
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
              <FormControlLabel
                control={
                  <Checkbox
                    name="permanentDswdChecked"
                    checked={person.permanentDswdChecked === 1}
                    onChange={handleChange}
                  />
                }
                label="I have a Permanent DSWD Household Number"
              />
            </Box>

            {person.permanentDswdChecked === 1 && (
              <Box mb={2}>
                <Typography mb={1} fontWeight="medium">
                  Permanent DSWD Household Number <span style={{ color: "red" }}>*</span>
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  name="permanentDswdHouseholdNumber"
                  value={person.permanentDswdHouseholdNumber || ""}
                  onBlur={() => handleUpdate(person)}
                  onChange={handleChange}
                  placeholder="Enter your Permanent DSWD Household Number"
                  error={!!errors.permanentDswdHouseholdNumber}
                  helperText={
                    errors.permanentDswdHouseholdNumber && "This field is required."
                  }
                />
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
                                  : `${API_BASE_URL}/uploads/Applicant1by1/${person.profile_img}`
                              }
                              alt="Preview"
                              sx={{
                                width: "192px",
                                height: "192px",
                                objectFit: "cover",
                                border: `1px solid ${borderColor}`,

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
                onClick={async () => {
                  await handleUpdate(person);

                  if (isFormValid()) {
                    setSnackbar({
                      open: true,
                      message: "Your record has been saved successfully!",
                      severity: "success",
                    });

                    setTimeout(() => {
                      navigate(`/applicant_family_background/${keys.step2}`);
                    }, 1500);
                  } else {
                    setSnackbar({
                      open: true,
                      message:
                        "Please complete all required fields before proceeding.",
                      severity: "error",
                    });
                  }
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



            <Snackbar
              open={snackbar.open}
              autoHideDuration={1000} // 3 seconds
              onClose={handleCloseSnackbar}
              anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
              <Alert
                onClose={handleCloseSnackbar}
                severity={snackbar.severity}
                sx={{ width: "100%" }}
              >
                {snackbar.message}
              </Alert>
            </Snackbar>
          </Container>
        </form>
      </Container>
    </Box>
  );
};

export default ApplicantPersonalInformation;
