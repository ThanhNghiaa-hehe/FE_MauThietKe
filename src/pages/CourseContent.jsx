import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LessonAPI from "../api/lessonAPI";
import CourseAPI from "../api/courseAPI";
import ProgressAPI from "../api/progressAPI";
import ReviewAPI from "../api/reviewAPI";
import QuizAPI from "../api/quizAPI";
import CommentAPI from "../api/commentApi";
import useSEO from "../utils/useSEO";
import { jwtDecode } from "jwt-decode";
import toast from "../utils/toast.js";

const CourseContent = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedChapters, setExpandedChapters] = useState({});
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("content");

  // Advanced Real-time YouTube / Video Progress Tracking (via postMessage)
  const [isVideoFinished, setIsVideoFinished] = useState(false);
  const [videoProgressPercent, setVideoProgressPercent] = useState(0);

  // Lesson Comments Q&A State
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const videoRef = useRef(null);
  const iframeRef = useRef(null);

  useSEO(
    course ? `Học: ${course.title}` : "Khóa học",
    "Giao diện học lập trình trực tuyến CodeLearn"
  );

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.sub);
      } catch (err) {
        console.error("Error decoding token:", err);
      }
    }

    fetchData();
  }, [courseId]);

  // Supports youtube.com/watch?v=, youtu.be/, and youtube.com/embed/
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    let videoId = "";
    if (url.includes("youtube.com/watch?v=")) {
      videoId = url.split("v=")[1]?.split("&")[0];
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0];
    } else if (url.includes("youtube.com/embed/")) {
      videoId = url.split("embed/")[1]?.split("?")[0];
    }
    return videoId || null;
  };

  // Advanced Real-time YouTube postMessage Tracker
  useEffect(() => {
    if (!currentLesson) return;

    const isAlreadyCompleted = completedLessons.has(currentLesson.id) || completedLessons.has(currentLesson.lessonId);

    // IF LESSON IS ALREADY COMPLETED -> IMMEDIATELY UNLOCK BUTTON & SET 100%
    if (isAlreadyCompleted || !currentLesson.videoUrl) {
      setIsVideoFinished(true);
      setVideoProgressPercent(100);
      return;
    }

    setIsVideoFinished(false);
    setVideoProgressPercent(0);

    let activeWatchedSeconds = 0;
    const estimatedTotalSeconds = Math.max(15, Math.round((currentLesson.duration || 1) * 60));

    // Listen for official YouTube postMessage events
    const handleMessage = (event) => {
      try {
        if (typeof event.data !== "string") return;
        const data = JSON.parse(event.data);

        if (data.event === "infoDelivery" && data.info) {
          const { currentTime, duration, playerState } = data.info;
          if (duration && duration > 0 && currentTime !== undefined) {
            const pct = Math.min(100, Math.round((currentTime / duration) * 100));
            setVideoProgressPercent(pct);
            if (pct >= 80 || playerState === 0) {
              setIsVideoFinished(true);
            }
          }
        }
      } catch (e) {
        // Ignore non-JSON postMessage events
      }
    };

    window.addEventListener("message", handleMessage);

    // Poll YouTube Iframe & fallback interval
    const interval = setInterval(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "listening", id: 1 }),
            "*"
          );
        } catch (e) {}
      }

      // Backup active time counter in case postMessage is restricted
      activeWatchedSeconds += 1;
      const backupPct = Math.min(100, Math.round((activeWatchedSeconds / (estimatedTotalSeconds * 0.8)) * 100));
      setVideoProgressPercent((prev) => Math.max(prev, backupPct));

      if (backupPct >= 100) {
        setIsVideoFinished(true);
      }
    }, 1000);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearInterval(interval);
    };
  }, [currentLesson, completedLessons]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const courseRes = await CourseAPI.getCourseById(courseId);
      if (courseRes.data?.success) {
        setCourse(courseRes.data.data);
      }

      let quizzesMap = {};
      try {
        const quizRes = await QuizAPI.getAllQuizzes();
        if (quizRes.data?.success && Array.isArray(quizRes.data?.data)) {
          quizRes.data.data.forEach((q) => {
            if (q.chapterId) {
              quizzesMap[q.chapterId] = q;
            }
          });
        }
      } catch (err) {
        console.error("Lỗi tải danh sách quiz:", err);
      }

      const progressResponse = await ProgressAPI.getChaptersWithProgress(courseId);
      let loadedChapters = [];

      if (progressResponse.data?.success) {
        const chaptersWithProgress = progressResponse.data.data;

        loadedChapters = await Promise.all(
          chaptersWithProgress.map(async (chapter) => {
            try {
              const lessonsRes = await LessonAPI.getLessonsByChapter(chapter.chapterId);
              let lessons = Array.isArray(lessonsRes.data)
                ? lessonsRes.data
                : lessonsRes.data?.data || [];

              const quizObj = quizzesMap[chapter.chapterId];
              const finalQuizId = chapter.finalQuizId || (quizObj ? quizObj.id : null);

              return {
                chapterId: chapter.chapterId,
                title: chapter.title,
                description: chapter.description,
                order: chapter.order,
                totalLessons: chapter.totalLessons || lessons.length,
                completedLessons: chapter.completedLessons || 0,
                progressPercent: chapter.progressPercent || 0,
                isUnlocked: chapter.isUnlocked ?? true,
                finalQuizId: finalQuizId,
                quizPassed: chapter.quizPassed,
                quizScore: chapter.quizScore,
                lessons: lessons.map((l) => ({
                  lessonId: l.id,
                  id: l.id,
                  title: l.title,
                  description: l.description,
                  duration: l.duration,
                  order: l.order,
                  videoUrl: l.videoUrl,
                  videoType: l.videoType || l.contentType || "VIDEO",
                  content: l.content,
                  contentHtml: l.contentHtml,
                  isFree: l.isFree,
                })),
              };
            } catch (err) {
              return { ...chapter, lessons: [] };
            }
          })
        );
      } else {
        const chaptersRes = await LessonAPI.getChaptersByCourse(courseId);
        const chaptersData = Array.isArray(chaptersRes.data)
          ? chaptersRes.data
          : chaptersRes.data?.data || [];

        loadedChapters = await Promise.all(
          chaptersData.map(async (chapter, idx) => {
            const lessonsRes = await LessonAPI.getLessonsByChapter(chapter.id);
            const lessons = Array.isArray(lessonsRes.data)
              ? lessonsRes.data
              : lessonsRes.data?.data || [];

            const quizObj = quizzesMap[chapter.id];

            return {
              chapterId: chapter.id,
              title: chapter.title,
              description: chapter.description,
              order: chapter.order || idx + 1,
              totalLessons: lessons.length,
              completedLessons: 0,
              progressPercent: 0,
              isUnlocked: idx === 0,
              finalQuizId: quizObj ? quizObj.id : null,
              lessons: lessons.map((l) => ({
                lessonId: l.id,
                id: l.id,
                title: l.title,
                description: l.description,
                duration: l.duration,
                videoUrl: l.videoUrl,
                videoType: l.videoType || "VIDEO",
                content: l.content,
                contentHtml: l.contentHtml,
              })),
            };
          })
        );
      }

      setChapters(loadedChapters);

      const userProgressRes = await ProgressAPI.getCourseProgress(courseId);
      let completedSet = new Set();
      let currentLId = null;

      if (userProgressRes.data?.success && userProgressRes.data.data) {
        const prog = userProgressRes.data.data;
        if (prog.completedLessons) {
          completedSet = new Set(prog.completedLessons);
          setCompletedLessons(completedSet);
        }
        currentLId = prog.currentLessonId;
      }

      let targetLesson = null;
      let targetChapter = null;

      if (currentLId) {
        for (const ch of loadedChapters) {
          const found = ch.lessons?.find((l) => l.id === currentLId);
          if (found) {
            targetLesson = found;
            targetChapter = ch;
            break;
          }
        }
      }

      if (!targetLesson && loadedChapters.length > 0) {
        const firstUnlocked = loadedChapters.find((ch) => ch.isUnlocked) || loadedChapters[0];
        if (firstUnlocked?.lessons?.length > 0) {
          targetLesson = firstUnlocked.lessons[0];
          targetChapter = firstUnlocked;
        }
      }

      if (targetLesson && targetChapter) {
        setCurrentLesson(targetLesson);
        setCurrentChapter(targetChapter);
        setExpandedChapters({ [targetChapter.chapterId]: true });
      }

      fetchReviews();
    } catch (err) {
      console.error("Lỗi tải nội dung khóa học:", err);
    } finally {
      setLoading(false);
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
    }
  };

  useEffect(() => {
    if (currentLesson?.id) {
      fetchLessonComments(currentLesson.id);
    }
  }, [currentLesson]);

  const fetchLessonComments = async (lessonId) => {
    try {
      const res = await CommentAPI.getCommentsByLesson(lessonId);
      if (res.data?.success) {
        setComments(res.data.data || []);
      }
    } catch (err) {
      console.error("Lỗi tải bình luận bài học:", err);
    }
  };

  const handleCreateComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !currentLesson) return;

    try {
      setCommentLoading(true);
      const res = await CommentAPI.createComment({
        lessonId: currentLesson.id,
        courseId: courseId,
        content: newCommentText.trim(),
      });

      if (res.data?.success) {
        toast.success("Đã gửi câu hỏi / bình luận!");
        setNewCommentText("");
        fetchLessonComments(currentLesson.id);
      } else {
        toast.error(res.data?.message || "Gửi bình luận thất bại");
      }
    } catch (err) {
      console.error("Lỗi gửi bình luận:", err);
      toast.error("Vui lòng đăng nhập để gửi bình luận");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleSelectLesson = (lesson, chapter) => {
    if (!chapter.isUnlocked) {
      toast.error("🔒 Hãy hoàn thành các bài học và đạt Quiz của Chapter trước để mở khóa!");
      return;
    }

    setCurrentLesson(lesson);
    setCurrentChapter(chapter);
    setExpandedChapters((prev) => ({ ...prev, [chapter.chapterId]: true }));

    if (completedLessons.has(lesson.id) || completedLessons.has(lesson.lessonId)) {
      setIsVideoFinished(true);
      setVideoProgressPercent(100);
    }

    ProgressAPI.updateVideoProgress({
      lessonId: lesson.id,
      percent: completedLessons.has(lesson.id) ? 100 : 10,
    }).catch(() => {});
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setVideoProgressPercent(Math.round(percent));
      if (percent >= 80) {
        setIsVideoFinished(true);
      }
    }
  };

  const handleMarkComplete = async () => {
    if (!currentLesson) return;

    const lessonId = currentLesson.id;

    const nextCompletedSet = new Set(completedLessons);
    nextCompletedSet.add(lessonId);
    setCompletedLessons(nextCompletedSet);

    setChapters((prevChapters) =>
      prevChapters.map((ch) => {
        if (ch.chapterId === currentChapter?.chapterId) {
          const completedInCh = ch.lessons.filter((l) => nextCompletedSet.has(l.id)).length;
          return {
            ...ch,
            completedLessons: completedInCh,
            progressPercent: Math.round((completedInCh / (ch.totalLessons || 1)) * 100),
          };
        }
        return ch;
      })
    );

    try {
      await ProgressAPI.completeLesson(lessonId);
    } catch (err) {
      console.error("Background progress save error:", err);
    }

    if (currentChapter?.lessons) {
      const currentIndex = currentChapter.lessons.findIndex((l) => l.id === lessonId);
      if (currentIndex < currentChapter.lessons.length - 1) {
        const nextLesson = currentChapter.lessons[currentIndex + 1];
        setCurrentLesson(nextLesson);
      } else {
        if (currentChapter.finalQuizId && !currentChapter.quizPassed) {
          setActiveTab("quiz");
        }
      }
    }
  };

  const handleTakeQuiz = (quizId) => {
    if (!quizId) {
      toast.error("Bài kiểm tra chưa được thiết lập cho Chapter này.");
      return;
    }
    navigate(`/course/${courseId}/quiz/${quizId}`);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingReview(true);
      const res = await ReviewAPI.createReview({
        courseId,
        rating: newRating,
        comment: newComment.trim(),
      });

      if (res.data?.success) {
        toast.success("Đánh giá đã gửi!");
        setNewComment("");
        fetchReviews();
      }
    } catch (err) {
      toast.error("Không thể gửi đánh giá");
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleChapter = (chapterId) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  const totalCourseLessons = chapters.reduce((acc, ch) => acc + (ch.lessons?.length || 0), 0);
  const overallProgress = totalCourseLessons > 0 ? Math.round((completedLessons.size / totalCourseLessons) * 100) : 0;

  const currentChapterCompletedCount = currentChapter?.lessons?.filter((l) => completedLessons.has(l.id)).length || 0;
  const isCurrentChapterAllLessonsDone = currentChapter?.lessons?.length > 0 && currentChapterCompletedCount === currentChapter.lessons.length;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-slate-400 text-sm font-medium">Đang tải không gian học tập...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white font-sans overflow-hidden">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition flex items-center justify-center"
            title="Quay lại chi tiết khóa học"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="text-base font-bold text-white line-clamp-1">{course?.title || "Không gian Học tập"}</h1>
            <span className="text-xs text-slate-400">Giảng viên: {course?.instructorName || "CodeLearn Team"}</span>
          </div>
        </div>

        {/* Real-time Progress Bar */}
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-36 md:w-48 bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-purple-400 font-mono">{overallProgress}%</span>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Đã học: <span className="text-emerald-400 font-bold">{completedLessons.size}</span>/{totalCourseLessons} bài
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Main Player & Tabs */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-slate-950 p-4 md:p-6 custom-scrollbar">
          {/* Chapter Quiz Completion Banner */}
          {isCurrentChapterAllLessonsDone && currentChapter?.finalQuizId && !currentChapter?.quizPassed && (
            <div className="mb-4 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-500/50 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-pulse">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-yellow-400">emoji_events</span>
                  Chúc mừng! Bạn đã học xong tất cả bài học của {currentChapter.title}!
                </h3>
                <p className="text-xs text-purple-200 mt-1">
                  Hãy làm Bài kiểm tra Quiz xác minh năng lực để mở khóa Chapter tiếp theo.
                </p>
              </div>
              <button
                onClick={() => handleTakeQuiz(currentChapter.finalQuizId)}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">assignment</span>
                Bắt đầu làm Quiz Chapter
              </button>
            </div>
          )}

          {/* Video Player Box */}
          <div className="w-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl relative flex-shrink-0">
            {currentLesson ? (
              <div className="aspect-video w-full bg-black relative flex items-center justify-center">
                {currentLesson.videoUrl ? (
                  getYouTubeVideoId(currentLesson.videoUrl) ? (
                    <iframe
                      ref={iframeRef}
                      key={currentLesson.id}
                      title={currentLesson.title}
                      src={`https://www.youtube.com/embed/${getYouTubeVideoId(currentLesson.videoUrl)}?autoplay=1&enablejsapi=1`}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      key={currentLesson.id}
                      ref={videoRef}
                      src={currentLesson.videoUrl}
                      controls
                      autoPlay
                      onTimeUpdate={handleVideoTimeUpdate}
                      onEnded={() => setIsVideoFinished(true)}
                      className="w-full h-full object-contain"
                    />
                  )
                ) : (
                  <div className="p-8 text-center max-w-lg">
                    <span className="material-symbols-outlined text-6xl text-purple-400 mb-3">article</span>
                    <h3 className="text-xl font-bold text-white mb-2">{currentLesson.title}</h3>
                    <p className="text-sm text-slate-400 mb-4">Bài học dạng tài liệu hướng dẫn</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video w-full bg-slate-900 flex items-center justify-center text-slate-500">
                <span>Vui lòng chọn bài học từ danh sách bên phải</span>
              </div>
            )}

            {/* Video Controls Bar */}
            {currentLesson && (
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Bài {currentLesson.order || 1}
                    </span>
                    <h2 className="text-lg font-bold text-white">{currentLesson.title}</h2>
                  </div>
                  {currentLesson.duration && (
                    <span className="text-xs text-slate-400 mt-1 block">⏱️ Thời lượng: {currentLesson.duration} phút</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Real-time Video Percentage Badge */}
                  {!completedLessons.has(currentLesson.id) && (
                    <div className="text-xs font-mono text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-purple-400">timelapse</span>
                      <span>Tiến độ: <strong className="text-purple-300">{videoProgressPercent}%</strong> / 80%</span>
                    </div>
                  )}

                  <button
                    onClick={handleMarkComplete}
                    disabled={!isVideoFinished && !completedLessons.has(currentLesson.id)}
                    className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                      completedLessons.has(currentLesson.id)
                        ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30"
                        : isVideoFinished
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/20 animate-bounce"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {completedLessons.has(currentLesson.id)
                        ? "check_circle"
                        : isVideoFinished
                        ? "task_alt"
                        : "lock"}
                    </span>
                    {completedLessons.has(currentLesson.id)
                      ? "Đã hoàn thành"
                      : isVideoFinished
                      ? "Hoàn thành & Bài kế"
                      : "Cần xem ≥ 80% video"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 border-b border-slate-800 flex gap-6 text-sm font-medium">
            <button
              onClick={() => setActiveTab("content")}
              className={`pb-3 transition flex items-center gap-2 ${
                activeTab === "content" ? "text-purple-400 border-b-2 border-purple-500 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-sm">menu_book</span>
              Nội dung bài học
            </button>

            <button
              onClick={() => setActiveTab("quiz")}
              className={`pb-3 transition flex items-center gap-2 ${
                activeTab === "quiz" ? "text-purple-400 border-b-2 border-purple-500 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-sm">quiz</span>
              Bài kiểm tra Chapter (Quiz)
              {isCurrentChapterAllLessonsDone && currentChapter?.finalQuizId && !currentChapter?.quizPassed && (
                <span className="px-2 py-0.5 text-[10px] bg-purple-500 text-white rounded-full font-bold animate-bounce">
                  Cần làm
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("comments")}
              className={`pb-3 transition flex items-center gap-2 ${
                activeTab === "comments" ? "text-purple-400 border-b-2 border-purple-500 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-sm">question_answer</span>
              Hỏi đáp Bài học ({comments.length})
            </button>

            <button
              onClick={() => setActiveTab("reviews")}
              className={`pb-3 transition flex items-center gap-2 ${
                activeTab === "reviews" ? "text-purple-400 border-b-2 border-purple-500 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-sm">star</span>
              Đánh giá Khóa học ({reviews.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="py-6">
            {activeTab === "content" && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-slate-300 space-y-4">
                <h3 className="text-lg font-bold text-white mb-2">Mô tả bài học</h3>
                <p className="text-sm leading-relaxed text-slate-300">
                  {currentLesson?.description || "Không có mô tả chi tiết cho bài học này."}
                </p>
                {currentLesson?.contentHtml && (
                  <div
                    className="prose prose-invert max-w-none pt-4 border-t border-slate-800 text-sm"
                    dangerouslySetInnerHTML={{ __html: currentLesson.contentHtml }}
                  />
                )}
              </div>
            )}

            {activeTab === "quiz" && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-200">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400">quiz</span>
                  Kiểm tra Xác minh Chapter: {currentChapter?.title || "N/A"}
                </h3>
                <p className="text-xs text-slate-400 mb-6">
                  Hoàn thành toàn bộ bài học và đạt bài kiểm tra Quiz để mở khóa Chapter tiếp theo.
                </p>

                {currentChapter?.finalQuizId ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="font-semibold text-white text-base">Bài kiểm tra xác minh năng lực Chapter</div>
                      <div className="text-xs text-slate-400 mt-1">Yêu cầu đạt điểm vượt qua để mở khóa tiến độ tiếp theo</div>
                      {currentChapter.quizPassed ? (
                        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                          <span className="material-symbols-outlined text-sm">verified</span>
                          ĐÃ VƯỢT QUA (Điểm: {currentChapter.quizScore || 100}%)
                        </div>
                      ) : (
                        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                          <span className="material-symbols-outlined text-sm">pending</span>
                          CHƯA ĐẠT / CHƯA LÀM
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleTakeQuiz(currentChapter.finalQuizId)}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-purple-500/20 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">assignment</span>
                      {currentChapter.quizPassed ? "Làm lại Bài kiểm tra" : "Bắt đầu làm Bài kiểm tra"}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 border border-slate-800/60 rounded-xl">
                    <span className="material-symbols-outlined text-4xl mb-2 block">task_alt</span>
                    Chapter này không có bài kiểm tra Quiz bắt buộc.
                  </div>
                )}
              </div>
            )}

            {activeTab === "comments" && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-slate-300 space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400">question_answer</span>
                  Hỏi đáp & Thảo luận bài học: {currentLesson?.title || ""}
                </h3>

                {/* Form tạo bình luận */}
                <form onSubmit={handleCreateComment} className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder="Nhập thắc mắc hoặc câu hỏi của bạn về bài học này..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={commentLoading || !newCommentText.trim()}
                      className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-purple-500/20"
                    >
                      <span className="material-symbols-outlined text-sm">send</span>
                      Gửi câu hỏi
                    </button>
                  </div>
                </form>

                {/* Danh sách bình luận */}
                <div className="space-y-4 pt-2">
                  {comments.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      Chưa có câu hỏi nào cho bài học này. Hãy là người đầu tiên đặt câu hỏi!
                    </div>
                  ) : (
                    comments.map((cmt) => (
                      <div key={cmt.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-300 font-bold flex items-center justify-center text-xs border border-purple-500/30">
                              {cmt.userFullname?.[0]?.toUpperCase() || "H"}
                            </div>
                            <span className="font-semibold text-xs text-slate-200">{cmt.userFullname}</span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {cmt.createdAt ? new Date(cmt.createdAt).toLocaleString("vi-VN") : ""}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 pl-9">{cmt.content}</p>

                        {cmt.reply && (
                          <div className="ml-9 mt-2 p-3 bg-purple-950/40 border border-purple-800/40 rounded-xl text-xs space-y-1">
                            <div className="font-bold text-purple-400 flex items-center gap-1 text-[11px]">
                              <span className="material-symbols-outlined text-xs">verified_user</span>
                              Admin CSKH Trả lời:
                            </div>
                            <div className="text-slate-200 text-xs">{cmt.reply}</div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="space-y-6">
                <form onSubmit={handleSubmitReview} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <h4 className="text-base font-bold text-white mb-3">Thảo luận & Đánh giá bài học</h4>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-slate-400">Đánh giá:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button type="button" key={star} onClick={() => setNewRating(star)}>
                        <span className={`material-symbols-outlined text-lg ${star <= newRating ? "text-yellow-400" : "text-slate-600"}`}>
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows="3"
                    placeholder="Viết thắc mắc hoặc cảm nhận của bạn..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 mb-3"
                  />
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Gửi bình luận
                  </button>
                </form>

                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-white">{rev.userFullname || "Học viên"}</span>
                        <div className="flex text-yellow-400">
                          {[...Array(rev.rating || 5)].map((_, i) => (
                            <span key={i} className="material-symbols-outlined text-xs">star</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-300 text-xs">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="w-80 md:w-96 border-l border-slate-800 bg-slate-900/95 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-slate-800 font-bold text-white flex justify-between items-center">
            <span className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-purple-400 text-lg">format_list_bulleted</span>
              Danh sách bài học
            </span>
            <span className="text-xs text-slate-400 font-mono">{chapters.length} Chapters</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {chapters.map((ch, idx) => {
              const isExpanded = expandedChapters[ch.chapterId];
              const isUnlocked = ch.isUnlocked;
              const chCompletedCount = ch.lessons?.filter((l) => completedLessons.has(l.id)).length || 0;

              return (
                <div
                  key={ch.chapterId}
                  className={`rounded-2xl border transition overflow-hidden ${
                    isUnlocked
                      ? "border-slate-800 bg-slate-950/70"
                      : "border-slate-800/40 bg-slate-950/30 opacity-70"
                  }`}
                >
                  {/* Chapter Header */}
                  <button
                    onClick={() => toggleChapter(ch.chapterId)}
                    className="w-full p-4 flex items-start justify-between hover:bg-slate-800/40 transition text-left"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-purple-400">CHƯƠNG {idx + 1}</span>
                        {!isUnlocked && (
                          <span className="flex items-center gap-1 text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-medium">
                            <span className="material-symbols-outlined text-[12px]">lock</span> Khóa
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-white line-clamp-1">{ch.title}</h4>
                      <div className="text-xs text-slate-400 mt-1">
                        <span className="text-emerald-400 font-bold">{chCompletedCount}</span>/{ch.lessons?.length || 0} Bài học
                      </div>
                    </div>

                    <span className="material-symbols-outlined text-slate-400 text-sm">
                      {isExpanded ? "expand_less" : "expand_more"}
                    </span>
                  </button>

                  {/* Chapter Lessons List */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 p-2 space-y-1 bg-slate-950/90">
                      {ch.lessons?.map((les, lIdx) => {
                        const isDone = completedLessons.has(les.id);
                        const isActive = currentLesson?.id === les.id;

                        return (
                          <button
                            key={les.id}
                            onClick={() => handleSelectLesson(les, ch)}
                            className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition ${
                              isActive
                                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 font-semibold"
                                : "hover:bg-slate-900 text-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="material-symbols-outlined text-base flex-shrink-0">
                                {isDone
                                  ? "check_circle"
                                  : isActive
                                  ? "play_circle"
                                  : !isUnlocked
                                  ? "lock"
                                  : "circle"}
                              </span>
                              <span className="text-xs truncate">
                                {lIdx + 1}. {les.title}
                              </span>
                            </div>

                            {les.duration && (
                              <span className="text-[10px] text-slate-500 font-mono ml-2 flex-shrink-0">
                                {les.duration}m
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {/* Chapter Quiz Section */}
                      {ch.finalQuizId && (
                        <div className="mt-2 pt-2 border-t border-slate-800">
                          <button
                            onClick={() => handleTakeQuiz(ch.finalQuizId)}
                            className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition ${
                              ch.quizPassed
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : isUnlocked
                                ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 font-semibold hover:bg-purple-600/30"
                                : "bg-slate-900 text-slate-500 opacity-60 cursor-not-allowed"
                            }`}
                          >
                            <div className="flex items-center gap-2 text-xs">
                              <span className="material-symbols-outlined text-sm">quiz</span>
                              <span>Bài kiểm tra Chapter {idx + 1}</span>
                            </div>

                            {ch.quizPassed ? (
                              <span className="text-[10px] font-bold text-emerald-400">ĐÃ ĐẠT</span>
                            ) : (
                              <span className="text-[10px] font-bold text-purple-400">LÀM BÀI</span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CourseContent;
