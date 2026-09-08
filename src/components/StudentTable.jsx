import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import {
  Box,
  Paper,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import axios from "axios";
import API_BASE_URL from "../apiConfig";
import { postAuditEvent } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const StudentTable = ({ data, paymentType, onRemove }) => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const headerColor = colors.header || "#1976d2";

  const [borderColor, setBorderColor] = useState("#000000");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100; // Number of rows per page
  const totalPages = Math.ceil(data.length / pageSize);

  // Dialog states
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);

  useEffect(() => {
    if (!settings) return;
    if (colors.border) setBorderColor(colors.border);
  }, [settings]);

  const insertTransferAuditLog = async (row, target) => {
    try {
      await postAuditEvent("payment_transferred", {
        student_number: row.student_number,
        payment_target: target,
      });
    } catch (err) {
      console.error("Error inserting audit log");
    }
  };

  const handleTransfer = async (row) => {
    try {
      const saveEndpoint =
        paymentType === 1
          ? "/api/save_to_unifast"
          : "/api/save_to_matriculation";
      const paymentTarget = paymentType === 1 ? "UniFAST" : "Matriculation";

      const deleteEndpoint =
        paymentType === 1
          ? `/api/delete_matriculation/${row.student_number}/${row.id}`
          : `/api/delete_unifast/${row.student_number}/${row.id}`;

      const saveRes = await axios.post(`${API_BASE_URL}${saveEndpoint}`, row);
      const generatedId =
        paymentType === 1
          ? saveRes.data.unifast_id
          : saveRes.data.matriculation_id;

      await axios.delete(`${API_BASE_URL}${deleteEndpoint}`, {
        data: { generatedId },
      });

      await insertTransferAuditLog(row, paymentTarget);
      onRemove(row.student_number, row.id);
    } catch (error) {
      console.error(error);
      alert("Transfer failed");
    }
  };

  const openConfirm = (row) => {
    setConfirmRow(row);
    setConfirmOpen(true);
  };
  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmRow(null);
  };
  const handleConfirmTransfer = async () => {
    if (!confirmRow) return;
    await handleTransfer(confirmRow);
    closeConfirm();
  };

  // 🔥 Slice data for pagination
  const paginatedData = data.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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
    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
      <Table stickyHeader size="small"
        sx={{
          "& th, & td": {
            border: `1px solid ${borderColor}`,
            textAlign: "center",
            fontSize: "12px",
          },
          borderCollapse: "collapse",
        }}
      >
        {/* PAGINATION HEADER BAR */}
        <TableHead>
          <TableRow>
            <TableCell
              colSpan={19}
              sx={{
                py: 0.5,
                backgroundColor: headerColor || "#6D2323",
                color: "white",
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography fontSize="14px" fontWeight="bold" color="white">
                  Total Students: {data.length}
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  {/* First & Prev */}
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
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
                      '&.Mui-disabled': {
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        opacity: 1,
                      }
                    }}
                  >
                    First
                  </Button>

                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    variant="outlined"
                    size="small"
                    sx={{
                      minWidth: 80,
                      color: "white",
                      borderColor: "white",
                      backgroundColor: "transparent",
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
                      '&.Mui-disabled': {
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        opacity: 1,
                      }
                    }}
                  >
                    Prev
                  </Button>


                  {/* Page Dropdown */}
                  <FormControl size="small" sx={{ minWidth: 80 }}>
                    <Select
                      value={currentPage}
                      onChange={(e) => setCurrentPage(Number(e.target.value))}
                      displayEmpty
                      sx={{
                        fontSize: '12px',
                        height: 36,
                        color: 'white',
                        border: '1px solid white',
                        backgroundColor: 'transparent',
                        '.MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                        '& svg': {
                          color: 'white', // dropdown arrow icon color
                        }
                      }}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            maxHeight: 200,
                            backgroundColor: '#fff', // dropdown background
                          }
                        }
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
                    of {totalPages} page{totalPages > 1 ? 's' : ''}
                  </Typography>


                  {/* Next & Last */}
                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    variant="outlined"
                    size="small"
                    sx={{
                      minWidth: 80,
                      color: "white",
                      borderColor: "white",
                      backgroundColor: "transparent",
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
                      '&.Mui-disabled': {
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        opacity: 1,
                      }
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
                      '&:hover': {
                        borderColor: 'white',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
                      '&.Mui-disabled': {
                        color: "white",
                        borderColor: "white",
                        backgroundColor: "transparent",
                        opacity: 1,
                      }
                    }}
                  >
                    Last
                  </Button>
                </Box>

              </Box>
            </TableCell>
          </TableRow>

          {/* COLUMN HEADERS */}
          <TableRow>
            <TableCell>No.</TableCell>
            <TableCell>Campus</TableCell>
            <TableCell>Student No.</TableCell>
            <TableCell>LRN</TableCell>
            <TableCell>Last Name</TableCell>
            <TableCell>Given Name</TableCell>
            <TableCell>MI</TableCell>
            <TableCell>Degree Program</TableCell>
            <TableCell>Year Level</TableCell>
            <TableCell>Sex</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Lab Units</TableCell>
            <TableCell>Comp Units</TableCell>
            <TableCell>Acad Units</TableCell>
            <TableCell>NSTP Units</TableCell>
            <TableCell>Tuition</TableCell>
            <TableCell>Total TOSF</TableCell>
            <TableCell>Action</TableCell>
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
          {paginatedData.map((row, index) => (
            <TableRow key={row.id || index}>
              <TableCell>{(currentPage - 1) * pageSize + index + 1}</TableCell>
              <TableCell>{row.campus_name}</TableCell>
              <TableCell>{row.student_number}</TableCell>
              <TableCell>{row.learner_reference_number}</TableCell>
              <TableCell>{row.last_name}</TableCell>
              <TableCell>{row.given_name}</TableCell>
              <TableCell>{row.middle_initial}</TableCell>
              <TableCell>{row.program_description || row.degree_program}</TableCell>
              <TableCell>{row.year_level}</TableCell>
              <TableCell>{row.sex}</TableCell>
              <TableCell>{row.email_address}</TableCell>
              <TableCell>{row.phone_number}</TableCell>
              <TableCell align="right">{row.laboratory_units}</TableCell>
              <TableCell align="right">{row.computer_units}</TableCell>
              <TableCell align="right">{row.academic_units_enrolled}</TableCell>
              <TableCell align="right">{row.academic_units_nstp_enrolled}</TableCell>
              <TableCell align="right">{row.tuition_fees}</TableCell>
              <TableCell align="right">{row.total_tosf}</TableCell>
              <TableCell>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => openConfirm(row)}
                >
                  {paymentType === 1
                    ? "Transfer to UNIFAST"
                    : "Transfer to Matriculation"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* CONFIRM DIALOG */}
      <Dialog open={confirmOpen} onClose={closeConfirm}>
        <DialogTitle>Confirm Transfer</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to transfer{" "}
            {paymentType === 1 ? "to UNIFAST" : "to Matriculation"} for student{" "}
            {confirmRow?.student_number || ""}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="error"
            onClick={closeConfirm} >
            Cancel
          </Button>
          <Button onClick={handleConfirmTransfer} variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </TableContainer >
  );
};

export default StudentTable;
