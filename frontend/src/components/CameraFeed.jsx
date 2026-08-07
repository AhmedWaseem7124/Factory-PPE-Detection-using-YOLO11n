import React from "react";
import { API_BASE_URL } from "../config/api";

export default function CameraFeed() {
  return (
    <div className="relative bg-black aspect-video overflow-hidden">
      {/* Live Stream */}
      <img
        src={`${API_BASE_URL}/video_feed`}
        alt="Factory CCTV"
        className="w-full h-full object-contain"
      />

      {/* Dark Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none"></div>

      {/* LIVE Badge */}
      <div className="absolute top-5 left-5">
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur px-4 py-2 rounded-xl border border-slate-800">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
          <span className="font-semibold text-xs text-white tracking-wide">LIVE</span>
        </div>
      </div>

      {/* Camera Name */}
      <div className="absolute bottom-5 left-5">
        <div className="bg-black/70 backdrop-blur rounded-xl px-4 py-3 border border-slate-800">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Camera</p>
          <p className="font-semibold text-xs text-white">Shed-B Repair Stand</p>
        </div>
      </div>
    </div>
  );
}
