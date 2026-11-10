import { request } from './apiClient.js';

export const register = (values) => request('/auth/register', { method: 'POST', body: values, auth: false });
export const login = (values) => request('/auth/login', { method: 'POST', body: values, auth: false });
export const fetchCurrentUser = () => request('/auth/me');
export const logout = () => request('/auth/logout', { method: 'POST' });
