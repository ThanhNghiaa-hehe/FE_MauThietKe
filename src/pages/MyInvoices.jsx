import React, { useEffect, useState } from "react";
import InvoiceAPI from "../api/invoiceAPI";
import toast from "../utils/toast";
import useSEO from "../utils/useSEO";
import { useNavigate } from "react-router-dom";

export default function MyInvoices() {
  useSEO("Lịch sử Hóa đơn", "Quản lý và tra cứu thông tin hóa đơn khóa học bằng SĐT hoặc Tài khoản");

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchPhone, setSearchPhone] = useState("");
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("accessToken");

  useEffect(() => {
    if (isLoggedIn) {
      fetchInvoices();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await InvoiceAPI.getMyInvoices();
      if (res.data.success) {
        setInvoices(res.data.data || []);
      } else {
        toast.error(res.data.message || "Không thể tải danh sách hóa đơn");
      }
    } catch (error) {
      console.error("Lỗi tải hóa đơn:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchByPhone = async (e) => {
    e.preventDefault();
    if (!searchPhone.trim()) {
      fetchInvoices();
      return;
    }

    try {
      setLoading(true);
      const res = await InvoiceAPI.searchInvoicesByPhone(searchPhone.trim());
      if (res.data.success) {
        setInvoices(res.data.data || []);
        if ((res.data.data || []).length === 0) {
          toast.info("Không tìm thấy hóa đơn nào liên kết với số điện thoại này");
        } else {
          toast.success(`Tìm thấy ${res.data.data.length} hóa đơn`);
        }
      } else {
        toast.error(res.data.message || "Tra cứu thất bại");
      }
    } catch (error) {
      console.error("Lỗi tra cứu:", error);
      toast.error("Không thể tra cứu hóa đơn");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center justify-center"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Lịch sử Hóa đơn Thanh toán
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Quản lý và tra cứu thông tin hóa đơn khóa học bằng SĐT hoặc Tài khoản
              </p>
            </div>
          </div>

          {/* Search by Phone Form */}
          <form onSubmit={handleSearchByPhone} className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                call
              </span>
              <input
                type="text"
                placeholder="Nhập SĐT tra cứu..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48 md:w-60"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition"
            >
              Tra cứu
            </button>
            {searchPhone && (
              <button
                type="button"
                onClick={() => {
                  setSearchPhone("");
                  fetchInvoices();
                }}
                className="p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-sm transition"
              >
                Đặt lại
              </button>
            )}
          </form>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <span>Đang tải danh sách hóa đơn...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800 p-8">
            <span className="material-symbols-outlined text-6xl text-slate-600 mb-4 block">
              receipt_long
            </span>
            <h3 className="text-xl font-semibold text-slate-300">Chưa có hóa đơn nào</h3>
            <p className="text-slate-500 mt-2">
              Bạn chưa thực hiện giao dịch mua khóa học nào trên hệ thống.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-2xl p-6 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                      #{inv.id}
                    </span>
                    {inv.status === "PAID" ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-medium border border-emerald-500/20">
                        <span className="material-symbols-outlined text-sm">check_circle</span> Đã thanh toán
                      </span>
                    ) : inv.status === "PENDING" ? (
                      <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full font-medium border border-amber-500/20">
                        <span className="material-symbols-outlined text-sm">hourglass_empty</span> Chờ thanh toán
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full font-medium border border-rose-500/20">
                        <span className="material-symbols-outlined text-sm">cancel</span> Đã hủy
                      </span>
                    )}
                  </div>

                  <div className="text-slate-300 font-medium text-lg">
                    {inv.items?.map((it) => it.title).join(", ") || "Khóa học trực tuyến"}
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>{" "}
                      {inv.issuedAt ? new Date(inv.issuedAt).toLocaleString("vi-VN") : "N/A"}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">credit_card</span> Phương thức: {inv.paymentMethod || "PAYOS"}
                    </span>
                    {inv.providerOrderCode && (
                      <span className="font-mono">Mã ĐH: {inv.providerOrderCode}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-800">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Tổng tiền</div>
                    <div className={`text-xl font-bold ${inv.status === "PAID" ? "text-emerald-400" : "text-amber-400"}`}>
                      {inv.totalAmount ? inv.totalAmount.toLocaleString("vi-VN") : 0} VNĐ
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {inv.status === "PENDING" && inv.checkoutUrl && (
                      <button
                        onClick={() => {
                          toast.info("Đang chuyển tới cổng thanh toán PayOS...");
                          window.location.assign(inv.checkoutUrl);
                        }}
                        className="px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition flex items-center gap-1.5 shadow-lg shadow-purple-500/20"
                      >
                        <span className="material-symbols-outlined text-sm">credit_card</span>
                        Tiếp tục thanh toán
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="px-4 py-2 text-sm font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto print:max-w-none print:w-full print:p-0 print:bg-white print:text-black">
            {/* Header Modal */}
            <div className="flex justify-between items-start pb-6 border-b border-slate-800 print:border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-white print:text-black">HÓA ĐƠN THANH TOÁN</h2>
                <p className="text-xs text-slate-400 font-mono mt-1 print:text-gray-600">
                  Mã HĐ: {selectedInvoice.id}
                </p>
              </div>
              <div className="text-right">
                {selectedInvoice.status === "PAID" ? (
                  <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold print:bg-green-100 print:text-green-800">
                    ĐÃ THANH TOÁN
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-semibold print:bg-yellow-100 print:text-yellow-800">
                    CHỜ THANH TOÁN
                  </span>
                )}
                <p className="text-xs text-slate-400 mt-2 print:text-gray-600">
                  Ngày: {new Date(selectedInvoice.issuedAt).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>

            {/* Billing Info */}
            <div className="grid grid-cols-2 gap-4 my-6 text-sm">
              <div>
                <span className="text-slate-400 block text-xs print:text-gray-500">Khách hàng:</span>
                <span className="font-semibold text-white print:text-black">{selectedInvoice.userFullname}</span>
                <p className="text-slate-400 text-xs print:text-gray-600">{selectedInvoice.userEmail}</p>
                <p className="text-slate-400 text-xs print:text-gray-600">{selectedInvoice.userPhoneNumber}</p>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-xs print:text-gray-500">Thông tin giao dịch:</span>
                <p className="text-xs text-slate-300 print:text-gray-700">Mã đơn hàng: {selectedInvoice.providerOrderCode || "N/A"}</p>
                <p className="text-xs text-slate-300 print:text-gray-700">Cổng TT: {selectedInvoice.paymentMethod}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden mb-6 print:border-gray-300">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase print:bg-gray-100 print:text-gray-700">
                  <tr>
                    <th className="p-3">Sản phẩm / Khóa học</th>
                    <th className="p-3 text-right">Đơn giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-gray-200">
                  {selectedInvoice.items?.map((item, idx) => (
                    <tr key={idx} className="text-slate-200 print:text-gray-800">
                      <td className="p-3 font-medium">{item.title}</td>
                      <td className="p-3 text-right font-mono">
                        {(item.discountedPrice || item.price || 0).toLocaleString("vi-VN")} VNĐ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800 text-lg font-bold print:border-gray-300">
              <span className="text-slate-300 print:text-black">TỔNG CỘNG</span>
              <span className="text-emerald-400 text-2xl font-mono print:text-emerald-600">
                {selectedInvoice.totalAmount?.toLocaleString("vi-VN")} VNĐ
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-800 print:hidden">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm transition"
              >
                <span className="material-symbols-outlined text-sm">print</span> In hóa đơn
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
