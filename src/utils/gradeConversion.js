const normalizeEquivalentGrade = (value) => {
  if (value === null || value === undefined || value === "") return "";

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value).trim();
  }

  return numericValue.toFixed(2);
};

const findConversionByScore = (gradeConversions, score) => {
  const numericScore = Number(score);
  if (Number.isNaN(numericScore)) return null;

  return (
    gradeConversions.find((row) => {
      const minScore = Number(row.min_score);
      const maxScore = Number(row.max_score);

      return (
        Number.isFinite(minScore) &&
        Number.isFinite(maxScore) &&
        numericScore >= minScore &&
        numericScore <= maxScore
      );
    }) || null
  );
};

const findConversionByEquivalent = (gradeConversions, equivalentGrade) => {
  const normalizedEquivalent = normalizeEquivalentGrade(equivalentGrade);

  return gradeConversions.find(
    (row) =>
      normalizeEquivalentGrade(row.equivalent_grade) === normalizedEquivalent,
  );
};

const isPassingConversion = (conversion) => {
  if (!conversion) return false;
  if (Number(conversion.is_disqualified) === 1) return false;

  const descriptiveRating = String(
    conversion.descriptive_rating || "",
  ).toUpperCase();
  if (descriptiveRating.includes("FAIL")) return false;
  if (descriptiveRating.includes("PASS")) return true;

  const equivalentGrade = Number(conversion.equivalent_grade);
  return Number.isFinite(equivalentGrade) && equivalentGrade > 0 && equivalentGrade <= 3;
};

export const convertRawToRatingDynamic = (value, gradeConversions) => {
  if (value === null || value === undefined || value === "") return "";

  const normalizedValue = String(value).trim().toUpperCase();

  if (normalizedValue === "INC") return "Incomplete";
  if (normalizedValue === "DROP" || normalizedValue === "DRP")
    return "Dropped";

  const numericValue = Number(normalizedValue);
  if (Number.isNaN(numericValue) || numericValue === 0) return "";

  const conversion = findConversionByScore(gradeConversions, numericValue);
  return conversion ? normalizeEquivalentGrade(conversion.equivalent_grade) : "";
};

export const setRemarksFromRatingDynamic = (rating, gradeConversions) => {
  if (!rating) return 3;
  if (rating === "Dropped") return 4;
  if (rating === "Incomplete") return 3;

  const conversion = findConversionByEquivalent(gradeConversions, rating);
  if (!conversion) return 3;
  if (Number(conversion.is_disqualified) === 1) return 2;
  return isPassingConversion(conversion) ? 1 : 2;
};
