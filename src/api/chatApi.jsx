import API from '../config/axios';

const ChatAPI = {
  getUserMessages: () => API.get('/chat/messages'),
  sendMessage: (message) => API.post('/chat/send', { message }),
  getAdminConversations: () => API.get('/chat/admin/conversations'),
  getAdminChatWithUser: (userId) => API.get(`/chat/admin/user/${userId}`),
  sendMessageFromAdmin: (userId, message) => API.post('/chat/admin/reply', { userId, message }),
};

export default ChatAPI;
