import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";
import API_BASE_URL from "../apiConfig";
import Search from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import useAuditMac from "../utils/useAuditMac";

// Set this to whatever page_id you register for this module in your
// page_access table (same pattern CoursePanel.jsx uses).
const PAGE_ID = 175;

// ✅ Each tagging is encoded server-side as:
// "programCode:yearDescription:yearLevelId:semesterId:isNstp:isComputerLab:isLabFee"
// joined with "||" between taggings. Parsed here into real objects so the
// UI can show each program's OWN flags instead of one blended value.
const parseTaggingBreakdown = (raw) => {
  if (!raw) return [];
  return raw.split("||").map((entry) => {
    const [
      programCode,
      yearDescription,
      yearLevelId,
      semesterId,
      isNstp,
      isComputerLab,
      isLabFee,
    ] = entry.split(":");
    return {
      programCode: programCode || "—",
      yearDescription: yearDescription || "—",
      yearLevelId,
      semesterId,
      isNstp: Number(isNstp) === 1,
      isComputerLab: Number(isComputerLab) === 1,
      isLabFee: Number(isLabFee) === 1,
    };
  });
};

const AcademicSubjectManagement = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);

  const colors = settings?.colors || {};
  const titleColor = colors.title || "#000000";
  const borderColor = colors.border || "#000000";
  const headerColor = colors.header || "#1976d2";

  const [employeeID, setEmployeeID] = useState("");
  const [userRole, setUserRole] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [taggedFilter, setTaggedFilter] = useState(""); // "", "tagged", "untagged"
  const [prereqFilter, setPrereqFilter] = useState(""); // "", "yes", "no"
  const [nstpFilter, setNstpFilter] = useState(false);

  // ✅ "summary" now holds ONLY the current page's rows — the server does
  // the filtering + LIMIT/OFFSET, not the browser.
  const [summary, setSummary] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsCourse, setDetailsCourse] = useState(null);
  const [detailsRows, setDetailsRows] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedRole && storedEmployeeID) {
      setUserRole(storedRole);
      setEmployeeID(storedEmployeeID);
      checkAccess(storedEmployeeID);
    } else {
      window.location.href = "/login";
    }
  }, []);

  // ✅ Debounce the search box so we don't fire a request on every keystroke —
  // wait 400ms after the user stops typing before it counts as a real search.
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  // ✅ Any filter change jumps back to page 1, same behavior as before —
  // just now it also means "re-fetch page 1 from the server with these filters".
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, taggedFilter, prereqFilter, nstpFilter]);

  // ✅ The actual data fetch — re-runs whenever the page or any filter changes.
  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch, taggedFilter, prereqFilter, nstpFilter]);

  const checkAccess = async (employeeID) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${PAGE_ID}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
      );
      setHasAccess(
        response.data && Number(response.data.page_privilege) === 1,
      );
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/course-tagging-summary`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
          params: {
            page: currentPage,
            limit: itemsPerPage,
            search: debouncedSearch || undefined,
            tagged: taggedFilter || undefined,
            prereq: prereqFilter || undefined,
            nstp: nstpFilter ? 1 : undefined,
          },
        },
      );

      const rows = res.data?.rows || [];
      const withBreakdown = rows.map((c) => ({
        ...c,
        breakdown: parseTaggingBreakdown(c.tagging_breakdown),
      }));

      setSummary(withBreakdown);
      setTotalCount(res.data?.total || 0);
      setTotalPages(res.data?.totalPages || 1);
    } catch (err) {
      console.error("Error fetching course tagging summary:", err);
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (course) => {
    setDetailsCourse(course);
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/course-tagging-summary/${course.course_id}/details`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } },
      );
      setDetailsRows(res.data || []);
    } catch (err) {
      console.error("Error fetching tagging details:", err);
      setDetailsRows([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;

  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
  }

  const styles = {
    tableCell: {
      border: `1px solid ${borderColor}`,
      padding: "8px",
      textAlign: "center",
    },
  };

  const paginationBar = (
    <TableContainer component={Paper} sx={{ width: "100%" }}>
      <Table size="small">
        <TableHead sx={{ backgroundColor: headerColor }}>
          <TableRow>
            <TableCell
              colSpan={10}
              sx={{
                border: `1px solid ${borderColor}`,
                py: 0.5,
                backgroundColor: headerColor,
                color: "white",
              }}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                gap={1}
                sx={{ height: "50px" }}
              >
                <Typography fontSize="14px" fontWeight="bold" color="white">
                  Total Subjects Records: {totalCount}
                </Typography>
                <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                  <Button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    variant="outlined"
                    size="small"
                    sx={{
                      minWidth: 80,
                      color: "white",
                      borderColor: "white",
                      backgroundColor: "transparent",
                      "&:hover": {
                        borderColor: "white",
                        backgroundColor: "rgba(255,255,255,0.1)",
                      },
                      "&.Mui-disabled": {
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        opacity: 1,
                      },
                    }}
                  >
                    First
                  </Button>

                  <Button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    variant="outlined"
                    size="small"
                    sx={{
                      minWidth: 80,
                      color: "white",
                      borderColor: "white",
                      backgroundColor: "transparent",
                      "&:hover": {
                        borderColor: "white",
                        backgroundColor: "rgba(255,255,255,0.1)",
                      },
                      "&.Mui-disabled": {
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        opacity: 1,
                      },
                    }}
                  >
                    Prev
                  </Button>

                  <FormControl size="small" sx={{ minWidth: 80 }}>
                    <Select
                      value={currentPage}
                      onChange={(e) => setCurrentPage(Number(e.target.value))}
                      displayEmpty
                      sx={{
                        fontSize: "12px",
                        height: 36,
                        color: "white",
                        border: "1px solid white",
                        backgroundColor: "transparent",
                        ".MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                        "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                        "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "white" },
                        "& svg": { color: "white" },
                      }}
                      MenuProps={{
                        PaperProps: { sx: { maxHeight: 200, backgroundColor: "#fff" } },
                      }}
                    >
                      {Array.from({ length: totalPages }, (_, i) => (
                        <MenuItem key={i + 1} value={i + 1}>
                          Page {i + 1}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Typography fontSize="11px" color="white">
                    of {totalPages} page{totalPages > 1 ? "s" : ""}
                  </Typography>

                  <Button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    variant="outlined"
                    size="small"
                    sx={{
                      minWidth: 80,
                      color: "white",
                      borderColor: "white",
                      backgroundColor: "transparent",
                      "&:hover": {
                        borderColor: "white",
                        backgroundColor: "rgba(255,255,255,0.1)",
                      },
                      "&.Mui-disabled": {
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        opacity: 1,
                      },
                    }}
                  >
                    Next
                  </Button>

                  <Button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    variant="outlined"
                    size="small"
                    sx={{
                      minWidth: 80,
                      color: "white",
                      borderColor: "white",
                      backgroundColor: "transparent",
                      "&:hover": {
                        borderColor: "white",
                        backgroundColor: "rgba(255,255,255,0.1)",
                      },
                      "&.Mui-disabled": {
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        opacity: 1,
                      },
                    }}
                  >
                    Last
                  </Button>
                </Box>
              </Box>
            </TableCell>
          </TableRow>
        </TableHead>
      </Table>
    </TableContainer>
  );

  return (
    <Box
      sx={{
        height: "calc(100vh - 150px)",
        overflowY: "auto",
        paddingRight: 1,
        backgroundColor: "transparent",
        mt: 1,
        p: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",

          mb: 2,
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
          ACADEMIC SUBJECT MANAGEMENT
        </Typography>


        <TextField
          variant="outlined"
          placeholder="Search Course Code / Description"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            width: 450,
            backgroundColor: "#fff",
            borderRadius: 1,
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
            },
          }}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: "gray" }} />,
          }}
        />


      </Box>
      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />

      <TableContainer
        component={Paper}
        sx={{
          width: "100%",
          border: `1px solid ${borderColor}`,

        }}
      >
        <Table size="small">
          <TableHead
            sx={{
              backgroundColor: headerColor,
            }}
          >
            <TableRow>
              <TableCell
                colSpan={20}
                sx={{
                  py: 0.5,
                  backgroundColor: headerColor,
                  color: "white",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  gap={1}
                  sx={{ height: "50px" }}
                >
                  {/* LEFT SIDE */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Course Tagged Filters:
                  </Typography>



                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "wrap",
          mb: 2,
          p: 1.5,
          border: "1px solid #ddd",
          borderRadius: "8px",
          backgroundColor: "#fafafa",
        }}
      >
        <Typography sx={{ fontWeight: "bold", fontSize: 14 }}>
          Filters:
        </Typography>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select
            displayEmpty
            value={taggedFilter}
            onChange={(e) => setTaggedFilter(e.target.value)}
          >
            <MenuItem value="">Tagging Status: All</MenuItem>
            <MenuItem value="tagged">Tagged (1+)</MenuItem>
            <MenuItem value="untagged">Untagged (0)</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            displayEmpty
            value={prereqFilter}
            onChange={(e) => setPrereqFilter(e.target.value)}
          >
            <MenuItem value="">Prereq: All</MenuItem>
            <MenuItem value="yes">Has Prereq</MenuItem>
            <MenuItem value="no">No Prereq</MenuItem>
          </Select>
        </FormControl>

        <Tooltip title="Shows courses that are flagged NSTP under at least one of their tagged programs">
          <Button
            variant={nstpFilter ? "contained" : "outlined"}
            color="warning"
            onClick={() => setNstpFilter((prev) => !prev)}
            sx={{ textTransform: "none" }}
          >
            NSTP Only
          </Button>
        </Tooltip>

        <Button
          variant="outlined"
          onClick={() => {
            setSearchQuery("");
            setTaggedFilter("");
            setPrereqFilter("");
            setNstpFilter(false);
          }}
          sx={{ textTransform: "none" }}
        >
          Reset Filters
        </Button>
      </Box>
      <br />
      <br />


      {paginationBar}

      <TableContainer component={Paper} sx={{ width: "100%" }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
            <TableRow>
              {[
                "#",
                "Code",
                "Description",
                "Subject Type",
                "Category",
                "Has Prereq",
                "Has Corequisite",
                "Times Tagged",
                "Tagged Into (Program · Year)",
                "Details",
              ].map((h) => (
                <TableCell
                  key={h}
                  sx={{
                    border: `1px solid ${borderColor}`,
                    color: "black",
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {summary.map((c, index) => {
              const taggedCount = Number(c.times_tagged) || 0;
              const hasPrereq = !!(c.prereq && String(c.prereq).trim());
              const hasCoreq = !!(
                c.corequisite && String(c.corequisite).trim()
              );

              return (
                <TableRow
                  key={c.course_id}
                  sx={{
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "#f2f2f2",
                  }}
                >
                  <TableCell sx={styles.tableCell}>
                    {indexOfFirstItem + index + 1}
                  </TableCell>
                  <TableCell sx={styles.tableCell}>{c.course_code}</TableCell>
                  <TableCell sx={styles.tableCell}>
                    {c.course_description}
                  </TableCell>
                  <TableCell sx={styles.tableCell}>
                    {c.subject_type_name || "—"}
                  </TableCell>
                  <TableCell sx={styles.tableCell}>
                    {c.category_type_name || "—"}
                  </TableCell>
                  <TableCell sx={styles.tableCell}>
                    {hasPrereq ? "YES" : "NO"}
                  </TableCell>
                  <TableCell sx={styles.tableCell}>
                    {hasCoreq ? "YES" : "NO"}
                  </TableCell>
                  <TableCell sx={styles.tableCell}>
                    <Chip
                      size="small"
                      label={taggedCount}
                      color={taggedCount > 0 ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell sx={styles.tableCell}>
                    {c.breakdown.length > 0 ? (
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 0.5,
                          justifyContent: "center",
                        }}
                      >
                        {/* ✅ Each chip reflects ONE tagging's own flags —
                            a course tagged NSTP under Program A but not
                            Program B now shows two differently-colored
                            chips instead of one blanket badge. */}
                        {c.breakdown.map((b, i) => (
                          <Tooltip
                            key={`${b.programCode}-${i}`}
                            title={
                              <>
                                Year: {b.yearDescription}
                                <br />
                                NSTP: {b.isNstp ? "Yes" : "No"}
                                <br />
                                Computer Lab: {b.isComputerLab ? "Yes" : "No"}
                                <br />
                                Lab Fee: {b.isLabFee ? "Yes" : "No"}
                              </>
                            }
                          >
                            <Chip
                              size="small"
                              label={`${b.programCode} · ${b.yearDescription}`}
                              color={b.isNstp ? "warning" : "default"}
                              variant={b.isNstp ? "filled" : "outlined"}
                            />
                          </Tooltip>
                        ))}
                      </Box>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell sx={styles.tableCell}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={taggedCount === 0}
                      onClick={() => openDetails(c)}
                      startIcon={<VisibilityIcon fontSize="small" />}
                      sx={{ textTransform: "none" }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {paginationBar}

      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ background: headerColor, color: "#fff" }}>
          Tagging Details — {detailsCourse?.course_code} (
          {detailsCourse?.course_description})
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 1 }}>
          {detailsLoading ? (
            <Typography>Loading...</Typography>
          ) : detailsRows.length === 0 ? (
            <Typography>This course is not tagged anywhere.</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small" sx={{ marginTop: "15px" }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{
                      color: "#000",
                      border: `1px solid ${borderColor}`,
                      padding: "8px",
                      textAlign: "center",
                    }}>Program</TableCell>
                    <TableCell sx={{
                      color: "#000",
                      border: `1px solid ${borderColor}`,
                      padding: "8px",
                      textAlign: "center",
                    }}>Major</TableCell>
                    <TableCell sx={{
                      color: "#000",
                      border: `1px solid ${borderColor}`,
                      padding: "8px",
                      textAlign: "center",
                    }}>School Year</TableCell>
                    <TableCell sx={{
                      color: "#000",
                      border: `1px solid ${borderColor}`,
                      padding: "8px",
                      textAlign: "center",
                    }}>Year Level</TableCell>
                    <TableCell sx={{
                      color: "#000",
                      border: `1px solid ${borderColor}`,
                      padding: "8px",
                      textAlign: "center",
                    }}>Semester</TableCell>
                    <TableCell sx={{
                      color: "#000",
                      border: `1px solid ${borderColor}`,
                      padding: "8px",
                      textAlign: "center",
                    }}>NSTP?</TableCell>
                    <TableCell sx={{
                      color: "#000",
                      border: `1px solid ${borderColor}`,
                      padding: "8px",
                      textAlign: "center",
                    }}>Computer Lab?</TableCell>
                    <TableCell sx={{
                      color: "#000",
                      border: `1px solid ${borderColor}`,
                      padding: "8px",
                      textAlign: "center",
                    }}>Lab Fee?</TableCell>
                    <TableCell sx={{
                      color: "#000",
                      border: `1px solid ${borderColor}`,
                      padding: "8px",
                      textAlign: "center",
                    }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailsRows.map((row) => (
                    <TableRow key={row.program_tagging_id}>
                      <TableCell
                        sx={{
                          color: "#000",
                          border: `1px solid ${borderColor}`,
                          padding: "8px",
                          textAlign: "center",
                        }}
                      >({row.program_code}) - {row.program_description}</TableCell>
                      <TableCell sx={{
                        color: "#000",
                        border: `1px solid ${borderColor}`,
                        padding: "8px",
                        textAlign: "center",
                      }}>{row.major || "—"}</TableCell>
                      <TableCell sx={{
                        color: "#000",
                        border: `1px solid ${borderColor}`,
                        padding: "8px",
                        textAlign: "center",
                      }}>{row.school_year || "—"}</TableCell>
                      <TableCell sx={{
                        color: "#000",
                        border: `1px solid ${borderColor}`,
                        padding: "8px",
                        textAlign: "center",
                      }}>{row.year_level_id}</TableCell>
                      <TableCell sx={{
                        color: "#000",
                        border: `1px solid ${borderColor}`,
                        padding: "8px",
                        textAlign: "center",
                      }}>{row.semester_id}</TableCell>
                      <TableCell sx={{
                        color: "#000",
                        border: `1px solid ${borderColor}`,
                        padding: "8px",
                        textAlign: "center",
                      }}>
                        {Number(row.is_nstp) === 1 ? (
                          <Chip size="small" color="warning" label="NSTP" />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell sx={{
                        color: "#000",
                        border: `1px solid ${borderColor}`,
                        padding: "8px",
                        textAlign: "center",
                      }}>
                        {Number(row.iscomputer_lab) === 1 ? "YES" : "NO"}
                      </TableCell >
                      <TableCell sx={{
                        color: "#000",
                        border: `1px solid ${borderColor}`,
                        padding: "8px",
                        textAlign: "center",
                      }}>
                        {Number(row.islaboratory_fee) === 1 ? "YES" : "NO"}
                      </TableCell>
                      <TableCell sx={{
                        color: "#000",
                        border: `1px solid ${borderColor}`,
                        padding: "8px",
                        textAlign: "center",
                      }}>
                        {Number(row.lock_status) === 1 ? "Inactive" : "Active"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button onClick={() => setDetailsOpen(false)}
            color="error"
            variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AcademicSubjectManagement;
