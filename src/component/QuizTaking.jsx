import React, { useState, useEffect, useRef } from "react";
import QuizAPI from "../api/quizAPI";
import toast from "../utils/toast";

/**
 * Component để học viên làm quiz
 */
const QuizTaking = ({ quizId, onComplete, onClose }) => {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    loadQuiz();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const response = await QuizAPI.getQuiz(quizId);
      
      if (response.data.success) {
        const quizData = response.data.data;
        setQuiz(quizData);
        setStartedAt(new Date().toISOString());
        
        // Khởi tạo timer nếu có giới hạn thời gian
        if (quizData.timeLimit) {
          setTimeLeft(quizData.timeLimit);
          startTimer();
        }
      } else {
        toast.error("Không thể tải quiz");
      }
    } catch (error) {
      console.error("Error loading quiz:", error);
      toast.error(error.response?.data?.message || "Lỗi khi tải quiz");
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerChange = (questionId, optionId, isMultiple) => {
    setAnswers((prev) => {
      if (isMultiple) {
        const current = prev[questionId] || [];
        const exists = current.includes(optionId);
        return {
          ...prev,
          [questionId]: exists
            ? current.filter((id) => id !== optionId)
            : [...current, optionId],
        };
      } else {
        return {
          ...prev,
          [questionId]: [optionId],
        };
      }
    });
  };

  const handleAutoSubmit = () => {
    toast.warning("Hết giờ! Tự động nộp bài...");
    handleSubmit();
  };

  const handleSubmit = async () => {
    // Kiểm tra đã trả lời hết chưa
    const unanswered = quiz.questions.filter(
      (q) => !answers[q.id] || answers[q.id].length === 0
    );

    if (unanswered.length > 0) {
      const confirm = window.confirm(
        `Bạn còn ${unanswered.length} câu chưa trả lời. Bạn có chắc muốn nộp bài?`
      );
      if (!confirm) return;
    }

    try {
      setSubmitting(true);
      if (timerRef.current) clearInterval(timerRef.current);

      // Tính thời gian làm bài
      const now = new Date();
      const started = new Date(startedAt);
      const timeSpent = Math.floor((now - started) / 1000);

      // Chuẩn bị dữ liệu submit
      const submitData = {
        quizId: quiz.id,
        answers: quiz.questions.map((q) => ({
          questionId: q.id,
          selectedOptions: answers[q.id] || [],
        })),
        timeSpent,
        startedAt,
      };

      const response = await QuizAPI.submitQuiz(submitData);

      if (response.data.success) {
        const resultData = response.data.data;
        setResult(resultData);
        
        if (resultData.passed) {
          toast.success(`🎉 Chúc mừng! Bạn đã đạt ${resultData.score}%`);
          // Gọi callback để unlock chapter tiếp theo
          if (onComplete) {
            setTimeout(() => onComplete(resultData), 2000);
          }
        } else {
          toast.error(`Chưa đạt! Điểm của bạn: ${resultData.score}% (Cần ${quiz.passingScore}%)`);
        }
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error(error.response?.data?.message || "Lỗi khi nộp bài");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">Không tìm thấy quiz</p>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Đóng
        </button>
      </div>
    );
  }

  // Hiển thị kết quả
  if (result) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                result.passed ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <span className="text-4xl">
                {result.passed ? "✅" : "❌"}
              </span>
            </div>
            <h2 className="text-3xl font-bold mb-2">
              {result.passed ? "Chúc mừng!" : "Chưa đạt"}
            </h2>
            <p className="text-gray-600 mb-4">{result.message}</p>
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {result.score}%
                </div>
                <div className="text-sm text-gray-600">Điểm số</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {result.correctAnswers}/{result.totalQuestions}
                </div>
                <div className="text-sm text-gray-600">Đúng/Tổng</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-600">
                  {formatTime(result.timeSpent)}
                </div>
                <div className="text-sm text-gray-600">Thời gian</div>
              </div>
            </div>
          </div>

          {/* Chi tiết từng câu */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold mb-4">Chi tiết bài làm</h3>
            {result.details.map((detail, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  detail.correct
                    ? "border-green-300 bg-green-50"
                    : "border-red-300 bg-red-50"
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span
                    className={`text-2xl ${
                      detail.correct ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {detail.correct ? "✓" : "✗"}
                  </span>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">
                      Câu {index + 1}: {detail.questionText}
                    </h4>
                    <div className="space-y-2">
                      {detail.correctOptions && (
                        <div className="text-sm">
                          <span className="font-medium text-green-700">
                            Đáp án đúng:{" "}
                          </span>
                          <span>{detail.correctOptions.join(", ")}</span>
                        </div>
                      )}
                      {detail.userAnswers && detail.userAnswers.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">
                            Câu trả lời của bạn:{" "}
                          </span>
                          <span>{detail.userAnswers.join(", ")}</span>
                        </div>
                      )}
                      {!detail.correct && detail.explanation && (
                        <div className="text-sm text-gray-700 mt-2 p-3 bg-yellow-50 rounded border border-yellow-200">
                          <span className="font-medium">💡 Giải thích: </span>
                          {detail.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-center gap-4">
            {!result.passed && quiz.maxAttempts && result.attemptNumber >= quiz.maxAttempts ? (
              <div className="text-center">
                <p className="text-red-600 mb-4">
                  Bạn đã hết lượt làm bài ({quiz.maxAttempts} lần)
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Đóng
                </button>
              </div>
            ) : !result.passed ? (
              <>
                <button
                  onClick={() => {
                    setResult(null);
                    setAnswers({});
                    loadQuiz();
                  }}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Làm lại
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Đóng
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Tiếp tục học
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Hiển thị quiz
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="border-b pb-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-gray-600 mb-4">{quiz.description}</p>
          )}
          <div className="flex justify-between items-center">
            <div className="flex gap-6 text-sm text-gray-600">
              <span>📝 {quiz.questions.length} câu hỏi</span>
              <span>🎯 Điểm qua: {quiz.passingScore}%</span>
              {quiz.maxAttempts && (
                <span>🔄 Tối đa {quiz.maxAttempts} lần làm</span>
              )}
            </div>
            {timeLeft !== null && (
              <div
                className={`text-lg font-bold ${
                  timeLeft < 60 ? "text-red-600" : "text-gray-700"
                }`}
              >
                ⏱️ {formatTime(timeLeft)}
              </div>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-8">
          {quiz.questions.map((question, qIndex) => (
            <div key={question.id} className="border-b pb-6">
              <h3 className="text-lg font-semibold mb-4">
                Câu {qIndex + 1}: {question.text}
                {question.type === "MULTIPLE_CHOICE" && (
                  <span className="text-sm text-gray-500 ml-2">
                    (Chọn nhiều đáp án)
                  </span>
                )}
              </h3>
              <div className="space-y-3">
                {question.options.map((option) => {
                  const isSelected = answers[question.id]?.includes(option.id);
                  const isMultiple = question.type === "MULTIPLE_CHOICE";

                  return (
                    <label
                      key={option.id}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                        isSelected
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      <input
                        type={isMultiple ? "checkbox" : "radio"}
                        name={`question-${question.id}`}
                        checked={isSelected}
                        onChange={() =>
                          handleAnswerChange(question.id, option.id, isMultiple)
                        }
                        className="mr-3 h-5 w-5"
                      />
                      <span className="flex-1">{option.text}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Đang nộp bài..." : "Nộp bài"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizTaking;
