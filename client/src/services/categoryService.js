import { request } from './apiClient.js';

export const listCategories = () => request('/categories', { auth: false });
