// src/components/DiskUsageChart.js
import React from "react";
import Plot from "react-plotly.js";

export default function DiskUsageChart({ drives = [] }) {
  if (!drives || drives.length === 0) return <div>No drives found</div>;

  const labels = drives.map((d) => d.mount);
  const values = drives.map((d) => d.used_mb);
  const totals = drives.map((d) => d.total_mb);

  return (
    <div>
      <h3>Disk Usage Breakdown</h3>
      <Plot
        data={[
          {
            type: "pie",
            labels,
            values,
            textinfo: "label+percent",
            hole: 0.3,
          },
        ]}
        layout={{ height: 280, margin: { t: 20 } }}
        useResizeHandler
        style={{ width: "100%" }}
      />

      <div className="drive-list">
        {drives.map((d) => (
          <div key={d.mount} className="drive-item">
            <strong>{d.mount}</strong> — {d.percent}% ({d.used_mb}/{d.total_mb} MB)
          </div>
        ))}
      </div>
    </div>
  );
}
