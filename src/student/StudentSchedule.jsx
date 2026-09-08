import React, { useState, useEffect, useContext, useMemo } from "react";
import { SettingsContext } from "../App";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
} from "@mui/material";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import { downloadStudentSchedulePdf } from "../utils/studentSchedulePrintLayout";
import EaristLogo from "../assets/EaristLogo.png";
import { FcPrint } from "react-icons/fc";
import EventNoteIcon from '@mui/icons-material/EventNote';

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_LABELS = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

const parseTime = (t) => new Date(`1970-01-01 ${t}`);

// Format a Date back into a "H:MM AM/PM" string matching the format
// used everywhere else in this file (parseTime expects this shape).
const formatTime = (d) => {
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const mm = minutes.toString().padStart(2, "0");
  return `${hours}:${mm} ${ampm}`;
};

// ── Non-overlapping 30-minute time slots, 7:00 AM – 9:00 PM ──
// Previously this array held overlapping 1-hour windows stepped every
// 30 minutes (["7:00 AM","8:00 AM"], ["7:30 AM","8:30 AM"], ...), which
// double-counted every half-hour and broke alignment/height math for
// any class whose start or end time fell on a half hour. Each slot here
// is a real, sequential 30-minute cell instead.
const TIME_SLOTS = (() => {
  const slots = [];
  let cursor = parseTime("7:00 AM");
  const end = parseTime("9:00 PM");
  while (cursor < end) {
    const next = new Date(cursor.getTime() + 30 * 60000);
    slots.push([formatTime(cursor), formatTime(next)]);
    cursor = next;
  }
  return slots;
})();

// ── Year-level label formatting — mirrors StudentCurriculumSubjects.jsx ──
const yearLabelMap = {
  "First Year": "1st Year",
  "Second Year": "2nd Year",
  "Third Year": "3rd Year",
  "Fourth Year": "4th Year",
  "Fifth Year": "5th Year",
};
const formatYearLabel = (year) => yearLabelMap[year] || year || "";

// Breakpoints: <768 = mobile (phones), 768-1099 = tablet, >=1100 = desktop
const getDeviceType = (width) => {
  if (width < 768) return "mobile";
  if (width < 1100) return "tablet";
  return "desktop";
};

