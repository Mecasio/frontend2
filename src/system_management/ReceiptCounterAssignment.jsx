import React, { useContext, useEffect, useMemo, useState } from 'react';
import { SettingsContext } from "../App";
import {
    Box,
    Typography,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Paper,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Snackbar,
    Alert
} from '@mui/material';
import axios from 'axios';
import API_BASE_URL from '../apiConfig';
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";

const capitalize = (word) => {
    if (!word) return "";
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};
const toDigitsOnly = (value) => String(value ?? "").replace(/\D/g, "");
const getFirstFour = (value) => String(value ?? "").slice(0, 4);

const ReceiptCounterAssignment = () => {
    const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};

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
            setFetchedLogo(assets.logoUrl);
        } else {
            setFetchedLogo(NPCLogo);
        }

        // 🏷️ School Info
        if (branding.companyName) setCompanyName(branding.companyName);
        if (branding.shortTerm) setShortTerm(branding.shortTerm);
        if (branding.campusAddress) setCampusAddress(branding.campusAddress);

        // ✅ Branches (JSON stored in DB)
        setBranches(settings?.branches || []);


    }, [settings]);

    const [loading, setLoading] = useState(false);
    const [hasAccess, setHasAccess] = useState(null);
    const [canCreate, setCanCreate] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [canDelete, setCanDelete] = useState(false);
    const pageId = 122;

    const [employeesData, setEmployeesData] = useState([]);
    const [department, setDepartment] = useState([]);
    const [schoolYears, setSchoolYears] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [activeSchoolYear, setActiveSchoolYear] = useState(null);
    const [assignmentMap, setAssignmentMap] = useState({});

    const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
    const [sortOrder, setSortOrder] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [openAssignModal, setOpenAssignModal] = useState(false);
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [modalMode, setModalMode] = useState("assign");
    const [confirmAction, setConfirmAction] = useState("assign");

    const [assignForm, setAssignForm] = useState({
        counter: "",
        employee_id: "",
        school_year_id: "",
        semester_id: "",
        account_type_id: ""
    });

    const [accountTypes, setAccountTypes] = useState([]);

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success"
    });
    const auditConfig = {
        headers: {
            "x-audit-actor-id":
                localStorage.getItem("employee_id") ||
                localStorage.getItem("email") ||
                "unknown",
            "x-audit-actor-role": localStorage.getItem("role") || "registrar",
        },
    };

    useEffect(() => {
        if (!settings) return;
        if (colors.title) setTitleColor(colors.title);
    }, [settings]);

    useEffect(() => {
        const storedUser = localStorage.getItem("email");
        const storedRole = localStorage.getItem("role");
        const storedID = localStorage.getItem("person_id");
        const storedEmployeeID = localStorage.getItem("employee_id");

        if (storedUser && storedRole && storedID) {
            if (storedRole === "registrar") {
                checkAccess(storedEmployeeID);
            } else {
                window.location.href = "/login";
            }
        } else {
            window.location.href = "/login";
        }
    }, []);

    const checkAccess = async (employeeIDValue) => {
        setLoading(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/page_access/${employeeIDValue}/${pageId}`,
            );
            if (response.data && response.data.page_privilege === 1) {
                setHasAccess(true);
                setCanCreate(Number(response.data?.can_create) === 1);
                setCanEdit(Number(response.data?.can_edit) === 1);
                setCanDelete(Number(response.data?.can_delete) === 1);
            } else {
                setHasAccess(false);
                setCanCreate(false);
                setCanEdit(false);
                setCanDelete(false);
            }
        } catch (error) {
            console.error("Error checking access:", error);
            setHasAccess(false);
            setCanCreate(false);
            setCanEdit(false);
            setCanDelete(false);
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignments = async (activeSchoolYearId) => {
        if (!activeSchoolYearId) return;

        try {
            const res = await axios.get(`${API_BASE_URL}/api/receipt-counter/active/${activeSchoolYearId}`);
            const map = {};
            (res.data || []).forEach((row) => {
                map[row.employee_id] = row;
            });
            setAssignmentMap(map);
        } catch (error) {
            console.error("Error fetching active receipt counter assignments:", error);
            setAssignmentMap({});
        }
    };

    useEffect(() => {
        if (!hasAccess) return;
        const fetchInitialData = async () => {
            try {
                const [employeeRes, departmentRes, schoolYearRes, semesterRes, activeSchoolYearRes, accountTypeRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/get_employee`),
                    axios.get(`${API_BASE_URL}/api/get_department`),
                    axios.get(`${API_BASE_URL}/api/get_school_year`),
                    axios.get(`${API_BASE_URL}/api/get_school_semester`),
                    axios.get(`${API_BASE_URL}/api/active_school_year`),
                    axios.get(`${API_BASE_URL}/api/tosf/account-types`)
                ]);     

                setEmployeesData(employeeRes.data || []);
                setDepartment(departmentRes.data || []);
                setSchoolYears(schoolYearRes.data || []);
                setSemesters(semesterRes.data || []);
                setAccountTypes(accountTypeRes.data || []);

                if (activeSchoolYearRes.data?.length > 0) {
                    const active = activeSchoolYearRes.data[0];
                    setActiveSchoolYear(active);
                    setAssignForm((prev) => ({
                        ...prev,
                        school_year_id: active.year_id || "",
                        semester_id: active.semester_id || ""
                    }));

                    await fetchAssignments(active.school_year_id);
                }
            } catch (error) {
                console.error("Error fetching initial data:", error);
    }
        };

        fetchInitialData();
    }, [hasAccess]);

    const filteredEmployees = useMemo(() => {
        return [...employeesData]
            .filter((employee) =>
                selectedDepartmentFilter
                    ? String(employee.dprtmnt_id) === String(selectedDepartmentFilter)
                    : true
            )
            .sort((a, b) => {
                const nameA = `${a.last_name || ""}, ${a.first_name || ""}`.toLowerCase();
                const nameB = `${b.last_name || ""}, ${b.first_name || ""}`.toLowerCase();

                if (sortOrder === "asc") return nameA.localeCompare(nameB);
                if (sortOrder === "desc") return nameB.localeCompare(nameA);
                return 0;
            });
    }, [employeesData, selectedDepartmentFilter, sortOrder]);

    const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage));
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentEmployees = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedDepartmentFilter, sortOrder]);

    const openAssignDialog = (employee) => {
        if (!canCreate) {
            setSnackbar({
                open: true,
                message: "You do not have permission to assign receipt counters.",
                severity: "error"
            });
            return;
        }

        setModalMode("assign");
        setSelectedEmployee(employee);
        setSelectedAssignment(null);
        setAssignForm({
            counter: "",
            employee_id: employee.employee_id || "",
            school_year_id: activeSchoolYear?.year_id || "",
            semester_id: activeSchoolYear?.semester_id || "",
            account_type_id: ""
        });
        setOpenAssignModal(true);
    };

    const openEditDialog = (employee, assignment) => {
        if (!canEdit) {
            setSnackbar({
                open: true,
                message: "You do not have permission to edit receipt counter assignments.",
                severity: "error"
            });
            return;
        }

        setModalMode("edit");
        setSelectedEmployee(employee);
        setSelectedAssignment(assignment);
        setAssignForm({
            counter: assignment?.counter || "",
            employee_id: employee.employee_id || "",
            school_year_id: activeSchoolYear?.year_id || "",
            semester_id: activeSchoolYear?.semester_id || "",
            account_type_id: assignment?.account_type_id ?? ""
        });
        setOpenAssignModal(true);
    };

    const handleOpenConfirm = (action) => {
        if (action === "assign" && !canCreate) {
            setSnackbar({
                open: true,
                message: "You do not have permission to assign receipt counters.",
                severity: "error"
            });
            return;
        }

        if (action === "edit" && !canEdit) {
            setSnackbar({
                open: true,
                message: "You do not have permission to edit receipt counter assignments.",
                severity: "error"
            });
            return;
        }

        if (action === "deassign" && !canDelete) {
            setSnackbar({
                open: true,
                message: "You do not have permission to deassign receipt counters.",
                severity: "error"
            });
            return;
        }

        if (action === "deassign") {
            setConfirmAction("deassign");
            setOpenConfirmDialog(true);
            return;
        }

        if (!assignForm.counter || !assignForm.employee_id || !assignForm.school_year_id || !assignForm.semester_id || !assignForm.account_type_id) {
            setSnackbar({
                open: true,
                message: "Please complete all required fields including fund number.",
                severity: "error"
            });
            return;
        }

        const normalizedCounter = toDigitsOnly(assignForm.counter);
        if (!normalizedCounter) {
            setSnackbar({
                open: true,
                message: "Receipt counter must contain digits only.",
                severity: "error"
            });
            return;
        }
        if (normalizedCounter.length < 4) {
            setSnackbar({
                open: true,
                message: "Receipt counter must be at least 4 digits.",
                severity: "error"
            });
            return;
        }

        const firstFour = getFirstFour(normalizedCounter);
        const hasSamePrefix = Object.values(assignmentMap).some((assignment) => {
            if (!assignment?.counter) return false;
            if (action === "edit" && selectedAssignment?.id && assignment.id === selectedAssignment.id) {
                return false;
            }
            return getFirstFour(assignment.counter) === firstFour;
        });

        if (hasSamePrefix) {
            setSnackbar({
                open: true,
                message: "The first 4 digits are already assigned to another employee for this active school year.",
                severity: "error"
            });
            return;
        }

        setConfirmAction(action);
        setOpenConfirmDialog(true);
    };

    const resetModalState = () => {
        setOpenAssignModal(false);
        setOpenConfirmDialog(false);
        setSelectedEmployee(null);
        setSelectedAssignment(null);
        setModalMode("assign");
        setConfirmAction("assign");
        setAssignForm((prev) => ({
            ...prev,
            counter: "",
            employee_id: "",
            school_year_id: activeSchoolYear?.year_id || "",
            semester_id: activeSchoolYear?.semester_id || "",
            account_type_id: ""
        }));
    };

    const handleConfirmSubmit = async () => {
        try {
            const normalizedCounter = toDigitsOnly(assignForm.counter);
            if (confirmAction === "assign") {
                await axios.post(`${API_BASE_URL}/api/receipt-counter/assign`, {
                    counter: normalizedCounter,
                    employee_id: assignForm.employee_id,
                    year_id: assignForm.school_year_id,
                    semester_id: assignForm.semester_id,
                    account_type_id: assignForm.account_type_id
                }, auditConfig);
            } else if (confirmAction === "edit") {
                if (!selectedAssignment?.id) {
                    throw new Error("No assignment selected for editing.");
                }

                await axios.put(`${API_BASE_URL}/api/receipt-counter/${selectedAssignment.id}`, {
                    counter: normalizedCounter,
                    account_type_id: assignForm.account_type_id
                }, auditConfig);
            } else if (confirmAction === "deassign") {
                if (!selectedAssignment?.id) {
                    throw new Error("No assignment selected for deassign.");
                }

                await axios.delete(`${API_BASE_URL}/api/receipt-counter/${selectedAssignment.id}`, auditConfig);
            }

            await fetchAssignments(activeSchoolYear?.school_year_id);
            resetModalState();
            setSnackbar({
                open: true,
                message:
                    confirmAction === "assign"
                        ? "Receipt counter assigned successfully."
                        : confirmAction === "edit"
                            ? "Receipt counter updated successfully."
                            : "Receipt counter deassigned successfully.",
                severity: "success"
            });
        } catch (error) {
            console.error("Receipt counter action error:", error);
            setOpenConfirmDialog(false);
            setSnackbar({
                open: true,
                message: error.response?.data?.message || "Failed to process receipt counter action.",
                severity: "error"
            });
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
        <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-start",
                    alignItems: "center",
                    flexWrap: "wrap",
                    mb: 2
                }}
            >
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: "bold",
                        color: titleColor,
                        fontSize: "36px"
                    }}
                >
                    RECEIPT COUNTER ASSIGNMENT
                </Typography>
            </Box>

            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />
              <br />

            <TableContainer component={Paper} sx={{ width: '100%', mt: 1, border: `1px solid ${borderColor}` }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: colors.header || '#6D2323', color: "white" }}>
                        <TableRow>
                            <TableCell colSpan={10} sx={{ py: 0.5, backgroundColor: colors.header || "maroon", color: "white", height: "1.5cm", textAlign: 'center' }}>
                                Assign Receipt Counter to Employee
                            </TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>

            <Paper sx={{ p: 2, border: `1px solid ${borderColor}` }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-end" flexWrap="wrap" gap={2}>
                    <Box sx={{ minWidth: 220 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel id="name-sort-label">Sort by Name</InputLabel>
                            <Select
                                labelId="name-sort-label"
                                value={sortOrder}
                                label="Sort by Name"
                                onChange={(e) => setSortOrder(e.target.value)}
                            >
                                <MenuItem value="">Default</MenuItem>
                                <MenuItem value="asc">A-Z</MenuItem>
                                <MenuItem value="desc">Z-A</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <Box sx={{ minWidth: 320 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel id="filter-department-label">Filter by Department</InputLabel>
                            <Select
                                labelId="filter-department-label"
                                value={selectedDepartmentFilter}
                                label="Filter by Department"
                                onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                            >
                                <MenuItem value="">All Departments</MenuItem>
                                {department.map((dep) => (
                                    <MenuItem key={dep.dprtmnt_id} value={dep.dprtmnt_id}>
                                        {dep.dprtmnt_name} ({dep.dprtmnt_code})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </Box>
            </Paper>

            <br />
            <br />

            <TableContainer component={Paper} sx={{ width: '100%', border: `1px solid ${borderColor}` }}>
                <Table size="small">
                    <TableHead sx={{ backgroundColor: colors.header || '#6D2323', color: "white" }}>
                        <TableRow>
                            <TableCell colSpan={10} sx={{ py: 0.5, backgroundColor: colors.header || "maroon", color: "white" }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography fontSize="14px" fontWeight="bold" color="white">
                                        Total Employees: {filteredEmployees.length}
                                    </Typography>

                                    <Box display="flex" alignItems="center" gap={1}>
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
                                                    backgroundColor: 'rgba(255,255,255,0.1)'
                                                },
                                                '&.Mui-disabled': {
                                                    color: "white",
                                                    borderColor: "white",
                                                    backgroundColor: "transparent",
                                                    opacity: 1
                                                }
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
                                                    backgroundColor: 'rgba(255,255,255,0.1)'
                                                },
                                                '&.Mui-disabled': {
                                                    color: "white",
                                                    borderColor: "white",
                                                    backgroundColor: "transparent",
                                                    opacity: 1
                                                }
                                            }}
                                        >
                                            Prev
                                        </Button>

                                        <FormControl size="small" sx={{ minWidth: 90 }}>
                                            <Select
                                                value={currentPage}
                                                onChange={(e) => setCurrentPage(Number(e.target.value))}
                                                sx={{
                                                    fontSize: '12px',
                                                    height: 36,
                                                    color: 'white',
                                                    border: '1px solid white',
                                                    backgroundColor: 'transparent',
                                                    '.MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'white'
                                                    },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'white'
                                                    },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'white'
                                                    },
                                                    '& svg': {
                                                        color: 'white'
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
                                                    backgroundColor: 'rgba(255,255,255,0.1)'
                                                },
                                                '&.Mui-disabled': {
                                                    color: "white",
                                                    borderColor: "white",
                                                    backgroundColor: "transparent",
                                                    opacity: 1
                                                }
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
                                                    backgroundColor: 'rgba(255,255,255,0.1)'
                                                },
                                                '&.Mui-disabled': {
                                                    color: "white",
                                                    borderColor: "white",
                                                    backgroundColor: "transparent",
                                                    opacity: 1
                                                }
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

            <TableContainer component={Paper}>
                <Table>
                    <TableHead sx={{ background: 'maroon' }}>
                        <TableRow>
                            <TableCell sx={{ color: 'black', border: `1px solid ${borderColor}`, backgroundColor: "#f5f5f5" }}><strong>Employee ID</strong></TableCell>
                            <TableCell sx={{ color: 'black', border: `1px solid ${borderColor}`, textAlign: 'center', backgroundColor: "#f5f5f5" }}><strong>Name</strong></TableCell>
                            <TableCell sx={{ color: 'black', border: `1px solid ${borderColor}`, textAlign: 'center', backgroundColor: "#f5f5f5" }}><strong>Email Address</strong></TableCell>
                            <TableCell sx={{ color: 'black', border: `1px solid ${borderColor}`, textAlign: 'center', backgroundColor: "#f5f5f5" }}><strong>Fund Number</strong></TableCell>
                            <TableCell sx={{ color: 'black', border: `1px solid ${borderColor}`, backgroundColor: "#f5f5f5" }}><strong>Position</strong></TableCell>
                            <TableCell sx={{ color: 'black', border: `1px solid ${borderColor}`, textAlign: 'center', backgroundColor: "#f5f5f5" }}><strong>Action</strong></TableCell>
                        </TableRow>
                    </TableHead>

                   
                              <TableBody
                                        sx={{
                                          border: `1px solid ${borderColor}`,
                                          "& .MuiTableRow-root:nth-of-type(odd)": {
                                            backgroundColor: "#ffffff",
                                          },
                                          "& .MuiTableRow-root:nth-of-type(even)": {
                                            backgroundColor: "lightgray",
                                          },
                                        }}
                                      >
                        {currentEmployees.map((employee) => {
                            const assignment = assignmentMap[employee.employee_id];
                            const isAssigned = Boolean(assignment);
                            const accountTypeLabel =
                                assignment?.account_type_description ||
                                accountTypes.find(
                                    (accountType) =>
                                        String(accountType.id) === String(assignment?.account_type_id)
                                )?.description ||
                                "N/A";

                            return (
                                <TableRow key={employee.id}>
                                    <TableCell sx={{ border: `1px solid ${borderColor}` }}>{employee.employee_id}</TableCell>
                                    <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                                        {`${capitalize(employee.first_name)}
                                        ${employee.middle_name ? `${employee.middle_name.charAt(0).toUpperCase()}.` : ""}
                                        ${capitalize(employee.last_name)}`}
                                    </TableCell>
                                    <TableCell sx={{ border: `1px solid ${borderColor}` }}>{employee.email}</TableCell>
                                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{accountTypeLabel}</TableCell>
                                    <TableCell sx={{ border: `1px solid ${borderColor}` }}>{employee.position}</TableCell>
                                    <TableCell sx={{ display: 'flex', borderRight: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}`, alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                        <Button
                                            variant='contained'
                                            onClick={() => isAssigned ? openEditDialog(employee, assignment) : openAssignDialog(employee)}
                                            sx={{ width: '150px' }}
                                        >
                                            {isAssigned ? "EDIT COUNTER" : "ASSIGN"}
                                        </Button>
                                        <Button
                                            variant='contained'
                                            color="error"
                                            sx={{ width: '150px' }}
                                            disabled={!isAssigned}
                                            onClick={() => {
                                                setSelectedEmployee(employee);
                                                setSelectedAssignment(assignment || null);
                                                handleOpenConfirm("deassign");
                                            }}
                                        >
                                            DEASSIGN
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openAssignModal} onClose={resetModalState} fullWidth maxWidth="sm">
                <DialogTitle sx={{ color: "maroon", fontWeight: "bold" }}>
                    {modalMode === "edit" ? "Edit Receipt Counter" : "Assign Receipt Counter"}
                </DialogTitle>
                <DialogContent sx={{ mt: 1 }}>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
                        <TextField
                            label="Receipt Counter"
                            value={assignForm.counter}
                            onChange={(e) => {
                                const digitsOnly = toDigitsOnly(e.target.value);
                                setAssignForm((prev) => ({ ...prev, counter: digitsOnly }));
                            }}
                            inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                            fullWidth
                        />
                        <TextField
                            label="Employee ID"
                            value={assignForm.employee_id}
                            disabled
                            onChange={(e) => setAssignForm((prev) => ({ ...prev, employee_id: e.target.value }))}
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel id="school-year-select-label">School Year</InputLabel>
                            <Select
                                labelId="school-year-select-label"
                                label="School Year"
                                value={assignForm.school_year_id}
                                disabled
                            >
                                {schoolYears.map((schoolYear) => (
                                    <MenuItem key={schoolYear.year_id} value={schoolYear.year_id}>
                                        {schoolYear.current_year} - {schoolYear.next_year}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel id="semester-select-label">Semester</InputLabel>
                            <Select
                                labelId="semester-select-label"
                                label="Semester"
                                value={assignForm.semester_id}
                                disabled
                            >
                                {semesters.map((semester) => (
                                    <MenuItem key={semester.semester_id} value={semester.semester_id}>
                                        {semester.semester_description}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth required>
                            <InputLabel id="account-type-select-label">Fund Number</InputLabel>
                            <Select
                                labelId="account-type-select-label"
                                label="Fund Number"
                                value={assignForm.account_type_id}
                                onChange={(e) =>
                                    setAssignForm((prev) => ({
                                        ...prev,
                                        account_type_id: e.target.value,
                                    }))
                                }
                            >
                                {accountTypes.map((accountType) => (
                                    <MenuItem key={accountType.id} value={accountType.id}>
                                        {accountType.description}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
             color="error"
            variant="outlined"
                        onClick={resetModalState}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => handleOpenConfirm(modalMode === "edit" ? "edit" : "assign")}
                    >
                        {modalMode === "edit" ? "Save Counter" : "Assign Counter"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openConfirmDialog} onClose={() => setOpenConfirmDialog(false)}>
                <DialogTitle>
                    {confirmAction === "deassign"
                        ? "Confirm Deassign"
                        : confirmAction === "edit"
                            ? "Confirm Counter Update"
                            : "Confirm Assignment"}
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        {confirmAction === "deassign"
                            ? `Are you sure you want to deassign the counter of employee ID ${selectedEmployee?.employee_id || ""}?`
                            : confirmAction === "edit"
                                ? `Are you sure you want to update the counter of employee ID ${selectedEmployee?.employee_id || assignForm.employee_id}?`
                                : `Are you sure you want to assign this receipt counter to employee ID ${selectedEmployee?.employee_id || assignForm.employee_id}?`}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button
                    color="error"
            variant="outlined"

                        onClick={() => setOpenConfirmDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleConfirmSubmit}>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ReceiptCounterAssignment;
