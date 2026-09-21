import axios from "axios";
import API_BASE_URL from "../apiConfig";

const CACHE_TTL_MS = 10 * 60 * 1000;
const SUMMER_CONTEXT_CACHE_KEY = "summer-academic-context-v1";
const YEAR_LEVEL_CACHE_KEY = "year-levels-v1";

const readCache = (key) => {
  try {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (!parsed || Date.now() - parsed.cachedAt >= CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch (error) {
    sessionStorage.removeItem(key);
    return null;
  }
};

const writeCache = (key, data) => {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ cachedAt: Date.now(), data }),
    );
  } catch (error) {
    // Caching is an optimization. The page must still work if storage is unavailable.
  }
};

const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  },
});

export const getCachedSummerSchoolYearContext = async () => {
  const cached = readCache(SUMMER_CONTEXT_CACHE_KEY);
  if (cached) return cached;

  const response = await axios.get(
    `${API_BASE_URL}/api/summer-school-year-context`,
    getAuthConfig(),
  );
  writeCache(SUMMER_CONTEXT_CACHE_KEY, response.data);
  return response.data;
};

export const getCachedYearLevels = async () => {
  const cached = readCache(YEAR_LEVEL_CACHE_KEY);
  if (cached) return cached;

  const response = await axios.get(
    `${API_BASE_URL}/api/get_year_level`,
    getAuthConfig(),
  );
  writeCache(YEAR_LEVEL_CACHE_KEY, response.data);
  return response.data;
};

export const clearSummerAcademicCache = () => {
  sessionStorage.removeItem(SUMMER_CONTEXT_CACHE_KEY);
  sessionStorage.removeItem(YEAR_LEVEL_CACHE_KEY);
};
