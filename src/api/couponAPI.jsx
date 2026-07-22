import axiosInstance from "../config/axios";

const CouponAPI = {
  /**
   * 🎟️ Áp dụng mã giảm giá
   * POST /api/coupons/apply
   * Body: { code: string, orderAmount: number }
   */
  applyCoupon: (data) => {
    return axiosInstance.post('/coupons/apply', data);
  },

  /**
   * 📜 Lấy tất cả mã giảm giá
   * GET /api/coupons
   */
  getAllCoupons: () => {
    return axiosInstance.get('/coupons');
  },

  /**
   * ➕ Admin tạo mã giảm giá mới
   * POST /api/admin/coupons
   */
  createCoupon: (data) => {
    return axiosInstance.post('/admin/coupons', data);
  },
};

export default CouponAPI;
