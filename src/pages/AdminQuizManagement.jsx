import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QuizAPI from "../api/quizAPI";
import LessonAPI from "../api/lessonAPI";
import toast from "../utils/toast";

/**
 * Admin page để quản lý Quiz của Course
 */
const AdminQuizManagement = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [formData, setFormData] = useState({
    chapterId: "",
    title: "",
    description: "",
    passingScore: 70,
    timeLimit: null,
    maxAttempts: null,
    questions: [],
  });

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load chapters
      const chaptersRes = await LessonAPI.getChaptersByCourseAdmin(courseId);
      if (chaptersRes.data.success) {
        setChapters(chaptersRes.data.data);
      }

      // Load quizzes
      try {
        const quizzesRes = await QuizAPI.getQuizzesByCourse(courseId);
        if (quizzesRes.data.success) {
          setQuizzes(quizzesRes.data.data || []);
        }
      } catch (err) {
        // Nếu chưa có quiz nào thì OK
        setQuizzes([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = () => {
    setEditingQuiz(null);
    setFormData({
      chapterId: "",
      title: "",
      description: "",
      passingScore: 70,
      timeLimit: 600, // 10 phút mặc định
      maxAttempts: 3,
      questions: [
        {
          id: `q${Date.now()}`,
          text: "",
          type: "SINGLE_CHOICE",
          options: [
            { id: `opt${Date.now()}_1`, text: "", isCorrect: false },
            { id: `opt${Date.now()}_2`, text: "", isCorrect: false },
          ],
          explanation: "",
        },
      ],
    });
    setShowModal(true);
  };

  const handleEditQuiz = async (quiz) => {
    try {
      // Load full quiz data with answers
      const response = await QuizAPI.getQuizByIdAdmin(quiz.id);
      if (response.data.success) {
        const fullQuiz = response.data.data;
        setEditingQuiz(fullQuiz);
        setFormData({
          chapterId: fullQuiz.chapterId || "",
          title: fullQuiz.title,
          description: fullQuiz.description || "",
          passingScore: fullQuiz.passingScore,
          timeLimit: fullQuiz.timeLimit,
          maxAttempts: fullQuiz.maxAttempts,
          questions: fullQuiz.questions,
        });
        setShowModal(true);
      }
    } catch (error) {
      console.error("Error loading quiz:", error);
      toast.error("Lỗi khi tải quiz");
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Bạn có chắc muốn xóa quiz này?")) return;

    try {
      await QuizAPI.deleteQuiz(quizId);
      toast.success("Đã xóa quiz");
      loadData();
    } catch (error) {
      console.error("Error deleting quiz:", error);
      toast.error("Lỗi khi xóa quiz");
    }
  };

  const handleSaveQuiz = async () => {
    // Validation
    if (!formData.chapterId) {
      toast.error("Vui lòng chọn Chapter");
      return;
    }
    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề");
      return;
    }
    if (formData.questions.length === 0) {
      toast.error("Phải có ít nhất 1 câu hỏi");
      return;
    }

    // Validate questions
    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.text.trim()) {
        toast.error(`Câu ${i + 1}: Chưa nhập nội dung câu hỏi`);
        return;
      }
      if (q.options.length < 2) {
        toast.error(`Câu ${i + 1}: Phải có ít nhất 2 đáp án`);
        return;
      }
      const hasCorrect = q.options.some((opt) => opt.isCorrect);
      if (!hasCorrect) {
        toast.error(`Câu ${i + 1}: Phải đánh dấu ít nhất 1 đáp án đúng`);
        return;
      }
    }

    try {
      const quizData = {
        courseId,
        chapterId: formData.chapterId,
        title: formData.title,
        description: formData.description,
        passingScore: parseInt(formData.passingScore),
        timeLimit: formData.timeLimit ? parseInt(formData.timeLimit) : null,
        maxAttempts: formData.maxAttempts ? parseInt(formData.maxAttempts) : null,
        questions: formData.questions,
      };

      if (editingQuiz) {
        // Update
        await QuizAPI.updateQuiz(editingQuiz.id, quizData);
        toast.success("Đã cập nhật quiz");
      } else {
        // Create
        await QuizAPI.createQuiz(quizData);
        toast.success("Đã tạo quiz");
      }

      setShowModal(false);
      loadData();
    } catch (error) {
      console.error("Error saving quiz:", error);
      toast.error(error.response?.data?.message || "Lỗi khi lưu quiz");
    }
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          id: `q${Date.now()}`,
          text: "",
          type: "SINGLE_CHOICE",
          options: [
            { id: `opt${Date.now()}_1`, text: "", isCorrect: false },
            { id: `opt${Date.now()}_2`, text: "", isCorrect: false },
          ],
          explanation: "",
        },
      ],
    });
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...formData.questions];
    newQuestions[index][field] = value;
    setFormData({ ...formData, questions: newQuestions });
  };

  const deleteQuestion = (index) => {
    const newQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: newQuestions });
  };

  const addOption = (questionIndex) => {
    const newQuestions = [...formData.questions];
    newQuestions[questionIndex].options.push({
      id: `opt${Date.now()}`,
      text: "",
      isCorrect: false,
    });
    setFormData({ ...formData, questions: newQuestions });
  };

  const updateOption = (questionIndex, optionIndex, field, value) => {
    const newQuestions = [...formData.questions];
    
    // Nếu chuyển isCorrect và là SINGLE_CHOICE, bỏ các option khác
    if (field === "isCorrect" && value && newQuestions[questionIndex].type === "SINGLE_CHOICE") {
      newQuestions[questionIndex].options.forEach((opt, i) => {
        opt.isCorrect = i === optionIndex;
      });
    } else {
      newQuestions[questionIndex].options[optionIndex][field] = value;
    }
    
    setFormData({ ...formData, questions: newQuestions });
  };

  const deleteOption = (questionIndex, optionIndex) => {
    const newQuestions = [...formData.questions];
    newQuestions[questionIndex].options = newQuestions[questionIndex].options.filter(
      (_, i) => i !== optionIndex
    );
    setFormData({ ...formData, questions: newQuestions });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold mb-2">Quản lý Quiz</h1>
              <p className="text-gray-600">Quản lý quiz cho từng chapter</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/admin/courses")}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                ← Quay lại
              </button>
              <button
                onClick={handleCreateQuiz}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                + Tạo Quiz Mới
              </button>
            </div>
          </div>
        </div>

        {/* Quizzes List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Danh sách Quiz</h2>
          </div>
          <div className="p-6">
            {quizzes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">Chưa có quiz nào</p>
                <p className="text-sm">Tạo quiz để kiểm tra kiến thức học viên</p>
              </div>
            ) : (
              <div className="space-y-4">
                {quizzes.map((quiz) => {
                  const chapter = chapters.find((ch) => ch.id === quiz.chapterId);
                  return (
                    <div
                      key={quiz.id}
                      className="border rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{quiz.title}</h3>
                          {chapter && (
                            <p className="text-sm text-purple-600 mb-2">
                              📚 Chapter: {chapter.title}
                            </p>
                          )}
                          {quiz.description && (
                            <p className="text-gray-600 text-sm mb-3">
                              {quiz.description}
                            </p>
                          )}
                          <div className="flex gap-4 text-sm text-gray-500">
                            <span>📝 {quiz.questions?.length || 0} câu hỏi</span>
                            <span>🎯 Điểm qua: {quiz.passingScore}%</span>
                            {quiz.timeLimit && (
                              <span>⏱️ {Math.floor(quiz.timeLimit / 60)} phút</span>
                            )}
                            {quiz.maxAttempts && (
                              <span>🔄 Tối đa {quiz.maxAttempts} lần</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditQuiz(quiz)}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteQuiz(quiz.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Create/Edit Quiz */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <h2 className="text-2xl font-bold">
                {editingQuiz ? "Chỉnh sửa Quiz" : "Tạo Quiz Mới"}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block font-medium mb-2">Chapter *</label>
                  <select
                    value={formData.chapterId}
                    onChange={(e) =>
                      setFormData({ ...formData, chapterId: e.target.value })
                    }
                    className="w-full p-2 border rounded"
                  >
                    <option value="">-- Chọn Chapter --</option>
                    {chapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-2">Tiêu đề *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full p-2 border rounded"
                    placeholder="VD: Kiểm tra kiến thức Chapter 1"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-2">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full p-2 border rounded"
                    rows="3"
                    placeholder="Mô tả về quiz này..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block font-medium mb-2">Điểm qua (%)</label>
                    <input
                      type="number"
                      value={formData.passingScore}
                      onChange={(e) =>
                        setFormData({ ...formData, passingScore: e.target.value })
                      }
                      className="w-full p-2 border rounded"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-2">
                      Thời gian (giây)
                    </label>
                    <input
                      type="number"
                      value={formData.timeLimit || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          timeLimit: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      className="w-full p-2 border rounded"
                      placeholder="Không giới hạn"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-2">Số lần làm</label>
                    <input
                      type="number"
                      value={formData.maxAttempts || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxAttempts: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        })
                      }
                      className="w-full p-2 border rounded"
                      placeholder="Không giới hạn"
                    />
                  </div>
                </div>
              </div>

              {/* Questions */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg">Câu hỏi</h3>
                  <button
                    onClick={addQuestion}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    + Thêm câu hỏi
                  </button>
                </div>

                <div className="space-y-6">
                  {formData.questions.map((question, qIndex) => (
                    <div key={question.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium">Câu {qIndex + 1}</h4>
                        <button
                          onClick={() => deleteQuestion(qIndex)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Xóa câu
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Nội dung câu hỏi *
                          </label>
                          <input
                            type="text"
                            value={question.text}
                            onChange={(e) =>
                              updateQuestion(qIndex, "text", e.target.value)
                            }
                            className="w-full p-2 border rounded"
                            placeholder="Nhập câu hỏi..."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Loại câu hỏi
                          </label>
                          <select
                            value={question.type}
                            onChange={(e) =>
                              updateQuestion(qIndex, "type", e.target.value)
                            }
                            className="w-full p-2 border rounded"
                          >
                            <option value="SINGLE_CHOICE">Một đáp án đúng</option>
                            <option value="MULTIPLE_CHOICE">Nhiều đáp án đúng</option>
                            <option value="TRUE_FALSE">Đúng/Sai</option>
                          </select>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium">
                              Các đáp án *
                            </label>
                            <button
                              onClick={() => addOption(qIndex)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              + Thêm đáp án
                            </button>
                          </div>
                          <div className="space-y-2">
                            {question.options.map((option, oIndex) => (
                              <div
                                key={option.id}
                                className="flex items-center gap-2"
                              >
                                <input
                                  type={
                                    question.type === "MULTIPLE_CHOICE"
                                      ? "checkbox"
                                      : "radio"
                                  }
                                  checked={option.isCorrect}
                                  onChange={(e) =>
                                    updateOption(
                                      qIndex,
                                      oIndex,
                                      "isCorrect",
                                      e.target.checked
                                    )
                                  }
                                  className="h-4 w-4"
                                />
                                <input
                                  type="text"
                                  value={option.text}
                                  onChange={(e) =>
                                    updateOption(
                                      qIndex,
                                      oIndex,
                                      "text",
                                      e.target.value
                                    )
                                  }
                                  className="flex-1 p-2 border rounded"
                                  placeholder={`Đáp án ${oIndex + 1}`}
                                />
                                <button
                                  onClick={() => deleteOption(qIndex, oIndex)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Xóa
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Giải thích (hiển thị khi trả lời sai)
                          </label>
                          <textarea
                            value={question.explanation}
                            onChange={(e) =>
                              updateQuestion(qIndex, "explanation", e.target.value)
                            }
                            className="w-full p-2 border rounded"
                            rows="2"
                            placeholder="Giải thích đáp án đúng..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveQuiz}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                {editingQuiz ? "Cập nhật" : "Tạo Quiz"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQuizManagement;
