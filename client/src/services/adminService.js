import { request } from './apiClient.js';

function toQueryString(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

const post = (path, body) => request(path, { method: 'POST', body });

export const getStats = () => request('/admin/stats');

export const listUsers = (params = {}) => request(`/admin/users${toQueryString(params)}`);
export const suspendUser = (id) => post(`/admin/users/${id}/suspend`);
export const reactivateUser = (id) => post(`/admin/users/${id}/reactivate`);

export const listAdminJobs = (params = {}) => request(`/admin/jobs${toQueryString(params)}`);
export const removeJob = (id) => post(`/admin/jobs/${id}/remove`);
export const restoreJob = (id) => post(`/admin/jobs/${id}/restore`);

export const listAdminReviews = (params = {}) => request(`/admin/reviews${toQueryString(params)}`);
export const removeReview = (id) => post(`/admin/reviews/${id}/remove`);
export const restoreReview = (id) => post(`/admin/reviews/${id}/restore`);

export const listReports = (params = {}) => request(`/admin/reports${toQueryString(params)}`);
export const startReportReview = (id) => post(`/admin/reports/${id}/review`);
export const resolveReport = (id, note) => post(`/admin/reports/${id}/resolve`, { note });
export const dismissReport = (id, note) => post(`/admin/reports/${id}/dismiss`, { note });

export const listAdminCategories = () => request('/admin/categories');
export const createCategory = (name) => post('/admin/categories', { name });
export const updateCategory = (id, values) => request(`/admin/categories/${id}`, { method: 'PATCH', body: values });
export const deleteCategory = (id) => request(`/admin/categories/${id}`, { method: 'DELETE' });
