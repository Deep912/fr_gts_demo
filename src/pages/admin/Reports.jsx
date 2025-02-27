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
import { Bar, Pie } from "react-chartjs-2";
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
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const { RangePicker } = DatePicker;
const { Option } = Select;

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    fetchCylinderMovements();
    fetchSummaryData();
  }, []);

  // 🔹 Fetch Cylinder Transactions
  const fetchCylinderMovements = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        "http://localhost:5000/admin/reports/cylinder-movement",
        {
          params: {
            search,
            start: dateRange[0],
            end: dateRange[1],
            sortBy,
            sortOrder,
          },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
        "http://localhost:5000/admin/reports/cylinder-movement-summary",
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setSummary(response.data);
    } catch (error) {
      console.error("Failed to fetch summary:", error);
      message.error("Failed to load cylinder movement summary.");
    }
  };

  // 🔹 Handle Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Cylinder Movement Report", 20, 10);
    doc.autoTable({
      head: [["Cylinder ID", "Action", "Performed By", "Timestamp"]],
      body: transactions.map(
        ({ cylinder_id, action, performed_by, timestamp }) => [
          cylinder_id,
          action,
          performed_by,
          new Date(timestamp).toLocaleString(),
        ]
      ),
    });
    doc.save("cylinder-movement-report.pdf");
  };

  // 🔹 Table Columns
  const columns = [
    {
      title: "Cylinder ID",
      dataIndex: "cylinder_id",
      key: "cylinder_id",
      sorter: () => {},
    },
    {
      title: "Action",
      dataIndex: "action",
      key: "action",
    },
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
  ];

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

      {/* Chart */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <Card title="Cylinder Action Breakdown" style={{ flex: 1 }}>
          <Bar data={chartData} options={{ responsive: true }} />
        </Card>
        <Card title="Action Distribution" style={{ flex: 1 }}>
          <Pie data={chartData} options={{ responsive: true }} />
        </Card>
      </div>

      {/* Table */}
      {loading ? (
        <Spin />
      ) : (
        <Table dataSource={transactions} columns={columns} rowKey="id" />
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
        <Button onClick={exportToPDF}>
          <FilePdfOutlined /> Export PDF
        </Button>
      </div>
    </Card>
  );
};

export default Reports;
