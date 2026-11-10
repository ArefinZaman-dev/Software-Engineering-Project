import { request } from './apiClient.js';

export const getStats = () => request('/admin/stats');
