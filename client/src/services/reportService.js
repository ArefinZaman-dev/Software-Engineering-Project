import { request } from './apiClient.js';

export const createReport = (values) => request('/reports', { method: 'POST', body: values });
