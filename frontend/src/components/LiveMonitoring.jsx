import React, { useEffect, useState } from "react";
import CameraFeed from "./CameraFeed";
import ZoneStatus from "./ZoneStatus";
import { API_BASE_URL, authFetch } from "../config/api";
import { Camera, Cpu, Activity, ShieldCheck, ShieldAlert, Users, HardHat } from "lucide-react";

export default function LiveMonitoring() {
  const [stats, setStats] = useState({
    persons: 0,
    helmets: 0,
    violations: 0,
    compliance_rate: 0,
  });

  const [cameraStatus, setCameraStatus] = useState({
    connected: false,
    confidence: 0.3,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, camRes] = await Promise.all([
          authFetch(`${API_BASE_URL}/detection/stats`),
          authFetch(`${API_BASE_URL}/camera/status`),
        ]);


        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (camRes.ok) {
          const camData = await camRes.json();
          setCameraStatus(camData);
        }
      } catch (err) {
        console.error("Failed to fetch live monitoring data:", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Camera className="text-emerald-400" size={28} />
            Live AI Safety & CCTV Monitoring
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Real-time computer vision inference stream and spatial zone compliance
          </p>
        </div>

        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 rounded-xl shadow-lg">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
          <span className="text-emerald-400 font-bold text-xs tracking-wider">
            AI STREAM ACTIVE • 30 FPS
          </span>
        </div>
      </div>

      {/* Main Monitoring Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Camera Feed Stream Card */}
        <div className="xl:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/90">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <div>
                <h2 className="font-bold text-base text-white flex items-center gap-2">
                  CCTV CAMERA 01 — MAIN FACTORY FLOOR
                </h2>
                <p className="text-xs text-slate-400">RTSP Stream Protocol • ByteTrack Multi-Object Tracking</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                Res: 704x576
              </span>
              <span className={`px-2.5 py-1 rounded-lg border ${cameraStatus.connected ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}`}>
                {cameraStatus.connected ? "CONNECTED" : "STREAMING"}
              </span>
            </div>
          </div>

          <div className="flex-1 bg-black relative">
            <CameraFeed />
          </div>
        </div>

        {/* Live Metrics & AI Info Panel */}
        <div className="space-y-6 flex flex-col">
          {/* Detection Live Counters */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="font-bold text-base text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Activity size={18} className="text-amber-400" />
              Live Detection Metrics
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-2.5 text-slate-300 text-xs font-medium">
                  <Users size={16} className="text-blue-400" /> Workers Tracked
                </div>
                <span className="font-extrabold text-blue-400 text-lg">{stats.persons}</span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-2.5 text-slate-300 text-xs font-medium">
                  <HardHat size={16} className="text-emerald-400" /> Helmet Compliant
                </div>
                <span className="font-extrabold text-emerald-400 text-lg">{stats.helmets}</span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-2.5 text-slate-300 text-xs font-medium">
                  <ShieldAlert size={16} className="text-red-400" /> Active Violations
                </div>
                <span className="font-extrabold text-red-400 text-lg">{stats.violations}</span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-2.5 text-slate-300 text-xs font-medium">
                  <ShieldCheck size={16} className="text-yellow-400" /> Site Compliance
                </div>
                <span className="font-extrabold text-yellow-400 text-lg">{stats.compliance_rate}%</span>
              </div>
            </div>
          </div>

          {/* AI Model Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="font-bold text-base text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Cpu size={18} className="text-purple-400" />
              AI Model Specifications
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Architecture</span>
                <span className="font-semibold text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">YOLO11n Neural Net</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Conf. Threshold</span>
                <span className="font-semibold text-slate-200">
                  {Math.round((cameraStatus.confidence || 0.3) * 100)}%
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">CPU Inference Time</span>
                <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">~31 ms / frame</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Tracker Algorithm</span>
                <span className="font-semibold text-slate-200">ByteTrack Custom</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zone Monitoring Grid */}
      <div>
        <h2 className="text-xl font-bold text-white mb-5 tracking-tight">Spatial Zone Status</h2>
        <ZoneStatus />
      </div>
    </div>
  );
}
