import Settings from "./components/Settings";
import Events from "./components/Events";
import Alerts from "./components/Alerts";
import LiveMonitoring from "./components/LiveMonitoring";
import Analytics from "./components/Analytics";
import RecentEvents from "./components/RecentEvents";
import ZoneStatus from "./components/ZoneStatus";
import CameraFeed from "./components/CameraFeed";
import StatCard from "./components/StatCard";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import logo from "./assets/company-logo.png";
import { useEffect, useState } from "react";

import {
  Users,
  HardHat,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Camera,
  Bell,
} from "lucide-react";

const stats = [
  {
    title: "People Detected",
    value: "12",
    subtitle: "Currently in monitored area",
    icon: "👥",
  },
  {
    title: "Helmet Compliant",
    value: "10",
    subtitle: "83.3% compliance",
    icon: "🪖",
  },
  {
    title: "PPE Violations",
    value: "2",
    subtitle: "Requires attention",
    icon: "⚠️",
  },
  {
    title: "Compliance Rate",
    value: "83.3%",
    subtitle: "Current safety compliance",
    icon: "✓",
  },
];

const zones = [
  { name: "Red Zone", people: 4, status: "Active" },
  { name: "Yellow Zone", people: 3, status: "Active" },
  { name: "Green Zone", people: 3, status: "Active" },
  { name: "Blue Zone", people: 2, status: "Active" },
];

const violations = [
  {
    time: "10:42:18",
    zone: "Red Zone",
    violation: "Helmet Missing",
    status: "Open",
  },
  {
    time: "10:38:52",
    zone: "Green Zone",
    violation: "Helmet Missing",
    status: "Open",
  },
  {
    time: "10:31:24",
    zone: "Yellow Zone",
    violation: "Helmet Detected",
    status: "Resolved",
  },
];

function Dashboard() {
  const [liveStats, setLiveStats] = useState({
      persons: 0,
      helmets: 0,
      violations: 0,
      compliance_rate: 0
    });
const [events, setEvents] = useState([]);
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(
          "http://10.2.0.177:5000/detection/stats"
        );
        const data = await response.json();
        setLiveStats(data);
      } catch (error) {
        console.error(
          "Failed to fetch detection stats:",
          error
        );
      }
    };
    fetchStats();
    const interval = setInterval(
      fetchStats,
      1000
    );
    return () => clearInterval(interval);
  }, []);
useEffect(() => {
  const fetchEvents = async () => {
    try {
      const response = await fetch(
        "http://10.2.0.177:5000/events"
      );

      const data = await response.json();

      setEvents(data);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  };

  fetchEvents();

  const interval = setInterval(fetchEvents, 1000);

  return () => clearInterval(interval);
}, []);
    return (
  <div className="p-8 space-y-8">

    {/* =========================
        KPI CARDS
    ========================== */}

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

      <StatCard
        title="People Detected"
        value={liveStats.persons}
        subtitle="Currently inside monitored zones"
        icon={<Users size={30} />}
        color="blue"
        trend="+2"
      />

      <StatCard
        title="Helmet Compliant"
        value={liveStats.helmets}
        subtitle="Workers wearing helmets"
        icon={<HardHat size={30} />}
        color="green"
        trend="+5%"
      />

      <StatCard
        title="PPE Violations"
        value={liveStats.violations}
        subtitle="Immediate action required"
        icon={<ShieldAlert size={30} />}
        color="red"
        trend="-12%"
      />

      <StatCard
        title="Compliance"
        value={`${liveStats.compliance_rate}%`}
        subtitle="Overall site safety score"
        icon={<ShieldCheck size={30} />}
        color="yellow"
        trend="+1.8%"
      />

    </div>

    {/* =========================
        CAMERA + ZONES
    ========================== */}

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

      <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">

        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-800">

          <div>

            <h2 className="text-lg font-semibold">
              Live Camera Feed
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Camera 01 • Factory Floor
            </p>

          </div>

          <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-semibold">
            LIVE
          </span>

        </div>

        <CameraFeed />

      </div>

      <ZoneStatus />

    </div>

  </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const renderPage = () => {
    switch (activePage) {
      case "Live Monitoring":
        return <LiveMonitoring />;
      case "Alerts":
        return <Alerts />;
      case "Analytics":
        return <Analytics />;
      case "Events":
        return <Events />;
      case "Settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };
  return (
    <div className="h-screen bg-slate-950 text-white flex overflow-hidden">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />
      <main className="flex-1 screen overflow-y-auto">
        <Header activePage={activePage} />
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
