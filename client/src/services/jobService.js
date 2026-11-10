import { request } from './apiClient.js';

function toQueryString(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export const listJobs = (params = {}) => request(`/jobs${toQueryString(params)}`, { auth: false });
export const getJob = (id) => request(`/jobs/${id}`, { auth: false });
export const listMyJobs = () => request('/jobs/mine');
export const createJob = (values) => request('/jobs', { method: 'POST', body: values });
export const updateJob = (id, values) => request(`/jobs/${id}`, { method: 'PUT', body: values });
export const deleteJob = (id) => request(`/jobs/${id}`, { method: 'DELETE' });
export const closeJob = (id) => request(`/jobs/${id}/close`, { method: 'POST' });
export const cancelJob = (id) => request(`/jobs/${id}/cancel`, { method: 'POST' });
export const completeJob = (id) => request(`/jobs/${id}/complete`, { method: 'POST' });
