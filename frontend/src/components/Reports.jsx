import { useEffect, useState, useCallback } from "react";
import { API_BASE_URL, authFetch, getSnapshotUrl } from "../config/api";
import logo from "../assets/company-logo.png";
import {
  FileText,
  Download,
  Calendar,
  ShieldCheck,
  Database,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
  Clock,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from "recharts";

const CHART_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6"];

export default function Reports({ currentUser }) {
  // Report selection
  const [reportType, setReportType] = useState("daily_summary"); // 'daily_summary' | 'incident_investigation' | 'executive_analytics'
  const [datePreset, setDatePreset] = useState("today"); // 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'custom'

  // Date range state
  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Investigation filters
  const [filterZone, setFilterZone] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Loaded Report Data from backend
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const userRole = currentUser?.role || "Viewer";
  const isAdmin = userRole === "Admin";

  // Handle Preset Date Range Changes
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === "today") {
      const d = now.toISOString().split("T")[0];
      setStartDate(d);
      setEndDate(d);
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const d = y.toISOString().split("T")[0];
      setStartDate(d);
      setEndDate(d);
    } else if (preset === "last_7_days") {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      setStartDate(s.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "last_30_days") {
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      setStartDate(s.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "this_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split("T")[0]);
      setEndDate(now.toISOString().split("T")[0]);
    }
  };

  // Fetch Report Data from Backend (100% Real SQL Data)
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError("");
    setMsg("");
    try {
      let endpoint = "";
      if (reportType === "daily_summary") {
        endpoint = `${API_BASE_URL}/api/reports/daily_summary?date=${startDate}`;
      } else if (reportType === "incident_investigation") {
        const queryParams = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
          zone: filterZone,
          event_type: filterType,
          status: filterStatus,
        });
        endpoint = `${API_BASE_URL}/api/reports/incident_investigation?${queryParams.toString()}`;
      } else if (reportType === "executive_analytics") {
        const queryParams = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
        });
        endpoint = `${API_BASE_URL}/api/reports/executive_analytics?${queryParams.toString()}`;
      }

      const response = await authFetch(endpoint);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to fetch report data from server");
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err.message || "Error generating report");
      setReportData(null);
    } fontFinally: {
      setLoading(false);
    }
  }, [reportType, startDate, endDate, filterZone, filterType, filterStatus]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Excel Export Handler (.xlsx via openpyxl backend endpoint)
  const handleExportExcel = async () => {
    if (!reportData) return;

    try {
      setMsg("Generating Enterprise Excel Report...");

      const queryParams = new URLSearchParams();
      queryParams.append("report_type", reportType);

      if (reportType === "daily_summary") {
        if (startDate) queryParams.append("date", startDate);
      } else {
        if (startDate) queryParams.append("start_date", startDate);
        if (endDate) queryParams.append("end_date", endDate);
      }

      if (reportType === "incident_investigation") {
        if (filterZone && filterZone !== "All") queryParams.append("zone", filterZone);
        if (filterType && filterType !== "All") queryParams.append("event_type", filterType);
        if (filterStatus && filterStatus !== "All") queryParams.append("status", filterStatus);
      }

      const res = await authFetch(`${API_BASE_URL}/api/reports/export_excel?${queryParams.toString()}`);

      if (!res.ok) {
        throw new Error(`Failed to generate Excel report (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType.toUpperCase()}_Report_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMsg("Enterprise Excel report downloaded successfully.");
    } catch (err) {
      console.error("Excel Export Error:", err);
      setError("Failed to download Excel report.");
    }
  };

  // PDF Export Handler (.pdf via ReportLab & Matplotlib backend endpoints)
  const handleExportPDF = async () => {
    if (!reportData) return;

    try {
      setMsg("Generating custom PDF report for selected scope...");

      const queryParams = new URLSearchParams();
      queryParams.append("report_type", reportType);

      let filename = "Report.pdf";

      if (reportType === "daily_summary") {
        if (startDate) queryParams.append("date", startDate);
        filename = `Daily_HSE_Summary_${startDate || 'Today'}.pdf`;
      } else {
        if (startDate) queryParams.append("start_date", startDate);
        if (endDate) queryParams.append("end_date", endDate);
        filename = reportType === "incident_investigation" ? "Incident_Investigation_Report.pdf" : "Executive_Analytics_Report.pdf";
      }

      if (reportType === "incident_investigation") {
        if (filterZone && filterZone !== "All") queryParams.append("zone", filterZone);
        if (filterType && filterType !== "All") queryParams.append("event_type", filterType);
        if (filterStatus && filterStatus !== "All") queryParams.append("status", filterStatus);
      }

      const res = await authFetch(`${API_BASE_URL}/api/reports/export_pdf?${queryParams.toString()}`);

      if (!res.ok) {
        throw new Error(`Failed to generate PDF report (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMsg("PDF report downloaded successfully.");
    } catch (err) {
      console.error("PDF Export Error:", err);
      setError("Failed to download PDF report.");
    }
  };

  // Raw Database Dump for Admin
  const handleExportRawDB = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setMsg("");
    try {
      const res = await authFetch(`${API_BASE_URL}/events`);
      if (!res.ok) throw new Error("Unauthorized or server error");
      const events = await res.json();

      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "ID,Timestamp,TrackID,Zone,EventType,Confidence,Snapshot,StartTime,EndTime,Duration,Resolved\n";

      events.forEach((e) => {
        csvContent += `${e.id},"${e.timestamp}",${e.track_id},"${e.zone}","${e.event_type}",${e.confidence},"${e.snapshot_path}","${e.start_time}","${e.end_time}",${e.duration},${e.resolved}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `PPE_Events_Raw_Database_Dump_${todayStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMsg("Raw database events dump exported successfully.");
    } catch (e) {
      setError("Raw export failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Enterprise Safety & Compliance Reports</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live SQLite database analytics, operational HSE summaries, and audit logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            disabled={loading || !reportData}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 transition disabled:opacity-40"
          >
            <FileText size={16} />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={loading || !reportData}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition border border-emerald-500/30 disabled:opacity-40"
          >
            <FileSpreadsheet size={16} className="text-white" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {msg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} />
          <span>{msg}</span>
        </div>
      )}

      {/* REPORT CONTROLS BAR */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-5">
        {/* REPORT TYPE SELECTOR */}
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Select Report Type</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => setReportType("daily_summary")}
              className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                reportType === "daily_summary"
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-white">1. Daily HSE Summary</span>
                <Calendar size={18} />
              </div>
              <p className="text-xs opacity-80">Operational summary for a single selected day with top incidents and hourly trend.</p>
            </button>

            <button
              onClick={() => setReportType("incident_investigation")}
              className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                reportType === "incident_investigation"
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-white">2. Incident Investigation</span>
                <ShieldAlert size={18} />
              </div>
              <p className="text-xs opacity-80">Detailed investigation log with Track IDs, start/end times, durations, and snapshot evidence links.</p>
            </button>

            <button
              onClick={() => setReportType("executive_analytics")}
              className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between ${
                reportType === "executive_analytics"
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-white">3. Executive Analytics</span>
                <TrendingUp size={18} />
              </div>
              <p className="text-xs opacity-80">Management-level report with multi-day trends, Recharts visual analytics, and risk matrix.</p>
            </button>
          </div>
        </div>

        {/* DATE RANGE PRESETS & INPUTS */}
        <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Date Range Preset</label>
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDatePreset("custom");
                setStartDate(e.target.value);
              }}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {reportType !== "daily_summary" && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDatePreset("custom");
                  setEndDate(e.target.value);
                }}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={fetchReportData}
              disabled={loading}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Filter size={16} />}
              <span>Apply Filters</span>
            </button>
          </div>
        </div>

        {/* EXTRA INVESTIGATION FILTERS */}
        {reportType === "incident_investigation" && (
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Zone Filter</label>
              <select
                value={filterZone}
                onChange={(e) => setFilterZone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="All">All Zones</option>
                <option value="Red Zone">Red Zone</option>
                <option value="Blue Zone">Blue Zone</option>
                <option value="Green Zone">Green Zone</option>
                <option value="Yellow Zone">Yellow Zone</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Violation Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="All">All Types</option>
                <option value="No Helmet">No Helmet</option>
                <option value="Zone Breach">Zone Breach</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Resolution Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Completed">Resolved Only</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* REPORT CONTENT VIEWPORT */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-3xl">
          <Loader2 size={32} className="animate-spin mx-auto text-amber-500 mb-3" />
          <p className="text-sm font-semibold">Executing Live Database Queries...</p>
        </div>
      ) : !reportData ? (
        <div className="p-16 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-3xl">
          <AlertTriangle size={32} className="mx-auto text-amber-500 mb-3" />
          <p className="text-sm font-semibold">No report data returned from database query.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* =========================================================
              REPORT TYPE 1: DAILY HSE SUMMARY
          ========================================================== */}
          {reportType === "daily_summary" && (
            <div className="space-y-6">
              {/* OPERATIONAL KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-bold uppercase">Total Incidents</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">{reportData.todays_incidents}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Single Day Count</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-bold uppercase">Helmet Compliance</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{reportData.compliance_rate}%</div>
                  <div className="text-[11px] text-slate-500 mt-1">Live Monitored Rate</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-bold uppercase">Active Violations</div>
                  <div className="text-2xl font-bold text-red-400 mt-1">{reportData.active_incidents}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Unresolved Now</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-bold uppercase">Avg Incident Time</div>
                  <div className="text-2xl font-bold text-blue-400 mt-1">{reportData.avg_duration}s</div>
                  <div className="text-[11px] text-slate-500 mt-1">Mean Duration</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-bold uppercase">Highest Risk Zone</div>
                  <div className="text-xl font-bold text-purple-400 mt-1 truncate">{reportData.highest_risk_zone}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Peak Violation Area</div>
                </div>
              </div>

              {/* EXECUTIVE SUMMARY BOX */}
              <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-3xl">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText size={16} /> Executive Daily Operational Narrative
                </h3>
                <p className="text-sm text-slate-200 leading-relaxed font-medium">{reportData.executive_summary}</p>
              </div>

              {/* HOURLY VIOLATIONS & ZONE BREAKDOWN */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-amber-400" /> Hourly Violation Trend ({reportData.date})
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.hourly_violations}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} />
                        <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <PieIcon size={18} className="text-amber-400" /> Zone Breakdown
                  </h3>
                  <div className="space-y-3">
                    {(reportData.zone_distribution || []).length === 0 ? (
                      <p className="text-xs text-slate-500">No zone violations recorded on this date.</p>
                    ) : (
                      reportData.zone_distribution.map((zd, idx) => (
                        <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                          <span className="text-xs font-semibold text-white">{zd.zone}</span>
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                            {zd.count} violations
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* TOP INCIDENTS TABLE */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white">Top Daily Incidents Logged</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                      <tr>
                        <th className="px-6 py-3">Incident ID</th>
                        <th className="px-6 py-3">Track ID</th>
                        <th className="px-6 py-3">Timestamp</th>
                        <th className="px-6 py-3">Zone</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Duration</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(reportData.top_incidents || []).length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                            No incidents recorded on {reportData.date}.
                          </td>
                        </tr>
                      ) : (
                        reportData.top_incidents.map((inc) => (
                          <tr key={inc.id} className="hover:bg-slate-800/40">
                            <td className="px-6 py-3 font-mono text-amber-400 font-bold">#{inc.id}</td>
                            <td className="px-6 py-3 font-mono">Track #{inc.track_id}</td>
                            <td className="px-6 py-3">{inc.timestamp}</td>
                            <td className="px-6 py-3">{inc.zone}</td>
                            <td className="px-6 py-3 font-semibold text-white">{inc.event_type}</td>
                            <td className="px-6 py-3">{inc.duration} sec</td>
                            <td className="px-6 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${inc.resolved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                                {inc.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              REPORT TYPE 2: INCIDENT INVESTIGATION REPORT
          ========================================================== */}
          {reportType === "incident_investigation" && (
            <div className="space-y-6">
              {/* INVESTIGATION METRICS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-bold uppercase">Matched Incidents</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">{reportData.total_incidents}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Filter Results</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-bold uppercase">Active Incidents</div>
                  <div className="text-2xl font-bold text-red-400 mt-1">{reportData.active_incidents}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Ongoing</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-bold uppercase">Resolved Incidents</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{reportData.completed_incidents}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Resolved</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-bold uppercase">Avg Duration</div>
                  <div className="text-2xl font-bold text-blue-400 mt-1">{reportData.avg_duration}s</div>
                  <div className="text-[11px] text-slate-500 mt-1">Investigation mean</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-bold uppercase">Tracked Persons</div>
                  <div className="text-2xl font-bold text-purple-400 mt-1">{reportData.unique_tracked_persons}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Unique Track IDs</div>
                </div>
              </div>

              {/* DETAILED INCIDENTS TIMELINE TABLE */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="text-base font-bold text-white">Incident Investigation Timeline & Evidence Log</h3>
                  <span className="text-xs text-slate-400 font-semibold">Total: {reportData.total_incidents} records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                      <tr>
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Track ID</th>
                        <th className="px-6 py-4">Start Time</th>
                        <th className="px-6 py-4">End Time</th>
                        <th className="px-6 py-4">Duration</th>
                        <th className="px-6 py-4">Zone</th>
                        <th className="px-6 py-4">Violation</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(reportData.incidents || []).length === 0 ? (
                        <tr>
                          <td colSpan="9" className="px-6 py-12 text-center text-slate-500">
                            No incident records match the selected investigation criteria.
                          </td>
                        </tr>
                      ) : (
                        reportData.incidents.map((inc) => (
                          <tr key={inc.id} className="hover:bg-slate-800/40 transition">
                            <td className="px-6 py-4 font-mono font-bold text-amber-400">#{inc.id}</td>
                            <td className="px-6 py-4 font-mono text-white">Track #{inc.track_id}</td>
                            <td className="px-6 py-4">{inc.start_time}</td>
                            <td className="px-6 py-4">{inc.end_time}</td>
                            <td className="px-6 py-4 font-bold text-slate-200">{inc.duration} sec</td>
                            <td className="px-6 py-4">{inc.zone}</td>
                            <td className="px-6 py-4 font-semibold text-white">{inc.event_type}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${inc.resolved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                                {inc.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {inc.snapshot_path ? (
                                <a
                                  href={getSnapshotUrl(inc.snapshot_path)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold border border-slate-700 transition"
                                >
                                  <ExternalLink size={12} /> Snapshot
                                </a>
                              ) : (
                                <span className="text-slate-600 italic">No image</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              REPORT TYPE 3: EXECUTIVE ANALYTICS REPORT
          ========================================================== */}
          {reportType === "executive_analytics" && (
            <div className="space-y-6">
              {/* STRATEGIC KPI GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-bold uppercase">Total PPE Violations</div>
                  <div className="text-3xl font-bold text-amber-400 mt-1">{reportData.total_incidents}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Period Total</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-bold uppercase">Overall Compliance</div>
                  <div className="text-3xl font-bold text-emerald-400 mt-1">{reportData.compliance_rate}%</div>
                  <div className="text-[11px] text-slate-500 mt-1">Facility Target &gt;95%</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-bold uppercase">Highest Risk Zone</div>
                  <div className="text-2xl font-bold text-red-400 mt-1 truncate">{reportData.highest_risk_zone}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Requires Priority Audit</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-xs text-slate-400 font-bold uppercase">Longest Single Incident</div>
                  <div className="text-3xl font-bold text-purple-400 mt-1">{reportData.longest_duration}s</div>
                  <div className="text-[11px] text-slate-500 mt-1">Max resolution time</div>
                </div>
              </div>

              {/* DYNAMIC EXECUTIVE SUMMARY */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <TrendingUp size={18} className="text-amber-400" /> Executive Management Summary
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed font-medium">{reportData.executive_summary}</p>
              </div>

              {/* CHARTS GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* DAILY TREND CHART */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                  <h3 className="text-base font-bold text-white mb-4">Daily Incident Trend</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={reportData.daily_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} />
                        <Area type="monotone" dataKey="count" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* HOURLY DISTRIBUTION CHART */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
                  <h3 className="text-base font-bold text-white mb-4">Hourly Violation Distribution</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.hourly_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff" }} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* ZONE RISK MATRIX TABLE */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-800">
                  <h3 className="text-base font-bold text-white">Zone Risk Comparison Matrix</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                      <tr>
                        <th className="px-6 py-4">Zone Name</th>
                        <th className="px-6 py-4">Tracked Workers</th>
                        <th className="px-6 py-4">Violations Logged</th>
                        <th className="px-6 py-4">Violation Rate (%)</th>
                        <th className="px-6 py-4">Risk Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {(reportData.zone_matrix || []).map((zm, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="px-6 py-4 font-semibold text-white">{zm.zone}</td>
                          <td className="px-6 py-4">{zm.total_workers} workers</td>
                          <td className="px-6 py-4 font-bold text-amber-400">{zm.violations}</td>
                          <td className="px-6 py-4">{zm.violation_pct}%</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                              zm.risk_status === 'High Risk'
                                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                : zm.risk_status === 'Warning'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            }`}>
                              {zm.risk_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADMIN RAW DB DUMP CARD */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Database size={18} className="text-purple-400" /> Raw Database Audit Dump
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Export un-aggregated event database logs for external compliance filing & auditing.
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={handleExportRawDB}
            disabled={loading}
            className="px-5 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 font-bold text-xs rounded-xl flex items-center gap-2 transition disabled:opacity-40"
          >
            <Download size={15} />
            <span>Export Raw Events Database CSV</span>
          </button>
        ) : (
          <span className="text-xs text-slate-500 italic">Admin authorization required for raw database export.</span>
        )}
      </div>
    </div>
  );
}
