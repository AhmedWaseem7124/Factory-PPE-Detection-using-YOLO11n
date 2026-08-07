import React from "react";

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
}) {
  const colors = {
    blue: {
      border: "border-blue-500/30",
      bg: "from-blue-500/10 to-cyan-500/5",
      icon: "bg-blue-500/20 text-blue-400",
      glow: "shadow-blue-500/20",
      trend: "text-blue-400",
    },
    green: {
      border: "border-green-500/30",
      bg: "from-green-500/10 to-emerald-500/5",
      icon: "bg-green-500/20 text-green-400",
      glow: "shadow-green-500/20",
      trend: "text-green-400",
    },
    red: {
      border: "border-red-500/30",
      bg: "from-red-500/10 to-orange-500/5",
      icon: "bg-red-500/20 text-red-400",
      glow: "shadow-red-500/20",
      trend: "text-red-400",
    },
    yellow: {
      border: "border-yellow-500/30",
      bg: "from-yellow-500/10 to-amber-500/5",
      icon: "bg-yellow-500/20 text-yellow-400",
      glow: "shadow-yellow-500/20",
      trend: "text-yellow-400",
    },
  };

  const style = colors[color] || colors.blue;

  return (
    <div
      className={`
      relative overflow-hidden
      rounded-2xl
      border ${style.border}
      bg-gradient-to-br ${style.bg}
      backdrop-blur-xl
      p-6
      shadow-xl ${style.glow}
      hover:scale-[1.03]
      hover:-translate-y-1
      transition-all
      duration-300
      group
    `}
    >
      {/* Background Glow */}
      <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/5 blur-2xl group-hover:scale-125 transition duration-500" />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="uppercase tracking-widest text-xs text-slate-400">
            {title}
          </p>

          <h2 className="text-5xl font-extrabold mt-3">
            {value}
          </h2>

          <p className="text-sm text-slate-400 mt-3">
            {subtitle}
          </p>
        </div>

        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${style.icon}`}
        >
          {icon}
        </div>
      </div>

      {/* Bottom */}
      <div className="mt-6 flex justify-between items-center">
        <span className={`font-semibold ${style.trend}`}>
          {trend}
        </span>

        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs text-slate-500">
            LIVE
          </span>
        </div>
      </div>
    </div>
  );
}

export default React.memo(StatCard);
