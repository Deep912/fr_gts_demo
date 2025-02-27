import { useState, useEffect } from "react";
import axios from "axios";
import {
  Button,
  Card,
  Row,
  Col,
  Input,
  message,
  Typography,
  Space,
  Divider,
} from "antd";
import {
  CheckOutlined,
  SearchOutlined,
  SelectOutlined,
  CloseOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const SERVER_URL = import.meta.env.VITE_API_URL;

const CompleteRefill = () => {
  const [refillingCylinders, setRefillingCylinders] = useState([]);
  const [filteredCylinders, setFilteredCylinders] = useState([]); // For search results
  const [selectedRefilled, setSelectedRefilled] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectAll, setSelectAll] = useState(false);

  // ✅ Fetch Cylinders That Are Being Refilled
  useEffect(() => {
    axios
      .get(`${SERVER_URL}/refilling-cylinders`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((response) => {
        console.log("✅ Refilling Cylinders:", response.data);
        setRefillingCylinders(
          Array.isArray(response.data) ? response.data : []
        );
        setFilteredCylinders(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => message.error("Error fetching refilling cylinders"));
  }, []);

  // ✅ Search Cylinders
  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchQuery(value);

    const filtered = refillingCylinders.filter((cylinder) =>
      cylinder.serial_number.toLowerCase().includes(value)
    );
    setFilteredCylinders(filtered);
  };

  // ✅ Select/Deselect Cylinder
  const toggleSelection = (serialNumber) => {
    setSelectedRefilled((prev) =>
      prev.includes(serialNumber)
        ? prev.filter((sn) => sn !== serialNumber)
        : [...prev, serialNumber]
    );
  };

  // ✅ Select/Deselect All
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRefilled([]); // Deselect all
    } else {
      setSelectedRefilled(filteredCylinders.map((c) => c.serial_number)); // Select all filtered
    }
    setSelectAll(!selectAll); // Toggle selectAll state
  };

  // ✅ Mark as Refilled
  const handleCompleteRefill = async () => {
    if (selectedRefilled.length === 0) {
      message.warning(
        "Please select at least one cylinder to mark as refilled."
      );
      return;
    }

    try {
      await axios.post(
        `${SERVER_URL}/complete-refill`,
        { cylinderIds: selectedRefilled },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      );

      message.success("Cylinders marked as refilled!");

      // ✅ Remove marked cylinders from the UI
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
    <Card
      className="complete-refill-card"
      style={{
        padding: "30px",
        borderRadius: "15px",
        boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.1)",
        background: "#ffffff",
      }}
    >
      <Title
        level={3}
        className="complete-refill-title"
        style={{ textAlign: "center" }}
      >
        <CheckOutlined style={{ color: "#1890ff" }} /> Complete Refill
      </Title>

      {/* 🔍 Search Bar */}
      <Input
        placeholder="Search Cylinder ID..."
        prefix={<SearchOutlined />}
        value={searchQuery}
        onChange={handleSearch}
        className="search-bar"
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #d9d9d9",
          marginBottom: "15px",
        }}
      />

      <Space
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "15px",
        }}
      >
        {/* 🟢 Select All Button */}
        {filteredCylinders.length > 0 && (
          <Button
            type="default"
            icon={selectAll ? <DeselectOutlined /> : <SelectOutlined />}
            onClick={handleSelectAll}
            style={{
              width: "48%",
              background: selectAll ? "#ff4d4f" : "#1890ff",
              color: "#fff",
              borderRadius: "8px",
            }}
          >
            {selectAll ? "Deselect All" : "Select All"}
          </Button>
        )}

        {/* ✅ Mark as Refilled Button */}
        <Button
          type="primary"
          icon={<CheckOutlined />}
          disabled={selectedRefilled.length === 0}
          onClick={handleCompleteRefill}
          style={{
            width: "48%",
            background: "#52c41a",
            color: "#fff",
            borderRadius: "8px",
          }}
        >
          Mark as Refilled
        </Button>
      </Space>

      <Divider />

      {/* 🟢 Cylinder List */}
      {filteredCylinders.length > 0 ? (
        <Row gutter={[16, 16]} style={{ padding: "10px" }}>
          {filteredCylinders.map((cylinder) => (
            <Col key={cylinder.serial_number} xs={12} sm={8} md={6}>
              <div
                className="cylinder-card"
                onClick={() => toggleSelection(cylinder.serial_number)}
                style={{
                  background: selectedRefilled.includes(cylinder.serial_number)
                    ? "#1890ff"
                    : "#f9f9f9",
                  padding: "15px",
                  borderRadius: "10px",
                  textAlign: "center",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  color: selectedRefilled.includes(cylinder.serial_number)
                    ? "#fff"
                    : "#000",
                }}
              >
                {cylinder.serial_number}
              </div>
            </Col>
          ))}
        </Row>
      ) : (
        <Text
          type="secondary"
          style={{ marginTop: "20px", display: "block", textAlign: "center" }}
        >
          No cylinders available for refill completion.
        </Text>
      )}
    </Card>
  );
};

export default CompleteRefill;
