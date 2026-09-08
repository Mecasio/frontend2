/**
 * Shared print layout for Class List documents (see EXAMPLES/ClassList.pdf).
 */

export const formatGenderShort = (gender) => {
  if (gender === 0 || gender === "0" || String(gender).toLowerCase() === "male") {
    return "M";
  }
  if (gender === 1 || gender === "1" || String(gender).toLowerCase() === "female") {
    return "F";
  }
  return "";
};

export const splitCompanyNameLines = (name = "") => {
  const trimmed = String(name).trim();
  if (!trimmed) return { firstLine: "", secondLine: "" };
  // Prefer keeping the school name on one bold line like the official PDF.
  if (trimmed.length <= 70) {
    return { firstLine: trimmed.toUpperCase(), secondLine: "" };
  }
  const words = trimmed.split(/\s+/);
  const middleIndex = Math.ceil(words.length / 2);
  return {
    firstLine: words.slice(0, middleIndex).join(" ").toUpperCase(),
    secondLine: words.slice(middleIndex).join(" ").toUpperCase(),
  };
};

export const countStudentsByGender = (students = []) =>
  students.reduce(
    (acc, student) => {
      const g = formatGenderShort(student.gender);
      if (g === "M") acc.male += 1;
      else if (g === "F") acc.female += 1;
      return acc;
    },
    { male: 0, female: 0 },
  );

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Embed logo as data URL so PDF (Puppeteer) and print windows can render it. */
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

