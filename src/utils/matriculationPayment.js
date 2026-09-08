export const toAmount = (value) => {
  const normalizedValue =
    typeof value === "string" ? value.replace(/,/g, "").trim() : value;
  const parsed = Number(normalizedValue);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

export const isLinePaid = (line) => Number(line?.is_paid) === 1;

export const getLineRemaining = (line) => {
  if (isLinePaid(line)) return 0;
  const amount = toAmount(line?.amount);
  const paidAmount = toAmount(line?.paid_amount);
  return Math.max(amount - paidAmount, 0);
};

export const isLineEligibleForAccountType = (line, accountTypeId) => {
  if (accountTypeId == null) return true;
  if (line?.account_type == null) return true;
  return Number(line.account_type) === Number(accountTypeId);
};

const isTuitionLine = (line) =>
  Boolean(line?.is_tuition) ||
  Number(line?.fee_rate_id) === 0 ||
  String(line?.fee_code || "").toUpperCase() === "TUITION";

const sortFeeLines = (lines) =>
  [...lines].sort(
    (a, b) =>
      Number(a.sort_order) - Number(b.sort_order) ||
      String(a.fee_name || "").localeCompare(String(b.fee_name || ""))
  );

export const getTuitionRemaining = (
  tuitionFees = 0,
  tuitionIsPaid = false,
  tuitionPaidAmount = 0
) => {
  if (tuitionIsPaid) return 0;
  return Math.max(
    toAmount(tuitionFees) - toAmount(tuitionPaidAmount),
    0
  );
};

export const buildVirtualTuitionLine = (
  tuitionFees,
  tuitionIsPaid = false,
  tuitionPaidAmount = 0
) => {
  const remaining = getTuitionRemaining(
    tuitionFees,
    tuitionIsPaid,
    tuitionPaidAmount
  );
  if (remaining <= 0) return null;

  return {
    id: "tuition",
    fee_code: "TUITION",
    fee_name: "Tuition Fees",
    sort_order: 0,
    account_type: null,
    account_type_description: null,
    amount: toAmount(tuitionFees),
    paid_amount: toAmount(tuitionPaidAmount),
    is_paid: 0,
    is_tuition: true,
  };
};

const resolveTuitionLine = (
  feeLines = [],
  tuitionFees = 0,
  tuitionIsPaid = false,
  tuitionPaidAmount = 0
) => {
  const existing = feeLines.find(isTuitionLine);
  if (!existing) {
    return buildVirtualTuitionLine(
      tuitionFees,
      tuitionIsPaid,
      tuitionPaidAmount
    );
  }

  return {
    ...existing,
    id: existing.id ?? "tuition",
    fee_code: "TUITION",
    fee_name: existing.fee_name || "Tuition Fees",
    sort_order: 0,
    account_type: existing.account_type ?? null,
    account_type_description: existing.account_type_description ?? null,
    amount: toAmount(existing.amount ?? tuitionFees),
    paid_amount: toAmount(existing.paid_amount ?? tuitionPaidAmount),
    is_paid: Number(existing?.is_paid) === 1 || tuitionIsPaid ? 1 : 0,
    is_tuition: true,
    fee_rate_id: Number(existing?.fee_rate_id ?? 0),
  };
};

export const getUnpaidLinesForCashier = (
  feeLines = [],
  accountTypeId = null,
  tuitionFees = 0,
  tuitionIsPaid = false,
  tuitionPaidAmount = 0
) => {
  const tuitionLine = resolveTuitionLine(
    feeLines,
    tuitionFees,
    tuitionIsPaid,
    tuitionPaidAmount
  );
  const catalogLines = feeLines.filter(
    (line) =>
      !isTuitionLine(line) &&
      getLineRemaining(line) > 0 &&
      isLineEligibleForAccountType(line, accountTypeId)
  );

  return tuitionLine
    ? [tuitionLine, ...sortFeeLines(catalogLines)]
    : sortFeeLines(catalogLines);
};

export const formatAccountTypeLabel = (line) => {
  if (line?.account_type_description) {
    return line.account_type_description;
  }
  if (line?.is_tuition || String(line?.fee_code || "").toUpperCase() === "TUITION") {
    return "Any";
  }
  if (line?.account_type == null || line?.account_type === "") {
    return "Any";
  }
  return String(line.account_type);
};

const buildDeductionEntry = (line, extra = {}) => ({
  key: line.fee_code,
  label: line.fee_name,
  fee_code: line.fee_code,
  account_type: line.account_type ?? null,
  account_type_label: formatAccountTypeLabel(line),
  is_tuition: Boolean(line.is_tuition),
  ...extra,
});

export const computeScopedBalance = (
  feeLines = [],
  accountTypeId = null,
  tuitionFees = 0,
  tuitionIsPaid = false,
  tuitionPaidAmount = 0
) => {
  const lines = getUnpaidLinesForCashier(
    feeLines,
    accountTypeId,
    tuitionFees,
    tuitionIsPaid,
    tuitionPaidAmount
  );
  return Number(
    lines.reduce((sum, line) => sum + getLineRemaining(line), 0).toFixed(2)
  );
};

export const computePaymentFromFeeLines = (row, paymentInput, accountTypeId = null) => {
  const tuitionIsPaid = Number(row?.tuition_is_paid) === 1;
  const tuitionPaidAmount = toAmount(row?.tuition_paid_amount);
  const eligibleLines = getUnpaidLinesForCashier(
    row?.fee_lines || [],
    accountTypeId,
    row?.tuition_fees,
    tuitionIsPaid,
    tuitionPaidAmount
  );

  const scopedTotal = computeScopedBalance(
    row?.fee_lines || [],
    accountTypeId,
    row?.tuition_fees,
    tuitionIsPaid,
    tuitionPaidAmount
  );

  let remaining = toAmount(paymentInput);
  const deductions = [];

  for (const [priority, line] of eligibleLines.entries()) {
    const feeAmount = getLineRemaining(line);
    const displayPriority = line?.is_tuition
      ? 0
      : Number.isFinite(Number(line.sort_order))
        ? Number(line.sort_order)
        : priority;
    if (feeAmount <= 0) {
      continue;
    }

    if (remaining <= 0) {
      deductions.push(
        buildDeductionEntry(line, {
          priority: displayPriority,
          fee_amount: feeAmount,
          paid_amount: 0,
          status: "unpaid",
          remaining_after: 0,
        })
      );
      continue;
    }

    if (remaining >= feeAmount) {
      remaining -= feeAmount;
      deductions.push(
        buildDeductionEntry(line, {
          priority: displayPriority,
          fee_amount: feeAmount,
          paid_amount: feeAmount,
          status: "paid",
          remaining_after: remaining,
        })
      );
      continue;
    }

    deductions.push(
      buildDeductionEntry(line, {
        priority: displayPriority,
        fee_amount: feeAmount,
        paid_amount: remaining,
        status: "partial",
        remaining_after: 0,
      })
    );
    remaining = 0;
  }

  const totalPayment = toAmount(paymentInput);
  const appliedPayment = Math.max(totalPayment - remaining, 0);
  const unpaidTotal = Math.max(scopedTotal - appliedPayment, 0);

  return {
    totalPayment,
    appliedPayment,
    balance: Number(unpaidTotal.toFixed(2)),
    totalTosf: Number(scopedTotal.toFixed(2)),
    scopedTotal: Number(scopedTotal.toFixed(2)),
    globalBalance: toAmount(row?.balance),
    unpaidTotal: Number(unpaidTotal.toFixed(2)),
    deductions,
    paymentStatus: appliedPayment > 0 ? 1 : 0,
  };
};

export const computePriorityPayment = (row, paymentInput, accountTypeId = null) => {
  const tuitionIsPaid = Number(row?.tuition_is_paid) === 1;
  const tuitionPaidAmount = toAmount(row?.tuition_paid_amount);
  const scopedTotal = computeScopedBalance(
    row?.fee_lines || [],
    accountTypeId,
    row?.tuition_fees,
    tuitionIsPaid,
    tuitionPaidAmount
  );

  if (
    scopedTotal <= 0 &&
    (!Array.isArray(row?.fee_lines) || row.fee_lines.length === 0) &&
    toAmount(row?.tuition_fees) <= 0
  ) {
    return {
      totalPayment: toAmount(paymentInput),
      appliedPayment: 0,
      balance: 0,
      totalTosf: 0,
      scopedTotal: 0,
      globalBalance: toAmount(row?.balance),
      unpaidTotal: 0,
      deductions: [],
      paymentStatus: 0,
      error: "No payable fee lines found for your assigned account type.",
    };
  }

  if (scopedTotal <= 0) {
    return {
      totalPayment: toAmount(paymentInput),
      appliedPayment: 0,
      balance: 0,
      totalTosf: 0,
      scopedTotal: 0,
      globalBalance: toAmount(row?.balance),
      unpaidTotal: 0,
      deductions: [],
      paymentStatus: 0,
      error: "No remaining fees for your assigned account type.",
    };
  }

  return computePaymentFromFeeLines(row, paymentInput, accountTypeId);
};
