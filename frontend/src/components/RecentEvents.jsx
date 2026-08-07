import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Search, Eye, Filter, ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw, Calendar, MapPin, ShieldAlert } from "lucide-react";
import { API_BASE_URL, authFetch } from "../config/api";
import StatusBadge from "./StatusBadge";
import EventThumbnail from "./EventThumbnail";
import EvidenceModal from "./EvidenceModal";
import ExportButtons from "./ExportButtons";

export default function RecentEvents({ isDashboard = false, onNavigateToEvents }) {
  const [events, setEvents] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [analytics, setAnalytics] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // Sort state
  const [sortField, setSortField] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchEvents = useCallback(async () => {
    try {
      if (isDashboard) {
        // Dashboard mode: Fetch 50 most recent events only
        const [eventsRes, analyticsRes] = await Promise.all([
          authFetch(`${API_BASE_URL}/events`),
          authFetch(`${API_BASE_URL}/analytics`),
        ]);

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          // Cap at 50 most recent events
          const cappedEvents = eventsData.slice(0, 50);
          setEvents(cappedEvents);
          setTotalCount(cappedEvents.length);
          setTotalPages(Math.ceil(cappedEvents.length / itemsPerPage) || 1);
        }
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
        }
      } else {
        // Dedicated Events Page mode: Server-side SQL pagination across ALL database records
        const queryParams = new URLSearchParams({
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm,
          zone: selectedZone,
          event_type: selectedType,
          status: selectedStatus,
          date: selectedDate,
          sort_field: sortField,
          sort_order: sortOrder,
        });

        const [pagedRes, analyticsRes] = await Promise.all([
          authFetch(`${API_BASE_URL}/api/events/paged?${queryParams.toString()}`),
          authFetch(`${API_BASE_URL}/analytics`),
        ]);


        if (pagedRes.ok) {
          const pagedData = await pagedRes.json();
          setEvents(pagedData.events || []);
          setTotalCount(pagedData.total || 0);
          setTotalPages(pagedData.total_pages || 1);
        }
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData);
        }
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  }, [isDashboard, currentPage, itemsPerPage, searchTerm, selectedZone, selectedType, selectedStatus, selectedDate, sortField, sortOrder]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 2000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Format Duration display string
  const formatDurationDisplay = (seconds, isCompleted = false) => {
    let sec = parseInt(seconds, 10) || 0;
    if (isCompleted && sec <= 0) sec = 1;
    if (sec <= 0) return "0 sec";
    if (sec < 60) return `${sec} sec`;
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return rem > 0 ? `${mins} min ${rem} sec` : `${mins} min`;
  };

  // Local filtering & sorting for Dashboard Mode
  const displayedEvents = useMemo(() => {
    if (!isDashboard) {
      // In server-side mode, API returns exact page slice
      return events;
    }

    // Dashboard mode: filter & sort in memory over the 50 capped items
    const filtered = events.filter((event) => {
      const search = searchTerm.toLowerCase().trim();
      const trackIdStr = `#${event.track_id ?? ""}`.toLowerCase();

      const searchMatch =
        !search ||
        (event.zone && event.zone.toLowerCase().includes(search)) ||
        (event.event_type && event.event_type.toLowerCase().includes(search)) ||
        trackIdStr.includes(search) ||
        (event.timestamp && event.timestamp.toLowerCase().includes(search));

      const zoneMatch = !selectedZone || event.zone === selectedZone;
      const typeMatch = !selectedType || event.event_type === selectedType;
      const statusMatch = !selectedStatus || event.status === selectedStatus;
      const dateMatch =
        !selectedDate ||
        (event.start_time && event.start_time.startsWith(selectedDate)) ||
        (event.timestamp && event.timestamp.startsWith(selectedDate));

      return searchMatch && zoneMatch && typeMatch && statusMatch && dateMatch;
    });

    return [...filtered].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === "duration" || sortField === "track_id") {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = String(valA || "");
        valB = String(valB || "");
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [isDashboard, events, searchTerm, selectedZone, selectedType, selectedStatus, selectedDate, sortField, sortOrder]);

  const dashboardPaginatedEvents = useMemo(() => {
    if (!isDashboard) return displayedEvents;
    const start = (currentPage - 1) * itemsPerPage;
    return displayedEvents.slice(start, start + itemsPerPage);
  }, [isDashboard, displayedEvents, currentPage, itemsPerPage]);

  const handleSortToggle = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const uniqueZones = ["Red Zone", "Blue Zone", "Green Zone", "Yellow Zone"];
  const uniqueTypes = ["Helmet Missing", "Vest Missing", "Forbidden Zone"];

  const startEntry = totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endEntry = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <div className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300">
      {/* Table Header & Controls */}
      <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert size={22} className="text-red-400" />
            {isDashboard ? "Dashboard Recent Events (Top 50)" : "Complete Safety Events Audit Log"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isDashboard
              ? "Showing the 50 most recent incidents logged by AI detection system"
              : `Full database audit log containing ${totalCount.toLocaleString()} total events`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isDashboard && onNavigateToEvents && (
            <button
              onClick={onNavigateToEvents}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition flex items-center gap-1.5"
            >
              View All →
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-300">
              {isDashboard ? "TOP 50 RECENT" : "DATABASE FULL AUDIT"}
            </span>
          </div>

          <ExportButtons events={displayedEvents} analytics={analytics} />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search Track ID (#101), Zone, Violation..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/80 transition-all"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Zone Filter */}
          <div className="relative">
            <select
              value={selectedZone}
              onChange={(e) => {
                setSelectedZone(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-slate-700"
            >
              <option value="">All Zones</option>
              {uniqueZones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type Filter */}
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-slate-700"
            >
              <option value="">All Violation Types</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Completed">Resolved</option>
            </select>
          </div>

          {/* Date Filter */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-slate-700"
          />

          {(searchTerm || selectedZone || selectedType || selectedStatus || selectedDate) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedZone("");
                setSelectedType("");
                setSelectedStatus("");
                setSelectedDate("");
                setCurrentPage(1);
              }}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 underline px-2"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {(searchTerm || selectedZone || selectedType || selectedStatus || selectedDate) && (
        <div className="px-6 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Filter size={12} className="text-amber-400" /> Active Filters:
          </span>
          {searchTerm && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium">
              Search: "{searchTerm}"
              <button onClick={() => setSearchTerm("")} className="hover:text-white font-bold ml-1">×</button>
            </span>
          )}
          {selectedZone && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 font-medium">
              Zone: {selectedZone}
              <button onClick={() => setSelectedZone("")} className="hover:text-white font-bold ml-1">×</button>
            </span>
          )}
          {selectedType && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 font-medium">
              Type: {selectedType}
              <button onClick={() => setSelectedType("")} className="hover:text-white font-bold ml-1">×</button>
            </span>
          )}
          {selectedStatus && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium">
              Status: {selectedStatus}
              <button onClick={() => setSelectedStatus("")} className="hover:text-white font-bold ml-1">×</button>
            </span>
          )}
          {selectedDate && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 font-medium">
              Date: {selectedDate}
              <button onClick={() => setSelectedDate("")} className="hover:text-white font-bold ml-1">×</button>
            </span>
          )}
        </div>
      )}

      {/* Main Table Layout */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          {/* Sticky Header */}
          <thead className="sticky top-0 bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-800 z-10 shadow-sm">
            <tr>
              <th className="py-3.5 px-6 w-28">Snapshot</th>
              <th className="py-3.5 px-6 cursor-pointer hover:text-white transition w-44" onClick={() => handleSortToggle("timestamp")}>
                <div className="flex items-center gap-1.5">
                  <span>Date & Time</span>
                  <ArrowUpDown size={12} className={sortField === "timestamp" ? "text-amber-400" : "text-slate-600"} />
                </div>
              </th>
              <th className="py-3.5 px-6 w-32">Zone</th>
              <th className="py-3.5 px-6 w-44">Violation Type</th>
              <th className="py-3.5 px-6 cursor-pointer hover:text-white transition w-28" onClick={() => handleSortToggle("track_id")}>
                <div className="flex items-center gap-1.5">
                  <span>Track ID</span>
                  <ArrowUpDown size={12} className={sortField === "track_id" ? "text-amber-400" : "text-slate-600"} />
                </div>
              </th>
              <th className="py-3.5 px-6 cursor-pointer hover:text-white transition w-32" onClick={() => handleSortToggle("duration")}>
                <div className="flex items-center gap-1.5">
                  <span>Duration</span>
                  <ArrowUpDown size={12} className={sortField === "duration" ? "text-amber-400" : "text-slate-600"} />
                </div>
              </th>
              <th className="py-3.5 px-6 w-32">Status</th>
              <th className="py-3.5 px-6 text-right w-24">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-3 border-slate-700 border-t-amber-500 rounded-full animate-spin"></div>
                    <span className="text-xs font-semibold">Loading Safety Events & Audit Log...</span>
                  </div>
                </td>
              </tr>
            ) : dashboardPaginatedEvents.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <ShieldAlert size={38} className="text-slate-700" />
                    <p className="text-sm font-semibold text-slate-400">No Incidents Found</p>
                    <p className="text-xs text-slate-600">No matching safety violation records found for your search criteria.</p>
                  </div>
                </td>
              </tr>
            ) : (
              dashboardPaginatedEvents.map((event, idx) => {
                const isCompleted = event.status === "Completed" || event.resolved === 1;

                return (
                  <tr
                    key={event.id || idx}
                    className="group hover:bg-slate-800/40 transition-colors duration-200"
                  >
                    {/* Snapshot Thumbnail */}
                    <td className="py-3 px-6">
                      <EventThumbnail
                        snapshotPath={event.snapshot_path}
                        hasVideo={Boolean(event.video_path)}
                        onClick={() => setSelectedEvent(event)}
                      />
                    </td>

                    {/* Date & Time */}
                    <td className="py-3 px-6 font-medium text-slate-200">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-100">
                          {event.start_time || event.timestamp || "N/A"}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Ended: {isCompleted ? (event.end_time && event.end_time !== "Ongoing" ? event.end_time : (event.start_time || event.timestamp)) : "Ongoing"}
                        </p>
                      </div>
                    </td>

                    {/* Zone */}
                    <td className="py-3 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300 font-medium">
                        <MapPin size={12} className="text-amber-400" />
                        {event.zone || "Unknown"}
                      </span>
                    </td>

                    {/* Violation Type */}
                    <td className="py-3 px-6">
                      <span className="font-bold text-red-400 tracking-wide">
                        {event.event_type || "Helmet Missing"}
                      </span>
                    </td>

                    {/* Track ID */}
                    <td className="py-3 px-6">
                      <span className="font-semibold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        #{event.track_id ?? "N/A"}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-6">
                      <span className="font-semibold text-amber-300">
                        {formatDurationDisplay(event.duration, isCompleted)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-6">
                      <StatusBadge status={event.status} resolved={event.resolved} />
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-6 text-right">
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold text-xs text-white transition-all flex items-center gap-1.5 ml-auto shadow-sm group-hover:border-amber-500/50"
                      >
                        <Eye size={14} className="text-amber-400" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex justify-between items-center text-xs text-slate-400">
        <div>
          Showing {startEntry}–{endEntry} of {totalCount.toLocaleString()} entries
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800 transition"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-semibold text-slate-200 px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800 transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Evidence Viewer Modal with Prev/Next Navigation */}
      {selectedEvent && (
        <EvidenceModal
          event={selectedEvent}
          eventsList={dashboardPaginatedEvents}
          onSelectEvent={setSelectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
