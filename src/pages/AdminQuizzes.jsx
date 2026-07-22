import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminSidebar from "../component/AdminSidebar";
import AdminAPI from "../api/adminAPI";
import LessonAPI from "../api/lessonAPI";
import QuizAPI from "../api/quizAPI";
import toast from "../utils/toast";

const AdminQuizzes = () => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [chapters, setChapters] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);

  const [formData, setFormData] = useState({
    courseId: "",
    chapterId: "",
    title: "",
    description: "",
    timeLimit: 600, // seconds
    passingScore: 70,
    maxAttempts: 3,
    questions: [
      {
        id: `q${Date.now()}`,
        question: "",
        type: "SINGLE_CHOICE",
        points: 10,
        explanation: "",
        options: [
          { id: `opt${Date.now()}_1`, text: "", isCorrect: false },
          { id: `opt${Date.now()}_2`, text: "", isCorrect: false },
          { id: `opt${Date.now()}_3`, text: "", isCorrect: false },
          { id: `opt${Date.now()}_4`, text: "", isCorrect: false }
        ]
      }
    ]
  });

  const handleLogout = () => {
    localStorage.clear();
    navigate("/auth");
  };

  useEffect(() => {
    fetchCourses();
    fetchQuizzes();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchChapters(selectedCourse);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const response = await AdminAPI.getAllCourses();
      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách khóa học:", err);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const response = await QuizAPI.getAllQuizzes();
      if (response.data.success) {
        setQuizzes(response.data.data);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách bài quiz:", err);
    }
  };

  const fetchChapters = async (courseId) => {
    try {
      setLoading(true);
      const response = await LessonAPI.getChaptersByCourse(courseId);
      const chaptersData = Array.isArray(response.data) 
        ? response.data 
        : response.data?.data || [];
      setChapters(chaptersData);
    } catch (err) {
      console.error("Lỗi lấy danh sách chapters:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (quiz = null) => {
    if (quiz) {
      setEditingQuiz(quiz);
      setFormData({
        courseId: quiz.courseId || selectedCourse,
        chapterId: quiz.chapterId || "",
        title: quiz.title,
        description: quiz.description || "",
        timeLimit: quiz.timeLimit || 600,
        passingScore: quiz.passingScore || 70,
        maxAttempts: quiz.maxAttempts || 3,
        questions: quiz.questions || []
      });
    } else {
      setEditingQuiz(null);
      setFormData({
        courseId: selectedCourse,
        chapterId: "",
        title: "",
        description: "",
        timeLimit: 600,
        passingScore: 70,
        maxAttempts: 3,
        questions: [
          {
            id: `q${Date.now()}`,
            question: "",
            type: "SINGLE_CHOICE",
            points: 10,
            explanation: "",
            options: [
              { id: `opt${Date.now()}_1`, text: "", isCorrect: false },
              { id: `opt${Date.now()}_2`, text: "", isCorrect: false },
              { id: `opt${Date.now()}_3`, text: "", isCorrect: false },
              { id: `opt${Date.now()}_4`, text: "", isCorrect: false }
            ]
          }
        ]
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingQuiz(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = {
      ...newQuestions[index],
      [field]: value
    };
    setFormData(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleOptionChange = (questionIndex, optionIndex, field, value) => {
    const newQuestions = [...formData.questions];
    const options = [...newQuestions[questionIndex].options];
    
    if (field === 'isCorrect') {
      options.forEach((opt, idx) => {
        opt.isCorrect = (idx === optionIndex);
      });
    } else {
      options[optionIndex] = {
        ...options[optionIndex],
        [field]: value
      };
    }
    
    newQuestions[questionIndex].options = options;
    setFormData(prev => ({ ...prev, questions: newQuestions }));
  };

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: `q${Date.now()}`,
          question: "",
          type: "SINGLE_CHOICE",
          points: 10,
          explanation: "",
          options: [
            { id: `opt${Date.now()}_1`, text: "", isCorrect: false },
            { id: `opt${Date.now()}_2`, text: "", isCorrect: false },
            { id: `opt${Date.now()}_3`, text: "", isCorrect: false },
            { id: `opt${Date.now()}_4`, text: "", isCorrect: false }
          ]
        }
      ]
    }));
  };

  const removeQuestion = (index) => {
    if (formData.questions.length <= 1) {
      toast.error("Phải có ít nhất 1 câu hỏi!");
      return;
    }
    const newQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.chapterId) {
      toast.error("Vui lòng chọn Chương học (Chapter)!");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề bài Quiz!");
      return;
    }

    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.question.trim()) {
        toast.error(`Câu hỏi ${i + 1}: Vui lòng nhập nội dung câu hỏi!`);
        return;
      }

      const hasCorrect = q.options.some(opt => opt.isCorrect);
      if (!hasCorrect) {
        toast.error(`Câu hỏi ${i + 1}: Vui lòng chọn 1 đáp án đúng!`);
        return;
      }

      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text.trim()) {
          toast.error(`Câu hỏi ${i + 1}, Đáp án ${j + 1}: Không được để trống!`);
          return;
        }
      }
    }

    try {
      const submitPayload = {
        ...formData,
        courseId: selectedCourse,
        timeLimit: parseInt(formData.timeLimit),
        passingScore: parseInt(formData.passingScore),
        maxAttempts: parseInt(formData.maxAttempts)
      };

      let response;
      if (editingQuiz) {
        response = await QuizAPI.updateQuiz(editingQuiz.id, submitPayload);
      } else {
        response = await QuizAPI.createQuiz(submitPayload);
      }

      if (response.data.success) {
        toast.success(editingQuiz ? "Cập nhật Quiz thành công!" : "Tạo Quiz mới thành công!");
        handleCloseModal();
        fetchQuizzes();
      } else {
        toast.error(response.data.message || "Thao tác thất bại!");
      }
    } catch (err) {
      console.error("Error submitting quiz:", err);
      toast.error("Không thể lưu bài Quiz!");
    }
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài Quiz này?")) return;

    try {
      const response = await QuizAPI.deleteQuiz(quizId);
      if (response.data.success) {
        toast.success("Xóa Quiz thành công!");
        fetchQuizzes();
      } else {
        toast.error(response.data.message || "Xóa thất bại!");
      }
    } catch (err) {
      console.error("Error deleting quiz:", err);
      toast.error("Không thể xóa bài Quiz!");
    }
  };

  const filteredQuizzes = quizzes.filter(q => !selectedCourse || q.courseId === selectedCourse);

  return (
    <div className="flex h-screen bg-gray-950">
      <AdminSidebar onLogout={handleLogout} />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Quản lý Bài Kiểm Tra (Quizzes)</h1>
              <p className="text-gray-400">Tạo bài kiểm tra ở cuối mỗi Chapter để xác minh học viên vượt qua bài học</p>
            </div>

            {selectedCourse && (
              <button
                onClick={() => handleOpenModal()}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2 shadow-lg"
              >
                <span className="material-symbols-outlined">add</span>
                Tạo Quiz Chapter
              </button>
            )}
          </div>

          {/* Course Selector */}
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-8">
            <label className="block text-white font-semibold mb-2">Chọn Khóa học để xem Quiz</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl p-3.5 focus:border-purple-500 focus:outline-none"
            >
              <option value="">-- Chọn Khóa Học --</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          {/* Quizzes List */}
          {!selectedCourse ? (
            <div className="text-center py-16 bg-gray-900/50 rounded-2xl border border-gray-800">
              <span className="material-symbols-outlined text-6xl text-gray-600 mb-4 block">school</span>
              <p className="text-gray-400 text-lg">Vui lòng chọn một khóa học ở trên để quản lý bài Quiz</p>
            </div>
          ) : (
            <>
              {loading ? (
                <div className="text-center py-12 text-gray-400">Đang tải danh sách Quiz...</div>
              ) : filteredQuizzes.length === 0 ? (
                <div className="text-center py-16 bg-gray-900/50 rounded-2xl border border-gray-800">
                  <span className="material-symbols-outlined text-6xl text-gray-600 mb-4 block">quiz</span>
                  <p className="text-gray-400 text-lg mb-4">Chưa có bài Quiz nào cho khóa học này</p>
                  <button
                    onClick={() => handleOpenModal()}
                    className="bg-purple-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-purple-700 transition"
                  >
                    Tạo bài Quiz đầu tiên
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredQuizzes.map(quiz => {
                    const chapterObj = chapters.find(c => c.id === quiz.chapterId);
                    return (
                      <div
                        key={quiz.id}
                        className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-purple-500/50 transition-all flex justify-between items-center"
                      >
                        <div>
                          <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-xs font-semibold mb-2 inline-block">
                            Chapter: {chapterObj?.title || quiz.chapterId || "Toàn chương"}
                          </span>
                          <h3 className="text-xl font-bold text-white mb-2">{quiz.title}</h3>
                          
                          <div className="flex gap-6 text-sm text-gray-400">
                            <span>❓ {quiz.questions?.length || 0} câu hỏi</span>
                            <span>⏱️ {Math.round((quiz.timeLimit || 600) / 60)} phút</span>
                            <span>🎯 Đạt: {quiz.passingScore || 70}%</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenModal(quiz)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-500 transition text-sm font-semibold flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            Sửa
                          </button>
                          
                          <button
                            onClick={() => handleDelete(quiz.id)}
                            className="bg-red-600/80 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition text-sm font-semibold flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                            Xóa
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-3xl max-w-4xl w-full my-8 border border-gray-800 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 z-10 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400">quiz</span>
                {editingQuiz ? "Chỉnh sửa Quiz Chapter" : "Tạo Quiz Chapter Mới"}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Chapter Select (Replaced Lesson select) */}
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">Chương học (Chapter) áp dụng Quiz *</label>
                <select
                  name="chapterId"
                  value={formData.chapterId}
                  onChange={handleInputChange}
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl p-3 focus:border-purple-500 focus:outline-none"
                  required
                >
                  <option value="">-- Chọn Chương học --</option>
                  {chapters.map(ch => (
                    <option key={ch.id} value={ch.id}>
                      Chương {ch.order}: {ch.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">Tiêu đề bài Quiz *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="VD: Bài kiểm tra xác minh Chapter 1"
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl p-3 focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-300 text-xs font-semibold mb-1">Thời gian (giây):</label>
                  <input
                    type="number"
                    name="timeLimit"
                    value={formData.timeLimit}
                    onChange={handleInputChange}
                    className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl p-3"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-xs font-semibold mb-1">Điểm đạt (%):</label>
                  <input
                    type="number"
                    name="passingScore"
                    value={formData.passingScore}
                    onChange={handleInputChange}
                    className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl p-3"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-xs font-semibold mb-1">Số lần làm tối đa:</label>
                  <input
                    type="number"
                    name="maxAttempts"
                    value={formData.maxAttempts}
                    onChange={handleInputChange}
                    className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl p-3"
                  />
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-6 pt-4 border-t border-gray-800">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white">Danh sách Câu hỏi ({formData.questions.length})</h3>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Thêm câu hỏi
                  </button>
                </div>

                {formData.questions.map((q, qIndex) => (
                  <div key={q.id || qIndex} className="bg-gray-950 p-5 rounded-2xl border border-gray-800 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-purple-400 text-sm">Câu {qIndex + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="text-red-400 text-xs hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        Xóa câu hỏi
                      </button>
                    </div>

                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                      placeholder="Nhập nội dung câu hỏi..."
                      className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl p-3 text-sm focus:border-purple-500 focus:outline-none"
                    />

                    <div className="space-y-2 pl-4 border-l-2 border-purple-500/30">
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Các phương án (tích chọn đáp án đúng):</label>
                      {q.options.map((opt, optIndex) => (
                        <div key={opt.id || optIndex} className="flex items-center gap-3">
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={opt.isCorrect}
                            onChange={(e) => handleOptionChange(qIndex, optIndex, 'isCorrect', e.target.checked)}
                            className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                          />
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => handleOptionChange(qIndex, optIndex, 'text', e.target.value)}
                            placeholder={`Đáp án ${optIndex + 1}...`}
                            className="flex-1 bg-gray-900 border border-gray-800 text-white rounded-xl p-2.5 text-xs focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold text-sm transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-sm transition shadow-lg shadow-purple-500/20"
                >
                  {editingQuiz ? "Lưu thay đổi" : "Tạo Quiz"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQuizzes;
