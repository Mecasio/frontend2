import axios from "axios";
import API_BASE_URL from "../apiConfig";

const SCOPES_STORAGE_KEY = "registrar_scopes";
const DEPARTMENT_IDS_STORAGE_KEY = "registrar_dprtmnt_ids";
const ALLOWED_CURRICULUMS_STORAGE_KEY = "registrar_allowed_curriculum_ids";

const parseJsonArray = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const setRegistrarScopeCache = ({
  scopes = [],
  dprtmnt_ids = [],
  allowed_curriculum_ids = [],
  curriculum_id = "",
} = {}) => {
  if (typeof window === "undefined") {
    return {
      scopes: [],
      dprtmnt_ids: [],
      allowed_curriculum_ids: [],
      curriculum_id: "",
    };
  }

  localStorage.setItem(SCOPES_STORAGE_KEY, JSON.stringify(scopes));
  localStorage.setItem(DEPARTMENT_IDS_STORAGE_KEY, JSON.stringify(dprtmnt_ids));
  localStorage.setItem(
    ALLOWED_CURRICULUMS_STORAGE_KEY,
    JSON.stringify(allowed_curriculum_ids),
  );

  const nextCurriculumId =
    curriculum_id === null || curriculum_id === undefined
      ? ""
      : String(curriculum_id);
  localStorage.setItem("curriculum_id", nextCurriculumId);
  localStorage.setItem("registrar_curriculum_id", nextCurriculumId);

  return {
    scopes,
    dprtmnt_ids,
    allowed_curriculum_ids,
    curriculum_id: nextCurriculumId,
  };
};

export const getRegistrarScopes = () => {
  if (typeof window === "undefined") return [];
  return parseJsonArray(localStorage.getItem(SCOPES_STORAGE_KEY));
};

export const getScopedProgramIds = () => {
  if (typeof window === "undefined") return [];
  return [
    ...new Set(
      getRegistrarScopes()
        .map((scope) => String(scope.program_id))
        .filter(Boolean),
    ),
  ];
};

export const restrictDepartmentsToScope = (departments = []) => {
  const scopedDeptIds = getScopedDepartmentIds();
  const scopeDeptIds =
    scopedDeptIds.length > 0
      ? scopedDeptIds
      : [
          ...new Set(
            getRegistrarScopes()
              .map((scope) => String(scope.dprtmnt_id))
              .filter(Boolean),
          ),
        ];

  if (!scopeDeptIds.length) return departments;

  return departments.filter((department) =>
    scopeDeptIds.includes(String(department.dprtmnt_id ?? "")),
  );
};

export const restrictProgramsToScope = (programs = []) => {
  const scopedProgramIds = getScopedProgramIds();
  if (!scopedProgramIds.length) return programs;

  return programs.filter((program) =>
    scopedProgramIds.includes(String(program.program_id ?? "")),
  );
};

export const getScopedDepartmentIds = () => {
  if (typeof window === "undefined") return [];
  return parseJsonArray(localStorage.getItem(DEPARTMENT_IDS_STORAGE_KEY))
    .map((id) => String(id))
    .filter(Boolean);
};

export const getDepartmentIdsFromAdminData = (adminData = {}) => {
  if (Array.isArray(adminData.dprtmnt_ids) && adminData.dprtmnt_ids.length) {
    return adminData.dprtmnt_ids;
  }
  if (typeof adminData.dprtmnt_ids === "string" && adminData.dprtmnt_ids.trim()) {
    const parsed = parseJsonArray(adminData.dprtmnt_ids);
    if (parsed.length) return parsed;
  }
  if (
    adminData.dprtmnt_id !== null &&
    adminData.dprtmnt_id !== undefined &&
    adminData.dprtmnt_id !== ""
  ) {
    return [adminData.dprtmnt_id];
  }
  return [];
};

export const getAllowedCurriculumIds = () => {
  if (typeof window === "undefined") return [];
  return parseJsonArray(localStorage.getItem(ALLOWED_CURRICULUMS_STORAGE_KEY))
    .map((id) => String(id))
    .filter(Boolean);
};

