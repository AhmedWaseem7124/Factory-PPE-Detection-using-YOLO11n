const getApiBaseUrl = () => {
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;
    // Default to port 5000 on the same host
    return `http://${hostname}:5000`;
  }
  return "http://localhost:5000";
};

export const API_BASE_URL = getApiBaseUrl();

export const getSnapshotUrl = (filename) => {
  if (!filename) return null;
  if (filename.startsWith("http://") || filename.startsWith("https://")) {
    return filename;
  }
  const cleanFilename = filename.replace(/^.*[\\/]/, "");
  return `${API_BASE_URL}/snapshots/${cleanFilename}`;
};

export const getVideoUrl = (filename) => {
  if (!filename) return null;
  if (filename.startsWith("http://") || filename.startsWith("https://")) {
    return filename;
  }
  const cleanFilename = filename.replace(/^.*[\\/]/, "");
  return `${API_BASE_URL}/videos/${cleanFilename}`;
};

export const getAuthToken = () => {
  return localStorage.getItem("ppe_auth_token") || sessionStorage.getItem("ppe_auth_token");
};

export const setAuthSession = (token, user, rememberMe = false, isDefaultAdmin = false) => {
  const storage = rememberMe ? localStorage : sessionStorage;
  // Clear both first to avoid duplicates
  localStorage.removeItem("ppe_auth_token");
  localStorage.removeItem("ppe_user");
  localStorage.removeItem("ppe_default_admin_warning");
  sessionStorage.removeItem("ppe_auth_token");
  sessionStorage.removeItem("ppe_user");
  sessionStorage.removeItem("ppe_default_admin_warning");

  storage.setItem("ppe_auth_token", token);
  storage.setItem("ppe_user", JSON.stringify(user));
  if (isDefaultAdmin) {
    storage.setItem("ppe_default_admin_warning", "true");
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem("ppe_auth_token");
  localStorage.removeItem("ppe_user");
  localStorage.removeItem("ppe_default_admin_warning");
  sessionStorage.removeItem("ppe_auth_token");
  sessionStorage.removeItem("ppe_user");
  sessionStorage.removeItem("ppe_default_admin_warning");
};

export const getStoredUser = () => {
  const userStr = localStorage.getItem("ppe_user") || sessionStorage.getItem("ppe_user");
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
};

export const isDefaultAdminWarning = () => {
  return localStorage.getItem("ppe_default_admin_warning") === "true" ||
         sessionStorage.getItem("ppe_default_admin_warning") === "true";
};

export const authFetch = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthSession();
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }

  return response;
};

