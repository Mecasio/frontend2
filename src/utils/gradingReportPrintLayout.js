/**
 * Shared print layout for Grade Sheet documents (see EXAMPLES/GradingReport.pdf).
 */

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Match PDF: school name on two uppercase lines when long enough. */
export const splitSchoolNameForGradeSheet = (name = "") => {
  const trimmed = String(name).trim();
  if (!trimmed) return { firstLine: "", secondLine: "" };

  const upper = trimmed.toUpperCase();
  const instituteIdx = upper.indexOf("INSTITUTE OF");
  if (instituteIdx > 0) {
    return {
      firstLine: upper.slice(0, instituteIdx).trim(),
      secondLine: upper.slice(instituteIdx).trim(),
    };
  }

  if (upper.length <= 48) {
    return { firstLine: upper, secondLine: "" };
  }

  const words = upper.split(/\s+/);
  const middleIndex = Math.ceil(words.length / 2);
  return {
    firstLine: words.slice(0, middleIndex).join(" "),
    secondLine: words.slice(middleIndex).join(" "),
  };
};

/** Embed logo as data URL so browser print can always render it. */
export const resolveLogoDataUrl = async (logoUrl) => {
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

/** @deprecated Kept for callers; rows are no longer capped — browser fills pages. */
export const GRADING_REPORT_ROWS_PER_PAGE = 0;

export const GRADING_REPORT_PRINT_CSS = `
  @page { size: A4 portrait; margin: 0.35in 0.4in 0.45in; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    background: #fff;
  }
  .grade-sheet-print {
    width: 100%;
    font-size: 11px;
  }

  /* Single table: thead/tfoot repeat; tbody rows fill pages dynamically. */
  .grade-sheet-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 10.5px;
  }
  .grade-sheet-table > thead {
    display: table-header-group;
  }
  .grade-sheet-table > tfoot {
    display: table-footer-group;
  }
  .grade-sheet-table > tbody {
    display: table-row-group;
  }
  .grade-sheet-table > thead > tr.banner-row > td,
  .grade-sheet-table > tfoot > tr.footer-row > td {
    border: none;
    padding: 0;
    vertical-align: top;
  }
  .grade-sheet-table > tfoot > tr.footer-row > td {
    padding-top: 1rem;
  }

  /* ── Header with logo ── */
  .header-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    min-height: 72px;
    margin-bottom: 2px;
  }
  .header-logo {
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    object-fit: contain;
  }
  .school-header {
    text-align: center;
  }
  .school-header .republic {
    font-size: 11px;
    margin-top: 2px;
  }
  .school-header .school-name {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.4px;
    line-height: 1.15;
    text-transform: uppercase;
  }
  .school-header .address {
    font-size: 11px;
  }
  .doc-title {
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    margin: 6px 0 4px;
    letter-spacing: 1px;
  }

  /* ── Course metadata: bordered grid like PDF ── */
  .info-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    line-height: 1.25;
    margin-bottom: calc(4px + 1rem);
  }
  .info-table td {
    border: 1px solid #000;
    padding: 0 6px;
    vertical-align: middle;
  }
  .info-label {
    white-space: nowrap;
    width: 92px;
    background: #fff;
  }
  .info-value {
    font-weight: 400;
  }
  .info-label-mid {
    white-space: nowrap;
    width: 72px;
  }
  .info-value-narrow {
    width: 40px;
    text-align: center;
    font-weight: 400;
  }
  .info-label-right {
    white-space: nowrap;
    width: 110px;
  }

  /* ── Students / grades columns ── */
  .grade-sheet-table > thead > tr.col-head-row > th {
    border: 1px solid #000;
    background: #d9d9d9;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    text-align: center;
    font-weight: 700;
    font-size: 10px;
    padding: 0 3px;
  }
  .grade-sheet-table .grades-banner {
    letter-spacing: 3px;
    font-size: 11px;
  }
  .grade-sheet-table > tbody > tr > td {
    border: 1px solid #000;
    padding: 1px 3px;
    vertical-align: middle;
  }
  .grade-sheet-table td.name-cell {
    text-align: left;
    text-transform: uppercase;
    padding-left: 4px;
  }
  .grade-sheet-table td.center-cell {
    text-align: center;
  }
  .col-num { width: 28px; }
  .col-sno { width: 88px; }
  .col-mid { width: 48px; }
  .col-final { width: 48px; }
  .col-fg { width: calc(58px + 2rem); }
  .col-re { width: 52px; }
  .col-remarks { width: calc(78px + 2rem); }

  /* ── Stats + signatures ── */
  .footer-block {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-top: 0;
  }
  .stats-box {
    border: 1px solid #000;
    padding: 15px 20px;
    font-size: 11px;
    min-width: 168px;
    flex-shrink: 0;
    box-sizing: border-box;
  }
  .stats-box .stats-title {
    text-decoration: underline;
    margin-bottom: 4px;
    font-weight: 400;
  }
  .stats-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin: 1px 0;
    padding-left: 10px;
  }
  .stats-row.total {
    margin-top: 4px;
    padding-top: 2px;
    font-weight: 400;
  }
  .stats-row.total .stats-total-value {
    border-top: solid 1px black;
  }
  .signatures {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 22px;
    padding-top: 2px;
    margin-top: 25px;
    min-height: 96px;
  }
  .sig-row {
    display: flex;
    justify-content: space-between;
    gap: 28px;
  }
  .sig-block {
    width: 48%;
    text-align: center;
    font-size: 11px;
  }
  .sig-name {
    min-height: 14px;
    font-weight: 400;
    line-height: 1;
    margin: 0;
    padding: 0 0 1px;
    border-bottom: 1px solid #000;
  }
  .sig-line {
    border-top: none;
    margin-top: 0;
    padding-top: 2px;
    font-size: 10px;
    line-height: 1.2;
  }

  .print-info {
    margin-top: 8px;
    font-size: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
`;

/**
 * Build Grade Sheet print HTML matching EXAMPLES/GradingReport.pdf.
 * Uses one continuous table so the browser fills each page dynamically.
 * Letterhead + column headers live in <thead>; stats/signatures in <tfoot>.
 */
export const buildGradingReportPrintHtml = ({
  companyName = "",
  campusAddress = "Nagtahan St, Sampaloc, Manila",
  logoUrl = "",
  subjectCode = "",
  subjectTitle = "",
  academicYearTerm = "",
  classSection = "",
  lecUnit = "0.0",
  labUnit = "0.0",
  creditUnit = "0.0",
  session = "",
  facultyName = "",
  datePosted = "",
  collegeName = "",
  students = [],
  stats = {
    passed: 0,
    failed: 0,
    incomplete: 0,
    drop: 0,
    noGrade: 0,
  },
  departmentChairName = "",
  deanName = "",
  registrarName = "",
  printInfoLabel = "",
}) => {
  const { firstLine, secondLine } = splitSchoolNameForGradeSheet(companyName);
  const totalStudents = students.length;
  const deanLabel = collegeName ? `Dean, ${collegeName}` : "Dean";

  const bannerHtml = `
    <div class="header-wrap">
      ${
        logoUrl
          ? `<img class="header-logo" src="${escapeHtml(logoUrl)}" alt="Logo" />`
          : ""
      }
      <div class="school-header">
        <div class="republic">Republic of the Philippines</div>
        ${firstLine ? `<div class="school-name">${escapeHtml(firstLine)}</div>` : ""}
        ${secondLine ? `<div class="school-name">${escapeHtml(secondLine)}</div>` : ""}
        <div class="address">${escapeHtml(campusAddress)}</div>
      </div>
    </div>

    <div class="doc-title">GRADE SHEET</div>

    <table class="info-table">
      <tbody>
        <tr>
          <td class="info-label">Subject Code:</td>
          <td class="info-value" colspan="5">${escapeHtml(subjectCode)}</td>
          <td class="info-label-right">Acad. Yr &amp; Term:</td>
          <td class="info-value" colspan="3">${escapeHtml(academicYearTerm)}</td>
        </tr>
        <tr>
          <td class="info-label">Subject Title:</td>
          <td class="info-value" colspan="5">${escapeHtml(subjectTitle)}</td>
          <td class="info-label-right">Class Section:</td>
          <td class="info-value" colspan="3">${escapeHtml(classSection)}</td>
        </tr>
        <tr>
          <td class="info-label">Lec. Unit:</td>
          <td class="info-value-narrow">${escapeHtml(lecUnit)}</td>
          <td class="info-label-mid">Lab. Unit:</td>
          <td class="info-value-narrow">${escapeHtml(labUnit)}</td>
          <td class="info-label-mid">Credit. Unit:</td>
          <td class="info-value-narrow">${escapeHtml(creditUnit)}</td>
          <td class="info-label-right">Session:</td>
          <td class="info-value" colspan="3">${escapeHtml(session)}</td>
        </tr>
        <tr>
          <td class="info-label">Faculty:</td>
          <td class="info-value" colspan="5">${escapeHtml(facultyName)}</td>
          <td class="info-label-right">Date Posted:</td>
          <td class="info-value" colspan="3">${escapeHtml(datePosted)}</td>
        </tr>
        <tr>
          <td class="info-label">College:</td>
          <td class="info-value" colspan="9">${escapeHtml(collegeName)}</td>
        </tr>
      </tbody>
    </table>
  `;

  const footerInnerHtml = `
    <div class="footer-block">
      <div class="stats-box">
        <div class="stats-title">Grade Sheet Statistics</div>
        <div class="stats-row"><span>Passed:</span><span>${stats.passed ?? 0}</span></div>
        <div class="stats-row"><span>Failed:</span><span>${stats.failed ?? 0}</span></div>
        <div class="stats-row"><span>Incomplete:</span><span>${stats.incomplete ?? 0}</span></div>
        <div class="stats-row"><span>Dropped:</span><span>${stats.drop ?? 0}</span></div>
        <div class="stats-row"><span>No Grade:</span><span>${stats.noGrade ?? 0}</span></div>
        <div class="stats-row total">
          <span>Total # of Students:</span>
          <span class="stats-total-value">${totalStudents}</span>
        </div>
      </div>

      <div class="signatures">
        <div class="sig-row">
          <div class="sig-block">
            <div class="sig-name">${escapeHtml(facultyName)}</div>
            <div class="sig-line">Instructor/Professor</div>
          </div>
          <div class="sig-block">
            <div class="sig-name">${escapeHtml(departmentChairName) || "&nbsp;"}</div>
            <div class="sig-line">Department Chairman</div>
          </div>
        </div>
        <div class="sig-row">
          <div class="sig-block">
            <div class="sig-name">${escapeHtml(deanName) || "&nbsp;"}</div>
            <div class="sig-line">${escapeHtml(deanLabel)}</div>
          </div>
          <div class="sig-block">
            <div class="sig-name">${escapeHtml(registrarName) || "&nbsp;"}</div>
            <div class="sig-line">Registrar</div>
          </div>
        </div>
      </div>
    </div>
    ${
      printInfoLabel
        ? `<div class="print-info">
            <span>Date Printed: ${escapeHtml(printInfoLabel)}</span>
            <span></span>
          </div>`
        : ""
    }
  `;

  const studentRows =
    students.length > 0
      ? students
          .map(
            (student, index) => `
      <tr>
        <td class="center-cell col-num">${index + 1}</td>
        <td class="center-cell col-sno">${escapeHtml(student.student_number)}</td>
        <td class="name-cell">${escapeHtml(
          String(student.fullName || "").toUpperCase(),
        )}</td>
        <td class="center-cell col-mid">${escapeHtml(student.mid)}</td>
        <td class="center-cell col-final">${escapeHtml(student.final)}</td>
        <td class="center-cell col-fg">${escapeHtml(student.finalGrade)}</td>
        <td class="center-cell col-re">${escapeHtml(student.reExam ?? "")}</td>
        <td class="center-cell col-remarks">${escapeHtml(student.remarks ?? "")}</td>
      </tr>`,
          )
          .join("")
      : `<tr><td colspan="8" class="center-cell">No class details available</td></tr>`;

  return `
    <div class="grade-sheet-print">
      <table class="grade-sheet-table">
        <colgroup>
          <col class="col-num" />
          <col class="col-sno" />
          <col class="col-name" />
          <col class="col-mid" />
          <col class="col-final" />
          <col class="col-fg" />
          <col class="col-re" />
          <col class="col-remarks" />
        </colgroup>
        <thead>
          <tr class="banner-row">
            <td colspan="8">${bannerHtml}</td>
          </tr>
          <tr class="col-head-row">
            <th rowspan="2" class="col-num">#</th>
            <th rowspan="2" class="col-sno">Student No.</th>
            <th rowspan="2" class="col-name">Student Name</th>
            <th colspan="5" class="grades-banner">G R A D E S</th>
          </tr>
          <tr class="col-head-row">
            <th class="col-mid">Mid</th>
            <th class="col-final">Final</th>
            <th class="col-fg">Final Grade</th>
            <th class="col-re">ReExam</th>
            <th class="col-remarks">Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${studentRows}
        </tbody>
        <tfoot>
          <tr class="footer-row">
            <td colspan="8">${footerInnerHtml}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
};

export const printGradingReportDocument = (html, title = "Grade Sheet") => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>${GRADING_REPORT_PRINT_CSS}</style>
      </head>
      <body>${html}</body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
      }, 1000);
    }
  }, 250);
};

export const mapStudentToGradingPrintRow = (
  student,
  { convertRawToRating, remarkConversion } = {},
) => {
  const formatGrade = (value) => {
    if (typeof convertRawToRating === "function") {
      const rating = convertRawToRating(value);
      return rating == null || rating === "" ? "" : rating;
    }
    return value ?? "";
  };

  const middle = String(student.middle_name || "").trim();
  const middlePart = middle
    ? ` ${middle.length === 1 ? `${middle}.` : middle}`
    : "";

  return {
    student_number: student.student_number,
    fullName: `${student.last_name || ""}, ${student.first_name || ""}${middlePart}`
      .replace(/\s+/g, " ")
      .trim(),
    mid: formatGrade(student.midterm),
    final: formatGrade(student.finals),
    finalGrade: formatGrade(student.final_grade),
    reExam: student.re_exam ?? student.reexam ?? "",
    remarks:
      typeof remarkConversion === "function"
        ? remarkConversion(student) || ""
        : student.remarks || "",
  };
};
