import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import { SettingsContext } from "../App";
import {
    Box,
    Paper,
    Typography,
    FormControl,
    Select,
    MenuItem,
    TextField,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TableContainer,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Snackbar,
    Alert,
    IconButton,
} from "@mui/material";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import HistoryToggleOffIcon from '@mui/icons-material/HistoryToggleOff';
import CloseIcon from "@mui/icons-material/Close";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import html2canvas from "html2canvas";
import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
} from "recharts";
import { TableVirtuoso } from "react-virtuoso";

const RECEIPT_STATUS = {
    PAID_NOT_PRINTED: "PAID_NOT_PRINTED",
    PRINTED: "PRINTED",
    VOID: "VOID",
    REPRINTED: "REPRINTED",
    CANCELLED_PRINT: "CANCELLED_PRINT",
};

const VOID_REASON_OPTIONS = [
    "Duplicate transaction",
    "Wrong amount entered",
    "Wrong payment method selected",
    "Wrong customer/student selected",
    "Incorrect item/service encoded",
    "Customer cancelled transaction",
    "Printer error / misprint",
    "System error",
    "Accidental transaction",
    "Incomplete payment",
    "Incorrect discount applied",
    "Receipt printed twice",
    "Change in transaction details",
    "Failed transaction",
    "Payment not received",
    "Wrong cashier/operator",
    "Others",
];

const HISTORY_INITIAL_BATCH = 50;
const HISTORY_BATCH_STEP = 50;

const VirtuosoTableComponents = {
    Scroller: React.forwardRef((props, ref) => (
        <Box
            {...props}
            ref={ref}
            sx={{
                ...props.sx,
                overflowY: "auto",
            }}
        />
    )),
    Table: (props) => (
        <Table
            {...props}
            sx={{
                borderCollapse: "separate",
                tableLayout: "fixed",
                minWidth: 1060,
                ...props.sx,
            }}
        />
    ),
    TableHead: React.forwardRef((props, ref) => <TableHead {...props} ref={ref} />),
    TableRow: (props) => <TableRow {...props} />,
    TableBody: React.forwardRef((props, ref) => <TableBody {...props} ref={ref} />),
};

import {
    computePriorityPayment,
    computeScopedBalance,
    toAmount,
} from "../utils/matriculationPayment";

const formatAcademicSchoolYear = (row) => {
    const currentYear = row?.current_year ?? row?.year_description;
    const nextYear = row?.next_year;
    const semester = row?.semester_description;

    if (currentYear && nextYear && semester) {
        return `${currentYear}-${nextYear}, ${semester}`;
    }

    if (currentYear && semester) {
        return `${currentYear}, ${semester}`;
    }

    return row?.active_school_year_id || "";
};

const formatReceiptStatusLabel = (status) => {
    const normalized = String(status || "").trim().toUpperCase();
    switch (normalized) {
        case RECEIPT_STATUS.PAID_NOT_PRINTED:
            return "Not Printed";
        case RECEIPT_STATUS.PRINTED:
            return "Printed";
        case RECEIPT_STATUS.VOID:
            return "Voided";
        case RECEIPT_STATUS.REPRINTED:
            return "Reprinted";
        case RECEIPT_STATUS.CANCELLED_PRINT:
            return "Print Cancelled";
        default:
            return normalized ? normalized.replace(/_/g, " ") : "-";
    }
};

const historyColumnWidth = {
    id: 118,
    student: 122,
    payment: 92,
    employee: 112,
    sy: 180,
    remark: 162,
    receipt: 118,
    count: 92,
    created: 152,
};

const formatTransactionDateTime = (value) => {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
};

