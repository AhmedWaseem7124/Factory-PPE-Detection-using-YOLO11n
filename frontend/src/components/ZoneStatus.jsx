import { useEffect, useState } from "react";

export default function ZoneStatus() {
  const [zones, setZones] = useState([]);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await fetch("http://10.2.0.177:5000/zones");
        const data = await response.json();
        setZones(data);
      } catch (err) {
        console.error("Failed to fetch zones:", err);
      }
    };

    fetchZones();

    const interval = setInterval(fetchZones, 1000);

    return () => clearInterval(interval);
  }, []);

const getStyle = (zoneName, status) => {
  const name = (zoneName || "").toLowerCase();

  if (name.includes("red")) {
    return {
      color: "bg-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/40",
    };
  }

  if (name.includes("yellow")) {
    return {
      color: "bg-yellow-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/40",
    };
  }

  if (name.includes("green")) {
    return {
      color: "bg-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/40",
    };
  }

  if (name.includes("blue")) {
    return {
      color: "bg-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/40",
    };
  }

  // Unknown / Other
  return {
    color: "bg-gray-500",
    bg: "bg-gray-500/10",
    border: "border-gray-500/40",
  };
};

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

      <div className="px-6 py-5 border-b border-slate-800">
        <h2 className="font-bold text-lg">
          Factory Zones
        </h2>

        <p className="text-slate-400 text-sm mt-1">
          Live monitored safety areas
        </p>
      </div>

      <div className="p-5 space-y-4">

        {zones.length === 0 ? (

          <div className="text-center text-slate-500 py-8">
            No active zones
          </div>

        ) : (

          zones.map((zone) => {

const style = getStyle(zone.name, zone.status);

            return (

              <div
                key={zone.name}
                className={`${style.bg} ${style.border}
                border rounded-xl p-4 transition duration-300 hover:scale-[1.02]`}
              >

                <div className="flex justify-between items-center">

                  <div className="flex items-center gap-3">

                    <div
                      className={`w-4 h-4 rounded-full ${style.color} animate-pulse`}
                    />

                    <div>

                      <h3 className="font-semibold">
                        {zone.name} Zone
                      </h3>

                      <p className="text-xs text-slate-400">
                        {zone.people} workers
                      </p>

                    </div>

                  </div>

                  <div className="text-right">

                    <p className="font-semibold">
                      {zone.status}
                    </p>

                    <p className="text-xs text-slate-500">
                      {zone.violations} violations
                    </p>

                  </div>

                </div>

                <div className="w-full bg-slate-800 rounded-full h-2 mt-4 overflow-hidden">

                  <div
                    className={`${style.color} h-2 rounded-full`}
                    style={{
                      width: `${Math.min(zone.people * 15, 100)}%`,
                    }}
                  />

                </div>

              </div>

            );
          })

        )}

      </div>

    </div>
  );
}
