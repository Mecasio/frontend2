/**
 * Limit school-year options to the active year and the prior `yearsBack` years.
 * Example: active current_year 2025 + yearsBack 10 → 2025 down to 2015.
 */
export const filterSchoolYearsFromActive = (
  schoolYears,
  activeYear,
  yearsBack = 10,
) => {
  if (!Array.isArray(schoolYears) || schoolYears.length === 0) return [];

  let activeCurrentYear = null;

  if (activeYear && typeof activeYear === "object") {
    if (activeYear.current_year != null && activeYear.current_year !== "") {
      activeCurrentYear = Number(activeYear.current_year);
    } else if (activeYear.year_id != null && activeYear.year_id !== "") {
      const match = schoolYears.find(
        (sy) => String(sy.year_id) === String(activeYear.year_id),
      );
      if (match) activeCurrentYear = Number(match.current_year);
    }
  } else if (activeYear != null && activeYear !== "") {
    const match = schoolYears.find(
      (sy) => String(sy.year_id) === String(activeYear),
    );
    if (match) activeCurrentYear = Number(match.current_year);
  }

  if (!Number.isFinite(activeCurrentYear)) {
    const years = schoolYears
      .map((sy) => Number(sy.current_year))
      .filter((year) => Number.isFinite(year));
    if (!years.length) return [];
    activeCurrentYear = Math.max(...years);
  }

  const minYear = activeCurrentYear - yearsBack;

  return schoolYears
    .filter((sy) => {
      const year = Number(sy.current_year);
      return (
        Number.isFinite(year) &&
        year <= activeCurrentYear &&
        year >= minYear
      );
    })
    .sort((a, b) => Number(b.current_year) - Number(a.current_year));
};
