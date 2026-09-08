import { useEffect, useState } from "react";
import API_BASE_URL from "../apiConfig";
import {
  dedupeClassListSections,
  fetchClassListDepartmentSections,
  fetchClassListDepartmentSectionsForDepartments,
  fetchClassListFilterStudentNumbers,
  fetchClassListProfessorSections,
  fetchClassListProfessors,
} from "../utils/classListProfSection";

export default function useClassListProfSectionFilters({
  selectedDepartmentFilter,
  departmentIds = [],
  selectedProgramOption,
  selectedSchoolYear,
  selectedSchoolSemester,
  setCurrentPage,
}) {
  const [professors, setProfessors] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedProfessorFilter, setSelectedProfessorFilter] = useState("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState("");
  const [filterStudentNumbers, setFilterStudentNumbers] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const rows = await fetchClassListProfessors(
          API_BASE_URL,
          selectedDepartmentFilter || "",
        );
        if (!cancelled) setProfessors(rows);
      } catch (err) {
        console.error("Error fetching professors for class list:", err);
        if (!cancelled) setProfessors([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDepartmentFilter]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!selectedSchoolYear || !selectedSchoolSemester) {
        if (!cancelled) setSections([]);
        return;
      }

      try {
        let rows = [];

        if (selectedProfessorFilter) {
          rows = await fetchClassListProfessorSections(API_BASE_URL, {
            professorId: selectedProfessorFilter,
            yearId: selectedSchoolYear,
            semesterId: selectedSchoolSemester,
            departmentId: selectedDepartmentFilter || undefined,
          });
        } else if (selectedDepartmentFilter) {
          rows = await fetchClassListDepartmentSections(
            API_BASE_URL,
            selectedDepartmentFilter,
            selectedProgramOption,
          );
        } else if (departmentIds.length) {
          rows = await fetchClassListDepartmentSectionsForDepartments(
            API_BASE_URL,
            departmentIds,
            selectedProgramOption,
          );
        }

        if (!cancelled) {
          setSections(dedupeClassListSections(rows));
        }
      } catch (err) {
        console.error("Error fetching sections for class list:", err);
        if (!cancelled) setSections([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    selectedDepartmentFilter,
    departmentIds,
    selectedProfessorFilter,
    selectedProgramOption,
    selectedSchoolYear,
    selectedSchoolSemester,
  ]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (
        (!selectedProfessorFilter && !selectedSectionFilter) ||
        !selectedSchoolYear ||
        !selectedSchoolSemester
      ) {
        if (!cancelled) setFilterStudentNumbers(null);
        return;
      }

      try {
        const numbers = await fetchClassListFilterStudentNumbers(API_BASE_URL, {
          professorId: selectedSectionFilter ? undefined : selectedProfessorFilter,
          departmentSectionId: selectedSectionFilter || undefined,
          yearId: selectedSchoolYear,
          semesterId: selectedSchoolSemester,
        });
        if (!cancelled) {
          setFilterStudentNumbers(new Set(numbers));
        }
      } catch (err) {
        console.error("Error fetching class list prof/section filter:", err);
        if (!cancelled) setFilterStudentNumbers(new Set());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    selectedProfessorFilter,
    selectedSectionFilter,
    selectedSchoolYear,
    selectedSchoolSemester,
  ]);

  useEffect(() => {
    setSelectedSectionFilter("");
  }, [selectedDepartmentFilter, selectedProfessorFilter, selectedProgramOption?.curriculum_id]);

  const handleProfessorChange = (value) => {
    setSelectedProfessorFilter(value === "" || value == null ? "" : String(value));
    setSelectedSectionFilter("");
    setCurrentPage(1);
  };

  const handleSectionChange = (value) => {
    setSelectedSectionFilter(value === "" || value == null ? "" : String(value));
    setCurrentPage(1);
  };

  const matchProfSectionFilter = (student) => {
    if (!selectedProfessorFilter && !selectedSectionFilter) return true;
    if (!filterStudentNumbers) return false;
    return filterStudentNumbers.has(String(student.student_number));
  };

  return {
    professors,
    sections,
    selectedProfessorFilter,
    selectedSectionFilter,
    handleProfessorChange,
    handleSectionChange,
    matchProfSectionFilter,
  };
}
