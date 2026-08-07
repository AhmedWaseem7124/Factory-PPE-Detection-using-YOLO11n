import React, { useEffect, useState, useRef } from "react";
import { ShieldAlert, X } from "lucide-react";
import { API_BASE_URL, authFetch } from "../config/api";

export default function NotificationToast() {
  const [toasts, setToasts] = useState([]);
  const seenEventIdsRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    const checkNewEvents = async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/events`);
        if (!response.ok) return;


        const events = await response.json();
        const currentSeen = seenEventIdsRef.current;

        if (isInitialLoadRef.current) {
          // On first load, record all existing event IDs so we don't trigger toasts for historical events
          events.forEach((ev) => {
            if (ev.id) currentSeen.add(ev.id);
          });
          isInitialLoadRef.current = false;
          return;
        }

        // Find newly created events
        const newEvents = events.filter((ev) => ev.id && !currentSeen.has(ev.id));

        if (newEvents.length > 0) {
          newEvents.forEach((ev) => {
            currentSeen.add(ev.id);

            const toastId = `${ev.id}_${Date.now()}`;
            const timeStr = ev.start_time
              ? ev.start_time.split(" ")[1] || ev.start_time
              : new Date().toLocaleTimeString();

            const toastItem = {
              id: toastId,
              trackId: ev.track_id ?? "N/A",
              zone: ev.zone || "Unknown Zone",
              eventType: ev.event_type || "Helmet Missing",
              time: timeStr,
            };

            setToasts((prev) => [toastItem, ...prev]);

            // Auto-dismiss toast after 5 seconds
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== toastId));
            }, 5000);
          });
        }
      } catch (err) {
        console.error("Failed to check for new incident toasts:", err);
      }
    };

    checkNewEvents();
    const interval = setInterval(checkNewEvents, 2000);
    return () => clearInterval(interval);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-red-500/40 rounded-2xl p-4 shadow-2xl flex items-start gap-3 animate-slideInRight transition-all duration-300"
        >
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
            <ShieldAlert size={22} className="animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-sm text-red-400 truncate">
                🚨 {toast.eventType}
              </h4>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {toast.time}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-1">
              Track <span className="font-bold text-amber-300">#{toast.trackId}</span> • Zone <span className="font-semibold text-slate-200">{toast.zone}</span>
            </p>
          </div>

          <button
            onClick={() => dismissToast(toast.id)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
