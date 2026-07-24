import { useEffect, useState } from "react";

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

function Sidebar({ activePage, setActivePage }) {
  const navigation = [
    { name: "Dashboard", icon: "▦" },
    { name: "Live Monitoring", icon: "◉" },
    { name: "Alerts", icon: "⚠" },
    { name: "Events", icon: "☷" },
    { name: "Settings", icon: "⚙" },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">

      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold">
            PPE
          </div>

          <div>
            <h1 className="font-bold text-lg">
              Factory PPE
            </h1>

            <p className="text-xs text-slate-400">
              AI Monitoring System
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <button
            key={item.name}
            onClick={() => setActivePage(item.name)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition ${
              activePage === item.name
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.name}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">
              System Online
            </span>
          </div>

          <p className="text-xs text-slate-400">
            AI monitoring active
          </p>
        </div>
      </div>
    </aside>
  );
}

function Header({ activePage }) {
  return (
    <header className="h-20 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-8 shrink-0">

      <div>
        <h2 className="text-2xl font-bold">
          {activePage}
        </h2>

        <p className="text-sm text-slate-400">
          Factory PPE Monitoring System
        </p>
      </div>

      <div className="flex items-center gap-6">

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full" />

          <span className="text-sm text-slate-300">
            Camera Connected
          </span>
        </div>

        <div className="text-sm text-slate-400">
          Camera 01
        </div>

      </div>
    </header>
  );
}

function CameraFeed({ large = false }) {
  return (
    <div
      className={`bg-black relative overflow-hidden ${
        large ? "aspect-video" : "aspect-video"
      }`}
    >

      {/* Real YOLO-processed camera stream */}

      <img
        src="http://10.2.0.177:5000/video_feed"
        alt="Live Factory CCTV"
        className="w-full h-full object-contain"
      />

      {/* LIVE indicator */}

      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 px-3 py-2 rounded-lg">

        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />

        <span className="text-xs font-medium">
          LIVE
        </span>

      </div>

      {/* Camera information */}

      <div className="absolute bottom-4 left-4 right-4 flex justify-between">

        <span className="bg-black/70 px-3 py-2 rounded-lg text-xs">
          Camera 01
        </span>

        <span className="bg-black/70 px-3 py-2 rounded-lg text-xs">
          AI Detection Active
        </span>

      </div>

    </div>
  );
}

function Dashboard() {
  const [liveStats, setLiveStats] = useState({
      persons: 0,
      helmets: 0,
      violations: 0,
      compliance_rate: 0
    });

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
  return (
    <div className="p-8">

      {/* Statistics */}

<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">

  {/* People Detected */}

  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

    <div className="flex justify-between items-start">

      <div>

        <p className="text-sm text-slate-400">
          People Detected
        </p>

        <h3 className="text-3xl font-bold mt-2">
          {liveStats.persons}
        </h3>

      </div>

      <div className="text-2xl">
        👥
      </div>

    </div>

    <p className="text-xs text-slate-500 mt-4">
      Currently in monitored area
    </p>

  </div>


  {/* Helmets */}

  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

    <div className="flex justify-between items-start">

      <div>

        <p className="text-sm text-slate-400">
          Helmets Detected
        </p>

        <h3 className="text-3xl font-bold mt-2">
          {liveStats.helmets}
        </h3>

      </div>

      <div className="text-2xl">
        🪖
      </div>

    </div>

    <p className="text-xs text-slate-500 mt-4">
      Helmets detected by AI
    </p>

  </div>


  {/* Violations */}

  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

    <div className="flex justify-between items-start">

      <div>

        <p className="text-sm text-slate-400">
          PPE Violations
        </p>

        <h3 className="text-3xl font-bold mt-2">
          {liveStats.violations}
        </h3>

      </div>

      <div className="text-2xl">
        ⚠️
      </div>

    </div>

    <p className="text-xs text-slate-500 mt-4">
      Current detected violations
    </p>

  </div>


  {/* Compliance */}

  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

    <div className="flex justify-between items-start">

      <div>

        <p className="text-sm text-slate-400">
          Compliance Rate
        </p>

        <h3 className="text-3xl font-bold mt-2">
          {liveStats.compliance_rate}%
        </h3>

      </div>

      <div className="text-2xl">
        ✓
      </div>

    </div>

    <p className="text-xs text-slate-500 mt-4">
      Current safety compliance
    </p>

  </div>

</div>
      {/* Camera + Zones */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

          <div className="p-5 border-b border-slate-800">

            <h3 className="font-semibold">
              Live Camera Feed
            </h3>

            <p className="text-xs text-slate-500 mt-1">
              Camera 01 • Factory Floor
            </p>

          </div>

          <CameraFeed />

        </div>

        <ZoneStatus />

      </div>

      <RecentEvents />

    </div>
  );
}

function ZoneStatus() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl">

      <div className="p-5 border-b border-slate-800">

        <h3 className="font-semibold">
          Zone Status
        </h3>

        <p className="text-xs text-slate-500 mt-1">
          Current monitored zones
        </p>

      </div>

      <div className="p-5 space-y-4">

        {zones.map((zone) => (

          <div
            key={zone.name}
            className="bg-slate-800/50 rounded-lg p-4"
          >

            <div className="flex justify-between items-center">

              <div className="flex items-center gap-3">

                <span className="w-3 h-3 bg-green-500 rounded-full" />

                <span className="text-sm font-medium">
                  {zone.name}
                </span>

              </div>

              <span className="text-xs text-green-400">
                {zone.status}
              </span>

            </div>

            <p className="text-xs text-slate-500 mt-2">
              {zone.people} people detected
            </p>

          </div>

        ))}

      </div>

    </div>
  );
}

