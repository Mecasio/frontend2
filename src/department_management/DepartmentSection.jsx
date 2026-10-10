import React, {
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
  memo,
  useRef,
} from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Typography,
  Button,
  Snackbar,
  Alert,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import TextField from "@mui/material/TextField";
import SearchIcon from "@mui/icons-material/Search";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const formatSchoolYear = (yearDesc) => {
  if (!yearDesc) return "";
  const startYear = Number(yearDesc);
  if (isNaN(startYear)) return yearDesc;
  return `${startYear} - ${startYear + 1}`;
};

const getCurriculumLabel = (option) =>
  `${formatSchoolYear(option.year_description)}: (${option.program_code}) ${option.program_description} ${option.major || ""}`;

const sectionDescriptionCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const sortSectionsByDescription = (sections) =>
  [...sections].sort((first, second) => {
    const firstDescription = String(first.description ?? "").trim();
    const secondDescription = String(second.description ?? "").trim();
    const lengthDifference =
      [...firstDescription].length - [...secondDescription].length;

    return lengthDifference || sectionDescriptionCollator.compare(firstDescription, secondDescription);
  });

const filterAutocompleteOptions = (
  options,
  { inputValue },
  getLabel,
  limit = 100,
  includeAllMatches = false,
) => {
  const input = inputValue.trim().toLowerCase();
  if (!input) return options.slice(0, limit);
  const matches = options.filter((option) =>
    getLabel(option).toLowerCase().includes(input),
  );
  return includeAllMatches ? matches : matches.slice(0, limit);
};

