import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RestoreIcon from "@mui/icons-material/Restore";
import DeleteIcon from "@mui/icons-material/Delete";
import API_BASE_URL from "../apiConfig";
import EaristLogo from "../assets/EaristLogo.png";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAccountAuditMac from "./useAccountAuditMac";
import { SettingsContext } from "../App";
import LoadingOverlay from "../components/LoadingOverlay";

const pageId = 142;

const formatDate = (value) => {
  if (!value) return "N/A";

  const dateOnly = String(value).split("T")[0];
  const date = new Date(dateOnly);

  if (Number.isNaN(date.getTime())) {
    return dateOnly;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatName = (account) => {
  const name = [account?.last_name, account?.first_name]
    .filter(Boolean)
    .join(", ");
  const suffix = [account?.middle_name, account?.extension]
    .filter(Boolean)
    .join(" ");

  return [name, suffix].filter(Boolean).join(" ");
};

const cleanSuggestionValue = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return ["null", "undefined"].includes(text.toLowerCase()) ? "" : text;
};

const getArchiveSuggestionText = (account) =>
  [
    account?.applicant_number,
    account?.email,
    account?.account_type,
    account?.archive_type,
    account?.archive_reason,
    account?.reason,
    account?.message,
    formatName(account),
  ]
    .map(cleanSuggestionValue)
    .join(" ")
    .toLowerCase();

const getArchiveSuggestionValue = (account) =>
  cleanSuggestionValue(account?.applicant_number) ||
  cleanSuggestionValue(account?.email) ||
  cleanSuggestionValue(formatName(account));

const ArchivedModule = () => {
  useAccountAuditMac();

  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");   // ✅ NEW
  const [stepperColor, setStepperColor] = useState("#000000");       // ✅ NEW

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");

  useEffect(() => {
    if (!settings) return;

    // 🎨 Colors
    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton) setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

    // 🏫 Logo
    if (assets.logoUrl) {
      setFetchedLogo(`${assets.logoUrl}`);
    } else {
      setFetchedLogo(EaristLogo);
    }

    // 🏷️ School Info
    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    // ✅ Branches (JSON stored in DB)
    setBranches(settings?.branches || []);

  }, [settings]);

  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [archivedAccounts, setArchivedAccounts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [employeeID, setEmployeeID] = useState("");
  const [canDelete, setCanDelete] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [dialogType, setDialogType] = useState("");
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 100;


  useEffect(() => {
    if (!settings) return;

    if (colors.border) {
      setBorderColor(colors.border);
    }

    if (colors.mainButton) {
      setMainButtonColor(colors.mainButton);
    }

    setBranches(settings?.branches || []);
  }, [settings]);

  const showSnack = (message, severity = "info") => {
    setSnack({
      open: true,
      message,
      severity,
    });
  };

  const getAuditHeaders = () =>
    getFlatAuditHeaders({
      "x-employee-id": employeeID,
      "x-page-id": pageId,
    });

  const fetchArchivedAccounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/api/archived-accounts`,
      );
      setArchivedAccounts(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching archived accounts:", error);
      showSnack("Failed to load archived accounts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedEmployeeID = localStorage.getItem("employee_id") || "";
    setEmployeeID(storedEmployeeID);
    fetchArchivedAccounts();
  }, []);

  useEffect(() => {
    if (!employeeID) return;

    axios
      .get(`${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`)
      .then((response) => {
        setCanDelete(Number(response.data?.can_delete) === 1);
        setCanEdit(Number(response.data?.can_edit) === 1);
      })
      .catch((error) => {
        console.error("Error fetching archived module permissions:", error);
        setCanDelete(false);
        setCanEdit(false);
      });
  }, [employeeID]);

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return archivedAccounts;
    }

    return archivedAccounts.filter((account) => {
      const values = [
        account.applicant_number,
        account.email,
        formatName(account),
      ].filter(Boolean);

      return values.some((value) =>
        String(value).toLowerCase().includes(query),
      );
    });
  }, [archivedAccounts, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAccounts.length / rowsPerPage),
  );

  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;

    return filteredAccounts.slice(startIndex, endIndex);
  }, [filteredAccounts, currentPage]);
  const archiveSuggestions = useMemo(
    () =>
      searchQuery.trim().length >= 2
        ? archivedAccounts
          .filter((account) =>
            getArchiveSuggestionText(account).includes(searchQuery.trim().toLowerCase()),
          )
          .slice(0, 8)
        : [],
    [archivedAccounts, searchQuery],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);


  const getCampusName = (campusId) => {
    const branch = branches.find(
      (item) => String(item?.id) === String(campusId),
    );

    return branch?.branch || campusId || "N/A";
  };

  const closeDialog = () => {
    if (actionLoading) return;
    setDialogType("");
    setSelectedAccount(null);
  };

  const openDialog = (type, account) => {
    setDialogType(type);
    setSelectedAccount(account);
  };

  const handleRestore = async () => {
    if (!selectedAccount?.person_id) return;

    try {
      setActionLoading(true);

      await axios.put(
        `${API_BASE_URL}/api/restore-account/${selectedAccount.person_id}`,
        {},
        {
          headers: getAuditHeaders(),
        },
      );

      setArchivedAccounts((prev) =>
        prev.filter((item) => item.person_id !== selectedAccount.person_id),
      );
      setDialogType("");
      setSelectedAccount(null);
      showSnack("Account restored successfully", "success");
    } catch (error) {
      console.error("Restore account error:", error);
      showSnack(
        error.response?.data?.message || "Failed to restore account",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedAccount?.person_id) return;

    try {
      setActionLoading(true);

      await axios.delete(
        `${API_BASE_URL}/api/permanent-delete-account/${selectedAccount.person_id}`,
        {
          headers: getAuditHeaders(),
        },
      );

      setArchivedAccounts((prev) =>
        prev.filter((item) => item.person_id !== selectedAccount.person_id),
      );
      setDialogType("");
      setSelectedAccount(null);
      showSnack("Account permanently deleted", "success");
    } catch (error) {
      console.error("Permanent delete error:", error);
      showSnack(
        error.response?.data?.message || "Failed to permanently delete account",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleSnackClose = (_, reason) => {
    if (reason === "clickaway") return;
    setSnack((prev) => ({ ...prev, open: false }));
  };

  if (loading) {
    return (
      <LoadingOverlay open={loading} message="Loading archived accounts..." />
    );
  }

  const showActionColumn = canEdit || canDelete;

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
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", paddingRight: 1, backgroundColor: "transparent", mt: 1, padding: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: titleColor,
            fontSize: "36px",
            background: "white",
            display: "flex",
            alignItems: "center",
            mb: 2,
          }}
        >
          ARCHIVED MODULE
        </Typography>


        {/* Right: Search */}
        <Box sx={{ position: "relative", width: 450 }}>
          <TextField
            variant="outlined"
            placeholder="Search by Applicant / Message / Type"
            size="small"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => setTimeout(() => setSuggestionsOpen(false), 150)}
            sx={{
              width: "100%",
              backgroundColor: "#fff",
              borderRadius: 1,
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
              },
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: "gray" }} />,
            }}
          />
          {suggestionsOpen && searchQuery.trim().length >= 2 && (
            <Box sx={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, mt: 0.5, maxHeight: 260, overflowY: "auto", backgroundColor: "#fff", border: "1px solid #d6d6d6", borderRadius: 1, boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}>
              {archiveSuggestions.length > 0 ? (
                archiveSuggestions.map((account) => {
                  const accountId = cleanSuggestionValue(account?.applicant_number);
                  const accountName = cleanSuggestionValue(formatName(account));
                  const type = cleanSuggestionValue(account?.account_type || account?.archive_type);

                  return (
                    <Box key={`${account?.person_id}-${accountId}-${account?.email}`} onMouseDown={(event) => { event.preventDefault(); setSearchQuery(getArchiveSuggestionValue(account)); setSuggestionsOpen(false); }} sx={{ px: 2, py: 1, cursor: "pointer", display: "flex", alignItems: "center", gap: 1, fontSize: 14, borderBottom: "1px solid #f0f0f0", "&:hover": { backgroundColor: "#f5f7fb" } }}>
                      <Typography component="span" sx={{ fontWeight: 700, minWidth: 120 }}>{accountId || type || "Archived"}</Typography>
                      <Typography component="span" sx={{ color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[accountName, account?.email].filter(Boolean).join(" - ")}</Typography>
                    </Box>
                  );
                })
              ) : (
                <Box sx={{ px: 2, py: 1, color: "#777", fontSize: 14 }}>No matching archived accounts</Box>
              )}
            </Box>
          )}
        </Box>

      </Box>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />
      <br />


      <TableContainer component={Paper} sx={{ width: "100" }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: "#6D2323", color: "white" }}>
            <TableRow>
              <TableCell
                colSpan={20}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor || "#1976d2",
                  color: "white",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"

                >
                  {/* LEFT */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Archived Records: {filteredAccounts.length}
                  </Typography>

                  {/* RIGHT */}
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
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-disabled': {
                          color: "white",
                          borderColor: "white",
                          opacity: 1,
                        }
                      }}
                    >
                      First
                    </Button>

                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-disabled': {
                          color: "white",
                          borderColor: "white",
                          opacity: 1,
                        }
                      }}
                    >
                      Prev
                    </Button>

                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) =>
                          setCurrentPage(Number(e.target.value))
                        }
                        sx={{
                          fontSize: '12px',
                          height: 36,
                          color: 'white',
                          border: '1px solid white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'white',
                          },
                          '& svg': {
                            color: 'white',
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
                      of {totalPages} page{totalPages > 1 ? "s" : ""}
                    </Typography>

                    <Button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages)
                        )
                      }
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-disabled': {
                          color: "white",
                          borderColor: "white",
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
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-disabled': {
                          color: "white",
                          borderColor: "white",
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
          </TableHead>
        </Table>
      </TableContainer>

      <TableContainer
        component={Paper}
        sx={{ border: `1px solid ${borderColor}` }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: "#F5F5F5", color: "black", textAlign: "center" }}>
                #
              </TableCell>
              <TableCell sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: "#F5F5F5", color: "black", textAlign: "center" }}>
                Applicant Number
              </TableCell>
              <TableCell sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: "#F5F5F5", color: "black", textAlign: "center" }}>Name</TableCell>
              <TableCell sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: "#F5F5F5", color: "black", textAlign: "center" }}>Email</TableCell>
              <TableCell sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: "#F5F5F5", color: "black", textAlign: "center" }}>
                Campus
              </TableCell>
              <TableCell sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: "#F5F5F5", color: "black", textAlign: "center" }}>
                Application Date
              </TableCell>
              {showActionColumn && (
                <TableCell sx={{ border: `1px solid ${borderColor}`, py: 0.5, backgroundColor: "#F5F5F5", color: "black", textAlign: "center" }}>
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showActionColumn ? 7 : 6} sx={{ textAlign: "center", py: 4 }}>
                  No archived accounts found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedAccounts.map((account, index) => (
                <TableRow
                  key={account.person_id}
                  sx={{
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "lightgray", // 👈 alternating
                  }}
                >
                  <TableCell sx={{
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                    fontSize: "12px",
                    py: 0.5,
                  }}>
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </TableCell>
                  <TableCell sx={{
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                    fontSize: "12px",
                    py: 0.5,
                  }}>
                    {account.applicant_number || "N/A"}
                  </TableCell>
                  <TableCell sx={{
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                    fontSize: "12px",
                    py: 0.5,
                  }}>{formatName(account) || "N/A"}</TableCell>
                  <TableCell sx={{
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                    fontSize: "12px",
                    py: 0.5,
                  }}>{account.email || "N/A"}</TableCell>
                  <TableCell sx={{
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                    fontSize: "12px",
                    py: 0.5,
                  }}>
                    {getCampusName(account.campus)}
                  </TableCell>
                  <TableCell sx={{
                    textAlign: "center",
                    border: `1px solid ${borderColor}`,
                    fontSize: "12px",
                    py: 0.5,
                  }}>
                    {formatDate(account.created_at)}
                  </TableCell>
                  {showActionColumn && (
                    <TableCell sx={{
                      textAlign: "center",
                      border: `1px solid ${borderColor}`,
                      fontSize: "12px",
                      py: 0.5,
                    }} >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        {canEdit && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<RestoreIcon />}
                            onClick={() => openDialog("restore", account)}
                            sx={{
                              backgroundColor: "#2e7d32",
                              "&:hover": { backgroundColor: "#1b5e20" },
                            }}
                          >
                            Restore
                          </Button>
                        )}

                        {canDelete && (
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            startIcon={<DeleteIcon />}
                            sx={{
                              backgroundColor: "#9E0000",
                            }}
                            onClick={() => openDialog("delete", account)}
                          >
                            Delete
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TableContainer component={Paper} sx={{ width: "100" }}>
        <Table size="small">
          <TableHead sx={{ backgroundColor: "#6D2323", color: "white" }}>
            <TableRow>
              <TableCell
                colSpan={20}
                sx={{
                  border: `1px solid ${borderColor}`,
                  py: 0.5,
                  backgroundColor: headerColor || "#1976d2",
                  color: "white",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"

                >
                  {/* LEFT */}
                  <Typography fontSize="14px" fontWeight="bold" color="white">
                    Total Archived Records: {filteredAccounts.length}
                  </Typography>

                  {/* RIGHT */}
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
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-disabled': {
                          color: "white",
                          borderColor: "white",
                          opacity: 1,
                        }
                      }}
                    >
                      First
                    </Button>

                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-disabled': {
                          color: "white",
                          borderColor: "white",
                          opacity: 1,
                        }
                      }}
                    >
                      Prev
                    </Button>

                    <FormControl size="small" sx={{ minWidth: 80 }}>
                      <Select
                        value={currentPage}
                        onChange={(e) =>
                          setCurrentPage(Number(e.target.value))
                        }
                        sx={{
                          fontSize: '12px',
                          height: 36,
                          color: 'white',
                          border: '1px solid white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'white',
                          },
                          '& svg': {
                            color: 'white',
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
                      of {totalPages} page{totalPages > 1 ? "s" : ""}
                    </Typography>

                    <Button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages)
                        )
                      }
                      disabled={currentPage === totalPages}
                      variant="outlined"
                      size="small"
                      sx={{
                        minWidth: 80,
                        color: "white",
                        borderColor: "white",
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-disabled': {
                          color: "white",
                          borderColor: "white",
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
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                        '&.Mui-disabled': {
                          color: "white",
                          borderColor: "white",
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
          </TableHead>
        </Table>
      </TableContainer>

      <Dialog
        open={dialogType === "restore"}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Confirm Restore</DialogTitle>
        <DialogContent>
          <Typography>
            Restore this archived account for{" "}
            <b>{formatName(selectedAccount) || "this item"}</b>?
          </Typography>
          <Typography sx={{ mt: 2 }} color="text.secondary">
            This will return the item to the active list.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            variant="outlined"

            onClick={closeDialog} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleRestore}
            variant="contained"
            disabled={actionLoading}
            sx={{
              backgroundColor: "#2e7d32",
              "&:hover": { backgroundColor: "#1b5e20" },
            }}
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogType === "delete"}
        onClose={closeDialog}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 } }}
      >
        <DialogTitle
          sx={{
            background: headerColor || "#9E0000",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.2rem",
            py: 2,
          }}
        >
          Permanent Delete
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to permanently delete{" "}
            <strong>{formatName(selectedAccount) || "this item"}</strong>?
          </Typography>

          <Typography sx={{ color: "#d32f2f", fontSize: "0.95rem" }}>
            This action cannot be undone. Once deleted, the archived account
            and all related applicant records will be permanently removed from
            the system and cannot be recovered.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button color="error" variant="outlined" onClick={closeDialog} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            onClick={handlePermanentDelete}
            color="error"
            variant="contained"
            disabled={actionLoading}
          >
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        onClose={handleSnackClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackClose}
          severity={snack.severity}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ArchivedModule;
