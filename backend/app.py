from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import psutil
from collections import deque
from time import time
import os

app = Flask(__name__, static_folder="build", static_url_path="/")
CORS(app)

# Config
HISTORY_MAX_POINTS = 300  # store last ~300 samples (~10 minutes)
SAMPLE_INTERVAL_SEC = 2

# In-memory circular buffers
history = {
    "timestamps": deque(maxlen=HISTORY_MAX_POINTS),
    "cpu": deque(maxlen=HISTORY_MAX_POINTS),
    "memory": deque(maxlen=HISTORY_MAX_POINTS),
    "disk_total": deque(maxlen=HISTORY_MAX_POINTS),
    "network_total": deque(maxlen=HISTORY_MAX_POINTS),
}

# Keep last network counters to compute rate
_last_net_counters = None
_last_net_time = None

# Default thresholds (can be made configurable later)
THRESHOLDS = {
    "cpu": 85.0,
    "memory": 85.0,
    "disk": 90.0
}


def sample_metrics():
    """Collect metrics and append to history buffers."""
    global _last_net_counters, _last_net_time

    ts = time()
    cpu = psutil.cpu_percent(interval=None)
    memory = psutil.virtual_memory().percent

    # total disk utilization (weighted)
    disk_parts = psutil.disk_partitions(all=False)
    total_size = 0
    weighted_sum_pct = 0
    for p in disk_parts:
        try:
            du = psutil.disk_usage(p.mountpoint)
            weighted_sum_pct += du.percent * du.total
            total_size += du.total
        except PermissionError:
            continue
    disk_total_pct = (weighted_sum_pct / total_size) if total_size > 0 else 0

    # network: compute MB/s
    current_net = psutil.net_io_counters(pernic=False)
    current_time = ts
    network_mb_s = 0.0
    if _last_net_counters is not None and _last_net_time is not None:
        delta_bytes = (current_net.bytes_sent + current_net.bytes_recv) - (
            _last_net_counters.bytes_sent + _last_net_counters.bytes_recv
        )
        delta_time = max(current_time - _last_net_time, 1e-6)
        network_mb_s = (delta_bytes / delta_time) / (1024 * 1024)
    _last_net_counters = current_net
    _last_net_time = current_time

    history["timestamps"].append(ts)
    history["cpu"].append(cpu)
    history["memory"].append(memory)
    history["disk_total"].append(round(disk_total_pct, 2))
    history["network_total"].append(round(network_mb_s, 3))

    # per-drive details
    per_drive = []
    for p in disk_parts:
        try:
            du = psutil.disk_usage(p.mountpoint)
            per_drive.append({
                "mount": p.mountpoint,
                "percent": round(du.percent, 2),
                "total_mb": round(du.total / (1024 * 1024), 2),
                "used_mb": round(du.used / (1024 * 1024), 2),
                "free_mb": round(du.free / (1024 * 1024), 2),
            })
        except PermissionError:
            continue

    # per-interface stats
    per_nic = {}
    nic_counters = psutil.net_io_counters(pernic=True)
    for nic, cnt in nic_counters.items():
        per_nic[nic] = {
            "bytes_sent": cnt.bytes_sent,
            "bytes_recv": cnt.bytes_recv,
        }

    return {
        "cpu": cpu,
        "memory": memory,
        "disk_total": round(disk_total_pct, 2),
        "network_mb_s": round(network_mb_s, 3),
        "per_drive": per_drive,
        "per_interface": per_nic,
        "timestamp": ts,
    }


@app.route("/metrics", methods=["GET"])
def metrics():
    """Return latest metrics and warnings."""
    data = sample_metrics()

    message, severity = None, None
    if data["cpu"] > THRESHOLDS["cpu"]:
        message = f"High CPU usage: {data['cpu']}%"
        severity = "critical"
    elif data["memory"] > THRESHOLDS["memory"]:
        message = f"High memory usage: {data['memory']}%"
        severity = "warning"
    elif data["disk_total"] > THRESHOLDS["disk"]:
        message = f"Disk nearly full: {data['disk_total']}%"
        severity = "warning"

    resp = {
        "cpu": data["cpu"],
        "memory": data["memory"],
        "disk": data["disk_total"],
        "network": data["network_mb_s"],
        "per_drive": data["per_drive"],
        "per_interface": data["per_interface"],
        "message": message,
        "severity": severity,
        "timestamp": data["timestamp"]
    }
    return jsonify(resp)


@app.route("/metrics/history", methods=["GET"])
def metrics_history():
    """Return historical arrays."""
    points = int(request.args.get("points", HISTORY_MAX_POINTS))
    ts = list(history["timestamps"])[-points:]
    cpu = list(history["cpu"])[-points:]
    memory = list(history["memory"])[-points:]
    disk = list(history["disk_total"])[-points:]
    net = list(history["network_total"])[-points:]

    from datetime import datetime
    ts_iso = [datetime.fromtimestamp(t).isoformat() for t in ts]

    return jsonify({
        "timestamps": ts_iso,
        "cpu": cpu,
        "memory": memory,
        "disk": disk,
        "network": net
    })


@app.route("/processes", methods=["GET"])
def top_processes():
    """Return top N processes by CPU or memory."""
    sort_by = request.args.get("sort", "cpu")
    n = int(request.args.get("n", 5))

    procs = []
    for p in psutil.process_iter(attrs=["pid", "name", "cpu_percent", "memory_percent"]):
        info = p.info
        procs.append({
            "pid": info.get("pid"),
            "name": info.get("name"),
            "cpu_percent": round(info.get("cpu_percent", 0.0), 2),
            "memory_percent": round(info.get("memory_percent", 0.0), 2)
        })
    key = "cpu_percent" if sort_by == "cpu" else "memory_percent"
    procs.sort(key=lambda x: x.get(key, 0.0), reverse=True)
    return jsonify(procs[:n])


@app.route("/disk", methods=["GET"])
def disk_info():
    """Return per-drive disk usage."""
    parts = psutil.disk_partitions(all=False)
    drives = []
    for p in parts:
        try:
            du = psutil.disk_usage(p.mountpoint)
            drives.append({
                "mount": p.mountpoint,
                "fstype": p.fstype,
                "percent": round(du.percent, 2),
                "total_mb": round(du.total / (1024 * 1024), 2),
                "used_mb": round(du.used / (1024 * 1024), 2),
                "free_mb": round(du.free / (1024 * 1024), 2),
            })
        except PermissionError:
            continue
    return jsonify({"drives": drives})


@app.route("/network", methods=["GET"])
def network_info():
    """Return per-interface network counters."""
    nic_counters = psutil.net_io_counters(pernic=True)
    result = {}
    for nic, cnt in nic_counters.items():
        result[nic] = {
            "bytes_sent": cnt.bytes_sent,
            "bytes_recv": cnt.bytes_recv,
        }
    return jsonify(result)


# -------------------------------
# Serve React frontend build files
# -------------------------------
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    """Serve React frontend."""
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    sample_metrics()  # seed counters
    app.run(debug=True, host="0.0.0.0", port=5000)
