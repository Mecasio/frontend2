export const toTitleCaseWords = (value) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase()
    .replace(/(^|[\s'-])(\p{L})/gu, (_, separator, letter) =>
      `${separator}${letter.toLocaleUpperCase()}`,
    );

export const formatCorStudentName = ({
  lastName,
  firstName,
  middleName,
  extension,
}) => {
  const normalizedLastName = String(lastName || "").trim().toLocaleUpperCase();
  const normalizedGivenNames = [firstName, middleName]
    .map(toTitleCaseWords)
    .filter(Boolean);
  const normalizedExtension = String(extension || "").trim();

  if (normalizedExtension) normalizedGivenNames.push(normalizedExtension);

  const givenNameText = normalizedGivenNames.join(" ");
  return [normalizedLastName, givenNameText].filter(Boolean).join(", ");
};
