import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthAPI from "../api/authAPI.jsx";
import toast from "../utils/toast.js";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const res = await AuthAPI.login({
        email,
        password,
      });

      const accessToken = res.data?.data?.accessToken;
      const userRole = res.data?.data?.role;

      if (res.data.success && accessToken) {
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("userEmail", email);
        if (userRole) {
          localStorage.setItem("userRole", userRole);
        }
        
        // Chỉ cho phép ADMIN login vào admin panel
        if (userRole === "ADMIN") {
          navigate("/admin/dashboard");
        } else {
          toast.error("Access denied! Admin accounts only.");
          // Chỉ xóa token, không xóa user data
          localStorage.removeItem("accessToken");
          localStorage.removeItem("userEmail");
          localStorage.removeItem("userRole");
        }
      } else {
        toast.error(res.data.message || "Login failed");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Login error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-red-950 to-orange-950">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,69,0,0.3),transparent_50%)]"></div>
        </div>

        {/* Login Card */}
        <div className="relative w-full max-w-md">
          {/* Admin Badge */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 shadow-2xl shadow-red-500/50">
              <span className="material-symbols-outlined text-5xl text-white">
                admin_panel_settings
              </span>
            </div>
            <h1 className="mb-2 text-3xl font-bold text-white">Admin Panel</h1>
            <p className="text-sm text-gray-400">Restricted Access - Administrators Only</p>
          </div>

          {/* Login Form */}
          <div className="rounded-2xl border border-red-500/20 bg-gray-900/80 p-8 shadow-2xl backdrop-blur-xl">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Admin Email
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    mail
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    placeholder="admin@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    lock
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 py-3 pl-12 pr-12 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 py-3 font-semibold text-white shadow-lg shadow-red-500/30 transition hover:shadow-xl hover:shadow-red-500/40 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" className="opacity-75" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">login</span>
                    Sign in to Admin Panel
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-gray-800 pt-6 text-center">
              <button
                onClick={() => navigate("/")}
                className="text-sm text-gray-400 transition hover:text-white"
              >
                ← Back to Main Site
              </button>
            </div>

            {/* Warning */}
            <div className="mt-6 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-yellow-500">warning</span>
                <div>
                  <p className="text-sm font-semibold text-yellow-500">Security Notice</p>
                  <p className="mt-1 text-xs text-gray-400">
                    This area is restricted to authorized administrators only. All access attempts are logged.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-gray-600">
            Protected by advanced security measures
          </p>
        </div>
      </div>
    </div>
  );
}
