import axios from "axios";

// Mirrors classProgramPrintLayout.js's approach: build the printable HTML
// on the client, POST it to the PDF route, and download the returned blob.

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const toWholeUnit = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? Math.round(num) : 0;
};

const formatProfessorName = (firstName, lastName, middleName) => {
  const isTba = firstName === "TBA" && lastName === "TBA";
  if (isTba) return "TBA";
  const last = (lastName || "").trim();
  const first = (firstName || "").trim();
  const middle = (middleName || "").trim();
  if (!last && !first) return "TBA";
  return `${last}, ${first}${middle ? " " + middle : ""}`.trim();
};

// Schedule cell text is squeezed as tight as possible (no comma after the
// day, no space before AM/PM) so each row's schedule column has a chance
// of fitting on a single printed line alongside the rest of the row.
const buildScheduleCell = (row) => {
  const day =
    !row.day_description || row.day_description === "TBA"
      ? "TBA"
      : row.day_description;
  const start = (row.school_time_start || "TBA").replace(/\s?([AP]M)/, "$1");
  const end = (row.school_time_end || "TBA").replace(/\s?([AP]M)/, "$1");
  const room = row.room_description || "TBA";
  return `${escapeHtml(day)} ${escapeHtml(start)}-${escapeHtml(end)} ${escapeHtml(room)}`;
};

// ─────────────────────────────────────────────────────────────────────────
// Weekly grid (Mon–Sun, 30-minute rows) — mirrors the merge/center-text
// logic in StudentSchedule.jsx's renderDesktopGrid(), rebuilt as static
// HTML with real <tr rowspan> merging so it prints cleanly in Puppeteer.
//
// Previously this was a 14-slot HOURLY_SLOTS array (1-hour rows), which
// meant any class starting/ending on a half hour didn't align cleanly
// with the grid. Now built the same way the frontend's TIME_SLOTS is:
// real, sequential 30-minute cells from 7:00 AM to 9:00 PM (28 slots).
// ─────────────────────────────────────────────────────────────────────────

const parseTime = (t) => new Date(`1970-01-01 ${t}`);

// Format a Date back into a "H:MM AM/PM" string matching the format used
// everywhere else in this file (parseTime expects this shape).
const formatTime = (d) => {
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const mm = minutes.toString().padStart(2, "0");
  return `${hours}:${mm} ${ampm}`;
};

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

const GRID_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const GRID_DAY_LABELS = {
  MON: "MONDAY",
  TUE: "TUESDAY",
  WED: "WEDNESDAY",
  THU: "THURSDAY",
  FRI: "FRIDAY",
  SAT: "SATURDAY",
  SUN: "SUNDAY",
};

const parseTimeToMinutes = (value) => {
  if (!value) return null;
  const d = new Date(`1970-01-01 ${value}`);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
};

// Builds a per-slot map for one day: each entry is either
//   { rowSpan, entry }  -> render this <td> here with rowspan
//   "covered"           -> skip, it's inside a previous rowspan
//   { rowSpan: 1, entry: null } -> empty cell
const buildDayRenderMap = (day, schedule) => {
  const slotOwner = new Array(TIME_SLOTS.length).fill(null);

  schedule
    .filter(
      (e) =>
        e.day_description === day &&
        e.school_time_start &&
        e.school_time_end
    )
    .forEach((entry) => {
      const entryStart = parseTimeToMinutes(entry.school_time_start);
      const entryEnd = parseTimeToMinutes(entry.school_time_end);
      if (entryStart == null || entryEnd == null) return;

      TIME_SLOTS.forEach(([slotStartLabel, slotEndLabel], idx) => {
        const slotStart = parseTimeToMinutes(slotStartLabel);
        const slotEnd = parseTimeToMinutes(slotEndLabel);
        if (slotStart >= entryStart && slotEnd <= entryEnd) {
          slotOwner[idx] = entry;
        }
      });
    });

  const renderMap = new Array(TIME_SLOTS.length).fill(null);
  let i = 0;
  while (i < TIME_SLOTS.length) {
    const entry = slotOwner[i];

    if (!entry) {
      renderMap[i] = { rowSpan: 1, entry: null };
      i += 1;
      continue;
    }

    let span = 1;
    while (
      i + span < TIME_SLOTS.length &&
      slotOwner[i + span] &&
      slotOwner[i + span].course_code === entry.course_code &&
      slotOwner[i + span].school_time_start === entry.school_time_start &&
      slotOwner[i + span].school_time_end === entry.school_time_end
    ) {
      span += 1;
    }

    renderMap[i] = { rowSpan: span, entry };
    for (let k = 1; k < span; k += 1) {
      renderMap[i + k] = "covered";
    }
    i += span;
  }

  return renderMap;
};

