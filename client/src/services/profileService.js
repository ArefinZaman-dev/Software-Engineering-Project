import { request } from './apiClient.js';

export const getStudentProfile = (id) => request(`/students/${id}`);
export const updateStudentProfile = (id, values) => request(`/students/${id}`, { method: 'PUT', body: values });
export const getPosterProfile = (id) => request(`/posters/${id}`);
export const updatePosterProfile = (id, values) => request(`/posters/${id}`, { method: 'PUT', body: values });
