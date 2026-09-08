import { useState, useEffect, useContext } from "react";
import API_BASE_URL from "../apiConfig";

import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";

import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit"; // ✅ Fix 1: was missing

import Unauthorized from "../components/Unauthorized";
import LoadingOverlay from "../components/LoadingOverlay";

import { SettingsContext } from "../App";
import axios from "axios";
import { getFlatAuditHeaders } from "../utils/auditEvents";
import useAuditMac from "../utils/useAuditMac";

const SignatureUpload = () => {
  useAuditMac();
  const settings = useContext(SettingsContext);
  const colors = settings?.colors || {};
  const branding = settings?.branding || {};
  const assets = settings?.assets || {};
  const headerColor = colors.header || "#1976d2";

  const [titleColor, setTitleColor] = useState("#000000");
  const [subtitleColor, setSubtitleColor] = useState("#555555");
  const [borderColor, setBorderColor] = useState("#000000");
  const [mainButtonColor, setMainButtonColor] = useState("#1976d2");
  const [subButtonColor, setSubButtonColor] = useState("#ffffff");
  const [stepperColor, setStepperColor] = useState("#000000");

  const [fetchedLogo, setFetchedLogo] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [shortTerm, setShortTerm] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [branches, setBranches] = useState([]); // ✅ Fix 2: was missing

  const [employeeID, setEmployeeID] = useState(""); // ✅ Fix 3: removed duplicate
  const [personID, setPersonID] = useState("");
  const [hasAccess, setHasAccess] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  // ✅ Fix 4: removed duplicate user state; kept only what's needed
  const [user, setUser] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userID, setUserID] = useState("");

  const pageId = 114;

  const [formData, setFormData] = useState({
    full_name: "",
    designation: "",
    campus_branch_id: "",
    signature_name: "",
  });

  const [signature, setSignature] = useState(null);
  const [signatureList, setSignatureList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [signatureToDelete, setSignatureToDelete] = useState(null);

  // ✅ Fix 5: merged the two conflicting useEffects into one
  useEffect(() => {
    const storedUser = localStorage.getItem("email");
    const storedRole = localStorage.getItem("role");
    const storedID = localStorage.getItem("person_id");
    const storedEmployeeID = localStorage.getItem("employee_id");

    if (storedUser && storedRole && storedID && storedEmployeeID) {
      setUser(storedUser);
      setUserRole(storedRole);
      setUserID(storedID);
      setPersonID(storedID);
      setEmployeeID(storedEmployeeID);

      if (storedRole === "registrar") {
        checkAccess(storedEmployeeID);
        fetchSignatures(); // ✅ Fix 6: fetch on mount
      } else {
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (!settings) return;

    if (colors.title) setTitleColor(colors.title);
    if (colors.subtitle) setSubtitleColor(colors.subtitle);
    if (colors.border) setBorderColor(colors.border);
    if (colors.mainButton)
      setMainButtonColor(colors.mainButton);
    if (colors.subButton) setSubButtonColor(colors.subButton);
    if (colors.stepper) setStepperColor(colors.stepper);

    if (assets.logoUrl) {
      setFetchedLogo(assets.logoUrl);
    }

    if (branding.companyName) setCompanyName(branding.companyName);
    if (branding.shortTerm) setShortTerm(branding.shortTerm);
    if (branding.campusAddress) setCampusAddress(branding.campusAddress);

    setBranches(settings?.branches || []);
  }, [settings]);

  // ✅ Fix 7: added getBranchName helper — was used but never defined
  const getBranchName = (id) => {
    const branch = branches.find((b) => b.id === id);
    return branch ? branch.branch : id;
  };

  const checkAccess = async (employeeID) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/page_access/${employeeID}/${pageId}`,
      );
      if (response.data && response.data.page_privilege === 1) {
        setHasAccess(true);
        setCanCreate(Number(response.data?.can_create) === 1);
        setCanEdit(Number(response.data?.can_edit) === 1);
        setCanDelete(Number(response.data?.can_delete) === 1);
      } else {
        setHasAccess(false);
        setCanCreate(false);
        setCanEdit(false);
        setCanDelete(false);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
      setCanCreate(false);
      setCanEdit(false);
      setCanDelete(false);
      setLoading(false);
    }
  };

  const fetchSignatures = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/signature`);
      if (res.data.success) {
        setSignatureList(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getAuditHeaders = () => ({
    ...getFlatAuditHeaders(),
    "x-employee-id": employeeID,
    "x-page-id": pageId,
    "x-audit-actor-id": employeeID,
    "x-audit-actor-role": userRole || "registrar",
  });

  const handleSubmit = async () => {
    if (editId && !canEdit) {
      setMessage("You do not have permission to edit signatures");
      return;
    }

    if (!editId && !canCreate) {
      setMessage("You do not have permission to create signatures");
      return;
    }

    if (
      !formData.full_name ||
      !formData.designation ||
      !formData.campus_branch_id ||
      !formData.signature_name
    ) {
      setMessage("Please complete all fields");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const submitData = new FormData();
      submitData.append("person_id", personID);
      submitData.append("employee_id", employeeID);
      submitData.append("full_name", formData.full_name);
      submitData.append("designation", formData.designation);
      submitData.append("campus_branch_id", formData.campus_branch_id);
      submitData.append("signature_name", formData.signature_name);
      submitData.append("created_by", employeeID);

      let res;

      // ✅ EDIT MODE
      if (editId) {
        if (signature) {
          submitData.append("signature", signature);
        }

        res = await axios.put(
          `${API_BASE_URL}/api/signature/${editId}`,
          submitData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              ...getAuditHeaders(),
            },
          },
        );
      }
      // ✅ CREATE MODE
      else {
        if (!signature) {
          setMessage("Please upload a signature image");
          setLoading(false);
          return;
        }

        submitData.append("signature", signature);

        res = await axios.post(`${API_BASE_URL}/api/signature`, submitData, {
          headers: {
            "Content-Type": "multipart/form-data",
            ...getAuditHeaders(),
          },
        });
      }

      if (res.data.success) {
        setMessage(
          editId
            ? "Signature updated successfully"
            : "Signature uploaded successfully",
        );

        // reset form
        setFormData({
          full_name: "",
          designation: "",
          campus_branch_id: "",
          signature_name: "",
        });

        setSignature(null);
        setEditId(null); // ✅ important reset
        setOpenFormDialog(false);

        fetchSignatures();
      }
    } catch (err) {
      console.error(err);
      setMessage("Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const [editId, setEditId] = useState(null);
  const handleEditSignature = (sig) => {
    if (!canEdit) {
      setMessage("You do not have permission to edit signatures");
      return;
    }

    setEditId(sig.id);

    setFormData({
      full_name: sig.full_name,
      designation: sig.designation,
      campus_branch_id: sig.campus_branch_id,
      signature_name: sig.signature_name,
    });

    setSignature(null);
    setOpenFormDialog(true);
  };

  const handleDelete = async () => {
    if (!signatureToDelete) return;
    if (!canDelete) {
      setMessage("You do not have permission to delete signatures");
      return;
    }

    try {
      await axios.delete(
        `${API_BASE_URL}/api/signature/${signatureToDelete.id}`,
        {
          headers: getAuditHeaders(),
        },
      );
      fetchSignatures();
      setOpenDeleteDialog(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || hasAccess === null) {
    return <LoadingOverlay open={loading} message="Loading..." />;
  }

  if (!hasAccess) {
    return <Unauthorized />;
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
    <Box sx={{ height: "calc(100vh - 150px)", overflowY: "auto", p: 2 }}>
      <Typography
        variant="h4"
        sx={{ fontWeight: "bold", color: titleColor, mb: 2 }}
      >
        SIGNATURE MANAGEMENT
      </Typography>

      <hr style={{ border: "1px solid #ccc", width: "100%" }} />
      <br />

      <TableContainer
        component={Paper}
        sx={{ width: "100%", border: `1px solid ${borderColor}`, mt: 3 }}
      >
        <Table>
          <TableHead
            sx={{ backgroundColor: headerColor }}
          >
            <TableRow>
              <TableCell sx={{ color: "white", p: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: "bold",
                      color: "white",
                      marginLeft: "15px",
                    }}
                  >
                    Signature Registered
                  </Typography>
                  {canCreate && (
                    <Button
                      variant="contained"
                      onClick={() => setOpenFormDialog(true)}
                      sx={{
                        backgroundColor: "#1976d2",
                        color: "#fff",
                        fontWeight: "bold",
                        borderRadius: "8px",
                        width: "220px",
                        textTransform: "none",
                        px: 2,
                        "&:hover": { backgroundColor: "#1565c0" },
                      }}
                    >
                      + Add Signature
                    </Button>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>

      <TableContainer
        component={Paper}
        sx={{ border: `1px solid ${borderColor}`, boxShadow: 3 }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {[
                "#",
                "Full Name",
                "Designation",
                "Campus",
                "Signature Name",
                "Preview",
                ...(showActionColumn ? ["Actions"] : []),
              ].map((header, index) => (
                <TableCell
                  key={index}
                  sx={{
                    border: `1px solid ${borderColor}`,
                    backgroundColor: "#f5f5f5",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {header}
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
            {signatureList.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showActionColumn ? 7 : 6}
                  sx={{
                    border: `1px solid ${borderColor}`,
                    textAlign: "center",
                    py: 4,
                  }}
                >
                  No signatures found.
                </TableCell>
              </TableRow>
            ) : (
              signatureList.map((sig, index) => (
                <TableRow
                  key={sig.id}
                  sx={{
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "lightgray",
                    "& td": {
                      border: `1px solid ${borderColor}`,
                      color: "black",
                    },
                  }}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {sig.full_name}
                  </TableCell>
                  <TableCell>{sig.designation}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {getBranchName(sig.campus_branch_id)}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {sig.signature_name}
                  </TableCell>
                  <TableCell>
                    <Box
                      component="img"
                      src={`${API_BASE_URL}/uploads/${sig.signature_image}`}
                      alt="Signature"
                      sx={{
                        width: 150,
                        height: 80,
                        objectFit: "contain",
                        border: "1px solid #ccc",
                        borderRadius: 1,
                        p: 1,
                        backgroundColor: "#fff",
                      }}
                    />
                  </TableCell>
                  {showActionColumn && (
                    <TableCell align="center">
                      <Box
                        sx={{ display: "flex", gap: 1, justifyContent: "center" }}
                      >
                        {canEdit && (
                          <Button
                            size="small"
                            variant="contained"
                            sx={{
                              backgroundColor: "green",
                              color: "white",
                              borderRadius: "5px",
                              width: "100px",
                              height: "40px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "5px",
                              "&:hover": { backgroundColor: "#0a7a0a" },
                            }}
                            onClick={() => handleEditSignature(sig)}
                          >
                            <EditIcon fontSize="small" /> Edit
                          </Button>
                        )}

                        {canDelete && (
                          <Button
                            size="small"
                            variant="contained"
                            sx={{
                              backgroundColor: "#9E0000",
                              color: "white",
                              borderRadius: "5px",
                              width: "100px",
                              height: "40px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "5px",
                              "&:hover": { backgroundColor: "#7a0000" },
                            }}
                            onClick={() => {
                              setSignatureToDelete(sig);
                              setOpenDeleteDialog(true);
                            }}
                          >
                            <DeleteIcon fontSize="small" /> Delete
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

      {/* ADD / EDIT SIGNATURE DIALOG */}
      <Dialog
        open={openFormDialog}
        onClose={() => setOpenFormDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: "hidden", boxShadow: 6 },
        }}
      >
        <DialogTitle
          sx={{
            background: headerColor,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.2rem",
            py: 2,
          }}
        >
          {editId ? "Edit Signature" : "New Signature Registration"}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ mb: 2, mt: 1 }}
          >
            Signature Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Full Name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Designation"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Signature Name"
                name="signature_name"
                value={formData.signature_name}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Campus Branch"
                name="campus_branch_id"
                value={formData.campus_branch_id}
                onChange={handleChange}
              >
                {branches.map((branch) => (
                  <MenuItem key={branch.id} value={branch.id}>
                    {branch.branch}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Box
                component="label"
                sx={{
                  border: `2px dashed ${borderColor}`,
                  borderRadius: 2,
                  p: 4,
                  textAlign: "center",
                  display: "block",
                  cursor: "pointer",
                  transition: ".2s",
                  "&:hover": { backgroundColor: "#fafafa" },
                }}
              >
                <UploadFileIcon sx={{ fontSize: 50, mb: 1 }} />
                <Typography>
                  {signature ? signature.name : "Click to Upload Signature"}
                </Typography>
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSignature(e.target.files[0])}
                />
              </Box>
            </Grid>
            {signature && (
              <Grid item xs={12}>
                <Box
                  component="img"
                  src={URL.createObjectURL(signature)}
                  alt="Preview"
                  sx={{
                    width: "100%",
                    maxHeight: 200,
                    objectFit: "contain",
                    border: "1px solid #ccc",
                    borderRadius: 2,
                    p: 2,
                  }}
                />
              </Grid>
            )}
            {message && (
              <Grid item xs={12}>
                <Alert
                  severity={message.includes("success") ? "success" : "error"}
                >
                  {message}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
          <Button
            onClick={() => setOpenFormDialog(false)}
            color="error"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={editId ? !canEdit : !canCreate}
            sx={{ px: 4, fontWeight: 600, textTransform: "none" }}
            onClick={handleSubmit}
          >
            <SaveIcon fontSize="small" sx={{ mr: 1 }} /> Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: 6,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: colors.header || "#9E0000",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.2rem",
            py: 2,
          }}
        >
          Delete Signature
        </DialogTitle>

        <DialogContent sx={{ p: 3, mt: 2 }}>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete this signature?
          </Typography>

          <Typography
            sx={{
              color: "#d32f2f",
              fontSize: "0.95rem",
            }}
          >
            Deleting this signature will permanently remove it from the system.
            <br />
            Any forms, reports, or documents that reference this signature may
            no longer display the authorized signatory correctly.
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #e0e0e0",
          }}
        >
          <Button
            color="error"
            variant="outlined"
            onClick={() => setOpenDeleteDialog(false)}
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={() => {
              handleDelete();
              setOpenDeleteDialog(false);
            }}
          >
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SignatureUpload;