export const CLASS_LIST_PRINT_CSS = `
  @page { size: A4 portrait; margin: 0.45in 0.5in 0.55in; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    background: #fff;
  }
  .class-list-print {
    width: 100%;
    font-size: 11px;
  }

  /* ── Header with logo ── */
  .header-wrap {
    position: relative;
    text-align: center;
    margin-bottom: 6px;
    min-height: 78px;
  }
  .header-logo {
    position: absolute;
    left: 0;
    top: 0;
    width: 72px;
    height: 72px;
    object-fit: contain;
  }
  .school-header .republic {
    font-size: 12px;
    margin-top: 2px;
  }
  .school-header .school-name {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.3px;
    line-height: 1.2;
    text-transform: uppercase;
  }
  .school-header .address {
    font-size: 12px;
  }
  .course-title {
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.3px;
    margin-top: 10px;
    text-transform: uppercase;
  }
  .department-title {
    text-align: center;
    font-size: 12px;
    margin-top: 2px;
    font-weight: 600;
  }
  .official-title {
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.3px;
    margin: 10px 0 2px;
    text-transform: uppercase;
  }
  .academic-year-line {
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.3px;
    margin-bottom: 8px;
  }

  /* ── Class details: exact EXAMPLES/ClassList.pdf grid ── */
  .info-box {
    width: 100%;
    margin-bottom: 6px;
  }
  .info-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 11px;
    line-height: 1.25;
    border: 1px solid #000;
  }
  .info-table > tbody > tr > td {
    border: 1px solid #000;
    padding: 0 6px;
    vertical-align: bottom;
    font-size: 11px;
    font-weight: 400;
  }
  .info-table strong {
    font-weight: 600;
  }
  .info-table .lbl {
    width: 120px;
    white-space: nowrap;
    font-weight: 400;
    font-size: 11px;
  }
  /* Open middle: no border between value and right-side label */
  .info-table .lbl-row1 {
    white-space: nowrap;
  }
  .info-table .val-open-right {
    border-right: none !important;
    font-weight: 600;
  }
  .info-table .program-desc-val {
    white-space: nowrap;
    font-size: 10px;
    letter-spacing: -0.2px;
  }
  .info-table .lbl-open-left {
    white-space: nowrap;
    text-align: right;
    border-left: none !important;
  }
  .info-table .val {
    font-weight: 600;
    font-size: 11px;
  }
  .info-table .section-val {
    white-space: nowrap;
    font-weight: 600;
  }
  .info-table .unit-num {
    width: 36px;
    text-align: center;
    padding-left: 2px;
    padding-right: 2px;
    white-space: nowrap;
    font-weight: 600;
  }
  .info-table .lab-lbl {
    white-space: nowrap;
  }
  .info-table .sched-lbl {
    white-space: nowrap;
    text-align: right;
    vertical-align: middle;
    font-size: 11px;
  }
  /* Schedule values: open column (no internal top/bottom borders) */
  .info-table .sched-val {
    white-space: nowrap;
    vertical-align: top;
    border-top: none !important;
    border-bottom: none !important;
    font-weight: 600;
  }
  .info-table .sched-val-first {
    border-top: 1px solid #000 !important;
  }
  .info-table .sched-val-last {
    border-bottom: 1px solid #000 !important;
  }

  /* ── Students sheet (one full page block; header copied per page) ── */
  .print-page {
    width: 100%;
    min-height: calc(297mm - 0.45in - 0.55in);
    display: flex;
    flex-direction: column;
    page-break-after: always;
    break-after: page;
  }
  .print-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .class-list-sheet {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 11px;
  }
  .class-list-sheet > thead > tr.col-head-row > th {
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
    border-left: none;
    border-right: none;
    padding: 0 6px;
    font-weight: 600;
    text-align: left;
    font-size: 11px;
    background: #fff;
  }
  .class-list-sheet > thead > tr.col-head-row > th:first-child {
    border-left: 1px solid #000;
    padding-left: 10px;
  }
  .class-list-sheet > thead > tr.col-head-row > th:last-child {
    border-right: 1px solid #000;
    padding-right: 10px;
  }
  .class-list-sheet > thead > tr.col-head-row > th.center {
    text-align: center;
  }
  .class-list-sheet > tbody > tr.student-row > td {
    border: none;
    padding: 3px 3px;
    vertical-align: middle;
  }
  .class-list-sheet td.name-cell {
    text-align: left;
    text-transform: uppercase;
  }
  .class-list-sheet td.center-cell {
    text-align: center;
  }
  .class-list-sheet td.encoded-cell {
    text-align: center;
    text-transform: uppercase;
  }
  .class-list-sheet th.col-sno,
  .class-list-sheet th.col-age,
  .class-list-sheet th.col-gender,
  .class-list-sheet th.col-year,
  .class-list-sheet th.col-or,
  .class-list-sheet th.col-encoded,
  .class-list-sheet td.col-sno,
  .class-list-sheet td.col-age,
  .class-list-sheet td.col-gender,
  .class-list-sheet td.col-year,
  .class-list-sheet td.col-or,
  .class-list-sheet td.col-encoded {
    text-align: center;
  }
  .col-num { width: 28px; }
  .col-sno { width: 90px; }
  .col-age { width: 40px; }
  .col-gender { width: 52px; }
  .col-year { width: 90px; }
  .col-or { width: 70px; }
  .col-encoded { width: 90px; }

  /* ── Totals (last page only) ── */
  .page-bottom {
    margin-top: auto;
  }
  .totals-block {
    margin: 0 0 calc(1rem - 10px);
    font-size: 10px;
    font-weight: 600;
    line-height: 1.55;
  }

  /* ── In-document footer (PDF uses Puppeteer footer instead) ── */
  .print-footer {
    margin-top: 0;
    border-top: 1px solid #000;
    padding-top: 4px;
    font-size: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .print-footer .footer-center {
    text-align: center;
    flex: 1;
  }
  .print-footer .footer-right {
    white-space: nowrap;
  }
  .pdf-hide-doc-footer .print-footer {
    display: none !important;
  }
`;

/** Rows that fit under the repeating letterhead + details block on A4. */
export const CLASS_LIST_ROWS_PER_PAGE = 38;

