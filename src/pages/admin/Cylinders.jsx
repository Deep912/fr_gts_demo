import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Select,
  Modal,
  Form,
  Input,
  message,
  Switch,
} from "antd";
import axios from "axios";
import {
  PlusOutlined,
  DeleteOutlined,
  EyeInvisibleOutlined,
  SyncOutlined,
} from "@ant-design/icons";

const { Option } = Select;
const SERVER_URL = import.meta.env.VITE_API_URL;

const Cylinders = () => {
  const [cylinders, setCylinders] = useState([]);
  const [deletedCylinders, setDeletedCylinders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);

  // 🔹 Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [cylinderId, setCylinderId] = useState("");

  // 🔹 Fetch Active and Deleted Cylinders
  useEffect(() => {
    loadCylinders();
    loadDeletedCylinders();
  }, []);

  const loadCylinders = () => {
    setLoading(true);
    axios
      .get(`${SERVER_URL}/admin/cylinders`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((response) => setCylinders(response.data))
      .catch(() => message.error("Error fetching cylinders"))
      .finally(() => setLoading(false));
  };

  const loadDeletedCylinders = () => {
    setLoading(true);
    axios
      .get(`${SERVER_URL}/admin/deleted-cylinders`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((response) => setDeletedCylinders(response.data))
      .catch(() => message.error("Error fetching deleted cylinders"))
      .finally(() => setLoading(false));
  };

  const handleDelete = (serial_number) => {
    console.log("Deleting Cylinder:", serial_number); // Debugging

    axios
      .post(
        `${SERVER_URL}/admin/delete-cylinder`,
        { serial_number },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      )
      .then(() => {
        message.success("Cylinder moved to deleted records.");
        loadCylinders();
        loadDeletedCylinders();
      })
      .catch((error) => {
        console.error("Failed to delete cylinder:", error.response?.data);
        message.error("Failed to delete cylinder.");
      });
  };

  const handleRestore = (serial_number) => {
    console.log("Restoring Cylinder:", serial_number); // Debugging log

    axios
      .post(
        `${SERVER_URL}/admin/restore-cylinder`,
        { serial_number },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      )
      .then(() => {
        message.success("Cylinder restored successfully.");
        loadCylinders();
        loadDeletedCylinders();
      })
      .catch((error) => {
        console.error("Failed to restore cylinder:", error.response?.data);
        message.error("Failed to restore cylinder.");
      });
  };

  const handleChangeStatus = (serial_number, status) => {
    console.log(`Updating status for ${serial_number} to ${status}`); // Debugging

    axios
      .post(
        `${SERVER_URL}/admin/update-cylinder-status`,
        { serial_number, status },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      )
      .then(() => {
        message.success("Cylinder status updated.");
        loadCylinders();
      })
      .catch((error) => {
        console.error("Failed to update status:", error.response?.data);
        message.error("Failed to update status.");
      });
  };

  // 🔹 Generate Cylinder ID
  const generateCylinderId = async () => {
    try {
      const response = await axios.get(
        `${SERVER_URL}/admin/generate-cylinder-id`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      );
      setCylinderId(response.data.new_id);
      form.setFieldsValue({ serial_number: response.data.new_id }); // ✅ Set form value
    } catch (error) {
      message.error("Error generating cylinder ID");
    }
  };

  // 🔹 Add Cylinder
  const handleAddCylinder = (values) => {
    console.log("Submitting Cylinder:", values); // ✅ Debugging log

    axios
      .post(`${SERVER_URL}/admin/add-cylinder`, values, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then(() => {
        message.success("Cylinder added successfully!");
        setIsModalVisible(false);
        form.resetFields();
        loadCylinders();
      })
      .catch((error) => {
        console.error("Failed to add cylinder:", error.response?.data);
        message.error("Failed to add cylinder.");
      });
  };

  return (
    <Card
      title="Cylinders Management"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalVisible(true)}
        >
          Add Cylinder
        </Button>
      }
    >
      {/* Cylinders Table */}
      <Table
        dataSource={showDeleted ? deletedCylinders : cylinders}
        loading={loading}
        rowKey="serial_number"
        columns={[
          {
            title: "Serial Number",
            dataIndex: "serial_number",
            key: "serial_number",
          },
          {
            title: "Gas Type",
            dataIndex: "gas_type",
            key: "gas_type",
          },
          {
            title: "Size (L)",
            dataIndex: "size",
            key: "size",
          },
          ...(showDeleted
            ? [
                {
                  title: "Deleted By",
                  dataIndex: "deleted_by",
                  key: "deleted_by",
                },
                {
                  title: "Deleted On",
                  dataIndex: "deleted_at",
                  key: "deleted_at",
                },
                {
                  title: "Actions",
                  key: "actions",
                  render: (_, record) => (
                    <Button
                      icon={<SyncOutlined />}
                      type="primary"
                      onClick={() => handleRestore(record.serial_number)}
                    >
                      Restore
                    </Button>
                  ),
                },
              ]
            : [
                {
                  title: "Status",
                  dataIndex: "status",
                  key: "status",
                  render: (text, record) => (
                    <Select
                      value={text}
                      onChange={(value) =>
                        handleChangeStatus(record.serial_number, value)
                      }
                      style={{ width: 120 }}
                    >
                      <Option value="available">Available</Option>
                      <Option value="dispatched">Dispatched</Option>
                      <Option value="empty">Empty</Option>
                      <Option value="refilling">Refilling</Option>
                    </Select>
                  ),
                },
                {
                  title: "Actions",
                  key: "actions",
                  render: (_, record) => (
                    <Button
                      type="primary"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDelete(record.serial_number)}
                    />
                  ),
                },
              ]),
        ]}
      />
    </Card>
  );
};

export default Cylinders;
