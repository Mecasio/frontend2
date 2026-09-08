import React, { useState, useContext, useEffect, useCallback, useMemo } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";

const PERIOD_LABELS = { day: "Today", week: "This Week", month: "This Month" };

const formatDate = (value) => {
  if (!value) return "N/A";
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatFormType = (type) =>
  ({
    changeCourse: "Change Course (College Dean)",
    changeCourse1: "Change Course (Campus Director)",
    newForm: "Empty Change Course (College Dean)",
    newForm1: "Empty Change Course (Campus Director)",
  })[type] ||
  type ||
  "N/A";

const formatExamResultStatus = (status) => {
  if (status === null || status === undefined || status === "") return "N/A";
  return Number(status) === 0
    ? "PASSED"
    : Number(status) === 1
      ? "FAILED"
      : "N/A";
};

const fullName = (r) =>
  `${r.last_name || ""}, ${r.first_name || ""} ${r.middle_name ? r.middle_name.charAt(0) + "." : ""}${r.extension ? " " + r.extension : ""}`.trim();

const campusLabelFor = (campuses, campusId) => {
  if (!campusId || campusId === "all") return null;
  const match = campuses.find((c) => String(c.id) === String(campusId));
  return match ? match.branch || match.branch_name || "Unnamed Branch" : null;
};

const resolveProgramLabel = (curriculums, curriculumId) => {
  if (!curriculumId) return "N/A";
  const match = curriculums.find(
    (c) => String(c.curriculum_id) === String(curriculumId),
  );
  if (!match) return "N/A";
  const label = `${match.program_code || ""}${match.major ? " - " + match.major : ""}`.trim();
  return label || match.program_description || "N/A";
};

const buildReportDefs = (curriculums) => [
  {
    key: "ecat_takers",
    title: "ECAT Exam Takers",
    subtitle: "Marked Present — QR scan or manual override",
    color: "#1565c0",
    listEndpoint: "/api/reports/ecat-takers/list",
    fileNamePrefix: "ECAT_Exam_Takers",
    columns: [
      { label: "Applicant No.", width: 15, value: (r) => r.applicant_number || "N/A" },
      { label: "Name", width: 30, value: fullName },
      { label: "Program", width: 20, value: (r) => resolveProgramLabel(curriculums, r.program) },
      { label: "Room", width: 12, value: (r) => r.room_description || "N/A" },
      { label: "Time Scanned/Marked", width: 22, value: (r) => formatDateTime(r.scanned_at) },
      { label: "Status", width: 13, value: () => "PRESENT" },
    ],
  },
  {
    key: "non_appearance",
    title: "Entrance Exam Non-Appearance",
    subtitle: "From QR attendance scanner",
    color: "#c62828",
    listEndpoint: "/api/reports/non-appearance/list",
    fileNamePrefix: "Exam_Non_Appearance",
    columns: [
      { label: "Applicant No.", width: 15, value: (r) => r.applicant_id || "N/A" },
      { label: "Name", width: 28, value: fullName },
      { label: "Program", width: 20, value: (r) => resolveProgramLabel(curriculums, r.program) },
      { label: "Exam Date", width: 12, value: (r) => formatDate(r.exam_date) },
      { label: "Room", width: 12, value: (r) => r.room_description || "N/A" },
      { label: "Status", width: 13, value: () => "ABSENT" },
    ],
  },
  {
    key: "realignment",
    title: "Applicant Realignment",
    subtitle: "Change Course Form issuances",
    color: "#6a1b9a",
    listEndpoint: "/api/reports/realignment/list",
    fileNamePrefix: "Applicant_Realignment",
    columns: [
      { label: "Applicant No.", width: 15, value: (r) => r.applicant_number || "N/A" },
      { label: "Name", width: 28, value: (r) => r.applicant_name || "N/A" },
      {
        label: "Current Program",
        width: 20,
        value: (r) => resolveProgramLabel(curriculums, r.current_curriculum_id),
      },
      { label: "Form Type", width: 20, value: (r) => formatFormType(r.form_type) },
      { label: "Document No.", width: 13, value: (r) => r.control_number || "N/A" },
      { label: "Change Course Requested", width: 15, value: () => "YES" },
      { label: "Date Issued", width: 10, value: (r) => formatDate(r.created_at) },
    ],
  },
  {
    key: "ecat_results",
    title: "ECAT Passers / Failers",
    color: "#2e7d32",
    listEndpoint: "/api/reports/ecat-results/list",
    fileNamePrefix: "ECAT_Passers_Failers",
    hasStatusFilter: true,
    columns: [
      { label: "Applicant No.", width: 13, value: (r) => r.applicant_number || "N/A" },
      { label: "Name", width: 28, value: fullName },
      { label: "Program", width: 25, value: (r) => resolveProgramLabel(curriculums, r.program) },
      { label: "Score", width: 10, value: (r) => r.total_score ?? "N/A" },
      { label: "Result", width: 10, value: (r) => formatExamResultStatus(r.status) },
      { label: "Date", width: 13, value: (r) => formatDate(r.date_created) },
    ],
  },
];

// ── campuses / selectedCampus / schoolYear / semester are passed down
// from AdmissionOfficerDashboard so this panel stays in sync with the
// active-school-year filter selected up top. ──────────────────────────
const AdmissionsReportPanel = ({
  campuses = [],
  selectedCampus = "all",
  schoolYear = "",
  semester = "",
}) => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [curriculums, setCurriculums] = useState([]);
  const [periods, setPeriods] = useState({
    ecat_takers: "month",
    non_appearance: "month",
    realignment: "month",
    ecat_results: "month",
  });
  const [resultsStatusFilter, setResultsStatusFilter] = useState("all");
  const [downloadingKey, setDownloadingKey] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/applied_program`)
      .then((res) => setCurriculums(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Error fetching curriculums:", err));
  }, []);

  const REPORT_DEFS = useMemo(() => buildReportDefs(curriculums), [curriculums]);

  // ── Build the shared query params for both the summary and the
  // downloadable list endpoints, so the two never drift out of sync. ──
  const scopeParams = useMemo(() => {
    const p = {};
    if (selectedCampus !== "all" && selectedCampus !== "") p.campus = selectedCampus;
    if (schoolYear !== "" && schoolYear !== undefined && schoolYear !== null)
      p.school_year = schoolYear;
    if (semester !== "" && semester !== undefined && semester !== null)
      p.semester = semester;
    return p;
  }, [selectedCampus, schoolYear, semester]);

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/reports/admissions-summary`,
        { params: scopeParams },
      );
      setSummary(res.data);
    } catch (err) {
      console.error("Error fetching admissions summary:", err);
    } finally {
      setLoadingSummary(false);
    }
  }, [scopeParams]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const campusAddressFor = (campuses, campusId, fallback) => {
    if (!campusId || campusId === "all") return fallback;
    const match = campuses.find((c) => String(c.id) === String(campusId));
    return match?.address || fallback;
  };

  const campusLabelFor2 = (campuses, campusId) => campusLabelFor(campuses, campusId);

  const buildTableHtml = (title, columns, rows) => {
    const logoSrc = assets.logoUrl || EaristLogo;
    const companyName = (branding.companyName || "").trim();
    const words = companyName.split(" ");
    const middleIndex = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, middleIndex).join(" ");
    const secondLine = words.slice(middleIndex).join(" ");

    const resolvedCampusAddress = campusAddressFor(
      campuses,
      selectedCampus,
      branding.campusAddress || "No address set in Settings",
    );

    const fallbackWidth = (100 / columns.length).toFixed(2);
    const colgroup = `<colgroup>${columns
      .map((c) => `<col style="width:${c.width ?? fallbackWidth}%" />`)
      .join("")}</colgroup>`;

    const headerRow = `<tr>${columns.map((c) => `<th>${c.label}</th>`).join("")}</tr>`;
    const bodyRows = rows.length
      ? rows
        .map(
          (r) =>
            `<tr>${columns
              .map(
                (c) =>
                  `<td${c.label === "Name" ? ' class="applicant-name"' : ""}>${c.value(r)}</td>`,
              )
              .join("")}</tr>`,
        )
        .join("")
      : `<tr><td colspan="${columns.length}" style="padding:14px;">No records found for this period.</td></tr>`;

    return `
    <div class="print-header">
      <div class="header-content">
        <img src="${logoSrc}" alt="School Logo" />
        <div class="header-text">
          <div style="font-size: 12px; font-family: Arial">Republic of the Philippines</div>
          ${companyName
        ? `
              <b style="letter-spacing: 1px; font-size: 18px; font-family: Arial, sans-serif;">
                ${firstLine}
              </b>
              ${secondLine
          ? `<div style="letter-spacing: 1px; font-size: 18px; font-family: Arial, sans-serif;">
                     <b>${secondLine}</b>
                   </div>`
          : ""
        }
            `
        : ""
      }
          <div style="font-size: 12px; font-family: Arial">${resolvedCampusAddress}</div>
        </div>
      </div>
      <div style="margin-top: 20px; text-align: center;">
        <b style="font-size: 20px; letter-spacing: 1px;">${title}</b>
      </div>
    </div>
    <div class="table-wrapper">
      <table>
        ${colgroup}
        <thead>${headerRow}</thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
  };

  const handleDownload = async (def) => {
    const period = periods[def.key];
    setDownloadingKey(def.key);
    try {
      const params = { period, ...scopeParams };
      if (def.hasStatusFilter && resultsStatusFilter !== "all") {
        params.status = resultsStatusFilter;
      }

      const listRes = await axios.get(`${API_BASE_URL}${def.listEndpoint}`, {
        params,
      });
      const rows = Array.isArray(listRes.data) ? listRes.data : [];

      const campusLabel = campusLabelFor2(campuses, selectedCampus);
      const scopeBits = [
        campusLabel,
        schoolYear ? `SY ${schoolYear}` : null,
      ].filter(Boolean);
      const title = `${def.title} \u2014 ${PERIOD_LABELS[period]}${scopeBits.length ? ` (${scopeBits.join(", ")})` : ""}`;
      const html = buildTableHtml(title, def.columns, rows);

      const pdfRes = await axios.post(
        `${API_BASE_URL}/api/generate-attendance-report-pdf`,
        { html, title, fileNamePrefix: `${def.fileNamePrefix}_${period}` },
        { responseType: "blob" },
      );

      const blob = new Blob([pdfRes.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${def.fileNamePrefix}_${period}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Error downloading ${def.title} report:`, err);
      alert(`Failed to generate the ${def.title} report. Please try again.`);
    } finally {
      setDownloadingKey(null);
    }
  };

  const renderCountRow = (label, value) => (
    <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.25 }}>
      <Typography fontSize={13} color="text.secondary">
        {label}
      </Typography>
      <Typography fontSize={13} fontWeight="bold">
        {value ?? 0}
      </Typography>
    </Box>
  );

  const activeCampusLabel = campusLabelFor2(campuses, selectedCampus);

  return (
    <Box sx={{ mt: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1.5,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="h6" fontWeight="bold">
            Admissions Report
          </Typography>
          {(activeCampusLabel || schoolYear) && (
            <Typography fontSize={13} color="text.secondary">
              — {[activeCampusLabel, schoolYear ? `SY ${schoolYear}` : null]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
          )}
        </Box>
        <Button
          size="small"
          startIcon={
            loadingSummary ? <CircularProgress size={14} /> : <RefreshIcon />
          }
          onClick={fetchSummary}
          disabled={loadingSummary}
        >
          Refresh
        </Button>
      </Box>

      <Grid container spacing={2}>
        {REPORT_DEFS.map((def) => {
          const counts = summary?.[def.key];
          return (
            <Grid item xs={12} sm={6} lg={3} key={def.key}>
              <Card
                sx={{
                  height: "100%",
                  borderRadius: 3,
                  boxShadow: 3,
                  borderTop: `4px solid ${def.color}`,
                }}
              >
                <CardContent>
                  <Typography
                    fontWeight="bold"
                    fontSize={14}
                    sx={{ color: def.color }}
                  >
                    {def.title}
                  </Typography>
                  {def.subtitle && (
                    <Typography
                      fontSize={11}
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      {def.subtitle}
                    </Typography>
                  )}

                  <Box sx={{ mt: 1, mb: 1 }}>
                    {def.key === "ecat_results" ? (
                      <>
                        {renderCountRow(
                          "Today (PASSED / FAILED)",
                          `${summary?.ecat_results?.today_passed ?? 0} / ${summary?.ecat_results?.today_failed ?? 0}`,
                        )}
                        {renderCountRow(
                          "This Week (PASSED / FAILED)",
                          `${summary?.ecat_results?.week_passed ?? 0} / ${summary?.ecat_results?.week_failed ?? 0}`,
                        )}
                        {renderCountRow(
                          "This Month (PASSED / FAILED)",
                          `${summary?.ecat_results?.month_passed ?? 0} / ${summary?.ecat_results?.month_failed ?? 0}`,
                        )}
                      </>
                    ) : (
                      <>
                        {renderCountRow("Today", counts?.today)}
                        {renderCountRow("This Week", counts?.this_week)}
                        {renderCountRow("This Month", counts?.this_month)}
                        {renderCountRow("All Time", counts?.all_time)}
                      </>
                    )}
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <Select
                        value={periods[def.key]}
                        onChange={(e) =>
                          setPeriods((p) => ({
                            ...p,
                            [def.key]: e.target.value,
                          }))
                        }
                      >
                        <MenuItem value="day">Day</MenuItem>
                        <MenuItem value="week">Week</MenuItem>
                        <MenuItem value="month">Month</MenuItem>
                      </Select>
                    </FormControl>

                    {def.hasStatusFilter && (
                      <FormControl size="small" sx={{ minWidth: 100 }}>
                        <Select
                          value={resultsStatusFilter}
                          onChange={(e) =>
                            setResultsStatusFilter(e.target.value)
                          }
                        >
                          <MenuItem value="all">All</MenuItem>
                          <MenuItem value="0">Passed</MenuItem>
                          <MenuItem value="1">Failed</MenuItem>
                        </Select>
                      </FormControl>
                    )}

                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownload(def)}
                      disabled={downloadingKey === def.key}
                      sx={{
                        backgroundColor: def.color,
                        "&:hover": { opacity: 0.9, backgroundColor: def.color },
                      }}
                    >
                      {downloadingKey === def.key ? "Generating\u2026" : "PDF"}
                    </Button>
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

export default AdmissionsReportPanel;