import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Chip,
  TableContainer,
  Paper,
  FormControl,
  Select,
  TableHead,
  TableCell,
  TableRow,
  Table,
  MenuItem,
  TextField,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../apiConfig";
import DateField from "../components/DateField";

const QualifyingInterviewRoomAssignment = () => {
  const navigate = useNavigate();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";

  const [titleColor, setTitleColor] = useState("#000000");
  const [borderColor, setBorderColor] = useState("#000000");

  const [schedules, setSchedules] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [buildingList, setBuildingList] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState("");

  const [schoolYears, setSchoolYears] = useState([]);
  const [schoolSemester, setSchoolSemester] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedSchoolSemester, setSelectedSchoolSemester] = useState("");
  const [person, setPerson] = useState({
    fromDate: "",
    toDate: "",
    fromTime: "",
    toTime: "",
  });

  const branches = settings?.branches || [];

  const [selectedBranch, setSelectedBranch] = useState("");

  useEffect(() => {
    if (!settings) return;
    setTitleColor(colors.title || "#000000");
    setBorderColor(colors.border || "#000000");
  }, [settings]);

  const getOfficialOccupancy = (schedule) =>
    Number(schedule?.official_occupancy ?? schedule?.current_occupancy ?? 0);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const yearsRes = await axios.get(`${API_BASE_URL}/api/get_school_year/`);
        setSchoolYears(yearsRes.data);

        const semRes = await axios.get(`${API_BASE_URL}/api/get_school_semester/`);
        setSchoolSemester(semRes.data);

        const activeRes = await axios.get(`${API_BASE_URL}/api/active_school_year`);
        if (activeRes.data.length > 0) {
          setSelectedSchoolYear(activeRes.data[0].year_id);
          setSelectedSchoolSemester(activeRes.data[0].semester_id);
        } else {
          setSelectedSchoolYear(yearsRes.data[0]?.year_id || "");
          setSelectedSchoolSemester(semRes.data[0]?.semester_id || "");
        }
      } catch (err) {
        console.error("Error fetching school data:", err);
      }
    };
    fetchInitialData();
  }, []);

  const handleSchoolYearChange = (e) => setSelectedSchoolYear(e.target.value);
  const handleSchoolSemesterChange = (e) =>
    setSelectedSchoolSemester(e.target.value);

  // Human-readable labels for the currently selected year/semester,
  // used in the "no schedule found" empty state below.
  const selectedYearLabel = (() => {
    const sy = schoolYears.find((y) => y.year_id === selectedSchoolYear);
    return sy ? `${sy.current_year} - ${sy.next_year}` : "school year";
  })();

  const selectedSemesterLabel = (() => {
    const sem = schoolSemester.find(
      (s) => s.semester_id === selectedSchoolSemester,
    );
    return sem ? sem.semester_description : "semester";
  })();

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!selectedSchoolYear || !selectedSchoolSemester) return;

      try {
        const url = selectedBranch
          ? `${API_BASE_URL}/api/interview_schedules_with_count/${selectedSchoolYear}/${selectedSchoolSemester}?branch=${selectedBranch}`
          : `${API_BASE_URL}/api/interview_schedules_with_count/${selectedSchoolYear}/${selectedSchoolSemester}`;

        const res = await axios.get(url);
        setSchedules(res.data);
        setFilteredSchedules(res.data);

        const uniqueBuildings = [
          ...new Set(res.data.map((s) => s.building_description)),
        ];
        setBuildingList(uniqueBuildings);
      } catch (err) {
        console.error("Error fetching interview schedules:", err);
      }
    };
    fetchSchedules();
  }, [selectedSchoolYear, selectedSchoolSemester, selectedBranch]);

  useEffect(() => {
    const lowerQuery = searchQuery.toLowerCase().trim();
    const parseDateOnlyLocal = (value) => {
      if (!value) return null;
      const datePart = String(value).split("T")[0];
      const [y, m, d] = datePart.split("-").map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    };

    const filtered = schedules.filter((s) => {
      const proctor = (s.proctor || "").toLowerCase().trim();
      const interviewer = (s.interviewer || "").toLowerCase().trim();
      const building = (s.building_description || "").toLowerCase().trim();
      const room = (s.room_description || "").toLowerCase().trim();

      const matchesSearch =
        proctor.includes(lowerQuery) ||
        interviewer.includes(lowerQuery) ||
        building.includes(lowerQuery) ||
        room.includes(lowerQuery);

      const matchesBuilding =
        selectedBuilding === "" ||
        building.includes(selectedBuilding.toLowerCase().trim());

      const scheduleDate = parseDateOnlyLocal(s.day_description);
      if (!scheduleDate) return false;
      let fromDate = parseDateOnlyLocal(person.fromDate);
      let toDate = parseDateOnlyLocal(person.toDate);
      if (toDate) toDate.setHours(23, 59, 59, 999);
      if (fromDate && toDate && fromDate > toDate) {
        const swappedFrom = parseDateOnlyLocal(person.toDate);
        const swappedTo = parseDateOnlyLocal(person.fromDate);
        if (swappedTo) swappedTo.setHours(23, 59, 59, 999);
        fromDate = swappedFrom;
        toDate = swappedTo;
      }

      const matchesDate =
        (!fromDate || scheduleDate >= fromDate) &&
        (!toDate || scheduleDate <= toDate);

      const scheduleStart = s.start_time ? s.start_time.slice(0, 5) : null;
      const scheduleEnd = s.end_time ? s.end_time.slice(0, 5) : null;
      const fromTime = person.fromTime || null;
      const toTime = person.toTime || null;

      const matchesTime =
        (!fromTime || scheduleStart >= fromTime) &&
        (!toTime || scheduleEnd <= toTime);

      return matchesSearch && matchesBuilding && matchesDate && matchesTime;
    });

    setFilteredSchedules(filtered);
  }, [searchQuery, selectedBuilding, person, schedules]);

  const formatTime12 = (timeString) => {
    if (!timeString) return "";
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getOccupancyRatio = (current, quota) => {
    if (!quota || quota <= 0) return 0;
    return current / quota;
  };

  const getOccupancyColor = (current, quota) => {
    const ratio = getOccupancyRatio(current, quota);
    if (ratio >= 1) return "#d32f2f";
    if (ratio >= 0.7) return "#f57c00";
    return "#388e3c";
  };

  // Disable right-click and block common DevTools shortcuts.
  // Registered once on mount (with cleanup) instead of on every render,
  // which previously stacked up duplicate listeners on each re-render.
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const handleKeyDown = (e) => {
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
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
          QUALIFYING / INTERVIEW ROOM MANAGEMENT
        </Typography>

        <TextField
          variant="outlined"
          placeholder="Search Qualifying / Interviewer Name / Email"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            width: 450,
            backgroundColor: "#fff",
            borderRadius: 1,
            "& .MuiOutlinedInput-root": { borderRadius: "10px" },
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
              <TableCell sx={{ color: "white", textAlign: "Center" }}>
                Application Date
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <TableContainer
        component={Paper}
        sx={{
          maxWidth: "100%",
          border: `1px solid ${borderColor}`,
          p: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          {/* LEFT SIDE: Branch, School Year, Semester, Building, From Time, To Time */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography fontSize={13} sx={{ mb: 1 }}>
                Branch
              </Typography>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                >
                  <MenuItem value="">All Branches</MenuItem>
                  {branches.map((b) => (
                    <MenuItem key={b.id} value={b.branch}>
                      {b.branch}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* School Year */}
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography fontSize={13} sx={{ mb: 1 }}>
                School Year
              </Typography>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={selectedSchoolYear}
                  onChange={handleSchoolYearChange}
                >
                  {schoolYears.map((sy) => (
                    <MenuItem value={sy.year_id} key={sy.year_id}>
                      {sy.current_year} - {sy.next_year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Semester */}
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography fontSize={13} sx={{ mb: 1 }}>
                Semester
              </Typography>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={selectedSchoolSemester}
                  onChange={handleSchoolSemesterChange}
                >
                  {schoolSemester.map((sem) => (
                    <MenuItem value={sem.semester_id} key={sem.semester_id}>
                      {sem.semester_description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Building */}
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography fontSize={13} sx={{ mb: 1 }}>
                Building
              </Typography>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                >
                  <MenuItem value="">All Buildings</MenuItem>
                  {buildingList.map((bldg, i) => (
                    <MenuItem key={i} value={bldg}>
                      {bldg}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* From Time */}
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography fontSize={13} sx={{ mb: 1 }}>
                From Time
              </Typography>
              <TextField
                type="time"
                size="small"
                value={person.fromTime}
                onChange={(e) =>
                  setPerson((prev) => ({ ...prev, fromTime: e.target.value }))
                }
                sx={{ minWidth: 120 }}
              />
            </Box>

            {/* To Time */}
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography fontSize={13} sx={{ mb: 1 }}>
                To Time
              </Typography>
              <TextField
                type="time"
                size="small"
                value={person.toTime}
                onChange={(e) =>
                  setPerson((prev) => ({ ...prev, toTime: e.target.value }))
                }
                sx={{ minWidth: 120 }}
              />
            </Box>
          </Box>

          {/* RIGHT SIDE: From Date & To Date */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {/* From Date */}
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography fontSize={13} sx={{ mb: 1 }}>
                From Date
              </Typography>
              <DateField
                size="small"
                value={person.fromDate}
                onChange={(e) =>
                  setPerson((prev) => ({ ...prev, fromDate: e.target.value }))
                }
                sx={{ minWidth: 150 }}
              />
            </Box>

            {/* To Date */}
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              <Typography fontSize={13} sx={{ mb: 1 }}>
                To Date
              </Typography>
              <DateField
                size="small"
                value={person.toDate}
                onChange={(e) =>
                  setPerson((prev) => ({ ...prev, toDate: e.target.value }))
                }
                sx={{ minWidth: 150 }}
              />
            </Box>
          </Box>
        </Box>
      </TableContainer>

      <br />

      {/* Schedule Tiles */}
      <Grid container spacing={3}>
        {filteredSchedules.length === 0 && (
          <Grid item xs={12}>
            <Box
              sx={{
                border: `2px dashed ${borderColor}`,
                borderRadius: 2,
                p: 3,
                textAlign: "center",
                backgroundColor: "#fafafa",
              }}
            >
              <Typography sx={{ fontWeight: "bold" }}>
                There is no schedule in this {selectedYearLabel} and{" "}
                {selectedSemesterLabel}.
              </Typography>
            </Box>
          </Grid>
        )}

        {filteredSchedules.map((schedule) => {
          const occupancy = getOfficialOccupancy(schedule);
          const ratio = getOccupancyRatio(occupancy, schedule.room_quota);

          return (
            <Grid
              item
              xs={12}
              sm={6}
              md={2.4}
              lg={2.4}
              key={schedule.schedule_id}
            >
              <Card
                onClick={() =>
                  navigate(
                    `/qualifying_interviewer_applicant_list?schedule=${schedule.schedule_id}&interviewer=${encodeURIComponent(schedule.interviewer)}`,
                  )
                }
                sx={{
                  cursor: "pointer",
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: 4,
                  border: `1px solid ${borderColor}`,
                  transition: "0.3s ease",
                  "&:hover": {
                    transform: "translateY(-4px) scale(1.03)",
                    boxShadow: 6,
                  },
                }}
              >
                <Box
                  sx={{
                    backgroundColor: headerColor,
                    color: "#fff",
                    p: 1.5,
                  }}
                >
                  <Typography
                    fontWeight="bold"
                    fontSize="16px"
                    sx={{ textAlign: "center" }}
                  >
                    Schedule #{schedule.schedule_id}
                  </Typography>
                </Box>

                <CardContent>
                  <Typography fontSize="14px" mb={0.5}>
                    <strong>Interviewer:</strong> {schedule.interviewer}
                  </Typography>
                  <Typography fontSize="14px" mb={0.5}>
                    <strong>Building:</strong> {schedule.building_description}
                  </Typography>
                  <Typography fontSize="14px" mb={0.5}>
                    <strong>Room:</strong> {schedule.room_description}
                  </Typography>
                  <Typography fontSize="14px" mb={0.5}>
                    <strong>Date:</strong> {schedule.day_description}
                  </Typography>
                  <Typography fontSize="14px" mb={1}>
                    <strong>Time:</strong> {formatTime12(schedule.start_time)} -{" "}
                    {formatTime12(schedule.end_time)}
                  </Typography>

                  <Typography fontSize="14px" fontWeight="bold" mb={0.5}>
                    Applicants: {occupancy}/{schedule.room_quota}
                  </Typography>

                  <LinearProgress
                    variant="determinate"
                    value={Math.min(ratio * 100, 100)}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#eee",
                      "& .MuiLinearProgress-bar": {
                        backgroundColor: getOccupancyColor(
                          occupancy,
                          schedule.room_quota,
                        ),
                      },
                    }}
                  />

                  <Box sx={{ mt: 1 }}>
                    {ratio >= 1 ? (
                      <Chip label="Full" color="error" size="small" />
                    ) : ratio >= 0.7 ? (
                      <Chip label="Almost Full" color="warning" size="small" />
                    ) : (
                      <Chip label="Available" color="success" size="small" />
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default QualifyingInterviewRoomAssignment;
