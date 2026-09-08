import React, { useState, useEffect, useContext, useRef } from "react";
import { SettingsContext } from "../App";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
  FormControlLabel,
  Button,
  Paper,
  TextField,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import LoadingOverlay from "../components/LoadingOverlay";
import { Message } from "@mui/icons-material";
import { FcPrint } from "react-icons/fc";
import EaristLogo from "../assets/EaristLogo.png";
import API_BASE_URL from "../apiConfig";
import { postAuditEvent } from "../utils/auditEvents";
import { resolveLogoDataUrl } from "../utils/gradingReportPrintLayout";
const FacultyEvaluation = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff"); // ✅ NEW
  const [stepperColor, setStepperColor] = useState("#000000"); // ✅ NEW

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (!settings) return;

    // 🎨 Colors
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton); // ✅ NEW
    if (colors.stepper) setStepperColor(colors.stepper); // ✅ NEW

    // 🏫 Logo
    if (assets.logoUrl) {
      setFetchedLogo(assets.logoUrl);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Information
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);
    setBranches(settings.branches || []);
  }, [settings]);

  const [userID, setUserID] = useState("");
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [studentCourses, setStudentCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [studentNumber, setStudentNumber] = useState("");
  const [chartData, setChartData] = useState([]); // ✅ added
  const [loading, setLoading] = useState(true);
  const [schoolYears, setSchoolYears] = useState([]);
  const [schoolSemester, setSchoolSemester] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedSchoolSemester, setSelectedSchoolSemester] = useState("");
  const [selectedActiveSchoolYear, setSelectedActiveSchoolYear] = useState("");
  const [displayMode, setDisplayMode] = useState("graph");
  const [profData, setPerson] = useState({
    prof_id: "",
    employee_id: "",
    fname: "",
    mname: "",
    lname: "",
    profile_image: "",
    campus: "",
  });

  // Add a ref for the print content
  const divToPrintRef = useRef();
  const [isGeneratingEvaluationPdf, setIsGeneratingEvaluationPdf] =
    useState(false);

  // ✅ On page load: check user session and fetch student data
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
        window.location.href = "/login";
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
        campus: first.campus || first.branch || "",
      };
      setPerson(profInfo);
    } catch (err) {
      console.error("Error Fetching Professor Personal Data");
    }
  };

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/get_school_year/`)
      .then((res) => setSchoolYears(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/get_school_semester/`)
      .then((res) => setSchoolSemester(res.data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/active_school_year`)
      .then((res) => {
        if (res.data.length > 0) {
          setSelectedSchoolYear(res.data[0].year_id);
          setSelectedSchoolSemester(res.data[0].semester_id);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedSchoolYear && selectedSchoolSemester) {
      axios
        .get(
          `${API_BASE_URL}/api/get_selecterd_year/${selectedSchoolYear}/${selectedSchoolSemester}`,
        )
        .then((res) => {
          if (res.data.length > 0) {
            setSelectedActiveSchoolYear(res.data[0].school_year_id);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [selectedSchoolYear, selectedSchoolSemester]);

  useEffect(() => {
    if (profData.prof_id && selectedSchoolYear && selectedSchoolSemester) {
      fetchFacultyData();
    }
  }, [profData.prof_id, selectedSchoolYear, selectedSchoolSemester]);

  const fetchFacultyData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/faculty_evaluation`, {
        params: {
          prof_id: profData.prof_id,
          year_id: selectedSchoolYear,
          semester_id: selectedSchoolSemester,
        },
      });

      const rows = res.data;

      if (!rows.length) {
        setChartData([]);
        return;
      }

      // Group by course -> question
      const grouped = {};

      rows.forEach((r) => {
        if (!grouped[r.course_id]) {
          grouped[r.course_id] = {
            course_id: r.course_id,
            course_code: r.course_code,
            questions: [],
          };
        }

        grouped[r.course_id].questions.push({
          question_id: r.question_id,
          question_description: r.question_description,
          counts: {
            1: r.answered_one_count,
            2: r.answered_two_count,
            3: r.answered_three_count,
            4: r.answered_four_count,
            5: r.answered_five_count,
          },
          ratings: {
            1: (r.answered_one_count / 75) * 100,
            2: (r.answered_two_count / 75) * 100,
            3: (r.answered_three_count / 75) * 100,
            4: (r.answered_four_count / 75) * 100,
            5: (r.answered_five_count / 75) * 100,
          },
        });

        // ✅ Create chartData for Recharts / print
      });

      const groupedCourses = Object.values(grouped).map((course) => {
        const totals = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        course.questions.forEach((question) => {
          [1, 2, 3, 4, 5].forEach((rating) => {
            totals[rating] += Number(question.counts?.[rating] || 0);
          });
        });

        return {
          ...course,
          chartData: [1, 2, 3, 4, 5].map((rating) => ({
            name: `Rating ${rating}`,
            total: totals[rating],
          })),
        };
      });

      setChartData(groupedCourses);
    } catch (err) {
      console.error(err);
      setChartData([]);
    }
  };

  const handleSchoolYearChange = (event) => {
    setSelectedSchoolYear(event.target.value);
  };

  const handleSchoolSemesterChange = (event) => {
    setSelectedSchoolSemester(event.target.value);
  };

  const calculateRatingTotal = (counts = {}) => {
    return [1, 2, 3, 4, 5].reduce(
      (sum, rating) => sum + Number(counts[rating] || 0),
      0,
    );
  };

  const calculateAverageRating = (counts = {}) => {
    const total = calculateRatingTotal(counts);
    if (!total) return 0;
    const weightedTotal = [1, 2, 3, 4, 5].reduce(
      (sum, rating) => sum + rating * Number(counts[rating] || 0),
      0,
    );
    return weightedTotal / total;
  };

  const getRatingInterpretation = (average) => {
    if (average >= 4.5) return { label: "Excellent", color: "#1b8f3a" };
    if (average >= 3.5) return { label: "Good", color: "#1976d2" };
    if (average >= 2.5) return { label: "Needs Improvement", color: "#f59e0b" };
    if (average > 0) return { label: "Critical", color: "#d32f2f" };
    return { label: "No responses", color: "#6b7280" };
  };

  const formatAverage = (value) => Number(value || 0).toFixed(2);

  const getMostCommonRating = (counts = {}) => {
    const total = calculateRatingTotal(counts);
    if (!total) return null;
    return [1, 2, 3, 4, 5].reduce(
      (best, rating) =>
        Number(counts[rating] || 0) > Number(counts[best] || 0)
          ? rating
          : best,
      1,
    );
  };

  const getRatingDistributionText = (counts = {}) => {
    const total = calculateRatingTotal(counts);
    if (!total) return "No responses";
    return [1, 2, 3, 4, 5]
      .map((rating) => {
        const percent = (Number(counts[rating] || 0) / total) * 100;
        return `R${rating}: ${percent.toFixed(0)}%`;
      })
      .join(" / ");
  };

  const truncateText = (value, maxLength = 42) => {
    const text = String(value || "");
    return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
  };

  const insightData = (() => {
    const ratingTotals = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const courseInsights = [];
    const questionInsights = [];

    chartData.forEach((course) => {
      const courseCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      course.questions.forEach((question) => {
        [1, 2, 3, 4, 5].forEach((rating) => {
          const count = Number(question.counts?.[rating] || 0);
          courseCounts[rating] += count;
          ratingTotals[rating] += count;
        });

        const questionAverage = calculateAverageRating(question.counts);
        questionInsights.push({
          courseCode: course.course_code,
          questionId: question.question_id,
          question: question.question_description,
          totalResponses: calculateRatingTotal(question.counts),
          average: questionAverage,
          interpretation: getRatingInterpretation(questionAverage),
          counts: question.counts,
        });
      });

      const totalResponses = calculateRatingTotal(courseCounts);
      const average = calculateAverageRating(courseCounts);
      const courseQuestionInsights = course.questions
        .map((question) => {
          const questionAverage = calculateAverageRating(question.counts);
          return {
            courseCode: course.course_code,
            questionId: question.question_id,
            question: question.question_description,
            totalResponses: calculateRatingTotal(question.counts),
            average: questionAverage,
            interpretation: getRatingInterpretation(questionAverage),
            counts: question.counts,
          };
        })
        .filter((item) => item.totalResponses > 0)
        .sort((a, b) => b.average - a.average);

      courseInsights.push({
        courseId: course.course_id,
        courseCode: course.course_code,
        totalResponses,
        average,
        interpretation: getRatingInterpretation(average),
        mostCommonRating: getMostCommonRating(courseCounts),
        ratingDistributionText: getRatingDistributionText(courseCounts),
        strongestQuestion: courseQuestionInsights[0] || null,
        lowestQuestion:
          courseQuestionInsights[courseQuestionInsights.length - 1] || null,
        chartData: course.chartData,
      });
    });

    const totalResponses = calculateRatingTotal(ratingTotals);
    const overallAverage = calculateAverageRating(ratingTotals);
    const sortedCourses = [...courseInsights].sort(
      (a, b) => b.average - a.average,
    );
    const answeredQuestions = questionInsights.filter(
      (item) => item.totalResponses > 0,
    );
    const sortedQuestions = [...answeredQuestions].sort(
      (a, b) => b.average - a.average,
    );
    const mostCommonRating = [1, 2, 3, 4, 5].reduce(
      (best, rating) =>
        Number(ratingTotals[rating] || 0) > Number(ratingTotals[best] || 0)
          ? rating
          : best,
      1,
    );

    return {
      courseInsights,
      questionInsights,
      ratingDistribution: [1, 2, 3, 4, 5].map((rating) => ({
        name: `Rating ${rating}`,
        total: ratingTotals[rating],
      })),
      overallAverage,
      totalResponses,
      bestCourse: sortedCourses[0] || null,
      lowestCourse: sortedCourses[sortedCourses.length - 1] || null,
      highestQuestions: sortedQuestions.slice(0, 3),
      lowestQuestions: [...sortedQuestions].reverse().slice(0, 3),
      needsAttentionQuestions: answeredQuestions
        .filter((item) => item.average > 0 && item.average < 3.5)
        .sort((a, b) => a.average - b.average)
        .slice(0, 5),
      mostCommonRating:
        totalResponses > 0
          ? { rating: mostCommonRating, count: ratingTotals[mostCommonRating] }
          : null,
      interpretation: getRatingInterpretation(overallAverage),
    };
  })();

  const AuditLog = async () => {
    try {
      await postAuditEvent("faculty_evaluation_printed", {
        prof_id: profData.prof_id,
      });
    } catch (err) {
      console.error("Error inserting audit log:", err);
      alert("Failed to insert audit log.");
    }
  };

  // Create a combined PDF export that logs and downloads
  const downloadFacultyEvaluationPdf = async () => {
    if (isGeneratingEvaluationPdf) return;

    setIsGeneratingEvaluationPdf(true);

    try {
    // First log the action
    await AuditLog();

    // ✅ Determine dynamic campus address
    let campusAddress = "";
    campusAddress = branding.campusAddress || "No address set in Settings";

    // ✅ Dynamic logo and company name
    const branchList = Array.isArray(branches) ? branches : [];
    const matchedBranch =
      branchList.find(
        (branch) => String(branch?.id) === String(profData.campus),
      ) || branchList[0];
    const branchName =
      matchedBranch?.branch ||
      matchedBranch?.branch_name ||
      matchedBranch?.name ||
      matchedBranch?.campus ||
      "";
    const branchAddress = matchedBranch?.address || campusAddress;
    const campusLine = [branchName, branchAddress].filter(Boolean).join(" - ");

    const logoSrc = await resolveLogoDataUrl(fetchedLogo || EaristLogo || "");
    const name = companyName?.trim() || "";

    // ✅ Split company name into two balanced lines
    const words = name.split(" ");
    const middleIndex = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, middleIndex).join(" ");
    const secondLine = words.slice(middleIndex).join(" ");

    // Get current school year and semester for header
    const currentSchoolYear = schoolYears.find(
      (sy) => sy.year_id === selectedSchoolYear,
    );
    const currentSemester = schoolSemester.find(
      (sem) => sem.semester_id === selectedSchoolSemester,
    );

    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const courseSummaryRows = [...insightData.courseInsights]
      .sort((a, b) => a.average - b.average)
      .map(
        (course) => `
          <tr>
            <td>${escapeHtml(course.courseCode)}</td>
            <td>${course.totalResponses}</td>
            <td>${formatAverage(course.average)}</td>
            <td>${escapeHtml(course.ratingDistributionText)}</td>
            <td>${escapeHtml(truncateText(course.strongestQuestion?.question || "N/A", 34))}</td>
            <td>${escapeHtml(truncateText(course.lowestQuestion?.question || "N/A", 34))}</td>
            <td>${escapeHtml(course.interpretation.label)}</td>
          </tr>
        `,
      )
      .join("");

    const compactCourseRows = [...insightData.courseInsights]
      .sort((a, b) => a.average - b.average)
      .map(
        (course) => `
          <tr>
            <td>${escapeHtml(course.courseCode)}</td>
            <td>${course.totalResponses}</td>
            <td>${formatAverage(course.average)}</td>
            <td>${escapeHtml(course.interpretation.label)}</td>
          </tr>
        `,
      )
      .join("");

    const distributionMax = Math.max(
      1,
      ...insightData.ratingDistribution.map((item) => Number(item.total || 0)),
    );

    const printableSummary = `
                        <div class="summary-grid">
                            <div class="summary-card">
                                <div class="summary-label">Overall Average</div>
                                <div class="summary-value">${formatAverage(insightData.overallAverage)} / 5</div>
                                <div class="summary-note">${escapeHtml(insightData.interpretation.label)}</div>
                            </div>
                            <div class="summary-card">
                                <div class="summary-label">Total Responses</div>
                                <div class="summary-value">${insightData.totalResponses}</div>
                                <div class="summary-note">Across all questions</div>
                            </div>
                            <div class="summary-card">
                                <div class="summary-label">Highest Course</div>
                                <div class="summary-value">${escapeHtml(insightData.bestCourse?.courseCode || "N/A")}</div>
                                <div class="summary-note">${formatAverage(insightData.bestCourse?.average)} / 5</div>
                            </div>
                            <div class="summary-card">
                                <div class="summary-label">Needs Attention</div>
                                <div class="summary-value">${escapeHtml(insightData.lowestCourse?.courseCode || "N/A")}</div>
                                <div class="summary-note">${formatAverage(insightData.lowestCourse?.average)} / 5</div>
                            </div>
                        </div>
                    `;

    const graphPrintContent = `
                        <style>.chart-container { display: none !important; }</style>
                        ${printableSummary}
                        <div class="print-dashboard">
                            <div class="mini-chart">
                                <div class="chart-title">OVERALL RATING DISTRIBUTION</div>
                                <svg viewBox="0 0 360 128" width="100%" height="128">
                                    ${insightData.ratingDistribution
                                      .map((item, index) => {
                                        const barHeight =
                                          (Number(item.total || 0) /
                                            distributionMax) *
                                          78;
                                        const x = 35 + index * 62;
                                        const y = 100 - barHeight;
                                        const colors = [
                                          "#d32f2f",
                                          "#f57c00",
                                          "#fbc02d",
                                          "#1976d2",
                                          "#1b8f3a",
                                        ];
                                        return `
                                            <rect x="${x}" y="${y}" width="34" height="${barHeight}" fill="${colors[index]}" />
                                            <text x="${x + 17}" y="${y - 4}" text-anchor="middle" font-size="8">${item.total}</text>
                                            <text x="${x + 17}" y="118" text-anchor="middle" font-size="8">R${index + 1}</text>
                                        `;
                                      })
                                      .join("")}
                                </svg>
                            </div>
                            <div class="mini-chart">
                                <div class="chart-title">COURSE AVERAGE COMPARISON</div>
                                <svg viewBox="0 0 360 128" width="100%" height="128">
                                    ${insightData.courseInsights
                                      .slice()
                                      .sort((a, b) => a.average - b.average)
                                      .slice(0, 8)
                                      .map((course, index) => {
                                        const barWidth =
                                          (Number(course.average || 0) / 5) *
                                          210;
                                        const y = 13 + index * 14;
                                        return `
                                            <text x="4" y="${y + 8}" font-size="7">${escapeHtml(truncateText(course.courseCode, 12))}</text>
                                            <rect x="78" y="${y}" width="${barWidth}" height="9" fill="${course.interpretation.color}" />
                                            <text x="${82 + barWidth}" y="${y + 8}" font-size="7">${formatAverage(course.average)}</text>
                                        `;
                                      })
                                      .join("")}
                                </svg>
                            </div>
                        </div>
                        <div class="table-card compact">
                            <div class="chart-title">COURSE SUMMARY</div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Course</th>
                                        <th>Responses</th>
                                        <th>Average</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>${compactCourseRows || `<tr><td colspan="4">No evaluation data.</td></tr>`}</tbody>
                            </table>
                        </div>
                    `;

    const printableContent =
      displayMode === "table"
        ? `
                        <style>.chart-container { display: none !important; }</style>
                        ${printableSummary}
                        <div class="table-container">
                            ${
                              chartData.length > 0
                                ? `
                                <div class="table-card">
                                    <div class="chart-title">COURSE SUMMARY</div>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Course</th>
                                                <th>Responses</th>
                                                <th>Average</th>
                                                <th>Distribution</th>
                                                <th>Strongest Area</th>
                                                <th>Lowest Area</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${courseSummaryRows}
                                        </tbody>
                                    </table>
                                </div>

                                <div class="table-card">
                                    <div class="chart-title">NEEDS ATTENTION</div>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Course</th>
                                                <th>Question</th>
                                                <th>Average</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${
                                              insightData.needsAttentionQuestions.length
                                                ? insightData.needsAttentionQuestions
                                                    .map(
                                                      (item) => `
                                                <tr>
                                                    <td>${escapeHtml(item.courseCode)}</td>
                                                    <td>${escapeHtml(item.question)}</td>
                                                    <td>${formatAverage(item.average)}</td>
                                                    <td>${escapeHtml(item.interpretation.label)}</td>
                                                </tr>
                                            `,
                                                    )
                                                    .join("")
                                                : `<tr><td colspan="4">No questions below the attention threshold.</td></tr>`
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            `
                                : `
                                <div class="no-data">
                                    There's no evaluation in this term.
                                </div>
                            `
                            }
                        </div>
                    `
        : graphPrintContent;

    const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8" />
                    <title>Faculty Evaluation Report</title>
                    <style>
                        @page { size: A4 portrait; margin: 6mm; }
                        body {
                            font-family: Arial;
                            margin: 0;
                            padding: 0;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        .print-container {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            text-align: center;
                            width: 198mm;
                            min-height: 285mm;
                            max-height: 285mm;
                            overflow: hidden;
                        }
                        .print-header {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            position: relative;
                            width: 100%;
                            margin-bottom: 4px;
                            min-height: 62px;
                        }
                        .print-header img {
                            position: absolute;
                            left: 28px;
                            width: 58px;
                            height: 58px;
                            border-radius: 50%;
                            object-fit: cover;
                        }
                        .evaluation-header {
                            margin-top: 4px;
                            margin-bottom: 6px;
                        }
                        .evaluation-title {
                            font-size: 20px;
                            font-weight: bold;
                            margin-bottom: 10px;
                        }
                        .evaluation-subtitle {
                            font-size: 10px;
                            margin-bottom: 2px;
                        }
                        .chart-container {
                            margin-top: 0rem;
                            width: 100%;
                            display: flex;
                            flex-wrap: wrap;
                            justify-content: center;
                            gap: 8px;
                            transform: scale(1);
                            margin-bottom: 4px;
                        }
                        .chart-card {
                            width: 31%;
                            border: 1px solid black;
                            padding: 5px;
                            margin-bottom: 5px;
                            page-break-inside: avoid;
                            border-radius: 4px;
                            box-shadow: none;
                        }
                        .chart-title {
                            text-align: center;
                            font-weight: bold;
                            margin-bottom: 4px;
                            color: maroon;
                            padding-top: 2px;
                            font-size: 9px;
                        }
                        .chart-wrapper {
                            height: 120px;
                            position: relative;
                        }
                        .total-label {
                            position: absolute;
                            bottom: 10px;
                            right: 10px;
                            font-size: 12px;
                            font-weight: bold;
                            background: rgba(255,255,255,0.9);
                            padding: 2px 5px;
                            border-radius: 3px;
                        }
                        .no-data {
                            text-align: center;
                            padding: 20px;
                            border: 1px solid black;
                            width: 95%;
                            margin: 0 auto;
                        }
                        .summary-grid {
                            display: grid;
                            grid-template-columns: repeat(4, 1fr);
                            gap: 5px;
                            width: 95%;
                            margin: 0 auto 6px auto;
                            text-align: left;
                        }
                        .summary-card {
                            border: 1px solid #222;
                            padding: 5px;
                            page-break-inside: avoid;
                        }
                        .summary-label {
                            font-size: 6.5px;
                            text-transform: uppercase;
                            color: #555;
                            margin-bottom: 2px;
                        }
                        .summary-value {
                            font-size: 12px;
                            font-weight: bold;
                        }
                        .summary-note {
                            font-size: 7px;
                            margin-top: 2px;
                            color: #444;
                        }
                        .print-dashboard {
                            width: 95%;
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 6px;
                            margin: 0 auto 6px auto;
                        }
                        .mini-chart {
                            border: 1px solid #222;
                            padding: 4px;
                            page-break-inside: avoid;
                        }
                        .table-container {
                            width: 95%;
                            margin: 0 auto;
                            text-align: left;
                        }
                        .table-card {
                            width: 100%;
                            margin-bottom: 6px;
                            page-break-inside: avoid;
                        }
                        .table-card.compact {
                            width: 95%;
                            margin: 0 auto;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 6.8px;
                            table-layout: fixed;
                        }
                        th, td {
                            border: 1px solid #222;
                            padding: 2px 3px;
                            vertical-align: top;
                            overflow-wrap: anywhere;
                        }
                        th {
                            background: #eeeeee;
                            text-align: center;
                        }
                        td:not(:first-child) {
                            text-align: center;
                        }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        <!-- ✅ HEADER -->
                        <div class="print-header">
                            ${logoSrc ? `<img src="${logoSrc}" alt="School Logo" />` : ""}
                            <div>
                                 <div style="font-size: 8px; font-family: Arial">Republic of the Philippines</div>
                                ${
                                  name
                                    ? `
                                    <b style="letter-spacing: 0.3px; font-size: 12px; font-family: 'Times New Roman', serif;">
                                        ${firstLine}
                                    </b>
                                    ${
                                      secondLine
                                        ? `<div style="letter-spacing: 0.3px; font-size: 12px; font-family: 'Times New Roman', serif;"><b>${secondLine}</b></div>`
                                        : ""
                                    }
                                `
                                    : ""
                                }
                                <div style="font-size: 8px;">${escapeHtml(campusLine || campusAddress)}</div>
                                <div style="margin-top: 4px;">
                                    <b style="font-size: 12px; letter-spacing: 0.5px;">FACULTY EVALUATION REPORT</b>
                                </div>
                                <div class="evaluation-header">
                                    <div class="evaluation-subtitle">Faculty: ${profData.lname}, ${profData.fname} ${profData.mname}</div>
                                    <div class="evaluation-subtitle">
                                        ${currentSchoolYear ? `${currentSchoolYear.current_year} - ${currentSchoolYear.next_year}` : "School Year Not Selected"}
                                        ${currentSemester ? `, ${currentSemester.semester_description}` : ", Semester Not Selected"}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- ✅ CHARTS -->
                        ${printableContent}
                        <div class="chart-container">
                            ${
                              chartData.length > 0
                                ? chartData
                                    .map((entry) => {
                                      const maxChartTotal = Math.max(
                                        1,
                                        ...entry.chartData.map((item) =>
                                          Number(item.total || 0),
                                        ),
                                      );
                                      return `
                                <div class="chart-card">
                                    <div class="chart-title">EVALUATION FOR COURSE ${entry.course_code}</div>
                                    <div class="chart-wrapper">
                                        <svg width="100%" height="100%" viewBox="0 0 550 300" preserveAspectRatio="xMidYMid meet">
                                            <!-- Grid lines (CartesianGrid) -->
                                            <g stroke="#e0e0e0" stroke-dasharray="3 3">
                                                ${[10, 20, 30, 40, 50]
                                                  .map(
                                                    (y) =>
                                                      `<line x1="60" y1="${200 - y * 3.33}" x2="500" y2="${200 - y * 3.33}" />`,
                                                  )
                                                  .join("")}
                                            </g>
                                            
                                            <!-- Axes -->
                                            <line x1="60" y1="20" x2="60" y2="200" stroke="black" />
                                            <line x1="60" y1="200" x2="500" y2="200" stroke="black" />
                                            
                                            <!-- Y-axis labels -->
                                            <g font-size="11" text-anchor="end" fill="#666">
                                                <text x="50" y="205">0</text>
                                                <text x="50" y="172">10</text>
                                                <text x="50" y="138">20</text>
                                                <text x="50" y="105">30</text>
                                                <text x="50" y="72">40</text>
                                                <text x="50" y="38">50</text>
                                                <text x="50" y="5">60</text>
                                            </g>
                                            
                                            <!-- Y-axis title -->
                                            <text x="15" y="110" font-size="12" text-anchor="middle" transform="rotate(-90 15 110)">Number of Responses</text>
                                            
                                            <!-- Bars with exact colors from FacultyEvaluation -->
                                            ${entry.chartData
                                              .map((item, i) => {
                                                const barHeight =
                                                  (item.total / maxChartTotal) * 180;
                                                const x = 60 + i * 88;
                                                const colors = [
                                                  "#FF0000",
                                                  "#00C853",
                                                  "#2196F3",
                                                  "#FFD600",
                                                  "#FF6D00",
                                                ];
                                                return `
                                                    <rect x="${x}" y="${200 - barHeight}" width="70" height="${barHeight}" 
                                                          fill="${colors[i]}" rx="2" />
                                                    <text x="${x + 35}" y="220" text-anchor="middle" font-size="11">${item.name}</text>
                                                    <text x="${x + 35}" y="${195 - barHeight}" text-anchor="middle" font-size="10" font-weight="bold">${item.total}</text>
                                                `;
                                              })
                                              .join("")}
                                            
                                            <!-- Tooltip style hover areas (optional, for visual reference) -->
                                            ${entry.chartData
                                              .map((item, i) => {
                                                const x = 60 + i * 88;
                                                return `
                                                    <rect x="${x}" y="20" width="70" height="180" 
                                                          fill="transparent" style="cursor: pointer;">
                                                        <title>${item.name}: ${item.total} responses</title>
                                                    </rect>
                                                `;
                                              })
                                              .join("")}
                                        </svg>
                                       
                                    </div>
                                </div>
                            `;
                                    })
                                    .join("")
                                : `
                                <div class="no-data">
                                    There's no evaluation in this term.
                                </div>
                            `
                            }
                        </div>
                    </div>
                </body>
            </html>
        `;

      const response = await axios.post(
        `${API_BASE_URL}/api/generate-faculty-evaluation-pdf`,
        {
          html,
          employee_id: profData.employee_id || localStorage.getItem("employee_id") || "",
          last_name: profData.lname || "",
          first_name: profData.fname || "",
        },
        { responseType: "blob" },
      );

      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );
      const safeLastName = String(profData.lname || "Faculty")
        .trim()
        .replace(/\s+/g, "_");
      const safeFirstName = String(profData.fname || "")
        .trim()
        .replace(/\s+/g, "_");
      const employeeSuffix = profData.employee_id
        ? `_${String(profData.employee_id).trim().replace(/\s+/g, "_")}`
        : "";
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute(
        "download",
        `Faculty_Evaluation_${safeLastName}${safeFirstName ? "_" + safeFirstName : ""}${employeeSuffix}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to generate Faculty Evaluation PDF:", err);
      window.alert(
        "Failed to generate Faculty Evaluation PDF. Please try again.",
      );
    } finally {
      setIsGeneratingEvaluationPdf(false);
    }
  };

  // 🔒 Disable right-click
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  // 🔒 Block DevTools shortcuts silently
  document.addEventListener("keydown", (e) => {
    const isBlockedKey =
      e.key === "F12" ||
      e.key === "F11" ||
      (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
      (e.ctrlKey && e.key === "U");

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
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography
          variant="h4"
          fontWeight="bold"
          style={{ color: titleColor }}
        >
          FACULTY EVALUATION
        </Typography>
      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />

      <br />

      <TableContainer component={Paper} sx={{ width: "99%" }}>
        <Table size="small">
          <TableHead
            sx={{
              backgroundColor: headerColor,
              color: "white",
            }}
          >
            <TableRow>
              <TableCell
                colSpan={10}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  height: "40px",
                  backgroundColor: headerColor,
                  color: "white",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                ></Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>
      <TableContainer
        component={Paper}
        sx={{ width: "99%", border: `1px solid ${borderColor}`, p: 2 }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            margin: "1rem 0",
            padding: "0 1rem",
          }}
          gap={5}
        >
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              minWidth: "620px",
            }}
          >
            <Typography fontSize={13} sx={{ minWidth: "100px" }}>
              Print:
            </Typography>

            <button
              onClick={downloadFacultyEvaluationPdf}
              disabled={isGeneratingEvaluationPdf}
              style={{
                width: "300px",
                padding: "10px 20px",
                border: "2px solid black",
                backgroundColor: "#f0f0f0",
                color: "black",
                borderRadius: "5px",
                cursor: isGeneratingEvaluationPdf ? "not-allowed" : "pointer",
                fontSize: "16px",
                fontWeight: "bold",
                opacity: isGeneratingEvaluationPdf ? 0.6 : 1,
                transition: "background-color 0.3s, transform 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                if (isGeneratingEvaluationPdf) return;
                e.currentTarget.style.backgroundColor = "#d3d3d3";
              }}
              onMouseLeave={(e) => {
                if (isGeneratingEvaluationPdf) return;
                e.currentTarget.style.backgroundColor = "#f0f0f0";
              }}
              onMouseDown={(e) => {
                if (isGeneratingEvaluationPdf) return;
                e.currentTarget.style.transform = "scale(0.95)";
              }}
              onMouseUp={(e) => {
                if (isGeneratingEvaluationPdf) return;
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
                {isGeneratingEvaluationPdf
                  ? "Generating PDF..."
                  : "Download Evaluation"}
              </span>
            </button>

            <Typography fontSize={13} sx={{ minWidth: "70px" }}>
              Display:
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant={displayMode === "graph" ? "contained" : "outlined"}
                size="small"
                onClick={() => setDisplayMode("graph")}
                sx={{
                  minWidth: 80,
                  backgroundColor:
                    displayMode === "graph" ? mainButtonColor : "transparent",
                }}
              >
                Graph
              </Button>
              <Button
                variant={displayMode === "table" ? "contained" : "outlined"}
                size="small"
                onClick={() => setDisplayMode("table")}
                sx={{
                  minWidth: 80,
                  backgroundColor:
                    displayMode === "table" ? mainButtonColor : "transparent",
                }}
              >
                Table
              </Button>
            </Box>
          </Box>

          <Box display="flex" gap={2} sx={{ minWidth: "450px" }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "100px" }}>
                School Year:
              </Typography>
              <FormControl fullWidth>
                <InputLabel id="demo-simple-select-label">
                  School Years
                </InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  style={{ width: "200px" }}
                  value={selectedSchoolYear}
                  label="School Years"
                  onChange={handleSchoolYearChange}
                >
                  {schoolYears.length > 0 ? (
                    schoolYears.map((sy) => (
                      <MenuItem value={sy.year_id} key={sy.year_id}>
                        {sy.current_year} - {sy.next_year}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>School Year is not found</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography fontSize={13} sx={{ minWidth: "100px" }}>
                Semester:{" "}
              </Typography>
              <FormControl fullWidth>
                <InputLabel id="demo-simple-select-label">
                  School Semester
                </InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  style={{ width: "200px" }}
                  value={selectedSchoolSemester}
                  label="School Semester"
                  onChange={handleSchoolSemesterChange}
                >
                  {schoolSemester.length > 0 ? (
                    schoolSemester.map((sem) => (
                      <MenuItem value={sem.semester_id} key={sem.semester_id}>
                        {sem.semester_description}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>School Semester is not found</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Box>
      </TableContainer>

      {displayMode === "graph" ? (
      <div className="print-container" ref={divToPrintRef}>
        <Grid container spacing={2} sx={{ mt: 3, mb: 3 }}>
          {[
            {
              label: "Overall Average",
              value: `${formatAverage(insightData.overallAverage)} / 5`,
              note: insightData.interpretation.label,
              color: insightData.interpretation.color,
            },
            {
              label: "Total Responses",
              value: insightData.totalResponses,
              note: "Across all questions",
              color: "#374151",
            },
            {
              label: "Highest Course",
              value: insightData.bestCourse?.courseCode || "N/A",
              note: `${formatAverage(insightData.bestCourse?.average)} / 5`,
              color: "#1b8f3a",
            },
            {
              label: "Needs Attention",
              value: insightData.lowestCourse?.courseCode || "N/A",
              note: `${formatAverage(insightData.lowestCourse?.average)} / 5`,
              color: "#d32f2f",
            },
          ].map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item.label}>
              <Paper
                sx={{
                  p: 2,
                  border: `1px solid ${borderColor}`,
                  borderLeft: `6px solid ${item.color}`,
                  borderRadius: 1,
                  height: "100%",
                }}
              >
                <Typography fontSize={12} color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {item.value}
                </Typography>
                <Typography fontSize={12} sx={{ color: item.color }}>
                  {item.note}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {chartData.length > 0 && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} lg={6}>
              <Card
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: `1px solid ${borderColor}`,
                  height: 380,
                }}
              >
                <Typography fontWeight="bold" sx={{ color: "maroon", mb: 1 }}>
                  Overall Rating Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={insightData.ratingDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total">
                      {insightData.ratingDistribution.map((item, idx) => (
                        <Cell
                          key={item.name}
                          fill={
                            [
                              "#d32f2f",
                              "#f57c00",
                              "#fbc02d",
                              "#1976d2",
                              "#1b8f3a",
                            ][idx]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Card
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: `1px solid ${borderColor}`,
                  height: 380,
                }}
              >
                <Typography fontWeight="bold" sx={{ color: "maroon", mb: 1 }}>
                  Course Average Comparison
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={insightData.courseInsights}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="courseCode" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip formatter={(value) => formatAverage(value)} />
                    <Bar dataKey="average">
                      {insightData.courseInsights.map((item) => (
                        <Cell
                          key={item.courseCode}
                          fill={item.interpretation.color}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card
                sx={{
                  p: 2,
                  borderRadius: 1,
                  border: `1px solid ${borderColor}`,
                }}
              >
                <Typography fontWeight="bold" sx={{ color: "maroon", mb: 1 }}>
                  Question Insights
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography fontSize={13} fontWeight="bold">
                      Highest Rated
                    </Typography>
                    {insightData.highestQuestions.map((item) => (
                      <Box key={`${item.courseCode}-${item.questionId}`} mt={1}>
                        <Typography fontSize={12}>
                          {item.courseCode}: {item.question}
                        </Typography>
                        <Typography fontSize={12} color="text.secondary">
                          {formatAverage(item.average)} / 5
                        </Typography>
                      </Box>
                    ))}
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography fontSize={13} fontWeight="bold">
                      Lowest Rated
                    </Typography>
                    {insightData.lowestQuestions.map((item) => (
                      <Box key={`${item.courseCode}-${item.questionId}`} mt={1}>
                        <Typography fontSize={12}>
                          {item.courseCode}: {item.question}
                        </Typography>
                        <Typography fontSize={12} color="text.secondary">
                          {formatAverage(item.average)} / 5
                        </Typography>
                      </Box>
                    ))}
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography fontSize={13} fontWeight="bold">
                      Below 3.50
                    </Typography>
                    {insightData.needsAttentionQuestions.length ? (
                      insightData.needsAttentionQuestions.map((item) => (
                        <Box key={`${item.courseCode}-${item.questionId}`} mt={1}>
                          <Typography fontSize={12}>
                            {item.courseCode}: {item.question}
                          </Typography>
                          <Typography fontSize={12} color="text.secondary">
                            {formatAverage(item.average)} / 5
                          </Typography>
                        </Box>
                      ))
                    ) : (
                      <Typography fontSize={12} color="text.secondary" mt={1}>
                        No questions below the attention threshold.
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </Card>
            </Grid>
          </Grid>
        )}

        <Grid
          container
          spacing={3}
          sx={{
            mt: 3,
            gap: "2rem",
            justifyContent: "center",
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {chartData.length > 0 ? (
            chartData.map((entry, index) => (
              <Grid item xs={12} md={12} lg={5} key={index}>
                <Card
                  sx={{
                    p: 2,
                    marginLeft: "10px",
                    marginTop: "-20px",
                    borderRadius: 3,
                    width: 550,
                    height: 400,
                    border: `1px solid ${borderColor}`,
                    transition: "transform 0.2s ease",
                    "&:hover": { transform: "scale(1.03)" },
                    boxShadow: 3,
                  }}
                >
                  <CardContent sx={{ height: "100%", p: 0 }}>
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      mb={1}
                      sx={{
                        color: "maroon",
                        textAlign: "center",
                        pl: 2,
                        pt: 2,
                      }}
                    >
                      EVALUATION FOR COURSE {entry.course_code}
                    </Typography>
                    {/* Chart takes the rest of card height */}
                    <Box sx={{ height: 400, mb: 4 }}>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={entry.chartData}
                          margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="total">
                            {entry.chartData.map((item, idx) => (
                              <Cell
                                key={idx}
                                fill={
                                  [
                                    "#FF0000",
                                    "#00C853",
                                    "#2196F3",
                                    "#FFD600",
                                    "#FF6D00",
                                  ][idx]
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                mt: 1,
                ml: 1,
                width: "97%",
                border: `1px solid ${borderColor}`,
                p: 10,
                textAlign: "center",
              }}
            >
              There's no evaluation in this term.
            </Typography>
          )}
        </Grid>
      </div>
      ) : (
        <Box className="print-container" ref={divToPrintRef} sx={{ mt: 3 }}>
          {chartData.length > 0 ? (
            <>
              <TableContainer
                component={Paper}
                sx={{
                  mb: 3,
                  border: `1px solid ${borderColor}`,
                  overflowX: "auto",
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{
                    color: "maroon",
                    textAlign: "center",
                    p: 2,
                  }}
                >
                  COURSE SUMMARY
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        backgroundColor: headerColor,
                      }}
                    >
                      <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                        Course
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ color: "white", fontWeight: "bold" }}
                      >
                        Responses
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ color: "white", fontWeight: "bold" }}
                      >
                        Average
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                        Distribution
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                        Strongest Area
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                        Lowest Area
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ color: "white", fontWeight: "bold" }}
                      >
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHead>
                   <TableBody
                               sx={{
                                 border: `1px solid ${borderColor}`,
                                 "& .MuiTableRow-root:nth-of-type(odd)": {
                                   backgroundColor: "#ffffff",
                                 },
                                 "& .MuiTableRow-root:nth-of-type(even)": {
                                   backgroundColor: "lightgray",
                                 },
                               }}
                             >
                    {[...insightData.courseInsights]
                      .sort((a, b) => a.average - b.average)
                      .map((course) => (
                        <TableRow key={course.courseId}>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {course.courseCode}
                          </TableCell>
                          <TableCell align="center">
                            {course.totalResponses}
                          </TableCell>
                          <TableCell align="center">
                            {formatAverage(course.average)}
                          </TableCell>
                          <TableCell>{course.ratingDistributionText}</TableCell>
                          <TableCell>
                            {course.strongestQuestion?.question || "N/A"}
                          </TableCell>
                          <TableCell>
                            {course.lowestQuestion?.question || "N/A"}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              color: course.interpretation.color,
                              fontWeight: 700,
                            }}
                          >
                            {course.interpretation.label}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TableContainer
                component={Paper}
                sx={{
                  mb: 3,
                  border: `1px solid ${borderColor}`,
                  overflowX: "auto",
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  sx={{
                    color: "maroon",
                    textAlign: "center",
                    p: 2,
                  }}
                >
                  NEEDS ATTENTION
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        backgroundColor: headerColor,
                      }}
                    >
                      <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                        Course
                      </TableCell>
                      <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                        Question
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ color: "white", fontWeight: "bold" }}
                      >
                        Average
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ color: "white", fontWeight: "bold" }}
                      >
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHead>
                   <TableBody
                               sx={{
                                 border: `1px solid ${borderColor}`,
                                 "& .MuiTableRow-root:nth-of-type(odd)": {
                                   backgroundColor: "#ffffff",
                                 },
                                 "& .MuiTableRow-root:nth-of-type(even)": {
                                   backgroundColor: "lightgray",
                                 },
                               }}
                             >
                    {insightData.needsAttentionQuestions.length ? (
                      insightData.needsAttentionQuestions.map((item) => (
                        <TableRow key={`${item.courseCode}-${item.questionId}`}>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {item.courseCode}
                          </TableCell>
                          <TableCell>{item.question}</TableCell>
                          <TableCell align="center">
                            {formatAverage(item.average)}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{
                              color: item.interpretation.color,
                              fontWeight: 700,
                            }}
                          >
                            {item.interpretation.label}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No questions below the attention threshold.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                mt: 1,
                ml: 1,
                width: "97%",
                border: `1px solid ${borderColor}`,
                p: 10,
                textAlign: "center",
              }}
            >
              There's no evaluation in this term.
            </Typography>
          )}
        </Box>
      )}

      <style>
        {`
                @media print {
                    @page {
                        margin: 0; 
                    }
                
                    body * {
                        visibility: hidden;
                    }

                    .print-container, .print-container * {
                        visibility: visible;
                    }
                    .print-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    button {
                        display: none !important; /* hide buttons */
                    }
                }
                `}
      </style>
    </Box>
  );
};

export default FacultyEvaluation;
