import axios from "axios";

export const formatProfessorLabel = (prof) =>
  `${prof?.lname || ""}, ${prof?.fname || ""} ${prof?.mname || ""}`.trim();

export const formatSectionLabel = (section) => {
  const code = section?.program_code || "";
  const desc = section?.section_description || section?.description || "";
  return code && desc ? `${code}-${desc}` : desc || code || "Section";
};

export const getSectionOptionId = (section) =>
  String(
    section?.department_section_id ??
      section?.department_and_program_section_id ??
      section?.id ??
      "",
  );

export async function fetchClassListProfessors(apiBaseUrl, departmentId = "") {
  const res = await axios.get(`${apiBaseUrl}/api/professors`);
  const rows = Array.isArray(res.data) ? res.data : [];
  if (!departmentId) return rows;
  return rows.filter(
    (prof) => String(prof.dprtmnt_id) === String(departmentId),
  );
}

export async function fetchClassListDepartmentSections(
  apiBaseUrl,
  departmentId,
  selectedProgramOption,
) {
  if (!departmentId) return [];

  const res = await axios.get(`${apiBaseUrl}/api/department-sections`, {
    params: { departmentId },
  });
  const rows = Array.isArray(res.data) ? res.data : [];

  return mapDepartmentSectionRows(rows, selectedProgramOption);
}

function mapDepartmentSectionRows(rows, selectedProgramOption) {
  const mapped = rows.map((row) => ({
    department_section_id: row.department_and_program_section_id,
    program_code: row.program_code,
    section_description: row.description,
    curriculum_id: row.curriculum_id,
    dprtmnt_id: row.dprtmnt_id,
  }));

  if (!selectedProgramOption?.program_code) {
    return mapped;
  }

  const programKey = `${String(selectedProgramOption.program_code).trim().toLowerCase()}|${String(selectedProgramOption.major ?? "").trim().toLowerCase()}`;

  return mapped.filter((row) => {
    const source = rows.find(
      (item) =>
        String(item.department_and_program_section_id) ===
        String(row.department_section_id),
    );
    const rowKey = `${String(source?.program_code ?? row.program_code ?? "").trim().toLowerCase()}|${String(source?.major ?? "").trim().toLowerCase()}`;
    return rowKey === programKey;
  });
}

export async function fetchClassListDepartmentSectionsForDepartments(
  apiBaseUrl,
  departmentIds,
  selectedProgramOption,
) {
  if (!departmentIds?.length) return [];

  const responses = await Promise.all(
    departmentIds.map((departmentId) =>
      fetchClassListDepartmentSections(
        apiBaseUrl,
        departmentId,
        selectedProgramOption,
      ),
    ),
  );

  return dedupeClassListSections(responses.flat());
}

export async function fetchClassListProfessorSections(
  apiBaseUrl,
  { professorId, yearId, semesterId, departmentId },
) {
  if (!professorId || !yearId || !semesterId) return [];

  const params = {
    professorId,
    yearId,
    semesterId,
  };
  if (departmentId) params.departmentId = departmentId;

  const res = await axios.get(`${apiBaseUrl}/api/class-list/professor-sections`, {
    params,
  });
  return Array.isArray(res.data) ? res.data : [];
}

export async function fetchClassListFilterStudentNumbers(
  apiBaseUrl,
  { professorId, departmentSectionId, yearId, semesterId },
) {
  if ((!professorId && !departmentSectionId) || !yearId || !semesterId) {
    return [];
  }

  const params = { yearId, semesterId };
  if (departmentSectionId) {
    params.departmentSectionId = departmentSectionId;
  } else if (professorId) {
    params.professorId = professorId;
  }

  const res = await axios.get(
    `${apiBaseUrl}/api/class-list/filter-student-numbers`,
    { params },
  );
  return Array.isArray(res.data) ? res.data.map(String) : [];
}

export function dedupeClassListSections(sections) {
  const seen = new Map();
  for (const section of sections) {
    const id = getSectionOptionId(section);
    if (!id || seen.has(id)) continue;
    seen.set(id, section);
  }
  return [...seen.values()];
}
