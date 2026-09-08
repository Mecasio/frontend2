import React, { useContext, useEffect, useState } from "react";
import {
    Box,
    Typography,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    Paper,
    Select,
    MenuItem,
    Button,
    TableBody,
    TextField,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import { SettingsContext } from "../App";
import API_BASE_URL from "../apiConfig";
import axios from "axios";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import EaristLogo from "../assets/EaristLogo.png";

const SlotMonitoring = () => {
    const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
    const pageId = 123;

    const [borderColor, setBorderColor] = useState("#000000");
    const [titleColor, setTitleColor] = useState("#6D2323");
    const [fetchedLogo, setFetchedLogo] = useState(EaristLogo);
    const [loading, setLoading] = useState(false);
    const [hasAccess, setHasAccess] = useState(null);
    const [employeeID, setEmployeeID] = useState("");

    const [schoolYears, setSchoolYears] = useState([]);
    const [semesters, setSchoolSemester] = useState([]);
    const [selectedSchoolYear, setSelectedSchoolYear] = useState('');
    const [selectedSchoolSemester, setSelectedSchoolSemester] = useState('');
    const [selectedActiveSchoolYear, setSelectedActiveSchoolYear] = useState('');
    const [department, setDepartment] = useState([]);
    const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState("");
    const [programs, setPrograms] = useState([]);
    const [selectedProgram, setSelectedProgram] = useState("");
    const [yearLevels, setYearLevels] = useState([]);
    const [selectedYearLevel, setSelectedYearLevel] = useState("");
    const [campusFilter, setCampusFilter] = useState("");
    const [branches, setBranches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [slotRows, setSlotRows] = useState([]);
    const [sectionOptionRows, setSectionOptionRows] = useState([]);
    const [selectedSectionFilter, setSelectedSectionFilter] = useState("");
    const [subjectsModalOpen, setSubjectsModalOpen] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success",
    });

    useEffect(() => {
        if (!settings) return;
        if (colors.border) setBorderColor(colors.border);
        if (colors.title) setTitleColor(colors.title);
        if (assets.logoUrl) {
            setFetchedLogo(assets.logoUrl);
        } else {
            setFetchedLogo(EaristLogo);
        }
        const branchList = settings.branches || [];
        setBranches(branchList);
        if (branchList.length > 0) {
            setCampusFilter((prev) => prev || String(branchList[0].id));
        }
    }, [settings]);

    useEffect(() => {
        const storedUser = localStorage.getItem("email");
        const storedRole = localStorage.getItem("role");
        const storedID = localStorage.getItem("person_id");
        const storedEmployeeID = localStorage.getItem("employee_id");

        if (storedUser && storedRole && storedID && storedEmployeeID) {
            setEmployeeID(storedEmployeeID);
            checkAccess(storedEmployeeID);
        } else {
            window.location.href = "/login";
        }
    }, []);

    const checkAccess = async (employeeIDValue) => {
        setLoading(true);
        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/page_access/${employeeIDValue}/${pageId}`,
            );
            if (response.data && response.data.page_privilege === 1) {
                setHasAccess(true);
            } else {
                setHasAccess(false);
            }
        } catch (error) {
            console.error("Error checking access:", error);
            setHasAccess(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (hasAccess !== true) return;
        axios
            .get(`${API_BASE_URL}/api/get_school_year/`)
            .then((res) => setSchoolYears(res.data))
            .catch((err) => console.error(err));
    }, [hasAccess])

    useEffect(() => {
        if (hasAccess !== true) return;
        axios
            .get(`${API_BASE_URL}/api/get_school_semester/`)
            .then((res) => setSchoolSemester(res.data))
            .catch((err) => console.error(err));
    }, [hasAccess])

    useEffect(() => {
        if (hasAccess !== true) return;
        axios
            .get(`${API_BASE_URL}/api/get_year_level`)
            .then((res) => setYearLevels(res.data))
            .catch((err) => console.error(err));
    }, [hasAccess]);

    useEffect(() => {
        if (hasAccess !== true) return;
        axios
            .get(`${API_BASE_URL}/api/active_school_year`)
            .then((res) => {
                if (res.data.length > 0) {
                    setSelectedSchoolYear(res.data[0].year_id);
                    setSelectedSchoolSemester(res.data[0].semester_id);
                }
            })
            .catch((err) => console.error(err));
    }, [hasAccess]);

    useEffect(() => {
        if (selectedSchoolYear && selectedSchoolSemester) {
            axios
                .get(`${API_BASE_URL}/api/get_selecterd_year/${selectedSchoolYear}/${selectedSchoolSemester}`)
                .then((res) => {
                    if (res.data.length > 0) {
                        setSelectedActiveSchoolYear(res.data[0].school_year_id);
                    }
                })
                .catch((err) => console.error(err));
        }
    }, [selectedSchoolYear, selectedSchoolSemester]);

    useEffect(() => {
        if (hasAccess !== true) return;
        fetchDepartments();
    }, [hasAccess]);

    useEffect(() => {
        if (department.length > 0 && !selectedDepartmentFilter) {
            const firstDeptId = department[0].dprtmnt_id;
            setSelectedDepartmentFilter(firstDeptId);
            fetchPrograms(firstDeptId);
        }
    }, [department, selectedDepartmentFilter]);

    useEffect(() => {
        if (programs.length > 0 && !selectedProgram) {
            setSelectedProgram(programs[0].program_id);
        }
    }, [programs, selectedProgram, selectedDepartmentFilter]);

    useEffect(() => {
        if (yearLevels.length > 0 && !selectedYearLevel) {
            setSelectedYearLevel(yearLevels[0].year_level_id);
        }
    }, [yearLevels, selectedYearLevel]);

    const fetchDepartments = async () => {
        if (hasAccess !== true) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/get_department`);
            const allDepartments = res.data || [];
            setDepartment(allDepartments);
        } catch (err) {
            console.error("Fetch error:", err);
        }
    };

    const fetchPrograms = async (dprtmnt_id) => {
        if (hasAccess !== true) return;
        if (!dprtmnt_id) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/applied_program/${dprtmnt_id}`);
            setPrograms(res.data || []);
        } catch (err) {
            console.error("Department fetch error:", err);
        }
    };

    const selectedProgramMeta = programs.find(
        (prog) => String(prog.program_id) === String(selectedProgram),
    );
    const selectedCurriculumId = selectedProgramMeta?.curriculum_id;

    useEffect(() => {
        if (!selectedCurriculumId) {
            setCourses([]);
            setSelectedCourse("");
            return;
        }
        axios
            .get(`${API_BASE_URL}/api/courses/${selectedCurriculumId}`)
            .then((res) => {
                const taggedCourses = (res.data || []).filter((course) => {
                    const matchesYearLevel =
                        !selectedYearLevel ||
                        String(course.year_level_id) === String(selectedYearLevel);
                    const matchesSemester =
                        !selectedSchoolSemester ||
                        String(course.semester_id) === String(selectedSchoolSemester);
                    return matchesYearLevel && matchesSemester;
                });
                setCourses(taggedCourses);
            })
            .catch((err) => {
                console.error(err);
                setCourses([]);
            });
    }, [selectedCurriculumId, selectedYearLevel, selectedSchoolSemester]);

    useEffect(() => {
        setSelectedCourse("");
    }, [selectedCurriculumId, selectedYearLevel, selectedSchoolSemester]);

    useEffect(() => {
        const fetchSectionOptions = async () => {
            if (
                !selectedDepartmentFilter ||
                !selectedProgram ||
                !selectedCurriculumId ||
                !selectedYearLevel ||
                !selectedSchoolYear ||
                !selectedSchoolSemester ||
                !selectedActiveSchoolYear ||
                !campusFilter
            ) {
                setSectionOptionRows([]);
                return;
            }

            try {
                const sectionResponse = await axios.get(`${API_BASE_URL}/api/section-slot/sections`, {
                    params: {
                        departmentId: selectedDepartmentFilter,
                        programId: selectedProgram,
                        curriculumId: selectedCurriculumId,
                        yearLevelId: selectedYearLevel,
                        yearId: selectedSchoolYear,
                        semesterId: selectedSchoolSemester,
                        campus: campusFilter,
                        activeSchoolYearId: selectedActiveSchoolYear,
                    },
                    headers: {
                        "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
                    },
                });

                setSectionOptionRows(sectionResponse.data || []);
            } catch (err) {
                console.error("Error fetching section options:", err);
                setSectionOptionRows([]);
            }
        };

        fetchSectionOptions();
    }, [
        selectedDepartmentFilter,
        selectedProgram,
        selectedYearLevel,
        selectedSchoolYear,
        selectedSchoolSemester,
        selectedActiveSchoolYear,
        campusFilter,
        selectedCurriculumId,
    ]);

    useEffect(() => {
        const fetchSlotMonitoringSections = async () => {
            if (
                !selectedDepartmentFilter ||
                !selectedProgram ||
                !selectedCurriculumId ||
                !selectedYearLevel ||
                !selectedSchoolYear ||
                !selectedSchoolSemester ||
                !selectedActiveSchoolYear ||
                !campusFilter
            ) {
                setSlotRows([]);
                return;
            }

            try {
                const slotResponse = await axios.get(`${API_BASE_URL}/api/section-slot/sections`, {
                    params: {
                        departmentId: selectedDepartmentFilter,
                        programId: selectedProgram,
                        curriculumId: selectedCurriculumId,
                        yearLevelId: selectedYearLevel,
                        yearId: selectedSchoolYear,
                        semesterId: selectedSchoolSemester,
                        campus: campusFilter,
                        activeSchoolYearId: selectedActiveSchoolYear,
                        ...(selectedCourse ? { courseId: selectedCourse } : {}),
                    },
                    headers: {
                        "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
                    },
                });
                const rows = slotResponse.data || [];

                if (rows.length === 0) {
                    setSlotRows([]);
                    return;
                }

                const sectionIds = [
                    ...new Set(
                        rows
                            .map((row) => row.department_section_id)
                            .filter(Boolean),
                    ),
                ];

                const curriculumId = rows[0]?.curriculum_id || selectedCurriculumId;

                if (!curriculumId || sectionIds.length === 0) {
                    setSlotRows(rows.map((row) => ({ ...row, enrolled_student: 0 })));
                    return;
                }

                const enrolledResponse = await axios.post(
                    `${API_BASE_URL}/api/section-slot/enrolled-count`,
                    {
                        curriculumId,
                        sectionIds,
                        activeSchoolYearId: selectedActiveSchoolYear,
                        ...(selectedCourse ? { courseId: selectedCourse } : {}),
                    },
                );

                const enrolledMap = new Map(
                    (enrolledResponse.data || []).map((item) => [
                        `${item.department_section_id}:${item.course_id || ""}`,
                        Number(item.enrolled_student) || 0,
                    ]),
                );

                const mergedRows = rows.map((row) => ({
                    ...row,
                    enrolled_student:
                        enrolledMap.get(`${row.department_section_id}:${row.course_id || ""}`) || 0,
                }));

                setSlotRows(mergedRows);
            } catch (err) {
                console.error("Error fetching slot monitoring rows:", err);
                setSlotRows([]);
                showSnackbar("Failed to load slot monitoring records.", "error");
            }
        };

        fetchSlotMonitoringSections();
    }, [
        selectedDepartmentFilter,
        selectedCourse,
        selectedProgram,
        selectedYearLevel,
        selectedSchoolYear,
        selectedSchoolSemester,
        selectedActiveSchoolYear,
        campusFilter,
        selectedCurriculumId,
    ]);

    useEffect(() => {
        if (!selectedProgram && programs.length > 0) {
            setSelectedCourse("");
        }
    }, [selectedProgram, programs.length]);

    useEffect(() => {
        const uniqueSections = [
            ...new Map(
                sectionOptionRows.map((row) => [String(row.department_section_id), row]),
            ).values(),
        ];

        if (uniqueSections.length === 0) {
            setSelectedSectionFilter("");
            return;
        }

        const sectionIds = uniqueSections.map((section) =>
            String(section.department_section_id),
        );

        setSelectedSectionFilter((prev) => {
            if (prev && sectionIds.includes(String(prev))) {
                return prev;
            }
            return sectionIds[0];
        });
    }, [
        sectionOptionRows,
        selectedDepartmentFilter,
        selectedProgram,
        selectedCurriculumId,
        selectedYearLevel,
        selectedSchoolYear,
        selectedSchoolSemester,
        campusFilter,
    ]);

    const sectionOptions = [
        ...new Map(
            sectionOptionRows.map((row) => [String(row.department_section_id), row]),
        ).values(),
    ];

    const buildDisplayRows = () => {
        const sections = selectedSectionFilter
            ? sectionOptions.filter(
                (section) =>
                    String(section.department_section_id) === String(selectedSectionFilter),
            )
            : sectionOptions;

        const rows = [];

        sections.forEach((section) => {
            const subjectsForSection = slotRows.filter(
                (row) =>
                    String(row.department_section_id) ===
                        String(section.department_section_id) && row.course_id,
            );

            if (subjectsForSection.length > 0) {
                rows.push(...subjectsForSection);
                return;
            }

            const sectionMeta = slotRows.find(
                (row) =>
                    String(row.department_section_id) ===
                    String(section.department_section_id),
            );

            rows.push({
                ...section,
                ...sectionMeta,
                course_id: null,
                course_code: null,
                schedule: null,
                enrolled_student: 0,
                section_subject_id: null,
            });
        });

        return rows;
    };

    const filteredSlotRows = buildDisplayRows();

    const subjectRows = filteredSlotRows.filter((row) => row.course_id);

    const selectedBranch = branches.find(
        (branch) => String(branch.id) === String(campusFilter),
    );
    const selectedBranchAddress = selectedBranch?.address || "";

    const formatActualSizeSectionLabel = (row) => {
        const yearDescription =
            row.year_level_description ||
            yearLevels.find((yl) => String(yl.year_level_id) === String(selectedYearLevel))
                ?.year_level_description ||
            "";
        const yearNum = yearDescription.match(/\d+/)?.[0] || yearDescription;
        const programCode = row.program_code || "";
        const sectionDescription = row.section_description || "";

        if (yearNum) {
            return `${programCode} ${yearNum}-${programCode}${sectionDescription}`;
        }
        return `${programCode}-${sectionDescription}`;
    };

    const formatActualSizeEnrolledLabel = (row) => {
        const enrolled = Number(row.enrolled_student) || 0;
        const maxSlots = Number(row.max_slots);
        if (!Number.isFinite(maxSlots)) return String(enrolled);
        return `${enrolled}/${maxSlots}`;
    };

    const sortSubjectReportRows = (rows) =>
        [...rows].sort((a, b) => {
            const sectionA = formatActualSizeSectionLabel(a);
            const sectionB = formatActualSizeSectionLabel(b);
            if (sectionA !== sectionB) return sectionA.localeCompare(sectionB);
            return String(a.course_code || "").localeCompare(String(b.course_code || ""));
        });

    const buildReportBodyWithCourseSpan = (rows, programDescription, getRowCells) =>
        rows.map((row, index) => {
            const cells = getRowCells(row);
            if (index === 0) {
                return [
                    {
                        content: programDescription,
                        rowSpan: rows.length,
                        styles: { fontStyle: "bold", valign: "top" },
                    },
                    ...cells,
                ];
            }
            return cells;
        });

    const getReportBorderRgb = () => {
        const hex = String(borderColor || "#000000").replace("#", "");
        if (!/^[0-9a-fA-F]{6}$/.test(hex)) return [0, 0, 0];
        const value = parseInt(hex, 16);
        return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
    };

    const reportTableStyles = {
        styles: {
            fontSize: 10,
            cellPadding: 2,
            valign: "middle",
            overflow: "linebreak",
            lineColor: getReportBorderRgb(),
            lineWidth: 0.2,
        },
        headStyles: {
            fillColor: [109, 35, 35],
            fontStyle: "bold",
            halign: "center",
            lineColor: getReportBorderRgb(),
            lineWidth: 0.2,
        },
        theme: "grid",
    };

    const getReportSchoolYearLabels = () => {
        const schoolYearMeta = schoolYears.find(
            (sy) => String(sy.year_id) === String(selectedSchoolYear),
        );
        const semesterMeta = semesters.find(
            (sem) => String(sem.semester_id) === String(selectedSchoolSemester),
        );

        return {
            schoolYearLabel: schoolYearMeta
                ? `${schoolYearMeta.current_year}-${schoolYearMeta.next_year}`
                : "School Year",
            semesterLabel: semesterMeta?.semester_description || "Semester",
        };
    };

    const renderPdfLetterhead = async (doc, { titleLine = null, subtitleLine = null } = {}) => {
        const pageWidth = doc.internal.pageSize.getWidth();

        const schoolYearMeta = schoolYears.find(
            (sy) => String(sy.year_id) === String(selectedSchoolYear),
        );
        const semesterMeta = semesters.find(
            (sem) => String(sem.semester_id) === String(selectedSchoolSemester),
        );
        const schoolYearLabel = schoolYearMeta
            ? `${schoolYearMeta.current_year}-${schoolYearMeta.next_year}`
            : "School Year";
        const semesterLabel = semesterMeta?.semester_description || "Semester";
        const resolvedSubtitle =
            subtitleLine || `${schoolYearLabel} , ${semesterLabel}`;

        const logoUrl = fetchedLogo || EaristLogo;

        const loadImageAsDataUrl = async (url) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            try {
                const response = await fetch(url, {
                    mode: "cors",
                    signal: controller.signal,
                });
                const blob = await response.blob();
                return await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } finally {
                clearTimeout(timeoutId);
            }
        };

        let logoDataUrl = null;
        try {
            logoDataUrl = await loadImageAsDataUrl(logoUrl);
        } catch (err) {
            console.warn("External logo failed, falling back to EaristLogo:", err);
            try {
                logoDataUrl = await loadImageAsDataUrl(EaristLogo);
            } catch (fallbackErr) {
                console.warn("Fallback logo also failed:", fallbackErr);
            }
        }

        const marginX = 14;
        const logoWidth = 25;
        const logoHeight = 25;
        const logoX = marginX;
        const logoY = 8;
        const textStartX = marginX + logoWidth + 5;
        const textEndX = pageWidth - marginX - logoWidth - 5;
        const textCenterX = (textStartX + textEndX) / 2;
        const maxTextWidth = textEndX - textStartX;

        if (logoDataUrl) {
            const format = logoDataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
            doc.addImage(logoDataUrl, format, logoX, logoY, logoWidth, logoHeight);
        }

        const drawSpacedText = (text, x, y, align = "center") => {
            const chars = text.split("");
            const totalWidth = chars.reduce(
                (acc, char) => acc + doc.getTextWidth(char),
                0,
            );

            let startX = x;
            if (align === "center") startX = x - totalWidth / 2;
            else if (align === "right") startX = x - totalWidth;

            chars.forEach((char) => {
                doc.text(char, startX, y);
                startX += doc.getTextWidth(char);
            });
        };

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        drawSpacedText("Republic of the Philippines", textCenterX, 13);

        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        const companyName = branding.companyName || "Campus Name";
        const nameLines = doc.splitTextToSize(companyName, maxTextWidth);
        nameLines.forEach((line, i) => {
            drawSpacedText(line, textCenterX, 20 + i * 6);
        });

        const nameBlockHeight = nameLines.length * 6;
        let headerBottomY = 20 + nameBlockHeight;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        drawSpacedText(selectedBranchAddress, textCenterX, headerBottomY);
        headerBottomY += 7;

        if (titleLine) {
            doc.setFontSize(13);
            doc.setFont("helvetica", "bold");
            drawSpacedText(titleLine, textCenterX, headerBottomY);
            headerBottomY += 7;
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        drawSpacedText(resolvedSubtitle, textCenterX, headerBottomY);
        headerBottomY += 7;

        const dividerY = Math.max(logoY + logoHeight + 3, headerBottomY + 6);
        doc.setDrawColor(120);
        doc.line(marginX, dividerY, pageWidth - marginX, dividerY);

        return {
            dividerY,
            pageWidth,
            tableWidth: pageWidth - marginX * 2,
            schoolYearLabel,
            semesterLabel,
        };
    };

    const handleSchoolYearChange = (event) => {
        setSelectedSchoolYear(event.target.value);
    };

    const handleSchoolSemesterChange = (event) => {
        setSelectedSchoolSemester(event.target.value);
    };

    const handleCollegeChange = (e) => {
        const selectedId = e.target.value;

        setSelectedDepartmentFilter(selectedId);
        setSelectedProgram("");
        setPrograms([]);
        setCourses([]);
        setSelectedCourse("");
        setSlotRows([]);
        fetchPrograms(selectedId);
    };

    const showSnackbar = (message, severity = "success") => {
        setSnackbar({ open: true, message, severity });
    };

    const handleDownloadSubjectsPdf = async () => {
        if (subjectRows.length === 0) {
            showSnackbar("No subjects available for PDF.", "error");
            return;
        }

        try {
            const reportRows = sortSubjectReportRows(subjectRows);
            const programDescription = reportRows[0]?.program_description || "-";

            const { schoolYearLabel, semesterLabel } = getReportSchoolYearLabels();

            const doc = new jsPDF("portrait", "mm", "a4");
            const { dividerY, tableWidth } = await renderPdfLetterhead(doc, {
                titleLine: "LIST OF SUBJECTS",
                subtitleLine: `SY ${schoolYearLabel} - ${semesterLabel}`,
            });

            autoTable(doc, {
                startY: dividerY + 11,
                tableWidth,
                head: [["Course", "Section", "Subject"]],
                body: buildReportBodyWithCourseSpan(
                    reportRows,
                    programDescription,
                    (row) => [
                        formatActualSizeSectionLabel(row),
                        row.course_code || "-",
                    ],
                ),
                ...reportTableStyles,
            });

            const firstRow = reportRows[0];
            const rawFileName = `${firstRow.program_code || "program"}-${firstRow.section_description || "section"}.pdf`;
            const safeFileName = rawFileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
            doc.save(safeFileName);
        } catch (err) {
            console.error("Error generating List of Subjects PDF:", err);
            showSnackbar("Failed to generate List of Subjects PDF.", "error");
        }
    };

    const handleActualSizeReport = async () => {
        const reportRows = sortSubjectReportRows(
            filteredSlotRows.filter((row) => row.course_id),
        );

        if (reportRows.length === 0) {
            showSnackbar("No records available for Actual Size report.", "error");
            return;
        }

        try {
            const { schoolYearLabel, semesterLabel } = getReportSchoolYearLabels();

            const doc = new jsPDF("portrait", "mm", "a4");
            const { dividerY, tableWidth } = await renderPdfLetterhead(doc, {
                titleLine: "ACTUAL SIZE",
                subtitleLine: `SY ${schoolYearLabel} - ${semesterLabel}`,
            });

            const programDescription = reportRows[0]?.program_description || "-";
            const programCode = reportRows[0]?.program_code || "PROGRAM";
            const programTotal = reportRows.reduce(
                (sum, row) => sum + (Number(row.enrolled_student) || 0),
                0,
            );

            const tableBody = buildReportBodyWithCourseSpan(
                reportRows,
                programDescription,
                (row) => [
                    formatActualSizeSectionLabel(row),
                    row.course_code || "-",
                    row.faculty_name || "",
                    formatActualSizeEnrolledLabel(row),
                ],
            );

            autoTable(doc, {
                startY: dividerY + 11,
                tableWidth,
                head: [[
                    "Course",
                    "Section",
                    "Subject",
                    "Faculty Name",
                    "Total Number of Students Enrolled",
                ]],
                body: tableBody,
                foot: [
                    [
                        {
                            content: `Total ${programCode}`,
                            colSpan: 4,
                            styles: { fontStyle: "bold", halign: "left" },
                        },
                        {
                            content: programTotal.toLocaleString(),
                            styles: { fontStyle: "bold", halign: "right" },
                        },
                    ],
                    [
                        {
                            content: "Over All Total",
                            colSpan: 4,
                            styles: { fontStyle: "bold", halign: "left" },
                        },
                        {
                            content: programTotal.toLocaleString(),
                            styles: { fontStyle: "bold", halign: "right" },
                        },
                    ],
                ],
                ...reportTableStyles,
                footStyles: {
                    fillColor: [255, 255, 255],
                    textColor: [0, 0, 0],
                },
            });

            const rawFileName = `actual-size-${programCode}.pdf`;
            const safeFileName = rawFileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
            doc.save(safeFileName);
        } catch (err) {
            console.error("Error generating Actual Size PDF:", err);
            showSnackbar("Failed to generate Actual Size PDF.", "error");
        }
    };

    if (loading || hasAccess === null) {
        return <LoadingOverlay open={loading} message="Loading..." />;
    }

    if (!hasAccess) {
        return <Unauthorized />;
    }

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
        <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
            <Typography
                variant="h4"
                sx={{
                    fontWeight: "bold",
                    color: titleColor,
                    fontSize: "36px",
                    background: "white",
                    display: "flex",
                    alignItems: "center",
                    mb: 2,
                }}
            >
                SLOT MONITORING
            </Typography>

            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />
            <br />
            <TableContainer component={Paper} sx={{ width: '100%', border: `1px solid ${borderColor}`, }}>
                <Table>
                    <TableHead sx={{ backgroundColor: headerColor }}>
                        <TableRow>
                            <TableCell sx={{ color: 'white', textAlign: "Center" }}>FILTER OPTIONS</TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>

            <TableContainer component={Paper} sx={{ width: '100%', border: `1px solid ${borderColor}`, }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ display: "flex", alignItems: "center", gap: "1rem", justifyContent: "space-between", borderBottom: "none" }}>
                                <Box>
                                    <Box sx={{ textAlign: "Center", display: "flex", alignItems: "center", gap: "1rem" }}>
                                        <Typography sx={{ width: "100px", textAlign: "left" }}>
                                            Campus:
                                        </Typography>
                                        <Select
                                            name="campus"
                                            value={campusFilter}
                                            onChange={(e) => setCampusFilter(e.target.value)}
                                            MenuProps={{
                                                PaperProps: {
                                                    sx: {
                                                        marginTop: "8px"
                                                    },
                                                },
                                            }}
                                            sx={{ width: "200px", textAlign: "left" }}
                                        >
                                            {branches.length > 0 ? (
                                                branches.map((branch) => (
                                                    <MenuItem key={branch.id} value={String(branch.id)}>
                                                        {branch.branch}
                                                    </MenuItem>
                                                ))
                                            ) : (
                                                <MenuItem value="">No Branches</MenuItem>
                                            )}
                                        </Select>
                                    </Box>

                                    <Box sx={{ textAlign: "Center", display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
                                        <Typography sx={{ width: "100px", textAlign: "left" }}>
                                            Year Level:
                                        </Typography>
                                        <Select
                                            name="yearLevel"
                                            value={selectedYearLevel}
                                            onChange={(e) => setSelectedYearLevel(e.target.value)}
                                            sx={{ width: "200px", textAlign: "left" }}
                                            MenuProps={{
                                                PaperProps: {
                                                    sx: {
                                                        maxHeight: 410,
                                                        marginTop: "8px"
                                                    },
                                                },
                                            }}
                                        >
                                            {yearLevels.map((yl) => (
                                                <MenuItem key={yl.year_level_id} value={yl.year_level_id}>
                                                    {yl.year_level_description}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </Box>
                                </Box>

                                <Box>
                                    <Box sx={{ textAlign: "Center", display: "flex", alignItems: "center", gap: "1rem" }}>
                                        <Typography sx={{ width: "100px", textAlign: "left" }}>
                                            College:
                                        </Typography>
                                        <Select
                                            name="college"
                                            value={selectedDepartmentFilter}
                                            onChange={handleCollegeChange}
                                            sx={{ width: "485px", textAlign: "left" }}
                                            MenuProps={{
                                                PaperProps: {
                                                    sx: {
                                                        marginTop: "8px",
                                                        height: "265px"
                                                    },
                                                },
                                            }}
                                        >
                                            {department.map((dep) => (
                                                <MenuItem key={dep.dprtmnt_id} value={dep.dprtmnt_id}>
                                                    {dep.dprtmnt_name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </Box>
                                    <Box sx={{ textAlign: "Center", display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
                                        <Typography sx={{ width: "100px", textAlign: "left" }}>
                                            Program:
                                        </Typography>
                                        <Select
                                            name="program"
                                            value={selectedProgram}
                                            onChange={(e) => setSelectedProgram(e.target.value)}
                                            sx={{ width: "485px", textAlign: "left" }}
                                            MenuProps={{
                                                PaperProps: {
                                                    sx: {
                                                        maxHeight: 410,
                                                        marginTop: "8px"
                                                    },
                                                },
                                            }}
                                        >
                                            {programs.map((prog) => (
                                                <MenuItem key={prog.program_id} value={prog.program_id}>
                                                    {prog.program_description} {prog.major}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </Box>
                                </Box>

                                <Box>
                                    <Box sx={{ textAlign: "Center", display: "flex", alignItems: "center", gap: "1rem" }}>
                                        <Typography sx={{ width: "100px", textAlign: "left" }}>
                                            Section:
                                        </Typography>
                                        <Select
                                            name="sectionFilter"
                                            value={selectedSectionFilter}
                                            onChange={(e) => setSelectedSectionFilter(e.target.value)}
                                            sx={{ width: "230px", textAlign: "left" }}
                                            MenuProps={{
                                                PaperProps: {
                                                    sx: {
                                                        maxHeight: 410,
                                                        marginTop: "8px",
                                                    },
                                                },
                                            }}
                                        >
                                            <MenuItem value="">All Sections</MenuItem>
                                            {sectionOptions.map((section) => (
                                                <MenuItem
                                                    key={section.department_section_id}
                                                    value={section.department_section_id}
                                                >
                                                    {section.program_code}-{section.section_description}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </Box>
                                    <Box sx={{ textAlign: "Center", display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
                                        <Typography sx={{ width: "100px", textAlign: "left" }}>
                                            Course:
                                        </Typography>
                                        <Select
                                            name="course"
                                            value={selectedCourse}
                                            onChange={(e) => setSelectedCourse(e.target.value)}
                                            sx={{ width: "230px", textAlign: "left" }}
                                            MenuProps={{
                                                PaperProps: {
                                                    sx: {
                                                        marginTop: "8px",
                                                        height: "265px"
                                                    },
                                                },
                                            }}
                                        >
                                            <MenuItem value="">All Tagged Subjects</MenuItem>
                                            {courses.map((course) => (
                                                <MenuItem key={course.course_id} value={course.course_id}>
                                                    {course.course_code} - {course.course_description}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </Box>
                                </Box>

                                <Box>
                                    <Box sx={{ textAlign: "Center", display: "flex", alignItems: "center", gap: "1rem" }}>
                                        <Typography sx={{ width: "100px", textAlign: "left" }}>
                                            School Year:
                                        </Typography>
                                        <Select
                                            name="schoolYear"
                                            value={selectedSchoolYear}
                                            onChange={handleSchoolYearChange}
                                            sx={{ width: "200px", textAlign: "left" }}
                                            MenuProps={{
                                                PaperProps: {
                                                    sx: {
                                                        maxHeight: 410,
                                                        marginTop: "8px"
                                                    },
                                                },
                                            }}
                                        >
                                            {schoolYears.map((sy) => (
                                                <MenuItem key={sy.year_id} value={sy.year_id}>
                                                    {sy.current_year}-{sy.next_year}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </Box>
                                    <Box sx={{ textAlign: "Center", display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
                                        <Typography sx={{ width: "100px", textAlign: "left" }}>
                                            Semester:
                                        </Typography>
                                        <Select
                                            name="semester"
                                            value={selectedSchoolSemester}
                                            onChange={handleSchoolSemesterChange}
                                            sx={{ width: "200px", textAlign: "left" }}
                                            MenuProps={{
                                                PaperProps: {
                                                    sx: {
                                                        maxHeight: 410,
                                                        marginTop: "8px"
                                                    },
                                                },
                                            }}
                                        >
                                            {semesters.map((sem) => (
                                                <MenuItem key={sem.semester_id} value={sem.semester_id}>
                                                    {sem.semester_description}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </Box>
                                </Box>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell sx={{ display: "flex", alignItems: "center", gap: "1rem", border: "none", justifyContent: "end" }}>
                                <Button
                                    disabled={filteredSlotRows.filter((row) => row.course_id).length === 0}
                                    sx={{ backgroundColor: colors.mainButton || headerColor, color: "white" }}
                                    onClick={handleActualSizeReport}
                                >
                                    Actual Size
                                </Button>
                                <Button
                                    disabled={!selectedSectionFilter || subjectRows.length === 0}
                                    sx={{ backgroundColor: colors.mainButton || headerColor, color: "white" }}
                                    onClick={() => setSubjectsModalOpen(true)}
                                >
                                    List of Subjects
                                </Button>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                </Table>
            </TableContainer>

            <TableContainer component={Paper} sx={{ width: "100%", border: `1px solid ${borderColor}`, mt: 2 }}>
                <Table
                    sx={{
                        borderCollapse: "collapse",
                        "& .MuiTableCell-root": {
                            border: `1px solid ${borderColor}`,
                        },
                    }}
                >
                    <TableHead sx={{ backgroundColor: headerColor }}>
                        <TableRow>
                            <TableCell sx={{ color: "white", textAlign: "center", width: "70px" }}>#</TableCell>
                            <TableCell sx={{ color: "white", textAlign: "center" }}>Section</TableCell>
                            <TableCell sx={{ color: "white", textAlign: "center" }}>Subject</TableCell>
                            <TableCell sx={{ color: "white", textAlign: "center" }}>Schedule</TableCell>
                            <TableCell sx={{ color: "white", textAlign: "center", width: "120px" }}>Slots</TableCell>
                            <TableCell sx={{ color: "white", textAlign: "center", width: "120px" }}>Enrolled</TableCell>
                        </TableRow>
                    </TableHead>
                     <TableBody
                              sx={{
                                "& .MuiTableRow-root:nth-of-type(odd)": {
                                  backgroundColor: "#ffffff",
                                },
                                "& .MuiTableRow-root:nth-of-type(even)": {
                                  backgroundColor: "lightgray",
                                },
                              }}
                            >
                        {filteredSlotRows.length > 0 ? (
                            filteredSlotRows.map((row, index) => (
                                <TableRow key={`${row.department_section_id}-${row.course_id || "section"}-${index}`}>
                                    <TableCell sx={{ textAlign: "center" }}>{index + 1}</TableCell>
                                    <TableCell sx={{ textAlign: "center" }}>{row.program_code}-{row.section_description || ""}</TableCell>
                                    <TableCell sx={{ textAlign: "center" }}>
                                        {row.course_code || "—"}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: "center" }}>
                                        {row.course_id ? (row.schedule?.trim() || "TBA") : "—"}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: "center" }}>
                                        {row.course_id ? (row.max_slots ?? "-") : "—"}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: "center" }}>
                                        {row.course_id ? (row.enrolled_student ?? 0) : "—"}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} sx={{ textAlign: "center", py: 2 }}>
                                    No records found for the selected filters.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog
                open={subjectsModalOpen}
                onClose={() => setSubjectsModalOpen(false)}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle>List of Subjects</DialogTitle>
                <DialogContent>
                    <TableContainer component={Paper} sx={{ border: `1px solid ${borderColor}` }}>
                        <Table>
                            <TableHead sx={{ backgroundColor: headerColor }}>
                                <TableRow>
                                    <TableCell sx={{ color: "white", textAlign: "center" }}>Program Description</TableCell>
                                    <TableCell sx={{ color: "white", textAlign: "center" }}>Section</TableCell>
                                    <TableCell sx={{ color: "white", textAlign: "center" }}>Subject</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {subjectRows.length > 0 ? (
                                    subjectRows.map((row, index) => (
                                        <TableRow key={`subject-row-${index}`}>
                                            <TableCell sx={{ textAlign: "center" }}>
                                                {row.program_description || "-"}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: "center" }}>
                                                {row.program_code || ""}-{row.section_description || ""}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: "center" }}>
                                                {row.course_code || "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} sx={{ textAlign: "center", py: 2 }}>
                                            No subjects found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSubjectsModalOpen(false)} color="inherit">
                        Close
                    </Button>
                    <Button
                        variant="contained"
                        disabled={subjectRows.length === 0}
                        onClick={handleDownloadSubjectsPdf}
                        sx={{ backgroundColor: colors.mainButton || headerColor }}
                    >
                        Download PDF
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={2500}
                onClose={() =>
                    setSnackbar((prev) => ({ ...prev, open: false }))
                }
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert
                    severity={snackbar.severity}
                    variant="filled"
                    onClose={() =>
                        setSnackbar((prev) => ({ ...prev, open: false }))
                    }
                    sx={{ width: "100%" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    )
}

export default SlotMonitoring;
