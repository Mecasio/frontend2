import axios from "axios";
import { getDepartmentIdsFromAdminData } from "./registrarCurriculumRestriction";

export function resolveClassListDepartmentIds({
  selectedDepartmentFilter,
  adminData,
  department,
}) {
  const scopedIds = getDepartmentIdsFromAdminData(adminData);

  if (selectedDepartmentFilter) {
    return [String(selectedDepartmentFilter)];
  }

  if (scopedIds.length > 1) {
    return scopedIds.map(String);
  }

  if (scopedIds.length === 1) {
    return [String(scopedIds[0])];
  }

  if (department.length > 0) {
    return department.map((dep) => String(dep.dprtmnt_id));
  }

  return [];
}

export function buildClassListStudentParams({
  departmentIds,
  yearId,
  semesterId,
}) {
  const params = new URLSearchParams();

  if (departmentIds.length === 1) {
    params.set("department_id", departmentIds[0]);
  } else if (departmentIds.length > 1) {
    params.set("departmentIds", departmentIds.join(","));
  }

  if (yearId) {
    params.set("yearId", String(yearId));
  }

  if (semesterId) {
    params.set("semesterId", String(semesterId));
  }

  return params;
}

export function dedupeClassListStudents(rows) {
  return [
    ...new Map(
      (Array.isArray(rows) ? rows : []).map((student) => [
        `${student.student_number}-${student.year_id}-${student.semester_id}-${student.curriculum_id}`,
        student,
      ]),
    ).values(),
  ];
}

export async function fetchClassListStudents(
  apiBaseUrl,
  { selectedDepartmentFilter, adminData, department, yearId, semesterId, signal },
) {
  const departmentIds = resolveClassListDepartmentIds({
    selectedDepartmentFilter,
    adminData,
    department,
  });

  if (!departmentIds.length) {
    return [];
  }

  const params = buildClassListStudentParams({
    departmentIds,
    yearId,
    semesterId,
  });

  const res = await axios.get(
    `${apiBaseUrl}/api/student_number?${params.toString()}`,
    { signal },
  );

  return dedupeClassListStudents(res.data);
}
