import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import Sidebar from "../component/Sidebar.jsx";
import ThemeToggle from "../component/ThemeToggle.jsx";
import CourseAPI from "../api/courseAPI.jsx";
import FavoriteAPI from "../api/favoriteAPI.jsx";
import ProgressAPI from "../api/progressAPI.jsx";
import UserAPI from "../api/userAPI.jsx";
import { getImageUrl } from "../config/apiConfig.jsx";
import { handleLogout as logout } from "../utils/auth.js";
import toast from "../utils/toast.js";

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState("");
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [favoriteCourseIds, setFavoriteCourseIds] = useState([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState(new Set());

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/auth");
      return;
    }

    let uid = "";
    try {
      const decoded = jwtDecode(token);
      console.log("🔑 Decoded token:", decoded);
      
      // Lấy userId từ token - ưu tiên field 'id'
      uid = decoded.id || decoded.userId || decoded.sub;
      console.log("👤 Extracted userId:", uid);
      setUserId(uid);
      
      const cachedName = localStorage.getItem("userFullname") || decoded.fullname || decoded.name || "User";
      setUser({
        name: cachedName,
        email: decoded.email || decoded.sub || localStorage.getItem("userEmail") || "user@example.com"
      });
    } catch (e) {
      console.error("Token decode error:", e);
    }

    UserAPI.getCurrentUser()
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          const uData = res.data.data;
          const name = uData.fullname || uData.email || "User";
          setUser((prev) => ({
            ...prev,
            name: name,
            email: uData.email || prev?.email || ""
          }));
          if (uData.fullname) {
            localStorage.setItem("userFullname", uData.fullname);
          }
        }
      })
      .catch((err) => {
        console.error("Home get current user error:", err);
      });

    fetchData();
    loadEnrolledCourses();
    if (uid) {
      loadFavorites(uid);
    }
  }, [navigate]);

  const loadEnrolledCourses = async () => {
    try {
      const res = await ProgressAPI.getMyCourses();
      if (res.data?.success && Array.isArray(res.data?.data)) {
        const ids = new Set(res.data.data.map((c) => c.courseId || c.id));
        setEnrolledCourseIds(ids);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách khóa học đã mua:", err);
    }
  };

  useEffect(() => {
    // Filter courses based on category and search query
    console.log("🔍 Filtering courses. Total:", courses.length);
    console.log("🏷️ Selected category:", selectedCategory);
    console.log("🔎 Search query:", searchQuery);
    
    let filtered = courses;

    if (selectedCategory !== "ALL") {
      filtered = filtered.filter((course) => course.categoryCode === selectedCategory);
      console.log(`📂 After category filter (${selectedCategory}):`, filtered.length);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter((course) =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log(`🔎 After search filter:`, filtered.length);
    }

    console.log("✨ Final filtered courses:", filtered.length);
    setFilteredCourses(filtered);
  }, [courses, selectedCategory, searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log("🔄 Fetching courses...");
      
      const coursesRes = await CourseAPI.getAllPublishedCourses();
      
      console.log("📡 Courses Response:", coursesRes);
      
      if (coursesRes.data.success) {
        const coursesData = coursesRes.data.data || [];
        console.log("✅ Courses loaded:", coursesData.length, "items");
        console.log("📚 Course data sample:", coursesData[0]);
        console.log("📊 All courses:", coursesData);
        setCourses(coursesData);
        
        // Extract unique categories from courses
        const uniqueCategories = [...new Set(coursesData.map(c => c.categoryCode))]
          .filter(Boolean)
          .map(code => ({
            code,
            name: coursesData.find(c => c.categoryCode === code)?.categoryName || code
          }));
        console.log("📂 Extracted categories:", uniqueCategories);
        setCategories(uniqueCategories);
      } else {
        console.warn("⚠️ Courses success = false");
      }
    } catch (err) {
      console.error("❌ Error fetching data:", err);
      console.error("❌ Error details:", err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async (uid) => {
    try {
      const res = await FavoriteAPI.getUserFavorites(uid);
      if (res.data.success) {
        const favoritesData = res.data.data || [];
        const favoriteItems = favoritesData[0]?.favoriteItem || [];
        const courseIds = favoriteItems.map(item => item.courseId);
        setFavoriteCourseIds(courseIds);
        console.log('✅ Loaded favorites:', courseIds);
      }
    } catch (err) {
      console.error('❌ Error loading favorites:', err);
    }
  };

  const isFavorite = (courseId) => {
    return favoriteCourseIds.includes(courseId);
  };

  const handleToggleFavorite = async (course) => {
    if (!userId) {
      toast.warning('Vui lòng đăng nhập!');
      return;
    }

    try {
      if (isFavorite(course.id)) {
        // Xóa khỏi favorites
        await FavoriteAPI.removeFromFavorite(userId, course.id);
        setFavoriteCourseIds(favoriteCourseIds.filter(id => id !== course.id));
        toast.success('Đã xóa khỏi danh sách yêu thích!');
      } else {
        // Thêm vào favorites
        const favoriteRequest = {
          courseId: course.id,
          title: course.title,
          thumbnailUrl: course.thumbnailUrl,
          price: course.price,
          discountedPrice: course.discountedPrice,
          discountPercent: course.discountPercent,
          level: course.level,
          duration: course.duration,
          instructorName: course.instructorName,
          rating: course.rating,
          totalStudents: course.totalStudents,
        };
        await FavoriteAPI.addToFavorite(userId, favoriteRequest);
        setFavoriteCourseIds([...favoriteCourseIds, course.id]);
        toast.success('Đã thêm vào danh sách yêu thích!');
      }
    } catch (err) {
      console.error('❌ Error toggling favorite:', err);
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra!');
    }
  };

  const handleLogout = () => {
    logout(navigate);
  };

  // Thêm loading state check
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-purple-500"></div>
          <p className="text-gray-400">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-white">Loading user info...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <Sidebar onLogout={handleLogout} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 backdrop-blur-sm" style={{ 
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--header-bg)'
        }}>
          <div className="flex items-center justify-between px-8 py-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Welcome back, {user.name}!</p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button 
                onClick={() => navigate("/profile")}
                className="rounded-lg bg-gray-200 dark:bg-gray-800 p-2 text-gray-600 dark:text-gray-400 transition hover:text-gray-900 dark:hover:text-white"
                title="Thông tin cá nhân"
              >
                <span className="material-symbols-outlined">account_circle</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {/* Search and Filter Bar */}
          <section className="mb-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Tìm kiếm khóa học..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg px-4 py-2 pl-10 placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                  style={{
                    border: `1px solid var(--input-border)`,
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-primary)'
                  }}
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  search
                </span>
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition"
                  style={{
                    backgroundColor: selectedCategory === "ALL" ? '#9333ea' : 'var(--card-bg)',
                    color: selectedCategory === "ALL" ? '#ffffff' : 'var(--text-secondary)',
                    border: `1px solid ${selectedCategory === "ALL" ? '#9333ea' : 'var(--card-border)'}`
                  }}
                >
                  Tất cả ({courses.length})
                </button>
                {categories.map((category) => {
                  const count = courses.filter((c) => c.categoryCode === category.code).length;
                  return (
                    <button
                      key={category.code}
                      onClick={() => setSelectedCategory(category.code)}
                      className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition"
                      style={{
                        backgroundColor: selectedCategory === category.code ? '#9333ea' : 'var(--card-bg)',
                        color: selectedCategory === category.code ? '#ffffff' : 'var(--text-secondary)',
                        border: `1px solid ${selectedCategory === category.code ? '#9333ea' : 'var(--card-border)'}`
                      }}
                    >
                      {category.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Stats Grid */}
          <section className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl p-6 hover:border-purple-500/50 transition course-card animate-slideUp animate-stagger-1" style={{ border: `1px solid var(--stat-card-border)`, backgroundColor: 'var(--stat-card-bg)' }}>
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <span className="material-symbols-outlined text-2xl text-blue-500">school</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{courses.length}</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tổng khóa học</p>
            </div>

            <div className="rounded-xl p-6 hover:border-green-500/50 transition course-card animate-slideUp animate-stagger-2" style={{ border: `1px solid var(--stat-card-border)`, backgroundColor: 'var(--stat-card-bg)' }}>
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-lg bg-green-500/10 p-3">
                  <span className="material-symbols-outlined text-2xl text-green-500">category</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{categories.length}</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Danh mục</p>
            </div>

            <div className="rounded-xl p-6 hover:border-orange-500/50 transition course-card animate-slideUp animate-stagger-3" style={{ border: `1px solid var(--stat-card-border)`, backgroundColor: 'var(--stat-card-bg)' }}>
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-lg bg-orange-500/10 p-3">
                  <span className="material-symbols-outlined text-2xl text-orange-500">trending_up</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {courses.filter((c) => c.level === "Beginner").length}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cơ bản</p>
            </div>

            <div className="rounded-xl p-6 hover:border-purple-500/50 transition course-card animate-slideUp animate-stagger-4" style={{ border: `1px solid var(--stat-card-border)`, backgroundColor: 'var(--stat-card-bg)' }}>
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-lg bg-purple-500/10 p-3">
                  <span className="material-symbols-outlined text-2xl text-purple-500">workspace_premium</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {courses.filter((c) => c.level === "Advanced").length}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nâng cao</p>
            </div>
          </section>

          {/* Courses Grid */}
          <section>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {selectedCategory === "ALL"
                    ? "Tất cả khóa học"
                    : categories.find((c) => c.code === selectedCategory)?.name || "Khóa học"}
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {filteredCourses.length} khóa học
                  {searchQuery && ` với từ khóa "${searchQuery}"`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-purple-500"></div>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="rounded-xl p-12 text-center" style={{ border: `1px solid var(--card-border)`, backgroundColor: 'var(--card-bg)' }}>
                <span className="material-symbols-outlined mb-4 text-6xl" style={{ color: 'var(--text-muted)' }}>
                  search_off
                </span>
                <h3 className="mb-2 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Không tìm thấy khóa học</h3>
                <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                  {searchQuery
                    ? `Không có khóa học nào phù hợp với "${searchQuery}"`
                    : "Chưa có khóa học trong danh mục này"}
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("ALL");
                  }}
                  className="rounded-lg bg-purple-600 px-6 py-2 font-medium text-white hover:bg-purple-700"
                >
                  Xem tất cả khóa học
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCourses.map((course, index) => (
                  <div
                    key={course.id}
                    onClick={() => navigate(`/course/${course.id}`)}
                    className="group overflow-hidden rounded-xl transition hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 course-card animate-slideUp cursor-pointer"
                    style={{ 
                      animationDelay: `${index * 0.05}s`,
                      border: `1px solid var(--card-border)`, 
                      backgroundColor: 'var(--card-bg)' 
                    }}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      {course.thumbnailUrl ? (
                        <img
                          src={getImageUrl(course.thumbnailUrl)}
                          alt={course.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                          onError={(e) => {
                            e.target.src = "https://via.placeholder.com/400x225/1a1a1a/666?text=No+Image";
                          }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="material-symbols-outlined text-6xl text-gray-700">
                            school
                          </span>
                        </div>
                      )}

                      {/* Discount Badge */}
                      {course.discountPercent > 0 && (
                        <div className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                          -{course.discountPercent}%
                        </div>
                      )}

                      {/* Level Badge */}
                      <div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                        {course.level}
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(course);
                        }}
                        className="absolute bottom-2 right-2 rounded-full bg-white/90 p-2 text-red-500 shadow-lg transition hover:bg-white hover:scale-110"
                        title={isFavorite(course.id) ? "Xóa khỏi yêu thích" : "Thêm vào yêu thích"}
                      >
                        <span className="material-symbols-outlined text-xl">
                          {isFavorite(course.id) ? "favorite" : "favorite_border"}
                        </span>
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3
                        onClick={() => navigate(`/course/${course.id}`)}
                        className="mb-2 line-clamp-2 cursor-pointer font-bold hover:text-purple-400"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {course.title}
                      </h3>

                      <p className="mb-3 line-clamp-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {course.description || "Khóa học chất lượng cao"}
                      </p>

                      {/* Instructor & Rating */}
                      {(course.instructorName || course.rating) && (
                        <div className="mb-3 flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {course.instructorName && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">person</span>
                              {course.instructorName}
                            </span>
                          )}
                          {course.rating && (
                            <>
                              {course.instructorName && <span>•</span>}
                              <span className="flex items-center gap-1">
                                <span className="text-yellow-500">⭐</span>
                                {course.rating}
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Duration & Students */}
                      <div className="mb-3 flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {course.duration && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            {course.duration}h
                          </span>
                        )}
                        {course.totalStudents && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">group</span>
                            {course.totalStudents.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid var(--border-color)` }}>
                        <div>
                          {course.discountedPrice ? (
                            <div>
                              <div className="text-lg font-bold text-purple-400">
                                {course.discountedPrice.toLocaleString("vi-VN")}₫
                              </div>
                              <div className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>
                                {course.price.toLocaleString("vi-VN")}₫
                              </div>
                            </div>
                          ) : (
                            <div className="text-lg font-bold text-purple-400">
                              {course.price.toLocaleString("vi-VN")}₫
                            </div>
                          )}
                        </div>

                        {enrolledCourseIds.has(course.id) ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/course/${course.id}/content`);
                            }}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition shadow-lg flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">play_circle</span>
                            Vào học
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/course/${course.id}`);
                            }}
                            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                          >
                            Chi tiết
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}