import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// ✅ Interceptor to ensure headers are always sent
API.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${localStorage.getItem("token")}`;
  config.headers["ngrok-skip-browser-warning"] = "true"; // ✅ Bypass Ngrok warning
  config.headers["Content-Type"] = "application/json"; // ✅ Force JSON response
  config.headers["Accept"] = "application/json"; // ✅ Ensure API sends JSON
  return config;
});

export default API;
