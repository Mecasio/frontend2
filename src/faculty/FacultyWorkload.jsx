import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SettingsContext } from "../App";
import axios from "axios";
import EaristLogo from "../assets/EaristLogo.png";
import { Avatar, Box, Typography } from "@mui/material";
import { Padding } from "@mui/icons-material";
import { FcPrint } from "react-icons/fc";
import API_BASE_URL from "../apiConfig";

const FACULTY_WORKLOAD_STYLES = `
/* Faculty Workload — vanilla CSS (converted from Tailwind) */

/* ── Layout ── */
.fw-flex { display: flex; }
.fw-flex-col { display: flex; flex-direction: column; }
.fw-items-center { align-items: center; }
.fw-justify-center { justify-content: center; }
.fw-shrink-0 { flex-shrink: 0; }
.fw-flex-none { flex: none; }
.fw-block { display: block; }
.fw-relative { position: relative; }
.fw-absolute { position: absolute; }
.fw-inset-0 { inset: 0; }
.fw-w-full { width: 100%; }
.fw-h-full { height: 100%; }
.fw-cursor-pointer { cursor: pointer; }

/* ── Spacing ── */
.fw-p-0 { padding: 0; }
.fw-m-0 { margin: 0; }
.fw-px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
.fw-ml-1 { margin-left: 0.25rem; }
.fw-ml-2 { margin-left: 0.5rem; }
.fw-ml-3px { margin-left: 3px; }

/* ── Typography ── */
.fw-text-center { text-align: center; }
.fw-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fw-font-bold { font-weight: 700; }
.fw-underline { text-decoration: underline; }
.fw-leading-tight { line-height: 1.25; }

.fw-text-8 { font-size: 8px; }
.fw-text-9 { font-size: 9px; }
.fw-text-9-5 { font-size: 9.5px; }
.fw-text-10 { font-size: 10px; }
.fw-text-10-5 { font-size: 10.5px; }
.fw-text-11 { font-size: 11px; }
.fw-text-11-5 { font-size: 11.5px; }
.fw-text-12 { font-size: 12px; }
.fw-text-14 { font-size: 14px; }
.fw-text-18 { font-size: 18px; }
.fw-text-20 { font-size: 20px; }

.fw-tracking-tight { letter-spacing: -1px; }
.fw-tracking-tight-05 { letter-spacing: -0.5px; }
.fw-tracking-wide { letter-spacing: 0.5px; }
.fw-font-400 { font-weight: 400; }
.fw-font-500 { font-weight: 500; }
.fw-font-600 { font-weight: 600; }

/* ── Borders ── */
.fw-border { border: 1px solid #000; }
.fw-border-t-none { border-top: none; }
.fw-border-l-none { border-left: none; }
.fw-border-r-none { border-right: none; }
.fw-border-b-none { border-bottom: none; }

/* ── Margins (arbitrary) ── */
.fw-mt-2rem { margin-top: 2rem; }
.fw-mt-1rem { margin-top: 1rem; }
.fw-mt-07rem { margin-top: 0.7rem; }
.fw-mt-08rem { margin-top: 0.8rem; }
.fw-mt-06rem { margin-top: 0.6rem; }
.fw-mt-2rem-sig { margin-top: 2rem; }
.fw-mt-neg04 { margin-top: -0.4rem; }
.fw-mt-neg01 { margin-top: -0.1px; }
.fw-mt-neg3px { margin-top: -3px; }
.fw-mt-neg17 { margin-top: -1.7rem; }
.fw-mt-neg2px { margin-top: -2px; }
.fw-mb-16rem { margin-bottom: 16rem; }

/* ── Heights ── */
.fw-h-2rem { height: 2rem; }
.fw-h-25rem { height: 2.5rem; }
.fw-h-125rem { height: 1.25rem; }
.fw-h-3rem { height: 3rem; }
.fw-h-6rem { height: 6rem; }
.fw-h-18rem { height: 1.8rem; }
.fw-h-12rem { height: 1.2rem; }
.fw-h-105rem { height: 1.05rem; }
.fw-h-1rem { height: 1rem; }
.fw-h-20px { height: 20px; }
.fw-min-h-2rem { min-height: 2rem; }
.fw-min-h-10rem { min-height: 10rem; }
.fw-min-h-215rem { min-height: 2.15rem; }
.fw-min-h-12rem { min-height: 1.2rem; }
.fw-min-h-105rem { min-height: 1.05rem; }
.fw-max-h-2rem { max-height: 2rem; }
.fw-max-h-215rem { max-height: 2.15rem; }

/* ── Widths ── */
.fw-w-8rem { width: 8rem; }
.fw-w-48rem { width: 48rem; }
.fw-w-63rem { width: 63rem; }
.fw-w-37rem { width: 37rem; }
.fw-w-27rem { width: 27rem; }
.fw-w-9rem { width: 9rem; }
.fw-w-2rem { width: 2rem; }
.fw-w-35rem { width: 3.5rem; }
.fw-w-6rem { width: 6rem; }
.fw-w-135rem { width: 13.5rem; }
.fw-w-195rem { width: 19.5rem; }
.fw-w-38rem { width: 3.8rem; }
.fw-w-3rem { width: 3rem; }
.fw-w-31rem { width: 3.1rem; }
.fw-w-32rem { width: 3.2rem; }
.fw-w-33rem { width: 3.3rem; }
.fw-w-28rem { width: 2.8rem; }
.fw-w-308rem { width: 3.08rem; }
.fw-w-39rem { width: 3.9rem; }
.fw-w-320rem { width: 3.20rem; }
.fw-w-02rem { width: 0.2rem; padding: 0.2rem; }

.fw-min-w-8rem { min-width: 8rem; }
.fw-min-w-13rem { min-width: 13rem; }
.fw-min-w-65rem { min-width: 6.5rem; }
.fw-min-w-66rem { min-width: 6.6rem; }
.fw-min-w-68rem { min-width: 6.8rem; }
.fw-min-w-69rem { min-width: 6.9rem; }
.fw-min-w-7rem { min-width: 7rem; }
.fw-min-w-131rem { min-width: 13.1rem; }
.fw-min-w-61rem { min-width: 61rem; }
.fw-min-w-37rem { min-width: 37rem; }
.fw-min-w-23rem { min-width: 23rem; }
.fw-min-w-195rem { min-width: 19.5rem; }
.fw-min-w-144rem { min-width: 14.4rem; }
.fw-min-w-2rem { min-width: 2rem; }

.fw-max-w-5rem { max-width: 5rem; }
.fw-max-w-897rem { max-width: 8.97rem; }
.fw-max-w-37rem { max-width: 37rem; }
.fw-max-w-61rem { max-width: 61rem; }
.fw-max-w-24rem { max-width: 24rem; }
.fw-max-w-239rem { max-width: 23.9rem; }

/* ── Padding (arbitrary) ── */
.fw-px-07rem { padding-left: 0.7rem; padding-right: 0.7rem; }
.fw-px-09rem { padding-left: 0.9rem; padding-right: 0.9rem; }
.fw-px-04rem { padding-left: 0.4rem; padding-right: 0.4rem; }

/* ── Background colors ── */
.fw-bg-gray-300 { background-color: #d1d5db; }
.fw-bg-eaeaea { background-color: #eaeaea; }
.fw-bg-c0c0c0 { background-color: #c0c0c0; }
.fw-bg-black { background-color: #000; }
.fw-bg-white-text { color: #fff; }
.fw-bg-yellow-300 { background-color: #fde047; }
.fw-bg-ccffff { background-color: #ccffff; }
.fw-bg-e6ccff { background-color: #e6ccff; }
.fw-bg-ffd9b3 { background-color: #ffd9b3; }
.fw-bg-99ccff { background-color: #99ccff; }
.fw-bg-ccffcc { background-color: #ccffcc; }
.fw-bg-fde5d6 { background-color: #fde5d6; }
.fw-bg-f7caac { background-color: #f7caac; }

.fw-text-white { color: #fff; }

/* ── Workload table constants ── */
.fw-workload-cell {
  border: 1px solid #000;
  border-left: none;
  border-bottom: none;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.fw-h-day-header { height: 1.075rem; }
.fw-h-regular { height: 1.075rem; }
.fw-h-pair { height: 1rem; }
.fw-h-other-fn { height: 1rem; }
.fw-h-other-fn-group { height: 4rem; }
.fw-h-total { height: 1.05rem; }

.fw-w-label { width: 11rem; flex-shrink: 0; flex: none; }
.fw-w-other-group { width: 4.3rem; flex-shrink: 0; flex: none; }
.fw-w-other-sublabel { width: 6.7rem; flex-shrink: 0; flex: none; }

.fw-day-mon { padding-left: 0.7rem; padding-right: 0.7rem; width: 3.2rem; flex-shrink: 0; flex: none; }
.fw-day-tue { padding-left: 0.9rem; padding-right: 0.9rem; width: 3.1rem; flex-shrink: 0; flex: none; }
.fw-day-wed { padding-left: 0.9rem; padding-right: 0.9rem; width: 3.3rem; flex-shrink: 0; flex: none; }
.fw-day-thu { padding-left: 0.9rem; padding-right: 0.9rem; width: 3.08rem; flex-shrink: 0; flex: none; }
.fw-day-fri { padding-left: 0.9rem; padding-right: 0.9rem; width: 2.8rem; flex-shrink: 0; flex: none; }
.fw-day-sat { padding-left: 0.9rem; padding-right: 0.9rem; width: 3.20rem; flex-shrink: 0; flex: none; }
.fw-day-sun { padding-left: 0.9rem; padding-right: 0.9rem; width: 3.3rem; flex-shrink: 0; flex: none; }
.fw-day-total { border-right: none; padding-left: 0.9rem; padding-right: 0.9rem; width: 3.9rem; flex-shrink: 0; flex: none; }

/* ── Schedule grid cells ── */
.fw-slot {
  height: 1.25rem;
  border: 1px solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fw-slot-top {
  border-top: none;
  border-left: none;
}

.fw-slot-bottom {
  border-left: none;
}

.fw-schedule-row { display: flex; width: 100%; }
.fw-schedule-tbody { display: flex; flex-direction: column; margin-top: -0.1px; }
.fw-time-label {
  height: 2.5rem;
  background-color: #eaeaea;
  border: 1px solid #000;
  border-top: none;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fw-slot-wrapper { height: 2.5rem; padding: 0; margin: 0; }

/* ── Extra teaching load rows ── */
.fw-extra-row { display: flex; max-height: 2rem; }
.fw-extra-cell {
  border: 1px solid #000;
  border-top: none;
  border-left: none;
  min-height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fw-extra-cell-r-none { border-right: none; }

/* ── Header / designation / education ── */
.fw-print-container { min-height: 10rem; margin-bottom: 16rem; }
.fw-info-row { display: flex; align-items: center; }
.fw-designation-title {
  background-color: #d1d5db;
  border: 1px solid #000;
  min-width: 13rem;
  border-right: none;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fw-designation-details {
  width: 48rem;
  border: 1px solid #000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fw-education-bg {
  background-color: #d1d5db;
  border: 1px solid #000;
  width: 13rem;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fw-educ-row {
  border: 1px solid #000;
  border-bottom: none;
  border-left: none;
  width: 48rem;
  height: 2rem;
  padding: 0;
  display: flex;
}
.fw-educ-row-last {
  border: 1px solid #000;
  border-left: none;
  width: 48rem;
  height: 2rem;
  padding: 0;
  display: flex;
}
.fw-educ-title {
  font-size: 12px;
  letter-spacing: -1px;
  border: 1px solid #000;
  margin: 0;
  padding-left: 0.25rem;
  padding-right: 0.25rem;
  border-bottom: none;
  border-left: none;
  border-top: none;
  min-width: 8rem;
  height: 100%;
  display: flex;
  align-items: center;
}
.fw-educ-content {
  font-size: 12px;
  height: 100%;
  display: flex;
  align-items: center;
  margin-left: 0.25rem;
}

/* ── Schedule table header ── */
.fw-schedule-table { margin-top: 0.7rem; }
.fw-thead-gray { background-color: #c0c0c0; }
.fw-th-time {
  min-width: 6.5rem;
  min-height: 2.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #000;
  font-size: 14px;
}
.fw-th-day-top {
  text-align: center;
  border: 1px solid #000;
  border-left: none;
  border-bottom: none;
  font-size: 14px;
}
.fw-th-day-bottom {
  height: 20px;
  text-align: center;
  border: 1px solid #000;
  border-left: none;
  font-size: 11.5px;
  margin-top: -3px;
}

/* ── Summary section ── */
.fw-summary-header {
  background-color: #000;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  height: 1.8rem;
  min-width: 61rem;
  text-align: center;
}
.fw-summary-section-title {
  text-align: center;
  font-size: 11px;
  background-color: #c0c0c0;
  font-weight: 500;
}
.fw-workload-header-cell {
  border: 1px solid #000;
  border-left: none;
  background-color: #eaeaea;
  border-bottom: none;
  font-size: 11px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fw-workload-header-cell-total {
  border: 1px solid #000;
  border-left: none;
  background-color: #eaeaea;
  border-bottom: none;
  border-right: none;
  font-size: 11px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fw-workload-label-cell {
  border: 1px solid #000;
  border-left: none;
  border-bottom: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 0.25rem;
  padding-right: 0.25rem;
}
.fw-workload-other-group-label {
  border: 1px solid #000;
  border-left: none;
  border-bottom: none;
  font-size: 10px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 0.4rem;
  padding-right: 0.4rem;
}
.fw-honorarium-header-row { display: flex; max-height: 2.15rem; }
.fw-honorarium-header-cell {
  border: 1px solid #000;
  border-left: none;
  background-color: #eaeaea;
  min-height: 2.15rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fw-honorarium-header-cell-r-none { border-right: none; }

/* ── FTE calculator ── */
.fw-fte-header-row { display: flex; min-height: 1.05rem; }
.fw-fte-cell {
  border: 1px solid #000;
  border-left: none;
  border-bottom: none;
  background-color: #eaeaea;
  text-align: center;
}
.fw-fte-data-cell {
  border: 1px solid #000;
  border-left: none;
  border-bottom: none;
  text-align: center;
  height: 1rem;
}

/* ── Conforme / signatures ── */
.fw-conforme-box {
  border: 1px solid #000;
  display: flex;
  flex-direction: column;
  background-color: #eaeaea;
}
.fw-conforme-code {
  background-color: #000;
  color: #fff;
  padding: 0.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 13.5rem;
}
.fw-signature-col {
  display: flex;
  flex-direction: column;
  margin-top: 2rem;
  width: 100%;
  align-items: center;
}

/* ── Assignment title ── */
.fw-assignment-title {
  display: flex;
  justify-content: center;
  width: 63rem;
  font-size: 20px;
  font-weight: 700;
}
.fw-assignment-subtitle {
  display: flex;
  justify-content: center;
  width: 63rem;
  font-size: 14px;
  letter-spacing: -0.5px;
  margin-top: -0.4rem;
}

/* ── Existing semantic classes (kept) ── */
.information { /* print styles reference this */ }
.designation { /* print styles reference this */ }
.educ-con { display: flex; }
.educ-details { /* combined with fw-educ-row */ }
.education-bg { /* combined with fw-education-bg */ }
.prof-details { /* layout handled by fw-w-48rem fw-mt-08rem */ }
.earist-logo { /* max-width handled by fw-max-w-5rem */ }
.schedule-block { position: relative; width: 100%; height: 100%; cursor: pointer; text-align: center; }
.schedule-block-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 11px;
  line-height: 1.25;
  cursor: pointer;
}
.schedule-text-main { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; }
.schedule-text-sub { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 8px; }
`;

