// src/components/HistoricalCharts.js
import React from "react";
import Plot from "react-plotly.js";

export default function HistoricalCharts({ history }) {
  const timestamps = history.timestamps || [];
  const cpu = history.cpu || [];
  const memory = history.memory || [];
  const disk = history.disk || [];
  const network = history.network || [];

  return (
    <div>
      <h3>Historical Metrics</h3>
      <Plot
        data={[
          { x: timestamps, y: cpu, type: "scatter", name: "CPU (%)" },
          { x: timestamps, y: memory, type: "scatter", name: "Memory (%)" },
        ]}
        layout={{ title: "CPU & Memory", height: 300, margin: { t: 30 } }}
        useResizeHandler
        style={{ width: "100%" }}
      />

      <Plot
        data={[
          { x: timestamps, y: disk, type: "scatter", name: "Disk (%)" },
          { x: timestamps, y: network, type: "scatter", name: "Network (MB/s)" },
        ]}
        layout={{ title: "Disk & Network", height: 300, margin: { t: 30 } }}
        useResizeHandler
        style={{ width: "100%", marginTop: 10 }}
      />
    </div>
  );
}
