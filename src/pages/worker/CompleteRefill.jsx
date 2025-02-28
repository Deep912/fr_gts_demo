import { useState, useEffect } from "react";
import axios from "axios";
import { Button, Card, Row, Col, Checkbox, Input, message } from "antd";
import {
  CheckOutlined,
  SearchOutlined,
  SelectOutlined,
  CloseOutlined,
} from "@ant-design/icons";

const SERVER_URL = import.meta.env.VITE_API_URL; // ✅ Now using environment variable

const CompleteRefill = () => {
  const [refillingCylinders, setRefillingCylinders] = useState([]);
  const [filteredCylinders, setFilteredCylinders] = useState([]); // For search results
  const [selectedRefilled, setSelectedRefilled] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectAll, setSelectAll] = useState(false); // Track select all state

  // 🔹 Fetch Cylinders That Are Being Refilled
  useEffect(() => {
    axios
      .get(`${SERVER_URL}/refilling-cylinders`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true", // ✅ Added for ngrok testing
        },
      })
      .then((response) => {
        setRefillingCylinders(response.data);
        setFilteredCylinders(response.data); // Initialize filtered list
      })
      .catch(() => message.error("Error fetching refilling cylinders"));
  }, []);

  // 🔹 Handle Search Query
  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchQuery(value);

    // Filter cylinders that match search input
    const filtered = refillingCylinders.filter((cylinder) =>
      cylinder.serial_number.toLowerCase().includes(value)
    );
    setFilteredCylinders(filtered);
  };

  // 🔹 Handle Cylinder Selection
  const toggleSelection = (serialNumber) => {
    setSelectedRefilled((prev) =>
      prev.includes(serialNumber)
        ? prev.filter((sn) => sn !== serialNumber)
        : [...prev, serialNumber]
    );
  };

  // 🔹 Handle "Select All" Click
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRefilled([]); // Deselect all
    } else {
      setSelectedRefilled(filteredCylinders.map((c) => c.serial_number)); // Select all filtered
    }
    setSelectAll(!selectAll); // Toggle selectAll state
  };

  // 🔹 Mark as Refilled
  const handleCompleteRefill = async () => {
    if (selectedRefilled.length === 0) {
      message.warning("Select at least one cylinder to mark as refilled.");
      return;
    }

    try {
      await axios.post(
        `${SERVER_URL}/complete-refill`, // ✅ Now using SERVER_URL
        { cylinderIds: selectedRefilled },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true", // ✅ For ngrok bypass
          },
        }
      );

      message.success("Cylinders marked as refilled!");
      setRefillingCylinders((prev) =>
        prev.filter((c) => !selectedRefilled.includes(c.serial_number))
      );
      setFilteredCylinders((prev) =>
        prev.filter((c) => !selectedRefilled.includes(c.serial_number))
      );
      setSelectedRefilled([]);
      setSearchQuery(""); // Reset search input
      setSelectAll(false); // Reset select all state
    } catch (error) {
      message.error("Error marking cylinders as refilled.");
    }
  };

  return (
    <Card className="complete-refill-card">
      <h2 className="complete-refill-title">
        <CheckOutlined /> Complete Refill
      </h2>

      {/* 🔍 Search Bar */}
      <Input
        placeholder="Search Cylinder ID..."
        prefix={<SearchOutlined />}
        value={searchQuery}
        onChange={handleSearch}
        className="search-bar"
        style={{ marginBottom: "16px", width: "100%" }}
      />

      {/* 🟢 Select All Button */}
      <Button
        type="default"
        className="select-all-button"
        onClick={handleSelectAll}
        disabled={filteredCylinders.length === 0} // Disable if no cylinders
        style={{
          width: "100%",
          marginBottom: "12px",
          padding: "10px",
          fontSize: "16px",
          fontWeight: "bold",
        }}
      >
        {selectAll ? "Deselect All" : "Select All"}
      </Button>

      {/* ✅ Cylinder Selection Grid */}
      <h3>Select Refilled Cylinders:</h3>
      <Row gutter={[16, 16]} style={{ marginBottom: "20px" }}>
        {filteredCylinders.map((cylinder) => (
          <Col key={cylinder.serial_number} xs={12} sm={8} md={6} lg={4}>
            <Checkbox
              className="cylinder-checkbox"
              checked={selectedRefilled.includes(cylinder.serial_number)}
              onChange={() => toggleSelection(cylinder.serial_number)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px",
                borderRadius: "8px",
                background: selectedRefilled.includes(cylinder.serial_number)
                  ? "#1890ff"
                  : "#f5f5f5",
                color: selectedRefilled.includes(cylinder.serial_number)
                  ? "#fff"
                  : "#333",
                fontWeight: "bold",
                transition: "0.3s ease",
                cursor: "pointer",
              }}
            >
              {cylinder.serial_number}
            </Checkbox>
          </Col>
        ))}
      </Row>

      {/* 🚀 Mark as Refilled Button */}
      <Button
        type="primary"
        className="complete-refill-button"
        icon={<CheckOutlined />}
        disabled={selectedRefilled.length === 0}
        onClick={handleCompleteRefill}
        style={{
          width: "100%",
          padding: "14px",
          fontSize: "16px",
          fontWeight: "bold",
          backgroundColor: "#52c41a",
          borderColor: "#52c41a",
        }}
      >
        Mark as Refilled
      </Button>
    </Card>
  );
};

export default CompleteRefill;
