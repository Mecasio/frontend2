import React, { useState, useEffect, useContext, forwardRef } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import { Box, Container, Snackbar, Alert } from "@mui/material";
import FreeTuitionImage from "../assets/FreeTuition.png";
import EaristLogo from "../assets/EaristLogo.png";
import "../styles/Print.css";
import LoadingOverlay from "../components/LoadingOverlay";
import { MdOutlinePayment } from "react-icons/md";
import { IoMdSchool } from "react-icons/io";
import API_BASE_URL from "../apiConfig";
import { formatYearSection } from "../utils/sectionDisplay";
import { formatCorStudentName } from "../utils/nameFormatters";
import {
  computeTotalAssessment,
  computeTuitionAmount,
  fetchResolvedFees,
  filterAssessedFeeLines,
  formatAmount,
  toNumber as toFeeNumber,
} from "../utils/corDynamicFees";

const CertificateOfRegistration = forwardRef(
  (
    {
      student_number,
      person_id,
      preload,
      containerId,
      onReady,
      suppressNotifications = false,
    },
    divToPrintRef,
  ) => {
    const settings = useContext(SettingsContext);
    const colors = settings?.colors || {};
    const branding = settings?.branding || {};
    const assets = settings?.assets || {};
    const headerColor = colors.header || "#1976d2";
    const [fetchedLogo, setFetchedLogo] = useState(null);
    const [companyName, setCompanyName] = useState("");
    const [branches, setBranches] = useState([]);
    const [snack, setSnack] = useState({
      open: false,
      message: "",
      severity: "",
    });

    const showSnackbar = (message, severity) => {
      if (suppressNotifications) return;
      setSnack({ open: true, message, severity });
    };
    const handleSnackClose = (_, reason) => {
      if (reason === "clickaway") return;
      setSnack((prev) => ({ ...prev, open: false }));
    };

    useEffect(() => {
      if (settings) {
        // ✅ load dynamic logo
        if (assets.logoUrl) {
          setFetchedLogo(`${assets.logoUrl}`);
        } else {
          setFetchedLogo(EaristLogo);
        }

        // ✅ load dynamic name + address
        if (branding.companyName) setCompanyName(branding.companyName);
        setBranches(settings?.branches || []);
      }
    }, [settings]);

    const words = companyName.trim().split(" ");
    const middle = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, middle).join(" ");
    const secondLine = words.slice(middle).join(" ");

    const [data, setData] = useState([]);
    const hasStudentData = Boolean(student_number?.trim() && data?.[0]);

    const [profilePicture, setProfilePicture] = useState(null);
    const [personID, setPersonID] = useState("");
    const [person, setPerson] = useState({
      profile_img: "",
      campus: "",
      academicProgram: "",
      classifiedAs: "",
      program: "",
      program2: "",
      program3: "",
      yearLevel: "",
      last_name: "",
      first_name: "",
      middle_name: "",
      extension: "",
      nickname: "",
      height: "",
      weight: "",
      lrnNumber: "",
      gender: "",
      pwdType: "",
      pwdId: "",
      birthOfDate: "",
      age: "",
      birthPlace: "",
      languageDialectSpoken: "",
      citizenship: "",
      religion: "",
      civilStatus: "",
      tribeEthnicGroup: "",
      cellphoneNumber: "",
      emailAddress: "",
      presentStreet: "",
      presentBarangay: "",
      presentZipCode: "",
      presentRegion: "",
      presentProvince: "",
      presentMunicipality: "",
      presentDswdHouseholdNumber: "",
      permanentStreet: "",
      permanentBarangay: "",
      permanentZipCode: "",
      permanentRegion: "",
      permanentProvince: "",
      permanentMunicipality: "",
      permanentDswdHouseholdNumber: "",
      father_family_name: "",
      father_given_name: "",
      father_middle_name: "",
      father_ext: "",
      father_contact: "",
      father_occupation: "",
      father_income: "",
      father_email: "",
      mother_family_name: "",
      mother_given_name: "",
      mother_middle_name: "",
      mother_contact: "",
      mother_occupation: "",
      mother_income: "",
      guardian: "",
      guardian_family_name: "",
      guardian_given_name: "",
      guardian_middle_name: "",
      guardian_ext: "",
      guardian_nickname: "",
      guardian_address: "",
      guardian_contact: "",
      guardian_email: "",
      generalAverage1: "",
    });

    const [campusAddress, setCampusAddress] = useState("");

    useEffect(() => {
      if (!settings) return;

      const branchId = person?.campus;
      const matchedBranch = branches.find(
        (branch) => String(branch?.id) === String(branchId),
      );

      if (matchedBranch?.address) {
        setCampusAddress(matchedBranch.address);
        return;
      }

      if (branding.campusAddress) {
        setCampusAddress(branding.campusAddress);
        return;
      }

      setCampusAddress(branding.campusAddress || "");
    }, [settings, branches, person?.campus]);

    const [approvedBy, setApprovedBy] = useState(null);
    const [approvedBySignatureMissing, setApprovedBySignatureMissing] =
      useState(false);
    const [qrCodeMissing, setQrCodeMissing] = useState(false);
    const [qrCodePathIndex, setQrCodePathIndex] = useState(0);
    const [qrCodeSrc, setQrCodeSrc] = useState("");
    const approvedBySignature =
      typeof approvedBy?.signature_image === "string"
        ? approvedBy.signature_image.trim()
        : "";
    const approvedBySignatureUrl = approvedBySignature
      ? `${API_BASE_URL}/uploads/${approvedBySignature}`
      : "";
    const showApprovedBySignature = Boolean(
      student_number && approvedBySignatureUrl && !approvedBySignatureMissing,
    );

    useEffect(() => {
      setApprovedBySignatureMissing(false);
    }, [approvedBySignatureUrl]);

    useEffect(() => {
      setQrCodeMissing(false);
      setQrCodePathIndex(0);
      setQrCodeSrc("");
    }, [student_number]);

    useEffect(() => {
      const fetchApprovedBy = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/signature-latest`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
          const data = await res.json();

          if (data.success) {
            setApprovedBy(data.data);
          }
        } catch (err) {
          console.error(err);
        }
      };

      fetchApprovedBy();
    }, []);

    useEffect(() => {
      axios
        .get(`${API_BASE_URL}/api/get_active_school_years`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
        .then((res) => setActiveSchoolYear(res.data))
        .catch((err) => console.error(err));
    }, []);

    useEffect(() => {
      if (person_id) {
        fetchPersonData(person_id);
      }
    }, [person_id]);

    // ✅ Fetch person data from backend
    const fetchPersonData = async (person_id) => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/person/enrollment_data/${person_id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        );
        setPerson(res.data);
      } catch (error) {
        console.error("Failed to fetch person:", error);
      }
    };

    const fetchProfilePicture = async (person_id) => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/user/${person_id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        if (res.data && res.data.profile_img) {
          setProfilePicture(
            `${API_BASE_URL}/uploads/Student1by1/${res.data.profile_img}`,
          );
        }
      } catch (error) {
        console.error("Error fetching profile picture:", error);
        setProfilePicture(null);
      }
    };

    useEffect(() => {
      if (personID) {
        fetchProfilePicture(personID);
      }
    }, [personID]);

    const [shortDate, setShortDate] = useState("");
    const [longDate, setLongDate] = useState("");

    useEffect(() => {
      const updateDates = () => {
        const now = new Date();

        // Format 1: MM/DD/YYYY
        const formattedShort = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;
        setShortDate(formattedShort);

        // Format 2: MM DD, YYYY hh:mm:ss AM/PM
        const day = String(now.getDate()).padStart(2, "0");
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const year = now.getFullYear();
        const hours = String(now.getHours() % 12 || 12).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        const ampm = now.getHours() >= 12 ? "PM" : "AM";

        const formattedLong = `${month} ${day}, ${year} ${hours}:${minutes}:${seconds} ${ampm}`;
        setLongDate(formattedLong);
      };

      updateDates(); // Set initial values
      const interval = setInterval(updateDates, 1000); // Update every second

      return () => clearInterval(interval); // Cleanup on unmount
    }, []);

    const [courses, setCourses] = useState([]);
    const [enrolled, setEnrolled] = useState([]);

    const [userId, setUserId] = useState(null); // Dynamic userId
    const [first_name, setUserFirstName] = useState(null); // Dynamic userId
    const [middle_name, setUserMiddleName] = useState(null); // Dynamic userId

    const [last_name, setUserLastName] = useState(null); // Dynamic userId
    const [currId, setCurr] = useState(null); // Dynamic userId
    const [courseCode, setCourseCode] = useState("");
    const [courseDescription, setCourseDescription] = useState("");

    const [sections, setSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState(null);

    const [subjectCounts, setSubjectCounts] = useState({});
    const [year_Level_Description, setYearLevelDescription] = useState(null);
    const [activeSchoolYear, setActiveSchoolYear] = useState([]);
    const [corActiveSchoolYearId, setCorActiveSchoolYearId] = useState("");
    const [major, setMajor] = useState(null);
    const [savedUnifast, setSavedUnifast] = useState(false);
    const [savedMatriculation, setSavedMatriculation] = useState(false);
    const [scholarshipTypes, setScholarshipTypes] = useState([]);
    const [selectedPaymentData, setSelectedPaymentData] = useState(null);

    // Track when all critical data is loaded
    const [dataLoaded, setDataLoaded] = useState({
      student: false,
      courses: false,
      enrolled: false,
      fees: false,
      qr: false,
    });

    useEffect(() => {
      if (selectedSection) {
        fetchSubjectCounts(selectedSection);
      }
    }, [selectedSection]);

    const fetchSubjectCounts = async (sectionId) => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/subject-enrollment-count`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
            params: { sectionId },
          },
        );

        // Transform into object for easy lookup: { subject_id: enrolled_count }
        const counts = {};
        response.data.forEach((item) => {
          counts[item.subject_id] = item.enrolled_count;
        });

        setSubjectCounts(counts);
      } catch (err) {
        console.error("Failed to fetch subject counts", err);
      }
    };

    useEffect(() => {
      // Reset load flags whenever the student changes so export doesn't
      // snapshot an empty subjects table from a previous render cycle.
      window.__COR_ENROLLED_READY = false;
      setDataLoaded({
        student: false,
        courses: false,
        enrolled: false,
        fees: false,
        qr: false,
      });
      setEnrolled([]);
      setCourses([]);
      setSavedUnifast(false);
      setSavedMatriculation(false);
    }, [student_number]);

    useEffect(() => {
      if (!student_number?.trim()) {
        setSavedUnifast(false);
        setSavedMatriculation(false);
        setSelectedPaymentData(null);
        return;
      }
      let cancelled = false;
      axios
        .get(
          `${API_BASE_URL}/api/payment-status/${encodeURIComponent(student_number)}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
        )
        .then((res) => {
          if (!cancelled) {
            setSavedUnifast(!!res.data?.saved_unifast);
            setSavedMatriculation(!!res.data?.saved_matriculation);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSavedUnifast(false);
            setSavedMatriculation(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [student_number]);

    useEffect(() => {
      if (!student_number?.trim() || (!savedUnifast && !savedMatriculation)) {
        setSelectedPaymentData(null);
        return;
      }

      let cancelled = false;
      const endpoint = savedUnifast
        ? "/get_student_data_unifast"
        : "/get_student_data_matriculation";

      const fetchSavedPaymentData = async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api${endpoint}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
          const rows = Array.isArray(res.data) ? res.data : [];
          const matched = rows
            .filter(
              (item) =>
                String(item?.student_number) === String(student_number) &&
                Number(item?.status) === 1 &&
                (!corActiveSchoolYearId ||
                  Number(
                    item?.active_school_year_id ??
                    item?.activeSchoolYearId ??
                    0,
                  ) === Number(corActiveSchoolYearId)),
            )
            .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));

          if (!cancelled) {
            setSelectedPaymentData(matched[0] || null);
          }
        } catch (error) {
          console.error("Failed to fetch saved payment data:", error);
          if (!cancelled) {
            setSelectedPaymentData(null);
          }
        }
      };

      fetchSavedPaymentData();

      return () => {
        cancelled = true;
      };
    }, [
      student_number,
      corActiveSchoolYearId,
      savedUnifast,
      savedMatriculation,
    ]);

    useEffect(() => {
      const fetchScholarship = async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/scholarship_types`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
          const activeTypes = Array.isArray(res.data)
            ? res.data.filter((item) => Number(item.scholarship_status) === 1)
            : [];
          setScholarshipTypes(activeTypes);
        } catch (error) {
          console.error("Error fetching scholarship types:", error);
        }
      };

      fetchScholarship();
    }, []);

    useEffect(() => {
      if (currId) {
        setDataLoaded((prev) => ({ ...prev, courses: false }));
        axios
          .get(`${API_BASE_URL}/api/courses/${currId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
          .then((res) => {
            setCourses(res.data);
            setDataLoaded((prev) => ({ ...prev, courses: true }));
          })
          .catch((err) => {
            console.error(err);
            setDataLoaded((prev) => ({ ...prev, courses: true })); // Mark as loaded even on error
          });
      }
    }, [currId]);

    useEffect(() => {
      if (!userId || !currId) {
        // Keep enrolled=false until student tagging has produced ids.
        // Marking true here caused PDF export before subjects finished loading.
        return;
      }

      let cancelled = false;
      setDataLoaded((prev) => ({ ...prev, enrolled: false }));
      setEnrolled([]);

      axios
        .get(`${API_BASE_URL}/api/enrolled_courses/${userId}/${currId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
          params: corActiveSchoolYearId
            ? { activeSchoolYearId: corActiveSchoolYearId }
            : {},
        })
        .then((res) => {
          if (cancelled) return;
          setEnrolled(Array.isArray(res.data) ? res.data : []);
          setDataLoaded((prev) => ({ ...prev, enrolled: true }));
          window.__COR_ENROLLED_READY = true;
          window.__COR_ENROLLED_COUNT = Array.isArray(res.data)
            ? res.data.length
            : 0;
        })
        .catch((err) => {
          console.error(err);
          if (cancelled) return;
          setEnrolled([]);
          setDataLoaded((prev) => ({ ...prev, enrolled: true }));
          window.__COR_ENROLLED_READY = true;
          window.__COR_ENROLLED_COUNT = 0;
        });

      return () => {
        cancelled = true;
      };
    }, [userId, currId, corActiveSchoolYearId]);

    // Fetch department sections when component mounts
    useEffect(() => {
      fetchDepartmentSections();
    }, []);

    // Fetch sections whenever selectedDepartment changes
    useEffect(() => {
      if (selectedDepartment) {
        fetchDepartmentSections();
      }
    }, [selectedDepartment]);

    // Fetch department sections based on selected department
    const fetchDepartmentSections = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${API_BASE_URL}/api/department-sections`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
            params: { departmentId: selectedDepartment },
          },
        );
        // Artificial delay
        setTimeout(() => {
          setSections(response.data);
          setLoading(false);
        }, 700); // 3 seconds delay
      } catch (err) {
        console.error("Error fetching department sections:", err);
        setError("Failed to load department sections");
        setLoading(false);
      }
    };

    const [gender, setGender] = useState(null);
    const [age, setAge] = useState(null);
    const [email, setEmail] = useState(null);
    const [program, setProgram] = useState(null);
    const [course_unit, setCourseUnit] = useState(null);
    const [lab_unit, setLabUnit] = useState(null);
    const [year_desc, setYearDescription] = useState(null);
    const [yearlevel, setYearLevelId] = useState("");
    const [isHaveNSTP, setIsHaveNSTP] = useState(0);
    const [isHaveComputerFees, setIsHaveComputerFees] = useState(0);
    const [isHaveLaboratory, setIsHaveLaboratory] = useState(0);
    const [totalLecFees, setTotalLecFees] = useState(0);
    const [totalLabFees, setTotalLabFees] = useState(0);
    const isFirstYear = Number(yearlevel) === 1;
    const isFirstSemester = Number(activeSchoolYear[0]?.semester_id) === 1;
    const isFirstYearFirstSem = isFirstYear && isFirstSemester;

    const applyTaggedStudent = (tagged) => {
      if (!tagged) return { studentNum: null, activeCurriculum: null };

      const studentNum =
        tagged.student_number ?? tagged.studentNumber ?? tagged.studentNum;
      const personId = tagged.person_id ?? tagged.person_id2 ?? tagged.personId;
      const activeCurriculumRaw =
        tagged.active_curriculum ?? tagged.activeCurriculum ?? tagged.program;
      const effectiveCurriculum =
        activeCurriculumRaw && activeCurriculumRaw !== 0
          ? activeCurriculumRaw
          : (tagged.program ?? activeCurriculumRaw);

      setTotalLecFees(Number(tagged.totalLecFee || 0));
      setTotalLabFees(Number(tagged.totalLabFee || 0));
      setIsHaveNSTP(Number(tagged.totalNstpCount || 0));
      setIsHaveComputerFees(Number(tagged.totalComputerLab || 0));
      setIsHaveLaboratory(Number(tagged.totalLaboratory || 0));

      setUserId(studentNum);
      setUserFirstName(tagged.first_name ?? tagged.firstName ?? "");
      setUserMiddleName(tagged.middle_name ?? tagged.middleName ?? "");
      setUserLastName(tagged.last_name ?? tagged.lastName ?? "");
      setCurr(effectiveCurriculum);
      setMajor(tagged.major || "");
      setDepartments(tagged.dprtmnt_name ?? tagged.departmentName ?? "");
      setCourseCode(tagged.program_code ?? tagged.courseCode ?? "");
      setCourseDescription(
        tagged.program_description ?? tagged.courseDescription ?? "",
      );
      setCourseUnit(tagged.courseUnit ?? tagged.course_unit ?? "");
      setLabUnit(tagged.labUnit ?? tagged.lab_unit ?? "");
      setPersonID(personId);
      setCorActiveSchoolYearId(
        tagged.active_school_year_id ??
        tagged.activeSchoolYearId ??
        tagged.corData?.active_school_year_id ??
        "",
      );
      setYearLevelDescription(
        tagged.year_level_description ?? tagged.yearLevelDescription ?? "",
      );
      setYearLevelId(tagged.year_level_id ?? tagged.yearLevel ?? "");
      setYearDescription(tagged.year_description ?? tagged.yearDesc ?? "");

      return { studentNum, activeCurriculum: effectiveCurriculum };
    };

    useEffect(() => {
      if (!student_number || !student_number.trim()) return; // don't run if empty

      const fetchStudent = async () => {
        try {
          let tagged = preload;

          if (!tagged) {
            const activeSchoolYearIdFromQuery =
              typeof window !== "undefined"
                ? new URLSearchParams(window.location.search).get(
                  "active_school_year_id",
                )
                : null;
            const response = await axios.post(
              `${API_BASE_URL}/api/student-tagging`,
              {
                studentNumber: student_number,
                ...(activeSchoolYearIdFromQuery
                  ? { active_school_year_id: activeSchoolYearIdFromQuery }
                  : {}),
              },
              { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}`, "Content-Type": "application/json" } },
            );
            tagged = response.data;
          }

          const { studentNum, activeCurriculum } = applyTaggedStudent(tagged);
          if (!studentNum && !student_number) return;

          const fullData = {
            ...(tagged.corData || {}),
            student_number: studentNum,
            first_name:
              tagged.first_name ??
              tagged.firstName ??
              tagged.corData?.first_name ??
              "",
            middle_name:
              tagged.middle_name ??
              tagged.middleName ??
              tagged.corData?.middle_name ??
              "",
            last_name:
              tagged.last_name ??
              tagged.lastName ??
              tagged.corData?.last_name ??
              "",
            extension: tagged.extension || tagged.corData?.extension || "",
            major: tagged.major || tagged.corData?.major || "",
            year_level_description:
              tagged.year_level_description ??
              tagged.yearLevelDescription ??
              tagged.corData?.year_level_description ??
              "",
            year_description:
              tagged.year_description ??
              tagged.yearDesc ??
              tagged.corData?.year_description ??
              "",
            curriculum_id: activeCurriculum,
            active_school_year_id:
              tagged.active_school_year_id ??
              tagged.activeSchoolYearId ??
              tagged.corData?.active_school_year_id ??
              "",
            program:
              activeCurriculum ||
              tagged.program ||
              tagged.corData?.program ||
              "",
            departmentName:
              tagged.dprtmnt_name ??
              tagged.departmentName ??
              tagged.corData?.departmentName ??
              "",
            dprtmnt_name:
              tagged.dprtmnt_name ??
              tagged.departmentName ??
              tagged.corData?.dprtmnt_name ??
              "",
            college:
              tagged.dprtmnt_name ??
              tagged.departmentName ??
              tagged.corData?.college ??
              "",
            age: tagged.age ?? tagged.corData?.age ?? "",
            gender: tagged.gender ?? tagged.corData?.gender ?? "",
            email:
              tagged.email ??
              tagged.corData?.email ??
              tagged.emailAddress ??
              "",
            emailAddress:
              tagged.emailAddress ??
              tagged.email ??
              tagged.corData?.emailAddress ??
              "",
          };

          setData([fullData]);
          setGender(fullData.gender ?? null);
          setAge(fullData.age ?? null);
          setEmail(fullData.email || fullData.emailAddress || null);
          setProgram(activeCurriculum);

          // Small delay to ensure state is updated before signaling ready
          setTimeout(() => {
            setDataLoaded((prev) => ({ ...prev, student: true }));
          }, 100);
        } catch (error) {
          console.error("Student search failed:", error);
          setDataLoaded((prev) => ({ ...prev, student: true })); // Mark as loaded even on error
        }
      };

      fetchStudent();
    }, [student_number, preload]);

    // Call onReady only when ALL critical data is loaded and rendered
    useEffect(() => {
      const allDataLoaded =
        dataLoaded.student &&
        dataLoaded.courses &&
        dataLoaded.enrolled &&
        dataLoaded.fees &&
        dataLoaded.qr;

      if (allDataLoaded && onReady && student_number) {
        // Student profile must be present before export snapshot.
        if (data.length === 0) {
          return;
        }

        // Add extra delay to ensure DOM is fully rendered with actual values
        const timer = setTimeout(() => {
          // Verify DOM actually has content rendered
          const checkContent = () => {
            if (containerId) {
              const container = document.getElementById(containerId);
              if (container) {
                const inputs = container.querySelectorAll("input");
                const filledInputs = Array.from(inputs).filter(
                  (inp) => inp.value && inp.value.trim() !== "",
                );
                const subjectRows = container.querySelectorAll(
                  "tr[data-cor-subject='1']",
                );

                // Prefer waiting until each enrolled subject is actually in the table.
                const hasSubjectRows =
                  enrolled.length === 0 ||
                  subjectRows.length >= enrolled.length;

                if (
                  (filledInputs.length > 5 && hasSubjectRows) ||
                  Date.now() > checkContent.startTime + 4000
                ) {
                  onReady(student_number);
                  return;
                }

                setTimeout(checkContent, 150);
                return;
              }
            }
            // Fallback - just signal ready
            onReady(student_number);
          };
          checkContent.startTime = Date.now();
          checkContent();
        }, 400);

        return () => clearTimeout(timer);
      }
    }, [dataLoaded, onReady, student_number, enrolled, data, containerId]);

    // Fetch all departments when component mounts
    useEffect(() => {
      const fetchDepartments = async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/departments`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
          setDepartments(res.data);
        } catch (err) {
          console.error("Error fetching departments:", err);
        }
      };

      fetchDepartments();
    }, []);

    const toWholeUnit = (value) => {
      const num = Number(value);
      return Number.isFinite(num) ? Math.round(num) : 0;
    };

    // Fixed label widths keep ":" and values vertically aligned within each column.
    const renderDetailField = (label, value, labelWidth) => (
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          fontFamily: "Arial",
          fontSize: "12px",
          width: "100%",
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontWeight: "bold",
            width: labelWidth,
            flexShrink: 0,
            whiteSpace: "nowrap",
            paddingRight: "20px",
            boxSizing: "content-box",
          }}
        >
          {label}
        </span>
        <span style={{ width: "12px", flexShrink: 0, textAlign: "left" }}>
          :
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>{value}</span>
      </div>
    );

    const LEFT_LABEL_WIDTH = "7.6em"; // fits "Email Address"
    const MID_LABEL_WIDTH = "6.2em"; // fits "Year Level"
    const RIGHT_LABEL_WIDTH = "10.5em"; // fits "Scholarship/Discount"
    const savedScholarshipLabel =
      selectedPaymentData?.scholarship_code ||
      selectedPaymentData?.scholarship_name ||
      selectedPaymentData?.matriculation_remark ||
      "";
    const scholarshipDiscountValue =
      savedScholarshipLabel || (savedUnifast ? "UNIFAST-FHE" : "");
    const isUnifastScholarship =
      savedUnifast ||
      (savedMatriculation &&
        /UNIFAST/i.test(String(savedScholarshipLabel || "")));
    const showFreeTuitionStamp = isUnifastScholarship;
    const qrCodePaths = student_number
      ? [
          `${API_BASE_URL}/uploads/QrCodeGenerated/${student_number}_qrcode.png`,
          `${API_BASE_URL}/uploads/StudentQRCodeGenerated/${student_number}_qrcode.png`,
        ]
      : [];

    useEffect(() => {
      let cancelled = false;

      setQrCodeMissing(false);
      setQrCodePathIndex(0);
      setQrCodeSrc("");
      setDataLoaded((prev) => ({ ...prev, qr: false }));

      if (!student_number?.trim()) {
        setDataLoaded((prev) => ({ ...prev, qr: true }));
        return () => {
          cancelled = true;
        };
      }

      const tryQrPath = (index) => {
        const nextSrc = qrCodePaths[index];
        if (!nextSrc) {
          if (!cancelled) {
            setQrCodeMissing(true);
            setDataLoaded((prev) => ({ ...prev, qr: true }));
          }
          return;
        }

        const image = new Image();
        image.onload = () => {
          if (cancelled) return;
          setQrCodePathIndex(index);
          setQrCodeSrc(nextSrc);
          setDataLoaded((prev) => ({ ...prev, qr: true }));
        };
        image.onerror = () => {
          if (cancelled) return;
          tryQrPath(index + 1);
        };
        image.src = nextSrc;
      };

      tryQrPath(0);

      return () => {
        cancelled = true;
      };
    }, [student_number]);

    const totalCourseUnits = enrolled.reduce(
      (sum, item) => sum + toWholeUnit(item.course_unit),
      0,
    );
    const totalLabUnits = enrolled.reduce(
      (sum, item) => sum + toWholeUnit(item.lab_unit),
      0,
    );
    const totalCombined = totalCourseUnits + totalLabUnits;

    const [resolvedFeeLines, setResolvedFeeLines] = useState([]);
    const [computedTuitionAmount, setComputedTuitionAmount] = useState(0);
    const [computedTotalAssessment, setComputedTotalAssessment] = useState(0);
    const shouldUseDynamicFees = resolvedFeeLines.length > 0;
    const savedFeeLines = Array.isArray(selectedPaymentData?.fee_lines)
      ? selectedPaymentData.fee_lines
      : [];
    const displayFeeLines = filterAssessedFeeLines(
      savedFeeLines.length ? savedFeeLines : resolvedFeeLines,
    );
    const hasSavedAssessment = Boolean(selectedPaymentData);
    const baseTotalAssessment = shouldUseDynamicFees
      ? computedTotalAssessment
      : Number(totalLecFees || 0) + Number(totalLabFees || 0);
    const displayTuitionAmount = hasSavedAssessment
      ? Number(selectedPaymentData?.tuition_fees || 0)
      : shouldUseDynamicFees
        ? computedTuitionAmount
        : Number(totalLecFees) + Number(totalLabFees);
    const savedNetAssessment = savedUnifast
      ? 0
      : Number(selectedPaymentData?.total_tosf || 0);
    const displayTotalAssessment = baseTotalAssessment;
    const displayFinancialAidAmount = hasSavedAssessment
      ? Math.max(baseTotalAssessment - savedNetAssessment, 0)
      : "";
    const displayNetAssessment = hasSavedAssessment ? savedNetAssessment : "";
    const [curriculumOptions, setCurriculumOptions] = useState([]);

    useEffect(() => {
      const fetchCurriculums = async () => {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/api/applied_program`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
          );
          setCurriculumOptions(response.data);
        } catch (error) {
          console.error("Error fetching curriculum options:", error);
        }
      };

      fetchCurriculums();
    }, []);

    {
      curriculumOptions.find(
        (item) =>
          item?.curriculum_id?.toString() ===
          (person?.program ?? "").toString(),
      )?.program_description ||
        (person?.program ?? "");
    }

    useEffect(() => {
      if (
        !data[0] ||
        !currId ||
        yearlevel === "" ||
        yearlevel == null
      ) {
        if (dataLoaded.student) {
          setResolvedFeeLines([]);
          setComputedTuitionAmount(0);
          setComputedTotalAssessment(0);
          setDataLoaded((prev) => ({ ...prev, fees: true }));
        }
        return;
      }

      let cancelled = false;
      setDataLoaded((prev) => ({ ...prev, fees: false }));

      const resolveStudentFees = async () => {
        try {
          const tuitionAmount =
            Number(totalLecFees || 0) + Number(totalLabFees || 0);
          const result = await fetchResolvedFees({
            tuitionAmount,
            branchId: person?.campus || "",
            curriculumId: currId,
            yearLevelId: yearlevel,
            hasNstp: isHaveNSTP !== 0,
            nstpCount: isHaveNSTP,
            hasComputer: isHaveComputerFees,
            hasLaboratory: isHaveLaboratory,
            firstYearFirstSem: isFirstYearFirstSem,
          });
          const tuition = computeTuitionAmount({
            yearLevelId: yearlevel,
            hasNstpSubject: isHaveNSTP !== 0,
            totalLecFees,
            totalLabFees,
            resolvedFeeLines: result.feeLines,
          });

          if (cancelled) return;
          setResolvedFeeLines(result.feeLines);
          setComputedTuitionAmount(tuition);
          setComputedTotalAssessment(
            computeTotalAssessment(tuition, result.feeLines),
          );
        } catch (error) {
          if (cancelled) return;
          console.error("Error resolving assessed fees:", error);
          setResolvedFeeLines([]);
          setComputedTuitionAmount(0);
          setComputedTotalAssessment(0);
        } finally {
          if (!cancelled) {
            setDataLoaded((prev) => ({ ...prev, fees: true }));
          }
        }
      };

      resolveStudentFees();

      return () => {
        cancelled = true;
      };
    }, [
      data,
      currId,
      yearlevel,
      totalLabFees,
      totalLecFees,
      person?.campus,
      isHaveNSTP,
      isHaveComputerFees,
      isHaveLaboratory,
      isFirstYearFirstSem,
      dataLoaded.student,
    ]);

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
      <Container
        maxWidth={false}
        disableGutters
        className="mb-[4rem]"
        sx={{
          display: "flex",
          justifyContent: "center",
          px: 1,
          py: 2,
        }}
      >
        <div className="flex-container">
          <div className="section">
            <Box></Box>

            <div ref={divToPrintRef} className="certificate-wrapper">
              <style>
                {`
                .certificate-wrapper {
                  position: relative;
                  /* Wider than A4: Rules gap + Faculty cols + student-info column gutter */
                  width: calc((210mm + 6.5rem) * 44 / 42 + 3rem);
                  min-height: 297mm;
                  max-width: calc((210mm + 6.5rem) * 44 / 42 + 3rem);
                  margin: 0 auto;
                  box-sizing: border-box;
                  background: #fff;
                  overflow: visible;
                }

                .certificate-wrapper > .section,
                .certificate-wrapper table,
                .certificate-wrapper .fee-table-con,
                .certificate-wrapper .student-table {
                  width: 100% !important;
                  max-width: 100% !important;
                  margin-left: 0 !important;
                  margin-right: 0 !important;
                  box-sizing: border-box;
                }

                @media print {
                  @page {
                    size: A4;
                    margin: 0;
                  }
                  button {
                    display: none;
                  }
                  .certificate-wrapper {
                    width: calc((210mm + 6.5rem) * 44 / 42 + 3rem);
                    min-height: 297mm;
                    padding: var(--cor-print-margin, 0 0.25in);
                  }
                  .fee-table-con {
                    width: 100% !important;
                  }
                  .Box {
                    display: none;
                  }
                }
              `}
              </style>

              <div className="section">
                <table
                  className="student-table"
                  style={{
                    borderCollapse: "collapse",
                    fontFamily: "Arial",
                    width: "100%",
                    margin: "0 auto", // Center the table inside the form
                    textAlign: "center",
                    tableLayout: "fixed",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        colSpan={2}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      >
                        <b></b>
                      </td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                      <td
                        colSpan={1}
                        style={{ height: "0.1in", fontSize: "72.5%" }}
                      ></td>
                    </tr>
                    <tr>
                      <td
                        colSpan={2}
                        style={{ height: "0.1in", fontSize: "62.5%" }}
                      ></td>
                    </tr>
                    <tr>
                      <td
                        colSpan={40}
                        style={{ height: "0.5in", textAlign: "center" }}
                      >
                        <table
                          width="100%"
                          style={{ borderCollapse: "collapse" }}
                        >
                          <tbody>
                            <tr>
                              <td style={{ width: "20%", textAlign: "center" }}>
                                <img
                                  src={fetchedLogo || EaristLogo}
                                  alt="School Logo"
                                  style={{
                                    marginLeft: "10px",
                                    width: "140px",
                                    height: "140px",
                                    borderRadius: "50%", // ? makes it circular
                                    objectFit: "cover",
                                  }}
                                />
                              </td>
                              <td
                                style={{
                                  width: "60%",
                                  textAlign: "center",
                                  lineHeight: "1",
                                  fontFamily: "Arial",
                                }}
                              >
                                <div
                                  style={{
                                    fontFamily: "Arial",
                                    fontSize: "13px",
                                  }}
                                >
                                  Republic of the Philippines
                                </div>
                                <div
                                  style={{
                                    fontWeight: "bold",
                                    fontFamily: "Arial",
                                    fontSize: "16px",
                                    textTransform: "Uppercase",
                                  }}
                                >
                                  {firstLine}
                                </div>
                                {secondLine && (
                                  <div
                                    style={{
                                      fontWeight: "bold",
                                      fontFamily: "Arial",
                                      fontSize: "16px",
                                      textTransform: "Uppercase",
                                    }}
                                  >
                                    {secondLine}
                                  </div>
                                )}
                                <div
                                  style={{
                                    fontFamily: "Arial",
                                    fontSize: "13px",
                                  }}
                                >
                                  {campusAddress}</div>

                                {/* Add spacing here */}
                                <div style={{ marginTop: "30px" }}>
                                  <b
                                    style={{
                                      fontSize: "20px",
                                      letterSpacing: "2px",
                                    }}
                                  >
                                    CERTIFICATE OF REGISTRATION
                                  </b>
                                </div>
                              </td>
                              <td
                                colSpan={4}
                                rowSpan={6}
                                style={{
                                  textAlign: "center",
                                  position: "relative",
                                  width: "4.5cm",
                                  height: "4.5cm",
                                }}
                              >
                                <div
                                  style={{
                                    width: "3.80cm",
                                    height: "3.80cm",
                                    marginRight: "30px",
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    position: "relative",
                                    border: "1px solid #ccc",
                                  }}
                                >
                                  {profilePicture ? (
                                    <img
                                      src={profilePicture}
                                      alt="Profile"
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                      }}
                                    />
                                  ) : (
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        color: "#666",
                                      }}
                                    >
                                      No Profile Picture Found
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan={10}
                        style={{
                          height: "0.1in",
                          fontSize: "55%",
                          textAlign: "start",
                        }}
                      >
                        <b
                          style={{
                            fontFamily: "Arial",
                            fontSize: "12px",
                            color: "black",
                            textAlign: "start",
                            marginLeft: "25px",
                          }}
                        >
                          Registration No:&nbsp;
                          <span style={{ color: "red" }}></span>
                        </b>
                      </td>
                      <td
                        colSpan={30}
                        style={{
                          height: "0.1in",
                          fontSize: "50%",
                          textAlign: "right",
                        }}
                      >
                        <b
                          style={{
                            fontFamily: "Arial",
                            fontSize: "12px",
                            color: "black",
                          }}
                        >
                          Academic Year/Term :{" "}
                          <span style={{ color: "red", fontWeight: "bold" }}>
                            {(() => {
                              const term =
                                (corActiveSchoolYearId
                                  ? activeSchoolYear.find(
                                    (y) =>
                                      String(y.id) ===
                                      String(corActiveSchoolYearId),
                                  )
                                  : null) || activeSchoolYear[0];
                              if (!term) return "";
                              const year = Number(term.year_description);
                              const nextYear = Number.isFinite(year)
                                ? year + 1
                                : "";
                              const semester = term.semester_description || "";
                              if (!semester && !year) return "";
                              return `${semester} AY ${year || ""} - ${nextYear}`.trim();
                            })()}
                          </span>
                        </b>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table
                  style={{
                    borderLeft: "1px solid black",
                    borderTop: "1px solid black",
                    borderRight: "1px solid black",
                    borderCollapse: "collapse",
                    fontFamily: "Arial",
                    width: "100%",
                    margin: "0 auto", // Center the table inside the form
                    textAlign: "center",
                    tableLayout: "fixed",
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        colSpan={44}
                        style={{
                          height: "0.2in",
                          fontSize: "72.5%",
                          backgroundColor: "gray",
                          color: "white",
                          width: "100%",
                        }}
                      >
                        <b>
                          <b
                            style={{
                              border: "1px solid black",
                              color: "black",
                              fontFamily: "Arial",
                              fontSize: "12px",
                              textAlign: "center",
                              display: "block",
                              width: "100%",
                              boxSizing: "border-box",
                            }}
                          >
                            STUDENT GENERAL INFORMATION
                          </b>
                        </b>
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan={15}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px",
                        }}
                      >
                        {renderDetailField(
                          "Student No",
                          data[0]?.student_number || "",
                          LEFT_LABEL_WIDTH,
                        )}
                      </td>
                      <td
                        colSpan={29}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px 1px calc(4px + 3rem)",
                        }}
                      >
                        {renderDetailField(
                          "College",
                          data[0]?.college || "",
                          MID_LABEL_WIDTH,
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan={15}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px",
                        }}
                      >
                        {renderDetailField(
                          "Name",
                          <span>
                            {formatCorStudentName({
                              lastName: data[0]?.last_name,
                              firstName: data[0]?.first_name,
                              middleName: data[0]?.middle_name,
                              extension: data[0]?.extension,
                            })}
                          </span>,
                          LEFT_LABEL_WIDTH,
                        )}
                      </td>
                      <td
                        colSpan={29}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px 1px calc(4px + 3rem)",
                        }}
                      >
                        {renderDetailField(
                          "Program",
                          (() => {
                            const match = curriculumOptions.find(
                              (item) =>
                                item?.curriculum_id?.toString() ===
                                (data[0]?.program ?? "").toString(),
                            );
                            return match
                              ? match.program_description
                              : (data[0]?.program ?? "");
                          })(),
                          MID_LABEL_WIDTH,
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan={15}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px",
                        }}
                      >
                        {renderDetailField(
                          "Gender",
                          data[0]?.gender === 0 ||
                            String(data[0]?.gender) === "0"
                            ? "Male"
                            : data[0]?.gender === 1 ||
                              String(data[0]?.gender) === "1"
                              ? "Female"
                              : "",
                          LEFT_LABEL_WIDTH,
                        )}
                      </td>
                      <td
                        colSpan={13}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px 1px calc(4px + 3rem)",
                        }}
                      >
                        {renderDetailField(
                          "Major",
                          major
                            ? major.charAt(0).toUpperCase() +
                            major.slice(1).toLowerCase()
                            : "",
                          MID_LABEL_WIDTH,
                        )}
                      </td>
                      <td
                        colSpan={16}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px",
                        }}
                      >
                        {renderDetailField(
                          "Curriculum",
                          year_desc ? `${year_desc}-${year_desc + 1}` : "",
                          RIGHT_LABEL_WIDTH,
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan={15}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px",
                        }}
                      >
                        {renderDetailField(
                          "Age",
                          data[0]?.age || "",
                          LEFT_LABEL_WIDTH,
                        )}
                      </td>
                      <td
                        colSpan={13}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px 1px calc(4px + 3rem)",
                        }}
                      >
                        {renderDetailField(
                          "Year Level",
                          year_Level_Description || "",
                          MID_LABEL_WIDTH,
                        )}
                      </td>
                      <td
                        colSpan={16}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px",
                        }}
                      >
                        {renderDetailField(
                          "Scholarship/Discount",
                          scholarshipDiscountValue,
                          RIGHT_LABEL_WIDTH,
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan={44}
                        style={{
                          fontSize: "12px",
                          textAlign: "left",
                          padding: "1px 4px",
                        }}
                      >
                        {renderDetailField(
                          "Email Address",
                          data[0]?.email || "",
                          LEFT_LABEL_WIDTH,
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan={5}
                        rowSpan={2}
                        style={{
                          color: "black",
                          height: "0.3in",
                          fontFamily: "Arial",
                          fontSize: "12px",
                          fontWeight: "bold",

                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginTop: "-1px",
                          }}
                        >
                          CODE
                        </div>
                      </td>
                      <td
                        colSpan={13}
                        rowSpan={2}
                        style={{
                          color: "black",
                          height: "0.3in",
                          fontFamily: "Arial",
                          fontSize: "12px",
                          fontWeight: "bold",
                          backgroundColor: "gray",
                          border: "1px solid black",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginTop: "-1px",
                          }}
                        >
                          SUBJECT TITLE
                        </div>
                      </td>

                      <td
                        colSpan={8}
                        style={{
                          color: "black",
                          height: "0.2in",
                          fontFamily: "Arial",
                          fontSize: "12px",
                          fontWeight: "bold",

                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginTop: "-1px",
                          }}
                        >
                          UNIT
                        </div>
                      </td>

                      <td
                        colSpan={4}
                        rowSpan={2}
                        style={{
                          color: "black",
                          height: "0.3in",
                          fontFamily: "Arial",
                          fontSize: "12px",
                          fontWeight: "bold",

                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginTop: "-1px",
                          }}
                        >
                          SECTION
                        </div>
                      </td>
                      <td
                        colSpan={7}
                        rowSpan={2}
                        style={{
                          color: "black",
                          height: "0.3in",
                          fontSize: "12px",
                          fontWeight: "bold",
                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginTop: "-1px",
                          }}
                        >
                          SCHEDULE ROOM
                        </div>
                      </td>
                      <td
                        colSpan={7}
                        rowSpan={2}
                        style={{
                          color: "black",
                          height: "0.3in",
                          fontFamily: "Arial",
                          fontSize: "12px",
                          fontWeight: "bold",
                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            marginTop: "-1px",
                          }}
                        >
                          FACULTY
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan={2}
                        style={{
                          color: "black",
                          height: "0.1in",
                          fontSize: "12px",
                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          padding: 0,
                          letterSpacing: "-0.3px",
                        }}
                      >
                        Lec
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          color: "black",
                          height: "0.1in",
                          fontSize: "12px",
                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          padding: 0,
                          letterSpacing: "-0.3px",
                        }}
                      >
                        Lab
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          color: "black",
                          height: "0.1in",
                          fontSize: "12px",
                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          padding: 0,
                          letterSpacing: "-0.3px",
                        }}
                      >
                        Credit
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          color: "black",
                          height: "0.1in",
                          fontSize: "12px",
                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          padding: 0,
                          letterSpacing: "-0.3px",
                        }}
                      >
                        Tuition
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          color: "black",
                          height: "0.1in",
                          fontSize: "50%",
                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                          display: "none",
                        }}
                      >
                        Lec Value
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          color: "black",
                          height: "0.1in",
                          fontSize: "50%",
                          backgroundColor: "gray",
                          border: "1px solid black",
                          textAlign: "center",
                          display: "none",
                        }}
                      >
                        Lab Value
                      </td>
                    </tr>
                    {enrolled.map((item, index) => (
                      <tr key={index} data-cor-subject="1">
                        <td colSpan={5} style={{ border: "1px solid black" }}>
                          <input
                            type="text"
                            value={item.course_code || ""}
                            readOnly
                            style={{
                              width: "98%",
                              border: "none",
                              textAlign: "center",
                              background: "none",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td
                          colSpan={13}
                          style={{
                            border: "1px solid black",
                            verticalAlign: "middle",
                            padding: "1px 4px",
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              textAlign: "left",
                              fontSize: "12px",
                              lineHeight: 1.15,
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              overflowWrap: "anywhere",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {item.course_description || ""}
                          </div>
                        </td>
                        <td colSpan={2} style={{ border: "1px solid black" }}>
                          <input
                            type="text"
                            value={
                              item.course_unit == null
                                ? ""
                                : toWholeUnit(item.course_unit)
                            }
                            readOnly
                            style={{
                              width: "98%",
                              border: "none",
                              background: "none",
                              textAlign: "center",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td colSpan={2} style={{ border: "1px solid black" }}>
                          <input
                            type="text"
                            value={
                              item.lab_unit == null
                                ? ""
                                : toWholeUnit(item.lab_unit)
                            }
                            readOnly
                            style={{
                              width: "98%",
                              border: "none",
                              background: "none",
                              textAlign: "center",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td colSpan={2} style={{ border: "1px solid black" }}>
                          <input
                            type="text"
                            value={
                              toWholeUnit(item.course_unit) +
                              toWholeUnit(item.lab_unit)
                            }
                            style={{
                              width: "98%",
                              border: "none",
                              background: "none",
                              textAlign: "center",
                              fontSize: "12px",
                            }}
                            readOnly
                          />
                        </td>

                        <td colSpan={2} style={{ border: "1px solid black" }}>
                          <input
                            type="text"
                            value={
                              toWholeUnit(item.course_unit) +
                              toWholeUnit(item.lab_unit)
                            }
                            style={{
                              width: "98%",
                              border: "none",
                              background: "none",
                              textAlign: "center",
                              fontSize: "12px",
                            }}
                            readOnly
                          />
                        </td>
                        <td
                          colSpan={2}
                          style={{ border: "1px solid black", display: "none" }}
                        >
                          <input
                            type="text"
                            value={item.total_lec_value ?? ""}
                            readOnly
                            style={{
                              width: "98%",
                              border: "none",
                              background: "none",
                              textAlign: "center",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td
                          colSpan={2}
                          style={{ border: "1px solid black", display: "none" }}
                        >
                          <input
                            type="text"
                            value={item.total_lab_value ?? ""}
                            readOnly
                            style={{
                              width: "98%",
                              border: "none",
                              background: "none",
                              textAlign: "center",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td
                          colSpan={4}
                          style={{
                            border: "1px solid black",
                            height: "26px",
                            maxHeight: "26px",
                            padding: 0,
                            verticalAlign: "middle",
                            overflow: "hidden",
                            lineHeight: 1,
                          }}
                        >
                          {(() => {
                            const program = String(item.program_code || "")
                              .trim()
                              .replace(/^TBA$/i, "");
                            const sectionOnly = formatYearSection(
                              item.year_level_id ?? yearlevel,
                              item.section_description ??
                                item.section ??
                                item.description,
                            ).replace(/^TBA$/i, "");
                            const line1 = program || sectionOnly || "TBA";
                            const line2 =
                              program && sectionOnly && sectionOnly !== program
                                ? sectionOnly
                                : "";
                            const sectionFontSize = line2 ? "10px" : "12px";
                            const sectionLineHeight = line2 ? "11px" : "13px";

                            return (
                              <div
                                style={{
                                  width: "100%",
                                  height: line2 ? "22px" : "26px",
                                  maxHeight: line2 ? "22px" : "26px",
                                  overflow: "hidden",
                                  textAlign: "center",
                                  fontSize: sectionFontSize,
                                  lineHeight: sectionLineHeight,
                                }}
                              >
                                <div
                                  style={{
                                    height: sectionLineHeight,
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {line1}
                                </div>
                                {line2 ? (
                                  <div
                                    style={{
                                      height: sectionLineHeight,
                                      overflow: "hidden",
                                      whiteSpace: "nowrap",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {line2}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })()}
                        </td>
                        <td colSpan={7} style={{ border: "1px solid black" }}>
                          <input
                            type="text"
                            value={`${item.day_description} ${item.school_time_start}-${item.school_time_end}`}
                            readOnly
                            style={{
                              width: "98%",
                              border: "none",
                              background: "none",
                              textAlign: "center",
                              fontSize: "12px",
                            }}
                          />
                        </td>
                        <td
                          colSpan={7}
                          style={{
                            border: "1px solid black",
                            verticalAlign: "middle",
                            padding: "1px 4px",
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              textAlign: "center",
                              fontSize: "12px",
                              lineHeight: 1.15,
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              overflowWrap: "anywhere",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {[item.lname, item.fname]
                              .map((part) => String(part || "").trim())
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td
                        colSpan={12}
                        style={{
                          height: "0.1in",
                          fontSize: "11px",
                          color: "black",
                          textAlign: "left",
                        }}
                      >
                        <b>Note: Subject marked with "*" is Special Subject</b>
                      </td>
                      <td
                        colSpan={6}
                        style={{
                          fontSize: "11px",
                          color: "black",
                          textAlign: "CENTER",
                        }}
                      >
                        <b>Total Unit(s)</b>
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          fontSize: "12px",
                          color: "black",
                          fontFamily: "Arial",
                          textAlign: "center",
                        }}
                      >
                        {totalCourseUnits}
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          fontSize: "12px",
                          color: "black",
                          fontFamily: "Arial",
                          textAlign: "center",
                        }}
                      >
                        {totalLabUnits}
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          fontSize: "12px",
                          color: "black",
                          fontFamily: "Arial",
                          textAlign: "center",
                        }}
                      >
                        {totalCourseUnits + totalLabUnits}
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          fontSize: "12px",
                          color: "black",
                          fontFamily: "Arial",
                          textAlign: "center",
                        }}
                      >
                        {totalCombined}
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          fontSize: "12px",
                          color: "black",
                          fontFamily: "Arial",
                          textAlign: "center",
                          display: "none",
                        }}
                      >
                        {totalLecFees}
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          fontSize: "12px",
                          color: "black",
                          fontFamily: "Arial",
                          textAlign: "center",
                          display: "none",
                        }}
                      >
                        {totalLabFees}
                      </td>

                      <td
                        colSpan={4}
                        style={{
                          height: "0.1in",
                          fontSize: "55%",
                          color: "black",
                          textAlign: "center",
                        }}
                      ></td>
                      <td
                        colSpan={7}
                        style={{
                          height: "0.1in",
                          fontSize: "55%",
                          color: "black",
                          textAlign: "center",
                        }}
                      ></td>
                      <td
                        colSpan={7}
                        style={{
                          height: "0.1in",
                          fontSize: "55%",
                          color: "black",
                          textAlign: "center",
                        }}
                      ></td>
                    </tr>
                    <tr
                      colSpan={12}
                      style={{
                        color: "white",

                        height: "0.1in",
                        fontSize: "62.5%",
                        backgroundColor: "gray",
                        textAlign: "center",
                      }}
                    ></tr>
                  </tbody>
                </table>

                <div
                  className="fee-table-con"
                  style={{
                    display: "flex",
                    width: "100%",
                    margin: "0 auto",
                    alignItems: "flex-start",
                    gap: "6.5rem",
                    borderLeft: "1px solid black",
                    borderRight: "1px solid black",
                  }}
                >
                  <div
                    style={{
                      flex: "1 1 0",
                      minWidth: 0,
                      paddingLeft: "4px",
                      boxSizing: "border-box",
                    }}
                  >
                    <table
                      className="fee-table"
                      style={{
                        borderCollapse: "collapse",
                        fontFamily: "Arial",
                        width: "100%",
                        textAlign: "center",
                        tableLayout: "fixed",
                        borderLeft: "none",
                        borderRight: "none",
                        borderBottom: "none",
                        borderTop: "1px solid black",
                      }}
                    >
                      <style>{`

                        .fee-table td {
                          padding-top: 0px;
                          padding-bottom: 0px;
                        }
                        .fee-table input {
                          padding-top: 0px;
                          padding-bottom: 0px;
                          line-height: 1;
                        }
                      `}</style>
                      <tbody>
                        <tr>
                          <td
                            colSpan={20}
                            style={{
                              margin: "0px",
                              padding: "0px",
                              fontSize: "63.5%",
                              border: "1px solid black",
                              backgroundColor: "gray",
                              height: "auto",
                            }}
                          >
                            <input
                              type="text"
                              value={"A S S E S S E D  F E E S"}
                              readOnly
                              style={{
                                color: "black",
                                fontWeight: "bold",
                                margin: "0px",
                                padding: "0px",
                                textAlign: "center",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                                height: "auto",
                                lineHeight: "1",
                              }}
                            />
                          </td>
                        </tr>

                        <tr
                          style={{
                            borderLeft: "1px solid black",
                            height: "2px",
                            borderRight: "1px solid black",
                          }}
                        >
                          <td colSpan={20}></td>
                        </tr>

                        <tr style={{ height: "2px" }}>
                          <td
                            colSpan={15}
                            style={{
                              padding: 0,
                              borderLeft: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={`Tuition (${totalCourseUnits} unit(s))`}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "60.5%",
                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={formatAmount(displayTuitionAmount)}
                              readOnly
                              style={{
                                textAlign: "center",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                color: "black",
                                width: "100%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        {displayFeeLines.map((fee, index) => (
                          <tr
                            key={
                              fee.fee_rate_id ||
                              fee.fee_code ||
                              `${fee.fee_name || "fee"}-${index}`
                            }
                          >
                            <td
                              colSpan={15}
                              style={{
                                fontSize: "62.5%",
                                borderLeft: "1px solid black",
                              }}
                            >
                              <input
                                type="text"
                                value={fee.fee_name || ""}
                                readOnly
                                style={{
                                  color: "black",
                                  width: "98%",
                                  border: "none",
                                  fontFamily: "Arial",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  outline: "none",
                                  background: "none",
                                }}
                              />
                            </td>
                            <td
                              colSpan={5}
                              style={{
                                fontSize: "62.5%",
                                borderRight: "1px solid black",
                              }}
                            >
                              <input
                                type="text"
                                value={formatAmount(fee.amount)}
                                readOnly
                                style={{
                                  textAlign: "center",
                                  fontFamily: "Arial",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  color: "black",
                                  width: "98%",
                                  border: "none",
                                  outline: "none",
                                  background: "none",
                                }}
                              />
                            </td>
                          </tr>
                        ))}

                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",
                              borderLeft: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={13}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                textAlign: "left",
                                color: "black",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              marginRight: "20px",
                              borderLeft: "1px solid black",
                            }}
                          ></td>
                          <td
                            colSpan={13}
                            style={{
                              fontSize: "62.5%",
                            }}
                          >
                            <input
                              type="text"
                              value={"Total Assessment : "}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={formatAmount(displayTotalAssessment)}
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              marginRight: "20px",
                              borderLeft: "1px solid black",
                            }}
                          ></td>
                          <td
                            colSpan={13}
                            style={{
                              fontSize: "62.5%",
                            }}
                          >
                            <input
                              type="text"
                              value={"Less Financial Aid : "}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={
                                displayFinancialAidAmount === ""
                                  ? ""
                                  : formatAmount(displayFinancialAidAmount)
                              }
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              marginRight: "20px",
                              borderLeft: "1px solid black",
                            }}
                          ></td>
                          <td
                            colSpan={13}
                            style={{
                              fontSize: "62.5%",
                            }}
                          >
                            <input
                              type="text"
                              value={"Net Assessed : "}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={
                                displayNetAssessment === ""
                                  ? ""
                                  : formatAmount(displayNetAssessment)
                              }
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              marginRight: "20px",
                              borderLeft: "1px solid black",
                            }}
                          ></td>
                          <td
                            colSpan={13}
                            style={{
                              fontSize: "62.5%",
                            }}
                          >
                            <input
                              type="text"
                              value={"Credit Memo : "}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              marginRight: "20px",
                              borderLeft: "1px solid black",
                            }}
                          ></td>
                          <td
                            colSpan={13}
                            style={{
                              fontSize: "62.5%",
                            }}
                          >
                            <input
                              type="text"
                              value={"Total Discount : "}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              marginRight: "20px",
                              borderLeft: "1px solid black",
                            }}
                          ></td>
                          <td
                            colSpan={13}
                            style={{
                              fontSize: "62.5%",
                            }}
                          >
                            <input
                              type="text"
                              value={"Total Payment : "}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={5}
                            style={{
                              fontSize: "62.5%",
                              marginRight: "20px",

                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={2}
                            style={{
                              marginRight: "20px",
                              borderLeft: "1px solid black",
                            }}
                          ></td>
                          <td
                            colSpan={18}
                            style={{
                              fontSize: "62.5%",
                              borderRight: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"Outstanding Balance : "}
                              readOnly
                              style={{
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr
                          style={{
                            borderLeft: "1px solid black",
                            height: "5px",
                            borderRight: "1px solid black",
                          }}
                        >
                          <td></td>
                        </tr>

                        <tr>
                          <td
                            colSpan={20}
                            style={{
                              margin: "0px",
                              padding: "0px",
                              fontSize: "63.5%",
                              border: "1px solid black",
                              backgroundColor: "gray",
                              height: "auto",
                            }}
                          >
                            <input
                              type="text"
                              value={"S C H E D U L E O F P A Y M E N T"}
                              readOnly
                              style={{
                                color: "black",
                                fontWeight: "bold",
                                margin: "0px",
                                padding: "0px",
                                textAlign: "center",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                                lineHeight: "1",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={7}
                            style={{
                              fontSize: "62.5%",
                              border: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"1st Payment/Due"}
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={6}
                            style={{
                              border: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"2nd Payment/Due"}
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                fontWeight: "bold",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={7}
                            style={{
                              border: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              value={"3rd Payment/Due"}
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                fontWeight: "bold",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={7}
                            style={{
                              fontSize: "62.5%",
                              border: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                color: "black",
                                fontWeight: "bold",
                                textAlign: "center",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={6}
                            style={{
                              fontSize: "62.5%",
                              border: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                fontWeight: "bold",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={7}
                            style={{
                              fontSize: "62.5%",
                              border: "1px solid black",
                            }}
                          >
                            <input
                              type="text"
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                width: "98%",
                                fontWeight: "bold",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={12}
                            style={{
                              fontSize: "62.5%",
                            }}
                          >
                            <input
                              type="text"
                              value={"Payment/Validation Date : "}
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                width: "98%",
                                fontWeight: "bold",
                                textDecorationThickness: "2px", // <-- Thicker underline

                                fontFamily: "Arial",
                                fontSize: "12px",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={8}
                            style={{
                              height: "0.25in",
                              fontSize: "12px",
                              fontFamily: "Arial",
                              textAlign: "center",
                              verticalAlign: "middle",
                            }}
                          >
                            <input
                              type="text"
                              value={
                                savedUnifast || savedMatriculation
                                  ? shortDate
                                  : ""
                              }
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                width: "100%", // ensures full-width underline
                                border: "none",
                                outline: "none",

                                fontWeight: "bold",
                                background: "none",
                                borderBottom: "1px solid black", // thicker, longer underline
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td
                            colSpan={9}
                            style={{
                              fontSize: "62.5%",
                            }}
                          >
                            <input
                              type="text"
                              value={"Official Receipt :"}
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                width: "98%",
                                fontWeight: "bold",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                          <td
                            colSpan={10}
                            style={{
                              fontSize: "62.5%",
                              textAlign: "center",
                              fontWeight: "Bold",
                            }}
                          >
                            <input
                              type="text"
                              value={
                                savedUnifast || savedMatriculation
                                  ? "Scholar"
                                  : ""
                              }
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "center",
                                width: "95%",
                                fontWeight: "bold",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                border: "none",
                                outline: "none",
                                background: "none",
                                borderBottom: "1px solid black", // underlines the field like a line
                              }}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div style={{ flex: "1 1 0", minWidth: 0 }}>
                    <table
                      style={{
                        borderCollapse: "collapse",
                        fontFamily: "Arial",
                        width: "100%",
                        margin: "0",
                        textAlign: "center",
                        tableLayout: "fixed",
                        borderLeft: "none",
                        borderBottom: "none",
                        borderTop: "none",
                      }}
                    >
                      <tbody>
                        <br />
                        <tr>
                          <td
                            style={{
                              fontSize: "12px",
                              fontWeight: "bold",
                              marginBottom: "5px",
                            }}
                          >
                            <input
                              type="text"
                              value={"RULES OF REFUND"}
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>
                        {[
                          "1. Full refund of tuition fee - Before the start of classes.",
                          "2. 80% refund of tuition fee - within 1 week from the start of classes.",
                          "3. 50% refund - within 2 weeks from the start of classes.",
                          "4. No refund - after the 2nd week of classes.",
                        ].map((rule, index) => (
                          <tr key={`refund-rule-${index}`}>
                            <td style={{ fontSize: "10px" }}>
                              <input
                                type="text"
                                value={rule}
                                readOnly
                                style={{
                                  textAlign: "left",
                                  color: "black",
                                  paddingLeft: "40px",
                                  width: "98%",
                                  border: "none",
                                  fontFamily: "Arial",
                                  fontSize: "10px",
                                  fontWeight: "bold",
                                  outline: "none",
                                  background: "none",
                                  fontStyle: "italic",
                                }}
                              />
                            </td>
                          </tr>
                        ))}

                        <tr>
                          <td style={{ height: "0.12in" }}></td>
                        </tr>

                        <tr>
                          <td style={{ fontSize: "12px", fontWeight: "bold" }}>
                            <input
                              type="text"
                              value={"PLEDGE UPON ADMISSION"}
                              readOnly
                              style={{
                                fontWeight: "bold",
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                border: "none",
                                outline: "none",
                                background: "none",
                              }}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontSize: "10px", fontWeight: "bold" }}>
                            <input
                              type="text"
                              value={
                                '"As a student of EARIST, I do solemnly promise that I will'
                              }
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "10px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                                fontStyle: "italic",
                              }}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontSize: "10px", fontWeight: "bold" }}>
                            <input
                              type="text"
                              value={
                                'comply with the rules and regulations of the Institution."'
                              }
                              readOnly
                              style={{
                                textAlign: "center",
                                color: "black",
                                width: "98%",
                                border: "none",
                                fontFamily: "Arial",
                                fontSize: "10px",
                                fontWeight: "bold",
                                outline: "none",
                                background: "none",
                                fontStyle: "italic",
                              }}
                            />
                          </td>
                        </tr>

                        <tr>
                          <td style={{ height: "calc(0.2in + 2rem)" }}></td>
                        </tr>

                        <tr>
                          <td style={{ padding: 0, textAlign: "center" }}>
                            <div
                              style={{
                                width: "70%",
                                margin: "0 auto",
                                borderBottom: "1px solid black",
                                height: 0,
                                lineHeight: 0,
                              }}
                            />
                            <div
                              style={{
                                color: "black",
                                textAlign: "center",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                marginTop: "9px",
                                lineHeight: 1.1,
                              }}
                            >
                              Student's Signature
                            </div>
                          </td>
                        </tr>

                        <tr>
                          <td style={{ height: "0.12in" }}></td>
                        </tr>
                        <tr>
                          <td style={{ height: "0.12in" }}></td>
                        </tr>

                        <tr>
                          <td
                            style={{ textAlign: "left", paddingLeft: "20px" }}
                          >
                            <input
                              type="text"
                              value={"APPROVED BY : "}
                              readOnly
                              style={{
                                color: "black",
                                textAlign: "left",
                                fontWeight: "bold",
                                width: "98%",
                                border: "none",
                                outline: "none",
                                background: "none",
                                fontSize: "12px",
                              }}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td
                            style={{
                              textAlign: "center",
                              fontSize: "12px",
                              padding: 0,
                            }}
                          >
                            {showApprovedBySignature ? (
                              <img
                                src={approvedBySignatureUrl}
                                alt="Signature"
                                onError={() =>
                                  setApprovedBySignatureMissing(true)
                                }
                                style={{
                                  height: "60px",
                                  objectFit: "contain",
                                  width: "250px",
                                  marginBottom: "0",
                                  display: !student_number ? "none" : "block",
                                  marginLeft: "auto",
                                  marginRight: "auto",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  height: student_number ? "60px" : "0",
                                  display: !student_number ? "none" : "block",
                                }}
                              />
                            )}

                            <div
                              style={{
                                display: "inline-block",
                                fontFamily: "Arial",
                                fontSize: "12px",
                                fontWeight: "bold",
                                lineHeight: "1.1",
                                textAlign: "center",
                              }}
                            >
                              <div
                                style={{
                                  minHeight: student_number ? "14px" : "0",
                                  display: !student_number ? "none" : "block",
                                }}
                              >
                                {approvedBy?.full_name || ""}
                              </div>
                              <div
                                style={{
                                  width: "250px",
                                  margin: "0 auto",
                                  borderBottom: "1px solid black",
                                  height: 0,
                                  lineHeight: 0,
                                }}
                              />
                              <div
                                style={{
                                  color: "black",
                                  textAlign: "center",
                                  fontFamily: "Arial",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  marginTop: "9px",
                                  lineHeight: 1.1,
                                }}
                              >
                                Registrar
                              </div>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <table
                  style={{
                    borderCollapse: "collapse",
                    fontFamily: "Arial",
                    width: "100%",
                    margin: "0 auto",
                    textAlign: "center",
                    tableLayout: "fixed",
                    borderLeft: "1px solid black",
                    borderBottom: "1px solid black",
                    borderRight: "1px solid black",
                  }}
                >
                  <tbody>
                    {/* TOP ROW: IMAGE (LEFT) + QR (RIGHT) */}
                    <tr>
                      {/* LEFT SIDE */}
                      <td
                        style={{
                          width: "50%",
                          textAlign: "left",
                          paddingLeft: "50px", // ?? margin-left effect
                        }}
                      >
                        {showFreeTuitionStamp && (
                          <div style={{ marginTop: "20px", marginBottom: "-70px", marginLeft: "-110px", scale: 1.1 }}>
                            <img
                              src={FreeTuitionImage}
                              alt="EARIST MIS FEE"
                              style={{
                                width: "420px",
                                height: "236px",
                                objectFit: "contain",
                                display: "block",
                              }}
                            />
                          </div>
                        )}
                      </td>

                      {/* RIGHT SIDE */}
                      <td
                        style={{
                          width: "100%",
                          paddingRight: "30px",
                          verticalAlign: "bottom",
                        }}
                      >
                        {hasStudentData && !qrCodeMissing && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: "0.25rem",
                            }}
                          >
                            <img
                              className="qr-code-img"
                              style={{
                                width: "150px",
                                height: "150px",
                                display: "block",
                              }}
                              src={qrCodeSrc || qrCodePaths[qrCodePathIndex]}
                              alt=""
                              onError={() => {
                                if (qrCodePathIndex < qrCodePaths.length - 1) {
                                  setQrCodePathIndex((index) => index + 1);
                                  return;
                                }
                                setQrCodeMissing(true);
                              }}
                            />
                            <span
                              style={{
                                color: "black",
                                fontSize: "15px",
                                lineHeight: 1.2,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {longDate}
                            </span>
                          </div>
                        )}
                        {!(hasStudentData && !qrCodeMissing) && (
                          <div
                            style={{
                              textAlign: "right",
                              fontSize: "15px",
                              color: "black",
                            }}
                          >
                            {longDate}
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* FOOTER */}
                    <tr>
                      <td
                        colSpan={2}
                        style={{
                          height: "0.2in",
                          fontSize: "72.5%",
                          backgroundColor: "gray",
                          color: "white",
                        }}
                      >
                        <b>
                          <i
                            style={{
                              color: "black",
                              textAlign: "center",
                              display: "block",
                            }}
                          >
                            KEEP THIS CERTIFICATE. YOU WILL BE REQUIRED TO
                            PRESENT THIS IN ALL YOUR DEALINGS WITH THE COLLEGE.
                          </i>
                        </b>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {!suppressNotifications && (
          <Snackbar
            open={snack.open}
            autoHideDuration={4000}
            onClose={handleSnackClose}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <Alert
              onClose={handleSnackClose}
              severity={snack.severity || "info"}
              variant="filled"
            >
              {snack.message}
            </Alert>
          </Snackbar>
        )}
      </Container>
    );
  },
);

export default CertificateOfRegistration;
