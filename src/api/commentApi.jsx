import API from '../config/axios';

const CommentAPI = {
  getCommentsByLesson: (lessonId) => API.get(`/comments/lesson/${lessonId}`),
  getAllComments: () => API.get('/comments/admin/all'),
  createComment: (data) => API.post('/comments', data),
  replyComment: (commentId, reply) => API.post(`/comments/${commentId}/reply`, { reply }),
  deleteComment: (commentId) => API.delete(`/comments/${commentId}`),
};

export default CommentAPI;
