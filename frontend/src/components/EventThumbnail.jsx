import React, { useState } from "react";
import { ImageOff, Video } from "lucide-react";
import { getSnapshotUrl } from "../config/api";

function EventThumbnail({ snapshotPath, hasVideo = false, onClick, className = "" }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const imageUrl = snapshotPath ? getSnapshotUrl(snapshotPath) : null;

  if (!imageUrl || error) {
    return (
      <div
        onClick={onClick}
        className={`w-20 h-16 sm:w-24 sm:h-20 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-slate-500 transition-all ${className}`}
        title="No snapshot available"
      >
        <ImageOff size={20} className="text-slate-500" />
        <span className="text-[10px] text-slate-500 mt-1 font-medium">No Image</span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative w-20 h-16 sm:w-24 sm:h-20 rounded-xl overflow-hidden border border-slate-700/80 cursor-pointer group hover:border-amber-500/80 transition-all duration-300 shadow-md ${className}`}
    >
      {loading && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-slate-600 border-t-amber-500 rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={imageUrl}
        alt="Violation Snapshot"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${
          loading ? "opacity-0" : "opacity-100"
        }`}
      />
      {hasVideo && (
        <div className="absolute top-1 right-1 p-1 rounded-md bg-amber-500/90 text-slate-950 shadow-md flex items-center justify-center" title="Evidence Video Clip Available">
          <Video size={10} strokeWidth={3} />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
        <span className="text-[9px] text-amber-300 font-semibold truncate">View Evidence</span>
      </div>
    </div>
  );
}

export default React.memo(EventThumbnail);
