import { useState, useEffect } from "react";
import {
  Card,
  Button,
  DatePicker,
  Input,
  Select,
  message,
  Spin,
  Row,
  Col,
  Space,
  Typography,
  Collapse,
  Tabs,
  Table,
  Modal,
  Dropdown,
  Menu,
} from "antd";
import axios from "axios";
import { FilePdfOutlined, FileExcelOutlined } from "@ant-design/icons";
import { CSVLink } from "react-csv";
import { Doughnut, Bar } from "react-chartjs-2";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
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
const { Title: Heading, Text } = Typography;
const SERVER_URL = import.meta.env.VITE_API_URL;

const Reports = () => {
  // Basic state
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [dateRange, setDateRange] = useState([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState("desc");

  // Filter state
  const [productTypeFilter, setProductTypeFilter] = useState("");
  const [gasTypeFilter, setGasTypeFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [workerFilter, setWorkerFilter] = useState("");

  // Dropdown data
  const [reportCompanies, setReportCompanies] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [gasTypes, setGasTypes] = useState([]);

  // Chart and export data
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [barData, setBarData] = useState({ labels: [], datasets: [] });
  const [csvData, setCsvData] = useState([]);

  // Active tab (default "summary")
  const [activeTab, setActiveTab] = useState("summary");

  // Modal state for detailed Excel download
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [excelDateRange, setExcelDateRange] = useState([]);

  // Fetch dropdown supporting data
  useEffect(() => {
    axios
      .get(`${SERVER_URL}/admin/companies`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((res) => setReportCompanies(res.data))
      .catch(() => console.error("Failed to fetch companies"));

    axios
      .get(`${SERVER_URL}/admin/product-types`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((res) => setProductTypes(res.data))
      .catch(() => console.error("Failed to fetch product types"));

    axios
      .get(`${SERVER_URL}/admin/gas-types`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      })
      .then((res) => setGasTypes(res.data))
      .catch(() => console.error("Failed to fetch gas types"));
  }, []);

  // Fetch combined report (summary & breakdown) with filters
  const fetchCombinedReports = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${SERVER_URL}/admin/reports/combined`, {
        params: {
          search,
          start: dateRange[0] || "",
          end: dateRange[1] || "",
          sortBy,
          sortOrder,
          productType: productTypeFilter,
          gasType: gasTypeFilter,
          company: companyFilter,
          worker: workerFilter,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      });
      const data = response.data.summary;
      setSummary(data);

      if (data && data.action_breakdown) {
        const labels = data.action_breakdown.map((item) => item.action);
        const counts = data.action_breakdown.map((item) => Number(item.count));
        setChartData({
          labels,
          datasets: [
            {
              label: "Actions",
              data: counts,
              backgroundColor: ["#4caf50", "#2196f3", "#ff9800", "#9c27b0"],
              borderColor: "#fff",
              borderWidth: 2,
            },
          ],
        });
        setCsvData(
          data.action_breakdown.map((item) => ({
            Action: item.action,
            Count: item.count,
          }))
        );
      }
      if (data && data.monthly_breakdown) {
        const barLabels = data.monthly_breakdown.map((item) => item.month);
        const barCounts = data.monthly_breakdown.map((item) =>
          Number(item.count)
        );
        setBarData({
          labels: barLabels,
          datasets: [
            {
              label: "Monthly Transactions",
              data: barCounts,
              backgroundColor: "#2196F3",
            },
          ],
        });
      } else {
        setBarData({ labels: [], datasets: [] });
      }
    } catch (error) {
      console.error("Failed to fetch combined reports", error);
      message.error("Failed to load report data.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCombinedReports();
  }, [
    dateRange,
    search,
    sortBy,
    sortOrder,
    productTypeFilter,
    gasTypeFilter,
    companyFilter,
    workerFilter,
  ]);

  // Export summary to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Cylinder Movement Summary Report", 20, 10);
    if (summary) {
      doc.text(`Total Transactions: ${summary.total_transactions}`, 20, 20);
      doc.text(`Unique Cylinders Moved: ${summary.unique_cylinders}`, 20, 30);
      doc.text(
        `Last Activity: ${new Date(summary.latest_activity).toLocaleString()}`,
        20,
        40
      );
      doc.text("Action Breakdown:", 20, 50);
      doc.autoTable({
        startY: 55,
        head: [["Action", "Count"]],
        body: summary.action_breakdown.map((item) => [item.action, item.count]),
      });
      doc.save("cylinder-movement-summary.pdf");
    } else {
      message.warning("No summary data to export.");
    }
  };

  // Download summary Excel using SheetJS
  const downloadExcel = () => {
    if (!csvData || csvData.length === 0) {
      message.warning("No data available for Excel export.");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Summary Report");
    XLSX.writeFile(workbook, "cylinder-movement-summary.xlsx");
  };

  // Download detailed Excel data based on time frame
  const downloadDetailedExcel = async () => {
    if (!excelDateRange || excelDateRange.length !== 2) {
      message.warning("Please select a valid time frame.");
      return;
    }
    try {
      const response = await axios.get(`${SERVER_URL}/admin/reports/detailed`, {
        params: { start: excelDateRange[0], end: excelDateRange[1] },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "ngrok-skip-browser-warning": "true",
        },
      });
      const detailedData = response.data;
      if (!detailedData || detailedData.length === 0) {
        message.warning(
          "No detailed data available for the selected time frame."
        );
        return;
      }
      const worksheet = XLSX.utils.json_to_sheet(detailedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Detailed Report");
      XLSX.writeFile(workbook, "cylinder-detailed-report.xlsx");
      setExcelModalOpen(false);
    } catch (error) {
      console.error("Failed to download detailed Excel data", error);
      message.error("Failed to download detailed Excel data.");
    }
  };

  // Define export menu options for Dropdown
  const exportMenu = {
    items: [
      {
        key: "csv",
        label: (
          <CSVLink
            data={csvData}
            filename="cylinder-movement-summary.csv"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Export CSV
          </CSVLink>
        ),
      },
      {
        key: "pdf",
        label: "Export PDF",
        onClick: exportToPDF,
      },
      {
        key: "excel",
        label: "Download Summary Excel",
        onClick: downloadExcel,
      },
      {
        key: "detailed",
        label: "Download Detailed Excel",
        onClick: () => setExcelModalOpen(true),
      },
    ],
  };

  // Define Collapse items for filters using new API
  const collapseItems = [
    {
      key: "filters",
      label: "Filters",
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <RangePicker
              size="large"
              style={{ width: "80%" }}
              onChange={(dates) =>
                setDateRange(dates?.map((d) => d.toISOString()) || [])
              }
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input
              size="large"
              placeholder="Search Cylinder ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "80%" }}
            />
          </Col>
          <Col xs={12} sm={6} md={6}>
            <Select
              size="large"
              defaultValue="timestamp"
              onChange={setSortBy}
              style={{ width: "80%" }}
            >
              <Option value="cylinder_id">Cylinder ID</Option>
              <Option value="action">Action</Option>
              <Option value="timestamp">Date</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={6}>
            <Select
              size="large"
              defaultValue="desc"
              onChange={setSortOrder}
              style={{ width: "80%" }}
            >
              <Option value="asc">Ascending</Option>
              <Option value="desc">Descending</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <Select
              size="large"
              placeholder="Product Type"
              onChange={setProductTypeFilter}
              value={productTypeFilter}
              style={{ width: "80%" }}
            >
              <Option value="">All</Option>
              {productTypes.map((prod, idx) => (
                <Option key={idx} value={prod}>
                  {prod}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <Select
              size="large"
              placeholder="Gas Type"
              onChange={setGasTypeFilter}
              value={gasTypeFilter}
              style={{ width: "80%" }}
            >
              <Option value="">All</Option>
              {gasTypes.map((gas, idx) => (
                <Option key={idx} value={gas}>
                  {gas}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <Select
              size="large"
              placeholder="Company"
              onChange={setCompanyFilter}
              value={companyFilter}
              style={{ width: "80%" }}
            >
              <Option value="">All</Option>
              {reportCompanies.map((comp) => (
                <Option key={comp.id} value={comp.name}>
                  {comp.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8}>
            <Input
              size="large"
              placeholder="Worker (username)"
              value={workerFilter}
              onChange={(e) => setWorkerFilter(e.target.value)}
              style={{ width: "80%" }}
            />
          </Col>
          <Col span={24}>
            <Button
              type="primary"
              size="large"
              onClick={fetchCombinedReports}
              block
            >
              Apply Filters
            </Button>
          </Col>
        </Row>
      ),
    },
  ];

  // Define Tabs items using new API
  const tabItems = [
    {
      key: "summary",
      label: "Summary",
      children: loading ? (
        <Spin />
      ) : summary ? (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card>
                <Text strong>Total Transactions:</Text>
                <br />
                <Heading level={4}>{summary.total_transactions}</Heading>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Text strong>Unique Cylinders Moved:</Text>
                <br />
                <Heading level={4}>{summary.unique_cylinders}</Heading>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card>
                <Text strong>Last Activity:</Text>
                <br />
                <Heading level={4}>
                  {new Date(summary.latest_activity).toLocaleString()}
                </Heading>
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
            <Col xs={24} md={12}>
              <Card title="Action Breakdown (Doughnut Chart)">
                <Doughnut
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "50%",
                    plugins: {
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const total = context.chart._metasets[0].total;
                            const value = context.parsed;
                            const percentage = ((value / total) * 100).toFixed(
                              1
                            );
                            return `${context.label}: ${value} (${percentage}%)`;
                          },
                        },
                      },
                    },
                  }}
                  style={{ height: 250 }}
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="Monthly Transactions (Bar Chart)">
                {barData.labels.length > 0 ? (
                  <Bar
                    data={barData}
                    options={{ responsive: true, maintainAspectRatio: false }}
                    style={{ height: 250 }}
                  />
                ) : (
                  <Text>No monthly breakdown available.</Text>
                )}
              </Card>
            </Col>
          </Row>
        </>
      ) : (
        <Text>No summary data available.</Text>
      ),
    },
    {
      key: "breakdown",
      label: "Breakdown",
      children: loading ? (
        <Spin />
      ) : summary && summary.action_breakdown ? (
        <Card title="Action Breakdown">
          <Table
            dataSource={summary.action_breakdown}
            columns={[
              { title: "Action", dataIndex: "action" },
              { title: "Count", dataIndex: "count" },
            ]}
            rowKey="action"
            pagination={false}
          />
        </Card>
      ) : (
        <Text>No breakdown data available.</Text>
      ),
    },
  ];

  return (
    <Card style={{ margin: "20px", padding: "20px" }}>
      <Collapse items={collapseItems} style={{ marginBottom: 20 }} />
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 20 }}
        >
          <Heading level={3} style={{ margin: 0 }}>
            Cylinder Movement Report
          </Heading>
          <Dropdown menu={exportMenu} trigger={["click"]}>
            <Button type="primary">Download Report</Button>
          </Dropdown>
        </Row>
        <Tabs activeKey="summary" items={tabItems} onChange={setActiveTab} />
      </Space>
      <Modal
        title="Select Time Frame for Detailed Data"
        open={excelModalOpen}
        onCancel={() => setExcelModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setExcelModalOpen(false)}>
            Cancel
          </Button>,
          <Button key="download" type="primary" onClick={downloadDetailedExcel}>
            Download
          </Button>,
        ]}
      >
        <Text>
          Please select a start and end date to download detailed cylinder
          transfer data.
        </Text>
        <RangePicker
          style={{ width: "100%", marginTop: "10px" }}
          onChange={(dates) =>
            setExcelDateRange(dates?.map((d) => d.toISOString()) || [])
          }
        />
      </Modal>
    </Card>
  );
};

export default Reports;
