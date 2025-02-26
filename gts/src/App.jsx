import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
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
  const role = localStorage.getItem("role");

  return (
    <Router>
      <Routes>
        {/* Login Route */}
        <Route path="/" element={<Login />} />
        <Route path="/test-scanner" element={<TestScanner />} />

        {/* Admin Routes (Protected) */}
        {role === "admin" ? (
          <Route path="/admin/*" element={<AdminLayout />}>
            <Route path="cylinders" element={<Cylinders />} />
            <Route path="companies" element={<Companies />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        ) : (
          <Route path="/admin/*" element={<Navigate to="/" />} />
        )}

        {/* Worker Routes (Protected) */}
        {role === "worker" ? (
          <Route path="/worker/*" element={<WorkerLayout />}>
            <Route index element={<div />} /> {/* ✅ Keeps user on /worker */}
            <Route path="dispatch" element={<Dispatch />} />
            <Route path="receive" element={<Receive />} />
            <Route path="refill" element={<Refill />} />
            <Route path="complete-refill" element={<CompleteRefill />} />
          </Route>
        ) : (
          <Route path="/worker/*" element={<Navigate to="/" />} />
        )}
      </Routes>
    </Router>
  );
};

export default App;
