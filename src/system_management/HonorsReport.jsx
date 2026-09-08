import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  Snackbar,
  Paper,
  Alert,
} from "@mui/material";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png"; // adjust path as needed
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import SearchIcon from "@mui/icons-material/Search";
import PrintIcon from "@mui/icons-material/Print";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SchoolIcon from "@mui/icons-material/School";
import { FcPrint } from "react-icons/fc";

// ─── Honor badge colors ───────────────────────────────────────────────────────
const HONOR_COLORS = {
  "President Lister": { bg: "#fff8e1", color: "#f59e0b", border: "#fbbf24" },
  "Dean Lister": { bg: "#e8f5e9", color: "#16a34a", border: "#4ade80" },
  "Summa Cum Laude": { bg: "#fce7f3", color: "#be185d", border: "#f472b6" },
  "Magna Cum Laude": { bg: "#ede9fe", color: "#7c3aed", border: "#a78bfa" },
  "Cum Laude": { bg: "#e0f2fe", color: "#0369a1", border: "#38bdf8" },
};

const getHonorChip = (title) => {
  const style = HONOR_COLORS[title] || {
    bg: "#f5f5f5",
    color: "#333",
    border: "#ccc",
  };
  return (
    <Chip
      label={title}
      size="small"
      sx={{
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        fontWeight: 700,
        fontSize: "11px",
      }}
    />
  );
};

// ─── Rank badge ─────────────────────────────────────────────────────────────
// Two ranking "modes" depending on which filters are active:
//
//   "overall"  → no College/Program filter selected. Rank is computed across
//                the WHOLE filtered batch (Campus + School Year only), so
//                #1/#2/#3 really mean Valedictorian / Salutatorian / 3rd Honor.
//                Backed by `row.overall_rank` from the API.
//
//   "narrowed" → a College and/or Program filter is active. Rank is now
//                scoped to that group, so it's just "1st/2nd/3rd in Group",
//                not a school-wide honor. Backed by `row.college_rank`
//                (which, since a Program always belongs to exactly one
//                College, is already correctly scoped for both cases).
//
// This function is pure — it takes the context in as a parameter instead of
// reading component state directly, so it's safe to keep at module scope.
const getRankLabel = (rank, context) => {
  if (!rank) return "—";

  if (context === "overall") {
    if (rank === 1) return "🏅 Valedictorian";
    if (rank === 2) return "🥈 Salutatorian";
    if (rank === 3) return "🥉 3rd Honor";
    return `#${rank}`;
  }

  // "narrowed" — College and/or Program filter active
  if (rank === 1) return "🏅 1st in Group";
  if (rank === 2) return "🥈 2nd in Group";
  if (rank === 3) return "🥉 3rd in Group";
  return `#${rank}`;
};

const TABS = [
  {
    key: "academic",
    label: "Academic Achievers",
    icon: <EmojiEventsIcon fontSize="small" />,
  },
  {
    key: "latin",
    label: "Latin Honors",
    icon: <SchoolIcon fontSize="small" />,
  },
];

const rowsPerPage = 100; // keeps every page fetch small — the ranking below
// is computed server-side (SQL window functions), so the browser never has
// to pull or sort the full student list to know who's #1/#2 overall or
// within a college/program.

