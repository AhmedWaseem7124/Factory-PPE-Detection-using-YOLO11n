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
import Login from "./components/Login";
import UserManagement from "./components/UserManagement";
import Reports from "./components/Reports";
import NotificationToast from "./components/NotificationToast";
import { useEffect, useState } from "react";
import {
  API_BASE_URL,
  authFetch,
  getAuthToken,
  getStoredUser,
  clearAuthSession,
  isDefaultAdminWarning
} from "./config/api";

import {
  Users,
  ShieldAlert,
  ShieldCheck,
  Clock,
  CalendarCheck,
  ArrowRight,
  Camera,
  AlertTriangle
} from "lucide-react";

function Dashboard({ onNavigateToEvents, userRole }) {
  const [liveStats, setLiveStats] = useState({
    persons: 0,
    helmets: 0,
    violations: 0,
    compliance_rate: 0,
    todays_incidents: 0,
    todays_avg_duration: 0,
  });

  const [cameraStatus, setCameraStatus] = useState({
    connected: false,
    confidence: 0.3,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, camRes] = await Promise.all([
          authFetch(`${API_BASE_URL}/detection/stats`),
          authFetch(`${API_BASE_URL}/camera/status`),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setLiveStats(data);
        }

        if (camRes.ok) {
          const camData = await camRes.json();
          setCameraStatus(camData);
        }
      } catch (error) {
        console.error("Failed to fetch detection stats:", error);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatAvgDuration = (sec) => {
    if (!sec || sec <= 0) return "0 sec";
    const s = parseInt(sec, 10);
    if (s < 60) return `${s} sec`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r > 0 ? `${m}m ${r}s` : `${m}m`;
  };

  const isViewer = userRole === "Viewer";

  return (
    <div className="p-8 space-y-8">
      {/* TODAY'S OPERATIONAL KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
        <StatCard
          title="Today's Incidents"
          value={liveStats.todays_incidents ?? 0}
          subtitle="Total violations logged today"
          icon={<CalendarCheck size={28} />}
          color="red"
          trend="Today Only"
        />

        <StatCard
          title="Active Violations"
          value={liveStats.violations}
          subtitle="Currently active unresolved"
          icon={<ShieldAlert size={28} />}
          color="yellow"
          trend="Active Now"
        />

        <StatCard
          title="Workers Currently Tracked"
          value={liveStats.persons}
          subtitle="Live tracked workers in view"
          icon={<Users size={28} />}
          color="blue"
          trend="Live Count"
        />

        <StatCard
          title="Today's Compliance"
          value={`${liveStats.compliance_rate}%`}
          subtitle="Today's helmet compliance %"
          icon={<ShieldCheck size={28} />}
          color="green"
          trend="Target >95%"
        />

        <StatCard
          title="Avg Incident Duration"
          value={formatAvgDuration(liveStats.todays_avg_duration)}
          subtitle="Today's mean incident time"
          icon={<Clock size={28} />}
          color="blue"
          trend="Today Only"
        />
      </div>

      {/* CAMERA OPERATIONAL CARD + ZONES */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col">
          {/* Operational Header Badge Bar */}
          <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap justify-between items-center bg-slate-900/90 gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Camera size={18} className="text-emerald-400" />
                Live Operational CCTV Stream — Camera 01
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Factory Main Assembly Floor • Model: YOLO11n</p>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-bold">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                Res: 704x576
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                30 FPS
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30">
                Latency: ~31 ms
              </span>
              <span className={`px-2.5 py-1 rounded-lg border ${cameraStatus.connected ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}`}>
                {cameraStatus.connected ? "CONNECTED" : "STREAMING"}
              </span>
            </div>
          </div>
          <CameraFeed />
        </div>

        <ZoneStatus />
      </div>

      {/* DASHBOARD RECENT EVENTS OVERVIEW */}
      {!isViewer && (
        <div>
          <div className="flex justify-between items-center mb-2 px-1">
            <h3 className="text-sm font-semibold text-slate-400">Quick Operational Overview</h3>
            <button
              onClick={onNavigateToEvents}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition group"
            >
              View All Events Log <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <RecentEvents isDashboard={true} onNavigateToEvents={onNavigateToEvents} />
        </div>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(getStoredUser());
  const [token, setToken] = useState(getAuthToken());
  const [showAdminWarning, setShowAdminWarning] = useState(isDefaultAdminWarning());
  const [activePage, setActivePage] = useState("Dashboard");

  // Listen for unauthorized 401 events globally
  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuthSession();
      setUser(null);
      setToken(null);
      setShowAdminWarning(false);
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const handleLoginSuccess = (userData, tokenData, defaultAdminFlag) => {
    setUser(userData);
    setToken(tokenData);
    setShowAdminWarning(defaultAdminFlag);
    setActivePage("Dashboard");
  };

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
    setToken(null);
    setShowAdminWarning(false);
    setActivePage("Dashboard");
  };

  // Role permissions map
  const rolePermissions = {
    Admin: ["Dashboard", "Live Monitoring", "Analytics", "Events", "Alerts", "Reports", "Settings", "Users"],
    "HSE Officer": ["Dashboard", "Live Monitoring", "Analytics", "Events", "Alerts", "Reports"],
    Viewer: ["Dashboard", "Analytics", "Reports"],
  };

  const userRole = user?.role || "Viewer";
  const allowedPages = rolePermissions[userRole] || ["Dashboard", "Analytics", "Reports"];

  // Route protection fallback
  useEffect(() => {
    if (user && !allowedPages.includes(activePage)) {
      setActivePage("Dashboard");
    }
  }, [user, activePage, allowedPages]);

  if (!user || !token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const handleNavigateToEvents = () => {
    if (allowedPages.includes("Events")) {
      setActivePage("Events");
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case "Live Monitoring":
        return allowedPages.includes("Live Monitoring") ? <LiveMonitoring /> : <Dashboard onNavigateToEvents={handleNavigateToEvents} userRole={userRole} />;
      case "Alerts":
        return allowedPages.includes("Alerts") ? <Alerts /> : <Dashboard onNavigateToEvents={handleNavigateToEvents} userRole={userRole} />;
      case "Analytics":
        return <Analytics />;
      case "Events":
        return allowedPages.includes("Events") ? <Events /> : <Dashboard onNavigateToEvents={handleNavigateToEvents} userRole={userRole} />;
      case "Reports":
        return <Reports currentUser={user} />;
      case "Settings":
        return allowedPages.includes("Settings") ? <Settings /> : <Dashboard onNavigateToEvents={handleNavigateToEvents} userRole={userRole} />;
      case "Users":
        return userRole === "Admin" ? <UserManagement currentUser={user} /> : <Dashboard onNavigateToEvents={handleNavigateToEvents} userRole={userRole} />;
      default:
        return <Dashboard onNavigateToEvents={handleNavigateToEvents} userRole={userRole} />;
    }
  };

  return (
    <div className="h-screen text-white flex overflow-hidden bg-[linear-gradient(rgba(2,6,23,0.78),rgba(2,6,23,0.84)),url('/back_image.jpeg')] bg-cover bg-center bg-no-repeat bg-fixed">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        currentUser={user}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-y-auto relative bg-slate-950/30 flex flex-col">
        {/* DEFAULT ADMIN SECURITY WARNING BANNER */}
        {showAdminWarning && (
          <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-6 py-2.5 font-semibold text-xs flex items-center justify-between shadow-lg shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="shrink-0" />
              <span>
                <strong>SECURITY ALERT:</strong> You are logged in with default administrator credentials (<strong>admin / admin123</strong>). Please change your password immediately in your profile menu.
              </span>
            </div>
            <button
              onClick={() => setShowAdminWarning(false)}
              className="px-3 py-1 bg-slate-950/20 hover:bg-slate-950/40 rounded-lg text-slate-950 font-bold transition"
            >
              Dismiss
            </button>
          </div>
        )}

        <NotificationToast />
        <Header activePage={activePage} currentUser={user} onLogout={handleLogout} />
        <div className="flex-1 overflow-y-auto">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
