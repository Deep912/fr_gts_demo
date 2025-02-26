// import { useEffect, useState } from "react";
// import axios from "axios";
// import { Card, Row, Col, Button, Table, message, Spin } from "antd";
// import {
//   UploadOutlined,
//   DownloadOutlined,
//   RetweetOutlined,
// } from "@ant-design/icons";
// import { useNavigate } from "react-router-dom";
// import "../../styles/WorkerDashboard.css"; // Ensure this exists!

// const WorkerDashboard = () => {
//   const navigate = useNavigate();
//   const [loading, setLoading] = useState(true);
//   const [workerStats, setWorkerStats] = useState({});
//   const [transactions, setTransactions] = useState([]);

//   // Fetch worker statistics
//   useEffect(() => {
//     axios
//       .get("http://localhost:5000/worker-stats", {
//         headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
//       })
//       .then((res) => {
//         setWorkerStats(res.data);
//         setLoading(false);
//       })
//       .catch(() => {
//         message.error("Failed to load worker statistics");
//         setLoading(false);
//       });

//     axios
//       .get("http://localhost:5000/worker-transactions", {
//         headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
//       })
//       .then((res) => setTransactions(res.data))
//       .catch(() => message.error("Failed to load transactions"));
//   }, []);

//   return (
//     <div className="worker-dashboard">
//       <h2>Worker Dashboard</h2>

//       {loading ? (
//         <Spin size="large" />
//       ) : (
//         <Row gutter={[16, 16]}>
//           <Col xs={24} sm={8}>
//             <Card title="Total Dispatched" bordered={false}>
//               <h2>{workerStats.dispatched || 0}</h2>
//             </Card>
//           </Col>
//           <Col xs={24} sm={8}>
//             <Card title="Total Received" bordered={false}>
//               <h2>{workerStats.received || 0}</h2>
//             </Card>
//           </Col>
//           <Col xs={24} sm={8}>
//             <Card title="Total Refills" bordered={false}>
//               <h2>{workerStats.refilled || 0}</h2>
//             </Card>
//           </Col>
//         </Row>
//       )}

//       <div className="quick-actions">
//         <Button
//           type="primary"
//           icon={<UploadOutlined />}
//           onClick={() => navigate("/worker/dispatch")}
//         >
//           Dispatch Cylinders
//         </Button>
//         <Button
//           type="default"
//           icon={<DownloadOutlined />}
//           onClick={() => navigate("/worker/receive")}
//         >
//           Receive Cylinders
//         </Button>
//         <Button
//           type="dashed"
//           icon={<RetweetOutlined />}
//           onClick={() => navigate("/worker/refill")}
//         >
//           Refill Cylinders
//         </Button>
//       </div>

//       <h3>Recent Transactions</h3>
//       <Table
//         dataSource={transactions}
//         columns={[
//           {
//             title: "Cylinder",
//             dataIndex: "serial_number",
//             key: "serial_number",
//           },
//           { title: "Action", dataIndex: "action", key: "action" },
//           { title: "Date", dataIndex: "timestamp", key: "timestamp" },
//         ]}
//         rowKey="id"
//       />
//     </div>
//   );
// };

// export default WorkerDashboard;
