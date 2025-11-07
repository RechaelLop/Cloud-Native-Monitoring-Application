import { useEffect, useState } from "react";

function Metrics() {
  const [metrics, setMetrics] = useState({ cpu: 0, memory: 0, message: "" });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch("http://127.0.0.1:5000/metrics");
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        console.error("Error fetching metrics:", err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // refresh every 5s

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>System Metrics</h2>
      <p>CPU: {metrics.cpu}%</p>
      <p>Memory: {metrics.memory}%</p>
      {metrics.message && <p style={{ color: "red" }}>{metrics.message}</p>}
    </div>
  );
}

export default Metrics;
