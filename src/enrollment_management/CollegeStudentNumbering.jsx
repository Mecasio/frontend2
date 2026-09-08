import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import axios from 'axios';
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
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { io } from "socket.io-client";
import { Snackbar, Alert } from '@mui/material';
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { IconButton, InputAdornment } from "@mui/material";
import { useNavigate } from "react-router-dom";
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PeopleIcon from '@mui/icons-material/People';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import SearchIcon from '@mui/icons-material/Search';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ScoreIcon from '@mui/icons-material/Score';
import CloseIcon from "@mui/icons-material/Close";
import {
    departmentIdsMatch,
    getDepartmentIdsFromAdminData,
    getDepartmentsFromAdminScopes,
    isRegistrarApplicantScopeMatch,
    isRegistrarCurriculumMatch,
    isRegistrarProgramSelectionLocked,
    normalizeDepartmentId,
    restrictToRegistrarCurriculum,
    syncRegistrarScopeFromAdminData,
} from "../utils/registrarCurriculumRestriction";
import useRegistrarScopeRevision from "../hooks/useRegistrarScopeRevision";
import PersonIcon from "@mui/icons-material/Person";
import { getLoginMacPayload } from "../utils/userMacAddress";
import useAuditMac from "../utils/useAuditMac";

const CollegeStudentNumbering = () => {
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
        setBranches(settings.branches || []);

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

    const tabs = [
     {
          label: "Applicant List",
          to: "/applicant_list_college",
          icon: <SchoolIcon fontSize="large" />,
        },
        {
          label: "Applicant Profile",
          to: "/applicant_college_personal_information",
          icon: <PersonIcon fontSize="large" />,
        },
        {
          label: "Applicant Online Requirements",
          to: "/applicant_online_requirements_college",
          icon: <AssignmentIcon fontSize="large" />,
        },
        {
          label: "Entrance Examination Score",
          to: "/college_entrance_examination_score",
          icon: <ScoreIcon fontSize="large" />,
        },
        {
          label: "Qualifying / Interview Schedule Management",
          to: "/college_qualifying_interview_schedule_management",
          icon: <ScheduleIcon fontSize="large" />,
        },
        {
          label: "Qualifying / Interview Exam Score",
          to: "/college_qualifying_interview_score",
          icon: <ScoreIcon fontSize="large" />,
        },
      

    ];


    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(6);
    const [clickedSteps, setClickedSteps] = useState(Array(tabs.length).fill(false));


    const handleStepClick = (index, to) => {
        setActiveStep(index);
        navigate(to); // this will actually change the page
    };


    const [authOpen, setAuthOpen] = useState(true);
    const [authPassword, setAuthPassword] = useState("");
    const [authError, setAuthError] = useState("");
    const [authPassed, setAuthPassed] = useState(false);
    const [showAuthPassword, setShowAuthPassword] = useState(false);

    // 🔒 NEW: Lockout states
    const [isLocked, setIsLocked] = useState(false);
    const [lockTimer, setLockTimer] = useState(0);
    const lockIntervalRef = useRef(null);

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
                        : data?.message || "❌ Invalid password."
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

        axios.get(`${API_BASE_URL}/api/check-lock-status/${personId}`)
            .then((res) => {
                if (res.data.locked) {
                    setIsLocked(true);
                    setLockTimer(res.data.remainingSeconds);
                    setAuthError(`Account locked. Try again in ${Math.ceil(res.data.remainingSeconds / 60)} minute(s).`);

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


    const [persons, setPersons] = useState([]);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [assignedNumber, setAssignedNumber] = useState('');
    const [error, setError] = useState('');
    const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });

    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    // 🔑 For modal
    const [openModal, setOpenModal] = useState(false);
    const [password, setPassword] = useState("");

    const itemsPerPage = 100; // 🔧 adjustable
    const [userID, setUserID] = useState("");
    const [adminData, setAdminData] = useState({ dprtmnt_id: "", dprtmnt_ids: [], scopes: [] });
    const [curriculumOptions, setCurriculumOptions] = useState([]);
    const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
    const [selectedProgramFilter, setSelectedProgramFilter] = useState("");
    const scopeRevision = useRegistrarScopeRevision();
    const isProgramLocked = isRegistrarProgramSelectionLocked();
    const [selectedCampus, setSelectedCampus] = useState("");
    const [department, setDepartment] = useState([]);
    const [allCurriculums, setAllCurriculums] = useState([]);
    const [schoolYears, setSchoolYears] = useState([]);
    const [semesters, setSchoolSemester] = useState([]);
    const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
    const [selectedSchoolSemester, setSelectedSchoolSemester] = useState('');
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
    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState("asc");


    const [user, setUser] = useState("");
    const [userRole, setUserRole] = useState("");

    const [hasAccess, setHasAccess] = useState(null);
    const [accessLoading, setAccessLoading] = useState(true);


    const pageId = 60;

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
        setAccessLoading(true);
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
        } finally {
            setAccessLoading(false);
        }
    };

    useEffect(() => {
        const storedID = localStorage.getItem("email");

        if (!storedID) {
            window.location.href = "/login";
            return;
        }

        setUserID(storedID);
    }, []);

    useEffect(() => {
        if (userID) {
            const fetchPersonData = async () => {
                try {
                    const res = await axios.get(`${API_BASE_URL}/api/admin_data/${userID}`);
                    setAdminData(res.data);
                    syncRegistrarScopeFromAdminData(res.data);
                } catch (err) {
                    console.error("Error fetching admin data:", err);
                }
            };

            fetchPersonData()
        }

    }, [userID]);

    useEffect(() => {
        const departmentIds = getDepartmentIdsFromAdminData(adminData);
        const seededDepartments = getDepartmentsFromAdminScopes(adminData);
        if (seededDepartments.length) {
            setDepartment(seededDepartments);
        }
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
                        mergedDepartments.map((dep) => [
                            normalizeDepartmentId(dep.dprtmnt_id),
                            {
                                ...dep,
                                dprtmnt_id: normalizeDepartmentId(dep.dprtmnt_id),
                            },
                        ]),
                    ).values(),
                ];
                setDepartment(uniqueDepartments);
            } catch (error) {
                console.error("Error fetching departments:", error);
                if (seededDepartments.length) {
                    setDepartment(seededDepartments);
                }
            }
        };

        fetchDepartments();
    }, [adminData.dprtmnt_id, adminData.dprtmnt_ids, adminData.scopes, scopeRevision]);

    useEffect(() => {
        const departmentIds = getDepartmentIdsFromAdminData(adminData);
        if (!departmentIds.length) return;

        const fetchCurriculums = async () => {
            try {
                const responses = await Promise.all(
                    departmentIds.map((departmentId) =>
                        axios.get(`${API_BASE_URL}/api/applied_program/${departmentId}`),
                    ),
                );
                const merged = responses.flatMap((response) => response.data || []);
                const restrictedCurriculums = restrictToRegistrarCurriculum(merged);
                setAllCurriculums(restrictedCurriculums);
                setCurriculumOptions(restrictedCurriculums);
            } catch (error) {
                console.error("Error fetching curriculum options:", error);
            }
        };

        fetchCurriculums();
    }, [adminData.dprtmnt_id, adminData.dprtmnt_ids, adminData.scopes, scopeRevision]);

    useEffect(() => {
        axios
            .get(`${API_BASE_URL}/api/get_school_year/`)
            .then((res) => setSchoolYears(res.data))
            .catch((err) => console.error(err));
    }, [])

    useEffect(() => {
        axios
            .get(`${API_BASE_URL}/api/get_school_semester/`)
            .then((res) => setSchoolSemester(res.data))
            .catch((err) => console.error(err));
    }, [])

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

    const fetchPersons = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/college/persons`);
            setPersons(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchPersons();
    }, []);

    const filteredPersons = persons
        .filter((personData) => {
            const normalize = (value) => String(value ?? "").trim().toLowerCase();
            const selectedSemester = semesters.find(
                (sem) => String(sem.semester_id) === String(selectedSchoolSemester),
            );

            // ✅ Build searchable text (name, email, applicant number)
            const fullText = `${personData.first_name} ${personData.middle_name} ${personData.last_name} ${personData.emailAddress ?? ''} ${personData.applicant_number ?? ''}`.toLowerCase();

            // ✅ Search filter
            const matchesSearch = fullText.includes(searchQuery.toLowerCase());
            const matchesCampus =
                !selectedCampus || String(personData.campus) === String(selectedCampus);

            // ✅ Program / Department filtering
            const programInfo = allCurriculums.find(
                (opt) => opt.curriculum_id?.toString() === personData.program?.toString()
            );
            const matchesRegistrarScope = isRegistrarApplicantScopeMatch(personData, {
                curriculumId: personData.program,
                programId: programInfo?.program_id ?? personData.program_id,
            });

            const matchesProgram =
                selectedProgramFilter === "" ||
                programInfo?.program_code === selectedProgramFilter;

            const matchesDepartment =
                selectedDepartmentFilter === "" ||
                departmentIdsMatch(
                    programInfo?.dprtmnt_id ?? personData.dprtmnt_id,
                    selectedDepartmentFilter,
                );

            // ✅ School Year filtering
            const applicantAppliedYear = new Date(personData.created_at).getFullYear();
            const schoolYear = schoolYears.find((sy) => sy.year_id === selectedSchoolYear);

            const matchesSchoolYear =
                selectedSchoolYear === "" ||
                (schoolYear && String(applicantAppliedYear) === String(schoolYear.current_year));

            // ✅ Semester filtering
            const matchesSemester =
                selectedSchoolSemester === "" ||
                normalize(personData.middle_code) === normalize(selectedSemester?.semester_code);

            return (
                matchesSearch &&
                matchesCampus &&
                matchesRegistrarScope &&
                matchesDepartment &&
                matchesProgram &&
                matchesSchoolYear &&
                matchesSemester
            );
        })
        .sort((a, b) => {
            let fieldA, fieldB;
            if (sortBy === "name") {
                fieldA = `${a.last_name} ${a.first_name} ${a.middle_name || ''}`.toLowerCase();
                fieldB = `${b.last_name} ${b.first_name} ${b.middle_name || ''}`.toLowerCase();
            } else if (sortBy === "id") {
                fieldA = a.applicant_number || "";
                fieldB = b.applicant_number || "";
            } else if (sortBy === "email") {
                fieldA = a.emailAddress?.toLowerCase() || "";
                fieldB = b.emailAddress?.toLowerCase() || "";
            } else {
                return 0;
            }
            if (fieldA < fieldB) return sortOrder === "asc" ? -1 : 1;
            if (fieldA > fieldB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

    // ✅ Pagination logic
    const totalPages = Math.ceil(filteredPersons.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentPersons = filteredPersons.slice(startIndex, startIndex + itemsPerPage);

    const handlePersonClick = (person) => {
        setSelectedPerson(person);
        setAssignedNumber('');
        setError('');
    };

    // 🔑 Step 1: Open confirmation modal
    const openAssignModal = () => {
        if (!selectedPerson) return;
        setPassword("");   // ✅ clears any previously typed password
        setOpenModal(true);
    };

    const buildAcceptanceEmailPreview = () => {
        const schoolName = companyName || "our school";
        const firstName = selectedPerson?.first_name || "";
        const middleName = selectedPerson?.middle_name || "";
        const lastName = selectedPerson?.last_name || "";
        const emailAddress = selectedPerson?.emailAddress || "";
        const loginUrl =
            typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";

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
        try {
            socket.current.emit("assign-student-number", {
                person_id: selectedPerson.person_id,
                audit_actor_id:
                    employeeID ||
                    localStorage.getItem("employee_id") ||
                    localStorage.getItem("email") ||
                    "unknown",
                audit_actor_role: userRole || localStorage.getItem("role") || "registrar",
                ...getLoginMacPayload(),
            });

            socket.current.once("assign-student-number-result", (data) => {
                if (data.success) {
                    setAssignedNumber(data.student_number);
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
            setAuthError("Invalid Password please try Again");
        }
    };

    const handleSnackClose = (_, reason) => {
        if (reason === 'clickaway') return;
        setSnack(prev => ({ ...prev, open: false }));
    };

    const handleSchoolYearChange = (event) => {
        setSelectedSchoolYear(event.target.value);
    };

    const handleSchoolSemesterChange = (event) => {
        setSelectedSchoolSemester(event.target.value);
    };

    useEffect(() => {
        if (!isProgramLocked) return;
        const assignedCurriculum = curriculumOptions.find((prog) =>
            isRegistrarCurriculumMatch(prog.curriculum_id)
        );
        if (assignedCurriculum?.program_code) {
            setSelectedProgramFilter(assignedCurriculum.program_code);
        }
    }, [curriculumOptions, isProgramLocked]);

    useEffect(() => {
        if (department.length === 0 || selectedDepartmentFilter) return;
        const departmentIds = getDepartmentIdsFromAdminData(adminData);
        if (departmentIds.length !== 1) return;

        const firstDeptId = normalizeDepartmentId(department[0].dprtmnt_id);
        setSelectedDepartmentFilter(firstDeptId);
        handleDepartmentChange(firstDeptId);
    }, [department, selectedDepartmentFilter, adminData]);

    const handleDepartmentChange = (selectedDept) => {
        const normalizedDept = normalizeDepartmentId(selectedDept);
        setSelectedDepartmentFilter(normalizedDept);
        if (!normalizedDept) {
            setCurriculumOptions(allCurriculums);
        } else {
            setCurriculumOptions(
                allCurriculums.filter((option) =>
                    departmentIdsMatch(option.dprtmnt_id, normalizedDept),
                ),
            );
        }
        if (!isProgramLocked) setSelectedProgramFilter("");
    };

    // 🔒 Disable right-click
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // 🔒 Block DevTools shortcuts + Ctrl+P silently
    document.addEventListener('keydown', (e) => {
        const isBlockedKey =
            e.key === 'F12' || // DevTools
            e.key === 'F11' || // Fullscreen
            (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === 'i' || e.key.toLowerCase() === 'j')) || // Ctrl+Shift+I/J
            (e.ctrlKey && e.key.toLowerCase() === 'u') || // Ctrl+U (View Source)
            (e.ctrlKey && e.key.toLowerCase() === 'p');   // Ctrl+P (Print)

        if (isBlockedKey) {
            e.preventDefault();
            e.stopPropagation();
        }
    });



    // Put this at the very bottom before the return 
    if (accessLoading || hasAccess === null) {
        return <LoadingOverlay open message="Loading..." />;
    }

    if (!hasAccess) {
        return (
            <Unauthorized />
        );
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
                            <Typography fontWeight="bold" fontSize={16} color="white" lineHeight={1.2}>
                                {isLocked ? "Access Locked" : "Identity Verification"}
                            </Typography>
                            <Typography fontSize={12} color="rgba(255,255,255,0.8)" lineHeight={1.2}>
                                {isLocked ? "Too many failed attempts" : "Confirm your credentials to continue"}
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
                            <Typography fontWeight="bold" fontSize={18} color="#c62828" mb={1}>
                                Account Temporarily Locked
                            </Typography>
                            <Typography fontSize={13} color="#555" mb={3}>
                                You've exceeded the maximum number of password attempts.
                                Please wait before trying again.
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
                                <Typography fontSize={12} color="#e65100" fontWeight="bold" mb={0.5}>
                                    TIME REMAINING
                                </Typography>
                                <Typography
                                    fontSize={40}
                                    fontWeight="bold"
                                    color="#bf360c"
                                    fontFamily="monospace"
                                    letterSpacing={4}
                                >
                                    {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
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
                                    { label: "Verify identity", sub: "Your password", active: true },
                                    { label: "Assign number", sub: "Student ID minted", active: false },
                                    { label: "Send email", sub: "Credentials sent", active: false },
                                    { label: "Mark enrolled", sub: "Cannot be undone", active: false },
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
                                                color={step.active ? headerColor : "#555"}
                                            >
                                                {step.label}
                                            </Typography>
                                            <Typography fontSize={10} color="#888">
                                                {step.sub}
                                            </Typography>
                                        </Box>
                                        {i < arr.length - 1 && (
                                            <Typography sx={{ color: "#aaa", mx: 0.3, fontSize: 16 }}>→</Typography>
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
                                    <strong>cannot be reversed</strong>. The student will receive login credentials
                                    immediately.
                                </Typography>
                            </Box>

                            {/* Password Field */}
                            <Typography fontSize={13} fontWeight="bold" color="#333" mb={0.75}>
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
                                onKeyDown={(e) => { if (e.key === "Enter") handleAuthSubmit(); }}
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
                                                {showAuthPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
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
                                    backgroundColor: mainButtonColor,
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
                <Typography variant="h4"
                    sx={{
                        fontWeight: 'bold',
                        color: titleColor,
                        fontSize: '36px',
                    }}
                >
                    STUDENT NUMBERING
                </Typography>


                <TextField
                    variant="outlined"
                    placeholder="Search Applicant Name / Email / Applicant ID"
                    size="small"

                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                    }}
                    sx={{
                        width: 450,
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

            </Box>

            <hr style={{ border: "1px solid #ccc", width: "100%" }} />

            <br />
            <br />

            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "nowrap", // ❌ prevent wrapping
                    width: "100%",

                    gap: 2,
                }}
            >
                {tabs.map((tab, index) => (
                    <Card
                        key={index}
                        onClick={() => handleStepClick(index, tab.to)}
                        sx={{
                            flex: `1 1 ${100 / tabs.length}%`, // evenly divide row
                            height: 135,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            borderRadius: 2,
                            border: `1px solid ${borderColor}`,
                            backgroundColor:
                                activeStep === index
                                    ? headerColor
                                    : "#E8C999",
                            color: activeStep === index ? "#fff" : "#000",
                            boxShadow:
                                activeStep === index
                                    ? "0px 4px 10px rgba(0,0,0,0.3)"
                                    : "0px 2px 6px rgba(0,0,0,0.15)",
                            transition: "0.3s ease",
                            "&:hover": {
                                backgroundColor: activeStep === index ? "#000000" : "#f5d98f",
                            },
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                            }}
                        >
                            <Box sx={{ fontSize: 40, mb: 1 }}>{tab.icon}</Box>
                            <Typography
                                sx={{ fontSize: 14, fontWeight: "bold", textAlign: "center" }}
                            >
                                {tab.label}
                            </Typography>
                        </Box>
                    </Card>
                ))}
            </Box>

            <br />
            <br />



            <TableContainer component={Paper} sx={{ width: '100%', border: `1px solid ${borderColor}`, }}>
                <Table>
                    <TableHead sx={{ backgroundColor: headerColor }}>
                        <TableRow>
                            <TableCell sx={{ color: 'white', textAlign: "Center" }}>Student Numbering Panel</TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>
            <TableContainer component={Paper} sx={{ width: '100%', border: `1px solid ${borderColor}`, p: 2 }}>
                <Box display="flex" justifyContent="space-between" flexWrap="wrap" rowGap={3} columnGap={5}>

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
                                    label="Campus"
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
                                        <MenuItem key={branch.id ?? branch.branch} value={branch.id ?? ""}>
                                            {branch.branch}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        {/* Sort By */}
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography fontSize={13} sx={{ minWidth: "10px" }}>Sort By:</Typography>
                            <FormControl size="small" sx={{ width: "200px" }}>
                                <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} displayEmpty>
                                    <MenuItem value="">Select Field</MenuItem>
                                    <MenuItem value="name">Applicant's Name</MenuItem>
                                    <MenuItem value="id">Applicant ID</MenuItem>
                                    <MenuItem value="email">Email Address</MenuItem>
                                </Select>
                            </FormControl>
                            <Typography fontSize={13} sx={{ minWidth: "10px" }}>Sort Order:</Typography>
                            <FormControl size="small" sx={{ width: "200px" }}>
                                <Select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} displayEmpty>
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
                            <Typography fontSize={13} sx={{ minWidth: "100px" }}>School Year:</Typography>
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
                            <Typography fontSize={13} sx={{ minWidth: "100px" }}>Semester:</Typography>
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
                            <Typography fontSize={13} sx={{ minWidth: "100px" }}>Department:</Typography>
                            <FormControl size="small" sx={{ width: "400px" }}>
                                <Select
                                    value={selectedDepartmentFilter}
                                    onChange={(e) => handleDepartmentChange(e.target.value)}
                                    displayEmpty
                                >
                                    <MenuItem value="">All Departments</MenuItem>
                                    {department.map((dep) => (
                                        <MenuItem key={dep.dprtmnt_id} value={normalizeDepartmentId(dep.dprtmnt_id)}>
                                            {dep.dprtmnt_name} ({dep.dprtmnt_code})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography fontSize={13} sx={{ minWidth: "100px" }}>Program:</Typography>
                            <FormControl size="small" sx={{ width: "350px" }}>
                                <Select
                                    value={selectedProgramFilter}
                                    onChange={(e) => setSelectedProgramFilter(e.target.value)}
                                    disabled={isProgramLocked}
                                    displayEmpty
                                >
                                    {!isProgramLocked && <MenuItem value="">All Programs</MenuItem>}
                                    {curriculumOptions.map((prog) => (
                                        <MenuItem key={prog.curriculum_id} value={prog.program_code}>
                                            {prog.program_code} - {prog.program_description}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                        </Box>
                    </Box>
                </Box>
            </TableContainer>


            <TableContainer component={Paper} sx={{ width: '100%' }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: headerColor, color: "white" }}>
                        <TableRow>
                            <TableCell
                                colSpan={10}
                                sx={{
                                    border: `1px solid ${borderColor}`,
                                    py: 0.5,
                                    backgroundColor: headerColor,
                                    color: "white"
                                }}
                            >
                                <Box display="flex" justifyContent="space-between" alignItems="center" >
                                    {/* Left: Applicant List Count */}
                                    <Typography fontSize="14px" fontWeight="bold" color="white">
                                        Total Applicant's: {filteredPersons.length}
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
                                                '&:hover': {
                                                    borderColor: 'white',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                },
                                                '&.Mui-disabled': {
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
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                minWidth: 80,
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                '&:hover': {
                                                    borderColor: 'white',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                },
                                                '&.Mui-disabled': {
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
                                                    fontSize: '12px',
                                                    height: 36,
                                                    color: 'white',
                                                    border: '1px solid white',
                                                    backgroundColor: 'transparent',
                                                    '.MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'white',
                                                    },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'white',
                                                    },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'white',
                                                    },
                                                    '& svg': {
                                                        color: 'white',
                                                    }
                                                }}
                                                MenuProps={{
                                                    PaperProps: {
                                                        sx: {
                                                            maxHeight: 200,
                                                            backgroundColor: '#fff',
                                                        }
                                                    }
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
                                            of {totalPages} page{totalPages > 1 ? 's' : ''}
                                        </Typography>

                                        {/* Next & Last */}
                                        <Button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                minWidth: 80,
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                '&:hover': {
                                                    borderColor: 'white',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                },
                                                '&.Mui-disabled': {
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
                                                '&:hover': {
                                                    borderColor: 'white',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                },
                                                '&.Mui-disabled': {
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
            <Box sx={{ display: 'flex', gap: 4, border: `1px solid ${borderColor}`, padding: "10px" }}>
                <Box flex={1}>
                    {currentPersons.length === 0 && <Typography>No matching students.</Typography>}
                    {currentPersons.map((person, index) => (
                        <Paper
                            key={person.person_id}
                            onClick={() => handlePersonClick(person)}
                            elevation={2}
                            sx={{
                                p: 1,
                                mb: 0.5,
                                border: '2px solid #800000',
                                cursor: 'pointer',

                                backgroundColor:
                                    selectedPerson?.person_id === person.person_id
                                        ? '#800000'
                                        : index % 2 === 0
                                            ? '#ffffff'
                                            : 'lightgray',

                                color:
                                    selectedPerson?.person_id === person.person_id
                                        ? 'white'
                                        : '#800000',

                                '&:hover': {
                                    backgroundColor: '#800000',
                                    color: 'white',
                                },
                            }}
                        >
                            <Box sx={{ display: "flex", gap: "10px", px: 2, fontSize: "14px" }}>
                                <span>{startIndex + index + 1}.</span>
                                <span>{person.applicant_number || "N/A"}</span> |
                                <span>{person.first_name} {person.middle_name} {person.last_name}</span> |
                                <span>{person.emailAddress}</span>
                            </Box>
                        </Paper>
                    ))}
                </Box>

                {/* Selected Person + Assignment */}
                <Box flex={1}>
                    <Typography fontSize={16} fontWeight="bold" gutterBottom color="#800000">
                        Selected Person:
                    </Typography>


                    {selectedPerson ? (
                        <Box>
                            <Typography style={{ fontSize: "16px" }}>
                                <strong>Applicant ID:</strong> {selectedPerson.applicant_number || "N/A"} <br />
                                <strong>Name:</strong> {selectedPerson.first_name} {selectedPerson.middle_name} {selectedPerson.last_name}<br />
                                <strong>Birth Of Date:</strong>{" "}
                                {selectedPerson.birthOfDate
                                    ? new Date(selectedPerson.birthOfDate).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })
                                    : "N/A"}
                                <br />
                                <strong>Age:</strong> {selectedPerson.age}<br />
                                <strong>Program Applied:</strong> ({selectedPerson.program_code}){selectedPerson.program_description}{selectedPerson.major}<br />
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

                    {assignedNumber && (
                        <Typography mt={2} color="green">
                            <strong>Assigned Student Number:</strong> {assignedNumber}
                        </Typography>
                    )}

                    {error && (
                        <Typography mt={2} color="error">
                            {error}
                        </Typography>
                    )}
                </Box>
            </Box>

            <TableContainer component={Paper} sx={{ width: '100%' }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: headerColor, color: "white" }}>
                        <TableRow>
                            <TableCell
                                colSpan={10}
                                sx={{
                                    border: `1px solid ${borderColor}`,
                                    py: 0.5,
                                    backgroundColor: headerColor,
                                    color: "white"
                                }}
                            >
                                <Box display="flex" justifyContent="space-between" alignItems="center" >
                                    {/* Left: Applicant List Count */}
                                    <Typography fontSize="14px" fontWeight="bold" color="white">
                                        Total Applicant's: {filteredPersons.length}
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
                                                '&:hover': {
                                                    borderColor: 'white',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                },
                                                '&.Mui-disabled': {
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
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                minWidth: 80,
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                '&:hover': {
                                                    borderColor: 'white',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                },
                                                '&.Mui-disabled': {
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
                                                    fontSize: '12px',
                                                    height: 36,
                                                    color: 'white',
                                                    border: '1px solid white',
                                                    backgroundColor: 'transparent',
                                                    '.MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'white',
                                                    },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'white',
                                                    },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'white',
                                                    },
                                                    '& svg': {
                                                        color: 'white',
                                                    }
                                                }}
                                                MenuProps={{
                                                    PaperProps: {
                                                        sx: {
                                                            maxHeight: 200,
                                                            backgroundColor: '#fff',
                                                        }
                                                    }
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
                                            of {totalPages} page{totalPages > 1 ? 's' : ''}
                                        </Typography>

                                        {/* Next & Last */}
                                        <Button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                minWidth: 80,
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                '&:hover': {
                                                    borderColor: 'white',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                },
                                                '&.Mui-disabled': {
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
                                                '&:hover': {
                                                    borderColor: 'white',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                },
                                                '&.Mui-disabled': {
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
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleSnackClose} severity={snack.severity} sx={{ width: '100%' }}>
                    {snack.message}
                </Alert>
            </Snackbar>

            <Dialog
                open={openModal}
                onClose={(event, reason) => {
                    if (reason === "backdropClick") return;
                    setOpenModal(false);
                }}
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
                            <Typography fontWeight="bold" fontSize={16} color="white" lineHeight={1.2}>
                                Confirm Student Number Assignment
                            </Typography>
                            <Typography fontSize={12} color="rgba(255,255,255,0.8)" lineHeight={1.2}>
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

                <DialogContent>

                    <TextField
                        multiline
                        fullWidth
                        minRows={16}
                        value={buildAcceptanceEmailPreview()}
                        InputProps={{ readOnly: true }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenModal(false)}
                        color="error"
                        variant="outlined"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmAssignNumber}
                        variant="contained"

                    >
                        Confirm Assign & Send Email
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CollegeStudentNumbering;

