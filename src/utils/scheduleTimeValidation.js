const SCHEDULE_TIME_MIN_MINUTES = 7 * 60; // 7:00 AM
const SCHEDULE_TIME_MAX_MINUTES = 21 * 60; // 9:00 PM

export const SCHEDULE_TIME_INPUT_MIN = "07:00";
export const SCHEDULE_TIME_INPUT_MAX = "21:00";
export const SCHEDULE_TIME_INPUT_STEP = 1800; // 30 minutes in seconds

export const parseTime24ToMinutes = (time24) => {
  if (!time24) return null;
  const [hours, minutes] = time24.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

export const getScheduleTimeValidationError = (time24, label = "Time") => {
  if (!time24) return `${label} is required.`;

  const totalMinutes = parseTime24ToMinutes(time24);
  if (totalMinutes === null) return `${label} is invalid.`;

  if (totalMinutes < SCHEDULE_TIME_MIN_MINUTES || totalMinutes > SCHEDULE_TIME_MAX_MINUTES) {
    return `${label} must be between 7:00 AM and 9:00 PM.`;
  }

  if (totalMinutes % 30 !== 0) {
    return `${label} must use 30-minute increments (e.g. 7:00 AM, 7:30 AM, 8:00 AM).`;
  }

  return "";
};

export const validateScheduleTimeRange = (startTime24, endTime24) => {
  const startError = getScheduleTimeValidationError(startTime24, "Start time");
  if (startError) return startError;

  const endError = getScheduleTimeValidationError(endTime24, "End time");
  if (endError) return endError;

  const startMinutes = parseTime24ToMinutes(startTime24);
  const endMinutes = parseTime24ToMinutes(endTime24);
  if (endMinutes <= startMinutes) {
    return "End time must be after start time.";
  }

  return "";
};