export const setRegistrarCurriculumId = (value) => {
  if (typeof window === "undefined") return "";

  const curriculumId = value === null || value === undefined ? "" : String(value);
  localStorage.setItem("curriculum_id", curriculumId);
  localStorage.setItem("registrar_curriculum_id", curriculumId);
  return curriculumId;
};

export const syncRegistrarScopeFromPayload = ({
  scopes = [],
  dprtmnt_ids = [],
  allowed_curriculum_ids = [],
  curriculum_id = "",
} = {}) => {
  if (typeof window === "undefined") return null;
  if (localStorage.getItem("role") !== "registrar") return null;

  const cache = setRegistrarScopeCache({
    scopes,
    dprtmnt_ids,
    allowed_curriculum_ids,
    curriculum_id,
  });

  window.dispatchEvent(
    new CustomEvent("registrar-curriculum-updated", {
      detail: {
        curriculum_id: cache.curriculum_id,
        scopes: cache.scopes,
      },
    }),
  );

  return cache;
};

export const mergeUniqueByKey = (items = [], key) => {
  const map = new Map();
  items.forEach((item) => {
    const itemKey = item?.[key];
    if (itemKey === null || itemKey === undefined || itemKey === "") return;
    map.set(String(itemKey), item);
  });
  return [...map.values()];
};

export const resolveRegistrarDepartmentIds = (adminData = {}) => {
  const fromAdmin = getDepartmentIdsFromAdminData(adminData);
  if (fromAdmin.length) {
    return [...new Set(fromAdmin.map((id) => String(id)).filter(Boolean))];
  }

  const fromScopes = (adminData?.scopes || [])
    .map((scope) => scope?.dprtmnt_id)
    .filter((id) => id !== null && id !== undefined && id !== "")
    .map((id) => String(id));

  if (fromScopes.length) {
    return [...new Set(fromScopes)];
  }

  return getScopedDepartmentIds();
};

export const resolveRegistrarLockedCurriculumIds = (adminData = {}) => {
  const fromAdmin = Array.isArray(adminData?.allowed_curriculum_ids)
    ? adminData.allowed_curriculum_ids
    : [];
  const fromCache = getAllowedCurriculumIds();
  const source = fromAdmin.length ? fromAdmin : fromCache;

  return [...new Set(source.map((id) => String(id)).filter(Boolean))];
};

export const filterCollegeScheduleSections = (sections = [], adminData = {}) => {
  const lockedCurriculumIds = resolveRegistrarLockedCurriculumIds(adminData);
  const scopedProgramIds = getScopedProgramIds();

  if (lockedCurriculumIds.length) {
    return sections.filter((section) =>
      lockedCurriculumIds.includes(String(section.curriculum_id ?? "")),
    );
  }

  if (scopedProgramIds.length) {
    return sections.filter((section) =>
      scopedProgramIds.includes(String(section.program_id ?? "")),
    );
  }

  return restrictProgramsToScope(sections);
};

export const syncRegistrarScopeFromAdminData = (adminData = {}) =>
  syncRegistrarScopeFromPayload({
    scopes: adminData?.scopes || [],
    dprtmnt_ids: adminData?.dprtmnt_ids || [],
    allowed_curriculum_ids: adminData?.allowed_curriculum_ids || [],
    curriculum_id: adminData?.curriculum_id || "",
  });

export const syncRegistrarScopeFromEmployeeResponse = (employeeData = {}) =>
  syncRegistrarScopeFromPayload({
    scopes: employeeData?.scopes || [],
    dprtmnt_ids: employeeData?.dprtmnt_ids || [],
    allowed_curriculum_ids: employeeData?.allowed_curriculum_ids || [],
    curriculum_id: employeeData?.curriculum_id || "",
  });

