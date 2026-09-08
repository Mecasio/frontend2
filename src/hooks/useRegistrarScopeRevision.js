import { useEffect, useState } from "react";

const useRegistrarScopeRevision = () => {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const handleScopeUpdate = () => setRevision((value) => value + 1);
    window.addEventListener("registrar-curriculum-updated", handleScopeUpdate);
    return () =>
      window.removeEventListener(
        "registrar-curriculum-updated",
        handleScopeUpdate,
      );
  }, []);

  return revision;
};

export default useRegistrarScopeRevision;