const DepartmentSectionFormDialog = memo(
  ({
    open,
    mode,
    editId,
    initialForm,
    onClose,
    onSave,
    uniqueCurriculumList,
    sectionsList,
    yearLevels,
    headerColor,
  }) => {
    const [form, setForm] = useState(initialForm);

    useEffect(() => {
      setForm(initialForm);
    }, [initialForm]);

    const curriculumById = useMemo(() => {
      const map = new Map();
      uniqueCurriculumList.forEach((item) => {
        map.set(String(item.curriculum_id), item);
      });
      return map;
    }, [uniqueCurriculumList]);

    const sectionById = useMemo(() => {
      const map = new Map();
      sectionsList.forEach((item) => {
        map.set(String(item.id), item);
      });
      return map;
    }, [sectionsList]);

    const selectedCurriculum = useMemo(
      () => curriculumById.get(String(form.curriculum_id)) || null,
      [curriculumById, form.curriculum_id],
    );

    const selectedSection = useMemo(
      () => sectionById.get(String(form.section_id)) || null,
      [sectionById, form.section_id],
    );

    const curriculumAutocompleteOptions = useMemo(
      () => uniqueCurriculumList.slice(0, 100),
      [uniqueCurriculumList],
    );

    const sortedSectionsList = useMemo(
      () => sortSectionsByDescription(sectionsList),
      [sectionsList],
    );
    const sectionAutocompleteOptions = useMemo(
      () => sortedSectionsList.slice(0, 100),
      [sortedSectionsList],
    );

    const handleSave = () => {
      onSave(form, mode === "edit", editId);
    };

    if (!open) return null;

    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        keepMounted={false}
        transitionDuration={{ enter: 150, exit: 0 }}
        PaperProps={{
          sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 },
        }}
      >
        <DialogTitle
          sx={{
            background: headerColor || "#1976d2",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.1rem",
            py: 2,
          }}
        >
          {mode === "edit"
            ? "Edit Department Section"
            : "Add Department Section"}
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Typography fontWeight="bold" mb={1} mt={2}>
            Curriculum
          </Typography>
          <Autocomplete
            options={curriculumAutocompleteOptions}
            fullWidth
            disablePortal
            openOnFocus={false}
            getOptionLabel={getCurriculumLabel}
            value={selectedCurriculum}
            onChange={(e, newValue) => {
              setForm((prev) => ({
                ...prev,
                curriculum_id: newValue ? newValue.curriculum_id : "",
              }));
            }}
            isOptionEqualToValue={(option, value) =>
              String(option.curriculum_id) === String(value.curriculum_id)
            }
            filterOptions={(options, state) =>
              filterAutocompleteOptions(
                uniqueCurriculumList,
                state,
                getCurriculumLabel,
              )
            }
            ListboxProps={{ style: { maxHeight: 280 } }}
            renderInput={(params) => (
              <TextField {...params} label="Curriculum" sx={{ mb: 2 }} />
            )}
          />

          <Typography fontWeight="bold" mb={1}>
            Section
          </Typography>
          <Autocomplete
            options={sectionAutocompleteOptions}
            fullWidth
            disablePortal
            openOnFocus={false}
            getOptionLabel={(option) => option.description || ""}
            value={selectedSection}
            onChange={(e, newValue) => {
              setForm((prev) => ({
                ...prev,
                section_id: newValue ? newValue.id : "",
              }));
            }}
            isOptionEqualToValue={(option, value) =>
              String(option.id) === String(value.id)
            }
            filterOptions={(options, state) =>
              filterAutocompleteOptions(
                sortedSectionsList,
                state,
                (option) => option.description || "",
                100,
                true,
              )
            }
            ListboxProps={{ style: { maxHeight: 280 } }}
            renderInput={(params) => (
              <TextField {...params} label="Section" sx={{ mb: 2 }} />
            )}
          />

          <Typography fontWeight="bold" mb={1}>
            Year Level
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="year-level-label">Year Level</InputLabel>
            <Select
              labelId="year-level-label"
              label="Year Level"
              value={form.year_level_id ? String(form.year_level_id) : ""}
              onChange={(e) => {
                setForm((prev) => ({
                  ...prev,
                  year_level_id: e.target.value,
                }));
              }}
            >
              {yearLevels.map((yl) => (
                <MenuItem
                  key={yl.year_level_id}
                  value={String(yl.year_level_id)}
                >
                  {yl.year_level_description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button
            color="error"
            variant="outlined"
            sx={{ textTransform: "none", fontWeight: 600 }}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            sx={{ px: 4, fontWeight: 600, textTransform: "none" }}
            onClick={handleSave}
          >
            <SaveIcon fontSize="small" sx={{ mr: 0.5 }} /> Save
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);

DepartmentSectionFormDialog.displayName = "DepartmentSectionFormDialog";

const EMPTY_FORM = {
  curriculum_id: "",
  section_id: "",
  year_level_id: "",
};

const DepartmentSectionGrid = memo(
  ({
    paginatedGrouped,
    uniqueCurriculumList,
    borderColor,
    headerColor,
    canEdit,
    canDelete,
    onEdit,
    onDelete,
    onToggleStatus,
  }) => (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
        gap: 2,
        alignItems: "stretch",
      }}
    >
      {Object.entries(paginatedGrouped).map(([currId, sections]) => {
        const curriculum = uniqueCurriculumList.find(
          (c) => String(c.curriculum_id) === String(currId),
        );
        if (!curriculum) return null;

        return (
          <Box
            key={currId}
            sx={{
              border: `1px solid ${borderColor}`,
              borderRadius: 2,
              overflow: "hidden",
              backgroundColor: "#fff",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{ backgroundColor: headerColor || "#1976d2", px: 2, py: 1.5 }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Box
                  sx={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: "bold",
                    px: 1,
                    py: 0.3,
                    borderRadius: "20px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {curriculum.program_code}
                </Box>
                <Typography
                  fontSize="13px"
                  fontWeight="bold"
                  color="#fff"
                  sx={{ lineHeight: 1.3 }}
                >
                  {curriculum.program_description}
                </Typography>
              </Box>
              {curriculum.major && (
                <Typography
                  fontSize="11px"
                  color="rgba(255,255,255,0.8)"
                  mt={0.3}
                >
                  {curriculum.major}
                </Typography>
              )}
              <Typography
                fontSize="11px"
                color="rgba(255,255,255,0.7)"
                mt={0.3}
              >
                {formatSchoolYear(curriculum.year_description)} &nbsp;·&nbsp;{" "}
                {sections.length} section{sections.length !== 1 ? "s" : ""}
              </Typography>
            </Box>

            <Box sx={{ flex: 1 }}>
              {sections.length === 0 ? (
                <Typography
                  fontSize="12px"
                  color="text.secondary"
                  sx={{ px: 2, py: 1.5, fontStyle: "italic" }}
                >
                  No sections assigned
                </Typography>
              ) : (
                sections.map((ds, idx) => (
                  <Box
                    key={ds.department_section_id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      px: 2,
                      py: 0.8,
                      borderTop:
                        idx === 0 ? "none" : `1px solid ${borderColor}`,
                      gap: 1,
                      flexWrap: "wrap",
                      backgroundColor: idx % 2 === 0 ? "#ffffff" : "lightgray",
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 140 }}>
                      <Typography fontSize="13px" fontWeight="500">
                        {ds.section_description}
                      </Typography>
                      <Typography fontSize="11px" color="text.secondary">
                        {ds.year_level_description || "No year level"}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 0,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Switch
                          size="small"
                          checked={Number(ds.dsstat) === 1}
                          onChange={(e) =>
                            onToggleStatus(
                              ds.department_section_id,
                              e.target.checked ? 1 : 0,
                            )
                          }
                          disabled={!canEdit}
                        />
                        <Typography
                          fontSize="11px"
                          sx={{
                            minWidth: 44,
                            color:
                              Number(ds.dsstat) === 1
                                ? "success.main"
                                : "text.disabled",
                          }}
                        >
                          {Number(ds.dsstat) === 1 ? "Active" : "Inactive"}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      {canEdit && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => onEdit(ds)}
                          sx={{
                            backgroundColor: "green",
                            color: "white",
                            minWidth: 0,
                            width: "75px",
                            px: 1,
                            py: 0.4,
                            fontSize: "11px",
                            textTransform: "none",
                          }}
                        >
                          <EditIcon sx={{ fontSize: 13, mr: 0.4 }} /> Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => onDelete(ds)}
                          sx={{
                            backgroundColor: "#9E0000",
                            color: "white",
                            minWidth: 0,
                            px: 1,
                            py: 0.4,
                            width: "75px",
                            fontSize: "11px",
                            textTransform: "none",
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 13, mr: 0.4 }} /> Delete
                        </Button>
                      )}
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  ),
);

DepartmentSectionGrid.displayName = "DepartmentSectionGrid";

const DepartmentSection = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";

  const [titleColor, setTitleColor] = useState("#000000");
  const [borderColor, setBorderColor] = useState("#000000");

  useEffect(() => {
    if (!settings) return;
    if (colors.title) setTitleColor(colors.title);
    if (colors.border) setBorderColor(colors.border);
  }, [settings]);

  const [curriculumList, setCurriculumList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);
  const [yearLevels, setYearLevels] = useState([]);
  const [departmentSections, setDepartmentSections] = useState([]);
  const departmentSectionsRef = useRef(departmentSections);

  useEffect(() => {
    departmentSectionsRef.current = departmentSections;
  }, [departmentSections]);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [employeeID, setEmployeeID] = useState("");

  const [deptSearchQuery, setDeptSearchQuery] = useState("");
  const [formDialogState, setFormDialogState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const pageId = 20;

  const getPermissionHeaders = () => ({
    ...getFlatAuditHeaders(),
    "x-employee-id": employeeID || localStorage.getItem("employee_id") || "",
    "x-page-id": pageId,
    "x-audit-actor-id": employeeID || localStorage.getItem("employee_id") || "",
    "x-audit-actor-role":
      userRole || localStorage.getItem("role") || "administrator",
  });

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
      if (response.data && Number(response.data.page_privilege) === 1) {
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
      setCanCreate(false);
      setCanEdit(false);
      setCanDelete(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurriculum();
    fetchSections();
    fetchYearLevels();
    fetchDepartmentSections();
  }, []);

  const fetchYearLevels = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/get_year_level`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setYearLevels(response.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCurriculum = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/get_active_curriculum`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setCurriculumList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/section_table`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setSectionsList(response.data || []);
    } catch (err) {
      console.error(err);
      setSectionsList([]);
    }
  };

  const fetchDepartmentSections = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/department_section`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
      );
      setDepartmentSections(response.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const uniqueCurriculumList = useMemo(() => {
    const map = new Map();
    curriculumList.forEach((curriculum) => {
      const key = String(curriculum.curriculum_id);
      if (!map.has(key)) map.set(key, curriculum);
    });
    return Array.from(map.values()).sort(
      (a, b) => Number(a.year_description) - Number(b.year_description),
    );
  }, [curriculumList]);

  const filteredGrouped = useMemo(() => {
    const groupedSections = departmentSections.reduce((acc, ds) => {
      const key = ds.curriculum_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(ds);
      return acc;
    }, {});

    const search = deptSearchQuery.trim().toLowerCase();

    return Object.entries(groupedSections).reduce((acc, [currId, sections]) => {
      const curriculum = uniqueCurriculumList.find(
        (c) => String(c.curriculum_id) === String(currId),
      );
      if (!curriculum) return acc;

      const programLabel =
        `${formatSchoolYear(curriculum.year_description)} ${curriculum.program_code} ${curriculum.program_description} ${curriculum.major || ""}`.toLowerCase();

      const matchedSections = sections.filter((ds) => {
        if (!search) return true;
        const sectionDesc = (ds.section_description || "").toLowerCase();
        const yearLevelDesc = (ds.year_level_description || "").toLowerCase();
        const status = ds.dsstat === 1 ? "active" : "inactive";
        return (
          programLabel.includes(search) ||
          sectionDesc.includes(search) ||
          yearLevelDesc.includes(search) ||
          status.includes(search)
        );
      });

      if (matchedSections.length > 0) {
        acc[currId] = matchedSections;
      }
      return acc;
    }, {});
  }, [departmentSections, uniqueCurriculumList, deptSearchQuery]);

  // 📄 Pagination — same behavior as Department Registration / Program Panel,
  // paginated per curriculum "card" since this page is grid-based, not row-based.
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const filteredGroupedEntries = useMemo(
    () => Object.entries(filteredGrouped),
    [filteredGrouped],
  );

  const totalPages =
    Math.ceil(filteredGroupedEntries.length / itemsPerPage) || 1;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  const paginatedGrouped = useMemo(
    () =>
      Object.fromEntries(
        filteredGroupedEntries.slice(indexOfFirstItem, indexOfLastItem),
      ),
    [filteredGroupedEntries, indexOfFirstItem, indexOfLastItem],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [deptSearchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const buildDepartmentSectionRow = useCallback(
    (formData, overrides = {}) => {
      const curriculum = uniqueCurriculumList.find(
        (item) => String(item.curriculum_id) === String(formData.curriculum_id),
      );
      const section = sectionsList.find(
        (item) => String(item.id) === String(formData.section_id),
      );
      const yearLevel = yearLevels.find(
        (item) => String(item.year_level_id) === String(formData.year_level_id),
      );

      return {
        department_section_id: overrides.department_section_id,
        curriculum_id: formData.curriculum_id,
        section_id: formData.section_id,
        year_level_id: formData.year_level_id,
        dsstat: overrides.dsstat ?? 0,
        program_code: curriculum?.program_code || "",
        program_description: curriculum?.program_description || "",
        major: curriculum?.major || "",
        year_description: curriculum?.year_description || "",
        section_description: section?.description || "",
        year_level_description: yearLevel?.year_level_description || "",
        dprtmnt_id: overrides.dprtmnt_id ?? null,
      };
    },
    [uniqueCurriculumList, sectionsList, yearLevels],
  );

  const handleSaveDepartmentSection = useCallback(
    (formData, isEdit, editId) => {
      const { curriculum_id, section_id, year_level_id } = formData;
      if (!curriculum_id || !section_id || !year_level_id) {
        setSnackbar({
          open: true,
          message: "Please select curriculum, section, and year level.",
          severity: "error",
        });
        return false;
      }

      if (isEdit && !canEdit) {
        setSnackbar({
          open: true,
          message: "You do not have permission to edit items on this page.",
          severity: "error",
        });
        return false;
      }

      if (!isEdit && !canCreate) {
        setSnackbar({
          open: true,
          message: "You do not have permission to create items on this page.",
          severity: "error",
        });
        return false;
      }

      const previousSections = departmentSectionsRef.current;
      setFormDialogState(null);

      if (isEdit) {
        setDepartmentSections((prev) =>
          prev.map((row) => {
            if (String(row.department_section_id) !== String(editId))
              return row;
            return buildDepartmentSectionRow(formData, {
              department_section_id: editId,
              dsstat: row.dsstat,
              dprtmnt_id: row.dprtmnt_id,
            });
          }),
        );

        axios
          .put(`${API_BASE_URL}/api/department_section/${editId}`, formData, {
            headers: getPermissionHeaders(),
          })
          .then(() => {
            setSnackbar({
              open: true,
              message: "Department section updated successfully!",
              severity: "success",
            });
          })
          .catch((err) => {
            setDepartmentSections(previousSections);
            console.error(err);
            setSnackbar({
              open: true,
              message:
                err.response?.data?.message ||
                "Failed to save department section.",
              severity: "error",
            });
          });

        return true;
      }

      const tempId = `temp-${Date.now()}`;
      setDepartmentSections((prev) => [
        ...prev,
        buildDepartmentSectionRow(formData, {
          department_section_id: tempId,
          dsstat: 0,
        }),
      ]);

      axios
        .post(`${API_BASE_URL}/api/department_section`, formData, {
          headers: getPermissionHeaders(),
        })
        .then((response) => {
          const newId = response.data?.sectionId;
          if (!newId) return;
          setDepartmentSections((prev) =>
            prev.map((row) =>
              String(row.department_section_id) === String(tempId)
                ? { ...row, department_section_id: newId }
                : row,
            ),
          );
          setSnackbar({
            open: true,
            message: "Department section added successfully!",
            severity: "success",
          });
        })
        .catch((err) => {
          setDepartmentSections((prev) =>
            prev.filter(
              (row) => String(row.department_section_id) !== String(tempId),
            ),
          );
          console.error(err);
          setSnackbar({
            open: true,
            message:
              err.response?.data?.message ||
              "Failed to save department section.",
            severity: "error",
          });
        });

      return true;
    },
    [canCreate, canEdit, employeeID, userRole, buildDepartmentSectionRow],
  );

  const closeFormDialog = useCallback(() => {
    setFormDialogState(null);
  }, []);

  const openAddDialog = useCallback(() => {
    setFormDialogState({
      mode: "add",
      editId: null,
      initialForm: EMPTY_FORM,
    });
  }, []);

  const openEditDepartmentSection = useCallback(
    (section) => {
      if (!canEdit) return;
      setFormDialogState({
        mode: "edit",
        editId: section.department_section_id,
        initialForm: {
          curriculum_id: section.curriculum_id ?? "",
          section_id: section.section_id ?? "",
          year_level_id: section.year_level_id ?? "",
        },
      });
    },
    [canEdit],
  );

  const handleDeleteRequest = useCallback((section) => {
    setDeleteTarget(section);
  }, []);

  const handleToggleStatus = useCallback(
    async (departmentSectionId, value) => {
      if (value === null) return;
      if (!canEdit) {
        setSnackbar({
          open: true,
          message: "You do not have permission to edit items on this page.",
          severity: "error",
        });
        return;
      }

      const previousSections = departmentSections;
      setDepartmentSections((prev) =>
        prev.map((row) =>
          String(row.department_section_id) === String(departmentSectionId)
            ? { ...row, dsstat: value }
            : row,
        ),
      );

      try {
        await axios.put(
          `${API_BASE_URL}/api/department_section/${departmentSectionId}/status`,
          { dsstat: value },
          { headers: getPermissionHeaders() },
        );
        setSnackbar({
          open: true,
          message: `Department section ${value === 1 ? "activated" : "deactivated"} successfully!`,
          severity: "success",
        });
      } catch (err) {
        setDepartmentSections(previousSections);
        console.error(err);
        setSnackbar({
          open: true,
          message: err.response?.data?.message || "Failed to update status.",
          severity: "error",
        });
      }
    },
    [canEdit, departmentSections, employeeID, userRole],
  );

  const handleDeleteDepartmentSection = async () => {
    if (!deleteTarget) return;
    if (!canDelete) {
      setSnackbar({
        open: true,
        message: "You do not have permission to delete items on this page.",
        severity: "error",
      });
      return;
    }

    const deletedId = deleteTarget.department_section_id;
    const previousSections = departmentSections;

    setDeleteTarget(null);
    setDepartmentSections((prev) =>
      prev.filter(
        (row) => String(row.department_section_id) !== String(deletedId),
      ),
    );

    try {
      await axios.delete(
        `${API_BASE_URL}/api/department_section/${deletedId}`,
        {
          headers: getPermissionHeaders(),
        },
      );
      setSnackbar({
        open: true,
        message: "Department section deleted successfully!",
        severity: "success",
      });
    } catch (err) {
      setDepartmentSections(previousSections);
      console.error(err);
      setSnackbar({
        open: true,
        message:
          err.response?.data?.message || "Failed to delete department section.",
        severity: "error",
      });
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
    <Box
      sx={{
        height: "calc(100vh - 150px)",
        overflowY: "auto",
        paddingRight: 1,
        backgroundColor: "transparent",
        mt: 1,
        padding: 2,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}
        >
          DEPARTMENT SECTION PANEL
        </Typography>
        <TextField
          variant="outlined"
          placeholder="Search Year / Program / Section / Year Level"
          size="small"
          value={deptSearchQuery}
          onChange={(e) => setDeptSearchQuery(e.target.value)}
          sx={{
            width: 450,
            backgroundColor: "#fff",
            borderRadius: 1,
            "& .MuiOutlinedInput-root": { borderRadius: "10px" },
          }}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: "gray" }} />,
          }}
        />
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />

      {/* Total Records + Pagination Bar (same style as Department Registration / Program Panel) */}
      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: headerColor, color: "white" }}>
            <TableRow>
              <TableCell
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor,
                  color: "white",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  sx={{ padding: "6px" }}
                >
                  {/* LEFT SIDE - TOTALS */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Programs: {filteredGroupedEntries.length} &nbsp;|&nbsp;
                    Total Sections: {departmentSections.length}
                  </Typography>

                  {/* RIGHT SIDE - PAGINATION */}
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    <Button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        "&:hover": {
                          borderColor: "white",
                          backgroundColor: "rgba(255,255,255,0.1)",
                        },
                        "&.Mui-disabled": {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        },
                      }}
                    >
                      First
                    </Button>
                    <Button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        "&:hover": {
                          borderColor: "white",
                          backgroundColor: "rgba(255,255,255,0.1)",
                        },
                        "&.Mui-disabled": {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        },
                      }}
                    >
                      Prev
                    </Button>

                    {/* Page Dropdown */}
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) => setCurrentPage(Number(e.target.value))}
                        displayEmpty
                        sx={{
                          fontSize: "12px",
                          height: 36,
                          color: "white",
                          border: "1px solid white",
                          backgroundColor: "transparent",
                          ".MuiOutlinedInput-notchedOutline": {
                            borderColor: "white",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "white",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "white",
                          },
                          "& svg": {
                            color: "white",
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              backgroundColor: "#fff",
                            },
                          },
                        }}
                      >
                        {Array.from({ length: totalPages }, (_, i) => (
                          <MenuItem key={i + 1} value={i + 1}>
                            Page {i + 1}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Typography fontSize="11px" color="white">
                      of {totalPages} page{totalPages > 1 ? "s" : ""}
                    </Typography>

                    {/* Next & Last */}
                    <Button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        "&:hover": {
                          borderColor: "white",
                          backgroundColor: "rgba(255,255,255,0.1)",
                        },
                        "&.Mui-disabled": {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        },
                      }}
                    >
                      Next
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        "&:hover": {
                          borderColor: "white",
                          backgroundColor: "rgba(255,255,255,0.1)",
                        },
                        "&.Mui-disabled": {
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          opacity: 1,
                        },
                      }}
                    >
                      Last
                    </Button>

                    {canCreate && (
                      <Button
                        variant="contained"
                        onClick={openAddDialog}
                        sx={{
                          backgroundColor: "#1976d2",
                          color: "#fff",
                          fontWeight: "bold",
                          borderRadius: "8px",
                          width: "250px",
                          textTransform: "none",
                          px: 2,
                          mr: "15px",
                          "&:hover": {
                            backgroundColor: "#1565c0",
                          },
                        }}
                      >
                        + Add Department Section
                      </Button>
                    )}
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>


      <Box
        sx={{
          backgroundColor: "white",
          border: `2px solid ${borderColor}`,

          padding: 2,

        }}
      >
        {/* Cards Grid */}
        <DepartmentSectionGrid
          paginatedGrouped={paginatedGrouped}
          uniqueCurriculumList={uniqueCurriculumList}
          borderColor={borderColor}
          headerColor={headerColor}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={openEditDepartmentSection}
          onDelete={handleDeleteRequest}
          onToggleStatus={handleToggleStatus}
        />

        {filteredGroupedEntries.length === 0 && (
          <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
            <Typography fontSize="16px">No department sections found.</Typography>
          </Box>
        )}

      </Box>

      {/* Bottom Pagination Bar (mirrors the top bar) */}
      {filteredGroupedEntries.length > 0 && (
        <TableContainer component={Paper} sx={{ width: "100%" }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: headerColor, color: "white" }}>
              <TableRow>
                <TableCell
                  sx={{
                    border: `1px solid ${borderColor}`,
                    py: 0.5,
                    backgroundColor: headerColor,
                    color: "white",
                  }}
                >
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap="wrap"
                    sx={{ padding: "6px" }}
                  >
                    <Typography fontSize="14px" fontWeight="bold" color="white">
                      Total Programs: {filteredGroupedEntries.length} &nbsp;|&nbsp;
                      Total Sections: {departmentSections.length}
                    </Typography>

                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <Button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        variant="outlined"
                        size="small"
                        sx={{
                          minWidth: 80,
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          "&:hover": {
                            borderColor: "white",
                            backgroundColor: "rgba(255,255,255,0.1)",
                          },
                          "&.Mui-disabled": {
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            opacity: 1,
                          },
                        }}
                      >
                        First
                      </Button>
                      <Button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        variant="outlined"
                        size="small"
                        sx={{
                          minWidth: 80,
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          "&:hover": {
                            borderColor: "white",
                            backgroundColor: "rgba(255,255,255,0.1)",
                          },
                          "&.Mui-disabled": {
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            opacity: 1,
                          },
                        }}
                      >
                        Prev
                      </Button>

                      <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select
                          value={currentPage}
                          onChange={(e) => setCurrentPage(Number(e.target.value))}
                          displayEmpty
                          sx={{
                            fontSize: "12px",
                            height: 36,
                            color: "white",
                            border: "1px solid white",
                            backgroundColor: "transparent",
                            ".MuiOutlinedInput-notchedOutline": {
                              borderColor: "white",
                            },
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                              borderColor: "white",
                            },
                            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                              borderColor: "white",
                            },
                            "& svg": {
                              color: "white",
                            },
                          }}
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                maxHeight: 200,
                                backgroundColor: "#fff",
                              },
                            },
                          }}
                        >
                          {Array.from({ length: totalPages }, (_, i) => (
                            <MenuItem key={i + 1} value={i + 1}>
                              Page {i + 1}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Typography fontSize="11px" color="white">
                        of {totalPages} page{totalPages > 1 ? "s" : ""}
                      </Typography>

                      <Button
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        variant="outlined"
                        size="small"
                        sx={{
                          minWidth: 80,
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          "&:hover": {
                            borderColor: "white",
                            backgroundColor: "rgba(255,255,255,0.1)",
                          },
                          "&.Mui-disabled": {
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            opacity: 1,
                          },
                        }}
                      >
                        Next
                      </Button>
                      <Button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        variant="outlined"
                        size="small"
                        sx={{
                          minWidth: 80,
                          color: "white",
                          borderColor: "white",
                          backgroundColor: "transparent",
                          "&:hover": {
                            borderColor: "white",
                            backgroundColor: "rgba(255,255,255,0.1)",
                          },
                          "&.Mui-disabled": {
                            color: "white",
                            borderColor: "white",
                            backgroundColor: "transparent",
                            opacity: 1,
                          },
                        }}
                      >
                        Last
                      </Button>
                    </Box>
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
          </Table>
        </TableContainer>
      )}

      {/* Add / Edit Dialog */}
      {formDialogState && (
        <DepartmentSectionFormDialog
          open
          mode={formDialogState.mode}
          editId={formDialogState.editId}
          initialForm={formDialogState.initialForm}
          onClose={closeFormDialog}
          onSave={handleSaveDepartmentSection}
          uniqueCurriculumList={uniqueCurriculumList}
          sectionsList={sectionsList}
          yearLevels={yearLevels}
          headerColor={headerColor}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        maxWidth="sm"
        fullWidth
        keepMounted={false}
        transitionDuration={150}
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: 6,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.2rem",
            py: 2,
          }}
        >
          Delete Department Section
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete this department section?
          </Typography>

          {deleteTarget && (
            <Box
              sx={{ mb: 2, p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}
            >
              <Typography fontSize="14px">
                <strong>Section:</strong> {deleteTarget.section_description}
              </Typography>
              <Typography fontSize="14px">
                <strong>Year Level:</strong>{" "}
                {deleteTarget.year_level_description || "—"}
              </Typography>
            </Box>
          )}

          <Typography
            sx={{
              color: "#d32f2f",
              fontSize: "0.95rem",
            }}
          >
            Deleting this department section will permanently remove it from the
            department section list.
            <br />
            Any faculty assignments, schedules, or records associated with this
            department section may be affected.
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e0e0e0",
          }}
        >
          <Button
            color="error"
            variant="outlined"
            onClick={() => setDeleteTarget(null)}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteDepartmentSection}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DepartmentSection;
