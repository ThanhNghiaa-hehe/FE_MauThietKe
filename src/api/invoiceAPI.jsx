import axiosInstance from "../config/axios";

const InvoiceAPI = {
  /**
   * 📜 Lấy danh sách hóa đơn của tôi
   * GET /api/invoices/my-invoices
   */
  getMyInvoices: () => {
    return axiosInstance.get('/invoices/my-invoices');
  },

  /**
   * 🔍 Xem chi tiết một hóa đơn
   * GET /api/invoices/{id}
   */
  getInvoiceById: (id) => {
    return axiosInstance.get(`/invoices/${id}`);
  },

  /**
   * 📞 Tra cứu hóa đơn bằng Số điện thoại (Công khai)
   * GET /api/invoices/search?phone=...
   */
  searchInvoicesByPhone: (phone) => {
    return axiosInstance.get(`/invoices/search?phone=${encodeURIComponent(phone)}`);
  },

  /**
   * 📊 Thống kê Doanh thu & Tất cả hóa đơn cho Admin
   * GET /api/invoices/admin/all
   */
  getAdminInvoices: () => {
    return axiosInstance.get('/invoices/admin/all');
  },
};

export default InvoiceAPI;
