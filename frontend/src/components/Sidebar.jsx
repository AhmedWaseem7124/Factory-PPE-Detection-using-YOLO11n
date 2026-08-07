import { useState } from "react";
import logo from "../assets/company-logo.png";
import {
  LayoutDashboard,
  Eye,
  BarChart2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Settings as SettingsIcon,
  Users as UsersIcon,
  LogOut
} from "lucide-react";

export default function Sidebar({ activePage, setActivePage, currentUser, onLogout }) {
  const [hovered, setHovered] = useState(false);
  const userRole = currentUser?.role || "Viewer";

  const allNavItems = [
    { name: "Dashboard", icon: <LayoutDashboard size={20} />, roles: ["Admin", "HSE Officer", "Viewer"] },
    { name: "Live Monitoring", icon: <Eye size={20} />, roles: ["Admin", "HSE Officer"] },
    { name: "Analytics", icon: <BarChart2 size={20} />, roles: ["Admin", "HSE Officer", "Viewer"] },
    { name: "Events", icon: <FileSpreadsheet size={20} />, roles: ["Admin", "HSE Officer"] },
    { name: "Alerts", icon: <AlertTriangle size={20} />, roles: ["Admin", "HSE Officer"] },
    { name: "Reports", icon: <FileText size={20} />, roles: ["Admin", "HSE Officer", "Viewer"] },
    { name: "Settings", icon: <SettingsIcon size={20} />, roles: ["Admin"] },
    { name: "Users", icon: <UsersIcon size={20} />, roles: ["Admin"] },
  ];

  const navigation = allNavItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        ${hovered ? "w-72" : "w-24"}
        bg-slate-950
        border-r
        border-slate-800
        flex
        flex-col
        transition-all
        duration-300
        shrink-0
        z-40
      `}
    >
      {/* COMPANY LOGO */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <img
            src={logo}
            alt="Company"
            className="w-12 h-12 rounded-xl bg-white p-2 shrink-0 shadow-md ring-2 ring-amber-500/20"
          />

          {hovered && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-lg text-white whitespace-nowrap">Crescent Steel</h1>
              <p className="text-xs text-slate-400 whitespace-nowrap">AI Safety Platform</p>
            </div>
          )}
        </div>
      </div>

      {/* NAVIGATION ITEMS */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const active = activePage === item.name;

          return (
            <button
              key={item.name}
              onClick={() => setActivePage(item.name)}
              className={`
                w-full
                flex
                items-center
                ${hovered ? "gap-4 px-4" : "justify-center px-0"}
                py-3.5
                rounded-xl
                transition-all
                ${
                  active
                    ? "bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
                }
              `}
            >
              <span className="shrink-0">{item.icon}</span>

              {hovered && (
                <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
                  {item.name}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* SYSTEM STATUS & LOGOUT */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        {hovered && (
          <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-white">System Online</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Role: {userRole}</p>
          </div>
        )}

        <button
          onClick={onLogout}
          className={`
            w-full
            flex
            items-center
            ${hovered ? "gap-4 px-4" : "justify-center px-0"}
            py-3.5
            rounded-xl
            text-red-400
            hover:bg-red-500/10
            hover:text-red-300
            transition-all
            font-medium
          `}
          title="Logout"
        >
          <LogOut size={20} className="shrink-0" />
          {hovered && <span className="text-sm whitespace-nowrap">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
