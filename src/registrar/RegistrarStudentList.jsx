import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import { SettingsContext } from "../App";
import axios from 'axios';
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
    TableCell,
    TextField,
    MenuItem,
    InputLabel,
    TableBody,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Checkbox,
    Grid,
    Tooltip,
} from '@mui/material';
import API_BASE_URL from "../apiConfig";
import { io } from "socket.io-client";
import { Snackbar, Alert } from '@mui/material';
import { useNavigate, useLocation } from "react-router-dom";
import { FcPrint } from "react-icons/fc";
import EaristLogo from "../assets/EaristLogo.png";
import Unauthorized from "../components/Unauthorized";
import RegistrarEnrollmentTabs from "../components/RegistrarEnrollmentTabs";
import SearchIcon from "@mui/icons-material/Search";
import useRegistrarScopeRevision from "../hooks/useRegistrarScopeRevision";
import {
    getDepartmentIdsFromAdminData,
    isRegistrarCurriculumMatch,
    isRegistrarProgramSelectionLocked,
    isRegistrarStudentScopeMatch,
    restrictDepartmentsToScope,
    restrictToRegistrarCurriculum,
    syncRegistrarScopeFromAdminData,
} from "../utils/registrarCurriculumRestriction";
import { filterSchoolYearsFromActive } from "../utils/schoolYearOptions";

// ✅ FIX: dedupe by program_code + major (NOT curriculum_id).
// Your data can have the SAME program (e.g. "BSCS") stored under multiple
// curriculum_id rows (different curriculum revisions/years). Deduping by
// curriculum_id never collapsed those — that's why "BSCS" showed up twice
// in the Program dropdown. Keying on program_code+major treats those rows
// as the same option while still keeping distinct majors (e.g. BSED-Math
// vs BSED-Filipino) separate even if they happen to share a program_code.
const programKey = (item) =>
    `${String(item.program_code ?? "").trim().toLowerCase()}|${String(item.major ?? "").trim().toLowerCase()}`;

const dedupeCurriculumOptions = (list) => {
    const seen = new Map();
    for (const item of list) {
        const key = programKey(item);
        if (!seen.has(key)) {
            seen.set(key, item);
        }
    }
    return [...seen.values()];
};

const cleanStudentValue = (value) => {
    if (value === null || value === undefined) return "";
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
    ]
        .map(cleanStudentValue)
        .join(" ")
        .toLowerCase();

const getStudentSuggestionValue = (student) =>
    cleanStudentValue(student?.student_number) ||
    formatStudentSuggestionName(student) ||
    cleanStudentValue(student?.emailAddress);

