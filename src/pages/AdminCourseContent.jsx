import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminSidebar from "../component/AdminSidebar.jsx";
import LessonAPI from "../api/lessonAPI.jsx";
import toast from "../utils/toast.js";

export default function AdminCourseContent() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [courseName, setCourseName] = useState("");
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Chapter Modal State
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState(null);
  const [chapterForm, setChapterForm] = useState({
    courseId: courseId,
    title: "",
    description: "",
    order: 1,
  });

  // Lesson Modal State
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [currentChapterId, setCurrentChapterId] = useState(null);
  const [lessonForm, setLessonForm] = useState({
    chapterId: "",
    courseId: courseId,
    title: "",
    description: "",
    content: "",
    videoUrl: "",
    duration: "",
    order: 1,
    type: "VIDEO",
  });

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/auth");
      return;
    }
    fetchCourseContent();
  }, [courseId]);

  const fetchCourseContent = async () => {
    try {
      setLoading(true);
      
      // Lấy chapters
      const chaptersRes = await LessonAPI.getChaptersByCourseAdmin(courseId);
      if (chaptersRes.data.success) {
        const chaptersData = chaptersRes.data.data;
        
        // Load lessons cho từng chapter
        const chaptersWithLessons = await Promise.all(
          chaptersData.map(async (chapter) => {
            const lessonsRes = await LessonAPI.getLessonsByChapterAdmin(chapter.id);
            return {
              ...chapter,
              lessons: lessonsRes.data.success ? lessonsRes.data.data : []
            };
          })
        );

        setChapters(chaptersWithLessons);
      }
    } catch (err) {
      console.error("Error fetching course content:", err);
      toast.error(err.response?.data?.message || "Failed to load course content");
    } finally {
      setLoading(false);
    }
  };

  // ==================== CHAPTER HANDLERS ====================

  const handleCreateChapter = () => {
    setChapterForm({
      courseId: courseId,
      title: "",
      description: "",
      order: chapters.length + 1,
    });
    setEditingChapter(null);
    setShowChapterModal(true);
  };

  const handleEditChapter = (chapter) => {
    setChapterForm({
      courseId: courseId,
      title: chapter.title,
      description: chapter.description || "",
      order: chapter.order,
    });
    setEditingChapter(chapter);
    setShowChapterModal(true);
  };

  const handleSaveChapter = async () => {
    try {
      if (!chapterForm.title) {
        toast.warning("Please enter chapter title");
        return;
      }

      if (editingChapter) {
        const res = await LessonAPI.updateChapter(editingChapter.id, chapterForm);
        if (res.data.success) {
          toast.success("Chapter updated successfully!");
          fetchCourseContent();
          setShowChapterModal(false);
        }
      } else {
        const res = await LessonAPI.createChapter(chapterForm);
        if (res.data.success) {
          toast.success("Chapter created successfully!");
          fetchCourseContent();
          setShowChapterModal(false);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save chapter");
    }
  };

  const handleDeleteChapter = async (id) => {
    if (!window.confirm("Are you sure you want to delete this chapter?")) return;
    
    try {
      const res = await LessonAPI.deleteChapter(id);
      if (res.data.success) {
        toast.success("Chapter deleted successfully!");
        fetchCourseContent();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete chapter");
    }
  };

  // ==================== LESSON HANDLERS ====================

  const handleCreateLesson = (chapterId) => {
    setCurrentChapterId(chapterId);
    const chapter = chapters.find(c => c.id === chapterId);
    setLessonForm({
      chapterId: chapterId,
      courseId: courseId,
      title: "",
      description: "",
      content: "",
      videoUrl: "",
      duration: "",
      order: (chapter?.lessons?.length || 0) + 1,
      type: "VIDEO",
    });
    setEditingLesson(null);
    setShowLessonModal(true);
  };

  const handleEditLesson = (lesson, chapterId) => {
    setCurrentChapterId(chapterId);
    setLessonForm({
      chapterId: chapterId,
      courseId: courseId,
      title: lesson.title,
      description: lesson.description || "",
      content: lesson.content || "",
      videoUrl: lesson.videoUrl || "",
      duration: lesson.duration || "",
      order: lesson.order,
      type: lesson.type || "VIDEO",
    });
    setEditingLesson(lesson);
    setShowLessonModal(true);
  };

  const handleSaveLesson = async () => {
    try {
      if (!lessonForm.title || !lessonForm.chapterId) {
        toast.warning("Please fill in required fields");
        return;
      }

      const payload = {
        ...lessonForm,
        duration: lessonForm.duration ? parseFloat(lessonForm.duration) : 0,
        order: parseInt(lessonForm.order),
      };

      if (editingLesson) {
        const res = await LessonAPI.updateLesson(editingLesson.id, payload);
        if (res.data.success) {
          toast.success("Lesson updated successfully!");
          fetchCourseContent();
          setShowLessonModal(false);
        }
      } else {
        const res = await LessonAPI.createLesson(payload);
        if (res.data.success) {
          toast.success("Lesson created successfully!");
          fetchCourseContent();
          setShowLessonModal(false);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save lesson");
    }
  };

  const handleDeleteLesson = async (id) => {
    if (!window.confirm("Are you sure you want to delete this lesson?")) return;
    
    try {
      const res = await LessonAPI.deleteLesson(id);
      if (res.data.success) {
        toast.success("Lesson deleted successfully!");
        fetchCourseContent();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete lesson");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userEmail");
    navigate("/auth");
  };

  return (
    <div className="flex h-screen bg-gray-950">
      <AdminSidebar onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => navigate("/admin/courses")}
                  className="text-purple-400 hover:text-purple-300 mb-2 flex items-center gap-2"
                >
                  ← Back to Courses
                </button>
                <h1 className="text-2xl font-bold text-white">Course Content Management</h1>
                <p className="text-sm text-gray-400">Manage chapters and lessons</p>
              </div>
              <button
                onClick={handleCreateChapter}
                className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white transition hover:shadow-lg"
              >
                + Add Chapter
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-purple-500"></div>
                <p className="text-gray-400">Loading course content...</p>
              </div>
            </div>
          ) : chapters.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-16 text-center">
              <span className="material-symbols-outlined mb-4 text-6xl text-gray-600">
                school
              </span>
              <h3 className="mb-2 text-xl font-semibold text-white">No chapters yet</h3>
              <p className="mb-6 text-gray-400">Start building your course by adding chapters</p>
              <button
                onClick={handleCreateChapter}
                className="rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition hover:bg-purple-700"
              >
                Create First Chapter
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {chapters.map((chapter, idx) => (
                <div key={chapter.id} className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
                  {/* Chapter Header */}
                  <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 p-6 border-b border-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">
                          Chapter {idx + 1}: {chapter.title}
                        </h3>
                        <p className="text-gray-400 text-sm">{chapter.description}</p>
                        <div className="mt-2 text-xs text-gray-500">
                          {chapter.lessons?.length || 0} lessons
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCreateLesson(chapter.id)}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                        >
                          + Add Lesson
                        </button>
                        <button
                          onClick={() => handleEditChapter(chapter)}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteChapter(chapter.id)}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Lessons List */}
                  <div className="p-4">
                    {chapter.lessons && chapter.lessons.length > 0 ? (
                      <div className="space-y-2">
                        {chapter.lessons.map((lesson, lessonIdx) => (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between rounded-lg bg-gray-800 p-4 hover:bg-gray-750"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className="text-gray-500">#{lessonIdx + 1}</span>
                                <div>
                                  <h4 className="font-semibold text-white">{lesson.title}</h4>
                                  <p className="text-sm text-gray-400">{lesson.description}</p>
                                  <div className="flex items-center gap-4 mt-1">
                                    <span className="text-xs text-gray-500">
                                      {lesson.type || "VIDEO"}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      ⏱️ {lesson.duration || 0} min
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditLesson(lesson, chapter.id)}
                                className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-4">
                        No lessons yet. Click "Add Lesson" to create one.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Chapter Modal */}
      {showChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-gray-900 border border-gray-800 shadow-2xl">
            <div className="border-b border-gray-800 p-6">
              <h2 className="text-2xl font-bold text-white">
                {editingChapter ? "Edit Chapter" : "Create New Chapter"}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Enter chapter title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={chapterForm.description}
                  onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                  rows="3"
                  placeholder="Enter chapter description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Order
                </label>
                <input
                  type="number"
                  value={chapterForm.order}
                  onChange={(e) => setChapterForm({ ...chapterForm, order: parseInt(e.target.value) })}
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                  min="1"
                />
              </div>
            </div>

            <div className="border-t border-gray-800 p-6 flex justify-end gap-3">
              <button
                onClick={() => setShowChapterModal(false)}
                className="rounded-lg bg-gray-800 px-6 py-2 text-white hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChapter}
                className="rounded-lg bg-purple-600 px-6 py-2 font-semibold text-white hover:bg-purple-700"
              >
                {editingChapter ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl bg-gray-900 border border-gray-800 shadow-2xl my-8">
            <div className="border-b border-gray-800 p-6">
              <h2 className="text-2xl font-bold text-white">
                {editingLesson ? "Edit Lesson" : "Create New Lesson"}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Enter lesson title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                  rows="2"
                  placeholder="Enter lesson description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Content (HTML)
                </label>
                <textarea
                  value={lessonForm.content}
                  onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-white focus:border-purple-500 focus:outline-none font-mono text-sm"
                  rows="6"
                  placeholder="<p>Lesson content in HTML...</p>"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Video URL
                  </label>
                  <input
                    type="text"
                    value={lessonForm.videoUrl}
                    onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={lessonForm.duration}
                    onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Order
                </label>
                <input
                  type="number"
                  value={lessonForm.order}
                  onChange={(e) => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) })}
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                  min="1"
                />
              </div>
            </div>

            <div className="border-t border-gray-800 p-6 flex justify-end gap-3">
              <button
                onClick={() => setShowLessonModal(false)}
                className="rounded-lg bg-gray-800 px-6 py-2 text-white hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLesson}
                className="rounded-lg bg-purple-600 px-6 py-2 font-semibold text-white hover:bg-purple-700"
              >
                {editingLesson ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
