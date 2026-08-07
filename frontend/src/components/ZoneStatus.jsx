import { useEffect, useState } from "react";
import { API_BASE_URL, authFetch } from "../config/api";
import { Users, ShieldAlert } from "lucide-react";

export default function ZoneStatus() {
  const [zones, setZones] = useState([]);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/api/zone_distribution`);

        if (response.ok) {
          const data = await response.json();
          // Ensure production zones (Red, Blue, Green, Unknown) are always present
          const prodZones = ["Red", "Blue", "Green", "Unknown"];
          const normalized = prodZones.map((pz) => {
            const found = (data || []).find((d) => (d.zone || "").toLowerCase() === pz.toLowerCase());
            return found || { zone: pz, total_workers: 0, violations: 0, violation_pct: 0.0 };
          });
          setZones(normalized);
        }
      } catch (err) {
        console.error("Failed to fetch zone distribution:", err);
      }
    };

    fetchZones();
    const interval = setInterval(fetchZones, 2000);
    return () => clearInterval(interval);
  }, []);

  const getStyle = (zoneName) => {
    const name = (zoneName || "").toLowerCase();
    if (name.includes("red")) {
      return { border: "border-red-500/40", bg: "bg-red-500/10", badge: "bg-red-500/20 text-red-400" };
    }
    if (name.includes("yellow")) {
      return { border: "border-yellow-500/40", bg: "bg-yellow-500/10", badge: "bg-yellow-500/20 text-yellow-400" };
    }
    if (name.includes("green")) {
      return { border: "border-green-500/40", bg: "bg-green-500/10", badge: "bg-green-500/20 text-green-400" };
    }
    if (name.includes("blue")) {
      return { border: "border-blue-500/40", bg: "bg-blue-500/10", badge: "bg-blue-500/20 text-blue-400" };
    }
    return { border: "border-gray-500/40", bg: "bg-gray-500/10", badge: "bg-gray-500/20 text-gray-400" };
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
      {/* Header with Legend */}
      <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/90 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="font-bold text-lg text-white">Zone Worker Distribution vs Violations</h2>
          <p className="text-slate-400 text-xs mt-0.5">Exposure vs logged safety violations per spatial zone</p>
        </div>
        {/* Explicit Legend */}
        <div className="flex items-center gap-3 text-xs bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-500"></span>
            <span className="text-slate-300 font-semibold text-[11px]">Workers</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span>
            <span className="text-red-400 font-bold text-[11px]">Violations</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {zones.length === 0 ? (
          <div className="text-center text-slate-500 py-8 font-medium text-xs">
            No active zone distribution data available
          </div>
        ) : (
          zones.map((zone) => {
            const style = getStyle(zone.zone);
            const totalWorkers = zone.total_workers || 0;
            const violations = zone.violations || 0;
            const violationPct = zone.violation_pct !== undefined ? zone.violation_pct : 0;

            return (
              <div
                key={zone.zone}
                className={`${style.bg} ${style.border} border rounded-2xl p-4 transition-all duration-300 hover:scale-[1.01] space-y-2.5`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-sm text-slate-100">{zone.zone}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${style.badge}`}>
                      {violationPct}% Violation Rate
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-400 flex items-center gap-1 font-semibold">
                      <Users size={13} className="text-slate-500" /> {totalWorkers} Workers
                    </span>
                    <span className="text-red-400 flex items-center gap-1 font-bold">
                      <ShieldAlert size={13} /> {violations} Violations
                    </span>
                  </div>
                </div>

                {/* Worker Distribution vs Violation Dual Overlay Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-800/90 rounded-full h-3.5 p-0.5 relative overflow-hidden flex items-center border border-slate-700/60">
                    {/* Gray Total Workers Bar */}
                    <div
                      className="bg-slate-500/50 h-full rounded-full transition-all duration-500"
                      style={{ width: "100%" }}
                    />
                    {/* Red Violations Overlay */}
                    <div
                      className="bg-red-500 h-full rounded-full absolute left-0 top-0 transition-all duration-500 shadow-sm"
                      style={{
                        width: `${Math.min(violationPct, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>Gray: Total Workers Observed ({totalWorkers})</span>
                    <span>Red: Violation Proportion ({violations})</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
