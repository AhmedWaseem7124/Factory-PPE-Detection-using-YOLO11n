import React from "react";

const colorStyles = {
  emerald: {
    text: "text-emerald-400",
    border: "hover:border-emerald-500/50",
    glow: "bg-emerald-500/10",
    badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  },
  red: {
    text: "text-red-400",
    border: "hover:border-red-500/50",
    glow: "bg-red-500/10",
    badge: "text-red-400 bg-red-500/10 border-red-500/30",
  },
  amber: {
    text: "text-amber-400",
    border: "hover:border-amber-500/50",
    glow: "bg-amber-500/10",
    badge: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  },
  blue: {
    text: "text-blue-400",
    border: "hover:border-blue-500/50",
    glow: "bg-blue-500/10",
    badge: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  },
  purple: {
    text: "text-purple-400",
    border: "hover:border-purple-500/50",
    glow: "bg-purple-500/10",
    badge: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  },
  yellow: {
    text: "text-yellow-400",
    border: "hover:border-yellow-500/50",
    glow: "bg-yellow-500/10",
    badge: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  },
};

function KPIStat({ title, value, subtitle, color = "blue", icon, trend }) {
  const theme = colorStyles[color] || colorStyles.blue;

  return (
    <div
      className={`relative bg-slate-900 border border-slate-800/80 rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 shadow-xl overflow-hidden group ${theme.border}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <h2 className={`text-4xl font-extrabold mt-3 tracking-tight ${theme.text}`}>
            {value}
          </h2>
        </div>
        {icon && (
          <div className={`p-3 rounded-xl border ${theme.badge} transition-transform duration-300 group-hover:scale-110`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">{subtitle}</p>
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${theme.badge}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

export default React.memo(KPIStat);
