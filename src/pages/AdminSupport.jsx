import React, { useEffect, useState, useRef } from "react";
import AdminSidebar from "../component/AdminSidebar";
import ChatAPI from "../api/chatApi";
import CommentAPI from "../api/commentApi";
import toast from "../utils/toast";
import useSEO from "../utils/useSEO";

export default function AdminSupport() {
  useSEO("Admin - Chăm sóc Khách hàng & Chat", "Quản lý hỗ trợ trực tuyến, phản hồi hỏi đáp và bình luận học viên");

  const [activeTab, setActiveTab] = useState("chat"); // 'chat' | 'comments'

  // Chat State
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [adminReplyText, setAdminReplyText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Comments State
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [replyingCommentId, setReplyingCommentId] = useState(null);
  const [commentReplyText, setCommentReplyText] = useState("");

  useEffect(() => {
    if (activeTab === "chat") {
      fetchConversations();
    } else if (activeTab === "comments") {
      fetchComments();
    }
  }, [activeTab]);

  useEffect(() => {
    let interval;
    if (activeTab === "chat" && selectedUser) {
      fetchUserMessages(selectedUser.userId);
      interval = setInterval(() => fetchUserMessages(selectedUser.userId), 3000);
    }
    return () => clearInterval(interval);
  }, [activeTab, selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const fetchConversations = async () => {
    try {
      setChatLoading(true);
      const res = await ChatAPI.getAdminConversations();
      if (res.data?.success) {
        setConversations(res.data.data || []);
        if ((res.data.data || []).length > 0 && !selectedUser) {
          setSelectedUser(res.data.data[0]);
        }
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách hội thoại:", err);
    } finally {
      setChatLoading(false);
    }
  };

  const fetchUserMessages = async (userId) => {
    try {
      const res = await ChatAPI.getAdminChatWithUser(userId);
      if (res.data?.success) {
        setChatMessages(res.data.data || []);
      }
    } catch (err) {
      console.error("Lỗi lấy lịch sử chat:", err);
    }
  };

  const handleSendAdminReply = async (e) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !selectedUser) return;

    try {
      const text = adminReplyText.trim();
      setAdminReplyText("");
      const res = await ChatAPI.sendMessageFromAdmin(selectedUser.userId, text);
      if (res.data?.success) {
        fetchUserMessages(selectedUser.userId);
        fetchConversations();
      } else {
        toast.error(res.data?.message || "Gửi phản hồi thất bại");
      }
    } catch (err) {
      console.error("Lỗi gửi phản hồi:", err);
      toast.error("Không thể gửi phản hồi");
    }
  };

  const fetchComments = async () => {
    try {
      setCommentsLoading(true);
      const res = await CommentAPI.getAllComments();
      if (res.data?.success) {
        setComments(res.data.data || []);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách bình luận:", err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleReplyCommentSubmit = async (commentId) => {
    if (!commentReplyText.trim()) return;
    try {
      const res = await CommentAPI.replyComment(commentId, commentReplyText.trim());
      if (res.data?.success) {
        toast.success("Trả lời bình luận thành công!");
        setReplyingCommentId(null);
        setCommentReplyText("");
        fetchComments();
      } else {
        toast.error(res.data?.message || "Lỗi trả lời bình luận");
      }
    } catch (err) {
      console.error("Lỗi trả lời bình luận:", err);
      toast.error("Không thể trả lời bình luận");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bình luận này không?")) return;
    try {
      const res = await CommentAPI.deleteComment(commentId);
      if (res.data?.success) {
        toast.success("Xóa bình luận thành công!");
        fetchComments();
      } else {
        toast.error(res.data?.message || "Xóa thất bại");
      }
    } catch (err) {
      console.error("Lỗi xóa bình luận:", err);
      toast.error("Không thể xóa bình luận");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <AdminSidebar activeTab="support" />

      <div className="flex-1 p-6 md:p-10 ml-64 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Chăm sóc Khách hàng & Hỏi đáp (CSKH)
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Quản lý hỗ trợ trực tuyến, phản hồi bình luận bài học và tư vấn cho học viên
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "chat"
                  ? "bg-purple-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-sm">support_agent</span>
              Chat trực tiếp ({conversations.length})
            </button>
            <button
              onClick={() => setActiveTab("comments")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                activeTab === "comments"
                  ? "bg-purple-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-sm">forum</span>
              Quản lý Hỏi đáp ({comments.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Live Chat CSKH */}
        {activeTab === "chat" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px] bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            {/* Conversations List Sidebar */}
            <div className="border-r border-slate-800 flex flex-col bg-slate-900">
              <div className="p-4 border-b border-slate-800 font-bold text-sm text-slate-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400">group</span>
                Danh sách Học viên cần hỗ trợ
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Chưa có tin nhắn hỗ trợ nào từ học viên.
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.userId}
                      onClick={() => setSelectedUser(conv)}
                      className={`p-4 cursor-pointer transition flex items-center gap-3 ${
                        selectedUser?.userId === conv.userId
                          ? "bg-purple-950/40 border-l-4 border-purple-500"
                          : "hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300 font-bold flex items-center justify-center text-sm">
                        {conv.userFullname?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm text-slate-200 truncate">
                            {conv.userFullname}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {conv.lastTime ? new Date(conv.lastTime).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }) : ""}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {conv.senderRole === "ADMIN" ? "Bạn: " : ""}{conv.lastMessage}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Box */}
            <div className="lg:col-span-2 flex flex-col bg-slate-950/50">
              {!selectedUser ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
                  <span className="material-symbols-outlined text-5xl mb-2 text-slate-700">chat_bubble_outline</span>
                  Chọn học viên bên trái để bắt đầu chat tư vấn
                </div>
              ) : (
                <>
                  {/* Selected User Header */}
                  <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-200 text-base">{selectedUser.userFullname}</h3>
                      <p className="text-xs text-slate-400">{selectedUser.userEmail}</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
                      Đang tư vấn
                    </span>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderRole === "ADMIN" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] p-3.5 rounded-2xl ${
                            msg.senderRole === "ADMIN"
                              ? "bg-purple-600 text-white rounded-br-none"
                              : "bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none"
                          }`}
                        >
                          <div>{msg.message}</div>
                          <div className="text-[9px] text-slate-400 mt-1 text-right">
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleString("vi-VN") : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Admin Reply Form */}
                  <form onSubmit={handleSendAdminReply} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
                    <input
                      type="text"
                      placeholder="Nhập nội dung trả lời học viên..."
                      value={adminReplyText}
                      onChange={(e) => setAdminReplyText(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="submit"
                      disabled={!adminReplyText.trim()}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">send</span>
                      Gửi
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Quản lý Hỏi đáp & Bình luận bài học (B4) */}
        {activeTab === "comments" && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400">forum</span>
              Tất cả Bình luận & Câu hỏi của Học viên
            </h2>

            {commentsLoading ? (
              <div className="text-center py-12 text-slate-500 text-sm">Đang tải danh sách bình luận...</div>
            ) : comments.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">Chưa có bình luận nào trên hệ thống.</div>
            ) : (
              <div className="space-y-4">
                {comments.map((cmt) => (
                  <div key={cmt.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center text-sm border border-indigo-500/30">
                          {cmt.userFullname?.[0]?.toUpperCase() || "H"}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200 text-sm">{cmt.userFullname}</div>
                          <div className="text-xs text-slate-500">{cmt.userEmail} • {cmt.createdAt ? new Date(cmt.createdAt).toLocaleString("vi-VN") : "N/A"}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteComment(cmt.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/10 transition flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span> Xóa
                      </button>
                    </div>

                    <p className="text-slate-300 text-sm pl-12">{cmt.content}</p>

                    {/* Display existing reply or Reply form */}
                    {cmt.reply ? (
                      <div className="ml-12 p-3.5 bg-purple-950/40 border border-purple-800/40 rounded-xl text-xs space-y-1">
                        <div className="font-bold text-purple-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">verified_user</span>
                          Phản hồi của Admin:
                        </div>
                        <div className="text-slate-200">{cmt.reply}</div>
                      </div>
                    ) : replyingCommentId === cmt.id ? (
                      <div className="ml-12 space-y-2">
                        <textarea
                          placeholder="Nhập nội dung trả lời..."
                          value={commentReplyText}
                          onChange={(e) => setCommentReplyText(e.target.value)}
                          rows={2}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setReplyingCommentId(null);
                              setCommentReplyText("");
                            }}
                            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={() => handleReplyCommentSubmit(cmt.id)}
                            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition"
                          >
                            Gửi phản hồi
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="ml-12">
                        <button
                          onClick={() => {
                            setReplyingCommentId(cmt.id);
                            setCommentReplyText("");
                          }}
                          className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">reply</span>
                          Trả lời câu hỏi này
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
