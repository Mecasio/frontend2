import React, { useMemo } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_LABELS = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};
const DAY_ALIASES = {
  MONDAY: "MON",
  TUESDAY: "TUE",
  WEDNESDAY: "WED",
  THURSDAY: "THU",
  FRIDAY: "FRI",
  SATURDAY: "SAT",
  SUNDAY: "SUN",
};
const START_MINUTES = 7 * 60;
const END_MINUTES = 21 * 60;
const SLOT_MINUTES = 30;
const TIME_SLOTS = Array.from(
  { length: (END_MINUTES - START_MINUTES) / SLOT_MINUTES },
  (_, index) => START_MINUTES + index * SLOT_MINUTES,
);

const parseTime = (value) => {
  if (!value) return null;
  const match = String(value)
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridian = (match[3] || "").toUpperCase();
  if (meridian === "PM" && hours < 12) hours += 12;
  if (meridian === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const formatMinutes = (minutes) => {
  const safeMinutes = ((minutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  const meridian = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${String(hours12).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${meridian}`;
};

const normalizeDay = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  return DAY_ALIASES[normalized] || normalized.slice(0, 3);
};

const getBlockColor = (entry) => {
  if (Number(entry.is_servicecredit) === 1) return "#e6ccff";
  if (Number(entry.is_temporary_substitution) === 1) return "#ffd9b3";
  if (Number(entry.ishonorarium) === 1) return "#ccffff";
  return entry.workload_color || "#fde047";
};

const getSectionLabel = (entry) =>
  [entry.program_code, entry.section_description].filter(Boolean).join("-");

const FacultyLoadTimetable = ({
  schedules = [],
  loading = false,
  selectedProfessor = null,
  showProfessorInfo = true,
  headerColor = "#9e0000",
  borderColor = "#1f2937",
}) => {
  const normalizedSchedules = useMemo(
    () =>
      (Array.isArray(schedules) ? schedules : [])
        .map((entry) => {
          const start = parseTime(entry.school_time_start);
          const end = parseTime(entry.school_time_end);
          return {
            ...entry,
            _day: normalizeDay(entry.day || entry.day_description),
            _start: start,
            _end: end,
            _gridStart: start === null ? null : Math.floor(start / SLOT_MINUTES) * SLOT_MINUTES,
            _gridEnd: end === null ? null : Math.ceil(end / SLOT_MINUTES) * SLOT_MINUTES,
          };
        })
        .filter(
          (entry) =>
            DAYS.includes(entry._day) &&
            entry._start !== null &&
            entry._end !== null &&
            entry._end > entry._start,
        ),
    [schedules],
  );

  const schedulesByDay = useMemo(
    () =>
      Object.fromEntries(
        DAYS.map((day) => [
          day,
          normalizedSchedules
            .filter((entry) => entry._day === day)
            .sort((first, second) => first._start - second._start),
        ]),
      ),
    [normalizedSchedules],
  );

  const professorName = selectedProfessor
    ? `${selectedProfessor.fname || ""} ${selectedProfessor.mname?.charAt(0) || ""}${selectedProfessor.mname ? "." : ""} ${selectedProfessor.lname || ""}`.trim()
    : "";
  const firstSchedule = normalizedSchedules[0];
  const activeTerm = firstSchedule
    ? `${firstSchedule.current_year || ""}${firstSchedule.next_year ? `-${firstSchedule.next_year}` : ""}${firstSchedule.semester_description ? `, ${firstSchedule.semester_description}` : ""}`
    : "Active school year and semester";

  if (!selectedProfessor) {
    return (
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          color: "text.secondary",
        }}
      >
        <Typography sx={{ fontSize: "12px" }}>
          Select a professor to view the faculty load timetable.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ py: 6, display: "flex", justifyContent: "center", alignItems: "center", gap: 1.5 }}>
        <CircularProgress size={24} sx={{ color: headerColor }} />
        <Typography sx={{ fontSize: "12px" }}>Loading faculty load...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {showProfessorInfo && <Box sx={{ mb: 1.5 }}>
        <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#1f2937" }}>
          {professorName} {selectedProfessor.employee_id ? `(${selectedProfessor.employee_id})` : ""}
        </Typography>
        <Typography sx={{ fontSize: "9px", color: "#64748b" }}>
          {activeTerm} · {normalizedSchedules.length} load record{normalizedSchedules.length === 1 ? "" : "s"}
        </Typography>
      </Box>}

      {normalizedSchedules.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            minHeight: "40vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            border: `1px solid ${borderColor}`,
            fontSize: "12px",
          }}
        >
          No regular class or designation load was found for this professor in the active term.
        </Box>
      ) : (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Box
            component="table"
            sx={{
              width: "100%",
              minWidth: 900,
              maxWidth: 1120,
              mx: "auto",
              borderCollapse: "collapse",
              tableLayout: "fixed",
              "& th, & td": { border: `1px solid ${borderColor}` },
            }}
          >
            <Box component="thead">
              <Box component="tr" sx={{ backgroundColor: headerColor }}>
                <Box component="th" sx={{ width: 100, py: 0.5, color: "#fff", fontSize: "10px" }}>
                  Time
                </Box>
                {DAYS.map((day) => {
                  const daySchedules = schedulesByDay[day];
                  const officialTime = daySchedules.length
                    ? `${formatMinutes(Math.min(...daySchedules.map((entry) => entry._start)))}–${formatMinutes(Math.max(...daySchedules.map((entry) => entry._end)))}`
                    : "No load";
                  return (
                    <Box component="th" key={day} sx={{ py: 0.75, px: 0.5, color: "#fff" }}>
                      <Typography sx={{ fontSize: "10px", fontWeight: 700 }}>{DAY_LABELS[day]}</Typography>
                      <Typography sx={{ fontSize: "8px", opacity: 0.9 }}>{officialTime}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
            <Box component="tbody">
              {TIME_SLOTS.map((slotStart, slotIndex) => (
                <Box component="tr" key={slotStart} sx={{ height: 26 }}>
                  <Box
                    component="td"
                    sx={{
                      px: 0.5,
                      backgroundColor: "#f1f5f9",
                      textAlign: "center",
                      fontSize: "9px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatMinutes(slotStart)}–{formatMinutes(slotStart + SLOT_MINUTES)}
                  </Box>
                  {DAYS.map((day) => {
                    const entries = schedulesByDay[day];
                    const startingEntry = entries.find((entry) => entry._gridStart === slotStart);
                    const isCovered = entries.some(
                      (entry) => entry._gridStart < slotStart && entry._gridEnd > slotStart,
                    );
                    if (!startingEntry && isCovered) return null;
                    if (!startingEntry) {
                      return <Box component="td" key={day} sx={{ backgroundColor: "#fff" }} />;
                    }

                    const maximumSpan = TIME_SLOTS.length - slotIndex;
                    const rowSpan = Math.min(
                      maximumSpan,
                      Math.max(1, Math.ceil((startingEntry._gridEnd - startingEntry._gridStart) / SLOT_MINUTES)),
                    );
                    const sectionLabel = getSectionLabel(startingEntry);
                    const isRegularClass = Boolean(startingEntry.department_section_id || startingEntry.section_description);

                    return (
                      <Box
                        component="td"
                        key={day}
                        rowSpan={rowSpan}
                        sx={{
                          p: 0.5,
                          verticalAlign: "middle",
                          textAlign: "center",
                          backgroundColor: getBlockColor(startingEntry),
                          color: "#111827",
                          overflow: "hidden",
                        }}
                      >
                        <Typography sx={{ fontSize: "9px", fontWeight: 800, lineHeight: 1.1 }}>
                          {startingEntry.course_code || "Load"}
                        </Typography>
                        {startingEntry.load_description && (
                          <Typography sx={{ fontSize: "8px", lineHeight: 1.1, mt: 0.2 }}>
                            {startingEntry.load_description}
                          </Typography>
                        )}
                        {sectionLabel && (
                          <Typography sx={{ fontSize: "8px", lineHeight: 1.1 }}>{sectionLabel}</Typography>
                        )}
                        {startingEntry.room_description && (
                          <Typography sx={{ fontSize: "8px", lineHeight: 1.1 }}>{startingEntry.room_description}</Typography>
                        )}
                        <Typography sx={{ fontSize: "8px", fontWeight: 600, lineHeight: 1.1, mt: 0.2 }}>
                          {formatMinutes(startingEntry._start)}–{formatMinutes(startingEntry._end)}
                        </Typography>
                        <Typography sx={{ fontSize: "7px", lineHeight: 1.1, mt: 0.2 }}>
                          {isRegularClass ? "Regular Class" : "Designation / Workload"}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default FacultyLoadTimetable;
