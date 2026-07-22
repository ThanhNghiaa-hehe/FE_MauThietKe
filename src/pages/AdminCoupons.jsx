import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../component/AdminSidebar.jsx";
import CouponAPI from "../api/couponAPI.jsx";
import toast from "../utils/toast.js";

export default function AdminCoupons() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(20);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [minOrderAmount, setMinOrderAmount] = useState(0);
  const [expirationDate, setExpirationDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userRole = localStorage.getItem("userRole");

    if (!token) {
      navigate("/auth");
      return;
    }
    if (userRole !== "ADMIN" && userRole !== "ROLE_ADMIN") {
      toast.error("Truy cập bị từ chối! Chỉ dành cho Admin.");
      navigate("/home");
      return;
    }

    fetchCoupons();
  }, [navigate]);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await CouponAPI.getAllCoupons();
      if (res.data.success) {
        setCoupons(res.data.data || []);
      } else {
        toast.error(res.data.message || "Không thể tải danh sách mã giảm giá");
      }
    } catch (err) {
      console.error("Lỗi tải danh sách coupon:", err);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("Vui lòng nhập Mã giảm giá");
      return;
    }

    try {
      setSubmitting(true);
      const couponData = {
        code: code.trim().toUpperCase(),
        discountPercent: Number(discountPercent) || 0,
        discountAmount: Number(discountAmount) || 0,
        minOrderAmount: Number(minOrderAmount) || 0,
        expirationDate: expirationDate ? new Date(expirationDate).toISOString() : null,
        active: true
      };

      const res = await CouponAPI.createCoupon(couponData);
      if (res.data.success) {
        toast.success("Tạo mã giảm giá mới thành công!");
        setShowModal(false);
        setCode("");
        setDiscountPercent(20);
        setDiscountAmount(0);
        setMinOrderAmount(0);
        setExpirationDate("");
        fetchCoupons();
      } else {
        toast.error(res.data.message || "Tạo mã giảm giá thất bại");
      }
    } catch (err) {
      console.error("Lỗi tạo coupon:", err);
      toast.error(err.response?.data?.message || "Lỗi tạo mã giảm giá");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    navigate("/auth");
  };

  const formatVND = (amount) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);
  };

  return (
    <div className="flex h-screen bg-gray-950">
      <AdminSidebar onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Quản lý Mã Giảm Giá (Coupons)</h1>
              <p className="text-sm text-gray-400">Tạo và điều chỉnh các chương trình ưu đãi cho học viên</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-5 py-2.5 font-semibold text-white transition shadow-lg shadow-orange-500/20"
            >
              <span className="material-symbols-outlined">add</span>
              Tạo mã giảm giá mới
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
              <span>Đang tải danh sách mã giảm giá...</span>
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800 p-8">
              <span className="material-symbols-outlined text-6xl text-gray-600 mb-4 block">
                confirmation_number
              </span>
              <h3 className="text-xl font-semibold text-gray-300">Chưa có mã giảm giá nào</h3>
              <p className="text-gray-500 mt-2">Bấm nút "Tạo mã giảm giá mới" ở trên để phát hành ưu đãi đầu tiên.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coupons.map((c) => (
                <div
                  key={c.id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-6 relative overflow-hidden group hover:border-orange-500/50 transition"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-mono text-lg font-bold px-3 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl">
                      {c.code}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        c.active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {c.active ? "ĐANG HOẠT ĐỘNG" : "ĐÃ TẮT"}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-300 mb-4">
                    {c.discountPercent > 0 && (
                      <div>⚡ Giảm giá: <strong className="text-white">{c.discountPercent}%</strong></div>
                    )}
                    {c.discountAmount > 0 && (
                      <div>⚡ Giảm cố định: <strong className="text-white">{formatVND(c.discountAmount)}</strong></div>
                    )}
                    <div>💰 Đơn tối thiểu: <span className="text-gray-400">{formatVND(c.minOrderAmount)}</span></div>
                    <div>⏳ Hạn dùng: <span className="text-gray-400">{c.expirationDate ? new Date(c.expirationDate).toLocaleDateString("vi-VN") : "Vĩnh viễn"}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal Tạo Coupon */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-gray-800 mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-400">confirmation_number</span>
                Tạo Mã Giảm Giá Mới
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Mã giảm giá (Code):</label>
                <input
                  type="text"
                  placeholder="VD: KHUYENMAI50"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 font-mono uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Giảm theo % (0-100):</label>
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Hoặc số tiền giảm (VNĐ):</label>
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Giá trị đơn hàng tối thiểu (VNĐ):</label>
                <input
                  type="number"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Ngày hết hạn:</label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-orange-500/20 disabled:opacity-50"
                >
                  {submitting ? "Đang tạo..." : "Tạo Mã"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