const WORKLOAD_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const WORKLOAD_CELL_BASE =
  "border border border-black border-l-0 border-b-0 text-[11px] flex items-center justify-center text-center";

// Heights aligned to EXTRA TEACHING LOADS FOR HONORARIUM (2.15rem header, 2rem data rows)
const WORKLOAD_HEIGHT_DAY_HEADER = "h-[1.075rem]";
const WORKLOAD_HEIGHT_REGULAR = "h-[1.075rem]";
const WORKLOAD_HEIGHT_PAIR = "h-[1rem]";
const WORKLOAD_HEIGHT_OTHER_FUNCTIONS = "h-[1rem]";
const WORKLOAD_HEIGHT_OTHER_FUNCTIONS_GROUP = "h-[4rem]";
const WORKLOAD_HEIGHT_TOTAL = WORKLOAD_HEIGHT_PAIR;

const WORKLOAD_LABEL_WIDTH = "w-[11rem] shrink-0 flex-none";
const WORKLOAD_OTHER_GROUP_WIDTH = "w-[4.3rem] shrink-0 flex-none";
const WORKLOAD_OTHER_SUBLABEL_WIDTH = "w-[6.7rem] shrink-0 flex-none";

const WORKLOAD_DAY_COLUMNS = [
  { key: "MON", className: `${WORKLOAD_CELL_BASE} px-[0.7rem] w-[3.2rem] shrink-0 flex-none` },
  { key: "TUE", className: `${WORKLOAD_CELL_BASE} px-[0.9rem] w-[3.1rem] shrink-0 flex-none` },
  { key: "WED", className: `${WORKLOAD_CELL_BASE} px-[0.9rem] w-[3.3rem] shrink-0 flex-none` },
  { key: "THU", className: `${WORKLOAD_CELL_BASE} px-[0.9rem] w-[3.08rem] shrink-0 flex-none` },
  { key: "FRI", className: `${WORKLOAD_CELL_BASE} px-[0.9rem] w-[2.8rem] shrink-0 flex-none` },
  { key: "SAT", className: `${WORKLOAD_CELL_BASE} px-[0.9rem] w-[3.20rem] shrink-0 flex-none` },
  { key: "SUN", className: `${WORKLOAD_CELL_BASE} px-[0.9rem] w-[3.3rem] shrink-0 flex-none` },
  { key: "TOTAL", className: `${WORKLOAD_CELL_BASE} border-r-0 px-[0.9rem] w-[3.9rem] shrink-0 flex-none` },
];

const createEmptyWorkloadRow = () =>
  WORKLOAD_DAYS.reduce(
    (row, day) => {
      row[day] = 0;
      return row;
    },
    { TOTAL: 0 }
  );

const normalizeWorkloadDay = (dayDescription) => {
  if (!dayDescription) return "";
  const day = String(dayDescription).trim().toUpperCase();
  if (day.startsWith("MON")) return "MON";
  if (day.startsWith("TUE")) return "TUE";
  if (day.startsWith("WED")) return "WED";
  if (day.startsWith("THU")) return "THU";
  if (day.startsWith("FRI")) return "FRI";
  if (day.startsWith("SAT")) return "SAT";
  if (day.startsWith("SUN")) return "SUN";
  return day;
};

const parseScheduleTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const match = String(timeStr).match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return 0;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const modifier = match[3]?.toUpperCase();

  if (modifier === "PM" && hours < 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

const getScheduleDurationHours = (entry) => {
  const start = parseScheduleTimeToMinutes(entry.school_time_start);
  const end = parseScheduleTimeToMinutes(entry.school_time_end);
  return Math.max(0, (end - start) / 60);
};

const normalizeCourseCode = (courseCode) =>
  String(courseCode || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

const isDesignationScheduleEntry = (entry) =>
  entry.department_section_id == null ||
  entry.department_section_id === "" ||
  Number(entry.department_section_id) === 0;

const isWorkloadFlagEnabled = (value) => Number(value) === 1;

const isHonorariumEntry = (entry) => isWorkloadFlagEnabled(entry?.ishonorarium);
const isServiceCreditEntry = (entry) => isWorkloadFlagEnabled(entry?.is_servicecredit);
const isTemporarySubstitutionEntry = (entry) =>
  isWorkloadFlagEnabled(entry?.is_temporary_substitution);

const EXTRA_TEACHING_LOAD_ROW_COUNT = 5;
const FTE_CALCULATOR_ROW_COUNT = 11;

const formatCourseUnit = (unit) => {
  if (unit == null || unit === "") return "";
  const numericUnit = Number(unit);
  if (!Number.isFinite(numericUnit)) return String(unit);
  return Number.isInteger(numericUnit) ? String(numericUnit) : String(numericUnit);
};

const formatExtraTeachingAssignment = (entry) => {
  if (!entry) return "";
  const parts = [entry.course_code, entry.course_description].filter(
    Boolean
  );
  return parts.join(" - ");
};

const formatExtraTeachingClass = (entry) => {
  if (!entry) return "";
  const parts = [entry.program_code, entry.section_description].filter(
    Boolean
  );
  return parts.join(" - ");
};

const getRegularTeachingAssignmentKey = (entry) =>
  [
    entry?.course_id,
    entry?.department_section_id,
    entry?.course_code,
    entry?.program_code,
    entry?.section_description,
  ]
    .map((value) => String(value || ""))
    .join("|");

const getWorkloadCategory = (entry) => {
  if (isTemporarySubstitutionEntry(entry)) {
    return "temporarySubstitution";
  }
  if (isHonorariumEntry(entry)) {
    return "overload";
  }
  if (isServiceCreditEntry(entry)) {
    return "emergencyLoad";
  }
  if (isDesignationScheduleEntry(entry)) {
    const normalized = normalizeCourseCode(entry.course_code);
    if (normalized === "RESEARCH") return "research";
    if (normalized === "EXTENSION") return "extension";
    if (normalized === "PRODUCTION") return "production";
    if (normalized === "ACCREDITATION") return "accreditation";
    if (normalized === "CONSULTATION") return "consultation";
    if (normalized === "LESSONPREPARATION") return "lessonPreparation";
    return "designation";
  }
  return "regular";
};

// ── Workload color palette (sourced from WorkloadManagement / workload_type) ──
// Each internal workload category is matched to a `workload_type` row by
// comparing a normalized token against the row's `workload_description`
// (e.g. category "research" -> token "RESEARCH" -> matches "Research").
const normalizeForMatch = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

const CATEGORY_MATCH_TOKENS = {
  regular: "REGULARTEACHINGLOAD",
  overload: "OVERLOAD",
  emergencyLoad: "EMERGENCYLOAD",
  temporarySubstitution: "TEMPORARYSUBSTITUTION",
  designation: "DESIGNATION",
  research: "RESEARCH",
  extension: "EXTENSION",
  production: "PRODUCTION",
  accreditation: "ACCREDITATION",
  consultation: "CONSULTATION",
  lessonPreparation: "LESSONPREPARATION",
};

// Fallback colors used only when WorkloadManagement doesn't (yet) have a
// matching workload_type row, or that row has no color set.
const DEFAULT_CATEGORY_COLORS = {
  regular: "#fde047",
  overload: "#ccffff",
  emergencyLoad: "#e6ccff",
  temporarySubstitution: "#ffd9b3",
  designation: "#99ccff",
  research: "#ccffcc",
  extension: "#ccffcc",
  production: "#ccffcc",
  accreditation: "#ccffcc",
  consultation: "#fde5d6",
  lessonPreparation: "#f7caac",
};

const findWorkloadTypeByToken = (workloadTypes, token) => {
  if (!token || !Array.isArray(workloadTypes)) return null;

  // 1) exact match: normalized workload_description === token
  const exact = workloadTypes.find(
    (wt) => normalizeForMatch(wt.workload_description) === token
  );
  if (exact) return exact;

  // 2) loose match: token is contained in (or contains) the description,
  //    e.g. "LESSONPREPARATION" vs "LESSONPREPARATIONOFFCAMPUS"
  return (
    workloadTypes.find((wt) => {
      const normalizedDescription = normalizeForMatch(wt.workload_description);
      return (
        normalizedDescription.length > 0 &&
        (normalizedDescription.includes(token) || token.includes(normalizedDescription))
      );
    }) || null
  );
};

const buildWorkloadColorMap = (workloadTypes) => {
  const colorMap = {};

  Object.entries(CATEGORY_MATCH_TOKENS).forEach(([categoryKey, token]) => {
    const match = findWorkloadTypeByToken(workloadTypes, token);
    const matchedColor = match?.workload_color && match.workload_color.trim();
    colorMap[categoryKey] = matchedColor || DEFAULT_CATEGORY_COLORS[categoryKey];
  });

  return colorMap;
};

const buildDailyWorkloadDistribution = (scheduleEntries) => {
  const distribution = {
    regular: createEmptyWorkloadRow(),
    overload: createEmptyWorkloadRow(),
    emergencyLoad: createEmptyWorkloadRow(),
    temporarySubstitution: createEmptyWorkloadRow(),
    designation: createEmptyWorkloadRow(),
    research: createEmptyWorkloadRow(),
    extension: createEmptyWorkloadRow(),
    production: createEmptyWorkloadRow(),
    accreditation: createEmptyWorkloadRow(),
    consultation: createEmptyWorkloadRow(),
    lessonPreparation: createEmptyWorkloadRow(),
    grandTotal: createEmptyWorkloadRow(),
  };

  scheduleEntries.forEach((entry) => {
    const day = normalizeWorkloadDay(entry.day_description);
    if (!WORKLOAD_DAYS.includes(day)) return;

    const category = getWorkloadCategory(entry);
    const hours = getScheduleDurationHours(entry);

    distribution[category][day] += hours;
    distribution[category].TOTAL += hours;
    distribution.grandTotal[day] += hours;
    distribution.grandTotal.TOTAL += hours;
  });

  return distribution;
};

const formatWorkloadHours = (hours) => {
  if (!hours) return "";
  return (Math.round(hours * 10) / 10).toFixed(1);
};

const formatFteHours = (hours) => {
  if (!hours) return "";
  return (Math.round(hours * 10) / 10).toFixed(1);
};

const FacultyWorkload = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [stepperColor, setStepperColor] = useState("#000000");

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");

  useEffect(() => {
    if (!settings) return;

    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

    if (assets.logoUrl) {
      setFetchedLogo(assets.logoUrl);
    } else {
      setFetchedLogo(EaristLogo);
    }

    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
  }, [settings]);

  const navigate = useNavigate();
  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [schedule, setSchedule] = useState([]);
  const [profData, setPerson] = useState({
    prof_id: "",
    employee_id: "",
    fname: "",
    mname: "",
    lname: "",
    profile_image: "",
    bachelor: "",
    master: "",
    doctor: "",
  });
  const [activeAcademicTerm, setActiveAcademicTerm] = useState({
    semester_description: "",
    current_year: "",
    next_year: "",
  });

  // Workload types (description / code / color) managed on the
  // WorkloadManagement page — this is the single source of truth for
  // all the colors used throughout this page.
  const [workloadTypes, setWorkloadTypes] = useState([]);

  useEffect(() => {
    const fetchWorkloadTypes = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/workload`);
        setWorkloadTypes(res.data || []);
      } catch (err) {
        console.error("Error fetching workload types:", err);
        setWorkloadTypes([]);
      }
    };

    fetchWorkloadTypes();
  }, []);

  const workloadColorMap = useMemo(
    () => buildWorkloadColorMap(workloadTypes),
    [workloadTypes]
  );

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/active_school_year`)
      .then((res) => {
        if (res.data?.length > 0) {
          const active = res.data[0];
          setActiveAcademicTerm({
            semester_description: active.semester_description || "",
            current_year: active.current_year || "",
            next_year: active.next_year || "",
          });
        }
      })
      .catch((err) =>
        console.error("Error fetching active school year:", err),
      );
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedProfID = localStorage.getItem("prof_id");
    const storedEmployeeID = localStorage.getItem("employee_id");
    const storedID = storedProfID || storedEmployeeID;

    if (storedUser && storedRole && storedID) {
      setUser(storedUser);
      setUserRole(storedRole);
      setUserID(storedID);

      if (storedRole !== "faculty") {
        window.location.href = "/dashboard";
      } else {
        fetchPersonData(storedID);
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  const fetchPersonData = async (id) => {
    try {
      const storedProfID = localStorage.getItem("prof_id");
      const storedEmployeeID = localStorage.getItem("employee_id");
      const endpoint = storedProfID
        ? `/api/get_prof_data_by_prof/${storedProfID}`
        : storedEmployeeID
          ? `/api/get_prof_data_by_employee/${storedEmployeeID}`
          : `/api/get_prof_data/${id}`;
      const res = await axios.get(`${API_BASE_URL}${endpoint}`);
      const first = res.data[0];
      localStorage.setItem("prof_id", first.prof_id || "");
      localStorage.setItem("employee_id", first.employee_id || "");

      const profInfo = {
        prof_id: first.prof_id,
        employee_id: first.employee_id,
        fname: first.fname,
        mname: first.mname,
        lname: first.lname,
        profile_image: first.profile_image,
        bachelor: "",
        master: "",
        doctor: "",
      };

      setPerson(profInfo);
    } catch (err) {
      setLoading(false);
      setMessage("Error Fetching Professor Personal Data");
    }
  };

  useEffect(() => {
    if (!profData.prof_id) return;

    const fetchProfessorEducation = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/person_prof_list`);
        const education = (response.data || []).find(
          (row) => String(row.person_id) === String(profData.prof_id)
        );

        setPerson((prev) => ({
          ...prev,
          bachelor: education?.bachelor || "",
          master: education?.master || "",
          doctor: education?.doctor || "",
        }));
      } catch (err) {
        console.error("Error fetching professor education:", err);
      }
    };

    const fetchSchedule = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/professor-schedule/${profData.prof_id}`,
        );
        setSchedule(response.data);
      } catch (err) {
        console.error("Error fetching professor schedule:", err);
      }
    };

    fetchProfessorEducation();
    fetchSchedule();
  }, [profData.prof_id]);

  const dailyWorkload = useMemo(
    () => buildDailyWorkloadDistribution(schedule),
    [schedule]
  );

  const honorariumSchedules = useMemo(
    () => schedule.filter((entry) => isHonorariumEntry(entry)),
    [schedule]
  );

  const serviceCreditSchedules = useMemo(
    () => schedule.filter((entry) => isServiceCreditEntry(entry)),
    [schedule]
  );

  const regularTeachingAssignments = useMemo(() => {
    const uniqueAssignments = new Map();

    schedule.forEach((entry) => {
      if (getWorkloadCategory(entry) !== "regular") return;

      const key = getRegularTeachingAssignmentKey(entry);
      if (!uniqueAssignments.has(key)) {
        uniqueAssignments.set(key, {
          ...entry,
          fteHours: 0,
        });
      }

      const assignment = uniqueAssignments.get(key);
      assignment.fteHours += getScheduleDurationHours(entry);
    });

    return Array.from(uniqueAssignments.values());
  }, [schedule]);

  const totalFteHours = useMemo(
    () =>
      regularTeachingAssignments.reduce(
        (sum, entry) => sum + (Number(entry.fteHours) || 0),
        0
      ),
    [regularTeachingAssignments]
  );

  const renderFteCalculatorRows = () => {
    const rows = Array.from(
      { length: FTE_CALCULATOR_ROW_COUNT },
      (_, index) => regularTeachingAssignments[index] || null
    );

    return rows.map((entry, index) => (
      <div className="flex flex-col" key={`fte-regular-${index}`}>
        <div className="flex">
          <div className="border border border-black border-l-0 border-b-0 w-[19.5rem] text-[10px] h-[1rem] text-center truncate px-1">
            {formatExtraTeachingAssignment(entry)}
          </div>
          <div className="border border border-black border-l-0 border-b-0 text-[10px] w-[3.8rem] h-[1rem] text-center">
            {entry ? formatCourseUnit(entry.course_unit) : ""}
          </div>
          <div className="border border border-black border-l-0 border-b-0 text-[10px] w-[3.8rem] h-[1rem] text-center truncate px-1">
            {formatExtraTeachingClass(entry)}
          </div>
          <div className="border border border-black border-l-0 border-b-0 text-[10px] w-[3.8rem] h-[1rem] text-center"></div>
          <div className="border border border-black border-l-0 border-b-0 text-[8px] tracking-[-1px] h-[1rem] w-[3rem] text-center"></div>
          <div className="border border border-black border-l-0 border-b-0 text-[10px] border-r-0 text-center h-[1rem] w-[3.1rem]">
            {entry ? formatFteHours(entry.fteHours) : ""}
          </div>
        </div>
      </div>
    ));
  };

  const renderExtraTeachingLoadRows = (entries, loadTypeLabel) => {
    const rows = Array.from(
      { length: EXTRA_TEACHING_LOAD_ROW_COUNT },
      (_, index) => entries[index] || null
    );
    const totalHours = entries.reduce(
      (sum, entry) => sum + getScheduleDurationHours(entry),
      0
    );

    return (
      <>
        {rows.map((entry, index) => (
          <div className="flex h-[2rem] max-h-[2rem] overflow-hidden" key={`${loadTypeLabel}-${index}`}>
            <div className="border border-black border-t-0 border-l-0 h-[2rem] max-h-[2rem] overflow-hidden flex items-center justify-center w-[9rem] px-1">
              <span className="text-[10px] tracking-[-1px] text-center truncate w-full">
                {formatExtraTeachingAssignment(entry)}
              </span>
            </div>
            <div className="border border-black border-t-0 border-l-0 h-[2rem] max-h-[2rem] overflow-hidden flex items-center justify-center w-[2rem]">
              <span className="text-[10px] tracking-[-1px]">
                {entry ? formatCourseUnit(entry.course_unit) : ""}
              </span>
            </div>
            <div className="border border-black border-t-0 border-l-0 h-[2rem] max-h-[2rem] overflow-hidden flex items-center justify-center w-[3.5rem] px-1">
              <span className="text-[9px] tracking-[-1px] leading-tight text-center"></span>
            </div>
            <div className="border border-black border-t-0 border-l-0 h-[2rem] max-h-[2rem] overflow-hidden flex items-center justify-center w-[6rem] px-1">
              <span className="text-[10px] tracking-[-1px] text-center truncate w-full">
                {formatExtraTeachingClass(entry)}
              </span>
            </div>
            <div className="border border-black border-t-0 border-l-0 h-[2rem] max-h-[2rem] overflow-hidden flex items-center border-r-0 justify-center w-[3.5rem]">
              <span className="text-[10px] tracking-[-1px]"></span>
            </div>
          </div>
        ))}
        <div className="flex">
          <div
            className={`border border border-black border-l-0 border-t-0 text-[10px] text-center font-bold flex items-center justify-center w-[9rem] ${WORKLOAD_HEIGHT_TOTAL}`}
          >
              TOTAL
          </div>
          <div
            className={`border border border-black border-l-0 border-t-0 text-[10px] text-center flex items-center justify-center w-[2rem] ${WORKLOAD_HEIGHT_TOTAL}`}
          >
              {formatWorkloadHours(totalHours)}
          </div>
          <div className={`border border border-black border-l-0 border-t-0 w-[3.5rem] ${WORKLOAD_HEIGHT_TOTAL}`}></div>
          <div className={`border border border-black border-l-0 border-t-0 w-[6rem] ${WORKLOAD_HEIGHT_TOTAL}`}></div>
          <div className={`border border border-black border-l-0 border-r-0 border-t-0 w-[3.5rem] ${WORKLOAD_HEIGHT_TOTAL}`}></div>
        </div>
      </>
    );
  };

  const renderWorkloadCells = (categoryKey, options = {}) => {
    const {
      totalClassName = "",
      rowHeight = WORKLOAD_HEIGHT_PAIR,
      cellStyle = {},
    } = options;
    const backgroundColor = workloadColorMap[categoryKey] || "";

    return WORKLOAD_DAY_COLUMNS.map(({ key, className }) => (
      <div
        key={`${categoryKey}-${key}`}
        className={`${className} ${rowHeight} ${key === "TOTAL" ? totalClassName : ""
          }`}
        style={{ backgroundColor, ...cellStyle }}
      >
        {formatWorkloadHours(dailyWorkload[categoryKey][key])}
      </div>
    ));
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier) {
      if (modifier.toUpperCase() === "PM" && hours < 12) hours += 12;
      if (modifier.toUpperCase() === "AM" && hours === 12) hours = 0;
    }

    const ampm = hours >= 12 ? "PM" : "AM";
    let displayHours = hours % 12;
    if (displayHours === 0) displayHours = 12;

    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const getDayScheduleRange = (day) => {
    const daySchedules = schedule.filter(
      (entry) => entry.day_description.toUpperCase() === day.toUpperCase(),
    );
    if (!daySchedules.length) return "";

    const parseTime = (timeStr) => {
      if (!timeStr) return 0;
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!match) return 0;
      let [_, h, m, mod] = match;
      let hours = Number(h);
      const minutes = Number(m);
      if (mod?.toUpperCase() === "PM" && hours < 12) hours += 12;
      if (mod?.toUpperCase() === "AM" && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const earliest = daySchedules.reduce((min, curr) => {
      return parseTime(curr.school_time_start) < parseTime(min)
        ? curr.school_time_start
        : min;
    }, daySchedules[0].school_time_start);

    const latest = daySchedules.reduce((max, curr) => {
      return parseTime(curr.school_time_end) > parseTime(max)
        ? curr.school_time_end
        : max;
    }, daySchedules[0].school_time_end);

    return `${formatTime(earliest)} - ${formatTime(latest)}`;
  };

  const getDutyColor = (start, day) => {
    const parseTime = (t) => new Date(`1970-01-01 ${t}`);
    const slotStart = parseTime(start);

    for (const entry of schedule) {
      if (entry.day_description !== day) continue;

      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);

      if (slotStart >= schedStart && slotStart < schedEnd) {
        // If the schedule row already carries an explicit color
        // (e.g. joined server-side from workload_type), honor it first.
        if (entry.workload_color) {
          return entry.workload_color;
        }

        // Otherwise resolve the color from WorkloadManagement's palette
        // using the same category classification used for the summary
        // table (regular / overload / emergencyLoad / designation / etc.)
        const category = getWorkloadCategory(entry);
        return workloadColorMap[category] || "";
      }
    }

    return ""; // no color
  };

  const isTimeInSchedule = (start, end, day) => {
    const parseTime = (timeStr) => new Date(`1970-01-01 ${timeStr}`);
    return schedule.some((entry) => {
      if (entry.day_description !== day) return false;

      const slotStart = parseTime(start);
      const slotEnd = parseTime(end);
      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);

      return slotStart >= schedStart && slotEnd <= schedEnd;
    });
  };

  const hasAdjacentSchedule = (start, end, day, direction = "top") => {
    const parseTime = (timeStr) => new Date(`1970-01-01 ${timeStr}`);
    const minutesOffset = direction === "top" ? -30 : 30;

    const newStart = new Date(
      parseTime(start).getTime() + minutesOffset * 60000,
    );
    const newEnd = new Date(parseTime(end).getTime() + minutesOffset * 60000);

    const currentEntry = schedule.find((entry) => {
      if (entry.day_description !== day) return false;
      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);
      return parseTime(start) >= schedStart && parseTime(end) <= schedEnd;
    });

    const adjacentEntry = schedule.find((entry) => {
      if (entry.day_description !== day) return false;
      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);
      return newStart >= schedStart && newEnd <= schedEnd;
    });

    if (!adjacentEntry) return false;

    if (
      currentEntry &&
      adjacentEntry.course_code === currentEntry.course_code
    ) {
      return "same";
    } else {
      return "different";
    }
  };

  const getCenterText = (start, day) => {
    const parseTime = (t) => new Date(`1970-01-01 ${t}`);
    const SLOT_HEIGHT_REM = 2.5;

    const slotStart = parseTime(start);

    for (const entry of schedule) {
      if (entry.day_description !== day) continue;

      const schedStart = parseTime(entry.school_time_start);
      const schedEnd = parseTime(entry.school_time_end);

      if (!(slotStart >= schedStart && slotStart < schedEnd)) continue;

      const totalHours = (schedEnd - schedStart) / (1000 * 60 * 60);
      const isTopSlot = slotStart.getTime() === schedStart.getTime();

      let textContent = null;
      if (totalHours === 1) {
        textContent = (
          <>
            <span className="block truncate text-[10px]">
              {entry.course_code}
            </span>
            {entry.program_code && entry.section_description && (
              <span className="block truncate text-[8px]">
                {entry.program_code}-{entry.section_description}
              </span>
            )}
            {entry.section_description &&
              entry.section_description !== 0 &&
              entry.section_description !== "0" &&
              entry.room_description && (
                <span className="block truncate text-[8px]">
                  {entry.room_description}
                </span>
              )}
          </>
        );
      } else {
        const totalHours = (schedEnd - schedStart) / (1000 * 60 * 60);
        const blockHeightRem = totalHours * SLOT_HEIGHT_REM;
        const textHeightRem = 0.5;
        const marginTop = (blockHeightRem - textHeightRem) / 2;

        textContent = (
          <span
            className="absolute inset-0 flex flex-col items-center justify-center text-center text-[11px] leading-tight cursor-pointer"
            style={{ top: `${marginTop}rem` }}
          >
            {entry.course_code} <br />
            {(entry.program_code || entry.section_description) && (
              <>
                {[entry.program_code, entry.section_description]
                  .filter(Boolean)
                  .join(" - ")}
                <br />
              </>
            )}
            {entry.section_description &&
              entry.section_description !== 0 &&
              entry.section_description !== "0" &&
              entry.room_description && <>({entry.room_description})</>}
          </span>
        );
      }

      return (
        <div
          className="schedule-block relative w-full h-full cursor-pointer text-center"
          onClick={() =>
            navigate("/faculty_masterlist", {
              state: {
                course_id: entry.course_id,
                section_id: entry.section_id,
                department_section_id: entry.department_section_id,
                school_year_id: entry.school_year_id,
              },
            })
          }
        >
          {isTopSlot && textContent}
        </div>
      );
    }

    return "";
  };

  const divToPrintRef = useRef();
  const [isGeneratingWorkloadPdf, setIsGeneratingWorkloadPdf] = useState(false);

  const collectDocumentCss = () => {
    let cssText = "";
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        Array.from(sheet.cssRules || []).forEach((rule) => {
          cssText += `${rule.cssText}\n`;
        });
      } catch (_) {
        // Ignore cross-origin stylesheets
      }
    });
    return cssText;
  };

  const downloadFacultyWorkloadPdf = async () => {
    if (!divToPrintRef.current || isGeneratingWorkloadPdf) return;

    setIsGeneratingWorkloadPdf(true);

    try {
      const workload = divToPrintRef.current;
      if (!workload) {
        throw new Error("Faculty workload form is not available.");
      }

      const res = await fetch(`${API_BASE_URL}/api/generate-faculty-workload-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html: workload.innerHTML,
          styles: collectDocumentCss(),
          employee_id: profData.employee_id || "",
          last_name: profData.lname || "",
          first_name: profData.fname || "",
        }),
      });

      const contentType = res.headers.get("content-type");

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        console.error("Backend error:", errorData);
        throw new Error(errorData?.error || errorData?.message || "PDF failed");
      }

      if (!contentType || !contentType.includes("application/pdf")) {
        const text = await res.text();
        console.error("Unexpected response:", text);
        throw new Error("Server did not return a valid PDF");
      }

      const blob = await res.blob();

      if (blob.size === 0) {
        throw new Error("Generated PDF is empty");
      }

      const safeLastName = String(profData.lname || "Faculty").trim().replace(/\s+/g, "_");
      const safeFirstName = String(profData.fname || "").trim().replace(/\s+/g, "_");
      const employeeSuffix = profData.employee_id
        ? `_${String(profData.employee_id).trim().replace(/\s+/g, "_")}`
        : "";

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Faculty_Workload_${safeLastName}${safeFirstName ? "_" + safeFirstName : ""}${employeeSuffix}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate Faculty Workload PDF:", error);
      window.alert(
        error?.message ||
        "Failed to generate Faculty Workload PDF. Please try again.",
      );
    } finally {
      setIsGeneratingWorkloadPdf(false);
    }
  };

  // 🔒 Disable right-click
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  // 🔒 Block DevTools shortcuts + Ctrl+P silently
  document.addEventListener("keydown", (e) => {
    const isBlockedKey =
      e.key === "F12" ||
      e.key === "F11" ||
      (e.ctrlKey &&
        e.shiftKey &&
        (e.key.toLowerCase() === "i" || e.key.toLowerCase() === "j")) ||
      (e.ctrlKey && e.key.toLowerCase() === "u") ||
      (e.ctrlKey && e.key.toLowerCase() === "p");

    if (isBlockedKey) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  return (
    <Box
      sx={{
        height: "calc(100vh - 150px)",
        overflowY: "auto",
        paddingRight: 1,
        backgroundColor: "transparent",
        mt: 1,
        padding: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          width: "100%",
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: "36px",
          }}
        >
          FACULTY WORKLOAD
        </Typography>

        <button
          onClick={downloadFacultyWorkloadPdf}
          disabled={isGeneratingWorkloadPdf}
          style={{
            width: "300px",
            padding: "10px 20px",
            border: "2px solid black",
            backgroundColor: "#f0f0f0",
            color: "black",
            borderRadius: "5px",
            cursor: isGeneratingWorkloadPdf ? "not-allowed" : "pointer",
            fontSize: "16px",
            fontWeight: "bold",
            opacity: isGeneratingWorkloadPdf ? 0.6 : 1,
            transition: "background-color 0.3s, transform 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            if (isGeneratingWorkloadPdf) return;
            e.currentTarget.style.backgroundColor = "#d3d3d3";
          }}
          onMouseLeave={(e) => {
            if (isGeneratingWorkloadPdf) return;
            e.currentTarget.style.backgroundColor = "#f0f0f0";
          }}
          onMouseDown={(e) => {
            if (isGeneratingWorkloadPdf) return;
            e.currentTarget.style.transform = "scale(0.95)";
          }}
          onMouseUp={(e) => {
            if (isGeneratingWorkloadPdf) return;
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FcPrint size={20} />
            {isGeneratingWorkloadPdf
              ? "Generating PDF..."
              : "Download Faculty Workload"}
          </span>
        </button>
      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />

      <br />

      <style>
        {`${FACULTY_WORKLOAD_STYLES}
                @media print {
                    @page {
                        size: 8.5in 14in;
                        margin: 0; 
                    }
                
                    body * {
                        visibility: hidden;
                        
                    }

                    .body{
                        margin-top: -22rem;
                        margin-left: -27rem;
                        overflow: visible !important;  /* show all content */
                        height: auto !important;       /* expand height */
                        max-height: none !important;   /* no max height limit */
                        
                    }
                    .print-container, .print-container * {
                        visibility: visible;
                    }
                    .print-container {
                        scale: 0.9;
                        position: absolute;
                        left:2%;
                        top: 0rem;
                        transform: translateX(-50%)
                        width: 100%;
                        font-family: Arial;
                        margin-top: -4.5rem;
                        padding: 0;
                    }
                    button {
                        display: none !important; /* hide buttons */
                    }
                    .signature-container, .signature-content{
                        margin-left: 1rem;
                    }
                    .conforme{
                        font-size: 12.5px;
                        
                    }
                    .information{
                        width: 160rem;
                    }
                    .designation{
                        width: 160rem;
                    }

                    .conforme-title{
                        font-size: 11.65px;
                        margin-left: 3px;
                    }
                    .conforme-cont{
                        width: 29rem;
                    }
                    
                    @page {
                        size: 8.5in 14in;
                        margin: 0;
                    }

                    .line{
                        min-width: 61rem;
                    }

                    .image {
                        width: 13rem !important;
                        height: 8rem !important;
                        margin-top: -2rem !important;
                        margin-left: -4rem !important;
                    }
                }
                `}
      </style>
      <Box style={{ width: "100%", justifyContent: "center", display: "flex" }}>
        <Box
          style={{
            paddingTop: "1rem",
            paddingLeft: "2rem",
            border: `1px solid ${borderColor}`,
          }}
        >
          <div
            className="min-h-[10rem] mb-[16rem] print-container"
            ref={divToPrintRef}
          >
            <div className="mt-[2rem]">
              <div>
                <div className="flex align-center information">
                  <div className="w-[8rem] ">
                    <img
                      src={fetchedLogo}
                      alt=""
                      srcSet=""
                      className="max-w-[5rem] earist-logo"
                    />
                  </div>
                  <div className="w-[48rem] prof-details mt-[0.8rem]">
                    <p className="text-[11px] employee-number">
                      Employee No: {profData.employee_id || ""}
                    </p>
                    <p className="text-[18px] bold employee-name">
                      {profData.fname} {profData.mname} {profData.lname}
                    </p>
                    <p className="text-[11px] employee-status">
                      Status Rank: 
                    </p>
                  </div>
                  <div className="img">
                    {!profData?.profile_image ? (
                      <Avatar
                        variant="square"
                        sx={{
                          marginTop: "0.3rem",
                          width: 66,
                          height: 66,
                          border: "3px solid maroon",
                          color: "maroon",
                          bgcolor: "transparent",
                        }}
                      />
                    ) : (
                      <img
                        src={`${API_BASE_URL}/uploads/Faculty1by1/${profData.profile_image}`}
                        className="image"
                        style={{ width: "5rem", height: "5rem" }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-[1rem]">
              <div>
                <div className="flex designation">
                  <div className="bg-gray-300 border border-black min-w-[13rem] border-r-0 h-[3rem] flex items-center justify-center designation-title">
                    <p className="text-[14px] font-bold tracking-[-1px]">
                      DESIGNATION
                    </p>
                  </div>
                  <div className="w-[48rem] border border-black flex items-center justify-center designation-details">
                    <p className="text-[11px]"></p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-[1rem]">
              <div className="flex educ-con">
                <div>
                  <div className="education-bg bg-gray-300 border border-black w-[13rem] h-full flex items-center justify-center">
                    <p className="text-[14px] font-bold tracking-[-1px]">
                      EDUCATIONAL BACKGROUND
                    </p>
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="border border-black border-b-0 border-l-0 w-[48rem] h-[2rem] p-0 flex  educ-details">
                    <div className="educ-title text-[12px] tracking-[-1px] border border-black m-0 px-1 border-b-0 border-l-0 border-t-0 min-w-[8rem] h-full flex items-center">
                      BACHELOR'S DEGREE
                    </div>
                    <p className="educ-content text-[12px] h-full flex items-center ml-1">
                      {profData.bachelor || ""}
                    </p>
                  </div>
                  <div className="border border-black border-b-0 border-l-0 w-[48rem] h-[2rem] p-0 flex  educ-details">
                    <div className="educ-title text-[12px] tracking-[-1px] border border-black m-0 px-1 border-b-0 border-l-0 border-t-0 min-w-[8rem] h-full flex items-center">
                      MASTER'S DEGREE
                    </div>
                    <p className="educ-content text-[12px] h-full flex items-center ml-1">
                      {profData.master || ""}
                    </p>
                  </div>
                  <div className="border border-black border-b-0 border-l-0 w-[48rem] h-[2rem] p-0 flex  educ-details">
                    <div className="educ-title text-[12px] tracking-[-1px] border border-black m-0 px-1 border-b-0 border-l-0 border-t-0 min-w-[8rem] h-full flex items-center">
                      DOCTORAL'S DEGREE
                    </div>
                    <p className="educ-content text-[12px]  h-full flex items-center ml-1 MIN-">
                      {profData.doctor || ""}
                    </p>
                  </div>
                  <div className="border border-black border-l-0 w-[48rem] h-[2rem] p-0 flex educ-details">
                    <div className="educ-title text-[12px] tracking-[-1px] border border-black m-0 px-1 border-b-0 border-l-0 border-t-0 min-w-[8rem] h-full flex items-center">
                      SPECIAL TRAINING
                    </div>
                    <p className="educ-content text-[12px] h-full flex items-center ml-1"></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-[0.7rem]">
              <div>
                <div className="">
                  <div className="flex justify-center w-[63rem] text-[20px] font-bold">
                    FACULTY ASSIGNMENT
                  </div>
                  <div className="flex justify-center w-[63rem] text-[14px] tracking-[-0.5px] mt-[-0.4rem]">
                    {activeAcademicTerm.semester_description
                      ? `${activeAcademicTerm.semester_description}:`
                      : ""}
                    <p className="ml-2">
                      {activeAcademicTerm.current_year && activeAcademicTerm.next_year
                        ? `AY ${activeAcademicTerm.current_year}-${activeAcademicTerm.next_year}`
                        : ""}
                    </p>
                    <p className="ml-2">
                      {activeAcademicTerm.semester_description || ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <table className="mt-[0.7rem]">
              <thead className="bg-[#c0c0c0]">
                <tr className="flex align-center">
                  <td className="min-w-[6.5rem] min-h-[2.2rem] flex items-center justify-center border border-black text-[14px] ">
                    TIME
                  </td>
                  <td className="p-0 m-0">
                    <div className="min-w-[6.6rem] text-center border border-black border-l-0 border-b-0 text-[14px]">
                      DAY
                    </div>
                    <p className="h-[20px] min-w-[6.6rem] text-center border border-black border-l-0 text-[11.5px] mt-[-3px]">
                      Official Time
                    </p>
                  </td>
                  <td className="p-0 m-0">
                    <div className="min-w-[6.8rem] text-center border border-black border-l-0 border-b-0 text-[14px]">
                      MONDAY
                    </div>
                    <p className="h-[20px] min-w-[6.8rem] text-center border border-black border-l-0 text-[11.5px] mt-[-3px]">
                      {getDayScheduleRange("MON")}
                    </p>
                  </td>
                  <td className="p-0 m-0">
                    <div className="min-w-[6.8rem] text-center border border-black border-l-0 border-b-0 text-[14px]">
                      TUESDAY
                    </div>
                    <p className="h-[20px] min-w-[6.8rem] text-center border border-black border-l-0 text-[11.5px] mt-[-3px]">
                      {getDayScheduleRange("TUE")}
                    </p>
                  </td>
                  <td className="p-0 m-0">
                    <div className="min-w-[7rem] text-center border border-black border-l-0 border-b-0 text-[14px]">
                      WEDNESDAY
                    </div>
                    <p className="h-[20px] min-w-[7rem] text-center border border-black border-l-0 text-[11.5px] mt-[-3px]">
                      {getDayScheduleRange("WED")}
                    </p>
                  </td>
                  <td className="p-0 m-0">
                    <div className="min-w-[6.9rem] text-center border border-black border-l-0 border-b-0 text-[14px]">
                      THURSDAY
                    </div>
                    <p className="h-[20px] min-w-[6.9rem] text-center border border-black border-l-0 text-[11.5px] mt-[-3px]">
                      {getDayScheduleRange("THU")}
                    </p>
                  </td>
                  <td className="p-0 m-0">
                    <div className="min-w-[6.8rem] text-center border border-black border-l-0 border-b-0 text-[14px]">
                      FRIDAY
                    </div>
                    <p className="h-[20px] min-w-[6.8rem] text-center border border-black border-l-0 text-[11.5px] mt-[-3px]">
                      {getDayScheduleRange("FRI")}
                    </p>
                  </td>
                  <td className="p-0 m-0">
                    <div className="min-w-[6.8rem] text-center border border-black border-l-0 border-b-0 text-[14px]">
                      SATUDAY
                    </div>
                    <p className="h-[20px] min-w-[6.8rem] text-center border border-black border-l-0 text-[11.5px] mt-[-3px]">
                      {getDayScheduleRange("SAT")}
                    </p>
                  </td>
                  <td className="p-0 m-0">
                    <div className="min-w-[6.8rem] text-center border border-black border-l-0 border-b-0 text-[14px]">
                      SUNDAY
                    </div>
                    <p className="h-[20px] min-w-[6.8rem] text-center border border-black border-l-0 text-[11.5px] mt-[-3px]">
                      {getDayScheduleRange("SUN")}
                    </p>
                  </td>
                </tr>
              </thead>
              <tbody className="flex flex-col mt-[-0.1px]">
                <tr className="flex w-full">
                  <td className="m-0 p-0 min-w-[13.1rem]">
                    <div className="bg-[#eaeaea] h-[2.5rem] border border-black border-t-0 text-[14px] flex items-center justify-center">
                      07:00 AM - 08:00 AM
                    </div>
                  </td>

                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                    (day, i) => (
                      <td
                        key={day}
                        className={`m-0 p-0 ${day === "WED"
                          ? "min-w-[7rem]"
                          : day === "THU"
                            ? "min-w-[6.9rem]"
                            : "min-w-[6.8rem]"
                          }`}
                      >
                        <div className="h-[2.5rem] p-0 m-0">
                          <div
                            style={{
                              backgroundColor: isTimeInSchedule(
                                "7:00 AM",
                                "7:30 AM",
                                day,
                              )
                                ? getDutyColor("7:00 AM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-t-0 border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "7:00 AM",
                              "7:30 AM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "7:00 AM",
                                  "7:30 AM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "7:00 AM",
                                "7:30 AM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "7:00 AM",
                                  "7:30 AM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("7:00 AM", day)}
                          </div>

                          <div
                            style={{
                              borderTop: "none",
                              backgroundColor: isTimeInSchedule(
                                "7:30 AM",
                                "8:00 AM",
                                day,
                              )
                                ? getDutyColor("7:30 AM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "7:30 AM",
                              "8:00 AM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "7:30 AM",
                                  "8:00 AM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "7:30 AM",
                                "8:00 AM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "7:30 AM",
                                  "8:00 AM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("7:30 AM", day)}
                          </div>
                        </div>
                      </td>
                    ),
                  )}
                </tr>

                <tr className="flex w-full">
                  <td className="m-0 p-0 min-w-[13.1rem]">
                    <div className="h-[2.5rem] bg-[#eaeaea] border border-black border-t-0 text-[14px] flex items-center justify-center">
                      08:00 AM - 09:00 AM
                    </div>
                  </td>

                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                    (day, i) => (
                      <td
                        key={day}
                        className={`m-0 p-0 ${day === "WED"
                          ? "min-w-[7rem]"
                          : day === "THU"
                            ? "min-w-[6.9rem]"
                            : "min-w-[6.8rem]"
                          }`}
                      >
                        <div className="h-[2.5rem] p-0 m-0">
                          <div
                            style={{
                              backgroundColor: isTimeInSchedule(
                                "8:00 AM",
                                "8:30 AM",
                                day,
                              )
                                ? getDutyColor("8:00 AM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-t-0 border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "8:00 AM",
                              "8:30 AM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "8:00 AM",
                                  "8:30 AM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "8:00 AM",
                                "8:30 AM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "8:00 AM",
                                  "8:30 AM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("8:00 AM", day)}
                          </div>
                          <div
                            style={{
                              borderTop: "none",
                              backgroundColor: isTimeInSchedule(
                                "8:30 AM",
                                "9:00 AM",
                                day,
                              )
                                ? getDutyColor("8:30 AM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "8:30 AM",
                              "9:00 AM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "8:30 AM",
                                  "9:00 AM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "8:30 AM",
                                "9:00 AM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "8:30 AM",
                                  "9:00 AM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("8:30 AM", day)}
                          </div>
                        </div>
                      </td>
                    ),
                  )}
                </tr>

                <tr className="flex w-full">
                  <td className="m-0 p-0 min-w-[13.1rem]">
                    <div className="h-[2.5rem] bg-[#eaeaea] border border-black border-t-0 text-[14px] flex items-center justify-center">
                      09:00 AM - 10:00 AM
                    </div>
                  </td>

                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                    (day, i) => (
                      <td
                        key={day}
                        className={`m-0 p-0 ${day === "WED"
                          ? "min-w-[7rem]"
                          : day === "THU"
                            ? "min-w-[6.9rem]"
                            : "min-w-[6.8rem]"
                          }`}
                      >
                        <div className="h-[2.5rem] p-0 m-0">
                          <div
                            style={{
                              backgroundColor: isTimeInSchedule(
                                "9:00 AM",
                                "9:30 AM",
                                day,
                              )
                                ? getDutyColor("9:00 AM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-t-0 border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "9:00 AM",
                              "9:30 AM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "9:00 AM",
                                  "9:30 AM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "9:00 AM",
                                "9:30 AM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "9:00 AM",
                                  "9:30 AM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("9:00 AM", day)}
                          </div>

                          <div
                            style={{
                              borderTop: "none",
                              backgroundColor: isTimeInSchedule(
                                "9:30 AM",
                                "10:00 AM",
                                day,
                              )
                                ? getDutyColor("9:30 AM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "9:30 AM",
                              "10:00 AM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "9:30 AM",
                                  "10:00 AM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "9:30 AM",
                                "10:00 AM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "9:30 AM",
                                  "10:00 AM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("9:30 AM", day)}
                          </div>
                        </div>
                      </td>
                    ),
                  )}
                </tr>

                <tr className="flex w-full">
                  <td className="m-0 p-0 min-w-[13.1rem]">
                    <div className="h-[2.5rem] bg-[#eaeaea] border border-black border-t-0 text-[14px] flex items-center justify-center">
                      10:00 AM - 11:00 AM
                    </div>
                  </td>

                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                    (day, i) => (
                      <td
                        key={day}
                        className={`m-0 p-0 ${day === "WED"
                          ? "min-w-[7rem]"
                          : day === "THU"
                            ? "min-w-[6.9rem]"
                            : "min-w-[6.8rem]"
                          }`}
                      >
                        <div className="h-[2.5rem] p-0 m-0">
                          <div
                            style={{
                              backgroundColor: isTimeInSchedule(
                                "10:00 AM",
                                "10:30 AM",
                                day,
                              )
                                ? getDutyColor("10:00 AM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-t-0 border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "10:00 AM",
                              "10:30 AM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "10:00 AM",
                                  "10:30 AM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "10:00 AM",
                                "10:30 AM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "10:00 AM",
                                  "10:30 AM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("10:00 AM", day)}
                          </div>

                          <div
                            style={{
                              borderTop: "none",
                              backgroundColor: isTimeInSchedule(
                                "10:30 AM",
                                "11:00 AM",
                                day,
                              )
                                ? getDutyColor("10:30 AM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "10:30 AM",
                              "11:00 AM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "10:30 AM",
                                  "11:00 AM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "10:30 AM",
                                "11:00 AM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "10:30 AM",
                                  "11:00 AM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("10:30 AM", day)}
                          </div>
                        </div>
                      </td>
                    ),
                  )}
                </tr>

                <tr className="flex w-full">
                  <td className="m-0 p-0 min-w-[13.1rem]">
                    <div className="h-[2.5rem] bg-[#eaeaea] border border-black border-t-0 text-[14px] flex items-center justify-center">
                      11:00 AM - 12:00 PM
                    </div>
                  </td>

                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                    (day, i) => (
                      <td
                        key={day}
                        className={`m-0 p-0 ${day === "WED"
                          ? "min-w-[7rem]"
                          : day === "THU"
                            ? "min-w-[6.9rem]"
                            : "min-w-[6.8rem]"
                          }`}
                      >
                        <div className="h-[2.5rem] p-0 m-0">
                          <div
                            style={{
                              backgroundColor: isTimeInSchedule(
                                "11:00 AM",
                                "11:30 AM",
                                day,
                              )
                                ? getDutyColor("11:00 AM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-t-0 border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "11:00 AM",
                              "11:30 AM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "11:00 AM",
                                  "11:30 AM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "11:00 AM",
                                "11:30 AM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "11:00 AM",
                                  "11:30 AM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("11:00 AM", day)}
                          </div>
                          <div
                            style={{
                              borderTop: "none",
                              backgroundColor: isTimeInSchedule(
                                "11:30 AM",
                                "12:00 PM",
                                day,
                              )
                                ? getDutyColor("11:30 AM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "11:30 AM",
                              "12:00 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "11:30 AM",
                                  "12:00 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "11:30 AM",
                                "12:00 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "11:30 AM",
                                  "12:00 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("11:30 AM", day)}
                          </div>
                        </div>
                      </td>
                    ),
                  )}
                </tr>

                <tr className="flex w-full">
                  <td className="m-0 p-0 min-w-[13.1rem]">
                    <div className="h-[2.5rem] bg-[#eaeaea] border border-black border-t-0 text-[14px] flex items-center justify-center">
                      12:00 PM - 01:00 PM
                    </div>
                  </td>

                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                    (day, i) => (
                      <td
                        key={day}
                        className={`m-0 p-0 ${day === "WED"
                          ? "min-w-[7rem]"
                          : day === "THU"
                            ? "min-w-[6.9rem]"
                            : "min-w-[6.8rem]"
                          }`}
                      >
                        <div className="h-[2.5rem] p-0 m-0">
                          <div
                            style={{
                              backgroundColor: isTimeInSchedule(
                                "12:00 PM",
                                "12:30 PM",
                                day,
                              )
                                ? getDutyColor("12:00 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-t-0 border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "12:00 PM",
                              "12:30 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "12:00 PM",
                                  "12:30 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "12:00 PM",
                                "12:30 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "12:00 PM",
                                  "12:30 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("12:00 PM", day)}
                          </div>

                          <div
                            style={{
                              borderTop: "none",
                              backgroundColor: isTimeInSchedule(
                                "12:30 PM",
                                "1:00 PM",
                                day,
                              )
                                ? getDutyColor("12:30 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "12:30 PM",
                              "1:00 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "12:30 PM",
                                  "1:00 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "12:30 PM",
                                "1:00 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "12:30 PM",
                                  "1:00 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("12:30 PM", day)}
                          </div>
                        </div>
                      </td>
                    ),
                  )}
                </tr>

                <tr className="flex w-full">
                  <td className="m-0 p-0 min-w-[13.1rem]">
                    <div className="h-[2.5rem] border bg-[#eaeaea] border-black border-t-0 text-[14px] flex items-center justify-center">
                      01:00 PM - 02:00 PM
                    </div>
                  </td>

                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                    (day, i) => (
                      <td
                        key={day}
                        className={`m-0 p-0 ${day === "WED"
                          ? "min-w-[7rem]"
                          : day === "THU"
                            ? "min-w-[6.9rem]"
                            : "min-w-[6.8rem]"
                          }`}
                      >
                        <div className="h-[2.5rem] p-0 m-0">
                          <div
                            style={{
                              backgroundColor: isTimeInSchedule(
                                "1:00 PM",
                                "1:30 PM",
                                day,
                              )
                                ? getDutyColor("1:00 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-t-0 border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "1:00 PM",
                              "1:30 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "1:00 PM",
                                  "1:30 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "1:00 PM",
                                "1:30 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "1:00 PM",
                                  "1:30 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("1:00 PM", day)}
                          </div>

                          <div
                            style={{
                              borderTop: "none",
                              backgroundColor: isTimeInSchedule(
                                "1:30 PM",
                                "2:00 PM",
                                day,
                              )
                                ? getDutyColor("1:30 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "1:30 PM",
                              "2:00 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "1:30 PM",
                                  "2:00 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "1:30 PM",
                                "2:00 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "1:30 PM",
                                  "2:00 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("1:30 PM", day)}
                          </div>
                        </div>
                      </td>
                    ),
                  )}
                </tr>

                <tr className="flex w-full">
                  <td className="m-0 p-0 min-w-[13.1rem]">
                    <div className="h-[2.5rem] bg-[#eaeaea] border border-black border-t-0 text-[14px] flex items-center justify-center">
                      02:00 PM - 03:00 PM
                    </div>
                  </td>

                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                    (day, i) => (
                      <td
                        key={day}
                        className={`m-0 p-0 ${day === "WED"
                          ? "min-w-[7rem]"
                          : day === "THU"
                            ? "min-w-[6.9rem]"
                            : "min-w-[6.8rem]"
                          }`}
                      >
                        <div className="h-[2.5rem] p-0 m-0">
                          <div
                            style={{
                              backgroundColor: isTimeInSchedule(
                                "2:00 PM",
                                "2:30 PM",
                                day,
                              )
                                ? getDutyColor("2:00 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-t-0 border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "2:00 PM",
                              "2:30 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "2:00 PM",
                                  "2:30 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "2:00 PM",
                                "2:30 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "2:00 PM",
                                  "2:30 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("2:00 PM", day)}
                          </div>

                          <div
                            style={{
                              borderTop: "none",
                              backgroundColor: isTimeInSchedule(
                                "2:30 PM",
                                "3:00 PM",
                                day,
                              )
                                ? getDutyColor("2:30 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "2:30 PM",
                              "3:00 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "2:30 PM",
                                  "3:00 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "2:30 PM",
                                "3:00 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "2:30 PM",
                                  "3:00 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("2:30 PM", day)}
                          </div>
                        </div>
                      </td>
                    ),
                  )}
                </tr>

                <tr className="flex w-full">
                  <td className="m-0 p-0 min-w-[13.1rem]">
                    <div className="h-[2.5rem] bg-[#eaeaea] border border-black border-t-0 text-[14px] flex items-center justify-center">
                      03:00 PM - 04:00 PM
                    </div>
                  </td>

                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                    (day, i) => (
                      <td
                        key={day}
                        className={`m-0 p-0 ${day === "WED"
                          ? "min-w-[7rem]"
                          : day === "THU"
                            ? "min-w-[6.9rem]"
                            : "min-w-[6.8rem]"
                          }`}
                      >
                        <div className="h-[2.5rem] p-0 m-0">
                          <div
                            style={{
                              backgroundColor: isTimeInSchedule(
                                "3:00 PM",
                                "3:30 PM",
                                day,
                              )
                                ? getDutyColor("3:00 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-t-0 border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "3:00 PM",
                              "3:30 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "3:00 PM",
                                  "3:30 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "3:00 PM",
                                "3:30 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "3:00 PM",
                                  "3:30 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("3:00 PM", day)}
                          </div>

                          <div
                            style={{
                              borderTop: "none",
                              backgroundColor: isTimeInSchedule(
                                "3:30 PM",
                                "4:00 PM",
                                day,
                              )
                                ? getDutyColor("3:30 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "3:30 PM",
                              "4:00 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "3:30 PM",
                                  "4:00 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "3:30 PM",
                                "4:00 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "3:30 PM",
                                  "4:00 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("3:30 PM", day)}
                          </div>
                        </div>
                      </td>
                    ),
                  )}
                </tr>

                <tr className="flex w-full">
                  <td className="m-0 p-0 min-w-[13.1rem]">
                    <div className="h-[2.5rem] bg-[#eaeaea] border border-black border-t-0 text-[14px] flex items-center justify-center">
                      04:00 PM - 05:00 PM
                    </div>
                  </td>

                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                    (day, i) => (
                      <td
                        key={day}
                        className={`m-0 p-0 ${day === "WED"
                          ? "min-w-[7rem]"
                          : day === "THU"
                            ? "min-w-[6.9rem]"
                            : "min-w-[6.8rem]"
                          }`}
                      >
                        <div className="h-[2.5rem] p-0 m-0">
                          <div
                            style={{
                              backgroundColor: isTimeInSchedule(
                                "4:00 PM",
                                "4:30 PM",
                                day,
                              )
                                ? getDutyColor("4:00 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-t-0 border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "4:00 PM",
                              "4:30 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "4:00 PM",
                                  "4:30 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "4:00 PM",
                                "4:30 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "4:00 PM",
                                  "4:30 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("4:00 PM", day)}
                          </div>

                          <div
                            style={{
                              borderTop: "none",
                              backgroundColor: isTimeInSchedule(
                                "4:30 PM",
                                "5:00 PM",
                                day,
                              )
                                ? getDutyColor("4:30 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "4:30 PM",
                              "5:00 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "4:30 PM",
                                  "5:00 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "4:30 PM",
                                "5:00 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "4:30 PM",
                                  "5:00 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("4:30 PM", day)}
                          </div>
                        </div>
                      </td>
                    ),
                  )}
                </tr>

                <tr className="flex w-full">
                  <td className="m-0 p-0 min-w-[13.1rem]">
                    <div className="h-[2.5rem] bg-[#eaeaea] border border-black border-t-0 text-[14px] flex items-center justify-center">
                      05:00 PM - 06:00 PM
                    </div>
                  </td>

                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                    (day, i) => (
                      <td
                        key={day}
                        className={`m-0 p-0 ${day === "WED"
                          ? "min-w-[7rem]"
                          : day === "THU"
                            ? "min-w-[6.9rem]"
                            : "min-w-[6.8rem]"
                          }`}
                      >
                        <div className="h-[2.5rem] p-0 m-0">
                          <div
                            style={{
                              backgroundColor: isTimeInSchedule(
                                "5:00 PM",
                                "5:30 PM",
                                day,
                              )
                                ? getDutyColor("5:00 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-t-0 border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "5:00 PM",
                              "5:30 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "5:00 PM",
                                  "5:30 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "5:00 PM",
                                "5:30 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "5:00 PM",
                                  "5:30 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("5:00 PM", day)}
                          </div>

                          <div
                            style={{
                              borderTop: "none",
                              backgroundColor: isTimeInSchedule(
                                "5:30 PM",
                                "6:00 PM",
                                day,
                              )
                                ? getDutyColor("5:30 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "5:30 PM",
                              "6:00 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "5:30 PM",
                                  "6:00 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "5:30 PM",
                                "6:00 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "5:30 PM",
                                  "6:00 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("5:30 PM", day)}
                          </div>
                        </div>
                      </td>
                    ),
                  )}
                </tr>

                <tr className="flex w-full">
                  <td className="m-0 p-0 min-w-[13.1rem]">
                    <div className="h-[2.5rem] bg-[#eaeaea] border border-black border-t-0 text-[14px] flex items-center justify-center">
                      06:00 PM - 07:00 PM
                    </div>
                  </td>

                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                    (day, i) => (
                      <td
                        key={day}
                        className={`m-0 p-0 ${day === "WED"
                          ? "min-w-[7rem]"
                          : day === "THU"
                            ? "min-w-[6.9rem]"
                            : "min-w-[6.8rem]"
                          }`}
                      >
                        <div className="h-[2.5rem] p-0 m-0">
                          <div
                            style={{
                              backgroundColor: isTimeInSchedule(
                                "6:00 PM",
                                "6:30 PM",
                                day,
                              )
                                ? getDutyColor("6:00 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-t-0 border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "6:00 PM",
                              "6:30 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "6:00 PM",
                                  "6:30 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "6:00 PM",
                                "6:30 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "6:00 PM",
                                  "6:30 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("6:00 PM", day)}
                          </div>

                          <div
                            style={{
                              borderTop: "none",
                              backgroundColor: isTimeInSchedule(
                                "6:30 PM",
                                "7:00 PM",
                                day,
                              )
                                ? getDutyColor("6:30 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "6:30 PM",
                              "7:00 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "6:30 PM",
                                  "7:00 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "6:30 PM",
                                "7:00 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "6:30 PM",
                                  "7:00 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("6:30 PM", day)}
                          </div>
                        </div>
                      </td>
                    ),
                  )}
                </tr>

                <tr className="flex w-full">
                  <td className="m-0 p-0 min-w-[13.1rem]">
                    <div className="h-[2.5rem] bg-[#eaeaea] border border-black border-t-0 text-[14px] flex items-center justify-center">
                      07:00 PM - 08:00 PM
                    </div>
                  </td>

                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                    (day, i) => (
                      <td
                        key={day}
                        className={`m-0 p-0 ${day === "WED"
                          ? "min-w-[7rem]"
                          : day === "THU"
                            ? "min-w-[6.9rem]"
                            : "min-w-[6.8rem]"
                          }`}
                      >
                        <div className="h-[2.5rem] p-0 m-0">
                          <div
                            style={{
                              backgroundColor: isTimeInSchedule(
                                "7:00 PM",
                                "7:30 PM",
                                day,
                              )
                                ? getDutyColor("7:00 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-t-0 border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "7:00 PM",
                              "7:30 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "7:00 PM",
                                  "7:30 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "7:00 PM",
                                "7:30 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "7:00 PM",
                                  "7:30 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("7:00 PM", day)}
                          </div>

                          <div
                            style={{
                              borderTop: "none",
                              backgroundColor: isTimeInSchedule(
                                "7:30 PM",
                                "8:00 PM",
                                day,
                              )
                                ? getDutyColor("7:30 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-l-0 flex items-center justify-center
                                            ${isTimeInSchedule(
                              "7:30 PM",
                              "8:00 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "7:30 PM",
                                  "8:00 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                            ${isTimeInSchedule(
                                "7:30 PM",
                                "8:00 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "7:30 PM",
                                  "8:00 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                            `}
                          >
                            {getCenterText("7:30 PM", day)}
                          </div>
                        </div>
                      </td>
                    ),
                  )}
                </tr>

                <tr className="flex w-full">
                  <td className="m-0 p-0 min-w-[13.1rem]">
                    <div className="h-[2.5rem] border bg-[#eaeaea] border-black border-t-0 text-[14px] flex items-center justify-center">
                      08:00 PM - 09:00 PM
                    </div>
                  </td>

                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(
                    (day, i) => (
                      <td
                        key={day}
                        className={`m-0 p-0 ${day === "WED"
                          ? "min-w-[7rem]"
                          : day === "THU"
                            ? "min-w-[6.9rem]"
                            : "min-w-[6.8rem]"
                          }`}
                      >
                        <div className="h-[2.5rem] p-0 m-0">
                          <div
                            style={{
                              backgroundColor: isTimeInSchedule(
                                "8:00 PM",
                                "8:30 PM",
                                day,
                              )
                                ? getDutyColor("8:00 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-t-0 border-l-0 flex items-center justify-center
                                                ${isTimeInSchedule(
                              "8:00 PM",
                              "8:30 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "8:00 PM",
                                  "8:30 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                                ${isTimeInSchedule(
                                "8:00 PM",
                                "8:30 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "8:00 PM",
                                  "8:30 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                                `}
                          >
                            {getCenterText("8:00 PM", day)}
                          </div>

                          <div
                            style={{
                              borderTop: "none",
                              backgroundColor: isTimeInSchedule(
                                "8:30 PM",
                                "9:00 PM",
                                day,
                              )
                                ? getDutyColor("8:30 PM", day) ||
                                "rgb(253 224 71)"
                                : undefined,
                            }}
                            className={`h-[1.25rem] border border-black border-l-0 flex items-center justify-center
                                                ${isTimeInSchedule(
                              "8:30 PM",
                              "9:00 PM",
                              day,
                            ) &&
                                hasAdjacentSchedule(
                                  "8:30 PM",
                                  "9:00 PM",
                                  day,
                                  "top",
                                ) === "same"
                                ? "border-t-0"
                                : ""
                              }
                                                ${isTimeInSchedule(
                                "8:30 PM",
                                "9:00 PM",
                                day,
                              ) &&
                                hasAdjacentSchedule(
                                  "8:30 PM",
                                  "9:00 PM",
                                  day,
                                  "bottom",
                                ) === "same"
                                ? "border-b-0"
                                : ""
                              }
                                                `}
                          >
                            {getCenterText("8:30 PM", day)}
                          </div>
                        </div>
                      </td>
                    ),
                  )}
                </tr>
              </tbody>
            </table>

            <div className="mt-[1rem]">
              <div>
                <div className="max-w-[61rem]">
                  <div className="bg-black text-white text-[12px] font-[500] tracking-[0.5px] h-[1.8rem] min-w-[61rem] text-center">
                    SUMMARY
                  </div>
                </div>
              </div>
              <div className="flex">
                <div className="border border-black max-w-[37rem]">
                  <div className="flex flex-col">
                    <div className="mmin-w-[37rem] text-center text-[11px] bg-[#c0c0c0] font-[500]">
                      DAILY WORKLOAD DISTRIBUTION
                    </div>
                    <div className="flex">
                      <div className={`border border border-black border-l-0 bg-[#eaeaea] border-b-0 text-[11px] text-center flex items-center justify-center ${WORKLOAD_LABEL_WIDTH} ${WORKLOAD_HEIGHT_DAY_HEADER}`}>
                        DAY
                      </div>
                      <div className={`border border border-black border-l-0 bg-[#eaeaea] border-b-0 text-[11px] px-[0.7rem] w-[3.2rem] shrink-0 flex-none flex items-center justify-center ${WORKLOAD_HEIGHT_DAY_HEADER}`}>
                        MON
                      </div>
                      <div className={`border border border-black border-l-0 bg-[#eaeaea] border-b-0 text-[11px] px-[0.9rem] w-[3.1rem] shrink-0 flex-none flex items-center justify-center ${WORKLOAD_HEIGHT_DAY_HEADER}`}>
                        TUE
                      </div>
                      <div className={`border border border-black border-l-0 bg-[#eaeaea] border-b-0 text-[11px] px-[0.9rem] w-[3.3rem] shrink-0 flex-none flex items-center justify-center ${WORKLOAD_HEIGHT_DAY_HEADER}`}>
                        WED
                      </div>
                      <div className={`border border border-black border-l-0 bg-[#eaeaea] border-b-0 text-[11px] px-[0.9rem] w-[3.08rem] shrink-0 flex-none flex items-center justify-center ${WORKLOAD_HEIGHT_DAY_HEADER}`}>
                        THU
                      </div>
                      <div className={`border border border-black border-l-0 bg-[#eaeaea] border-b-0 text-[11px] px-[0.9rem] w-[2.8rem] shrink-0 flex-none flex items-center justify-center ${WORKLOAD_HEIGHT_DAY_HEADER}`}>
                        FRI
                      </div>
                      <div className={`border border border-black border-l-0 bg-[#eaeaea] border-b-0 text-[11px] px-[0.9rem] w-[3.20rem] shrink-0 flex-none flex items-center justify-center ${WORKLOAD_HEIGHT_DAY_HEADER}`}>
                        SAT
                      </div>
                      <div className={`border border border-black border-l-0 bg-[#eaeaea] border-b-0 text-[11px] px-[0.9rem] w-[3.3rem] shrink-0 flex-none flex items-center justify-center ${WORKLOAD_HEIGHT_DAY_HEADER}`}>
                        SUN
                      </div>
                      <div className={`border border border-black border-l-0 bg-[#eaeaea] border-b-0 border-r-0 text-[11px] px-[0.9rem] w-[3.9rem] shrink-0 flex-none flex items-center justify-center ${WORKLOAD_HEIGHT_DAY_HEADER}`}>
                        TOTAL
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex">
                      <div
                        className={`border border border-black border-l-0 border-b-0 text-[10px] flex items-center justify-center px-1 ${WORKLOAD_LABEL_WIDTH} ${WORKLOAD_HEIGHT_REGULAR}`}
                        style={{ backgroundColor: workloadColorMap.regular }}
                      >
                        REGULAR TEACHING LOAD
                      </div>
                      {renderWorkloadCells("regular", {
                        rowHeight: WORKLOAD_HEIGHT_REGULAR,
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex">
                      <div
                        className={`border border border-black border-l-0 border-b-0 text-[10px] flex items-center justify-center px-1 ${WORKLOAD_LABEL_WIDTH} ${WORKLOAD_HEIGHT_PAIR}`}
                        style={{ backgroundColor: workloadColorMap.overload }}
                      >
                        OVERLOAD (OL)
                      </div>
                      {renderWorkloadCells("overload")}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex">
                      <div
                        className={`border border border-black border-l-0 border-b-0 text-[10px] flex items-center justify-center px-1 ${WORKLOAD_LABEL_WIDTH} ${WORKLOAD_HEIGHT_PAIR}`}
                        style={{ backgroundColor: workloadColorMap.emergencyLoad }}
                      >
                        EMERGENCY LOAD (EL)
                      </div>
                      {renderWorkloadCells("emergencyLoad")}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex">
                      <div
                        className={`border border border-black border-l-0 border-b-0 text-[9.5px] flex items-center justify-center px-1 ${WORKLOAD_LABEL_WIDTH} ${WORKLOAD_HEIGHT_PAIR}`}
                        style={{ backgroundColor: workloadColorMap.temporarySubstitution }}
                      >
                        TEMPORARY SUBSTITUTION (TS)
                      </div>
                      {renderWorkloadCells("temporarySubstitution")}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex">
                      <div
                        className={`border border border-black border-l-0 border-b-0 text-[10px] flex items-center justify-center px-1 ${WORKLOAD_LABEL_WIDTH} ${WORKLOAD_HEIGHT_PAIR}`}
                        style={{ backgroundColor: workloadColorMap.designation }}
                      >
                        DESIGNATION
                      </div>
                      {renderWorkloadCells("designation")}
                    </div>
                  </div>
                  <div className="flex">
                    <div
                      className={`border border-black border-l-0 border-b-0 text-[10px] text-center flex items-center justify-center px-[0.4rem] ${WORKLOAD_OTHER_GROUP_WIDTH} ${WORKLOAD_HEIGHT_OTHER_FUNCTIONS_GROUP}`}
                      style={{ backgroundColor: workloadColorMap.research }}
                    >
                      OTHER <br /> FUNCTIONS
                    </div>
                    <div className="shrink-0 flex-none">
                      <div className="flex">
                        <div
                          className={`border border border-black border-l-0 border-b-0 text-[9px] text-center font-[600] flex items-center justify-center ${WORKLOAD_OTHER_SUBLABEL_WIDTH} ${WORKLOAD_HEIGHT_OTHER_FUNCTIONS}`}
                          style={{ backgroundColor: workloadColorMap.research }}
                        >
                          <i>Research</i>
                        </div>
                        {renderWorkloadCells("research")}
                      </div>
                      <div className="flex">
                        <div
                          className={`border border border-black border-l-0 border-b-0 text-[9px] text-center font-[600] flex items-center justify-center ${WORKLOAD_OTHER_SUBLABEL_WIDTH} ${WORKLOAD_HEIGHT_OTHER_FUNCTIONS}`}
                          style={{ backgroundColor: workloadColorMap.extension }}
                        >
                          <i>Extension</i>
                        </div>
                        {renderWorkloadCells("extension")}
                      </div>
                      <div className="flex">
                        <div
                          className={`border border border-black border-l-0 border-b-0 text-[9px] text-center font-[600] flex items-center justify-center ${WORKLOAD_OTHER_SUBLABEL_WIDTH} ${WORKLOAD_HEIGHT_OTHER_FUNCTIONS}`}
                          style={{ backgroundColor: workloadColorMap.production }}
                        >
                          <i>Production</i>
                        </div>
                        {renderWorkloadCells("production")}
                      </div>
                      <div className="flex">
                        <div
                          className={`border border border-black border-l-0 border-b-0 text-[9px] text-center font-[600] flex items-center justify-center ${WORKLOAD_OTHER_SUBLABEL_WIDTH} ${WORKLOAD_HEIGHT_OTHER_FUNCTIONS}`}
                          style={{ backgroundColor: workloadColorMap.accreditation }}
                        >
                          <i>Accreditation</i>
                        </div>
                        {renderWorkloadCells("accreditation")}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex">
                      <div
                        className={`border border border-black border-l-0 border-b-0 text-[9px] flex items-center justify-center font-[600] ${WORKLOAD_LABEL_WIDTH} ${WORKLOAD_HEIGHT_PAIR}`}
                        style={{ backgroundColor: workloadColorMap.consultation }}
                      >
                        <i>Consultation</i>
                      </div>
                      {renderWorkloadCells("consultation")}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex">
                      <div
                        className={`border border border-black border-l-0 border-b-0 text-[8px] flex items-center justify-center font-[400] px-1 text-center ${WORKLOAD_LABEL_WIDTH} ${WORKLOAD_HEIGHT_PAIR}`}
                        style={{ backgroundColor: workloadColorMap.lessonPreparation }}
                      >
                        <i>Lesson Preparation ( Off-Campus )</i>
                      </div>
                      {renderWorkloadCells("lessonPreparation")}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex">
                      <div className={`border border border-black border-l-0 text-[8px] flex items-center justify-center font-[400] ${WORKLOAD_LABEL_WIDTH} ${WORKLOAD_HEIGHT_TOTAL}`}>
                        <i className="font-bold">Total</i>
                      </div>
                      {renderWorkloadCells("grandTotal", {
                        cellStyle: { borderBottom: "1px solid #000" },
                        rowHeight: WORKLOAD_HEIGHT_TOTAL,
                      })}
                    </div>
                  </div>
                </div>
                <div className="border border-black border-l-0 max-w-[24rem]">
                  <div>
                    <div className="min-w-[23rem] text-center text-[11px] font-[500] bg-[#c0c0c0]">
                      EXTRA TEACHING LOADS FOR HONORARIUM
                    </div>
                  </div>
                  <div className="flex h-[2.15rem] max-h-[2.15rem] overflow-hidden">
                    <div className="border border-black border-l-0 bg-[#eaeaea] h-[2.15rem] max-h-[2.15rem] overflow-hidden flex items-center justify-center w-[9rem]">
                      <span className="text-[10px] tracking-[-1px]">
                        Teaching Assignment
                      </span>
                    </div>
                    <div className="border border-black border-l-0 bg-[#eaeaea] h-[2.15rem] max-h-[2.15rem] overflow-hidden flex items-center justify-center w-[2rem]">
                      <span className="text-[10px] tracking-[-1px]">Units</span>
                    </div>
                    <div className="border border-black border-l-0 bg-[#eaeaea] h-[2.15rem] max-h-[2.15rem] overflow-hidden flex items-center justify-center w-[3.5rem]">
                      <span className="text-[10px] tracking-[-1px]">
                        Load Type
                      </span>
                    </div>
                    <div className="border border-black border-l-0 bg-[#eaeaea] h-[2.15rem] max-h-[2.15rem] overflow-hidden flex items-center justify-center w-[6rem]">
                      <span className="text-[10px] tracking-[-1px]">Class</span>
                    </div>
                    <div className="border border-black border-l-0 bg-[#eaeaea] h-[2.15rem] max-h-[2.15rem] overflow-hidden flex items-center border-r-0 justify-center w-[3.5rem]">
                      <span className="text-[10px] tracking-[-1px]">
                        Class Type
                      </span>
                    </div>
                  </div>
                  {renderExtraTeachingLoadRows(honorariumSchedules, "Honorarium")}
                </div>
              </div>
              <div>
                <div>
                  <div className="bg-black min-h-[1.2rem] max-w-[61rem] line"></div>
                </div>
              </div>
              <div className="flex">
                <div className="border border-black">
                  <div className="flex flex-col">
                    <div className="w-[37rem] text-center text-[11px] font-[500] bg-[#c0c0c0]">
                      FTE CALCULATOR
                    </div>
                    <div className="flex min-h-[1.05rem]">
                      <div className="border border border-black border-l-0 border-b-0 min-w-[19.5rem] text-[10px] text-center bg-[#eaeaea]">
                        Regular Teaching Assignments
                      </div>
                      <div className="border border border-black border-l-0 border-b-0 text-[10px] w-[3.8rem] bg-[#eaeaea] text-center">
                        Units
                      </div>
                      <div className="border border border-black border-l-0 border-b-0 text-[10px] w-[3.8rem] bg-[#eaeaea] text-center">
                        Class
                      </div>
                      <div className="border border border-black border-l-0 border-b-0 text-[10px] w-[3.8rem] bg-[#eaeaea] text-center">
                        Class Type
                      </div>
                      <div className="border border border-black border-l-0 bg-[#eaeaea] border-b-0 text-[8px] tracking-[-1px] w-[3rem] flex items-center">
                        No. of Students
                      </div>
                      <div className="border border border-black border-l-0 bg-[#eaeaea] border-b-0 text-[10px] border-r-0 text-center w-[3.1rem]">
                        FTE
                      </div>
                    </div>
                  </div>
                  {renderFteCalculatorRows()}
                  <div className="flex flex-col">
                    <div className="flex">
                      <div className="border border border-black border-l-0 border-b-0 border-r-0 min-w-[19.5rem] text-[10px] h-[1rem] text-center"></div>
                      <div className="border border border-black border-l-0 border-b-0 text-[10px] min-w-[14.4rem] h-[1rem] font-bold text-center bg-[#c0c0c0]">
                        Total FTE
                      </div>
                      <div className="border border border-black border-l-0 border-b-0 text-[10px] border-r-0 text-center h-[1rem] w-[3.1rem]">
                        {formatFteHours(totalFteHours)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border border-black border-l-0 max-w-[23.9rem]">
                  <div>
                    <div className="min-w-[23rem] text-center text-[11px] font-[500] bg-[#c0c0c0]">
                      EXTRA TEACHING LOADS FOR SERVICE CREDIT
                    </div>
                  </div>
                  <div className="flex h-[2.15rem] max-h-[2.15rem] overflow-hidden">
                    <div className="border border-black bg-[#eaeaea] border-l-0 h-[2.15rem] max-h-[2.15rem] overflow-hidden flex items-center justify-center w-[9rem]">
                      <span className="text-[10px] tracking-[-1px]">
                        Teaching Assignment
                      </span>
                    </div>
                    <div className="border border-black bg-[#eaeaea] border-l-0 h-[2.15rem] max-h-[2.15rem] overflow-hidden flex items-center justify-center w-[2rem]">
                      <span className="text-[10px] tracking-[-1px]">Units</span>
                    </div>
                    <div className="border border-black bg-[#eaeaea] border-l-0 h-[2.15rem] max-h-[2.15rem] overflow-hidden flex items-center justify-center w-[3.5rem]">
                      <span className="text-[10px] tracking-[-1px]">
                        Load Type
                      </span>
                    </div>
                    <div className="border border-black bg-[#eaeaea] border-l-0 h-[2.15rem] max-h-[2.15rem] overflow-hidden flex items-center justify-center w-[6rem]">
                      <span className="text-[10px] tracking-[-1px]">Class</span>
                    </div>
                    <div className="border border-black bg-[#eaeaea] border-l-0 h-[2.15rem] max-h-[2.15rem] overflow-hidden flex items-center border-r-0 justify-center w-[3.5rem]">
                      <span className="text-[10px] tracking-[-1px]">
                        Class Type
                      </span>
                    </div>
                  </div>
                  {renderExtraTeachingLoadRows(serviceCreditSchedules, "Service Credit")}
                </div>
              </div>
              <div>
                <div>
                  <div className="bg-black min-h-[1.2rem] max-w-[61rem] line"></div>
                </div>
              </div>
            </div>

            <div className="mt-[1rem]">
              <div className="flex">
                <div className="border border-black flex flex-col bg-[#eaeaea]">
                  <div className="w-[27rem] text-[11px] p-[0.2rem] font-[600] conforme-cont">
                    CONFORME:
                  </div>
                  <div className="mt-[0.6rem]"></div>
                  <div className="text-[10.5px] tracking-[-1px] font-[600] conforme-title">
                    I fully understand the extent of my roles and
                    responsibilities in relationto my assignment as a <br />
                    faculty member and therefore COMMIT myself to:
                  </div>
                  <div className="text-[10.5px] tracking-[-1px] font-[600] conforme">
                    (A) be punctual and be available in the institute during
                    official working hours; <br />
                    (B) conduct assigned classes and other functions at the
                    scheduled times; <br />
                    (C) evaluate and record students performance in an objective
                    and fair manner; and, <br />
                    (D) submit all required reports on time.
                  </div>
                  <div className="mt-[0.6rem]"></div>
                  <div className="flex p-0 m-0">
                    <div className="bg-black text-white p-[0.2rem] flex items-center justify-center w-[13.5rem]">
                      <span className="text-[14px] font-[500]">
                        EARIST-QSF-INST-015
                      </span>
                    </div>
                    <div className="flex flex-col items-center w-[13.5rem]">
                      <span className="text-[11px] font-[500] underline">
                        Mr. {[profData.fname, profData.mname, profData.lname]
                          .filter(Boolean)
                          .join(" ")
                          .toUpperCase()}
                      </span>
                      <span className="mt-[-2px]  text-[10px]">
                        Faculty Member
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex signature-container">
                    <div className="w-[13.5rem] h-[6rem] ">
                      <div>
                        <i className="text-[11.5px] font-[500] ml-[3px]">
                          Prepared By:
                        </i>
                      </div>
                      <div className="flex flex-col mt-[2rem] w-full items-center">
                        <span className="text-[12px] ">
                          Prof. HAZEL F. ANUNCIO
                        </span>
                        <br />
                        <span className="text-[11px] mt-[-1.7rem] font-[500] tracking-[-1px]">
                          Information Technology Department Head
                        </span>
                      </div>
                    </div>
                    <div className="w-[19.5rem] h-[6rem] signature-content">
                      <div>
                        <i className="text-[11.5px] font-[500] ml-[3px]">
                          Certified Corrected By:
                        </i>
                      </div>
                      <div className="flex flex-col mt-[2rem] w-full items-center">
                        <span className="text-[12px] ">
                          DR. JESUS PANGUIGAN
                        </span>
                        <br />
                        <span className="text-[11px] mt-[-1.7rem] font-[500] tracking-[-1px]">
                          Dean, CCS
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex signature-container">
                    <div className="w-[13.5rem] h-[6rem] ">
                      <div>
                        <i className="text-[11.5px] font-[500] ml-[3px]">
                          Recommending Approval:
                        </i>
                      </div>
                      <div className="flex flex-col mt-[2rem] w-full items-center">
                        <span className="text-[12px] ">
                          DR. ERIC C. MENDOZA
                        </span>
                        <br />
                        <span className="text-[11px] mt-[-1.7rem] font-[500] tracking-[-1px]">
                          VPAA
                        </span>
                      </div>
                    </div>
                    <div className="w-[19.5rem] h-[6rem] signature-content">
                      <div>
                        <i className="text-[11.5px] font-[500] ml-[3px]">
                          Approved:
                        </i>
                      </div>
                      <div className="flex flex-col mt-[2rem] w-full items-center">
                        <span className="text-[12px] ">
                          Engr. ROGELIO T. MAMARADLO, Edb
                        </span>
                        <br />
                        <span className="text-[11px] mt-[-1.7rem] font-[500] tracking-[-1px]">
                          President
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Box>
      </Box>
    </Box>
  );
};

export default FacultyWorkload;
