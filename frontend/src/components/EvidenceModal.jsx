import React, { useState, useEffect, useCallback } from "react";
import { X, Download, ShieldAlert, Clock, MapPin, User, Gauge, ZoomIn, ImageOff, ChevronLeft, ChevronRight, Video, Image as ImageIcon, VideoOff } from "lucide-react";
import { getSnapshotUrl, getVideoUrl } from "../config/api";
import StatusBadge from "./StatusBadge";

export default function EvidenceModal({ event, eventsList = [], onSelectEvent, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeTab, setActiveTab] = useState("video"); // "video" | "snapshot"
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  // Find index in current events list
  const currentIndex = eventsList.findIndex((e) => (e.id && event.id ? e.id === event.id : e === event));
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < eventsList.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && onSelectEvent) {
      setLoading(true);
      setError(false);
      setVideoLoading(true);
      setVideoError(false);
      setIsZoomed(false);
      onSelectEvent(eventsList[currentIndex - 1]);
    }
  }, [hasPrev, onSelectEvent, eventsList, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext && onSelectEvent) {
      setLoading(true);
      setError(false);
      setVideoLoading(true);
      setVideoError(false);
      setIsZoomed(false);
      onSelectEvent(eventsList[currentIndex + 1]);
    }
  }, [hasNext, onSelectEvent, eventsList, currentIndex]);

  // Default tab selection based on video availability
  useEffect(() => {
    setVideoLoading(true);
    setVideoError(false);
    if (event && event.video_path) {
      setActiveTab("video");
    } else {
      setActiveTab("snapshot");
    }
  }, [event]);

  // Keyboard navigation & ESC support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handlePrev, handleNext]);

  if (!event) return null;

  const imageUrl = event.snapshot_path ? getSnapshotUrl(event.snapshot_path) : null;
  const videoUrl = event.video_path ? getVideoUrl(event.video_path) : null;

  const handleDownloadImage = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incident_track_${event.track_id || "unknown"}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download snapshot image:", err);
    }
  };

  const handleDownloadVideo = async () => {
    if (!videoUrl) return;
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incident_track_${event.track_id || "unknown"}_${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download evidence video:", err);
    }
  };

  const formatDurationText = (seconds, isCompleted = false) => {
    let sec = parseInt(seconds, 10) || 0;
    if (isCompleted && sec <= 0) sec = 1;
    if (sec <= 0) return "0 sec";
    if (sec < 60) return `${sec} sec`;
    const mins = Math.floor(sec / 60);
    const remSec = sec % 60;
    return remSec > 0 ? `${mins} min ${remSec} sec` : `${mins} min`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md transition-opacity duration-300 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-transform duration-300 transform scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <ShieldAlert size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Incident Evidence Viewer
                </h2>
                {eventsList.length > 0 && currentIndex >= 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    {currentIndex + 1} of {eventsList.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Official Safety Violation Audit Record
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Prev / Next Navigation Buttons */}
            {eventsList.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700 mr-2">
                <button
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  title="Previous Incident (Left Arrow)"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={handleNext}
                  disabled={!hasNext}
                  title="Next Incident (Right Arrow)"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close (ESC)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB NAVIGATION BAR */}
          <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              {event.video_path ? (
                <button
                  onClick={() => setActiveTab("video")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === "video"
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Video size={16} />
                  <span>Evidence Video Clip (MP4)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </button>
              ) : (
                <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <Clock size={13} className="text-amber-500/80" />
                  <span>Video expired (retention policy: 30 days)</span>
                </div>
              )}

              <button
                onClick={() => setActiveTab("snapshot")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === "snapshot"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <ImageIcon size={16} />
                <span>Snapshot Image (JPG)</span>
              </button>
            </div>

            <div className="text-[11px] font-medium text-slate-400 px-3 hidden sm:block">
              {activeTab === "video" && event.video_path ? "Rolling Buffer (~6s Clip)" : "High-Res Freeze Frame"}
            </div>
          </div>

          {/* MEDIA DISPLAY CONTAINER */}
          <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group">
            {activeTab === "video" ? (
              videoUrl && !videoError ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  {videoLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-400 gap-2 z-10">
                      <div className="w-8 h-8 border-3 border-slate-700 border-t-amber-500 rounded-full animate-spin"></div>
                      <span className="text-xs font-medium">Loading Evidence Video Clip...</span>
                    </div>
                  )}
                  <video
                    key={videoUrl}
                    src={videoUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    onLoadedData={() => setVideoLoading(false)}
                    onCanPlay={() => setVideoLoading(false)}
                    onCanPlayThrough={() => setVideoLoading(false)}
                    onError={(e) => {
                      const mediaErr = e.target?.error;
                      if (mediaErr) {
                        console.error("[HTML5 VIDEO ERROR]", "Code:", mediaErr.code, "Message:", mediaErr.message);
                      } else {
                        console.error("[HTML5 VIDEO ERROR]", e);
                      }
                      setVideoLoading(false);
                      setVideoError(true);
                    }}
                    className="w-full h-full object-contain rounded-2xl bg-black"
                  >
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support HTML5 Video element.
                  </video>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 gap-3 p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400/60">
                    <VideoOff size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-300">
                      {!event.video_path
                        ? "Video expired (retention policy: 30 days)"
                        : videoError
                        ? "Browser Video Playback Error"
                        : "No evidence video available."}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      {!event.video_path
                        ? "The MP4 clip for this incident was automatically purged after 30 days per company audit policy. Snapshot evidence remains permanently preserved."
                        : videoError
                        ? "The evidence video file could not be rendered by the browser."
                        : "Video evidence recording was not captured for this incident."}
                    </p>
                  </div>
                  {imageUrl && (
                    <button
                      onClick={() => setActiveTab("snapshot")}
                      className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <ImageIcon size={14} /> View Snapshot Image
                    </button>
                  )}
                </div>
              )
            ) : imageUrl && !error ? (
              <>
                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-2 z-10">
                    <div className="w-8 h-8 border-3 border-slate-700 border-t-amber-500 rounded-full animate-spin"></div>
                    <span className="text-xs font-medium">Loading High-Res Evidence Image...</span>
                  </div>
                )}
                <img
                  src={imageUrl}
                  alt="Incident Snapshot"
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setError(true);
                  }}
                  className={`w-full h-full object-contain transition-all duration-300 ${
                    isZoomed ? "scale-150 cursor-zoom-out" : "scale-100 cursor-zoom-in"
                  } ${loading ? "opacity-0" : "opacity-100"}`}
                  onClick={() => setIsZoomed(!isZoomed)}
                />
                <button
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-slate-900/80 backdrop-blur-md text-white border border-slate-700 hover:bg-slate-800 transition text-xs font-medium flex items-center gap-1.5 shadow-lg"
                >
                  <ZoomIn size={15} />
                  {isZoomed ? "Reset Zoom" : "Click Image to Zoom"}
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
                <ImageOff size={48} className="text-slate-600" />
                <p className="text-sm font-semibold text-slate-400">Snapshot Image Unavailable</p>
                <p className="text-xs text-slate-600">The snapshot file could not be retrieved from backend.</p>
              </div>
            )}
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <User size={13} className="text-blue-400" /> Track ID
              </span>
              <p className="text-lg font-bold text-slate-100">#{event.track_id ?? "N/A"}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <ShieldAlert size={13} className="text-red-400" /> Violation
              </span>
              <p className="text-base font-bold text-red-400 truncate">
                {event.event_type || "Helmet Missing"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin size={13} className="text-amber-400" /> Zone
              </span>
              <p className="text-base font-bold text-slate-200">{event.zone || "Unknown Zone"}</p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Gauge size={13} className="text-emerald-400" /> Status
              </span>
              <div>
                <StatusBadge status={event.status} resolved={event.resolved} />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={13} className="text-indigo-400" /> Start Time
              </span>
              <p className="text-xs font-semibold text-slate-300">
                {event.start_time || event.timestamp || "N/A"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={13} className="text-purple-400" /> End Time
              </span>
              <p className="text-xs font-semibold text-slate-300">
                {event.resolved === 1 || event.status === "Completed"
                  ? (event.end_time && event.end_time !== "Ongoing" ? event.end_time : (event.start_time || event.timestamp))
                  : "Ongoing"}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={13} className="text-yellow-400" /> Duration
              </span>
              <p className="text-sm font-bold text-amber-300">
                {formatDurationText(event.duration, event.resolved === 1 || event.status === "Completed")}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Gauge size={13} className="text-teal-400" /> AI Confidence
              </span>
              <p className="text-sm font-bold text-teal-300">
                {event.confidence ? `${Math.round(event.confidence * 100)}%` : "100%"}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center">
          <div className="text-xs text-slate-500 hidden sm:block">
            Use <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">→</kbd> to navigate, <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">ESC</kbd> to exit
          </div>
          <div className="flex gap-3 ml-auto">
            {videoUrl && activeTab === "video" && (
              <button
                onClick={handleDownloadVideo}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-xs text-slate-950 flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20"
              >
                <Download size={16} />
                Download Video Clip (.MP4)
              </button>
            )}
            {imageUrl && activeTab === "snapshot" && (
              <button
                onClick={handleDownloadImage}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20"
              >
                <Download size={16} />
                Download Snapshot (.JPG)
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-xs text-slate-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
