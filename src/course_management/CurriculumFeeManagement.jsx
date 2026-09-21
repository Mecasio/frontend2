import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import {
  Box,
  Typography,
  Button,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";
import LoadingOverlay from "../components/LoadingOverlay";
import { Autocomplete } from "@mui/material";
import { useMemo } from "react";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const CurriculumFeeManagement = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#000000";
  const headerColor = colors.header || "#1976d2";
  const branches = settings?.branches || [];

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const pageId = 111;

  const [employeeID, setEmployeeID] = useState("");
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
        userRole || localStorage.getItem("role") || "administrator",
    },
  });

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
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
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

  const [curriculum, setCurriculum] = useState({ year_id: "", program_id: "" });
  const [yearList, setYearList] = useState([]);
  const [programList, setProgramList] = useState([]);

  useEffect(() => {
    fetchYear();
    fetchProgram();
    fetchCurriculum();
  }, []);

  const fetchYear = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/year_table`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setYearList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProgram = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_program`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setProgramList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const [curriculumList, setCurriculumList] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [taggedPrograms, setTaggedPrograms] = useState([]);

  // 🆕 local editable fees
  const [editedFees, setEditedFees] = useState({});

  useEffect(() => {
    fetchYear();
    fetchProgram();
    fetchCurriculum();
    fetchTaggedPrograms();
  }, []);

  const fetchCurriculum = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/get_active_curriculum`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
    setCurriculumList(res.data);
  };

  const fetchTaggedPrograms = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/program_tagging_list`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });

      const tagged = res.data.map((p) => ({
        ...p,

        // force numbers
        lec_fee: Number(p.lec_fee ?? 0),
        lab_fee: Number(p.lab_fee ?? 0),

        is_nstp: Number(p.is_nstp ?? 0),
        iscomputer_lab: Number(p.iscomputer_lab ?? 0),
        islaboratory_fee: Number(p.islaboratory_fee ?? 0),

        amount: Number(p.amount ?? 0),
        category: p.category,
      }));

      const unique = Array.from(
        new Map(tagged.map((item) => [item.program_tagging_id, item])).values(),
      );

      console.log("FETCHED PROGRAMS:", unique);

      setTaggedPrograms(unique);
    } catch (err) {
      console.error("Error fetching tagged programs:", err);
    }
  };

  const [tosf, setTosf] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/tosf`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => {
        setTosf(res.data[0]); // get first row
        console.log("TOSF:", res.data[0]);
      })
      .catch((err) => console.error("TOSF fetch error:", err));
  }, []);

  const [feeRules, setFeeRules] = useState([]);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/fee_rules`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then((res) => {
        setFeeRules(res.data); // keep full objects
      })
      .catch((err) => console.error("Fee rules error:", err));
  }, []);

  const computeExtraFees = (semesterCourses) => {
    if (!feeRules.length) return [];

    return feeRules
      .filter((fee) => fee.applies_to_all === 1)
      .filter((fee) =>
        semesterCourses.some(
          (course) =>
            (fee.iscomputer_lab === 1 && course.iscomputer_lab === 1) ||
            (fee.isnon_computer_lab === 1 && course.isnon_computer_lab === 1) ||
            (fee.is_nstp === 1 && course.is_nstp === 1),
        ),
      )
      .map((fee) => ({
        label: fee.description,
        amount: Number(fee.amount),
      }));
  };

  const [filteredPrograms, setFilteredPrograms] = useState([]);

  const [selectedCampus, setSelectedCampus] = useState("");
  const [selectedAcademicProgram, setSelectedAcademicProgram] = useState("");

  const getBranchLabel = (branchId) => {
    const branch = branches.find(
      (item) => Number(item.id) === Number(branchId),
    );
    return branch?.branch || "";
  };

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

  const yearLevelIdMap = {
    "First Year": 1,
    "1st Year": 1,
    "Second Year": 2,
    "2nd Year": 2,
    "Third Year": 3,
    "3rd Year": 3,
    "Fourth Year": 4,
    "4th Year": 4,
  };

  const semesterIdMap = {
    "First Semester": 1,
    "1st Semester": 1,
    "Second Semester": 2,
    "2nd Semester": 2,
    Summer: 3,
  };

  const [miscFees, setMiscFees] = useState({});

  const fetchMiscFee = async (yearId, semId, programId, departmentId) => {
    const res = await axios.get(`${API_BASE_URL}/api/misc_fee`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      params: {
        year_level_id: yearId,
        semester_id: semId,
        program_id: programId,
        dprtmnt_id: departmentId,
      },
    });

    console.log("RAW MISC API:", res.data); // DEBUG
    return res.data || null; // ✅ FIX (REMOVE [0])
  };

  // 🧠 Group by Year → Semester
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

  // 🖊 handle input change
  const handleFeeChange = (id, field, value) => {
    if (!canEdit) {
      setSnackbar({
        open: true,
        message: "You do not have permission to edit program payments",
        severity: "error",
      });
      return;
    }

    setEditedFees((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value === "" || value === null ? "" : Number(value),
      },
    }));
  };

  const handleSaveSemester = async (courses) => {
    if (!canEdit) {
      setSnackbar({
        open: true,
        message: "You do not have permission to edit program payments",
        severity: "error",
      });
      return;
    }
    try {
      // ✅ MISC ONLY (1790)
      const miscFeeValue = computeMiscFee(courses);

      const first = courses[0];

      // 🔥 SAVE MISC INTO fee_rules
      await axios.put(
        `${API_BASE_URL}/api/misc_fee`,
        {
          amount: miscFeeValue, // 👉 1790
          year_level_id: first.year_level_id,
          semester_id: first.semester_id,
          program_id: first.program_id,
          dprtmnt_id: first.dprtmnt_id,
        },
        getAuditConfig(),
      );

      // 🔁 SAVE PER-COURSE FEES — run all in parallel instead of one at a time
      await Promise.all(
        courses.map((course) => {
          const updates = editedFees[course.program_tagging_id];

          return axios.put(
            `${API_BASE_URL}/api/program_tagging/${course.program_tagging_id}`,
            {
              curriculum_id: course.curriculum_id,
              year_level_id: course.year_level_id,
              semester_id: course.semester_id,
              course_id: course.course_id,

              lec_fee: updates?.lec_fee ?? course.lec_fee,
              lab_fee: updates?.lab_fee ?? course.lab_fee,

              // NEW FLAGS
              is_nstp: updates?.is_nstp ?? course.is_nstp,
              iscomputer_lab: updates?.iscomputer_lab ?? course.iscomputer_lab,
              islaboratory_fee:
                updates?.islaboratory_fee ?? course.islaboratory_fee,
              misc_fee: miscFeeValue,
            },
            getAuditConfig(),
          );
        }),
      );

      setSnackbar({
        open: true,
        message: "Fees saved successfully!",
        severity: "success",
      });

      // wait for the fresh server data to arrive BEFORE wiping local edits
      await fetchTaggedPrograms();
      setEditedFees({});
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "Error saving fees",
        severity: "error",
      });
    }
  };

  const computeMiscFee = (semesterCourses) => {
    let total = 0;

    // ✅ BASE TOSF ONLY
    if (tosf) {
      total += Object.entries(tosf)
        .filter(
          ([key]) =>
            ![
              "tosf_id",
              "school_id_fees",
              "nstp_fees",
              "computer_fees",
              "laboratory_fees",
            ].includes(key),
        )
        .reduce((sum, [, val]) => sum + Number(val || 0), 0);
    }

    // ✅ SCHOOL ID (1st yr, 1st sem only)
    const isFirstYearFirstSem =
      semesterCourses[0].year_level_id === 1 &&
      semesterCourses[0].semester_id === 1;

    if (isFirstYearFirstSem) {
      total += Number(tosf?.school_id_fees || 0);
    }

    // ✅ COMPUTER (ONCE)
    if (semesterCourses.some((c) => c.iscomputer_lab == 1)) {
      total += Number(tosf?.computer_fees || 0);
    }

    return total;
  };

  // const [idFee, setIdFee] = useState(null);

  // const fetchIdFee = async (programId, departmentId) => {
  //   const res = await axios.get(`${API_BASE_URL}/api/extra_fees`, {
  //     params: {
  //       year_level_id: 1,
  //       semester_id: 1,
  //       program_id: programId,
  //       dprtmnt_id: departmentId,
  //     },
  //   });

  //   setIdFee(res.data.find(f => f.fee_code === "ID_FEE") || null);
  // };

  // useEffect(() => {
  //   if (!taggedPrograms.length) return;

  //   const p = taggedPrograms.find(t => t.curriculum_id == selectedCurriculum);
  //   if (p) fetchIdFee(p.program_id, p.dprtmnt_id);
  // }, [selectedCurriculum, taggedPrograms]);

  const selectedCurriculumName =
    curriculumList.find((c) => c.curriculum_id === selectedCurriculum)
      ?.program_description +
      (curriculumList.find((c) => c.curriculum_id === selectedCurriculum)?.major
        ? ` ${curriculumList.find((c) => c.curriculum_id === selectedCurriculum)?.major}`
        : "") || "";

  const [extraFees, setExtraFees] = useState([]);

  const fetchExtraFees = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/extra_fees`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setExtraFees(res.data);
    } catch (err) {
      console.error("Error fetching extra fees:", err);
    }
  };

  useEffect(() => {
    fetchExtraFees();
  }, []);

  const getExtraFeesForSem = (year, sem) => {
    const yearId = yearLevelIdMap[year];
    const semId = semesterIdMap[sem];

    return extraFees.filter(
      (f) =>
        f.year_level_id == yearId &&
        f.semester_id == semId &&
        f.fee_code !== "ID_FEE", // ID handled separately
    );
  };

  useEffect(() => {
    if (!selectedCurriculum || !Object.keys(data).length) return;

    const loadMisc = async () => {
      const programsInCurriculum = taggedPrograms.filter(
        (p) => p.curriculum_id == selectedCurriculum,
      );

      // Build a flat list of every (program, year, sem) combo we need to fetch
      const requests = [];
      for (const p of programsInCurriculum) {
        const programId = p.program_id;
        const deptId = p.dprtmnt_id;

        for (const year of Object.keys(data)) {
          for (const sem of Object.keys(data[year])) {
            const courses = data[year][sem];
            const yearId = courses[0].year_level_id;
            const semId = courses[0].semester_id;
            const key = `${programId}-${yearId}-${semId}`;

            requests.push(
              fetchMiscFee(yearId, semId, programId, deptId).then((fee) => [
                key,
                fee,
              ]),
            );
          }
        }
      }

      // Fire all requests at once instead of one at a time
      const entries = await Promise.all(requests);

      const result = {};
      for (const [key, fee] of entries) {
        result[key] = fee;
      }

      setMiscFees(result);
    };

    loadMisc();
  }, [selectedCurriculum, taggedPrograms]);

  const selectedCurriculumObj = curriculumList.find(
    (c) => c.curriculum_id === selectedCurriculum,
  );

  const [yearLevelList, setYearLevelList] = useState([]);
  const [semesterList, setSemesterList] = useState([]);

  useEffect(() => {
    fetchYearLevels();
    fetchSemesters();
  }, []);

  const fetchYearLevels = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/year-levels`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setYearLevelList(res.data);
    } catch (err) {
      console.error("Error fetching year levels:", err);
    }
  };

  const fetchSemesters = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/semesters`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
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
    if (isNaN(startYear)) return yearDesc; // safe fallback
    return `${startYear} - ${startYear + 1}`;
  };

  // ⬇️ PASTE THE useMemo BLOCK HERE ⬇️
  const semesterComputations = useMemo(() => {
    const result = {};

    Object.keys(data).forEach((year) => {
      Object.keys(data[year]).forEach((sem) => {
        const semesterCourses = data[year][sem];

        const hasComputerLab = semesterCourses.some(
          (c) =>
            Number(
              editedFees[c.program_tagging_id]?.iscomputer_lab ??
                c.iscomputer_lab,
            ) === 1,
        );
        const hasNonComputerLab = semesterCourses.some(
          (c) =>
            Number(
              editedFees[c.program_tagging_id]?.islaboratory_fee ??
                c.islaboratory_fee,
            ) === 1,
        );
        const hasNSTP = semesterCourses.some(
          (c) =>
            Number(editedFees[c.program_tagging_id]?.is_nstp ?? c.is_nstp) ===
            1,
        );

        const tuitionFeeAmount = semesterCourses.reduce(
          (sum, course) =>
            sum +
            (editedFees[course.program_tagging_id]?.lec_fee ??
              course.lec_fee ??
              0) +
            (editedFees[course.program_tagging_id]?.lab_fee ??
              course.lab_fee ??
              0),
          0,
        );

        const nstpFeeAmount = hasNSTP ? Number(tosf?.nstp_fees || 0) : 0;

        const yearId = semesterCourses[0].year_level_id;
        const semId = semesterCourses[0].semester_id;
        const programId = semesterCourses[0].program_id;
        const miscKey = `${programId}-${yearId}-${semId}`;
        const miscFee = miscFees[miscKey];
        const miscAmount =
          miscFee && typeof miscFee === "object" && Number(miscFee.amount) > 0
            ? Number(miscFee.amount)
            : computeMiscFee(semesterCourses);

        const isFirstYearFirstSem =
          yearLevelIdMap[year] === 1 && semesterIdMap[sem] === 1;

        const extraFeesForSem = getExtraFeesForSem(year, sem);
        const computedExtraFees = computeExtraFees(semesterCourses);

        result[`${year}-${sem}`] = {
          hasComputerLab,
          hasNonComputerLab,
          hasNSTP,
          tuitionFeeAmount,
          nstpFeeAmount,
          miscAmount,
          isFirstYearFirstSem,
          extraFeesForSem,
          computedExtraFees,
        };
      });
    });

    return result;
  }, [data, editedFees, tosf, miscFees, feeRules, extraFees]);
  // ⬆️ END OF PASTED BLOCK ⬆️

  const headerStyle = {
    backgroundColor: headerColor,
    border: `1px solid ${borderColor}`,
    color: "white",
    textAlign: "center",
    padding: "8px",
  };

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

  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }

  const cellStyle = {
    border: `1px solid ${borderColor}`,
    padding: "8px",
    textAlign: "center",
  };

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
         CURRICULUM FEE MANAGEMENT
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
              <Typography sx={{ mb: 2, fontStyle: "italic", color: "#555" }}>
                All fees shown below are based on the selected curriculum year.
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
                    const computed = semesterComputations[`${year}-${sem}`];

                    const {
                      hasComputerLab,
                      hasNonComputerLab,
                      hasNSTP,
                      tuitionFeeAmount,
                      nstpFeeAmount,
                      miscAmount,
                      isFirstYearFirstSem,
                      extraFeesForSem,
                      computedExtraFees,
                    } = computed;

                    return (
                      <Box
                        key={sem}
                        sx={{
                          border: `1px solid ${borderColor}`,
                          borderRadius: 1,
                          p: 2,
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
                                  colSpan={6}
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
                                  {yearLabelMap[year] || year}
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

                                <th style={headerStyle}>CREDITED UNITS</th>
                                <th style={headerStyle}>LEC FEE</th>
                                <th style={headerStyle}>LAB FEE</th>
                                <th style={headerStyle}>NSTP</th>
                                <th style={headerStyle}>COMPUTER LAB</th>
                                <th style={headerStyle}>LABORATORY</th>
                                <th style={headerStyle}>TOTAL FEE</th>
                              </tr>
                            </thead>

                            <tbody>
                              {/* ===== SUBJECT ROWS ===== */}
                              {semesterCourses.map((course, index) => {
                                const edit =
                                  editedFees[course.program_tagging_id] || {};
                                const lecFee =
                                  edit.lec_fee ?? course.lec_fee ?? 0;
                                const labFee =
                                  edit.lab_fee ?? course.lab_fee ?? 0;

                                const totalFee = lecFee + labFee;

                                return (
                                  <tr
                                    key={course.program_tagging_id}
                                    style={{
                                      backgroundColor:
                                        index % 2 === 0
                                          ? "#ffffff"
                                          : "lightgray",
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
                                    <td
                                      style={{
                                        ...cellStyle,
                                        textAlign: "right",
                                      }}
                                    >
                                      <input
                                        type="number"
                                        value={lecFee}
                                        readOnly={!canEdit}
                                        onChange={(e) =>
                                          handleFeeChange(
                                            course.program_tagging_id,
                                            "lec_fee",
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
                                        textAlign: "right",
                                      }}
                                    >
                                      <input
                                        type="number"
                                        value={labFee}
                                        readOnly={!canEdit}
                                        onChange={(e) =>
                                          handleFeeChange(
                                            course.program_tagging_id,
                                            "lab_fee",
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

                                    {/* NSTP */}
                                    <td style={cellStyle}>
                                      <FormControl size="small" fullWidth>
                                        <Select
                                          value={Number(
                                            edit.is_nstp ?? course.is_nstp ?? 0,
                                          )}
                                          disabled={!canEdit}
                                          onChange={(e) =>
                                            handleFeeChange(
                                              course.program_tagging_id,
                                              "is_nstp",
                                              e.target.value,
                                            )
                                          }
                                        >
                                          <MenuItem value={0}>No</MenuItem>
                                          <MenuItem value={1}>Yes</MenuItem>
                                        </Select>
                                      </FormControl>
                                    </td>

                                    {/* COMPUTER LAB */}
                                    <td style={cellStyle}>
                                      <FormControl size="small" fullWidth>
                                        <Select
                                          value={Number(
                                            edit.iscomputer_lab ??
                                              course.iscomputer_lab ??
                                              0,
                                          )}
                                          disabled={!canEdit}
                                          onChange={(e) =>
                                            handleFeeChange(
                                              course.program_tagging_id,
                                              "iscomputer_lab",
                                              e.target.value,
                                            )
                                          }
                                        >
                                          <MenuItem value={0}>No</MenuItem>
                                          <MenuItem value={1}>Yes</MenuItem>
                                        </Select>
                                      </FormControl>
                                    </td>

                                    {/* LABORATORY */}
                                    <td style={cellStyle}>
                                      <FormControl size="small" fullWidth>
                                        <Select
                                          value={Number(
                                            edit.islaboratory_fee ??
                                              course.islaboratory_fee ??
                                              0,
                                          )}
                                          disabled={!canEdit}
                                          onChange={(e) =>
                                            handleFeeChange(
                                              course.program_tagging_id,
                                              "islaboratory_fee",
                                              e.target.value,
                                            )
                                          }
                                        >
                                          <MenuItem value={0}>No</MenuItem>
                                          <MenuItem value={1}>Yes</MenuItem>
                                        </Select>
                                      </FormControl>
                                    </td>
                                    {/* TOTAL */}
                                    <td
                                      style={{
                                        ...cellStyle,
                                        textAlign: "right",
                                      }}
                                    >
                                      {totalFee.toLocaleString()}
                                    </td>
                                  </tr>
                                );
                              })}

                              <tr
                                style={{
                                  fontWeight: "bold",
                                  backgroundColor: "#f0f0f0",
                                }}
                              >
                                {/* LABEL */}
                                <td
                                  colSpan={6}
                                  style={{ ...cellStyle, textAlign: "right" }}
                                >
                                  TOTAL UNITS / TOTAL FEES
                                </td>

                                {/* TOTAL UNITS */}
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  {semesterCourses.reduce(
                                    (sum, course) =>
                                      sum + Number(course.course_unit ?? 0),
                                    0,
                                  )}
                                </td>

                                {/* TOTAL LEC */}
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  {semesterCourses
                                    .reduce(
                                      (sum, course) =>
                                        sum +
                                        (editedFees[course.program_tagging_id]
                                          ?.lec_fee ??
                                          course.lec_fee ??
                                          0),
                                      0,
                                    )
                                    .toLocaleString()}
                                </td>

                                {/* TOTAL LAB */}
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  {semesterCourses
                                    .reduce(
                                      (sum, course) =>
                                        sum +
                                        (editedFees[course.program_tagging_id]
                                          ?.lab_fee ??
                                          course.lab_fee ??
                                          0),
                                      0,
                                    )
                                    .toLocaleString()}
                                </td>

                                {/* ✅ TOTAL FEE = LEC + LAB */}
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  {semesterCourses
                                    .reduce(
                                      (sum, course) =>
                                        sum +
                                        (editedFees[course.program_tagging_id]
                                          ?.lec_fee ??
                                          course.lec_fee ??
                                          0) +
                                        (editedFees[course.program_tagging_id]
                                          ?.lab_fee ??
                                          course.lab_fee ??
                                          0),
                                      0,
                                    )
                                    .toLocaleString()}
                                </td>
                              </tr>

                              {extraFeesForSem.map((fee) => (
                                <tr
                                  key={fee.fee_code}
                                  style={{
                                    backgroundColor: "#f9f9ff",
                                    fontWeight: "bold",
                                  }}
                                >
                                  <td
                                    colSpan={9}
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                    }}
                                  >
                                    {fee.description}:
                                  </td>
                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                    }}
                                  >
                                    {Number(fee.amount).toLocaleString()}
                                  </td>
                                </tr>
                              ))}

                              <tr>
                                <th
                                  colSpan={81}
                                  style={{
                                    backgroundColor: "#f5f5f5",
                                    border: `1px solid ${borderColor}`,
                                    padding: "10px",
                                    fontWeight: "bold",
                                    textAlign: "left",
                                    fontSize: "21px",
                                    color: titleColor,
                                  }}
                                >
                                  Tuition Fee
                                </th>
                              </tr>

                              <tr>
                                <td
                                  colSpan={9}
                                  style={{
                                    ...cellStyle,
                                    textAlign: "left",
                                    backgroundColor: "#eef5ff",
                                    fontWeight: "bold",
                                  }}
                                >
                                  Tuition Fee:
                                </td>
                                <td
                                  style={{
                                    ...cellStyle,
                                    textAlign: "center",
                                    backgroundColor: "#eef5ff",
                                  }}
                                >
                                  {tuitionFeeAmount.toLocaleString()}
                                </td>
                              </tr>

                              {hasNSTP && (
                                <tr>
                                  <td
                                    colSpan={9}
                                    style={{
                                      ...cellStyle,
                                      textAlign: "left",
                                      backgroundColor: "#eef5ff",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    NSTP Fee:
                                  </td>
                                  <td
                                    style={{
                                      ...cellStyle,
                                      backgroundColor: "#eef5ff",
                                    }}
                                  >
                                    {nstpFeeAmount.toLocaleString()}
                                  </td>
                                </tr>
                              )}

                              <tr
                                style={{
                                  fontWeight: "bold",
                                  backgroundColor: "#f0f0f0",
                                }}
                              >
                                <td
                                  colSpan={9}
                                  style={{ ...cellStyle, textAlign: "right" }}
                                >
                                  TOTAL TUITION (Tuition + NSTP):
                                </td>
                                <td
                                  style={{
                                    ...cellStyle,
                                    textAlign: "right",
                                    color: "red",
                                  }}
                                >
                                  {(
                                    tuitionFeeAmount + nstpFeeAmount
                                  ).toLocaleString()}
                                </td>
                              </tr>

                              <tr>
                                <th
                                  colSpan={81}
                                  style={{
                                    backgroundColor: "#f5f5f5",
                                    border: `1px solid ${borderColor}`,
                                    padding: "10px",
                                    fontWeight: "bold",
                                    textAlign: "left",
                                    fontSize: "21px",
                                    color: titleColor,
                                  }}
                                >
                                  Miscellaneuos Fee
                                </th>
                              </tr>

                              {/* ===== TOSF FEES ===== */}
                              {tosf && (
                                <>
                                  <tr>
                                    <td
                                      colSpan={9}
                                      style={{
                                        ...cellStyle,
                                        textAlign: "left",
                                      }}
                                    >
                                      Athletic Fee:
                                    </td>
                                    <td style={cellStyle}>
                                      {tosf.athletic_fee}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td
                                      colSpan={9}
                                      style={{
                                        ...cellStyle,
                                        textAlign: "left",
                                      }}
                                    >
                                      Cultural Fee:
                                    </td>
                                    <td style={cellStyle}>
                                      {tosf.cultural_fee}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td
                                      colSpan={9}
                                      style={{
                                        ...cellStyle,
                                        textAlign: "left",
                                      }}
                                    >
                                      Developmental Fee:
                                    </td>
                                    <td style={cellStyle}>
                                      {tosf.developmental_fee}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td
                                      colSpan={9}
                                      style={{
                                        ...cellStyle,
                                        textAlign: "left",
                                      }}
                                    >
                                      Guidance Fee:
                                    </td>
                                    <td style={cellStyle}>
                                      {tosf.guidance_fee}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td
                                      colSpan={9}
                                      style={{
                                        ...cellStyle,
                                        textAlign: "left",
                                      }}
                                    >
                                      Library Fee:
                                    </td>
                                    <td style={cellStyle}>
                                      {tosf.library_fee}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td
                                      colSpan={9}
                                      style={{
                                        ...cellStyle,
                                        textAlign: "left",
                                      }}
                                    >
                                      Medical & Dental Fee:
                                    </td>
                                    <td style={cellStyle}>
                                      {tosf.medical_and_dental_fee}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td
                                      colSpan={9}
                                      style={{
                                        ...cellStyle,
                                        textAlign: "left",
                                      }}
                                    >
                                      Registration Fee:
                                    </td>
                                    <td style={cellStyle}>
                                      {tosf.registration_fee}
                                    </td>
                                  </tr>
                                </>
                              )}

                              {isFirstYearFirstSem && (
                                <tr>
                                  <td
                                    colSpan={9}
                                    style={{ ...cellStyle, textAlign: "left" }}
                                  >
                                    School ID Fee:
                                  </td>
                                  <td style={cellStyle}>
                                    {Number(
                                      tosf?.school_id_fees || 0,
                                    ).toLocaleString()}
                                  </td>
                                </tr>
                              )}

                              {hasComputerLab && (
                                <tr>
                                  <td
                                    colSpan={9}
                                    style={{
                                      ...cellStyle,
                                      textAlign: "left",
                                      backgroundColor: "#eef5ff",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    Computer Fee:
                                  </td>
                                  <td
                                    style={{
                                      ...cellStyle,
                                      backgroundColor: "#eef5ff",
                                    }}
                                  >
                                    {Number(
                                      tosf?.computer_fees || 0,
                                    ).toLocaleString()}
                                  </td>
                                </tr>
                              )}

                              {hasNonComputerLab && (
                                <tr>
                                  <td
                                    colSpan={9}
                                    style={{
                                      ...cellStyle,
                                      textAlign: "left",
                                      backgroundColor: "#eef5ff",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    Laboratory Fee:
                                  </td>
                                  <td
                                    style={{
                                      ...cellStyle,
                                      backgroundColor: "#eef5ff",
                                    }}
                                  >
                                    {Number(
                                      tosf?.laboratory_fees || 0,
                                    ).toLocaleString()}
                                  </td>
                                </tr>
                              )}

                              {/* ===== EXTRA FEES ROWS (like NSTP) ===== */}
                              {computedExtraFees.map((fee, idx) => (
                                <tr
                                  key={`extra-${idx}`}
                                  style={{ backgroundColor: "#fafafa" }}
                                >
                                  <td
                                    colSpan={9}
                                    style={{ ...cellStyle, textAlign: "left" }}
                                  >
                                    {fee.label}:
                                  </td>

                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                    }}
                                  >
                                    {Number(fee.amount).toLocaleString()}
                                  </td>
                                </tr>
                              ))}

                              {semesterCourses && (
                                <tr style={{ backgroundColor: "#eef5ff" }}>
                                  <td
                                    colSpan={9}
                                    style={{
                                      ...cellStyle,
                                      textAlign: "left",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    Total Miscellaneous Fee:
                                  </td>
                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                    }}
                                  >
                                    {miscAmount.toLocaleString()}
                                  </td>
                                </tr>
                              )}

                              <tr
                                style={{
                                  fontWeight: "bold",
                                  backgroundColor: "#f0f0f0",
                                }}
                              >
                                <td
                                  colSpan={9}
                                  style={{ ...cellStyle, textAlign: "right" }}
                                >
                                  TOTAL TUITION & FEES:
                                </td>

                                <td
                                  style={{
                                    ...cellStyle,
                                    textAlign: "right",
                                    color: "red",
                                  }}
                                >
                                  {(
                                    tuitionFeeAmount +
                                    miscAmount +
                                    nstpFeeAmount
                                  ).toLocaleString()}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          {/* SAVE BUTTON */}
                          {canEdit && (
                            <button
                              onClick={() =>
                                handleSaveSemester(semesterCourses)
                              }
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
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CurriculumFeeManagement;
