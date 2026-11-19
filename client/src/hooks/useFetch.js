
import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "../services/api";

// Loads data on mount and when explicit dependency values change.
// `reload` fetches data again after a change is saved.
export default function useFetch(loader, deps = []) {
  const loaderRef = useRef(loader);
  const depsKey = JSON.stringify(deps);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await loaderRef.current();
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, depsKey]);

  return { data, loading, error, reload: load };
}
