import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import EaristLogo from "../assets/EaristLogo.png";
import axios from "axios";
import {
  Box,
  Button,
  Select,
  MenuItem,
  Typography,
  Paper,
  Grid,
  Snackbar,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  Alert,
  TextField,
  FormControl,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import SaveIcon from "@mui/icons-material/Save";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";


const DprtmntRoom = () => {
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

  // 🧠 Snackbar State
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // 🎓 Data States
  const [room, setRoom] = useState({ room_id: "", dprtmnt_id: "" });
  const [assignedRoomIds, setAssignedRoomIds] = useState([]);
  const [departmentList, setDepartmentList] = useState([]);
  const [roomList, setRoomList] = useState([]);
  const [assignedRooms, setAssignedRooms] = useState({});

  // 🪟 Assign Room Modal
  const [openModal, setOpenModal] = useState(false);

  // 🔐 Access Control
  const [userID, setUserID] = useState("");
  const [userRole, setUserRole] = useState("");
  const [employeeID, setEmployeeID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const pageId = 22;

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
    if (colors.title) setTitleColor(colors.title);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
  }, [settings]);

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedUser && storedRole && storedID) {
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
      if (Number(response.data?.page_privilege) === 1) {
        setHasAccess(true);
        setCanCreate(Number(response.data?.can_create) === 1);
        setCanDelete(Number(response.data?.can_delete) === 1);
      } else {
        setHasAccess(false);
        setCanCreate(false);
        setCanDelete(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
      setCanCreate(false);
      setCanDelete(false);
    }
  };

  const fetchDepartment = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/get_department`);
      setDepartmentList(response.data);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  const fetchRoomList = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/room_list`);
      setRoomList(response.data);
    } catch (err) {
      console.log("Error fetching room list:", err);
    }
  };

  const fetchRoomAssignments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/assignments`);
      const assignments = response.data;

      const groupedAssignments = assignments.reduce((acc, assignment) => {
        const deptId = assignment.dprtmnt_id;
        if (!acc[deptId]) acc[deptId] = [];
        acc[deptId].push({
          room_id: assignment.dprtmnt_room_id,
          room_description: assignment.room_description,
        });
        return acc;
      }, {});

      const assignedIds = assignments.map((a) => a.room_id || a.dprtmnt_room_id);
      setAssignedRoomIds(assignedIds);
      setAssignedRooms(groupedAssignments);
    } catch (err) {
      console.error("Error fetching assignments:", err);
    }
  };

  useEffect(() => {
    fetchDepartment();
    fetchRoomList();
    fetchRoomAssignments();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setRoom((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAssignRoom = async () => {
    if (!room.room_id || !room.dprtmnt_id) {
      setSnackbar({
        open: true,
        message: "Please fill all fields",
        severity: "warning",
      });
      return;
    }

    if (!canCreate) {
      setSnackbar({
        open: true,
        message: "You do not have permission to create items on this page.",
        severity: "error",
      });
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/api/assign`, room, getAuditHeaders());
      fetchRoomAssignments();
      setRoom({ room_id: "", dprtmnt_id: "" });
      setOpenModal(false);

      setSnackbar({
        open: true,
        message: "Room assigned successfully!",
        severity: "success",
      });
    } catch (err) {
      console.log("Error assigning room:", err);
      setSnackbar({
        open: true,
        message: "Failed to assign room. Please try again.",
        severity: "error",
      });
    }
  };


  const [openUnassignDialog, setOpenUnassignDialog] = useState(false);
  const [roomToUnassign, setRoomToUnassign] = useState(null);


  const handleUnassignRoom = async (dprtmnt_room_id) => {
    if (!canDelete) {
      setSnackbar({
        open: true,
        message: "You do not have permission to delete items on this page.",
        severity: "error",
      });
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/unassign/${dprtmnt_room_id}`, getAuditHeaders());
      fetchRoomAssignments();

      setSnackbar({
        open: true,
        message: "Room unassigned successfully!",
        severity: "info",
      });
    } catch (err) {
      console.log("Error unassigning room:", err);
      setSnackbar({
        open: true,
        message: "Failed to unassign room.",
        severity: "error",
      });
    }
  };

  // 🔎 Search (Department Name / Assigned Room)
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDepartmentList = departmentList.filter((dept) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    const nameMatch = dept.dprtmnt_name?.toLowerCase().includes(q);
    const roomMatch = (assignedRooms[dept.dprtmnt_id] || []).some((r) =>
      String(r.room_description ?? "").toLowerCase().includes(q)
    );
    return nameMatch || roomMatch;
  });

  // 📄 Pagination (same behavior as Department Registration / Program Panel)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const totalPages = Math.ceil(filteredDepartmentList.length / itemsPerPage) || 1;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDepartmentList = filteredDepartmentList.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

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


  const showCreateActions = canCreate;

  const paginationBar = (
    <TableContainer component={Paper} sx={{ width: "100%" }}>
      <Table size="small">
        <TableHead sx={{ backgroundColor: headerColor, color: "white" }}>
          <TableRow>
            <TableCell
              sx={{
                border: `1px solid ${borderColor}`,
                py: 0.5,
                backgroundColor: headerColor,
                color: "white",
              }}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                sx={{ padding: "6px" }}
              >
                {/* LEFT SIDE - TOTAL DEPARTMENTS */}
                <Typography fontSize="14px" fontWeight="bold" color="white">
                  Total Department Records: {filteredDepartmentList.length}
                </Typography>

                {/* RIGHT SIDE - PAGINATION */}
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

                  {/* Page Dropdown */}
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

                  {/* Next & Last */}
                  <Button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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
  );

  return (
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}
        >
          DEPARTMENT ROOM PANEL
        </Typography>

        <TextField
          variant="outlined"
          placeholder="Search Department / Assigned Room"
          size="small"
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
            startAdornment: <SearchIcon sx={{ mr: 1, color: "gray" }} />,
          }}
        />
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />

      <br />
      <br />

      {/* Total Records + Pagination Bar (same style as Department Registration / Program Panel) */}
      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: headerColor, color: "white" }}>
            <TableRow>
              <TableCell
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor,
                  color: "white",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  sx={{ padding: "6px" }}
                >
                  {/* LEFT SIDE - TOTAL DEPARTMENTS */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Department Records: {filteredDepartmentList.length}
                  </Typography>

                  {/* RIGHT SIDE - PAGINATION */}
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

                    {/* Page Dropdown */}
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

                    {/* Next & Last */}
                    <Button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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

                    {showCreateActions && (
                      <Button
                        variant="contained"
                        sx={{
                          backgroundColor: "#1976d2",
                          color: "#fff",
                          fontWeight: "bold",
                          borderRadius: "8px",
                          width: "250px",
                          textTransform: "none",
                          px: 2,
                          mr: "15px",
                          "&:hover": {
                            backgroundColor: "#1565c0",
                          },
                        }}
                        onClick={() => {
                          setRoom({ room_id: "", dprtmnt_id: "" });
                          setOpenModal(true);
                        }}
                      >
                        + Assign Room
                      </Button>
                    )}
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>



      <Box
        sx={{
          backgroundColor: "white",
          border: `2px solid ${borderColor}`,

          padding: 2,

        }}
      >
        <Grid container spacing={1}>
          {currentDepartmentList.map((dept) => (
            <Grid item xs={12} md={4} key={dept.dprtmnt_id}>
              <Paper elevation={2} style={{ padding: "10px", border: `2px solid ${borderColor}` }}>
                <Typography variant="subtitle2" style={{ fontSize: "14px", marginBottom: "8px" }}>
                  {dept.dprtmnt_name}
                </Typography>

                <Box display="flex" flexWrap="wrap" gap={0.5}>
                  {assignedRooms[dept.dprtmnt_id]?.length > 0 ? (
                    assignedRooms[dept.dprtmnt_id].map((room) => (
                      <Box
                        key={room.room_id}
                        sx={{
                          backgroundColor: mainButtonColor,
                          color: "white",
                          borderRadius: "4px",
                          padding: "6px 8px",
                          fontSize: "12px",
                          position: "relative",
                        }}
                      >
                        Room {room.room_description}
                        {canDelete && (
                          <Button
                            onClick={() => {
                              setRoomToUnassign({
                                id: room.room_id || room.dprtmnt_room_id,
                                description: room.room_description,
                              });
                              setOpenUnassignDialog(true);
                            }}
                            size="small"
                            sx={{
                              position: "absolute",
                              top: "-6px",
                              right: "-6px",
                              minWidth: "22px",
                              height: "22px",
                              padding: "0",
                              color: "white",
                              backgroundColor: "rgba(0,0,0,0.4)",
                              borderRadius: "50%",
                              fontSize: "14px",
                              "&:hover": { backgroundColor: "rgba(0,0,0,0.6)" },
                            }}
                          >
                            ×
                          </Button>
                        )}
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" style={{ fontSize: "12px" }}>
                      No rooms assigned.
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
      {filteredDepartmentList.length === 0 && (
        <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
          <Typography fontSize="16px">No departments found.</Typography>
        </Box>
      )}

      {filteredDepartmentList.length > 0 && (
        <>

          {paginationBar}
        </>
      )}

      {/* Assign Room Modal (same styling as Department Registration's Add/Edit modal) */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: 6,
          },
        }}
      >
        {/* HEADER */}
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.1rem",
            py: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Assign Room

          <IconButton
            onClick={() => setOpenModal(false)}
            sx={{ color: "white" }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* CONTENT */}
        <DialogContent sx={{ p: 3 }}>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Typography fontWeight="bold" mt={2}>
              Room:
            </Typography>

            <Select
              name="room_id"
              value={room.room_id}
              onChange={handleChange}
              displayEmpty
              fullWidth
            >
              <MenuItem value="">
                <em>Select Available Room</em>
              </MenuItem>
              {roomList
                .filter((r) => !assignedRoomIds.includes(r.room_id))
                .map((r) => (
                  <MenuItem key={r.room_id} value={r.room_id}>
                    {r.room_description}
                  </MenuItem>
                ))}
            </Select>

            <Typography fontWeight="bold" mt={1}>
              Department:
            </Typography>

            <Select
              name="dprtmnt_id"
              value={room.dprtmnt_id}
              onChange={handleChange}
              displayEmpty
              fullWidth
            >
              <MenuItem value="">
                <em>Select Department</em>
              </MenuItem>
              {departmentList.map((dept) => (
                <MenuItem key={dept.dprtmnt_id} value={dept.dprtmnt_id}>
                  {dept.dprtmnt_name}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </DialogContent>

        {/* ACTIONS */}
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e0e0e0",
          }}
        >
          <Button
            color="error"
            variant="outlined"
            sx={{
              textTransform: "none",
              fontWeight: 600,
            }}
            onClick={() => setOpenModal(false)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            sx={{
              px: 4,
              fontWeight: 600,
              textTransform: "none",
            }}
            onClick={handleAssignRoom}
          >
            <SaveIcon fontSize="small" style={{ marginRight: 6 }} />
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unassign Confirmation Dialog */}
      <Dialog
        open={openUnassignDialog}
        onClose={() => {
          setOpenUnassignDialog(false);
          setRoomToUnassign(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: 6,
          },
        }}
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
          Unassign Room
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to unassign{" "}
            <b>Room {roomToUnassign?.description}</b> from this department?
          </Typography>

          <Typography
            sx={{
              color: "#d32f2f",
              fontSize: "0.95rem",
            }}
          >
            Unassigning this room will remove its association with the selected
            department.
            <br />
            Any schedules, room allocations, or department records relying on this
            assignment may be affected.
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e0e0e0",
          }}
        >
          <Button
            color="error"
            variant="outlined"
            onClick={() => {
              setOpenUnassignDialog(false);
              setRoomToUnassign(null);
            }}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={() => {
              handleUnassignRoom(roomToUnassign.id);
              setOpenUnassignDialog(false);
              setRoomToUnassign(null);
            }}
          >
            Yes, Unassign
          </Button>
        </DialogActions>
      </Dialog>


      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DprtmntRoom;
