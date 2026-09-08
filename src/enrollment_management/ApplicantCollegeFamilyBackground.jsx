import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";

import axios from "axios";
import { Button, Box, TextField, Container, Card, Modal, TableContainer, Paper, Table, TableHead, TableRow, TableCell, Typography, FormControl, FormHelperText, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, CircularProgress, } from "@mui/material";
import { Link } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import SchoolIcon from "@mui/icons-material/School";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import InfoIcon from "@mui/icons-material/Info";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ErrorIcon from '@mui/icons-material/Error';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from "framer-motion";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import PeopleIcon from "@mui/icons-material/People";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import ExamPermit from "../applicant/ExamPermit";
import API_BASE_URL from "../apiConfig";
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SearchIcon from '@mui/icons-material/Search';
import AdminECATApplicationForm from "../admission/AdminECATApplicationForm";
import AdminOfficeOfTheRegistrar from "../admission/AdminOfficeOfTheRegistrar";
import AdminPersonalDataForm from "../admission/AdminPersonalDataForm";
import ApplicantServicesSurvey from "../applicant/ApplicantServicesSurvey";
import { getLoginMacPayload } from "../utils/userMacAddress";
import useAuditMac from "../utils/useAuditMac";
import CollegeApplicantProcessTabs from "../components/CollegeApplicantProcessTabs";

