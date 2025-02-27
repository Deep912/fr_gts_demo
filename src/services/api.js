import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Use environment variable
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

export default API;
