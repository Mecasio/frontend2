import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import { Autocomplete } from "@mui/material";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const CurriculumUnitManagement = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);

  const colors = settings?.colors || {};
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#000000";
  const headerColor = colors.header || "#1976d2";
  const branches = settings?.branches || [];

  const [curriculumList, setCurriculumList] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [taggedPrograms, setTaggedPrograms] = useState([]);

  const [editedCourseReqs, setEditedCourseReqs] = useState({});

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(false);

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
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`,
      );
      const allowed = response.data?.page_privilege === 1;
      setHasAccess(allowed);
      setCanEdit(allowed && Number(response.data?.can_edit) === 1);
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
      setCanEdit(false);
      if (error.response && error.response.data.message) {
        console.log(error.response.data.message);
      } else {
        console.log("An unexpected error occurred.");
      }
      setLoading(false);
    }
  };

  const pageId = 113;
  const getAuditConfig = () => ({
    headers: {
      ...getFlatAuditHeaders(),
      "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-page-id": pageId,
      "x-audit-actor-id":
        employeeID ||
        localStorage.getItem("employee_id") ||
        localStorage.getItem("email") ||
        "unknown",
      "x-audit-actor-role":
        userRole || localStorage.getItem("role") || "registrar",
    },
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  /* ===================== DATA ===================== */
  useEffect(() => {
    fetchCurriculum();
    fetchTaggedPrograms();
  }, []);

  const fetchCurriculum = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/get_active_curriculum`);
    setCurriculumList(res.data);
  };

  const fetchTaggedPrograms = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/program_tagging_list`);
    const unique = Array.from(
      new Map(res.data.map((item) => [item.program_tagging_id, item])).values(),
    );
    setTaggedPrograms(unique);
  };

  /* ===================== EDIT HANDLERS ===================== */
  const handleReqChange = (id, field, value) => {
    if (!canEdit) {
      setSnackbar({
        open: true,
        message: "You do not have permission to edit program units",
        severity: "error",
      });
      return;
    }
    setEditedCourseReqs((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value === "" ? null : Number(value),
      },
    }));
  };

  const handleSaveSemester = async (courses) => {
    if (!canEdit) {
      setSnackbar({
        open: true,
        message: "You do not have permission to edit program units",
        severity: "error",
      });
      return;
    }
    try {
      const updates = {};

      // group edits by course_id
      for (const c of courses) {
        const edited = editedCourseReqs[c.program_tagging_id];
        if (!edited) continue;

        updates[c.course_id] = {
          lec_unit:
            edited.lec_unit !== undefined ? edited.lec_unit : c.lec_unit,
          lab_unit:
            edited.lab_unit !== undefined ? edited.lab_unit : c.lab_unit,
          course_unit:
            edited.course_unit !== undefined
              ? edited.course_unit
              : c.course_unit,
        };
      }

      // save once per course
      for (const courseId of Object.keys(updates)) {
        await axios.put(
          `${API_BASE_URL}/api/update_course/${courseId}`,
          updates[courseId],
          getAuditConfig(),
        );
      }

      setEditedCourseReqs({});
      fetchTaggedPrograms();
      setSnackbar({
        open: true,
        message: "Saved successfully!",
        severity: "success",
      });
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "Save failed",
        severity: "error",
      });
    }
  };

  /* ===================== GROUP YEAR → SEM ===================== */
  const groupedData = () => {
    const result = {};

    taggedPrograms
      .filter((p) => p.curriculum_id == selectedCurriculum)
      .forEach((p) => {
        if (!result[p.year_level_description]) {
          result[p.year_level_description] = {};
        }
        if (!result[p.year_level_description][p.semester_description]) {
          result[p.year_level_description][p.semester_description] = [];
        }
        result[p.year_level_description][p.semester_description].push(p);
      });

    return result;
  };

  const data = groupedData();

  const selectedCurriculumName =
    curriculumList.find((c) => c.curriculum_id === selectedCurriculum)
      ?.program_description +
      (curriculumList.find((c) => c.curriculum_id === selectedCurriculum)?.major
        ? ` ${
            curriculumList.find((c) => c.curriculum_id === selectedCurriculum)
              ?.major
          }`
        : "") || "";

  const formatSchoolYear = (yearDesc) => {
    if (!yearDesc) return "";
    const startYear = Number(yearDesc);
    if (isNaN(startYear)) return yearDesc; // safe fallback
    return `${startYear} - ${startYear + 1}`;
  };

  const [filteredPrograms, setFilteredPrograms] = useState([]);

  const [selectedCampus, setSelectedCampus] = useState("");
  const [selectedAcademicProgram, setSelectedAcademicProgram] = useState("");

  const filteredCurriculumList = curriculumList
    .filter((item) => {
      if (selectedCampus !== "") {
        if (Number(item.components) !== Number(selectedCampus)) {
          return false;
        }
      }
      if (selectedAcademicProgram !== "") {
        if (Number(item.academic_program) !== Number(selectedAcademicProgram)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => Number(a.year_description) - Number(b.year_description)); // ← add this

  const [yearLevelList, setYearLevelList] = useState([]);
  const [semesterList, setSemesterList] = useState([]);

  useEffect(() => {
    fetchYearLevels();
    fetchSemesters();
  }, []);

  const fetchYearLevels = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/year-levels`);
      setYearLevelList(res.data);
    } catch (err) {
      console.error("Error fetching year levels:", err);
    }
  };

  const fetchSemesters = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/semesters`);
      setSemesterList(res.data);
    } catch (err) {
      console.error("Error fetching semesters:", err);
    }
  };

  const ordinalSuffix = (n) => {
    if (n % 100 >= 11 && n % 100 <= 13) return "th";
    switch (n % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  const yearOrder = yearLevelList.reduce((acc, yl) => {
    acc[yl.year_level_description] = yl.year_level_id;
    return acc;
  }, {});

  const semesterOrder = semesterList.reduce((acc, s) => {
    acc[s.semester_description] = s.semester_id;
    return acc;
  }, {});

  const yearLabelMap = yearLevelList.reduce((acc, yl) => {
    acc[yl.year_level_description] =
      yl.level_type === "year"
        ? `${yl.year_level_id}${ordinalSuffix(yl.year_level_id)} Year`
        : yl.year_level_description;
    return acc;
  }, {});

  const formatYearLabel = (year) => {
    return `${yearLabelMap[year] || year} - (${year})`;
  };

  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }

  const headerStyle = {
    backgroundColor: headerColor,
    color: "#fff",
    border: `1px solid ${borderColor}`,
    padding: "8px",
    textAlign: "center",
  };

  const cellStyle = {
    border: `1px solid ${borderColor}`,
    padding: "8px",
    textAlign: "center",
  };

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
        p: 2,
      }}
    >
      {/* HEADER */}
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
          PROGRAM UNITS
        </Typography>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      <Typography fontWeight={500}>Select Campus:</Typography>
      <FormControl sx={{ minWidth: 300, mb: 3 }}>
        <InputLabel>Campus</InputLabel>
        <Select
          value={selectedCampus}
          label="Campus"
          onChange={(e) => {
            setSelectedCampus(e.target.value);
            setSelectedAcademicProgram("");
            setSelectedCurriculum("");
          }}
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

      <Typography fontWeight={500}>Academic Program:</Typography>
      <FormControl sx={{ minWidth: 300, mb: 3 }}>
        <InputLabel>Academic Program</InputLabel>
        <Select
          value={selectedAcademicProgram}
          label="Academic Program"
          onChange={(e) => {
            setSelectedAcademicProgram(e.target.value);
            setSelectedCurriculum("");
          }}
          disabled={!selectedCampus}
        >
          <MenuItem value="">
            <em>Select Program</em>
          </MenuItem>
          <MenuItem value="0">Undergraduate</MenuItem>
          <MenuItem value="1">Graduate</MenuItem>
          <MenuItem value="2">Techvoc</MenuItem>
        </Select>
      </FormControl>

      <Typography fontWeight={500}>Search Curriculum:</Typography>

      <Autocomplete
        options={filteredCurriculumList}
        getOptionLabel={(option) => {
          const startYear = Number(option.year_description);
          const yearRange = !isNaN(startYear)
            ? `${startYear} - ${startYear + 1}`
            : option.year_description || "";
          return `${yearRange} - (${option.program_code}) ${option.program_description}${option.major ? ` (${option.major})` : ""}`;
        }}
        value={
          filteredCurriculumList.find(
            (item) => item.curriculum_id === selectedCurriculum,
          ) || null
        }
        onChange={(event, newValue) => {
          setSelectedCurriculum(newValue?.curriculum_id || "");
        }}
        filterOptions={(options, { inputValue }) => {
          const search = inputValue.toLowerCase();

          return options.filter(
            (option) =>
              option.program_code?.toLowerCase().includes(search) ||
              option.program_description?.toLowerCase().includes(search) ||
              option.major?.toLowerCase().includes(search) ||
              option.year_description?.toString().includes(search),
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search Curriculum"
            placeholder="Search program, major, year..."
          />
        )}
        sx={{ maxWidth: 700, mb: 4 }}
      />

      {/* YEARS */}
      {selectedCurriculum &&
        Object.keys(data)
          .sort((a, b) => yearOrder[a] - yearOrder[b])
          .map((year) => (
            <Box
              key={year}
              sx={{
                mb: 6,
                border: `1px solid ${borderColor}`,
                borderRadius: 2,
                p: 2,
                backgroundColor: "#fafafa",
              }}
            >
              {/* CURRICULUM HEADER */}
              <Typography
                variant="h4"
                sx={{
                  fontWeight: "bold",
                  color: "#fff",
                  textAlign: "center",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  backgroundColor: headerColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 1,
                  p: 1,
                  mb: 3,
                }}
              >
                {formatSchoolYear(
                  curriculumList.find(
                    (c) => c.curriculum_id === selectedCurriculum,
                  )?.year_description,
                )}{" "}
                : {selectedCurriculumName}
              </Typography>

              {/* SEMESTERS */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 3,
                }}
              >
                {Object.keys(data[year])
                  .sort((a, b) => semesterOrder[a] - semesterOrder[b])
                  .map((sem) => {
                    const courses = data[year][sem];

                    return (
                      <Box
                        key={sem}
                        sx={{
                          border: `1px solid ${borderColor}`,
                          borderRadius: 1,
                          p: 2,
                          mb: 6,
                          minHeight: 300,
                          position: "relative",
                          backgroundColor: "#fff",
                        }}
                      >
                        <Box sx={{ position: "relative", pb: 7 }}>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                            }}
                          >
                            <thead>
                              {/* YEAR + SEM */}
                              <tr>
                                <th
                                  colSpan={4}
                                  style={{
                                    backgroundColor: "#f5f5f5",
                                    borderLeft: `1px solid ${borderColor}`,
                                    borderTop: `1px solid ${borderColor}`,
                                    borderBottom: `1px solid ${borderColor}`,
                                    padding: "10px",
                                    fontWeight: "bold",
                                    textAlign: "left",
                                    fontSize: "21px",
                                    color: titleColor,
                                  }}
                                >
                                  {formatYearLabel(year)}
                                </th>

                                <th
                                  colSpan={4}
                                  style={{
                                    backgroundColor: "#f5f5f5",
                                    borderRight: `1px solid ${borderColor}`,
                                    borderTop: `1px solid ${borderColor}`,
                                    borderBottom: `1px solid ${borderColor}`,
                                    padding: "10px",
                                    fontWeight: "bold",
                                    textAlign: "right",
                                    fontSize: "21px",
                                    color: titleColor,
                                  }}
                                >
                                  {sem}
                                </th>
                              </tr>

                              <tr>
                                <th style={headerStyle}>#</th>
                                <th style={headerStyle}>COURSE CODE</th>
                                <th style={headerStyle}>COURSE DESCRIPTION</th>
                                <th style={headerStyle}>PREREQUISITE</th>
                                <th style={headerStyle}>LEC</th>
                                <th style={headerStyle}>LAB</th>
                                <th style={headerStyle}>CREDIT</th>
                                <th style={headerStyle}>TUITION</th>
                              </tr>
                            </thead>

                            <tbody>
                              {courses.map((c, index) => (
                                <tr
                                  key={c.program_tagging_id}
                                  style={{
                                    backgroundColor:
                                      index % 2 === 0 ? "#ffffff" : "lightgray",
                                  }}
                                >
                                  <td style={cellStyle}>{index + 1}</td>
                                  <td style={cellStyle}>{c.course_code}</td>
                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                    }}
                                  >
                                    {c.course_description}
                                  </td>
                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                    }}
                                  >
                                    {c.prereq}
                                  </td>

                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                    }}
                                  >
                                    <input
                                      type="number"
                                      readOnly={!canEdit}
                                      value={
                                        editedCourseReqs[c.program_tagging_id]
                                          ?.lec_unit ??
                                        c.lec_unit ??
                                        0
                                      }
                                      onChange={(e) =>
                                        handleReqChange(
                                          c.program_tagging_id,
                                          "lec_unit",
                                          e.target.value,
                                        )
                                      }
                                      style={{
                                        width: "90px",
                                        padding: "6px",
                                        border: "1px solid #ccc",
                                        borderRadius: 4,
                                        textAlign: "right",
                                      }}
                                    />
                                  </td>

                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                    }}
                                  >
                                    <input
                                      type="number"
                                      readOnly={!canEdit}
                                      value={
                                        editedCourseReqs[c.program_tagging_id]
                                          ?.lab_unit ??
                                        c.lab_unit ??
                                        0
                                      }
                                      onChange={(e) =>
                                        handleReqChange(
                                          c.program_tagging_id,
                                          "lab_unit",
                                          e.target.value,
                                        )
                                      }
                                      style={{
                                        width: "90px",
                                        padding: "6px",
                                        border: "1px solid #ccc",
                                        borderRadius: 4,
                                        textAlign: "right",
                                      }}
                                    />
                                  </td>

                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                    }}
                                  >
                                    <input
                                      type="number"
                                      readOnly={!canEdit}
                                      value={
                                        editedCourseReqs[c.program_tagging_id]
                                          ?.course_unit ??
                                        c.course_unit ??
                                        0
                                      }
                                      onChange={(e) =>
                                        handleReqChange(
                                          c.program_tagging_id,
                                          "course_unit",
                                          e.target.value,
                                        )
                                      }
                                      style={{
                                        width: "90px",
                                        padding: "6px",
                                        border: "1px solid #ccc",
                                        borderRadius: 4,
                                        textAlign: "right",
                                      }}
                                    />
                                  </td>

                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {c.course_unit ?? 0}
                                  </td>
                                </tr>
                              ))}

                              {/* TOTAL */}
                              <tr
                                style={{
                                  fontWeight: "bold",
                                  backgroundColor: "#f0f0f0",
                                }}
                              >
                                <td colSpan={4} style={cellStyle}>
                                  TOTAL
                                </td>
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  {courses.reduce(
                                    (sum, c) =>
                                      sum +
                                      Number(
                                        editedCourseReqs[c.program_tagging_id]
                                          ?.lec_unit ??
                                          c.lec_unit ??
                                          0,
                                      ),
                                    0,
                                  )}
                                </td>
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  {courses.reduce(
                                    (sum, c) =>
                                      sum +
                                      Number(
                                        editedCourseReqs[c.program_tagging_id]
                                          ?.lab_unit ??
                                          c.lab_unit ??
                                          0,
                                      ),
                                    0,
                                  )}
                                </td>
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  {courses.reduce(
                                    (sum, c) =>
                                      sum +
                                      Number(
                                        editedCourseReqs[c.program_tagging_id]
                                          ?.course_unit ??
                                          c.course_unit ??
                                          0,
                                      ),
                                    0,
                                  )}
                                </td>
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  {courses.reduce(
                                    (sum, c) =>
                                      sum +
                                      Number(
                                        editedCourseReqs[c.program_tagging_id]
                                          ?.course_unit ??
                                          c.course_unit ??
                                          0,
                                      ),
                                    0,
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </Box>

                        {/* SAVE BUTTON */}
                        {canEdit && (
                          <button
                            onClick={() => handleSaveSemester(courses)}
                            style={{
                              marginTop: 10,
                              padding: "6px 14px",
                              background: "#1976d2",
                              color: "#fff",
                              border: "none",
                              borderRadius: 5,
                              cursor: "pointer",
                              float: "right",
                            }}
                          >
                            Save
                          </button>
                        )}
                      </Box>
                    );
                  })}
              </Box>
            </Box>
          ))}

      {/* SNACKBAR */}
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

export default CurriculumUnitManagement;
