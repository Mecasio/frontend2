import axios from "axios";

// ─── Remark label map — mirrors REMARK_MAP in StudentGradePage.jsx ────────
const REMARK_LABELS = {
  0: "Ongoing",
  1: "Passed",
  2: "Failed",
  3: "Incomplete",
  4: "Dropped",
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const resolveLogoDataUrl = async (logoUrl) => {
  if (!logoUrl) return "";
  const src = String(logoUrl);
  if (src.startsWith("data:")) return src;

  try {
    const response = await fetch(src);
    if (!response.ok) return "";
    const blob = await response.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
};

// Mirrors getUnitDisplay() in StudentGradePage.jsx
const getUnitDisplay = (row) => {
  const course = parseInt(row.course_unit) || 0;
  const lab = parseInt(row.lab_unit) || 0;
  if (course === 0 && lab === 0) return "—";
  if (course === 0) return lab;
  if (lab === 0) return course;
  return course + lab;
};

// ── Builds the "2022-2023" calendar school-year range for a single term.
// Prefers an already-formatted value from the API if one exists; otherwise
// derives it from `year_description`, the same field this app already
// uses elsewhere (see getAcademicTermKey / getTermSortValue in
// StudentGradePage.jsx) to tell terms apart by academic year.
//
// ⚠️ If your /api/student_grade/:id rows use a different column name for
// the calendar school year, update the field names checked here.
const formatSchoolYearRange = (subject) => {
  if (subject?.school_year) return String(subject.school_year);
  if (subject?.sy_label) return String(subject.sy_label);
  if (subject?.school_year_description)
    return String(subject.school_year_description);

  const startYear = parseInt(subject?.year_description, 10);
  if (Number.isFinite(startYear) && startYear > 0) {
    return `${startYear}-${startYear + 1}`;
  }
  return "";
};

const buildTermTableRows = (termSubjects) =>
  termSubjects
    .map((row, i) => {
      const faculty =
        row.fname === "TBA" && row.lname === "TBA"
          ? "TBA"
          : `Prof. ${escapeHtml(row.fname)} ${escapeHtml(row.lname)}`;

      const grade = row.grade_display
        ? escapeHtml(row.grade_display)
        : (row.numeric_grade ?? "—");

      const remark =
        REMARK_LABELS[row.en_remarks] !== undefined
          ? REMARK_LABELS[row.en_remarks]
          : "—";

      return `
        <tr>
          <td class="center">${i + 1}</td>
          <td>${escapeHtml(row.course_code)}</td>
          <td>${escapeHtml(row.course_description)}</td>
          <td>${faculty}</td>
          <td class="center">${escapeHtml(row.section_description)}</td>
          <td class="center">${getUnitDisplay(row)}</td>
          <td class="center grade-cell">${grade}</td>
          <td class="center">${remark}</td>
        </tr>`;
    })
    .join("");

// ── Each term renders as its own solid-black-bordered box: heading bar,
//    bordered table, bordered GWA footer — all inside one .term-section.
//    The heading now reads "SCHOOL YEAR - YEAR LEVEL - SEMESTER", e.g.
//    "2022-2023 - 1ST YEAR - FIRST SEMESTER", so each box is unambiguous
//    about exactly which academic term it's showing. ──────────────────
const buildTermSection = (term, termSubjects, formatYearLabel) => {
  const first = termSubjects[0] || {};
  const yearLevelLabel =
    formatYearLabel?.(first.year_level_description) ||
    first.year_level_description ||
    "";
  const semesterLabel = first.semester_description || "";
  const schoolYearRange = formatSchoolYearRange(first);
  const section = first.section_description || "—";
  const gwaValue = first.gwa;

  const headingLeft = [schoolYearRange, yearLevelLabel, semesterLabel]
    .filter(Boolean)
    .join(" - ")
    .toUpperCase();

  return `
    <div class="term-section">
      <div class="term-heading">
        <span>${escapeHtml(headingLeft)}</span>
        <span>Section: ${escapeHtml(section)}</span>
      </div>
      <table class="grade-table">
        <thead>
          <tr>
            <th style="width:22px;">#</th>
            <th style="width:66px;">Code</th>
            <th>Subject</th>
            <th style="width:130px;">Faculty</th>
            <th style="width:66px;">Section</th>
            <th style="width:40px;">Units</th>
            <th style="width:56px;">Grade</th>
            <th style="width:70px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${buildTermTableRows(termSubjects)}
        </tbody>
      </table>
      ${
        gwaValue
          ? `<div class="term-gwa">Weighted GWA: <strong>${Number(gwaValue).toFixed(3)}</strong></div>`
          : ""
      }
    </div>
  `;
};

const buildStudentMeta = (studentInfo) => `
  <div class="student-meta">
    <div class="meta-col">
      <p><strong>STUDENT NUMBER:</strong> ${escapeHtml(studentInfo.studentNumber || "—")}</p>
      <p><strong>NAME:</strong> ${escapeHtml(studentInfo.fullName || "—")}</p>
      <p><strong>DEPARTMENT:</strong> ${escapeHtml(studentInfo.department || "—")}</p>
      ${
        studentInfo.weightedGwa
          ? `<p><strong>WEIGHTED GWA:</strong> ${Number(studentInfo.weightedGwa).toFixed(3)}</p>`
          : ""
      }
    </div>
    <div class="meta-col meta-col-right">
      <p><strong>PROGRAM:</strong> ${
        studentInfo.programCode
          ? `(${escapeHtml(studentInfo.programCode)}) `
          : ""
      }${escapeHtml(studentInfo.programDescription || "—")}</p>
      ${
        studentInfo.yearSemesterLabel
          ? `<p><strong>YEAR / SEMESTER:</strong> ${escapeHtml(studentInfo.yearSemesterLabel)}</p>`
          : ""
      }
      <p><strong>SECTION:</strong> ${escapeHtml(studentInfo.sectionDescription || "—")}</p>
    </div>
  </div>
`;
// ─── Header — the shared letterhead block (logo + Republic of the
// Philippines + school name + address). No longer carries a school-year
// line: for an "all semesters" export the current active SY doesn't mean
// anything (the doc spans many years), so that info now lives on each
// individual term's own heading instead, where it's actually correct. ──
const buildHeader = ({ logoUrl, companyName, campusAddress }) => `
  <div class="print-header">
    ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" />` : ""}
    <div class="header-text">
      <p class="republic">Republic of the Philippines</p>
      <p class="school-name">${escapeHtml(companyName || "")}</p>
      <p class="address">${escapeHtml(campusAddress || "")}</p>
    </div>
  </div>
`;

const buildGradesHtml = ({
  studentInfo,
  terms,
  companyName,
  campusAddress,
  logoUrl,
  title,
  formatYearLabel,
}) => {
  const header = buildHeader({ logoUrl, companyName, campusAddress });

  // ── Derive "current" Weighted GWA + Year/Semester for the meta box ──
  // terms is ordered oldest → newest (see downloadStudentGradesPdf), so
  // the LAST entry is either the single selected term (scope: "term")
  // or the most recent term overall (scope: "all") — exactly the value
  // that belongs at the top, mirroring the on-screen student card in
  // StudentGradePage.jsx.
  const latestTerm = terms[terms.length - 1];
  const latestSubject = latestTerm?.subjects?.[0] || {};
  const yearLevelLabel =
    formatYearLabel?.(latestSubject.year_level_description) ||
    latestSubject.year_level_description ||
    "";
  const semesterLabel = latestSubject.semester_description || "";
  const yearSemesterLabel = [yearLevelLabel, semesterLabel]
    .filter(Boolean)
    .join(" - ");

  const meta = buildStudentMeta({
    ...studentInfo,
    weightedGwa: latestSubject.gwa,
    yearSemesterLabel,
  });

  // No forced page-break per term — sections flow one after another so the
  // whole "all semesters" export stays compact (the backend auto-scales
  // to keep this within ~3 pages). Each .term-section still avoids
  // splitting mid-table via CSS (page-break-inside: avoid).
  const sections = terms
    .map((t) => buildTermSection(t.term, t.subjects, formatYearLabel))
    .join("");

  // ── Repeating-header trick ───────────────────────────────────────────
  // Everything is wrapped in ONE <table>, with the letterhead living in
  // its <thead> and everything else in a single <tbody> cell. Chromium's
  // print/PDF engine repeats a table's <thead> at the top of every
  // physical page that table's content spills onto — this is what makes
  // the letterhead reappear on page 2, 3, etc. of a long export instead
  // of only showing once at the very top of the document.
  return `
    <table class="pdf-repeat-header-table" style="width:100%; border-collapse:collapse; border:none;">
      <thead>
        <tr>
          <td style="padding:0; border:none;">${header}</td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:0; border:none;">
            <div class="schedule-title">${escapeHtml(title)}</div>
            ${meta}
            ${sections}
          </td>
        </tr>
      </tbody>
    </table>
  `;
};

const triggerBlobDownload = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ── Reads the real error message out of an axios error when
//    responseType: "blob" was used. On failure the server still sends
//    back JSON (e.g. { message: "PDF generation failed", error: "..." }),
//    but axios hands it to us as an unreadable Blob instead of parsed
//    JSON because the request was configured to expect a PDF blob back.
//    This converts that Blob to text (and JSON-parses it if possible) so
//    callers can surface the actual server-side reason instead of a
//    generic "Network Error" / silent failure.
const extractAxiosBlobErrorMessage = async (err) => {
  const data = err?.response?.data;

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      try {
        const parsed = JSON.parse(text);
        return parsed.error || parsed.message || text;
      } catch {
        return text;
      }
    } catch {
      // fall through to generic message below
    }
  }

  return err?.message || "Unknown error";
};

/**
 * Downloads a "Student Grades" PDF, either for every semester on record
 * (scope: "all") or for a single semester (scope: "term").
 *
 * @param {Object} params
 * @param {string} params.apiBaseUrl
 * @param {Object} params.studentInfo  { fullName, firstName, lastName, studentNumber, department, programCode, programDescription, sectionDescription }
 * @param {Array}  params.terms        [{ term: "First Year First Semester", subjects: [...] }, ...]
 * @param {string} [params.companyName]
 * @param {string} [params.campusAddress]
 * @param {string} [params.logoUrl]
 * @param {Function} [params.formatYearLabel]  (yearLevelDescription) => "1st Year" etc.
 * @param {"all"|"term"} [params.scope]
 */
export const downloadStudentGradesPdf = async ({
  apiBaseUrl,
  studentInfo,
  terms,
  companyName,
  campusAddress,
  logoUrl,
  formatYearLabel,
  scope = "all",
}) => {
  if (!terms || !terms.length || !studentInfo) return;

  // Was a no-op ternary (both branches returned the same string) —
  // simplified to a plain constant since scope no longer changes the title.
  const title = "STUDENT GRADES";
  const embeddedLogoUrl = await resolveLogoDataUrl(logoUrl);

  const html = buildGradesHtml({
    studentInfo,
    terms,
    companyName,
    campusAddress,
    logoUrl: embeddedLogoUrl,
    title,
    formatYearLabel,
  });

  let response;
  try {
    response = await axios.post(
      `${apiBaseUrl}/api/generate-student-grades-pdf`,
      {
        html,
        student_number: studentInfo.studentNumber,
        last_name: studentInfo.lastName,
        first_name: studentInfo.firstName,
      },
      { responseType: "blob" },
    );
  } catch (err) {
    // Surface the real server-side reason instead of letting callers
    // catch a useless "Request failed with status code 500" / a Blob
    // they can't read. See extractAxiosBlobErrorMessage() above.
    const status = err?.response?.status;
    const serverMessage = await extractAxiosBlobErrorMessage(err);
    const prefix = status ? `Grades PDF request failed (${status})` : "Grades PDF request failed";
    throw new Error(`${prefix}: ${serverMessage}`);
  }

  const safeLastName = String(studentInfo.lastName || "Student")
    .trim()
    .replace(/\s+/g, "_");
  const termSuffix =
    scope === "term" && terms[0]?.term
      ? `_${String(terms[0].term).trim().replace(/\s+/g, "_")}`
      : "_All_Semesters";
  const fileName = `Grades_${safeLastName}${termSuffix}.pdf`;

  triggerBlobDownload(response.data, fileName);
};
