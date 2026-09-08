import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  forwardRef,
} from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  TextField,
  Container,
  Typography,
  Button,
  MenuItem,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";

import EaristLogo from "../assets/EaristLogo.png";
import "../styles/Print.css";
import { Search } from "@mui/icons-material";
import { FcPrint } from "react-icons/fc";
import { useLocation } from "react-router-dom";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import { MdOutlinePayment } from "react-icons/md";
import { IoMdSchool } from "react-icons/io";
import API_BASE_URL from "../apiConfig";
import { postAuditEvent, getAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import {
  computeTotalAssessment,
  computeTuitionAmount,
  fetchResolvedFees,
  filterAssessedFeeLines,
  toNumber as toFeeNumber,
} from "../utils/corDynamicFees";

const CertificateOfRegistration = forwardRef(
  ({ student_number, onSaved }, divToPrintRef) => {
    useAuditMac();
    const settings = useContext(SettingsContext);
    const branding = settings?.branding || {};
    const assets = settings?.assets || {};
    const [fetchedLogo, setFetchedLogo] = useState(null);
    const [companyName, setCompanyName] = useState("");
    const [branches, setBranches] = useState([]);
    const [snack, setSnack] = useState({
      open: false,
      message: "",
      severity: "",
    });

    const showSnackbar = (message, severity = "success") => {
      setSnack({ open: true, message, severity });
    };
    const FreeTuitionImage = `${API_BASE_URL}/assets/FreeTuition.png`;
    const handleSnackClose = (_, reason) => {
      if (reason === "clickaway") return;
      setSnack((prev) => ({ ...prev, open: false }));
    };

    useEffect(() => {
      if (settings) {
        // ? load dynamic logo
        if (assets.logoUrl) {
          setFetchedLogo(`${assets.logoUrl}`);
        } else {
          setFetchedLogo(EaristLogo);
        }

        // ? load dynamic name + branch metadata
        if (branding.companyName) setCompanyName(branding.companyName);
        setBranches(settings?.branches || []);
      }
    }, [settings]);

    const words = companyName.trim().split(" ");
    const middle = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, middle).join(" ");
    const secondLine = words.slice(middle).join(" ");

    const [data, setData] = useState([]);
    const hasStudentData = Boolean(student_number?.trim() && data?.[0]);

    const [profilePicture, setProfilePicture] = useState(null);
    const [personID, setPersonID] = useState("");
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
      cellphoneNumber: "",
      emailAddress: "",
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
      father_family_name: "",
      father_given_name: "",
      father_middle_name: "",
      father_ext: "",
      father_contact: "",
      father_occupation: "",
      father_income: "",
      father_email: "",
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
      generalAverage1: "",
    });

    const [userID, setUserID] = useState("");
    const [user, setUser] = useState("");
    const [userRole, setUserRole] = useState("");

    const [campusAddress, setCampusAddress] = useState("");

    const getBranchName = (branchId) => {
      const matchedBranch = branches.find(
        (branch) =>
          String(branch?.id) === String(branchId) ||
          String(branch?.branch_id) === String(branchId),
      );

      return (
        matchedBranch?.branch ||
        matchedBranch?.branch_name ||
        matchedBranch?.name ||
        ""
      );
    };

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

    const [hasAccess, setHasAccess] = useState(null);
    const [approvedBy, setApprovedBy] = useState(null);
    const [approvedBySignatureMissing, setApprovedBySignatureMissing] =
      useState(false);
    const approvedBySignature =
      typeof approvedBy?.signature_image === "string"
        ? approvedBy.signature_image.trim()
        : "";
    const approvedBySignatureUrl = approvedBySignature
      ? `${API_BASE_URL}/uploads/${approvedBySignature}`
      : "";
    const showApprovedBySignature = Boolean(
      student_number && approvedBySignatureUrl && !approvedBySignatureMissing,
    );

    useEffect(() => {
      setApprovedBySignatureMissing(false);
    }, [approvedBySignatureUrl]);

    useEffect(() => {
      const fetchApprovedBy = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/signature-latest`);
          const data = await res.json();

          if (data.success) {
            setApprovedBy(data.data);
          }
        } catch (err) {
          console.error(err);
        }
      };

      fetchApprovedBy();
    }, []);

    const pageId = 13;
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

    // ? Fetch person data from backend
    const fetchPersonData = async (id) => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/person/${id}`);
        setPerson(res.data); // make sure backend returns the correct format
      } catch (error) {
        console.error("Failed to fetch person:", error);
      }
    };

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const queryPersonId = queryParams.get("person_id");

    // do not alter
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

      // Allow Applicant, Admin, SuperAdmin to view ECAT
      const allowedRoles = ["registrar", "applicant", "student"];
      if (allowedRoles.includes(storedRole)) {
        const targetId = searchedPersonId || queryPersonId || loggedInPersonId;
        setUserID(targetId);
        fetchPersonData(targetId);
        return;
      }

      window.location.href = "/login";
    }, [queryPersonId]);

    const fetchProfilePicture = async (person_id) => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/user/${person_id}`);
        if (res.data && res.data.profile_img) {
          console.log(res.data.profile_img);
          setProfilePicture(
            `${API_BASE_URL}/uploads/Student1by1/${res.data.profile_img}`,
          );
        }
      } catch (error) {
        console.error("Error fetching profile picture:", error);
        setProfilePicture(null);
      }
    };

    useEffect(() => {
      if (personID) {
        fetchProfilePicture(personID);
      }
    }, [personID]);

    useEffect(() => {
      if (personID) {
        console.log("Fetched Data:", data); // SEE what's actually returned
      }
    }, [data]);

    const [shortDate, setShortDate] = useState("");
    const [longDate, setLongDate] = useState("");

    useEffect(() => {
      const updateDates = () => {
        const now = new Date();

        // Format 1: MM/DD/YYYY
        const formattedShort = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;
        setShortDate(formattedShort);

        // Format 2: MM DD, YYYY hh:mm:ss AM/PM
        const day = String(now.getDate()).padStart(2, "0");
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const year = now.getFullYear();
        const hours = String(now.getHours() % 12 || 12).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        const ampm = now.getHours() >= 12 ? "PM" : "AM";

        const formattedLong = `${month} ${day}, ${year} ${hours}:${minutes}:${seconds} ${ampm}`;
        setLongDate(formattedLong);
      };

      updateDates(); // Set initial values
      const interval = setInterval(updateDates, 1000); // Update every second

      return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    const [courses, setCourses] = useState([]);
    const [enrolled, setEnrolled] = useState([]);

    const [userId, setUserId] = useState(null); // Dynamic userId
    const [first_name, setUserFirstName] = useState(null); // Dynamic userId
    const [middle_name, setUserMiddleName] = useState(null); // Dynamic userId

    const [last_name, setUserLastName] = useState(null); // Dynamic userId
    const [currId, setCurr] = useState(null); // Dynamic userId
    const [courseCode, setCourseCode] = useState("");
    const [courseDescription, setCourseDescription] = useState("");

    const [sections, setSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState(null);

    const [subjectCounts, setSubjectCounts] = useState({});
    const [year_Level_Description, setYearLevelDescription] = useState(null);
    const [major, setMajor] = useState(null);

    useEffect(() => {
      if (selectedSection) {
        fetchSubjectCounts(selectedSection);
      }
    }, [selectedSection]);

    const fetchSubjectCounts = async (sectionId) => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/subject-enrollment-count`,
          {
            params: { sectionId },
          },
        );

        // Transform into object for easy lookup: { subject_id: enrolled_count }
        const counts = {};
        response.data.forEach((item) => {
          counts[item.subject_id] = item.enrolled_count;
        });

        setSubjectCounts(counts);
      } catch (err) {
        console.error("Failed to fetch subject counts", err);
      }
    };

    useEffect(() => {
      if (currId) {
        axios
          .get(`${API_BASE_URL}/api/courses/${currId}`)
          .then((res) => setCourses(res.data))
          .catch((err) => console.error(err));
      }
    }, [currId]);

    useEffect(() => {
      if (userId && currId) {
        axios
          .get(`${API_BASE_URL}/api/enrolled_courses/${userId}/${currId}`)
          .then((res) => setEnrolled(res.data))
          .catch((err) => console.error(err));
      }
    }, [userId, currId]);

    const [activeSchoolYear, setActiveSchoolYear] = useState([]);
    const [qrCodeMissing, setQrCodeMissing] = useState(false);

    useEffect(() => {
      axios
        .get(`${API_BASE_URL}/api/get_active_school_years`)
        .then((res) => setActiveSchoolYear(res.data))
        .catch((err) => console.error(err));
    }, []);

    // Fetch department sections when component mounts
    useEffect(() => {
      fetchDepartmentSections();
    }, []);

    // Fetch sections whenever selectedDepartment changes
    useEffect(() => {
      if (selectedDepartment) {
        fetchDepartmentSections();
      }
    }, [selectedDepartment]);

    // Fetch department sections based on selected department
    const fetchDepartmentSections = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${API_BASE_URL}/api/department-sections`,
          {
            params: { departmentId: selectedDepartment },
          },
        );
        // Artificial delay
        setTimeout(() => {
          setSections(response.data);
          setLoading(false);
        }, 700); // 3 seconds delay
      } catch (err) {
        console.error("Error fetching department sections:", err);
        setError("Failed to load department sections");
        setLoading(false);
      }
    };

    const [gender, setGender] = useState(null);
    const [age, setAge] = useState(null);
    const [email, setEmail] = useState(null);
    const [program, setProgram] = useState(null);
    const [course_unit, setCourseUnit] = useState(null);
    const [lab_unit, setLabUnit] = useState(null);
    const [year_desc, setYearDescription] = useState(null);
    const [yearlevel, setYearLevelId] = useState("");
    const [isHaveNSTP, setIsHaveNSTP] = useState(0);
    const [isHaveComputerFees, setIsHaveComputerFees] = useState(0);
    const [isHaveLaboratory, setIsHaveLaboratory] = useState(0);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState(null);
    const [scholarshipModalOpen, setScholarshipModalOpen] = useState(false);
    const [scholarshipTypes, setScholarshipTypes] = useState([]);
    const [selectedScholarshipId, setSelectedScholarshipId] = useState("");
    const [savedUnifast, setSavedUnifast] = useState(false);
    const [savedMatriculation, setSavedMatriculation] = useState(false);
    const [selectedPaymentData, setSelectedPaymentData] = useState(null);

    useEffect(() => {
      if (!student_number || !student_number.trim()) return; // don't run if empty

      const fetchStudent = async () => {
        try {
          // 1. Authenticate and tag student
          const response = await axios.post(
            `${API_BASE_URL}/api/student-tagging`,
            { studentNumber: student_number },
            { headers: { "Content-Type": "application/json" } },
          );

          setTotalLecFees(Number(response.data.totalLecFee || 0));
          setTotalLabFees(Number(response.data.totalLabFee || 0));
          setIsHaveNSTP(Number(response.data.totalNstpCount || 0));
          setIsHaveComputerFees(Number(response.data.totalComputerLab || 0));
          setIsHaveLaboratory(Number(response.data.totalLaboratory || 0));

          const {
            token2,
            person_id2,
            studentNumber: studentNum,
            activeCurriculum: active_curriculum,
            major,
            yearLevel,
            yearLevelDescription: yearLevelDescription,
            yearDesc: yearDesc,
            courseCode: course_code,
            courseDescription: course_desc,
            departmentName: dprtmnt_name,
            courseUnit: course_unit,
            labUnit: lab_unit,
            firstName: first_name,
            middleName: middle_name,
            lastName: last_name,
          } = response.data;

          console.log("data[0]:", data[0]);
          console.log(course_unit);

          // Save to localStorage
          localStorage.setItem("token2", token2);
          localStorage.setItem("person_id2", person_id2);
          localStorage.setItem("studentNumber", studentNum);
          localStorage.setItem("activeCurriculum", active_curriculum);
          localStorage.setItem("major", major);
          localStorage.setItem("yearLevel", yearLevel);
          localStorage.setItem("departmentName", dprtmnt_name);
          localStorage.setItem("courseCode", course_code);
          localStorage.setItem("courseDescription", course_desc);
          localStorage.setItem("courseUnit", course_unit);
          localStorage.setItem("labUnit", lab_unit);
          localStorage.setItem("firstName", first_name);
          localStorage.setItem("middleName", middle_name);
          localStorage.setItem("lastName", last_name);
          localStorage.setItem("yearLevelDescription", yearLevelDescription);
          localStorage.setItem("yearDesc", yearDesc);

          // Update state variables
          setUserId(studentNum);
          setUserFirstName(first_name);
          setUserMiddleName(middle_name);
          setUserLastName(last_name);
          setCurr(active_curriculum);
          setMajor(major || "");
          setDepartments(dprtmnt_name);
          setCourseCode(course_code);
          setCourseDescription(course_desc);
          setCourseUnit(course_unit);
          setLabUnit(lab_unit);
          setPersonID(person_id2);
          setYearLevelDescription(yearLevelDescription);
          setYearLevelId(yearLevel);
          setYearDescription(yearDesc);

          // 2. Fetch full student data (COR info)
          const corResponse = await axios.get(
            `${API_BASE_URL}/api/student-data/${studentNum}`,
          );
          const fullData = {
            ...corResponse.data,
            branch_id: person?.campus || "",
            campus: person?.campus || "",
          };
          setData([fullData]); // Wrap in array for data[0] compatibility

          // 3. Set additional fields: gender, age, email, program
          setGender(fullData.gender || null);
          setAge(fullData.age || null);
          console.log(age);
          console.log(major);
          console.log("person.program:", data[0]?.program);
          setEmail(fullData.email || null);
          setProgram(active_curriculum);
        } catch (error) {
          console.error("Student search failed:", error);
          showSnackbar(
            error.response?.data?.message || "Student not found",
            "error",
          );
        }
      };

      fetchStudent();
    }, [student_number]); // ?? runs automatically when prop changes

    useEffect(() => {
      if (!student_number || !student_number.trim()) return;

      const fetchPaymentStatus = async () => {
        try {
          const res = await axios.get(
            `${API_BASE_URL}/api/payment-status/${student_number}`,
          );
          if (res.data?.success) {
            setSavedUnifast(!!res.data.saved_unifast);
            setSavedMatriculation(!!res.data.saved_matriculation);
          }
        } catch (error) {
          console.error("Failed to fetch payment status:", error);
        }
      };

      fetchPaymentStatus();
    }, [student_number]);

    useEffect(() => {
      if (!student_number?.trim()) {
        setSelectedPaymentData(null);
        return;
      }

      if (!savedUnifast && !savedMatriculation) {
        setSelectedPaymentData(null);
        return;
      }

      let cancelled = false;
      const endpoint = savedUnifast
        ? "/get_student_data_unifast"
        : "/get_student_data_matriculation";

      const fetchSavedPaymentData = async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api${endpoint}`);
          const rows = Array.isArray(res.data) ? res.data : [];
          const matched = rows
            .filter(
              (item) =>
                String(item?.student_number) === String(student_number) &&
                Number(item?.status) === 1 &&
                (!activeSchoolYear[0]?.id ||
                  Number(
                    item?.active_school_year_id ??
                      item?.activeSchoolYearId ??
                      0,
                  ) === Number(activeSchoolYear[0].id)),
            )
            .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));

          if (!cancelled) {
            setSelectedPaymentData(matched[0] || null);
          }
        } catch (error) {
          console.error("Failed to fetch saved payment data:", error);
          if (!cancelled) {
            setSelectedPaymentData(null);
          }
        }
      };

      fetchSavedPaymentData();

      return () => {
        cancelled = true;
      };
    }, [student_number, activeSchoolYear, savedUnifast, savedMatriculation]);

    useEffect(() => {
      const fetchScholarshipTypes = async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/scholarship_types`);
          const activeTypes = Array.isArray(res.data)
            ? res.data.filter((item) => Number(item.scholarship_status) === 1)
            : [];
          setScholarshipTypes(activeTypes);
        } catch (error) {
          console.error("Failed to fetch scholarship types:", error);
        }
      };

      fetchScholarshipTypes();
    }, []);

    // Fetch all departments when component mounts
    useEffect(() => {
      const fetchDepartments = async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/departments`);
          setDepartments(res.data);
        } catch (err) {
          console.error("Error fetching departments:", err);
        }
      };

      fetchDepartments();
    }, []);

    useEffect(() => {
      setQrCodeMissing(false);
    }, [student_number]);

    const toWholeUnit = (value) => {
      const num = Number(value);
      return Number.isFinite(num) ? Math.round(num) : 0;
    };

    // Fixed label widths keep ":" and values vertically aligned within each column.
    const renderDetailField = (label, value, labelWidth) => (
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          fontFamily: "Arial",
          fontSize: "12px",
          width: "100%",
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontWeight: "bold",
            width: labelWidth,
            flexShrink: 0,
            whiteSpace: "nowrap",
            paddingRight: "20px",
            boxSizing: "content-box",
          }}
        >
          {label}
        </span>
        <span style={{ width: "12px", flexShrink: 0, textAlign: "left" }}>
          :
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>{value}</span>
      </div>
    );

    const LEFT_LABEL_WIDTH = "7.6em"; // fits "Email Address"
    const MID_LABEL_WIDTH = "6.2em"; // fits "Year Level"
    const RIGHT_LABEL_WIDTH = "10.5em"; // fits "Scholarship/Discount"

    const totalCourseUnits = enrolled.reduce(
      (sum, item) => sum + toWholeUnit(item.course_unit),
      0,
    );
    const [totalLecFees, setTotalLecFees] = useState(0);
    const [totalLabFees, setTotalLabFees] = useState(0);
    const totalLabUnits = enrolled.reduce(
      (sum, item) => sum + toWholeUnit(item.lab_unit),
      0,
    );
    const totalCombined = totalCourseUnits + totalLabUnits;

    const [tosf, setTosfData] = useState([]);
    const [curriculumOptions, setCurriculumOptions] = useState([]);

    useEffect(() => {
      const fetchCurriculums = async () => {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/api/applied_program`,
          );
          setCurriculumOptions(response.data);
        } catch (error) {
          console.error("Error fetching curriculum options:", error);
        }
      };

      fetchCurriculums();
    }, []);

    {
      curriculumOptions.find(
        (item) =>
          item?.curriculum_id?.toString() ===
          (person?.program ?? "").toString(),
      )?.program_description ||
        (person?.program ?? "");
    }

    const fetchTosf = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/tosf`);
        setTosfData(res.data);
        console.log(res.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        showSnackbar("Error fetching data", "error");
      }
    };

    useEffect(() => {
      fetchTosf();
    }, []);

    const [requestedData, setRequestedData] = useState({
      campus_name: "",
      branch_name: "",
      student_number: "",
      learner_reference_number: "",
      last_name: "",
      given_name: "",
      middle_initial: "",
      degree_program: "",
      year_level: "",
      sex: "",
      email_address: "",
      phone_number: "",
      laboratory_units: 0,
      computer_units: 0,
      academic_units_enrolled: 0,
      academic_units_nstp_enrolled: 0,
      tuition_fees: 0,
      nstp_fees: 0,
      athletic_fees: 0,
      computer_fees: 0,
      cultural_fees: 0,
      development_fees: 0,
      guidance_fees: 0,
      laboratory_fees: 0,
      library_fees: 0,
      medical_and_dental_fees: 0,
      registration_fees: 0,
      school_id_fees: 0,
      total_misc: 0,
      total_tosf: 0,
      remark: "",
      scholarship_id: null,
      active_school_year_id: 1,
    });

    const isFirstYear = Number(yearlevel) === 1;
    const isFirstSemester = Number(activeSchoolYear[0]?.semester_id) === 1;
    const isFirstYearFirstSem = isFirstYear && isFirstSemester;
    const [resolvedFeeLines, setResolvedFeeLines] = useState([]);
    const [computedTuitionAmount, setComputedTuitionAmount] = useState(0);
    const [computedTotalAssessment, setComputedTotalAssessment] = useState(0);
    const shouldUseDynamicFees = resolvedFeeLines.length > 0;
    const savedFeeLines = Array.isArray(selectedPaymentData?.fee_lines)
      ? selectedPaymentData.fee_lines
      : [];
    const displayFeeLines = filterAssessedFeeLines(
      savedFeeLines.length ? savedFeeLines : resolvedFeeLines,
    );
    const hasSavedAssessment = Boolean(selectedPaymentData);
    const displayTuitionAmount = hasSavedAssessment
      ? toFeeNumber(selectedPaymentData?.tuition_fees)
      : shouldUseDynamicFees
        ? computedTuitionAmount
        : Number(totalLecFees) + Number(totalLabFees);
    const baseTotalAssessment = shouldUseDynamicFees
      ? computedTotalAssessment
      : totalLecFees +
        totalLabFees +
        Number(tosf[0]?.cultural_fee || 0) +
        Number(tosf[0]?.athletic_fee || 0) +
        (isHaveNSTP !== 0 ? Number(tosf[0]?.nstp_fees || 0) : 0) +
        Number(tosf[0]?.developmental_fee || 0) +
        Number(tosf[0]?.guidance_fee || 0) +
        Number(tosf[0]?.library_fee || 0) +
        Number(tosf[0]?.medical_and_dental_fee || 0) +
        Number(tosf[0]?.registration_fee || 0) +
        (isHaveComputerFees !== 0 ? Number(tosf[0]?.computer_fees || 0) : 0) +
        (isHaveLaboratory !== 0 ? Number(tosf[0]?.laboratory_fees || 0) : 0);
    const savedNetAssessment = savedUnifast
      ? 0
      : toFeeNumber(selectedPaymentData?.total_tosf);
    const displayTotalAssessment = hasSavedAssessment
      ? savedNetAssessment
      : baseTotalAssessment;
    const displayFinancialAidAmount = hasSavedAssessment
      ? Math.max(baseTotalAssessment - savedNetAssessment, 0)
      : "";
    const displayNetAssessment = hasSavedAssessment ? savedNetAssessment : "";

    useEffect(() => {
      if (
        !data[0] ||
        !activeSchoolYear[0] ||
        !currId ||
        yearlevel === "" ||
        yearlevel == null ||
        totalLabFees == null ||
        totalLecFees == null
      ) {
        setResolvedFeeLines([]);
        setComputedTuitionAmount(0);
        setComputedTotalAssessment(0);
        return;
      }

      let cancelled = false;

      const resolveStudentFees = async () => {
        try {
          const tuitionAmount =
            Number(totalLecFees || 0) + Number(totalLabFees || 0);
          const result = await fetchResolvedFees({
            tuitionAmount,
            branchId: person?.campus || "",
            curriculumId: currId,
            yearLevelId: yearlevel,
            hasNstp: isHaveNSTP !== 0,
            nstpCount: isHaveNSTP,
            hasComputer: isHaveComputerFees,
            hasLaboratory: isHaveLaboratory,
            firstYearFirstSem: isFirstYearFirstSem,
          });

          const tuition = computeTuitionAmount({
            yearLevelId: yearlevel,
            hasNstpSubject: isHaveNSTP !== 0,
            totalLecFees,
            totalLabFees,
            resolvedFeeLines: result.feeLines,
          });

          if (cancelled) return;
          setResolvedFeeLines(result.feeLines);
          setComputedTuitionAmount(tuition);
          setComputedTotalAssessment(
            computeTotalAssessment(tuition, result.feeLines),
          );
        } catch (error) {
          if (cancelled) return;
          console.error("Error resolving assessed fees:", error);
          setResolvedFeeLines([]);
          setComputedTuitionAmount(0);
          setComputedTotalAssessment(0);
        }
      };

      resolveStudentFees();

      return () => {
        cancelled = true;
      };
    }, [
      data,
      activeSchoolYear,
      currId,
      yearlevel,
      totalLabFees,
      totalLecFees,
      person?.campus,
      isHaveNSTP,
      isHaveComputerFees,
      isHaveLaboratory,
      isFirstYearFirstSem,
    ]);

    useEffect(() => {
      if (
        !data[0] ||
        !tosf[0] ||
        !Array.isArray(enrolled) ||
        !activeSchoolYear[0]
      )
        return;

      const totalCourseUnits = enrolled.reduce(
        (sum, item) => sum + toWholeUnit(item.course_unit),
        0,
      );
      const totalLabUnits = enrolled.reduce(
        (sum, item) => sum + toWholeUnit(item.lab_unit),
        0,
      );
      const totalCombined = totalCourseUnits + totalLabUnits;
      const totalNstpUnits = enrolled.reduce((sum, item) => {
        const courseCode = String(item?.course_code || "").toUpperCase();
        const courseDescription = String(
          item?.course_description || "",
        ).toUpperCase();
        const isNstpSubject =
          courseCode.includes("NSTP") || courseDescription.includes("NSTP");
        return isNstpSubject
          ? sum + toWholeUnit(item.course_unit || item.lab_unit)
          : sum;
      }, 0);
      const computerUnits = Number(isHaveComputerFees || 0);
      const middleInitial = data[0]?.middle_name?.[0] || "";
      const branchId = person?.campus || "";
      const campusName = getBranchName(branchId);
      const gender = data[0]?.gender === 1 ? "Female" : "Male";
      const totalSum = totalLecFees + totalLabFees;
      const schoolIdFee = isFirstYearFirstSem
        ? Number(tosf[0]?.school_id_fees || 0)
        : 0;
      const totalTotalTOSF =
        totalSum +
        Number(tosf[0]?.cultural_fee || 0) +
        Number(tosf[0]?.athletic_fee || 0) +
        (isHaveNSTP !== 0 ? Number(tosf[0]?.nstp_fees || 0) : 0) +
        Number(tosf[0]?.developmental_fee || 0) +
        Number(tosf[0]?.guidance_fee || 0) +
        Number(tosf[0]?.library_fee || 0) +
        Number(tosf[0]?.medical_and_dental_fee || 0) +
        Number(tosf[0]?.registration_fee || 0) +
        schoolIdFee +
        (isHaveComputerFees !== 0 ? Number(tosf[0]?.computer_fees || 0) : 0) +
        (isHaveLaboratory !== 0 ? Number(tosf[0]?.laboratory_fees || 0) : 0);
      const totalMisc =
        Number(tosf[0]?.cultural_fee || 0) +
        Number(tosf[0]?.athletic_fee || 0) +
        Number(tosf[0]?.developmental_fee || 0) +
        Number(tosf[0]?.guidance_fee || 0) +
        Number(tosf[0]?.library_fee || 0) +
        Number(tosf[0]?.medical_and_dental_fee || 0) +
        Number(tosf[0]?.registration_fee || 0) +
        schoolIdFee +
        (isHaveComputerFees !== 0 ? Number(tosf[0]?.computer_fees || 0) : 0) +
        (isHaveLaboratory !== 0 ? Number(tosf[0]?.laboratory_fees || 0) : 0);

      const resolvedStudentNumber =
        data[0]?.student_number || userId || student_number || "";

      setRequestedData({
        campus_name: campusName,
        branch_name: campusName,
        branch_id: branchId,
        student_number: resolvedStudentNumber,
        learner_reference_number: data[0]?.lrnNumber,
        last_name: data[0]?.last_name,
        given_name: data[0]?.first_name,
        middle_initial: middleInitial,
        degree_program: data[0]?.program,
        year_level: year_Level_Description,
        sex: gender,
        email_address: data[0]?.email,
        phone_number: data[0]?.cellphoneNumber,
        laboratory_units: totalLabUnits,
        computer_units: computerUnits,
        academic_units_enrolled: totalCombined,
        academic_units_nstp_enrolled: totalNstpUnits,
        tuition_fees: totalSum,
        nstp_fees: isHaveNSTP !== 0 ? Number(tosf[0]?.nstp_fees || 0) : 0, // ONGOING
        athletic_fees: tosf[0]?.athletic_fee || 0,
        computer_fees:
          isHaveComputerFees !== 0 ? Number(tosf[0]?.computer_fees || 0) : 0,
        cultural_fees: tosf[0]?.cultural_fee || 0,
        development_fees: tosf[0]?.developmental_fee || 0,
        guidance_fees: tosf[0]?.guidance_fee || 0,
        laboratory_fees:
          isHaveLaboratory !== 0 ? Number(tosf[0]?.laboratory_fees || 0) : 0,
        library_fees: tosf[0]?.library_fee || 0,
        medical_and_dental_fees: tosf[0]?.medical_and_dental_fee || 0,
        registration_fees: tosf[0]?.registration_fee, // ONGOING
        school_id_fees: schoolIdFee,
        total_misc: totalMisc,
        total_tosf: totalTotalTOSF,
        remark: "",
        active_school_year_id: activeSchoolYear[0]?.id || null,
      });
    }, [
      data,
      tosf,
      enrolled,
      totalLabFees,
      totalLecFees,
      activeSchoolYear,
      branches,
      person?.campus,
      isFirstYearFirstSem,
      isHaveNSTP,
      isHaveComputerFees,
      isHaveLaboratory,
      year_Level_Description,
    ]);

    const toNumber = (value) => {
      if (typeof value === "string") {
        const cleaned = value.replace(/[^0-9.-]/g, "");
        const parsedFromString = Number(cleaned);
        return Number.isFinite(parsedFromString) ? parsedFromString : 0;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const toDecimalPercent = (value) => {
      const numeric = toNumber(value);
      if (numeric <= 0) return 0;
      return numeric > 1 ? numeric / 100 : numeric;
    };

    const round2 = (value) =>
      Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

    const applyScholarshipToMatriculationFees = (baseData, scholarship) => {
      if (!scholarship) {
        return {
          payload: { ...baseData, scholarship_id: null },
          computed: null,
        };
      }

      const tuitionFee = toNumber(baseData.tuition_fees);
      const nstpFee = toNumber(baseData.nstp_fees);

      const miscKeys = [
        "cultural_fees",
        "athletic_fees",
        "development_fees",
        "guidance_fees",
        "library_fees",
        "medical_and_dental_fees",
        "registration_fees",
        "school_id_fees",
        "computer_fees",
        "laboratory_fees",
      ];

      const miscTotal = miscKeys.reduce(
        (sum, key) => sum + toNumber(baseData[key]),
        0,
      );

      const afd = toNumber(scholarship.afd);
      const hasAfdOverride = afd > 0;
      const tfdDec = toDecimalPercent(scholarship.tfd);
      const mfdDec = toDecimalPercent(scholarship.mfd);
      const nfdDec = toDecimalPercent(scholarship.nfd);

      let finalTuitionFee = tuitionFee;
      let finalMiscTotal = miscTotal;
      let finalNstpFee = nstpFee;

      if (!hasAfdOverride) {
        finalTuitionFee = tuitionFee - tuitionFee * tfdDec;
        finalMiscTotal = miscTotal - miscTotal * mfdDec;
        finalNstpFee = nstpFee - nstpFee * nfdDec;
      }

      finalTuitionFee = round2(finalTuitionFee);
      finalMiscTotal = round2(finalMiscTotal);
      finalNstpFee = round2(finalNstpFee);

      const miscScale = miscTotal > 0 ? finalMiscTotal / miscTotal : 0;
      const scaledMiscEntries = miscKeys.map((key) => ({
        key,
        value: round2(toNumber(baseData[key]) * miscScale),
      }));

      if (scaledMiscEntries.length > 0) {
        const scaledMiscSum = scaledMiscEntries.reduce(
          (sum, item) => sum + item.value,
          0,
        );
        const delta = round2(finalMiscTotal - scaledMiscSum);
        scaledMiscEntries[scaledMiscEntries.length - 1].value = round2(
          scaledMiscEntries[scaledMiscEntries.length - 1].value + delta,
        );
      }

      const scaledMiscMap = scaledMiscEntries.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});

      const totalTosf = round2(finalTuitionFee + finalNstpFee + finalMiscTotal);

      return {
        payload: {
          ...baseData,
          ...scaledMiscMap,
          tuition_fees: finalTuitionFee,
          nstp_fees: finalNstpFee,
          registration_fees: scaledMiscMap.registration_fees ?? 0,
          total_tosf: totalTosf,
          total_misc: finalMiscTotal,
          scholarship_id: scholarship.id ? Number(scholarship.id) : null,
        },
        computed: null,
      };
    };

    const insertPaymentAuditLog = async (paymentTarget) => {
      try {
        await postAuditEvent("payment_saved", {
          student_number: requestedData.student_number,
          payment_target: paymentTarget,
        });
      } catch (err) {
        console.error("Error inserting audit log");
      }
    };

    const handleSaveToUnifast = async () => {
      try {
        const resolvedStudentNumber =
          requestedData.student_number || userId || student_number || "";
        if (!resolvedStudentNumber) {
          showSnackbar(
            "Student number is missing. Please reload the COR and try again.",
            "error",
          );
          return;
        }

        const res = await axios.post(`${API_BASE_URL}/api/save_to_unifast`, {
          ...requestedData,
          student_number: resolvedStudentNumber,
          status: 1,
        });
        if (res.data.success) {
          setSavedUnifast(true);
          showSnackbar(
            "Student Payment was saved successfully in Unifast",
            "success",
          );
          await insertPaymentAuditLog("UniFAST");
          if (typeof onSaved === "function") {
            onSaved({ type: "unifast", student_number });
          }
        } else {
          showSnackbar(res.data.message || "Failed to save data", "error");
        }
      } catch (error) {
        console.error(error);
        showSnackbar("Server error while saving data", "error");
      }
    };

    const handleSaveToMatriculation = async () => {
      try {
        const resolvedStudentNumber =
          requestedData.student_number || userId || student_number || "";
        if (!resolvedStudentNumber) {
          showSnackbar(
            "Student number is missing. Please reload the COR and try again.",
            "error",
          );
          return;
        }

        const selectedScholarship = scholarshipTypes.find(
          (item) => Number(item.id) === Number(selectedScholarshipId),
        );

        if (!selectedScholarship) {
          showSnackbar("Selected scholarship type not found.", "error");
          return;
        }

        const { payload } = applyScholarshipToMatriculationFees(
          { ...requestedData, student_number: resolvedStudentNumber },
          selectedScholarship,
        );

        const res = await axios.post(
          `${API_BASE_URL}/api/save_to_matriculation`,
          {
            ...payload,
            matriculation_remark: selectedScholarship.scholarship_name,
            status: 1,
          },
          { headers: getAuditHeaders() },
        );
        if (res.data.success) {
          setSavedMatriculation(true);
          showSnackbar(
            "Student Payment was saved successfully in Matriculation",
            "success",
          );
          await insertPaymentAuditLog("Matriculation");
          if (typeof onSaved === "function") {
            onSaved({ type: "matriculation", student_number });
          }
        } else {
          showSnackbar(res.data.message || "Failed to save data", "error");
        }
      } catch (error) {
        console.error(error);
        showSnackbar("Server error while saving data", "error");
      }
    };

    const openConfirm = (target) => {
      setConfirmTarget(target);
      setConfirmOpen(true);
    };

    const closeConfirm = () => {
      setConfirmOpen(false);
    };

    const openScholarshipModal = () => {
      setScholarshipModalOpen(true);
    };

    const closeScholarshipModal = () => {
      setScholarshipModalOpen(false);
      setSelectedScholarshipId("");
    };

    const handleConfirmScholarshipModal = async () => {
      if (!selectedScholarshipId) {
        showSnackbar("Please select a scholarship type.", "error");
        return;
      }
      setScholarshipModalOpen(false);
      await handleSaveToMatriculation();
      setSelectedScholarshipId("");
    };

    const handleConfirmSave = async () => {
      const target = confirmTarget;
      setConfirmOpen(false);
      if (target === "unifast") {
        await handleSaveToUnifast();
      } else if (target === "matriculation") {
        await handleSaveToMatriculation();
      }
    };

    const unifastLabel = savedUnifast ? "Saved To Unifast" : "Save to Unifast";
    const matriculationLabel = savedMatriculation
      ? "Saved To Matriculation"
      : "Save Matriculation";

    // ?? Disable right-click
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    // ?? Block DevTools shortcuts + Ctrl+P silently
    document.addEventListener("keydown", (e) => {
      const isBlockedKey =
        e.key === "F12" || // DevTools
        e.key === "F11" || // Fullscreen
        (e.ctrlKey &&
          e.shiftKey &&
          (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j")) || // Ctrl+Shift+I/J
        (e.ctrlKey && e.key.toLowerCase() === "u") || // Ctrl+U (View Source)
        (e.ctrlKey && e.key.toLowerCase() === "p"); // Ctrl+P (Print)

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

    return (
      <Container className="mb-[4rem]">
        {/* <TO> @</TO> UNIFAST BUTTON */}
        <Box sx={{ position: "relative", marginRight: "6rem" }}>
          <button
            onClick={() => openConfirm("unifast")}
            disabled={savedUnifast}
            style={{
              marginBottom: "2rem",
              padding: "10px 20px",
              border: "2px solid black",
              backgroundColor: "#f0f0f0",
              color: "black",
              borderRadius: "5px",
              marginTop: "20px",
              cursor: savedUnifast ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              position: "absolute",
              zIndex: 1000,
              right: "15%",
              top: "-3rem",
              opacity: savedUnifast ? 0.6 : 1,
              transition: "background-color 0.3s, transform 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#d3d3d3")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#f0f0f0")}
            onMouseDown={(e) => (e.target.style.transform = "scale(0.95)")}
            onMouseUp={(e) => (e.target.style.transform = "scale(1)")}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <MdOutlinePayment size={20} />
              {unifastLabel}
            </span>
          </button>

          {/* SAVE TO MATRICULATION BUTTON */}
          <button
            onClick={openScholarshipModal}
            disabled={savedMatriculation}
            style={{
              marginBottom: "1rem",
              padding: "10px 20px",
              border: "2px solid black",
              backgroundColor: "#f0f0f0",
              color: "black",
              borderRadius: "5px",
              marginTop: "20px",
              cursor: savedMatriculation ? "not-allowed" : "pointer",
              zIndex: 1000,
              position: "absolute",
              right: "-10%",
              top: "-3rem",
              fontSize: "16px",
              fontWeight: "bold",
              opacity: savedMatriculation ? 0.6 : 1,
              transition: "background-color 0.3s, transform 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#d3d3d3")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#f0f0f0")}
            onMouseDown={(e) => (e.target.style.transform = "scale(0.95)")}
            onMouseUp={(e) => (e.target.style.transform = "scale(1)")}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <IoMdSchool size={20} />
              {matriculationLabel}
            </span>
          </button>
        </Box>

        <Dialog open={confirmOpen} onClose={closeConfirm}>
          <DialogTitle>Confirm Save</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to save this payment to{" "}
              {confirmTarget === "unifast" ? "Unifast" : "Matriculation"}?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button variant="contained" color="error" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSave} variant="contained">
              Confirm
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={scholarshipModalOpen}
          onClose={closeScholarshipModal}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Select Scholarship Type</DialogTitle>
          <DialogContent>
            <TextField
              select
              fullWidth
              label="Scholarship Type"
              value={selectedScholarshipId}
              onChange={(e) => setSelectedScholarshipId(e.target.value)}
              sx={{ mt: 1 }}
            >
              {scholarshipTypes.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.scholarship_name}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeScholarshipModal} color="inherit">
              Cancel
            </Button>
            <Button onClick={handleConfirmScholarshipModal} variant="contained">
              Save to Matriculation
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={snack.open}
          autoHideDuration={3000}
          onClose={handleSnackClose}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={handleSnackClose}
            severity={snack.severity || "success"}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {snack.message}
          </Alert>
        </Snackbar>

        <style>
          {`
                                .certificate-wrapper {
                                  position: relative;
                                  /* Wider than A4: Rules gap + Faculty cols + student-info column gutter */
                                  width: calc((210mm + 6.5rem) * 44 / 42 + 3rem);
                                  min-height: 297mm;
                                  height: auto;
                                  max-width: calc((210mm + 6.5rem) * 44 / 42 + 3rem);
                                  box-sizing: border-box;
                                  background: #fff;
                                  overflow: visible;
                                }
                
                                .certificate-wrapper > .section,
                                .certificate-wrapper table,
                                .certificate-wrapper .fee-table-con,
                                .certificate-wrapper .student-table {
                                  width: 100% !important;
                                  max-width: 100% !important;
                                  margin-left: 0 !important;
                                  margin-right: 0 !important;
                                  box-sizing: border-box;
                                }
                
                                @media print {
                                  @page {
                                    size: A4;
                                    margin: 0;
                                  }
                                  button {
                                    display: none;
                                  }
                                  .flex-container {
                                    width: calc((210mm + 6.5rem) * 44 / 42 + 3rem);
                                    min-height: 297mm;
                                    margin  
                                  }
                                  .fee-table-con {
                                    width: 100% !important;
                                  }
                                }
                              `}
        </style>
        <div className="flex-container">
          <div className="section">
            <Box></Box>

            <div ref={divToPrintRef} className="certificate-wrapper">
              <div className="section">
                <table
                  className="student-table"
                  style={{
                    borderCollapse: "collapse",
                    fontFamily: "Arial",
                    width: "100%",
                    margin: "0 auto", // Center the table inside the form
                    textAlign: "center",
                    tableLayout: "fixed",
                  }}
                >
                  <style>
                    {`
                                  @media print {
                                    .Box {
                                      display: none;
                                    }
                
                                  }
                                `}
                  </style>

                  <tbody>
                    <tr>
                      <td
                        colSpan={2}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      >
                        <b></b>
                      </td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                    </tr>
                    <tr>
                      <td
                        colSpan={2}
                        style={{ height: "0.1in", fontSize: "62.5%" }}
                      ></td>
                    </tr>
                    <tr>
                      <td
                        colSpan={40}
                        style={{ height: "0.5in", textAlign: "center" }}
                      >
                        <table
                          width="100%"
                          style={{ borderCollapse: "collapse" }}
                        >
                          <tbody>
                            <tr>
                              <td style={{ width: "20%", textAlign: "center" }}>
                                <img
                                  src={fetchedLogo || EaristLogo}
                                  alt="School Logo"
                                  style={{
                                    marginLeft: "10px",
                                    width: "140px",
                                    height: "140px",
                                    borderRadius: "50%", // ? makes it circular
                                    objectFit: "cover",
                                  }}
                                />
                              </td>

                              {/* Center Column - School Information */}
                              <td
                                style={{
                                  width: "60%",
                                  textAlign: "center",
                                  lineHeight: "1",
                                  fontFamily: "Arial",
                                }}
                              >
                                <div
                                  style={{
                                    fontFamily: "Arial",
                                    fontSize: "13px",
                                  }}
                                >
                                  Republic of the Philippines
                                </div>
                                <div
                                  style={{
                                    fontWeight: "bold",
                                    fontFamily: "Arial",
                                    fontSize: "16px",
                                    textTransform: "Uppercase",
                                  }}
                                >
                                  {firstLine}
                                </div>
                                {secondLine && (
                                  <div
                                    style={{
                                      fontWeight: "bold",
                                      fontFamily: "Arial",
                                      fontSize: "16px",
                                      textTransform: "Uppercase",
                                    }}
                                  >
                                    {secondLine}
                                  </div>
                                )}
                                <div>{campusAddress}</div>

                                {/* Add spacing here */}
                                <div style={{ marginTop: "30px" }}>
                                  <b
                                    style={{
                                      fontSize: "20px",
                                      letterSpacing: "2px",
                                    }}
                                  >
                                    CERTIFICATE OF REGISTRATION
                                  </b>
                                </div>
                              </td>

                              <td
                                colSpan={4}
                                rowSpan={6}
                                style={{
                                  textAlign: "center",
                                  position: "relative",
                                  width: "4.5cm",
                                  height: "4.5cm",
                                }}
                              >
                                <div
                                  style={{
                                    width: "3.80cm",
                                    height: "3.80cm",
                                    marginRight: "30px",
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    position: "relative",
                                    border: "1px solid #ccc",
                                  }}
                                >
                                  {profilePicture ? (
                                    <img
                                      src={profilePicture}
                                      alt="Profile"
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                      }}
                                    />
                                  ) : (
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        color: "#666",
                                      }}
                                    >
                                      No Profile Picture Found
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    <tr>
                      <td
                        colSpan={10}
                        style={{
                          height: "0.1in",
                          fontSize: "55%",
                          textAlign: "start",
                        }}
                      >
                        <b
                          style={{
                            fontFamily: "Arial",
                            fontSize: "12px",
                            color: "black",
                            textAlign: "start",
                            marginLeft: "25px",
                          }}
                        >
                          Registration No:&nbsp;
                          <span style={{ color: "red" }}></span>
                        </b>
                      </td>

                      <td
                        colSpan={30}
                        style={{
                          height: "0.1in",
                          fontSize: "50%",
                          textAlign: "right",
                        }}
                      >
                        <b
                          style={{
                            fontFamily: "Arial",
                            fontSize: "12px",
                            color: "black",
                          }}
                        >
                          Academic Year/Term :{" "}
                          <span style={{ color: "red" }}>
                            {activeSchoolYear[0]?.semester_description} AY{" "}
                            {activeSchoolYear[0]?.year_description || " "}-
                            {activeSchoolYear[0]?.year_description + 1 || " "}
                          </span>
                        </b>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table
                  style={{
                    borderLeft: "1px solid black",
                    borderTop: "1px solid black",
                    borderRight: "1px solid black",
                    borderCollapse: "collapse",
                    fontFamily: "Arial",
                    width: "100%",
                    margin: "0 auto", // Center the table inside the form
                    textAlign: "center",
                    tableLayout: "fixed",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        colSpan={44}
                        style={{
                          height: "0.2in",
                          fontSize: "72.5%",
                          backgroundColor: "gray",
                          color: "white",
                          width: "100%",
                        }}
                      >
                        <b>
                          <b
                            style={{
                              border: "1px solid black",
                              color: "black",
                              fontFamily: "Arial",
                              fontSize: "12px",
                              textAlign: "center",
                              display: "block",
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                          >
                            STUDENT GENERAL INFORMATION
                          </b>
                        </b>
                      </td>
                    </tr>

                    <tr>
                      <td
                        colSpan={15}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px",
                        }}
                      >
                        {renderDetailField(
                          "Student No",
                          data[0]?.student_number || "",
                          LEFT_LABEL_WIDTH,
                        )}
                      </td>
                      <td
                        colSpan={29}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px 1px calc(4px + 3rem)",
                        }}
                      >
                        {renderDetailField(
                          "College",
                          data[0]?.college || "",
                          MID_LABEL_WIDTH,
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td
                        colSpan={15}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px",
                        }}
                      >
                        {renderDetailField(
                          "Name",
                          <span>
                            <span style={{ fontWeight: "bold" }}>
                              {(data[0]?.last_name || "").toUpperCase()}
                            </span>
                            {`, ${data[0]?.first_name || ""} ${data[0]?.middle_name || ""} ${data[0]?.extension || ""}`
                              .replace(/\s+/g, " ")
                              .trimEnd()
                              .toUpperCase()}
                          </span>,
                          LEFT_LABEL_WIDTH,
                        )}
                      </td>
                      <td
                        colSpan={29}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px 1px calc(4px + 3rem)",
                        }}
                      >
                        {renderDetailField(
                          "Program",
                          (() => {
                            const match = curriculumOptions.find(
                              (item) =>
                                item?.curriculum_id?.toString() ===
                                (data[0]?.program ?? "").toString(),
                            );
                            return match
                              ? match.program_description
                              : (data[0]?.program ?? "");
                          })(),
                          MID_LABEL_WIDTH,
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td
                        colSpan={15}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px",
                        }}
                      >
                        {renderDetailField(
                          "Gender",
                          data[0]?.gender === 0 ||
                            String(data[0]?.gender) === "0"
                            ? "Male"
                            : data[0]?.gender === 1 ||
                                String(data[0]?.gender) === "1"
                              ? "Female"
                              : "",
                          LEFT_LABEL_WIDTH,
                        )}
                      </td>
                      <td
                        colSpan={13}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px 1px calc(4px + 3rem)",
                        }}
                      >
                        {renderDetailField(
                          "Major",
                          major
                            ? major.charAt(0).toUpperCase() +
                                major.slice(1).toLowerCase()
                            : "",
                          MID_LABEL_WIDTH,
                        )}
                      </td>
                      <td
                        colSpan={16}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px",
                        }}
                      >
                        {renderDetailField(
                          "Curriculum",
                          year_desc ? `${year_desc}-${year_desc + 1}` : "",
                          RIGHT_LABEL_WIDTH,
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td
                        colSpan={15}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px",
                        }}
                      >
                        {renderDetailField(
                          "Age",
                          data[0]?.age || "",
                          LEFT_LABEL_WIDTH,
                        )}
                      </td>
                      <td
                        colSpan={13}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px 1px calc(4px + 3rem)",
                        }}
                      >
                        {renderDetailField(
                          "Year Level",
                          year_Level_Description || "",
                          MID_LABEL_WIDTH,
                        )}
                      </td>
                      <td
                        colSpan={16}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px",
                        }}
                      >
                        {renderDetailField(
                          "Scholarship/Discount",
                          savedUnifast ? "UNIFAST-FHE" : "",
                          RIGHT_LABEL_WIDTH,
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td
                        colSpan={44}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px",
                        }}
                      >
                        {renderDetailField(
                          "Email Address",
                          data[0]?.email || "",
                          LEFT_LABEL_WIDTH,
                        )}
                      </td>
                    </tr>

                    {/*----------------------------------------------------------------------------------------------------------------------------------*/}

                    <tr>
                      <td
                        colSpan={5}
                        rowSpan={2}
                        style={{
                          color: "black",
                          height: "0.3in",
                          fontFamily: "Arial",
                          fontSize: "12px",
                          fontWeight: "bold",

                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginTop: "-1px",
                          }}
                        >
                          CODE
                        </div>
                      </td>
                      <td
                        colSpan={13}
                        rowSpan={2}
                        style={{
                          color: "black",
                          height: "0.3in",
                          fontFamily: "Arial",
                          fontSize: "12px",
                          fontWeight: "bold",
                          backgroundColor: "gray",
                          border: "1px solid black",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginTop: "-1px",
                          }}
                        >
                          SUBJECT TITLE
                        </div>
                      </td>

                      <td
                        colSpan={8}
                        style={{
                          color: "black",
                          height: "0.2in",
                          fontFamily: "Arial",
                          fontSize: "12px",
                          fontWeight: "bold",

                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginTop: "-1px",
                          }}
                        >
                          UNIT
                        </div>
                      </td>

                      <td
                        colSpan={4}
                        rowSpan={2}
                        style={{
                          color: "black",
                          height: "0.3in",
                          fontFamily: "Arial",
                          fontSize: "12px",
                          fontWeight: "bold",

                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginTop: "-1px",
                          }}
                        >
                          SECTION
                        </div>
                      </td>
                      <td
                        colSpan={7}
                        rowSpan={2}
                        style={{
                          color: "black",
                          height: "0.3in",
                          fontSize: "12px",
                          fontWeight: "bold",
                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginTop: "-1px",
                          }}
                        >
                          SCHEDULE ROOM
                        </div>
                      </td>
                      <td
                        colSpan={7}
                        rowSpan={2}
                        style={{
                          color: "black",
                          height: "0.3in",
                          fontFamily: "Arial",
                          fontSize: "12px",
                          fontWeight: "bold",
                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginTop: "-1px",
                          }}
                        >
                          FACULTY
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan={2}
                        style={{
                          color: "black",
                          height: "0.1in",
                          fontSize: "12px",
                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          padding: 0,
                          letterSpacing: "-0.3px",
                        }}
                      >
                        Lec
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          color: "black",
                          height: "0.1in",
                          fontSize: "12px",
                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          padding: 0,
                          letterSpacing: "-0.3px",
                        }}
                      >
                        Lab
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          color: "black",
                          height: "0.1in",
                          fontSize: "12px",
                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          padding: 0,
                          letterSpacing: "-0.3px",
                        }}
                      >
                        Credit
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          color: "black",
                          height: "0.1in",
                          fontSize: "12px",
                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          padding: 0,
                          letterSpacing: "-0.3px",
                        }}
                      >
                        Tuition
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          color: "black",
                          height: "0.1in",
                          fontSize: "50%",
                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                          display: "none",
                        }}
                      >
                        Lec Value
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          color: "black",
                          height: "0.1in",
                          fontSize: "50%",
                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                          display: "none",
                        }}
                      >
                        Lab Value
                      </td>
                    </tr>
                    {enrolled.map((item, index) => (
                      <tr key={index}>
                        <td colSpan={5} style={{ border: "1px solid black" }}>
                          <input
                            type="text"
                            value={item.course_code || ""}
                            readOnly
                            style={{
                              width: "98%",
                              border: "none",
                              textAlign: "center",
                              background: "none",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td
                          colSpan={13}
                          style={{
                            border: "1px solid black",
                            verticalAlign: "middle",
                            padding: "1px 4px",
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              textAlign: "left",
                              fontSize: "12px",
                              lineHeight: 1.15,
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              overflowWrap: "anywhere",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {item.course_description || ""}
                          </div>
                        </td>
                        <td colSpan={2} style={{ border: "1px solid black" }}>
                          <input
                            type="text"
                            value={
                              item.course_unit == null
                                ? ""
                                : toWholeUnit(item.course_unit)
                            }
                            readOnly
                            style={{
                              width: "98%",
                              border: "none",
                              background: "none",
                              textAlign: "center",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td colSpan={2} style={{ border: "1px solid black" }}>
                          <input
                            type="text"
                            value={
                              item.lab_unit == null
                                ? ""
                                : toWholeUnit(item.lab_unit)
                            }
                            readOnly
                            style={{
                              width: "98%",
                              border: "none",
                              background: "none",
                              textAlign: "center",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td colSpan={2} style={{ border: "1px solid black" }}>
                          <input
                            type="text"
                            value={
                              toWholeUnit(item.course_unit) +
                              toWholeUnit(item.lab_unit)
                            }
                            style={{
                              width: "98%",
                              border: "none",
                              background: "none",
                              textAlign: "center",
                              fontSize: "12px",
                            }}
                            readOnly
                          />
                        </td>

                        <td colSpan={2} style={{ border: "1px solid black" }}>
                          <input
                            type="text"
                            value={
                              toWholeUnit(item.course_unit) +
                              toWholeUnit(item.lab_unit)
                            }
                            style={{
                              width: "98%",
                              border: "none",
                              background: "none",
                              textAlign: "center",
                              fontSize: "12px",
                            }}
                            readOnly
                          />
                        </td>
                        <td
                          colSpan={2}
                          style={{ border: "1px solid black", display: "none" }}
                        >
                          <input
                            type="text"
                            value={item.total_lec_value ?? ""}
                            readOnly
                            style={{
                              width: "98%",
                              border: "none",
                              background: "none",
                              textAlign: "center",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td
                          colSpan={2}
                          style={{ border: "1px solid black", display: "none" }}
                        >
                          <input
                            type="text"
                            value={item.total_lab_value ?? ""}
                            readOnly
                            style={{
                              width: "98%",
                              border: "none",
                              background: "none",
                              textAlign: "center",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td colSpan={4} style={{ border: "1px solid black" }}>
                          <input
                            type="text"
                            value={item.description || ""}
                            readOnly
                            style={{
                              width: "98%",
                              border: "none",
                              background: "none",
                              textAlign: "center",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td colSpan={7} style={{ border: "1px solid black" }}>
                          <input
                            type="text"
                            value={`${item.day_description} ${item.school_time_start}-${item.school_time_end}`}
                            readOnly
                            style={{
                              width: "98%",
                              border: "none",
                              background: "none",
                              textAlign: "center",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td
                          colSpan={7}
                          style={{
                            border: "1px solid black",
                            verticalAlign: "middle",
                            padding: "1px 4px",
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              textAlign: "center",
                              fontSize: "12px",
                              lineHeight: 1.15,
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              overflowWrap: "anywhere",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {[item.lname, item.fname]
                              .map((part) => String(part || "").trim())
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/*----------------------------------------------------------------------------------------------------------------------------------*/}

                    <tr>
                      <td
                        colSpan={12}
                        style={{
                          height: "0.1in",
                          fontSize: "11px",
                          color: "black",
                          textAlign: "left",
                        }}
                      >
                        <b>Note: Subject marked with "*" is Special Subject</b>
                      </td>
                      <td
                        colSpan={6}
                        style={{
                          fontSize: "11px",
                          color: "black",
                          textAlign: "CENTER",
                        }}
                      >
                        <b>Total Unit(s)</b>
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          fontSize: "12px",
                          color: "black",
                          fontFamily: "Arial",
                          textAlign: "center",
                        }}
                      >
                        {totalCourseUnits}
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          fontSize: "12px",
                          color: "black",
                          fontFamily: "Arial",
                          textAlign: "center",
                        }}
                      >
                        {totalLabUnits}
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          fontSize: "12px",
                          color: "black",
                          fontFamily: "Arial",
                          textAlign: "center",
                        }}
                      >
                        {totalCourseUnits + totalLabUnits}
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          fontSize: "12px",
                          color: "black",
                          fontFamily: "Arial",
                          textAlign: "center",
                        }}
                      >
                        {totalCombined}
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          fontSize: "12px",
                          color: "black",
                          fontFamily: "Arial",
                          textAlign: "center",
                          display: "none",
                        }}
                      >
                        {totalLecFees}
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          fontSize: "12px",
                          color: "black",
                          fontFamily: "Arial",
                          textAlign: "center",
                          display: "none",
                        }}
                      >
                        {totalLabFees}
                      </td>

                      <td
                        colSpan={4}
                        style={{
                          height: "0.1in",
                          fontSize: "55%",
                          color: "black",
                          textAlign: "center",
                        }}
                      ></td>
                      <td
                        colSpan={7}
                        style={{
                          height: "0.1in",
                          fontSize: "55%",
                          color: "black",
                          textAlign: "center",
                        }}
                      ></td>
                      <td
                        colSpan={7}
                        style={{
                          height: "0.1in",
                          fontSize: "55%",
                          color: "black",
                          textAlign: "center",
                        }}
                      ></td>
                    </tr>

                    <tr
                      colSpan={12}
                      style={{
                        color: "white",

                        height: "0.1in",
                        fontSize: "62.5%",
                        backgroundColor: "gray",
                        textAlign: "center",
                      }}
                    ></tr>
                  </tbody>
                </table>

                <div
                  className="fee-table-con"
                  style={{
                    display: "flex",
                    width: "100%",
                    margin: "0 auto",
                    alignItems: "flex-start",
                    gap: "6.5rem",
                    borderLeft: "1px solid black",
                    borderRight: "1px solid black",
                  }}
                >
                  <div
                    style={{
                      flex: "1 1 0",
                      minWidth: 0,
                      paddingLeft: "4px",
                      boxSizing: "border-box",
                    }}
                  >
                    <table
                      className="fee-table"
                      style={{
                        borderCollapse: "collapse",
                        fontFamily: "Arial",
                        width: "100%",
                        textAlign: "center",
                        tableLayout: "fixed",
                        borderLeft: "none",
                        borderRight: "none",
                        borderBottom: "none",
                        borderTop: "1px solid black",
                      }}
                    >
                      <style>{`
                
                                        .fee-table td {
                                          padding-top: 0px;
                                          padding-bottom: 0px;
                                        }
                                        .fee-table input {
                                          padding-top: 0px;
                                          padding-bottom: 0px;
                                          line-height: 1;
                                        }
                                      `}</style>
                      <tbody>
                        <tr>
                          <td
                            colSpan={20}
                            style={{
                              margin: "0px",
                              padding: "0px",
                              fontSize: "63.5%",
                              border: "1px solid black",
                              backgroundColor: "gray",
                              height: "auto",
                            }}
                          >
                            <input
                              type="text"
                              value={"A S S E S S E D  F E E S"}
                              readOnly
                              style={{
                                color: "black",
                                fontWeight: "bold",
                                margin: "0px",
                                padding: "0px",
                                textAlign: "center",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                                height: "auto",
                                lineHeight: "1",
                              }}
                            />
                          </td>
                        </tr>

                        <tr
                          style={{
                            borderLeft: "1px solid black",
                            height: "2px",
                            borderRight: "1px solid black",
                          }}
                        >
                          <td colSpan={20}></td>
                        </tr>

                        <tr style={{ height: "2px" }}>
                          <td
                            colSpan={15}
                            style={{
                              padding: 0,
                              borderLeft: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={`Tuition (${totalCourseUnits} unit(s))`}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "60.5%",
                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={displayTuitionAmount}
                              readOnly
                              style={{
                                textAlign: "center",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                color: "black",
                                width: "100%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        {displayFeeLines.map((fee, index) => (
                          <tr
                            key={
                              fee.fee_rate_id ||
                              fee.fee_code ||
                              `${fee.fee_name || "fee"}-${index}`
                            }
                          >
                            <td
                              colSpan={15}
                              style={{
                                fontSize: "62.5%",
                                borderLeft: "1px solid black",
                              }}
                            >
                              <input
                                type="text"
                                value={fee.fee_name || ""}
                                readOnly
                                style={{
                                  color: "black",
                                  width: "98%",
                                  border: "none",
                                  fontFamily: "Arial",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  outline: "none",
                                  background: "none",
                                }}
                              />
                            </td>
                            <td
                              colSpan={5}
                              style={{
                                fontSize: "62.5%",
                                borderRight: "1px solid black",
                              }}
                            >
                              <input
                                type="text"
                                value={toFeeNumber(fee.amount)}
                                readOnly
                                style={{
                                  textAlign: "center",
                                  fontFamily: "Arial",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  color: "black",
                                  width: "98%",
                                  border: "none",
                                  outline: "none",
                                  background: "none",
                                }}
                              />
                            </td>
                          </tr>
                        ))}

                        <tr
                          style={{
                            display: shouldUseDynamicFees
                              ? "none"
                              : "table-row",
                          }}
                        >
                          <td
                            colSpan={15}
                            style={{
                              fontSize: "62.5%",
                              borderLeft: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"Athletic Fee"}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",
                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={tosf[0]?.athletic_fee || "0"}
                              readOnly
                              style={{
                                textAlign: "center",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                color: "black",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>
                        <tr
                          style={{
                            display: shouldUseDynamicFees
                              ? "none"
                              : "table-row",
                          }}
                        >
                          <td
                            colSpan={15}
                            style={{
                              fontSize: "62.5%",
                              borderLeft: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"NSTP Fee"}
                              readOnly
                              style={{
                                display: isHaveNSTP === 0 ? "none" : "block",
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",
                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={tosf[0]?.nstp_fees || "0"}
                              readOnly
                              style={{
                                display: isHaveNSTP === 0 ? "none" : "block",
                                textAlign: "center",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                color: "black",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr
                          style={{
                            display: shouldUseDynamicFees
                              ? "none"
                              : "table-row",
                          }}
                        >
                          <td
                            colSpan={15}
                            style={{
                              fontSize: "62.5%",
                              borderLeft: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"Cultural Fee"}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={tosf[0]?.cultural_fee || "0"}
                              readOnly
                              style={{
                                textAlign: "center",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                color: "black",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr
                          style={{
                            display: shouldUseDynamicFees
                              ? "none"
                              : "table-row",
                          }}
                        >
                          <td
                            colSpan={15}
                            style={{
                              fontSize: "62.5%",
                              borderLeft: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"Developmental Fee"}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={tosf[0]?.developmental_fee || "0"}
                              readOnly
                              style={{
                                textAlign: "center",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                color: "black",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr
                          style={{
                            display: shouldUseDynamicFees
                              ? "none"
                              : "table-row",
                          }}
                        >
                          <td
                            colSpan={15}
                            style={{
                              fontSize: "62.5%",
                              borderLeft: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"Guidance Fee"}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={tosf[0]?.guidance_fee || "0"}
                              readOnly
                              style={{
                                textAlign: "center",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                color: "black",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr
                          style={{
                            display: shouldUseDynamicFees
                              ? "none"
                              : "table-row",
                          }}
                        >
                          <td
                            colSpan={15}
                            style={{
                              fontSize: "62.5%",
                              borderLeft: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"Library Fee"}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={tosf[0]?.library_fee || "0"}
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr
                          style={{
                            display: shouldUseDynamicFees
                              ? "none"
                              : "table-row",
                          }}
                        >
                          <td
                            colSpan={15}
                            style={{
                              fontSize: "62.5%",
                              borderLeft: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"Medical and Dental Fee"}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={tosf[0]?.medical_and_dental_fee || "0"}
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr
                          style={{
                            display: shouldUseDynamicFees
                              ? "none"
                              : "table-row",
                          }}
                        >
                          <td
                            colSpan={15}
                            style={{
                              fontSize: "62.5%",
                              borderLeft: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"Registration Fee"}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={tosf[0]?.registration_fee || "0"}
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr
                          style={{
                            display: shouldUseDynamicFees
                              ? "none"
                              : "table-row",
                          }}
                        >
                          <td
                            colSpan={15}
                            style={{
                              fontSize: "62.5%",
                              borderLeft: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"School ID Fee"}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                                display: isFirstYearFirstSem ? "block" : "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={tosf[0]?.school_id_fees || "0"}
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                outline: "none",
                                display: isFirstYearFirstSem ? "block" : "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr
                          style={{
                            display: shouldUseDynamicFees
                              ? "none"
                              : "table-row",
                          }}
                        >
                          <td
                            colSpan={15}
                            style={{
                              fontSize: "62.5%",
                              borderLeft: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"Computer Fee"}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                                display:
                                  isHaveComputerFees === 0 ? "none" : "block",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={tosf[0]?.computer_fees || "0"}
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                outline: "none",
                                display:
                                  isHaveComputerFees === 0 ? "none" : "block",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr
                          style={{
                            display: shouldUseDynamicFees
                              ? "none"
                              : "table-row",
                          }}
                        >
                          <td
                            colSpan={15}
                            style={{
                              fontSize: "62.5%",
                              borderLeft: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"Laboratory Fee"}
                              readOnly
                              style={{
                                display:
                                  isHaveLaboratory === 0 ? "none" : "block",
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",
                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={tosf[0]?.laboratory_fees || "0"}
                              readOnly
                              style={{
                                display:
                                  isHaveLaboratory === 0 ? "none" : "block",
                                textAlign: "center",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                color: "black",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",
                              borderLeft: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={13}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                textAlign: "left",
                                color: "black",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              marginRight: "20px",
                              borderLeft: "1px solid black",
                            }}
                          ></td>
                          <td
                            colSpan={13}
                            style={{
                              fontSize: "62.5%",
                            }}
                          >
                            <input
                              type="text"
                              value={"Total Assessment : "}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={displayTotalAssessment}
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              marginRight: "20px",
                              borderLeft: "1px solid black",
                            }}
                          ></td>
                          <td
                            colSpan={13}
                            style={{
                              fontSize: "62.5%",
                            }}
                          >
                            <input
                              type="text"
                              value={"Less Financial Aid : "}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={displayFinancialAidAmount}
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              marginRight: "20px",
                              borderLeft: "1px solid black",
                            }}
                          ></td>
                          <td
                            colSpan={13}
                            style={{
                              fontSize: "62.5%",
                            }}
                          >
                            <input
                              type="text"
                              value={"Net Assessed : "}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={displayNetAssessment}
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              marginRight: "20px",
                              borderLeft: "1px solid black",
                            }}
                          ></td>
                          <td
                            colSpan={13}
                            style={{
                              fontSize: "62.5%",
                            }}
                          >
                            <input
                              type="text"
                              value={"Credit Memo : "}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              marginRight: "20px",
                              borderLeft: "1px solid black",
                            }}
                          ></td>
                          <td
                            colSpan={13}
                            style={{
                              fontSize: "62.5%",
                            }}
                          >
                            <input
                              type="text"
                              value={"Total Discount : "}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              marginRight: "20px",
                              borderLeft: "1px solid black",
                            }}
                          ></td>
                          <td
                            colSpan={13}
                            style={{
                              fontSize: "62.5%",
                            }}
                          >
                            <input
                              type="text"
                              value={"Total Payment : "}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              marginRight: "20px",
                              borderLeft: "1px solid black",
                            }}
                          ></td>
                          <td
                            colSpan={18}
                            style={{
                              fontSize: "62.5%",
                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"Outstanding Balance : "}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr
                          style={{
                            borderLeft: "1px solid black",
                            height: "5px",
                            borderRight: "1px solid black",
                          }}
                        >
                          <td></td>
                        </tr>

                        <tr>
                          <td
                            colSpan={20}
                            style={{
                              margin: "0px",
                              padding: "0px",
                              fontSize: "63.5%",
                              border: "1px solid black",
                              backgroundColor: "gray",
                              height: "auto",
                            }}
                          >
                            <input
                              type="text"
                              value={"S C H E D U L E O F P A Y M E N T"}
                              readOnly
                              style={{
                                color: "black",
                                fontWeight: "bold",
                                margin: "0px",
                                padding: "0px",
                                textAlign: "center",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                                lineHeight: "1",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={7}
                            style={{
                              fontSize: "62.5%",
                              border: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"1st Payment/Due"}
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={6}
                            style={{
                              border: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"2nd Payment/Due"}
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                fontWeight: "bold",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={7}
                            style={{
                              border: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"3rd Payment/Due"}
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                fontWeight: "bold",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={7}
                            style={{
                              fontSize: "62.5%",
                              border: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                color: "black",
                                fontWeight: "bold",
                                textAlign: "center",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={6}
                            style={{
                              fontSize: "62.5%",
                              border: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                fontWeight: "bold",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={7}
                            style={{
                              fontSize: "62.5%",
                              border: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                width: "98%",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={12}
                            style={{
                              fontSize: "62.5%",
                            }}
                          >
                            <input
                              type="text"
                              value={"Payment/Validation Date : "}
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                width: "98%",
                                fontWeight: "bold",
                                textDecorationThickness: "2px", // <-- Thicker underline

                                fontFamily: "Arial",
                                fontSize: "12px",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={8}
                            style={{
                              height: "0.25in",
                              fontSize: "12px",
                              fontFamily: "Arial",
                              textAlign: "center",
                              verticalAlign: "middle",
                            }}
                          >
                            <input
                              type="text"
                              value={shortDate}
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                width: "100%", // ensures full-width underline
                                border: "none",
                                outline: "none",

                                fontWeight: "bold",
                                background: "none",
                                borderBottom: "1px solid black", // thicker, longer underline
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={9}
                            style={{
                              fontSize: "62.5%",
                            }}
                          >
                            <input
                              type="text"
                              value={"Official Receipt :"}
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                width: "98%",
                                fontWeight: "bold",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={10}
                            style={{
                              fontSize: "62.5%",
                              textAlign: "center",
                              fontWeight: "Bold",
                            }}
                          >
                            <input
                              type="text"
                              value={"Scholar"}
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                width: "95%",
                                fontWeight: "bold",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                border: "none",
                                outline: "none",
                                background: "none",
                                borderBottom: "1px solid black", // underlines the field like a line
                              }}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div style={{ flex: "1 1 0", minWidth: 0 }}>
                    <table
                      style={{
                        borderCollapse: "collapse",
                        fontFamily: "Arial",
                        width: "100%",
                        margin: "0",
                        textAlign: "center",
                        tableLayout: "fixed",
                        borderLeft: "none",
                        borderBottom: "none",
                        borderTop: "none",
                      }}
                    >
                      <tbody>
                        <br />
                        <tr>
                          <td
                            style={{
                              fontSize: "12px",
                              fontWeight: "bold",
                              marginBottom: "5px",
                            }}
                          >
                            <input
                              type="text"
                              value={"RULES OF REFUND"}
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>
                        {[
                          "1. Full refund of tuition fee - Before the start of classes.",
                          "2. 80% refund of tuition fee - within 1 week from the start of classes.",
                          "3. 50% refund - within 2 weeks from the start of classes.",
                          "4. No refund - after the 2nd week of classes.",
                        ].map((rule, index) => (
                          <tr key={`refund-rule-${index}`}>
                            <td style={{ fontSize: "10px" }}>
                              <input
                                type="text"
                                value={rule}
                                readOnly
                                style={{
                                  textAlign: "left",
                                  color: "black",
                                  paddingLeft: "40px",
                                  width: "98%",
                                  border: "none",
                                  fontFamily: "Arial",
                                  fontSize: "10px",
                                  fontWeight: "bold",
                                  outline: "none",
                                  background: "none",
                                  fontStyle: "italic",
                                }}
                              />
                            </td>
                          </tr>
                        ))}

                        <tr>
                          <td style={{ height: "0.12in" }}></td>
                        </tr>

                        <tr>
                          <td style={{ fontSize: "12px", fontWeight: "bold" }}>
                            <input
                              type="text"
                              value={"PLEDGE UPON ADMISSION"}
                              readOnly
                              style={{
                                fontWeight: "bold",
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontSize: "10px", fontWeight: "bold" }}>
                            <input
                              type="text"
                              value={
                                '"As a student of EARIST, I do solemnly promise that I will'
                              }
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "10px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                                fontStyle: "italic",
                              }}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontSize: "10px", fontWeight: "bold" }}>
                            <input
                              type="text"
                              value={
                                'comply with the rules and regulations of the Institution."'
                              }
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "10px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                                fontStyle: "italic",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td style={{ height: "calc(0.2in + 2rem)" }}></td>
                        </tr>

                        <tr>
                          <td style={{ padding: 0, textAlign: "center" }}>
                            <div
                              style={{
                                width: "70%",
                                margin: "0 auto",
                                borderBottom: "1px solid black",
                                height: 0,
                                lineHeight: 0,
                              }}
                            />
                            <div
                              style={{
                                color: "black",
                                textAlign: "center",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                marginTop: "9px",
                                lineHeight: 1.1,
                              }}
                            >
                              Student's Signature
                            </div>
                          </td>
                        </tr>

                        <tr>
                          <td style={{ height: "0.12in" }}></td>
                        </tr>
                        <tr>
                          <td style={{ height: "0.12in" }}></td>
                        </tr>

                        <tr>
                          <td
                            style={{ textAlign: "left", paddingLeft: "20px" }}
                          >
                            <input
                              type="text"
                              value={"APPROVED BY : "}
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "left",
                                fontWeight: "bold",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                                fontSize: "12px",
                              }}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td
                            style={{
                              textAlign: "center",
                              fontSize: "12px",
                              padding: 0,
                            }}
                          >
                            {showApprovedBySignature ? (
                              <img
                                src={approvedBySignatureUrl}
                                alt="Signature"
                                onError={() =>
                                  setApprovedBySignatureMissing(true)
                                }
                                style={{
                                  height: "60px",
                                  objectFit: "contain",
                                  width: "250px",
                                  marginBottom: "0",
                                  display: !student_number ? "none" : "block",
                                  marginLeft: "auto",
                                  marginRight: "auto",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  height: student_number ? "60px" : "0",
                                  display: !student_number ? "none" : "block",
                                }}
                              />
                            )}

                            <div
                              style={{
                                display: "inline-block",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                lineHeight: "1.1",
                                textAlign: "center",
                              }}
                            >
                              <div
                                style={{
                                  minHeight: student_number ? "14px" : "0",
                                  display: !student_number ? "none" : "block",
                                }}
                              >
                                {approvedBy?.full_name || ""}
                              </div>
                              <div
                                style={{
                                  width: "250px",
                                  margin: "0 auto",
                                  borderBottom: "1px solid black",
                                  height: 0,
                                  lineHeight: 0,
                                }}
                              />
                              <div
                                style={{
                                  color: "black",
                                  textAlign: "center",
                                  fontFamily: "Arial",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  marginTop: "9px",
                                  lineHeight: 1.1,
                                }}
                              >
                                Registrar
                              </div>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <table
                  style={{
                    borderCollapse: "collapse",
                    fontFamily: "Arial",
                    width: "100%",
                    margin: "0 auto",
                    textAlign: "center",
                    tableLayout: "fixed",
                    borderLeft: "1px solid black",
                    borderBottom: "1px solid black",
                    borderRight: "1px solid black",
                  }}
                >
                  <tbody>
                    {/* TOP ROW: IMAGE (LEFT) + QR (RIGHT) */}
                    <tr>
                      {/* LEFT SIDE */}
                      <td
                        style={{
                          width: "50%",
                          textAlign: "left",
                          paddingLeft: "50px", // ?? margin-left effect
                        }}
                      >
                        <img
                          src={FreeTuitionImage}
                          alt="EARIST MIS FEE"
                          style={{
                            width: "420px",
                            height: "236px",
                            objectFit: "contain",
                            display: "block",
                          }}
                        />
                      </td>

                      {/* RIGHT SIDE */}
                      <td
                        style={{
                          width: "100%",
                          paddingRight: "30px",
                          verticalAlign: "bottom",
                        }}
                      >
                        {hasStudentData && !qrCodeMissing && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: "0.25rem",
                            }}
                          >
                            <img
                              className="qr-code-img"
                              style={{
                                width: "150px",
                                height: "150px",
                                display: "block",
                              }}
                              src={`${API_BASE_URL}/uploads/QrCodeGenerated/${student_number}_qrcode.png`}
                              alt=""
                              onError={() => setQrCodeMissing(true)}
                            />
                            <span
                              style={{
                                color: "black",
                                fontSize: "15px",
                                lineHeight: 1.2,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {longDate}
                            </span>
                          </div>
                        )}
                        {!(hasStudentData && !qrCodeMissing) && (
                          <div
                            style={{
                              textAlign: "right",
                              fontSize: "15px",
                              color: "black",
                            }}
                          >
                            {longDate}
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* FOOTER */}
                    <tr>
                      <td
                        colSpan={2}
                        style={{
                          height: "0.2in",
                          fontSize: "72.5%",
                          backgroundColor: "gray",
                          color: "white",
                        }}
                      >
                        <b>
                          <i
                            style={{
                              color: "black",
                              textAlign: "center",
                              display: "block",
                            }}
                          >
                            KEEP THIS CERTIFICATE. YOU WILL BE REQUIRED TO
                            PRESENT THIS IN ALL YOUR DEALINGS WITH THE COLLEGE.
                          </i>
                        </b>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </Container>
    );
  },
);

export default CertificateOfRegistration;
