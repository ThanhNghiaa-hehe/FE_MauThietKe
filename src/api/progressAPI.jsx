import axiosInstance from "../config/axios";

const ProgressAPI = {
  /**
   * 📝 Enroll khóa học (đăng ký/mua khóa học)
   * POST /api/progress/enroll/{courseId}
   */
  enrollCourse: (courseId) => {
    return axiosInstance.post(`/progress/enroll/${courseId}`);
  },

  /**
   * 📚 Lấy danh sách khóa học đã đăng ký kèm progress
   * GET /api/progress/my-courses
   */
  getMyCourses: () => {
    return axiosInstance.get('/progress/my-courses');
  },

  /**
   * 📊 Lấy progress chi tiết của một khóa học
   * GET /api/progress/course/{courseId}
   */
  getCourseProgress: (courseId) => {
    return axiosInstance.get(`/progress/course/${courseId}`);
  },

  /**
   * Bí danh lấy progress chi tiết của khóa học
   */
  getProgress: (courseId) => {
    return axiosInstance.get(`/progress/course/${courseId}`);
  },

  /**
   * 📖 Lấy chapters kèm unlock status và progress
   * GET /api/progress/course/{courseId}/chapters
   */
  getChaptersWithProgress: (courseId) => {
    return axiosInstance.get(`/progress/course/${courseId}/chapters`);
  },

  /**
   * ✅ Đánh dấu lesson hoàn thành
   * POST /api/lessons/{lessonId}/complete
   */
  completeLesson: (lessonId) => {
    return axiosInstance.post(`/lessons/${lessonId}/complete`);
  },

  /**
   * 🎥 Cập nhật tiến độ xem video
   * POST /api/lessons/{lessonId}/progress?percent=50
   */
  updateVideoProgress: (lessonId, percent) => {
    return axiosInstance.post(`/lessons/${lessonId}/progress?percent=${percent}`);
  },

  /**
   * 🔄 Lấy tiến độ đã lưu của video (resume)
   * GET /api/lessons/{lessonId}/progress
   */
  getLessonProgress: (lessonId) => {
    return axiosInstance.get(`/lessons/${lessonId}/progress`);
  },

  /**
   * ➡️ Lấy lesson tiếp theo
   * GET /api/lessons/{lessonId}/next
   */
  getNextLesson: (lessonId) => {
    return axiosInstance.get(`/lessons/${lessonId}/next`);
  },

  /**
   * 🔒 Kiểm tra quyền truy cập lesson
   * GET /api/lessons/{lessonId}/access
   */
  checkLessonAccess: (lessonId) => {
    return axiosInstance.get(`/lessons/${lessonId}/access`);
  }
};

export default ProgressAPI;
