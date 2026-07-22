import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function AdminSidebar({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { icon: "dashboard", label: "Dashboard", path: "/admin/dashboard" },
    { icon: "support_agent", label: "Hỗ trợ & CSKH", path: "/admin/support" },
    { icon: "school", label: "Courses", path: "/admin/courses" },
    { icon: "category", label: "Categories", path: "/admin/categories" },
    { icon: "quiz", label: "Quizzes", path: "/admin/quizzes" },
    { icon: "people", label: "Users", path: "/admin/users" },
    { icon: "confirmation_number", label: "Coupons", path: "/admin/coupons" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div
      className={`flex h-screen flex-col border-r border-gray-800 bg-gray-950 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-gray-800 bg-gradient-to-r from-red-600 to-orange-600 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur flex-shrink-0">
          <span className="material-symbols-outlined text-xl text-white">admin_panel_settings</span>
        </div>
        {!isCollapsed && (
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-white/70">Management System</p>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white/70 hover:text-white"
        >
          <span className="material-symbols-outlined text-xl">
            {isCollapsed ? "chevron_right" : "chevron_left"}
          </span>
        </button>
      </div>

      {/* Main Menu */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition ${
                isActive(item.path)
                  ? "bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg"
                  : "text-gray-400 hover:bg-gray-900 hover:text-white"
              }`}
              title={isCollapsed ? item.label : ""}
            >
              <span className="material-symbols-outlined text-[22px] flex-shrink-0">
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Back to User Site & Logout */}
      <div className="border-t border-gray-800 p-4">
        {/* Admin Profile */}
        <div className={`flex items-center gap-3 mb-3 ${isCollapsed ? "justify-center" : ""}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex-shrink-0">
            <span className="material-symbols-outlined text-white">shield_person</span>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white">Admin</p>
              <p className="truncate text-xs text-gray-400">
                {localStorage.getItem("userEmail") || "admin@example.com"}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onLogout}
          className={`flex w-full items-center gap-3 rounded-lg bg-red-600 px-3 py-2.5 text-white transition hover:bg-red-700 ${
            isCollapsed ? "justify-center" : ""
          }`}
          title={isCollapsed ? "Logout" : ""}
        >
          <span className="material-symbols-outlined text-[22px] flex-shrink-0">logout</span>
          {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
}
