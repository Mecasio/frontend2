import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import {
  Box,
  Typography,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";
import LoadingOverlay from "../components/LoadingOverlay";
import Unauthorized from "../components/Unauthorized";
import { Autocomplete } from "@mui/material";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const CurriculumRequirementsManagement = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);

  const colors = settings?.colors || {};
  const titleColor = colors.title || "#000";
  const borderColor = colors.border || "#000";
  const headerColor = colors.header || "#1976d2";
  const branches = settings?.branches || [];

  const [curriculumList, setCurriculumList] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [taggedPrograms, setTaggedPrograms] = useState([]);

  // editable prereqs
  const [editedCourseReqs, setEditedCourseReqs] = useState({});

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [hasAccess, setHasAccess] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const getAuditConfig = () => ({
    headers: {
      ...getFlatAuditHeaders(),
      "x-employee-id": localStorage.getItem("employee_id") || "",
      "x-page-id": pageId,
      "x-audit-actor-id":
        localStorage.getItem("employee_id") ||
        localStorage.getItem("email") ||
        "unknown",
      "x-audit-actor-role": localStorage.getItem("role") || "registrar",
    },
  });
  const pageId = 112; // 🔁 change if needed

  /* ===================== AUTH ===================== */
  useEffect(() => {
    const role = localStorage.getItem("role");
    const employeeID = localStorage.getItem("employee_id");

    if (role !== "registrar") {
      window.location.href = "/login";
      return;
    }

    checkAccess(employeeID);
  }, []);

  const checkAccess = async (employeeID) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`,
      );
      const allowed = res.data?.page_privilege === 1;
      setHasAccess(allowed);
      setCanEdit(allowed && Number(res.data?.can_edit) === 1);
    } catch {
      setHasAccess(false);
      setCanEdit(false);
    }
  };

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

  /* ===================== HANDLERS ===================== */
  const handleReqChange = (id, field, value) => {
    if (!canEdit) {
      setSnackbar({
        open: true,
        message: "You do not have permission to edit prerequisites",
        severity: "error",
      });
      return;
    }
    setEditedCourseReqs((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSaveSemester = async (courses) => {
    if (!canEdit) {
      setSnackbar({
        open: true,
        message: "You do not have permission to edit prerequisites",
        severity: "error",
      });
      return;
    }
    try {
      for (const course of courses) {
        const edited = editedCourseReqs[course.program_tagging_id];
        if (!edited) continue;

        await axios.put(
          `${API_BASE_URL}/api/update_course_requirements/${course.course_id}`,
          {
            prereq: edited.prereq ?? course.prereq ?? null,

            corequisite: edited.corequisite ?? course.corequisite ?? null,
          },
          getAuditConfig(),
        );
      }

      setSnackbar({
        open: true,
        message: "Requirements saved successfully!",
        severity: "success",
      });

      setEditedCourseReqs({});
      fetchTaggedPrograms();
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "Failed to save requirements",
        severity: "error",
      });
    }
  };

  const selectedCurriculumName =
    curriculumList.find((c) => c.curriculum_id === selectedCurriculum)
      ?.program_description +
      (curriculumList.find((c) => c.curriculum_id === selectedCurriculum)?.major
        ? ` ${curriculumList.find((c) => c.curriculum_id === selectedCurriculum)?.major}`
        : "") || "";

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

  const formatSchoolYear = (yearDesc) => {
    if (!yearDesc) return "";
    const startYear = Number(yearDesc);
    if (isNaN(startYear)) return yearDesc;
    return `${startYear} - ${startYear + 1}`;
  };

  const getBranchLabel = (branchId) => {
    const branch = branches.find(
      (item) => Number(item.id) === Number(branchId),
    );
    return branch?.branch || "�";
  };

  const formatYearLabel = (year) => {
    return yearLabelMap[year] || year;
  };

  if (loading || hasAccess === null) {
    return <LoadingOverlay open={true} message="Loading..." />;
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
        CURRICULUM REQUIREMENTS MANAGEMENT
        </Typography>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
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
              {/* ===== CURRICULUM HEADER (ONCE PER YEAR) ===== */}
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

              {/* ===== SEMESTER TABLES ===== */}
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
                    const semesterCourses = data[year][sem];

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
                              {/* YEAR + SEMESTER */}
                              <tr>
                                {/* YEAR (LEFT) */}
                                <th
                                  colSpan={3}
                                  style={{
                                    backgroundColor: "#f5f5f5",
                                    borderLeft: `1px solid ${borderColor}`,
                                    borderTop: `1px solid ${borderColor}`,
                                    borderBottom: `1px solid ${borderColor}`,
                                    padding: "10px",
                                    fontWeight: "bold",
                                    textAlign: "left",
                                    color: titleColor,
                                    fontSize: "21px",
                                  }}
                                >
                                  {formatYearLabel(year)}
                                </th>

                                {/* SEMESTER (RIGHT) */}
                                <th
                                  colSpan={3}
                                  style={{
                                    backgroundColor: "#f5f5f5",
                                    borderRight: `1px solid ${borderColor}`,
                                    borderTop: `1px solid ${borderColor}`,
                                    borderBottom: `1px solid ${borderColor}`,
                                    padding: "10px",
                                    fontWeight: "bold",
                                    fontSize: "21px",
                                    color: titleColor,
                                    textAlign: "right",
                                  }}
                                >
                                  {sem}
                                </th>
                              </tr>

                              {/* COLUMN HEADERS */}
                              <tr>
                                <th style={headerStyle}>#</th>
                                <th style={headerStyle}>COURSE CODE</th>
                                <th style={headerStyle}>COURSE DESCRIPTION</th>

                                <th style={headerStyle}>CREDITED UNITS</th>
                                <th style={headerStyle}>PREREQUISITES</th>

                                <th style={headerStyle}>COREQUISITE</th>
                              </tr>
                            </thead>

                            <tbody>
                              {semesterCourses.map((course, index) => (
                                <tr
                                  key={course.program_tagging_id}
                                  style={{
                                    backgroundColor:
                                      index % 2 === 0 ? "#ffffff" : "lightgray",
                                  }}
                                >
                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                    }}
                                  >
                                    {index + 1}
                                  </td>
                                  <td style={cellStyle}>
                                    {course.course_code}
                                  </td>
                                  <td style={cellStyle}>
                                    {course.course_description}
                                  </td>

                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                    }}
                                  >
                                    {course.course_unit}
                                  </td>

                                  <td style={cellStyle}>
                                    <input
                                      type="text"
                                      readOnly={!canEdit}
                                      value={
                                        editedCourseReqs[
                                          course.program_tagging_id
                                        ]?.prereq ??
                                        course.prereq ??
                                        ""
                                      }
                                      onChange={(e) =>
                                        handleReqChange(
                                          course.program_tagging_id,
                                          "prereq",
                                          e.target.value,
                                        )
                                      }
                                      style={{
                                        width: "100%",
                                        padding: "6px",
                                        border: "1px solid #ccc",
                                        borderRadius: 4,
                                        textAlign: "right",
                                      }}
                                    />
                                  </td>

                                  <td style={cellStyle}>
                                    <input
                                      type="text"
                                      readOnly={!canEdit}
                                      value={
                                        editedCourseReqs[
                                          course.program_tagging_id
                                        ]?.corequisite ??
                                        course.corequisite ??
                                        ""
                                      }
                                      onChange={(e) =>
                                        handleReqChange(
                                          course.program_tagging_id,
                                          "corequisite",
                                          e.target.value,
                                        )
                                      }
                                      style={{
                                        width: "100%",
                                        padding: "6px",
                                        border: "1px solid #ccc",
                                        borderRadius: 4,
                                        textAlign: "right",
                                      }}
                                    />
                                  </td>
                                </tr>
                              ))}

                              {/* ===== TOTAL ROW ===== */}
                              {/* ===== TOTAL ROW ===== */}

                              <tr
                                style={{
                                  fontWeight: "bold",
                                  backgroundColor: "#f0f0f0",
                                }}
                              >
                                <td style={cellStyle} colSpan={2}>
                                  TOTAL
                                </td>

                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                ></td>

                                {/* TOTAL UNITS */}
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  {semesterCourses.reduce(
                                    (sum, course) =>
                                      sum + Number(course.course_unit || 0),
                                    0,
                                  )}
                                </td>

                                {/* TOTAL PREREQ 1 */}
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  {semesterCourses.reduce((count, course) => {
                                    const value =
                                      editedCourseReqs[
                                        course.program_tagging_id
                                      ]?.prereq ??
                                      course.prereq ??
                                      "";
                                    return (
                                      count + (value.trim() !== "" ? 1 : 0)
                                    );
                                  }, 0)}
                                </td>

                                {/* TOTAL PREREQ 2 */}

                                {/* TOTAL COREQUISITE */}
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  {semesterCourses.reduce((count, course) => {
                                    const value =
                                      editedCourseReqs[
                                        course.program_tagging_id
                                      ]?.corequisite ??
                                      course.corequisite ??
                                      "";
                                    return (
                                      count + (value.trim() !== "" ? 1 : 0)
                                    );
                                  }, 0)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </Box>

                        {/* SAVE BUTTON */}
                        {canEdit && (
                          <button
                            onClick={() => handleSaveSemester(semesterCourses)}
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

export default CurriculumRequirementsManagement;
