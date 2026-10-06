import React, { createContext, useState, useEffect, useMemo, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { createTheme, ThemeProvider, CssBaseline, AppBar, Toolbar, Box, Typography, IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import axios from "axios";
import "./App.css";
import Clock from "./components/Clock";
import InactivityLogoutModal from "./components/InactivityLogoutModal";

// COMPONENTS FOLDER
import ProtectedRoute, { isTokenValid } from "./components/ProtectedRoute";

import API_BASE_URL from "./apiConfig";
import { refreshRegistrarCurriculumId } from "./utils/registrarCurriculumRestriction";
import { getTokenExpiryMs, logout, registerLogoutHandler } from "./utils/authSession";

// ============================================================
// STATIC (NON-LAZY) IMPORTS
// ============================================================

// ACCOUNT MANAGEMENT
import StudentAccounts from "./account_management/StudentAccounts";

// ADMISSION
import ApplicationProcessAdmin from "./admission/ApplicationProcessAdmin";

// ENROLLMENT MANAGEMENT
import CollegeCourseTaggingSummer from "./enrollment_management/CollegeCourseTaggingSummer";
import CollegeStudentList from "./enrollment_management/CollegeStudentList";
import CollegeStudentGradeFile from "./enrollment_management/CollegeStudentGradeFile";

// REGISTRAR
import RegistrarStudentGradeFile from "./registrar/RegistrarStudentGradeFile";

// SYSTEM MANAGEMENT
import GradeConversionAdmin from "./system_management/GradeConversionAdmin";
import HonorsReport from "./system_management/HonorsReport";

export const SettingsContext = createContext(null);

const SETTINGS_FALLBACKS = { title_color: "", subtitle_color: "", border_color: "", header_color: "", main_button_color: "", sub_button_color: "", stepper_color: "", footer_color: "", footer_text: "", company_name: "", short_term: "", campus_address: "", bg_image: "", logo_url: "", academic_year: "", branches: [] };

const getSettingValue = (data, key, fallbackKey = key) => {
  const value = data?.[key];
  return value === undefined || value === null || value === "" ? SETTINGS_FALLBACKS[fallbackKey] : value;
};

const getAssetUrl = (path) => {
  if (!path) return null;
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

const parseSettingsBranches = (branches) => {
  if (!branches) return [];
  if (Array.isArray(branches)) return branches;
  try {
    const parsed = typeof branches === "string" ? JSON.parse(branches) : branches;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeSettings = (data = {}) => {
  const source = data || {};
  const branches = parseSettingsBranches(source.branches);
  const campusAddress = getSettingValue(source, "campus_address", "campus_address") || getSettingValue(source, "address", "campus_address");
  const logoUrl = getAssetUrl(source.logo_url);
  const backgroundUrl = getAssetUrl(source.bg_image);
  const backgroundImage = backgroundUrl ? `url(${backgroundUrl})` : null;

  return {
    ...source,
    branches,
    campus_address: campusAddress,
    address: source.address ?? campusAddress,
    colors: { title: getSettingValue(source, "title_color"), subtitle: getSettingValue(source, "subtitle_color"), border: getSettingValue(source, "border_color"), header: getSettingValue(source, "header_color"), mainButton: getSettingValue(source, "main_button_color"), subButton: getSettingValue(source, "sub_button_color"), stepper: getSettingValue(source, "stepper_color"), footer: getSettingValue(source, "footer_color") },
    branding: { companyName: getSettingValue(source, "company_name"), shortTerm: getSettingValue(source, "short_term"), campusAddress, logoUrl, footerText: getSettingValue(source, "footer_text") },
    assets: { logoUrl, backgroundImage },
    academic: { academicYear: getSettingValue(source, "academic_year") },
  };
};

const hasRequiredSettings = (settings) => Boolean(settings?.colors?.header && settings?.colors?.mainButton && settings?.branding?.companyName);

// ============================================================
// LAZY-LOADED IMPORTS (grouped by module/folder)
// ============================================================

// ------------------------------------------------------------
// ACCOUNT MANAGEMENT
// ------------------------------------------------------------
const UploadApplicants = lazy(() => import("./account_management/UploadApplicants"));
const ApplicantProcessSuperAdmin = lazy(() => import("./account_management/ApplicationProcessSuperAdmin"));
const Archived = lazy(() => import("./account_management/ArchivedModule"));
const MigrationDataPanel = lazy(() => import("./account_management/MigrationDataPanel"));
const PageManagement = lazy(() => import("./account_management/PageManagement"));
const RegisterProf = lazy(() => import("./account_management/RegisterProf"));
const RegisterAdministrators = lazy(() => import("./account_management/RegisterAdministrators"));
const RegisterStudent = lazy(() => import("./account_management/RegisterStudent"));
const RegistrarResetPassword = lazy(() => import("./account_management/RegistrarResetPassword"));
const ApplicantAdminPersonalInformation = lazy(() => import("./account_management/ApplicantAdminPersonalInformation"));
const ApplicantAdminFamilyBackground = lazy(() => import("./account_management/ApplicantAdminFamilyBackground"));
const ApplicantAdminEducationalAttainment = lazy(() => import("./account_management/ApplicantAdminEducationalAttainment"));
const ApplicantAdminHealthMedicalRecords = lazy(() => import("./account_management/ApplicantAdminHealthMedicalRecords"));
const ApplicantAdminOtherInformation = lazy(() => import("./account_management/ApplicantAdminOtherInformation"));
const SuperAdminApplicantResetPassword = lazy(() => import("./account_management/SuperAdminApplicantResetPassword"));
const SuperAdminStudentResetPassword = lazy(() => import("./account_management/SuperAdminStudentResetPassword"));
const SuperAdminFacultyResetPassword = lazy(() => import("./account_management/SuperAdminFacultyResetPassword"));
const SuperAdminRegistrarPassword = lazy(() => import("./account_management/SuperAdminRegistrarResetPassword"));
const ApplicantOnlineRequirementsAdmin = lazy(() => import("./account_management/ApplicantOnlineRequirementsAdmin"));
const StudentOnlineRequirementsAdmin = lazy(() => import("./account_management/StudentOnlineRequirementsAdmin"));
const StudentAdminPersonalInformation = lazy(() => import("./account_management/StudentAdminPersonalInformation"));
const StudentAdminFamilyBackground = lazy(() => import("./account_management/StudentAdminFamilyBackground"));
const StudentAdminEducationalAttainment = lazy(() => import("./account_management/StudentAdminEducationalAttainment"));
const StudentAdminHealthMedicalRecords = lazy(() => import("./account_management/StudentAdminHealthMedicalRecords"));
const StudentAdminOtherInformation = lazy(() => import("./account_management/StudentAdminOtherInformation"));
const StudentEditPermissions1 = lazy(() => import("./account_management/StudentEditPermissions1"));
const StudentEditPermissions2 = lazy(() => import("./account_management/StudentEditPermissions2"));
const StudentEditPermissions3 = lazy(() => import("./account_management/StudentEditPermissions3"));
const StudentEditPermissions4 = lazy(() => import("./account_management/StudentEditPermissions4"));
const StudentEditPermissions5 = lazy(() => import("./account_management/StudentEditPermissions5"));
const UserPageAccess = lazy(() => import("./account_management/UserPageAccess"));

// ------------------------------------------------------------
// ADMISSION
// ------------------------------------------------------------
const ExamAttendanceScanner = lazy(() => import("./admission/ExamAttendanceScanner"));
const AdmissionFormProcess = lazy(() => import("./admission/AdmissionFormProcess"));
const EmptyAdmissionFormProcess = lazy(() => import("./admission/EmptyAdmissionFormProcess"));
const AdmissionPersonalInformation = lazy(() => import("./admission/AdmissionPersonalInformation"));
const AdmissionFamilyBackground = lazy(() => import("./admission/AdmissionFamilyBackground"));
const AdmissionEducationalAttainment = lazy(() => import("./admission/AdmissionEducationalAttainment"));
const AdmissionHealthMedicalRecords = lazy(() => import("./admission/AdmissionHealthMedicalRecords"));
const AdmissionOtherInformation = lazy(() => import("./admission/AdmissionOtherInformation"));
const AdminECATApplicationForm = lazy(() => import("./admission/AdminECATApplicationForm"));
const AdminOfficeOfTheRegistrar = lazy(() => import("./admission/AdminOfficeOfTheRegistrar"));
const AdminPersonalDataForm = lazy(() => import("./admission/AdminPersonalDataForm"));
const AdmissionScheduleTile = lazy(() => import("./admission/AdmissionScheduleTile"));
const AdmissionAnnouncement = lazy(() => import("./admission/AdmissionAnnouncement"));
const ExamSubjectManagement = lazy(() => import("./admission/ExamSubjectManagement"));
const AdmissionApplicantList = lazy(() => import("./admission/AdmissionApplicantList"));
const ApplicantEntranceExamScore = lazy(() => import("./admission/ApplicantEntranceExamScore"));
const EntranceExamRoomAssignment = lazy(() => import("./admission/EntranceExamRoomAssignment"));
const EntranceExamScheduleManagement = lazy(() => import("./admission/EntranceExamScheduleManagement"));
const EvaluatorApplicantList = lazy(() => import("./admission/EvaluatorApplicantList"));
const EvaluatorScheduleTile = lazy(() => import("./admission/EvaluatorScheduleTile"));
const ProctorApplicantList = lazy(() => import("./admission/ProctorApplicantList"));
const AdmissionPrintableForms = lazy(() => import("./admission/AdmissionPrintableForms"));
const AdmissionOnlineRequirements = lazy(() => import("./admission/AdmissionOnlineRequirements"));
const AdmissionContactManagement = lazy(() => import("./admission/AdmissionContactManagement"));
const VerifyDocumentScheduleManagement = lazy(() => import("./admission/VerifyDocumentScheduleManagement"));
const VerifyDocumentRoomAssignment = lazy(() => import("./admission/VerifyDocumentRoomAssignment"));

// ------------------------------------------------------------
// APPLICANT
// ------------------------------------------------------------
const ApplicantServicesSurvey = lazy(() => import("./applicant/ApplicantServicesSurvey"));
const ApplicantResetPassword = lazy(() => import("./applicant/ApplicantResetPassword"));
const ApplicantPersonalInformation = lazy(() => import("./applicant/ApplicantPersonalInformation"));
const ApplicantPersonalInformationMobile = lazy(() => import("./applicant/ApplicantPersonalInformationMobile"));
const ApplicantFamilyBackground = lazy(() => import("./applicant/ApplicantFamilyBackground"));
const ApplicantFamilyBackgroundMobile = lazy(() => import("./applicant/ApplicantFamilyBackgroundMobile"));
const ApplicantEducationalAttainment = lazy(() => import("./applicant/ApplicantEducationalAttainment"));
const ApplicantEducationalAttainmentMobile = lazy(() => import("./applicant/ApplicantEducationalAttainmentMobile"));
const ApplicantHealthMedicalRecords = lazy(() => import("./applicant/ApplicantHealthMedicalRecords"));
const ApplicantHealthMedicalRecordsMobile = lazy(() => import("./applicant/ApplicantHealthMedicalRecordsMobile"));
const ApplicantOtherInformation = lazy(() => import("./applicant/ApplicantOtherInformation"));
const ApplicantOtherInformationMobile = lazy(() => import("./applicant/ApplicantOtherInformationMobile"));
const ECATApplicationForm = lazy(() => import("./applicant/ECATApplicationForm"));
const ExamPermit = lazy(() => import("./applicant/ExamPermit"));
const OfficeOfTheRegistrar = lazy(() => import("./applicant/OfficeOfTheRegistrar"));
const PersonalDataForm = lazy(() => import("./applicant/PersonalDataForm"));
const ApplicantOnlineRequirements = lazy(() => import("./applicant/ApplicantOnlineRequirements"));

// ------------------------------------------------------------
// COMPONENTS
// ------------------------------------------------------------
const Login = lazy(() => import("./components/Login"));
const AnnouncementSlider = lazy(() => import("./components/AnnouncementSlider"));
const RegistrarExamPermit = lazy(() => import("./components/ApplicantExamPermit"));
const ApplicantForgotPassword = lazy(() => import("./components/ApplicantForgotPassword"));
const ApplicantProfile = lazy(() => import("./components/ApplicantProfile"));
const LoadingOverlay = lazy(() => import("./components/LoadingOverlay"));
const LoginEnrollment = lazy(() => import("./components/LoginEnrollment"));
const Register = lazy(() => import("./components/Register"));
const RegistrarForgotPassword = lazy(() => import("./components/RegistrarForgotPassword"));
const TorQrInformation = lazy(() => import("./components/TorQrInformation"));
const StudentQrInformation = lazy(() => import("./components/StudentQrInformation"));
const ExamAttendanceQrInformation = lazy(() => import("./components/ExamAttendanceQrInformation"));
const SideBar = lazy(() => import("./components/Sidebar"));
const Unauthorized = lazy(() => import("./components/Unauthorized"));

// ------------------------------------------------------------
// COURSE MANAGEMENT
// ------------------------------------------------------------
const SubjectManagement = lazy(() => import("./course_management/SubjectManagement"));
const AcademicSubjectManagement = lazy(() => import("./course_management/AcademicSubjectManagement"));
const CurriculumManagement = lazy(() => import("./course_management/CurriculumManagement"));
const NSTPTagging = lazy(() => import("./course_management/NSTPTagging"));
const CurriculumRequirementsManagement = lazy(() => import("./course_management/CurriculumRequirementsManagement"));
const ProgramManagement = lazy(() => import("./course_management/ProgramManagement"));
const CurriculumFeeManagement = lazy(() => import("./course_management/CurriculumFeeManagement"));
const ProgramTaggingManagement = lazy(() => import("./course_management/ProgramTaggingManagement"));
const CurriculumUnitManagement = lazy(() => import("./course_management/CurriculumUnitManagement"));

// ------------------------------------------------------------
// DEPARTMENT MANAGEMENT
// ------------------------------------------------------------
const DepartmentCurriculumPanel = lazy(() => import("./department_management/DepartmentCurriculumPanel"));
const DepartmentSection = lazy(() => import("./department_management/DepartmentSection"));
const DepartmentSectionTagging = lazy(() => import("./department_management/DepartmentSectionTagging"));
const DepartmentRegistration = lazy(() => import("./department_management/DprtmntRegistration"));
const DepartmentRoom = lazy(() => import("./department_management/DprtmntRoom"));
const SlotMonitoring = lazy(() => import("./department_management/SlotMonitoring"));
const SectionSlotManagement = lazy(() => import("./department_management/SectionSlotManagement"));
const CollegeScheduleChecker = lazy(() => import("./department_management/CollegeScheduleChecker"));
const ScheduleChecker = lazy(() => import("./department_management/ScheduleChecker"));
const WorkloadManagement = lazy(() => import("./department_management/WorkloadManagement"));

// ------------------------------------------------------------
// ENROLLMENT MANAGEMENT
// ------------------------------------------------------------
const ApplicantListCollege = lazy(() => import("./enrollment_management/ApplicantListCollege"));
const CollegeEntranceExamScore = lazy(() => import("./enrollment_management/CollegeEntranceExamScore"));
const CollegeQualifyingInterviewRoomAssignment = lazy(() => import("./enrollment_management/CollegeQualifyingInterviewRoomAssignment"));
const CollegeQualifyingInterviewScheduleManagement = lazy(() => import("./enrollment_management/CollegeQualifyingInterviewScheduleManagement"));
const CollegeCertificateOfRegistration = lazy(() => import("./enrollment_management/CollegeCertificateOfRegistration"));
const CollegeClassList = lazy(() => import("./enrollment_management/CollegeClassList"));
const CollegeCourseTagging = lazy(() => import("./enrollment_management/CollegeCourseTagging"));
const QualifyingInterviewRoomAssignment = lazy(() => import("./enrollment_management/QualifyingInterviewRoomAssignment"));
const StudentOnlineRequirementsCollege = lazy(() => import("./enrollment_management/StudentOnlineRequirementsCollege"));
const StudentCollegePersonalInformation = lazy(() => import("./enrollment_management/StudentCollegePersonalInformation"));
const StudentCollegeFamilyBackground = lazy(() => import("./enrollment_management/StudentCollegeFamilyBackground"));
const StudentCollegeEducationalAttainment = lazy(() => import("./enrollment_management/StudentCollegeEducationalAttainment"));
const StudentCollegeHealthMedicalRecords = lazy(() => import("./enrollment_management/StudentCollegeHealthMedicalRecords"));
const StudentCollegeOtherInformation = lazy(() => import("./enrollment_management/StudentCollegeOtherInformation"));
const CollegeQualifyingInterviewerApplicantList = lazy(() => import("./enrollment_management/CollegeQualifyingInterviewerApplicantList"));
const CollegeQualifyingInterviewExamScore = lazy(() => import("./enrollment_management/CollegeQualifyingInterviewExamScore"));
const ApplicantCollegePersonalInformation = lazy(() => import("./enrollment_management/ApplicantCollegePersonalInformation"));
const ApplicantCollegeFamilyBackground = lazy(() => import("./enrollment_management/ApplicantCollegeFamilyBackground"));
const ApplicantCollegeEducationalAttainment = lazy(() => import("./enrollment_management/ApplicantEducationalAttainment"));
const ApplicantCollegeHealthMedicalRecords = lazy(() => import("./enrollment_management/ApplicantHealthMedicalRecords"));
const ApplicantCollegeOtherInformation = lazy(() => import("./enrollment_management/ApplicantCollegeOtherInformation"));
const ApplicantOnlineRequirementsCollege = lazy(() => import("./enrollment_management/ApplicantOnlineRequirementsCollege"));
const CollegeSearchCertificateOfRegistration = lazy(() => import("./enrollment_management/CollegeSearchCertificateOfRegistration"));
const CollegeStudentNumbering = lazy(() => import("./enrollment_management/CollegeStudentNumbering"));

// ------------------------------------------------------------
// FACULTY
// ------------------------------------------------------------
const FacultyEvaluation = lazy(() => import("./faculty/FacultyEvaluation"));
const FacultyMasterList = lazy(() => import("./faculty/FacultyMasterlist"));
const FacultyResetPassword = lazy(() => import("./faculty/FacultyResetPassword"));
const FacultyWorkload = lazy(() => import("./faculty/FacultyWorkload"));
const GradingSheet = lazy(() => import("./faculty/GradingSheet"));

// ------------------------------------------------------------
// MEDICAL MANAGEMENT
// ------------------------------------------------------------
const DentalAssessment = lazy(() => import("./medical_management/DentalAssessment"));
const HealthRecord = lazy(() => import("./medical_management/HealthRecord"));
const MedicalStudentList = lazy(() => import("./medical_management/MedicalStudentList"));
const MedicalCertificate = lazy(() => import("./medical_management/MedicalCertificate"));
const MedicalPersonalInformation = lazy(() => import("./medical_management/MedicalPersonalInformation"));
const MedicalFamilyBackground = lazy(() => import("./medical_management/MedicalFamilyBackground"));
const MedicalEducationalAttainment = lazy(() => import("./medical_management/MedicalEducationalAttainment"));
const MedicalHealthMedicalRecords = lazy(() => import("./medical_management/MedicalHealthMedicalRecords"));
const MedicalOtherInformation = lazy(() => import("./medical_management/MedicalOtherInformation"));
const MedicalOnlineRequirements = lazy(() => import("./medical_management/MedicalOnlineRequirements"));
const MedicalRequirementsForm = lazy(() => import("./medical_management/MedicalRequirementsForm"));
const PhysicalNeuroExam = lazy(() => import("./medical_management/PhysicalNeuroExam"));

// ------------------------------------------------------------
// PAGES
// ------------------------------------------------------------
const AdmissionOfficerDashboard = lazy(() => import("./pages/AdmissionOfficerDashboard"));
const ApplicantDashboard = lazy(() => import("./pages/ApplicantDashboard"));
const EnrollmentOfficerDashboard = lazy(() => import("./pages/EnrollmentOfficerDashboard"));
const FacultyDashboard = lazy(() => import("./pages/FacultyDashboard"));
const RegistrarDashboard = lazy(() => import("./pages/Dashboard"));
const ScheduleFilterer = lazy(() => import("./pages/SchedulePlottingFilter"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));

const DASHBOARD_ACCESS_IDS = {
  registrar: 101,
  enrollment: 102,
  admission: 103,
};

const getStoredDashboardAccess = () => {
  try {
    const raw = localStorage.getItem("accessList");
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map(Number) : []);
  } catch {
    return new Set();
  }
};

const DashboardEntry = ({ profileImage, setProfileImage }) => {
  const role = String(localStorage.getItem("role") || "")
    .trim()
    .toLowerCase();

  if (role === "faculty") {
    return <FacultyDashboard profileImage={profileImage} setProfileImage={setProfileImage} />;
  }
  if (role === "applicant") {
    return <ApplicantDashboard profileImage={profileImage} setProfileImage={setProfileImage} />;
  }
  if (role === "student") {
    return <StudentDashboard profileImage={profileImage} setProfileImage={setProfileImage} />;
  }

  if (["administrator", "superadmin", "technical"].includes(role)) {
    const access = getStoredDashboardAccess();
    const assignedDashboards = Object.entries(DASHBOARD_ACCESS_IDS).filter(([, pageId]) =>
      access.has(pageId),
    );

    if (assignedDashboards.length !== 1) {
      return <Unauthorized />;
    }

    const [dashboard] = assignedDashboards[0];
    if (dashboard === "registrar") {
      return <RegistrarDashboard profileImage={profileImage} setProfileImage={setProfileImage} />;
    }
    if (dashboard === "enrollment") {
      return <EnrollmentOfficerDashboard />;
    }
    if (dashboard === "admission") {
      return <AdmissionOfficerDashboard />;
    }
  }

  return <Unauthorized />;
};

// ------------------------------------------------------------
// REGISTRAR
// ------------------------------------------------------------
const RegistrarClassList = lazy(() => import("./registrar/RegistrarClassList"));
const CORExportingModule = lazy(() => import("./registrar/CORExportingModule"));
const CORExportRender = lazy(() => import("./registrar/CORExportRender"));
const RegistrarCourseTagging = lazy(() => import("./registrar/RegistrarCourseTagging"));
const RegistrarCourseTaggingSummer = lazy(() => import("./registrar/RegistrarCourseTaggingSummer"));
const GradingEvaluationForRegistrar = lazy(() => import("./registrar/GradingEvaluationForRegistrar"));
const RegistrarEntranceExamScore = lazy(() => import("./registrar/RegistrarEntranceExamScore"));
const RegistrarQualifyingInterviewExamScore = lazy(() => import("./registrar/RegistrarQualifyingInterviewExamScore"));
const ApplicantOnlineRequirementsRegistrar = lazy(() => import("./registrar/ApplicantOnlineRequirementsRegistrar"));
const ApplicantRegistrarPersonalInformation = lazy(() => import("./registrar/ApplicantRegistrarPersonalInformation"));
const ApplicantRegistrarFamilyBackground = lazy(() => import("./registrar/ApplicantRegistrarFamilyBackground"));
const ApplicantRegistrarEducationalAttainment = lazy(() => import("./registrar/ApplicantRegistrarEducationalAttainment"));
const ApplicantRegistrarHealthMedicalRecords = lazy(() => import("./registrar/ApplicantRegistrarHealthMedicalRecords"));
const ApplicantRegistrarOtherInformation = lazy(() => import("./registrar/ApplicantRegistrarOtherInformation"));
const StudentRegistrarPersonalInformation = lazy(() => import("./registrar/StudentRegistrarPersonalInformation"));
const StudentRegistrarFamilyBackground = lazy(() => import("./registrar/StudentRegistrarFamilyBackground"));
const StudentRegistrarEducationalAttainment = lazy(() => import("./registrar/StudentRegistrarEducationalAttainment"));
const StudentRegistrarHealthMedicalRecords = lazy(() => import("./registrar/StudentRegistrarHealthMedicalRecords"));
const StudentRegistrarOtherInformation = lazy(() => import("./registrar/StudentRegistrarOtherInformation"));
const ReportOfGrade = lazy(() => import("./registrar/ReportOfGrade"));
const SearchCertificateOfRegistration = lazy(() => import("./registrar/SearchCertificateOfRegistration"));
const StudentEnrollment = lazy(() => import("./registrar/StudentEnrollment"));
const RegistrarStudentList = lazy(() => import("./registrar/RegistrarStudentList"));
const StudentNumbering = lazy(() => import("./registrar/StudentNumbering"));
const StudentNumberAdmin = lazy(() => import("./registrar/StudentNumberAdmin"));
const StudentOnlineRequirementsRegistrar = lazy(() => import("./registrar/StudentOnlineRequirementsRegistrar"));
const ApplicantListRegistrar = lazy(() => import("./registrar/ApplicantListRegistrar"));
const TranscriptOfRecords = lazy(() => import("./registrar/TranscriptOfRecords"));

// ------------------------------------------------------------
// STUDENT
// ------------------------------------------------------------
const CertificateOfRegistration = lazy(() => import("./student/CertificateOfRegistration"));
const StudentServicesSurvey = lazy(() => import("./student/StudentServicesSurvey"));
const StudentBalanceInfo = lazy(() => import("./student/StudentBalanceInfo"));
const StudentBalanceManagement = lazy(() => import("./student/StudentBalanceManagement"));
const StudentPersonalInformation = lazy(() => import("./student/StudentPersonalInformation"));
const StudentPersonalInformationMobile = lazy(() => import("./student/StudentPersonalInformationMobile"));
const StudentFamilyBackground = lazy(() => import("./student/StudentFamilyBackground"));
const StudentFamilyBackgroundMobile = lazy(() => import("./student/StudentFamilyBackgroundMobile"));
const StudentEducationalAttainment = lazy(() => import("./student/StudentEducationalAttainment"));
const StudentEducationalAttainmentMobile = lazy(() => import("./student/StudentEducationalAttainmentMobile"));
const StudentHealthMedicalRecords = lazy(() => import("./student/StudentHealthMedicalRecords"));
const StudentHealthMedicalRecordsMobile = lazy(() => import("./student/StudentHealthMedicalRecordsMobile"));
const StudentOtherInformation = lazy(() => import("./student/StudentOtherInformation"));
const StudentOtherInformationMobile = lazy(() => import("./student/StudentOtherInformationMobile"));
const StudentECATApplicationForm = lazy(() => import("./student/StudentECATApplicationForm"));
const StudentFacultyEvaluation = lazy(() => import("./student/StudentFacultyEval"));
const StudentGradePage = lazy(() => import("./student/StudentGradePage"));
const StudentOfficeOfTheRegistrar = lazy(() => import("./student/StudentOfficeOfTheRegistrar"));
const StudentOnlineRequirements = lazy(() => import("./student/StudentOnlineRequirements"));
const StudentPersonalDataForm = lazy(() => import("./student/StudentPersonalDataForm"));
const StudentResetPassword = lazy(() => import("./student/StudentResetPassword"));
const StudentSchedule = lazy(() => import("./student/StudentSchedule"));
const StudentCurriculumSubjects = lazy(() => import("./student/StudentCurriculumSubjects"));
const StudentHistory = lazy(() => import("./student/StudentHistory"));

// ------------------------------------------------------------
// SYSTEM MANAGEMENT
// ------------------------------------------------------------
const RoomRegistration = lazy(() => import("./system_management/RoomRegistration"));
const StudentGradeFile = lazy(() => import("./system_management/StudentGradeFile"));
const AdminBranches = lazy(() => import("./system_management/AdminBranchesManagement"));
const Announcement = lazy(() => import("./system_management/Announcement"));
const AuditLogs = lazy(() => import("./system_management/AuditLogs"));
const ChangeGradingPeriod = lazy(() => import("./system_management/ChangeYearGradPer"));
const EmailTemplateManager = lazy(() => import("./system_management/EmailTemplateManager"));
const EvaluationCRUD = lazy(() => import("./system_management/EvaluationCrud"));
const MatriculationPaymentModule = lazy(() => import("./system_management/MatriculationPaymentModule"));
const StudentBalanceList = lazy(() => import("./system_management/StudentBalanceList"));
const PaymentExportingModule = lazy(() => import("./system_management/PaymentExportingModule"));
const ProgramSlotLimit = lazy(() => import("./system_management/ProgramSlotLimit"));
const ReceiptCounterAssignment = lazy(() => import("./system_management/ReceiptCounterAssignment"));
const RequirementsForm = lazy(() => import("./system_management/RequirementsForm"));
const Reports = lazy(() => import("./system_management/Reports"));
const SchoolYearPanel = lazy(() => import("./system_management/SchoolYearPanel"));
const SectionPanel = lazy(() => import("./system_management/SectionPanel"));
const SemesterPanel = lazy(() => import("./system_management/SemesterPanel"));
const Settings = lazy(() => import("./system_management/Settings"));
const SignatureUpload = lazy(() => import("./system_management/SignatureUpload"));
const StudentScholarshipList = lazy(() => import("./system_management/StudentScholarshipList"));
const TOSFCrud = lazy(() => import("./system_management/TOSFCrud"));
const YearLevelPanel = lazy(() => import("./system_management/YearLevelPanel"));
const YearPanel = lazy(() => import("./system_management/YearPanel"));

// ============================================================
// END OF LAZY IMPORTS
// ============================================================

function App() {
  const getCachedSettings = () => {
    try {
      const raw = localStorage.getItem("app_settings_cache");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return normalizeSettings(parsed);
    } catch {
      return null;
    }
  };

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [settings, setSettings] = useState(() => getCachedSettings());
  const [settingsReady, setSettingsReady] = useState(() => hasRequiredSettings(getCachedSettings()));
  const [profileImage, setProfileImage] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [, setLogoVersion] = useState(Date.now());

  // Detect mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => registerLogoutHandler(() => setIsAuthenticated(false)), []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const expiryMs = getTokenExpiryMs();
    if (!expiryMs) {
      logout();
      return undefined;
    }

    const delay = expiryMs - Date.now();
    if (delay <= 0) {
      logout();
      return undefined;
    }

    const timer = window.setTimeout(logout, delay);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated]);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === "token" && !event.newValue) logout();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const ApplicantPersonalInformationResponsive = () => { const isMobile = window.innerWidth < 768; return isMobile ? <ApplicantPersonalInformationMobile /> : <ApplicantPersonalInformation />; };
  const ApplicantFamilyBackgroundResponsive = () => { const isMobile = window.innerWidth < 768; return isMobile ? <ApplicantFamilyBackgroundMobile /> : <ApplicantFamilyBackground />; };
  const ApplicantEducationalAttainmentResponsive = () => { const isMobile = window.innerWidth < 768; return isMobile ? <ApplicantEducationalAttainmentMobile /> : <ApplicantEducationalAttainment />; };
  const ApplicantHealthMedicalRecordsResponsive = () => { const isMobile = window.innerWidth < 768; return isMobile ? <ApplicantHealthMedicalRecordsMobile /> : <ApplicantHealthMedicalRecords />; };
  const ApplicantOtherInformationResponsive = () => { const isMobile = window.innerWidth < 768; return isMobile ? <ApplicantOtherInformationMobile /> : <ApplicantOtherInformation />; };
  const StudentPersonalInformationResponsive = () => { const isMobile = window.innerWidth < 768; return isMobile ? <StudentPersonalInformationMobile /> : <StudentPersonalInformation />; };
  const StudentFamilyBackgroundResponsive = () => { const isMobile = window.innerWidth < 768; return isMobile ? <StudentFamilyBackgroundMobile /> : <StudentFamilyBackground />; };
  const StudentEducationalAttainmentResponsive = () => { const isMobile = window.innerWidth < 768; return isMobile ? <StudentEducationalAttainmentMobile /> : <StudentEducationalAttainment />; };
  const StudentHealthMedicalRecordsResponsive = () => { const isMobile = window.innerWidth < 768; return isMobile ? <StudentHealthMedicalRecordsMobile /> : <StudentHealthMedicalRecords />; };
  const StudentOtherInformationResponsive = () => { const isMobile = window.innerWidth < 768; return isMobile ? <StudentOtherInformationMobile /> : <StudentOtherInformation />; };

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/settings`);
      const data = response.data;
      const normalized = normalizeSettings(data);
      setSettings(normalized);
      localStorage.setItem("app_settings_cache", JSON.stringify(normalized));
      setLogoVersion(Date.now());
      setSettingsReady(hasRequiredSettings(normalized));
    } catch (error) {
      console.error("Error fetching settings:", error.response?.data || error.message);
      setSettingsReady(false);
    }
  };

  const clearAuthStorage = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    localStorage.removeItem("person_id");
    localStorage.removeItem("employee_id");
    localStorage.removeItem("department");
    localStorage.removeItem("lastVisitedPath");
    localStorage.removeItem("accessList");
  };

  const getDefaultDashboardByRole = () => "/dashboard";

  const getLastVisitedPath = () => {
    const path = localStorage.getItem("lastVisitedPath");
    if (!path || typeof path !== "string") return null;
    if (!path.startsWith("/")) return null;
    const disallowedPublicPaths = new Set([
      "/",
      "/login",
      "/login_applicant",
      "/register",
      "/announcement_slider",
      "/applicant_forgot_password",
      "/forgot_password",
      "/registrar_dashboard",
      "/enrollment_officer_dashboard",
      "/admission_officer_dashboard",
      "/faculty_dashboard",
      "/student_dashboard",
      "/applicant_dashboard",
    ]);
    return disallowedPublicPaths.has(path) ? null : path;
  };

  const PublicOnlyRoute = ({ children }) => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (isTokenValid(token)) {
      const targetPath = getLastVisitedPath() || getDefaultDashboardByRole(role);
      return <Navigate to={targetPath} replace />;
    }
    return children;
  };

  useEffect(() => {
    fetchSettings();
    const handleStorageChange = (event) => {
      if (event.key !== "app_settings_cache" || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        const normalized = normalizeSettings(parsed);
        setSettings(normalized);
        setSettingsReady(hasRequiredSettings(normalized));
      } catch (error) {
        console.error("Error reading cached settings update:", error);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (isTokenValid(token)) {
      setIsAuthenticated(true);
      return;
    }
    clearAuthStorage();
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !["administrator", "superadmin", "technical"].includes(localStorage.getItem("role"))) return undefined;
    const refreshCurrentRegistrarCurriculum = () => {
      refreshRegistrarCurriculumId().catch((err) => {
        console.error("Error refreshing registrar curriculum:", err);
      });
    };
    refreshCurrentRegistrarCurriculum();
    window.addEventListener("focus", refreshCurrentRegistrarCurriculum);
    window.addEventListener("registrarAccountUpdated", refreshCurrentRegistrarCurriculum);
    return () => {
      window.removeEventListener("focus", refreshCurrentRegistrarCurriculum);
      window.removeEventListener("registrarAccountUpdated", refreshCurrentRegistrarCurriculum);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const handleSettingsUpdate = () => fetchSettings();
    window.addEventListener("settingsUpdated", handleSettingsUpdate);
    return () => window.removeEventListener("settingsUpdated", handleSettingsUpdate);
  }, []);

  const theme = createTheme({ typography: { fontFamily: "Poppins, sans-serif" } });

  const settingsContextValue = useMemo(() => (settings ? { ...settings, refreshSettings: fetchSettings } : null), [settings]);
  const appColors = settings?.colors || {};
  const appBranding = settings?.branding || {};

  const ForcePasswordGuard = ({ children }) => {
    const forced = localStorage.getItem("force_password_change") === "true";
    const role = localStorage.getItem("role");
    if (forced) {
      const resetPaths = { student: "/student_reset_password", faculty: "/faculty_reset_password", administrator: "/registrar_reset_password", superadmin: "/registrar_reset_password", technical: "/registrar_reset_password", applicant: "/applicant_reset_password" };
      const path = resetPaths[role];
      // Don't redirect if already on the reset page
      if (path && window.location.pathname !== path) {
        return <Navigate to={path} replace />;
      }
    }
    return children;
  };

  const GuardedRoute = ({ children, allowedRoles, strictRoles = false }) => (
    <ProtectedRoute allowedRoles={allowedRoles} strictRoles={strictRoles}><ForcePasswordGuard>{children}</ForcePasswordGuard></ProtectedRoute>
  );

  const keys = JSON.parse(localStorage.getItem("dashboardKeys") || "{}");
  const isCorExportRenderRoute = window.location.pathname === "/cor_export_render";

  const settingsOk = settingsReady && hasRequiredSettings(settings);

  if (!settingsOk) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Poppins, sans-serif" }}>
          <Typography variant="h6">Loading....</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SettingsContext.Provider value={settingsContextValue}>
        <Suspense fallback={<Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Poppins, sans-serif" }}><Typography variant="h6">Loading page...</Typography></Box>}>
          <Router>
            <div className="flex flex-col min-h-screen">
              <div className="flex flex-1">
                {/* Sidebar — rendered outside main flow on mobile (overlay), inside on desktop */}
                {isAuthenticated && !isCorExportRenderRoute && (
                  <>
                    {/* Desktop spacer — pushes content right */}
                    {!isMobile && <aside className="shrink-0" style={{ width: isSidebarCollapsed ? 75 : 290, transition: "width .34s cubic-bezier(.22,1,.36,1)", willChange: "width" }} />}

                    <SideBar setIsAuthenticated={setIsAuthenticated} profileImage={profileImage} setProfileImage={setProfileImage} onCollapseChange={setIsSidebarCollapsed} mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} onLogout={logout} />
                  </>
                )}

                {/* Main area */}
                <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
                  {/* Navbar */}
                  {!isCorExportRenderRoute && (
                    <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: appColors.header, left: { xs: 0, sm: 0 }, width: "100%" }}>
                      <Toolbar sx={{ display: "flex", justifyContent: "space-between", minHeight: { xs: 56, sm: 64 } }}>
                        {/* LEFT SIDE */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 } }}>
                          {/* Mobile hamburger, only shown when authenticated and on mobile */}
                          {isAuthenticated && isMobile && (
                            <IconButton color="inherit" aria-label="open menu" edge="start" onClick={() => setMobileSidebarOpen(true)} sx={{ mr: 0.5 }}>
                              <MenuIcon />
                            </IconButton>
                          )}

                          {appBranding.logoUrl && (
                            <img src={`${appBranding.logoUrl}?t=${Date.now()}`} alt="Logo" style={{ height: isMobile ? "42px" : "50px", width: isMobile ? "42px" : "50px", borderRadius: "50%", objectFit: "cover", marginRight: isMobile ? "4px" : "3px", marginLeft: isMobile ? "0" : "-5px", cursor: "pointer", border: "2px solid white" }} onClick={() => window.location.reload()} />
                          )}

                          <Box sx={{ display: "flex", flexDirection: "column", transform: { xs: "none", sm: "scale(0.9)" }, transformOrigin: "left center", minWidth: 0, marginLeft: "5px" }}>
                            <Typography sx={{ fontWeight: "400", mt: "0px", fontFamily: "Poppins, sans-serif", fontSize: { xs: "15px", sm: "14px" }, lineHeight: 1.1, whiteSpace: { xs: "nowrap", sm: "normal" }, overflow: "hidden", textOverflow: "ellipsis", maxWidth: { xs: "46vw", sm: "none" } }}>
                              <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>{appBranding.shortTerm || "SCHOOL"}</Box>
                              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>{appBranding.companyName || "SCHOOL NAME"}</Box>
                            </Typography>
                            <Typography sx={{ fontWeight: 600, fontFamily: "Poppins, sans-serif", fontSize: { xs: "18px", sm: "17px", md: "19px" }, mt: "-3px", letterSpacing: { xs: "1px", sm: "2.5px" }, lineHeight: 1.2, marginTop: "6px", display: { xs: "none", sm: "block" } }}>
                              {appBranding.shortTerm || "SCHOOL NAME"} ACADEMIC PORTAL SYSTEM
                            </Typography>
                          </Box>
                        </Box>

                        {/* RIGHT SIDE (TIME + DATE) */}
                        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                          <Box sx={{ fontSize: { xs: "11px", sm: "14px" } }}>
                            <Clock />
                          </Box>
                        </Box>
                      </Toolbar>
                    </AppBar>
                  )}

                  {/* Main content area */}
                  <main
                    className={
                      isCorExportRenderRoute
                        ? "flex-1 w-full"
                        : "flex-1 w-full mt-[56px] sm:mt-[64px] pb-[40px]"
                    }
                    style={{ overflowX: "hidden" }}
                  >
                    <Routes>
                      {/* ---------------------------------------------------------- */}
                      {/* PUBLIC / AUTH (components folder)                          */}
                      {/* ---------------------------------------------------------- */}
                      <Route path="/" element={<PublicOnlyRoute><LoginEnrollment setIsAuthenticated={setIsAuthenticated} /></PublicOnlyRoute>} />
                      <Route path="/login_applicant" element={<PublicOnlyRoute><Login setIsAuthenticated={setIsAuthenticated} /></PublicOnlyRoute>} />
                      <Route path="/login" element={<PublicOnlyRoute><LoginEnrollment setIsAuthenticated={setIsAuthenticated} /></PublicOnlyRoute>} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/announcement_slider" element={<AnnouncementSlider />} />
                      <Route path="/applicant_forgot_password" element={<ApplicantForgotPassword />} />
                      <Route path="/forgot_password" element={<RegistrarForgotPassword />} />
                      <Route path="/unauthorized" element={<Unauthorized />} />
                      <Route path="/applicant_profile" element={<ApplicantProfile />} />
                      <Route path="/applicant_profile/:applicantNumber" element={<ApplicantProfile />} />
                      <Route path="/registrar_examination_profile/:personId" element={<ApplicantProfile />} />
                      <Route path="/registrar_exam_permit" element={<ProtectedRoute><RegistrarExamPermit /></ProtectedRoute>} />
                      <Route path="/tor_qr_information/:student_number" element={<TorQrInformation />} />
                      <Route path="/student_qr_information/:student_number" element={<StudentQrInformation />} />
                      <Route path="/exam-attendance-info/:applicant_number" element={<ExamAttendanceQrInformation />} />

                      {/* ---------------------------------------------------------- */}
                      {/* PAGES (dashboards)                                         */}
                      {/* ---------------------------------------------------------- */}
                       <Route
                         path="/dashboard"
                         element={
                           <ProtectedRoute
                             allowedRoles={["administrator", "superadmin", "technical", "faculty", "student", "applicant"]}
                             strictRoles
                           >
                             <ForcePasswordGuard>
                               <DashboardEntry profileImage={profileImage} setProfileImage={setProfileImage} />
                             </ForcePasswordGuard>
                           </ProtectedRoute>
                         }
                       />
                       {/* Legacy module URLs */}
                      <Route path="/admission_dashboard" element={<Navigate to="/admission_applicant_list" replace />} />
                      <Route path="/department_dashboard" element={<Navigate to="/department_section_panel" replace />} />
                      <Route path="/system_dashboard" element={<Navigate to="/settings" replace />} />
                      <Route path="/account_dashboard" element={<Navigate to="/user_page_access" replace />} />
                      <Route path="/select_college" element={<ProtectedRoute><ScheduleFilterer /></ProtectedRoute>} />

                      {/* ---------------------------------------------------------- */}
                      {/* ACCOUNT MANAGEMENT                                         */}
                      {/* ---------------------------------------------------------- */}
                      <Route path="/registrar_reset_password" element={<ProtectedRoute><RegistrarResetPassword /></ProtectedRoute>} />
                      <Route path="/superadmin_applicant_reset_password" element={<ProtectedRoute><SuperAdminApplicantResetPassword /></ProtectedRoute>} />
                      <Route path="/superadmin_student_reset_password" element={<ProtectedRoute><SuperAdminStudentResetPassword /></ProtectedRoute>} />
                      <Route path="/admin_student_edit_permissions1" element={<ProtectedRoute><StudentEditPermissions1 /></ProtectedRoute>} />
                      <Route path="/admin_student_edit_permissions2" element={<ProtectedRoute><StudentEditPermissions2 /></ProtectedRoute>} />
                      <Route path="/admin_student_edit_permissions3" element={<ProtectedRoute><StudentEditPermissions3 /></ProtectedRoute>} />
                      <Route path="/admin_student_edit_permissions4" element={<ProtectedRoute><StudentEditPermissions4 /></ProtectedRoute>} />
                      <Route path="/admin_student_edit_permissions5" element={<ProtectedRoute><StudentEditPermissions5 /></ProtectedRoute>} />
                      <Route path="/superadmin_faculty_reset_password" element={<ProtectedRoute><SuperAdminFacultyResetPassword /></ProtectedRoute>} />
                      <Route path="/superadmin_registrar_reset_password" element={<ProtectedRoute><SuperAdminRegistrarPassword /></ProtectedRoute>} />
                      <Route path="/register_prof" element={<ProtectedRoute><RegisterProf /></ProtectedRoute>} />
                      <Route path="/register_registrar" element={<ProtectedRoute><RegisterAdministrators /></ProtectedRoute>} />
                      <Route path="/register_student" element={<ProtectedRoute><RegisterStudent /></ProtectedRoute>} />
                      <Route path="/archived" element={<ProtectedRoute><Archived /></ProtectedRoute>} />
                      <Route path="/application_process_super_admin" element={<ProtectedRoute><ApplicantProcessSuperAdmin /></ProtectedRoute>} />
                      <Route path="/applicant_admin_personal_information" element={<ProtectedRoute><ApplicantAdminPersonalInformation /></ProtectedRoute>} />
                      <Route path="/applicant_admin_family_background" element={<ProtectedRoute><ApplicantAdminFamilyBackground /></ProtectedRoute>} />
                      <Route path="/applicant_admin_educational_attainment" element={<ProtectedRoute><ApplicantAdminEducationalAttainment /></ProtectedRoute>} />
                      <Route path="/applicant_admin_health_medical_records" element={<ProtectedRoute><ApplicantAdminHealthMedicalRecords /></ProtectedRoute>} />
                      <Route path="/applicant_admin_other_information" element={<ProtectedRoute><ApplicantAdminOtherInformation /></ProtectedRoute>} />
                      <Route path="/applicant_online_requirements_admin" element={<ProtectedRoute><ApplicantOnlineRequirementsAdmin /></ProtectedRoute>} />
                      <Route path="/student_online_requirements_admin" element={<ProtectedRoute><StudentOnlineRequirementsAdmin /></ProtectedRoute>} />
                      <Route path="/student_admin_personal_information" element={<ProtectedRoute><StudentAdminPersonalInformation /></ProtectedRoute>} />
                      <Route path="/student_admin_family_background" element={<ProtectedRoute><StudentAdminFamilyBackground /></ProtectedRoute>} />
                      <Route path="/student_admin_educational_attainment" element={<ProtectedRoute><StudentAdminEducationalAttainment /></ProtectedRoute>} />
                      <Route path="/student_admin_health_medical_records" element={<ProtectedRoute><StudentAdminHealthMedicalRecords /></ProtectedRoute>} />
                      <Route path="/student_admin_other_information" element={<ProtectedRoute><StudentAdminOtherInformation /></ProtectedRoute>} />
                      <Route path="/student_accounts" element={<ProtectedRoute><StudentAccounts /></ProtectedRoute>} />
                      <Route path="/migration_data_panel" element={<ProtectedRoute><MigrationDataPanel /></ProtectedRoute>} />
                      <Route path="/upload_applicants" element={<ProtectedRoute><UploadApplicants /></ProtectedRoute>} />
                      <Route path="/page_management" element={<ProtectedRoute><PageManagement /></ProtectedRoute>} />
                      <Route path="/user_page_access" element={<ProtectedRoute><UserPageAccess /></ProtectedRoute>} />

                      {/* ---------------------------------------------------------- */}
                      {/* ADMISSION                                                  */}
                      {/* ---------------------------------------------------------- */}
                      <Route path="/exam_attendance_scanner" element={<ProtectedRoute><ExamAttendanceScanner /></ProtectedRoute>} />
                      <Route path="/entrance_exam_room_assignment" element={<ProtectedRoute><EntranceExamRoomAssignment /></ProtectedRoute>} />
                      <Route path="/entrance_exam_schedule_management" element={<ProtectedRoute><EntranceExamScheduleManagement /></ProtectedRoute>} />
                      <Route path="/admission_schedule_room_list" element={<ProtectedRoute><AdmissionScheduleTile /></ProtectedRoute>} />
                      <Route path="/admission_contact_management" element={<ProtectedRoute><AdmissionContactManagement /></ProtectedRoute>} />
                      <Route path="/applicant_entrance_exam_score" element={<ProtectedRoute><ApplicantEntranceExamScore /></ProtectedRoute>} />
                      <Route path="/exam_subject_management" element={<ProtectedRoute><ExamSubjectManagement /></ProtectedRoute>} />
                      <Route path="/evaluator_schedule_room_list" element={<ProtectedRoute><EvaluatorScheduleTile /></ProtectedRoute>} />
                      <Route path="/evaluator_applicant_list" element={<ProtectedRoute><EvaluatorApplicantList /></ProtectedRoute>} />
                      <Route path="/admission_applicant_list" element={<ProtectedRoute><AdmissionApplicantList /></ProtectedRoute>} />
                      <Route path="/application_process_admin" element={<ProtectedRoute><ApplicationProcessAdmin /></ProtectedRoute>} />
                      <Route path="/proctor_applicant_list" element={<ProtectedRoute><ProctorApplicantList /></ProtectedRoute>} />
                      <Route path="/admission_personal_information" element={<ProtectedRoute><AdmissionPersonalInformation /></ProtectedRoute>} />
                      <Route path="/admission_family_background" element={<ProtectedRoute><AdmissionFamilyBackground /></ProtectedRoute>} />
                      <Route path="/admission_educational_attainment" element={<ProtectedRoute><AdmissionEducationalAttainment /></ProtectedRoute>} />
                      <Route path="/admission_health_medical_records" element={<ProtectedRoute><AdmissionHealthMedicalRecords /></ProtectedRoute>} />
                      <Route path="/admission_other_information" element={<ProtectedRoute><AdmissionOtherInformation /></ProtectedRoute>} />
                      <Route path="/admission_online_requirements" element={<ProtectedRoute><AdmissionOnlineRequirements /></ProtectedRoute>} />
                      <Route path="/admin_ecat_application_form" element={<ProtectedRoute allowedRoles={["administrator", "superadmin", "technical"]}><AdminECATApplicationForm /></ProtectedRoute>} />
                      <Route path="/admin_personal_data_form" element={<ProtectedRoute allowedRoles={["administrator", "superadmin", "technical"]}><AdminPersonalDataForm /></ProtectedRoute>} />
                      <Route path="/admin_admission_form_process" element={<ProtectedRoute allowedRoles={["administrator", "superadmin", "technical"]}><AdmissionFormProcess /></ProtectedRoute>} />
                      <Route path="/empty_admission_form_process" element={<ProtectedRoute allowedRoles={["administrator", "superadmin", "technical"]}><EmptyAdmissionFormProcess /></ProtectedRoute>} />
                      <Route path="/admin_office_of_the_registrar" element={<ProtectedRoute allowedRoles={["administrator", "superadmin", "technical"]}><AdminOfficeOfTheRegistrar /></ProtectedRoute>} />
                      <Route path="/verify_document_schedule_management" element={<ProtectedRoute allowedRoles={["administrator", "superadmin", "technical"]}><VerifyDocumentScheduleManagement /></ProtectedRoute>} />
                      <Route path="/verify_document_room_assignment" element={<ProtectedRoute allowedRoles={["administrator", "superadmin", "technical"]}><VerifyDocumentRoomAssignment /></ProtectedRoute>} />
                      <Route path="/admission_announcement" element={<ProtectedRoute><AdmissionAnnouncement /></ProtectedRoute>} />
                      <Route path="/admission_printable_forms" element={<ProtectedRoute><AdmissionPrintableForms /></ProtectedRoute>} />

                      {/* ---------------------------------------------------------- */}
                      {/* APPLICANT                                                  */}
                      {/* ---------------------------------------------------------- */}
                      <Route path="/applicant_reset_password" element={<ProtectedRoute><ApplicantResetPassword /></ProtectedRoute>} />
                      {keys.step1 && <Route path={`/applicant_personal_information/${keys.step1}`} element={<ProtectedRoute allowedRoles={["applicant"]}><ApplicantPersonalInformationResponsive /></ProtectedRoute>} />}
                      {keys.step2 && <Route path={`/applicant_family_background/${keys.step2}`} element={<ProtectedRoute allowedRoles={["applicant"]}><ApplicantFamilyBackgroundResponsive /></ProtectedRoute>} />}
                      {keys.step3 && <Route path={`/applicant_educational_attainment/${keys.step3}`} element={<ProtectedRoute allowedRoles={["applicant"]}><ApplicantEducationalAttainmentResponsive /></ProtectedRoute>} />}
                      {keys.step4 && <Route path={`/applicant_health_medical_records/${keys.step4}`} element={<ProtectedRoute allowedRoles={["applicant"]}><ApplicantHealthMedicalRecordsResponsive /></ProtectedRoute>} />}
                      {keys.step5 && <Route path={`/applicant_other_information/${keys.step5}`} element={<ProtectedRoute allowedRoles={["applicant"]}><ApplicantOtherInformationResponsive /></ProtectedRoute>} />}
                      <Route path="/applicant_online_requirements" element={<ProtectedRoute allowedRoles={["applicant"]}><ApplicantOnlineRequirements /></ProtectedRoute>} />
                      <Route path="/personal_data_form" element={<ProtectedRoute allowedRoles={["applicant"]}><PersonalDataForm /></ProtectedRoute>} />
                      <Route path="/ecat_application_form" element={<ProtectedRoute allowedRoles={["applicant"]}><ECATApplicationForm /></ProtectedRoute>} />
                      <Route path="/applicant_services_survey" element={<ProtectedRoute allowedRoles={["applicant", "administrator"]}><ApplicantServicesSurvey /></ProtectedRoute>} />
                      <Route path="/office_of_the_registrar" element={<ProtectedRoute allowedRoles={["applicant"]}><OfficeOfTheRegistrar /></ProtectedRoute>} />
                      <Route path="/exam-permit/:applicant_number" element={<ExamPermit />} />

                      {/* ---------------------------------------------------------- */}
                      {/* COURSE MANAGEMENT                                          */}
                      {/* ---------------------------------------------------------- */}
                      <Route path="/subject_management" element={<ProtectedRoute><SubjectManagement /></ProtectedRoute>} />
                      <Route path="/course_management" element={<Navigate to="/program_management" replace />} />
                      <Route path="/program_tagging_management" element={<ProtectedRoute><ProgramTaggingManagement /></ProtectedRoute>} />
                      <Route path="/course_tagged" element={<ProtectedRoute><AcademicSubjectManagement /></ProtectedRoute>} />
                      <Route path="/program_management" element={<ProtectedRoute><ProgramManagement /></ProtectedRoute>} />
                      <Route path="/curriculum_management" element={<ProtectedRoute><CurriculumManagement /></ProtectedRoute>} />
                      <Route path="/nstp_tagging" element={<ProtectedRoute><NSTPTagging /></ProtectedRoute>} />
                      <Route path="/curriculum_fee_management" element={<ProtectedRoute><CurriculumFeeManagement /></ProtectedRoute>} />
                      <Route path="/curriculum_requirements_management" element={<ProtectedRoute><CurriculumRequirementsManagement /></ProtectedRoute>} />
                      <Route path="/curriculum_unit_management" element={<ProtectedRoute><CurriculumUnitManagement /></ProtectedRoute>} />

                      {/* ---------------------------------------------------------- */}
                      {/* DEPARTMENT MANAGEMENT                                      */}
                      {/* ---------------------------------------------------------- */}
                      <Route path="/department_section_panel" element={<ProtectedRoute><DepartmentSection /></ProtectedRoute>} />
                      <Route path="/department_registration" element={<ProtectedRoute><DepartmentRegistration /></ProtectedRoute>} />
                      <Route path="/department_section_tagging" element={<ProtectedRoute><DepartmentSectionTagging /></ProtectedRoute>} />
                      <Route path="/schedule_checker/:dprtmnt_id" element={<ProtectedRoute><ScheduleChecker /></ProtectedRoute>} />
                      <Route path="/department_room" element={<ProtectedRoute><DepartmentRoom /></ProtectedRoute>} />
                      <Route path="/college_schedule_plotting" element={<ProtectedRoute><CollegeScheduleChecker /></ProtectedRoute>} />
                      <Route path="/workload_management" element={<ProtectedRoute><WorkloadManagement /></ProtectedRoute>} />
                      <Route path="/department_curriculum_panel" element={<ProtectedRoute><DepartmentCurriculumPanel /></ProtectedRoute>} />
                      <Route path="/section_slot_monitoring" element={<ProtectedRoute><SlotMonitoring /></ProtectedRoute>} />
                      <Route path="/section_slot_management" element={<ProtectedRoute><SectionSlotManagement /></ProtectedRoute>} />

                      {/* ---------------------------------------------------------- */}
                      {/* ENROLLMENT MANAGEMENT                                      */}
                      {/* ---------------------------------------------------------- */}
                      <Route path="/college_student_numbering" element={<ProtectedRoute><CollegeStudentNumbering /></ProtectedRoute>} />
                      <Route path="/college_course_tagging" element={<ProtectedRoute><CollegeCourseTagging /></ProtectedRoute>} />
                      <Route path="/college_course_tagging_summer" element={<ProtectedRoute><CollegeCourseTaggingSummer /></ProtectedRoute>} />
                      <Route path="/college_search_certification_of_registration" element={<ProtectedRoute allowedRoles={["administrator", "superadmin", "technical"]}><CollegeSearchCertificateOfRegistration /></ProtectedRoute>} />
                      <Route path="/college_certificate_of_registration" element={<ProtectedRoute allowedRoles={["administrator", "superadmin", "technical"]}><CollegeCertificateOfRegistration /></ProtectedRoute>} />
                      <Route path="/qualifying_interview_room_assignment" element={<ProtectedRoute><QualifyingInterviewRoomAssignment /></ProtectedRoute>} />
                      <Route path="/college_qualifying_interview_room_assignment" element={<ProtectedRoute><CollegeQualifyingInterviewRoomAssignment /></ProtectedRoute>} />
                      <Route path="/college_qualifying_interview_schedule_management" element={<ProtectedRoute><CollegeQualifyingInterviewScheduleManagement /></ProtectedRoute>} />
                      <Route path="/qualifying_interviewer_applicant_list" element={<ProtectedRoute><CollegeQualifyingInterviewerApplicantList /></ProtectedRoute>} />
                      <Route path="/college_student_list" element={<ProtectedRoute><CollegeStudentList /></ProtectedRoute>} />
                      <Route path="/college_student_grade_file" element={<ProtectedRoute><CollegeStudentGradeFile /></ProtectedRoute>} />
                      <Route path="/applicant_list_college" element={<ProtectedRoute><ApplicantListCollege /></ProtectedRoute>} />
                      <Route path="/college_entrance_examination_score" element={<ProtectedRoute><CollegeEntranceExamScore /></ProtectedRoute>} />
                      <Route path="/college_qualifying_interview_score" element={<ProtectedRoute><CollegeQualifyingInterviewExamScore /></ProtectedRoute>} />
                      <Route path="/applicant_college_personal_information" element={<ProtectedRoute><ApplicantCollegePersonalInformation /></ProtectedRoute>} />
                      <Route path="/applicant_college_family_background" element={<ProtectedRoute><ApplicantCollegeFamilyBackground /></ProtectedRoute>} />
                      <Route path="/applicant_college_educational_attainment" element={<ProtectedRoute><ApplicantCollegeEducationalAttainment /></ProtectedRoute>} />
                      <Route path="/applicant_college_health_medical_records" element={<ProtectedRoute><ApplicantCollegeHealthMedicalRecords /></ProtectedRoute>} />
                      <Route path="/applicant_college_other_information" element={<ProtectedRoute><ApplicantCollegeOtherInformation /></ProtectedRoute>} />
                      <Route path="/applicant_online_requirements_college" element={<ProtectedRoute><ApplicantOnlineRequirementsCollege /></ProtectedRoute>} />
                      <Route path="/college_class_list" element={<ProtectedRoute><CollegeClassList /></ProtectedRoute>} />
                      <Route path="/student_college_personal_information" element={<ProtectedRoute><StudentCollegePersonalInformation /></ProtectedRoute>} />
                      <Route path="/student_college_family_background" element={<ProtectedRoute><StudentCollegeFamilyBackground /></ProtectedRoute>} />
                      <Route path="/student_college_educational_attainment" element={<ProtectedRoute><StudentCollegeEducationalAttainment /></ProtectedRoute>} />
                      <Route path="/student_college_health_medical_records" element={<ProtectedRoute><StudentCollegeHealthMedicalRecords /></ProtectedRoute>} />
                      <Route path="/student_college_other_information" element={<ProtectedRoute><StudentCollegeOtherInformation /></ProtectedRoute>} />
                      <Route path="/student_online_requirements_college" element={<ProtectedRoute><StudentOnlineRequirementsCollege /></ProtectedRoute>} />

                      {/* ---------------------------------------------------------- */}
                      {/* FACULTY                                                    */}
                      {/* ---------------------------------------------------------- */}
                      <Route path="/faculty_reset_password" element={<ProtectedRoute><FacultyResetPassword /></ProtectedRoute>} />
                      <Route path="/faculty_grading_sheet" element={<ProtectedRoute><GradingSheet /></ProtectedRoute>} />
                      <Route path="/faculty_workload" element={<ProtectedRoute><FacultyWorkload /></ProtectedRoute>} />
                      <Route path="/faculty_evaluation" element={<ProtectedRoute><FacultyEvaluation /></ProtectedRoute>} />
                      <Route path="/faculty_classlist" element={<ProtectedRoute><FacultyMasterList /></ProtectedRoute>} />

                      {/* ---------------------------------------------------------- */}
                      {/* MEDICAL MANAGEMENT                                         */}
                      {/* ---------------------------------------------------------- */}
                      <Route path="/medical_student_list" element={<ProtectedRoute><MedicalStudentList /></ProtectedRoute>} />
                      <Route path="/medical_personal_information" element={<ProtectedRoute><MedicalPersonalInformation /></ProtectedRoute>} />
                      <Route path="/medical_family_background" element={<ProtectedRoute><MedicalFamilyBackground /></ProtectedRoute>} />
                      <Route path="/medical_educational_attainment" element={<ProtectedRoute><MedicalEducationalAttainment /></ProtectedRoute>} />
                      <Route path="/medical_health_medical_records" element={<ProtectedRoute><MedicalHealthMedicalRecords /></ProtectedRoute>} />
                      <Route path="/medical_other_information" element={<ProtectedRoute><MedicalOtherInformation /></ProtectedRoute>} />
                      <Route path="/medical_online_requirements" element={<ProtectedRoute><MedicalOnlineRequirements /></ProtectedRoute>} />
                      <Route path="/medical_certificate" element={<ProtectedRoute><MedicalCertificate /></ProtectedRoute>} />
                      <Route path="/health_record" element={<ProtectedRoute><HealthRecord /></ProtectedRoute>} />
                      <Route path="/medical_requirements_form" element={<ProtectedRoute><MedicalRequirementsForm /></ProtectedRoute>} />
                      <Route path="/dental_assessment" element={<ProtectedRoute><DentalAssessment /></ProtectedRoute>} />
                      <Route path="/physical_neuro_exam" element={<ProtectedRoute><PhysicalNeuroExam /></ProtectedRoute>} />

                      {/* ---------------------------------------------------------- */}
                      {/* REGISTRAR                                                  */}
                      {/* ---------------------------------------------------------- */}
                      <Route path="/grading_evaluation_for_registrar" element={<ProtectedRoute><GradingEvaluationForRegistrar /></ProtectedRoute>} />
                      <Route path="/student_online_requirements_registrar" element={<ProtectedRoute><StudentOnlineRequirementsRegistrar /></ProtectedRoute>} />
                      <Route path="/student_numbering" element={<ProtectedRoute><StudentNumbering /></ProtectedRoute>} />
                      <Route path="/student_number_admin" element={<ProtectedRoute><StudentNumberAdmin /></ProtectedRoute>} />
                      <Route path="/registrar_course_tagging" element={<ProtectedRoute><RegistrarCourseTagging /></ProtectedRoute>} />
                      <Route path="/registrar_course_tagging_summer" element={<ProtectedRoute><RegistrarCourseTaggingSummer /></ProtectedRoute>} />
                      <Route path="/registrar_search_certificate_of_registration" element={<ProtectedRoute allowedRoles={["administrator", "superadmin", "technical"]}><SearchCertificateOfRegistration /></ProtectedRoute>} />
                      <Route path="/cor" element={<GuardedRoute allowedRoles={["student"]} strictRoles><CertificateOfRegistration /></GuardedRoute>} />
                      <Route path="/registrar_student_list" element={<ProtectedRoute><RegistrarStudentList /></ProtectedRoute>} />
                      <Route path="/registrar_student_grade_file" element={<ProtectedRoute><RegistrarStudentGradeFile /></ProtectedRoute>} />
                      <Route path="/registrar_entrance_examination_score" element={<ProtectedRoute><RegistrarEntranceExamScore /></ProtectedRoute>} />
                      <Route path="/applicant_list_registrar" element={<ProtectedRoute><ApplicantListRegistrar /></ProtectedRoute>} />
                      <Route path="/registrar_qualifying_interview_score" element={<ProtectedRoute><RegistrarQualifyingInterviewExamScore /></ProtectedRoute>} />
                      <Route path="/applicant_registrar_personal_information" element={<ProtectedRoute><ApplicantRegistrarPersonalInformation /></ProtectedRoute>} />
                      <Route path="/applicant_registrar_family_background" element={<ProtectedRoute><ApplicantRegistrarFamilyBackground /></ProtectedRoute>} />
                      <Route path="/applicant_registrar_educational_attainment" element={<ProtectedRoute><ApplicantRegistrarEducationalAttainment /></ProtectedRoute>} />
                      <Route path="/applicant_registrar_health_medical_records" element={<ProtectedRoute><ApplicantRegistrarHealthMedicalRecords /></ProtectedRoute>} />
                      <Route path="/applicant_registrar_other_information" element={<ProtectedRoute><ApplicantRegistrarOtherInformation /></ProtectedRoute>} />
                      <Route path="/student_registrar_personal_information" element={<ProtectedRoute><StudentRegistrarPersonalInformation /></ProtectedRoute>} />
                      <Route path="/student_registrar_family_background" element={<ProtectedRoute><StudentRegistrarFamilyBackground /></ProtectedRoute>} />
                      <Route path="/student_registrar_educational_attainment" element={<ProtectedRoute><StudentRegistrarEducationalAttainment /></ProtectedRoute>} />
                      <Route path="/student_registrar_health_medical_records" element={<ProtectedRoute><StudentRegistrarHealthMedicalRecords /></ProtectedRoute>} />
                      <Route path="/student_registrar_other_information" element={<ProtectedRoute><StudentRegistrarOtherInformation /></ProtectedRoute>} />
                      <Route path="/payment_exporting_module" element={<ProtectedRoute><PaymentExportingModule /></ProtectedRoute>} />
                      <Route path="/cor_exporting_module" element={<ProtectedRoute allowedRoles={["administrator", "superadmin", "technical"]}><CORExportingModule /></ProtectedRoute>} />
                      <Route path="/cor_export_render" element={<CORExportRender />} />
                      <Route path="/applicant_online_requirements_registrar" element={<ProtectedRoute><ApplicantOnlineRequirementsRegistrar /></ProtectedRoute>} />
                      <Route path="/registrar_class_list" element={<ProtectedRoute><RegistrarClassList /></ProtectedRoute>} />
                      <Route path="/transcript_of_records" element={<ProtectedRoute><TranscriptOfRecords /></ProtectedRoute>} />
                      <Route path="/student_enrollment" element={<ProtectedRoute><StudentEnrollment /></ProtectedRoute>} />
                      <Route path="/report_of_grades" element={<ProtectedRoute><ReportOfGrade /></ProtectedRoute>} />

                      {/* ---------------------------------------------------------- */}
                      {/* STUDENT                                                    */}
                      {/* ---------------------------------------------------------- */}
                      <Route path="/student_reset_password" element={<ProtectedRoute><StudentResetPassword /></ProtectedRoute>} />
                      <Route path="/student_schedule" element={<ProtectedRoute allowedRoles={"student"}><StudentSchedule /></ProtectedRoute>} />
                      <Route path="/student_account_balance" element={<ProtectedRoute allowedRoles={"student"}><StudentBalanceManagement /></ProtectedRoute>} />
                      <Route path="/student_account_balance/info" element={<ProtectedRoute allowedRoles={"student"}><StudentBalanceInfo /></ProtectedRoute>} />
                      <Route path="/student_grades_page" element={<ProtectedRoute><StudentGradePage allowedRoles={"student"} /></ProtectedRoute>} />
                      <Route path="/student_faculty_evaluation" element={<ProtectedRoute allowedRoles={"student"}><StudentFacultyEvaluation /></ProtectedRoute>} />
                      <Route path="/student_personal_information" element={<ProtectedRoute><StudentPersonalInformationResponsive allowedRoles={"student"} /></ProtectedRoute>} />
                      <Route path="/student_family_background" element={<ProtectedRoute><StudentFamilyBackgroundResponsive allowedRoles={"student"} /></ProtectedRoute>} />
                      <Route path="/student_educational_attainment" element={<ProtectedRoute><StudentEducationalAttainmentResponsive allowedRoles={"student"} /></ProtectedRoute>} />
                      <Route path="/student_health_medical_records" element={<ProtectedRoute><StudentHealthMedicalRecordsResponsive allowedRoles={"student"} /></ProtectedRoute>} />
                      <Route path="/student_other_information" element={<ProtectedRoute><StudentOtherInformationResponsive allowedRoles={"student"} /></ProtectedRoute>} />
                      <Route path="/student_online_requirements" element={<ProtectedRoute><StudentOnlineRequirements allowedRoles={"student"} /></ProtectedRoute>} />
                      <Route path="/student_ecat_application_form" element={<ProtectedRoute allowedRoles={["student"]}><StudentECATApplicationForm /></ProtectedRoute>} />
                      <Route path="/student_personal_data_form" element={<ProtectedRoute allowedRoles={["student"]}><StudentPersonalDataForm /></ProtectedRoute>} />
                      <Route path="/student_office_of_the_registrar" element={<ProtectedRoute allowedRoles={["student"]}><StudentOfficeOfTheRegistrar /></ProtectedRoute>} />
                      <Route path="/student_services_survey" element={<ProtectedRoute allowedRoles={["student"]}><StudentServicesSurvey /></ProtectedRoute>} />
                      <Route path="/student_grade_file" element={<ProtectedRoute><StudentGradeFile /></ProtectedRoute>} />
                      <Route path="/student_curriculum_subjects" element={<ProtectedRoute allowedRoles={"student"}><StudentCurriculumSubjects /></ProtectedRoute>} />
                      <Route path="/student_history" element={<ProtectedRoute allowedRoles={"student"}><StudentHistory /></ProtectedRoute>} />

                      {/* ---------------------------------------------------------- */}
                      {/* SYSTEM MANAGEMENT                                          */}
                      {/* ---------------------------------------------------------- */}
                      <Route path="/signature_upload" element={<ProtectedRoute><SignatureUpload /></ProtectedRoute>} />
                      <Route path="/room_registration" element={<ProtectedRoute><RoomRegistration /></ProtectedRoute>} />
                      <Route path="/section_panel" element={<ProtectedRoute><SectionPanel /></ProtectedRoute>} />
                      <Route path="/year_level_panel" element={<ProtectedRoute><YearLevelPanel /></ProtectedRoute>} />
                      <Route path="/year_panel" element={<ProtectedRoute><YearPanel /></ProtectedRoute>} />
                      <Route path="/semester_panel" element={<ProtectedRoute><SemesterPanel /></ProtectedRoute>} />
                      <Route path="/school_year_panel" element={<ProtectedRoute><SchoolYearPanel /></ProtectedRoute>} />
                      <Route path="/audit_logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
                      <Route path="/requirements_form" element={<ProtectedRoute><RequirementsForm /></ProtectedRoute>} />
                      <Route path="/change_grade_period" element={<ProtectedRoute><ChangeGradingPeriod /></ProtectedRoute>} />
                      <Route path="/grade_conversion_admin" element={<ProtectedRoute><GradeConversionAdmin /></ProtectedRoute>} />
                      <Route path="/honors_report" element={<ProtectedRoute><HonorsReport /></ProtectedRoute>} />
                      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                      <Route path="/evaluation_crud" element={<ProtectedRoute><EvaluationCRUD /></ProtectedRoute>} />
                      <Route path="/settings" element={<ProtectedRoute><Settings onUpdate={fetchSettings} /></ProtectedRoute>} />
                      <Route path="/program_slot_limit" element={<ProtectedRoute><ProgramSlotLimit /></ProtectedRoute>} />
                      <Route path="/tosf_crud" element={<ProtectedRoute><TOSFCrud /></ProtectedRoute>} />
                      <Route path="/email_template_manager" element={<ProtectedRoute><EmailTemplateManager /></ProtectedRoute>} />
                      <Route path="/announcement" element={<ProtectedRoute><Announcement /></ProtectedRoute>} />
                      <Route path="/assign_receipt_counter" element={<ProtectedRoute><ReceiptCounterAssignment /></ProtectedRoute>} />
                      <Route path="/matriculation_payment" element={<ProtectedRoute><MatriculationPaymentModule /></ProtectedRoute>} />
                      <Route path="/student_balance_list" element={<ProtectedRoute><StudentBalanceList /></ProtectedRoute>} />
                      <Route path="/student_scholarship_list" element={<ProtectedRoute allowedRoles={["administrator", "superadmin", "technical"]}><StudentScholarshipList /></ProtectedRoute>} />
                      <Route path="/admin_branches" element={<ProtectedRoute><AdminBranches /></ProtectedRoute>} />
                    </Routes>
                  </main>
                </div>
              </div>

              <InactivityLogoutModal
                isAuthenticatedPage={isAuthenticated}
                accentColor={settings?.colors?.header}
                mainButtonColor={settings?.colors?.mainButton}
                onLogout={logout}
              />

              {/* Footer */}
              {!isCorExportRenderRoute && (
                <Box component="footer" sx={{ width: "100%", position: "fixed", bottom: 0, left: 0, zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: appColors.footer || "#ffffff", color: "white", textAlign: "center", padding: "12px 5px" }}>
                  <Typography style={{ fontSize: "11px" }}>{appBranding.footerText || ""}</Typography>
                </Box>
              )}
            </div>
          </Router>
        </Suspense>
      </SettingsContext.Provider>
    </ThemeProvider>
  );
}

export default App;