/**
 * Build Class List print HTML matching EXAMPLES/ClassList.pdf.
 * Header is duplicated on every page (Chromium does not reliably repeat
 * complex <thead> content when printing to PDF).
 */
export const buildClassListPrintHtml = ({
  companyName = "",
  campusAddress = "Nagtahan Sampaloc Manila",
  logoUrl = "",
  courseTitle = "",
  departmentTitle = "",
  academicYearLabel = "",
  semesterLabel = "",
  programCode = "",
  classSection = "",
  programDescription = "",
  yearLevel = "",
  departmentName = "",
  facultyName = "",
  students = [],
  showTotals = true,
  printInfoLeft = "",
  printInfoCenter = "",
  rowsPerPage = CLASS_LIST_ROWS_PER_PAGE,
}) => {
  const { firstLine, secondLine } = splitCompanyNameLines(companyName);
  const { male, female } = countStudentsByGender(students);
  const totalStudents = students.length;

  const footerCenter =
    printInfoCenter ||
    [programCode, programDescription].filter(Boolean).join(" - ");

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

    <div class="course-title">${escapeHtml(courseTitle)}</div>
    <div class="department-title">${escapeHtml(departmentTitle)}</div>

    <div class="official-title">OFFICIAL LIST OF ENROLLED STUDENTS</div>
    <div class="academic-year-line">
      Academic Year ${escapeHtml(academicYearLabel)}${
        semesterLabel ? ` ${escapeHtml(semesterLabel)}` : ""
      }
    </div>

    <div class="info-box">
      <table class="info-table">
        <colgroup>
          <col style="width:18%" />
          <col style="width:14%" />
          <col style="width:14%" />
          <col style="width:14%" />
          <col style="width:14%" />
          <col style="width:26%" />
        </colgroup>
        <tbody>
          <tr>
            <td class="lbl-row1">Program Code</td>
            <td class="val-open-right" colspan="3">${escapeHtml(programCode)}</td>
            <td class="lbl-open-left">Class Section</td>
            <td class="section-val">${escapeHtml(classSection)}</td>
          </tr>
          <tr>
            <td class="lbl">Program Description</td>
            <td class="val-open-right program-desc-val" colspan="3">${escapeHtml(programDescription)}</td>
            <td class="lbl-open-left">Year Level</td>
            <td class="section-val">${escapeHtml(yearLevel)}</td>
          </tr>
          <tr>
            <td class="lbl">Department</td>
            <td class="val" colspan="5">${escapeHtml(departmentName) || "&nbsp;"}</td>
          </tr>
          <tr>
            <td class="lbl">Faculty</td>
            <td class="val" colspan="5">${escapeHtml(facultyName) || "&nbsp;"}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  const renderStudentRow = (student, index) => `
    <tr class="student-row">
      <td class="center-cell col-num">${index + 1}</td>
      <td class="center-cell col-sno">${escapeHtml(student.student_number)}</td>
      <td class="name-cell">${escapeHtml(
        String(student.fullName || "").toUpperCase(),
      )}</td>
      <td class="center-cell col-age">${escapeHtml(student.age ?? "")}</td>
      <td class="center-cell col-gender">${escapeHtml(
        formatGenderShort(student.gender),
      )}</td>
      <td class="center-cell col-year">${escapeHtml(student.yearLevel ?? "")}</td>
      <td class="center-cell col-or">${escapeHtml(student.orNo ?? "")}</td>
      <td class="encoded-cell col-encoded">${escapeHtml(
        String(student.encodedBy || "").toUpperCase(),
      )}</td>
    </tr>`;

  const chunkSize = Math.max(1, Number(rowsPerPage) || CLASS_LIST_ROWS_PER_PAGE);
  const pages =
    students.length === 0
      ? [[]]
      : Array.from(
          { length: Math.ceil(students.length / chunkSize) },
          (_, pageIndex) =>
            students.slice(pageIndex * chunkSize, (pageIndex + 1) * chunkSize),
        );

  const pagesHtml = pages
    .map((pageStudents, pageIndex) => {
      const isLastPage = pageIndex === pages.length - 1;
      const startIndex = pageIndex * chunkSize;
      const rowsHtml =
        pageStudents.length > 0
          ? pageStudents
              .map((student, i) => renderStudentRow(student, startIndex + i))
              .join("")
          : `<tr class="student-row"><td colspan="8" class="center-cell">No students found.</td></tr>`;

      const totalsHtml =
        showTotals && isLastPage
          ? `
        <div class="totals-block">
          <div>TOTAL NUMBER OF MALE: ${male}</div>
          <div>TOTAL NUMBER OF FEMALE: ${female}</div>
          <div>TOTAL NUMBER OF STUDENTS: ${totalStudents}</div>
        </div>`
          : "";

      return `
      <div class="print-page">
        ${bannerHtml}
        <table class="class-list-sheet">
          <colgroup>
            <col class="col-num" />
            <col class="col-sno" />
            <col />
            <col class="col-age" />
            <col class="col-gender" />
            <col class="col-year" />
            <col class="col-or" />
            <col class="col-encoded" />
          </colgroup>
          <thead>
            <tr class="col-head-row">
              <th class="center col-num">#</th>
              <th class="center col-sno">Student No.</th>
              <th>Full Name</th>
              <th class="center col-age">Age</th>
              <th class="center col-gender">Gender</th>
              <th class="center col-year">Year Level</th>
              <th class="center col-or">OR No.</th>
              <th class="center col-encoded">Encoded By</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="page-bottom">
          ${totalsHtml}
          <div class="print-footer">
            <span>Print Info: ${escapeHtml(printInfoLeft || "")}</span>
            <span class="footer-center">${escapeHtml(footerCenter)}</span>
            <span class="footer-right">Page ${pageIndex + 1} of ${pages.length}</span>
          </div>
        </div>
      </div>`;
    })
    .join("");

  return `
    <div class="class-list-print">
      ${pagesHtml}
    </div>
  `;
};

