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
    Autocomplete,
    IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { SettingsContext } from "../App";
import API_BASE_URL from "../apiConfig";
import axios from "axios";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import EaristLogo from "../assets/EaristLogo.png";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const SectionSlotManagement = () => {
    useAuditMac();
    const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
    const pageId = 167;

    const [borderColor, setBorderColor] = useState("#000000");
    const [titleColor, setTitleColor] = useState("#6D2323");
    const [fetchedLogo, setFetchedLogo] = useState(EaristLogo);
    const [loading, setLoading] = useState(false);
    const [hasAccess, setHasAccess] = useState(null);
    const [canCreate, setCanCreate] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    const [canDelete, setCanDelete] = useState(false);
    const [employeeID, setEmployeeID] = useState("");
    const [userRole, setUserRole] = useState("");

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
    const [editTarget, setEditTarget] = useState(null);
    const [editSlotsValue, setEditSlotsValue] = useState("");
    const [savingEditSlots, setSavingEditSlots] = useState(false);
    const [subjectsModalOpen, setSubjectsModalOpen] = useState(false);
    const [activeTagSectionId, setActiveTagSectionId] = useState("");
    const [activeTagSectionLabel, setActiveTagSectionLabel] = useState("");
    const [tagModalOpen, setTagModalOpen] = useState(false);
    const [selectedCourseToTag, setSelectedCourseToTag] = useState("");
    const [pendingCourseTags, setPendingCourseTags] = useState([]);
    const [taggedSubjects, setTaggedSubjects] = useState([]);
    const [untagTarget, setUntagTarget] = useState(null);
    const [untagCheck, setUntagCheck] = useState(null);
    const [savingTags, setSavingTags] = useState(false);
    const [dataRefreshKey, setDataRefreshKey] = useState(0);
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

    const getPermissionHeaders = () => ({
        headers: {
            ...getFlatAuditHeaders(),
            "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
            "x-page-id": pageId,
            "x-audit-actor-id": employeeID || localStorage.getItem("employee_id") || "",
            "x-audit-actor-role": userRole || localStorage.getItem("role") || "registrar",
        },
    });

    useEffect(() => {
        const storedUser = localStorage.getItem("email");
        const storedRole = localStorage.getItem("role");
        const storedID = localStorage.getItem("person_id");
        const storedEmployeeID = localStorage.getItem("employee_id");

        if (storedUser && storedRole && storedID && storedEmployeeID) {
            setEmployeeID(storedEmployeeID);
            setUserRole(storedRole);
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
                setCanCreate(Number(response.data?.can_create) === 1);
                setCanEdit(Number(response.data?.can_edit) === 1);
                setCanDelete(Number(response.data?.can_delete) === 1);
            } else {
                setHasAccess(false);
                setCanCreate(false);
                setCanEdit(false);
                setCanDelete(false);
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
    }, [hasAccess]);

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
                    const active = res.data[0];
                    setSelectedSchoolYear(active.year_id);
                    setSelectedSchoolSemester(active.semester_id);
                    if (active.school_year_id) {
                        setSelectedActiveSchoolYear(active.school_year_id);
                    }
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
                    } else {
                        setSelectedActiveSchoolYear("");
                    }
                })
                .catch((err) => console.error(err));
        }
    }, [selectedSchoolYear, selectedSchoolSemester]);

    useEffect(() => {
        if (hasAccess !== true) return;
        fetchDepartments();
    }, [hasAccess])

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
    }, [programs, selectedProgram]);

    useEffect(() => {
        if (!selectedDepartmentFilter || !campusFilter || hasAccess !== true) return;
        setSelectedProgram("");
        fetchPrograms(selectedDepartmentFilter);
    }, [campusFilter]);

    useEffect(() => {
        if (yearLevels.length > 0 && !selectedYearLevel) {
            setSelectedYearLevel(yearLevels[0].year_level_id);
        }
    }, [yearLevels, selectedYearLevel]);

    const fetchDepartments = async () => {
        if (hasAccess !== true) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/get_department`);
            setDepartment(res.data);
            console.log(res.data);
        } catch (err) {
            console.error("Fetch error:", err);
        }
    };

    const fetchPrograms = async (dprtmnt_id) => {
        if (hasAccess !== true) return;
        if (!dprtmnt_id) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/api/applied_program/${dprtmnt_id}`);
            const allPrograms = Array.isArray(res.data) ? res.data : [];
            const filteredPrograms = campusFilter
                ? allPrograms.filter(
                    (prog) => String(prog.components) === String(campusFilter),
                )
                : allPrograms;
            setPrograms(filteredPrograms);
            if (filteredPrograms.length === 0) {
                setSelectedProgram("");
            }
        } catch (err) {
            console.error("❌ Department fetch error:", err);
            setPrograms([]);
            setSelectedProgram("");
        }
    };

    const selectedProgramMeta = programs.find(
        (prog) => String(prog.program_id) === String(selectedProgram),
    );
    const selectedCurriculumId = selectedProgramMeta?.curriculum_id;
    const resolvedCampus = selectedProgramMeta?.components ?? campusFilter;

    const getSectionSlotHeaders = () => ({
        headers: {
            "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
        },
    });

    const buildSectionSlotParams = (extraParams = {}) => ({
        departmentId: selectedDepartmentFilter,
        programId: selectedProgram,
        curriculumId: selectedCurriculumId,
        yearLevelId: selectedYearLevel,
        yearId: selectedSchoolYear,
        semesterId: selectedSchoolSemester,
        campus: resolvedCampus,
        activeSchoolYearId: selectedActiveSchoolYear,
        ...extraParams,
    });

    const hasSectionSlotFilters =
        selectedDepartmentFilter &&
        selectedProgram &&
        selectedCurriculumId &&
        selectedYearLevel &&
        selectedSchoolYear &&
        selectedSchoolSemester &&
        selectedActiveSchoolYear &&
        resolvedCampus;

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
            if (!hasSectionSlotFilters) {
                setSectionOptionRows([]);
                setSelectedSectionFilter("");
                return;
            }

            try {
                const sectionResponse = await axios.get(
                    `${API_BASE_URL}/api/section-slot/sections`,
                    {
                        params: buildSectionSlotParams(),
                        ...getSectionSlotHeaders(),
                    },
                );

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
        resolvedCampus,
        selectedCurriculumId,
    ]);

    useEffect(() => {
        const fetchSlotMonitoringSections = async () => {
            if (!hasSectionSlotFilters) {
                setSlotRows([]);
                return;
            }

            try {
                const slotResponse = await axios.get(
                    `${API_BASE_URL}/api/section-slot/sections`,
                    {
                        params: buildSectionSlotParams(
                            selectedCourse ? { courseId: selectedCourse } : {},
                        ),
                        ...getSectionSlotHeaders(),
                    },
                );
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
        resolvedCampus,
        selectedCurriculumId,
        dataRefreshKey,
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
        resolvedCampus,
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

    const handleSchoolYearChange = (event) => {
        setSelectedSchoolYear(event.target.value);
    };

    const handleSchoolSemesterChange = (event) => {
        setSelectedSchoolSemester(event.target.value);
    };

    const handleCampusChange = (event) => {
        setCampusFilter(event.target.value);
        setSelectedProgram("");
        setPrograms([]);
        setCourses([]);
        setSelectedCourse("");
        setSlotRows([]);
        setSectionOptionRows([]);
        setSelectedSectionFilter("");
        if (selectedDepartmentFilter) {
            fetchPrograms(selectedDepartmentFilter);
        }
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

    const fetchTaggedSubjects = async (departmentSectionId) => {
        const sectionId = departmentSectionId || activeTagSectionId;
        if (!sectionId || !selectedActiveSchoolYear) {
            setTaggedSubjects([]);
            return;
        }
        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/section-slot/tagged-subjects/${sectionId}`,
                { params: { activeSchoolYearId: selectedActiveSchoolYear } },
            );
            setTaggedSubjects(response.data || []);
        } catch (err) {
            console.error("Error fetching tagged subjects:", err);
            setTaggedSubjects([]);
        }
    };

    const openTagModalForSection = async (row) => {
        if (!canCreate) {
            showSnackbar("You do not have permission to tag subjects.", "error");
            return;
        }
        const sectionId = row.department_section_id;
        const sectionLabel = `${row.program_code || ""}-${row.section_description || ""}`;
        setActiveTagSectionId(sectionId);
        setActiveTagSectionLabel(sectionLabel);
        await fetchTaggedSubjects(sectionId);
        setPendingCourseTags([]);
        setSelectedCourseToTag("");
        setTagModalOpen(true);
    };

    const addPendingCourse = () => {
        const course = courses.find(
            (item) => String(item.course_id) === String(selectedCourseToTag),
        );
        if (!course) return;

        const alreadyTagged = taggedSubjects.some(
            (item) => String(item.course_id) === String(course.course_id),
        );
        const alreadyPending = pendingCourseTags.some(
            (item) => String(item.course_id) === String(course.course_id),
        );

        if (alreadyTagged || alreadyPending) {
            showSnackbar("Course is already tagged or pending.", "error");
            return;
        }

        setPendingCourseTags((prev) => [...prev, course]);
        setSelectedCourseToTag("");
    };

    const removePendingCourse = (courseId) => {
        setPendingCourseTags((prev) =>
            prev.filter((item) => String(item.course_id) !== String(courseId)),
        );
    };

    const handleSaveTags = async () => {
        if (!canCreate || pendingCourseTags.length === 0 || !activeTagSectionId) return;

        setSavingTags(true);
        try {
            await axios.post(
                `${API_BASE_URL}/api/section-slot/tag`,
                {
                    department_section_id: activeTagSectionId,
                    curriculum_id: selectedCurriculumId,
                    active_school_year_id: selectedActiveSchoolYear,
                    year_level_id: selectedYearLevel,
                    semester_id: selectedSchoolSemester,
                    course_ids: pendingCourseTags.map((item) => item.course_id),
                },
                getPermissionHeaders(),
            );

            const baseRow =
                slotRows.find(
                    (row) => String(row.department_section_id) === String(activeTagSectionId),
                ) ||
                sectionOptionRows.find(
                    (row) => String(row.department_section_id) === String(activeTagSectionId),
                ) ||
                {};

            const optimisticRows = pendingCourseTags.map((course) => ({
                ...baseRow,
                department_section_id: activeTagSectionId,
                course_id: course.course_id,
                course_code: course.course_code,
                course_description: course.course_description,
                section_subject_id: null,
                schedule: null,
                faculty_name: null,
                enrolled_student: 0,
                max_slots: baseRow.max_slots ?? 0,
            }));

            setSlotRows((prev) => {
                const withoutPlaceholder = prev.filter(
                    (row) =>
                        !(
                            String(row.department_section_id) === String(activeTagSectionId) &&
                            !row.course_id
                        ),
                );
                return [...withoutPlaceholder, ...optimisticRows];
            });

            setTagModalOpen(false);
            setPendingCourseTags([]);
            setActiveTagSectionId("");
            setActiveTagSectionLabel("");
            showSnackbar("Subjects tagged successfully.");
            setDataRefreshKey((prev) => prev + 1);
        } catch (err) {
            console.error("Error saving tags:", err);
            showSnackbar(err.response?.data?.error || "Failed to tag subjects.", "error");
        } finally {
            setSavingTags(false);
        }
    };

    const requestUntag = async (tagRow) => {
        if (!canDelete) {
            showSnackbar("You do not have permission to untag subjects.", "error");
            return;
        }
        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/section-slot/tag/${tagRow.section_subject_id}/check`,
            );
            setUntagCheck(response.data);
            setUntagTarget(tagRow);
        } catch (err) {
            console.error("Error checking untag:", err);
            showSnackbar("Failed to validate untag request.", "error");
        }
    };

    const handleConfirmUntag = async () => {
        if (!untagTarget || !canDelete) return;

        const removedId = untagTarget.section_subject_id;
        const previousRows = slotRows;

        setSlotRows((prev) =>
            prev.filter((row) => String(row.section_subject_id) !== String(removedId)),
        );
        setUntagTarget(null);
        setUntagCheck(null);

        try {
            await axios.delete(
                `${API_BASE_URL}/api/section-slot/tag/${removedId}`,
                getPermissionHeaders(),
            );
            showSnackbar("Subject untagged successfully.");
            setDataRefreshKey((prev) => prev + 1);
        } catch (err) {
            setSlotRows(previousRows);
            console.error("Error untagging subject:", err);
            showSnackbar(err.response?.data?.error || "Failed to untag subject.", "error");
        }
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

    const openEditSlot = (row) => {
        if (!canEdit) {
            showSnackbar("You do not have permission to edit slots.", "error");
            return;
        }
        setEditTarget(row);
        setEditSlotsValue(row.max_slots ?? "");
    };

    const handleSaveEditSlots = async () => {
        if (!editTarget?.section_subject_id || !canEdit) return;

        const parsed = Number(editSlotsValue);
        if (editSlotsValue === "" || Number.isNaN(parsed) || parsed < 0) {
            showSnackbar("Enter a valid non-negative slot value.", "error");
            return;
        }

        setSavingEditSlots(true);
        try {
            await axios.put(
                `${API_BASE_URL}/api/section-slot/tag/${editTarget.section_subject_id}/max-slots`,
                { max_slots: parsed },
                getPermissionHeaders(),
            );
            setSlotRows((prev) =>
                prev.map((row) =>
                    String(row.section_subject_id) === String(editTarget.section_subject_id)
                        ? { ...row, max_slots: parsed }
                        : row,
                ),
            );
            setEditTarget(null);
            setEditSlotsValue("");
            showSnackbar("Max slots saved.");
        } catch (err) {
            console.error("Error saving max slots:", err);
            showSnackbar("Failed to save max slots.", "error");
        } finally {
            setSavingEditSlots(false);
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
                SECTION SLOT MANAGEMENT
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
                                            onChange={handleCampusChange}
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
                                            value={selectedSectionFilter ? String(selectedSectionFilter) : ""}
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
                                                    value={String(section.department_section_id)}
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
                                {canCreate ? (
                                    <Button
                                        disabled={!selectedSectionFilter}
                                        sx={{ backgroundColor: colors.mainButton || headerColor, color: "white" }}
                                        onClick={() => {
                                            const section = sectionOptions.find(
                                                (item) =>
                                                    String(item.department_section_id) ===
                                                    String(selectedSectionFilter),
                                            );
                                            if (section) openTagModalForSection(section);
                                        }}
                                    >
                                        Tag Subjects
                                    </Button>
                                ) : null}
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
                            <TableCell sx={{ color: "white", textAlign: "center", width: "140px" }}>Actions</TableCell>
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
                                    <TableCell sx={{ textAlign: "center" }}>
                                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                                            {canEdit && row.section_subject_id ? (
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    onClick={() => openEditSlot(row)}
                                                    sx={{
                                                        color: "#fff",
                                                        backgroundColor: "green",
                                                        textTransform: "none",
                                                        fontSize: "12px",
                                                        minWidth: "52px",
                                                        "&:hover": { backgroundColor: "#2e7d32" },
                                                    }}
                                                >
                                                    Edit
                                                </Button>
                                            ) : null}
                                            {canDelete && row.section_subject_id ? (
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    onClick={() => requestUntag(row)}
                                                    sx={{
                                                        color: "#fff",
                                                        backgroundColor: "#9E0000",
                                                        textTransform: "none",
                                                        fontSize: "12px",
                                                        minWidth: "58px",
                                                        "&:hover": { backgroundColor: "#7f0000" },
                                                    }}
                                                >
                                                    Delete
                                                </Button>
                                            ) : null}
                                            {!canEdit && !canDelete ? "—" : (!row.section_subject_id ? "—" : null)}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} sx={{ textAlign: "center", py: 2 }}>
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

            <Dialog
                open={tagModalOpen}
                onClose={() => {
                    setTagModalOpen(false);
                    setPendingCourseTags([]);
                    setSelectedCourseToTag("");
                    setActiveTagSectionId("");
                    setActiveTagSectionLabel("");
                }}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle>
                    Tag Subjects{activeTagSectionLabel ? ` — ${activeTagSectionLabel}` : ""}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 2, mb: 2 }}>
                        <Autocomplete
                            options={courses}
                            fullWidth
                            getOptionLabel={(option) =>
                                `${option.course_code || ""} - ${option.course_description || ""}`.trim()
                            }
                            value={
                                courses.find(
                                    (course) => String(course.course_id) === String(selectedCourseToTag),
                                ) || null
                            }
                            onChange={(event, newValue) => {
                                setSelectedCourseToTag(newValue ? newValue.course_id : "");
                            }}
                            isOptionEqualToValue={(option, value) =>
                                String(option.course_id) === String(value.course_id)
                            }
                            filterOptions={(options, { inputValue }) => {
                                const input = inputValue.trim().toLowerCase();
                                if (!input) return options;

                                const exact = options.filter(
                                    (o) =>
                                        o.course_code?.toLowerCase() === input ||
                                        o.course_description?.toLowerCase() === input,
                                );
                                if (exact.length > 0) return exact;

                                const startsWith = options.filter(
                                    (o) =>
                                        o.course_code?.toLowerCase().startsWith(input) ||
                                        o.course_description?.toLowerCase().startsWith(input),
                                );
                                if (startsWith.length > 0) return startsWith;

                                return options.filter(
                                    (o) =>
                                        o.course_code?.toLowerCase().includes(input) ||
                                        o.course_description?.toLowerCase().includes(input),
                                );
                            }}
                            renderInput={(params) => (
                                <TextField {...params} label="Select Course" size="small" />
                            )}
                        />
                        <Button
                            variant="contained"
                            onClick={addPendingCourse}
                            disabled={!selectedCourseToTag}
                            startIcon={<AddIcon />}
                        >
                            Add
                        </Button>
                    </Box>

                    {pendingCourseTags.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography fontWeight="bold" mb={1}>To Tag</Typography>
                            {pendingCourseTags.map((course) => (
                                <Box
                                    key={course.course_id}
                                    sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}
                                >
                                    <Typography>
                                        {course.course_code} - {course.course_description}
                                    </Typography>
                                    <IconButton size="small" onClick={() => removePendingCourse(course.course_id)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    )}

                    <Typography fontWeight="bold" mb={1}>Already Tagged</Typography>
                    {taggedSubjects.length > 0 ? (
                        taggedSubjects.map((item) => (
                            <Box
                                key={item.section_subject_id}
                                sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}
                            >
                                <Typography>
                                    {item.course_code} - {item.course_description}
                                </Typography>
                                {canDelete && (
                                    <Button
                                        size="small"
                                        color="error"
                                        onClick={() => requestUntag(item)}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </Box>
                        ))
                    ) : (
                        <Typography color="text.secondary">No subjects tagged yet.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setTagModalOpen(false);
                            setPendingCourseTags([]);
                            setActiveTagSectionId("");
                            setActiveTagSectionLabel("");
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        disabled={pendingCourseTags.length === 0 || savingTags}
                        onClick={handleSaveTags}
                    >
                        Save Tags
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={Boolean(editTarget)}
                onClose={() => {
                    if (savingEditSlots) return;
                    setEditTarget(null);
                    setEditSlotsValue("");
                }}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>Edit Slots</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2 }}>
                        {editTarget?.program_code}-{editTarget?.section_description || ""} — {editTarget?.course_code || ""}
                    </Typography>
                    <TextField
                        type="number"
                        label="Max Slots"
                        fullWidth
                        value={editSlotsValue}
                        onChange={(e) => setEditSlotsValue(e.target.value)}
                        inputProps={{ min: 0 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            setEditTarget(null);
                            setEditSlotsValue("");
                        }}
                        disabled={savingEditSlots}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveEditSlots}
                        disabled={savingEditSlots}
                        sx={{ backgroundColor: colors.mainButton || headerColor }}
                    >
                        {savingEditSlots ? "Saving..." : "Save"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(untagTarget)} onClose={() => { setUntagTarget(null); setUntagCheck(null); }}>
                <DialogTitle>Remove Tagged Subject</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 1 }}>
                        Remove {untagTarget?.course_code} from this section?
                    </Typography>
                    {untagCheck?.has_schedule ? (
                        <Typography color="warning.main">
                            This subject has a schedule in Schedule Checker. Removing the tag will not delete the schedule.
                        </Typography>
                    ) : null}
                    {Number(untagCheck?.enrolled_count) > 0 ? (
                        <Typography color="error">
                            Cannot remove while {untagCheck.enrolled_count} student(s) are enrolled.
                        </Typography>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setUntagTarget(null); setUntagCheck(null); }}>Cancel</Button>
                    <Button
                        color="error"
                        variant="contained"
                        disabled={Number(untagCheck?.enrolled_count) > 0}
                        onClick={handleConfirmUntag}
                    >
                        Yes, Remove
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

export default SectionSlotManagement;