export default function HonorsReport() {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const printRef = useRef(null);

  // ── access / auth ──────────────────────────────────────────────────────────
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const pageId = 146;

  // ── settings / branding ────────────────────────────────────────────────────
  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [stepperColor, setStepperColor] = useState("#000000");
  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [branches, setBranches] = useState([]);

  const headerColor = colors.header || "#1976d2";

  // ── Load settings ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!settings) return;

    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

    setFetchedLogo(
      assets.logoUrl ? assets.logoUrl : EaristLogo,
    );

    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    setBranches(settings?.branches || []);
  }, [settings]);

  // ── Resolve campus address based on selected campus filter ─────────────────
  const [campusId, setCampusId] = useState("");

  useEffect(() => {
    if (!settings) return;

    const matchedBranch = branches.find(
      (branch) => String(branch?.id) === String(campusId),
    );

    if (matchedBranch?.address) {
      setCampusAddress(matchedBranch.address);
      return;
    }
    if (branding.campusAddress) {
      setCampusAddress(branding.campusAddress);
      return;
    }
    setCampusAddress(branding.campusAddress || "");
  }, [settings, branches, campusId, branding.campusAddress]);

  // ── tabs / filters ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("academic");
  const [searchQuery, setSearchQuery] = useState("");
  const [programId, setProgramId] = useState("");
  const [departmentId, setDepartmentId] = useState(""); // College filter
  const [schoolYearId, setSchoolYearId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ── dropdown options ───────────────────────────────────────────────────────
  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]); // list of colleges
  const [schoolYears, setSchoolYears] = useState([]);
  const [semesters, setSemesters] = useState([]); // fetched from API

  // ── data ───────────────────────────────────────────────────────────────────
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // ── Rank context — this is THE fix. It must live inside the component,
  //    since it depends on programId/departmentId state, and it drives both
  //    which rank column we read (overall_rank vs college_rank) and which
  //    label set getRankLabel uses. ──────────────────────────────────────────
  const rankContext = useMemo(
    () => (programId || departmentId ? "narrowed" : "overall"),
    [programId, departmentId],
  );

  const getRowRank = useCallback(
    (row) => (rankContext === "overall" ? row.overall_rank : row.college_rank),
    [rankContext],
  );

  // ── auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedEmployeeID = localStorage.getItem("employee_id");
    if (storedRole && storedEmployeeID) {
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
      const res = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`,
      );
      setHasAccess(res.data?.page_privilege === 1);
    } catch {
      setHasAccess(false);
    }
  };

  // ── Load dropdowns once ────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasAccess) return;
    axios
      .get(`${API_BASE_URL}/api/honors/school_years`)
      .then((r) => setSchoolYears(r.data))
      .catch(console.error);
    // Semesters from DB (semester_table) — no more hardcoded S1/S2/S3
    axios
      .get(`${API_BASE_URL}/api/honors/semesters`)
      .then((r) => setSemesters(r.data))
      .catch(console.error);
    // Colleges from DB (dprtmnt_table) — powers the College filter
    axios
      .get(`${API_BASE_URL}/api/honors/departments`)
      .then((r) => setDepartments(r.data))
      .catch(console.error);
    axios
      .get(`${API_BASE_URL}/api/active_school_year`)
      .then((r) => {
        const activeTerm = Array.isArray(r.data) ? r.data[0] : r.data;
        if (activeTerm) {
          setSchoolYearId(activeTerm.year_id ?? "");
          if (activeTab === "academic") {
            setSemesterId(activeTerm.semester_id ?? "");
          }
        }
      })
      .catch(console.error);
  }, [hasAccess, activeTab]);

  useEffect(() => {
    if (!hasAccess) return;
    axios
      .get(`${API_BASE_URL}/api/honors/programs`, {
        params: {
          campus_id: campusId || undefined,
        },
      })
      .then((r) => setPrograms(r.data))
      .catch(console.error);
  }, [hasAccess, activeTab, campusId]);

  useEffect(() => {
    if (
      programId &&
      !programs.some((p) => String(p.program_id) === String(programId))
    ) {
      setProgramId("");
    }
  }, [programs, programId]);

  useEffect(() => {
    if (
      departmentId &&
      !departments.some((d) => String(d.dprtmnt_id) === String(departmentId))
    ) {
      setDepartmentId("");
    }
  }, [departments, departmentId]);

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const endpoint =
    activeTab === "academic"
      ? "/api/honors/academic_achievers"
      : "/api/honors/latin_honors";

  const fetchData = useCallback(
    async (signal) => {
      setListLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}${endpoint}`, {
          params: {
            page: currentPage,
            limit: rowsPerPage, // top 100 per page — keeps the initial load fast
            search: searchQuery,
            program_id: programId || undefined,
            department_id: departmentId || undefined, // College filter
            school_year_id: schoolYearId || undefined,
            semester_id:
              activeTab === "academic" ? semesterId || undefined : undefined,
            campus_id: campusId || undefined,
          },
          signal,
        });
        setRows(res.data.data);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      } catch (err) {
        if (axios.isCancel(err) || err.name === "CanceledError") return;
        console.error(err);
      } finally {
        if (!signal?.aborted) setListLoading(false);
      }
    },
    [
      endpoint,
      currentPage,
      searchQuery,
      programId,
      departmentId,
      schoolYearId,
      semesterId,
      campusId,
      activeTab,
    ],
  );

  useEffect(() => {
    if (activeTab !== "academic") {
      setSemesterId(""); // only clear semester now, not school year
    }
  }, [activeTab]);

  useEffect(() => {
    if (!hasAccess) return;
    const ctrl = new AbortController();
    const timeout = setTimeout(() => fetchData(ctrl.signal), 400);
    return () => {
      clearTimeout(timeout);
      ctrl.abort();
    };
  }, [fetchData, hasAccess]);

  // Reset to page 1 when filters/tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeTab,
    searchQuery,
    programId,
    departmentId,
    schoolYearId,
    semesterId,
    campusId,
  ]);

  useEffect(() => {
    if (activeTab !== "academic") {
      setSchoolYearId("");
      setSemesterId("");
    }
  }, [activeTab]);

  // ── Pagination helpers ─────────────────────────────────────────────────────
  const startIndex = (currentPage - 1) * rowsPerPage;
  const pageOptions = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages],
  );

  const btnStyle = {
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
  const selectStyle = {
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

  // ── Print — layout from printDiv reference ─────────────────────────────────
  const handlePrint = () => {
    const resolvedCampusAddress = campusAddress || "No address set in Settings";

    // ✅ Dynamic logo and company name
    const logoSrc = fetchedLogo || EaristLogo;
    const name = companyName?.trim() || "";

    // ✅ Split company name into two balanced lines
    const words = name.split(" ");
    const middleIndex = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, middleIndex).join(" ");
    const secondLine = words.slice(middleIndex).join(" ");

    const honorLabel =
      activeTab === "academic"
        ? "Academic Achievers List"
        : "Latin Honors List";

    const selectedProgram = programs.find(
      (p) => String(p.program_id) === String(programId),
    );

    const selectedDepartment = departments.find(
      (d) => String(d.dprtmnt_id) === String(departmentId),
    );

    const selectedSchoolYear =
      activeTab === "academic"
        ? schoolYears.find(
            (s) => String(s.school_year_id) === String(schoolYearId),
          )
        : null;

    const selectedSemester =
      activeTab === "academic"
        ? semesters.find((s) => String(s.semester_id) === String(semesterId))
        : null;

    const selectedCampus = branches.find(
      (b) => String(b.id) === String(campusId),
    );

    const filterMeta = [
      selectedCampus && selectedCampus.branch,
      selectedDepartment && selectedDepartment.dprtmnt_name,
      selectedProgram &&
        `${selectedProgram.program_code}${
          selectedProgram.major ? ` (${selectedProgram.major})` : ""
        }`,
      selectedSchoolYear && selectedSchoolYear.school_year_description,
      selectedSemester && selectedSemester.semester_description,
    ]
      .filter(Boolean)
      .join(" | ");

    const gwaCol = activeTab === "academic" ? "gwa" : "cumulative_gwa";

    const honorCol = activeTab === "academic" ? "honor_title" : "latin_honor";

    // ✅ Generate printable HTML
    const newWin = window.open("", "Print-Window");

    newWin.document.open();

    newWin.document.write(`
    <html>
      <head>
        <title>${honorLabel}</title>

        <style>
          @page {
            size: A4 landscape;
            margin: 5mm;
          }

          body {
            font-family: Arial;
            margin: 0;
            padding: 0;
          }

          .print-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding-left: 10px;
            padding-right: 10px;
          }

          .print-header {
            position: relative;
            width: 100%;
            text-align: center;
            margin-top: 10px;
          }

          .print-header img {
            position: absolute;
            left: 220px;
            top: -10px;
            width: 120px;
            height: 120px;
            border-radius: 50%;
            object-fit: cover;
          }

          .header-text {
            display: inline-block;
            padding-left: 100px;
          }

          .filter-meta {
            font-size: 12px;
            margin-top: 4px;
          }

          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 20px;
            border: 1.5px solid black;
            table-layout: fixed;
          }

          th,
          td {
            border: 1.5px solid black;
            padding: 6px 8px;
            font-size: 13px;
            text-align: center;
            word-wrap: break-word;
          }

          table tr td:last-child,
          table tr th:last-child {
            border-right: 1.5px solid black !important;
          }

          th {
            background-color: lightgray;
            color: black;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .honor-badge {
            font-weight: bold;
          }
        </style>
      </head>

      <body onload="window.print(); setTimeout(() => window.close(), 100);">

        <div class="print-container">

          <!-- ✅ HEADER -->
          <div class="print-header">

            <img src="${logoSrc}" alt="School Logo" />

            <div class="header-text">

              <div style="font-size: 13px; font-family: Arial">
                Republic of the Philippines
              </div>

              ${
                name
                  ? `
                    <b style="letter-spacing: 1px; font-size: 20px; font-family: Arial, sans-serif;">
                      ${firstLine}
                    </b>

                    ${
                      secondLine
                        ? `
                          <div style="letter-spacing: 1px; font-size: 20px; font-family: Arial, sans-serif;">
                            <b>${secondLine}</b>
                          </div>
                        `
                        : ""
                    }
                  `
                  : ""
              }

              <div style="font-size: 13px; font-family: Arial">
                ${resolvedCampusAddress}
              </div>

              <div style="margin-top: 30px;">
                <b style="font-size: 24px; letter-spacing: 1px;">
                  ${honorLabel}
                </b>
              </div>

              ${
                filterMeta
                  ? `
                    <div class="filter-meta">
                      ${filterMeta}
                    </div>
                  `
                  : ""
              }

              <div class="filter-meta">
                Total: ${total} student(s)
              </div>

            </div>
          </div>

          <!-- ✅ TABLE -->
          <table>

            <thead>
              <tr>
                <th style="width:5%">#</th>
                <th style="width:11%">Student No.</th>
                <th style="width:22%">Student Name</th>
                <th style="width:13%">Department</th>
                <th style="width:13%">Program</th>
                <th style="width:11%">Honor</th>
                <th style="width:7%">Weighted GWA</th>
                <th style="width:7%">Subjects</th>
                <th style="width:8%">Rank</th>
              </tr>
            </thead>

            <tbody>

              ${
                rows.length > 0
                  ? rows
                      .map(
                        (row, idx) => `
                          <tr>

                            <td>
                              ${startIndex + idx + 1}
                            </td>

                            <td>
                              ${row.student_number || ""}
                            </td>

                            <td>
                              ${row.last_name || ""}, 
                              ${row.first_name || ""} 
                              ${row.middle_name || ""}
                            </td>

                            <td>
                              ${row.dprtmnt_name || "—"}
                            </td>

                            <td>
                              ${row.program_code || "—"}
                              ${row.major ? ` (${row.major})` : ""}
                            </td>

                            <td class="honor-badge">
                              ${row[honorCol] || ""}
                            </td>

                            <td>
                              ${row[gwaCol] || ""}
                            </td>

                            <td>
                              ${row.subject_count || ""}
                            </td>

                            <td>
                              ${getRankLabel(getRowRank(row), rankContext)}
                            </td>

                          </tr>
                        `,
                      )
                      .join("")
                  : `
                    <tr>
                      <td colspan="9" style="text-align:center;">
                        No data found
                      </td>
                    </tr>
                  `
              }

            </tbody>

          </table>

        </div>

      </body>
    </html>
  `);

    newWin.document.close();
  };

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (hasAccess === null) return <LoadingOverlay open message="Loading..." />;
  if (!hasAccess) return <Unauthorized />;

  const gwaCol = activeTab === "academic" ? "gwa" : "cumulative_gwa";
  const honorCol = activeTab === "academic" ? "honor_title" : "latin_honor";

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
        p: 2,
        backgroundColor: "transparent",
      }}
    >
      <LoadingOverlay open={loading} message="Loading..." />

      {/* ── Page Title ── */}
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
          sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}
        >
          HONORS REPORT
        </Typography>
        <Box display="flex" alignItems="flex-end" gap={2}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search Student Number / Name"
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
      </Box>

      <hr
        style={{ border: "1px solid #ccc", width: "100%", marginBottom: 16 }}
      />
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
                Academic's Filter
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>
      <Box
        sx={{
          p: 3,

          background: "linear-gradient(135deg, #ffffff, #f8f9ff)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          border: `1px solid ${borderColor}`,
          mb: 3,
        }}
      >
        {/* ── Tabs ── */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            mb: 3,
            flexWrap: "wrap",
            p: 1,
            borderRadius: "14px",
            backgroundColor: "#f4f6fb",
          }}
        >
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "contained" : "outlined"}
              startIcon={tab.icon}
              onClick={() => setActiveTab(tab.key)}
              sx={{
                fontWeight: 700,
                borderRadius: "12px",
                px: 2.5,
                py: 1,
                textTransform: "none",
                backgroundColor:
                  activeTab === tab.key ? headerColor : "transparent",
                borderColor: headerColor,
                color: activeTab === tab.key ? "#fff" : headerColor,
                transition: "all 0.25s ease",
                "&:hover": {
                  backgroundColor:
                    activeTab === tab.key ? headerColor : "#eef2ff",
                  transform: "translateY(-2px)",
                },
              }}
            >
              {tab.label}
            </Button>
          ))}
        </Box>

        {/* ── Filters ── */}
        <Grid container spacing={2} alignItems="center">
          {/* Campus */}
          <Grid item xs={12} sm={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Campus</InputLabel>
              <Select
                value={campusId}
                label="Campus"
                onChange={(e) => setCampusId(e.target.value)}
                sx={{
                  borderRadius: "12px",
                  backgroundColor: "#fff",
                }}
              >
                <MenuItem value="">
                  <em>All Campuses</em>
                </MenuItem>

                {branches.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.branch}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* College — reuses curriculum_table → dprtmnt_curriculum_table →
              dprtmnt_table, the same chain already used to resolve
              dt.dprtmnt_name on every row. Selecting a College (and/or
              Program) switches ranking into "narrowed" mode — see
              rankContext above — so the badge stops claiming
              Valedictorian/Salutatorian once it's no longer ranking the
              whole batch. */}
          <Grid item xs={12} sm={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>College</InputLabel>
              <Select
                value={departmentId}
                label="College"
                onChange={(e) => setDepartmentId(e.target.value)}
                sx={{
                  borderRadius: "12px",
                  backgroundColor: "#fff",
                }}
              >
                <MenuItem value="">
                  <em>All Colleges</em>
                </MenuItem>

                {departments.map((d) => (
                  <MenuItem key={d.dprtmnt_id} value={d.dprtmnt_id}>
                    {d.dprtmnt_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Program */}
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Program</InputLabel>
              <Select
                value={programId}
                label="Program"
                onChange={(e) => setProgramId(e.target.value)}
                sx={{
                  borderRadius: "12px",
                  backgroundColor: "#fff",
                }}
              >
                <MenuItem value="">
                  <em>All Programs</em>
                </MenuItem>

                {programs.map((p) => (
                  <MenuItem key={p.program_id} value={p.program_id}>
                    {p.program_code} – {p.program_description}
                    {p.major ? ` (${p.major})` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {activeTab === "academic" && (
            <>
              {/* School Year */}
              <Grid item xs={12} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>School Year</InputLabel>
                  <Select
                    value={schoolYearId}
                    label="School Year"
                    onChange={(e) => setSchoolYearId(e.target.value)}
                    sx={{
                      borderRadius: "12px",
                      backgroundColor: "#fff",
                    }}
                  >
                    <MenuItem value="">
                      <em>All Years</em>
                    </MenuItem>

                    {schoolYears.map((sy) => (
                      <MenuItem
                        key={sy.school_year_id}
                        value={sy.school_year_id}
                      >
                        {sy.school_year_description}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Semester */}
              <Grid item xs={12} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Semester</InputLabel>

                  <Select
                    value={semesterId}
                    label="Semester"
                    onChange={(e) => setSemesterId(e.target.value)}
                    sx={{
                      borderRadius: "12px",
                      backgroundColor: "#fff",
                    }}
                  >
                    <MenuItem value="">
                      <em>All</em>
                    </MenuItem>

                    {semesters.map((s) => (
                      <MenuItem key={s.semester_id} value={s.semester_id}>
                        {s.semester_description}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          {activeTab !== "academic" && (
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>School Year</InputLabel>
                <Select
                  value={schoolYearId}
                  label="School Year"
                  onChange={(e) => setSchoolYearId(e.target.value)}
                  sx={{ borderRadius: "12px", backgroundColor: "#fff" }}
                >
                  <MenuItem value="">
                    <em>All Years</em>
                  </MenuItem>
                  {schoolYears.map((sy) => (
                    <MenuItem key={sy.school_year_id} value={sy.school_year_id}>
                      {sy.school_year_description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Print Button */}
          <Grid item xs={12} sm="auto">
            <Button
              onClick={handlePrint}
              style={{
                padding: "5px 20px",
                border: "2px solid black",
                backgroundColor: "#f0f0f0",
                color: "black",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
                transition: "background-color 0.3s, transform 0.2s",
                height: "40px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                userSelect: "none",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#d3d3d3")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#f0f0f0")
              }
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = "scale(0.95)")
              }
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              type="button"
            >
              <FcPrint size={20} />
              Print Academic Achiever's
            </Button>
          </Grid>
        </Grid>
      </Box>

      <br />

      {/* ── Top Pagination ── */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                colSpan={9}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor,
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  gap={1}
                >
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Student's Records: {total}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={btnStyle}
                    >
                      First
                    </Button>
                    <Button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={btnStyle}
                    >
                      Prev
                    </Button>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                        sx={selectStyle}
                        MenuProps={{ PaperProps: { sx: { maxHeight: 200 } } }}
                      >
                        {pageOptions.map((p) => (
                          <MenuItem key={p} value={p}>
                            Page {p}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Typography fontSize="11px" color="white">
                      of {totalPages} page{totalPages > 1 ? "s" : ""}
                    </Typography>
                    <Button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(p + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={btnStyle}
                    >
                      Next
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={btnStyle}
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

      {/* ── Main Table ── */}
      <Box sx={{ overflowX: "auto" }}>
        <div ref={printRef}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {[
                  "#",
                  "Student No.",
                  "Name",
                  "Department",
                  "Program",
                  "Honor",
                  "Weighted GWA",
                  "Subjects",
                  "Rank",
                ].map((h, i) => (
                  <TableCell
                    key={i}
                    sx={{
                      border: `1px solid ${borderColor}`,
                      backgroundColor: "#f5f5f5",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {listLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    sx={{
                      border: `1px solid ${borderColor}`,
                      textAlign: "center",
                      py: 4,
                    }}
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    sx={{
                      border: `1px solid ${borderColor}`,
                      textAlign: "center",
                      py: 4,
                    }}
                  >
                    No students found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => (
                  <TableRow
                    key={row.student_number}
                    sx={{
                      backgroundColor: idx % 2 === 0 ? "#ffffff" : "lightgray", // white / light gray
                    }}
                  >
                    <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                      {startIndex + idx + 1}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        fontWeight: 600,
                      }}
                    >
                      {row.student_number}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.last_name}, {row.first_name} {row.middle_name || ""}
                    </TableCell>
                    <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                      {row.dprtmnt_name || "—"}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.program_code || "—"}
                      {row.major ? ` (${row.major})` : ""}
                    </TableCell>
                    <TableCell sx={{ border: `1px solid ${borderColor}` }}>
                      {getHonorChip(row[honorCol])}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        fontWeight: 700,
                        color: "#1976d2",
                      }}
                    >
                      {row[gwaCol]}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                      }}
                    >
                      {row.subject_count}
                    </TableCell>
                    <TableCell
                      sx={{
                        border: `1px solid ${borderColor}`,
                        textAlign: "center",
                        fontWeight: 700,
                      }}
                    >
                      {getRankLabel(getRowRank(row), rankContext)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Box>

      {/* ── Bottom Pagination ── */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                colSpan={9}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor,
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  gap={1}
                >
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Student's Records: {total}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={btnStyle}
                    >
                      First
                    </Button>
                    <Button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={btnStyle}
                    >
                      Prev
                    </Button>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                        sx={selectStyle}
                      >
                        {pageOptions.map((p) => (
                          <MenuItem key={p} value={p}>
                            Page {p}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Typography fontSize="11px" color="white">
                      of {totalPages} page{totalPages > 1 ? "s" : ""}
                    </Typography>
                    <Button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(p + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={btnStyle}
                    >
                      Next
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={btnStyle}
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
