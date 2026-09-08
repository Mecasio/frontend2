import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Select,
  MenuItem,
  ListSubheader,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

// Sentinel values used for the action rows at the bottom of the dropdown.
const ACTION_NEW = "__new__";
const ACTION_EDIT = "__edit__";
const ACTION_DELETE = "__delete__";

/**
 * A <Select> that behaves like the "Category" dropdown screenshot:
 *   -Select {label}-
 *   <option 1>
 *   <option 2>
 *   ...
 *   [New {label}]
 *   [Edit {label}]
 *   [Delete {label}]
 *
 * Picking [New]/[Edit]/[Delete] opens a small management dialog instead
 * of changing the selected value. Regular options behave like a normal
 * select and call onChange(id, name).
 *
 * Props:
 *   label            - e.g. "Subject Type" or "Category"
 *   apiUrl            - e.g. `${API_BASE_URL}/api/subject-types`
 *   idKey / nameKey   - column names returned by the API,
 *                       e.g. "subject_type_id" / "subject_type_name"
 *   value             - currently selected id (or "")
 *   onChange(id, name)- called when the user picks an option
 *   headers           - permission headers (from getPermissionHeaders())
 *   canCreate/canEdit/canDelete - gate which action rows appear
 *   onSnack(message, severity)  - optional, to reuse the page's Snackbar
 */
const TypeManagerSelect = ({
  label,
  apiUrl,
  idKey,
  nameKey,
  value,
  onChange,
  headers = {},
  canCreate = true,
  canEdit = true,
  canDelete = true,
  onSnack = () => {},
}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const [manageOpen, setManageOpen] = useState(false);
  const [manageMode, setManageMode] = useState("edit"); // "edit" | "delete"
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(apiUrl);
      setOptions(res.data || []);
    } catch (err) {
      console.error(`Error fetching ${label} options:`, err);
      onSnack(`Failed to load ${label.toLowerCase()} options`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiUrl]);

  const handleSelectChange = (e) => {
    const val = e.target.value;

    if (val === ACTION_NEW) {
      setNewName("");
      setAddOpen(true);
      return;
    }
    if (val === ACTION_EDIT) {
      setManageMode("edit");
      setManageOpen(true);
      return;
    }
    if (val === ACTION_DELETE) {
      setManageMode("delete");
      setManageOpen(true);
      return;
    }

    if (val === "") {
      onChange("", "");
      return;
    }

    const chosen = options.find((o) => String(o[idKey]) === String(val));
    onChange(val, chosen ? chosen[nameKey] : "");
  };

  const handleAddSave = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      onSnack(`${label} name is required`, "warning");
      return;
    }
    try {
      const res = await axios.post(apiUrl, { name: trimmed }, { headers });
      onSnack(res.data?.message || `${label} added successfully`, "success");
      setAddOpen(false);
      setNewName("");
      await fetchOptions();
    } catch (err) {
      onSnack(err.response?.data?.message || `Failed to add ${label.toLowerCase()}`, "error");
    }
  };

  const startEditRow = (row) => {
    setEditingId(row[idKey]);
    setEditingName(row[nameKey]);
  };

  const cancelEditRow = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEditRow = async (row) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      onSnack(`${label} name is required`, "warning");
      return;
    }
    try {
      const res = await axios.put(
        `${apiUrl}/${row[idKey]}`,
        { name: trimmed },
        { headers }
      );
      onSnack(res.data?.message || `${label} updated successfully`, "success");
      cancelEditRow();
      await fetchOptions();
    } catch (err) {
      onSnack(err.response?.data?.message || `Failed to update ${label.toLowerCase()}`, "error");
    }
  };

  const deleteRow = async (row) => {
    try {
      const res = await axios.delete(`${apiUrl}/${row[idKey]}`, { headers });
      onSnack(res.data?.message || `${label} deleted successfully`, "success");
      if (String(value) === String(row[idKey])) {
        onChange("", "");
      }
      await fetchOptions();
    } catch (err) {
      onSnack(err.response?.data?.message || `Failed to delete ${label.toLowerCase()}`, "error");
    }
  };

  return (
    <>
      <Select
        fullWidth
        displayEmpty
        value={value ?? ""}
        onChange={handleSelectChange}
        disabled={loading}
        renderValue={(val) => {
          if (val === "" || val === undefined || val === null) {
            return <span style={{ color: "#888" }}>-Select {label}-</span>;
          }
          const chosen = options.find((o) => String(o[idKey]) === String(val));
          return chosen ? chosen[nameKey] : "";
        }}
      >
        <MenuItem value="">
          <em>-Select {label}-</em>
        </MenuItem>

        {options.map((o) => (
          <MenuItem key={o[idKey]} value={o[idKey]}>
            {o[nameKey]}
            {Number(o.is_default) === 1 ? "" : ""}
          </MenuItem>
        ))}

        <Divider />

        {canCreate && (
          <MenuItem value={ACTION_NEW} sx={{ color: "#1976d2", fontWeight: 600 }}>
            [New {label}]
          </MenuItem>
        )}
        {canEdit && (
          <MenuItem value={ACTION_EDIT} sx={{ color: "green", fontWeight: 600 }}>
            [Edit {label}]
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem value={ACTION_DELETE} sx={{ color: "#9E0000", fontWeight: 600 }}>
            [Delete {label}]
          </MenuItem>
        )}
      </Select>

      {/* ---------------- Add dialog ---------------- */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New {label}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={`${label} name`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} color="error">
            Cancel
          </Button>
          <Button onClick={handleAddSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- Manage (edit/delete) dialog ---------------- */}
      <Dialog
        open={manageOpen}
        onClose={() => {
          setManageOpen(false);
          cancelEditRow();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {manageMode === "delete" ? `Delete ${label}` : `Edit ${label}`}
        </DialogTitle>
        <DialogContent dividers>
          <List dense>
            {options.map((o) => {
              const isDefault = Number(o.is_default) === 1;
              const isEditingThis = editingId === o[idKey];

              return (
                <ListItem
                  key={o[idKey]}
                  secondaryAction={
                    manageMode === "delete" ? (
                      <IconButton
                        edge="end"
                        color="error"
                        disabled={isDefault}
                        title={isDefault ? "Default entries cannot be deleted" : "Delete"}
                        onClick={() => deleteRow(o)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    ) : isEditingThis ? (
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton edge="end" color="primary" onClick={() => saveEditRow(o)}>
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton edge="end" onClick={cancelEditRow}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ) : (
                      <IconButton
                        edge="end"
                        onClick={() => startEditRow(o)}
                        sx={{ color: "green" }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )
                  }
                >
                  {isEditingThis ? (
                    <TextField
                      size="small"
                      fullWidth
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      sx={{ mr: 6 }}
                    />
                  ) : (
                    <ListItemText
                      primary={o[nameKey]}
                      secondary={isDefault ? "Default" : null}
                    />
                  )}
                </ListItem>
              );
            })}
            {options.length === 0 && (
              <Typography sx={{ px: 2, py: 1, color: "#777" }}>
                No {label.toLowerCase()}s yet.
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setManageOpen(false);
              cancelEditRow();
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TypeManagerSelect;