const buildWeeklyGridHtml = (studentSchedule) => {
  const dayRenderMaps = {};
  GRID_DAYS.forEach((day) => {
    dayRenderMaps[day] = buildDayRenderMap(day, studentSchedule);
  });

  const headerRow = `
    <tr>
      <th class="wg-time-col">TIME<div class="wg-official-time">Official Time</div></th>
      ${GRID_DAYS.map(
    (day) => `
        <th>
          ${GRID_DAY_LABELS[day]}
          <div class="wg-official-time">7:00AM - 9:00PM</div>
        </th>`
  ).join("")}
    </tr>
  `;

  const bodyRows = TIME_SLOTS.map(([start, end], idx) => {
    const timeCell = `<td class="wg-time-col">${escapeHtml(start)} - ${escapeHtml(end)}</td>`;

    const dayCells = GRID_DAYS.map((day) => {
      const cellInfo = dayRenderMaps[day][idx];

      if (cellInfo === "covered") return "";

      if (!cellInfo || !cellInfo.entry) {
        const rowSpan = cellInfo ? cellInfo.rowSpan : 1;
        return `<td class="wg-empty" rowspan="${rowSpan}"></td>`;
      }

      const { entry, rowSpan } = cellInfo;
      const room =
        entry.room_description && entry.room_description !== "TBA"
          ? entry.room_description
          : "TBA";
      const prof = formatProfessorName(
        entry.prof_firstname,
        entry.prof_lastname,
        entry.prof_middlename
      );

      return `
        <td class="wg-filled" rowspan="${rowSpan}">
          <div class="wg-course">${escapeHtml(entry.course_code)}</div>
          <div class="wg-room">${escapeHtml(room)}</div>
          <div class="wg-prof">${escapeHtml(prof)}</div>
        </td>
      `;
    }).join("");

    return `<tr>${timeCell}${dayCells}</tr>`;
  }).join("");

  return `
    <table class="weekly-grid-table">
      <thead>${headerRow}</thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
};

// Builds just the <div> content that gets wrapped by the server route's
// <html>/<head>/<style> shell (see generate-student-schedule-pdf-route.js).
//
// Header block reads, top to bottom, all centered under the logo:
//   Republic of the Philippines
//   <school name>
//   <campus address>
//   Student Schedule
//   <semesterLabel>  (e.g. "FIRST SEMESTER, AY 2026 - 2027", auto-incrementing
//    from the backend's /api/get_current_academic_year)
//
// Directly below the letterhead, the student identity block is split
// into two corners instead of one centered row:
//   left  -> Student Number, Student Name
//   right -> Department, Program & Section
//
// The schedule table's column widths and nowrap behavior live in the
// server route's <style> block (schedule-table th/td), not here — this
// file only builds the HTML content. See generate-student-schedule-pdf-route.js
// for the CSS (table-layout: fixed; white-space: nowrap; per-column widths)
// that keeps each course row on a single printed line.
export const buildStudentSchedulePrintHtml = ({
  studentSchedule = [],
  studentInfo = {},
  companyName = "",
  campusAddress = "",
  collegeName = "",
  semesterLabel = "",
  logoUrl = "",
}) => {
  const sorted = [...studentSchedule].sort((a, b) =>
    (a.course_code || "").localeCompare(b.course_code || "")
  );
  const totalUnits = sorted.reduce(
    (sum, row) => sum + toWholeUnit(row.course_unit),
    0
  );

  // `studentInfo.department` is preferred; `collegeName` (passed through
  // from StudentSchedule.jsx the same way CollegeScheduleChecker.jsx wires
  // its resolved department name into its own PDF download) is the
  // fallback so existing callers keep working unchanged.
  const departmentLabel = studentInfo.department || collegeName || "";

  const rows = sorted
    .map(
      (row, index) => `
        <tr>
          <td class="center">${index + 1}</td>
          <td>${escapeHtml(row.course_description)}</td>
          <td class="center">${escapeHtml(row.course_code)}</td>
          <td class="center">1</td>
          <td class="center">${row.lab_unit == null ? "" : toWholeUnit(row.lab_unit)
        }</td>
          <td class="center">${row.course_unit == null ? "" : toWholeUnit(row.course_unit)
        }</td>
          <td class="center">${escapeHtml(
          `${row.program_code || ""} ${row.section_description || ""}`.trim()
        )}</td>
          <td>${buildScheduleCell(row)}</td>
            <td>${escapeHtml(
          formatProfessorName(row.prof_firstname, row.prof_lastname, row.prof_middlename)
        )}</td>
        </tr>`
    )
    .join("");

  return `
    <div class="print-header">
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" />` : ""}
      <div class="header-text">
        <p class="republic">Republic of the Philippines</p>
        <p class="school-name">${escapeHtml(companyName)}</p>
        <p class="address">${escapeHtml(campusAddress)}</p>
        <p class="program-title">Student Schedule</p>
        ${semesterLabel ? `<p class="semester">${escapeHtml(semesterLabel)}</p>` : ""}
      </div>
    </div>

    <div class="student-meta">
      <div class="meta-col meta-col-left">
        <p><strong>Student Number:</strong> ${escapeHtml(studentInfo.studentNumber || "")}</p>
        <p><strong>Student Name:</strong> ${escapeHtml(studentInfo.fullName || "")}</p>
      </div>
      <div class="meta-col meta-col-right">
        <p><strong>Department:</strong> ${escapeHtml(departmentLabel)}</p>
        <p><strong>Program &amp; Section:</strong> ${escapeHtml(
    studentInfo.programSection || ""
  )}</p>
      </div>
    </div>

    <div class="schedule-title">Class Schedule</div>

    <table class="schedule-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Course Description</th>
          <th>Course Code</th>
          <th>Lec</th>
          <th>Lab</th>
          <th>Units</th>
          <th>Section</th>
          <th>Schedule</th>
          <th>Professor</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5"></td>
          <td class="center">Total Units</td>
          <td class="center">${totalUnits}</td>
          <td colspan="2"></td>
        </tr>
      </tfoot>
    </table>

    <div class="weekly-grid-section">
      <div class="weekly-grid-title">Weekly Schedule Grid</div>
      ${buildWeeklyGridHtml(sorted)}
    </div>
  `;
};

export const downloadStudentSchedulePdf = async ({
  apiBaseUrl,
  studentSchedule,
  studentInfo = {},
  companyName,
  campusAddress,
  collegeName,
  semesterLabel,
  logoUrl,
}) => {
  const html = buildStudentSchedulePrintHtml({
    studentSchedule,
    studentInfo,
    companyName,
    campusAddress,
    collegeName,
    semesterLabel,
    logoUrl,
  });

  const response = await axios.post(
    `${apiBaseUrl}/api/generate-student-schedule-pdf`,
    {
      html,
      student_number: studentInfo.studentNumber || "",
      last_name: studentInfo.lastName || "",
      first_name: studentInfo.firstName || "",
      audit_print_action: "PRINTING_STUDENT_DOCS",
      document_label: "Class Schedule",
    },
    { responseType: "blob" }
  );

  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Class_Schedule_${studentInfo.lastName || "Student"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};