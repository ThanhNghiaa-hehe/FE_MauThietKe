import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../component/AdminSidebar.jsx";
import AdminAPI from "../api/adminAPI.jsx";
import CouponAPI from "../api/couponAPI.jsx";
import InvoiceAPI from "../api/invoiceAPI.jsx";
import toast from "../utils/toast.js";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [totalCourses, setTotalCourses] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalCoupons, setTotalCoupons] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [invoicesList, setInvoicesList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userRole = localStorage.getItem("userRole");

    if (!token) {
      navigate("/auth");
      return;
    }

    if (userRole !== "ADMIN" && userRole !== "ROLE_ADMIN") {
      toast.error("Access denied! Admin only.");
      navigate("/home");
      return;
    }

    fetchRealDashboardData();
  }, [navigate]);

  const fetchRealDashboardData = async () => {
    try {
      setLoading(true);
      const [coursesRes, usersRes, couponsRes, invoicesRes] = await Promise.allSettled([
        AdminAPI.getAllCourses(),
        AdminAPI.getAllUsers(),
        CouponAPI.getAllCoupons(),
        InvoiceAPI.getAdminInvoices(),
      ]);

      if (coursesRes.status === "fulfilled" && coursesRes.value?.data?.success) {
        const list = coursesRes.value.data.data || [];
        setCoursesList(list);
        setTotalCourses(list.length);
      }

      if (usersRes.status === "fulfilled" && usersRes.value?.data?.success) {
        const uList = usersRes.value.data.data || [];
        setTotalUsers(uList.length);
      }

      if (couponsRes.status === "fulfilled" && couponsRes.value?.data?.success) {
        const cList = couponsRes.value.data.data || [];
        setTotalCoupons(cList.length);
      }

      if (invoicesRes.status === "fulfilled" && invoicesRes.value?.data?.success) {
        const invData = invoicesRes.value.data.data || {};
        setTotalRevenue(invData.totalRevenue || 0);
        setInvoicesList(invData.invoices || []);
      }
    } catch (err) {
      console.error("Error loading admin dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    navigate("/auth");
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price || 0);
  };

  const stats = [
    {
      label: "Tổng Doanh Thu Hóa Đơn",
      value: formatPrice(totalRevenue),
      icon: "payments",
      color: "emerald",
      isHighlight: true,
    },
    { label: "Tổng số Khóa học", value: totalCourses, icon: "school", color: "blue" },
    { label: "Tổng số Học viên", value: totalUsers, icon: "people", color: "purple" },
    { label: "Số lượng Hóa đơn", value: invoicesList.length, icon: "receipt_long", color: "orange" },
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <AdminSidebar onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                Bảng Quản Trị & Thống Kê Doanh Thu
              </h1>
              <p className="text-sm text-gray-400">
                Tổng quan doanh thu thanh toán PayOS và quản lý hệ thống bán khóa học
              </p>
            </div>
            <button
              onClick={fetchRealDashboardData}
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-gray-700"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Làm mới dữ liệu
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Stats Grid */}
          <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`rounded-2xl border p-6 transition transform hover:-translate-y-1 ${
                  stat.isHighlight
                    ? "bg-gradient-to-br from-emerald-950/60 to-slate-900 border-emerald-500/40 shadow-xl shadow-emerald-500/10"
                    : "bg-gray-900 border-gray-800"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div
                    className={`rounded-xl p-3 ${
                      stat.isHighlight ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-800 text-purple-400"
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
                  </div>
                  {stat.isHighlight && (
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20">
                      DOANH THU THỰC
                    </span>
                  )}
                </div>
                <h3
                  className={`text-2xl lg:text-3xl font-extrabold ${
                    stat.isHighlight ? "text-emerald-400" : "text-white"
                  }`}
                >
                  {loading ? "..." : stat.value}
                </h3>
                <p className="text-xs text-gray-400 mt-1 font-medium">{stat.label}</p>
              </div>
            ))}
          </section>

          {/* Revenue & Invoices Table Section (Criterion B6) */}
          <section className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400">finance</span>
                  Bảng Thống kê Hóa đơn Doanh thu (PayOS)
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Danh sách chi tiết tất cả các giao dịch thanh toán trên hệ thống
                </p>
              </div>

              <div className="flex gap-2">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20">
                  Đã thanh toán ({invoicesList.filter((i) => i.status === "PAID").length})
                </span>
                <span className="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-semibold rounded-full border border-yellow-500/20">
                  Chờ thanh toán ({invoicesList.filter((i) => i.status === "PENDING").length})
                </span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-10 text-gray-500 text-sm">Đang tải hóa đơn doanh thu...</div>
            ) : invoicesList.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">Chưa có dữ liệu hóa đơn nào.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400 font-semibold bg-gray-950/60">
                      <th className="py-3 px-4">Mã Hóa đơn / Order</th>
                      <th className="py-3 px-4">Người mua / Email</th>
                      <th className="py-3 px-4">Ngày phát hành</th>
                      <th className="py-3 px-4">Tổng tiền (VNĐ)</th>
                      <th className="py-3 px-4">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {invoicesList.slice(0, 10).map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-800/40 transition">
                        <td className="py-3.5 px-4 font-mono text-purple-300 font-medium">
                          #{inv.providerOrderCode || inv.id?.substring(0, 8)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-200">{inv.userFullname || "Khách hàng"}</div>
                          <div className="text-[11px] text-gray-500">{inv.userEmail || "N/A"}</div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-400">
                          {inv.issuedAt ? new Date(inv.issuedAt).toLocaleString("vi-VN") : "N/A"}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400">
                          {formatPrice(inv.totalAmount)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              inv.status === "PAID"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : inv.status === "PENDING"
                                ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {inv.status === "PAID" ? "Đã thanh toán" : inv.status === "PENDING" ? "Chờ thanh toán" : inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Quick Actions & Recent Courses */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="mb-4 text-xl font-bold text-white">Danh sách Khóa học Gần đây</h2>
              {loading ? (
                <div className="text-center py-8 text-gray-400">Đang tải dữ liệu...</div>
              ) : coursesList.length === 0 ? (
                <p className="text-gray-500 text-sm">Chưa có khóa học nào trong hệ thống</p>
              ) : (
                <div className="space-y-3">
                  {coursesList.slice(0, 5).map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between rounded-xl bg-gray-800/50 p-4 border border-gray-800"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-sm">{course.title}</h3>
                        <p className="text-xs text-gray-400 mt-1">Giảng viên: {course.instructorName || "N/A"}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            course.isPublished ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {course.isPublished ? "Đã phát hành" : "Nháp"}
                        </span>
                        <span className="text-sm font-bold text-purple-400">
                          {formatPrice(course.price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="mb-4 text-xl font-bold text-white">Thao tác nhanh</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/admin/courses")}
                  className="flex w-full items-center gap-3 rounded-xl bg-blue-600 p-3 text-white transition hover:bg-blue-500 font-medium text-sm"
                >
                  <span className="material-symbols-outlined">add</span>
                  <span>Tạo / Quản lý Khóa học</span>
                </button>
                <button
                  onClick={() => navigate("/admin/coupons")}
                  className="flex w-full items-center gap-3 rounded-xl bg-orange-600 p-3 text-white transition hover:bg-orange-500 font-medium text-sm"
                >
                  <span className="material-symbols-outlined">confirmation_number</span>
                  <span>Quản lý Mã Giảm Giá (Coupons)</span>
                </button>
                <button
                  onClick={() => navigate("/admin/categories")}
                  className="flex w-full items-center gap-3 rounded-xl bg-purple-600 p-3 text-white transition hover:bg-purple-500 font-medium text-sm"
                >
                  <span className="material-symbols-outlined">category</span>
                  <span>Quản lý Danh mục</span>
                </button>
                <button
                  onClick={() => navigate("/admin/support")}
                  className="flex w-full items-center gap-3 rounded-xl bg-indigo-600 p-3 text-white transition hover:bg-indigo-500 font-medium text-sm"
                >
                  <span className="material-symbols-outlined">support_agent</span>
                  <span>Hỗ trợ & Chat CSKH</span>
                </button>
                <button
                  onClick={() => navigate("/admin/users")}
                  className="flex w-full items-center gap-3 rounded-xl bg-emerald-600 p-3 text-white transition hover:bg-emerald-500 font-medium text-sm"
                >
                  <span className="material-symbols-outlined">people</span>
                  <span>Quản lý Người dùng & Phân quyền</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
