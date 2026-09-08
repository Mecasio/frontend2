import React, { useEffect, useRef, useState, useContext, useMemo } from 'react';
import { SettingsContext } from "../App";
import axios from 'axios';
import {
    Box,
    Typography,
    Button,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Modal,
    Fade,
    Backdrop,
    LinearProgress,
    Snackbar,
    Alert,
    FormControl,
    Select,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
} from '@mui/material';
import API_BASE_URL from '../apiConfig';
import LoadingOverlay from '../components/LoadingOverlay';
import Unauthorized from '../components/Unauthorized';
import { postAuditEvent, getAuditHeaders } from '../utils/auditEvents';
import useAccountAuditMac from './useAccountAuditMac';

const PROGRESS_STEPS = [
    { key: 'sorting', label: 'Sorting XLSX data' },
    { key: 'processing', label: 'Processing grouped records' },
    { key: 'extracting', label: 'Extracting mapped values' },
    { key: 'saving', label: 'Saving to database' },
];

const FILTER_MENU_PROPS = {
    PaperProps: {
        sx: {
            maxHeight: 250,
            marginTop: "5px"
        },
    },
};

const UploadEnrolledSubject = () => {
    useAccountAuditMac();
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

    const [userID, setUserID] = useState("");
    const [user, setUser] = useState("");
    const [userRole, setUserRole] = useState("");
    const [employeeID, setEmployeeID] = useState("");
    const [hasAccess, setHasAccess] = useState(null);

    const [loading, setLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [campus, setCampus] = useState('1');
    const [studentUploaded, setStudentUploaded] = useState([]);
    const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
    const [selectedProgramFilter, setSelectedProgramFilter] = useState("");
    const [selectedSchoolYearFilter, setSelectedSchoolYearFilter] = useState("");
    const [selectedSemesterFilter, setSelectedSemesterFilter] = useState("");
    const [selectedYearLevelFilter, setSelectedYearLevelFilter] = useState("");
    const [departmentFilters, setDepartmentFilters] = useState([]);
    const [programFilters, setProgramFilters] = useState([]);
    const [schoolYearFilters, setSchoolYearFilters] = useState([]);
    const [semesterFilters, setSemesterFilters] = useState([]);
    const [yearLevelFilters, setYearLevelFilters] = useState([]);
    const [sortOption, setSortOption] = useState("upload_desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [importing, setImporting] = useState(false);

    const [progressOpen, setProgressOpen] = useState(false);
    const [progressValue, setProgressValue] = useState(0);
    const [progressStep, setProgressStep] = useState('sorting');
    const [progressMessage, setProgressMessage] = useState('Preparing import...');

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info',
    });
    const [skippedDialogOpen, setSkippedDialogOpen] = useState(false);
    const [skippedRows, setSkippedRows] = useState([]);

    const progressTimerRef = useRef(null);
    const fileInputRef = useRef(null);
    const pageId = 117;

    const filteredUploadedStudents = useMemo(() => {
        return studentUploaded.filter((row) => {
            const departmentOk =
                !selectedDepartmentFilter || String(row.dprtmnt_id) === String(selectedDepartmentFilter);
            const programOk =
                !selectedProgramFilter || String(row.curriculum_id) === String(selectedProgramFilter);
            const schoolYearOk =
                !selectedSchoolYearFilter || String(row.year_id) === String(selectedSchoolYearFilter);
            const semesterOk =
                !selectedSemesterFilter || String(row.semester_id) === String(selectedSemesterFilter);
            const yearLevelOk =
                !selectedYearLevelFilter ||
                String(row.year_level_id) === String(selectedYearLevelFilter);

            return departmentOk && programOk && schoolYearOk && semesterOk && yearLevelOk;
        });
    }, [
        studentUploaded,
        selectedDepartmentFilter,
        selectedProgramFilter,
        selectedSchoolYearFilter,
        selectedSemesterFilter,
        selectedYearLevelFilter,
    ]);

    const sortedUploadedStudents = useMemo(() => {
        const sorted = [...filteredUploadedStudents];
        if (sortOption === "lname_asc") {
            sorted.sort((a, b) =>
                String(a.last_name || "").localeCompare(String(b.last_name || ""), undefined, {
                    sensitivity: "base",
                }),
            );
        } else if (sortOption === "lname_desc") {
            sorted.sort((a, b) =>
                String(b.last_name || "").localeCompare(String(a.last_name || ""), undefined, {
                    sensitivity: "base",
                }),
            );
        } else {
            sorted.sort(
                (a, b) =>
                    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
            );
        }
        return sorted;
    }, [filteredUploadedStudents, sortOption]);

    const itemsPerPage = 10;
    const totalPages = Math.max(1, Math.ceil(sortedUploadedStudents.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedUploadedStudents = sortedUploadedStudents.slice(
        startIndex,
        startIndex + itemsPerPage,
    );

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
            setFetchedLogo(`${assets.logoUrl}`);
        } else {
            setFetchedLogo(null);
        }

        // 🏷️ School Information
        if (branding.companyName) setCompanyName(branding.companyName);
        if (branding.shortTerm) setShortTerm(branding.shortTerm);
        if (branding.campusAddress) setCampusAddress(branding.campusAddress);
    }, [settings]);

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

    useEffect(() => {
        fetchUploadedStudent();
    }, []);

    useEffect(() => {
        const loadFilters = async () => {
            await fetchDepartments();
            await fetchSchoolYears();
            await fetchSemesters();
            await fetchYearLevels();
            await fetchActiveSchoolYear();
        };

        loadFilters();
    }, []);

    useEffect(() => {
        if (departmentFilters.length > 0 && !selectedDepartmentFilter) {
            const firstDeptId = departmentFilters[0].dprtmnt_id;
            setSelectedDepartmentFilter(firstDeptId);
            fetchPrograms(firstDeptId);
        }
    }, [departmentFilters, selectedDepartmentFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [
        selectedDepartmentFilter,
        selectedProgramFilter,
        selectedSchoolYearFilter,
        selectedSemesterFilter,
        selectedYearLevelFilter,
        sortOption,
        studentUploaded.length,
    ]);

    useEffect(() => {
        setSelectedProgramFilter("");
    }, [selectedDepartmentFilter]);

    useEffect(() => {
        if (!selectedDepartmentFilter) {
            setProgramFilters([]);
            return;
        }
        fetchPrograms(selectedDepartmentFilter);
    }, [selectedDepartmentFilter]);

    useEffect(() => {
        setSelectedSemesterFilter("");
    }, [selectedSchoolYearFilter]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    useEffect(() => {
        return () => {
            if (progressTimerRef.current) {
                clearInterval(progressTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (progressValue < 25) {
            setProgressStep('sorting');
            setProgressMessage('Sorting XLSX data...');
            return;
        }
        if (progressValue < 50) {
            setProgressStep('processing');
            setProgressMessage('Processing grouped student records...');
            return;
        }
        if (progressValue < 75) {
            setProgressStep('extracting');
            setProgressMessage('Extracting mapped fields and IDs...');
            return;
        }
        if (progressValue < 100) {
            setProgressStep('saving');
            setProgressMessage('Saving records to database...');
        }
    }, [progressValue]);

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

    const insertAuditLog = async (eventType, details = {}) => {
        try {
            await postAuditEvent(eventType, details);
        } catch (err) {
            console.error("Error inserting audit log");
        }
    };

    const fetchUploadedStudent = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/get_uploaded_students`);
            setStudentUploaded(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed in fetching uploaded students:', err);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/get_department`);
            setDepartmentFilters(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed in fetching departments:", err);
        }
    };

    const fetchPrograms = async (departmentId) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/applied_program/${departmentId}`);
            setProgramFilters(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed in fetching programs:", err);
            setProgramFilters([]);
        }
    };

    const fetchSchoolYears = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/get_school_year/`);
            setSchoolYearFilters(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed in fetching school years:", err);
        }
    };

    const fetchSemesters = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/get_school_semester/`);
            setSemesterFilters(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed in fetching semesters:", err);
        }
    };

    const fetchYearLevels = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/get_year_level`);
            setYearLevelFilters(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed in fetching year levels:", err);
        }
    };

    const fetchActiveSchoolYear = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/active_school_year`);
            if (Array.isArray(res.data) && res.data.length > 0) {
                const active = res.data[0];
                if (active?.year_id) setSelectedSchoolYearFilter(active.year_id);
                if (active?.semester_id) setSelectedSemesterFilter(active.semester_id);
            }
        } catch (err) {
            console.error("Failed in fetching active school year:", err);
        }
    };

    const startProgressTracking = () => {
        if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
        }

        setProgressOpen(true);
        setProgressValue(8);
        setProgressStep('sorting');
        setProgressMessage('Sorting XLSX data...');

        progressTimerRef.current = setInterval(() => {
            setProgressValue((prev) => {
                const bump = Math.random() * 7 + 2;
                return Math.min(prev + bump, 95);
            });
        }, 450);
    };

    const finishProgressTracking = async (isSuccess) => {
        if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
        }

        setProgressValue(100);
        setProgressMessage(isSuccess ? 'Import completed successfully.' : 'Import failed.');

        await new Promise((resolve) => setTimeout(resolve, 800));
        setProgressOpen(false);
    };

    const getStepState = (stepKey) => {
        const currentIndex = PROGRESS_STEPS.findIndex((step) => step.key === progressStep);
        const targetIndex = PROGRESS_STEPS.findIndex((step) => step.key === stepKey);

        if (targetIndex < currentIndex) return 'done';
        if (targetIndex === currentIndex && progressValue < 100) return 'active';
        if (progressValue === 100) return 'done';
        return 'pending';
    };

    const handleImportXlsx = async () => {
        if (!selectedFile) {
            setSnackbar({
                open: true,
                message: 'Please choose an Excel file first.',
                severity: 'warning',
            });
            return;
        }

        try {
            setImporting(true);
            startProgressTracking();

            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('campus', campus);

            const res = await axios.post(
                `${API_BASE_URL}/api/import-xlsx-into-enrolled-subject`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        ...getAuditHeaders(),
                    },
                },
            );

            if (res.data?.success) {
                await finishProgressTracking(true);
                const skippedCount = Number(res.data?.skippedCount || 0);
                const skippedItems = Array.isArray(res.data?.skippedItems) ? res.data.skippedItems : [];
                const importedCount = Number(res.data?.insertedCount || res.data?.importedCount || 0);

                if (skippedCount > 0) {
                    setSnackbar({
                        open: true,
                        message: `Import finished with ${skippedCount} skipped row(s).`,
                        severity: 'warning',
                    });
                    setSkippedRows(skippedItems);
                    setSkippedDialogOpen(true);
                } else {
                    setSnackbar({
                        open: true,
                        message: res.data.message || 'Excel imported successfully.',
                        severity: 'success',
                    });
                }

                await insertAuditLog("enrolled_subjects_imported", {
                    imported_count: importedCount,
                    skipped_count: skippedCount,
                });

                setSelectedFile(null);
                await fetchUploadedStudent();
            } else {
                await finishProgressTracking(false);
                setSnackbar({
                    open: true,
                    message: res.data?.error || 'Import failed.',
                    severity: 'error',
                });
            }
        } catch (err) {
            console.error('Import failed:', err);
            await finishProgressTracking(false);
            setSnackbar({
                open: true,
                message: err.response?.data?.error || 'Import failed.',
                severity: 'error',
            });
        } finally {
            setImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

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

    return (
        <Box
            sx={{
                height: 'calc(100vh - 150px)',
                overflowY: 'auto',
                paddingRight: 1,
                backgroundColor: 'transparent',
                mt: 1,
                p: 2,
            }}
        >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: titleColor }}>
                    UPLOAD DATA PANEL
                </Typography>
            </Box>

            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <TableContainer
                component={Paper}
                sx={{ width: "100%", border: `1px solid ${borderColor}` }}
            >
                <Table>
                    <TableHead
                        sx={{ backgroundColor: headerColor || "#1976d2" }}
                    >
                        <TableRow>
                            <TableCell sx={{ color: "white", textAlign: "Center" }}>
                                Filter Uploaded Data
                            </TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>

            <Paper sx={{ p: 3, mb: 3, border: `1px solid ${borderColor}` }}>
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                        gap: 2,
                    }}
                >
                    <Box sx={{ gridColumn: { xs: "span 1", sm: "span 2" }, display: "flex", justifyContent: "flex-end" }}>
                        <FormControl size="small" sx={{ maxWidth: "250px" }}>
                            <Select
                                displayEmpty
                                value={selectedYearLevelFilter}
                                onChange={(e) => setSelectedYearLevelFilter(e.target.value)}
                                MenuProps={FILTER_MENU_PROPS}
                            >
                                <MenuItem value="">All Year Levels</MenuItem>
                                {yearLevelFilters.map((yl) => (
                                    <MenuItem key={yl.year_level_id} value={yl.year_level_id}>
                                        {yl.year_level_description}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    <FormControl size="small" sx={{ maxWidth: "400px" }}>
                        <Select
                            displayEmpty
                            value={selectedDepartmentFilter}
                            onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                            MenuProps={FILTER_MENU_PROPS}
                        >
                            <MenuItem value="">All Colleges</MenuItem>
                            {departmentFilters.map((dept) => (
                                <MenuItem key={dept.dprtmnt_id} value={dept.dprtmnt_id}>
                                    {dept.dprtmnt_name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ maxWidth: "400px", width: "100%", justifySelf: "end" }}>
                        <Select
                            displayEmpty
                            value={selectedProgramFilter}
                            onChange={(e) => setSelectedProgramFilter(e.target.value)}
                            MenuProps={FILTER_MENU_PROPS}
                        >
                            <MenuItem value="">All Programs</MenuItem>
                            {programFilters.map((program) => (
                                <MenuItem key={program.curriculum_id} value={program.curriculum_id}>
                                    ({program.program_code}-{program.year_description}){" "}
                                    {program.program_description} {program.program_major}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ maxWidth: "400px" }}>
                        <Select
                            displayEmpty
                            value={selectedSchoolYearFilter}
                            onChange={(e) => setSelectedSchoolYearFilter(e.target.value)}
                            MenuProps={FILTER_MENU_PROPS}
                        >
                            <MenuItem value="">All School Years</MenuItem>
                            {schoolYearFilters.map((yr) => (
                                <MenuItem key={yr.year_id} value={yr.year_id}>
                                    {yr.current_year} - {yr.next_year}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ maxWidth: "400px", justifySelf: "end", width: "100%" }}>
                        <Select
                            displayEmpty
                            value={selectedSemesterFilter}
                            onChange={(e) => setSelectedSemesterFilter(e.target.value)}
                            MenuProps={FILTER_MENU_PROPS}
                        >
                            <MenuItem value="">All Semesters</MenuItem>
                            {semesterFilters.map((sem) => (
                                <MenuItem key={sem.semester_id} value={sem.semester_id}>
                                    {sem.semester_description}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </Paper>


            <TableContainer
                component={Paper}
                sx={{ width: "100%", border: `1px solid ${borderColor}` }}
            >
                <Table>
                    <TableHead
                        sx={{ backgroundColor: headerColor || "#1976d2" }}
                    >
                        <TableRow>
                            <TableCell sx={{ color: "white", textAlign: "Center" }}>
                                Import Student Data
                            </TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>

            <Paper sx={{ p: 3, mb: 3, border: `1px solid ${borderColor}` }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
                    <Box>
                        <TextField
                            select
                            label="Campus"
                            size="small"
                            value={campus}
                            onChange={(e) => setCampus(e.target.value)}
                            SelectProps={{ native: true }}
                            sx={{ width: 160 }}
                        >
                            <option value="1">Manila</option>
                            <option value="2">Cavite</option>
                        </TextField>
                    </Box>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        id="enrolled-subject-import"
                        style={{ display: 'none' }}
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />

                    <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                        {selectedFile && (
                            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                {selectedFile.name}
                            </Typography>
                        )}

                        <Button
                            variant="outlined"
                            onClick={() => {
                                if (fileInputRef.current) {
                                    fileInputRef.current.value = '';
                                    fileInputRef.current.click();
                                }
                            }}
                        >
                            Choose File
                        </Button>

                        <Button
                            variant="contained"
                            onClick={handleImportXlsx}
                            disabled={importing}
                            sx={{ backgroundColor: mainButtonColor, width: "150px" }}
                        >
                            {importing ? 'Importing...' : 'Import File'}
                        </Button>
                    </Box>
                </Box>
            </Paper>

            <TableContainer component={Paper} sx={{ width: "100%", mb: 1 }}>
                <Table size="small">
                    <TableHead
                        sx={{
                            backgroundColor: headerColor || "#1976d2",
                            color: "white",
                        }}
                    >
                        <TableRow>
                            <TableCell
                                colSpan={8}
                                sx={{
                                    border: `1px solid ${borderColor}`,
                                    py: 0.5,
                                    backgroundColor: headerColor || "#1976d2",
                                    color: "white",
                                }}
                            >
                                <Box
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    flexWrap="wrap"
                                    gap={1}
                                >
                                    <Typography fontSize="14px" fontWeight="bold" color="white">
                                        Total Students: {sortedUploadedStudents.length}
                                    </Typography>

                                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                        <FormControl size="small" sx={{ minWidth: 190 }}>
                                            <Select
                                                value={sortOption}
                                                onChange={(e) => setSortOption(e.target.value)}
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
                                                            maxHeight: 250,
                                                            backgroundColor: "#fff",
                                                        },
                                                    },
                                                }}
                                            >
                                                <MenuItem value="upload_desc">Upload Date (Newest)</MenuItem>
                                                <MenuItem value="lname_asc">Last Name (A-Z)</MenuItem>
                                                <MenuItem value="lname_desc">Last Name (Z-A)</MenuItem>
                                            </Select>
                                        </FormControl>

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
                                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
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

                                        <FormControl size="small" sx={{ minWidth: 80 }}>
                                            <Select
                                                value={currentPage}
                                                onChange={(e) => setCurrentPage(Number(e.target.value))}
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
                                                {Array.from({ length: totalPages }, (_, i) => (
                                                    <MenuItem key={i + 1} value={i + 1}>
                                                        Page {i + 1}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>

                                        <Typography fontSize="11px" color="white">
                                            of {totalPages} page{totalPages > 1 ? "s" : ""}
                                        </Typography>

                                        <Button
                                            onClick={() =>
                                                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                                            }
                                            disabled={currentPage === totalPages}
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
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={currentPage === totalPages}
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
                            </TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>

            <TableContainer component={Paper} sx={{ border: `1px solid ${borderColor}` }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1, textAlign: "center" }}>No.</TableCell>
                            <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>Student Number</TableCell>
                            <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>Last Name</TableCell>
                            <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>First Name</TableCell>
                            <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>Middle Name</TableCell>
                            <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>Program</TableCell>
                            <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>Program Code</TableCell>
                            <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>Semester</TableCell>
                            <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>Course Code</TableCell>
                            <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1, textAlign: "center" }}>Year Level</TableCell>
                            <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>Uploaded At</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedUploadedStudents.map((row, index) => (
                            <TableRow key={`${row.student_number}-${index}`}>
                                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1, textAlign: "center" }}>
                                    {startIndex + index + 1}
                                </TableCell>
                                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>{row.student_number}</TableCell>
                                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>{row.last_name}</TableCell>
                                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>{row.first_name}</TableCell>
                                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>{row.middle_name}</TableCell>
                                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>{row.program_description}</TableCell>
                                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>{row.program_code}</TableCell>
                                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>{row.semester_description || "-"}</TableCell>
                                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>{row.course_code || "-"}</TableCell>
                                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1, textAlign: "center" }}>{row.year_level_description}</TableCell>
                                <TableCell sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1 }}>
                                    {row.created_at ? new Date(row.created_at).toLocaleString() : "-"}
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredUploadedStudents.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={11}
                                    align="center"
                                    sx={{ borderColor: borderColor, borderStyle: "solid", borderWidth: 1, height: "120px" }}
                                >
                                    No uploaded data yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Modal
                open={progressOpen}
                closeAfterTransition
                slots={{ backdrop: Backdrop }}
                slotProps={{ backdrop: { timeout: 200 } }}
            >
                <Fade in={progressOpen}>
                    <Box
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: { xs: '90%', sm: 520 },
                            bgcolor: 'background.paper',
                            border: '1px solid #d0d0d0',
                            boxShadow: 24,
                            borderRadius: 2,
                            p: 3,
                        }}
                    >
                        <Typography variant="h6" fontWeight="bold" mb={1}>
                            Import Progress
                        </Typography>
                        <Typography variant="body2" mb={2}>
                            {progressMessage}
                        </Typography>

                        <LinearProgress variant="determinate" value={progressValue} sx={{ height: 10, borderRadius: 2 }} />
                        <Typography variant="caption" display="block" mt={1.5} mb={2}>
                            {Math.round(progressValue)}%
                        </Typography>

                        {PROGRESS_STEPS.map((step) => {
                            const state = getStepState(step.key);
                            return (
                                <Typography
                                    key={step.key}
                                    variant="body2"
                                    sx={{
                                        mb: 0.75,
                                        fontWeight: state === 'active' ? 700 : 400,
                                        color: state === 'pending' ? 'text.secondary' : 'text.primary',
                                    }}
                                >
                                    [{state === 'done' ? 'DONE' : state === 'active' ? 'WORKING' : 'PENDING'}] {step.label}
                                </Typography>
                            );
                        })}
                    </Box>
                </Fade>
            </Modal>

            <Dialog
                open={skippedDialogOpen}
                onClose={() => setSkippedDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Skipped Student Data</DialogTitle>
                <DialogContent dividers>
                    {skippedRows.length === 0 ? (
                        <Typography variant="body2">No skipped rows details provided.</Typography>
                    ) : (
                        <List dense>
                            {skippedRows.map((item, index) => (
                                <ListItem key={`${item.studentNumber || "NA"}-${index}`} sx={{ px: 0 }}>
                                    <ListItemText
                                        primary={`${index + 1}. ${item.studentNumber || "Unknown Student"}`}
                                        secondary={item.reason || "No reason provided"}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSkippedDialogOpen(false)} variant="contained">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3500}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            >
                <Alert
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default UploadEnrolledSubject;
