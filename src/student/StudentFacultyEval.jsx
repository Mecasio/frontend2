import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  FormControlLabel,
  Button,
  Paper,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  Grid,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
  Chip,
  Collapse,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import axios from "axios";
import API_BASE_URL from "../apiConfig";

const StudentFacultyEvaluation = () => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");

  // Collapsible rating criteria on mobile
  const [criteriaOpen, setCriteriaOpen] = useState(false);

  useEffect(() => {
    if (!settings) return;

    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
  }, [settings]);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const [userID, setUserID] = useState("");
  const [studentCourses, setStudentCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [studentNumber, setStudentNumber] = useState("");
  const [matriculationBalanceInfo, setMatriculationBalanceInfo] = useState({ hasBalance: false, balance: 0 });
  const [evaluationPeriodLoading, setEvaluationPeriodLoading] = useState(true);
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const fetchEvaluationPeriodStatus = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/get-grading-period`);
      const periods = Array.isArray(data) ? data : [];
      const finalGradingPeriod = periods.find(
        (period) =>
          String(period.description || "").trim().toLowerCase() ===
          "final grading period",
      );
      const open = Number(finalGradingPeriod?.status) === 1;

      setIsEvaluationOpen(open);
      return open;
    } catch (error) {
      console.error("Error checking evaluation period status:", error);
      setIsEvaluationOpen(false);
      showSnackbar("Failed to check faculty evaluation period status.", "error");
      return false;
    } finally {
      setEvaluationPeriodLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");

    if (storedUser && storedRole && storedID) {
      setUserID(storedID);

      if (storedRole !== "student") {
        window.location.href = "/faculty_dashboard";
      } else {
        fetchEvaluationPeriodStatus().then((open) => {
          if (open) fetchCourseData(storedID, open);
        });
      }
    } else {
      window.location.href = "/login";
    }
    // Session bootstrap should run once on page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchQuestions = async (schoolYearId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/get_questions_for_evaluation`, {
        params: schoolYearId ? { school_year_id: schoolYearId } : {},
      });
      setQuestions(response.data);
    } catch {
      showSnackbar("Failed to fetch questions", "error");
    }
  };

  const fetchMatriculationBalance = async (studentNumber) => {
    if (!studentNumber) return { hasBalance: false, balance: 0 };

    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/check-student-balance`, {
        student_number: studentNumber,
      });
      const balance = Number(data?.balance || 0);

      return {
        hasBalance: Boolean(data?.hasBalance) && balance > 0,
        balance: Number.isFinite(balance) ? balance : 0,
      };
    } catch {
      return { hasBalance: false, balance: 0 };
    }
  };

  const fetchStudentNumber = async (personId) => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/person/enrollment_data/${personId}`);
      return data?.student_number || "";
    } catch {
      return "";
    }
  };

  const fetchCourseData = async (id, evaluationOpenOverride = isEvaluationOpen) => {
    if (!evaluationOpenOverride) {
      setStudentCourses([]);
      setSelectedCourse("");
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/api/student_course/${id}`);
      const courses = Array.isArray(res.data) ? res.data : [];
      const currentStudentNumber = courses[0]?.student_number || await fetchStudentNumber(id);
      const balanceInfo = await fetchMatriculationBalance(currentStudentNumber);

      setStudentNumber(currentStudentNumber);
      setMatriculationBalanceInfo(balanceInfo);

      if (balanceInfo.hasBalance) {
        setStudentCourses([]);
        setSelectedCourse("");
        showSnackbar("You are not currently fully paid for this current semester. Please settle your matriculation balance before evaluating faculty.", "warning");
        return;
      }

      setStudentCourses(courses);
    } catch {
      console.log("No courses found");
      const currentStudentNumber = await fetchStudentNumber(id);
      const balanceInfo = await fetchMatriculationBalance(currentStudentNumber);

      setStudentNumber(currentStudentNumber);
      setMatriculationBalanceInfo(balanceInfo);
      setStudentCourses([]);

      if (balanceInfo.hasBalance) {
        showSnackbar("You are not currently fully paid for this current semester. Please settle your matriculation balance before evaluating faculty.", "warning");
      }
    }
  };

  const handleSelectedCourse = (event) => setSelectedCourse(event.target.value);
  const handleAnswerChange = (question_id, value) =>
    setAnswers((prev) => ({ ...prev, [question_id]: value }));

  const getCourseEvaluationKey = (course) =>
    `${course.active_school_year_id}-${course.course_id}-${course.prof_id || "TBA"}`;

  const selectedProfessor = studentCourses.find(
    (prof) => getCourseEvaluationKey(prof) === selectedCourse,
  );

  useEffect(() => {
    if (!isEvaluationOpen) {
      setQuestions([]);
      return;
    }

    if (selectedProfessor?.active_school_year_id) {
      fetchQuestions(selectedProfessor.active_school_year_id);
    } else {
      setQuestions([]);
    }
    // Questions reload only when the evaluation gate or selected school year changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEvaluationOpen, selectedProfessor?.active_school_year_id]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const SaveEvaluation = async () => {
    if (!isEvaluationOpen) {
      showSnackbar("Faculty evaluation is currently closed.", "warning");
      return;
    }

    if (matriculationBalanceInfo.hasBalance) {
      showSnackbar("You are not currently fully paid for this current semester. Please settle your matriculation balance before evaluating faculty.", "warning");
      return;
    }

    if (!selectedProfessor) {
      showSnackbar("Please select a course before submitting.", "warning");
      return;
    }

    try {
      for (const [question_id, answer] of Object.entries(answers)) {
        await axios.post(`${API_BASE_URL}/api/student_evaluation`, {
          student_number: studentNumber,
          school_year_id: selectedProfessor.active_school_year_id,
          prof_id: selectedProfessor.prof_id,
          course_id: selectedProfessor.course_id,
          question_id,
          answer,
        });
      }
      showSnackbar("Evaluation submitted successfully!", "success");
      setAnswers({});
      setSelectedCourse("");
      fetchCourseData(userID);
    } catch {
      showSnackbar("Failed to save evaluation.", "error");
    }
  };

  const groupedQuestions = questions.reduce((groups, question) => {
    const { category } = question;
    if (!groups[category]) groups[category] = [];
    groups[category].push(question);
    return groups;
  }, {});

  // 🔒 Disable right-click + block DevTools shortcuts / Ctrl+P
  // (moved into useEffect with cleanup — the original attached a fresh
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


  const ratingCriteria = [
    { scale: 5, label: "Always manifested", desc: "Evident in nearly all relevant situations (91–100%)." },
    { scale: 4, label: "Often manifested", desc: "Evident most of the time (61–90%)." },
    { scale: 3, label: "Sometimes manifested", desc: "Evident about half the time (31–60%)." },
    { scale: 2, label: "Seldom manifested", desc: "Rarely evident (11–30%)." },
    { scale: 1, label: "Never manifested", desc: "Almost never evident (0–10%)." },
  ];

  const formattedMatriculationBalance = matriculationBalanceInfo.balance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const evaluationClosedWarning = (
    <Alert
      severity="warning"
      sx={{
        borderRadius: 2,
        mb: 3,
        fontSize: { xs: 12.5, sm: 14 },
        border: "1px solid #f59e0b",
        backgroundColor: "#fffbeb",
        color: "#7c2d12",
        "& .MuiAlert-icon": { color: "#d97706" },
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: { xs: 14, sm: 16 }, mb: 0.5 }}>
        The faculty evaluation is currently closed.
      </Typography>
      <Typography sx={{ fontSize: { xs: 12.5, sm: 14 } }}>
        Faculty evaluation will only be available when the{" "}
        <b>Final Grading Period</b> is active. Please check again once the
        registrar opens the final grading period.
      </Typography>
    </Alert>
  );

  // Mobile / tablet: render radio choices as a vertical list with scale badges
  const renderMobileChoices = (q) => {
    const choices = [
      q.first_choice, q.second_choice, q.third_choice,
      q.fourth_choice, q.fifth_choice,
    ].filter(Boolean);

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
        {choices.map((choice, index) => {
          const isSelected = answers[q.question_id] === choice;
          return (
            <Box
              key={index}
              onClick={() => handleAnswerChange(q.question_id, choice)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                p: 1.2,
                borderRadius: "8px",
                border: isSelected
                  ? `2px solid ${mainButtonColor}`
                  : `1px solid ${borderColor}`,
                backgroundColor: isSelected ? `${mainButtonColor}15` : "transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Radio
                size="small"
                checked={isSelected}
                onChange={() => handleAnswerChange(q.question_id, choice)}
                sx={{ p: 0 }}
              />
              <Typography sx={{ fontSize: { xs: 13, sm: 14 }, flex: 1 }}>{choice}</Typography>
            </Box>
          );
        })}
      </Box>
    );
  };

  // Desktop (lg+): original equal-width grid choices
  const renderDesktopChoices = (q) => {
    const choices = [
      q.first_choice, q.second_choice, q.third_choice,
      q.fourth_choice, q.fifth_choice,
    ].filter(Boolean);

    return (
      <Grid container spacing={1}>
        {choices.map((choice, index) => (
          <Grid item xs={12 / choices.length} key={index}>
            <Paper
              variant="outlined"
              sx={{
                p: 0.5,
                borderRadius: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <FormControlLabel
                sx={{ m: 0 }}
                control={<Radio size="small" />}
                value={choice}
                checked={answers[q.question_id] === choice}
                onChange={() => handleAnswerChange(q.question_id, choice)}
                label={<Typography sx={{ fontSize: { md: 12.5, lg: 14 } }}>{choice}</Typography>}
              />
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box
      sx={{
        minHeight: { xs: "100vh", md: "calc(100vh - 150px)" },
        overflowY: { md: "auto" },
        backgroundColor: { xs: "#f5f5f5", md: "transparent" },
        pr: { md: 1 },
        mt: { md: 1 },
        p: { xs: 0, sm: 2 },
        pb: { xs: 6, sm: 2 },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          mb: 2,
          px: { xs: 1.5, sm: 0 },
          pt: { xs: 2, sm: 0 },
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: { xs: 20, sm: 28, md: 34, lg: 36 },
          }}
        >
          FACULTY EVALUATION FORM
        </Typography>
      </Box>
      <Box sx={{ borderTop: "1px solid #ccc", width: "100%" }} />
      <Box sx={{ height: { xs: 16, sm: 20 } }} />

      <Box sx={{ px: { xs: 1.5, sm: 0 } }}>
        {!evaluationPeriodLoading && !isEvaluationOpen && evaluationClosedWarning}

        {matriculationBalanceInfo.hasBalance && (
          <Alert severity="warning" sx={{ borderRadius: 2, mb: 3, fontSize: { xs: 12.5, sm: 14 } }}>
            You are not currently fully paid for this current semester. Your remaining matriculation balance is{" "}
            <b>{formattedMatriculationBalance}</b>. Please settle your balance before evaluating faculty.
          </Alert>
        )}

        {evaluationPeriodLoading ? (
          <Paper
            sx={{
              p: { xs: 2, sm: 3 },
              borderRadius: 3,
              border: `1px solid ${borderColor}`,
              boxShadow: 1,
            }}
          >
            <Typography sx={{ color: subtitleColor }}>
              Checking faculty evaluation availability...
            </Typography>
          </Paper>
        ) : isEvaluationOpen && (
          <>
            {/* Choose Course + Rating Criteria panels */}
            <Grid container spacing={2} sx={{ mb: 4 }}>

          {/* CHOOSE COURSE PANEL */}
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: 3,
                border: `1px solid ${borderColor}`,
                boxShadow: 1,
                height: "100%",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, color: titleColor, mb: 2, fontSize: { xs: 14, sm: 16, md: 18 } }}>
                CHOOSE COURSE
              </Typography>

              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Course</InputLabel>
                  <Select
                    value={selectedCourse}
                    onChange={handleSelectedCourse}
                    label="Select Course"
                    disabled={matriculationBalanceInfo.hasBalance}
                  >
                    {studentCourses.map((c) => (
                      <MenuItem key={getCourseEvaluationKey(c)} value={getCourseEvaluationKey(c)}>
                        {c.course_code} - {c.course_description}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {selectedProfessor && (
                <Box sx={{ mt: 1 }}>
                  {[
                    {
                      label: "Name of Faculty being Evaluated",
                      value: `${selectedProfessor.fname || ""} ${selectedProfessor.mname || ""} ${selectedProfessor.lname || ""}`.trim(),
                    },
                    { label: "College/Department", value: selectedProfessor.department || "" },
                    { label: "Course Code", value: selectedProfessor.course_code || "" },
                    {
                      label: "Program Code",
                      value: [selectedProfessor.curriculum_year, selectedProfessor.program_code].filter(Boolean).join("-"),
                    },
                    {
                      label: "Semester or Term/Academic Year",
                      value: [
                        [selectedProfessor.current_year, selectedProfessor.next_year].filter(Boolean).join(" - "),
                        selectedProfessor.semester_description,
                      ].filter(Boolean).join(", "),
                    },
                  ].map((row, index) => (
                    // On mobile/tablet: stacked label + value; on desktop (lg+): side-by-side grid
                    isMobile ? (
                      <Box key={index} sx={{ mb: 1.2, pb: 1, borderBottom: "1px solid #f0f0f0" }}>
                        <Typography sx={{ fontSize: { xs: 11.5, sm: 12.5 }, color: subtitleColor }}>{row.label}</Typography>
                        <Typography sx={{ fontSize: { xs: 13, sm: 14 }, fontWeight: 600 }}>{row.value}</Typography>
                      </Box>
                    ) : (
                      <Grid container key={index} sx={{ mb: 1.2 }}>
                        <Grid item xs={7}>
                          <Typography sx={{ fontSize: { md: 13, lg: 14 } }}>{row.label}</Typography>
                        </Grid>
                        <Grid item xs={1}>
                          <Typography sx={{ fontSize: { md: 13, lg: 14 } }}>:</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography sx={{ fontSize: { md: 13, lg: 14 }, fontWeight: 600 }}>{row.value}</Typography>
                        </Grid>
                      </Grid>
                    )
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* RATING CRITERIA */}
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: 3,
                border: `1px solid ${borderColor}`,
                boxShadow: 1,
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* On mobile/tablet: collapsible header */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: criteriaOpen || !isMobile ? 2 : 0,
                  cursor: isMobile ? "pointer" : "default",
                }}
                onClick={() => isMobile && setCriteriaOpen((prev) => !prev)}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, color: titleColor, fontSize: { xs: 14, sm: 16, md: 18 } }}>
                  Rating Criteria
                </Typography>
                {isMobile && (
                  <IconButton size="small">
                    {criteriaOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                )}
              </Box>

              <Collapse in={!isMobile || criteriaOpen}>
                {/* Mobile/tablet: compact badge cards instead of a 3-column table */}
                {isMobile ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {ratingCriteria.map((r) => (
                      <Box
                        key={r.scale}
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 1.5,
                          p: 1.2,
                          borderRadius: "8px",
                          border: `1px solid ${borderColor}`,
                          backgroundColor: "#fafafa",
                        }}
                      >
                        <Chip
                          label={r.scale}
                          size="small"
                          sx={{
                            backgroundColor: headerColor || "#1976d2",
                            color: "white",
                            fontWeight: 700,
                            minWidth: 32,
                            flexShrink: 0,
                          }}
                        />
                        <Box>
                          <Typography sx={{ fontSize: { xs: 12.5, sm: 13.5 }, fontWeight: 600 }}>{r.label}</Typography>
                          <Typography sx={{ fontSize: { xs: 11.5, sm: 12.5 }, color: subtitleColor }}>{r.desc}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <TableContainer component={Paper} sx={{ boxShadow: "none", borderRadius: 2, flexGrow: 1, overflowX: "auto" }}>
                    <Table size="small" sx={{ minWidth: 480 }}>
                      <TableHead>
                        <TableRow
                          sx={{
                            backgroundColor: headerColor || "#1976d2",
                            color: "white",
                            border: `1px solid ${borderColor}`,
                          }}
                        >
                          {["Scale", "Qualitative Description", "Operational Definition"].map((h) => (
                            <TableCell key={h} sx={{ fontWeight: 700, color: "white", border: `1px solid ${borderColor}`, fontSize: { md: 12.5, lg: 14 } }}>
                              {h}
                            </TableCell>
                          ))}
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
                        {ratingCriteria.map((r) => (
                          <TableRow key={r.scale} sx={{ border: `1px solid ${borderColor}` }}>
                            <TableCell sx={{ fontWeight: 600, border: `1px solid ${borderColor}`, fontSize: { md: 12.5, lg: 14 } }}>{r.scale}</TableCell>
                            <TableCell sx={{ border: `1px solid ${borderColor}`, fontSize: { md: 12.5, lg: 14 } }}>{r.label}</TableCell>
                            <TableCell sx={{ border: `1px solid ${borderColor}`, fontSize: { md: 12.5, lg: 14 } }}>{r.desc}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Collapse>
            </Paper>
          </Grid>
            </Grid>
          </>
        )}

        {/* CATEGORY SECTIONS */}
        {isEvaluationOpen && selectedProfessor &&
          Object.entries(groupedQuestions).map(([category, items]) => {
            const isInteraction = category.toLowerCase().includes("interaction");
            const headerBg = isInteraction ? "#eef8ee" : "#e9f4ff";

            return (
              <Box key={category} mb={4}>
                {/* Section Header */}
                <Box
                  sx={{
                    background: headerBg,
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: 2,
                    border: `1px solid ${borderColor}`,
                    mb: 2,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: 18, sm: 24, md: 32, lg: 38 },
                      color: titleColor,
                    }}
                  >
                    {items[0].title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontStyle: "italic",
                      fontSize: { xs: 12.5, sm: 14, md: 15 },
                      color: subtitleColor,
                    }}
                  >
                    {items[0].meaning}
                  </Typography>
                </Box>

                {/* Questions */}
                {items.map((q) => (
                  <Paper
                    key={q.question_id}
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      mb: 2,
                      borderRadius: 2,
                      border: `1px solid ${borderColor}`,
                      boxShadow: 0,
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 700, mb: 1, fontSize: { xs: 13.5, sm: 15, md: 16 } }}
                    >
                      {q.question_description}
                    </Typography>

                    {isMobile
                      ? renderMobileChoices(q)
                      : renderDesktopChoices(q)}
                  </Paper>
                ))}
              </Box>
            );
          })}

        {/* Action Buttons */}
        {isEvaluationOpen && selectedProfessor && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 2,
              mt: 3,
              mb: { xs: 4, sm: 10 },
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <Button
              variant="outlined"
              color="error"
              fullWidth={isMobile}
              onClick={() => setResetDialogOpen(true)}
            >
              Reset Answers
            </Button>

            <Button
              variant="contained"
              fullWidth={isMobile}
              sx={{ bgcolor: "#1976d2", "&:hover": { bgcolor: "#155fa0" } }}
              onClick={() => setSaveDialogOpen(true)}
            >
              Save Evaluation
            </Button>
          </Box>
        )}
      </Box>

      {/* RESET DIALOG */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Reset Your Answers</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to clear all answers? This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column-reverse", sm: "row" }, gap: { xs: 1, sm: 0 }, px: 2, pb: 2 }}>
          <Button color="error" variant="outlined" fullWidth={isMobile} onClick={() => setResetDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            fullWidth={isMobile}
            onClick={() => {
              setAnswers({});
              setResetDialogOpen(false);
            }}
          >
            Confirm Reset
          </Button>
        </DialogActions>
      </Dialog>

      {/* SAVE DIALOG */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Submit Evaluation</DialogTitle>
        <DialogContent>
          <Typography>Do you want to submit your evaluation? Make sure everything is answered.</Typography>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: "column-reverse", sm: "row" }, gap: { xs: 1, sm: 0 }, px: 2, pb: 2 }}>
          <Button color="error" variant="outlined" fullWidth={isMobile} onClick={() => setSaveDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            fullWidth={isMobile}
            onClick={() => {
              setSaveDialogOpen(false);
              SaveEvaluation();
            }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbarSeverity}>{snackbarMessage}</Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentFacultyEvaluation;
