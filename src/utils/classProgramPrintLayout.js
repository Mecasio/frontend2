/**
 * Shared print layout for EARIST Class Program (EARIST-QSF-INST-017).
 * Landscape schedule matching the official College Class Program form.
 */

import { resolveLogoDataUrl } from "./classListPrintLayout";

const DAYS = [
  { key: "MON", label: "MONDAY" },
  { key: "TUE", label: "TUESDAY" },
  { key: "WED", label: "WEDNESDAY" },
  { key: "THU", label: "THURSDAY" },
  { key: "FRI", label: "FRIDAY" },
  { key: "SAT", label: "SATURDAY" },
  { key: "SUN", label: "SUNDAY" },
];

const SLOT_COLORS = [
  "#FFF3CD",
  "#E8F5E9",
  "#E3F2FD",
  "#FCE4EC",
  "#FFF8E1",
  "#F3E5F5",
  "#E0F7FA",
  "#FFEBEE",
];

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const raw = String(timeStr).trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    const d = new Date(`1970-01-01 ${raw}`);
    if (Number.isNaN(d.getTime())) return null;
    return d.getHours() * 60 + d.getMinutes();
  }
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const formatMinutes = (totalMinutes) => {
  let hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${String(minutes).padStart(2, "0")} ${period}`;
};

/** Half-hour slots from 7:00 AM through 8:30 PM (ends at 9:00 PM). */
export const buildClassProgramTimeSlots = () => {
  const slots = [];
  for (let minutes = 7 * 60; minutes < 21 * 60; minutes += 30) {
    slots.push({
      startMinutes: minutes,
      endMinutes: minutes + 30,
      startLabel: formatMinutes(minutes),
      endLabel: formatMinutes(minutes + 30),
      label: `${formatMinutes(minutes)} - ${formatMinutes(minutes + 30)}`,
    });
  }
  return slots;
};

export const resolveClassType = (entry) => {
  const lec = Number(entry?.lec_unit) || 0;
  const lab = Number(entry?.lab_unit) || 0;
  if (lab > 0 && lec === 0) return "lab";
  if (lec > 0 && lab === 0) return "lec";
  if (lec > 0 && lab > 0) return "Lec/Lab";
  return "";
};

export const formatInstructorName = (entry) => {
  const last = String(entry?.prof_lastname || entry?.lname || "").trim();
  if (last) return last.toUpperCase();
  const first = String(entry?.prof_firstname || entry?.fname || "").trim();
  return first ? first.toUpperCase() : "";
};

export const formatAcademicYearLabel = ({
  semesterDescription = "",
  currentYear = "",
  nextYear = "",
} = {}) => {
  const semester = String(semesterDescription || "").trim().toUpperCase();
  const yearPart =
    currentYear && nextYear
      ? `AY ${currentYear} - ${nextYear}`
      : currentYear
        ? `AY ${currentYear}`
        : "";
  if (semester && yearPart) return `${semester}, ${yearPart}`;
  return semester || yearPart || "";
};

export const formatProgramBanner = ({
  programDescription = "",
  programCode = "",
  sectionDescription = "",
} = {}) => {
  const program = String(programDescription || "").trim().toUpperCase();
  const sectionTag = [programCode, sectionDescription]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
  if (program && sectionTag) return `${program} (${sectionTag})`;
  return program || sectionTag || "CLASS SCHEDULE";
};

const normalizeDayKey = (day) => {
  const raw = String(day || "").trim().toUpperCase();
  if (!raw) return "";
  if (raw.startsWith("MON")) return "MON";
  if (raw.startsWith("TUE")) return "TUE";
  if (raw.startsWith("WED")) return "WED";
  if (raw.startsWith("THU")) return "THU";
  if (raw.startsWith("FRI")) return "FRI";
  if (raw.startsWith("SAT")) return "SAT";
  if (raw.startsWith("SUN")) return "SUN";
  return raw.slice(0, 3);
};

const SLOT_ROW_HEIGHT_PX = 16;

const buildOccupiedCellHtml = (entry, color, rowspan = 1) => {
  const courseCode = escapeHtml(entry.course_code || "");
  const description = escapeHtml(entry.course_description || "");
  const timeRange = escapeHtml(
    `${entry.school_time_start || ""} - ${entry.school_time_end || ""}`.trim(),
  );
  const classType = escapeHtml(resolveClassType(entry));
  const instructor = escapeHtml(formatInstructorName(entry));
  const room = escapeHtml(entry.room_description || "");
  const minHeight = Math.max(rowspan, 1) * SLOT_ROW_HEIGHT_PX;

  return `
    <div class="cp-block" style="background:${color};min-height:${minHeight}px;">
      ${courseCode ? `<div class="cp-code">${courseCode}</div>` : ""}
      ${description ? `<div class="cp-desc">${description}</div>` : ""}
      ${timeRange !== "-" ? `<div class="cp-time">${timeRange}</div>` : ""}
      ${classType ? `<div class="cp-type">${classType}</div>` : ""}
      ${instructor ? `<div class="cp-instructor">${instructor}</div>` : ""}
      ${room ? `<div class="cp-room">${room}</div>` : ""}
    </div>
  `;
};

const buildScheduleGridHtml = (entries = []) => {
  const slots = buildClassProgramTimeSlots();
  const colorByEntryId = new Map();
  let colorIndex = 0;

  const getColor = (entry) => {
    const key = String(entry.id ?? `${entry.course_code}-${entry.school_time_start}-${entry.day_description}`);
    if (!colorByEntryId.has(key)) {
      if (entry.workload_color) {
        colorByEntryId.set(key, entry.workload_color);
      } else {
        colorByEntryId.set(key, SLOT_COLORS[colorIndex % SLOT_COLORS.length]);
        colorIndex += 1;
      }
    }
    return colorByEntryId.get(key);
  };

  const entriesByDay = DAYS.reduce((acc, day) => {
    acc[day.key] = [];
    return acc;
  }, {});

  entries.forEach((entry) => {
    const dayKey = normalizeDayKey(entry.day_description || entry.day);
    if (!entriesByDay[dayKey]) return;
    const start = parseTimeToMinutes(entry.school_time_start);
    const end = parseTimeToMinutes(entry.school_time_end);
    if (start == null || end == null || end <= start) return;
    entriesByDay[dayKey].push({ ...entry, _start: start, _end: end });
  });

  Object.keys(entriesByDay).forEach((dayKey) => {
    entriesByDay[dayKey].sort((a, b) => a._start - b._start);
  });

  const skipUntil = DAYS.reduce((acc, day) => {
    acc[day.key] = -1;
    return acc;
  }, {});

  const rowsHtml = slots
    .map((slot, slotIndex) => {
      const dayCells = DAYS.map((day) => {
        if (skipUntil[day.key] >= slotIndex) {
          return "";
        }

        const entry = entriesByDay[day.key].find(
          (item) => item._start <= slot.startMinutes && item._end > slot.startMinutes,
        );

        if (!entry) {
          return `<td class="cp-empty"></td>`;
        }

        const rowspan = Math.max(
          1,
          Math.round((Math.min(entry._end, 21 * 60) - slot.startMinutes) / 30),
        );
        skipUntil[day.key] = slotIndex + rowspan - 1;

        return `<td class="cp-filled" rowspan="${rowspan}">${buildOccupiedCellHtml(
          entry,
          getColor(entry),
          rowspan,
        )}</td>`;
      }).join("");

      return `
        <tr>
          <td class="cp-time-col">${escapeHtml(slot.label)}</td>
          ${dayCells}
        </tr>
      `;
    })
    .join("");

  const headerDays = DAYS.map(
    (day) => `<th class="cp-day-col">${escapeHtml(day.label)}</th>`,
  ).join("");

  return `
    <table class="cp-grid">
      <thead>
        <tr>
          <th class="cp-time-col">TIME</th>
          ${headerDays}
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
};

