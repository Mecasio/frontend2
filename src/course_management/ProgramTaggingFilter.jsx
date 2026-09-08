import React, { useMemo, useEffect, useState, useContext } from "react";
import { SettingsContext } from "../App";
import { Box, Typography, FormControl, Select, MenuItem, Button } from "@mui/material";

const ProgramTaggingFilter = ({
  curriculumList,
  yearLevelList,
  semesterList,
  taggedPrograms,

  selectedCurriculum,
  selectedYearLevel,
  selectedSemester,

  setSelectedCurriculum,
  setSelectedYearLevel,
  setSelectedSemester,

  setFilteredPrograms,
}) => {
  const settings = useContext(SettingsContext);

  const branches = settings?.branches || [];
  const [selectedCampus, setSelectedCampus] = useState("");
  const [selectedAcademicProgram, setSelectedAcademicProgram] = useState("");

  /* ===== FILTERS ===== */
  const filteredCurriculumList = useMemo(() => {
    return curriculumList.filter((item) => {
      if (selectedCampus !== "" && Number(item.components) !== Number(selectedCampus))
        return false;
      if (
        selectedAcademicProgram !== "" &&
        Number(item.academic_program) !== Number(selectedAcademicProgram)
      )
        return false;
      return true;
    });
  }, [curriculumList, selectedCampus, selectedAcademicProgram]);

  const yearOrder = {
    "First Year": 1,
    "Second Year": 2,
    "Third Year": 3,
    "Fourth Year": 4,
    "Fifth Year": 5,
  };
  const semesterOrder = {
    "First Semester": 1,
    "Second Semester": 2,
  };

  const filteredYearLevels = useMemo(() => {
    if (!selectedCurriculum) return [];
    const usedYearLevels = taggedPrograms
      .filter((p) => p.curriculum_id == selectedCurriculum)
      .map((p) => p.year_level_id);
    return yearLevelList
      .filter((y) => usedYearLevels.includes(y.year_level_id))
      .sort((a, b) => (yearOrder[a.year_level_description] || 99) - (yearOrder[b.year_level_description] || 99));
  }, [selectedCurriculum, taggedPrograms, yearLevelList]);

  const filteredSemesters = useMemo(() => {
    if (!selectedCurriculum) return [];
    const usedSemesters = taggedPrograms
      .filter((p) => p.curriculum_id == selectedCurriculum)
      .map((p) => p.semester_id);
    return semesterList
      .filter((s) => usedSemesters.includes(s.semester_id))
      .sort((a, b) => (semesterOrder[a.semester_description] || 99) - (semesterOrder[b.semester_description] || 99));
  }, [selectedCurriculum, taggedPrograms, semesterList]);

  const formatSchoolYear = (yearDesc) => {
    const startYear = Number(yearDesc);
    if (isNaN(startYear)) return yearDesc;
    return `${startYear} - ${startYear + 1}`;
  };

  const applyFilter = () => {
    let result = taggedPrograms;
    if (selectedCurriculum) result = result.filter((p) => p.curriculum_id == selectedCurriculum);
    if (selectedYearLevel) result = result.filter((p) => p.year_level_id == selectedYearLevel);
    if (selectedSemester) result = result.filter((p) => p.semester_id == selectedSemester);
    setFilteredPrograms(result);
  };

  useEffect(() => {
    applyFilter();
  }, [selectedCurriculum, selectedYearLevel, selectedSemester, taggedPrograms]);


  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        flexWrap: "wrap",
        p: 1.5,
        border: "1px solid #ddd",
        borderRadius: "8px",
        backgroundColor: "#fafafa",
      }}
    >
      <Typography sx={{ fontWeight: "bold", fontSize: 14 }}>
        Filters:
      </Typography>

      {/* CAMPUS */}
      <FormControl size="small" sx={{ minWidth: 170 }}>
        <Select
          displayEmpty
          value={selectedCampus}
          onChange={(e) => {
            setSelectedCampus(e.target.value);
            setSelectedAcademicProgram("");
            setSelectedCurriculum("");
            setSelectedYearLevel("");
            setSelectedSemester("");
          }}
        >
          <MenuItem value="">Campus: All</MenuItem>
          {branches.map((b) => (
            <MenuItem key={b.id} value={b.id}>
              {b.branch}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* ACADEMIC PROGRAM */}
      <FormControl size="small" sx={{ minWidth: 190 }}>
        <Select
          displayEmpty
          value={selectedAcademicProgram}
          onChange={(e) => {
            setSelectedAcademicProgram(e.target.value);
            setSelectedCurriculum("");
            setSelectedYearLevel("");
            setSelectedSemester("");
          }}
          disabled={!selectedCampus}
        >
          <MenuItem value="">Academic Program: All</MenuItem>
          <MenuItem value="0">Undergraduate</MenuItem>
          <MenuItem value="1">Graduate</MenuItem>
          <MenuItem value="2">Techvoc</MenuItem>
        </Select>
      </FormControl>

      {/* CURRICULUM */}
      <FormControl size="small" sx={{ minWidth: 220 }}>
        <Select
          displayEmpty
          value={selectedCurriculum}
          onChange={(e) => {
            setSelectedCurriculum(e.target.value);
            setSelectedYearLevel("");
            setSelectedSemester("");
          }}
          disabled={!selectedAcademicProgram}
        >
          <MenuItem value="">Curriculum: All</MenuItem>
          {filteredCurriculumList.map((c) => (
            <MenuItem key={c.curriculum_id} value={c.curriculum_id}>
              {formatSchoolYear(c.year_description)}: ({c.program_code}) – {c.program_description}
              {c.major ? ` (${c.major})` : ""}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* YEAR LEVEL */}
      <FormControl size="small" sx={{ minWidth: 170 }}>
        <Select
          displayEmpty
          value={selectedYearLevel}
          onChange={(e) => setSelectedYearLevel(e.target.value)}
          disabled={!selectedCurriculum}
        >
          <MenuItem value="">Year Level: All</MenuItem>
          {filteredYearLevels.map((y) => (
            <MenuItem key={y.year_level_id} value={y.year_level_id}>
              {y.year_level_description}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* SEMESTER */}
      <FormControl size="small" sx={{ minWidth: 170 }}>
        <Select
          displayEmpty
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          disabled={!selectedCurriculum}
        >
          <MenuItem value="">Semester: All</MenuItem>
          {filteredSemesters.map((s) => (
            <MenuItem key={s.semester_id} value={s.semester_id}>
              {s.semester_description}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

  
    </Box>
  );
};

export default ProgramTaggingFilter;