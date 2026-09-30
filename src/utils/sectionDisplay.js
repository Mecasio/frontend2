/**
 * Formats regular year-level sections for display.
 *
 * Only years 1-5 receive the year prefix. Existing prefixes are preserved,
 * including values such as 3-3-1A. Special levels are left unchanged.
 */
export const formatYearSection = (yearLevel, sectionDescription) => {
  const year = String(yearLevel ?? "").trim();
  const section = String(sectionDescription ?? "").trim();

  if (!section) return "";
  if (/^TBA$/i.test(section)) return section;
  if (!/^[1-5]$/.test(year)) return section;

  const yearPrefix = new RegExp(`^${year}\\s*[-\\u2013]\\s*`, "i");
  return yearPrefix.test(section)
    ? section.replace(yearPrefix, `${year}-`)
    : `${year}-${section}`;
};