export const CLASS_PROGRAM_PRINT_CSS = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    background: #fff;
  }
  .class-program-print {
    width: 10.5in;
    font-size: 9px;
    color: #000;
  }
  .cp-header {
    display: grid;
    grid-template-columns: 70px 1fr 70px;
    align-items: start;
    gap: 8px;
    margin-bottom: 4px;
  }
  .cp-logo {
    width: 64px;
    height: 64px;
    object-fit: contain;
    margin-top: 50px;
  }
  .cp-header-text {
    text-align: center;
    line-height: 1.15;
    margin-top: 50px;
  }
  .cp-republic {
    font-size: 11px;
    margin: 0;
  }
  .cp-school {
    font-family: "Times New Roman", Times, serif;
    font-size: 14px;
    font-weight: 700;
    margin: 1px 0;
    letter-spacing: 0.2px;
    text-transform: uppercase;
  }
  .cp-address {
    font-size: 10px;
    margin: 0;
  }
  .cp-college {
    font-size: 11px;
    font-weight: 700;
    margin: 4px 0 0;
    text-transform: uppercase;
  }
  .cp-title {
    font-size: 13px;
    font-weight: 700;
    margin: 2px 0 0;
    letter-spacing: 0.5px;
  }
  .cp-semester {
    font-size: 10px;
    font-style: italic;
    margin: 2px 0 0;
  }
  .cp-banner {
    background: #B3D4F0;
    border: 1px solid #000;
    border-bottom: none;
    text-align: center;
    font-weight: 700;
    font-size: 11px;
    padding: 3px 6px;
    text-transform: uppercase;
  }
  .cp-grid {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .cp-grid th,
  .cp-grid td {
    border: 1px solid #000;
    vertical-align: middle;
    text-align: center;
    padding: 0;
  }
  .cp-grid thead th {
    background: #f2f2f2;
    font-size: 9px;
    font-weight: 700;
    height: 20px;
  }
  .cp-time-col {
    width: 11%;
    font-size: 7.5px;
    font-weight: 600;
    background: #fafafa;
    padding: 0 2px !important;
    height: ${SLOT_ROW_HEIGHT_PX}px;
  }
  .cp-day-col {
    width: 12.7%;
  }
  .cp-empty {
    height: ${SLOT_ROW_HEIGHT_PX}px;
    background: #fff;
  }
  .cp-filled {
    padding: 0 !important;
    vertical-align: middle;
  }
  .cp-block {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 1px 3px;
    line-height: 1.1;
    overflow: hidden;
  }
  .cp-code {
    font-weight: 700;
    font-size: 8px;
  }
  .cp-desc {
    font-size: 7px;
  }
  .cp-time,
  .cp-type,
  .cp-room {
    font-size: 6.5px;
  }
  .cp-instructor {
    font-size: 7.5px;
    font-weight: 700;
    margin-top: 1px;
    text-transform: uppercase;
  }
  .cp-doc-code {
    display: inline-block;
    background: #000;
    color: #fff;
    font-size: 9px;
    font-weight: 600;
    padding: 2px 10px;
    margin-top: 0;
    border: 1px solid #000;
    border-top: none;
  }
  .cp-signatures {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-top: 10px;
  }
  .cp-sig {
    text-align: left;
    min-height: 58px;
  }
  .cp-sig-role {
    font-size: 9px;
    font-style: italic;
    margin-bottom: 16px;
  }
  .cp-sig-name {
    font-size: 9px;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
    border-bottom: 1px solid #000;
    padding: 0 4px 1px;
    min-height: 12px;
  }
  .cp-sig-title {
    font-size: 8px;
    text-align: center;
    margin-top: 2px;
  }
`;

export const buildClassProgramPrintHtml = ({
  companyName = "EULOGIO 'AMANG' RODRIGUEZ INSTITUTE OF SCIENCE AND TECHNOLOGY",
  campusAddress = "Nagtahan, Sampaloc, Manila",
  logoUrl = "",
  collegeName = "",
  programBanner = "",
  semesterLabel = "",
  entries = [],
  signatures = {},
} = {}) => {
  const sig = {
    preparedByName: signatures.preparedByName || "",
    preparedByTitle: signatures.preparedByTitle || "Department Head",
    certifiedByName: signatures.certifiedByName || "",
    certifiedByTitle: signatures.certifiedByTitle || "Dean",
    recommendingName: signatures.recommendingName || "Dr. ALLAN Q. QUISMUNDO",
    recommendingTitle:
      signatures.recommendingTitle || "Vice President for Academic Affairs",
    approvedByName: signatures.approvedByName || "Dr. ROGELIO T. MAMARADLO",
    approvedByTitle: signatures.approvedByTitle || "President",
  };

  return `
    <div class="class-program-print">
      <div class="cp-header">
        <div>
          ${
            logoUrl
              ? `<img class="cp-logo" src="${escapeHtml(logoUrl)}" alt="Logo" />`
              : ""
          }
        </div>
        <div class="cp-header-text">
          <p class="cp-republic">Republic of the Philippines</p>
          <p class="cp-school">${escapeHtml(companyName)}</p>
          <p class="cp-address">${escapeHtml(campusAddress)}</p>
          ${
            collegeName
              ? `<p class="cp-college">${escapeHtml(String(collegeName).toUpperCase())}</p>`
              : ""
          }
          <p class="cp-title">CLASS PROGRAM</p>
          ${
            semesterLabel
              ? `<p class="cp-semester">${escapeHtml(semesterLabel)}</p>`
              : ""
          }
        </div>
        <div></div>
      </div>

      <div class="cp-banner">${escapeHtml(programBanner)}</div>
      ${buildScheduleGridHtml(entries)}
      <div class="cp-doc-code">EARIST-QSF-INST-017</div>

      <div class="cp-signatures">
        <div class="cp-sig">
          <div class="cp-sig-role">Prepared by:</div>
          <div class="cp-sig-name">${escapeHtml(sig.preparedByName)}</div>
          <div class="cp-sig-title">${escapeHtml(sig.preparedByTitle)}</div>
        </div>
        <div class="cp-sig">
          <div class="cp-sig-role">Certified Correct by:</div>
          <div class="cp-sig-name">${escapeHtml(sig.certifiedByName)}</div>
          <div class="cp-sig-title">${escapeHtml(sig.certifiedByTitle)}</div>
        </div>
        <div class="cp-sig">
          <div class="cp-sig-role">Recommending Approval:</div>
          <div class="cp-sig-name">${escapeHtml(sig.recommendingName)}</div>
          <div class="cp-sig-title">${escapeHtml(sig.recommendingTitle)}</div>
        </div>
        <div class="cp-sig">
          <div class="cp-sig-role">Approved by:</div>
          <div class="cp-sig-name">${escapeHtml(sig.approvedByName)}</div>
          <div class="cp-sig-title">${escapeHtml(sig.approvedByTitle)}</div>
        </div>
      </div>
    </div>
  `;
};

export const downloadClassProgramPdf = async ({
  apiBaseUrl,
  sectionId,
  sectionMeta = {},
  companyName,
  campusAddress,
  logoUrl,
  collegeName,
  signatures,
}) => {
  const scheduleRes = await fetch(
    `${apiBaseUrl}/api/get/section_schedule/${sectionId}`,
  );

  if (!scheduleRes.ok) {
    const errorData = await scheduleRes.json().catch(() => null);
    throw new Error(
      errorData?.error ||
        errorData?.message ||
        "Failed to fetch section schedule.",
    );
  }

  const entries = await scheduleRes.json();
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("No class schedule found for the selected section.");
  }

  const first = entries[0] || {};
  const programDescription =
    sectionMeta.program_description || first.program_description || "";
  const programCode = sectionMeta.program_code || first.program_code || "";
  const sectionDescription =
    sectionMeta.description ||
    sectionMeta.section_description ||
    first.section_description ||
    "";
  const resolvedCollege =
    collegeName || first.dprtmnt_name || sectionMeta.dprtmnt_name || "";

  const semesterLabel = formatAcademicYearLabel({
    semesterDescription: first.semester_description,
    currentYear: first.current_year,
    nextYear: first.next_year,
  });

  const programBanner = formatProgramBanner({
    programDescription,
    programCode,
    sectionDescription,
  });

  const logoDataUrl = await resolveLogoDataUrl(logoUrl || "");

  // Same pattern as FacultyWorkload: send form HTML + CSS styles separately.
  const html = buildClassProgramPrintHtml({
    companyName:
      companyName?.trim() ||
      "EULOGIO 'AMANG' RODRIGUEZ INSTITUTE OF SCIENCE AND TECHNOLOGY",
    campusAddress: campusAddress?.trim() || "Nagtahan, Sampaloc, Manila",
    logoUrl: logoDataUrl,
    collegeName: resolvedCollege,
    programBanner,
    semesterLabel,
    entries,
    signatures,
  });

  const sectionLabel = [programCode, sectionDescription]
    .filter(Boolean)
    .join(" ");

  const res = await fetch(`${apiBaseUrl}/api/generate-class-program-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      html,
      styles: CLASS_PROGRAM_PRINT_CSS,
      section_label: sectionLabel,
      program_code: programCode,
    }),
  });

  const contentType = res.headers.get("content-type");

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    console.error("Backend error:", errorData);
    throw new Error(errorData?.error || errorData?.message || "PDF failed");
  }

  if (!contentType || !contentType.includes("application/pdf")) {
    const text = await res.text();
    console.error("Unexpected response:", text);
    throw new Error("Server did not return a valid PDF");
  }

  const blob = await res.blob();

  if (blob.size === 0) {
    throw new Error("Generated PDF is empty");
  }

  const safeName = String(sectionLabel || "Section")
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_");

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Class_Program_${safeName || "Section"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);

  return { entryCount: entries.length, sectionLabel };
};
