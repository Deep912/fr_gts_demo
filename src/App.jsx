import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./pages/Login";
import AdminLayout from "./components/AdminLayout";
import WorkerLayout from "./components/WorkerLayout";
import Cylinders from "./pages/admin/Cylinders";
import Companies from "./pages/admin/Companies";
import Reports from "./pages/admin/Reports";
import Dispatch from "./pages/worker/Dispatch";
import Receive from "./pages/worker/Receive";
import Refill from "./pages/worker/Refill";
import CompleteRefill from "./pages/worker/CompleteRefill";
import TestScanner from "./TestScanner";

const App = () => {
  const [role, setRole] = useState(localStorage.getItem("role") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    if (storedRole) {
      setRole(storedRole);
    }
    setLoading(false);
  }, []);

  if (loading) return null; // Prevent rendering before role is set

  return (
    <Router>
      <Routes>
        {/* ✅ Login Route */}
        <Route path="/" element={<Login />} />
        <Route path="/test-scanner" element={<TestScanner />} />

        {/* ✅ Admin Routes */}
        <Route
          path="/admin/*"
          element={
            role === "admin" ? <AdminLayout /> : <Navigate to="/" replace />
          }
        >
          <Route path="cylinders" element={<Cylinders />} />
          <Route path="companies" element={<Companies />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        {/* ✅ Worker Routes - No Redirect to /dispatch */}
        <Route
          path="/worker/*"
          element={
            role === "worker" ? <WorkerLayout /> : <Navigate to="/" replace />
          }
        >
          <Route path="dispatch" element={<Dispatch />} />
          <Route path="receive" element={<Receive />} />
          <Route path="refill" element={<Refill />} />
          <Route path="complete-refill" element={<CompleteRefill />} />
        </Route>

        {/* ✅ Catch-All 404 Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