export const refreshRegistrarCurriculumId = async (employeeId) => {
  if (typeof window === "undefined") return "";
  if (localStorage.getItem("role") !== "registrar") return "";

  const currentEmployeeId = employeeId || localStorage.getItem("employee_id");
  if (!currentEmployeeId) return "";

  const response = await axios.get(`${API_BASE_URL}/api/employee/${currentEmployeeId}`);
  const cache = syncRegistrarScopeFromEmployeeResponse(response.data);

  return cache?.curriculum_id || "";
};

export const getRegistrarCurriculumId = () => {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("curriculum_id") ||
    localStorage.getItem("registrar_curriculum_id") ||
    ""
  );
};

export const hasRegistrarScope = () => getRegistrarScopes().length > 0;

export const hasRegistrarCurriculumRestriction = () => {
  const allowedCurriculumIds = getAllowedCurriculumIds();
  if (allowedCurriculumIds.length > 0) return true;
  if (getRegistrarScopes().length > 0) return true;
  return Boolean(getRegistrarCurriculumId());
};

export const isRegistrarProgramSelectionLocked = () => {
  if (getAllowedCurriculumIds().length > 1) return false;
  return hasRegistrarCurriculumRestriction();
};

export const isRegistrarCurriculumMatch = (value, curriculumItems = []) => {
  const allowedCurriculumIds = getAllowedCurriculumIds();
  const scopedProgramIds = getScopedProgramIds();

  if (scopedProgramIds.length > 0) {
    const matchedCurriculum = curriculumItems.find(
      (item) => String(item.curriculum_id) === String(value),
    );
    if (matchedCurriculum?.program_id) {
      return scopedProgramIds.includes(String(matchedCurriculum.program_id));
    }
    if (allowedCurriculumIds.length > 0) {
      if (value === null || value === undefined || value === "") return false;
      return allowedCurriculumIds.includes(String(value));
    }
    return false;
  }

  if (allowedCurriculumIds.length > 0) {
    if (value === null || value === undefined || value === "") return false;
    return allowedCurriculumIds.includes(String(value));
  }

  const curriculumId = getRegistrarCurriculumId();
  if (!curriculumId) return true;
  if (value === null || value === undefined || value === "") return false;

  return String(value) === String(curriculumId);
};

export const resolveStudentProgramId = (
  { program_id, curriculum_id, program, active_curriculum } = {},
  curriculumItems = [],
) => {
  if (program_id !== null && program_id !== undefined && program_id !== "") {
    return String(program_id);
  }

  const curriculumKey = curriculum_id ?? program ?? active_curriculum;
  if (!curriculumKey) return "";

  const matchedCurriculum = curriculumItems.find(
    (item) => String(item.curriculum_id) === String(curriculumKey),
  );

  return matchedCurriculum?.program_id
    ? String(matchedCurriculum.program_id)
    : "";
};

export const isRegistrarStudentScopeMatch = (
  student = {},
  curriculumItems = [],
) => {
  const allowedCurriculumIds = getAllowedCurriculumIds();
  const scopedProgramIds = getScopedProgramIds();
  const studentProgramId = resolveStudentProgramId(student, curriculumItems);
  const curriculumId =
    student.curriculum_id ?? student.program ?? student.active_curriculum;

  if (scopedProgramIds.length > 0) {
    if (!studentProgramId) return false;
    return scopedProgramIds.includes(studentProgramId);
  }

  if (allowedCurriculumIds.length > 0) {
    if (curriculumId === null || curriculumId === undefined || curriculumId === "") {
      return false;
    }
    return allowedCurriculumIds.includes(String(curriculumId));
  }

  const curriculumIdSetting = getRegistrarCurriculumId();
  if (!curriculumIdSetting) return true;
  if (curriculumId === null || curriculumId === undefined || curriculumId === "") {
    return false;
  }

  return String(curriculumId) === String(curriculumIdSetting);
};