function RecentEvents() {
  return (
    <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl">

      <div className="p-5 border-b border-slate-800">

        <h3 className="font-semibold">
          Recent PPE Events
        </h3>

        <p className="text-xs text-slate-500 mt-1">
          Latest AI detection events
        </p>

      </div>

      <div className="overflow-x-auto">

        <table className="w-full">

          <thead>

            <tr className="text-left text-xs text-slate-500 border-b border-slate-800">

              <th className="p-5">
                Time
              </th>

              <th className="p-5">
                Zone
              </th>

              <th className="p-5">
                Detection
              </th>

              <th className="p-5">
                Status
              </th>

            </tr>

          </thead>

          <tbody>

            {violations.map((event, index) => (

              <tr
                key={index}
                className="border-b border-slate-800 last:border-0 hover:bg-slate-800/40"
              >

                <td className="p-5 text-sm text-slate-400">
                  {event.time}
                </td>

                <td className="p-5 text-sm">
                  {event.zone}
                </td>

                <td className="p-5">

                  <span
                    className={
                      event.violation === "Helmet Missing"
                        ? "text-sm text-red-400"
                        : "text-sm text-green-400"
                    }
                  >
                    {event.violation}
                  </span>

                </td>

                <td className="p-5">

                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      event.status === "Open"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-green-500/10 text-green-400"
                    }`}
                  >
                    {event.status}
                  </span>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

function LiveMonitoring() {
  return (
    <div className="p-8">

      {/* Page Header */}

      <div className="flex items-center justify-between mb-6">

        <div>
          <h3 className="text-xl font-bold">
            Live AI Monitoring
          </h3>

          <p className="text-sm text-slate-400 mt-1">
            Real-time PPE detection and compliance monitoring
          </p>
        </div>

        <div className="flex items-center gap-3">

          <span className="flex items-center gap-2 text-sm text-green-400">

            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />

            Monitoring Active

          </span>

        </div>

      </div>


      {/* Main Monitoring Area */}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* Video */}

        <div className="xl:col-span-3 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

          <div className="p-5 border-b border-slate-800 flex justify-between">

            <div>

              <h3 className="font-semibold">
                Camera 01
              </h3>

              <p className="text-xs text-slate-500 mt-1">
                Factory Floor • RTSP Stream
              </p>

            </div>

            <span className="text-xs text-green-400">
              CONNECTED
            </span>

          </div>

          <CameraFeed large />

        </div>


        {/* Detection Summary */}

        <div className="space-y-6">

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

            <h3 className="font-semibold mb-5">
              Detection Summary
            </h3>

            <div className="space-y-5">

              <div className="flex justify-between">

                <span className="text-sm text-slate-400">
                  Persons
                </span>

                <span className="font-bold">
                  12
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-sm text-slate-400">
                  Helmets
                </span>

                <span className="font-bold text-green-400">
                  10
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-sm text-slate-400">
                  Violations
                </span>

                <span className="font-bold text-red-400">
                  2
                </span>

              </div>

            </div>

          </div>


          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">

            <h3 className="font-semibold mb-5">
              AI Model
            </h3>

            <div className="space-y-4 text-sm">

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Model
                </span>

                <span>
                  YOLO11n
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Status
                </span>

                <span className="text-green-400">
                  Ready
                </span>

              </div>

              <div className="flex justify-between">

                <span className="text-slate-400">
                  Confidence
                </span>

                <span>
                  0.50
                </span>

              </div>

            </div>

          </div>

        </div>

      </div>


      {/* Zone Monitoring */}

      <div className="mt-6">

        <h3 className="text-lg font-semibold mb-4">
          Zone Monitoring
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

          {zones.map((zone) => (

            <div
              key={zone.name}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5"
            >

              <div className="flex justify-between">

                <span className="font-medium">
                  {zone.name}
                </span>

                <span className="w-2 h-2 bg-green-500 rounded-full" />

              </div>

              <div className="mt-4">

                <p className="text-2xl font-bold">
                  {zone.people}
                </p>

                <p className="text-xs text-slate-500">
                  People detected
                </p>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}

function Alerts() {
  return (
    <div className="p-8">

      <h3 className="text-xl font-bold">
        PPE Alerts
      </h3>

      <p className="text-sm text-slate-400 mt-1 mb-6">
        Active safety violations detected by the AI system
      </p>

      <div className="space-y-4">

        {violations
          .filter((event) => event.status === "Open")
          .map((event, index) => (

            <div
              key={index}
              className="bg-slate-900 border border-red-900/50 rounded-xl p-5 flex justify-between items-center"
            >

              <div className="flex items-center gap-4">

                <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                  ⚠️
                </div>

                <div>

                  <h4 className="font-semibold text-red-400">
                    {event.violation}
                  </h4>

                  <p className="text-sm text-slate-400 mt-1">
                    {event.zone} • {event.time}
                  </p>

                </div>

              </div>

              <span className="text-xs bg-red-500/10 text-red-400 px-3 py-1 rounded-full">
                OPEN
              </span>

            </div>

          ))}

      </div>

    </div>
  );
}

function Events() {
  return (
    <div className="p-8">

      <h3 className="text-xl font-bold">
        Detection Events
      </h3>

      <p className="text-sm text-slate-400 mt-1 mb-6">
        Complete history of AI detection events
      </p>

      <RecentEvents />

    </div>
  );
}

function Settings() {
  return (
    <div className="p-8">

      <h3 className="text-xl font-bold">
        System Settings
      </h3>

      <p className="text-sm text-slate-400 mt-1 mb-6">
        Configure camera and AI detection settings
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

          <h4 className="font-semibold mb-5">
            Camera Configuration
          </h4>

          <div className="space-y-4">

            <div>

              <label className="text-sm text-slate-400">
                Camera Name
              </label>

              <input
                type="text"
                value="Camera 01"
                readOnly
                className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm"
              />

            </div>

            <div>

              <label className="text-sm text-slate-400">
                Stream Status
              </label>

              <div className="mt-2 bg-slate-800 rounded-lg px-4 py-3 text-sm text-green-400">
                Connected
              </div>

            </div>

          </div>

        </div>


        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

          <h4 className="font-semibold mb-5">
            AI Detection
          </h4>

          <div className="space-y-4">

            <div>

              <label className="text-sm text-slate-400">
                Model
              </label>

              <div className="mt-2 bg-slate-800 rounded-lg px-4 py-3 text-sm">
                YOLO11n
              </div>

            </div>

            <div>

              <label className="text-sm text-slate-400">
                Confidence Threshold
              </label>

              <input
                type="range"
                min="0"
                max="100"
                defaultValue="50"
                className="w-full mt-4"
              />

            </div>

          </div>

        </div>

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

      case "Events":
        return <Events />;

      case "Settings":
        return <Settings />;

      default:
        return <Dashboard />;

    }

  };

  return (

    <div className="min-h-screen bg-slate-950 text-white flex">

      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <main className="flex-1 overflow-auto">

        <Header activePage={activePage} />

        {renderPage()}

      </main>

    </div>

  );
}

export default App;
