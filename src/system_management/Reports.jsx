import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import API_BASE_URL from "../apiConfig";
import { SettingsContext } from "../App";
import LoadingOverlay from "../components/LoadingOverlay";
import Unauthorized from "../components/Unauthorized";

const PAGE_ID = 176;

const emptyFilters = {
  campusId: "",
  curriculumId: "",
  yearId: "",
  semesterId: "",
  yearLevelId: "all",
  sectionId: "all",
  page: 0,
  pageSize: 25,
  search: "",
};

const emptyOptions = {
  curricula: [],
  terms: [],
  year_levels: [],
  sections: [],
};

const emptyReport = {
  summary: { total_students: 0 },
  by_curriculum: [],
  by_year_level: [],
  students: [],
  pagination: { page: 1, page_size: 25, total_records: 0 },
};

const authConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    "x-employee-id": localStorage.getItem("employee_id") || "",
    "x-page-id": PAGE_ID,
  },
});

const schoolYearLabel = (year) => {
  const value = Number(year);
  return Number.isFinite(value) ? `${value} - ${value + 1}` : String(year || "");
};

const CountTable = ({ title, labelHeading, rows, labelKey, headerColor }) => (
  <TableContainer component={Paper} variant="outlined" sx={{ height: "100%" }}>
    <Typography sx={{ px: 2, py: 1.5, fontWeight: 700 }}>{title}</Typography>
    <Table size="small">
      <TableHead sx={{ bgcolor: headerColor }}>
        <TableRow>
          <TableCell sx={{ color: "white", fontWeight: 700 }}>{labelHeading}</TableCell>
          <TableCell align="right" sx={{ color: "white", fontWeight: 700 }}>
            Students
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length ? (
          rows.map((row) => (
            <TableRow key={`${labelKey}-${row.curriculum_id || row.year_level_id || "none"}`}>
              <TableCell>{row[labelKey]}</TableCell>
              <TableCell align="right">{row.student_count}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={2} align="center" sx={{ color: "text.secondary", py: 3 }}>
              No records found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

const Reports = () => {
  const settings = useContext(SettingsContext);
  const branches = useMemo(() => settings?.branches || [], [settings?.branches]);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#920000";
  const borderColor = colors.border || "#b00000";
  const titleColor = colors.title || "#111";

  const [tab, setTab] = useState("migrated");
  const [hasAccess, setHasAccess] = useState(null);
  const [filters, setFilters] = useState({
    migrated: { ...emptyFilters, curriculumId: "all" },
    enrolled: { ...emptyFilters },
  });
  const [options, setOptions] = useState({
    migrated: emptyOptions,
    enrolled: emptyOptions,
  });
  const [reports, setReports] = useState({
    migrated: emptyReport,
    enrolled: emptyReport,
  });
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");

  const activeFilters = filters[tab];
  const activeOptions = options[tab];
  const activeReport = reports[tab];
  const selectedTerm = useMemo(
    () => activeOptions.terms.find(
      (term) =>
        String(term.year_id) === String(activeFilters.yearId) &&
        String(term.semester_id) === String(activeFilters.semesterId),
    ),
    [activeOptions.terms, activeFilters.yearId, activeFilters.semesterId],
  );

  const updateFilters = (type, values) => {
    setFilters((current) => ({
      ...current,
      [type]: {
        ...current[type],
        ...(typeof values === "function" ? values(current[type]) : values),
      },
    }));
  };

  useEffect(() => {
    const employeeId = localStorage.getItem("employee_id");
    if (!employeeId) {
      setHasAccess(false);
      return;
    }

    axios
      .get(`${API_BASE_URL}/api/page_access/${employeeId}/${PAGE_ID}`, authConfig())
      .then(({ data }) => setHasAccess(Number(data?.page_privilege) === 1))
      .catch(() => setHasAccess(false));
  }, []);

  useEffect(() => {
    if (!branches.length) return;
    const firstCampus = String(branches[0].id);
    setFilters((current) => ({
      migrated: {
        ...current.migrated,
        campusId: current.migrated.campusId || firstCampus,
      },
      enrolled: {
        ...current.enrolled,
        campusId: current.enrolled.campusId || firstCampus,
      },
    }));
  }, [branches]);

  useEffect(() => {
    if (hasAccess !== true || !activeFilters.campusId) return;
    let cancelled = false;
    const loadOptions = async () => {
      setLoadingOptions(true);
      setError("");
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/reports/filter-options`, {
          ...authConfig(),
          params: {
            campusId: activeFilters.campusId,
            curriculumId: activeFilters.curriculumId || undefined,
            yearLevelId: activeFilters.yearLevelId,
            activeSchoolYearId: selectedTerm?.active_school_year_id,
          },
        });
        if (cancelled) return;

        const nextOptions = { ...emptyOptions, ...data };
        setOptions((current) => ({ ...current, [tab]: nextOptions }));
        updateFilters(tab, (current) => {
          const activeTerm = nextOptions.terms.find((term) => Number(term.astatus) === 1)
            || nextOptions.terms[0];
          const curriculumExists = nextOptions.curricula.some(
            (item) => String(item.curriculum_id) === String(current.curriculumId),
          );
          const nextCurriculum = tab === "migrated"
            ? (current.curriculumId === "all" || curriculumExists ? current.curriculumId : "all")
            : (curriculumExists ? current.curriculumId : nextOptions.curricula[0]?.curriculum_id || "");
          const termExists = nextOptions.terms.some(
            (term) =>
              String(term.year_id) === String(current.yearId) &&
              String(term.semester_id) === String(current.semesterId),
          );
          const sectionExists = nextOptions.sections.some(
            (section) => String(section.department_section_id) === String(current.sectionId),
          );
          return {
            curriculumId: nextCurriculum,
            yearId: termExists ? current.yearId : activeTerm?.year_id || "",
            semesterId: termExists ? current.semesterId : activeTerm?.semester_id || "",
            sectionId: tab === "enrolled" && sectionExists ? current.sectionId : "all",
          };
        });
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.response?.data?.error || "Unable to load report filters.");
        }
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    };

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [
    hasAccess,
    tab,
    activeFilters.campusId,
    activeFilters.curriculumId,
    activeFilters.yearLevelId,
    activeFilters.yearId,
    activeFilters.semesterId,
    selectedTerm?.active_school_year_id,
  ]);

  useEffect(() => {
    if (hasAccess !== true || !activeFilters.campusId || !selectedTerm) return;
    if (tab === "enrolled" && !activeFilters.curriculumId) return;

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoadingReport(true);
      setError("");
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/reports/${tab}`, {
          ...authConfig(),
          params: {
            campusId: activeFilters.campusId,
            curriculumId: activeFilters.curriculumId,
            activeSchoolYearId: selectedTerm.active_school_year_id,
            yearLevelId: activeFilters.yearLevelId,
            sectionId: activeFilters.sectionId,
            page: activeFilters.page + 1,
            pageSize: activeFilters.pageSize,
            search: activeFilters.search,
          },
        });
        if (!cancelled) {
          setReports((current) => ({ ...current, [tab]: data }));
        }
      } catch (requestError) {
        if (!cancelled) {
          setReports((current) => ({ ...current, [tab]: emptyReport }));
          setError(requestError.response?.data?.error || "Unable to load the report.");
        }
      } finally {
        if (!cancelled) setLoadingReport(false);
      }
    }, activeFilters.search ? 350 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [
    hasAccess,
    tab,
    activeFilters.campusId,
    activeFilters.curriculumId,
    activeFilters.yearLevelId,
    activeFilters.sectionId,
    activeFilters.page,
    activeFilters.pageSize,
    activeFilters.search,
    selectedTerm,
  ]);

  const yearOptions = useMemo(() => {
    const unique = new Map();
    activeOptions.terms.forEach((term) => {
      if (!unique.has(String(term.year_id))) unique.set(String(term.year_id), term);
    });
    return [...unique.values()];
  }, [activeOptions.terms]);

  const semesterOptions = activeOptions.terms.filter(
    (term) => String(term.year_id) === String(activeFilters.yearId),
  );

  const handleFilterChange = (field, value) => {
    updateFilters(tab, () => {
      const changes = { [field]: value, page: 0 };
      if (field === "campusId") {
        changes.curriculumId = tab === "migrated" ? "all" : "";
        changes.sectionId = "all";
      }
      if (field === "curriculumId" || field === "yearLevelId") changes.sectionId = "all";
      if (field === "yearId") {
        const firstTerm = activeOptions.terms.find(
          (term) => String(term.year_id) === String(value),
        );
        changes.semesterId = firstTerm?.semester_id || "";
        changes.sectionId = "all";
      }
      if (field === "semesterId") changes.sectionId = "all";
      return changes;
    });
  };

  if (hasAccess === null) return <LoadingOverlay open message="Loading reports..." />;
  if (!hasAccess) return <Unauthorized />;

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 }, height: "calc(100vh - 150px)", overflowY: "auto" }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: titleColor, mb: 1 }}>
        REPORTS
      </Typography>
      <Box sx={{ borderBottom: "1px solid #ccc", mb: 2 }} />

      <Paper variant="outlined" sx={{ borderColor, overflow: "hidden" }}>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          sx={{
            bgcolor: headerColor,
            "& .MuiTab-root": { color: "rgba(255,255,255,.75)", fontWeight: 700 },
            "& .Mui-selected": { color: "white !important" },
            "& .MuiTabs-indicator": { bgcolor: "white", height: 3 },
          }}
        >
          <Tab value="migrated" label="Migrated Data" />
          <Tab value="enrolled" label="Enrolled Data" />
        </Tabs>

        <Box
          sx={{
            p: 2,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          <FormControl fullWidth size="small">
            <InputLabel>Campus</InputLabel>
            <Select
              label="Campus"
              value={activeFilters.campusId}
              onChange={(event) => handleFilterChange("campusId", event.target.value)}
            >
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={String(branch.id)}>{branch.branch}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Active Curriculum</InputLabel>
            <Select
              label="Active Curriculum"
              value={activeFilters.curriculumId}
              onChange={(event) => handleFilterChange("curriculumId", event.target.value)}
            >
              {tab === "migrated" && <MenuItem value="all">All</MenuItem>}
              {activeOptions.curricula.map((curriculum) => (
                <MenuItem key={curriculum.curriculum_id} value={curriculum.curriculum_id}>
                  {curriculum.curriculum_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Active School Year</InputLabel>
            <Select
              label="Active School Year"
              value={activeFilters.yearId}
              onChange={(event) => handleFilterChange("yearId", event.target.value)}
            >
              {yearOptions.map((year) => (
                <MenuItem key={year.year_id} value={year.year_id}>
                  {schoolYearLabel(year.year_description)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Active Semester</InputLabel>
            <Select
              label="Active Semester"
              value={activeFilters.semesterId}
              onChange={(event) => handleFilterChange("semesterId", event.target.value)}
            >
              {semesterOptions.map((semester) => (
                <MenuItem key={semester.active_school_year_id} value={semester.semester_id}>
                  {semester.semester_description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>Year Level</InputLabel>
            <Select
              label="Year Level"
              value={activeFilters.yearLevelId}
              onChange={(event) => handleFilterChange("yearLevelId", event.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              {activeOptions.year_levels.map((level) => (
                <MenuItem key={level.year_level_id} value={level.year_level_id}>
                  {level.year_level_description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {tab === "enrolled" && (
            <FormControl fullWidth size="small">
              <InputLabel>Section</InputLabel>
              <Select
                label="Section"
                value={activeFilters.sectionId}
                onChange={(event) => handleFilterChange("sectionId", event.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                {activeOptions.sections.map((section) => (
                  <MenuItem key={section.department_section_id} value={section.department_section_id}>
                    {section.section_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      <Box sx={{ position: "relative", minHeight: 260 }}>
        {(loadingOptions || loadingReport) && (
          <Box sx={{ position: "absolute", inset: 0, zIndex: 2, bgcolor: "rgba(255,255,255,.65)", display: "grid", placeItems: "center" }}>
            <CircularProgress />
          </Box>
        )}

        <Paper
          variant="outlined"
          sx={{ mt: 2, p: 2, borderColor, display: "flex", alignItems: "center", gap: 2 }}
        >
          <PeopleAltOutlinedIcon sx={{ color: headerColor, fontSize: 42 }} />
          <Box>
            <Typography color="text.secondary">
              Total {tab === "migrated" ? "Migrated" : "Enrolled"} Students
            </Typography>
            <Typography variant="h4" fontWeight={800}>{activeReport.summary?.total_students || 0}</Typography>
          </Box>
        </Paper>

        <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
          <CountTable
            title="Number of Students per Curriculum"
            labelHeading="Curriculum"
            rows={activeReport.by_curriculum || []}
            labelKey="curriculum_name"
            headerColor={headerColor}
          />
          <CountTable
            title="Number of Students per Year Level"
            labelHeading="Year Level"
            rows={activeReport.by_year_level || []}
            labelKey="year_level_name"
            headerColor={headerColor}
          />
        </Box>

        <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, borderColor }}>
          <Box sx={{ p: 2, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AssessmentOutlinedIcon sx={{ color: headerColor }} />
              <Typography fontWeight={700}>
                {tab === "migrated" ? "Imported Student List" : "Enrolled Student List"}
              </Typography>
            </Box>
            <TextField
              size="small"
              label="Search student"
              value={activeFilters.search}
              onChange={(event) => handleFilterChange("search", event.target.value)}
              sx={{ width: { xs: "100%", sm: 280 } }}
            />
          </Box>
          <Table size="small">
            <TableHead sx={{ bgcolor: headerColor }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: 700, width: "35%" }}>Student Number</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 700 }}>Student Full Name</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeReport.students?.length ? (
                activeReport.students.map((student) => (
                  <TableRow key={student.student_number} hover>
                    <TableCell>{student.student_number}</TableCell>
                    <TableCell>{student.student_full_name}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No students found for the selected filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={activeReport.pagination?.total_records || 0}
            page={activeFilters.page}
            rowsPerPage={activeFilters.pageSize}
            rowsPerPageOptions={[10, 25, 50, 100]}
            onPageChange={(_, page) => updateFilters(tab, { page })}
            onRowsPerPageChange={(event) => updateFilters(tab, { page: 0, pageSize: Number(event.target.value) })}
          />
        </TableContainer>
      </Box>
    </Box>
  );
};

export default Reports;
