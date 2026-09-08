import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import {
    Box,
    Paper,
    Typography,
    FormControl,
    Select,
    MenuItem,
    TextField,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    Grid, Card, CardContent, Chip, LinearProgress,
} from "@mui/material";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import LoadingOverlay from "../components/LoadingOverlay";
import * as XLSX from "xlsx";
import ApplicantTable from "../components/ApplicantTable";
import StudentTable from "../components/StudentTable";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const PaymentExportingModule = () => {
    useAuditMac();
    const [yearId, setYearId] = useState("");
    const [semesterId, setSemesterId] = useState("");
    const [programs, setPrograms] = useState([]);
    const [selectedProgram, setSelectedProgram] = useState("");
    const [department, setDepartment] = useState([]);
    const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
    const [schoolYears, setSchoolYears] = useState([]);
    const [semesters, setSchoolSemester] = useState([]);
    const [rawData, setRawData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [visibleData, setVisibleData] = useState([]);
    const [exportOpen, setExportOpen] = useState(false);
    const [exportTotal, setExportTotal] = useState(0);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportConfirmOpen, setExportConfirmOpen] = useState(false);

    const [campusFilter, setCampusFilter] = useState("");
    const [personTypeFilter, setPersonTypeFilter] = useState(1);
    const [paymentType, setPaymentType] = useState(0);

    const [dataFetched, setDataFetched] = useState(false);
    const [viewClicked, setViewClicked] = useState(false);
    const [studentSearch, setStudentSearch] = useState("");

  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";

    const [titleColor, setTitleColor] = useState("#000000");
    const [borderColor, setBorderColor] = useState("#000000");
    const [mainButtonColor, setMainButtonColor] = useState("#1976d2");

    const [branches, setBranches] = useState([]);

    // 🔹 Authentication and access states
    const [userRole, setUserRole] = useState("");
    const [employeeID, setEmployeeID] = useState("");
    const [hasAccess, setHasAccess] = useState(null);

    const [loading, setLoading] = useState(false);

    const pageId = 116;

    const getAuditHeaders = () => ({
        headers: {
            ...getFlatAuditHeaders(),
            "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
            "x-page-id": pageId,
            "x-audit-actor-id": employeeID || localStorage.getItem("employee_id") || "",
            "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
        },
    });

    useEffect(() => {
        if (!settings) return;

        // 🎨 Colors
        if (colors.title) setTitleColor(colors.title);
        if (colors.border) setBorderColor(colors.border);
        if (colors.mainButton) setMainButtonColor(colors.mainButton);

        const safeBranches = settings?.branches || [];
        setBranches(safeBranches);
        setCampusFilter((currentBranch) => {
            if (!currentBranch) return "";
            const branchExists = safeBranches.some(
                (branch) => String(branch.id) === String(currentBranch)
            );
            return branchExists ? currentBranch : "";
        });

    }, [settings]);

    useEffect(() => {

        const storedUser = localStorage.getItem("email");
        const storedRole = localStorage.getItem("role");
        const storedID = localStorage.getItem("person_id");
        const storedEmployeeID = localStorage.getItem("employee_id");

        if (storedUser && storedRole && storedID) {
            setUserRole(storedRole);
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

    useEffect(() => {
        fetchDepartments();
    }, [])

    useEffect(() => {
        if (department.length > 0 && !selectedDepartmentFilter) {
            const firstDeptId = department[0].dprtmnt_id;
            setSelectedDepartmentFilter(firstDeptId);
            fetchPrograms(firstDeptId);
        }
    }, [department, selectedDepartmentFilter]);

    useEffect(() => {
        if (programs.length > 0 && !selectedProgram) {
            setSelectedProgram(programs[0].curriculum_id);
        }
    }, [programs, selectedProgram]);

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
        fetchActiveSchoolYear();
    }, []);

    useEffect(() => {
        const endpoint = getEndpoint();

        if (!endpoint) return;

        axios
            .get(`${API_BASE_URL}/api${endpoint}`)
            .then(res => {
                setRawData(res.data);
                setDataFetched(true);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));

    }, [personTypeFilter, paymentType]);

    useEffect(() => {
        if (!dataFetched) return;

        let filtered = [...rawData];

        if (campusFilter !== "") {
            filtered = filtered.filter(d => String(d.campus_id) === String(campusFilter));
        }
        filtered = filtered.filter(d => d.year_id == yearId);
        filtered = filtered.filter(d => d.semester_id == semesterId);
        if (selectedProgram) {
            filtered = filtered.filter(d => String(d.curriculum_id) === String(selectedProgram));
        }
        if (studentSearch.trim()) {
            const q = studentSearch.trim().toLowerCase();
            filtered = filtered.filter((d) => {
                const studentNumber = String(d.student_number || "");
                const lrn = String(d.learner_reference_number || "");
                const last = String(d.last_name || "");
                const first = String(d.given_name || d.first_name || "");
                const middle = String(d.middle_initial || d.middle_name || "");
                const fullName = `${last}, ${first} ${middle}`.toLowerCase();
                const altName = `${first} ${middle} ${last}`.toLowerCase();
                return (
                    studentNumber.toLowerCase().includes(q) ||
                    lrn.toLowerCase().includes(q) ||
                    last.toLowerCase().includes(q) ||
                    first.toLowerCase().includes(q) ||
                    fullName.includes(q) ||
                    altName.includes(q)
                );
            });
        }
        setFilteredData(filtered);
    }, [rawData, campusFilter, yearId, semesterId, selectedProgram, studentSearch]);

    useEffect(() => {
        setViewClicked(false);
        setVisibleData([]);
    }, [campusFilter, yearId, semesterId, selectedProgram, personTypeFilter, paymentType, studentSearch]);

    const fetchDepartments = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/get_department`);
            setDepartment(res.data);
            console.log(res.data);
        } catch (err) {
            console.error("Fetch error:", err);
        }
    };

    const fetchPrograms = async (dprtmnt_id) => {
        if (!dprtmnt_id) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/applied_program/${dprtmnt_id}`);
            setPrograms(res.data);
        } catch (err) {
            console.error("❌ Department fetch error:", err);
        }
    }

    const getBranchLabel = (branchId) => {
        const branch = branches.find(
            (item) => Number(item.id) === Number(branchId),
        );
        return branch?.branch || "—";
    };

    const fetchActiveSchoolYear = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/active_school_year`);

            if (res.data.length > 0) {
                const active = res.data[0];
                setYearId(active.year_id);
                setSemesterId(active.semester_id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleCollegeChange = (e) => {
        const selectedId = e.target.value;

        setSelectedDepartmentFilter(selectedId);
        setSelectedProgram("");
        setPrograms([]);
        fetchPrograms(selectedId);
    };

    const getEndpoint = () => {
        if (personTypeFilter === 1) {
            return "/get_applicant_data";
        }

        if (personTypeFilter === 2) {
            if (paymentType === 0) return "/get_student_data_unifast";
            if (paymentType === 1) return "/get_student_data_matriculation";
        }

        return null;
    };

    const handleViewRecord = () => {
        setVisibleData(filteredData);
        setViewClicked(true);
    };

    const mapExportRow = (row, index) => {
        if (personTypeFilter === 1) {
            return {
                "No.": index + 1,
                "Applicant Number": row.applicant_id,
                "Last Name": row.last_name,
                "First Name": row.first_name,
                "Middle Name": row.middle_name,
                "Program": row.program_description,
                "Schedule": `${row.start_time}-${row.end_time}, ${row.building_description} (${row.room_description})`,
                "Proctor": row.proctor
            };
        }

        return {
            "No.": index + 1,
            "Branch": row.campus_name,
            "Student No.": row.student_number,
            "LRN": row.learner_reference_number,
            "Last Name": row.last_name,
            "Given Name": row.given_name,
            "MI": row.middle_initial,
            "Degree Program": row.program_description || row.degree_program,
            "Year Level": row.year_level,
            "Sex": row.sex,
            "Email": row.email_address,
            "Phone": row.phone_number,
            "Lab Units": row.laboratory_units,
            "Computer Units": row.computer_units,
            "Acad Units": row.academic_units_enrolled,
            "NSTP Units": row.academic_units_nstp_enrolled,
            "Tuition Fees": row.tuition_fees,
            "NSTP Fees": row.nstp_fees,
            "Athletic Fees": row.athletic_fees,
            "Computer Fees": row.computer_fees,
            "Cultural Fees": row.cultural_fees,
            "Development Fees": row.development_fees,
            "Guidance Fees": row.guidance_fees,
            "Laboratory Fees": row.laboratory_fees,
            "Library Fees": row.library_fees,
            "Medical & Dental Fees": row.medical_and_dental_fees,
            "Registration Fees": row.registration_fees,
            "School ID Fees": row.school_id_fees,
            "Total TOSF": row.total_tosf,
            "Remark": row.remark
        };
    };

    const handleRemoveStudent = (student_number, id) => {
        setVisibleData((prev) =>
            prev.filter(
                (row) =>
                    row.student_number !== student_number || row.id !== id
            )
        );

        setFilteredData((prev) =>
            prev.filter(
                (row) =>
                    row.student_number !== student_number || row.id !== id
            )
        );
    };

    const handleExport = async () => {
        if (!filteredData.length) return;

        setExportTotal(filteredData.length);
        setExportProgress(0);
        setExportOpen(true);

        try {
            const exportData = [];
            const chunkSize = 200;

            for (let i = 0; i < filteredData.length; i += chunkSize) {
                const slice = filteredData.slice(i, i + chunkSize);
                slice.forEach((row, idx) => {
                    exportData.push(mapExportRow(row, i + idx));
                });
                setExportProgress(Math.min(i + slice.length, filteredData.length));
                await new Promise((resolve) => setTimeout(resolve, 0));
            }

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(workbook, worksheet, "Payments");
            XLSX.writeFile(workbook, "payment_export.xlsx");
            await axios.post(`${API_BASE_URL}/api/payment-export/audit`, {
                exported_count: exportData.length,
                payment_type: paymentType,
                person_type: personTypeFilter,
            }, getAuditHeaders()).catch((err) => {
                console.error("Payment export audit failed:", err);
            });
        } finally {
            setExportOpen(false);
        }
    };

    const openExportConfirm = () => {
        setExportConfirmOpen(true);
    };

    const closeExportConfirm = () => {
        setExportConfirmOpen(false);
    };

    const handleConfirmExport = async () => {
        setExportConfirmOpen(false);
        await handleExport();
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
                    PAYMENT EXPORTING MODULE
                </Typography>

                {personTypeFilter === 2 && (
                    <TextField
                        variant="outlined"
                        placeholder="Enter Student Number"
                        size="small"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        sx={{
                            width: 450,
                            backgroundColor: "#fff",
                            borderRadius: 1,
                            "& .MuiOutlinedInput-root": {
                                borderRadius: "10px",
                            },
                        }}
                        InputProps={{
                            startAdornment: (
                                <SearchIcon sx={{ mr: 1, color: "gray" }} />
                            ),
                        }}
                    />
                )}
            </Box>

            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />
            <br />

            <TableContainer component={Paper} sx={{ width: '100%', border: `1px solid ${borderColor}`, }}>
                <Table>
                    <TableHead sx={{ backgroundColor: headerColor }}>
                        <TableRow>
                            <TableCell sx={{ color: 'white', textAlign: "Center" }}>Payment Exporting Module</TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>

            <Paper sx={{ p: 3, mb: 4, border: `1px solid ${borderColor}` }}>
                <Grid container spacing={2}>
                    {/* ROW 1 */}
                    <Grid item xs={12} md={1.5}>
                        <FormControl fullWidth>
                            <Select
                                value={campusFilter}
                                onChange={(e) => setCampusFilter(e.target.value)}
                                displayEmpty
                            >
                                <MenuItem value="">
                                    <em>Choose Campus</em>
                                </MenuItem>
                                {branches.map((branch) => (
                                    <MenuItem key={branch.id} value={branch.id}>
                                        {branch.branch}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={7.5} />

                    <Grid item xs={12} md={1.5}>
                        <FormControl fullWidth>
                            <Select
                                value={yearId}
                                onChange={(e) => setYearId(e.target.value)}
                            >
                                {schoolYears.map((sy) => (
                                    <MenuItem key={sy.year_id} value={sy.year_id}>
                                        {sy.current_year} - {sy.next_year}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={1.5}>
                        <FormControl fullWidth>
                            <Select
                                value={semesterId}
                                onChange={(e) => setSemesterId(e.target.value)}
                            >
                                {semesters.map((sem) => (
                                    <MenuItem key={sem.semester_id} value={sem.semester_id}>
                                        {sem.semester_description}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={1.5}>
                        <FormControl fullWidth>
                            <Select
                                value={personTypeFilter}
                                onChange={(e) => setPersonTypeFilter(e.target.value)}
                            >
                                <MenuItem value={1}>Applicant</MenuItem>
                                <MenuItem value={2}>Student</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={1.5}>
                        <FormControl fullWidth>
                            <Select
                                value={paymentType}
                                disabled={personTypeFilter === 1}
                                onChange={(e) => setPaymentType(e.target.value)}
                            >
                                <MenuItem value={0}>Unifast</MenuItem>
                                <MenuItem value={1}>Matriculation</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={6} />

                    {/* ROW 2 */}
                    <Grid item xs={12} md={1.5}>
                        <FormControl fullWidth>
                            <Select
                                value={selectedDepartmentFilter}
                                onChange={handleCollegeChange}
                            >
                                {department.map((dep) => (
                                    <MenuItem key={dep.dprtmnt_id} value={dep.dprtmnt_id}>
                                        {dep.dprtmnt_name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={1.5}>
                        <FormControl fullWidth>
                            <Select
                                value={selectedProgram}
                                onChange={(e) => setSelectedProgram(e.target.value)}
                                displayEmpty
                            >
                                <MenuItem value="">Select Program</MenuItem>
                                {programs.map((p) => (
                                    <MenuItem key={p.curriculum_id} value={p.curriculum_id}>
                                        ({p.program_code}-{p.year_description}) {p.program_description} {p.major} ({getBranchLabel(p.components)})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} md={1.5}>
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={handleViewRecord}
                            sx={{ backgroundColor: mainButtonColor }}
                            disabled={!filteredData.length}
                        >
                            View Record
                        </Button>
                    </Grid>

                    <Grid item xs={12} md={1.5}>
                        <Button
                            variant="contained"
                            fullWidth
                            sx={{ backgroundColor: mainButtonColor }}
                            onClick={openExportConfirm}
                            disabled={!filteredData.length}
                        >
                            Export XLSX
                        </Button>
                    </Grid>


                </Grid>
            </Paper>

            {viewClicked && visibleData.length > 0 ? (
                <>
                    {personTypeFilter === 1 && (
                        <ApplicantTable data={visibleData} />
                    )}

                    {personTypeFilter === 2 && (
                        <StudentTable
                            data={visibleData}
                            paymentType={paymentType}
                            onRemove={handleRemoveStudent}
                        />
                    )}
                </>
            ) : (
                <Paper
                    sx={{
                        padding: "6rem 0rem",
                        textAlign: "center",
                        border: `2px dashed ${borderColor}`,
                        backgroundColor: "#f9f9f9",
                        mt: 2,
                    }}
                >
                    <Typography variant="h6" color="textSecondary">
                        There's no table currently being displayed.
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Click the "View Record" button to display data.
                    </Typography>
                </Paper>
            )}

            <Dialog open={exportConfirmOpen} onClose={closeExportConfirm}>
                <DialogTitle>Confirm Export</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to export{" "}
                        {filteredData.length}{" "}
                        {personTypeFilter === 1 ? "applicants" : "students"} to XLSX?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeExportConfirm}
                        color="error"
                        variant="outlined"
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmExport} variant="contained">
                        Export
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={exportOpen}>
                <DialogTitle>Exporting XLSX</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {exportProgress}/{exportTotal}{" "}
                        {personTypeFilter === 1 ? "applicants" : "students"} are being exported to XLSX
                    </DialogContentText>
                    <Box sx={{ mt: 2 }}>
                        <LinearProgress
                            variant="determinate"
                            value={exportTotal ? (exportProgress / exportTotal) * 100 : 0}
                        />
                    </Box>
                </DialogContent>
            </Dialog>

        </Box>
    );
};

export default PaymentExportingModule;