export const restrictToRegistrarCurriculum = (items = [], getValue) => {
  const allowedCurriculumIds = getAllowedCurriculumIds();
  if (allowedCurriculumIds.length > 0) {
    return items.filter((item) => {
      const value = getValue
        ? getValue(item)
        : item?.curriculum_id ?? item?.program ?? item?.active_curriculum;
      return allowedCurriculumIds.includes(String(value ?? ""));
    });
  }

  const scopes = getRegistrarScopes();
  if (scopes.length > 0) {
    const programIds = new Set(
      scopes.map((scope) => String(scope.program_id)).filter(Boolean),
    );
    return items.filter((item) =>
      programIds.has(String(item?.program_id ?? "")),
    );
  }

  const curriculumId = getRegistrarCurriculumId();
  if (!curriculumId) return items;

  return items.filter((item) => {
    const value = getValue
      ? getValue(item)
      : item?.curriculum_id ?? item?.program ?? item?.active_curriculum;
    return String(value ?? "") === String(curriculumId);
  });
};

export const normalizeDepartmentId = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return String(value).trim();
};

export const departmentIdsMatch = (left, right) => {
  const normalizedLeft = normalizeDepartmentId(left);
  const normalizedRight = normalizeDepartmentId(right);
  if (!normalizedLeft || !normalizedRight) return false;
  return normalizedLeft === normalizedRight;
};

export const getDepartmentsFromAdminScopes = (adminData = {}) => {
  const scopes = Array.isArray(adminData.scopes) ? adminData.scopes : [];
  const departments = new Map();

  scopes.forEach((scope) => {
    const departmentId = normalizeDepartmentId(scope?.dprtmnt_id);
    if (!departmentId || departments.has(departmentId)) return;

    departments.set(departmentId, {
      dprtmnt_id: departmentId,
      dprtmnt_name: scope?.dprtmnt_name || "",
      dprtmnt_code: scope?.dprtmnt_code || "",
    });
  });

  return [...departments.values()];
};

export const isRegistrarApplicantScopeMatch = (
  applicant = {},
  { curriculumId, programId } = {},
) => {
  const scopedProgramIds = getScopedProgramIds();
  const allowedCurriculumIds = getAllowedCurriculumIds();
  const resolvedCurriculumId =
    curriculumId ?? applicant.program ?? applicant.curriculum_id;
  const resolvedProgramId = programId ?? applicant.program_id ?? "";

  if (scopedProgramIds.length > 0) {
    if (!resolvedProgramId) return false;
    return scopedProgramIds.includes(String(resolvedProgramId));
  }

  if (allowedCurriculumIds.length > 0) {
    if (!resolvedCurriculumId) return false;
    return allowedCurriculumIds.includes(String(resolvedCurriculumId));
  }

  const curriculumIdSetting = getRegistrarCurriculumId();
  if (!curriculumIdSetting) return true;
  if (!resolvedCurriculumId) return false;

  return String(resolvedCurriculumId) === String(curriculumIdSetting);
};

export const resolveStudentRegistrarScope = async (
  studentNumber,
  { activeSchoolYearId } = {},
) => {
  const employeeId =
    typeof window !== "undefined"
      ? localStorage.getItem("employee_id") || undefined
      : undefined;

  try {
    const scopeRes = await axios.post(
      `${API_BASE_URL}/api/registrar/resolve-student-scope`,
      {
        studentNumber,
        active_school_year_id: activeSchoolYearId || undefined,
        employee_id: employeeId,
      },
      { headers: { "Content-Type": "application/json" } },
    );

    const { dprtmntId } = scopeRes.data;
    const payload = { studentNumber, dprtmntId };
    if (activeSchoolYearId) {
      payload.active_school_year_id = activeSchoolYearId;
    }

    const response = await axios.post(
      `${API_BASE_URL}/api/student-tagging/dprtmnt`,
      payload,
      { headers: { "Content-Type": "application/json" } },
    );

    return {
      dprtmntId,
      preload: response.data,
      context: scopeRes.data.context,
      curriculumId: scopeRes.data.curriculumId,
      programId: scopeRes.data.programId,
    };
  } catch (err) {
    return {
      error:
        err.response?.data?.message ||
        "Student not found or is outside your assigned programs.",
    };
  }
};
