import API from '../config/axios';

const ReviewAPI = {
  getCourseReviews: (courseId) => API.get(`/reviews/course/${courseId}`),
  createReview: (data) => API.post('/reviews', data),
  createOrUpdateReview: (data) => API.post('/reviews', data),
};

export default ReviewAPI;
