import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Use environment variable
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
    "ngrok-skip-browser-warning": "true", // ✅ Bypass ngrok warning
  },
});

// ✅ Ensure token is updated dynamically for each request
API.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${localStorage.getItem("token")}`;
  return config;
});

export default API;
