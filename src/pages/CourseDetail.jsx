import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../component/Sidebar.jsx";
import CourseAPI from "../api/courseAPI.jsx";
import LessonAPI from "../api/lessonAPI.jsx";
import ProgressAPI from "../api/progressAPI.jsx";
import PaymentAPI from "../api/paymentAPI.jsx";
import CouponAPI from "../api/couponAPI.jsx";
import ReviewAPI from "../api/reviewAPI.jsx";
import { getImageUrl } from "../config/apiConfig.jsx";
import { handleLogout as logout } from "../utils/auth.js";
import toast from "../utils/toast";

export default function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState({});

  // Checkout & Coupon Modal States
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  // Review & Rating States
  const [reviews, setReviews] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const buildSafeOrderInfo = (title, id) => {
    const base = title || "Thanh toan";
    const normalized = base
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return normalized.length > 20 ? normalized.substring(0, 20).trim() : normalized;
  };

  useEffect(() => {
    fetchCourseDetails();
    checkEnrollmentStatus();
    fetchReviews();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await CourseAPI.getCourseById(courseId);
      if (response.data.success) {
        setCourse(response.data.data);
        setFinalPrice(response.data.data?.price || 0);
        
        try {
          const chaptersRes = await LessonAPI.getChaptersByCourse(courseId);
          if (chaptersRes.data.success) {
            const rawChapters = chaptersRes.data.data || [];
            const chaptersWithLessons = await Promise.all(
              rawChapters.map(async (chapter) => {
                try {
                  const lessonsRes = await LessonAPI.getLessonsByChapter(chapter.id);
                  const lessonsData = Array.isArray(lessonsRes.data)
                    ? lessonsRes.data
                    : lessonsRes.data?.data || [];
                  return {
                    ...chapter,
                    lessons: lessonsData,
                  };
                } catch (lErr) {
                  console.error(`Lỗi tải bài học cho chapter ${chapter.id}:`, lErr);
                  return {
                    ...chapter,
                    lessons: [],
                  };
                }
              })
            );
            setChapters(chaptersWithLessons);
            if (chaptersWithLessons.length > 0) {
              setExpandedChapters({ [chaptersWithLessons[0].id]: true });
            }
          }
        } catch (err) {
          console.error("Lỗi tải chương học:", err);
        }
      } else {
        setError(response.data.message || "Không thể tải thông tin khóa học");
      }
    } catch (err) {
      console.error("Lỗi tải thông tin khóa học:", err);
      setError("Không thể tải thông tin khóa học. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollmentStatus = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setIsEnrolled(false);
      return;
    }
    try {
      const response = await ProgressAPI.getCourseProgress(courseId);
      if (response.data?.success && response.data?.data) {
        setIsEnrolled(true);
        return;
      }

      // Fallback check my-courses
      const myCoursesRes = await ProgressAPI.getMyCourses();
      if (myCoursesRes.data?.success && Array.isArray(myCoursesRes.data?.data)) {
        const isFound = myCoursesRes.data.data.some(
          (c) => c.courseId === courseId || c.id === courseId
        );
        if (isFound) {
          setIsEnrolled(true);
          return;
        }
      }
      setIsEnrolled(false);
    } catch (err) {
      console.error("Lỗi kiểm tra trạng thái đăng ký:", err);
      setIsEnrolled(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await ReviewAPI.getCourseReviews(courseId);
      if (res.data?.success) {
        const payloadData = res.data.data;
        if (Array.isArray(payloadData)) {
          setReviews(payloadData);
        } else if (payloadData && Array.isArray(payloadData.reviews)) {
          setReviews(payloadData.reviews);
        } else {
          setReviews([]);
        }
      }
    } catch (err) {
      console.error("Lỗi tải đánh giá:", err);
      setReviews([]);
    }
  };

  const handleOpenCheckoutModal = () => {
    setCouponCode("");
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setFinalPrice(course?.price || 0);
    setShowCheckoutModal(true);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Vui lòng nhập mã giảm giá");
      return;
    }
    try {
      setCouponLoading(true);
      const res = await CouponAPI.applyCoupon({
        code: couponCode.trim(),
        orderAmount: course?.price || 0
      });
      if (res.data.success) {
        const data = res.data.data;
        setAppliedCoupon(data);
        setDiscountAmount(data.discountAmount || 0);
        setFinalPrice(data.finalAmount || 0);
        toast.success(`Đã áp dụng mã ${data.code}! Giảm ${formatPrice(data.discountAmount)}`);
      } else {
        toast.error(res.data.message || "Mã giảm giá không hợp lệ");
      }
    } catch (err) {
      console.error("Lỗi áp dụng coupon:", err);
      toast.error("Không thể áp dụng mã giảm giá");
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      if (!course || !course.price) {
        toast.error("Không thể lấy thông tin khóa học!");
        return;
      }
      
      const paymentData = {
        courseIds: [courseId],
        orderInfo: buildSafeOrderInfo(course?.title, courseId),
        couponCode: appliedCoupon ? appliedCoupon.code : null
      };
      
      toast.info("Đang chuyển đến cổng thanh toán PayOS...");
      
      const response = await PaymentAPI.createPayOSPayment(paymentData);
      const payload = response?.data;
      if (!payload?.success) {
        toast.error(payload?.message || "Không thể tạo thanh toán. Vui lòng thử lại!");
        return;
      }

      const checkoutUrl = payload?.data?.checkoutUrl || payload?.data?.paymentUrl;
      if (!checkoutUrl) {
        toast.error("Không nhận được URL thanh toán từ hệ thống.");
        return;
      }

      if (payload?.data?.paymentId) {
        localStorage.setItem('pendingPaymentId', String(payload.data.paymentId));
      }
      if (payload?.data?.orderCode || payload?.data?.providerOrderCode) {
        localStorage.setItem('pendingOrderCode', String(payload.data.orderCode || payload.data.providerOrderCode));
      }
      localStorage.setItem('pendingCourseIds', JSON.stringify([String(courseId)]));

      window.location.assign(checkoutUrl);
    } catch (err) {
      console.error("Error creating payment:", err);
      toast.error(err.response?.data?.message || "Lỗi khi tạo thanh toán");
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      toast.error("Vui lòng viết nhận xét của bạn");
      return;
    }

    try {
      setSubmittingReview(true);
      const res = await ReviewAPI.createReview({
        courseId,
        rating: newRating,
        comment: newComment.trim()
      });

      if (res.data.success) {
        toast.success("Cảm ơn bạn đã gửi đánh giá!");
        setNewComment("");
        fetchReviews();
        fetchCourseDetails();
      } else {
        toast.error(res.data.message || "Gửi đánh giá thất bại");
      }
    } catch (err) {
      console.error("Lỗi gửi đánh giá:", err);
      toast.error("Vui lòng đăng nhập để đánh giá");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleStartLearning = () => {
    navigate(`/course/${courseId}/learn`);
  };

  const toggleChapter = (chapterId) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  const handleLogout = () => {
    logout(navigate);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price || 0);
  };

  const getLevelColor = (level) => {
    const colors = {
      Beginner: "bg-green-500/10 text-green-400 border-green-500/20",
      Intermediate: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      Advanced: "bg-red-500/10 text-red-400 border-red-500/20",
    };
    return colors[level] || colors.Beginner;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-purple-500"></div>
          <p className="text-gray-400">Đang tải thông tin khóa học...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate("/home")}
            className="text-purple-400 hover:text-purple-300"
          >
            ← Quay lại Trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-8 py-12">
            <button
              onClick={() => navigate("/home")}
              className="text-purple-400 hover:text-purple-300 mb-6 flex items-center gap-2"
            >
              ← Quay lại danh sách khóa học
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Course Info */}
              <div className="lg:col-span-2">
                <div className="mb-4">
                  <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${getLevelColor(course?.level)}`}>
                    {course?.level || "Beginner"}
                  </span>
                </div>

                <h1 className="text-4xl font-bold text-white mb-4">
                  {course?.title}
                </h1>

                <p className="text-gray-300 text-lg mb-6 leading-relaxed">
                  {course?.description}
                </p>

                <div className="flex flex-wrap gap-6 text-sm text-gray-400 border-t border-gray-800 pt-6">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-400">person</span>
                    <span>Giảng viên: <strong className="text-white">{course?.instructorName || "N/A"}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-400">schedule</span>
                    <span>Thời lượng: <strong className="text-white">{course?.duration || 0} giờ</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-400">star</span>
                    <span>Đánh giá: <strong className="text-white">{course?.rating || 5.0} / 5.0</strong></span>
                  </div>
                </div>
              </div>

              {/* Course Card / Payment Action */}
              <div className="lg:col-span-1">
                <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden sticky top-8">
                  {course?.thumbnailUrl ? (
                    <img
                      src={getImageUrl(course.thumbnailUrl)}
                      alt={course.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.target.src = "http://localhost:8080/static/courses/html-css.jpg";
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-800 flex items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-gray-600">image</span>
                    </div>
                  )}
                  
                  <div className="p-6">
                    <div className="text-3xl font-bold text-white mb-4">
                      {formatPrice(course?.price)}
                    </div>
                    
                    {isEnrolled ? (
                      <button
                        onClick={handleStartLearning}
                        className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white transition hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined">play_circle</span>
                        Tiếp tục học ngay
                      </button>
                    ) : (
                      <button
                        onClick={handleOpenCheckoutModal}
                        className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white transition hover:shadow-lg flex items-center justify-center gap-2 shadow-purple-500/20"
                      >
                        <span className="material-symbols-outlined">shopping_cart</span>
                        Thanh toán ngay (Có mã giảm giá)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Course Content & Reviews */}
        <div className="max-w-7xl mx-auto px-8 py-12 space-y-12">
          {/* Curriculum */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Nội dung khóa học</h2>
            
            {chapters.length === 0 ? (
              <div className="text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
                <p className="text-gray-400">Chưa có nội dung cho khóa học này</p>
              </div>
            ) : (
              <div className="space-y-4">
                {chapters.map((chapter, idx) => (
                  <div key={chapter.id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                    <button
                      onClick={() => toggleChapter(chapter.id)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-purple-400 font-bold">Chapter {idx + 1}</span>
                        <h3 className="text-white font-semibold">{chapter.title}</h3>
                        <span className="text-gray-500 text-sm">
                          ({chapter.lessons?.length || 0} bài học)
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-gray-400">
                        {expandedChapters[chapter.id] ? "expand_less" : "expand_more"}
                      </span>
                    </button>

                    {expandedChapters[chapter.id] && (
                      <div className="border-t border-gray-800 px-6 py-4 bg-gray-950/50">
                        {chapter.description && (
                          <p className="text-gray-400 text-sm mb-4">{chapter.description}</p>
                        )}
                        
                        <div className="space-y-2">
                          {chapter.lessons?.length > 0 ? (
                            chapter.lessons.map((lesson, lessonIdx) => (
                              <div
                                key={lesson.id}
                                className="flex items-center gap-3 py-3 px-4 rounded-lg bg-gray-900/50 hover:bg-gray-800/50 transition text-gray-300"
                              >
                                <span className="material-symbols-outlined text-sm text-purple-400">
                                  {lesson.videoType === 'YOUTUBE' ? 'play_circle' : 'article'}
                                </span>
                                <div className="flex-1">
                                  <div className="text-sm font-medium">
                                    {lessonIdx + 1}. {lesson.title}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  {lesson.isFree && (
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded font-semibold">
                                      HỌC THỬ
                                    </span>
                                  )}
                                  <span>{lesson.duration || 0} phút</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-center text-gray-500 py-4 text-sm">
                              Chưa có bài học nào
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review & Rating Section */}
          <div className="pt-8 border-t border-gray-800">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-400">star</span>
              Đánh giá & Nhận xét từ Học viên ({reviews.length})
            </h2>

            {/* Form viết đánh giá */}
            <form onSubmit={handleSubmitReview} className="bg-gray-900 p-6 rounded-2xl border border-gray-800 mb-8">
              <h3 className="text-lg font-semibold text-white mb-3">Viết nhận xét của bạn</h3>
              
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-400">Đánh giá:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setNewRating(star)}
                    className="text-2xl focus:outline-none"
                  >
                    <span className={`material-symbols-outlined ${star <= newRating ? "text-yellow-400" : "text-gray-600"}`}>
                      star
                    </span>
                  </button>
                ))}
                <span className="text-sm font-bold text-yellow-400 ml-2">{newRating} Sao</span>
              </div>

              <textarea
                rows="3"
                placeholder="Chia sẻ cảm nhận của bạn về khóa học này..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 mb-4"
              />

              <button
                type="submit"
                disabled={submittingReview}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
              >
                {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
            </form>

            {/* Danh sách bình luận */}
            {!Array.isArray(reviews) || reviews.length === 0 ? (
              <p className="text-gray-500 italic">Chưa có đánh giá nào cho khóa học này. Hãy là người đầu tiên đánh giá!</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="bg-gray-900/60 p-5 rounded-2xl border border-gray-800">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-600/30 border border-purple-500/30 flex items-center justify-center font-bold text-purple-300">
                          {rev.userFullname ? rev.userFullname.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm">{rev.userFullname || "Học viên"}</div>
                          <div className="text-xs text-gray-500">{new Date(rev.createdAt).toLocaleString("vi-VN")}</div>
                        </div>
                      </div>
                      <div className="flex items-center text-yellow-400">
                        {[...Array(rev.rating || 5)].map((_, i) => (
                          <span key={i} className="material-symbols-outlined text-sm">star</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm mt-2 pl-12">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Checkout & Coupon Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400">shopping_cart</span>
                Xác nhận Thanh toán Khóa học
              </h2>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Course Summary */}
            <div className="my-5 p-4 bg-gray-950 rounded-2xl border border-gray-800 space-y-3">
              <div className="font-semibold text-white">{course?.title}</div>
              <div className="text-xs text-gray-400">Giảng viên: {course?.instructorName || "N/A"}</div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-800">
                <span className="text-gray-400">Giá gốc khóa học:</span>
                <span className="font-bold text-gray-200">{formatPrice(course?.price)}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between items-center text-sm text-emerald-400 font-medium">
                  <span>Mã giảm giá ({appliedCoupon.code}):</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
            </div>

            {/* Coupon Input Form */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-300 mb-2">
                🎟️ Nhập mã giảm giá (Coupon):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập mã giảm giá..."
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
                >
                  {couponLoading ? "..." : "Áp dụng"}
                </button>
              </div>
            </div>

            {/* Total Price */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-800 mb-6">
              <span className="text-gray-300 font-semibold">TỔNG TIỀN THANH TOÁN:</span>
              <span className="text-2xl font-bold text-emerald-400 font-mono">
                {formatPrice(finalPrice)}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition"
              >
                Hủy
              </button>
              <button
                onClick={handlePayment}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-purple-500/20"
              >
                Thanh toán PayOS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
