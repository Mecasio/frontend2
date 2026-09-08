import { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../apiConfig";

const useStudentEditPermissions = () => {
  const [permissions, setPermissions] = useState({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/student_edit_permissions`);
        if (res.data && typeof res.data === "object") {
          setPermissions(res.data);
        }
      } catch (err) {
        console.warn("Could not load student edit permissions:", err.message);
      } finally {
        setPermissionsLoaded(true);
      }
    };
    fetchPermissions();
  }, []);

  // userRole is passed in so non-students are always editable
  const canEdit = (fieldId, userRole) => {
    if (userRole && userRole !== "student") return true; // registrar/admin can always edit
    if (!permissionsLoaded) return true;                 // optimistic while loading
    if (!(fieldId in permissions)) return true;          // unknown field → editable
    return permissions[fieldId] === true || permissions[fieldId] === 1;
  };

  return { canEdit, permissionsLoaded };
};

export default useStudentEditPermissions;
