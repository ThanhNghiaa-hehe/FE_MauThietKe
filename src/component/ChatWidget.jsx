import React, { useState, useEffect, useRef } from "react";
import ChatAPI from "../api/chatApi";
import toast from "../utils/toast";

const FAQ_BOT_DATA = [
  {
    id: 1,
    question: "💳 Hướng dẫn thanh toán PayOS như thế nào?",
    answer: "Bạn chỉ cần chọn khóa học -> Bấm 'Thanh toán ngay'. Hệ thống sẽ tạo mã QR PayOS. Mở ứng dụng ngân hàng quét mã QR để thanh toán. Khóa học sẽ được mở tự động và email biên nhận sẽ được gửi tới Gmail của bạn!"
  },
  {
    id: 2,
    question: "🔑 Quên mật khẩu hoặc không nhận được OTP?",
    answer: "Hãy bấm vào 'Quên mật khẩu' tại màn hình Đăng nhập và nhập Email. Mã OTP 6 chữ số sẽ được gửi về Email. Nhập mã OTP 6 ô để tiến hành đổi mật khẩu mới."
  },
  {
    id: 3,
    question: "📜 Làm sao để xem lại Hóa đơn mua hàng?",
    answer: "Bạn có thể vào mục 'Lịch sử Hóa đơn' trên menu hoặc truy cập đường dẫn Tra cứu hóa đơn qua SĐT mà không cần đăng nhập!"
  },
  {
    id: 4,
    question: "🎓 Sau khi thanh toán xong xem khóa học ở đâu?",
    answer: "Khóa học đã mua sẽ xuất hiện ngay trong mục 'My Courses' (Khóa học của tôi). Bạn bấm vào để vào học video và làm trắc nghiệm Quiz."
  }
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("bot"); // 'bot' | 'live'
  const [botMessages, setBotMessages] = useState([
    { sender: "bot", text: "Xin chào! Mình là Trợ lý AI CodeLearn. Bạn cần hỗ trợ thông tin gì?" }
  ]);
  const [liveMessages, setLiveMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const isLoggedIn = !!localStorage.getItem("accessToken");

  useEffect(() => {
    let interval;
    if (isOpen && activeTab === "live" && isLoggedIn) {
      fetchLiveMessages();
      interval = setInterval(fetchLiveMessages, 3000);
    }
    return () => clearInterval(interval);
  }, [isOpen, activeTab, isLoggedIn]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [botMessages, liveMessages, activeTab]);

  const fetchLiveMessages = async () => {
    try {
      const res = await ChatAPI.getUserMessages();
      if (res.data?.success) {
        setLiveMessages(res.data.data || []);
      }
    } catch (err) {
      console.error("Lỗi lấy tin nhắn live:", err);
    }
  };

  const handleFaqClick = (faq) => {
    setBotMessages((prev) => [
      ...prev,
      { sender: "user", text: faq.question },
      { sender: "bot", text: faq.answer }
    ]);
  };

  const handleSendLiveMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    if (!isLoggedIn) {
      toast.warning("Vui lòng đăng nhập để gửi tin nhắn hỗ trợ trực tiếp!");
      return;
    }

    const textToSend = inputMessage.trim();
    setInputMessage("");

    try {
      setLoading(true);
      const res = await ChatAPI.sendMessage(textToSend);
      if (res.data?.success) {
        fetchLiveMessages();
      } else {
        toast.error(res.data?.message || "Gửi tin nhắn thất bại");
      }
    } catch (err) {
      console.error("Lỗi gửi tin nhắn:", err);
      toast.error("Không thể gửi tin nhắn");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-2xl flex items-center justify-center transition-transform transform hover:scale-105 border-2 border-purple-400/30"
          title="Hỗ trợ & Chat trực tuyến"
        >
          <span className="material-symbols-outlined text-3xl">chat</span>
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
        </button>
      )}

      {/* Chat Window Modal */}
      {isOpen && (
        <div className="w-80 md:w-96 h-[500px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold">
                <span className="material-symbols-outlined text-xl">smart_toy</span>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Hỗ trợ Hỗ trợ CodeLearn</h3>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Trực tuyến 24/7
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs">
            <button
              onClick={() => setActiveTab("bot")}
              className={`flex-1 py-2.5 font-semibold transition flex items-center justify-center gap-1.5 ${
                activeTab === "bot"
                  ? "text-purple-400 border-b-2 border-purple-500 bg-slate-800/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="material-symbols-outlined text-base">robot</span>
              Chatbot FAQ
            </button>
            <button
              onClick={() => setActiveTab("live")}
              className={`flex-1 py-2.5 font-semibold transition flex items-center justify-center gap-1.5 ${
                activeTab === "live"
                  ? "text-purple-400 border-b-2 border-purple-500 bg-slate-800/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="material-symbols-outlined text-base">support_agent</span>
              Chat với Admin
            </button>
          </div>

          {/* Content Area */}
          {activeTab === "bot" ? (
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {botMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-2xl ${
                      msg.sender === "user"
                        ? "bg-purple-600 text-white rounded-br-none"
                        : "bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Quick FAQs Suggestion */}
              <div className="pt-2">
                <p className="text-[11px] text-slate-400 mb-2 font-medium">Câu hỏi thường gặp:</p>
                <div className="flex flex-col gap-1.5">
                  {FAQ_BOT_DATA.map((faq) => (
                    <button
                      key={faq.id}
                      onClick={() => handleFaqClick(faq)}
                      className="text-left p-2.5 rounded-xl bg-slate-800/60 hover:bg-purple-950/40 border border-slate-700/50 hover:border-purple-500/40 text-purple-300 transition text-[11px]"
                    >
                      {faq.question}
                    </button>
                  ))}
                </div>
              </div>
              <div ref={messagesEndRef} />
            </div>
          ) : (
            /* Live Chat Tab */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
                {!isLoggedIn ? (
                  <div className="text-center py-10 text-slate-400 space-y-2">
                    <span className="material-symbols-outlined text-4xl text-slate-600">lock</span>
                    <p>Vui lòng đăng nhập để chat trực tiếp với đội ngũ Admin hỗ trợ.</p>
                  </div>
                ) : liveMessages.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 space-y-2">
                    <span className="material-symbols-outlined text-4xl text-slate-600">chat_bubble</span>
                    <p>Chưa có tin nhắn nào. Hãy gửi thắc mắc để Admin phản hồi nhé!</p>
                  </div>
                ) : (
                  liveMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderRole === "USER" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] p-3 rounded-2xl ${
                          msg.senderRole === "USER"
                            ? "bg-indigo-600 text-white rounded-br-none"
                            : "bg-slate-800 text-emerald-300 border border-slate-700 rounded-bl-none"
                        }`}
                      >
                        {msg.senderRole === "ADMIN" && (
                          <div className="text-[10px] text-emerald-400 font-bold mb-1">
                            🛡️ Admin CSKH:
                          </div>
                        )}
                        <div>{msg.message}</div>
                        <div className="text-[9px] text-slate-400 mt-1 text-right">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : ""}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Live Input Form */}
              {isLoggedIn && (
                <form onSubmit={handleSendLiveMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    placeholder="Nhập nội dung cần hỗ trợ..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={loading}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputMessage.trim()}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-sm">send</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
