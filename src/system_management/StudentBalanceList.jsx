import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import PaymentsIcon from "@mui/icons-material/Payments";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import axios from "axios";
import { TableVirtuoso } from "react-virtuoso";
import API_BASE_URL from "../apiConfig";
import Unauthorized from "../components/Unauthorized";

const PAGE_SIZE = 100;
const money = (value) => Number(value || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
});

const StudentBalanceList = () => {
  const pageId = 175;
  const [hasAccess, setHasAccess] = useState(null);
  const [terms, setTerms] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [termId, setTermId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [paymentRow, setPaymentRow] = useState(null);
  const [paymentValue, setPaymentValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [cashierAccountTypeId, setCashierAccountTypeId] = useState(null);
  const [cashierAccountTypeLabel, setCashierAccountTypeLabel] = useState("");
  const [cashierFundLoading, setCashierFundLoading] = useState(true);
  const [notice, setNotice] = useState({ open: false, message: "", severity: "info" });

  const showNotice = (message, severity = "info") =>
    setNotice({ open: true, message, severity });

  useEffect(() => {
    const role = localStorage.getItem("role");
    const employeeId = localStorage.getItem("employee_id");
    const personId = localStorage.getItem("person_id");

    if (!role || !employeeId || !personId) {
      window.location.href = "/login";
      return;
    }

    axios.get(`${API_BASE_URL}/api/page_access/${employeeId}/${pageId}`, authConfig())
      .then(({ data }) => setHasAccess(Number(data?.page_privilege) === 1))
      .catch((error) => {
        console.error("Failed to check Student Balance List access:", error);
        setHasAccess(false);
      });
  }, []);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/student-balance-terms`, authConfig())
      .then(({ data }) => setTerms(Array.isArray(data) ? data : []))
      .catch(() => showNotice("Failed to load school years.", "error"));
  }, []);

  useEffect(() => {
    if (terms.length && !termId) {
      const active = terms.find((term) => Number(term.astatus) === 1) || terms[0];
      setSelectedYearId(String(active.year_id || ""));
      setSelectedSemesterId(String(active.semester_id || ""));
      setTermId(String(active.id || active.school_year_id || ""));
    }
  }, [terms, termId]);

  useEffect(() => {
    if (!selectedYearId || !selectedSemesterId) return;
    const selectedTerm = terms.find(
      (term) =>
        String(term.year_id) === String(selectedYearId) &&
        String(term.semester_id) === String(selectedSemesterId),
    );
    setTermId(String(selectedTerm?.id || selectedTerm?.school_year_id || ""));
  }, [selectedYearId, selectedSemesterId, terms]);

  useEffect(() => {
    const employeeId = localStorage.getItem("employee_id");
    if (!termId || !employeeId) return;

    let cancelled = false;
    setCashierFundLoading(true);
    setCashierAccountTypeId(null);
    setCashierAccountTypeLabel("");

    axios.get(`${API_BASE_URL}/api/receipt-counter/active/${termId}`, authConfig())
      .then(({ data }) => {
        if (cancelled) return;
        const assignment = (data || []).find(
          (item) => String(item.employee_id) === String(employeeId),
        );
        setCashierAccountTypeId(assignment?.account_type_id ?? null);
        setCashierAccountTypeLabel(assignment?.account_type_description || "");
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to load employee fund assignment:", error);
          showNotice("Unable to verify your assigned fund type.", "error");
        }
      })
      .finally(() => {
        if (!cancelled) setCashierFundLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [termId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchPage = useCallback(async (requestedPage, replace = false) => {
    if (!termId) return;
    if (replace) setLoading(true); else setLoadingMore(true);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/student-balance-list`, {
        ...authConfig(),
        params: {
          active_school_year_id: termId,
          page: requestedPage,
          limit: PAGE_SIZE,
          search,
        },
      });
      setRows((current) => replace ? (data.data || []) : [...current, ...(data.data || [])]);
      setPage(requestedPage);
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      showNotice(error?.response?.data?.message || "Failed to load student balances.", "error");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, termId]);

  useEffect(() => {
    if (termId) fetchPage(1, true);
  }, [fetchPage, termId]);

  const refresh = () => fetchPage(1, true);
  const loadMore = () => {
    if (!loading && !loadingMore && hasMore) fetchPage(page + 1);
  };

  const openPayment = (row) => {
    if (hasFundTypeMismatch(row)) {
      showNotice(getFundTypeMismatchMessage(row), "warning");
      return;
    }
    setPaymentRow(row);
    setPaymentValue("");
  };

  const hasFundTypeMismatch = (row) => {
    if (cashierFundLoading) return false;
    if (cashierAccountTypeId === null || cashierAccountTypeId === undefined) return true;

    return (row?.fee_breakdown || []).some(
      (fee) => fee.account_type_id !== null &&
        fee.account_type_id !== undefined &&
        String(fee.account_type_id) !== String(cashierAccountTypeId),
    );
  };

  const getFundTypeMismatchMessage = (row) => {
    if (cashierAccountTypeId === null || cashierAccountTypeId === undefined) {
      return "You cannot transact this student because you have no fund type assigned for the selected school year and semester.";
    }

    const mismatchedFunds = [...new Set(
      (row?.fee_breakdown || [])
        .filter((fee) => fee.account_type_id != null && String(fee.account_type_id) !== String(cashierAccountTypeId))
        .map((fee) => fee.account_type_label || fee.account_type_id),
    )];

    return `You cannot transact this student. Your assigned fund type is ${cashierAccountTypeLabel || cashierAccountTypeId}, but the unpaid fee uses fund type ${mismatchedFunds.join(", ")}.`;
  };

  const closePayment = () => {
    if (!saving) {
      setPaymentRow(null);
      setPaymentValue("");
    }
  };

  const savePayment = async () => {
    const amount = Number(paymentValue);
    if (!paymentRow || !Number.isFinite(amount) || amount <= 0) {
      showNotice("Enter a valid payment amount.", "warning");
      return;
    }
    if (amount > Number(paymentRow.balance)) {
      showNotice("Payment cannot exceed the student's balance.", "warning");
      return;
    }
    const employeeId = localStorage.getItem("employee_id");
    if (!employeeId) {
      showNotice("Employee ID is required to save this payment.", "error");
      return;
    }
    setSaving(true);
    try {
      const { data } = await axios.put(
        `${API_BASE_URL}/api/payment_matriculation/${paymentRow.matriculation_id}`,
        { payment: amount, balance: Number(paymentRow.balance), employee_id: employeeId },
        { ...authConfig(), headers: { ...authConfig().headers, "x-audit-actor-id": employeeId, "x-audit-actor-role": localStorage.getItem("role") || "administrator" } },
      );
      showNotice(`Payment saved successfully. Receipt No. ${data.transaction_no || "generated"}.`, "success");
      setPaymentRow(null);
      setPaymentValue("");
      await refresh();
    } catch (error) {
      showNotice(error?.response?.data?.message || "Failed to save payment.", "error");
    } finally {
      setSaving(false);
    }
  };

  const enteredPayment = Number(paymentValue || 0);
  const balanceAfterPayment = Math.max(
    Number(paymentRow?.balance || 0) - enteredPayment,
    0,
  );
  const paymentExceedsBalance = enteredPayment > Number(paymentRow?.balance || 0);
  const paymentSummaryChartData = [
    { name: "Total Fee", amount: Number(paymentRow?.total_fee || 0), color: "#EF4444" },
    { name: "Student Payment", amount: enteredPayment, color: "#22C55E" },
    { name: "Balance", amount: balanceAfterPayment, color: "#2563EB" },
  ];

  const columns = useMemo(() => [
    { key: "index", label: "#", width: 60 },
    { key: "student_number", label: "Student Number", width: 140 },
    { key: "student_full_name", label: "Student Full Name", width: 230 },
    { key: "curriculum", label: "Curriculum", width: 260 },
    { key: "year_level", label: "Year Level", width: 125 },
    { key: "total_fee", label: "Total Fee", width: 130 },
    { key: "last_payment", label: "Last Payment", width: 130 },
    { key: "balance", label: "Balance", width: 130 },
    { key: "action", label: "Action", width: 135 },
  ], []);

  const yearOptions = useMemo(() => (
    [...new Map(terms.map((term) => [String(term.year_id), term])).values()]
      .sort((a, b) => Number(a.year_description) - Number(b.year_description))
  ), [terms]);

  const semesterOptions = useMemo(() => (
    [...new Map(
      terms
        .filter((term) => String(term.year_id) === String(selectedYearId))
        .map((term) => [String(term.semester_id), term]),
    ).values()].sort((a, b) => Number(a.semester_id) - Number(b.semester_id))
  ), [selectedYearId, terms]);

  const TableComponents = useMemo(() => ({
    Scroller: React.forwardRef((props, ref) => <TableContainer {...props} ref={ref} />),
    Table: (props) => <Table {...props} stickyHeader sx={{ minWidth: 1360, tableLayout: "fixed" }} />,
    TableHead: React.forwardRef((props, ref) => <TableHead {...props} ref={ref} />),
    TableRow,
    TableBody: React.forwardRef((props, ref) => <TableBody {...props} ref={ref} />),
  }), []);

  if (hasAccess === false) return <Unauthorized />;
  if (hasAccess !== true) {
    return <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>STUDENT BALANCE LIST</Typography>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>School Year</InputLabel>
            <Select
              value={selectedYearId}
              label="School Year"
              onChange={(event) => {
                const nextYearId = event.target.value;
                const firstSemester = terms.find((term) => String(term.year_id) === String(nextYearId));
                setSelectedYearId(nextYearId);
                setSelectedSemesterId(String(firstSemester?.semester_id || ""));
              }}
            >
              {yearOptions.map((term) => (
                <MenuItem key={term.year_id} value={String(term.year_id)}>
                  {term.year_description} - {term.next_year || Number(term.year_description || 0) + 1}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Semester</InputLabel>
            <Select
              value={selectedSemesterId}
              label="Semester"
              onChange={(event) => setSelectedSemesterId(event.target.value)}
            >
              {semesterOptions.map((term) => (
                <MenuItem key={term.semester_id} value={String(term.semester_id)}>
                  {term.semester_description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Search student"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} /> }}
            sx={{ minWidth: 280 }}
          />
          <Button variant="outlined" onClick={refresh} disabled={loading}>Refresh</Button>
        </Box>
        {!cashierFundLoading && (cashierAccountTypeId === null || cashierAccountTypeId === undefined) && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You have no assigned employee fund type for the selected school year and semester. Payments are disabled.
          </Alert>
        )}
        <Box sx={{ height: "calc(100vh - 270px)", minHeight: 420 }}>
          {loading && !rows.length ? <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}><CircularProgress /></Box> : (
            <TableVirtuoso
              data={rows}
              endReached={loadMore}
              components={TableComponents}
              fixedHeaderContent={() => (
                <TableRow>{columns.map((column) => <TableCell key={column.key} sx={{ width: column.width, fontWeight: 700, backgroundColor: "#f5f5f5" }}>{column.label}</TableCell>)}</TableRow>
              )}
              itemContent={(_, row) => (
                <>
                  <TableCell>{row.index}</TableCell>
                  <TableCell>{row.student_number}</TableCell>
                  <TableCell>{row.student_full_name}</TableCell>
                  <TableCell>{row.curriculum || "-"}</TableCell>
                  <TableCell>{row.year_level || "-"}</TableCell>
                  <TableCell align="right">{money(row.total_fee)}</TableCell>
                  <TableCell align="right">{money(row.last_payment)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: Number(row.balance) > 0 ? "error.main" : "success.main" }}>{money(row.balance)}</TableCell>
                  <TableCell>
                    {row.can_pay && !hasFundTypeMismatch(row) ? (
                      <Button size="small" variant="contained" startIcon={<PaymentsIcon />} onClick={() => openPayment(row)}>
                        Pay Balance
                      </Button>
                    ) : row.can_pay && hasFundTypeMismatch(row) ? (
                      <Box sx={{ color: "warning.dark", display: "flex", alignItems: "center", gap: 0.5 }}>
                        <WarningAmberOutlinedIcon fontSize="small" />
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>Fund mismatch</Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption">Paid</Typography>
                    )}
                  </TableCell>
                </>
              )}
            />
          )}
        </Box>
        {loadingMore && <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}><CircularProgress size={22} /></Box>}
        {!loading && !rows.length && <Alert severity="info" sx={{ mt: 2 }}>No student balance records found.</Alert>}
      </Paper>

      <Dialog
        open={Boolean(paymentRow)}
        onClose={closePayment}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            borderRadius: "16px",
            overflow: "hidden",
            minWidth: { xs: "94vw", md: 760 },
            boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: "#6D2323",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: "bold",
            px: 3,
            py: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: "50%",
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ReceiptLongOutlinedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography fontWeight="bold" fontSize={16} color="white" lineHeight={1.2}>
                Confirm Student Balance Payment
              </Typography>
              <Typography fontSize={12} color="rgba(255,255,255,0.8)" lineHeight={1.2}>
                Review the payment details before saving
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={closePayment}
            disabled={saving}
            sx={{
              color: "white",
              border: "2px solid rgba(255,255,255,0.6)",
              borderRadius: "50%",
              width: 38,
              height: 38,
              padding: 0,
              "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            px: { xs: 2, md: 3 },
            pt: 2.5,
            pb: 2,
            background: "linear-gradient(180deg, #fff 0%, #fafafa 100%)",
          }}
        >
          <br />
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {paymentRow?.student_full_name} (<strong>{paymentRow?.student_number}</strong>)
          </Typography>

          {hasFundTypeMismatch(paymentRow) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {getFundTypeMismatchMessage(paymentRow)}
            </Alert>
          )}

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
            {[
              ["TOTAL FEE", paymentRow?.total_fee, "#EF4444"],
              ["CURRENT BALANCE", paymentRow?.balance, "#2563EB"],
              ["PAYMENT", enteredPayment, "#22C55E"],
            ].map(([label, value, color]) => (
              <Box key={label} sx={{ flex: "1 1 190px", minHeight: 125, background: color, fontWeight: 700, p: 2, color: "white", borderRadius: "10px" }}>
                <Typography>{label}:</Typography>
                <Box sx={{ height: 80, display: "flex", alignItems: "center", fontSize: { xs: 26, md: 32 } }}>
                  ₱ {money(value)}
                </Box>
              </Box>
            ))}
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            <TextField size="small" label="Total Fee" value={money(paymentRow?.total_fee)} disabled />
            <TextField size="small" label="Current Balance" value={money(paymentRow?.balance)} disabled />
            <TextField
              autoFocus
              size="small"
              type="number"
              label="Payment Amount"
              value={paymentValue}
              onChange={(event) => setPaymentValue(event.target.value)}
              inputProps={{ min: 0, max: paymentRow?.balance, step: "0.01" }}
              disabled={saving}
              error={paymentExceedsBalance}
              helperText={paymentExceedsBalance ? "Payment cannot exceed the current balance." : ""}
            />
            <TextField size="small" label="Balance After Payment" value={money(balanceAfterPayment)} disabled />
          </Box>

          <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1.45fr" }, gap: 2 }}>
            <Box sx={{ p: 1, border: "1px solid #d9d9d9", borderRadius: 1, minHeight: 260 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                Payment Summary Graph
              </Typography>
              <Box sx={{ height: 220, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentSummaryChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid stroke="#666666" strokeOpacity={0.7} strokeWidth={1.2} strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(value) => money(value)} />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]} fillOpacity={0.3}>
                      {paymentSummaryChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Box>

            <Box sx={{ p: 1, border: "1px solid #d9d9d9", borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                Fee Breakdown in Privilege Order
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                Fees shown below are still unpaid or partially unpaid and are ordered by payment priority.
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 220 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Priority</TableCell>
                      <TableCell>Fee</TableCell>
                      <TableCell>Fund Number</TableCell>
                      <TableCell align="right">Remaining Fee</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(paymentRow?.fee_breakdown || []).length ? (
                      paymentRow.fee_breakdown.map((item) => (
                        <TableRow key={`${item.fee}-${item.priority}`}>
                          <TableCell>{item.priority}</TableCell>
                          <TableCell>{item.fee}</TableCell>
                          <TableCell>{item.account_type_label || "—"}</TableCell>
                          <TableCell align="right">{money(item.fee_amount)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">No unpaid fee breakdown available.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1.5, gap: 1 }}>
          <Button onClick={closePayment} color="error" variant="outlined" disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={savePayment}
            variant="contained"
            disabled={saving || paymentExceedsBalance || hasFundTypeMismatch(paymentRow)}
            sx={{ borderRadius: "10px", textTransform: "none", px: 3, fontWeight: "bold", backgroundColor: "#6D2323" }}
          >
            {saving ? "Saving..." : "Confirm Payment"}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={notice.open} autoHideDuration={5000} onClose={() => setNotice((current) => ({ ...current, open: false }))}>
        <Alert severity={notice.severity} onClose={() => setNotice((current) => ({ ...current, open: false }))}>{notice.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentBalanceList;