const MatriculationPaymentModule = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";

    const [borderColor, setBorderColor] = useState("#000000");
    const [titleColor, setTitleColor] = useState("#6D2323");
    const [loading, setLoading] = useState(false);
    const [hasAccess, setHasAccess] = useState(null);
    const pageId = 121;

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [data, setData] = useState([]);
    const [keepVisiblePaidMatriculationId, setKeepVisiblePaidMatriculationId] = useState(null);
    const [cashierAccountTypeId, setCashierAccountTypeId] = useState(null);
    const pageSize = 100; // Number of rows per page
    const getScopedRowTotal = (row) =>
        computeScopedBalance(
            row?.fee_lines || [],
            cashierAccountTypeId,
            row?.tuition_fees,
            Number(row?.tuition_is_paid) === 1,
            toAmount(row?.tuition_paid_amount)
        );

    const getFeeLineAssessmentTotal = (row) => {
        const feeLines = Array.isArray(row?.fee_lines) ? row.fee_lines : [];
        if (!feeLines.length) return 0;

        const feeLineTotal = feeLines.reduce((sum, line) => sum + toAmount(line?.amount), 0);
        const hasTuitionLine = feeLines.some(
            (line) =>
                Boolean(line?.is_tuition) ||
                Number(line?.fee_rate_id) === 0 ||
                String(line?.fee_code || "").toUpperCase() === "TUITION"
        );

        return feeLineTotal + (hasTuitionLine ? 0 : toAmount(row?.tuition_fees));
    };

    const getOverallAssessment = (row) => {
        const feeLineAssessment = getFeeLineAssessmentTotal(row);
        if (feeLineAssessment > 0) return feeLineAssessment;

        return toAmount(row?.total_tosf ?? row?.fees?.grandTotal ?? 0);
    };

    const getDisplayedBalance = (row) => {
        const scopedBalance = getScopedRowTotal(row);
        if (scopedBalance <= 0) {
            return 0;
        }

        if (row?.balance !== null && row?.balance !== undefined && row?.balance !== "") {
            return Math.max(toAmount(row.balance), 0);
        }

        const totalAssessment = getOverallAssessment(row);
        const paymentTotal = toAmount(row?.payment_total ?? row?.payment ?? 0);
        return Math.max(totalAssessment - paymentTotal, 0);
    };

    const accountTypeColumns = Array.from(
        (data || []).reduce((map, row) => {
            (row?.fee_lines || []).forEach((line) => {
                const accountTypeId = line?.account_type;
                if (accountTypeId === null || accountTypeId === undefined || accountTypeId === "") {
                    return;
                }

                const key = String(accountTypeId);
                const description = String(line?.account_type_description || "").trim();
                if (!map.has(key)) {
                    map.set(key, {
                        id: key,
                        label: description || key,
                    });
                } else if (description && !map.get(key)?.label) {
                    map.set(key, {
                        ...map.get(key),
                        label: description,
                    });
                }
            });
            return map;
        }, new Map()).values()
    ).sort((a, b) => Number(a.id) - Number(b.id));

    const visibleData = data.filter((row) => {
        const scopedBalance = getScopedRowTotal(row);
        const keepVisible = String(row?.id) === String(keepVisiblePaidMatriculationId);
        return scopedBalance > 0 || keepVisible;
    });

    const totalPages = Math.max(1, Math.ceil(visibleData.length / pageSize));

    // Dialog states
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmRow, setConfirmRow] = useState(null);
    const [paymentValue, setPaymentValue] = useState("");
    const [personData, setPersonData] = useState(null);
    const [viewReceiptPromptOpen, setViewReceiptPromptOpen] = useState(false);
    const [receiptOpen, setReceiptOpen] = useState(false);
    const [receiptData, setReceiptData] = useState(null);
    const [closeWithoutPrintConfirmOpen, setCloseWithoutPrintConfirmOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [transactionData, setTransactionData] = useState([]);
    const [historyRenderLimit, setHistoryRenderLimit] = useState(HISTORY_INITIAL_BATCH);
    const [voidingReceipt, setVoidingReceipt] = useState(false);
    const [voidConfirmOpen, setVoidConfirmOpen] = useState(false);
    const [voidReason, setVoidReason] = useState("");
    const [voidExplanation, setVoidExplanation] = useState("");
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "info",
    });

    const showSnackbar = (message, severity = "info") => {
        setSnackbar({ open: true, message, severity });
    };
    const auditConfig = {
        headers: {
            "x-audit-actor-id":
                personData?.employee_id ||
                localStorage.getItem("employee_id") ||
                localStorage.getItem("email") ||
                "unknown",
            "x-audit-actor-role": localStorage.getItem("role") || "registrar",
        },
    };

    const a5PrintRef = useRef(null);
    const receiptPrintedRef = useRef(false);

    useEffect(() => {
        if (!settings) return;
        if (colors.border) setBorderColor(colors.border);
        if (colors.title) setTitleColor(colors.title);
    }, [settings]);

    useEffect(() => {
        const storedUser = localStorage.getItem("email");
        const storedRole = localStorage.getItem("role");
        const storedID = localStorage.getItem("person_id");
        const storedEmployeeID = localStorage.getItem("employee_id");

        if (storedUser && storedRole && storedID) {
            if (storedRole === "registrar") {
                checkAccess(storedEmployeeID);
            } else {
                window.location.href = "/login";
            }
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
                await fetchStudentData();
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
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    useEffect(() => {
        const person_id = localStorage.getItem("person_id");
        const role = localStorage.getItem("role");

        if (person_id && role) {
            axios
                .get(`${API_BASE_URL}/api/person_data/${person_id}/${role}`)
                .then((res) => setPersonData(res.data))
                .catch((err) => console.error("Failed to fetch person data:", err));
        }
    }, []);

    useEffect(() => {
        const loadCashierAccountType = async () => {
            const employeeId =
                personData?.employee_id || localStorage.getItem("employee_id");
            if (!employeeId) return;

            try {
                const activeSchoolYearRes = await axios.get(
                    `${API_BASE_URL}/api/active_school_year`
                );
                const activeSchoolYear = activeSchoolYearRes.data?.[0];
                if (!activeSchoolYear?.school_year_id) return;

                const counterRes = await axios.get(
                    `${API_BASE_URL}/api/receipt-counter/active/${activeSchoolYear.school_year_id}`
                );
                const assignment = (counterRes.data || []).find(
                    (row) => String(row.employee_id) === String(employeeId)
                );
                setCashierAccountTypeId(assignment?.account_type_id ?? null);
            } catch (error) {
                console.error("Failed to load cashier fund number:", error);
                setCashierAccountTypeId(null);
            }
        };

        loadCashierAccountType();
    }, [personData?.employee_id]);

    const fetchStudentData = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/get_student_data_matriculation`);
            setData(res.data);
        } catch {
            showSnackbar("Failed to fetch matriculation data.", "error");
        }
    }

    const handleTransfer = async (row, payment) => {
        try {
            const saveEndpoint = "/api/payment_matriculation/";
            const employeeId = personData?.employee_id || localStorage.getItem("employee_id");
            const paymentSummary = computePriorityPayment(row, payment, cashierAccountTypeId);

            if (!employeeId) {
                showSnackbar("Employee id is required to save this payment.", "error");
                return;
            }

            if (paymentSummary.error) {
                showSnackbar(paymentSummary.error, "error");
                return;
            }

            if (paymentSummary.totalPayment <= 0) {
                showSnackbar("Payment must be greater than zero.", "warning");
                return;
            }

            const saveRes = await axios.put(`${API_BASE_URL}${saveEndpoint}${row.id}`, {
                payment: paymentSummary.totalPayment,
                balance: paymentSummary.balance,
                payment_status: paymentSummary.paymentStatus,
                employee_id: employeeId,
            }, auditConfig);
            setKeepVisiblePaidMatriculationId(row?.id ?? null);
            await fetchStudentData();
            setReceiptData({
                transaction_no: saveRes?.data?.transaction_no || saveRes?.data?.transaction_id || "",
                transaction_id: saveRes?.data?.transaction_no || saveRes?.data?.transaction_id || "",
                student_number: row?.student_number || "",
                student_name: `${row?.last_name || ""}, ${row?.given_name || ""} ${row?.middle_initial || ""}`.trim(),
                total_tosf: saveRes?.data?.total_tosf ?? paymentSummary.totalTosf,
                tuition_fees: row?.tuition_fees ?? 0,
                total_misc: row?.total_misc ?? 0,
                nstp_fees: row?.nstp_fees ?? 0,
                registration_fees: row?.registration_fees ?? 0,
                athletic_fees: row?.athletic_fees ?? 0,
                computer_fees: row?.computer_fees ?? 0,
                cultural_fees: row?.cultural_fees ?? 0,
                development_fees: row?.development_fees ?? 0,
                guidance_fees: row?.guidance_fees ?? 0,
                laboratory_fees: row?.laboratory_fees ?? 0,
                library_fees: row?.library_fees ?? 0,
                medical_and_dental_fees: row?.medical_and_dental_fees ?? 0,
                school_id_fees: row?.school_id_fees ?? 0,
                payment_entered: paymentSummary.totalPayment,
                payment_applied: saveRes?.data?.payment_applied ?? paymentSummary.appliedPayment,
                balance: saveRes?.data?.balance ?? paymentSummary.balance,
                unpaid_total: paymentSummary.unpaidTotal,
                payment_breakdown: saveRes?.data?.payment_breakdown || paymentSummary.allocations,
                employee_id: employeeId,
                active_school_year_id: saveRes?.data?.active_school_year_id || row?.active_school_year_id || "",
                remark: "Matriculation payment",
                receipt_status: saveRes?.data?.receipt_status || RECEIPT_STATUS.PAID_NOT_PRINTED,
                created_at: new Date().toLocaleString(),
            });
            receiptPrintedRef.current = false;
            setViewReceiptPromptOpen(true);
            showSnackbar("Matriculation payment saved successfully.", "success");

        } catch (error) {
            console.error(error);
            showSnackbar(
                error?.response?.data?.message || "Failed to save matriculation payment.",
                "error"
            );
        }
    };

    const openConfirm = (row) => {
        setConfirmRow(row);
        setPaymentValue("0");
        setConfirmOpen(true);
    };

    const closeConfirm = () => {
        setConfirmOpen(false);
        setConfirmRow(null);
        setPaymentValue("");
    };

    const handleConfirmTransfer = async () => {
        if (!confirmRow) return;
        if (paymentValue === "" || paymentValue === null) {
            showSnackbar("Payment is required.", "warning");
            return;
        }
        const paymentSummary = computePriorityPayment(confirmRow, paymentValue, cashierAccountTypeId);
        if (paymentSummary.error) {
            showSnackbar(paymentSummary.error, "warning");
            return;
        }
        if (paymentSummary.totalPayment > paymentSummary.totalTosf) {
            showSnackbar("Payment exceeds the student's total amount to pay (Total Amount to pay).", "warning");
            return;
        }
        try {
            await handleTransfer(confirmRow, paymentValue);
            setConfirmOpen(false);
            setConfirmRow(null);
            setPaymentValue("");
        } catch (error) {
            console.error(error);
        }
    };

    const openTransactionHistory = async () => {
        setHistoryOpen(true);
        setHistoryLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/payment_matriculation/transactions`);
            const rows = res.data || [];
            setTransactionData(rows);
            setHistoryRenderLimit(Math.min(HISTORY_INITIAL_BATCH, rows.length || HISTORY_INITIAL_BATCH));
            showSnackbar("Transaction history loaded.", "success");
        } catch (error) {
            console.error(error);
            showSnackbar(
                error?.response?.data?.message || "Failed to load transaction history.",
                "error"
            );
            setTransactionData([]);
            setHistoryRenderLimit(HISTORY_INITIAL_BATCH);
        } finally {
            setHistoryLoading(false);
        }
    };

    const markReceiptPrinted = async () => {
        const transactionId = receiptData?.transaction_no || receiptData?.transaction_id;
        if (!transactionId) return null;

        const res = await axios.put(
            `${API_BASE_URL}/api/payment_matriculation/print/${transactionId}`,
            null,
            auditConfig
        );

        const nextStatus = res?.data?.receipt_status || RECEIPT_STATUS.PRINTED;
        setReceiptData((prev) => ({
            ...prev,
            remark: nextStatus === RECEIPT_STATUS.REPRINTED ? "Reprinted" : "Printed",
            receipt_status: nextStatus,
        }));
        return nextStatus;
    };

    const handlePrintA5 = async () => {
        if (!a5PrintRef.current) return;

        let canvas;
        try {
            canvas = await html2canvas(a5PrintRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
            });
        } catch (error) {
            console.error("Failed to capture receipt for printing:", error);
            showSnackbar("Failed to print receipt.", "error");
            return;
        }

        const imageData = canvas.toDataURL("image/png", 1.0);
        const printWindow = window.open("", "_blank", "width=900,height=700");
        if (!printWindow) return;

        try {
            await markReceiptPrinted();
            receiptPrintedRef.current = true;
        } catch (error) {
            console.error(error);
            showSnackbar(
                error?.response?.data?.message || "Failed to update receipt print status.",
                "error"
            );
            printWindow.close();
            return;
        }

        printWindow.document.write(`
            <!doctype html>
            <html>
                <head>
                    <title>Matriculation Payment Receipt</title>
                    <style>
                        @page { size: A5 portrait; margin: 0; }
                        html, body {
                            width: 148mm;
                            height: 210mm;
                            margin: 0;
                            padding: 0;
                            overflow: hidden;
                            background: #fff;
                        }
                        .print-page {
                            width: 148mm;
                            height: 210mm;
                        }
                        .print-page img {
                            width: 100%;
                            height: 100%;
                            display: block;
                        }
                    </style>
                </head>
                <body>
                    <div class="print-page">
                        <img src="${imageData}" alt="Matriculation Receipt" />
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        };
    };

    const markCancelledPrintIfUnprinted = async () => {
        if (receiptPrintedRef.current) return;
        const transactionId = receiptData?.transaction_no || receiptData?.transaction_id;
        if (
            !transactionId ||
            receiptData?.receipt_status === RECEIPT_STATUS.CANCELLED_PRINT ||
            receiptData?.receipt_status === RECEIPT_STATUS.VOID
        ) return;

        try {
            const res = await axios.put(`${API_BASE_URL}/api/payment_matriculation/cancel-print/${transactionId}`, null, auditConfig);
            setReceiptData((prev) => ({
                ...prev,
                remark: "Cancelled Print",
                receipt_status: res?.data?.receipt_status || RECEIPT_STATUS.CANCELLED_PRINT,
            }));
            showSnackbar("Receipt printing cancelled.", "warning");
        } catch (error) {
            console.error(error);
            showSnackbar(
                error?.response?.data?.message || "Failed to mark cancelled print.",
                "error"
            );
        }
    };

    const openVoidConfirm = () => {
        setVoidReason("");
        setVoidExplanation("");
        setVoidConfirmOpen(true);
    };

    const closeVoidConfirm = () => {
        if (voidingReceipt) return;
        setVoidConfirmOpen(false);
    };

    const handleVoidReceipt = async () => {
        const transactionId = receiptData?.transaction_no || receiptData?.transaction_id;
        if (!transactionId) {
            showSnackbar("No transaction id found for this receipt.", "warning");
            return;
        }

        const trimmedExplanation = voidExplanation.trim();
        if (!voidReason) {
            showSnackbar("Please select a void reason.", "warning");
            return;
        }

        if (voidReason === "Others" && !trimmedExplanation) {
            showSnackbar("Please enter an explanation for Others.", "warning");
            return;
        }

        try {
            setVoidingReceipt(true);
            await axios.put(`${API_BASE_URL}/api/payment_matriculation/void/${transactionId}`, {
                void_reason: voidReason,
                void_explanation: trimmedExplanation,
            }, auditConfig);
            const voidRemark = trimmedExplanation
                ? `Void - ${voidReason}: ${trimmedExplanation}`
                : `Void - ${voidReason}`;
            setReceiptData((prev) => ({
                ...prev,
                remark: voidRemark,
                receipt_status: RECEIPT_STATUS.VOID,
            }));
            setVoidConfirmOpen(false);
            showSnackbar("Receipt marked as void.", "success");
        } catch (error) {
            console.error(error);
            showSnackbar(
                error?.response?.data?.message || "Failed to void receipt.",
                "error"
            );
        } finally {
            setVoidingReceipt(false);
        }
    };

    const handleViewReceiptNo = async () => {
        setViewReceiptPromptOpen(false);
        await markCancelledPrintIfUnprinted();
        receiptPrintedRef.current = false;
        setKeepVisiblePaidMatriculationId(null);
        await fetchStudentData();
    };

    const handleViewReceiptYes = () => {
        setViewReceiptPromptOpen(false);
        receiptPrintedRef.current = false;
        setReceiptOpen(true);
    };

    const handleCloseReceipt = async () => {
        if (!receiptPrintedRef.current) {
            setCloseWithoutPrintConfirmOpen(true);
            return;
        }

        await markCancelledPrintIfUnprinted();
        setReceiptOpen(false);
        receiptPrintedRef.current = false;
        setKeepVisiblePaidMatriculationId(null);
        await fetchStudentData();
    };

    const handleConfirmCloseWithoutPrint = async () => {
        setCloseWithoutPrintConfirmOpen(false);
        await markCancelledPrintIfUnprinted();
        setReceiptOpen(false);
        receiptPrintedRef.current = false;
        setKeepVisiblePaidMatriculationId(null);
        await fetchStudentData();
    };

    const handleCancelCloseWithoutPrint = () => {
        setCloseWithoutPrintConfirmOpen(false);
    };

    const paginatedData = visibleData.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const numberToWords = (num) => {
        if (num === 0) return "Zero";

        const belowTwenty = [
            "", "One", "Two", "Three", "Four", "Five", "Six",
            "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
            "Thirteen", "Fourteen", "Fifteen", "Sixteen",
            "Seventeen", "Eighteen", "Nineteen"
        ];

        const tens = [
            "", "", "Twenty", "Thirty", "Forty",
            "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
        ];

        const thousands = ["", "Thousand", "Million", "Billion"];

        const helper = (n) => {
            if (n === 0) return "";
            if (n < 20) return belowTwenty[n] + " ";
            if (n < 100)
                return tens[Math.floor(n / 10)] + " " + helper(n % 10);
            return (
                belowTwenty[Math.floor(n / 100)] +
                " Hundred " +
                helper(n % 100)
            );
        };

        let word = "";
        let i = 0;

        while (num > 0) {
            if (num % 1000 !== 0) {
                word =
                    helper(num % 1000) +
                    thousands[i] +
                    " " +
                    word;
            }
            num = Math.floor(num / 1000);
            i++;
        }

        return word.trim();
    };

    const confirmPaymentSummary = confirmRow
        ? computePriorityPayment(confirmRow, paymentValue, cashierAccountTypeId)
        : null;
    const isOverPayment = Boolean(
        confirmPaymentSummary && confirmPaymentSummary.totalPayment > confirmPaymentSummary.totalTosf
    );
    const receiptPaidBreakdown = Array.isArray(receiptData?.payment_breakdown)
        ? receiptData.payment_breakdown
        : [];
    const isTuitionBreakdownItem = (item) =>
        Boolean(item?.is_tuition) ||
        String(item?.fee_code || item?.key || "").toUpperCase() === "TUITION";
    const isNstpBreakdownItem = (item) => {
        const code = String(item?.fee_code || item?.key || "").toUpperCase();
        const label = String(item?.label || item?.fee_name || "").toUpperCase();
        return code.includes("NSTP") || label.includes("NSTP");
    };
    const receiptPaidLines = receiptPaidBreakdown
        .filter((item) => toAmount(item.paid_amount) > 0)
        .sort(
            (a, b) =>
                Number(a.priority ?? a.sort_order ?? 0) -
                Number(b.priority ?? b.sort_order ?? 0)
        );
    const receiptTuitionPaid = receiptPaidLines
        .filter(isTuitionBreakdownItem)
        .reduce((sum, item) => sum + toAmount(item.paid_amount), 0);
    const receiptNstpPaid = receiptPaidLines
        .filter((item) => !isTuitionBreakdownItem(item) && isNstpBreakdownItem(item))
        .reduce((sum, item) => sum + toAmount(item.paid_amount), 0);
    const receiptMiscLines = receiptPaidLines.filter(
        (item) => !isTuitionBreakdownItem(item) && !isNstpBreakdownItem(item)
    );
    const receiptMiscPaid = receiptMiscLines.reduce(
        (sum, item) => sum + toAmount(item.paid_amount),
        0
    );
    const formatReceiptAmount = (value) => toAmount(value).toLocaleString();
    const historyRows = useMemo(
        () => transactionData.slice(0, historyRenderLimit),
        [transactionData, historyRenderLimit]
    );
    const historyHasMore = historyRenderLimit < transactionData.length;
    const loadMoreHistoryRows = () => {
        if (!historyHasMore) return;
        setHistoryRenderLimit((prev) =>
            Math.min(prev + HISTORY_BATCH_STEP, transactionData.length)
        );
    };



    const confirmPaymentChartData = [
        {
            name: "Total Amount",
            amount: toAmount(confirmPaymentSummary?.totalTosf),
            color: "#6D2323",
        },
        {
            name: "Student Payment",
            amount: toAmount(confirmPaymentSummary?.totalPayment),
            color: "#1565C0",
        },
        {
            name: "Balance",
            amount: toAmount(confirmPaymentSummary?.balance),
            color: "#EF6C00",
        },
    ];

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
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-start",
                    alignItems: "center",
                    flexWrap: "wrap",
                    mb: 2
                }}
            >
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: "bold",
                        color: titleColor,
                        fontSize: "36px"
                    }}
                >
                    MATRICULATION PAYMENT MODULE
                </Typography>
            </Box>

            <hr style={{ border: "1px solid #ccc", width: "100%" }} />
            <br />

            <Box fullWidth sx={{ p: '10px 0px', display: "flex", justifyContent: "flex-end" }}>
                <Button
                    startIcon={<HistoryToggleOffIcon />}
                    sx={{
                        backgroundColor: colors.header || "maroon",
                        color: "white",
                        width: "230px",
                    }}
                    onClick={openTransactionHistory}
                >
                    Transaction History
                </Button>
            </Box>

            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                <Table stickyHeader size="small"
                    sx={{
                        "& th, & td": {
                            border: `1px solid ${borderColor}`,
                            textAlign: "center",
                            fontSize: "12px",
                        },
                        borderCollapse: "collapse",
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell
                                colSpan={19}
                                sx={{
                                    py: 0.5,
                                    backgroundColor: colors.header || "#6D2323",
                                    color: "white",
                                }}
                            >
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography fontSize="14px" fontWeight="bold" color="white">
                                        Total Students: {visibleData.length}
                                    </Typography>
                                    <Box display="flex" alignItems="center" gap={1}>
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
                                                '&:hover': {
                                                    borderColor: 'white',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                },
                                                '&.Mui-disabled': {
                                                    color: "white",
                                                    borderColor: "white",
                                                    backgroundColor: "transparent",
                                                    opacity: 1,
                                                }
                                            }}
                                        >
                                            First
                                        </Button>

                                        <Button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                minWidth: 80,
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                '&:hover': {
                                                    borderColor: 'white',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                },
                                                '&.Mui-disabled': {
                                                    color: "white",
                                                    borderColor: "white",
                                                    backgroundColor: "transparent",
                                                    opacity: 1,
                                                }
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
                                                    fontSize: '12px',
                                                    height: 36,
                                                    color: 'white',
                                                    border: '1px solid white',
                                                    backgroundColor: 'transparent',
                                                    '.MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'white',
                                                    },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'white',
                                                    },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: 'white',
                                                    },
                                                    '& svg': {
                                                        color: 'white',
                                                    }
                                                }}
                                                MenuProps={{
                                                    PaperProps: {
                                                        sx: {
                                                            maxHeight: 200,
                                                            backgroundColor: '#fff',
                                                        }
                                                    }
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
                                            of {totalPages} page{totalPages > 1 ? 's' : ''}
                                        </Typography>

                                        <Button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            variant="outlined"
                                            size="small"
                                            sx={{
                                                minWidth: 80,
                                                color: "white",
                                                borderColor: "white",
                                                backgroundColor: "transparent",
                                                '&:hover': {
                                                    borderColor: 'white',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                },
                                                '&.Mui-disabled': {
                                                    color: "white",
                                                    borderColor: "white",
                                                    backgroundColor: "transparent",
                                                    opacity: 1,
                                                }
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
                                                '&:hover': {
                                                    borderColor: 'white',
                                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                                },
                                                '&.Mui-disabled': {
                                                    color: "white",
                                                    borderColor: "white",
                                                    backgroundColor: "transparent",
                                                    opacity: 1,
                                                }
                                            }}
                                        >
                                            Last
                                        </Button>
                                    </Box>

                                </Box>
                            </TableCell>
                        </TableRow>

                        <TableRow>
                            <TableCell>No.</TableCell>
                            <TableCell>Campus</TableCell>
                            <TableCell>Student No.</TableCell>
                            <TableCell>Last Name</TableCell>
                            <TableCell>Given Name</TableCell>
                            <TableCell>MI</TableCell>
                            <TableCell>Degree Program</TableCell>
                            <TableCell>Year Level</TableCell>
                            <TableCell>Sex</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Lab Units</TableCell>
                            <TableCell>Comp Units</TableCell>
                            <TableCell>Acad Units</TableCell>
                            <TableCell>NSTP Units</TableCell>
                            <TableCell>Tuition</TableCell>
                            <TableCell>Total Misc</TableCell>
                            <TableCell>Overall Total</TableCell>
                            <TableCell>Balance</TableCell>
                            <TableCell>Action</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody
                        sx={{
                            border: `1px solid ${borderColor}`,
                            "& .MuiTableRow-root:nth-of-type(odd)": {
                                backgroundColor: "#ffffff",
                            },
                            "& .MuiTableRow-root:nth-of-type(even)": {
                                backgroundColor: "lightgray",
                            },
                        }}
                    >
                        {paginatedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={19} align="center" sx={{ height: "4cm" }}>
                                    No students to display.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedData.map((row, index) => (
                                <TableRow key={row.id || index}>
                                    <TableCell>{(currentPage - 1) * pageSize + index + 1}</TableCell>
                                    <TableCell>{row.campus_name}</TableCell>
                                    <TableCell>{row.student_number}</TableCell>
                                    <TableCell>{row.last_name}</TableCell>
                                    <TableCell>{row.given_name}</TableCell>
                                    <TableCell>{row.middle_initial}</TableCell>
                                    <TableCell>{row.program_description || row.degree_program}</TableCell>
                                    <TableCell>{row.year_level}</TableCell>
                                    <TableCell>{row.sex}</TableCell>
                                    <TableCell>{row.email_address}</TableCell>
                                    <TableCell align="right">{row.laboratory_units}</TableCell>
                                    <TableCell align="right">{row.computer_units}</TableCell>
                                    <TableCell align="right">{row.academic_units_enrolled}</TableCell>
                                    <TableCell align="right">{row.academic_units_nstp_enrolled}</TableCell>
                                    <TableCell align="right">{row.tuition_fees}</TableCell>
                                    <TableCell align="right">{row.total_misc}</TableCell>
                                    <TableCell align="right">{getOverallAssessment(row).toLocaleString()}</TableCell>
                                    <TableCell align="right">{getDisplayedBalance(row).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Button
                                            variant="contained"
                                            onClick={() => openConfirm(row)}
                                        >
                                            Transact to Matriculation
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer >

            {/* CONFIRM DIALOG */}
            <Dialog
                open={confirmOpen}
                onClose={closeConfirm}
                fullWidth
                maxWidth="lg"
                PaperProps={{
                    sx: {
                        borderRadius: "16px",
                        overflow: "hidden",
                        minWidth: { xs: "94vw", md: 1210 },
                        boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        bgcolor: headerColor,
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
                                Confirm Matriculation Payment
                            </Typography>
                            <Typography fontSize={12} color="rgba(255,255,255,0.8)" lineHeight={1.2}>
                                Review the payment breakdown before saving
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton
                        onClick={closeConfirm}
                        sx={{
                            color: "white",
                            border: "2px solid rgba(255,255,255,0.6)",
                            borderRadius: "50%",
                            width: 38,
                            height: 38,
                            padding: 0,
                            "&:hover": {
                                backgroundColor: "rgba(255,255,255,0.2)",
                                border: "2px solid white",
                            },
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 2.5, pb: 1.5, background: "linear-gradient(180deg, #fff 0%, #fafafa 100%)" }}>
                    <DialogContentText sx = {{ pt: 2.5}}>
                        Are you sure you want to save the payment to Matriculation for student{" "}
                        {confirmRow?.student_number || ""}?
                    </DialogContentText>
                    <Box sx={{ mt: "20px", display: "flex", alignItems: "center", gap: "1rem" }}>
                        <Box sx={{ mt: 1 }}>
                            <Box>
                                <Box sx={{ mb: 1, display: "flex", gap: 1 }}>
                                    <Box sx={{ width: "200px", height: "180px", background: "#EF4444", fontWeight: "700", padding: 2, color: "White", borderRadius: "10px" }}>
                                        <Typography>
                                            TOTAL:
                                        </Typography>
                                        <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "34px", marginTop: "-10px" }}>
                                            ₱{" "}{toAmount(confirmPaymentSummary?.totalTosf).toLocaleString()}
                                        </Box>
                                    </Box>
                                    <Box sx={{ width: "200px", height: "180px", background: "#2563EB", fontWeight: "700", padding: 2, color: "White", borderRadius: "10px" }}>
                                        <Typography>
                                            BALANCE:
                                        </Typography>
                                        <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "34px", marginTop: "-10px" }}>
                                            ₱{" "}{toAmount(confirmPaymentSummary?.balance).toLocaleString()}
                                        </Box>
                                    </Box>
                                </Box>
                                <Box sx={{ mb: 1, display: "flex", gap: 1 }}>
                                    <Box sx={{ width: "410px", height: "180px", background: "#22C55E", fontWeight: "700", padding: 2, color: "White", borderRadius: "10px" }}>
                                        <Typography>
                                            STUDENT'S PAYMENT:
                                        </Typography>
                                        <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", padding: "0px 20px", fontSize: "34px", marginTop: "-10px" }}>
                                            ₱{" "}{toAmount(confirmPaymentSummary?.totalPayment).toLocaleString()}
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                            <TextField
                                size="small"
                                type="number"
                                label="Total Fee"
                                readOnly
                                disabled
                                value={confirmPaymentSummary?.totalTosf || 0}
                                sx={{
                                    mt: 2,
                                    width: "406px",
                                    "& .MuiInputBase-input": { fontSize: "20px" },
                                }}
                            /><br />
                            <TextField
                                size="small"
                                type="number"
                                label="Payment"
                                value={paymentValue}
                                onChange={(e) => setPaymentValue(e.target.value)}
                                sx={{
                                    mt: 2,
                                    width: "406px",
                                    "& .MuiInputBase-input": { fontSize: "20px" },
                                }}
                                error={isOverPayment}
                                helperText={
                                    isOverPayment
                                        ? `Payment exceeds Total Amount to pay (${toAmount(confirmPaymentSummary?.totalTosf).toLocaleString()}).`
                                        : ""
                                }
                            /><br />
                            <TextField
                                fullWidth
                                size="small"
                                type="number"
                                disabled
                                label="Balance after Payment"
                                value={confirmPaymentSummary?.balance}
                                readOnly
                                sx={{
                                    mt: 2,
                                    width: "406px",
                                    "& .MuiInputBase-input": { fontSize: "20px" },
                                }}
                            />
                            <Box sx={{ mt: 2, width: "406px", display: "none", alignItems: "center", justifyContent: "end" }}>
                                <Button onClick={closeConfirm}
                                    color="error"
                                    variant="outlined"
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleConfirmTransfer} variant="contained" sx={{marginLeft: "10px"}} disabled={isOverPayment}>
                                    Confirm
                                </Button>
                            </Box>
                        </Box>
                        <Box>
                            <Box sx={{ mt: 2, p: 1, border: "1px solid #d9d9d9", borderRadius: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1, width: "700px" }}>
                                    Payment Summary Graph
                                </Typography>
                                <Box sx={{ height: 220, width: "100%" }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={confirmPaymentChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                                            <CartesianGrid stroke="#666666" strokeOpacity={0.7} strokeWidth={1.2} strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip formatter={(value) => Number(value).toLocaleString()} />
                                            <Bar dataKey="amount" radius={[6, 6, 0, 0]} fillOpacity={0.3}>
                                                {confirmPaymentChartData.map((entry) => (
                                                    <Cell key={entry.name} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Box>
                            </Box>
                            <Box sx={{ mt: 2, p: 1, border: "1px solid #d9d9d9", borderRadius: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                                    Fee Breakdown in Privilege Order{" "}
                                </Typography>
                                <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                                    Payment is applied in order from fee 0, then fee 1, and so on. Base tuition is always priority 0.
                                </Typography>
                                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 260 }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Priority</TableCell>
                                                <TableCell>Fee</TableCell>
                                                <TableCell>Fund Number</TableCell>
                                                <TableCell align="right">Fee Amount</TableCell>
                                            </TableRow>
                                        </TableHead>

                                        <TableBody
                                            sx={{
                                                border: `1px solid ${borderColor}`,
                                                "& .MuiTableRow-root:nth-of-type(odd)": {
                                                    backgroundColor: "#ffffff",
                                                },
                                                "& .MuiTableRow-root:nth-of-type(even)": {
                                                    backgroundColor: "lightgray",
                                                },
                                            }}
                                        >
                                            {(confirmPaymentSummary?.deductions || []).map((item) => (
                                                <TableRow key={`${item.key}-${item.priority}`}>
                                                    <TableCell>{item.priority}</TableCell>
                                                    <TableCell>{item.label}</TableCell>
                                                    <TableCell>{item.account_type_label || "—"}</TableCell>
                                                    <TableCell align="right">{toAmount(item.fee_amount).toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, pt: 1.5, gap: 1 }}>
                    <Button onClick={closeConfirm} color="error" variant="outlined">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmTransfer}
                        variant="contained"
                        disabled={isOverPayment}
                        sx={{
                            borderRadius: "10px",
                            textTransform: "none",
                            px: 3,
                            fontWeight: "bold",
                            backgroundColor: headerColor,
                        }}
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                fullWidth
                maxWidth="lg"
                PaperProps={{
                    sx: {
                        borderRadius: "16px",
                        overflow: "hidden",
                        minWidth: { xs: "92vw", md: 1100 },
                        boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        bgcolor: headerColor,
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
                            <HistoryToggleOffIcon fontSize="small" />
                        </Box>
                        <Box>
                            <Typography fontWeight="bold" fontSize={16} color="white" lineHeight={1.2}>
                                Transaction History
                            </Typography>
                            <Typography fontSize={12} color="rgba(255,255,255,0.8)" lineHeight={1.2}>
                                Virtualized transaction records with scroll loading
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton
                        onClick={() => setHistoryOpen(false)}
                        sx={{
                            color: "white",
                            border: "2px solid rgba(255,255,255,0.6)",
                            borderRadius: "50%",
                            width: 38,
                            height: 38,
                            padding: 0,
                            "&:hover": {
                                backgroundColor: "rgba(255,255,255,0.2)",
                                border: "2px solid white",
                            },
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ px: 3, pt: 2.5, pb: 1.5, background: "linear-gradient(180deg, #fff 0%, #fafafa 100%)" }}>
                    <Box
                        sx={{
                            border: "1px solid rgba(0,0,0,0.08)",
                            borderRadius: 2,
                            background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
                            boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
                            overflow: "hidden",
                            mt: 2
                        }}
                    >
                        {historyLoading ? (
                            <Typography sx={{ py: 4, px: 2 }}>Loading transaction history...</Typography>
                        ) : historyRows.length === 0 ? (
                            <Box sx={{ py: 6, textAlign: "center" }}>
                                <Typography fontSize={14} color="#555" fontWeight="bold">
                                    No transactions found.
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ height: 380 }}>
                                <TableVirtuoso
                                    data={historyRows}
                                    endReached={loadMoreHistoryRows}
                                    style={{ height: "100%" }}
                                    components={VirtuosoTableComponents}
                                    fixedHeaderContent={() => (
                                        <TableRow>
                                            {[
                                                "Transaction No.",
                                                "Student Number",
                                                "Payment",
                                                "Employee ID",
                                                "Academic School Year",
                                                "Receipt Status",
                                                "Created At",
                                            ].map((label) => (
                                                <TableCell
                                                    key={label}
                                                    sx={{
                                                        backgroundColor: headerColor,
                                                        color: "white",
                                                        fontWeight: "bold",
                                                        fontSize: 11,
                                                        textAlign: "center",
                                                        borderBottom: "1px solid rgba(255,255,255,0.18)",
                                                        borderRight: "1px solid rgba(255,255,255,0.12)",
                                                        py: 0.8,
                                                        px: 0.7,
                                                        whiteSpace: "nowrap",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                    }}
                                                >
                                                    {label}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    )} 
                                    itemContent={(index, tx) => [
                                        <TableCell
                                            key="id"
                                            sx={{
                                                width: historyColumnWidth.id,
                                                maxWidth: historyColumnWidth.id,
                                                textAlign: "center",
                                                fontSize: 11,
                                                borderBottom: `1px solid ${borderColor}`,
                                                borderRight: `1px solid ${borderColor}`,
                                                py: 0.65,
                                                px: 0.7,
                                                backgroundColor: index % 2 === 0 ? "#fff" : "#f8f8f8",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {tx.transaction_no}
                                        </TableCell>,
                                        <TableCell
                                            key="student"
                                            sx={{
                                                width: historyColumnWidth.student,
                                                maxWidth: historyColumnWidth.student,
                                                textAlign: "center",
                                                fontSize: 11,
                                                borderBottom: `1px solid ${borderColor}`,
                                                borderRight: `1px solid ${borderColor}`,
                                                py: 0.65,
                                                px: 0.7,
                                                backgroundColor: index % 2 === 0 ? "#fff" : "#f8f8f8",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {tx.student_number}
                                        </TableCell>,
                                        <TableCell
                                            key="payment"
                                            sx={{
                                                width: historyColumnWidth.payment,
                                                maxWidth: historyColumnWidth.payment,
                                                textAlign: "center",
                                                fontSize: 11,
                                                borderBottom: `1px solid ${borderColor}`,
                                                borderRight: `1px solid ${borderColor}`,
                                                py: 0.65,
                                                px: 0.7,
                                                backgroundColor: index % 2 === 0 ? "#fff" : "#f8f8f8",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {tx.payment}
                                        </TableCell>,
                                        <TableCell
                                            key="employee"
                                            sx={{
                                                width: historyColumnWidth.employee,
                                                maxWidth: historyColumnWidth.employee,
                                                textAlign: "center",
                                                fontSize: 11,
                                                borderBottom: `1px solid ${borderColor}`,
                                                borderRight: `1px solid ${borderColor}`,
                                                py: 0.65,
                                                px: 0.7,
                                                backgroundColor: index % 2 === 0 ? "#fff" : "#f8f8f8",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {tx.employee_id}
                                        </TableCell>,
                                        <TableCell
                                            key="sy"
                                            sx={{
                                                width: historyColumnWidth.sy,
                                                maxWidth: historyColumnWidth.sy,
                                                textAlign: "center",
                                                fontSize: 11,
                                                borderBottom: `1px solid ${borderColor}`,
                                                borderRight: `1px solid ${borderColor}`,
                                                py: 0.65,
                                                px: 0.7,
                                                backgroundColor: index % 2 === 0 ? "#fff" : "#f8f8f8",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {formatAcademicSchoolYear(tx)}
                                        </TableCell>,
                                        <TableCell
                                            key="receipt"
                                            sx={{
                                                width: historyColumnWidth.receipt,
                                                maxWidth: historyColumnWidth.receipt,
                                                textAlign: "center",
                                                borderBottom: `1px solid ${borderColor}`,
                                                borderRight: `1px solid ${borderColor}`,
                                                py: 0.65,
                                                px: 0.7,
                                                backgroundColor: index % 2 === 0 ? "#fff" : "#f8f8f8",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {formatReceiptStatusLabel(tx.receipt_status)}
                                        </TableCell>,
                                        <TableCell
                                            key="created"
                                            sx={{
                                                width: historyColumnWidth.created,
                                                maxWidth: historyColumnWidth.created,
                                                textAlign: "center",
                                                fontSize: 11,
                                                borderBottom: `1px solid ${borderColor}`,
                                                py: 0.65,
                                                px: 0.7,
                                                backgroundColor: index % 2 === 0 ? "#fff" : "#f8f8f8",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {formatTransactionDateTime(tx.created_at)}
                                        </TableCell>,
                                    ]}
                                />
                                {historyHasMore && (
                                    <Box sx={{ px: 2, py: 1.2, textAlign: "center", borderTop: `1px solid ${borderColor}`, backgroundColor: "#fafafa" }}>
                                        <Typography fontSize={12} color="#666">
                                            Scroll to load more transaction records.
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 3, pt: 1.5 }}>
                    <Button onClick={() => setHistoryOpen(false)} color="error" variant="outlined">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={viewReceiptPromptOpen} onClose={handleViewReceiptNo}>
                <DialogTitle>View Receipt</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Payment saved successfully. Do you wish to view the receipt?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleViewReceiptNo} color="inherit">
                        No
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleViewReceiptYes}
                    >
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={receiptOpen}
                onClose={handleCloseReceipt}
                fullWidth
                maxWidth="lg"
                PaperProps={{
                    sx: {
                        borderRadius: "16px",
                        overflow: "hidden",
                        width: "min(96vw, 168mm)",
                        maxWidth: "168mm",
                        boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        bgcolor: headerColor,
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
                                RECEIPT
                            </Typography>
                            <Typography fontSize={12} color="rgba(255,255,255,0.8)" lineHeight={1.2}>
                                Review and print the generated receipt
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton
                        onClick={handleCloseReceipt}
                        sx={{
                            color: "white",
                            border: "2px solid rgba(255,255,255,0.6)",
                            borderRadius: "50%",
                            width: 38,
                            height: 38,
                            padding: 0,
                            "&:hover": {
                                backgroundColor: "rgba(255,255,255,0.2)",
                                border: "2px solid white",
                            },
                        }}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ px: 3, pt: 2.5, pb: 1.5, background: "linear-gradient(180deg, #fff 0%, #fafafa 100%)" }}>
                    <Box
                        ref={a5PrintRef}
                        id="student-receipt-a5-print"
                        sx={{
                            mt: 1,
                            minWidth: "14.1cm",
                            maxWidth: "14.1cm",
                            minHeight: "21.7cm",
                            maxHeight: "21.7cm",
                            width: "14.1cm",
                            height: "21.7cm",
                            p: 2,
                            border: "1px solid #d9d9d9",
                            borderRadius: 1,
                            overflow: "hidden",
                            boxSizing: "border-box",
                            position: "relative",
                        }}
                    >
                        <Box>
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                                <Typography variant="body2" sx={{ mt: '4cm', ml: '6.5cm' }}>
                                </Typography>
                                <Typography variant="body2" sx={{ mt: '4cm', width: '3.1cm' }}>
                                    {receiptData?.transaction_no || receiptData?.transaction_id || "-"}
                                </Typography>
                                <Typography variant="body2" sx={{ mt: '4cm', width: '2cm', ml: '2cm' }}>
                                    {new Date().toLocaleDateString()}
                                </Typography>
                                <Typography variant="body2" sx={{ mt: '4cm', ml: '6.5cm' }}>
                                </Typography>
                            </Box>

                            <>
                                <Typography variant="body2" sx={{ mt: '0.5cm', marginLeft: '2.8cm' }}>
                                    {`${receiptData?.student_name || ""}`} ({receiptData?.student_number || " "})
                                </Typography>
                            </>

                            {receiptTuitionPaid > 0 && (
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                    <Typography variant="body2" sx={{ mt: '1.3cm', marginLeft: '1.7cm', width: '7cm' }}>
                                        TUITION FEE
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: '1.3cm', ml: '1cm', textAlign: 'right' }}>
                                        {formatReceiptAmount(receiptTuitionPaid)}
                                    </Typography>
                                </Box>
                            )}

                            {receiptMiscPaid > 0 && (
                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                    <Typography variant="body2" sx={{ mt: '0.1cm', marginLeft: '1.7cm', width: '7cm' }}>
                                        MISCELLANEOUS FEE
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: '0.1cm', ml: '1cm', textAlign: 'right' }}>
                                        {formatReceiptAmount(receiptMiscPaid)}
                                    </Typography>
                                </Box>
                            )}

                            {receiptMiscLines.map((item, index) => (
                                <Box key={`${item.fee_code || item.key || item.label}-${index}`} sx={{ display: "flex", alignItems: "center" }}>
                                    <Typography variant="body2" sx={{ mt: '0.1cm', marginLeft: '2.1cm', width: '6.6cm' }}>
                                        {item.label || item.fee_name}
                                    </Typography>
                                    <Typography variant="body2" sx={{ mt: '0.1cm', ml: '1cm', textAlign: 'right' }}>
                                        {formatReceiptAmount(item.paid_amount)}
                                    </Typography>
                                </Box>
                            ))}

                            <Box sx={{ display: "flex", alignItems: "center", mt: '0.1cm', }}>
                                {receiptNstpPaid > 0 ? (
                                    <>
                                        <Typography variant="body2" sx={{ marginLeft: "1.7cm", width: "7cm" }}>
                                            NSTP FEE
                                        </Typography>
                                        <Typography variant="body2" sx={{ ml: "1cm", textAlign: "right" }}>
                                            {formatReceiptAmount(receiptNstpPaid)}
                                        </Typography>
                                    </>
                                ) : (
                                    <>
                                        <Typography variant="body2" sx={{ marginTop: "0.4cm", marginLeft: "1.7cm", width: "7cm" }}>
                                            {" "}
                                        </Typography>
                                        <Typography variant="body2" sx={{ ml: "1cm", textAlign: "right" }}>
                                            {" "}
                                        </Typography>
                                    </>
                                )}
                            </Box>

                            <Box sx={{ display: "flex", alignItems: "center", position: "absolute", left: 0, right: 0, bottom: "5.2cm" }}>
                                <Typography variant="body2" sx={{ marginLeft: '1.7cm', width: '7cm' }}>

                                </Typography>
                                <Typography variant="body2" sx={{ ml: '1cm' }}>
                                    {formatReceiptAmount(receiptData?.payment_entered)}
                                </Typography>
                            </Box>

                            <Box sx={{ display: "flex", alignItems: "center", position: "absolute", left: 0, right: 0, bottom: "4.35cm" }}>
                                <Typography variant="body2" sx={{ ml: '1.8cm' }}>
                                    {numberToWords(receiptData?.payment_entered || 0)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", position: "absolute", left: 0, right: 0, bottom: "2cm" }}>
                                <Typography variant="body2" sx={{ ml: '3.75cm' }}>
                                </Typography>
                                <Typography variant="body2" sx={{ width: '6cm', textAlign: 'center' }}>
                                    {personData
                                        ? `${personData.lname.toUpperCase()}, ${personData.fname.toUpperCase()}`
                                        : ""}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, pt: 1.5, justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", gap: 1 }}>
                        <Button variant="contained" onClick={handlePrintA5}>
                            Print
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={openVoidConfirm}
                            disabled={voidingReceipt}
                        >
                            {voidingReceipt ? "Voiding..." : "Void"}
                        </Button>
                    </Box>
                    <Button onClick={handleCloseReceipt} color="error"
                        variant="outlined">Close</Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={voidConfirmOpen}
                onClose={closeVoidConfirm}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Void Receipt</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Select the reason for voiding receipt {receiptData?.transaction_no || receiptData?.transaction_id || ""}.
                    </DialogContentText>
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <Select
                            displayEmpty
                            value={voidReason}
                            onChange={(event) => setVoidReason(event.target.value)}
                        >
                            <MenuItem value="">
                                Select void reason
                            </MenuItem>
                            {VOID_REASON_OPTIONS.map((reason) => (
                                <MenuItem key={reason} value={reason}>
                                    {reason}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    {voidReason === "Others" && (
                        <TextField
                            fullWidth
                            required
                            multiline
                            minRows={3}
                            size="small"
                            label="Explanation"
                            value={voidExplanation}
                            onChange={(event) => setVoidExplanation(event.target.value)}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={closeVoidConfirm}
                        color="inherit"
                        disabled={voidingReceipt}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleVoidReceipt}
                        disabled={voidingReceipt || !voidReason || (voidReason === "Others" && !voidExplanation.trim())}
                    >
                        {voidingReceipt ? "Voiding..." : "Void Receipt"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={closeWithoutPrintConfirmOpen}
                onClose={handleCancelCloseWithoutPrint}
            >
                <DialogContent>
                    <DialogContentText>
                        You have not printed this receipt yet. Do you want to close it anyway?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelCloseWithoutPrint}
                        color="error"
                        variant="outlined"
                    >
                        No
                    </Button>
                    <Button color="error"
                        variant="outlined" onClick={handleConfirmCloseWithoutPrint}>
                        Yes, Close
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                    sx={{ width: "100%" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default MatriculationPaymentModule;
