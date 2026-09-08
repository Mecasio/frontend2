import axios from "axios";
import API_BASE_URL from "../apiConfig";
import { getAuditHeaders } from "./auditEvents";

export const postStudentHistoryLog = async (studentNumber, payload = {}) => {
  const safeStudentNumber = String(studentNumber || "").trim();
  if (!safeStudentNumber) return;

  await axios.post(
    `${API_BASE_URL}/api/student-history-logs`,
    {
      student_number: safeStudentNumber,
      ...payload,
    },
    { headers: getAuditHeaders() },
  );
};

export const fetchStudentHistoryLogs = async (studentNumber) => {
  const safeStudentNumber = String(studentNumber || "").trim();
  if (!safeStudentNumber) return [];

  const response = await axios.get(
    `${API_BASE_URL}/api/student-history-logs/${encodeURIComponent(safeStudentNumber)}`,
    { headers: getAuditHeaders() },
  );

  return response.data?.logs || [];
};

export const fetchStudentHistoryDetails = async (studentNumber) => {
  const safeStudentNumber = String(studentNumber || "").trim();
  if (!safeStudentNumber) return { student: null, logs: [] };

  const response = await axios.get(
    `${API_BASE_URL}/api/student-history-logs/${encodeURIComponent(safeStudentNumber)}`,
    { headers: getAuditHeaders() },
  );

  return {
    student: response.data?.student || null,
    logs: response.data?.logs || [],
  };
};

export const formatStudentDisplayName = (student = {}) =>
  [student.first_name, student.middle_name, student.last_name]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ") || "Unknown Student";

export const formatCourseHistoryLabel = (course = {}) => {
  const code = String(course.course_code || course.subject_code || "N/A").trim();
  const description = String(
    course.course_description || course.subject_description || "Unknown Course",
  ).trim();
  return `${code} (${description})`;
};

export const logBulkCourseEnrollmentHistory = async ({
  studentNumber,
  studentName,
  sectionLabel,
  schoolYearLabel,
  courses = [],
}) => {
  if (!studentNumber || !courses.length) return;

  await postStudentHistoryLog(studentNumber, {
    action: "bulk_enroll",
    details: {
      student_name: studentName,
      section_label: sectionLabel,
      school_year_label: schoolYearLabel,
      courses,
    },
  });
};