const StudentSchedule = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  // Matches the maroon default used as the header accent in
  // StudentCurriculumSubjects.jsx, so both pages share one identity.
  const headerBg = headerColor || "#800000";

  const [studentSchedule, setStudentSchedule] = useState([]);
  const [activeDay, setActiveDay] = useState("MON");
  const [deviceType, setDeviceType] = useState(() =>
    typeof window !== "undefined" ? getDeviceType(window.innerWidth) : "desktop"
  );
  const [isDownloadingSchedule, setIsDownloadingSchedule] = useState(false);

  // ── Student identity (name / number / department / program / section /
  //    year level), pulled from the same sources StudentGradingPage.jsx and
  //    StudentCurriculumSubjects.jsx already rely on ──
  const [studentInfo, setStudentInfo] = useState({
    fullName: "",
    firstName: "",
    lastName: "",
    studentNumber: "",
    department: "",
    programSection: "",
    programCode: "",
    programDescription: "",
    sectionDescription: "",
    yearLevelDescription: "",
  });

  // ── Active School Year & Semester — same source
  //    CollegeScheduleChecker.jsx pulls its "current" academic period
  //    from (the first row of /api/get_active_school_years), used for
  //    the printed "FIRST SEMESTER, AY 2026 - 2027" line on the
  //    downloaded Class Schedule PDF ──
  const [activeSemesterLabel, setActiveSemesterLabel] = useState("");
  // Plain semester name (e.g. "Second Semester"), used for the on-screen
  // "YEAR / SEMESTER" line so it reads the same way as the curriculum page.
  const [activeSemesterName, setActiveSemesterName] = useState("");

  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";
  const isCompact = isMobile || isTablet; // shared "small screen" behavior

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
  }, [settings]);

  // Single resize listener drives device type (mobile / tablet / desktop)
  useEffect(() => {
    let frame;
    const handleResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setDeviceType(getDeviceType(window.innerWidth));
      });
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    if (!storedID) { window.location.href = "/login"; return; }
    if (storedRole !== "student") { window.location.href = "/faculty_dashboard"; return; }
    fetchStudentSchedule(storedID);
    fetchStudentInfo(storedID);
    fetchStudentAcademicDetails(storedID);
  }, []);

  // 🗓️ Active School Year / Semester — mirrors CollegeScheduleChecker's
  // `/api/active_school_year` + `/api/get_school_year` / `/api/get_school_semester`
  // combo, but reuses `/api/get_active_school_years` (already consumed
  // elsewhere in this codebase) since it returns ready-to-print
  // `year_description` / `semester_description` text in one call.
  useEffect(() => {
    const fetchActiveSemester = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/get_current_academic_year`);
        const { year_description, semester_description } = res.data || {};
        setActiveSemesterName(semester_description || "");
        setActiveSemesterLabel(
          [semester_description?.toUpperCase(), year_description ? `AY ${year_description}` : ""]
            .filter(Boolean)
            .join(", ")
        );
      } catch (error) {
        console.error("Error fetching active school year:", error);
      }
    };
    fetchActiveSemester();
  }, []);
  // 🔒 Disable right-click + block DevTools/print shortcuts.
  // Moved into a mount-only effect with proper cleanup so listeners
  // aren't re-attached on every render (previous version leaked one
  // pair of listeners per render, which also breaks on unmount).
  // useEffect(() => {
  //   const blockContextMenu = (e) => e.preventDefault();
  //   const blockShortcuts = (e) => {
  //     const isBlockedKey =
  //       e.key === "F12" ||
  //       e.key === "F11" ||
  //       (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j")) ||
  //       (e.ctrlKey && e.key.toLowerCase() === "u") ||
  //       (e.ctrlKey && e.key.toLowerCase() === "p");
  //     if (isBlockedKey) {
  //       e.preventDefault();
  //       e.stopPropagation();
  //     }
  //   };
  //   document.addEventListener("contextmenu", blockContextMenu);
  //   document.addEventListener("keydown", blockShortcuts);
  //   return () => {
  //     document.removeEventListener("contextmenu", blockContextMenu);
  //     document.removeEventListener("keydown", blockShortcuts);
  //   };
  // }, []);

  const fetchStudentSchedule = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student_schedule/${id}`);
      setStudentSchedule(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  // ── Resolve department strictly through the department ⇄ curriculum
  //    mapping (dprtmnt_curriculum_table), the same join used server-side
  //    in generateStudentNumber() for assign-student-number:
  //
  //      SELECT dt.* FROM dprtmnt_curriculum_table dct
  //      JOIN dprtmnt_table dt ON dct.dprtmnt_id = dt.dprtmnt_id
  //      WHERE dct.curriculum_id = ?
  //
  //    person_table.program stores the curriculum_id (see how
  //    generateStudentNumber treats person_data.program), so that's the
  //    id we look up with. Requires a small backend route:
  //
  //      GET /api/department_by_curriculum/:curriculum_id
  //        -> { dprtmnt_id, dprtmnt_name, dprtmnt_code }
  const resolveDepartmentByCurriculum = async (curriculumId) => {
    if (!curriculumId) return "";
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/department_by_curriculum/${curriculumId}`
      );
      return res.data?.dprtmnt_name || "";
    } catch (error) {
      console.error("Error resolving department by curriculum:", error);
      return "";
    }
  };

  // Same source StudentGradingPage.jsx reads student_number / last_name /
  // first_name / middle_name / program_code / program_description /
  // section_description from (res.data[0]).
  const fetchStudentInfo = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student_grade/${id}`);
      const row = Array.isArray(res.data) ? res.data[0] : null;
      if (!row) return;

      const fullName = [row.last_name, row.first_name, row.middle_name]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      // Prefer a department name already present on the row; otherwise
      // resolve it from the curriculum the student is enrolled under.
      let department =
        row.dprtmnt_name || row.department_name || row.department_description || "";

      const curriculumId = row.curriculum_id ?? row.program ?? null;
      if (!department && curriculumId) {
        department = await resolveDepartmentByCurriculum(curriculumId);
      }

      // Legacy fallback (kept for safety, in case a school year's data
      // predates the curriculum linkage above).
      const departmentId = row.dprtmnt_id ?? row.department_id ?? null;
      if (!department && departmentId) {
        try {
          const deptRes = await axios.get(`${API_BASE_URL}/api/get_department`);
          const deptRows = Array.isArray(deptRes.data) ? deptRes.data : [];
          const match = deptRows.find(
            (d) => String(d.dprtmnt_id) === String(departmentId)
          );
          department = match?.dprtmnt_name || "";
        } catch (deptErr) {
          console.error("Error resolving student department (legacy):", deptErr);
        }
      }

      setStudentInfo((prev) => ({
        ...prev,
        fullName,
        firstName: row.first_name || "",
        lastName: row.last_name || "",
        studentNumber: row.student_number || "",
        department,
        programSection: [row.program_code, row.section_description]
          .filter(Boolean)
          .join(" - "),
        programCode: prev.programCode || row.program_code || "",
        programDescription: prev.programDescription || row.program_description || "",
        sectionDescription: prev.sectionDescription || row.section_description || "",
      }));
    } catch (error) {
      console.error("Error fetching student info:", error);
    }
  };

  // ── Academic details (program description, code, section, year level) —
  //    same endpoint powering StudentCurriculumSubjects-style headers
  //    elsewhere in the app: /api/student_details/:id ──
  const fetchStudentAcademicDetails = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/student_details/${id}`);
      const row = Array.isArray(res.data) ? res.data[0] : res.data;
      if (!row) return;

      setStudentInfo((prev) => ({
        ...prev,
        programCode: row.program_code && row.program_code !== "Not Currently Enrolled"
          ? row.program_code
          : prev.programCode,
        programDescription:
          row.program_description && row.program_description !== "Not Currently Enrolled"
            ? row.program_description
            : prev.programDescription,
        sectionDescription:
          row.section_description && row.section_description !== "Not Currently Enrolled"
            ? row.section_description
            : prev.sectionDescription,
        yearLevelDescription:
          row.year_level && row.year_level !== "Not Currently Enrolled"
            ? row.year_level
            : prev.yearLevelDescription,
      }));
    } catch (error) {
      console.error("Error fetching student academic details:", error);
    }
  };

  const toWholeUnit = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? Math.round(num) : 0;
  };

  const sortedSchedule = useMemo(
    () =>
      [...studentSchedule].sort((a, b) =>
        (a.course_code || "").localeCompare(b.course_code || "")
      ),
    [studentSchedule]
  );

  const totalUnits = useMemo(
    () => sortedSchedule.reduce((total, row) => total + toWholeUnit(row.course_unit), 0),
    [sortedSchedule]
  );

  const isTimeInSchedule = (start, end, day) =>
    studentSchedule.some((entry) => {
      if (entry.day_description !== day) return false;
      const slotStart = parseTime(start);
      const slotEnd = parseTime(end);
      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);
      return slotStart >= schedStart && slotEnd <= schedEnd;
    });

  const getEntryForSlot = (start, day) => {
    const slotStart = parseTime(start);
    return studentSchedule.find((entry) => {
      if (entry.day_description !== day) return false;
      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);
      return slotStart >= schedStart && slotStart < schedEnd;
    });
  };

  // Step size for adjacency checks now matches the 30-minute grid
  // (was 60, which no longer matches a row's actual duration and was
  // the source of the misaligned border/height seen in the screenshot).
  const hasAdjacentSchedule = (start, end, day, direction = "top") => {
    const minutesOffset = direction === "top" ? -30 : 30;
    const newStart = new Date(parseTime(start).getTime() + minutesOffset * 60000);
    const newEnd = new Date(parseTime(end).getTime() + minutesOffset * 60000);
    const currentEntry = getEntryForSlot(start, day);
    const adjacentEntry = studentSchedule.find((entry) => {
      if (entry.day_description !== day) return false;
      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);
      return newStart >= schedStart && newEnd <= schedEnd;
    });
    if (!adjacentEntry) return false;
    if (currentEntry && adjacentEntry.course_code === currentEntry.course_code) return "same";
    return "different";
  };

  // Duration/position math now counts 30-minute slots instead of whole
  // hours, so classes starting/ending on a half hour (e.g. 11:30 AM –
  // 1:00 PM) center and size correctly instead of leaving a trailing
  // blank highlighted cell.
  const getCenterText = (start, day, cellHeightRem) => {
    const slotStart = parseTime(start);

    for (const entry of studentSchedule) {
      if (entry.day_description !== day) continue;
      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);
      if (!(slotStart >= schedStart && slotStart < schedEnd)) continue;

      const totalSlots = Math.round((schedEnd - schedStart) / (30 * 60 * 1000));
      const idxInBlock = Math.round((slotStart - schedStart) / (30 * 60 * 1000));
      const isOdd = totalSlots % 2 === 1;
      const centerIndex = isOdd ? (totalSlots - 1) / 2 : totalSlots / 2;
      const isCenter = idxInBlock === centerIndex;
      if (!isCenter) return "";

      let marginTop = isOdd ? 0 : -(cellHeightRem / 2);
      if (!isOdd) marginTop = `calc(${marginTop}rem - 1rem)`;

      const fontSize = totalSlots <= 2 ? "9.5px" : isTablet ? "10px" : "11px";

      const professorLabel =
        entry.prof_firstname === "TBA" && entry.prof_lastname === "TBA"
          ? "TBA"
          : `Prof. ${entry.prof_firstname || ""} ${entry.prof_lastname || ""}`.trim();

      return (
        <span style={{ position: "relative", display: "inline-block", textAlign: "center", width: "100%", fontSize, marginTop }}>
          <div style={{ width: "100%", padding: "0 2px" }}>
            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700, fontSize }}>
              {entry.course_code}
            </span>
            <span style={{ display: "block", whiteSpace: "normal", wordBreak: "break-word", fontSize: "8px", lineHeight: 1.2 }}>
              {entry.room_description === "TBA" ? "TBA" : entry.room_description}
            </span>
            <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: totalSlots <= 2 ? "8px" : "9.5px" }}>
              {professorLabel}
            </span>
          </div>
        </span>
      );
    }
    return "";
  };

  // ── Shared course card (used for the summary list on phones,
  //    and the per-day list on phones/tablets) ──
  const CourseCard = ({ entry, showDay }) => (
    <Box
      sx={{
        background: "#fffde7",
        border: `1.5px solid ${borderColor}`,
        borderLeft: `5px solid ${mainButtonColor}`,
        borderRadius: "8px",
        p: 1.5,
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 14, color: mainButtonColor }}>
          {entry.course_code}
        </Typography>
        {showDay && (
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: "#777", whiteSpace: "nowrap" }}>
            {entry.day_description}
          </Typography>
        )}
      </Box>
      <Typography sx={{ fontSize: 12, color: "#333", mt: 0.3 }}>
        {entry.course_description}
      </Typography>
      <Box sx={{ display: "flex", gap: 2, mt: 0.8, flexWrap: "wrap" }}>
        <Typography sx={{ fontSize: 11, color: "#555" }}>
          🕐 {entry.school_time_start} – {entry.school_time_end}
        </Typography>
        <Typography sx={{ fontSize: 11, color: "#555" }}>
          📍 {entry.room_description}
        </Typography>
        <Typography sx={{ fontSize: 11, color: "#555" }}>
          👤 {entry.prof_firstname === "TBA" && entry.prof_lastname === "TBA"
            ? "TBA"
            : `Prof. ${entry.prof_firstname || ""} ${entry.prof_lastname || ""}`.trim()}
        </Typography>
        <Typography sx={{ fontSize: 11, color: "#555" }}>
          📚 {entry.program_code} {entry.section_description}
        </Typography>
        <Typography sx={{ fontSize: 11, color: "#555" }}>
          ⓤ {toWholeUnit(entry.course_unit)} unit{toWholeUnit(entry.course_unit) === 1 ? "" : "s"}
        </Typography>
      </Box>
    </Box>
  );

  // ── Course summary: table on tablet/desktop, cards on phones ──
  // ── Course summary: table on tablet/desktop, cards on phones ──
  const renderCourseSummary = () => {
    if (isMobile) {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, px: { xs: 0.5, sm: 0 } }}>
          {sortedSchedule.map((row, i) => (
            <CourseCard key={i} entry={row} showDay />
          ))}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: `1.5px solid ${borderColor}`,

              p: 1.5,
              backgroundColor: headerBg
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: "white" }}>Total Units</Typography>
            <Typography sx={{ fontWeight: 700, fontSize: 13, color: "white" }}>
              {totalUnits}
            </Typography>
          </Box>
        </Box>
      );
    }

    return (
      <TableContainer component={Paper} sx={{ mx: "auto", width: "100%", overflowX: "auto", }}>
        <Table size="small" sx={{ minWidth: isTablet ? 640 : "auto" }}>
          <TableHead sx={{ backgroundColor: headerBg }}>
            <TableRow>
              {["#", "Course Description", "Course Code", "Lec", "Lab", "Units", "Section", "Schedule", "Professor"].map((h) => (
                <TableCell key={h} sx={{ color: "white", border: `1px solid ${borderColor}`, fontSize: { sm: "0.7rem", md: "0.75rem" }, whiteSpace: "nowrap", fontWeight: 600, textTransform: "uppercase" }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedSchedule.map((row, index) => (
              <TableRow
                key={index}
                sx={{
                  backgroundColor: index % 2 === 0 ? "#ffffff" : "#f7f7f7",
                }}
              >
                {[
                  index + 1,
                  row.course_description,
                  row.course_code,
                  1,
                  row.lab_unit == null ? "" : toWholeUnit(row.lab_unit),
                  row.course_unit == null ? "" : toWholeUnit(row.course_unit),
                  `${row.program_code} ${row.section_description}`,
                  `${row.day_description}, ${row.school_time_start} - ${row.school_time_end} ${row.room_description}`,
                  row.prof_firstname === "TBA" && row.prof_lastname === "TBA"
                    ? "TBA"
                    : `Prof. ${row.prof_firstname || ""} ${row.prof_lastname || ""}`.trim(),
                ].map((cell, ci) => (
                  <TableCell key={ci} sx={{ fontSize: { sm: "0.7rem", md: "0.75rem" }, border: `1px solid ${borderColor}` }}>
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow sx={{ backgroundColor: headerBg }}>
              <TableCell colSpan={3} style={{ border: `1px solid ${borderColor}` }} />
              <TableCell colSpan={2} style={{ fontWeight: "600", border: `1px solid ${borderColor}`, fontSize: "0.75rem", color: "white" }}>Total Units</TableCell>
              <TableCell style={{ border: `1px solid ${borderColor}`, fontSize: "0.75rem", color: "white" }}>
                {totalUnits}
              </TableCell>
              <TableCell colSpan={2} style={{ border: `1px solid ${borderColor}` }} />
              <TableCell colSpan={2} style={{ border: `1px solid ${borderColor}` }} />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // ── Weekly grid: card list (phones + tablets) vs full grid (desktop) ──
  const renderCompactDaySchedule = () => {
    const dayEntries = studentSchedule
      .filter((e) => e.day_description === activeDay)
      .sort((a, b) => parseTime(a.school_time_start) - parseTime(b.school_time_start));

    if (!dayEntries.length) {
      return (
        <Box sx={{ textAlign: "center", py: 6, color: "#888" }}>
          <Typography sx={{ fontSize: 14 }}>No classes on {DAY_LABELS[activeDay]}</Typography>
        </Box>
      );
    }

    return (
      <Box
        sx={{
          display: isTablet ? "grid" : "flex",
          gridTemplateColumns: isTablet ? "repeat(2, 1fr)" : undefined,
          flexDirection: isTablet ? undefined : "column",
          gap: 1.5,
          mt: 1,
        }}
      >
        {dayEntries.map((entry, i) => (
          <CourseCard key={i} entry={entry} />
        ))}
      </Box>
    );
  };

  const renderDayTabs = () => (
    <>
      <Box sx={{ display: "flex", gap: 0.75, overflowX: "auto", pb: 1, mb: 1, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
        {DAYS.map((day) => {
          const hasClass = studentSchedule.some((e) => e.day_description === day);
          const isActive = activeDay === day;
          return (
            <Box
              key={day}
              onClick={() => setActiveDay(day)}
              sx={{
                flexShrink: 0,
                px: 1.5,
                py: 0.75,
                borderRadius: "20px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: isActive ? 700 : 400,
                border: `1.5px solid ${isActive ? mainButtonColor : borderColor}`,
                backgroundColor: isActive ? mainButtonColor : "transparent",
                color: isActive ? "#fff" : hasClass ? mainButtonColor : "#999",
                position: "relative",
                transition: "all 0.18s ease",
              }}
            >
              {day}
              {hasClass && !isActive && (
                <Box sx={{ position: "absolute", top: 2, right: 2, width: 5, height: 5, borderRadius: "50%", backgroundColor: mainButtonColor }} />
              )}
            </Box>
          );
        })}
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: mainButtonColor, mb: 1 }}>
        {DAY_LABELS[activeDay]}
      </Typography>
    </>
  );

  // ── Desktop: full weekly grid, built with CSS Grid instead of a nested
  //    table so the day header (name + "Official Time" line) renders as
  //    one clean cell instead of two mismatched stacked rows. Column
  //    widths use relative units so it also scales reasonably on large
  //    tablets in landscape. ──
  const renderDesktopGrid = () => {
    const timeColWidth = "10rem";
    const dayColWidth = isTablet ? "7.5rem" : "9rem";
    // Row height now matches the 30-minute slot duration (half of the
    // previous 1-hour row height). Without this, every class rendered
    // twice as tall as it should, and the "center" label landed on the
    // wrong row, leaving a trailing blank colored cell after the text.
    const rowHeight = "1.5rem";
    const cellHeightRem = 1.5;
    const gridTemplateColumns = `${timeColWidth} repeat(7, minmax(${dayColWidth}, 1fr))`;

    return (
      <Box sx={{ overflowX: "auto", width: "100%", border: `1px solid ${borderColor}`, overflow: "hidden" }}>
        <Box sx={{ display: "grid", gridTemplateColumns, minWidth: "1050px" }}>
          {/* ── Header row ── */}
          <Box
            sx={{
              position: "sticky",
              top: 0,
              left: 0,
              zIndex: 3,
              backgroundColor: headerBg,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.5,
              borderRight: `1px solid ${borderColor}`,
              borderBottom: `1px solid ${borderColor}`,
              minHeight: "3.1rem",
            }}
          >
            TIME
          </Box>
          {DAYS.map((day, i) => (
            <Box
              key={day}
              sx={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                backgroundColor: headerBg,
                color: "#fff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: 0.75,
                borderRight: i === DAYS.length - 1 ? "none" : `1px solid ${borderColor}`,
                borderBottom: `1px solid ${borderColor}`,
                minHeight: "3.1rem",
              }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>
                {DAY_LABELS[day].toUpperCase()}
              </Typography>
              <Typography sx={{ fontSize: 10, opacity: 0.85, mt: 0.2 }}>
                7:00 AM – 9:00 PM
              </Typography>
            </Box>
          ))}

          {/* ── Time rows ── */}
          {TIME_SLOTS.map(([start, end]) => (
            <React.Fragment key={start}>
              <Box
                sx={{
                  position: "sticky",
                  left: 0,
                  zIndex: 1,
                  backgroundColor: "#fafafa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: rowHeight,
                  fontSize: 12.5,
                  color: "#444",
                  fontWeight: 500,
                  borderRight: `1px solid ${borderColor}`,
                  borderBottom: `1px solid ${borderColor}`,
                }}
              >
                {start} - {end}
              </Box>
              {DAYS.map((day, i) => {
                const inSched = isTimeInSchedule(start, end, day);
                const topAdj = hasAdjacentSchedule(start, end, day, "top");
                const botAdj = hasAdjacentSchedule(start, end, day, "bottom");
                return (
                  <Box
                    key={day}
                    sx={{
                      height: rowHeight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      backgroundColor: inSched ? "#fef08a" : "transparent",
                      borderRight: i === DAYS.length - 1 ? "none" : `1px solid ${borderColor}`,
                      borderTop: inSched && topAdj === "same" ? "none" : undefined,
                      borderBottom: inSched && botAdj === "same" ? "none" : `1px solid ${borderColor}`,
                      marginTop: inSched && topAdj === "same" ? "-1px" : 0,
                    }}
                  >
                    {getCenterText(start, day, cellHeightRem)}
                  </Box>
                );
              })}
            </React.Fragment>
          ))}
        </Box>
      </Box>
    );
  };

  // ── Download the printable, portrait Class Schedule PDF ──
  const handleDownloadSchedule = async () => {
    if (!sortedSchedule.length) {
      return;
    }

    setIsDownloadingSchedule(true);
    try {
      const firstRow = sortedSchedule[0];
      const resolvedProgramSection =
        studentInfo.programSection ||
        (firstRow
          ? `${firstRow.program_code || ""} ${firstRow.section_description || ""}`.trim()
          : "");

      await downloadStudentSchedulePdf({
        apiBaseUrl: API_BASE_URL,
        studentSchedule,
        studentInfo: {
          ...studentInfo,
          programSection: resolvedProgramSection,
        },
        companyName: branding.companyName,
        campusAddress: branding.campusAddress,
        // Department (right-corner header field) and the active
        // semester line — department is now resolved through the
        // curriculum ⇄ department mapping (see
        // resolveDepartmentByCurriculum above), falling back to
        // settings if that lookup comes back empty.
        collegeName: studentInfo.department || settings?.college_name || "",
        semesterLabel: activeSemesterLabel || settings?.active_semester_label || "",
        logoUrl: assets.logoUrl
          ? `${assets.logoUrl}`
          : `${window.location.origin}${EaristLogo}`,
      });
    } catch (error) {
      console.error("Failed to download class schedule:", error);
    } finally {
      setIsDownloadingSchedule(false);
    }
  };

  const yearSemesterLine = [
    formatYearLabel(studentInfo.yearLevelDescription),
    activeSemesterName,
  ]
    .filter(Boolean)
    .join(" — ");

  return (
    <Box sx={{ minHeight: "calc(100vh - 150px)", overflowY: "auto", backgroundColor: "transparent", mt: 1, p: { xs: 1, sm: 2 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 2, px: { xs: 0, sm: 2 } }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: { xs: "20px", sm: "26px", md: "32px", lg: "36px" } }}>
          CLASS SCHEDULE
        </Typography>






        <button
          variant="contained"
          onClick={handleDownloadSchedule}
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
          Download Schedule
        </button>
      </Box>

      <Box sx={{ height: "1px", backgroundColor: borderColor, mb: 3 }} />


      {/* ── Student Info Card — mirrors StudentCurriculumSubjects.jsx ── */}
      {(studentInfo.fullName || studentInfo.studentNumber) && (
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            mb: 3,
            mx: { xs: 0, sm: 2 },
            p: { xs: 1.5, sm: 2.5 },
            borderRadius: "10px",
            backgroundColor: "#fff",
            border: `1px solid ${borderColor}`,
            boxShadow: 2,
            gap: { xs: 1, sm: 3 },
          }}
        >
          {/* Icon */}
          <Box
            sx={{
              width: { xs: 34, sm: 42, md: 48 },
              height: { xs: 34, sm: 42, md: 48 },
              borderRadius: "50%",
              backgroundColor: headerBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <EventNoteIcon sx={{ fontSize: { xs: 18, sm: 22, md: 24 } }} />
          </Box>

          {/* Accent bar */}
          <Box
            sx={{
              width: 4,
              borderRadius: 2,
              backgroundColor: headerBg,
              flexShrink: 0,
              alignSelf: "stretch",
            }}
          />

          {/* Info — stacks on mobile/tablet, side-by-side on desktop */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", lg: "row" },
                justifyContent: "space-between",
                gap: { xs: 0.5, lg: 0 },
              }}
            >
              {/* LEFT */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Typography sx={{ fontSize: { xs: 11.5, sm: 13, md: 14 }, fontWeight: 700, color: titleColor }}>
                  STUDENT NUMBER:{" "}
                  <Box component="span" sx={{ fontWeight: 400, ml: 1, color: subtitleColor }}>
                    {studentInfo.studentNumber || "—"}
                  </Box>
                </Typography>
                <Typography sx={{ fontSize: { xs: 11.5, sm: 13, md: 14 }, fontWeight: 700, color: titleColor }}>
                  NAME:{" "}
                  <Box component="span" sx={{ fontWeight: 400, ml: 1 }}>
                    {studentInfo.fullName}
                  </Box>
                </Typography>
                <Typography sx={{ fontSize: { xs: 11.5, sm: 13, md: 14 }, fontWeight: 700, color: titleColor }}>
                  DEPARTMENT:{" "}
                  <Box component="span" sx={{ fontWeight: 400, ml: 1, color: subtitleColor }}>
                    {studentInfo.department || "—"}
                  </Box>
                </Typography>

              </Box>

              {/* RIGHT */}
              <Box
                sx={{
                  textAlign: { xs: "left", lg: "right" },
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                }}
              >
                <Typography sx={{ fontSize: { xs: 11.5, sm: 13, md: 14 }, fontWeight: 700, color: titleColor }}>
                  PROGRAM:{" "}
                  <Box component="span" sx={{ fontWeight: 400, ml: 1, color: subtitleColor }}>
                    {studentInfo.programCode ? `(${studentInfo.programCode}) ` : ""}
                    {studentInfo.programDescription || "—"}
                  </Box>
                </Typography>
                <Typography sx={{ fontSize: { xs: 11.5, sm: 13, md: 14 }, fontWeight: 700, color: titleColor }}>
                  YEAR / SEMESTER:{" "}
                  <Box component="span" sx={{ fontWeight: 400, ml: 1, color: subtitleColor }}>
                    {yearSemesterLine || "—"}
                  </Box>
                </Typography>
                <Typography sx={{ fontSize: { xs: 11.5, sm: 13, md: 14 }, fontWeight: 700, color: titleColor }}>
                  SECTION:{" "}
                  <Box component="span" sx={{ fontWeight: 400, ml: 1, color: subtitleColor }}>
                    {studentInfo.sectionDescription || "—"}
                  </Box>
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Course summary (table on tablet/desktop, cards on phones) */}
      <Box sx={{ mb: 3, px: { xs: 0, sm: 2 } }}>{renderCourseSummary()}</Box>

      {/* Weekly Grid Section */}
      <Box sx={{ px: { xs: 1, sm: "1rem" }, mx: { xs: 0, sm: 2 }, overflowX: "auto" }}>
        {isCompact ? (
          <Box sx={{ border: `1px solid ${borderColor}`, borderRadius: "10px", p: { xs: 1, sm: "1rem" } }}>
            {renderDayTabs()}
            {renderCompactDaySchedule()}
          </Box>
        ) : (
          renderDesktopGrid()
        )}
      </Box>
    </Box>
  );
};

export default StudentSchedule;
