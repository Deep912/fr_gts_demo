import { useState, useEffect } from "react";
import axios from "axios";
import { Button, Card, Row, Col, Checkbox, Input, message } from "antd";
import { CheckOutlined, SearchOutlined } from "@ant-design/icons";
// import "../../styles/CompleteRefill.css";

const CompleteRefill = () => {
  const [refillingCylinders, setRefillingCylinders] = useState([]);
  const [filteredCylinders, setFilteredCylinders] = useState([]); // For search results
  const [selectedRefilled, setSelectedRefilled] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectAll, setSelectAll] = useState(false); // Track select all state

  // 🔹 Fetch Cylinders That Are Being Refilled
  useEffect(() => {
    axios
      .get("http://localhost:5000/refilling-cylinders", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
        "http://localhost:5000/complete-refill",
        { cylinderIds: selectedRefilled },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
      />

      {/* 🟢 Select All Button */}
      <Button
        type="default"
        className="select-all-button"
        onClick={handleSelectAll}
        disabled={filteredCylinders.length === 0} // Disable if no cylinders
      >
        {selectAll ? "Deselect All" : "Select All"}
      </Button>

      <h3>Select Refilled Cylinders:</h3>
      <Row gutter={[16, 16]}>
        {filteredCylinders.map((cylinder) => (
          <Col key={cylinder.serial_number} xs={12} sm={8} md={6}>
            <Checkbox
              className="cylinder-checkbox"
              checked={selectedRefilled.includes(cylinder.serial_number)}
              onChange={() => toggleSelection(cylinder.serial_number)}
            >
              {cylinder.serial_number}
            </Checkbox>
          </Col>
        ))}
      </Row>

      <Button
        type="primary"
        className="complete-refill-button"
        icon={<CheckOutlined />}
        disabled={selectedRefilled.length === 0}
        onClick={handleCompleteRefill}
      >
        Mark as Refilled
      </Button>
    </Card>
  );
};

export default CompleteRefill;
