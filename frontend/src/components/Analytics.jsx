import { useEffect, useState, useCallback, useMemo } from "react";
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
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  ShieldCheck,
  Users,
  ShieldAlert,
  Clock,
  Flame,
  AlertTriangle,
  Timer,
  CalendarCheck,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  Calendar,
  Filter,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { API_BASE_URL, authFetch } from "../config/api";

import KPIStat from "./KPIStat";

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6"];

export default function Analytics() {
  const [analytics, setAnalytics] = useState({
    workers: 0,
    violations: 0,
    active_violations: 0,
    total_incidents: 0,
    completed_incidents: 0,
    compliance_rate: 0,
    safety_score: 0,
    todays_incidents: 0,
    avg_duration: 0,
    longest_duration: 0,
    highest_risk_zone: "None",
    latest_incident_time: "N/A",
    trend_data: [],
    zone_data: [],
    event_data: [],
  });

  // Date Range Preset Filter state
  const [activePreset, setActivePreset] = useState("Last 7 Days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Hourly Chart specific date picker state
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [hourlyDate, setHourlyDate] = useState(todayStr);

  const [hourlyData, setHourlyData] = useState([]);
  const [zoneDistData, setZoneDistData] = useState([]);

  // Compute preset dates
  const applyPreset = useCallback((preset) => {
    setActivePreset(preset);
    const now = new Date();
    const formatDate = (d) => d.toISOString().split("T")[0];

    if (preset === "Today") {
      const today = formatDate(now);
      setStartDate(today);
      setEndDate(today);
    } else if (preset === "Yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatDate(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "Last 7 Days") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      setStartDate(formatDate(d));
      setEndDate(formatDate(now));
    } else if (preset === "Last 30 Days") {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      setStartDate(formatDate(d));
      setEndDate(formatDate(now));
    } else if (preset === "This Month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(now));
    } else if (preset === "Last Month") {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(formatDate(firstDayLastMonth));
      setEndDate(formatDate(lastDayLastMonth));
    } else {
      // Custom range: keep custom inputs
    }
  }, []);

  // Initialize default filter preset on mount
  useEffect(() => {
    applyPreset("Last 7 Days");
  }, [applyPreset]);

  // Fetch analytics data according to date range filters
  const fetchAnalyticsData = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append("start_date", startDate);
      if (endDate) queryParams.append("end_date", endDate);

      const [analRes, zoneDistRes] = await Promise.all([
        authFetch(`${API_BASE_URL}/analytics?${queryParams.toString()}`),
        authFetch(`${API_BASE_URL}/api/zone_distribution?${queryParams.toString()}`),
      ]);

      if (analRes.ok) {
        const data = await analRes.json();
        setAnalytics(data);
      }

      if (zoneDistRes.ok) {
        const zdData = await zoneDistRes.json();
        setZoneDistData(zdData);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    }
  }, [startDate, endDate]);

  // Fetch hourly data by selected hourly date
  const fetchHourlyData = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/hourly_violations?date=${hourlyDate}`);

      if (res.ok) {
        const hData = await res.json();
        setHourlyData(hData);
      }
    } catch (err) {
      console.error("Failed to fetch hourly violations:", err);
    }
  }, [hourlyDate]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  useEffect(() => {
    fetchHourlyData();
  }, [fetchHourlyData]);

  const handleResetFilters = () => {
    applyPreset("Last 7 Days");
  };

  const formatDurationDisplay = (seconds) => {
    if (!seconds || seconds <= 0) return "0s";
    const sec = parseInt(seconds, 10);
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
  };

  const complianceData = analytics.trend_data || [];
  const violationData = analytics.event_data || [];
  const avgHourlyCount = hourlyData.length > 0 ? hourlyData[0].avg || 0 : 0;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Safety Intelligence & Historical Analytics
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Comprehensive historical reporting, HSE incident analytics, hourly breakdown, and spatial exposure metrics
        </p>
      </div>

      {/* =========================
          ANALYTICS DATE RANGE FILTER BAR
      ========================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Filter size={18} className="text-amber-400" />
            Date Range Filter Presets:
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {["Today", "Yesterday", "Last 7 Days", "Last 30 Days", "This Month", "Last Month", "Custom Range"].map((preset) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activePreset === preset
                    ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Picker Sub-bar */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-slate-400">Start Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset("Custom Range");
                }}
                className="bg-transparent text-white outline-none font-medium cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-slate-400">End Date:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset("Custom Range");
                }}
                className="bg-transparent text-white outline-none font-medium cursor-pointer"
              />
            </div>

            <button
              onClick={fetchAnalyticsData}
              className="px-4 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 font-bold transition flex items-center gap-1.5"
            >
              Apply Filter
            </button>

            <button
              onClick={handleResetFilters}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition flex items-center gap-1.5"
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>

          <div className="text-slate-400 text-xs">
            Showing Scope: <span className="text-amber-400 font-bold">{startDate || "Beginning"}</span> to{" "}
            <span className="text-amber-400 font-bold">{endDate || "Today"}</span>
          </div>
        </div>
      </div>

      {/* =========================
          NON-DUPLICATED ANALYTICS KPI GRID
      ========================== */}
      <div>
        <h2 className="text-lg font-bold text-slate-200 mb-4 tracking-wide">
          Historical & Selected Scope Analytics KPIs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          <KPIStat
            title="Total Incidents"
            value={analytics.total_incidents ?? 0}
            subtitle="Scope incidents count"
            color="red"
            icon={<ShieldAlert size={22} />}
          />
          <KPIStat
            title="Resolved Incidents"
            value={analytics.completed_incidents ?? 0}
            subtitle="Resolved events count"
            color="emerald"
            icon={<CheckCircle2 size={22} />}
          />
          <KPIStat
            title="Active Violations"
            value={analytics.active_violations ?? 0}
            subtitle="Unresolved active count"
            color="amber"
            icon={<AlertTriangle size={22} />}
          />
          <KPIStat
            title="Avg Duration"
            value={formatDurationDisplay(analytics.avg_duration)}
            subtitle="Resolved mean time"
            color="blue"
            icon={<Clock size={22} />}
          />
          <KPIStat
            title="Longest Duration"
            value={formatDurationDisplay(analytics.longest_duration)}
            subtitle="Resolved max time"
            color="purple"
            icon={<Timer size={22} />}
          />
          <KPIStat
            title="Highest Risk Zone"
            value={analytics.highest_risk_zone || "None"}
            subtitle="Most violation area"
            color="amber"
            icon={<Flame size={22} />}
          />
          <KPIStat
            title="Compliance %"
            value={`${analytics.compliance_rate}%`}
            subtitle="Helmet compliance index"
            color="emerald"
            icon={<ShieldCheck size={22} />}
          />
          <KPIStat
            title="Latest Incident"
            value={
              analytics.latest_incident_time
                ? analytics.latest_incident_time.split(" ")[1] || analytics.latest_incident_time
                : "N/A"
            }
            subtitle={
              analytics.latest_incident_time
                ? analytics.latest_incident_time.split(" ")[0] || "Last event"
                : "No events"
            }
            color="blue"
            icon={<CalendarCheck size={22} />}
          />
        </div>
      </div>

      {/* =========================
          HOURLY VIOLATIONS CHART WITH DATE PICKER
      ========================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-wrap justify-between items-center mb-5 gap-4">
          <div>
            <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
              <Activity size={22} className="text-amber-400 animate-pulse" />
              Hourly Violations Chart (00:00 – 23:00)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">24-hour incident creation breakdown for the selected day</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Dedicated Date Picker */}
            <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs">
              <Calendar size={14} className="text-amber-400" />
              <span className="text-slate-300 font-semibold">Select Date:</span>
              <input
                type="date"
                value={hourlyDate}
                onChange={(e) => setHourlyDate(e.target.value)}
                className="bg-transparent text-amber-400 font-bold outline-none cursor-pointer"
              />
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Avg Hourly: {avgHourlyCount}
            </span>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "12px",
                  color: "#fff",
                }}
                formatter={(val) => [`${val} Incidents`, "Incident Count"]}
              />
              <ReferenceLine y={avgHourlyCount} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Mean Rate", fill: "#f59e0b", fontSize: 10 }} />
              <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} name="Incidents Created" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* =========================
          HISTORICAL CHARTS GRID
      ========================== */}
      <div className="grid xl:grid-cols-3 gap-6">
        {/* Daily Compliance & Incident Trend Area Chart */}
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-400" />
                Daily Incident Volume & Compliance Trend
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Real historical daily incident volume directly from SQLite</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Selected Range
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={complianceData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#22c55e"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  name="Incidents Logged"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Worker Exposure vs Violations Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-400" />
                Worker Exposure vs Violations
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Workers observed vs violations per zone</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneDistData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="zone" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="total_workers" fill="#64748b" radius={[6, 6, 0, 0]} name="Workers Observed" />
                <Bar dataKey="violations" fill="#ef4444" radius={[6, 6, 0, 0]} name="Violations Logged" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Violation Event Type Pie Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
            <PieChartIcon size={20} className="text-rose-400" />
            Violation Category Breakdown (Selected Scope)
          </h2>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={violationData.length > 0 ? violationData : [{ name: "Helmet Missing", value: 1 }]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {(violationData.length > 0 ? violationData : [{ name: "Helmet Missing", value: 1 }]).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "12px",
                  color: "#fff",
                }}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
