import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Ensure this is correct
});

// ✅ Attach interceptors to dynamically set headers for every request
API.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${localStorage.getItem("token")}`;
  config.headers["ngrok-skip-browser-warning"] = "true"; // ✅ Fix Ngrok Warning
  return config;
});

export default API;
