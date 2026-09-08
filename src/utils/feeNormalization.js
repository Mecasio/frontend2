export const normalizeFeeCode = (feeOrCode) =>
  String(feeOrCode?.fee_code ?? feeOrCode ?? "").trim().toUpperCase();

export const normalizeFeeName = (feeOrLine) =>
  String(feeOrLine?.fee_name ?? "").trim().toUpperCase();

export const normalizeCourseCode = (courseCode) =>
  String(courseCode ?? "").trim().toUpperCase();

export const normalizeBooleanFlag = (value) =>
  Number(value) === 1 || value === true || Number(value) > 0;

export const normalizeYearLevelId = (yearLevelId) => {
  const parsed = Number(yearLevelId);
  return Number.isFinite(parsed) ? parsed : null;
};

export const isNstpCourseCode = (courseCode) =>
  normalizeCourseCode(courseCode).includes("NSTP");

export const isNstpCatalogFee = (feeOrLine) => {
  const code = normalizeFeeCode(feeOrLine);
  const name = normalizeFeeName(feeOrLine);
  return code.includes("NSTP") || name.includes("NSTP");
};

export const normalizeHasNstpSubject = ({
  nstpCount = 0,
  enrolled = [],
  hasNstpFlag = null,
} = {}) => {
  if (hasNstpFlag != null) {
    return normalizeBooleanFlag(hasNstpFlag);
  }
  if (normalizeBooleanFlag(nstpCount)) {
    return true;
  }
  return enrolled.some(
    (course) =>
      Number(course?.is_nstp) === 1 || isNstpCourseCode(course?.course_code),
  );
};

export const normalizeIsFirstYear = (yearLevelId) =>
  normalizeYearLevelId(yearLevelId) === 1;

export const shouldApplyNstpCatalogFee = ({
  hasNstpSubject,
  hasNstpFlag = null,
  nstpCount = 0,
  enrolled = [],
} = {}) =>
  normalizeHasNstpSubject({
    hasNstpFlag: hasNstpSubject ?? hasNstpFlag,
    nstpCount,
    enrolled,
  });

export const getNstpAmountFromFeeLines = (feeLines = []) =>
  feeLines
    .filter(isNstpCatalogFee)
    .reduce((sum, line) => sum + Number(line?.amount || 0), 0);