const RegistrarStudentList = () => {
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
    const [subButtonColor, setSubButtonColor] = useState("#ffffff");
    const [stepperColor, setStepperColor] = useState("#000000");
    const [fetchedLogo, setFetchedLogo] = useState(null);
    const [companyName, setCompanyName] = useState("");
    const [shortTerm, setShortTerm] = useState("");
    const [campusAddress, setCampusAddress] = useState("");
    const [branches, setBranches] = useState([]);

    useEffect(() => {
        if (!settings) return;

        if (colors.title) setTitleColor(colors.title);
        if (colors.subtitle) setSubtitleColor(colors.subtitle);
        if (colors.border) setBorderColor(colors.border);
        if (colors.mainButton) setMainButtonColor(colors.mainButton);
        if (colors.subButton) setSubButtonColor(colors.subButton);
        if (colors.stepper) setStepperColor(colors.stepper);

        if (assets.logoUrl) {
            setFetchedLogo(assets.logoUrl);
        } else {
            setFetchedLogo(EaristLogo);
        }

        if (branding.companyName) setCompanyName(branding.companyName);
        if (branding.shortTerm) setShortTerm(branding.shortTerm);
        if (branding.campusAddress) setCampusAddress(branding.campusAddress);

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

    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const queryPersonId = (queryParams.get("person_id") || "").trim();

    const handleRowClick = (person) => {
        if (!person) return;
        sessionStorage.setItem("edit_person_id", person.person_id || "");
        sessionStorage.setItem("edit_student_number", person.student_number || "");
        // Remember which list term this student was selected under so Report of Grades /
        // COR can skip auto-search when it is not the active school year/semester.
        if (selectedSchoolYear) {
            sessionStorage.setItem("edit_list_year_id", String(selectedSchoolYear));
        } else {
            sessionStorage.removeItem("edit_list_year_id");
        }
        if (selectedSchoolSemester) {
            sessionStorage.setItem("edit_list_semester_id", String(selectedSchoolSemester));
        } else {
            sessionStorage.removeItem("edit_list_semester_id");
        }
        if (person.person_id) {
            sessionStorage.setItem("admin_edit_person_id", String(person.person_id));
            sessionStorage.setItem("admin_edit_person_id_source", "registrar_student_list");
            sessionStorage.setItem("admin_edit_person_id_ts", String(Date.now()));
        }
        navigate(
            person.person_id
                ? `/student_registrar_personal_information?person_id=${person.person_id}`
                : `/student_registrar_personal_information?student_number=${person.student_number}`
        );
    };

    const [hasAccess, setHasAccess] = useState(null);
    const [accessLoading, setAccessLoading] = useState(true);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const pageId = 104;

    const [employeeID, setEmployeeID] = useState("");


    useEffect(() => {
        const storedUser = localStorage.getItem("email");
        const storedRole = localStorage.getItem("role");
        const storedID = localStorage.getItem("person_id");
        const storedEmployeeID = localStorage.getItem("employee_id");

        if (storedUser && storedRole && storedID) {
            if (storedRole === "applicant") {
                setUserID(storedID);
            }
            setUserRole(storedRole);
            setEmployeeID(storedEmployeeID);

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
        setAccessLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`);
            setHasAccess(response.data?.page_privilege === 1);
        } catch (err) {
            console.error("Error checking access:", err);
            setHasAccess(false);
            setSnack({ open: true, message: "Failed to check access", severity: "error" });
        } finally {
            setAccessLoading(false);
        }
    };


    const [persons, setPersons] = useState([]);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [assignedNumber, setAssignedNumber] = useState('');
    const [userID, setUserID] = useState("");
    const [user, setUser] = useState("");
    const [userRole, setUserRole] = useState("");
    const [adminData, setAdminData] = useState({ dprtmnt_id: "", dprtmnt_ids: [] });

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

        // Staff: visiting the list clears sticky selection so other tabs do not auto-load.
        // Selection is set only when a row is clicked (handleRowClick).
        if (storedRole !== "applicant") {
            sessionStorage.removeItem("edit_person_id");
            sessionStorage.removeItem("edit_student_number");
            sessionStorage.removeItem("edit_list_year_id");
            sessionStorage.removeItem("edit_list_semester_id");
            sessionStorage.removeItem("admin_edit_person_id");
            sessionStorage.removeItem("admin_edit_person_id_source");
            sessionStorage.removeItem("admin_edit_person_id_ts");
            sessionStorage.removeItem("admin_edit_search_query");
            sessionStorage.removeItem("admin_edit_person_data");
            sessionStorage.removeItem("student_edit_person_id");
            setUserID("");
            return;
        }

        setUserID(loggedInPersonId);
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

    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestionsOpen, setSuggestionsOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });
    const [person, setPerson] = useState({
        campus: "",
        last_name: "",
        first_name: "",
        middle_name: "",
        gender: "",
        birthOfDate: "",
        program: "",
    });

    useEffect(() => {
        if (!settings) return;

        const branchId = person?.campus;
        const matchedBranch = branches.find(
            (branch) => String(branch?.id) === String(branchId)
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
    }, [settings, branches, person?.campus, branding.campusAddress]);

    const [curriculumOptions, setCurriculumOptions] = useState([]);
    const [selectedApplicantStatus, setSelectedApplicantStatus] = useState("");
    const [sortBy, setSortBy] = useState("name");
    const [sortOrder, setSortOrder] = useState("asc");
    const [selectedRegistrarStatus, setSelectedRegistrarStatus] = useState("");
    // ✅ Defaults to "" ("All Departments"). No auto-select-first-department
    // effect below anymore (see removed effect) — matches Applicant List's
    // default-to-all-departments behavior.
    const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
    const [selectedProgramFilter, setSelectedProgramFilter] = useState("");
    const scopeRevision = useRegistrarScopeRevision();
    const isProgramLocked = isRegistrarProgramSelectionLocked();
    const [department, setDepartment] = useState([]);
    const [allCurriculums, setAllCurriculums] = useState([]);
    const [schoolYears, setSchoolYears] = useState([]);
    const [semesters, setSchoolSemester] = useState([]);
    const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
    const [selectedSchoolSemester, setSelectedSchoolSemester] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(100);
    const [activeTermReady, setActiveTermReady] = useState(false);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [serverTotal, setServerTotal] = useState(0);
    const [serverTotalPages, setServerTotalPages] = useState(1);
    const studentsFetchIdRef = useRef(0);
    const studentsAbortRef = useRef(null);

    const MAX_LIMIT = 500; // matches backend's MAX_LIMIT clamp

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery.trim());
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const selectedProgramOption = useMemo(
        () =>
            curriculumOptions.find(
                (opt) => String(opt.curriculum_id) === String(selectedProgramFilter),
            ),
        [curriculumOptions, selectedProgramFilter],
    );

    const buildStudentListParams = ({
        departmentId = selectedDepartmentFilter,
        yearId = selectedSchoolYear,
        semesterId = selectedSchoolSemester,
        page = currentPage,
        limit = itemsPerPage,
        search = debouncedSearchQuery,
        campus = person.campus,
        programOption = selectedProgramOption,
    } = {}) => {
        const params = new URLSearchParams({
            yearId: String(yearId),
            semesterId: String(semesterId),
            page: String(page),
            limit: String(limit),
        });

        if (departmentId) {
            params.set("departmentId", String(departmentId));
        } else {
            const deptIds = department.map((d) => d.dprtmnt_id).filter(Boolean);
            if (deptIds.length) {
                params.set("departmentIds", deptIds.join(","));
            }
        }

        if (search) params.set("search", search);
        if (campus) params.set("campus", String(campus));
        if (programOption?.program_code) {
            params.set("programCode", String(programOption.program_code));
            params.set("major", String(programOption.major || ""));
        }

        return params;
    };

    const fetchStudents = async ({
        departmentId = selectedDepartmentFilter,
        yearId = selectedSchoolYear,
        semesterId = selectedSchoolSemester,
        page = currentPage,
        limit = itemsPerPage,
        search = debouncedSearchQuery,
        campus = person.campus,
        programOption = selectedProgramOption,
    } = {}) => {
        if (!yearId || !semesterId) {
            setPersons([]);
            setServerTotal(0);
            setServerTotalPages(1);
            return;
        }

        const deptIds = departmentId
            ? [departmentId]
            : department.map((d) => d.dprtmnt_id).filter(Boolean);
        if (!deptIds.length) {
            setPersons([]);
            setServerTotal(0);
            setServerTotalPages(1);
            return;
        }

        if (studentsAbortRef.current) {
            studentsAbortRef.current.abort();
        }
        const controller = new AbortController();
        studentsAbortRef.current = controller;
        const fetchId = ++studentsFetchIdRef.current;

        try {
            setStudentsLoading(true);

            const params = buildStudentListParams({
                departmentId,
                yearId,
                semesterId,
                page,
                limit,
                search,
                campus,
                programOption,
            });

            const listRes = await fetch(
                `${API_BASE_URL}/api/list_of_students/details?${params.toString()}`,
                { signal: controller.signal },
            );

            if (!listRes.ok) {
                throw new Error("Failed to fetch student list");
            }

            const payload = await listRes.json();
            const rows = Array.isArray(payload) ? payload : (payload.data || []);

            if (fetchId !== studentsFetchIdRef.current) return;

            // Keep a light client-side scope guard for registrar program locks.
            const scopedRows = rows.filter((student) =>
                isRegistrarStudentScopeMatch(student, allCurriculums),
            );

            setPersons(scopedRows.map((student) => ({ ...student, documents: [] })));
            setServerTotal(Number(payload.total ?? scopedRows.length) || 0);
            setServerTotalPages(
                Math.max(1, Number(payload.totalPages ?? 1) || 1),
            );
        } catch (err) {
            if (err?.name === "AbortError") return;
            console.error("Error fetching students:", err);
            if (fetchId !== studentsFetchIdRef.current) return;
            setPersons([]);
            setServerTotal(0);
            setServerTotalPages(1);
        } finally {
            if (fetchId === studentsFetchIdRef.current) {
                setStudentsLoading(false);
            }
        }
    };

    const fetchAllStudentsForExport = async () => {
        if (!selectedSchoolYear || !selectedSchoolSemester) return [];

        const deptIds = selectedDepartmentFilter
            ? [selectedDepartmentFilter]
            : department.map((d) => d.dprtmnt_id).filter(Boolean);
        if (!deptIds.length) return [];

        let page = 1;
        let allRows = [];
        let totalPages = 1;

        while (page <= totalPages) {
            const params = buildStudentListParams({
                page,
                limit: MAX_LIMIT,
            });
            const listRes = await fetch(
                `${API_BASE_URL}/api/list_of_students/details?${params.toString()}`,
            );
            if (!listRes.ok) throw new Error("Failed to fetch students for export");
            const payload = await listRes.json();
            const rows = Array.isArray(payload) ? payload : (payload.data || []);
            allRows = allRows.concat(
                rows.filter((student) =>
                    isRegistrarStudentScopeMatch(student, allCurriculums),
                ),
            );
            totalPages = Math.max(1, Number(payload.totalPages ?? 1) || 1);
            page += 1;
        }

        return allRows;
    };

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const [yearsRes, activeRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/get_school_year/`),
                    axios.get(`${API_BASE_URL}/api/active_school_year`),
                ]);
                if (cancelled) return;

                const active =
                    Array.isArray(activeRes.data) && activeRes.data.length > 0
                        ? activeRes.data[0]
                        : null;
                setSchoolYears(
                    filterSchoolYearsFromActive(yearsRes.data || [], active),
                );
                if (active) {
                    setSelectedSchoolYear(active.year_id);
                    setSelectedSchoolSemester(active.semester_id);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (!cancelled) setActiveTermReady(true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        axios
            .get(`${API_BASE_URL}/api/get_school_semester/`)
            .then((res) => setSchoolSemester(res.data))
            .catch((err) => console.error(err));
    }, []);

    // Server-paginated fetch: one page at a time (search is debounced).
    useEffect(() => {
        if (!activeTermReady) return;
        if (!department.length) return;

        fetchStudents();

        return () => {
            if (studentsAbortRef.current) {
                studentsAbortRef.current.abort();
            }
        };
    }, [
        activeTermReady,
        department,
        selectedDepartmentFilter,
        selectedSchoolYear,
        selectedSchoolSemester,
        selectedProgramFilter,
        selectedProgramOption,
        debouncedSearchQuery,
        person.campus,
        currentPage,
        itemsPerPage,
        allCurriculums,
    ]);

    const handleSchoolYearChange = (event) => {
        setSelectedSchoolYear(event.target.value);
        setCurrentPage(1);
    };

    const handleSchoolSemesterChange = (event) => {
        setSelectedSchoolSemester(event.target.value);
        setCurrentPage(1);
    };

    const handleOpenPreview = (person) => {
        setSelectedPerson(person);
        setPreviewDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setPreviewDialogOpen(false);
        setViewDialogOpen(false);
        setSelectedPerson(null);
    };

    const normalize = (s) => (s ?? "").toString().trim().toLowerCase();

    // Server already filtered/paginated; keep a light sort for display only.
    const filteredPersons = [...persons].sort((a, b) => {
        let fieldA;
        let fieldB;
        if (sortBy === "name") {
            fieldA = `${a.last_name || ""} ${a.first_name || ""} ${a.middle_name || ""}`.toLowerCase();
            fieldB = `${b.last_name || ""} ${b.first_name || ""} ${b.middle_name || ""}`.toLowerCase();
        } else if (sortBy === "id") {
            fieldA = a.student_number || "";
            fieldB = b.student_number || "";
        } else {
            return 0;
        }
        if (fieldA < fieldB) return sortOrder === "asc" ? -1 : 1;
        if (fieldA > fieldB) return sortOrder === "asc" ? 1 : -1;
        return 0;
    });
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

    const getRemarkText = (en_remarks) => {
        switch (en_remarks) {
            case 0: return "Ongoing";
            case 1: return "Passed";
            case 2: return "Failed";
            case 3: return "Incomplete";
            case 4: return "Dropped";
            default: return "Unknown";
        }
    };

    const totalRecords = serverTotal;
    const totalPages = serverTotalPages;
    const currentPersons = filteredPersons;
    const indexOfFirstItem = (currentPage - 1) * itemsPerPage;

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
        const departmentIds = getDepartmentIdsFromAdminData(adminData);
        if (!departmentIds.length) return;

        const fetchDepartments = async () => {
            try {
                const responses = await Promise.all(
                    departmentIds.map((departmentId) =>
                        axios.get(`${API_BASE_URL}/api/departments/${departmentId}`),
                    ),
                );
                const mergedDepartments = restrictDepartmentsToScope(
                    responses.flatMap((response) => response.data || []),
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
                // ✅ Dedupe by program_code+major (see programKey/
                // dedupeCurriculumOptions above) — fixes duplicate program
                // entries like the two "BSCS" rows in the dropdown, which
                // were actually two different curriculum_id revisions of the
                // same program.
                const restrictedCurriculums = dedupeCurriculumOptions(
                    restrictToRegistrarCurriculum(merged),
                );
                setAllCurriculums(restrictedCurriculums);
            } catch (error) {
                console.error("Error fetching curriculum options:", error);
            }
        };

        fetchCurriculums();
    }, [adminData.dprtmnt_id, adminData.dprtmnt_ids, scopeRevision]);

    useEffect(() => {
        const departmentIds = getDepartmentIdsFromAdminData(adminData);
        if (departmentIds.length) return;

        const fetchDepartments = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/departments`);
                setDepartment(response.data);
            } catch (error) {
                console.error("Error fetching departments:", error);
            }
        };

        fetchDepartments();

        axios.get(`${API_BASE_URL}/api/applied_program`)
            .then(res => {
                // ✅ Same program_code+major dedupe for the fallback
                // ("all programs") path.
                const restrictedCurriculums = dedupeCurriculumOptions(
                    restrictToRegistrarCurriculum(res.data),
                );
                setAllCurriculums(restrictedCurriculums);
            })
            .catch(console.error);
    }, [adminData.dprtmnt_id, adminData.dprtmnt_ids, scopeRevision]);

    // ✅ Removed the old "auto-select first department for everyone" effect.
    // Department now only auto-selects when the registrar's account is
    // scoped/locked to a single department (isDeptLocked below) — since in
    // that case the dropdown is disabled anyway and there's only one valid
    // choice. Everyone else defaults to "" (All Departments).
    const scopedDepartmentIds = getDepartmentIdsFromAdminData(adminData);
    const isDeptLocked = scopedDepartmentIds.length === 1 && department.length === 1;

    useEffect(() => {
        if (!isDeptLocked) return;
        if (selectedDepartmentFilter) return;
        handleDepartmentChange(String(department[0].dprtmnt_id));
    }, [isDeptLocked, department, selectedDepartmentFilter]);

    useEffect(() => {
        if (!selectedDepartmentFilter) {
            setCurriculumOptions(allCurriculums);
            return;
        }

        setCurriculumOptions(
            allCurriculums.filter(
                (opt) => String(opt.dprtmnt_id) === String(selectedDepartmentFilter),
            ),
        );
    }, [selectedDepartmentFilter, allCurriculums]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages || 1);
        }
    }, [serverTotal, totalPages, currentPage]);

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

    useEffect(() => {
        if (!isProgramLocked) return;
        const assignedCurriculum = curriculumOptions.find((prog) =>
            isRegistrarCurriculumMatch(prog.curriculum_id, curriculumOptions)
        );
        if (assignedCurriculum?.curriculum_id) {
            setSelectedProgramFilter(assignedCurriculum.curriculum_id);
        }
    }, [curriculumOptions, isProgramLocked]);

    // ✅ No longer clears persons/resets counts on department change — since
    // all students are already loaded client-side, switching departments
    // just re-filters instantly. Only resets the page number and (unless
    // locked) the program filter.
    const handleDepartmentChange = (selectedDept) => {
        const nextDept = selectedDept === "" || selectedDept == null ? "" : String(selectedDept);
        setSelectedDepartmentFilter(nextDept);
        setCurrentPage(1);
        if (!isProgramLocked) setSelectedProgramFilter("");
    };

    const divToPrintRef = useRef();
    const getPersonKey = (p) => p?.person_id ?? p?.student_number ?? null;



    const handleExportStudentListPdf = async () => {
        const resolvedCampusAddress = campusAddress || "No address set in Settings";
        const logoSrc = fetchedLogo || EaristLogo;
        const name = companyName?.trim() || "";

        const words = name.split(" ");
        const middleIndex = Math.ceil(words.length / 2);
        const firstLine = words.slice(0, middleIndex).join(" ");
        const secondLine = words.slice(middleIndex).join(" ");

        // ✅ Department label (left corner) — selectedDepartmentFilter stores
        // dprtmnt_id, so look up the name from `department`.
        const selectedDepartmentLabel = selectedDepartmentFilter
            ? department.find(
                (d) => String(d.dprtmnt_id) === String(selectedDepartmentFilter),
            )?.dprtmnt_name || "All Departments"
            : "All Departments";

        // ✅ Program label (right corner) — resolves via the dedupe-aware
        // selectedProgramOption so it always shows the right name even
        // though the underlying curriculum_id is just a representative row.
        const selectedProgramLabel = selectedProgramFilter
            ? selectedProgramOption?.program_description || selectedProgramFilter
            : "All Programs";

        let exportRows = [];
        try {
            setStudentsLoading(true);
            exportRows = await fetchAllStudentsForExport();
        } catch (err) {
            console.error("Failed to fetch students for export:", err);
            setSnack({
                open: true,
                message: "Failed to load students for PDF export.",
                severity: "error",
            });
            setStudentsLoading(false);
            return;
        } finally {
            setStudentsLoading(false);
        }

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
        <b style="font-size: 20px; letter-spacing: 1px;">Student List</b>
      </div>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th style="width:5%">#</th>
            <th style="width:15%">Student Number</th>
            <th style="width:25%">Name</th>
            <th style="width:30%">Program</th>
            <th style="width:10%">Year Level</th>
            <th style="width:10%">Birth Date</th>
            <th style="width:5%">Sex</th>
          </tr>
        </thead>
        <tbody>
          ${exportRows
                .map(
                    (p, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${p.student_number ?? "N/A"}</td>
              <td class="student-name">${p.last_name}, ${p.first_name} ${p.middle_name ?? ""} ${p.extension ?? ""}</td>
              <td>(${p.program_code ?? ""}) - ${p.program_description ?? ""}${p.major ? ` - ${p.major}` : ""}</td>
              <td>${p.year_level_description ?? ""}</td>
              <td>${p.birthOfDate ?? ""}</td>
              <td>${p.gender === 0 ? "MALE" : p.gender === 1 ? "FEMALE" : ""}</td>
            </tr>
          `,
                )
                .join("")}
        </tbody>
      </table>
    </div>
  `;

        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/generate-student-list-pdf`,
                { html: innerHtml },
                {
                    responseType: "blob",
                    headers: {
                        "x-employee-id": employeeID,
                        "x-audit-actor-id": employeeID,
                        "x-audit-actor-role": userRole,
                    },
                },
            );

            const blobUrl = window.URL.createObjectURL(
                new Blob([response.data], { type: "application/pdf" }),
            );
            const link = document.createElement("a");
            link.href = blobUrl;
            link.setAttribute(
                "download",
                `Student_List_${new Date().toISOString().slice(0, 10)}.pdf`,
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Failed to generate Student List PDF:", err);
            setSnack({
                open: true,
                message: "Failed to generate Student List PDF.",
                severity: "error",
            });
        }
    };

    if (accessLoading || hasAccess === null) {
        return null;
    }

    if (!hasAccess) {
        return <Unauthorized />;
    }

    // 🔒 Disable right-click
    // document.addEventListener("contextmenu", (e) => e.preventDefault());

    // // 🔒 Block DevTools shortcuts + Ctrl+P silently
    // document.addEventListener("keydown", (e) => {
    //     const isBlockedKey =
    //         e.key === "F12" ||
    //         e.key === "F11" ||
    //         (e.ctrlKey &&
    //             e.shiftKey &&
    //             (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j")) ||
    //         (e.ctrlKey && e.key.toLowerCase() === "u") ||
    //         (e.ctrlKey && e.key.toLowerCase() === "p");

    //     if (isBlockedKey) {
    //         e.preventDefault();
    //         e.stopPropagation();
    //     }
    // });

    const selectedDepartmentFilterValue =
        selectedDepartmentFilter === "" ||
            department.some(
                (dep) => String(dep.dprtmnt_id) === String(selectedDepartmentFilter),
            )
            ? String(selectedDepartmentFilter || "")
            : "";

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
                    STUDENT LIST
                </Typography>

                <Box sx={{ position: "relative", width: 450, maxWidth: "100%" }}>
                    <TextField
                        variant="outlined"
                        placeholder="Search Student Name / Email / Student"
                        size="small"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
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
                            "& .MuiOutlinedInput-root": { borderRadius: "10px" },
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
                                    const studentNumber = cleanStudentValue(
                                        student?.student_number,
                                    );
                                    const name = formatStudentSuggestionName(student);
                                    return (
                                        <Box
                                            key={`${studentNumber || student?.person_id}-${name}`}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setSearchQuery(getStudentSuggestionValue(student));
                                                setCurrentPage(1);
                                                setSuggestionsOpen(false);
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
                                                {studentNumber || "N/A"}
                                            </Typography>
                                            <Typography sx={{ fontSize: 14, color: "#555" }}>
                                                |
                                            </Typography>
                                            <Typography sx={{ fontSize: 14 }} noWrap>
                                                {name ||
                                                    cleanStudentValue(student?.emailAddress) ||
                                                    "Unnamed Student"}
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


            </Box>

            <hr style={{ border: "1px solid #ccc", width: "100%" }} />

            <br />
            <br />

            <RegistrarEnrollmentTabs />

            <br />
            <br />

            <TableContainer component={Paper} sx={{ width: '100%', border: `1px solid ${borderColor}` }}>
                <Table>
                    <TableHead sx={{ backgroundColor: headerColor }}>
                        <TableRow>
                            <TableCell sx={{ color: 'white', textAlign: "Center", height: "60px" }}></TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>

            <TableContainer component={Paper} sx={{ width: '100%', border: `1px solid ${borderColor}`, p: 2 }}>
                <Box display="flex" justifyContent="space-between" flexWrap="wrap" rowGap={2}>
                    {/* Left Side: Campus Dropdown */}
                    <Box display="flex" flexDirection="column" gap={1} sx={{ minWidth: 200 }}>
                        <Typography fontSize={13}>Campus:</Typography>
                        <FormControl size="small" sx={{ width: "200px" }}>
                            <InputLabel id="campus-label">Campus</InputLabel>
                            <Select
                                labelId="campus-label"
                                id="campus-select"
                                name="campus"
                                value={person.campus ?? ""}
                                onChange={(e) => {
                                    setPerson(prev => ({ ...prev, campus: e.target.value }));
                                    setCurrentPage(1);
                                }}
                            >
                                <MenuItem value=""><em>All Campuses</em></MenuItem>
                                {branches.map((branch) => (
                                    <MenuItem key={branch.id} value={branch.id}>
                                        {branch.branch}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Right Side: Print Button */}
                    <Box display="flex" alignItems="flex-end" gap={2}>
                        <button
                            onClick={handleExportStudentListPdf}
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
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#d3d3d3")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f0f0f0")}
                            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
                            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                            type="button"
                        >
                            <FcPrint size={20} />
                            Download Student List
                        </button>
                    </Box>
                </Box>
            </TableContainer>

            {/* Pagination Header */}
            <TableContainer component={Paper} sx={{ width: '100%' }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: '#6D2323', color: "white" }}>
                        <TableRow>
                            <TableCell colSpan={12} sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: headerColor, color: "white" }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography fontSize="14px" fontWeight="bold" color="white">
                                        Total Student's Records: {totalRecords}
                                    </Typography>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} variant="outlined" size="small"
                                            sx={{ minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent", '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }, '&.Mui-disabled': { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 } }}>
                                            First
                                        </Button>
                                        <Button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} variant="outlined" size="small"
                                            sx={{ minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent", '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }, '&.Mui-disabled': { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 } }}>
                                            Prev
                                        </Button>
                                        <FormControl size="small" sx={{ minWidth: 80 }}>
                                            <Select
                                                value={currentPage}
                                                onChange={(e) => setCurrentPage(Number(e.target.value))}
                                                displayEmpty
                                                sx={{ fontSize: '12px', height: 36, color: 'white', border: '1px solid white', backgroundColor: 'transparent', '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' }, '& svg': { color: 'white' } }}
                                                MenuProps={{ PaperProps: { sx: { maxHeight: 200, backgroundColor: '#fff' } } }}
                                            >
                                                {Array.from({ length: totalPages }, (_, i) => (
                                                    <MenuItem key={i + 1} value={i + 1}>Page {i + 1}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <Typography fontSize="11px" color="white">
                                            of {totalPages} page{totalPages > 1 ? 's' : ''}
                                        </Typography>
                                        <Button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} variant="outlined" size="small"
                                            sx={{ minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent", '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }, '&.Mui-disabled': { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 } }}>
                                            Next
                                        </Button>
                                        <Button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} variant="outlined" size="small"
                                            sx={{ minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent", '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }, '&.Mui-disabled': { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 } }}>
                                            Last
                                        </Button>
                                    </Box>
                                </Box>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>

            {/* Filters Panel */}
            <TableContainer component={Paper} sx={{ width: '100%', border: `1px solid ${borderColor}`, p: 2 }}>
                <Box display="flex" justifyContent="space-between" flexWrap="wrap" rowGap={3} columnGap={5}>

                    {/* LEFT: Sort */}
                    <Box display="flex" flexDirection="column" gap={2}>
                        <Box display="flex" alignItems="center" gap={1}>
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

                    {/* MIDDLE: School Year & Semester */}
                    <Box display="flex" flexDirection="column" gap={2}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography fontSize={13} sx={{ minWidth: "100px" }}>School Year:</Typography>
                            <FormControl size="small" sx={{ width: "200px" }}>
                                <InputLabel id="school-year-label">School Years</InputLabel>
                                <Select labelId="school-year-label" label="School Years" value={selectedSchoolYear} onChange={handleSchoolYearChange} displayEmpty>
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
                                <InputLabel>School Semester</InputLabel>
                                <Select label="School Semester" value={selectedSchoolSemester} onChange={handleSchoolSemesterChange} displayEmpty>
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

                    {/* RIGHT: Department & Program */}
                    <Box display="flex" flexDirection="column" gap={2}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography fontSize={13} sx={{ minWidth: "100px" }}>Department:</Typography>
                            <Tooltip
                                title={isDeptLocked ? "Your account is assigned to a single department." : ""}
                                placement="top"
                                disableHoverListener={!isDeptLocked}
                            >
                                <span style={{ display: "inline-block" }}>
                                    <FormControl size="small" sx={{ width: "400px" }} disabled={isDeptLocked}>
                                        <Select
                                            value={selectedDepartmentFilterValue}
                                            onChange={(e) => {
                                                if (isDeptLocked) return;
                                                handleDepartmentChange(e.target.value);
                                            }}
                                            displayEmpty
                                            sx={isDeptLocked ? { backgroundColor: "#f5f5f5", cursor: "not-allowed" } : {}}
                                        >
                                            {/* ✅ Always shows "All Departments" (unless locked to one) — this
                                                is the default value on load now. */}
                                            {!isDeptLocked && (
                                                <MenuItem value="">All Departments</MenuItem>
                                            )}
                                            {department.map((dep) => (
                                                <MenuItem key={dep.dprtmnt_id} value={String(dep.dprtmnt_id)}>
                                                    {dep.dprtmnt_name} ({dep.dprtmnt_code})
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </span>
                            </Tooltip>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography fontSize={13} sx={{ minWidth: "100px" }}>Program:</Typography>
                            <FormControl size="small" sx={{ width: "350px" }}>
                                <Select
                                    value={selectedProgramFilter}
                                    onChange={(e) => {
                                        setSelectedProgramFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    disabled={isProgramLocked}
                                    displayEmpty
                                >
                                    {!isProgramLocked && <MenuItem value="">All Programs</MenuItem>}
                                    {curriculumOptions.map((prog) => (
                                        <MenuItem key={prog.curriculum_id} value={prog.curriculum_id}>
                                            {prog.program_code} - {prog.program_description}
                                            {prog.major ? ` (${prog.major})` : ""}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
                </Box>
            </TableContainer>

            <div ref={divToPrintRef}></div>

            {/* Main Table */}
            <TableContainer component={Paper} sx={{ width: "100%" }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: headerColor }}>
                        <TableRow>
                            <TableCell sx={{ color: "white", textAlign: "center", width: "5%", py: 0.5, fontSize: "12px", border: `1px solid ${borderColor}` }}>#</TableCell>
                            <TableCell sx={{ color: "white", textAlign: "center", width: "15%", py: 0.5, fontSize: "12px", border: `1px solid ${borderColor}` }}>Student Number</TableCell>
                            <TableCell sx={{ color: "white", textAlign: "center", width: "20%", py: 0.5, fontSize: "12px", border: `1px solid ${borderColor}` }}>Name</TableCell>
                            <TableCell sx={{ color: "white", textAlign: "center", width: "30%", py: 0.5, fontSize: "12px", border: `1px solid ${borderColor}` }}>Program</TableCell>
                            <TableCell sx={{ color: "white", textAlign: "center", width: "10%", py: 0.5, fontSize: "12px", border: `1px solid ${borderColor}` }}>Year Level</TableCell>
                            <TableCell sx={{ color: "white", textAlign: "center", width: "10%", py: 0.5, fontSize: "12px", border: `1px solid ${borderColor}` }}>Birth Date</TableCell>
                            <TableCell sx={{ color: "white", textAlign: "center", width: "10%", py: 0.5, fontSize: "12px", border: `1px solid ${borderColor}` }}>Sex</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {currentPersons.map((person, index) => (
                            <TableRow key={`${person.student_number ?? ""}-${person.year_id ?? ""}-${person.semester_id ?? ""}`}>
                                <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                                    {indexOfFirstItem + index + 1}
                                </TableCell>
                                <TableCell
                                    sx={{ textAlign: "center", border: `1px solid ${borderColor}`, color: "blue", cursor: "pointer" }}
                                    onClick={() => handleRowClick(person)}
                                >
                                    {person.student_number ?? "N/A"}
                                </TableCell>
                                <TableCell
                                    sx={{ textAlign: "left", border: `1px solid ${borderColor}`, color: "blue", cursor: "pointer" }}
                                    onClick={() => handleRowClick(person)}
                                >
                                    {`${person.last_name}, ${person.first_name} ${person.middle_name ?? ""} ${person.extension ?? ""}`}
                                </TableCell>
                                <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                                    ({person.program_code}) - {person.program_description}{person.major ? ` - ${person.major}` : ""}
                                </TableCell>
                                <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                                    {person.year_level_description ?? ""}
                                </TableCell>
                                <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                                    {person.birthOfDate}
                                </TableCell>
                                <TableCell sx={{ textAlign: "center", border: `1px solid ${borderColor}` }}>
                                    {person.gender === 0 ? "MALE" : person.gender === 1 ? "FEMALE" : ""}
                                </TableCell>
                            </TableRow>
                        ))}
                        {studentsLoading && (
                            <TableRow>
                                <TableCell colSpan={10} sx={{ textAlign: "center", border: `1px solid ${borderColor}`, color: "#777", py: 3 }}>
                                    Loading students...
                                </TableCell>
                            </TableRow>
                        )}
                        {!studentsLoading && currentPersons.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={10} sx={{ textAlign: "center", border: `1px solid ${borderColor}`, color: "#777", py: 3 }}>
                                    No students found for the selected filters.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <TableContainer component={Paper} sx={{ width: '100%' }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: '#6D2323', color: "white" }}>
                        <TableRow>
                            <TableCell colSpan={12} sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: headerColor, color: "white" }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography fontSize="14px" fontWeight="bold" color="white">
                                        Total Student's Records: {totalRecords}
                                    </Typography>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} variant="outlined" size="small"
                                            sx={{ minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent", '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }, '&.Mui-disabled': { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 } }}>
                                            First
                                        </Button>
                                        <Button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} variant="outlined" size="small"
                                            sx={{ minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent", '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }, '&.Mui-disabled': { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 } }}>
                                            Prev
                                        </Button>
                                        <FormControl size="small" sx={{ minWidth: 80 }}>
                                            <Select
                                                value={currentPage}
                                                onChange={(e) => setCurrentPage(Number(e.target.value))}
                                                displayEmpty
                                                sx={{ fontSize: '12px', height: 36, color: 'white', border: '1px solid white', backgroundColor: 'transparent', '.MuiOutlinedInput-notchedOutline': { borderColor: 'white' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' }, '& svg': { color: 'white' } }}
                                                MenuProps={{ PaperProps: { sx: { maxHeight: 200, backgroundColor: '#fff' } } }}
                                            >
                                                {Array.from({ length: totalPages }, (_, i) => (
                                                    <MenuItem key={i + 1} value={i + 1}>Page {i + 1}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <Typography fontSize="11px" color="white">
                                            of {totalPages} page{totalPages > 1 ? 's' : ''}
                                        </Typography>
                                        <Button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} variant="outlined" size="small"
                                            sx={{ minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent", '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }, '&.Mui-disabled': { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 } }}>
                                            Next
                                        </Button>
                                        <Button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} variant="outlined" size="small"
                                            sx={{ minWidth: 80, color: "white", borderColor: "white", backgroundColor: "transparent", '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }, '&.Mui-disabled': { color: "white", borderColor: "white", backgroundColor: "transparent", opacity: 1 } }}>
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
                autoHideDuration={4000}
                onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert
                    onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
                    severity={snack.severity}
                    sx={{ width: "100%" }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default RegistrarStudentList;
