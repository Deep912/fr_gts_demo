import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  DatePicker,
  Input,
  message,
  Space,
  Typography,
  Spin,
} from "antd";
import axios from "axios";
import { CSVLink } from "react-csv";

const { RangePicker } = DatePicker;
const { Title } = Typography;
const SERVER_URL = import.meta.env.VITE_API_URL;

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // logs per page
  const [totalLogs, setTotalLogs] = useState(0); // total count if provided by API

  // Fetch logs with pagination
  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const offset = (page - 1) * pageSize;
      const response = await axios.get(`${SERVER_URL}/admin/audit-logs`, {
        params: {
          start: dateRange[0] || "",
          end: dateRange[1] || "",
          search,
          offset,
          limit: pageSize,
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });
      // If your API returns a total count (e.g., in response.data.total), update that as well.
      setLogs(response.data.logs || response.data); // adjust according to your API response structure
      setTotalLogs(response.data.total || response.data.length);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      message.error("Failed to fetch audit logs.");
    }
    setLoading(false);
  };

  useEffect(() => {
    // When filters change, fetch the first page
    fetchLogs(1);
  }, [dateRange, search]);

  const handlePageChange = (page) => {
    fetchLogs(page);
  };

  const handleDeleteLogs = async () => {
    Modal.confirm({
      title: "Delete Logs",
      content:
        "Are you sure you want to delete the filtered logs? This action cannot be undone.",
      onOk: async () => {
        try {
          const token = localStorage.getItem("token");
          await axios.delete(`${SERVER_URL}/admin/audit-logs`, {
            params: {
              start: dateRange[0] || "",
              end: dateRange[1] || "",
              search,
            },
            headers: {
              Authorization: `Bearer ${token}`,
              "ngrok-skip-browser-warning": "true",
            },
          });
          message.success("Logs deleted successfully.");
          fetchLogs(1);
        } catch (error) {
          console.error("Error deleting logs:", error);
          message.error("Failed to delete logs.");
        }
      },
    });
  };

  const columns = [
    {
      title: "Timestamp",
      dataIndex: "event_timestamp",
      key: "event_timestamp",
      render: (text) => new Date(text).toLocaleString(),
    },
    {
      title: "Event Type",
      dataIndex: "event_type",
      key: "event_type",
    },
    {
      title: "User ID",
      dataIndex: "user_id",
      key: "user_id",
    },
    {
      title: "Details",
      dataIndex: "details",
      key: "details",
      render: (details) =>
        typeof details === "object" ? JSON.stringify(details) : details,
    },
  ];

  return (
    <Card
      title={<Title level={3}>Audit Logs</Title>}
      style={{ margin: "20px" }}
    >
      <Space style={{ marginBottom: 16 }}>
        <RangePicker
          onChange={(dates) =>
            setDateRange(dates ? dates.map((d) => d.toISOString()) : [])
          }
        />
        <Input.Search
          placeholder="Search logs"
          onSearch={(value) => setSearch(value)}
          style={{ width: 200 }}
        />
        <Button onClick={() => fetchLogs(currentPage)}>Refresh</Button>
        <CSVLink data={logs} filename="audit-logs.csv">
          <Button type="primary">Download Logs</Button>
        </CSVLink>
        <Button type="danger" onClick={handleDeleteLogs}>
          Delete Logs
        </Button>
      </Space>
      {loading ? (
        <Spin />
      ) : (
        <Table
          dataSource={logs}
          columns={columns}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize,
            total: totalLogs,
            onChange: handlePageChange,
          }}
        />
      )}
    </Card>
  );
};

export default AuditLogs;
