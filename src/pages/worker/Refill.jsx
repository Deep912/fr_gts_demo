import { useState, useEffect } from "react";
import axios from "axios";
import { Button, Card, Row, Col, Checkbox, Collapse, message } from "antd";
import { RetweetOutlined } from "@ant-design/icons";
import "../../styles/Refill.css";

const Refill = () => {
  const [emptyCylinders, setEmptyCylinders] = useState([]);
  const [selectedCylinders, setSelectedCylinders] = useState([]);

  // 🔹 Fetch Empty Cylinders (For Sending to Refill)
  useEffect(() => {
    axios
      .get("http://localhost:5000/empty-cylinders-grouped", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((response) => setEmptyCylinders(response.data))
      .catch(() => message.error("Error fetching empty cylinders"));
  }, []);

  // 🔹 Handle Cylinder Selection
  const toggleSelection = (serialNumber) => {
    setSelectedCylinders((prev) =>
      prev.includes(serialNumber)
        ? prev.filter((sn) => sn !== serialNumber)
        : [...prev, serialNumber]
    );
  };

  // 🔹 Send for Refill
  const handleSendForRefill = async () => {
    if (selectedCylinders.length === 0) {
      message.warning("Please select at least one cylinder to refill");
      return;
    }

    try {
      await axios.post(
        "http://localhost:5000/refill-cylinder",
        { cylinderIds: selectedCylinders },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      message.success("Cylinders sent for refilling!");
      setEmptyCylinders((prev) =>
        prev.map((category) => ({
          ...category,
          cylinders: category.cylinders.filter(
            (c) => !selectedCylinders.includes(c.serial_number)
          ),
        }))
      );
      setSelectedCylinders([]);
    } catch (error) {
      message.error("Error sending cylinders for refilling");
    }
  };

  return (
    <Card className="refill-card">
      <h2 className="refill-title">
        <RetweetOutlined /> Refill Cylinders
      </h2>

      <Collapse
        items={emptyCylinders.map((category, index) => ({
          key: index.toString(),
          label: `${category.gas_type} - ${category.size}L`,
          children: (
            <Row gutter={[16, 16]}>
              {category.cylinders.map((cylinder) => (
                <Col key={cylinder.serial_number} xs={12} sm={8} md={6}>
                  <Checkbox
                    onChange={() => toggleSelection(cylinder.serial_number)}
                  >
                    {cylinder.serial_number}
                  </Checkbox>
                </Col>
              ))}
            </Row>
          ),
        }))}
      />

      <Button type="primary" onClick={handleSendForRefill}>
        Send for Refill
      </Button>
    </Card>
  );
};

export default Refill;
