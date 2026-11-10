import { request } from './apiClient.js';

export const getJobReviews = (jobId) => request(`/jobs/${jobId}/reviews`);
export const createReview = (jobId, values) => request(`/jobs/${jobId}/reviews`, { method: 'POST', body: values });
export const getUserReviews = (userId) => request(`/reviews/user/${userId}`);
