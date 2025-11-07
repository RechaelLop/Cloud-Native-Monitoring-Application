// src/App.js
import React, { useEffect, useState } from "react";
import "./App.css";
import HistoricalCharts from "./components/HistoricalCharts";
import ProcessesTable from "./components/ProcessesTable";
import DiskUsageChart from "./components/DiskUsageChart";
import NetworkChart from "./components/NetworkChart";
import ThemeToggle from "./components/ThemeToggle";

function App() {
  const [metrics, setMetrics] = useState({
    cpu: 0, memory: 0, disk: 0, network: 0, message: null, severity: null, timestamp: null,
    per_drive: [], per_interface: {}
  });
  const [history, setHistory] = useState({ timestamps: [], cpu: [], memory: [], disk: [], network: [] });
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("light");

  const fetchLatest = async () => {
    try {
      const res = await fetch("/metrics");
      const data = await res.json();
      setMetrics(data);
      setLoading(false);
    } catch (err) {
      console.error("fetchLatest error", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch("/metrics/history?points=60"); // last 60 points
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error("fetchHistory error", err);
    }
  };

  useEffect(() => {
    // initial load
    fetchLatest();
    fetchHistory();

    // pollers
    const inter1 = setInterval(fetchLatest, 2000);      // update latest every 2s
    const inter2 = setInterval(fetchHistory, 5000);    // refresh history every 5s

    return () => {
      clearInterval(inter1);
      clearInterval(inter2);
    };
  }, []);

  // theme class on body
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Cloud Native Monitoring Dashboard</h1>
        <div className="header-right">
          <div className="last-updated">
            {metrics.timestamp ? `Last: ${new Date(metrics.timestamp * 1000).toLocaleTimeString()}` : "Loading..."}
          </div>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </header>

      {metrics.message && (
        <div className={`alert ${metrics.severity || ""}`}>
          <strong>{metrics.message}</strong>
        </div>
      )}

      <section className="overview-grid">
        <div className="card gauge">
          <h3>CPU</h3>
          <div className="gauge-value">{metrics.cpu}%</div>
        </div>
        <div className="card gauge">
          <h3>Memory</h3>
          <div className="gauge-value">{metrics.memory}%</div>
        </div>
        <div className="card gauge">
          <h3>Disk</h3>
          <div className="gauge-value">{metrics.disk}%</div>
        </div>
        <div className="card gauge">
          <h3>Network (MB/s)</h3>
          <div className="gauge-value">{metrics.network}</div>
        </div>
      </section>

      <section className="charts-grid">
        <div className="card large">
          <HistoricalCharts history={history} />
        </div>

        <div className="right-column">
          <div className="card">
            <DiskUsageChart drives={metrics.per_drive} />
          </div>
          <div className="card">
            <NetworkChart per_interface={metrics.per_interface} />
          </div>
        </div>
      </section>

      <section className="card processes">
        <h3>Top Processes</h3>
        <ProcessesTable />
      </section>

      <footer className="footer">
        Live updates every 2s • Backend: /metrics • Frontend theme: {theme}
      </footer>
    </div>
  );
}

export default App;
