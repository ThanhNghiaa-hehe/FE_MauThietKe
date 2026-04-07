import axiosInstance from "../config/axios";

const PaymentAPI = {
  /**
   * 💳 Tạo thanh toán PayOS (Direct course purchase)
   * POST /api/payment/payos/create
   * Body: { courseIds: string[], orderInfo?: string }
   */
  createPayOSPayment: (data) => {
    return axiosInstance.post('/payment/payos/create', data);
  },

  /**
   * 📊 Kiểm tra trạng thái thanh toán
   * GET /api/payment/{paymentId}/status
   */
  getPaymentStatus: (paymentId) => {
    return axiosInstance.get(`/payment/${paymentId}/status`);
  },

  /**
   * 📜 Lấy lịch sử thanh toán của tôi
   * GET /api/payment/my-payments
   */
  getMyPayments: () => {
    return axiosInstance.get('/payment/my-payments');
  },

  /**
   * ✅ Lấy các thanh toán thành công
   * GET /api/payment/my-payments/success
   */
  getMySuccessfulPayments: () => {
    return axiosInstance.get('/payment/my-payments/success');
  },
};

export default PaymentAPI;
