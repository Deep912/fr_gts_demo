import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// ✅ Ensure every request includes the correct headers
API.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${localStorage.getItem("token")}`;
  config.headers["ngrok-skip-browser-warning"] = "true"; // ✅ Force this header
  config.headers["Content-Type"] = "application/json"; // Ensure JSON responses
  return config;
});

export default API;
