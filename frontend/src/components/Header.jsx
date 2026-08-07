import { useEffect, useState } from "react";
import { API_BASE_URL, authFetch } from "../config/api";
import { LogOut, Key, ChevronDown, Clock, Shield, User as UserIcon, X, CheckCircle2, AlertTriangle } from "lucide-react";

export default function Header({ activePage, currentUser, onLogout }) {
  const [time, setTime] = useState(new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passData, setPassData] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentDate = time.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const currentTime = time.toLocaleTimeString("en-US");

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case "Admin":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "HSE Officer":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");

    if (passData.new_password !== passData.confirm_password) {
      setPassError("New passwords do not match.");
      return;
    }

    if (passData.new_password.length < 6) {
      setPassError("New password must be at least 6 characters.");
      return;
    }

    try {
      const response = await authFetch(`${API_BASE_URL}/api/me/password`, {
        method: "PUT",
        body: JSON.stringify({
          current_password: passData.current_password,
          new_password: passData.new_password,
          confirm_password: passData.confirm_password,
        }),
      });


      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to change password");
      }

      setPassSuccess("Password updated successfully.");
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPassData({ current_password: "", new_password: "", confirm_password: "" });
        setPassSuccess("");
      }, 1500);
    } catch (err) {
      setPassError(err.message);
    }
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800">
      <div className="h-24 px-8 flex items-center justify-between">
        {/* Left */}
        <div>
          <h1 className="text-3xl font-bold tracking-wide text-white">{activePage}</h1>
          <p className="text-sm text-slate-400 mt-1">Factory PPE Monitoring System</p>
        </div>

        {/* Right */}
        <div className="flex items-center gap-6">
          {/* Date */}
          <div className="hidden lg:block rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 min-w-[200px]">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">DATE</div>
            <div className="font-semibold text-sm text-white mt-0.5">{currentDate}</div>
          </div>

          {/* Time */}
          <div className="hidden sm:block rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 min-w-[130px]">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TIME</div>
            <div className="text-base font-bold text-amber-400 mt-0.5">{currentTime}</div>
          </div>

          {/* USER PROFILE DROPDOWN */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl px-4 py-2 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold flex items-center justify-center text-sm shadow-inner">
                  {currentUser.full_name ? currentUser.full_name.substring(0, 2).toUpperCase() : "U"}
                </div>

                <div className="text-left hidden md:block">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    {currentUser.full_name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getRoleBadgeStyle(currentUser.role)}`}>
                      {currentUser.role}
                    </span>
                  </div>
                </div>

                <ChevronDown size={16} className={`text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* DROPDOWN MENU */}
              {menuOpen && (
                <div
                  onMouseLeave={() => setMenuOpen(false)}
                  className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="pb-3 border-b border-slate-800 mb-3">
                    <p className="text-xs font-bold text-white">{currentUser.full_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{currentUser.email}</p>
                    <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                      <Clock size={12} /> Last Login: {currentUser.last_login || "Current Session"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setIsPasswordModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition"
                    >
                      <Key size={15} className="text-amber-400" />
                      <span>Change Password</span>
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-xl transition"
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CHANGE PASSWORD MODAL */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Key size={20} className="text-amber-400" /> Change Password
              </h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {passError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>{passSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={passData.current_password}
                  onChange={(e) => setPassData({ ...passData, current_password: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passData.new_password}
                  onChange={(e) => setPassData({ ...passData, new_password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={passData.confirm_password}
                  onChange={(e) => setPassData({ ...passData, confirm_password: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
