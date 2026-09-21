import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  TextField,
  Button,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Grid,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  CircularProgress,
  IconButton,
} from "@mui/material";
import EaristLogo from "../assets/EaristLogo.png";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";

// ---------------------------------------------------------------------------
// Shared style constants — copied 1:1 from Department Registration so both
// pages look and behave the same way (pagination bar, plain bordered/striped
// tables, green/red row action buttons, colored modal headers).
// ---------------------------------------------------------------------------

const pagerBtnSx = {
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
};

const pagerSelectSx = {
  fontSize: "12px",
  height: 36,
  color: "white",
  border: "1px solid white",
  backgroundColor: "transparent",
  ".MuiOutlinedInput-notchedOutline": { borderColor: "white" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
  "& svg": { color: "white" },
};

const addBarButtonSx = {
  backgroundColor: "#1976d2",
  color: "#fff",
  fontWeight: "bold",
  borderRadius: "8px",
  minWidth: "200px",
  textTransform: "none",
  px: 2,
  mr: "15px",
  "&:hover": { backgroundColor: "#1565c0" },
};

const editRowBtnSx = {
  backgroundColor: "green",
  color: "white",
  borderRadius: "5px",
  padding: "8px",
  width: "100px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "5px",
  cursor: "pointer",
  "&:hover": { backgroundColor: "#0b7a0b" },
};

const deleteRowBtnSx = {
  backgroundColor: "#9E0000",
  color: "white",
  borderRadius: "5px",
  padding: "8px",
  width: "100px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "5px",
  cursor: "pointer",
  "&:hover": { backgroundColor: "#7a0000" },
};

const searchFieldSx = {
  width: 380,
  backgroundColor: "#fff",
  borderRadius: 1,
  "& .MuiOutlinedInput-root": { borderRadius: "10px" },
};

// ---------------------------------------------------------------------------
// PaginationBar — the "Total Records + First/Prev/Page/Next/Last (+ Add)"
// bar, rendered above and below every table, exactly like Department Reg.
// ---------------------------------------------------------------------------

const PaginationBar = ({
  headerColor,
  borderColor,
  totalLabel,
  currentPage,
  totalPages,
  onPageChange,
  showAddButton,
  addButtonLabel,
  onAdd,
}) => (
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
                {totalLabel}
              </Typography>

              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Button
                  onClick={() => onPageChange(1)}
                  disabled={currentPage === 1}
                  variant="outlined"
                  size="small"
                  sx={pagerBtnSx}
                >
                  First
                </Button>
                <Button
                  onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1}
                  variant="outlined"
                  size="small"
                  sx={pagerBtnSx}
                >
                  Prev
                </Button>

                <FormControl size="small" sx={{ minWidth: 80 }}>
                  <Select
                    value={currentPage}
                    onChange={(e) => onPageChange(Number(e.target.value))}
                    displayEmpty
                    sx={pagerSelectSx}
                    MenuProps={{
                      PaperProps: { sx: { maxHeight: 200, backgroundColor: "#fff" } },
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
                  onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  variant="outlined"
                  size="small"
                  sx={pagerBtnSx}
                >
                  Next
                </Button>
                <Button
                  onClick={() => onPageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  variant="outlined"
                  size="small"
                  sx={pagerBtnSx}
                >
                  Last
                </Button>

                {showAddButton && (
                  <Button variant="contained" sx={addBarButtonSx} onClick={onAdd}>
                    {addButtonLabel}
                  </Button>
                )}
              </Box>
            </Box>
          </TableCell>
        </TableRow>
      </TableHead>
    </Table>
  </TableContainer>
);

// ---------------------------------------------------------------------------
// PlainTable — bordered header row (#F5F5F5 / black text), bordered cells,
// odd/even striped body rows. Same visual language as Department Reg.
// ---------------------------------------------------------------------------

const PlainTable = ({
  headers,
  showActionColumn,
  borderColor,
  children,
  emptyMessage,
  colSpanOverride,
}) => (
  <Table size="small">
    <TableHead>
      <TableRow
        style={{
          border: `1px solid ${borderColor}`,
          backgroundColor: "#F5F5F5",
          color: "#000",
          textAlign: "center",
        }}
      >
        {headers.map(
          (header) =>
            (header !== "Actions" || showActionColumn) && (
              <TableCell
                key={header}
                sx={{ color: "#000", border: `1px solid ${borderColor}`, textAlign: "center" }}
              >
                {header}
              </TableCell>
            ),
        )}
      </TableRow>
    </TableHead>
    <TableBody
      sx={{
        border: `1px solid ${borderColor}`,
        "& .MuiTableRow-root:nth-of-type(odd)": { backgroundColor: "#ffffff" },
        "& .MuiTableRow-root:nth-of-type(even)": { backgroundColor: "lightgray" },
      }}
    >
      {React.Children.count(children) === 0 && (
        <TableRow>
          <TableCell
            colSpan={colSpanOverride || headers.length}
            sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}
          >
            <em>{emptyMessage}</em>
          </TableCell>
        </TableRow>
      )}
      {children}
    </TableBody>
  </Table>
);

// ---------------------------------------------------------------------------
// RowActions — the exact green "Edit" / red "Delete" buttons from
// Department Registration.
// ---------------------------------------------------------------------------

const RowActions = ({ canEdit, canDelete, onEdit, onDelete }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 1,
    }}
  >
    {canEdit && (
      <Button variant="contained" size="small" sx={editRowBtnSx} onClick={onEdit}>
        <EditIcon fontSize="small" /> Edit
      </Button>
    )}
    {canDelete && (
      <Button variant="contained" size="small" sx={deleteRowBtnSx} onClick={onDelete}>
        <DeleteIcon fontSize="small" /> Delete
      </Button>
    )}
  </Box>
);

// ---------------------------------------------------------------------------
// SectionHeader — plain section title + optional search box, replacing the
// old card headers/icons.
// ---------------------------------------------------------------------------

const SectionHeader = ({ titleColor, title, search, onSearchChange, placeholder, extra }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 2,
      mb: 1.5,
      mt: 3,
    }}
  >
    <Typography sx={{ fontWeight: "bold", color: titleColor, fontSize: "22px" }}>
      {title}
    </Typography>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      {extra}
      {onSearchChange && (
        <TextField
          variant="outlined"
          placeholder={placeholder}
          size="small"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={searchFieldSx}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: "gray" }} /> }}
        />
      )}
    </Box>
  </Box>
);

// ---------------------------------------------------------------------------
// Business constants (unchanged)
// ---------------------------------------------------------------------------

const FEE_CATEGORY = {
  TUITION: 2,
  MISCELLANEOUS: 3,
  OTHER: 5,
};

const COMPUTED_TUITION_FEE_RATE_ID = 0;

const feeCategoryOptions = [
  { value: FEE_CATEGORY.TUITION, label: "Tuition" },
  { value: FEE_CATEGORY.MISCELLANEOUS, label: "Miscellaneous" },
  { value: FEE_CATEGORY.OTHER, label: "Other" },
];

const normalizeFeeText = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizedFeeTokens = (fee) =>
  `${normalizeFeeText(fee?.fee_code)} ${normalizeFeeText(fee?.fee_name)}`;

const isNstpFee = (fee) => normalizedFeeTokens(fee).includes("NSTP");

const isTuitionCategory = (fee) => Number(fee?.fee_category) === FEE_CATEGORY.TUITION;

const isBaseComputedTuitionFee = (fee) => {
  const tokens = normalizedFeeTokens(fee);
  if (!tokens.trim() || isNstpFee(fee)) return false;

  return (
    tokens.includes("TUITION") ||
    tokens.includes("TUITION_FEE") ||
    tokens.includes("LEC_LAB") ||
    tokens.includes("UNIT_TUITION")
  );
};

const isComputedTuitionRate = (rate) =>
  Number(rate?.fee_rate_id) === COMPUTED_TUITION_FEE_RATE_ID || Boolean(rate?.isComputedTuition);

const itemsPerPage = 20;

// ---------------------------------------------------------------------------

