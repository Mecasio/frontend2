

import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import axios from "axios";
import {
    Box, Button, Grid, MenuItem, TextField, Typography, Paper, Card, TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    Snackbar,
    FormControl,
    InputLabel,
    Select,
    Alert,
    TableBody
} from "@mui/material";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PeopleIcon from '@mui/icons-material/People';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../apiConfig";
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SearchIcon from "@mui/icons-material/Search";
import InputAdornment from "@mui/material/InputAdornment";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import DateField from "../components/DateField";
import ScoreIcon from "@mui/icons-material/Score"
import SaveIcon from '@mui/icons-material/Save';
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";



const CollegeQualifyingInterviewRoomAssignment = () => {
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

    useEffect(() => {
        if (!settings) return;

        setBranches(settings.branches || []);

    }, [settings]);


    // const tabs = [

    //     { label: "Qualifying / Interview Room Assignment", to: "/assign_qualifying_interview_exam", icon: <MeetingRoomIcon fontSize="large" /> },
    //     // { label: "Qualifying / Interview Schedule Management", to: "/college_qualifying_interview_schedule_management", icon: <ScheduleIcon fontSize="large" /> },
    //     { label: "Qualifying / Interviewer Applicant's List", to: "/enrollment_schedule_room_list", icon: <PeopleIcon fontSize="large" /> },




    // ];


    const navigate = useNavigate();
    // const [activeStep, setActiveStep] = useState(0);
    // // const [clickedSteps, setClickedSteps] = useState(Array(tabs.length).fill(false));


    // const handleStepClick = (index, to) => {
    //     setActiveStep(index);
    //     navigate(to); // this will actually change the page
    // };

    const [day, setDay] = useState("");
    const [roomId, setRoomId] = useState("");            // store selected room_id
    const [rooms, setRooms] = useState([]);
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [message, setMessage] = useState("");
    const [roomQuota, setRoomQuota] = useState("");
    const [interviewer, setInterviewer] = useState("");
    const [roomNo, setRoomNo] = useState("");
    const [roomName, setRoomName] = useState("");
    const [buildingName, setBuildingName] = useState("");
    const currentYear = new Date().getFullYear();
    const minDate = `${currentYear}-01-01`;
    const maxDate = `${currentYear}-12-31`;




    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/room_list`);
                // expect res.data = [{ room_id: 1, room_description: "Room A" }, ...]
                setRooms(res.data);
            } catch (err) {
                console.error("Error fetching rooms:", err);
                setMessage("Could not load rooms.");
            }
        };
        fetchRooms();
    }, []);

    const [schedules, setSchedules] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState("");  // selected in form
    const [branches, setBranches] = useState([]);
    const [activeSchoolYearId, setActiveSchoolYearId] = useState("");

    useEffect(() => {
        const fetchSchedules = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/interview_schedules_with_count`);

                setSchedules(res.data);
            } catch (err) {
                console.error("Error fetching schedules:", err);
            }
        };
        fetchSchedules();
    }, []);

    useEffect(() => {
        const fetchActiveSchoolYearId = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/active_school_year`);
                setActiveSchoolYearId(res.data?.[0]?.id || "");
            } catch (err) {
                console.error("Error fetching active school year:", err);
            }
        };

        fetchActiveSchoolYearId();
    }, []);

    const [userID, setUserID] = useState("");
    const [user, setUser] = useState("");
    const [userRole, setUserRole] = useState("");
    const [hasAccess, setHasAccess] = useState(null);
    const [loading, setLoading] = useState(false);


    const pageId = 10;

    const [employeeID, setEmployeeID] = useState("");
    const auditConfig = {
        headers: {
            ...getFlatAuditHeaders(),
            "x-audit-actor-id":
                employeeID ||
                localStorage.getItem("employee_id") ||
                localStorage.getItem("email") ||
                "unknown",
            "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
        },
    };

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

    const handleSaveSchedule = async () => {
        if (!selectedBranch || !day || !buildingName || !roomId || !startTime || !endTime || !interviewer || !roomQuota) {
            setSnackbarMessage("Please complete all required fields before saving.");
            setSnackbarSeverity("error");
            setOpenSnackbar(true);
            return;
        }

        if (Number(roomQuota) <= 0) {
            setSnackbarMessage("Room capacity must be greater than 0.");
            setSnackbarSeverity("error");
            setOpenSnackbar(true);
            return;
        }

        try {
            const selectedRoom = rooms.find(r => String(r.room_id) === String(roomId));

            if (!selectedRoom) {
                setSnackbarMessage("Please select a valid building and room.");
                setSnackbarSeverity("error");
                setOpenSnackbar(true);
                return;
            }

            const payload = {
                schedule_id: editingSchedule?.schedule_id,
                branch: selectedBranch,
                day_description: day,
                building_description: buildingName,
                room_description: selectedRoom?.room_description || "",
                start_time: startTime,
                end_time: endTime,
                interviewer,
                room_quota: roomQuota,
                active_school_year_id: activeSchoolYearId || undefined,
            };

            if (editingSchedule) {
                await axios.put(
                    `${API_BASE_URL}/api/update_interview_schedule/${editingSchedule.schedule_id}`,
                    payload,
                    auditConfig,
                );

                setSnackbarMessage("Schedule updated successfully ✅");
            } else {
                await axios.post(
                    `${API_BASE_URL}/api/insert_interview_schedule`,
                    payload,
                    auditConfig,
                );

                setSnackbarMessage("Schedule created successfully ✅");
            }

            setSnackbarSeverity("success");
            setOpenSnackbar(true);

            const res = await axios.get(
                `${API_BASE_URL}/api/interview_schedules_with_count`
            );

            setSchedules(res.data);
            closeFormDialog();

        } catch (err) {
            console.error("Save error:", err);

            setSnackbarMessage(
                err.response?.data?.error || "Failed to save schedule ❌"
            );

            setSnackbarSeverity("error");
            setOpenSnackbar(true);
        }
    };

    const [editingSchedule, setEditingSchedule] = useState(null);

    const [openFormDialog, setOpenFormDialog] = useState(false);

    const resetScheduleForm = () => {
        setEditingSchedule(null);
        setSelectedBranch("");
        setDay("");
        setBuildingName("");
        setRoomId("");
        setStartTime("");
        setEndTime("");
        setInterviewer("");
        setRoomQuota("");
    };

    const closeFormDialog = () => {
        setOpenFormDialog(false);
        resetScheduleForm();
    };


    const handleEdit = (row) => {
        setEditingSchedule(row);

        setSelectedBranch(row.branch);
        setDay(row.day_description);
        setBuildingName(row.building_description);

        const selectedRoom = rooms.find(r => r.room_description === row.room_description);
        setRoomId(selectedRoom?.room_id || "");

        setStartTime(row.start_time);
        setEndTime(row.end_time);
        setInterviewer(row.interviewer);
        setRoomQuota(row.room_quota);

        setOpenFormDialog(true); // ✅ ADD THIS
    };

    const handleDelete = (row) => {
        setScheduleToDelete(row);
        setOpenDeleteDialog(true);
    };

    const executeDeleteSchedule = async () => {
        if (!scheduleToDelete?.schedule_id) {
            console.error("No schedule_id found:", scheduleToDelete);
            return;
        }

        try {
            await axios.delete(
                `${API_BASE_URL}/api/delete_interview_schedule/${scheduleToDelete.schedule_id}`,
                auditConfig,
            );

            // remove from UI immediately
            setSchedules(prev =>
                prev.filter(s => s.schedule_id !== scheduleToDelete.schedule_id)
            );

            setSnackbarMessage("Schedule deleted successfully ✅");
            setSnackbarSeverity("success");
        } catch (err) {
            console.error("Delete error:", err);
            setSnackbarMessage(
                err.response?.data?.error || "Delete failed ❌"
            );
            setSnackbarSeverity("error");
        }

        setOpenSnackbar(true);
        setOpenDeleteDialog(false);
        setScheduleToDelete(null);
    };

    // 🔔 Snackbar
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("success");

    // 🗑️ Delete Dialog
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [scheduleToDelete, setScheduleToDelete] = useState(null);

    const formatDate = (dateString) => {
        if (!dateString) return "";

        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const formatTime = (time) => {
        if (!time) return "";

        const [hours, minutes] = time.split(":");
        const date = new Date();
        date.setHours(hours);
        date.setMinutes(minutes);

        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    const getBranchLabel = (branchId) => {
        const branch = branches.find((item) => String(item.id) === String(branchId));
        return branch?.branch || branchId || "N/A";
    };


    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedDate, setSelectedDate] = useState("");

    const [selectedCampusFilter, setSelectedCampusFilter] = useState("");


    const filteredSchedules = schedules.filter((s) => {
        const scheduleMonth = new Date(s.schedule_date).getMonth() + 1;

        const matchesCampus =
            !selectedCampusFilter || String(s.branch) === String(selectedCampusFilter);

        const matchesMonth =
            !selectedMonth || scheduleMonth === Number(selectedMonth);

        const matchesDate =
            !selectedDate || s.schedule_date === selectedDate;

        const matchesSearch =
            !searchQuery ||
            s.building_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.room_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.evaluator?.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesCampus && matchesMonth && matchesDate && matchesSearch;
    });


    // ===== PAGINATION =====
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 20; // change if needed

    const totalPages = Math.ceil(filteredSchedules.length / rowsPerPage);

    const paginatedSchedules = filteredSchedules.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedMonth, selectedDate, selectedCampusFilter]);


    const availableDates = Array.from(
        new Set(
            schedules
                .filter((s) => {
                    const matchesSearch =
                        !searchQuery ||
                        s.building_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.room_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.interviewer?.toLowerCase().includes(searchQuery.toLowerCase());

                    const matchesMonth =
                        !selectedMonth ||
                        new Date(s.day_description).getMonth() + 1 === Number(selectedMonth);

                    return matchesSearch && matchesMonth;
                })
                .map((s) => s.day_description)
        )
    ).sort();

    const canCreate = true;
    const canEdit = true;
    const canDelete = true;

    const showCreateActions = canCreate;
    const showActionColumn = canEdit || canDelete;

    const cellStyle = {
        border: `1px solid ${borderColor}`,
        padding: "6px",
        fontSize: "0.85rem",
    };

    const whiteSelectStyle = {
        minWidth: 150,
        "& .MuiOutlinedInput-root": {
            color: "white",
            "& fieldset": { borderColor: "white" },
            "&:hover fieldset": { borderColor: "white" },
            "&.Mui-focused fieldset": { borderColor: "white" },
        },
        "& .MuiSvgIcon-root": {
            color: "white",
        },
    };

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

    return (
        <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
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
                    QUALIFYING / INTERVIEW ROOM ASSIGNMENT
                </Typography>
                <TextField
                    size="small"
                    placeholder="Search Interviewer, Building, Room"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{
                        width: 450,
                        backgroundColor: "#fff",
                        borderRadius: 1,
                        "& .MuiOutlinedInput-root": {
                            borderRadius: "10px",
                        },
                        minWidth: 280,
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ mr: 1, color: "gray" }} />
                            </InputAdornment>
                        ),
                    }}
                />


            </Box>

            <hr style={{ border: "1px solid #ccc", width: "100%" }} />


            <div style={{ height: "20px" }}></div>

            {/* <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "nowrap", // ❌ prevent wrapping
                    width: "100%",
                    mt: 1,
                    gap: 2,
                }}
            >
                {tabs.map((tab, index) => (
                    <Card
                        key={index}
                        onClick={() => handleStepClick(index, tab.to)}
                        sx={{
                            flex: `1 1 ${100 / tabs.length}%`, // evenly divide row
                            height: 140,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            borderRadius: 2,
                            border: `1px solid ${borderColor}`,
                            backgroundColor: activeStep === index ? headerColor : "#E8C999",
                            color: activeStep === index ? "#fff" : "#000",
                            boxShadow:
                                activeStep === index
                                    ? "0px 4px 10px rgba(0,0,0,0.3)"
                                    : "0px 2px 6px rgba(0,0,0,0.15)",
                            transition: "0.3s ease",
                            "&:hover": {
                                backgroundColor: activeStep === index ? "#000" : "#f5d98f",
                            },
                        }}
                    >
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <Box sx={{ fontSize: 40, mb: 1 }}>{tab.icon}</Box>
                            <Typography sx={{ fontSize: 14, fontWeight: "bold", textAlign: "center" }}>
                                {tab.label}
                            </Typography>
                        </Box>
                    </Card>
                ))}
            </Box> */}

            <br />
            <br />





            <TableContainer
                component={Paper}
                sx={{ width: "100%", border: `1px solid ${borderColor}` }}
            >
                <Table>
                    <TableHead
                        sx={{ backgroundColor: headerColor }}
                    >
                        <TableRow>
                            <TableCell sx={{ color: "white", p: 1 }}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        width: "100%",
                                    }}
                                >
                                    {/* LEFT SIDE */}
                                    <Typography sx={{ fontWeight: "bold", color: "white", marginLeft: "15px" }}>
                                        Existing Schedules
                                    </Typography>

                                    {showCreateActions && (
                                        <Button
                                            variant="contained"
                                            onClick={() => {
                                                resetScheduleForm();
                                                setOpenFormDialog(true);
                                            }}
                                            sx={{
                                                backgroundColor: "#1976d2", // ✅ Blue
                                                color: "#fff",
                                                fontWeight: "bold",
                                                borderRadius: "8px",
                                                width: "250px",
                                                textTransform: "none",
                                                px: 2,
                                                mr: "15px",
                                                '&:hover': {
                                                    backgroundColor: "#1565c0" // darker blue hover
                                                }
                                            }}
                                        >
                                            + Add Schedule
                                        </Button>
                                    )}
                                </Box>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>



            <Paper
                elevation={3}
                sx={{
                    p: 3,
                    border: `1px solid ${borderColor}`,

                }}
            >





                <TableContainer component={Paper} sx={{ width: '100%', }}>
                    <Table size="small">
                        <TableHead sx={{ backgroundColor: '#6D2323', color: "white" }}>
                            <TableRow>
                                <TableCell colSpan={10} sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: headerColor, color: "white" }}>
                                    <Box
                                        display="flex"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        flexWrap="wrap"
                                        gap={1}
                                    >
                                        {/* LEFT SIDE */}
                                        <Typography fontSize="14px" fontWeight="bold" color="white">
                                            Total Room Schedule Records: ({filteredSchedules.length})
                                        </Typography>

                                        {/* RIGHT SIDE */}
                                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">

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
                                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                                    },
                                                    '&.Mui-disabled': {
                                                        color: "white",
                                                        borderColor: "white",
                                                        backgroundColor: "transparent",
                                                        opacity: 1,
                                                    }
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
                                                            color: 'white', // dropdown arrow icon color
                                                        }
                                                    }}
                                                    MenuProps={{
                                                        PaperProps: {
                                                            sx: {
                                                                maxHeight: 200,
                                                                backgroundColor: '#fff', // dropdown background
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
                                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                                    },
                                                    '&.Mui-disabled': {
                                                        color: "white",
                                                        borderColor: "white",
                                                        backgroundColor: "transparent",
                                                        opacity: 1,
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
                {/* ================= SCHEDULE LIST ================= */}
                <TableContainer
                    component={Paper}
                    sx={{
                        width: "100%",
                        border: `1px solid ${borderColor}`,
                    }}
                >
                    <Table size="small">

                        {/* ===== HEADER WITH FILTERS ===== */}
                        <TableHead>


                            {/* COLUMN HEADERS */}
                            <TableRow>
                                {[
                                    "#", "Branch", "Date", "Building", "Room",
                                    "Start", "End", "Interviewer",
                                    "Room Slot", ...(showActionColumn ? ["Actions"] : [])
                                ].map(h => (
                                    <TableCell
                                        key={h}
                                        align="center"
                                        sx={{
                                            border: `1px solid ${borderColor}`,
                                            fontWeight: "600",
                                            fontSize: "0.9rem",
                                        }}
                                    >
                                        {h}
                                    </TableCell>
                                ))}
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
                            {paginatedSchedules.map((s, index) => (
                                <TableRow key={s.schedule_id} hover>
                                    <TableCell align="center" sx={cellStyle}>{index + 1}</TableCell>
                                    <TableCell align="center" sx={cellStyle}>{getBranchLabel(s.branch)}</TableCell>
                                    <TableCell align="center" sx={cellStyle}>{formatDate(s.day_description)}</TableCell>
                                    <TableCell align="center" sx={cellStyle}>{s.building_description}</TableCell>
                                    <TableCell align="center" sx={cellStyle}>{s.room_description}</TableCell>
                                    <TableCell align="center" sx={cellStyle}>{formatTime(s.start_time)}</TableCell>
                                    <TableCell align="center" sx={cellStyle}>{formatTime(s.end_time)}</TableCell>
                                    <TableCell align="center" sx={cellStyle}>{s.interviewer}</TableCell>
                                    <TableCell align="center" sx={cellStyle}>{s.room_quota}</TableCell>
                                    {showActionColumn && (
                                        <TableCell align="center" sx={cellStyle}>
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    justifyContent: "center",
                                                    alignItems: "center",
                                                    gap: 1,
                                                    flexWrap: "nowrap",
                                                }}
                                            >
                                                {canEdit && (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        sx={{
                                                            backgroundColor: "green",
                                                            color: "white",
                                                            borderRadius: "5px",
                                                            width: "100px",
                                                            height: "40px",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            gap: "5px",
                                                        }}
                                                        onClick={() => handleEdit(s)}
                                                    >
                                                        <EditIcon fontSize="small" /> Edit
                                                    </Button>
                                                )}

                                                {canDelete && (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        sx={{
                                                            backgroundColor: "#9E0000",
                                                            color: "white",
                                                            borderRadius: "5px",
                                                            width: "100px",
                                                            height: "40px",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            gap: "5px",
                                                        }}
                                                        onClick={() => handleDelete(s)}
                                                    >

                                                        <DeleteIcon fontSize="small" /> Delete
                                                    </Button>
                                                )}
                                            </Box>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>

                    </Table>
                </TableContainer>
                <TableContainer component={Paper} sx={{ width: '100%', }}>
                    <Table size="small">
                        <TableHead sx={{ backgroundColor: '#6D2323', color: "white" }}>
                            <TableRow>
                                <TableCell colSpan={10} sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: headerColor, color: "white" }}>
                                    <Box
                                        display="flex"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        flexWrap="wrap"
                                        gap={1}
                                    >
                                        {/* LEFT SIDE */}
                                        <Typography fontSize="14px" fontWeight="bold" color="white">
                                            Total Room Schedule Records: ({filteredSchedules.length})
                                        </Typography>

                                        {/* RIGHT SIDE */}
                                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">

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
                                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                                    },
                                                    '&.Mui-disabled': {
                                                        color: "white",
                                                        borderColor: "white",
                                                        backgroundColor: "transparent",
                                                        opacity: 1,
                                                    }
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
                                                            color: 'white', // dropdown arrow icon color
                                                        }
                                                    }}
                                                    MenuProps={{
                                                        PaperProps: {
                                                            sx: {
                                                                maxHeight: 200,
                                                                backgroundColor: '#fff', // dropdown background
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
                                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                                    },
                                                    '&.Mui-disabled': {
                                                        color: "white",
                                                        borderColor: "white",
                                                        backgroundColor: "transparent",
                                                        opacity: 1,
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
            </Paper>







            {/* 🔔 SNACKBAR */}
            <Snackbar
                open={openSnackbar}
                autoHideDuration={4000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert
                    onClose={() => setOpenSnackbar(false)}
                    severity={snackbarSeverity}
                    sx={{ width: "100%" }}
                    action={
                        scheduleToDelete && (
                            <Button color="inherit" size="small" onClick={executeDeleteSchedule}>
                                CONFIRM
                            </Button>
                        )
                    }
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>

            <Dialog
                open={openDeleteDialog}
                onClose={() => { setOpenDeleteDialog(false); setScheduleToDelete(null); }}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle
                    sx={{
                        background: colors.header || "#9E0000",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1.2rem",
                        py: 2,
                    }}
                >
                    Delete Schedule
                </DialogTitle>

                <DialogContent sx={{ p: 3, mt: 2 }}>
                    <Typography sx={{ mb: 2 }}>
                        Are you sure you want to delete the schedule for{" "}
                        <strong>{scheduleToDelete?.room_description}</strong> in building{" "}
                        <strong>{scheduleToDelete?.building_description}</strong> on{" "}
                        <strong>{formatDate(scheduleToDelete?.day_description)}</strong>?
                    </Typography>

                    <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
                        Deleting this schedule will permanently remove it from the system.
                        <br />
                        Applicants assigned to this schedule may need to be rescheduled.
                    </Typography>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        color="error"
                        variant="outlined"
                        onClick={() => { setOpenDeleteDialog(false); setScheduleToDelete(null); }}
                    >
                        Cancel
                    </Button>
                    <Button color="error" variant="contained" onClick={executeDeleteSchedule}>
                        Yes, Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openFormDialog}
                onClose={closeFormDialog}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: "hidden",
                        boxShadow: 6
                    }
                }}
            >
                {/* HEADER */}
                <DialogTitle
                    sx={{
                        background: headerColor,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1.2rem",
                        py: 2,
                        marginBottom: "20px"
                    }}
                >
                    {editingSchedule ? "Edit Interview / Qualifying Exam Schedule" : "New Interview / Qualifying Exam Schedule"}
                </DialogTitle>

                {/* CONTENT */}
                <DialogContent sx={{ p: 3 }}>
                    <Grid container spacing={2}>

                        {/* ===== LOCATION ===== */}
                        <Grid item xs={12}>
                            <Typography fontWeight={700} sx={{ mb: 2 }}>
                                Location Details
                            </Typography>

                            <TextField
                                select
                                fullWidth
                                label="Branch"
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                            >
                                {branches.map((b) => (
                                    <MenuItem key={b.id} value={String(b.id)}>
                                        {b.branch}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {/* Date */}
                        <Grid item xs={6}>
                            <Typography
                                variant="subtitle1"
                                fontWeight={700}
                                sx={{ mb: 1, }}
                            >
                                Qualifying
                            </Typography>
                            <DateField
                                fullWidth
                                label="Interview Date"
                                value={day}
                                inputProps={{ min: minDate, max: maxDate }}
                                onChange={(e) => setDay(e.target.value)}
                            />
                        </Grid>

                        {/* Building */}
                        <Grid item xs={6}>
                            <Typography
                                variant="subtitle1"
                                fontWeight={700}
                                sx={{ mb: 1, }}
                            >
                                Building
                            </Typography>
                            <TextField
                                select
                                fullWidth
                                label="Building"
                                value={buildingName}
                                onChange={(e) => {
                                    setBuildingName(e.target.value);
                                    setRoomId("");
                                }}
                            >
                                {[...new Set(
                                    rooms.map((r) => r.building_description).filter(Boolean)
                                )].map((b, i) => (
                                    <MenuItem key={i} value={b}>
                                        {b}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {/* Room */}
                        <Grid item xs={6}>
                            <Typography
                                variant="subtitle1"
                                fontWeight={700}
                                sx={{ mb: 1, }}
                            >
                                Room
                            </Typography>
                            <TextField

                                select
                                fullWidth
                                label="Room"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                disabled={!buildingName}
                            >
                                {rooms
                                    .filter((r) => r.building_description === buildingName)
                                    .map((r) => (
                                        <MenuItem key={r.room_id} value={r.room_id}>
                                            {r.room_description}
                                        </MenuItem>
                                    ))}
                            </TextField>
                        </Grid>

                        {/* Start */}
                        <Grid item xs={3}>
                            <Typography
                                variant="subtitle1"
                                fontWeight={700}
                                sx={{ mb: 1, }}
                            >
                                Start Time
                            </Typography>
                            <TextField
                                fullWidth
                                type="time"
                                label="Start Time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </Grid>

                        {/* End */}
                        <Grid item xs={3}>
                            <Typography
                                variant="subtitle1"
                                fontWeight={700}
                                sx={{ mb: 1, }}
                            >
                                End Time
                            </Typography>
                            <TextField
                                fullWidth
                                type="time"
                                label="End Time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </Grid>

                        {/* ===== INTERVIEWER ===== */}
                        <Grid item xs={12}>
                            <Typography fontWeight={700} sx={{ mb: 1 }}>
                                Interviewer Full Name
                            </Typography>

                            <TextField
                                fullWidth
                                label="Interviewer"
                                value={interviewer}
                                onChange={(e) => setInterviewer(e.target.value)}
                            />
                        </Grid>

                        {/* ===== ROOM SLOT ===== */}
                        <Grid item xs={12}>
                            <Typography fontWeight={700} sx={{ mb: 1 }}>
                                Room Capacity
                            </Typography>

                            <TextField
                                fullWidth
                                type="number"
                                label="Room Slot"
                                value={roomQuota}
                                onChange={(e) => setRoomQuota(e.target.value)}
                            />
                        </Grid>

                    </Grid>
                </DialogContent>

                {/* ACTIONS */}
                <DialogActions
                    sx={{
                        px: 3,
                        py: 2,
                        borderTop: "1px solid #e0e0e0"
                    }}
                >
                    <Button
                        onClick={closeFormDialog}
                        color="error"
                        variant="outlined"
                    >
                        Cancel
                    </Button>

                    {(showCreateActions || (editingSchedule && canEdit)) && (
                        <Button
                            variant="contained"
                            sx={{
                                px: 4,
                                fontWeight: 600,
                                textTransform: "none"
                            }}
                            onClick={handleSaveSchedule}
                        >
                            <SaveIcon fontSize="small" /> Save
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

        </Box >
    );
};

export default CollegeQualifyingInterviewRoomAssignment;
