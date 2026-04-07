  // src/services/axiosAuth.jsx
  import axiosInstance from "../config/axios"; // 👉 file cấu hình axios của bạn (sẽ tạo sau)

  const AuthAPI = {
    /**
     * 🧾 Đăng ký tài khoản
     * @param {Object} data { email, password, fullname, phoneNumber }
     */
    register: (data) => {
      return axiosInstance.post("/auth/register", data);
    },

    /**
     * 📩 Xác thực OTP sau khi đăng ký
     * @param {Object} data { email, otpCode }
     */
    verifyOtp: (data) => {
      return axiosInstance.post("/auth/verify-otp", data);
    },

    /**
     * 🔑 Đăng nhập người dùng
     * @param {Object} data { email, password }
     */
    login: async (data) => {
      const res = await axiosInstance.post("/auth/login", data);

      const token = res.data?.data?.accessToken;
      if (token) {
        localStorage.setItem("accessToken", token);
        axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }

      return res;
    },

    /**
     * 🔄 Làm mới token
     */
    refreshToken: () => {
      return axiosInstance.post("/auth/refresh-token");
    },

    /**
     * 🔐 Đăng nhập bằng Google
     * @param {string} idToken
     */
    googleLogin: (idToken) => {
      return axiosInstance.post("/auth/google", { idToken });
    },

    /**
     * 🧠 Quên mật khẩu - gửi mail
     * @param {string} email
     */
    forgetPassword: (email) => {
      return axiosInstance.post("/auth/forget-password", { email });
    },

    /**
     * 📤 Xác minh mã OTP đặt lại mật khẩu
     * @param {Object} data { email, otpCode }
     */
    verifyOtpPassword: (data) => {
      return axiosInstance.post("/auth/verify-otpPassword", data);
    },

    /**
     * 🔁 Đặt lại mật khẩu mới
     * @param {Object} data { email, newPassword }
     */
    resetPassword: (data) => {
      return axiosInstance.post("/auth/reset-password", data);
    },
  };

  export default AuthAPI;