export const buildRegistrarClassListPrintHtml = ({
  companyName = "",
  campusAddress = "Nagtahan Sampaloc Manila",
  logoUrl = "",
  departmentTitle = "",
  programCode = "",
  programDescription = "",
  classSection = "All Sections",
  facultyName = "",
  academicYearLabel = "",
  semesterLabel = "",
  yearLevel = "All Year Levels",
  students = [],
  printInfoLabel = "",
}) =>
  buildClassListPrintHtml({
    companyName,
    campusAddress,
    logoUrl,
    courseTitle: programDescription || "CLASS LIST",
    departmentTitle,
    academicYearLabel,
    semesterLabel,
    programCode: programCode || "All Programs",
    classSection: classSection || "All Sections",
    programDescription: programDescription || "All Programs",
    yearLevel,
    departmentName: departmentTitle || "All Departments",
    facultyName,
    students,
    showTotals: true,
    printInfoLeft: printInfoLabel,
    printInfoCenter: programDescription || "Class List",
  });

export const printClassListDocument = (html, title = "Print") => {
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
        <style>${CLASS_LIST_PRINT_CSS}</style>
      </head>
      <body>${html}</body>
    </html>
  `);
  doc.close();

  // Give the browser a moment to layout repeating thead/tfoot before print.
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

export const mapStudentToPrintRow = (student) => {
  const middle = String(student.middle_name || "").trim();
  const middlePart = middle
    ? ` ${middle.length === 1 ? `${middle}.` : middle}`
    : "";
  return {
    student_number: student.student_number,
    fullName: `${student.last_name || ""}, ${student.first_name || ""}${middlePart}`.trim(),
    age: student.age ?? "",
    gender: student.gender,
    yearLevel: student.year_level_description ?? "",
    orNo: student.or_no ?? student.or_number ?? "",
    encodedBy: student.encoded_by ?? student.encodedBy ?? "",
  };
};
