import React, { useState, useEffect, useContext } from "react";
import { SettingsContext } from "../App";
import {
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Box,
  Button,
  FormControl,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png"; // change path if needed

const ApplicantTable = ({ data }) => {
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";
  const [borderColor, setBorderColor] = useState("#000000");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100; // rows per page
  const totalPages = Math.ceil(data.length / pageSize);

  useEffect(() => {
    if (!settings) return;
    if (colors.border) setBorderColor(colors.border);
  }, [settings]);

  // Slice data for current page
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
    <>
      {/* PAGINATION HEADER */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Typography>
          Total Applicants: {data.length}
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

      {/* TABLE */}
      <TableContainer component={Paper}>
        <Table
          sx={{
            "& th, & td": {
              border: `1px solid ${borderColor}`,
              textAlign: "center",
            },
            borderCollapse: "collapse",
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Applicant ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Program</TableCell>
              <TableCell>Schedule</TableCell>
              <TableCell>Proctor</TableCell>
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
            {paginatedData.map((row, i) => (
              <TableRow key={row.applicant_id || i}>
                <TableCell>{row.applicant_id}</TableCell>
                <TableCell>
                  {row.last_name?.toUpperCase()}, {row.first_name}
                </TableCell>
                <TableCell>{row.program_description}</TableCell>
                <TableCell>
                  {row.start_time}-{row.end_time}, {row.building_description} ({row.room_description})
                </TableCell>
                <TableCell>{row.proctor}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default ApplicantTable;
