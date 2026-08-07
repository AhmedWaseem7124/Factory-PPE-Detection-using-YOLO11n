import React, { useEffect, useState } from "react";
import { Eye, ShieldAlert, CheckCircle2, Radio, BellRing } from "lucide-react";
import { API_BASE_URL, authFetch } from "../config/api";
import StatusBadge from "./StatusBadge";
import EvidenceModal from "./EvidenceModal";

const severityStyle = {
  CRITICAL: "bg-red-500/10 border-red-500/40 text-red-400 animate-pulse",
  RESOLVED: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
};

function getRelativeTime(timestampStr) {
  if (!timestampStr) return "Recently";
  try {
    const eventDate = new Date(timestampStr.replace(/-/g, "/"));
    if (isNaN(eventDate.getTime())) return timestampStr;
    const diffSec = Math.floor((new Date() - eventDate) / 1000);

    if (diffSec < 10) return "Just now";
    if (diffSec < 60) return `${diffSec} seconds ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } catch (err) {
    return timestampStr;
  }
}

export default function Alerts() {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [allEventsCount, setAllEventsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const fetchActiveAlerts = async () => {
      try {
        const [activeRes, allRes] = await Promise.all([
          authFetch(`${API_BASE_URL}/api/alerts/active`),
          authFetch(`${API_BASE_URL}/events`),
        ]);


        if (activeRes.ok) {
          const activeData = await activeRes.json();
          setActiveAlerts(activeData);
        }

        if (allRes.ok) {
          const allData = await allRes.json();
          setAllEventsCount(allData.length);
        }
      } catch (err) {
        console.error("Failed to fetch active alerts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveAlerts();
    const interval = setInterval(fetchActiveAlerts, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <BellRing className="text-red-400" size={28} />
          Active Incident Alerts Stream
        </h1>
        <p className="text-slate-400 mt-2 text-sm">
          Live stream of currently active, unresolved safety violations requiring immediate response
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-red-400 text-xs font-bold uppercase tracking-wider">Currently Active Incidents</p>
              <h2 className="text-5xl font-extrabold mt-3 text-red-400 tracking-tight">
                {String(activeAlerts.length).padStart(2, "0")}
              </h2>
            </div>
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping mt-2 mr-2" />
          </div>
          <p className="text-xs text-slate-400 mt-3">Disappears automatically once resolved by worker PPE compliance</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Historical Incidents Logged</p>
          <h2 className="text-5xl font-extrabold mt-3 text-slate-200 tracking-tight">
            {String(allEventsCount).padStart(2, "0")}
          </h2>
          <p className="text-xs text-slate-500 mt-3">Full historical log available under Events page</p>
        </div>
      </div>

      {/* Active Alerts List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/90">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-xl text-white">Active Violation Stream</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse">
              LIVE
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {activeAlerts.length} Active Unresolved Incidents
          </span>
        </div>

        <div className="divide-y divide-slate-800">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-slate-700 border-t-red-500 rounded-full animate-spin"></div>
                <span className="text-xs font-semibold">Loading Active Violations Stream...</span>
              </div>
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={26} />
                </div>
                <p className="text-base font-bold text-slate-300">No Active Safety Incidents</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  All workers are fully PPE compliant. New violations will appear here instantly.
                </p>
              </div>
            </div>
          ) : (
            activeAlerts.map((event) => {
              const relTime = getRelativeTime(event.start_time || event.timestamp);

              return (
                <div
                  key={event.id}
                  className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-800/40 transition duration-200 group"
                >
                  <div className="flex gap-5 items-center">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition">
                      ⚠️
                    </div>

                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg text-slate-100">
                          {event.event_type || "Helmet Missing"}
                        </h3>
                        <span className="text-[11px] font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                          {relTime}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 mt-2 text-xs text-slate-400">
                        <span>📍 Zone: {event.zone || "Unknown Zone"}</span>
                        <span>📷 Camera 01</span>
                        <span>👤 Worker #{event.track_id ?? "N/A"}</span>
                        <span>🕒 Start: {event.start_time || event.timestamp || "N/A"}</span>
                      </div>
                      <div className="mt-1.5 text-xs text-amber-400 font-medium flex items-center gap-1.5">
                        <Radio size={12} className="animate-spin" /> Status: Ongoing (Active Violation)
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-end gap-3 w-full md:w-auto justify-between md:justify-end shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="px-3.5 py-1 rounded-full border text-xs font-bold bg-red-500/10 border-red-500/40 text-red-400 animate-pulse">
                        CRITICAL
                      </span>
                      <StatusBadge status="Active" resolved={0} />
                    </div>

                    <button
                      onClick={() => setSelectedEvent(event)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold text-xs text-white transition-all flex items-center gap-1.5 shadow-sm hover:border-amber-500/50"
                    >
                      <Eye size={14} className="text-amber-400" />
                      View Evidence
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Evidence Viewer Modal */}
      {selectedEvent && (
        <EvidenceModal
          event={selectedEvent}
          eventsList={activeAlerts}
          onSelectEvent={setSelectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