const ApplicantCollegeFamilyBackground = () => {
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
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");   // ✅ NEW
  const [stepperColor, setStepperColor] = useState("#000000");       // ✅ NEW

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");

  useEffect(() => {
    if (!settings) return;

    // 🎨 Colors
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);   // ✅ NEW
    if (colors.stepper) setStepperColor(colors.stepper);           // ✅ NEW

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

  }, [settings]);

  const fetchByPersonId = async (personID) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/person_with_applicant/${personID}`);

      let siblingsVal = res.data.siblings;
      if (typeof siblingsVal === "string") {
        try { siblingsVal = JSON.parse(siblingsVal); } catch { siblingsVal = []; }
      }
      const safePerson = {
        ...res.data,
        siblings: Array.isArray(siblingsVal) ? siblingsVal : [],
        has_no_siblings: res.data.has_no_siblings === 1 ? 1 : 0,
      };

      setPerson(safePerson);
      setSelectedPerson(safePerson);
      if (res.data?.applicant_number) {
      }
    } catch (err) {
      console.error("❌ person_with_applicant failed:", err);
    }
  };

  const navigate = useNavigate();
  const [explicitSelection, setExplicitSelection] = useState(false);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [person, setPerson] = useState({
    solo_parent: "", father_deceased: "", father_family_name: "", father_given_name: "", father_middle_name: "",
    father_ext: "", father_nickname: "", father_education: "", father_education_level: "", father_last_school: "", father_course: "", father_year_graduated: "", father_school_address: "", father_contact: "", father_occupation: "", father_employer: "",
    father_income: "", father_email: "", mother_deceased: "", mother_family_name: "", mother_given_name: "", mother_middle_name: "", mother_ext: "", mother_nickname: "", mother_education: "", mother_education_level: "", mother_last_school: "", mother_course: "",
    mother_year_graduated: "", mother_school_address: "", mother_contact: "", mother_occupation: "", mother_employer: "", mother_income: "", mother_email: "", guardian: "", guardian_family_name: "", guardian_given_name: "",
    guardian_middle_name: "", guardian_ext: "", guardian_nickname: "", guardian_address: "", guardian_contact: "", guardian_email: "", annual_income: "", siblings: [],        // ✅ NEW
    has_no_siblings: 0,  // ✅ NEW
  });
  const [selectedPerson, setSelectedPerson] = useState(null);

  // ✅ Safe handleBlur for SuperAdmin — updates correct applicant only
  const handleBlur = async () => {
    try {
      // ✅ Determine correct applicant/person_id
      const targetId = selectedPerson?.person_id || queryPersonId || person.person_id;
      if (!targetId) {
        console.warn("⚠️ No valid applicant ID found — skipping update.");
        return;
      }

      const allowedFields = [
        "person_id", "profile_img", "campus", "academicProgram", "classifiedAs", "applyingAs",
        "program", "program2", "program3", "yearLevel",
        "last_name", "first_name", "middle_name", "extension", "nickname",
        "height", "weight", "lrnNumber", "nolrnNumber", "gender",
        "pwdMember", "pwdType", "pwdId",
        "birthOfDate", "age", "birthPlace", "languageDialectSpoken",
        "citizenship", "religion", "civilStatus", "tribeEthnicGroup",
        "cellphoneNumber", "emailAddress",
        "presentStreet", "presentBarangay", "presentZipCode", "presentRegion",
        "presentProvince", "presentMunicipality", "presentDswdHouseholdNumber",
        "sameAsPresentAddress",
        "permanentStreet", "permanentBarangay", "permanentZipCode",
        "permanentRegion", "permanentProvince", "permanentMunicipality",
        "permanentDswdHouseholdNumber",
        "solo_parent",
        "father_deceased", "father_family_name", "father_given_name", "father_middle_name",
        "father_ext", "father_nickname", "father_education", "father_education_level",
        "father_last_school", "father_course", "father_year_graduated", "father_school_address",
        "father_contact", "father_occupation", "father_employer", "father_income", "father_email",
        "mother_deceased", "mother_family_name", "mother_given_name", "mother_middle_name",
        "mother_ext", "mother_nickname", "mother_education", "mother_education_level",
        "mother_last_school", "mother_course", "mother_year_graduated", "mother_school_address",
        "mother_contact", "mother_occupation", "mother_employer", "mother_income", "mother_email",
        "guardian", "guardian_family_name", "guardian_given_name", "guardian_middle_name",
        "guardian_ext", "guardian_nickname", "guardian_address", "guardian_contact", "guardian_email",
        "annual_income",
        "schoolLevel", "schoolLastAttended", "schoolAddress", "courseProgram",
        "honor", "generalAverage", "yearGraduated",
        "schoolLevel1", "schoolLastAttended1", "schoolAddress1", "courseProgram1",
        "honor1", "generalAverage1", "yearGraduated1",
        "strand",
        // 🩺 Health and medical
        "cough", "colds", "fever", "asthma", "faintingSpells", "heartDisease",
        "tuberculosis", "frequentHeadaches", "hernia", "chronicCough", "headNeckInjury",
        "hiv", "highBloodPressure", "diabetesMellitus", "allergies", "cancer",
        "smokingCigarette", "alcoholDrinking", "hospitalized", "hospitalizationDetails",
        "medications",
        // 🧬 Covid / Vaccination
        "hadCovid", "covidDate",
        "vaccine1Brand", "vaccine1Date", "vaccine2Brand", "vaccine2Date",
        "booster1Brand", "booster1Date", "booster2Brand", "booster2Date",
        // 🧪 Lab results / medical findings
        "chestXray", "cbc", "urinalysis", "otherworkups",
        // 🧍 Additional fields
        "symptomsToday", "remarks",
        // ✅ Agreement / Meta
        "termsOfAgreement", "created_at", "current_step"
      ];

      // ✅ Clean payload before sending
      const cleanedData = Object.fromEntries(
        Object.entries(person).filter(([key]) => allowedFields.includes(key))
      );

      if (Object.keys(cleanedData).length === 0) {
        console.warn("⚠️ No valid fields to update — skipping blur save.");
        return;
      }

      // ✅ Execute safe update
      await axios.put(`${API_BASE_URL}/api/person/${targetId}`, cleanedData);
      console.log(`💾 Auto-saved (on blur) for person_id: ${targetId}`);
    } catch (err) {
      console.error("❌ Auto-save (on blur) failed:", {
        message: err.message,
        status: err.response?.status,
        details: err.response?.data || err,
      });
    }
  };
  // Real-time save on every character typed
  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;

    const updatedPerson = {
      ...person,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    };

    // If updating either mother_income or father_income, calculate total and set annual_income
    if (name === "mother_income" || name === "father_income") {
      const motherIncome = parseFloat(name === "mother_income" ? value : updatedPerson.mother_income) || 0;
      const fatherIncome = parseFloat(name === "father_income" ? value : updatedPerson.father_income) || 0;
      const totalIncome = motherIncome + fatherIncome;

      let annualIncomeBracket = "";
      if (totalIncome <= 80000) {
        annualIncomeBracket = "80,000 and below";
      } else if (totalIncome <= 135000) {
        annualIncomeBracket = "80,000 to 135,000";
      } else if (totalIncome <= 250000) {
        annualIncomeBracket = "135,000 to 250,000";
      } else if (totalIncome <= 500000) {
        annualIncomeBracket = "250,000 to 500,000";
      } else if (totalIncome <= 1000000) {
        annualIncomeBracket = "500,000 to 1,000,000";
      } else {
        annualIncomeBracket = "1,000,000 and above";
      }

      updatedPerson.annual_income = annualIncomeBracket;
    }

    setPerson(updatedPerson);
    handleUpdate(updatedPerson); // No delay, real-time save
  };



  // ✅ Safe handleUpdate function (no DB errors, correct applicant update)
  const handleUpdate = async (updatedData) => {
    if (!person) return;

    try {
      // ✅ Get correct applicant ID
      const targetId = selectedPerson?.person_id || queryPersonId || person.person_id;
      if (!targetId) {
        console.warn("⚠️ No valid applicant ID found — skipping update.");
        return;
      }

      // ✅ Only include valid columns existing in person_table
      const allowedFields = [
        "person_id", "profile_img", "campus", "academicProgram", "classifiedAs", "applyingAs",
        "program", "program2", "program3", "yearLevel",
        "last_name", "first_name", "middle_name", "extension", "nickname",
        "height", "weight", "lrnNumber", "nolrnNumber", "gender",
        "pwdMember", "pwdType", "pwdId",
        "birthOfDate", "age", "birthPlace", "languageDialectSpoken",
        "citizenship", "religion", "civilStatus", "tribeEthnicGroup",
        "cellphoneNumber", "emailAddress",
        "presentStreet", "presentBarangay", "presentZipCode", "presentRegion",
        "presentProvince", "presentMunicipality", "presentDswdHouseholdNumber",
        "sameAsPresentAddress",
        "permanentStreet", "permanentBarangay", "permanentZipCode",
        "permanentRegion", "permanentProvince", "permanentMunicipality",
        "permanentDswdHouseholdNumber",
        "solo_parent",
        "father_deceased", "father_family_name", "father_given_name", "father_middle_name",
        "father_ext", "father_nickname", "father_education", "father_education_level",
        "father_last_school", "father_course", "father_year_graduated", "father_school_address",
        "father_contact", "father_occupation", "father_employer", "father_income", "father_email",
        "mother_deceased", "mother_family_name", "mother_given_name", "mother_middle_name",
        "mother_ext", "mother_nickname", "mother_education", "mother_education_level",
        "mother_last_school", "mother_course", "mother_year_graduated", "mother_school_address",
        "mother_contact", "mother_occupation", "mother_employer", "mother_income", "mother_email",
        "guardian", "guardian_family_name", "guardian_given_name", "guardian_middle_name",
        "guardian_ext", "guardian_nickname", "guardian_address", "guardian_contact", "guardian_email",
        "annual_income",
        "schoolLevel", "schoolLastAttended", "schoolAddress", "courseProgram",
        "honor", "generalAverage", "yearGraduated",
        "schoolLevel1", "schoolLastAttended1", "schoolAddress1", "courseProgram1",
        "honor1", "generalAverage1", "yearGraduated1",
        "strand",
        // 🩺 Health and medical
        "cough", "colds", "fever", "asthma", "faintingSpells", "heartDisease",
        "tuberculosis", "frequentHeadaches", "hernia", "chronicCough", "headNeckInjury",
        "hiv", "highBloodPressure", "diabetesMellitus", "allergies", "cancer",
        "smokingCigarette", "alcoholDrinking", "hospitalized", "hospitalizationDetails",
        "medications",
        // 🧬 Covid / Vaccination
        "hadCovid", "covidDate",
        "vaccine1Brand", "vaccine1Date", "vaccine2Brand", "vaccine2Date",
        "booster1Brand", "booster1Date", "booster2Brand", "booster2Date",
        // 🧪 Lab results / medical findings
        "chestXray", "cbc", "urinalysis", "otherworkups",
        // 🧍 Additional fields
        "symptomsToday", "remarks",
        // ✅ Agreement / Meta
        "termsOfAgreement", "created_at", "current_step"
      ];

      // ✅ Clean the payload
      const cleanedData = Object.fromEntries(
        Object.entries(updatedData).filter(([key]) => allowedFields.includes(key))
      );

      if (Object.keys(cleanedData).length === 0) {
        console.warn("⚠️ No valid fields to update — skipping request.");
        return;
      }

      // ✅ Send update request
      await axios.put(`${API_BASE_URL}/api/person/${targetId}`, cleanedData);

      console.log(`✅ SuperAdmin updated person_id: ${targetId} successfully.`);
    } catch (error) {
      console.error("❌ SuperAdmin update failed:", {
        message: error.message,
        status: error.response?.status,
        details: error.response?.data || error,
      });
    }
  };




  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);


  const pageId = 44;

  const [employeeID, setEmployeeID] = useState("");

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
      const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`);
      if (response.data && response.data.page_privilege === 1) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error('Error checking access:', error);
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

    const allowedRoles = ["registrar", "applicant", "superadmin"];
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

    if (storedRole === "applicant") {
      setUserID(loggedInPersonId);
      return;
    }

    // ⭐ CASE 2: URL has NO ID but we have a last selected student
    if (lastSelected) {
      setUserID(lastSelected);
      return;
    }

    // ⭐ CASE 3: No URL ID and no last selected → start blank
    setUserID("");
  }, [queryPersonId]);


  useEffect(() => {
    let consumedFlag = false;

    const tryLoad = async () => {
      if (queryPersonId) {
        await fetchByPersonId(queryPersonId);
        setExplicitSelection(true);
        consumedFlag = true;
        return;
      }

      // fallback only if it's a fresh selection from Applicant List
      const source = sessionStorage.getItem("admin_edit_person_id_source");
      const tsStr = sessionStorage.getItem("admin_edit_person_id_ts");
      const id = sessionStorage.getItem("admin_edit_person_id");
      const ts = tsStr ? parseInt(tsStr, 10) : 0;
      const isFresh =
        ["applicant_list_college", "applicant_list"].includes(source) &&
        Date.now() - ts < 5 * 60 * 1000;

      if (id && isFresh) {
        await fetchByPersonId(id);
        setExplicitSelection(true);
        consumedFlag = true;
      }
    };

    tryLoad().finally(() => {
      // consume the freshness so it won't auto-load again later
      if (consumedFlag) {
        sessionStorage.removeItem("admin_edit_person_id_source");
        sessionStorage.removeItem("admin_edit_person_id_ts");
      }
    });
  }, [queryPersonId]);




  const steps = person.person_id
    ? [
      { label: "Personal Information", icon: <PersonIcon />, path: `/applicant_college_personal_information?person_id=${userID}` },
      { label: "Family Background", icon: <FamilyRestroomIcon />, path: `/applicant_college_family_background?person_id=${userID}` },
      { label: "Educational Attainment", icon: <SchoolIcon />, path: `/applicant_college_educational_attainment?person_id=${userID}` },
      { label: "Health Medical Records", icon: <HealthAndSafetyIcon />, path: `/applicant_college_health_medical_records?person_id=${userID}` },
      { label: "Other Information", icon: <InfoIcon />, path: `/applicant_college_other_information?person_id=${userID}` },
    ]
    : [];



  const [activeStep, setActiveStep] = useState(1);

  const fetchPersonData = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/person/${id}`);

      // Sanitize null values and set state
      const safePerson = Object.fromEntries(
        Object.entries(res.data).map(([key, val]) => [key, val ?? ""])
      );

      setPerson(safePerson);

      // ✅ Set dropdown based on existing deceased values
      if (res.data.solo_parent === 1) {
        if (res.data.father_deceased === 1) {
          setSoloParentChoice("Mother");
        } else if (res.data.mother_deceased === 1) {
          setSoloParentChoice("Father");
        }
      }
    } catch (error) {
      console.error("Failed to fetch person data:", error);
    }
  };


  const [isFatherDeceased, setIsFatherDeceased] = useState(false);
  const [isMotherDeceased, setIsMotherDeceased] = useState(false);

  useEffect(() => {
    setIsFatherDeceased(person.father_deceased === 1);
  }, [person.father_deceased]);

  useEffect(() => {
    setIsMotherDeceased(person.mother_deceased === 1);
  }, [person.mother_deceased]);



  // No need for local states like isFatherDeceased, etc. if you're using person state directly
  useEffect(() => {
    if (person.parent_type === "Mother") {
      setPerson((prev) => ({
        ...prev,
        father_deceased: 1,
        mother_deceased: 0,
      }));
    } else if (person.parent_type === "Father") {
      setPerson((prev) => ({
        ...prev,
        mother_deceased: 1,
        father_deceased: 0,
      }));
    }
  }, [person.parent_type]);



  const [errors, setErrors] = useState({});




  const [soloParentChoice, setSoloParentChoice] = useState("");
  const [clickedSteps, setClickedSteps] = useState(Array(steps.length).fill(false));

  const handleStepClick = (index) => {
    setActiveStep(index);
    const newClickedSteps = [...clickedSteps];
    newClickedSteps[index] = true;
    setClickedSteps(newClickedSteps);
  };

  const handleGuardianChange = (e) => {
    const { value } = e.target;

    let updatedPerson = { ...person, guardian: value };

    if (value === "Father") {
      updatedPerson = {
        ...updatedPerson,
        guardian_family_name: person.father_family_name || "",
        guardian_given_name: person.father_given_name || "",
        guardian_middle_name: person.father_middle_name || "",
        guardian_ext: person.father_ext || "",
        guardian_nickname: person.father_nickname || "",
        guardian_contact: person.father_contact || "",
        guardian_email: person.father_email || "",
      };
    }

    if (value === "Mother") {
      updatedPerson = {
        ...updatedPerson,
        guardian_family_name: person.mother_family_name || "",
        guardian_given_name: person.mother_given_name || "",
        guardian_middle_name: person.mother_middle_name || "",
        guardian_ext: person.mother_ext || "",
        guardian_nickname: person.mother_nickname || "",
        guardian_contact: person.mother_contact || "",
        guardian_email: person.mother_email || "",
      };
    }

    setPerson(updatedPerson);
  };

  const addSibling = () => {
    const updatedSiblings = [
      ...(person.siblings || []),
      { id: Date.now(), name: "", age: "", schoolLevel: "", schoolLastAttended: "", schoolAddress: "", occupation: "", monthlyIncome: "" },
    ];
    setPerson({ ...person, siblings: updatedSiblings });
  };

  const removeSibling = (index) => {
    const updatedSiblings = (person.siblings || []).filter((_, i) => i !== index);
    setPerson({ ...person, siblings: updatedSiblings });
  };

  const handleSiblingFieldChange = (index, field, value) => {
    const updatedSiblings = [...(person.siblings || [])];
    updatedSiblings[index] = { ...updatedSiblings[index], [field]: value };
    setPerson((prev) => ({ ...prev, siblings: updatedSiblings }));
  };

  const handleNoSiblingsCheck = (e) => {
    const checked = e.target.checked;
    setPerson({
      ...person,
      has_no_siblings: checked ? 1 : 0,
      siblings: checked ? [] : person.siblings,
    });
  };


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
      Component: AdminECATApplicationForm,
    },
    personalData: {
      label: "Personal Data Form",
      endpoint: "/api/generate-personal-data-form-pdf",
      filenamePrefix: "Personal_Data_Form",
      Component: AdminPersonalDataForm,
    },
    registrar: {
      label: `Application For ${shortTerm ? shortTerm.toUpperCase() : ""} College Admission`,
      endpoint: "/api/generate-registrar-form-pdf",
      filenamePrefix: "Office_Of_The_Registrar",
      Component: AdminOfficeOfTheRegistrar,
    },
    admissionServices: {
      label: "Application/Student Satisfactory Survey",
      endpoint: "/api/generate-admission-services-pdf",
      filenamePrefix: "Admission_Services_CSM_Form",
      Component: ApplicantServicesSurvey,
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
    if (!config || generatingKey) return;

    // 🔒 Require a searched/selected applicant before generating anything
    if (!userID || !person?.person_id) {
      setSnackbar({
        open: true,
        message: "Please search and select an applicant first.",
        severity: "warning",
      });
      return;
    }

    setGeneratingKey(key);

    try {
      // give the hidden Admin component time to mount + finish its own
      // fetches for this applicant before we read its rendered HTML
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const node = hiddenFormRef.current;
      if (!node) throw new Error(`${config.label} did not render in time.`);

      // ✅ FIX — sync live checkbox "checked" property onto the cloned markup
      // before serializing. node.innerHTML alone never reflects the DOM
      // property React set, so PDFs generated from it always show unchecked
      // boxes even when the database has values like gender/civilStatus set.
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
          document_label: config.label,
          audit_print_action: "PRINTING_APPLICANT_DOCS",
          audit_actor_id: employeeID || localStorage.getItem("employee_id") || "unknown",
          audit_actor_role: userRole || "registrar",
          ...getLoginMacPayload(),
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
      // Still audit when download fails (e.g. IDM intercept) so printing history is recorded.
      await logPrintingApplicantDocs(config.label, { failed: true });
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
    if (!userID || !person?.person_id) {
      setSnackbar({
        open: true,
        message: "Please search and select an applicant first.",
        severity: "warning",
      });
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/api/verified-exam-applicants`);
      const verified = res.data.some((a) => a.person_id === parseInt(userID));

      if (!verified) {
        setExamPermitError("❌ This applicant's documents are not yet verified.");
        setExamPermitModalOpen(true);
        return;
      }

      setGeneratingKey("examPermitDownload");
      setShowPrintView(true);
      await new Promise((resolve) => setTimeout(resolve, 800));

      const divToPrint = divToPrintRef.current;
      if (!divToPrint) throw new Error("Exam permit content did not render in time.");

      const response = await axios.post(
        `${API_BASE_URL}/api/generate-exam-permit-pdf`,
        {
          html: divToPrint.innerHTML,
          applicant_number: person?.applicant_number || "",
          last_name: person?.last_name || "",
          first_name: person?.first_name || "",
        },
        { responseType: "blob" },
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const fileName = buildClientFilename("Exam_Permit", {
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
      console.error("Error downloading exam permit PDF:", err);
      setExamPermitError("⚠️ Unable to generate the Exam Permit PDF right now.");
      setExamPermitModalOpen(true);
    } finally {
      setShowPrintView(false);
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
    { key: "examPermitDownload", label: "Examination Permit", onClick: downloadExamPermitPDF },
  ];











  const [canPrintPermit, setCanPrintPermit] = useState(false);

  useEffect(() => {
    if (!userID) return;
    axios.get(`${API_BASE_URL}/api/verified-exam-applicants`)
      .then(res => {
        const verified = res.data.some(a => a.person_id === parseInt(userID));
        setCanPrintPermit(verified);
      });
  }, [userID]);



  // Put this at the very bottom before the return 
  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return (
      <Unauthorized />
    );
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
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>



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



      {/* Top header: DOCUMENTS SUBMITTED + Search */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',

          mb: 2,

        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 'bold',
            color: titleColor,
            fontSize: '36px',
          }}
        >
          FAMILY BACKGROUND
        </Typography>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />

      <br />
      <br />
      <CollegeApplicantProcessTabs />
      <br />
      <br />




      <TableContainer component={Paper} sx={{ width: '100%', mb: 1 }}>
        <Table>
          <TableHead sx={{ backgroundColor: headerColor, border: `1px solid ${borderColor}`, }}>
            <TableRow>
              {/* Left cell: Applicant ID */}
              <TableCell sx={{ color: 'white', fontSize: '20px', fontFamily: "Poppins, sans-serif", border: 'none' }}>
                Applicant ID:&nbsp;
                <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: "normal", textDecoration: "underline" }}>
                  {person?.applicant_number || "N/A"}

                </span>
              </TableCell>

              {/* Right cell: Applicant Name */}
              <TableCell
                align="right"
                sx={{ color: 'white', fontSize: '20px', fontFamily: "Poppins, sans-serif", border: 'none' }}
              >
                Applicant Name:&nbsp;
                <span style={{ fontFamily: "Poppins, sans-serif", fontWeight: "normal", textDecoration: "underline" }}>
                  {person?.last_name?.toUpperCase()}, {person?.first_name?.toUpperCase()}{" "}
                  {person?.middle_name?.toUpperCase()} {person?.extension?.toUpperCase() || ""}
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
            Complete the applicant form to secure your place for the upcoming academic year at{" "}
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

        {person.person_id && (
          <Box sx={{ display: "flex", justifyContent: "center", width: "100%", px: 4 }}>
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
                        backgroundColor: activeStep === index ? headerColor : "#E8C999",
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
        )}

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
              <Typography style={{ fontSize: "20px", padding: "10px", fontFamily: "Poppins, sans-serif" }}>Step 2: Family Background</Typography>
            </Box>
          </Container>


          <Container maxWidth="100%" sx={{ backgroundColor: "#f1f1f1", border: `1px solid ${borderColor}`, padding: 4, borderRadius: 2, boxShadow: 3 }}>
            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Family Background:</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />




            <Box display="flex" gap={3} width="100%" alignItems="center">
              {/* Solo Parent Checkbox */}
              <Box marginTop="10px" display="flex" alignItems="center" gap={1}>
                <Checkbox
                  disabled
                  name="solo_parent"
                  checked={person.solo_parent === 1}
                  onChange={(e) => {
                    const checked = e.target.checked;

                    const newPerson = {
                      ...person,
                      solo_parent: checked ? 1 : 0,
                      father_deceased: checked && soloParentChoice === "Mother" ? 1 : checked ? 0 : null,
                      mother_deceased: checked && soloParentChoice === "Father" ? 1 : checked ? 0 : null,
                    };

                    setPerson(newPerson);
                    handleUpdate(newPerson); // Save immediately
                  }}
                  onBlur={handleBlur}
                  sx={{ width: 25, height: 25 }}
                />
                <label style={{ fontFamily: "Poppins, sans-serif" }}>Solo Parent</label>
              </Box>

              {/* Parent Type Dropdown */}
              {person.solo_parent === 1 && (
                <FormControl size="small" style={{ width: "200px" }}>
                  <InputLabel id="parent-select-label">- Parent- </InputLabel>
                  <Select
                    labelId="parent-select-label"
                    value={soloParentChoice}
                    onChange={(e) => {
                      const choice = e.target.value;
                      setSoloParentChoice(choice);

                      const updatedPerson = {
                        ...person,
                        father_deceased: choice === "Mother" ? 1 : 0,
                        mother_deceased: choice === "Father" ? 1 : 0,
                      };

                      setPerson(updatedPerson);
                      handleUpdate(updatedPerson);
                    }}
                  >
                    <MenuItem value="Father">Father</MenuItem>
                    <MenuItem value="Mother">Mother</MenuItem>
                  </Select>
                </FormControl>
              )}


            </Box>

            <br />



            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Father's Details</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <Box sx={{ mb: 2 }}>
              {/* Father Deceased Checkbox */}
              {/* Father Deceased Checkbox */}
              <FormControlLabel
                control={
                  <Checkbox
                    disabled
                    name="father_deceased"
                    checked={person.father_deceased === 1}
                    onChange={(e) => {
                      const checked = e.target.checked;

                      // Call your form handler
                      handleChange(e);

                      // Update local state
                      setPerson((prev) => ({
                        ...prev,
                        father_deceased: checked ? 1 : 0,
                      }));
                    }}
                    onBlur={handleBlur}
                  />
                }
                label="Father Seperated / Deceased"
              />
              <br />


              {/* Show Father's Info ONLY if not deceased */}
              {!isFatherDeceased && (
                <>
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>Father Family Name</Typography>
                      <TextField
                        InputProps={{ readOnly: true }}

                        fullWidth
                        size="small"
                        required
                        placeholder="Enter Father Last Name"
                        name="father_family_name"
                        value={person.father_family_name ?? ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.father_family_name} helperText={errors.father_family_name ? "This field is required." : ""}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>Father Given Name</Typography>
                      <TextField
                        InputProps={{ readOnly: true }}

                        fullWidth
                        size="small"
                        required
                        name="father_given_name"
                        placeholder="Enter Father First Name"
                        value={person.father_given_name ?? ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.father_given_name} helperText={errors.father_given_name ? "This field is required." : ""}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>Father Middle Name</Typography>
                      <TextField
                        InputProps={{ readOnly: true }}

                        fullWidth
                        size="small"
                        required
                        name="father_middle_name"
                        placeholder="Enter Father Middle Name"
                        value={person.father_middle_name ?? ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.father_middle_name} helperText={errors.father_middle_name ? "This field is required." : ""}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>Father Extension</Typography>
                      <FormControl fullWidth size="small" required error={!!errors.father_ext}>
                        <InputLabel id="father-ext-label">Extension</InputLabel>
                        <Select
                          readOnly
                          labelId="father-ext-label"
                          id="father_ext"
                          name="father_ext"
                          value={person.father_ext || ""}
                          label="Extension"
                          onChange={handleChange}
                          onBlur={handleBlur}
                        >
                          <MenuItem value=""><em>Select Extension</em></MenuItem>
                          <MenuItem value="Jr.">Jr.</MenuItem>
                          <MenuItem value="Sr.">Sr.</MenuItem>
                          <MenuItem value="I">I</MenuItem>
                          <MenuItem value="II">II</MenuItem>
                          <MenuItem value="III">III</MenuItem>
                          <MenuItem value="IV">IV</MenuItem>
                          <MenuItem value="V">V</MenuItem>
                        </Select>
                        {errors.father_ext && (
                          <FormHelperText>This field is required.</FormHelperText>
                        )}
                      </FormControl>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>Father Nickname</Typography>
                      <TextField
                        InputProps={{ readOnly: true }}

                        fullWidth
                        size="small"
                        required
                        name="father_nickname"
                        placeholder="Enter Father Nickname"
                        value={person.father_nickname ?? ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.father_nickname} helperText={errors.father_nickname ? "This field is required." : ""}
                      />
                    </Box>
                  </Box>

                  <Typography sx={{ fontSize: '20px', color: '#6D2323', fontWeight: 'bold', mt: 3 }}>
                    Father's Educational Background
                  </Typography>
                  <hr style={{ border: '1px solid #ccc', width: '100%' }} />
                  <br />
                  <Box display="flex" gap={3} alignItems="center">
                    {/* Father's Education Not Applicable Checkbox */}
                    <Checkbox
                      disabled
                      name="father_education"
                      checked={person.father_education === 1}
                      onChange={(e) => {
                        const isChecked = e.target.checked;

                        const updatedPerson = {
                          ...person,
                          father_education: isChecked ? 1 : 0,
                          ...(isChecked
                            ? {
                              father_education_level: "",
                              father_last_school: "",
                              father_course: "",
                              father_year_graduated: "",
                              father_school_address: "",
                            }
                            : {}),
                        };

                        setPerson(updatedPerson);
                        handleUpdate(updatedPerson); // Immediate update (optional)
                      }}
                      onBlur={handleBlur}
                      sx={{ width: 25, height: 25 }}
                    />
                    <label style={{ fontFamily: "Poppins, sans-serif" }}>Father's education not applicable</label>
                  </Box>




                  {/* Father Educational Details (conditionally rendered) */}
                  {person.father_education !== 1 && (
                    <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>Father Education Level</Typography>
                        <TextField
                          InputProps={{ readOnly: true }}

                          fullWidth
                          size="small"
                          placeholder="Enter Father Education Level"
                          name="father_education_level"
                          value={person.father_education_level ?? ""}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={errors.father_education_level}
                          helperText={errors.father_education_level ? "This field is required." : ""}
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>Father Last School</Typography>
                        <TextField
                          InputProps={{ readOnly: true }}

                          fullWidth
                          size="small"
                          name="father_last_school"
                          placeholder="Enter Father Last School"
                          value={person.father_last_school ?? ""}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={errors.father_last_school}
                          helperText={errors.father_last_school ? "This field is required." : ""}
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>Father Course</Typography>
                        <TextField
                          InputProps={{ readOnly: true }}

                          fullWidth
                          size="small"
                          name="father_course"
                          placeholder="Enter Father Course"
                          value={person.father_course ?? ""}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={errors.father_course}
                          helperText={errors.father_course ? "This field is required." : ""}
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>Father Year Graduated</Typography>
                        <TextField
                          InputProps={{ readOnly: true }}
                          type="number"
                          fullWidth
                          size="small"
                          name="father_year_graduated"
                          placeholder="Enter Father Year Graduated"
                          value={person.father_year_graduated ?? ""}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={errors.father_year_graduated}
                          helperText={errors.father_year_graduated ? "This field is required." : ""}
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>Father School Address</Typography>
                        <TextField
                          InputProps={{ readOnly: true }}

                          fullWidth
                          size="small"
                          name="father_school_address"
                          placeholder="Enter Father School Address"
                          value={person.father_school_address ?? ""}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={errors.father_school_address}
                          helperText={errors.father_school_address ? "This field is required." : ""}
                        />
                      </Box>
                    </Box>
                  )}

                  <Typography sx={{ fontSize: '20px', color: '#6D2323', fontWeight: 'bold', mt: 3 }}>
                    Father's Contact Information
                  </Typography>
                  <hr style={{ border: '1px solid #ccc', width: '100%' }} />
                  <br />

                  <Box sx={{ display: "flex", gap: 2, mb: 2 }}>

                    {/* Father Contact */}
                    <Box flex={1} display="flex" flexDirection="column">
                      <Typography variant="subtitle2" mb={0.5}>Father Contact</Typography>

                      <TextField


                        fullWidth
                        size="small"
                        name="father_contact"
                        placeholder="9XXXXXXXXX"
                        value={person.father_contact || ""}
                        onBlur={() => handleUpdate(person)}
                        onChange={(e) => {
                          const onlyNumbers = e.target.value.replace(/\D/g, "");
                          handleChange({
                            target: {
                              name: "father_contact",
                              value: onlyNumbers,
                            },
                          });
                        }}
                        error={!!errors.father_contact}
                        helperText={errors.father_contact && "This field is required."}
                        InputProps={{
                          readOnly: true,
                          startAdornment: (
                            <Typography sx={{ mr: 1, fontWeight: "bold" }}>+63</Typography>
                          ),
                        }}
                      />
                    </Box>

                    {/* Father Occupation */}
                    <Box flex={1}>
                      <Typography variant="subtitle2" mb={0.5}>Father Occupation</Typography>
                      <TextField
                        InputProps={{ readOnly: true }}


                        fullWidth
                        size="small"
                        required
                        name="father_occupation"
                        value={person.father_occupation || ""}
                        placeholder="Enter Father Occupation"
                        onChange={handleChange}
                        onBlur={() => handleUpdate(person)}
                        error={errors.father_occupation}
                        helperText={errors.father_occupation ? "This field is required." : ""}
                      />
                    </Box>

                    {/* Father Employer */}
                    <Box flex={1}>
                      <Typography variant="subtitle2" mb={0.5}>Father Employer</Typography>
                      <TextField
                        InputProps={{ readOnly: true }}


                        fullWidth
                        size="small"
                        required
                        name="father_employer"
                        placeholder="Enter Father Employer"
                        value={person.father_employer || ""}
                        onChange={handleChange}
                        onBlur={() => handleUpdate(person)}
                        error={errors.father_employer}
                        helperText={errors.father_employer ? "This field is required." : ""}
                      />
                    </Box>

                    {/* Father Income */}
                    <Box flex={1}>
                      <Typography variant="subtitle2" mb={0.5}>Father Income</Typography>
                      <TextField
                        InputProps={{ readOnly: true }}


                        fullWidth
                        size="small"
                        required
                        name="father_income"
                        placeholder="Enter Father Income"
                        value={person.father_income || ""}
                        onChange={(e) => {
                          const onlyNumbers = e.target.value.replace(/\D/g, ""); // numbers only
                          handleChange({
                            target: {
                              name: "father_income",
                              value: onlyNumbers,
                            },
                          });
                        }}
                        onBlur={() => handleUpdate(person)}
                        error={errors.father_income}
                        helperText={errors.father_income ? "This field is required." : ""}
                      />
                    </Box>
                    {/* Father Email */}

                  </Box>

                  <Box flex={1}>
                    <Typography variant="subtitle2" mb={0.5}>Father Email Address</Typography>
                    <TextField
                      InputProps={{ readOnly: true }}


                      fullWidth
                      size="small"
                      required
                      name="father_email"
                      placeholder="Enter Father Email Address"
                      value={person.father_email || ""}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\s/g, "");
                        handleChange({
                          target: { name: "father_email", value: cleaned }
                        });
                      }}
                      onBlur={(e) => {
                        let value = e.target.value.trim();
                        if (value && !value.includes("@")) {
                          value += "@gmail.com";
                        }
                        handleChange({
                          target: { name: "father_email", value }
                        });
                        handleUpdate(person);
                      }}
                      error={errors.father_email}
                      helperText={errors.father_email ? "Please enter a valid email address." : ""}
                    />
                  </Box>

                </>
              )}
            </Box>




            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Mother's Details</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />
            <Box sx={{ mb: 2 }}>
              {/* Mother Deceased Checkbox */}

              <FormControlLabel
                control={
                  <Checkbox
                    disabled
                    name="mother_deceased"
                    checked={person.mother_deceased === 1}
                    onChange={(e) => {
                      const checked = e.target.checked;

                      // Call your form handler
                      handleChange(e);

                      // Update local state
                      setPerson((prev) => ({
                        ...prev,
                        mother_deceased: checked ? 1 : 0,
                      }));
                    }}
                    onBlur={handleBlur}
                  />
                }
                label="Mother Seperated / Deceased"
              />
              <br />


              {/* Show Mother's Info ONLY if not deceased */}
              {!isMotherDeceased && (
                <>
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>Mother Family Name</Typography>
                      <TextField
                        InputProps={{ readOnly: true }}

                        fullWidth
                        size="small"
                        required
                        name="mother_family_name"
                        placeholder="Enter your Mother Last Name"
                        value={person.mother_family_name ?? ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.mother_family_name}
                        helperText={errors.mother_family_name ? "This field is required." : ""}
                      />
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>Mother First Name</Typography>
                      <TextField
                        InputProps={{ readOnly: true }}

                        fullWidth
                        size="small"
                        required
                        name="mother_given_name"
                        placeholder="Enter your Mother First Name"
                        value={person.mother_given_name ?? ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.mother_given_name}
                        helperText={errors.mother_given_name ? "This field is required." : ""}
                      />
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>Mother Middle Name</Typography>
                      <TextField
                        InputProps={{ readOnly: true }}

                        fullWidth
                        size="small"
                        required
                        name="mother_middle_name"
                        placeholder="Enter your Mother Middle Name"
                        value={person.mother_middle_name ?? ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.mother_middle_name}
                        helperText={errors.mother_middle_name ? "This field is required." : ""}
                      />
                    </Box>

                    {/* Mother Extension */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>Mother Extension</Typography>
                      <FormControl fullWidth size="small" >
                        <InputLabel id="mother-ext-label">Extension</InputLabel>
                        <Select
                          readOnly
                          labelId="mother-ext-label"
                          id="mother_ext"
                          name="mother_ext"
                          value={person.mother_ext || ""}
                          label="Extension"
                          onChange={handleChange}
                          onBlur={handleBlur}
                        >
                          <MenuItem value=""><em>Select Extension</em></MenuItem>
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


                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={1}>Mother Nickname</Typography>
                      <TextField
                        InputProps={{ readOnly: true }}

                        fullWidth
                        size="small"
                        required
                        name="mother_nickname"
                        placeholder="Enter your Mother Nickname"
                        value={person.mother_nickname ?? ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.mother_nickname}
                        helperText={errors.mother_nickname ? "This field is required." : ""}
                      />
                    </Box>
                  </Box>


                  <Typography sx={{ fontSize: '20px', color: '#6D2323', fontWeight: 'bold', mt: 3 }}>
                    Mother's Educational Background
                  </Typography>
                  <hr style={{ border: '1px solid #ccc', width: '100%' }} />
                  <br />

                  <Box display="flex" gap={3} alignItems="center">
                    {/* Mother's Education Not Applicable Checkbox */}
                    <Checkbox
                      disabled
                      name="mother_education"
                      checked={person.mother_education === 1}
                      onChange={(e) => {
                        const isChecked = e.target.checked;

                        const updatedPerson = {
                          ...person,
                          mother_education: isChecked ? 1 : 0,
                          ...(isChecked
                            ? {
                              mother_education_level: "",
                              mother_last_school: "",
                              mother_course: "",
                              mother_year_graduated: "",
                              mother_school_address: "",
                            }
                            : {}),
                        };

                        setPerson(updatedPerson);
                        handleUpdate(updatedPerson); // Optional: Immediate save
                      }}
                      onBlur={handleBlur}
                      sx={{ width: 25, height: 25 }}
                    />
                    <label style={{ fontFamily: "Poppins, sans-serif" }}>Mother's education not applicable</label>
                  </Box>

                  {/* Mother Educational Details (conditionally rendered) */}
                  {person.mother_education !== 1 && (
                    <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>Mother Education Level</Typography>
                        <TextField
                          InputProps={{ readOnly: true }}

                          fullWidth
                          size="small"
                          name="mother_education_level"
                          placeholder="Enter your Mother Education Level"
                          value={person.mother_education_level ?? ""}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={errors.mother_education_level}
                          helperText={errors.mother_education_level ? "This field is required." : ""}
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>Mother Last School</Typography>
                        <TextField
                          InputProps={{ readOnly: true }}

                          fullWidth
                          size="small"
                          name="mother_last_school"
                          placeholder="Enter your Mother Last School Attended"
                          value={person.mother_last_school ?? ""}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={errors.mother_last_school}
                          helperText={errors.mother_last_school ? "This field is required." : ""}
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>Mother Course</Typography>
                        <TextField
                          InputProps={{ readOnly: true }}

                          fullWidth
                          size="small"
                          name="mother_course"
                          placeholder="Enter your Mother Course"
                          value={person.mother_course ?? ""}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={errors.mother_course}
                          helperText={errors.mother_course ? "This field is required." : ""}
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>Mother Year Graduated</Typography>
                        <TextField
                          InputProps={{ readOnly: true }}
                          type="number"
                          fullWidth
                          size="small"
                          name="mother_year_graduated"
                          placeholder="Enter your Mother Year Graduated"
                          value={person.mother_year_graduated ?? ""}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={errors.mother_year_graduated}
                          helperText={errors.mother_year_graduated ? "This field is required." : ""}
                        />
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" mb={1}>Mother School Address</Typography>
                        <TextField
                          InputProps={{ readOnly: true }}

                          fullWidth
                          size="small"
                          name="mother_school_address"
                          placeholder="Enter your Mother School Address"
                          value={person.mother_school_address ?? ""}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          error={errors.mother_school_address}
                          helperText={errors.mother_school_address ? "This field is required." : ""}
                        />
                      </Box>
                    </Box>
                  )}

                  <Typography sx={{ fontSize: '20px', color: '#6D2323', fontWeight: 'bold', mt: 3 }}>
                    Mother's Contact Information
                  </Typography>
                  <hr style={{ border: '1px solid #ccc', width: '100%' }} />
                  <br />

                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={0.5}>Mother Contact</Typography>
                      <TextField
                        InputProps={{ readOnly: true }}

                        fullWidth
                        size="small"
                        required
                        name="mother_contact"
                        placeholder="Enter your Mother Contact"
                        value={person.mother_contact ?? ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.mother_contact} helperText={errors.mother_contact ? "This field is required." : ""}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={0.5}>Mother Occupation</Typography>
                      <TextField
                        InputProps={{ readOnly: true }}

                        fullWidth
                        size="small"
                        required
                        name="mother_occupation"
                        placeholder="Enter your Mother Occupation"
                        value={person.mother_occupation ?? ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.mother_occupation} helperText={errors.mother_occupation ? "This field is required." : ""}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={0.5}>Mother Employer</Typography>
                      <TextField
                        InputProps={{ readOnly: true }}

                        fullWidth
                        size="small"
                        required
                        name="mother_employer"
                        placeholder="Enter your Mother Employer"
                        value={person.mother_employer ?? ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.mother_employer} helperText={errors.mother_employer ? "This field is required." : ""}
                      />
                    </Box>

                    {/* Mother Income */}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" mb={0.5}>Mother Income</Typography>
                      <TextField
                        InputProps={{ readOnly: true }}

                        fullWidth
                        size="small"
                        required
                        name="mother_income"
                        placeholder="Enter your Mother Income"
                        value={person.mother_income ?? ""}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.mother_income}
                        helperText={errors.mother_income ? "This field is required." : ""}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" mb={1}>Mother Email</Typography>
                    <TextField
                      InputProps={{ readOnly: true }}

                      fullWidth
                      size="small"
                      required
                      name="mother_email"
                      placeholder="Enter your Mother Email Address (e.g., username@gmail.com)"
                      value={person.mother_email ?? ""}
                      onChange={handleChange}
                      onBlur={handleBlur}

                    />
                  </Box>
                </>
              )}
            </Box>


            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>In Case of Emergency</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" mb={1}>Guardian</Typography>
              <FormControl style={{ marginBottom: "10px", width: "200px" }} size="small" required error={!!errors.guardian}>
                <InputLabel id="guardian-label">Guardian</InputLabel>
                <Select
                  readOnly
                  labelId="guardian-label"
                  id="guardian"
                  name="guardian"
                  value={person.guardian || ""}
                  label="Guardian"
                  onChange={handleGuardianChange}
                  onBlur={handleBlur}
                >
                  <MenuItem value=""><em>Select Guardian</em></MenuItem>
                  <MenuItem value="Father">Father</MenuItem>
                  <MenuItem value="Mother">Mother</MenuItem>
                  <MenuItem value="Brother/Sister">Brother/Sister</MenuItem>
                  <MenuItem value="Uncle">Uncle</MenuItem>
                  <MenuItem value="Aunt">Aunt</MenuItem>
                  <MenuItem value="StepFather">Stepfather</MenuItem>
                  <MenuItem value="StepMother">Stepmother</MenuItem>
                  <MenuItem value="Cousin">Cousin</MenuItem>
                  <MenuItem value="Father in Law">Father-in-law</MenuItem>
                  <MenuItem value="Mother in Law">Mother-in-law</MenuItem>
                  <MenuItem value="Sister in Law">Sister-in-law</MenuItem>
                  <MenuItem value="GrandMother">GrandMother</MenuItem>
                  <MenuItem value="GrandFather">GrandFather</MenuItem>
                  <MenuItem value="Spouse">Spouse</MenuItem>
                  <MenuItem value="Others">Others</MenuItem>
                </Select>

              </FormControl>
            </Box>



            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'nowrap' }}>
              {/* Guardian Family Name */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>Guardian Family Name</Typography>
                <TextField
                  InputProps={{ readOnly: true }}

                  fullWidth
                  size="small"
                  required
                  name="guardian_family_name"
                  placeholder="Enter your Guardian Family Name"
                  value={person.guardian_family_name ?? ""}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={!!errors.guardian_family_name}
                  helperText={errors.guardian_family_name ? "This field is required." : ""}
                />
              </Box>

              {/* Guardian First Name */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>Guardian First Name</Typography>
                <TextField
                  InputProps={{ readOnly: true }}

                  fullWidth
                  size="small"
                  required
                  name="guardian_given_name"
                  placeholder="Enter your Guardian First Name"
                  value={person.guardian_given_name ?? ""}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={!!errors.guardian_given_name}
                  helperText={errors.guardian_given_name ? "This field is required." : ""}
                />
              </Box>

              {/* Guardian Middle Name */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>Guardian Middle Name</Typography>
                <TextField
                  InputProps={{ readOnly: true }}

                  fullWidth
                  size="small"
                  required
                  name="guardian_middle_name"
                  placeholder="Enter your Guardian Middle Name"
                  value={person.guardian_middle_name ?? ""}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={!!errors.guardian_middle_name}
                  helperText={errors.guardian_middle_name ? "This field is required." : ""}
                />
              </Box>

              {/* Guardian Name Extension */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>Guardian Name Extension</Typography>
                <FormControl fullWidth size="small" required error={!!errors.guardian_ext}>
                  <InputLabel id="guardian-ext-label">Extension</InputLabel>
                  <Select
                    readOnly
                    labelId="guardian-ext-label"
                    id="guardian_ext"
                    name="guardian_ext"
                    value={person.guardian_ext || ""}
                    label="Extension"
                    onChange={handleChange}
                    onBlur={handleBlur}
                  >
                    <MenuItem value=""><em>Select Extension</em></MenuItem>
                    <MenuItem value="Jr.">Jr.</MenuItem>
                    <MenuItem value="Sr.">Sr.</MenuItem>
                    <MenuItem value="I">I</MenuItem>
                    <MenuItem value="II">II</MenuItem>
                    <MenuItem value="III">III</MenuItem>
                    <MenuItem value="IV">IV</MenuItem>
                    <MenuItem value="V">V</MenuItem>
                  </Select>
                  {errors.guardian_ext && (
                    <FormHelperText>This field is required.</FormHelperText>
                  )}
                </FormControl>
              </Box>

              {/* Guardian Nickname */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>Guardian Nickname</Typography>
                <TextField
                  InputProps={{ readOnly: true }}

                  fullWidth
                  size="small"
                  required
                  name="guardian_nickname"
                  placeholder="Enter your Guardian Nickname"
                  value={person.guardian_nickname ?? ""}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={!!errors.guardian_nickname}
                  helperText={errors.guardian_nickname ? "This field is required." : ""}
                />
              </Box>
            </Box>

            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Guardian's Contact Information</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <Box sx={{ width: '100%', mb: 2 }}>
              <Typography variant="subtitle2" mb={1}>Guardian Address</Typography>
              <TextField
                InputProps={{ readOnly: true }}

                fullWidth
                size="small"
                required
                name="guardian_address"
                placeholder="Enter your Guardian Address"
                value={person.guardian_address ?? ""}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.guardian_address}
                helperText={errors.guardian_address ? "This field is required." : ""}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>Guardian Contact</Typography>
                <TextField
                  InputProps={{ readOnly: true }}

                  fullWidth
                  size="small"
                  required
                  name="guardian_contact"
                  placeholder="Enter your Guardian Contact Number"
                  value={person.guardian_contact ?? ""}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.guardian_contact} helperText={errors.guardian_contact ? "This field is required." : ""}
                />
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" mb={1}>Guardian Email</Typography>
                <TextField
                  InputProps={{ readOnly: true }}

                  fullWidth
                  size="small"
                  required
                  name="guardian_email"
                  placeholder="Enter your Guardian Email Address (e.g., username@gmail.com)"
                  value={person.guardian_email ?? ""}
                  onChange={handleChange}
                  onBlur={handleBlur}

                />
              </Box>
            </Box>

            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>
              Siblings (Mga Kapatid Mo)
            </Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <FormControlLabel
              control={<Checkbox disabled checked={person.has_no_siblings === 1} />}
              label="Check if there's no siblings"
            />
            <br /><br />

            {person.has_no_siblings !== 1 && (person.siblings || []).map((sibling, index) => (
              <Box key={sibling.id || index} sx={{ border: `1px solid ${borderColor}`, borderRadius: 2, p: 2, mb: 2, backgroundColor: "#fff" }}>
                <Typography fontWeight="bold" mb={1}>Sibling {index + 1}</Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <Box flex="1 1 30%">
                    <Typography variant="subtitle2" mb={0.5}>Name of Sibling</Typography>
                    <TextField InputProps={{ readOnly: true }} fullWidth size="small" value={sibling.name || ""} />
                  </Box>
                  <Box flex="1 1 10%">
                    <Typography variant="subtitle2" mb={0.5}>Age</Typography>
                    <TextField InputProps={{ readOnly: true }} fullWidth size="small" value={sibling.age || ""} />
                  </Box>
                  <Box flex="1 1 20%">
                    <Typography variant="subtitle2" mb={0.5}>School Level</Typography>
                    <TextField InputProps={{ readOnly: true }} fullWidth size="small" value={sibling.schoolLevel || ""} />
                  </Box>
                  <Box flex="1 1 30%">
                    <Typography variant="subtitle2" mb={0.5}>School Last Attended</Typography>
                    <TextField InputProps={{ readOnly: true }} fullWidth size="small" value={sibling.schoolLastAttended || ""} />
                  </Box>
                  <Box flex="1 1 45%">
                    <Typography variant="subtitle2" mb={0.5}>School Address</Typography>
                    <TextField InputProps={{ readOnly: true }} fullWidth size="small" value={sibling.schoolAddress || ""} />
                  </Box>
                  <Box flex="1 1 25%">
                    <Typography variant="subtitle2" mb={0.5}>Occupation</Typography>
                    <TextField InputProps={{ readOnly: true }} fullWidth size="small" value={sibling.occupation || ""} />
                  </Box>
                  <Box flex="1 1 25%">
                    <Typography variant="subtitle2" mb={0.5}>Monthly Income</Typography>
                    <TextField InputProps={{ readOnly: true }} fullWidth size="small" value={sibling.monthlyIncome || ""} />
                  </Box>
                </Box>
              </Box>
            ))}

            {person.has_no_siblings !== 1 && (person.siblings || []).length === 0 && (
              <Typography sx={{ color: "#777", fontStyle: "italic", mb: 2 }}>No siblings on record.</Typography>
            )}

            <Typography style={{ fontSize: "20px", color: mainButtonColor, fontWeight: "bold" }}>Family (Annual Income)</Typography>
            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            {/* Annual Income */}
            <Box sx={{ width: '100%', mb: 2 }}>
              <Typography variant="subtitle2" mb={1}>Annual Income</Typography>
              <FormControl fullWidth size="small" required error={!!errors.annual_income}>
                <InputLabel id="annual-income-label">Annual Income</InputLabel>
                <Select
                  readOnly
                  labelId="annual-income-label"
                  name="annual_income"
                  value={person.annual_income || ""}
                  label="Annual Income"
                  onChange={handleChange}
                  onBlur={handleBlur}
                >
                  <MenuItem value=""><em>Select Annual Income</em></MenuItem>
                  <MenuItem value="80,000 and below">80,000 and below</MenuItem>
                  <MenuItem value="80,000 to 135,000">80,000 to 135,000</MenuItem>
                  <MenuItem value="135,000 to 250,000">135,000 to 250,000</MenuItem>
                  <MenuItem value="250,000 to 500,000">250,000 to 500,000</MenuItem>
                  <MenuItem value="500,000 to 1,000,000">500,000 to 1,000,000</MenuItem>
                  <MenuItem value="1,000,000 and above">1,000,000 and above</MenuItem>
                </Select>
                {errors.annual_income && (
                  <FormHelperText>This field is required.</FormHelperText>
                )}
              </FormControl>
            </Box>



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






            <Box display="flex" justifyContent="space-between" mt={4}>
              {/* Previous Page Button */}
              <Button
                variant="contained"
                component={Link}
                to={`/applicant_college_personal_information?person_id=${userID}`}

                startIcon={
                  <ArrowBackIcon
                    sx={{
                      color: "#000",
                      transition: "color 0.3s",
                    }}
                  />
                }
                sx={{
                  backgroundColor: subButtonColor,
                  border: `1px solid ${borderColor}`,
                  color: "#000",
                  "&:hover": {
                    backgroundColor: "#000000",
                    color: "#fff",
                    "& .MuiSvgIcon-root": {
                      color: "#fff",
                    },
                  },
                }}
              >
                Previous Step
              </Button>

              <Button
                variant="contained"
                onClick={() => {

                  navigate(`/applicant_college_educational_attainment?person_id=${userID}`);

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
                  color: '#fff',
                  '&:hover': {
                    backgroundColor: "#000000",
                    color: '#fff',
                    '& .MuiSvgIcon-root': {
                      color: '#fff',
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
    </Box>
  );
};


export default ApplicantCollegeFamilyBackground;
