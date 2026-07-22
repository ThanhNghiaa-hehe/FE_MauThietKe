import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CourseAPI from "../api/courseAPI.jsx";
import { getImageUrl } from "../config/apiConfig.jsx";

export default function LandingPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    let filtered = courses;

    if (selectedCategory !== "ALL") {
      filtered = filtered.filter((course) => course.categoryCode === selectedCategory);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter((course) =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCourses(filtered);
  }, [courses, selectedCategory, searchQuery]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await CourseAPI.getAllPublishedCourses();

      console.log("📡 API Response:", res.data);

      if (res.data.success) {
        const coursesData = res.data.data || [];
        console.log("📚 Courses data:", coursesData);
        console.log("🖼️ First course thumbnail:", coursesData[0]?.thumbnailUrl);
        console.log("🔗 Image URL will be:", getImageUrl(coursesData[0]?.thumbnailUrl));
        setCourses(coursesData);

        // Extract unique categories
        const uniqueCategories = [...new Set(coursesData.map(c => c.categoryCode))]
          .filter(Boolean)
          .map(code => ({
            code,
            name: coursesData.find(c => c.categoryCode === code)?.categoryName || code
          }));
        setCategories(uniqueCategories);
      }
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginPrompt = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <span className="material-symbols-outlined text-purple-500 text-4xl">school</span>
            <h1 className="text-2xl font-bold">CodeLearn</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/my-invoices")}
              className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-700 text-gray-200 transition flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base text-purple-400">receipt_long</span>
              Tra cứu hóa đơn
            </button>

            <button
              onClick={() => navigate("/auth")}
              className="rounded-lg bg-purple-600 px-6 py-2 font-medium hover:bg-purple-700 text-white transition"
            >
              Đăng nhập / Đăng ký
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-gray-800 bg-gradient-to-b from-purple-900/20 to-transparent py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="mb-4 text-5xl font-bold">
            Master the Code. <span className="text-purple-400">Build Your Future.</span>
          </h2>
          <p className="mb-8 text-xl text-gray-400">
            Khám phá hàng trăm khóa học lập trình chất lượng cao
          </p>

          {/* Search Bar */}
          <div className="mx-auto max-w-2xl">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Tìm kiếm khóa học..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 py-3 pl-12 pr-4 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="border-b border-gray-800 bg-gray-900/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={`whitespace-nowrap rounded-lg px-4 py-2 font-medium transition ${
                selectedCategory === "ALL"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              Tất cả
            </button>
            {categories.map((cat) => (
              <button
                key={cat.code}
                onClick={() => setSelectedCategory(cat.code)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 font-medium transition ${
                  selectedCategory === cat.code
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h3 className="text-2xl font-bold">
            {selectedCategory === "ALL" ? "Tất cả khóa học" : categories.find(c => c.code === selectedCategory)?.name}
          </h3>
          <p className="text-gray-400">{filteredCourses.length} khóa học</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-purple-500"></div>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="py-20 text-center">
            <span className="material-symbols-outlined mb-4 text-6xl text-gray-700">search_off</span>
            <h3 className="mb-2 text-xl font-bold">Không tìm thấy khóa học</h3>
            <p className="text-gray-400">Thử tìm kiếm với từ khóa khác</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="group overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-gray-800">
                  {course.thumbnailUrl ? (
                    <img
                      src={getImageUrl(course.thumbnailUrl)}
                      alt={course.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                      onError={(e) => {
                        e.target.src = "http://localhost:8080/uploads/products/course-java-new.jpg";
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-gray-700">school</span>
                    </div>
                  )}

                  {course.discountPercent > 0 && (
                    <div className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-xs fon  t-bold text-white">
                      -{course.discountPercent}%
                    </div>
                  )}

                  <div className="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {course.level}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="mb-2 line-clamp-2 font-bold text-white group-hover:text-purple-400">
                    {course.title}
                  </h3>

                  <p className="mb-3 line-clamp-2 text-sm text-gray-400">
                    {course.description || "Khóa học chất lượng cao"}
                  </p>

                  <div className="mb-3 flex items-center gap-3 text-xs text-gray-500">
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

                  <div className="flex items-center justify-between border-t border-gray-800 pt-3">
                    <div>
                      {course.discountedPrice ? (
                        <div>
                          <div className="text-lg font-bold text-purple-400">
                            {course.discountedPrice.toLocaleString("vi-VN")}₫
                          </div>
                          <div className="text-xs text-gray-500 line-through">
                            {course.price.toLocaleString("vi-VN")}₫
                          </div>
                        </div>
                      ) : (
                        <div className="text-lg font-bold text-purple-400">
                          {course.price?.toLocaleString("vi-VN") || 0}₫
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleLoginPrompt}
                      className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                    >
                      Mua ngay
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-900 py-8">
        <div className="container mx-auto px-6 text-center text-gray-400">
          <p>&copy; 2025 CodeLearn. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
