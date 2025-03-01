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
    fetchCylinderMovements();
    fetchSummaryData();
  }, []);

  // ✅ Fetch Cylinder Transactions with ngrok bypass
  const fetchCylinderMovements = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${SERVER_URL}/admin/reports/cylinder-movement`,
        {
          params: {
            search,
            start: dateRange[0] || "",
            end: dateRange[1] || "",
            sortBy,
            sortOrder,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "ngrok-skip-browser-warning": "true",
          },
        }
      );

      console.log("✅ API Response (Cylinder Movements):", response.data);
      setTransactions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("❌ Failed to fetch cylinder movements:", error);
      message.error("Failed to load cylinder movement data.");
    }
    setLoading(false);
  };

  // ✅ Fetch Summary Data with ngrok bypass
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

      console.log("✅ API Response (Summary Data):", response.data);
      setSummary(response.data);
    } catch (error) {
      console.error("❌ Failed to fetch summary:", error);
      message.error("Failed to load cylinder movement summary.");
    }
  };

  // ✅ Export to PDF
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

  // ✅ Process Action Data for Charts
  const actionCounts = (Array.isArray(transactions) ? transactions : []).reduce(
    (acc, { action }) => {
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    },
    {}
  );

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
      {/* ✅ Filter Section */}
      <div
        style={{ background: "#f8f9fa", padding: "15px", borderRadius: "5px" }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              onChange={(dates) =>
                setDateRange(dates?.map((d) => d.toISOString()) || [])
              }
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search Cylinder ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Col>
          <Col xs={12} sm={6}>
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
          <Col xs={12} sm={6}>
            <Select
              defaultValue="desc"
              onChange={setSortOrder}
              style={{ width: "100%" }}
            >
              <Option value="asc">Ascending</Option>
              <Option value="desc">Descending</Option>
            </Select>
          </Col>
          <Col span={24}>
            <Button type="primary" onClick={fetchCylinderMovements} block>
              Apply Filters
            </Button>
          </Col>
        </Row>
      </div>

      {/* ✅ Summary Section */}
      {summary && (
        <Row gutter={[16, 16]} style={{ marginTop: "20px" }}>
          <Col xs={24} sm={8}>
            <Card title="Total Transactions">{summary.total_transactions}</Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card title="Unique Cylinders Moved">
              {summary.unique_cylinders}
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card title="Last Activity">
              {new Date(summary.latest_activity).toLocaleString()}
            </Card>
          </Col>
        </Row>
      )}

      {/* ✅ Charts Section */}
      <Row gutter={[16, 16]} style={{ marginTop: "20px" }}>
        <Col span={12}>
          <Bar data={chartData} options={{ responsive: true }} />
        </Col>
        <Col span={12}>
          <Pie data={chartData} options={{ responsive: true }} />
        </Col>
      </Row>

      {/* ✅ Table Section */}
      {loading ? (
        <Spin />
      ) : (
        <Table
          dataSource={transactions}
          columns={[
            { title: "Cylinder ID", dataIndex: "cylinder_id" },
            { title: "Action", dataIndex: "action" },
            { title: "Performed By", dataIndex: "performed_by" },
            {
              title: "Timestamp",
              dataIndex: "timestamp",
              render: (text) => new Date(text).toLocaleString(),
            },
          ]}
          rowKey="id"
        />
      )}

      {/* ✅ Export Buttons */}
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
