import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box, Button, Grid, MenuItem, TextField, Typography, Paper, TableContainer,
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
import PersonSearchIcon from "@mui/icons-material/PersonSearch";

import { Link, useLocation } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ScheduleIcon from "@mui/icons-material/Schedule";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import KeyIcon from "@mui/icons-material/Key";
import API_BASE_URL from "../apiConfig";
import { getAuditConfig } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";
import AdmissionRoomAssignmentTabs from "../components/AdmissionRoomAssignmentTabs";
import SearchIcon from "@mui/icons-material/Search";
import InputAdornment from "@mui/material/InputAdornment";
import EditIcon from "@mui/icons-material/Edit";
import DateField from "../components/DateField";
import DeleteIcon from "@mui/icons-material/Delete";
import ScoreIcon from "@mui/icons-material/Score"
import SaveIcon from '@mui/icons-material/Save';



const EntranceExamRoomAssignment = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);

  const colors = settings?.colors || {};
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#000000";
  const headerColor = colors.header || "#1976d2";

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const getAuditConfigForPage = () =>
    getAuditConfig({
      "x-audit-actor-id":
        employeeID ||
        localStorage.getItem("employee_id") ||
        localStorage.getItem("email") ||
        "unknown",
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "administrator",
    });
  const [hasAccess, setHasAccess] = useState(null);

  const currentYear = new Date().getFullYear();
  const minDate = `${currentYear}-01-01`;
  const maxDate = `${currentYear}-12-31`;

  const [editingSchedule, setEditingSchedule] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [day, setDay] = useState("");
  const [roomId, setRoomId] = useState("");
  const [rooms, setRooms] = useState([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState("");
  const [roomQuota, setRoomQuota] = useState("");
  const [proctor, setProctor] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [roomName, setRoomName] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [schedules, setSchedules] = useState([]);

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const pageId = 9;

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/room_list`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });

        setRooms(res.data);
      } catch (err) {
        console.error("Error fetching rooms:", err);
        setMessage("Could not load rooms. Check backend /room_list.");
      }
    };
    fetchRooms();
  }, []);

  const [schoolYearId, setSchoolYearId] = useState('');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/active_school_year`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then(res => {
        const row = Array.isArray(res.data) ? res.data[0] : res.data;
        setSchoolYearId(row?.school_year_id ?? row?.id ?? "");
      });
  }, []);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/exam_schedules_with_count`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        setSchedules(res.data);
      } catch (err) {
        console.error("Error fetching schedules:", err);
      }
    };
    fetchSchedules();
  }, []);

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

      if (["administrator", "superadmin", "technical"].includes(storedRole)) {
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
      const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
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

  const resetScheduleForm = () => {
    setEditingSchedule(null);
    setSelectedBranch("");
    setDay("");
    setBuildingName("");
    setRoomId("");
    setStartTime("");
    setEndTime("");
    setProctor("");
    setRoomQuota("");
  };

  const handleSaveSchedule = async () => {
    const sel = rooms.find(r => String(r.room_id) === String(roomId));
    if (!sel) {
      setSnackbarMessage("Invalid room ❌");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return;
    }
    if (!schoolYearId) {
      setSnackbarMessage("No active school year found — cannot save schedule ❌");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return;
    }
    try {
      if (editingSchedule) {
        await axios.put(
          `${API_BASE_URL}/api/update_exam_schedule/${editingSchedule.schedule_id}`,
          {
            branch: selectedBranch,  // ✅ ADDED
            day_description: day,
            building_description: buildingName,
            room_description: sel.room_description,
            start_time: startTime,
            end_time: endTime,
            proctor,
            room_quota: roomQuota,
            active_school_year_id: schoolYearId,
          },
          getAuditConfigForPage(),
        );
        setSnackbarMessage("Schedule updated");
      } else {
        await axios.post(`${API_BASE_URL}/api/insert_exam_schedule`, {
          branch: selectedBranch,  // ✅ ADDED
          day_description: day,
          building_description: buildingName,
          room_description: sel.room_description,
          start_time: startTime,
          end_time: endTime,
          proctor,
          room_quota: roomQuota,
          active_school_year_id: schoolYearId,
        }, getAuditConfigForPage());
        setSnackbarMessage("Schedule saved");
      }

      setSnackbarSeverity("success");
      setOpenSnackbar(true);

      setEditingSchedule(null);
      setSelectedBranch("");   // ✅ RESET
      setDay("");
      setBuildingName("");
      setRoomId("");
      setStartTime("");
      setEndTime("");
      setProctor("");
      setRoomQuota("");
      setOpenFormDialog(false);

      const res = await axios.get(`${API_BASE_URL}/api/exam_schedules_with_count`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setSchedules(res.data);

    } catch (err) {
      setSnackbarMessage(err.response?.data?.error || "Action failed ❌");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    }
  };


  const [selectedBranch, setSelectedBranch] = useState("");
  const branches = settings?.branches || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingSchedule) {
      setOpenUpdateDialog(true);
      return;
    }
    handleSaveSchedule();
  };

  const executeDeleteSchedule = async () => {
    if (!scheduleToDelete) return;

    try {
      await axios.delete(
        `${API_BASE_URL}/api/delete_exam_schedule/${scheduleToDelete.schedule_id}`,
        getAuditConfigForPage(),
      );
      setSchedules(prev => prev.filter(s => s.schedule_id !== scheduleToDelete.schedule_id));

      setSnackbarMessage("Schedule deleted ✅");
      setSnackbarSeverity("success");
      setOpenSnackbar(true);
    } catch (err) {
      console.error(err);
      setSnackbarMessage(err.response?.data?.error || "Delete failed ❌");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    }

    setScheduleToDelete(null);
  };

  const [openFormDialog, setOpenFormDialog] = useState(false);


  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setSelectedBranch(schedule.branch);
    setDay(schedule.day_description);
    setBuildingName(schedule.building_description);

    const room = rooms.find(r => r.room_description === schedule.room_description);
    setRoomId(room ? room.room_id : "");

    setStartTime(schedule.start_time);
    setEndTime(schedule.end_time);
    setProctor(schedule.proctor);
    setRoomQuota(schedule.room_quota);

    setOpenFormDialog(true); // ✅ ADD THIS
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";

    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const availableDates = Array.from(
    new Set(
      schedules
        .filter((s) => {
          const matchesSearch =
            !searchQuery ||
            s.building_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.room_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.proctor?.toLowerCase().includes(searchQuery.toLowerCase());

          const matchesMonth =
            !selectedMonth ||
            new Date(s.day_description).getMonth() + 1 === Number(selectedMonth);

          return matchesSearch && matchesMonth;
        })
        .map((s) => s.day_description)
    )
  ).sort();

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
          ENTRANCE EXAM ROOM ASSIGNMENT
        </Typography>


        <TextField
          size="small"
          placeholder="Search Proctor, Building, Room"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
              <InputAdornment position="start">
                <SearchIcon sx={{ mr: 1, color: "gray" }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />

      <br />
      <br />

      <AdmissionRoomAssignmentTabs />

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
          <Box
            sx={{
              border: `1px solid ${borderColor}`,
              borderRadius: 2,
              p: 3,
              mb: 3,
              display: "flex",
              gap: 3,
              flexWrap: "wrap",
              backgroundColor: "#fafafa"
            }}
          >

            <Box sx={{ minWidth: 220, flex: 1 }}>
              <Typography sx={{ fontWeight: "bold", mb: 1, fontSize: 14 }}>
                Campus
              </Typography>
              <Select
                fullWidth
                size="small"
                value={selectedCampusFilter}
                onChange={(e) => setSelectedCampusFilter(e.target.value)}
              >
                <MenuItem value="">
                  <em>All Campus</em>
                </MenuItem>
                {branches.map((b) => (
                  <MenuItem key={b.id} value={String(b.id)}>
                    {b.branch}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {/* MONTH */}
            <Box sx={{ minWidth: 220, flex: 1 }}>
              <Typography sx={{ fontWeight: "bold", mb: 1, fontSize: 14 }}>
                Month
              </Typography>
              <Select
                fullWidth
                size="small"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setSelectedDate("");
                }}
              >
                <MenuItem value="">
                  <em>All Months</em>
                </MenuItem>
                {Array.from({ length: 12 }).map((_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString("default", { month: "long" })}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {/* DATE */}
            <Box sx={{ minWidth: 220, flex: 1 }}>
              <Typography sx={{ fontWeight: "bold", mb: 1, fontSize: 14 }}>
                Date
              </Typography>
              <Select
                fullWidth
                size="small"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={!selectedMonth}
              >
                <MenuItem value="">
                  <em>All Dates</em>
                </MenuItem>
                {availableDates.map((date) => (
                  <MenuItem key={date} value={date}>
                    {formatDate(date)}
                  </MenuItem>
                ))}
              </Select>

            </Box>

          </Box>


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
        <TableContainer
          component={Paper}
          sx={{
            width: "100%",
            border: `1px solid ${borderColor}`,
          }}
        >
          <Table size="small">

            {/* ===== TOP HEADER WITH FILTERS ===== */}
            <TableHead>

              {/* COLUMN HEADERS */}
              <TableRow>
                {[
                  "#",
                  "Campus",
                  "Date",
                  "Building",
                  "Room",
                  "Start",
                  "End",
                  "Proctor",
                  "Room Slot",
                  ...(showActionColumn ? ["Actions"] : []),
                ].map((header) => (
                  <TableCell
                    key={header}
                    align="center"
                    sx={{
                      border: `1px solid ${borderColor}`,
                      fontWeight: "600",
                      fontSize: "0.9rem",
                    }}
                  >
                    {header}
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
                <TableRow key={`${s.id}-${s.day_description}`}>
                  <TableCell align="center" sx={cellStyle}>{index + 1}</TableCell>
                  <TableCell align="center" sx={cellStyle}>{getBranchLabel(s.branch)}</TableCell>
                  <TableCell align="center" sx={cellStyle}>{formatDate(s.day_description)}</TableCell>
                  <TableCell align="center" sx={cellStyle}>{s.building_description}</TableCell>
                  <TableCell align="center" sx={cellStyle}>{s.room_description}</TableCell>
                  <TableCell align="center" sx={cellStyle}> {formatTime(s.start_time)}</TableCell>
                  <TableCell align="center" sx={cellStyle}>{formatTime(s.end_time)}</TableCell>
                  <TableCell align="center" sx={cellStyle} >{s.proctor}</TableCell>
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
                            onClick={() => {
                              setScheduleToDelete(s);
                              setOpenDeleteDialog(true);
                            }}
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
        open={openUpdateDialog}
        onClose={() => setOpenUpdateDialog(false)}
      >
        <DialogTitle>Confirm Update</DialogTitle>
        <DialogContent>
          <Typography>
            Do you want to modify and save the schedule?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            variant="outlined"
            onClick={() => setOpenUpdateDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setOpenUpdateDialog(false);
              handleSaveSchedule();
            }}
          >
            Yes, Update
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeleteDialog}
        onClose={() => { setOpenDeleteDialog(false); setScheduleToDelete(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle
          sx={{
            background: headerColor,
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
            <strong>{scheduleToDelete?.building_description || "N/A"}</strong> on{" "}
            <strong>{formatDate(scheduleToDelete?.day_description)}</strong>?
          </Typography>

          <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
            Deleting this schedule will permanently remove it from the system.
            <br />
            Applicants assigned to this exam schedule may need to be rescheduled.
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
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              if (!scheduleToDelete) return;
              try {
                await axios.delete(
                  `${API_BASE_URL}/api/delete_exam_schedule/${scheduleToDelete.schedule_id}`,
                  getAuditConfigForPage(),
                );
                setSchedules((prev) => prev.filter((s) => s.schedule_id !== scheduleToDelete.schedule_id));
                setSnackbarMessage("Schedule deleted ✅");
                setSnackbarSeverity("success");
                setOpenSnackbar(true);
              } catch (err) {
                console.error(err);
                setSnackbarMessage(err.response?.data?.error || "Delete failed ❌");
                setSnackbarSeverity("error");
                setOpenSnackbar(true);
              }
              setOpenDeleteDialog(false);
              setScheduleToDelete(null);
            }}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openFormDialog}
        onClose={() => {
          setOpenFormDialog(false);
          resetScheduleForm();
        }}
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
          {editingSchedule ? "Edit Entrance Exam Schedule" : "New Entrance Exam Schedule"}
        </DialogTitle>

        {/* CONTENT */}
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2}>

            {/* ===== LOCATION ===== */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, mt: 1 }}>
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
                Entrance Examination Date
              </Typography>
              <DateField
                fullWidth
                label="Exam Date"
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
                onChange={(e) => setBuildingName(e.target.value)}
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

            {/* ===== PROCTOR ===== */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, }}>
                Proctor Full Name
              </Typography>

              <TextField
                fullWidth
                label="Proctor"
                value={proctor}
                onChange={(e) => setProctor(e.target.value)}
              />
            </Grid>

            {/* ===== ROOM CAPACITY ===== */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1, }}>
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
            onClick={() => {
              setOpenFormDialog(false);
              resetScheduleForm();
            }}
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
              onClick={() => {
                if (editingSchedule) {
                  setOpenUpdateDialog(true);
                } else {
                  handleSaveSchedule();
                }
              }}
            >
              <SaveIcon fontSize="small" /> Save
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EntranceExamRoomAssignment;
