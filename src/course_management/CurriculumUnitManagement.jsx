import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  TextField,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import { Autocomplete } from "@mui/material";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const CurriculumUnitManagement = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);

  const colors = settings?.colors || {};
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#000000";
  const headerColor = colors.header || "#1976d2";
  const branches = settings?.branches || [];

  const [curriculumList, setCurriculumList] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [taggedPrograms, setTaggedPrograms] = useState([]);

  const [editedCourseReqs, setEditedCourseReqs] = useState({});

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [employeeID, setEmployeeID] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setUserRole(storedRole);
      setUserID(storedID);
      setEmployeeID(storedEmployeeID);

      if (["administrator", "superadmin", "technical"].includes(storedRole)) {
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
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
      );
      const allowed = response.data?.page_privilege === 1;
      setHasAccess(allowed);
      setCanEdit(allowed && Number(response.data?.can_edit) === 1);
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
      setCanEdit(false);
      if (error.response && error.response.data.message) {
        console.log(error.response.data.message);
      } else {
        console.log("An unexpected error occurred.");
      }
      setLoading(false);
    }
  };

  const pageId = 113;
  const getAuditConfig = () => ({
    headers: {
      ...getFlatAuditHeaders(),
      "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
      "x-page-id": pageId,
      "x-audit-actor-id":
        employeeID ||
        localStorage.getItem("employee_id") ||
        localStorage.getItem("email") ||
        "unknown",
      "x-audit-actor-role":
        userRole || localStorage.getItem("role") || "administrator",
    },
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  /* ===================== DATA ===================== */
  useEffect(() => {
    fetchCurriculum();
    fetchTaggedPrograms();
  }, []);

  const fetchCurriculum = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/get_active_curriculum`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
    setCurriculumList(res.data);
  };

  const fetchTaggedPrograms = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/program_tagging_list`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
    const unique = Array.from(
      new Map(res.data.map((item) => [item.program_tagging_id, item])).values(),
    );
    setTaggedPrograms(unique);
  };

  /* ===================== EDIT HANDLERS ===================== */
  const handleReqChange = (id, field, value) => {
    if (!canEdit) {
      setSnackbar({
        open: true,
        message: "You do not have permission to edit program units",
        severity: "error",
      });
      return;
    }
    setEditedCourseReqs((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value === "" ? null : Number(value),
      },
    }));
  };

  const handleSaveSemester = async (courses) => {
    if (!canEdit) {
      setSnackbar({
        open: true,
        message: "You do not have permission to edit program units",
        severity: "error",
      });
      return;
    }
    try {
      const updates = {};

      // group edits by course_id
      for (const c of courses) {
        const edited = editedCourseReqs[c.program_tagging_id];
        if (!edited) continue;

        updates[c.course_id] = {
          lec_unit:
            edited.lec_unit !== undefined ? edited.lec_unit : c.lec_unit,
          lab_unit:
            edited.lab_unit !== undefined ? edited.lab_unit : c.lab_unit,
          course_unit:
            edited.course_unit !== undefined
              ? edited.course_unit
              : c.course_unit,
        };
      }

      // save once per course
      for (const courseId of Object.keys(updates)) {
        await axios.put(
          `${API_BASE_URL}/api/update_course/${courseId}`,
          updates[courseId],
          getAuditConfig(),
        );
      }

      setEditedCourseReqs({});
      fetchTaggedPrograms();
      setSnackbar({
        open: true,
        message: "Saved successfully!",
        severity: "success",
      });
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "Save failed",
        severity: "error",
      });
    }
  };

  /* ===================== GROUP YEAR → SEM ===================== */
  const groupedData = () => {
    const result = {};

    taggedPrograms
      .filter((p) => p.curriculum_id == selectedCurriculum)
      .forEach((p) => {
        if (!result[p.year_level_description]) {
          result[p.year_level_description] = {};
        }
        if (!result[p.year_level_description][p.semester_description]) {
          result[p.year_level_description][p.semester_description] = [];
        }
        result[p.year_level_description][p.semester_description].push(p);
      });

    return result;
  };

  const data = groupedData();

  const selectedCurriculumName =
    curriculumList.find((c) => c.curriculum_id === selectedCurriculum)
      ?.program_description +
      (curriculumList.find((c) => c.curriculum_id === selectedCurriculum)?.major
        ? ` ${
            curriculumList.find((c) => c.curriculum_id === selectedCurriculum)
              ?.major
          }`
        : "") || "";

  const formatSchoolYear = (yearDesc) => {
    if (!yearDesc) return "";
    const startYear = Number(yearDesc);
    if (isNaN(startYear)) return yearDesc; // safe fallback
    return `${startYear} - ${startYear + 1}`;
  };

  const [filteredPrograms, setFilteredPrograms] = useState([]);

  const [selectedCampus, setSelectedCampus] = useState("");
  const [selectedAcademicProgram, setSelectedAcademicProgram] = useState("");

  const filteredCurriculumList = curriculumList
    .filter((item) => {
      if (selectedCampus !== "") {
        if (Number(item.components) !== Number(selectedCampus)) {
          return false;
        }
      }
      if (selectedAcademicProgram !== "") {
        if (Number(item.academic_program) !== Number(selectedAcademicProgram)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => Number(a.year_description) - Number(b.year_description)); // ← add this

  const [yearLevelList, setYearLevelList] = useState([]);
  const [semesterList, setSemesterList] = useState([]);

  useEffect(() => {
    fetchYearLevels();
    fetchSemesters();
  }, []);

  const fetchYearLevels = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/year-levels`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setYearLevelList(res.data);
    } catch (err) {
      console.error("Error fetching year levels:", err);
    }
  };

  const fetchSemesters = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/semesters`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setSemesterList(res.data);
    } catch (err) {
      console.error("Error fetching semesters:", err);
    }
  };

  const ordinalSuffix = (n) => {
    if (n % 100 >= 11 && n % 100 <= 13) return "th";
    switch (n % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  const yearOrder = yearLevelList.reduce((acc, yl) => {
    acc[yl.year_level_description] = yl.year_level_id;
    return acc;
  }, {});

  const semesterOrder = semesterList.reduce((acc, s) => {
    acc[s.semester_description] = s.semester_id;
    return acc;
  }, {});

  const yearLabelMap = yearLevelList.reduce((acc, yl) => {
    acc[yl.year_level_description] =
      yl.level_type === "year"
        ? `${yl.year_level_id}${ordinalSuffix(yl.year_level_id)} Year`
        : yl.year_level_description;
    return acc;
  }, {});

  const formatYearLabel = (year) => {
    return `${yearLabelMap[year] || year} - (${year})`;
  };

  const getPdfYearLabel = (year) => {
    const yearLevel = yearLevelList.find(
      (item) => item.year_level_description === year,
    );
    const yearWords = [
      "First",
      "Second",
      "Third",
      "Fourth",
      "Fifth",
      "Sixth",
    ];

    if (yearLevel?.level_type === "year") {
      return `${yearWords[Number(yearLevel.year_level_id) - 1] || yearLevel.year_level_id} Year`;
    }

    return year;
  };

  const getDisplayedUnit = (course, field) =>
    editedCourseReqs[course.program_tagging_id]?.[field] ??
    course[field] ??
    0;

  const formatPdfUnit = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  };

  const formatPdfPrerequisite = (value) =>
    value
      ? String(value)
          .split(/\s*,\s*/)
          .filter(Boolean)
          .join("\n")
      : "";

  const handleExportPdf = () => {
    const years = Object.keys(data).sort(
      (a, b) => (yearOrder[a] ?? Number.MAX_SAFE_INTEGER) -
        (yearOrder[b] ?? Number.MAX_SAFE_INTEGER),
    );

    if (!selectedCurriculum || years.length === 0) {
      setSnackbar({
        open: true,
        message: "Select a curriculum with courses before exporting.",
        severity: "warning",
      });
      return;
    }

    setIsExporting(true);

    try {
      const curriculum = curriculumList.find(
        (item) => item.curriculum_id == selectedCurriculum,
      );
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const gap = 14;
      const tableWidth = (pageWidth - margin * 2 - gap) / 2;
      const contentStartY = 22;
      const contentEndY = pageHeight - 7;

      const sections = years.flatMap((year) => {
        const semesters = Object.keys(data[year]).sort(
          (a, b) => (semesterOrder[a] ?? Number.MAX_SAFE_INTEGER) -
            (semesterOrder[b] ?? Number.MAX_SAFE_INTEGER),
        );

        const yearSections = [];
        for (let index = 0; index < semesters.length; index += 2) {
          yearSections.push({ year, semesters: semesters.slice(index, index + 2) });
        }
        return yearSections;
      });

      const tableRowCount = (courses) =>
        1 + Math.max(courses.length, 1) * 2 + 1;
      const totalTableRows = sections.reduce((sum, section) => {
        const largestTable = Math.max(
          ...section.semesters.map((semester) =>
            tableRowCount(data[section.year][semester]),
          ),
        );
        return sum + largestTable;
      }, 0);
      // Includes the year banner, semester labels, and a visible gap between years.
      const sectionHeadingHeight = 12.5;
      const availableTableHeight =
        contentEndY -
        contentStartY -
        sections.length * sectionHeadingHeight;
      const rowHeight = Math.max(
        0.6,
        Math.min(4.2, availableTableHeight / Math.max(totalTableRows, 1)),
      );
      const tableFontSize = Math.max(
        1,
        Math.min(5.5, (rowHeight - 0.1) / 0.405),
      );

      const schoolYear = formatSchoolYear(curriculum?.year_description);
      const programName = [
        curriculum?.program_code ? `(${curriculum.program_code})` : "",
        curriculum?.program_description || "",
        curriculum?.major ? `- ${curriculum.major}` : "",
      ]
        .filter(Boolean)
        .join(" ");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(programName || selectedCurriculumName, pageWidth / 2, 9, {
        align: "center",
        maxWidth: pageWidth - margin * 2,
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Curriculum ${schoolYear}`, pageWidth / 2, 14, {
        align: "center",
      });
      doc.setDrawColor(100);
      doc.line(margin, 17, pageWidth - margin, 17);

      const drawSemesterTable = ({
        semester,
        courses,
        targetRowCount,
        x,
        startY,
      }) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(Math.max(5, tableFontSize + 1));
        doc.text(semester, x + tableWidth / 2, startY, { align: "center" });

        const body = courses.length
          ? courses.map((course, index) => [
              index + 1,
              {
                content: "\n",
                courseCode: course.course_code || "-",
                courseDescription: course.course_description || "-",
              },
              formatPdfPrerequisite(course.prereq),
              formatPdfUnit(getDisplayedUnit(course, "lec_unit")),
              formatPdfUnit(getDisplayedUnit(course, "lab_unit")),
              formatPdfUnit(getDisplayedUnit(course, "course_unit")),
            ])
          : [[
              {
                content: "No courses assigned\n ",
                colSpan: 6,
                styles: { halign: "center", textColor: [100, 100, 100] },
              },
            ]];

        while (body.length < targetRowCount) {
          body.push(["", " \n ", "", "", "", ""]);
        }

        const total = (field) =>
          courses.reduce(
            (sum, course) => sum + Number(getDisplayedUnit(course, field) || 0),
            0,
          );

        const previousLineHeightFactor = doc.getLineHeightFactor();
        doc.setLineHeightFactor(0.78);
        autoTable(doc, {
          startY: startY + 1.5,
          margin: { left: x, right: pageWidth - x - tableWidth },
          tableWidth,
          head: [["#", "Course", "Prerequisite", "Lec", "Lab", "Unit"]],
          body,
          foot: [[
            { content: "TOTAL", colSpan: 3, styles: { halign: "center" } },
            total("lec_unit"),
            total("lab_unit"),
            total("course_unit"),
          ]],
          theme: "grid",
          styles: {
            font: "helvetica",
            fontSize: tableFontSize,
            cellPadding: {
              top: 0.05,
              right: 0.45,
              bottom: 0.05,
              left: 0.45,
            },
            minCellHeight: rowHeight,
            overflow: "ellipsize",
            valign: "middle",
            lineColor: [90, 90, 90],
            lineWidth: 0.15,
          },
          headStyles: {
            fillColor: headerColor,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center",
            lineColor: [0, 0, 0],
          },
          alternateRowStyles: {
            fillColor: [247, 249, 252],
          },
          footStyles: {
            fillColor: [238, 238, 238],
            textColor: [0, 0, 0],
            fontStyle: "bold",
            halign: "center",
          },
          columnStyles: {
            0: { cellWidth: 3.5, halign: "center" },
            1: {
              cellWidth: 53.5,
              overflow: "ellipsize",
              cellPadding: {
                top: (2 * 25.4) / 96,
                right: 0.45,
                bottom: (2 * 25.4) / 96,
                left: 0.45,
              },
            },
            2: { cellWidth: 14 },
            3: { cellWidth: 5, halign: "center" },
            4: { cellWidth: 5, halign: "center" },
            5: { cellWidth: 7, halign: "center" },
          },
          didDrawCell: (hookData) => {
            if (
              hookData.section !== "body" ||
              hookData.column.index !== 1 ||
              !hookData.cell.raw?.courseCode
            ) {
              return;
            }

            const { cell } = hookData;
            const horizontalPadding = 0.45;
            const verticalPadding = (2 * 25.4) / 96;
            const availableWidth = cell.width - horizontalPadding * 2;
            const availableHeight = cell.height - verticalPadding * 2;
            const scaleFactor = doc.internal.scaleFactor;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(tableFontSize);

            const wrappedDescriptionLines = doc.splitTextToSize(
              String(hookData.cell.raw.courseDescription),
              availableWidth,
            );
            const hasTwoDescriptionLines =
              wrappedDescriptionLines.length > 1;
            const codeFontSize = hasTwoDescriptionLines
              ? Math.max(2.5, tableFontSize - 1.5)
              : tableFontSize;
            const descriptionFontSize = hasTwoDescriptionLines
              ? Math.max(2.8, tableFontSize - 0.5)
              : tableFontSize;
            const descriptionLines = wrappedDescriptionLines.slice(0, 2);
            const unscaledTextHeight =
              (codeFontSize +
                descriptionFontSize * descriptionLines.length) /
              scaleFactor;
            const compactLineFactor = Math.min(
              0.9,
              availableHeight / Math.max(unscaledTextHeight, 0.1),
            );

            if (wrappedDescriptionLines.length > 2) {
              let finalLine = descriptionLines[1] || "";
              doc.setFontSize(descriptionFontSize);
              while (
                finalLine.length > 0 &&
                doc.getTextWidth(`${finalLine}...`) > availableWidth
              ) {
                finalLine = finalLine.slice(0, -1);
              }
              descriptionLines[1] = `${finalLine.trim()}...`;
            }

            const x = cell.x + horizontalPadding;
            let y =
              cell.y +
              verticalPadding +
              (codeFontSize / scaleFactor) * compactLineFactor;

            doc.setTextColor(45, 55, 65);
            doc.setFontSize(codeFontSize);
            doc.text(String(hookData.cell.raw.courseCode), x, y, {
              maxWidth: availableWidth,
            });

            doc.setFontSize(descriptionFontSize);
            descriptionLines.forEach((line) => {
              y +=
                (descriptionFontSize / scaleFactor) * compactLineFactor;
              doc.text(line, x, y, { maxWidth: availableWidth });
            });
          },
          pageBreak: "avoid",
          rowPageBreak: "avoid",
        });
        doc.setLineHeightFactor(previousLineHeightFactor);

        return doc.lastAutoTable.finalY;
      };

      let currentY = contentStartY;
      sections.forEach((section, sectionIndex) => {
        doc.setFillColor(238, 242, 247);
        doc.setDrawColor(190, 198, 208);
        doc.roundedRect(
          margin,
          currentY - 3.4,
          pageWidth - margin * 2,
          5,
          0.7,
          0.7,
          "FD",
        );
        doc.setFont("helvetica", "bold");
        doc.setFontSize(Math.max(6, tableFontSize + 2));
        const repeatedYear =
          sectionIndex > 0 && sections[sectionIndex - 1].year === section.year;
        doc.text(
          `${getPdfYearLabel(section.year)}${repeatedYear ? " (continued)" : ""}`,
          pageWidth / 2,
          currentY,
          { align: "center" },
        );

        const semesterTitleY = currentY + 5;
        const targetRowCount = Math.max(
          1,
          ...section.semesters.map(
            (semester) => data[section.year][semester].length,
          ),
        );
        const tableEnds = section.semesters.map((semester, semesterIndex) =>
          drawSemesterTable({
            semester,
            courses: data[section.year][semester],
            targetRowCount,
            x: margin + semesterIndex * (tableWidth + gap),
            startY: semesterTitleY,
          }),
        );
        // Keep the next year banner visually separate from the previous totals row.
        currentY = Math.max(...tableEnds) + 6;
      });

      while (doc.getNumberOfPages() > 1) {
        doc.deletePage(doc.getNumberOfPages());
      }

      const safeProgramCode = (curriculum?.program_code || "curriculum")
        .toString()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
      doc.save(`${safeProgramCode}-program-units.pdf`);
      setSnackbar({
        open: true,
        message: "PDF exported successfully.",
        severity: "success",
      });
    } catch (error) {
      console.error("Error exporting program units PDF:", error);
      setSnackbar({
        open: true,
        message: "Failed to export PDF.",
        severity: "error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }

  const headerStyle = {
    backgroundColor: headerColor,
    color: "#fff",
    border: `1px solid ${borderColor}`,
    padding: "8px",
    textAlign: "center",
  };

  const cellStyle = {
    border: `1px solid ${borderColor}`,
    padding: "8px",
    textAlign: "center",
  };

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
        paddingRight: 1,
        backgroundColor: "transparent",
        mt: 1,
        p: 2,
      }}
    >
      {/* HEADER */}
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
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: "36px",
          }}
        >
          PROGRAM UNITS
        </Typography>
        <Button
          variant="contained"
          color="error"
          startIcon={<PictureAsPdfIcon />}
          onClick={handleExportPdf}
          disabled={!selectedCurriculum || Object.keys(data).length === 0 || isExporting}
          sx={{ fontWeight: "bold" }}
        >
          {isExporting ? "Exporting..." : "Export PDF"}
        </Button>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      <Typography fontWeight={500}>Select Campus:</Typography>
      <FormControl sx={{ minWidth: 300, mb: 3 }}>
        <InputLabel>Campus</InputLabel>
        <Select
          value={selectedCampus}
          label="Campus"
          onChange={(e) => {
            setSelectedCampus(e.target.value);
            setSelectedAcademicProgram("");
            setSelectedCurriculum("");
          }}
        >
          <MenuItem value="">
            <em>Choose Campus</em>
          </MenuItem>
          {branches.map((branch) => (
            <MenuItem key={branch.id} value={branch.id}>
              {branch.branch}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography fontWeight={500}>Academic Program:</Typography>
      <FormControl sx={{ minWidth: 300, mb: 3 }}>
        <InputLabel>Academic Program</InputLabel>
        <Select
          value={selectedAcademicProgram}
          label="Academic Program"
          onChange={(e) => {
            setSelectedAcademicProgram(e.target.value);
            setSelectedCurriculum("");
          }}
          disabled={!selectedCampus}
        >
          <MenuItem value="">
            <em>Select Program</em>
          </MenuItem>
          <MenuItem value="0">Undergraduate</MenuItem>
          <MenuItem value="1">Graduate</MenuItem>
          <MenuItem value="2">Techvoc</MenuItem>
        </Select>
      </FormControl>

      <Typography fontWeight={500}>Search Curriculum:</Typography>

      <Autocomplete
        options={filteredCurriculumList}
        getOptionLabel={(option) => {
          const startYear = Number(option.year_description);
          const yearRange = !isNaN(startYear)
            ? `${startYear} - ${startYear + 1}`
            : option.year_description || "";
          return `${yearRange} - (${option.program_code}) ${option.program_description}${option.major ? ` (${option.major})` : ""}`;
        }}
        value={
          filteredCurriculumList.find(
            (item) => item.curriculum_id === selectedCurriculum,
          ) || null
        }
        onChange={(event, newValue) => {
          setSelectedCurriculum(newValue?.curriculum_id || "");
        }}
        filterOptions={(options, { inputValue }) => {
          const search = inputValue.toLowerCase();

          return options.filter(
            (option) =>
              option.program_code?.toLowerCase().includes(search) ||
              option.program_description?.toLowerCase().includes(search) ||
              option.major?.toLowerCase().includes(search) ||
              option.year_description?.toString().includes(search),
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search Curriculum"
            placeholder="Search program, major, year..."
          />
        )}
        sx={{ maxWidth: 700, mb: 4 }}
      />

      {/* YEARS */}
      {selectedCurriculum &&
        Object.keys(data)
          .sort((a, b) => yearOrder[a] - yearOrder[b])
          .map((year) => (
            <Box
              key={year}
              sx={{
                mb: 6,
                border: `1px solid ${borderColor}`,
                borderRadius: 2,
                p: 2,
                backgroundColor: "#fafafa",
              }}
            >
              {/* CURRICULUM HEADER */}
              <Typography
                variant="h4"
                sx={{
                  fontWeight: "bold",
                  color: "#fff",
                  textAlign: "center",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  backgroundColor: headerColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 1,
                  p: 1,
                  mb: 3,
                }}
              >
                {formatSchoolYear(
                  curriculumList.find(
                    (c) => c.curriculum_id === selectedCurriculum,
                  )?.year_description,
                )}{" "}
                : {selectedCurriculumName}
              </Typography>

              {/* SEMESTERS */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 3,
                }}
              >
                {Object.keys(data[year])
                  .sort((a, b) => semesterOrder[a] - semesterOrder[b])
                  .map((sem) => {
                    const courses = data[year][sem];

                    return (
                      <Box
                        key={sem}
                        sx={{
                          border: `1px solid ${borderColor}`,
                          borderRadius: 1,
                          p: 2,
                          mb: 6,
                          minHeight: 300,
                          position: "relative",
                          backgroundColor: "#fff",
                        }}
                      >
                        <Box sx={{ position: "relative", pb: 7 }}>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                            }}
                          >
                            <thead>
                              {/* YEAR + SEM */}
                              <tr>
                                <th
                                  colSpan={4}
                                  style={{
                                    backgroundColor: "#f5f5f5",
                                    borderLeft: `1px solid ${borderColor}`,
                                    borderTop: `1px solid ${borderColor}`,
                                    borderBottom: `1px solid ${borderColor}`,
                                    padding: "10px",
                                    fontWeight: "bold",
                                    textAlign: "left",
                                    fontSize: "21px",
                                    color: titleColor,
                                  }}
                                >
                                  {formatYearLabel(year)}
                                </th>

                                <th
                                  colSpan={4}
                                  style={{
                                    backgroundColor: "#f5f5f5",
                                    borderRight: `1px solid ${borderColor}`,
                                    borderTop: `1px solid ${borderColor}`,
                                    borderBottom: `1px solid ${borderColor}`,
                                    padding: "10px",
                                    fontWeight: "bold",
                                    textAlign: "right",
                                    fontSize: "21px",
                                    color: titleColor,
                                  }}
                                >
                                  {sem}
                                </th>
                              </tr>

                              <tr>
                                <th style={headerStyle}>#</th>
                                <th style={headerStyle}>COURSE CODE</th>
                                <th style={headerStyle}>COURSE DESCRIPTION</th>
                                <th style={headerStyle}>PREREQUISITE</th>
                                <th style={headerStyle}>LEC</th>
                                <th style={headerStyle}>LAB</th>
                                <th style={headerStyle}>CREDIT</th>
                                <th style={headerStyle}>TUITION</th>
                              </tr>
                            </thead>

                            <tbody>
                              {courses.map((c, index) => (
                                <tr
                                  key={c.program_tagging_id}
                                  style={{
                                    backgroundColor:
                                      index % 2 === 0 ? "#ffffff" : "lightgray",
                                  }}
                                >
                                  <td style={cellStyle}>{index + 1}</td>
                                  <td style={cellStyle}>{c.course_code}</td>
                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                    }}
                                  >
                                    {c.course_description}
                                  </td>
                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                    }}
                                  >
                                    {c.prereq}
                                  </td>

                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                    }}
                                  >
                                    <input
                                      type="number"
                                      readOnly={!canEdit}
                                      value={
                                        editedCourseReqs[c.program_tagging_id]
                                          ?.lec_unit ??
                                        c.lec_unit ??
                                        0
                                      }
                                      onChange={(e) =>
                                        handleReqChange(
                                          c.program_tagging_id,
                                          "lec_unit",
                                          e.target.value,
                                        )
                                      }
                                      style={{
                                        width: "90px",
                                        padding: "6px",
                                        border: "1px solid #ccc",
                                        borderRadius: 4,
                                        textAlign: "right",
                                      }}
                                    />
                                  </td>

                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                    }}
                                  >
                                    <input
                                      type="number"
                                      readOnly={!canEdit}
                                      value={
                                        editedCourseReqs[c.program_tagging_id]
                                          ?.lab_unit ??
                                        c.lab_unit ??
                                        0
                                      }
                                      onChange={(e) =>
                                        handleReqChange(
                                          c.program_tagging_id,
                                          "lab_unit",
                                          e.target.value,
                                        )
                                      }
                                      style={{
                                        width: "90px",
                                        padding: "6px",
                                        border: "1px solid #ccc",
                                        borderRadius: 4,
                                        textAlign: "right",
                                      }}
                                    />
                                  </td>

                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                    }}
                                  >
                                    <input
                                      type="number"
                                      readOnly={!canEdit}
                                      value={
                                        editedCourseReqs[c.program_tagging_id]
                                          ?.course_unit ??
                                        c.course_unit ??
                                        0
                                      }
                                      onChange={(e) =>
                                        handleReqChange(
                                          c.program_tagging_id,
                                          "course_unit",
                                          e.target.value,
                                        )
                                      }
                                      style={{
                                        width: "90px",
                                        padding: "6px",
                                        border: "1px solid #ccc",
                                        borderRadius: 4,
                                        textAlign: "right",
                                      }}
                                    />
                                  </td>

                                  <td
                                    style={{
                                      ...cellStyle,
                                      textAlign: "center",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {c.course_unit ?? 0}
                                  </td>
                                </tr>
                              ))}

                              {/* TOTAL */}
                              <tr
                                style={{
                                  fontWeight: "bold",
                                  backgroundColor: "#f0f0f0",
                                }}
                              >
                                <td colSpan={4} style={cellStyle}>
                                  TOTAL
                                </td>
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  {courses.reduce(
                                    (sum, c) =>
                                      sum +
                                      Number(
                                        editedCourseReqs[c.program_tagging_id]
                                          ?.lec_unit ??
                                          c.lec_unit ??
                                          0,
                                      ),
                                    0,
                                  )}
                                </td>
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  {courses.reduce(
                                    (sum, c) =>
                                      sum +
                                      Number(
                                        editedCourseReqs[c.program_tagging_id]
                                          ?.lab_unit ??
                                          c.lab_unit ??
                                          0,
                                      ),
                                    0,
                                  )}
                                </td>
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  {courses.reduce(
                                    (sum, c) =>
                                      sum +
                                      Number(
                                        editedCourseReqs[c.program_tagging_id]
                                          ?.course_unit ??
                                          c.course_unit ??
                                          0,
                                      ),
                                    0,
                                  )}
                                </td>
                                <td
                                  style={{ ...cellStyle, textAlign: "center" }}
                                >
                                  {courses.reduce(
                                    (sum, c) =>
                                      sum +
                                      Number(
                                        editedCourseReqs[c.program_tagging_id]
                                          ?.course_unit ??
                                          c.course_unit ??
                                          0,
                                      ),
                                    0,
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </Box>

                        {/* SAVE BUTTON */}
                        {canEdit && (
                          <button
                            onClick={() => handleSaveSemester(courses)}
                            style={{
                              marginTop: 10,
                              padding: "6px 14px",
                              background: "#1976d2",
                              color: "#fff",
                              border: "none",
                              borderRadius: 5,
                              cursor: "pointer",
                              float: "right",
                            }}
                          >
                            Save
                          </button>
                        )}
                      </Box>
                    );
                  })}
              </Box>
            </Box>
          ))}

      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CurriculumUnitManagement;