const TOSF = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [stepperColor, setStepperColor] = useState("#000000");

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [branches, setBranches] = useState([
    { id: 1, branch: "Manila" },
    { id: 2, branch: "Cavite" },
  ]);

  useEffect(() => {
    if (!settings) return;

    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

    if (assets.logoUrl) {
      setFetchedLogo(assets.logoUrl);
    } else {
      setFetchedLogo(EaristLogo);
    }

    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
    const normalizedBranches = settings?.branches || [];
    if (normalizedBranches.length > 0) {
      setBranches(normalizedBranches);
    }
  }, [settings]);

  const headerColor = colors.header || "#1976d2";

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const pageId = 99;

  const [employeeID, setEmployeeID] = useState("");
  const permissionHeaders = {
    headers: {
      "x-employee-id": employeeID,
      "x-page-id": pageId,
      "x-audit-actor-id": employeeID,
      "x-audit-actor-role": userRole || localStorage.getItem("role") || "administrator",
    },
  };

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
      const response = await axios.get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
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
      setCanCreate(false);
      setCanEdit(false);
      setCanDelete(false);
      setLoading(false);
    }
  };

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const showSnackbar = (message, severity = "success") => setSnackbar({ open: true, message, severity });
  const handleSnackbarClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  // -------------------------------------------------------------------
  // Tab navigation
  // -------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState(0);

  // =====================================================================
  // FEE CATALOG
  // =====================================================================
  const defaultFeeCatalogForm = {
    fee_code: "",
    fee_name: "",
    fee_category: FEE_CATEGORY.OTHER,
    is_active: 1,
    sort_order: 1,
    fee_group: "",
    account_type: "",
  };

  const [feeCatalog, setFeeCatalog] = useState([]);
  const [feeCatalogForm, setFeeCatalogForm] = useState(defaultFeeCatalogForm);
  const [feeCatalogModalOpen, setFeeCatalogModalOpen] = useState(false);
  const [feeCatalogEditMode, setFeeCatalogEditMode] = useState(false);
  const [feeCatalogEditId, setFeeCatalogEditId] = useState(null);
  const [feeCatalogDeleteDialogOpen, setFeeCatalogDeleteDialogOpen] = useState(false);
  const [selectedFeeCatalog, setSelectedFeeCatalog] = useState(null);
  const [searchFeeCatalog, setSearchFeeCatalog] = useState("");
  const [feeCatalogPage, setFeeCatalogPage] = useState(1);

  // =====================================================================
  // FEE RATES
  // =====================================================================
  const defaultFeeRateForm = {
    fee_id: "",
    dprtmnt_curriculum_id: "",
    branch_id: "",
    amount: "",
    applied_to: 0,
    applies_to_all: 1,
    is_active: 1,
  };

  const [feeRates, setFeeRates] = useState([]);
  const [curriculumOptions, setCurriculumOptions] = useState([]);
  const [yearLevelOptions, setYearLevelOptions] = useState([]);
  const [feeRateForm, setFeeRateForm] = useState(defaultFeeRateForm);
  const [feeRateModalOpen, setFeeRateModalOpen] = useState(false);
  const [feeRateEditMode, setFeeRateEditMode] = useState(false);
  const [feeRateEditId, setFeeRateEditId] = useState(null);
  const [feeRateDeleteDialogOpen, setFeeRateDeleteDialogOpen] = useState(false);
  const [selectedFeeRate, setSelectedFeeRate] = useState(null);
  const [searchFeeRates, setSearchFeeRates] = useState("");
  const [feeRatePage, setFeeRatePage] = useState(1);

  const baseComputedTuitionRate = feeRates.find((rate) => isBaseComputedTuitionFee(rate)) || null;
  const baseComputedTuitionFee =
    baseComputedTuitionRate || feeCatalog.find((fee) => isBaseComputedTuitionFee(fee)) || null;
  const sortedScholarshipFeeRates = [...feeRates].sort((a, b) => {
    const tuitionCompare = Number(isTuitionCategory(b)) - Number(isTuitionCategory(a));
    if (tuitionCompare !== 0) return tuitionCompare;
    return (
      Number(a.sort_order ?? 999999) - Number(b.sort_order ?? 999999) ||
      String(a.fee_name || "").localeCompare(String(b.fee_name || "")) ||
      Number(a.fee_rate_id || 0) - Number(b.fee_rate_id || 0)
    );
  });
  const scholarshipFeeRateOptions = [
    {
      fee_rate_id: COMPUTED_TUITION_FEE_RATE_ID,
      fee_code: baseComputedTuitionFee?.fee_code || "TUITION",
      fee_name: baseComputedTuitionFee?.fee_name || "Tuition Fee",
      fee_category: baseComputedTuitionFee?.fee_category ?? FEE_CATEGORY.TUITION,
      amount: null,
      isComputedTuition: true,
    },
    ...sortedScholarshipFeeRates,
  ];

  // =====================================================================
  // FEE GROUPS / FUND NUMBERS (small nested CRUD, opened from Fee Catalog)
  // =====================================================================
  const defaultFeeGroupForm = { description: "" };
  const defaultAccountTypeForm = { description: "" };

  const [feeGroups, setFeeGroups] = useState([]);
  const [accountTypes, setAccountTypes] = useState([]);
  const [feeGroupForm, setFeeGroupForm] = useState(defaultFeeGroupForm);
  const [accountTypeForm, setAccountTypeForm] = useState(defaultAccountTypeForm);
  const [feeGroupDeleteDialogOpen, setFeeGroupDeleteDialogOpen] = useState(false);
  const [accountTypeDeleteDialogOpen, setAccountTypeDeleteDialogOpen] = useState(false);
  const [selectedFeeGroup, setSelectedFeeGroup] = useState(null);
  const [selectedAccountType, setSelectedAccountType] = useState(null);
  const [feeGroupEditDialogOpen, setFeeGroupEditDialogOpen] = useState(false);
  const [feeGroupEditForm, setFeeGroupEditForm] = useState(defaultFeeGroupForm);
  const [feeGroupEditId, setFeeGroupEditId] = useState(null);
  const [accountTypeEditDialogOpen, setAccountTypeEditDialogOpen] = useState(false);
  const [accountTypeEditForm, setAccountTypeEditForm] = useState(defaultAccountTypeForm);
  const [accountTypeEditId, setAccountTypeEditId] = useState(null);
  const [feeGroupsModalOpen, setFeeGroupsModalOpen] = useState(false);
  const [accountTypesModalOpen, setAccountTypesModalOpen] = useState(false);

  // =====================================================================
  // SCHOLARSHIP TYPES
  // =====================================================================
  const defaultScholarshipForm = {
    scholarship_code: "",
    scholarship_name: "",
    scholarship_status: 1,
  };

  const [scholarshipTypes, setScholarshipTypes] = useState([]);
  const [scholarshipForm, setScholarshipForm] = useState(defaultScholarshipForm);
  const [scholarshipModalOpen, setScholarshipModalOpen] = useState(false);
  const [scholarshipEditMode, setScholarshipEditMode] = useState(false);
  const [editingScholarshipId, setEditingScholarshipId] = useState(null);
  const [scholarshipDeleteDialogOpen, setScholarshipDeleteDialogOpen] = useState(false);
  const [selectedScholarshipId, setSelectedScholarshipId] = useState(null);
  const [searchScholarshipTypes, setSearchScholarshipTypes] = useState("");
  const [scholarshipTypePage, setScholarshipTypePage] = useState(1);

  // =====================================================================
  // SCHOLARSHIP FEES (rules)
  // =====================================================================
  const [scholarshipRuleOptions, setScholarshipRuleOptions] = useState({
    yearLevels: [],
    schoolYears: [],
    activeSchoolYear: null,
    years: [],
    semesters: [],
  });
  const [selectedScholarshipForRules, setSelectedScholarshipForRules] = useState("");
  const [scholarshipRules, setScholarshipRules] = useState([]);
  const [scholarshipRuleForm, setScholarshipRuleForm] = useState({
    scholarship_id: "",
    fee_rate_id: "",
    discount_type: 0,
    discount_value: "",
    year_level_id: 0,
    school_year_id: "",
    semester_id: "",
    status: 1,
  });
  const [scholarshipRuleModalOpen, setScholarshipRuleModalOpen] = useState(false);
  const [scholarshipRuleEditMode, setScholarshipRuleEditMode] = useState(false);
  const [editingScholarshipRuleId, setEditingScholarshipRuleId] = useState(null);
  const [scholarshipRuleUpdateDialogOpen, setScholarshipRuleUpdateDialogOpen] = useState(false);
  const [scholarshipRuleDeleteDialogOpen, setScholarshipRuleDeleteDialogOpen] = useState(false);
  const [selectedScholarshipRuleId, setSelectedScholarshipRuleId] = useState(null);
  const [scholarshipRulePage, setScholarshipRulePage] = useState(1);

  // =====================================================================
  // FETCHERS
  // =====================================================================
  const fetchScholarshipTypes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/scholarship_types`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      setScholarshipTypes(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error fetching scholarship types:", error);
      showSnackbar("Error fetching scholarship types", "error");
    }
  };

  useEffect(() => {
    fetchScholarshipTypes();
  }, []);

  const fetchScholarshipRuleOptions = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/tosf/scholarship-fee-options`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
      const schoolYears = Array.isArray(res.data?.schoolYears) ? res.data.schoolYears : [];
      const semesters = Array.isArray(res.data?.semesters) ? res.data.semesters : [];
      const activeSchoolYear = res.data?.activeSchoolYear || null;

      setScholarshipRuleOptions({
        yearLevels: Array.isArray(res.data?.yearLevels) ? res.data.yearLevels : [],
        schoolYears,
        activeSchoolYear,
        years: Array.isArray(res.data?.years) ? res.data.years : [],
        semesters,
      });
      setScholarshipRuleForm((prev) => ({
        ...prev,
        school_year_id:
          prev.school_year_id ||
          (activeSchoolYear?.year_id == null ? "" : String(activeSchoolYear.year_id)),
        semester_id:
          prev.semester_id ||
          (activeSchoolYear?.semester_id == null ? "" : String(activeSchoolYear.semester_id)),
      }));
    } catch (error) {
      console.error("Error fetching scholarship fee options:", error);
      showSnackbar("Error fetching scholarship fee options", "error");
    }
  };

  useEffect(() => {
    fetchScholarshipRuleOptions();
  }, []);

  const fetchScholarshipRules = async (scholarshipId) => {
    if (!scholarshipId) {
      setScholarshipRules([]);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE_URL}/api/tosf/scholarship-fees`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        params: { scholarship_id: scholarshipId },
      });
      setScholarshipRules(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error fetching scholarship fees:", error);
      showSnackbar("Error fetching scholarship fees", "error");
    }
  };

  const fetchDynamicFees = async () => {
    try {
      const [catalogRes, ratesRes, optionsRes, feeGroupsRes, accountTypesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/tosf/fee-catalog`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
        axios.get(`${API_BASE_URL}/api/tosf/fee-rates`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
        axios.get(`${API_BASE_URL}/api/tosf/fee-options`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
        axios.get(`${API_BASE_URL}/api/tosf/fee-groups`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
        axios.get(`${API_BASE_URL}/api/tosf/account-types`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }),
      ]);

      setFeeCatalog(Array.isArray(catalogRes.data) ? catalogRes.data : []);
      setFeeRates(Array.isArray(ratesRes.data) ? ratesRes.data : []);
      setFeeGroups(Array.isArray(feeGroupsRes.data) ? feeGroupsRes.data : []);
      setAccountTypes(Array.isArray(accountTypesRes.data) ? accountTypesRes.data : []);
      const nextYearLevels = Array.isArray(optionsRes.data?.yearLevels) ? optionsRes.data.yearLevels : [];
      setCurriculumOptions(Array.isArray(optionsRes.data?.curricula) ? optionsRes.data.curricula : []);
      setYearLevelOptions(nextYearLevels);
      setFeeRateForm((prev) => {
        if (!nextYearLevels.length) return prev;
        const exists = nextYearLevels.some(
          (level) => String(level.year_level_id) === String(prev.applied_to),
        );
        return exists || Number(prev.applied_to) === 0 ? prev : { ...prev, applied_to: 0 };
      });
    } catch (err) {
      console.error("Error fetching dynamic fees:", err);
      showSnackbar("Failed to fetch dynamic fees", "error");
    }
  };

  useEffect(() => {
    fetchDynamicFees();
  }, []);

  // =====================================================================
  // Pagination reset effects — MUST live above any conditional early
  // return (see Access Guards below) so hook count/order never changes
  // between renders. Do not move these below the guard again.
  // =====================================================================
  useEffect(() => setFeeCatalogPage(1), [searchFeeCatalog]);
  useEffect(() => setFeeRatePage(1), [searchFeeRates]);
  useEffect(() => setScholarshipTypePage(1), [searchScholarshipTypes]);
  useEffect(() => setScholarshipRulePage(1), [selectedScholarshipForRules]);

  // =====================================================================
  // FEE CATALOG — handlers
  // =====================================================================
  const handleFeeCatalogChange = (e) => {
    const { name, value } = e.target;
    setFeeCatalogForm((prev) => ({
      ...prev,
      [name]: ["fee_category", "is_active", "sort_order", "fee_group", "account_type"].includes(name)
        ? value === "" ? "" : Number(value)
        : value,
    }));
  };

  const findFeeWithSortOrder = (sortOrder, excludeFeeId = null) =>
    feeCatalog.find(
      (fee) => Number(fee.sort_order) === Number(sortOrder) && String(fee.fee_id) !== String(excludeFeeId),
    );

  const getSortOrderConflictMessage = (sortOrder, excludeFeeId = null) => {
    const duplicate = findFeeWithSortOrder(sortOrder, excludeFeeId);
    if (!duplicate) return null;
    const feeLabel = duplicate.fee_code ? `${duplicate.fee_code} - ${duplicate.fee_name}` : duplicate.fee_name || "another fee";
    return `Display order ${sortOrder} is already assigned to ${feeLabel}. Please choose a different order number.`;
  };

  const validateSortOrder = (sortOrder) => {
    const parsed = Number(sortOrder);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return "Display order must be 1 or greater.";
    }
    return "";
  };

  const openAddFeeCatalog = () => {
    if (!canCreate) {
      showSnackbar("You do not have permission to create items on this page", "error");
      return;
    }
    setFeeCatalogForm(defaultFeeCatalogForm);
    setFeeCatalogEditMode(false);
    setFeeCatalogEditId(null);
    setFeeCatalogModalOpen(true);
  };

  const openEditFeeCatalog = (fee) => {
    if (!canEdit) {
      showSnackbar("You do not have permission to edit this item", "error");
      return;
    }
    setFeeCatalogForm({
      fee_code: fee.fee_code || "",
      fee_name: fee.fee_name || "",
      fee_category: feeCategoryOptions.some((option) => Number(option.value) === Number(fee.fee_category))
        ? Number(fee.fee_category)
        : FEE_CATEGORY.OTHER,
      is_active: Number(fee.is_active ?? 1),
      sort_order: Number(fee.sort_order ?? 1),
      fee_group: fee.fee_group ?? "",
      account_type: fee.account_type ?? "",
    });
    setFeeCatalogEditId(fee.fee_id);
    setFeeCatalogEditMode(true);
    setFeeCatalogModalOpen(true);
  };

  const closeFeeCatalogModal = () => {
    setFeeCatalogModalOpen(false);
    setFeeCatalogEditMode(false);
    setFeeCatalogEditId(null);
    setFeeCatalogForm(defaultFeeCatalogForm);
  };

  const handleSaveFeeCatalog = async () => {
    if (feeCatalogEditMode && !canEdit) {
      showSnackbar("You do not have permission to edit this item", "error");
      return;
    }
    if (!feeCatalogEditMode && !canCreate) {
      showSnackbar("You do not have permission to create items on this page", "error");
      return;
    }

    const sortOrderError = validateSortOrder(feeCatalogForm.sort_order);
    if (sortOrderError) {
      showSnackbar(sortOrderError, "warning");
      return;
    }
    const sortOrderConflict = getSortOrderConflictMessage(
      feeCatalogForm.sort_order,
      feeCatalogEditMode ? feeCatalogEditId : null,
    );
    if (sortOrderConflict) {
      showSnackbar(sortOrderConflict, "warning");
      return;
    }

    try {
      if (feeCatalogEditMode) {
        await axios.put(`${API_BASE_URL}/api/tosf/fee-catalog/${feeCatalogEditId}`, feeCatalogForm, permissionHeaders);
        showSnackbar("Fee updated successfully!");
      } else {
        await axios.post(`${API_BASE_URL}/api/tosf/fee-catalog`, feeCatalogForm, permissionHeaders);
        showSnackbar("Fee added successfully!");
      }
      closeFeeCatalogModal();
      fetchDynamicFees();
    } catch (error) {
      console.error("Error saving fee:", error);
      showSnackbar(error.response?.data?.message || "Error saving fee", "error");
    }
  };

  const handleFeeCatalogDelete = (fee) => {
    if (!canDelete) {
      showSnackbar("You do not have permission to delete this item", "error");
      return;
    }
    setSelectedFeeCatalog(fee);
    setFeeCatalogDeleteDialogOpen(true);
  };

  const executeFeeCatalogDelete = async () => {
    if (!selectedFeeCatalog) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/tosf/fee-catalog/${selectedFeeCatalog.fee_id}`, permissionHeaders);
      showSnackbar("Fee deleted successfully!");
      fetchDynamicFees();
    } catch (error) {
      console.error("Error deleting fee:", error);
      showSnackbar(error.response?.data?.message || "Error deleting fee", "error");
    } finally {
      setFeeCatalogDeleteDialogOpen(false);
      setSelectedFeeCatalog(null);
    }
  };

  // =====================================================================
  // FEE GROUPS — handlers
  // =====================================================================
  const handleFeeGroupChange = (e) => setFeeGroupForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleFeeGroupEditChange = (e) => setFeeGroupEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetFeeGroupForm = () => setFeeGroupForm(defaultFeeGroupForm);
  const closeFeeGroupEditDialog = () => {
    setFeeGroupEditDialogOpen(false);
    setFeeGroupEditId(null);
    setFeeGroupEditForm(defaultFeeGroupForm);
  };

  const createFeeGroup = async () => {
    if (!canCreate) {
      showSnackbar("You do not have permission to create items on this page", "error");
      return;
    }
    if (!feeGroupForm.description.trim()) {
      showSnackbar("Fee group description is required", "warning");
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/api/tosf/fee-groups`, feeGroupForm, permissionHeaders);
      showSnackbar("Fee group added successfully!");
      resetFeeGroupForm();
      fetchDynamicFees();
    } catch (error) {
      console.error("Error saving fee group:", error);
      showSnackbar(error.response?.data?.message || "Error saving fee group", "error");
    }
  };

  const updateFeeGroup = async () => {
    if (!canEdit) {
      showSnackbar("You do not have permission to edit this item", "error");
      return;
    }
    if (!feeGroupEditForm.description.trim()) {
      showSnackbar("Fee group description is required", "warning");
      return;
    }
    try {
      await axios.put(`${API_BASE_URL}/api/tosf/fee-groups/${feeGroupEditId}`, feeGroupEditForm, permissionHeaders);
      showSnackbar("Fee group updated successfully!");
      closeFeeGroupEditDialog();
      fetchDynamicFees();
    } catch (error) {
      console.error("Error updating fee group:", error);
      showSnackbar(error.response?.data?.message || "Error updating fee group", "error");
    }
  };

  const handleFeeGroupSubmit = async (e) => {
    e.preventDefault();
    await createFeeGroup();
  };

  const handleFeeGroupEditSubmit = async (e) => {
    e.preventDefault();
    await updateFeeGroup();
  };

  const handleFeeGroupEdit = (item) => {
    if (!canEdit) {
      showSnackbar("You do not have permission to edit this item", "error");
      return;
    }
    setFeeGroupEditForm({ description: item.description || "" });
    setFeeGroupEditId(item.id);
    setFeeGroupEditDialogOpen(true);
  };

  const handleFeeGroupDelete = (item) => {
    if (!canDelete) {
      showSnackbar("You do not have permission to delete this item", "error");
      return;
    }
    setSelectedFeeGroup(item);
    setFeeGroupDeleteDialogOpen(true);
  };

  const executeFeeGroupDelete = async () => {
    if (!selectedFeeGroup) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/tosf/fee-groups/${selectedFeeGroup.id}`, permissionHeaders);
      showSnackbar("Fee group deleted successfully!");
      fetchDynamicFees();
    } catch (error) {
      console.error("Error deleting fee group:", error);
      showSnackbar(error.response?.data?.message || "Error deleting fee group", "error");
    } finally {
      setFeeGroupDeleteDialogOpen(false);
      setSelectedFeeGroup(null);
    }
  };

  // =====================================================================
  // FUND NUMBERS (account types) — handlers
  // =====================================================================
  const handleAccountTypeChange = (e) => setAccountTypeForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleAccountTypeEditChange = (e) => setAccountTypeEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetAccountTypeForm = () => setAccountTypeForm(defaultAccountTypeForm);
  const closeAccountTypeEditDialog = () => {
    setAccountTypeEditDialogOpen(false);
    setAccountTypeEditId(null);
    setAccountTypeEditForm(defaultAccountTypeForm);
  };

  const createAccountType = async () => {
    if (!canCreate) {
      showSnackbar("You do not have permission to create items on this page", "error");
      return;
    }
    if (!accountTypeForm.description.trim()) {
      showSnackbar("Account type description is required", "warning");
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/api/tosf/account-types`, accountTypeForm, permissionHeaders);
      showSnackbar("Account type added successfully!");
      resetAccountTypeForm();
      fetchDynamicFees();
    } catch (error) {
      console.error("Error saving fund number:", error);
      showSnackbar(error.response?.data?.message || "Error saving fund number", "error");
    }
  };

  const updateAccountType = async () => {
    if (!canEdit) {
      showSnackbar("You do not have permission to edit this item", "error");
      return;
    }
    if (!accountTypeEditForm.description.trim()) {
      showSnackbar("Account type description is required", "warning");
      return;
    }
    try {
      await axios.put(`${API_BASE_URL}/api/tosf/account-types/${accountTypeEditId}`, accountTypeEditForm, permissionHeaders);
      showSnackbar("Account type updated successfully!");
      closeAccountTypeEditDialog();
      fetchDynamicFees();
    } catch (error) {
      console.error("Error updating fund number:", error);
      showSnackbar(error.response?.data?.message || "Error updating fund number", "error");
    }
  };

  const handleAccountTypeSubmit = async (e) => {
    e.preventDefault();
    await createAccountType();
  };

  const handleAccountTypeEditSubmit = async (e) => {
    e.preventDefault();
    await updateAccountType();
  };

  const handleAccountTypeEdit = (item) => {
    if (!canEdit) {
      showSnackbar("You do not have permission to edit this item", "error");
      return;
    }
    setAccountTypeEditForm({ description: item.description || "" });
    setAccountTypeEditId(item.id);
    setAccountTypeEditDialogOpen(true);
  };

  const handleAccountTypeDelete = (item) => {
    if (!canDelete) {
      showSnackbar("You do not have permission to delete this item", "error");
      return;
    }
    setSelectedAccountType(item);
    setAccountTypeDeleteDialogOpen(true);
  };

  const executeAccountTypeDelete = async () => {
    if (!selectedAccountType) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/tosf/account-types/${selectedAccountType.id}`, permissionHeaders);
      showSnackbar("Account type deleted successfully!");
      fetchDynamicFees();
    } catch (error) {
      console.error("Error deleting fund number:", error);
      showSnackbar(error.response?.data?.message || "Error deleting fund number", "error");
    } finally {
      setAccountTypeDeleteDialogOpen(false);
      setSelectedAccountType(null);
    }
  };

  // =====================================================================
  // FEE RATES — handlers
  // =====================================================================
  const getFeeCatalogItemById = (feeId) => feeCatalog.find((fee) => String(fee.fee_id) === String(feeId)) || null;
  const isFeeRateFormForTuition = (form) => isBaseComputedTuitionFee(getFeeCatalogItemById(form.fee_id));

  const handleFeeRateChange = (e) => {
    const { name, value } = e.target;
    setFeeRateForm((prev) => {
      const next = {
        ...prev,
        [name]: ["fee_id", "applied_to", "applies_to_all", "is_active"].includes(name)
          ? Number(value)
          : name === "amount"
            ? value.replace(/\D/g, "")
            : value,
        ...(name === "applies_to_all" && Number(value) === 1 ? { dprtmnt_curriculum_id: "" } : {}),
      };
      return isFeeRateFormForTuition(next) ? { ...next, amount: 0 } : next;
    });
  };

  const normalizeFeeRateParams = (form) => {
    const appliesToAll = Number(form.applies_to_all ?? 1) === 1 ? 1 : 0;
    const appliedTo = form.applied_to === "" || form.applied_to == null ? 0 : Number(form.applied_to);
    const branchId = form.branch_id === "" || form.branch_id == null ? null : Number(form.branch_id);
    const dprtmntCurriculumId =
      appliesToAll === 1
        ? null
        : form.dprtmnt_curriculum_id === "" || form.dprtmnt_curriculum_id == null
          ? null
          : Number(form.dprtmnt_curriculum_id);
    const feeId = form.fee_id === "" || form.fee_id == null ? null : Number(form.fee_id);

    return { feeId, dprtmntCurriculumId, branchId, appliedTo, appliesToAll };
  };

  const feeRateParamsMatch = (left, right) =>
    left.feeId === right.feeId &&
    left.dprtmntCurriculumId === right.dprtmntCurriculumId &&
    left.branchId === right.branchId &&
    left.appliedTo === right.appliedTo &&
    left.appliesToAll === right.appliesToAll;

  const findDuplicateFeeRate = (form, excludeFeeRateId = null) => {
    const candidate = normalizeFeeRateParams(form);
    if (!candidate.feeId) return null;

    return (
      feeRates.find((rate) => {
        if (excludeFeeRateId && String(rate.fee_rate_id) === String(excludeFeeRateId)) return false;
        return feeRateParamsMatch(candidate, {
          feeId: rate.fee_id == null ? null : Number(rate.fee_id),
          dprtmntCurriculumId:
            Number(rate.applies_to_all ?? 1) === 1
              ? null
              : rate.dprtmnt_curriculum_id == null || rate.dprtmnt_curriculum_id === ""
                ? null
                : Number(rate.dprtmnt_curriculum_id),
          branchId: rate.branch_id == null || rate.branch_id === "" ? null : Number(rate.branch_id),
          appliedTo: rate.applied_to == null ? 0 : Number(rate.applied_to),
          appliesToAll: Number(rate.applies_to_all ?? 1) === 1 ? 1 : 0,
        });
      }) || null
    );
  };

  const getFeeRateDuplicateMessage = (duplicate) => {
    const feeLabel = duplicate.fee_code ? `${duplicate.fee_code} - ${duplicate.fee_name}` : duplicate.fee_name || "this fee";
    return `A fee rate for ${feeLabel} with the same curriculum scope, branch, and year level already exists.`;
  };

  const openAddFeeRate = () => {
    if (!canCreate) {
      showSnackbar("You do not have permission to create items on this page", "error");
      return;
    }
    setFeeRateForm(defaultFeeRateForm);
    setFeeRateEditMode(false);
    setFeeRateEditId(null);
    setFeeRateModalOpen(true);
  };

  const openEditFeeRate = (rate) => {
    if (!canEdit) {
      showSnackbar("You do not have permission to edit this item", "error");
      return;
    }
    setFeeRateForm({
      fee_id: Number(rate.fee_id || ""),
      dprtmnt_curriculum_id: rate.dprtmnt_curriculum_id || "",
      branch_id: rate.branch_id || "",
      amount: rate.amount || "",
      applied_to:
        Number(rate.applied_to) === 0 ||
        yearLevelOptions.some((level) => String(level.year_level_id) === String(rate.applied_to))
          ? Number(rate.applied_to)
          : 0,
      applies_to_all: Number(rate.applies_to_all ?? 1),
      is_active: Number(rate.is_active ?? 1),
    });
    setFeeRateEditId(rate.fee_rate_id);
    setFeeRateEditMode(true);
    setFeeRateModalOpen(true);
  };

  const closeFeeRateModal = () => {
    setFeeRateModalOpen(false);
    setFeeRateEditMode(false);
    setFeeRateEditId(null);
    setFeeRateForm(defaultFeeRateForm);
  };

  const handleSaveFeeRate = async () => {
    if (feeRateEditMode && !canEdit) {
      showSnackbar("You do not have permission to edit this item", "error");
      return;
    }
    if (!feeRateEditMode && !canCreate) {
      showSnackbar("You do not have permission to create items on this page", "error");
      return;
    }

    const duplicate = findDuplicateFeeRate(feeRateForm, feeRateEditMode ? feeRateEditId : null);
    if (duplicate) {
      showSnackbar(getFeeRateDuplicateMessage(duplicate), "error");
      return;
    }

    try {
      const payload = isFeeRateFormForTuition(feeRateForm) ? { ...feeRateForm, amount: 0 } : feeRateForm;
      if (feeRateEditMode) {
        await axios.put(`${API_BASE_URL}/api/tosf/fee-rates/${feeRateEditId}`, payload, permissionHeaders);
        showSnackbar("Fee rate updated successfully!");
      } else {
        await axios.post(`${API_BASE_URL}/api/tosf/fee-rates`, payload, permissionHeaders);
        showSnackbar("Fee rate added successfully!");
      }
      closeFeeRateModal();
      fetchDynamicFees();
    } catch (error) {
      console.error("Error saving fee rate:", error);
      showSnackbar(error.response?.data?.message || "Error saving fee rate", "error");
    }
  };

  const handleFeeRateDelete = (rate) => {
    if (!canDelete) {
      showSnackbar("You do not have permission to delete this item", "error");
      return;
    }
    setSelectedFeeRate(rate);
    setFeeRateDeleteDialogOpen(true);
  };

  const executeFeeRateDelete = async () => {
    if (!selectedFeeRate) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/tosf/fee-rates/${selectedFeeRate.fee_rate_id}`, permissionHeaders);
      showSnackbar("Fee rate deleted successfully!");
      fetchDynamicFees();
    } catch (error) {
      console.error("Error deleting fee rate:", error);
      showSnackbar(error.response?.data?.message || "Error deleting fee rate", "error");
    } finally {
      setFeeRateDeleteDialogOpen(false);
      setSelectedFeeRate(null);
    }
  };

  // =====================================================================
  // SCHOLARSHIP TYPES — handlers
  // =====================================================================
  const handleScholarshipChange = (e) => {
    const { name, value } = e.target;
    if (name === "scholarship_status") {
      setScholarshipForm((prev) => ({ ...prev, scholarship_status: Number(value) }));
      return;
    }
    setScholarshipForm((prev) => ({ ...prev, [name]: value }));
  };

  const openAddScholarship = () => {
    if (!canCreate) {
      showSnackbar("You do not have permission to create items on this page", "error");
      return;
    }
    setScholarshipForm(defaultScholarshipForm);
    setScholarshipEditMode(false);
    setEditingScholarshipId(null);
    setScholarshipModalOpen(true);
  };

  const openEditScholarship = (item) => {
    if (!canEdit) {
      showSnackbar("You do not have permission to edit this item", "error");
      return;
    }
    setScholarshipForm({
      scholarship_code: item.scholarship_code || "",
      scholarship_name: item.scholarship_name || "",
      scholarship_status: Number(item.scholarship_status ?? 1),
    });
    setEditingScholarshipId(item.id);
    setScholarshipEditMode(true);
    setScholarshipModalOpen(true);
  };

  const closeScholarshipModal = () => {
    setScholarshipModalOpen(false);
    setScholarshipEditMode(false);
    setEditingScholarshipId(null);
    setScholarshipForm(defaultScholarshipForm);
  };

  const handleSaveScholarship = async () => {
    if (scholarshipEditMode && !canEdit) {
      showSnackbar("You do not have permission to edit this item", "error");
      return;
    }
    if (!scholarshipEditMode && !canCreate) {
      showSnackbar("You do not have permission to create items on this page", "error");
      return;
    }
    try {
      if (scholarshipEditMode) {
        await axios.put(
          `${API_BASE_URL}/api/update_scholarship_type/${editingScholarshipId}`,
          scholarshipForm,
          permissionHeaders,
        );
        showSnackbar("Scholarship type updated successfully!");
      } else {
        await axios.post(`${API_BASE_URL}/api/insert_scholarship_type`, scholarshipForm, permissionHeaders);
        showSnackbar("Scholarship type added successfully!");
      }
      closeScholarshipModal();
      fetchScholarshipTypes();
    } catch (error) {
      console.error("Error saving scholarship type:", error);
      showSnackbar("Error saving scholarship type", "error");
    }
  };

  const handleScholarshipDelete = (id) => {
    if (!canDelete) {
      showSnackbar("You do not have permission to delete this item", "error");
      return;
    }
    setSelectedScholarshipId(id);
    setScholarshipDeleteDialogOpen(true);
  };

  const executeScholarshipDelete = async () => {
    if (!selectedScholarshipId) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/delete_scholarship_type/${selectedScholarshipId}`, permissionHeaders);
      showSnackbar("Scholarship type deleted successfully!");
      fetchScholarshipTypes();
    } catch (error) {
      console.error("Error deleting scholarship type:", error);
      showSnackbar("Error deleting scholarship type", "error");
    } finally {
      setScholarshipDeleteDialogOpen(false);
      setSelectedScholarshipId(null);
    }
  };

  // =====================================================================
  // SCHOLARSHIP FEES (rules) — handlers
  // =====================================================================
  const handleScholarshipRuleChange = (e) => {
    const { name, value } = e.target;
    if (name === "discount_type") {
      const nextDiscountType = Number(value);
      setScholarshipRuleForm((prev) => ({
        ...prev,
        discount_type: nextDiscountType,
        discount_value: nextDiscountType === 0 ? "Full Discount" : "",
      }));
      return;
    }
    if (["year_level_id", "status"].includes(name)) {
      setScholarshipRuleForm((prev) => ({ ...prev, [name]: Number(value) }));
      return;
    }
    setScholarshipRuleForm((prev) => ({ ...prev, [name]: value }));
  };

  const openAddScholarshipRule = () => {
    if (!selectedScholarshipForRules) {
      showSnackbar("Select a scholarship first", "warning");
      return;
    }
    if (!canCreate) {
      showSnackbar("You do not have permission to create items on this page", "error");
      return;
    }
    const activeSchoolYear = scholarshipRuleOptions.activeSchoolYear;
    setScholarshipRuleForm({
      scholarship_id: selectedScholarshipForRules,
      fee_rate_id: "",
      discount_type: 0,
      discount_value: "Full Discount",
      year_level_id: 0,
      school_year_id: activeSchoolYear?.year_id == null ? "" : String(activeSchoolYear.year_id),
      semester_id: activeSchoolYear?.semester_id == null ? "" : String(activeSchoolYear.semester_id),
      status: 1,
    });
    setScholarshipRuleEditMode(false);
    setEditingScholarshipRuleId(null);
    setScholarshipRuleModalOpen(true);
  };

  const openEditScholarshipRule = (rule) => {
    if (!canEdit) {
      showSnackbar("You do not have permission to edit this item", "error");
      return;
    }
    setEditingScholarshipRuleId(rule.id);
    setScholarshipRuleForm({
      scholarship_id: String(rule.scholarship_id ?? selectedScholarshipForRules ?? ""),
      fee_rate_id: String(rule.fee_rate_id ?? ""),
      discount_type: Number(rule.discount_type ?? 0),
      discount_value: Number(rule.discount_type ?? 0) === 0 ? "Full Discount" : String(rule.discount_value ?? ""),
      year_level_id: Number(rule.year_level_id ?? 0),
      school_year_id: rule.school_year_id == null ? "" : String(rule.school_year_id),
      semester_id: rule.semester_id == null ? "" : String(rule.semester_id),
      status: Number(rule.status ?? 1),
    });
    setScholarshipRuleEditMode(true);
    setScholarshipRuleModalOpen(true);
  };

  const closeScholarshipRuleModal = () => {
    setScholarshipRuleModalOpen(false);
    setScholarshipRuleEditMode(false);
    setEditingScholarshipRuleId(null);
  };

  const saveScholarshipRule = async () => {
    if (scholarshipRuleEditMode && !canEdit) {
      showSnackbar("You do not have permission to edit this item", "error");
      return;
    }
    if (!scholarshipRuleEditMode && !canCreate) {
      showSnackbar("You do not have permission to create items on this page", "error");
      return;
    }

    try {
      const payload = {
        scholarship_id: Number(scholarshipRuleForm.scholarship_id || selectedScholarshipForRules),
        fee_rate_id: Number(scholarshipRuleForm.fee_rate_id),
        discount_type: Number(scholarshipRuleForm.discount_type),
        discount_value:
          Number(scholarshipRuleForm.discount_type) === 0 ||
          scholarshipRuleForm.discount_value === "" ||
          scholarshipRuleForm.discount_value === "Full Discount"
            ? null
            : Number(scholarshipRuleForm.discount_value),
        year_level_id: Number(scholarshipRuleForm.year_level_id || 0),
        school_year_id: Number(scholarshipRuleForm.school_year_id),
        semester_id: Number(scholarshipRuleForm.semester_id),
        status: Number(scholarshipRuleForm.status),
      };

      if (scholarshipRuleEditMode && editingScholarshipRuleId) {
        await axios.put(
          `${API_BASE_URL}/api/tosf/scholarship-fees/${editingScholarshipRuleId}`,
          payload,
          permissionHeaders,
        );
        showSnackbar("Scholarship fee updated successfully!");
      } else {
        await axios.post(`${API_BASE_URL}/api/tosf/scholarship-fees`, payload, permissionHeaders);
        showSnackbar("Scholarship fee added successfully!");
      }

      closeScholarshipRuleModal();
      fetchScholarshipRules(selectedScholarshipForRules);
    } catch (error) {
      console.error("Error saving scholarship fee:", error);
      showSnackbar(error.response?.data?.message || "Error saving scholarship fee", "error");
    }
  };

  const handleScholarshipRuleSave = () => {
    if (scholarshipRuleEditMode) {
      setScholarshipRuleUpdateDialogOpen(true);
      return;
    }
    saveScholarshipRule();
  };

  const executeScholarshipRuleUpdate = async () => {
    setScholarshipRuleUpdateDialogOpen(false);
    await saveScholarshipRule();
  };

  const handleScholarshipRuleDelete = (ruleId) => {
    if (!canDelete) {
      showSnackbar("You do not have permission to delete this item", "error");
      return;
    }
    setSelectedScholarshipRuleId(ruleId);
    setScholarshipRuleDeleteDialogOpen(true);
  };

  const executeScholarshipRuleDelete = async () => {
    if (!selectedScholarshipRuleId) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/tosf/scholarship-fees/${selectedScholarshipRuleId}`, permissionHeaders);
      showSnackbar("Scholarship fee deleted successfully!");
      fetchScholarshipRules(selectedScholarshipForRules);
    } catch (error) {
      console.error("Error deleting scholarship fee:", error);
      showSnackbar(error.response?.data?.message || "Error deleting scholarship fee", "error");
    } finally {
      setScholarshipRuleDeleteDialogOpen(false);
      setSelectedScholarshipRuleId(null);
    }
  };

  // ✅ Access Guards
  // NOTE: every hook (useState/useEffect) used by this component is declared
  // ABOVE this point, so these early returns never change the number/order
  // of hooks called between renders.
  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Checking Access..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }

  const showCreateActions = canCreate;
  const showActionColumn = canEdit || canDelete;
  const feeRateFormIsTuition = isFeeRateFormForTuition(feeRateForm);

  const getFeeCategoryLabel = (value) =>
    feeCategoryOptions.find((option) => Number(option.value) === Number(value))?.label || "-";
  const getFeeGroupLabel = (fee) =>
    fee.fee_group_description ||
    feeGroups.find((item) => String(item.id) === String(fee.fee_group))?.description ||
    "-";
  const getAccountTypeLabel = (fee) =>
    fee.account_type_description ||
    accountTypes.find((item) => String(item.id) === String(fee.account_type))?.description ||
    "-";
  const getAppliedToLabel = (value) =>
    Number(value) === 0
      ? "All Year Level"
      : yearLevelOptions.find((level) => String(level.year_level_id) === String(value))?.year_level_description || "-";
  const getBranchLabel = (value) =>
    branches.find((branch) => String(branch.id) === String(value))?.branch || "All Branches";
  const getFeeRateOptionLabel = (rate) => {
    if (!rate) return "-";
    return `${rate.fee_code || ""}${rate.fee_code ? " - " : ""}${rate.fee_name || "Fee"}`;
  };
  const getScholarshipFeeRateLabel = (rule) => {
    if (isComputedTuitionRate(rule)) {
      return getFeeRateOptionLabel(baseComputedTuitionFee || scholarshipFeeRateOptions[0]);
    }
    const rate = feeRates.find((item) => String(item.fee_rate_id) === String(rule.fee_rate_id));
    if (rate) return getFeeRateOptionLabel(rate);
    return rule.fee_name || rule.fee_code || rule.fee_rate_id || "-";
  };
  const getScholarshipYearLevelLabel = (value) =>
    Number(value) === 0
      ? "All Year Level"
      : scholarshipRuleOptions.yearLevels.find((level) => String(level.year_level_id) === String(value))
          ?.year_level_description || value || "-";
  const formatScholarshipAcademicYear = (year) => {
    if (!year) return "";
    if (typeof year === "object") {
      if (year.current_year != null && year.next_year != null) {
        return `${year.current_year} - ${year.next_year}`;
      }
      return formatScholarshipAcademicYear(year.year_description);
    }
    if (typeof year === "string" && year.includes("-")) return year;
    const startYear = Number(year);
    if (Number.isNaN(startYear)) return "";
    return `${startYear} - ${startYear + 1}`;
  };
  const getScholarshipSchoolYearLabel = (value) => {
    const schoolYear = scholarshipRuleOptions.schoolYears.find((item) => String(item.year_id) === String(value));
    return formatScholarshipAcademicYear(schoolYear) || value || "-";
  };
  const getScholarshipSemesterLabel = (value) =>
    scholarshipRuleOptions.semesters.find((item) => String(item.semester_id) === String(value))?.semester_description ||
    value ||
    "-";
  const getScholarshipDiscountDisplayLabel = (rule) => {
    const type = Number(rule?.discount_type ?? 0);
    const value = rule?.discount_value;
    if (type === 0 || value == null || value === "" || value === "Full Discount") return "Full Discount";
    const normalizedValue = Number(value);
    if (!Number.isFinite(normalizedValue)) return String(value);
    if (type === 1) return `${normalizedValue}%`;
    return `${normalizedValue.toLocaleString()}`;
  };

  // =====================================================================
  // Filtering + pagination (mirrors Department Registration's search/page)
  // =====================================================================
  const filteredFeeCatalog = feeCatalog.filter((fee) => {
    const q = searchFeeCatalog.toLowerCase();
    return (
      fee.fee_code?.toLowerCase().includes(q) ||
      fee.fee_name?.toLowerCase().includes(q) ||
      getFeeCategoryLabel(fee.fee_category).toLowerCase().includes(q)
    );
  });
  const feeCatalogTotalPages = Math.ceil(filteredFeeCatalog.length / itemsPerPage) || 1;
  const feeCatalogIndexLast = feeCatalogPage * itemsPerPage;
  const feeCatalogIndexFirst = feeCatalogIndexLast - itemsPerPage;
  const currentFeeCatalog = filteredFeeCatalog.slice(feeCatalogIndexFirst, feeCatalogIndexLast);

  const filteredFeeRates = feeRates.filter((rate) => {
    const q = searchFeeRates.toLowerCase();
    return (
      rate.fee_code?.toLowerCase().includes(q) ||
      rate.fee_name?.toLowerCase().includes(q) ||
      getBranchLabel(rate.branch_id).toLowerCase().includes(q)
    );
  });
  const feeRateTotalPages = Math.ceil(filteredFeeRates.length / itemsPerPage) || 1;
  const feeRateIndexLast = feeRatePage * itemsPerPage;
  const feeRateIndexFirst = feeRateIndexLast - itemsPerPage;
  const currentFeeRates = filteredFeeRates.slice(feeRateIndexFirst, feeRateIndexLast);

  const filteredScholarshipTypes = scholarshipTypes.filter((item) => {
    const q = searchScholarshipTypes.toLowerCase();
    return (
      item.scholarship_code?.toLowerCase().includes(q) || item.scholarship_name?.toLowerCase().includes(q)
    );
  });
  const scholarshipTypeTotalPages = Math.ceil(filteredScholarshipTypes.length / itemsPerPage) || 1;
  const scholarshipTypeIndexLast = scholarshipTypePage * itemsPerPage;
  const scholarshipTypeIndexFirst = scholarshipTypeIndexLast - itemsPerPage;
  const currentScholarshipTypes = filteredScholarshipTypes.slice(scholarshipTypeIndexFirst, scholarshipTypeIndexLast);

  const scholarshipRuleTotalPages = Math.ceil(scholarshipRules.length / itemsPerPage) || 1;
  const scholarshipRuleIndexLast = scholarshipRulePage * itemsPerPage;
  const scholarshipRuleIndexFirst = scholarshipRuleIndexLast - itemsPerPage;
  const currentScholarshipRules = scholarshipRules.slice(scholarshipRuleIndexFirst, scholarshipRuleIndexLast);

  return (
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
      <Typography variant="h4" sx={{ fontWeight: "bold", color: titleColor, fontSize: "36px" }}>
        TUITION FEE MANAGEMENT
      </Typography>
      <br />
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2,
          minHeight: 40,
          borderBottom: "1px solid #ccc",
          "& .MuiTab-root": { textTransform: "none", fontWeight: 700, fontSize: "0.95rem", minHeight: 40 },
          "& .Mui-selected": { color: `${headerColor} !important` },
          "& .MuiTabs-indicator": { backgroundColor: headerColor, height: 3 },
        }}
      >
        <Tab label="Fees & Rates" />
        <Tab label="Scholarships" />
      </Tabs>

      {/* ================================================================ */}
      {/* TAB 0 — FEE CATALOG + FEE RATES                                  */}
      {/* ================================================================ */}
      {activeTab === 0 && (
        <Box>
          <SectionHeader
            titleColor={titleColor}
            title="Fee Catalog"
            search={searchFeeCatalog}
            onSearchChange={setSearchFeeCatalog}
            placeholder="Search Fee Code / Name / Category"
            extra={
              <>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setFeeGroupsModalOpen(true)}
                  sx={{ textTransform: "none", borderRadius: "8px", borderColor: headerColor, color: headerColor }}
                >
                  Fee Groups
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setAccountTypesModalOpen(true)}
                  sx={{ textTransform: "none", borderRadius: "8px", borderColor: headerColor, color: headerColor }}
                >
                  Fund Numbers
                </Button>
              </>
            }
          />

          <PaginationBar
            headerColor={headerColor}
            borderColor={borderColor}
            totalLabel={`Total Fee Records: ${filteredFeeCatalog.length}`}
            currentPage={feeCatalogPage}
            totalPages={feeCatalogTotalPages}
            onPageChange={setFeeCatalogPage}
            showAddButton={showCreateActions}
            addButtonLabel="+ Add Fee"
            onAdd={openAddFeeCatalog}
          />

          <Box sx={{ mt: 1, mb: 3 }}>
            <PlainTable
              headers={["#", "Order", "Code", "Name", "Category", "Fee Group", "Fund Number", "Status", "Rates", "Actions"]}
              showActionColumn={showActionColumn}
              borderColor={borderColor}
              emptyMessage="No dynamic fees found."
              colSpanOverride={showActionColumn ? 10 : 9}
            >
              {currentFeeCatalog.map((fee, index) => (
                <TableRow key={fee.fee_id}>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                    {feeCatalogIndexFirst + index + 1}
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{fee.sort_order}</TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{fee.fee_code}</TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{fee.fee_name}</TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                    {getFeeCategoryLabel(fee.fee_category)}
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{getFeeGroupLabel(fee)}</TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{getAccountTypeLabel(fee)}</TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                    <Typography
                      component="span"
                      sx={{ fontWeight: 700, color: Number(fee.is_active) === 1 ? "green" : "#9E0000" }}
                    >
                      {Number(fee.is_active) === 1 ? "Active" : "Inactive"}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{fee.rate_count || 0}</TableCell>
                  {showActionColumn && (
                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center", width: "250px" }}>
                      <RowActions
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onEdit={() => openEditFeeCatalog(fee)}
                        onDelete={() => handleFeeCatalogDelete(fee)}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </PlainTable>
          </Box>

          <PaginationBar
            headerColor={headerColor}
            borderColor={borderColor}
            totalLabel={`Total Fee Records: ${filteredFeeCatalog.length}`}
            currentPage={feeCatalogPage}
            totalPages={feeCatalogTotalPages}
            onPageChange={setFeeCatalogPage}
            showAddButton={false}
          />

          <SectionHeader
            titleColor={titleColor}
            title="Fee Rates"
            search={searchFeeRates}
            onSearchChange={setSearchFeeRates}
            placeholder="Search Fee / Branch"
          />

          <PaginationBar
            headerColor={headerColor}
            borderColor={borderColor}
            totalLabel={`Total Rate Records: ${filteredFeeRates.length}`}
            currentPage={feeRatePage}
            totalPages={feeRateTotalPages}
            onPageChange={setFeeRatePage}
            showAddButton={showCreateActions}
            addButtonLabel="+ Add Rate"
            onAdd={openAddFeeRate}
          />

          <Box sx={{ mt: 1, mb: 3 }}>
            <PlainTable
              headers={["#", "Fee", "Amount", "Year Level", "Scope / Department Curriculum", "Branch", "Status", "Actions"]}
              showActionColumn={showActionColumn}
              borderColor={borderColor}
              emptyMessage="No fee rates found."
              colSpanOverride={showActionColumn ? 8 : 7}
            >
              {currentFeeRates.map((rate, index) => (
                <TableRow key={rate.fee_rate_id}>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                    {feeRateIndexFirst + index + 1}
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                    {rate.fee_code} - {rate.fee_name}
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                    {isBaseComputedTuitionFee(rate) ? "Computed from subjects" : Number(rate.amount || 0).toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                    {getAppliedToLabel(rate.applied_to)}
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                    {Number(rate.applies_to_all) === 1
                      ? "All Curricula"
                      : `${rate.dprtmnt_name || ""} - ${rate.program_code || ""} ${rate.year_description || ""}`}
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                    {getBranchLabel(rate.branch_id)}
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                    <Typography
                      component="span"
                      sx={{ fontWeight: 700, color: Number(rate.is_active) === 1 ? "green" : "#9E0000" }}
                    >
                      {Number(rate.is_active) === 1 ? "Active" : "Inactive"}
                    </Typography>
                  </TableCell>
                  {showActionColumn && (
                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center", width: "250px" }}>
                      <RowActions
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onEdit={() => openEditFeeRate(rate)}
                        onDelete={() => handleFeeRateDelete(rate)}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </PlainTable>
          </Box>

          <PaginationBar
            headerColor={headerColor}
            borderColor={borderColor}
            totalLabel={`Total Rate Records: ${filteredFeeRates.length}`}
            currentPage={feeRatePage}
            totalPages={feeRateTotalPages}
            onPageChange={setFeeRatePage}
            showAddButton={false}
          />
        </Box>
      )}

      {/* ================================================================ */}
      {/* TAB 1 — SCHOLARSHIP TYPES + SCHOLARSHIP FEES                     */}
      {/* ================================================================ */}
      {activeTab === 1 && (
        <Box>
          <SectionHeader
            titleColor={titleColor}
            title="Scholarship Types"
            search={searchScholarshipTypes}
            onSearchChange={setSearchScholarshipTypes}
            placeholder="Search Scholarship Code / Name"
          />

          <PaginationBar
            headerColor={headerColor}
            borderColor={borderColor}
            totalLabel={`Total Scholarship Records: ${filteredScholarshipTypes.length}`}
            currentPage={scholarshipTypePage}
            totalPages={scholarshipTypeTotalPages}
            onPageChange={setScholarshipTypePage}
            showAddButton={showCreateActions}
            addButtonLabel="+ Add Scholarship"
            onAdd={openAddScholarship}
          />

          <Box sx={{ mt: 1, mb: 3 }}>
            <PlainTable
              headers={["#", "Scholarship Code", "Scholarship Name", "Status", "Created At", "Actions"]}
              showActionColumn={showActionColumn}
              borderColor={borderColor}
              emptyMessage="No scholarship types found."
              colSpanOverride={showActionColumn ? 6 : 5}
            >
              {currentScholarshipTypes.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                    {scholarshipTypeIndexFirst + index + 1}
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                    {item.scholarship_code || "-"}
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                    {item.scholarship_name}
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                    <Typography
                      component="span"
                      sx={{ fontWeight: 700, color: Number(item.scholarship_status) === 1 ? "green" : "#9E0000" }}
                    >
                      {Number(item.scholarship_status) === 1 ? "Active" : "Inactive"}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                    {item.created_at ? new Date(Number(item.created_at) * 1000).toLocaleString() : "-"}
                  </TableCell>
                  {showActionColumn && (
                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center", width: "250px" }}>
                      <RowActions
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onEdit={() => openEditScholarship(item)}
                        onDelete={() => handleScholarshipDelete(item.id)}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </PlainTable>
          </Box>

          <PaginationBar
            headerColor={headerColor}
            borderColor={borderColor}
            totalLabel={`Total Scholarship Records: ${filteredScholarshipTypes.length}`}
            currentPage={scholarshipTypePage}
            totalPages={scholarshipTypeTotalPages}
            onPageChange={setScholarshipTypePage}
            showAddButton={false}
          />

          <SectionHeader
            titleColor={titleColor}
            title="Scholarship Fees"
            extra={
              <FormControl size="small" sx={{ minWidth: 320 }}>
                <Select
                  value={selectedScholarshipForRules}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSelectedScholarshipForRules(next);
                    fetchScholarshipRules(next);
                  }}
                  displayEmpty
                  size="small"
                >
                  <MenuItem value="">
                    <em>-- Select a Scholarship --</em>
                  </MenuItem>
                  {scholarshipTypes.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.scholarship_code ? `${s.scholarship_code} - ` : ""}
                      {s.scholarship_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            }
          />

          <PaginationBar
            headerColor={headerColor}
            borderColor={borderColor}
            totalLabel={`Total Scholarship Fee Records: ${scholarshipRules.length}`}
            currentPage={scholarshipRulePage}
            totalPages={scholarshipRuleTotalPages}
            onPageChange={setScholarshipRulePage}
            showAddButton={showCreateActions}
            addButtonLabel="+ Add Scholarship Fee"
            onAdd={openAddScholarshipRule}
          />

          <Box sx={{ mt: 1, mb: 3 }}>
            {!selectedScholarshipForRules ? (
              <PlainTable
                headers={["#", "Fee Rate", "Discount", "Year Level", "School Year", "Semester", "Status", "Actions"]}
                showActionColumn={showActionColumn}
                borderColor={borderColor}
                emptyMessage="Select a scholarship to manage fees."
                colSpanOverride={showActionColumn ? 8 : 7}
              />
            ) : (
              <PlainTable
                headers={["#", "Fee Rate", "Discount", "Year Level", "School Year", "Semester", "Status", "Actions"]}
                showActionColumn={showActionColumn}
                borderColor={borderColor}
                emptyMessage="No scholarship fees found."
                colSpanOverride={showActionColumn ? 8 : 7}
              >
                {currentScholarshipRules.map((rule, index) => (
                  <TableRow key={rule.id}>
                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                      {scholarshipRuleIndexFirst + index + 1}
                    </TableCell>
                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                      {getScholarshipFeeRateLabel(rule)}
                    </TableCell>
                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                      {getScholarshipDiscountDisplayLabel(rule)}
                    </TableCell>
                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                      {getScholarshipYearLevelLabel(rule.year_level_id)}
                    </TableCell>
                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                      {getScholarshipSchoolYearLabel(rule.school_year_id)}
                    </TableCell>
                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                      {getScholarshipSemesterLabel(rule.semester_id)}
                    </TableCell>
                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>
                      <Typography
                        component="span"
                        sx={{ fontWeight: 700, color: Number(rule.status) === 1 ? "green" : "#9E0000" }}
                      >
                        {Number(rule.status) === 1 ? "Active" : "Inactive"}
                      </Typography>
                    </TableCell>
                    {showActionColumn && (
                      <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center", width: "250px" }}>
                        <RowActions
                          canEdit={canEdit}
                          canDelete={canDelete}
                          onEdit={() => openEditScholarshipRule(rule)}
                          onDelete={() => handleScholarshipRuleDelete(rule.id)}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </PlainTable>
            )}
          </Box>

          <PaginationBar
            headerColor={headerColor}
            borderColor={borderColor}
            totalLabel={`Total Scholarship Fee Records: ${scholarshipRules.length}`}
            currentPage={scholarshipRulePage}
            totalPages={scholarshipRuleTotalPages}
            onPageChange={setScholarshipRulePage}
            showAddButton={false}
          />
        </Box>
      )}

      {/* ================================================================ */}
      {/* MODALS — Add / Edit (Department Registration style)              */}
      {/* ================================================================ */}

      {/* Fee Catalog — Add / Edit */}
      <Dialog
        open={feeCatalogModalOpen}
        onClose={closeFeeCatalogModal}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.1rem",
            py: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {feeCatalogEditMode ? "Edit Fee" : "Add New Fee"}
          <IconButton onClick={closeFeeCatalogModal} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography fontWeight="bold" mb={1}>Fee Code:</Typography>
                <TextField
                  name="fee_code"
                  value={feeCatalogForm.fee_code}
                  onChange={handleFeeCatalogChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography fontWeight="bold" mb={1}>Fee Name:</Typography>
                <TextField
                  name="fee_name"
                  value={feeCatalogForm.fee_name}
                  onChange={handleFeeCatalogChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography fontWeight="bold" mb={1}>Category:</Typography>
                <Select
                  name="fee_category"
                  value={feeCatalogForm.fee_category}
                  onChange={handleFeeCatalogChange}
                  fullWidth
                >
                  {feeCategoryOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography fontWeight="bold" mb={1}>Display Order:</Typography>
                <TextField
                  name="sort_order"
                  type="number"
                  value={feeCatalogForm.sort_order}
                  onChange={handleFeeCatalogChange}
                  fullWidth
                  inputProps={{ min: 1, step: 1 }}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography fontWeight="bold" mb={1}>Status:</Typography>
                <Select name="is_active" value={feeCatalogForm.is_active} onChange={handleFeeCatalogChange} fullWidth>
                  <MenuItem value={1}>Active</MenuItem>
                  <MenuItem value={0}>Inactive</MenuItem>
                </Select>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography fontWeight="bold" mb={1}>Fee Group:</Typography>
                <Select name="fee_group" value={feeCatalogForm.fee_group} onChange={handleFeeCatalogChange} displayEmpty fullWidth>
                  <MenuItem value="">
                    <em>Select a fee group</em>
                  </MenuItem>
                  {feeGroups.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.description}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography fontWeight="bold" mb={1}>Fund Number:</Typography>
                <Select
                  name="account_type"
                  value={feeCatalogForm.account_type}
                  onChange={handleFeeCatalogChange}
                  displayEmpty
                  fullWidth
                >
                  <MenuItem value="">
                    <em>Select a fund number</em>
                  </MenuItem>
                  {accountTypes.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.description}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button color="error" variant="outlined" sx={{ textTransform: "none", fontWeight: 600 }} onClick={closeFeeCatalogModal}>
            Cancel
          </Button>
          <Button variant="contained" sx={{ px: 4, fontWeight: 600, textTransform: "none" }} onClick={handleSaveFeeCatalog}>
            <SaveIcon fontSize="small" style={{ marginRight: 6 }} />
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fee Rate — Add / Edit */}
      <Dialog
        open={feeRateModalOpen}
        onClose={closeFeeRateModal}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.1rem",
            py: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {feeRateEditMode ? "Edit Fee Rate" : "Add New Fee Rate"}
          <IconButton onClick={closeFeeRateModal} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography fontWeight="bold" mb={1}>Fee:</Typography>
                <Select name="fee_id" value={feeRateForm.fee_id} onChange={handleFeeRateChange} displayEmpty fullWidth required>
                  <MenuItem value="">
                    <em>Select a fee</em>
                  </MenuItem>
                  {feeCatalog.map((fee) => (
                    <MenuItem key={fee.fee_id} value={fee.fee_id}>
                      {fee.fee_code} - {fee.fee_name}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography fontWeight="bold" mb={1}>Amount:</Typography>
                <TextField
                  name="amount"
                  type="number"
                  value={feeRateFormIsTuition ? 0 : feeRateForm.amount}
                  onChange={handleFeeRateChange}
                  fullWidth
                  required={!feeRateFormIsTuition}
                  disabled={feeRateFormIsTuition}
                  helperText={feeRateFormIsTuition ? "Computed from enrolled subjects" : ""}
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*", step: 1, min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography fontWeight="bold" mb={1}>Year Level:</Typography>
                <Select name="applied_to" value={feeRateForm.applied_to} onChange={handleFeeRateChange} fullWidth>
                  <MenuItem value={0}>All Year Level</MenuItem>
                  {yearLevelOptions.map((level) => (
                    <MenuItem key={level.year_level_id} value={level.year_level_id}>
                      {level.year_level_description}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography fontWeight="bold" mb={1}>Branch:</Typography>
                <Select name="branch_id" value={feeRateForm.branch_id} onChange={handleFeeRateChange} displayEmpty fullWidth>
                  <MenuItem value="">All Branches</MenuItem>
                  {branches.map((branch) => (
                    <MenuItem key={branch.id} value={branch.id}>
                      {branch.branch}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography fontWeight="bold" mb={1}>Scope:</Typography>
                <Select name="applies_to_all" value={feeRateForm.applies_to_all} onChange={handleFeeRateChange} fullWidth>
                  <MenuItem value={1}>All Curricula</MenuItem>
                  <MenuItem value={0}>Specific Curriculum</MenuItem>
                </Select>
              </Grid>
              {Number(feeRateForm.applies_to_all) === 0 && (
                <Grid item xs={12}>
                  <Typography fontWeight="bold" mb={1}>Department Curriculum:</Typography>
                  <Select
                    name="dprtmnt_curriculum_id"
                    value={feeRateForm.dprtmnt_curriculum_id}
                    onChange={handleFeeRateChange}
                    displayEmpty
                    fullWidth
                    required
                  >
                    <MenuItem value="">
                      <em>Select curriculum</em>
                    </MenuItem>
                    {curriculumOptions.map((item) => (
                      <MenuItem key={item.dprtmnt_curriculum_id} value={item.dprtmnt_curriculum_id}>
                        {item.dprtmnt_name} - ({item.program_code}) {item.program_description} {item.major || ""} -{" "}
                        {item.year_description}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <Typography fontWeight="bold" mb={1}>Status:</Typography>
                <Select name="is_active" value={feeRateForm.is_active} onChange={handleFeeRateChange} fullWidth>
                  <MenuItem value={1}>Active</MenuItem>
                  <MenuItem value={0}>Inactive</MenuItem>
                </Select>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button color="error" variant="outlined" sx={{ textTransform: "none", fontWeight: 600 }} onClick={closeFeeRateModal}>
            Cancel
          </Button>
          <Button variant="contained" sx={{ px: 4, fontWeight: 600, textTransform: "none" }} onClick={handleSaveFeeRate}>
            <SaveIcon fontSize="small" style={{ marginRight: 6 }} />
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Scholarship Type — Add / Edit */}
      <Dialog
        open={scholarshipModalOpen}
        onClose={closeScholarshipModal}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.1rem",
            py: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {scholarshipEditMode ? "Edit Scholarship Type" : "Add New Scholarship Type"}
          <IconButton onClick={closeScholarshipModal} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Typography fontWeight="bold">Scholarship Code:</Typography>
            <TextField name="scholarship_code" value={scholarshipForm.scholarship_code} onChange={handleScholarshipChange} fullWidth required />

            <Typography fontWeight="bold">Scholarship Name:</Typography>
            <TextField name="scholarship_name" value={scholarshipForm.scholarship_name} onChange={handleScholarshipChange} fullWidth required />

            <Typography fontWeight="bold">Status:</Typography>
            <Select name="scholarship_status" value={scholarshipForm.scholarship_status} onChange={handleScholarshipChange} fullWidth>
              <MenuItem value={1}>Active</MenuItem>
              <MenuItem value={0}>Inactive</MenuItem>
            </Select>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button color="error" variant="outlined" sx={{ textTransform: "none", fontWeight: 600 }} onClick={closeScholarshipModal}>
            Cancel
          </Button>
          <Button variant="contained" sx={{ px: 4, fontWeight: 600, textTransform: "none" }} onClick={handleSaveScholarship}>
            <SaveIcon fontSize="small" style={{ marginRight: 6 }} />
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Scholarship Fee (rule) — Add / Edit */}
      <Dialog
        open={scholarshipRuleModalOpen}
        onClose={closeScholarshipRuleModal}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.1rem",
            py: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {scholarshipRuleEditMode ? "Edit Scholarship Fee" : "Add New Scholarship Fee"}
          <IconButton onClick={closeScholarshipRuleModal} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography fontWeight="bold" mb={1}>Fee Rate:</Typography>
                <Select
                  name="fee_rate_id"
                  value={scholarshipRuleForm.fee_rate_id}
                  onChange={handleScholarshipRuleChange}
                  displayEmpty
                  fullWidth
                  required
                >
                  <MenuItem value="">
                    <em>Select fee rate</em>
                  </MenuItem>
                  {scholarshipFeeRateOptions.map((rate) => (
                    <MenuItem
                      key={`${isComputedTuitionRate(rate) ? "computed" : "rate"}-${rate.fee_rate_id}`}
                      value={rate.fee_rate_id}
                    >
                      {getFeeRateOptionLabel(rate)}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography fontWeight="bold" mb={1}>Discount Type:</Typography>
                <Select
                  name="discount_type"
                  value={scholarshipRuleForm.discount_type}
                  onChange={handleScholarshipRuleChange}
                  fullWidth
                >
                  <MenuItem value={0}>Full Discount</MenuItem>
                  <MenuItem value={1}>Percentage</MenuItem>
                  <MenuItem value={2}>Number</MenuItem>
                </Select>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography fontWeight="bold" mb={1}>Discount Value:</Typography>
                <TextField
                  name="discount_value"
                  type="text"
                  value={scholarshipRuleForm.discount_value}
                  onChange={handleScholarshipRuleChange}
                  fullWidth
                  disabled={Number(scholarshipRuleForm.discount_type) === 0}
                  required={Number(scholarshipRuleForm.discount_type) !== 0}
                  placeholder={Number(scholarshipRuleForm.discount_type) === 0 ? "Full Discount" : ""}
                  inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography fontWeight="bold" mb={1}>Year Level:</Typography>
                <Select
                  name="year_level_id"
                  value={scholarshipRuleForm.year_level_id}
                  onChange={handleScholarshipRuleChange}
                  fullWidth
                >
                  <MenuItem value={0}>All</MenuItem>
                  {scholarshipRuleOptions.yearLevels.map((yl) => (
                    <MenuItem key={yl.year_level_id} value={yl.year_level_id}>
                      {yl.year_level_description}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography fontWeight="bold" mb={1}>School Year:</Typography>
                <Select
                  name="school_year_id"
                  value={scholarshipRuleForm.school_year_id}
                  onChange={handleScholarshipRuleChange}
                  displayEmpty
                  fullWidth
                  required
                >
                  <MenuItem value="">
                    <em>Select school year</em>
                  </MenuItem>
                  {scholarshipRuleOptions.schoolYears.map((sy) => (
                    <MenuItem key={sy.year_id} value={sy.year_id}>
                      {formatScholarshipAcademicYear(sy) || sy.year_id}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography fontWeight="bold" mb={1}>Semester:</Typography>
                <Select
                  name="semester_id"
                  value={scholarshipRuleForm.semester_id}
                  onChange={handleScholarshipRuleChange}
                  displayEmpty
                  fullWidth
                  required
                >
                  <MenuItem value="">
                    <em>Select semester</em>
                  </MenuItem>
                  {scholarshipRuleOptions.semesters.map((sem) => (
                    <MenuItem key={sem.semester_id} value={sem.semester_id}>
                      {sem.semester_description}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography fontWeight="bold" mb={1}>Status:</Typography>
                <Select name="status" value={scholarshipRuleForm.status} onChange={handleScholarshipRuleChange} fullWidth>
                  <MenuItem value={1}>Active</MenuItem>
                  <MenuItem value={0}>Inactive</MenuItem>
                </Select>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button color="error" variant="outlined" sx={{ textTransform: "none", fontWeight: 600 }} onClick={closeScholarshipRuleModal}>
            Cancel
          </Button>
          <Button variant="contained" sx={{ px: 4, fontWeight: 600, textTransform: "none" }} onClick={handleScholarshipRuleSave}>
            <SaveIcon fontSize="small" style={{ marginRight: 6 }} />
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm scholarship-fee update */}
      <Dialog
        open={scholarshipRuleUpdateDialogOpen}
        onClose={() => setScholarshipRuleUpdateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle sx={{ background: headerColor, color: "#fff", fontWeight: 700, fontSize: "1.2rem", py: 2 }}>
          Confirm Update
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography>Do you want to save the updated scholarship fee?</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button color="error" variant="outlined" onClick={() => setScholarshipRuleUpdateDialogOpen(false)}>
            Cancel
          </Button>
          <Button color="primary" variant="contained" onClick={executeScholarshipRuleUpdate}>
            Yes, Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fee Groups modal (nested small CRUD) */}
      <Dialog
        open={feeGroupsModalOpen}
        onClose={() => setFeeGroupsModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.1rem",
            py: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Fee Groups
          <IconButton onClick={() => setFeeGroupsModalOpen(false)} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <form onSubmit={handleFeeGroupSubmit}>
            <Typography fontWeight="bold" mb={1}>Description:</Typography>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <TextField
                name="description"
                value={feeGroupForm.description}
                onChange={handleFeeGroupChange}
                fullWidth
                required
                inputProps={{ maxLength: 60 }}
              />
              {showCreateActions && (
                <Button type="submit" variant="contained" sx={{ whiteSpace: "nowrap" }}>
                  <SaveIcon fontSize="small" />
                </Button>
              )}
            </Box>
          </form>

          <Box sx={{ mt: 3 }}>
            <PlainTable
              headers={["#", "Description", "Actions"]}
              showActionColumn={showActionColumn}
              borderColor={borderColor}
              emptyMessage="No fee groups found."
            >
              {feeGroups.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{index + 1}</TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{item.description}</TableCell>
                  {showActionColumn && (
                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center", width: "250px" }}>
                      <RowActions
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onEdit={() => handleFeeGroupEdit(item)}
                        onDelete={() => handleFeeGroupDelete(item)}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </PlainTable>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button variant="outlined" onClick={() => setFeeGroupsModalOpen(false)} sx={{ textTransform: "none" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fund Numbers modal (nested small CRUD) */}
      <Dialog
        open={accountTypesModalOpen}
        onClose={() => setAccountTypesModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.1rem",
            py: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Fund Numbers
          <IconButton onClick={() => setAccountTypesModalOpen(false)} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <form onSubmit={handleAccountTypeSubmit}>
            <Typography fontWeight="bold" mb={1}>Description:</Typography>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <TextField
                name="description"
                value={accountTypeForm.description}
                onChange={handleAccountTypeChange}
                fullWidth
                required
                inputProps={{ maxLength: 60 }}
              />
              {showCreateActions && (
                <Button type="submit" variant="contained" sx={{ whiteSpace: "nowrap" }}>
                  <SaveIcon fontSize="small" />
                </Button>
              )}
            </Box>
          </form>

          <Box sx={{ mt: 3 }}>
            <PlainTable
              headers={["#", "Description", "Actions"]}
              showActionColumn={showActionColumn}
              borderColor={borderColor}
              emptyMessage="No fund numbers found."
            >
              {accountTypes.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{index + 1}</TableCell>
                  <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center" }}>{item.description}</TableCell>
                  {showActionColumn && (
                    <TableCell sx={{ border: `1px solid ${borderColor}`, textAlign: "center", width: "250px" }}>
                      <RowActions
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onEdit={() => handleAccountTypeEdit(item)}
                        onDelete={() => handleAccountTypeDelete(item)}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </PlainTable>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button variant="outlined" onClick={() => setAccountTypesModalOpen(false)} sx={{ textTransform: "none" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fee Group — Edit */}
      <Dialog
        open={feeGroupEditDialogOpen}
        onClose={closeFeeGroupEditDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.1rem",
            py: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Edit Fee Group
          <IconButton onClick={closeFeeGroupEditDialog} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleFeeGroupEditSubmit}>
          <DialogContent sx={{ p: 3 }}>
            <Typography fontWeight="bold" mb={1}>Description:</Typography>
            <TextField
              name="description"
              value={feeGroupEditForm.description}
              onChange={handleFeeGroupEditChange}
              fullWidth
              required
              inputProps={{ maxLength: 60 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
            <Button color="error" variant="outlined" onClick={closeFeeGroupEditDialog}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              <SaveIcon fontSize="small" style={{ marginRight: 6 }} />
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Fund Number — Edit */}
      <Dialog
        open={accountTypeEditDialogOpen}
        onClose={closeAccountTypeEditDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.1rem",
            py: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Edit Fund Number
          <IconButton onClick={closeAccountTypeEditDialog} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleAccountTypeEditSubmit}>
          <DialogContent sx={{ p: 3 }}>
            <Typography fontWeight="bold" mb={1}>Description:</Typography>
            <TextField
              name="description"
              value={accountTypeEditForm.description}
              onChange={handleAccountTypeEditChange}
              fullWidth
              required
              inputProps={{ maxLength: 60 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
            <Button color="error" variant="outlined" onClick={closeAccountTypeEditDialog}>
              Cancel
            </Button>
            <Button type="submit" variant="contained">
              <SaveIcon fontSize="small" style={{ marginRight: 6 }} />
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ================================================================ */}
      {/* DELETE CONFIRMATIONS (Department Registration style)             */}
      {/* ================================================================ */}

      <Dialog
        open={feeCatalogDeleteDialogOpen}
        onClose={() => {
          setFeeCatalogDeleteDialogOpen(false);
          setSelectedFeeCatalog(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle sx={{ background: headerColor, color: "#fff", fontWeight: 700, fontSize: "1.2rem", py: 2 }}>
          Delete Fee
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete <b>{selectedFeeCatalog?.fee_name || "this fee"}</b>?
          </Typography>
          <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
            Deleting this fee will permanently remove it, and all fee rate records connected to it will also be deleted.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button
            color="error"
            variant="outlined"
            onClick={() => {
              setFeeCatalogDeleteDialogOpen(false);
              setSelectedFeeCatalog(null);
            }}
          >
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={executeFeeCatalogDelete}>
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={feeRateDeleteDialogOpen}
        onClose={() => {
          setFeeRateDeleteDialogOpen(false);
          setSelectedFeeRate(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle sx={{ background: headerColor, color: "#fff", fontWeight: 700, fontSize: "1.2rem", py: 2 }}>
          Delete Fee Rate
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>Are you sure you want to delete this fee rate?</Typography>
          <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button
            color="error"
            variant="outlined"
            onClick={() => {
              setFeeRateDeleteDialogOpen(false);
              setSelectedFeeRate(null);
            }}
          >
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={executeFeeRateDelete}>
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={feeGroupDeleteDialogOpen}
        onClose={() => {
          setFeeGroupDeleteDialogOpen(false);
          setSelectedFeeGroup(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle sx={{ background: headerColor, color: "#fff", fontWeight: 700, fontSize: "1.2rem", py: 2 }}>
          Delete Fee Group
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete <b>{selectedFeeGroup?.description || "this fee group"}</b>?
          </Typography>
          <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button
            color="error"
            variant="outlined"
            onClick={() => {
              setFeeGroupDeleteDialogOpen(false);
              setSelectedFeeGroup(null);
            }}
          >
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={executeFeeGroupDelete}>
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={accountTypeDeleteDialogOpen}
        onClose={() => {
          setAccountTypeDeleteDialogOpen(false);
          setSelectedAccountType(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle sx={{ background: headerColor, color: "#fff", fontWeight: 700, fontSize: "1.2rem", py: 2 }}>
          Delete Fund Number
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete <b>{selectedAccountType?.description || "this fund number"}</b>?
          </Typography>
          <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button
            color="error"
            variant="outlined"
            onClick={() => {
              setAccountTypeDeleteDialogOpen(false);
              setSelectedAccountType(null);
            }}
          >
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={executeAccountTypeDelete}>
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={scholarshipDeleteDialogOpen}
        onClose={() => {
          setScholarshipDeleteDialogOpen(false);
          setSelectedScholarshipId(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle sx={{ background: headerColor, color: "#fff", fontWeight: 700, fontSize: "1.2rem", py: 2 }}>
          Delete Scholarship Type
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>Are you sure you want to delete this scholarship type?</Typography>
          <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button
            color="error"
            variant="outlined"
            onClick={() => {
              setScholarshipDeleteDialogOpen(false);
              setSelectedScholarshipId(null);
            }}
          >
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={executeScholarshipDelete}>
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={scholarshipRuleDeleteDialogOpen}
        onClose={() => {
          setScholarshipRuleDeleteDialogOpen(false);
          setSelectedScholarshipRuleId(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle sx={{ background: headerColor, color: "#fff", fontWeight: 700, fontSize: "1.2rem", py: 2 }}>
          Delete Scholarship Fee
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>Are you sure you want to delete this scholarship fee?</Typography>
          <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button
            color="error"
            variant="outlined"
            onClick={() => {
              setScholarshipRuleDeleteDialogOpen(false);
              setSelectedScholarshipRuleId(null);
            }}
          >
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={executeScholarshipRuleDelete}>
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TOSF;
