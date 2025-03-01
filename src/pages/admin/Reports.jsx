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
  Row,
  Col,
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
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    fetchData();
  }, []);

  // 🔹 Fetch all required data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [transactionsRes, summaryRes] = await Promise.all([
        axios.get(`${SERVER_URL}/admin/reports/cylinder-movement`, {
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
        }),
        axios.get(`${SERVER_URL}/admin/reports/cylinder-movement-summary`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }),
      ]);

      setTransactions(transactionsRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      message.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Generate Chart Data
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
        backgroundColor: ["#3E95CD", "#8E5EA2", "#3CBA9F", "#E8C3B9"],
      },
    ],
  };

  // 🔹 Export to PDF
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

  return (
    <Card title="Cylinder Movement Report" style={{ padding: "20px" }}>
      {/* 🔹 Filter Section */}
      <Row gutter={16} style={{ marginBottom: "20px" }}>
        <Col xs={24} sm={8}>
          <RangePicker
            onChange={(dates) =>
              setDateRange(dates?.map((d) => d.toISOString()) || [])
            }
          />
        </Col>
        <Col xs={24} sm={8}>
          <Input
            placeholder="Search Cylinder ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        <Col xs={12} sm={4}>
          <Select
            defaultValue="timestamp"
            onChange={setSortBy}
            style={{ width: "100%" }}
          >
            <Option value="cylinder_id">Cylinder ID</Option>
            <Option value="action">Action</Option>
            <Option value="timestamp">Date</Option>
          </Select>
        </Col>
        <Col xs={12} sm={4}>
          <Select
            defaultValue="desc"
            onChange={setSortOrder}
            style={{ width: "100%" }}
          >
            <Option value="asc">Ascending</Option>
            <Option value="desc">Descending</Option>
          </Select>
        </Col>
      </Row>

      {/* 🔹 Summary Cards */}
      {summary && (
        <Row gutter={16} style={{ marginBottom: "20px" }}>
          <Col xs={24} sm={8}>
            <Card title="Total Transactions" style={{ textAlign: "center" }}>
              <h2>{summary.total_transactions}</h2>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card
              title="Unique Cylinders Moved"
              style={{ textAlign: "center" }}
            >
              <h2>{summary.unique_cylinders}</h2>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card title="Last Activity" style={{ textAlign: "center" }}>
              <h2>{new Date(summary.latest_activity).toLocaleString()}</h2>
            </Card>
          </Col>
        </Row>
      )}

      {/* 🔹 Charts */}
      <Row gutter={16} style={{ marginBottom: "20px" }}>
        <Col xs={24} sm={12}>
          <Card title="Cylinder Actions">
            <Bar data={chartData} options={{ responsive: true }} />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card title="Action Distribution">
            <Pie data={chartData} options={{ responsive: true }} />
          </Card>
        </Col>
      </Row>

      {/* 🔹 Data Table */}
      {loading ? (
        <Spin size="large" />
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
          pagination={{ pageSize: 10 }}
        />
      )}

      {/* 🔹 Export Buttons */}
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
