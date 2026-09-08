import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Card,
  Paper,
  Grid,
  Snackbar,
  Alert,
  TableContainer,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
} from "@mui/material";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import API_BASE_URL from "../apiConfig";
import SchoolIcon from "@mui/icons-material/School";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import PeopleIcon from "@mui/icons-material/People";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import KeyIcon from "@mui/icons-material/Key";
import CampaignIcon from "@mui/icons-material/Campaign";
import { useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const RoomRegistration = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  const branches = settings?.branches || [];

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff"); // ✅ NEW
  const [stepperColor, setStepperColor] = useState("#000000"); // ✅ NEW

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
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton); // ✅ NEW
    if (colors.stepper) setStepperColor(colors.stepper); // ✅ NEW

    // 🏫 Logo
    if (assets.logoUrl) {
      setFetchedLogo(assets.logoUrl);
    } else {
      setFetchedLogo(null);
    }

    // 🏷️ School Information
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);

  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const pageId = 52;

  const [employeeID, setEmployeeID] = useState("");
  const permissionHeaders = {
    headers: {
      ...getFlatAuditHeaders(),
      "x-employee-id": employeeID,
      "x-page-id": pageId,
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
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`,
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
      if (error.response && error.response.data.message) {
        console.log(error.response.data.message);
      } else {
        console.log("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };


  // 🔹 Room management states
  const [roomName, setRoomName] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [roomList, setRoomList] = useState([]);
  const [editingRoom, setEditingRoom] = useState(null);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const [floor, setFloor] = useState("");
  const [type, setType] = useState("");
  const [branch, setBranch] = useState(1);
  const [isAircon, setIsAircon] = useState(0);

  const [selectedBranch, setSelectedBranch] = useState("");

  const fetchRoomList = async (branchId = "") => {
    try {
      const url = branchId
        ? `${API_BASE_URL}/api/room_list?branch=${branchId}`
        : `${API_BASE_URL}/api/room_list`;

      const res = await axios.get(url);
      setRoomList(res.data);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    }
  };

  useEffect(() => {
    fetchRoomList();
  }, []);

  const handleAddRoom = async () => {
    if (!roomName.trim() || !floor) {
      setSnack({
        open: true,
        message: "Room name and floor are required",
        severity: "warning",
      });
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/adding_room`,
        {
          room_description: roomName,
          building_description: buildingName,
          floor,
          is_airconditioned: isAircon,
          type,
          branch,
          updated_by: employeeID,
        },
        permissionHeaders,
      );

      setSnack({
        open: true,
        message: "Room successfully added",
        severity: "success",
      });

      setRoomName("");
      setBuildingName("");
      setFloor("");
      fetchRoomList();
    } catch (err) {
      console.error("Error adding room:", err);
      setSnack({
        open: true,
        message: err.response?.data?.message || "Failed to add room",
        severity: "error",
      });
    }
  };

  // 🔹 Add search state
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");

  // 🔹 Filtered rooms based on search
  const filteredRooms = roomList
    .filter(
      (room) =>
        room.room_description
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (room.building_description || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
    )
    .filter((room) =>
      selectedBranch ? room.branch === Number(selectedBranch) : true,
    )
    .filter((room) =>
      selectedBuilding ? room.building_description === selectedBuilding : true,
    )
    .filter((room) =>
      selectedRoom ? room.room_description === selectedRoom : true,
    );

  // 🔹 Pagination State
  const [roomPage, setRoomPage] = useState(1);
  const roomsPerPage = 20;

  const totalRoomPages = Math.ceil(filteredRooms.length / roomsPerPage);

  const paginatedRooms = filteredRooms.slice(
    (roomPage - 1) * roomsPerPage,
    roomPage * roomsPerPage,
  );

  const paginationButtonStyle = {
    minWidth: 70,
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
  };

  const paginationSelectStyle = {
    fontSize: "12px",
    height: 36,
    color: "white",
    border: "1px solid white",
    backgroundColor: "transparent",
    ".MuiOutlinedInput-notchedOutline": { borderColor: "white" },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
    "& svg": { color: "white" },
  };

  const resetRoomForm = () => {
    setEditingRoom(null);
    setRoomName("");
    setBuildingName("");
    setFloor("");
    setType("");
    setBranch(1);
    setIsAircon(0);
  };

  const handleCloseFormDialog = () => {
    setOpenFormDialog(false);
    setOpenUpdateDialog(false);
    resetRoomForm();
  };

  const handleEditRoom = (room) => {
    setEditingRoom(room);
    setBuildingName(room.building_description || "");
    setRoomName(room.room_description || "");
    setFloor(room.floor || "");
    setType(room.type || "");
    setBranch(room.branch || 1);
    setIsAircon(room.is_airconditioned || 0);

    setOpenFormDialog(true);
  };

  // 🔹 Update room
  const handleUpdateRoom = async () => {
    if (!editingRoom) return;

    try {
      await axios.put(
        `${API_BASE_URL}/api/update_room/${editingRoom.room_id}`,
        {
          room_description: roomName,
          building_description: buildingName,
          floor,
          is_airconditioned: isAircon,
          type,
          branch,
          updated_by: employeeID,
        },
        permissionHeaders,
      );

      setSnack({
        open: true,
        message: "Room updated successfully",
        severity: "success",
      });

      handleCloseFormDialog();
      await fetchRoomList();
    } catch (err) {
      console.error("Error updating room:", err);
      setSnack({
        open: true,
        message: err.response?.data?.message || "Failed to update",
        severity: "error",
      });
    }
  };

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);

  // 🔹 Delete room (automatic, no confirm)
  const handleDeleteRoom = async (roomId) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/api/delete_room/${roomId}`,
        permissionHeaders,
      );
      setSnack({
        open: true,
        message: "Room deleted successfully",
        severity: "success",
      });
      fetchRoomList();
    } catch (err) {
      console.error("Error deleting room:", err);
      setSnack({
        open: true,
        message: "Failed to delete room",
        severity: "error",
      });
    }
  };

  // 🔹 Close snackbar
  const handleCloseSnack = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  const [openTypeDialog, setOpenTypeDialog] = useState(false);
  const [newType, setNewType] = useState("");
  const [roomTypes, setRoomTypes] = useState(["Lecture", "Laboratory"]);

  const AIRCON_OPTIONS = [
    { value: 0, label: "No" },
    { value: 1, label: "Yes" },
  ];

  // 🔹 Loading / Unauthorized states
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
  const showActionColumn = canEdit || canDelete;

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
          ROOM REGISTRATION
        </Typography>


        <TextField
          fullWidth
          size="small"
          placeholder="Search by Room or Building..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            width: 450,
            backgroundColor: "#fff",
            borderRadius: 1,
            mb: 2,
            mt: 1,
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
                  <Typography sx={{ fontWeight: "bold", color: "white", marginLeft: "15px" }}>
                    Room Registered
                  </Typography>

                  {/* RIGHT SIDE BUTTON */}
                  {showCreateActions && (
                    <Button
                      variant="contained"
                      onClick={() => setOpenFormDialog(true)}
                      sx={{
                        backgroundColor: "#1976d2", // ✅ Blue
                        color: "#fff",
                        fontWeight: "bold",
                        borderRadius: "8px",
                        width: "250px",
                        textTransform: "none",
                        px: 2,
                        "&:hover": {
                          backgroundColor: "#1565c0", // darker blue hover
                        },
                      }}
                    >
                      + Add Room
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
        <Box
          sx={{
            border: `1px solid ${borderColor}`,
            borderRadius: 2,
            p: 3,
            mb: 3,
            display: "flex",
            gap: 3,
            flexWrap: "wrap",
            backgroundColor: "#fafafa",
          }}
        >
          {/* 🔹 BRANCH */}
          <Box sx={{ minWidth: 220, flex: 1 }}>
            <Typography
              sx={{
                fontWeight: "bold",
                mb: 1,
                fontSize: 14,
              }}
            >
              Branch
            </Typography>

            <Select
              fullWidth
              size="small"
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                fetchRoomList(e.target.value);
                setRoomPage(1);
              }}
            >
              <MenuItem value="">
                <em>All Branches</em>
              </MenuItem>

              {branches.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.branch}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* 🔹 BUILDING */}
          <Box sx={{ minWidth: 220, flex: 1 }}>
            <Typography
              sx={{
                fontWeight: "bold",
                mb: 1,
                fontSize: 14,
              }}
            >
              Building
            </Typography>

            <Select
              fullWidth
              size="small"
              value={selectedBuilding}
              onChange={(e) => {
                setSelectedBuilding(e.target.value);
                setRoomPage(1);
              }}
            >
              <MenuItem value="">
                <em>All Buildings</em>
              </MenuItem>

              {[...new Set(roomList.map((r) => r.building_description))].map(
                (bld, idx) => (
                  <MenuItem key={idx} value={bld}>
                    {bld}
                  </MenuItem>
                ),
              )}
            </Select>
          </Box>

          {/* 🔹 ROOM */}
          <Box sx={{ minWidth: 220, flex: 1 }}>
            <Typography
              sx={{
                fontWeight: "bold",
                mb: 1,
                fontSize: 14,
              }}
            >
              Room
            </Typography>

            <Select
              fullWidth
              size="small"
              value={selectedRoom}
              onChange={(e) => {
                setSelectedRoom(e.target.value);
                setRoomPage(1);
              }}
            >
              <MenuItem value="">
                <em>All Rooms</em>
              </MenuItem>

              {roomList.map((room) => (
                <MenuItem key={room.room_id} value={room.room_description}>
                  {room.room_description}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Box>
        <hr />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  colSpan={8}
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
                    gap={1}
                  >
                    {/* LEFT SIDE */}
                    <Typography
                      fontSize="14px"
                      fontWeight="bold"
                      color="white"
                    >
                      Total Rooms Records: {filteredRooms.length}
                    </Typography>

                    {/* RIGHT SIDE */}
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      flexWrap="wrap"
                    >
                      <Button
                        onClick={() => setRoomPage(1)}
                        disabled={roomPage === 1}
                        variant="outlined"
                        size="small"
                        sx={paginationButtonStyle}
                      >
                        First
                      </Button>

                      <Button
                        onClick={() =>
                          setRoomPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={roomPage === 1}
                        variant="outlined"
                        size="small"
                        sx={paginationButtonStyle}
                      >
                        Prev
                      </Button>

                      <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select
                          value={roomPage}
                          onChange={(e) =>
                            setRoomPage(Number(e.target.value))
                          }
                          sx={paginationSelectStyle}
                          MenuProps={{
                            PaperProps: { sx: { maxHeight: 200 } },
                          }}
                        >
                          {Array.from({ length: totalRoomPages }, (_, i) => (
                            <MenuItem key={i + 1} value={i + 1}>
                              Page {i + 1}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Typography fontSize="11px" color="white">
                        of {totalRoomPages} page
                        {totalRoomPages > 1 ? "s" : ""}
                      </Typography>

                      <Button
                        onClick={() =>
                          setRoomPage((prev) =>
                            Math.min(prev + 1, totalRoomPages),
                          )
                        }
                        disabled={roomPage === totalRoomPages}
                        variant="outlined"
                        size="small"
                        sx={paginationButtonStyle}
                      >
                        Next
                      </Button>

                      <Button
                        onClick={() => setRoomPage(totalRoomPages)}
                        disabled={roomPage === totalRoomPages}
                        variant="outlined"
                        size="small"
                        sx={paginationButtonStyle}
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
        <Box sx={{ overflowY: "auto" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    border: `1px solid ${borderColor}`,
                    backgroundColor: "#f5f5f5",
                    color: "black",
                  }}
                >
                  Room ID
                </TableCell>
                <TableCell
                  sx={{
                    border: `1px solid ${borderColor}`,
                    backgroundColor: "#f5f5f5",
                    color: "black",
                  }}
                >
                  Building
                </TableCell>
                <TableCell
                  sx={{
                    border: `1px solid ${borderColor}`,
                    backgroundColor: "#f5f5f5",
                    color: "black",
                  }}
                >
                  Room Name
                </TableCell>

                {/* ✅ NEW */}
                <TableCell
                  sx={{
                    border: `1px solid ${borderColor}`,
                    backgroundColor: "#f5f5f5",
                    color: "black",
                  }}
                >
                  Floor
                </TableCell>
                <TableCell
                  sx={{
                    border: `1px solid ${borderColor}`,
                    backgroundColor: "#f5f5f5",
                    color: "black",
                  }}
                >
                  Type
                </TableCell>
                <TableCell
                  sx={{
                    border: `1px solid ${borderColor}`,
                    backgroundColor: "#f5f5f5",
                    color: "black",
                  }}
                >
                  Branch
                </TableCell>
                <TableCell
                  sx={{
                    border: `1px solid ${borderColor}`,
                    backgroundColor: "#f5f5f5",
                    color: "black",
                  }}
                >
                  Aircon
                </TableCell>

                {showActionColumn && (
                  <TableCell
                    sx={{
                      border: `1px solid ${borderColor}`,
                      backgroundColor: "#f5f5f5",
                      color: "black",
                    }}
                  >
                    Actions
                  </TableCell>
                )}
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
              {paginatedRooms.map((room, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                    {index + 1}
                  </TableCell>

                  <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                    {room.building_description || "N/A"}
                  </TableCell>

                  <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                    {room.room_description}
                  </TableCell>

                  {/* ✅ NEW COLUMNS */}

                  <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                    {room.floor || "N/A"}
                  </TableCell>

                  <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                    {room.type || "N/A"}
                  </TableCell>

                  <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                    {branches.find((b) => b.id === Number(room.branch))
                      ?.branch || "N/A"}
                  </TableCell>

                  <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                    {AIRCON_OPTIONS.find(
                      (a) => a.value === Number(room.is_airconditioned),
                    )?.label || "N/A"}
                  </TableCell>

                  {showActionColumn && (
                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",

                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "10px", // space between buttons
                      }}
                    >
                      {canEdit && (
                        <Button
                          variant="contained"
                          size="small"
                          sx={{
                            backgroundColor: "green",
                            color: "white",
                            borderRadius: "5px",
                            padding: "8px 14px",
                            width: "100px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px",
                          }}
                          onClick={() => handleEditRoom(room)}
                        >
                          <EditIcon fontSize="small" /> Edit
                        </Button>
                      )}

                      {canDelete && (
                        <Button
                          variant="contained"
                          size="small"
                          sx={{
                            backgroundColor: "#9E0000",
                            color: "white",
                            borderRadius: "5px",
                            padding: "8px 14px",
                            width: "100px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px",
                          }}
                          onClick={() => {
                            setRoomToDelete(room);
                            setOpenDeleteDialog(true);
                          }}
                        >
                          <DeleteIcon fontSize="small" /> Delete
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  colSpan={8}
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
                    gap={1}
                  >
                    {/* LEFT SIDE */}
                    <Typography
                      fontSize="14px"
                      fontWeight="bold"
                      color="white"
                    >
                      Total Rooms Records: {filteredRooms.length}
                    </Typography>

                    {/* RIGHT SIDE */}
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      flexWrap="wrap"
                    >
                      <Button
                        onClick={() => setRoomPage(1)}
                        disabled={roomPage === 1}
                        variant="outlined"
                        size="small"
                        sx={paginationButtonStyle}
                      >
                        First
                      </Button>

                      <Button
                        onClick={() =>
                          setRoomPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={roomPage === 1}
                        variant="outlined"
                        size="small"
                        sx={paginationButtonStyle}
                      >
                        Prev
                      </Button>

                      <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select
                          value={roomPage}
                          onChange={(e) =>
                            setRoomPage(Number(e.target.value))
                          }
                          sx={paginationSelectStyle}
                          MenuProps={{
                            PaperProps: { sx: { maxHeight: 200 } },
                          }}
                        >
                          {Array.from({ length: totalRoomPages }, (_, i) => (
                            <MenuItem key={i + 1} value={i + 1}>
                              Page {i + 1}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Typography fontSize="11px" color="white">
                        of {totalRoomPages} page
                        {totalRoomPages > 1 ? "s" : ""}
                      </Typography>

                      <Button
                        onClick={() =>
                          setRoomPage((prev) =>
                            Math.min(prev + 1, totalRoomPages),
                          )
                        }
                        disabled={roomPage === totalRoomPages}
                        variant="outlined"
                        size="small"
                        sx={paginationButtonStyle}
                      >
                        Next
                      </Button>

                      <Button
                        onClick={() => setRoomPage(totalRoomPages)}
                        disabled={roomPage === totalRoomPages}
                        variant="outlined"
                        size="small"
                        sx={paginationButtonStyle}
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


      <br />
      <br />

      <Dialog
        open={openFormDialog}
        onClose={handleCloseFormDialog}
        maxWidth="md"
        fullWidth
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
            fontSize: "1.2rem",
            py: 2,
          }}
        >
          {editingRoom ? "Edit Room Information" : "New Room Registration"}
        </DialogTitle>

        {/* CONTENT */}
        <DialogContent sx={{ p: 3 }}>
          {/* LOCATION SECTION */}
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ mb: 2, mt: 1 }}
          >
            Location Details
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Branch"
                value={branch}
                onChange={(e) => setBranch(Number(e.target.value))}
              >
                {branches.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.branch}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={8}>
              <TextField
                fullWidth
                label="Building Name"
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
              />
            </Grid>

            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Floor"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
              />
            </Grid>
          </Grid>

          {/* ROOM SECTION */}
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ mt: 4, mb: 2 }}
          >
            Room Details
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Room Name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                label="Room Type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <MenuItem value="Lecture">Lecture</MenuItem>
                <MenuItem value="Laboratory">Laboratory</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                label="Airconditioned"
                value={isAircon}
                onChange={(e) => setIsAircon(Number(e.target.value))}
              >
                {AIRCON_OPTIONS.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
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
            onClick={handleCloseFormDialog}
            color="error"
            variant="outlined"
          >
            Cancel
          </Button>

          {(showCreateActions || (editingRoom && canEdit)) && (
            <Button
              variant="contained"
              sx={{
                px: 4,
                fontWeight: 600,
                textTransform: "none",
              }}
              onClick={() => {
                if (editingRoom) {
                  setOpenUpdateDialog(true);
                } else {
                  handleAddRoom();
                  handleCloseFormDialog();
                }
              }}
            >
              <SaveIcon fontSize="small" /> Save
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={openTypeDialog} onClose={() => setOpenTypeDialog(false)}>
        <DialogTitle>Add New Room Type</DialogTitle>

        <DialogContent>
          <TextField
            fullWidth
            label="Room Type Name"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>

        <DialogActions>
          <Button
            color="error"
            variant="outlined"
            onClick={() => setOpenTypeDialog(false)}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={() => {
              if (!newType.trim()) return;

              const updatedTypes = [...roomTypes, newType.trim()];
              setRoomTypes(updatedTypes);
              setType(newType.trim()); // auto select
              setNewType("");
              setOpenTypeDialog(false);
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeleteDialog}
        onClose={() => {
          setOpenDeleteDialog(false);
          setRoomToDelete(null);
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
          Delete Room
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete the room{" "}
            <b>{roomToDelete?.room_description}</b> from building{" "}
            <b>{roomToDelete?.building_description || "N/A"}</b>?
          </Typography>

          <Typography
            sx={{
              color: "#d32f2f",
              fontSize: "0.95rem",
            }}
          >
            Deleting this room will permanently remove it from the room list.
            <br />
            Any schedules, room assignments, or records referencing this room may be
            affected.
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
              setOpenDeleteDialog(false);
              setRoomToDelete(null);
            }}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={() => {
              handleDeleteRoom(roomToDelete.room_id);
              setOpenDeleteDialog(false);
              setRoomToDelete(null);
            }}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openUpdateDialog}
        onClose={() => setOpenUpdateDialog(false)}
      >
        <DialogTitle>Confirm Update Room</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to update the room{" "}
            <b>{editingRoom?.room_description}</b> in building{" "}
            <b>{editingRoom?.building_description || "N/A"}</b>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            variant="outlined"
            onClick={() => setOpenUpdateDialog(false)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              setOpenUpdateDialog(false); // close first
              await handleUpdateRoom();
            }}
          >
            Yes, Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* ✅ Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={handleCloseSnack}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={handleCloseSnack}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RoomRegistration;
