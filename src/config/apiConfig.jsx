const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const STATIC_BASE_URL = import.meta.env.VITE_STATIC_BASE_URL || 'http://localhost:8080';

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,
  REFRESH_TOKEN: `${API_BASE_URL}/auth/refresh-token`,
  GOOGLE_LOGIN: `${API_BASE_URL}/auth/google`,
  FORGET_PASSWORD: `${API_BASE_URL}/auth/forget-password`,
  VERIFY_OTP_PASSWORD: `${API_BASE_URL}/auth/verify-otpPassword`,
  RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
};

/**
 * Helper function to build image URL
 * @param {string} imagePath - Can be filename (e.g., "spring-boot.jpg") or full URL
 * @returns {string} Full image URL
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // Nếu đã là full URL (http:// hoặc https://)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Nếu bắt đầu bằng /static/, /uploads/, /images/
  if (imagePath.startsWith('/')) {
    return `${STATIC_BASE_URL}${imagePath}`;
  }
  
  // Nếu chỉ là tên file, backend serve tại /static/courses/
  return `${STATIC_BASE_URL}/static/courses/${imagePath}`;
};

export default API_BASE_URL;