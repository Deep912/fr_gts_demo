import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  DatePicker,
  Input,
  Select,
  message,
  Spin,
} from "antd";
import axios from "axios";
import { FilePdfOutlined, FileExcelOutlined } from "@ant-design/icons";
import { Bar, Pie, Line } from "react-chartjs-2";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { CSVLink } from "react-csv";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const { RangePicker } = DatePicker;
const { Option } = Select;
const SERVER_URL = import.meta.env.VITE_API_URL;

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [cylinderStatus, setCylinderStatus] = useState({});
  const [topUsers, setTopUsers] = useState([]);
  const [usageTrends, setUsageTrends] = useState([]);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    fetchCylinderMovements();
    fetchSummaryData();
    fetchCylinderStatus();
    fetchTopUsers();
    fetchUsageTrends();
  }, []);

  // 🔹 Fetch Cylinder Transactions
  const fetchCylinderMovements = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${SERVER_URL}/admin/reports/cylinder-movement`,
        {
          params: {
            search,
            start: dateRange[0],
            end: dateRange[1],
            sortBy,
            sortOrder,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      );
      setTransactions(response.data);
    } catch (error) {
      console.error("Failed to fetch cylinder movements:", error);
      message.error("Failed to load cylinder movement data.");
    }
    setLoading(false);
  };

  // 🔹 Fetch Cylinder Movement Summary
  const fetchSummaryData = async () => {
    try {
      const response = await axios.get(
        `${SERVER_URL}/admin/reports/cylinder-movement-summary`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      );
      setSummary(response.data);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
      message.error("Failed to load cylinder movement summary.");
    }
  };

  // 🔹 Fetch Cylinder Status Breakdown
  const fetchCylinderStatus = async () => {
    try {
      const response = await axios.get(
        `${SERVER_URL}/admin/reports/cylinder-status`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      );
      setCylinderStatus(response.data);
    } catch (error) {
      console.error("Failed to fetch cylinder status:", error);
      message.error("Failed to load cylinder status.");
    }
  };

  // 🔹 Fetch Top Users Performing Actions
  const fetchTopUsers = async () => {
    try {
      const response = await axios.get(
        `${SERVER_URL}/admin/reports/top-users`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      );
      setTopUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch top users:", error);
      message.error("Failed to load top users.");
    }
  };

  // 🔹 Fetch Cylinder Usage Trends
  const fetchUsageTrends = async () => {
    try {
      const response = await axios.get(
        `${SERVER_URL}/admin/reports/usage-trends`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      );
      setUsageTrends(response.data);
    } catch (error) {
      console.error("Failed to fetch usage trends:", error);
      message.error("Failed to load usage trends.");
    }
  };

  // 🔹 Prepare Chart Data
  const actionCounts = transactions.reduce((acc, { action }) => {
    acc[action] = (acc[action] || 0) + 1;
    return acc;
  }, {});

  const chartData = {
    labels: Object.keys(actionCounts),
    datasets: [
      {
        label: "Cylinder Actions",
        data: Object.values(actionCounts),
        backgroundColor: ["#3e95cd", "#8e5ea2", "#3cba9f", "#e8c3b9"],
      },
    ],
  };

  return (
    <Card title="Cylinder Movement Report">
      {/* Filters */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <RangePicker
          onChange={(dates) =>
            setDateRange(dates?.map((d) => d.toISOString()) || [])
          }
        />
        <Input
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select defaultValue="timestamp" onChange={setSortBy}>
          <Option value="cylinder_id">Cylinder ID</Option>
          <Option value="action">Action</Option>
          <Option value="timestamp">Date</Option>
        </Select>
        <Select defaultValue="desc" onChange={setSortOrder}>
          <Option value="asc">Ascending</Option>
          <Option value="desc">Descending</Option>
        </Select>
        <Button type="primary" onClick={fetchCylinderMovements}>
          Filter
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "15px",
          }}
        >
          <Card title="Total Transactions">{summary.total_transactions}</Card>
          <Card title="Unique Cylinders Moved">{summary.unique_cylinders}</Card>
          <Card title="Last Activity">
            {new Date(summary.latest_activity).toLocaleString()}
          </Card>
        </div>
      )}

      {/* Charts */}
      <Card title="Cylinder Action Breakdown">
        <Bar data={chartData} options={{ responsive: true }} />
      </Card>

      {/* Table */}
      {loading ? (
        <Spin />
      ) : (
        <Table
          dataSource={transactions}
          columns={[
            {
              title: "Cylinder ID",
              dataIndex: "cylinder_id",
              key: "cylinder_id",
            },
            { title: "Action", dataIndex: "action", key: "action" },
            {
              title: "Performed By",
              dataIndex: "performed_by",
              key: "performed_by",
            },
            {
              title: "Timestamp",
              dataIndex: "timestamp",
              key: "timestamp",
              render: (text) => new Date(text).toLocaleString(),
            },
          ]}
          rowKey="id"
        />
      )}

      {/* Export Buttons */}
      <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
        <CSVLink
          data={transactions}
          filename="cylinder-movement-report.csv"
          className="ant-btn ant-btn-default"
        >
          <FileExcelOutlined /> Export CSV
        </CSVLink>
        <Button>
          <FilePdfOutlined /> Export PDF
        </Button>
      </div>
    </Card>
  );
};

export default Reports;
