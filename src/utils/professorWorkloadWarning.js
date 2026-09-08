import axios from "axios";
import API_BASE_URL from "../apiConfig";

const formatWorkloadHours = (hours) => {
  const rounded = Math.round(Number(hours || 0) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

export const checkProfessorWorkloadWarning = async ({
  profId,
  schoolYearId,
  startTime,
  endTime,
  excludeScheduleId = null,
}) => {
  if (!profId || !schoolYearId || !startTime || !endTime) {
    return null;
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/check-professor-workload-hours`,
      {
        prof_id: profId,
        school_year_id: schoolYearId,
        start_time: startTime,
        end_time: endTime,
        exclude_schedule_id: excludeScheduleId,
      }
    );

    if (!response.data?.exceeds_limit) {
      return null;
    }

    const {
      professor_name,
      current_hours,
      adding_hours,
      projected_hours,
      school_year_label,
      limit_hours,
    } = response.data;

    return `Workload Warning: ${professor_name} already has ${formatWorkloadHours(current_hours)} hours for ${school_year_label}. Adding ${formatWorkloadHours(adding_hours)} hour(s) will reach ${formatWorkloadHours(projected_hours)} hours, exceeding the ${limit_hours}-hour limit.`;
  } catch (error) {
    console.error("Error checking professor workload hours:", error);
    return null;
  }
};

export const combineScheduleMessage = (baseMessage, workloadWarning) => {
  if (!workloadWarning) {
    const isPositive =
      baseMessage.includes("success") || baseMessage.includes("available");
    return {
      message: baseMessage,
      severity: isPositive ? "success" : "error",
    };
  }

  return {
    message: `${workloadWarning}\n\n${baseMessage}`,
    severity: "warning",
  };
};
