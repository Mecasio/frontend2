import React, { useState, useEffect, useContext, useCallback } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tabs,
  Tab,
  Chip,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import { FcPrint } from "react-icons/fc";

// ─── helpers ──────────────────────────────────────────────────────────────
const pad = (n, len = 5) => String(n).padStart(len, "0");
const yy = (yr) => String(yr).slice(-2);

function buildNumber(activeYear, deptNum, seq, branchLetter) {
  const y = yy(activeYear || new Date().getFullYear());
  const d = deptNum ?? "?";
  const s = pad(seq || 1);
  const b = branchLetter || "?";
  return `${y}${d}-${s}${b}`;
}

const ROWS_PER_PAGE = 25;

const StudentNumberAdmin = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#000000";

  // ── access control ────────────────────────────────────────────────────
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const pageId = 167;

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedEmployeeID = localStorage.getItem("employee_id");
    if (storedRole === "registrar") {
      checkAccess(storedEmployeeID);
    } else {
      window.location.href = "/login";
    }
  }, []);

  const checkAccess = async (employeeID) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`
      );
      setHasAccess(response.data?.page_privilege === 1);
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  // ── data state ────────────────────────────────────────────────────────
  const [depts, setDepts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [dataLoading, setDataLoading] = useState(true);

  const [tab, setTab] = useState(0);
  const [savingDepts, setSavingDepts] = useState(false);
  const [savingBranches, setSavingBranches] = useState(false);

  // ── pagination ────────────────────────────────────────────────────────
  const [deptPage, setDeptPage] = useState(0);
  const [branchPage, setBranchPage] = useState(0);

  const [snack, setSnack] = useState({ open: false, message: "", severity: "info" });
  const showSnack = (message, severity = "info") =>
    setSnack({ open: true, message, severity });
  const handleSnackClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((p) => ({ ...p, open: false }));
  };

  // ── preview selectors ─────────────────────────────────────────────────
  const [prevDeptId, setPrevDeptId] = useState("");
  const [prevBranchId, setPrevBranchId] = useState("");
  const [prevSeq, setPrevSeq] = useState(1);

  const fetchAll = useCallback(async () => {
    setDataLoading(true);
    try {
      const [dRes, bRes, yRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/dept-numbers`),
        axios.get(`${API_BASE_URL}/api/admin/branch-letters`),
        axios.get(`${API_BASE_URL}/api/admin/active-year`),
      ]);
      setDepts(dRes.data || []);
      setBranches(bRes.data || []);
      setActiveYear(yRes.data?.year || new Date().getFullYear());
      if (dRes.data?.length) setPrevDeptId(dRes.data[0].dprtmnt_id);
      if (bRes.data?.length) setPrevBranchId(bRes.data[0].id);
    } catch (e) {
      showSnack(`Failed to load configuration: ${e.message}`, "error");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasAccess) fetchAll();
  }, [hasAccess, fetchAll]);

  // ── print handler (same layout pattern as Qualifying Exam printout) ──
  const printDiv = () => {
    const newWin = window.open("", "Print-Window");
    newWin.document.open();

    const logoSrc = assets.logoUrl
      ? assets.logoUrl
      : EaristLogo;
    const name = branding.companyName?.trim() || "";

    // ✅ Balanced split
    const words = name.split(" ");
    const middleIndex = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, middleIndex).join(" ");
    const secondLine = words.slice(middleIndex).join(" ");

    // ✅ Address
    let campusAddress = "";
    if (branding.campusAddress && branding.campusAddress.trim() !== "") {
      campusAddress = branding.campusAddress;
    } else {
      campusAddress = "No address set in Settings";
    }

    const htmlContent = `
  <html>
    <head>
      <title>Student Number Configuration</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }

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
          padding: 0 15px;
        }

        /* ✅ CLEAN FLEX HEADER */
        .print-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          width: 100%;
          margin-top: 20px;
        }

        .print-header img {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
        }

        .header-text {
          text-align: center;
        }

        .header-text .gov {
          font-size: 13px;
        }

        .header-text .school-name {
          font-size: 20px;
          font-weight: bold;
          letter-spacing: 1px;
          font-family: Arial;
        }

        .header-text .address {
          font-size: 13px;
          margin-top: 2px;
        }

        .header-text .title {
          margin-top: 25px;
          font-size: 22px;
          font-weight: bold;
          letter-spacing: 1px;
        }

        /* ✅ filter context bar (Active Year) */
        .filter-bar {
          margin-top: 10px;
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .filter-chip {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border: 1px solid #999;
          border-radius: 14px;
          background-color: #f5f5f5;
          color: #333;
        }

        .filter-chip span {
          color: #6D2323;
          font-weight: 700;
        }

        /* ✅ TABLE IMPROVED */
        table {
          border-collapse: collapse;
          width: 100%;
          margin-top: 25px;
          border: 1.5px solid black;
          table-layout: fixed;
        }

        th, td {
          border: 1.5px solid black;
          padding: 7px 8px;
          font-size: 13px;
          text-align: center;
          word-wrap: break-word;
        }

        th {
          background-color: lightgray;
          color: black;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* ✅ prevent cutoff */
        th:last-child, td:last-child {
          border-right: 1.5px solid black !important;
        }

      </style>
    </head>

    <body onload="window.print(); setTimeout(() => window.close(), 100);">
      <div class="print-container">

        <!-- ✅ HEADER -->
        <div class="print-header">
          <img src="${logoSrc}" alt="School Logo"/>

          <div class="header-text">
            <div style="font-size: 13px; font-family: Arial">Republic of the Philippines</div>

            ${name
        ? `
              <div class="school-name">${firstLine}</div>
              ${secondLine ? `<div class="school-name">${secondLine}</div>` : ""}
            `
        : ""
      }

            <div class="address">${campusAddress}</div>

            <div class="title">STUDENT NUMBER CONFIGURATION</div>
          </div>
        </div>

        <!-- ✅ FILTER CONTEXT -->
        <div class="filter-bar">
          <div class="filter-chip">Active School Year: <span>${activeYear}</span></div>
          <div class="filter-chip">Total Departments: <span>${depts.length}</span></div>
          <div class="filter-chip">Total Branches: <span>${branches.length}</span></div>
        </div>

        <!-- ✅ TABLE: Dept × Branch Combinations -->
        <table>
          <thead>
            <tr>
              <th style="width:22%">Department</th>
              <th style="width:10%">Dept #</th>
              <th style="width:13%">Campus</th>
              ${branches
        .map(
          (b) =>
            `<th style="width:${Math.max(
              10,
              Math.floor(55 / Math.max(branches.length, 1)),
            )}%">${b.branch} (${b.letter_code || "?"})</th>`,
        )
        .join("")}
            </tr>
          </thead>

          <tbody>
            ${depts
        .map((d) => {
          return `
                <tr>
                  <td>${d.dprtmnt_name ?? "N/A"}</td>
                  <td>${d.dept_number ?? "—"}</td>
                  <td>${Number(d.components) === 2 ? "Cavite" : "Manila"}</td>
                  ${branches
              .map((b) => {
                const num = buildNumber(
                  activeYear,
                  d.dept_number,
                  1,
                  b.letter_code,
                );
                return `<td>${num}</td>`;
              })
              .join("")}
                </tr>
              `;
        })
        .join("")}
          </tbody>
        </table>

      </div>
    </body>
  </html>
  `;

    newWin.document.write(htmlContent);
    newWin.document.close();
  };

  // ── department handlers ───────────────────────────────────────────────
  const updateDeptNum = (id, val) => {
    setDepts((prev) =>
      prev.map((d) =>
        d.dprtmnt_id === id
          ? { ...d, dept_number: val === "" ? null : parseInt(val) }
          : d
      )
    );
  };

  const updateDeptComponents = (id, val) => {
    setDepts((prev) =>
      prev.map((d) =>
        d.dprtmnt_id === id ? { ...d, components: parseInt(val) } : d
      )
    );
  };

  const deptNumValues = depts
    .map((d) => d.dept_number)
    .filter((n) => n !== null && n !== undefined);
  const dupNums = deptNumValues.filter((n, i, a) => a.indexOf(n) !== i);
  const hasDeptErrors =
    dupNums.length > 0 || depts.some((d) => !d.dept_number);

  const saveDepts = async () => {
    if (hasDeptErrors) {
      showSnack("Fix duplicate or missing department numbers before saving.", "error");
      return;
    }
    setSavingDepts(true);
    try {
      await axios.put(`${API_BASE_URL}/api/admin/dept-numbers`, { departments: depts });
      showSnack("Department numbers saved.", "success");
    } catch (e) {
      showSnack(`Save failed: ${e.response?.data?.error || e.message}`, "error");
    } finally {
      setSavingDepts(false);
    }
  };

  // ── branch handlers ───────────────────────────────────────────────────
  const updateBranchLetter = (id, val) => {
    setBranches((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, letter_code: val.toUpperCase().slice(0, 1) } : b
      )
    );
  };

  const hasBranchErrors = branches.some((b) => !b.letter_code);

  const saveBranches = async () => {
    if (hasBranchErrors) {
      showSnack("Every branch needs a letter code before saving.", "error");
      return;
    }
    setSavingBranches(true);
    try {
      await axios.put(`${API_BASE_URL}/api/admin/branch-letters`, { branches });
      showSnack("Branch letters saved.", "success");
    } catch (e) {
      showSnack(`Save failed: ${e.response?.data?.error || e.message}`, "error");
    } finally {
      setSavingBranches(false);
    }
  };

  // ── pagination helpers ────────────────────────────────────────────────
  const paginatedDepts = depts.slice(
    deptPage * ROWS_PER_PAGE,
    (deptPage + 1) * ROWS_PER_PAGE
  );
  const deptTotalPages = Math.ceil(depts.length / ROWS_PER_PAGE);

  const paginatedBranches = branches.slice(
    branchPage * ROWS_PER_PAGE,
    (branchPage + 1) * ROWS_PER_PAGE
  );
  const branchTotalPages = Math.ceil(branches.length / ROWS_PER_PAGE);

  const prevDept = depts.find((d) => d.dprtmnt_id === prevDeptId);
  const prevBranch = branches.find((b) => b.id === prevBranchId);
  const previewNumber = buildNumber(
    activeYear,
    prevDept?.dept_number,
    prevSeq,
    prevBranch?.letter_code
  );

  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }
  if (!hasAccess) return <Unauthorized />;

  // ── segment chip for live preview ─────────────────────────────────────
  const Seg = ({ value, bg, color, label }) => (
    <Box display="flex" flexDirection="column" alignItems="center" mx={0.3}>
      <Box
        sx={{
          fontFamily: "monospace",
          fontSize: 26,
          fontWeight: 700,
          px: 1.5,
          py: 0.3,
          borderRadius: 1,
          backgroundColor: bg,
          color,
          lineHeight: 1.3,
        }}
      >
        {value}
      </Box>
      {label && (
        <Typography
          fontSize={13}
          color="text.secondary"
          mt={0.3}
          sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
        >
          {label}
        </Typography>
      )}
    </Box>
  );

  const commonHeaderCellSx = {
    fontWeight: 600,
    fontSize: 12,
    textTransform: "uppercase",
    color: "text.secondary",
    backgroundColor: "#f5f5f5",
    border: `1px solid ${borderColor}`,
    whiteSpace: "nowrap",
  };

  const commonBodyCellSx = { border: `1px solid ${borderColor}` };


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



        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: "36px",
            minWidth: 0,        // ✅ allow the title to shrink/wrap if needed
          }}
        >
          STUDENT NUMBER CONFIGURATION
        </Typography>


        <button
          onClick={printDiv}
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
            width: "245px", // ✅ same width as Import
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
          PRINT STUDENT NUMBER
        </button>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      {dataLoading ? (
        <LoadingOverlay open={true} message="Loading configuration..." />
      ) : (
        <>
          {/* ── live preview card ── */}
          <TableContainer
            component={Paper}
            sx={{ width: "100%", border: `1px solid ${borderColor}`, mb: 3, boxShadow: 3 }}
          >
            {/* header bar matching SignatureUpload style */}
            <Box sx={{ backgroundColor: headerColor, px: 2, py: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography fontSize={13} fontWeight="bold" color="white">
                  Live Preview
                </Typography>
                <Box sx={{ textAlign: "right" }}>
                  <Typography fontSize={13} sx={{ color: "rgba(255,255,255,0.75)" }}>
                    Active School Year
                  </Typography>
                  <Typography
                    fontSize={18}
                    fontWeight="bold"
                    fontFamily="monospace"
                    color="white"
                  >
                    {activeYear}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box p={2}>
              <Box display="flex" alignItems="center" flexWrap="wrap" gap={4}>
                {/* number chip */}
                <Box display="flex" alignItems="baseline" gap={0.5}>
                  {(() => {
                    const m = previewNumber.match(
                      /^(\d{2})(\?|\d+)-(\d{5})(\?|[A-Z])$/
                    );
                    if (!m) {
                      return (
                        <Typography fontFamily="monospace" fontSize={30} fontWeight="bold">
                          {previewNumber}
                        </Typography>
                      );
                    }
                    const [, year, dept, seq, branch] = m;
                    return (
                      <>
                        <Seg value={year} bg="#e3f2fd" color="#1565c0" label="year" />
                        <Seg value={dept} bg="#fff3e0" color="#e65100" label="dept #" />
                        <Typography
                          fontFamily="monospace"
                          fontSize={26}
                          color="text.disabled"
                        >
                          -
                        </Typography>
                        <Seg value={seq} bg="#f5f5f5" color="#333" label="sequence" />
                        <Seg value={branch} bg="#e8f5e9" color="#2e7d32" label="branch" />
                      </>
                    );
                  })()}
                </Box>

                {/* selectors */}
                <Box display="flex" gap={2} flexWrap="wrap" flex={1}>
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>Department</InputLabel>
                    <Select
                      label="Department"
                      value={prevDeptId}
                      onChange={(e) => setPrevDeptId(e.target.value)}
                    >
                      {depts.map((d) => (
                        <MenuItem key={d.dprtmnt_id} value={d.dprtmnt_id}>
                          {d.dprtmnt_code} — {d.dprtmnt_name ?? "?"}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Branch</InputLabel>
                    <Select
                      label="Branch"
                      value={prevBranchId}
                      onChange={(e) => setPrevBranchId(e.target.value)}
                    >
                      {branches.map((b) => (
                        <MenuItem key={b.id} value={b.id}>
                          {b.branch} ({b.letter_code || "?"})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Sequence (test)"
                    size="small"
                    type="number"
                    inputProps={{ min: 1, max: 99999 }}
                    value={prevSeq}
                    onChange={(e) =>
                      setPrevSeq(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    sx={{ width: 140 }}
                  />
                </Box>
              </Box>

              <Typography fontSize={13} color="text.secondary" mt={1.5}>
                Format: <code>YY + dept # − sequence + branch letter</code>. Sequence shown
                here is for preview only — the real number is assigned automatically and
                increments per department, per year.
              </Typography>
            </Box>
          </TableContainer>

          {/* ── tabs container ── */}
          <TableContainer
            component={Paper}
            sx={{ width: "100%", border: `1px solid ${borderColor}`, boxShadow: 3 }}
          >
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{
                borderBottom: "1px solid #e0e0e0",
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: 13,
                },
                "& .Mui-selected": { color: `${headerColor} !important` },
                "& .MuiTabs-indicator": { backgroundColor: headerColor },
              }}
            >
              <Tab label="Department Numbers" />
              <Tab label="Branch Letters" />
            </Tabs>

            {/* ── tab: departments ── */}
            {tab === 0 && (
              <Box>
                {/* toolbar header — matching SignatureUpload header row */}
                <Table>
                  <TableHead sx={{ backgroundColor: headerColor }}>
                    <TableRow>
                      <TableCell sx={{ color: "white", p: 1.5 }}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography fontWeight="bold" color="white" ml={1}>
                            Department Numbers
                          </Typography>
                          <Box display="flex" gap={1}>
                            <Tooltip title="Reload">
                              <IconButton
                                size="small"
                                onClick={fetchAll}
                                sx={{
                                  color: "white",
                                  border: "1px solid rgba(255,255,255,0.5)",
                                  borderRadius: "8px",
                                  px: 1.5,
                                }}
                              >
                                <RefreshIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={saveDepts}
                              disabled={savingDepts || hasDeptErrors}
                              startIcon={<SaveIcon fontSize="small" />}
                              sx={{
                                backgroundColor: "#1976d2",
                                color: "#fff",
                                fontWeight: "bold",
                                borderRadius: "8px",
                                textTransform: "none",
                                px: 2,
                                "&:hover": { backgroundColor: "#1565c0" },
                                "&.Mui-disabled": { backgroundColor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.6)" },
                              }}
                            >
                              {savingDepts ? "Saving..." : "Save Changes"}
                            </Button>
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                </Table>

                <Box px={2} pt={1.5} pb={0}>
                  <Typography fontSize={13} color="text.secondary">
                    Each department needs a unique number (1–99) used to build student numbers.
                  </Typography>
                  {hasDeptErrors && (
                    <Alert severity="error" sx={{ mt: 1.5 }}>
                      {dupNums.length > 0 && (
                        <div>Duplicate numbers: {dupNums.join(", ")}. Each must be unique.</div>
                      )}
                      {depts.some((d) => !d.dept_number) && (
                        <div>Some departments have no number assigned yet.</div>
                      )}
                    </Alert>
                  )}
                </Box>

                <Table size="small" sx={{ mt: 1 }}>
                  <TableHead>
                    <TableRow>
                      {["#", "Department", "Code", "Dept #", "Branch", "Status"].map((h) => (
                        <TableCell key={h} sx={commonHeaderCellSx} align={["Dept #", "Branch", "Status"].includes(h) ? "center" : "left"}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody
                    sx={{
                      "& .MuiTableRow-root:nth-of-type(odd)": { backgroundColor: "#ffffff" },
                      "& .MuiTableRow-root:nth-of-type(even)": { backgroundColor: "lightgray" },
                    }}
                  >
                    {paginatedDepts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} sx={{ ...commonBodyCellSx, textAlign: "center", py: 4 }}>
                          No departments found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedDepts.map((d, idx) => {
                        const isDup = dupNums.includes(d.dept_number);
                        const isEmpty = !d.dept_number;
                        return (
                          <TableRow
                            key={d.dprtmnt_id}
                            sx={{
                              backgroundColor: idx % 2 === 0 ? "#ffffff" : "lightgray",
                              borderLeft: isDup
                                ? "3px solid #d32f2f"
                                : isEmpty
                                  ? "3px solid #ed6c02"
                                  : "3px solid transparent",
                              "& td": { border: `1px solid ${borderColor}`, color: "black" },
                            }}
                          >
                            <TableCell sx={{ fontFamily: "monospace", color: "text.disabled", fontSize: 12 }}>
                              {deptPage * ROWS_PER_PAGE + idx + 1}
                            </TableCell>
                            <TableCell sx={{ fontSize: 13 }}>{d.dprtmnt_name}</TableCell>
                            <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{d.dprtmnt_code}</TableCell>
                            <TableCell align="center">
                              <TextField
                                size="small"
                                type="number"
                                inputProps={{
                                  min: 1,
                                  max: 99,
                                  style: {
                                    textAlign: "center",
                                    fontFamily: "monospace",
                                    fontWeight: 600,
                                  },
                                }}
                                value={d.dept_number ?? ""}
                                onChange={(e) => updateDeptNum(d.dprtmnt_id, e.target.value)}
                                placeholder="—"
                                error={isDup || isEmpty}
                                sx={{ width: 90 }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Select
                                size="small"
                                value={d.components ?? 1}
                                onChange={(e) => updateDeptComponents(d.dprtmnt_id, e.target.value)}
                                sx={{ minWidth: 100 }}
                              >
                                <MenuItem value={1}>Manila</MenuItem>
                                <MenuItem value={2}>Cavite</MenuItem>
                              </Select>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                size="small"
                                label={isDup ? "Duplicate" : isEmpty ? "Missing" : "OK"}
                                color={isDup ? "error" : isEmpty ? "warning" : "success"}
                                variant="outlined"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {/* ── dept pagination ── */}
                {deptTotalPages > 1 && (
                  <Box
                    display="flex"
                    justifyContent="flex-end"
                    alignItems="center"
                    gap={1}
                    px={2}
                    py={1.5}
                    borderTop={`1px solid ${borderColor}`}
                  >
                    <Typography fontSize={13} color="text.secondary">
                      Page {deptPage + 1} of {deptTotalPages} ({depts.length} total)
                    </Typography>
                    <IconButton
                      size="small"
                      disabled={deptPage === 0}
                      onClick={() => setDeptPage((p) => p - 1)}
                    >
                      <NavigateBeforeIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={deptPage >= deptTotalPages - 1}
                      onClick={() => setDeptPage((p) => p + 1)}
                    >
                      <NavigateNextIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
            )}

            {/* ── tab: branches ── */}
            {tab === 1 && (
              <Box>
                {/* toolbar header */}
                <Table>
                  <TableHead sx={{ backgroundColor: headerColor }}>
                    <TableRow>
                      <TableCell sx={{ color: "white", p: 1.5 }}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography fontWeight="bold" color="white" ml={1}>
                            Branch Letters
                          </Typography>
                          <Box display="flex" gap={1}>
                            <Tooltip title="Reload">
                              <IconButton
                                size="small"
                                onClick={fetchAll}
                                sx={{
                                  color: "white",
                                  border: "1px solid rgba(255,255,255,0.5)",
                                  borderRadius: "8px",
                                  px: 1.5,
                                }}
                              >
                                <RefreshIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={saveBranches}
                              disabled={savingBranches || hasBranchErrors}
                              startIcon={<SaveIcon fontSize="small" />}
                              sx={{
                                backgroundColor: "#1976d2",
                                color: "#fff",
                                fontWeight: "bold",
                                borderRadius: "8px",
                                textTransform: "none",
                                px: 2,
                                "&:hover": { backgroundColor: "#1565c0" },
                                "&.Mui-disabled": { backgroundColor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.6)" },
                              }}
                            >
                              {savingBranches ? "Saving..." : "Save Changes"}
                            </Button>
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                </Table>

                <Box px={2} pt={1.5} pb={0}>
                  <Typography fontSize={13} color="text.secondary">
                    Single uppercase letter (A–Z) appended to the end of every student number
                    from this branch.
                  </Typography>
                  {hasBranchErrors && (
                    <Alert severity="warning" sx={{ mt: 1.5 }}>
                      Every branch must have a letter code before saving.
                    </Alert>
                  )}
                </Box>

                <Table size="small" sx={{ mt: 1 }}>
                  <TableHead>
                    <TableRow>
                      {["#", "Branch", "Address", "Letter Code", "Status"].map((h) => (
                        <TableCell
                          key={h}
                          sx={commonHeaderCellSx}
                          align={h === "Letter Code" || h === "Status" ? "center" : "left"}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody
                    sx={{
                      "& .MuiTableRow-root:nth-of-type(odd)": { backgroundColor: "#ffffff" },
                      "& .MuiTableRow-root:nth-of-type(even)": { backgroundColor: "lightgray" },
                    }}
                  >
                    {paginatedBranches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ ...commonBodyCellSx, textAlign: "center", py: 4 }}>
                          No branches found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedBranches.map((b, idx) => (
                        <TableRow
                          key={b.id}
                          sx={{
                            backgroundColor: idx % 2 === 0 ? "#ffffff" : "lightgray",
                            "& td": { border: `1px solid ${borderColor}`, color: "black" },
                          }}
                        >
                          <TableCell sx={{ fontFamily: "monospace", color: "text.disabled", fontSize: 12 }}>
                            {branchPage * ROWS_PER_PAGE + idx + 1}
                          </TableCell>
                          <TableCell sx={{ fontSize: 13, fontWeight: 500 }}>{b.branch}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{b.address}</TableCell>
                          <TableCell align="center">
                            <TextField
                              size="small"
                              inputProps={{
                                maxLength: 1,
                                style: {
                                  textAlign: "center",
                                  fontFamily: "monospace",
                                  fontWeight: 700,
                                  fontSize: 18,
                                  textTransform: "uppercase",
                                },
                              }}
                              value={b.letter_code || ""}
                              onChange={(e) => updateBranchLetter(b.id, e.target.value)}
                              placeholder="M"
                              error={!b.letter_code}
                              sx={{ width: 70 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={b.letter_code ? "OK" : "Missing"}
                              color={b.letter_code ? "success" : "warning"}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* ── branch pagination ── */}
                {branchTotalPages > 1 && (
                  <Box
                    display="flex"
                    justifyContent="flex-end"
                    alignItems="center"
                    gap={1}
                    px={2}
                    py={1.5}
                    borderTop={`1px solid ${borderColor}`}
                  >
                    <Typography fontSize={13} color="text.secondary">
                      Page {branchPage + 1} of {branchTotalPages} ({branches.length} total)
                    </Typography>
                    <IconButton
                      size="small"
                      disabled={branchPage === 0}
                      onClick={() => setBranchPage((p) => p - 1)}
                    >
                      <NavigateBeforeIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={branchPage >= branchTotalPages - 1}
                      onClick={() => setBranchPage((p) => p + 1)}
                    >
                      <NavigateNextIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
            )}
          </TableContainer>

          {/* ── all combinations preview ── */}
          <TableContainer
            component={Paper}
            sx={{ width: "100%", border: `1px solid ${borderColor}`, mt: 3, boxShadow: 3 }}
          >
            <Box sx={{ backgroundColor: headerColor, px: 2, py: 1 }}>
              <Typography fontSize={13} fontWeight="bold" color="white">
                All Dept × Branch Combinations — First Number Generated This Year
              </Typography>
            </Box>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={commonHeaderCellSx}>Department</TableCell>
                    <TableCell sx={{ ...commonHeaderCellSx, textAlign: "center" }}>Dept #</TableCell>
                    <TableCell sx={{ ...commonHeaderCellSx, textAlign: "center" }}>Branch</TableCell>
                    {branches.map((b) => (
                      <TableCell key={b.id} sx={{ ...commonHeaderCellSx, textAlign: "center" }}>
                        {b.branch}
                        <br />
                        <Typography
                          component="span"
                          fontFamily="monospace"
                          color={headerColor}
                          fontWeight="bold"
                        >
                          {b.letter_code || "?"}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody
                  sx={{
                    "& .MuiTableRow-root:nth-of-type(odd)": { backgroundColor: "#ffffff" },
                    "& .MuiTableRow-root:nth-of-type(even)": { backgroundColor: "lightgray" },
                  }}
                >
                  {depts.map((d, idx) => (
                    <TableRow
                      key={d.dprtmnt_id}
                      sx={{
                        backgroundColor: idx % 2 === 0 ? "#ffffff" : "lightgray",
                        "& td": { border: `1px solid ${borderColor}`, color: "black" },
                      }}
                    >
                      <TableCell sx={{ fontSize: 12 }}>{d.dprtmnt_name}</TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontFamily: "monospace",
                          fontWeight: 700,
                          fontSize: 12,
                          color: d.dept_number ? "text.primary" : "error.main",
                        }}
                      >
                        {d.dept_number ?? "—"}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ fontSize: 12, fontWeight: 600 }}
                      >
                        {Number(d.components) === 2 ? "Cavite" : "Manila"}
                      </TableCell>
                      {branches.map((b) => {
                        const num = buildNumber(activeYear, d.dept_number, 1, b.letter_code);
                        const incomplete = !d.dept_number || !b.letter_code;
                        return (
                          <TableCell
                            key={b.id}
                            align="center"
                            sx={{
                              fontFamily: "monospace",
                              fontSize: 11,
                              color: incomplete ? "error.main" : "text.primary",
                            }}
                          >
                            {num}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </TableContainer>
        </>
      )}

      <Snackbar
        open={snack.open}
        onClose={handleSnackClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={3500}
      >
        <Alert
          onClose={handleSnackClose}
          severity={snack.severity}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentNumberAdmin;
