import axios from "axios";
import API_BASE_URL from "../apiConfig";
import {
  isNstpCatalogFee,
  normalizeIsFirstYear,
  getNstpAmountFromFeeLines,
} from "./feeNormalization";

export const toNumber = (value) => {
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const parsedFromString = Number(cleaned);
    return Number.isFinite(parsedFromString) ? parsedFromString : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const toDecimalPercent = (value) => {
  const numeric = toNumber(value);
  if (numeric <= 0) return 0;
  return numeric > 1 ? numeric / 100 : numeric;
};

export const round2 = (value) =>
  Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

export const toFlag = (value) => (Number(value) > 0 ? 1 : 0);

export const isNstpFeeLine = (line) =>
  Boolean(line?.is_nstp_fee) || isNstpCatalogFee(line);

export const isBaseTuitionLine = (line) =>
  Boolean(line?.is_computed_tuition) ||
  (() => {
    const code = String(line?.fee_code || "").toUpperCase();
    const name = String(line?.fee_name || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_");
    const searchable = `${code} ${name}`;
    if (!searchable.trim() || isNstpFeeLine(line)) return false;
    return (
      code === "TUITION" ||
      searchable.includes("TUITION") ||
      searchable.includes("TUITION_FEE") ||
      searchable.includes("LEC_LAB") ||
      searchable.includes("UNIT_TUITION")
    );
  })();

export const filterAssessedFeeLines = (feeLines = []) =>
  (Array.isArray(feeLines) ? feeLines : []).filter(
    (line) => !isBaseTuitionLine(line),
  );

export const fetchResolvedFees = async ({
  tuitionAmount,
  branchId,
  curriculumId,
  yearLevelId,
  hasNstp,
  nstpCount,
  hasComputer,
  hasLaboratory,
  firstYearFirstSem,
}) => {
  const res = await axios.post(`${API_BASE_URL}/api/tosf/resolve-fees`, {
    branch_id: branchId,
    curriculum_id: curriculumId,
    year_level_id: yearLevelId,
    tuition_amount: tuitionAmount,
    has_nstp: hasNstp ? 1 : 0,
    nstp_count: nstpCount ?? 0,
    has_computer: toFlag(hasComputer),
    has_laboratory: toFlag(hasLaboratory),
    is_first_year_first_sem: firstYearFirstSem ? 1 : 0,
  });

  const feeLines = filterAssessedFeeLines(res.data?.fee_lines);
  const totals = res.data?.totals || {
    computed_tuition: tuitionAmount,
    tuition: tuitionAmount,
    tuition_related: 0,
    miscellaneous: 0,
    other: 0,
    total_tosf: tuitionAmount,
  };

  return {
    feeLines,
    totals,
    baseTuitionLine: res.data?.base_tuition_line || null,
  };
};

export const applyScholarshipToAssessment = (tuitionAmount, feeLines, scholarship) => {
  if (!scholarship) {
    return {
      tuition_fees: round2(tuitionAmount),
      feeLines,
      scholarship_id: null,
      computed: null,
    };
  }

  const isMiscLine = (line) => {
    const category = Number(line.fee_category);
    return (category === 3 || category === 5) && !isNstpFeeLine(line);
  };

  const tuitionTotal = toNumber(tuitionAmount);
  const nstpTotal = feeLines
    .filter(isNstpFeeLine)
    .reduce((sum, line) => sum + toNumber(line.amount), 0);
  const miscLines = feeLines.filter(isMiscLine);
  const miscTotal = miscLines.reduce(
    (sum, line) => sum + toNumber(line.amount),
    0,
  );

  const afd = toNumber(scholarship.afd);
  const hasAfdOverride = afd > 0;
  const tfdDec = toDecimalPercent(scholarship.tfd);
  const mfdDec = toDecimalPercent(scholarship.mfd);
  const nfdDec = toDecimalPercent(scholarship.nfd);

  let finalTuitionFee = tuitionTotal;
  let finalMiscTotal = miscTotal;
  let finalNstpFee = nstpTotal;

  if (!hasAfdOverride) {
    finalTuitionFee = tuitionTotal - tuitionTotal * tfdDec;
    finalMiscTotal = miscTotal - miscTotal * mfdDec;
    finalNstpFee = nstpTotal - nstpTotal * nfdDec;
  }

  finalTuitionFee = round2(finalTuitionFee);
  finalMiscTotal = round2(finalMiscTotal);
  finalNstpFee = round2(finalNstpFee);

  const miscScale = miscTotal > 0 ? finalMiscTotal / miscTotal : 0;
  const nstpScale = nstpTotal > 0 ? finalNstpFee / nstpTotal : 0;

  const adjustedLines = feeLines.map((line) => {
    let amount = toNumber(line.amount);
    if (!hasAfdOverride) {
      if (isNstpFeeLine(line)) {
        amount = round2(amount * nstpScale);
      } else if (isMiscLine(line)) {
        amount = round2(amount * miscScale);
      }
    }
    return { ...line, amount };
  });

  const lastMiscIndex = adjustedLines.reduce((lastIndex, line, index) => {
    return isMiscLine(line) ? index : lastIndex;
  }, -1);

  if (lastMiscIndex >= 0 && !hasAfdOverride) {
    const adjustedMiscTotal = adjustedLines
      .filter(isMiscLine)
      .reduce((sum, line) => sum + toNumber(line.amount), 0);
    const miscDelta = round2(finalMiscTotal - adjustedMiscTotal);
    if (miscDelta !== 0) {
      adjustedLines[lastMiscIndex] = {
        ...adjustedLines[lastMiscIndex],
        amount: round2(toNumber(adjustedLines[lastMiscIndex].amount) + miscDelta),
      };
    }
  }

  return {
    tuition_fees: finalTuitionFee,
    feeLines: adjustedLines,
    scholarship_id: scholarship.id ? Number(scholarship.id) : null,
    computed: {
      scholarship_name: scholarship.scholarship_name || "",
      tfd: scholarship.tfd ?? 0,
      mfd: scholarship.mfd ?? 0,
      nfd: scholarship.nfd ?? 0,
      afd: scholarship.afd ?? 0,
      miscTotal,
      finalMiscTotal,
      finalTuitionFee,
      finalNstpFee,
    },
  };
};

export const applyScholarshipToFeeLines = (feeLines, scholarship) =>
  applyScholarshipToAssessment(0, feeLines, scholarship);

export const buildFeeLinesPayload = (feeLines) =>
  filterAssessedFeeLines(feeLines).map((line) => ({
    fee_rate_id: line.fee_rate_id,
    amount: Number(line.amount || 0),
  }));

export const computeTuitionAmount = ({
  yearLevelId,
  hasNstpSubject,
  totalLecFees,
  totalLabFees,
  resolvedFeeLines,
}) => {
  const baseTotalSum = Number(totalLecFees || 0) + Number(totalLabFees || 0);
  const nstpCatalogAmount = getNstpAmountFromFeeLines(resolvedFeeLines);
  return normalizeIsFirstYear(yearLevelId) && hasNstpSubject
    ? Math.max(0, baseTotalSum - nstpCatalogAmount)
    : baseTotalSum;
};

export const computeTotalAssessment = (computedTuitionAmount, catalogFeeLines) =>
  round2(
    computedTuitionAmount +
      filterAssessedFeeLines(catalogFeeLines).reduce(
        (sum, line) => sum + toNumber(line.amount),
        0,
      ),
  );
