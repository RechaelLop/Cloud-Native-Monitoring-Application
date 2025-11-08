// src/components/ProcessesTable.js
import React, { useEffect, useState } from "react";

export default function ProcessesTable() {
  const [rows, setRows] = useState([]);

  const fetchProcs = async () => {
    try {
      // default top by CPU, 6 rows
      const res = await fetch("https://cloud-native-monitoring-application-vw2s.onrender.com/processes?n=6&sort=cpu");
      const data = await res.json();
      setRows(data);
    } catch (err) {
      console.error("fetchProcs", err);
    }
  };

  useEffect(() => {
    fetchProcs();
    const i = setInterval(fetchProcs, 3000);
    return () => clearInterval(i);
  }, []);

  return (
    <table className="process-table">
      <thead>
        <tr>
          <th>PID</th>
          <th>Name</th>
          <th>CPU %</th>
          <th>Memory %</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.pid}>
            <td>{r.pid}</td>
            <td>{r.name}</td>
            <td>{r.cpu_percent}</td>
            <td>{r.memory_percent}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
