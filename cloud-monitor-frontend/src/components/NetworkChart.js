// src/components/NetworkChart.js
import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";

export default function NetworkChart({ per_interface = {} }) {
  // For a quick view, we'll show total bytes for each interface
  const [data, setData] = useState([]);

  useEffect(() => {
    const keys = Object.keys(per_interface || {});
    const arr = keys.map((k) => ({
      name: k,
      sent: per_interface[k].bytes_sent || 0,
      recv: per_interface[k].bytes_recv || 0,
    }));
    setData(arr);
  }, [per_interface]);

  if (data.length === 0) return <div>No network interfaces</div>;

  return (
    <div>
      <h3>Network Interfaces</h3>
      <Plot
        data={[
          {
            x: data.map((d) => d.name),
            y: data.map((d) => Math.round(d.sent / (1024 * 1024))),
            name: "Sent (MB)",
            type: "bar",
          },
          {
            x: data.map((d) => d.name),
            y: data.map((d) => Math.round(d.recv / (1024 * 1024))),
            name: "Recv (MB)",
            type: "bar",
          },
        ]}
        layout={{ barmode: "group", height: 280, margin: { t: 20 } }}
        useResizeHandler
        style={{ width: "100%" }}
      />
    </div>
  );
}
