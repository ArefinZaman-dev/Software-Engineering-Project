import { request } from './apiClient.js';

export const openConversation = (applicationId) =>
  request(`/applications/${applicationId}/conversation`, { method: 'POST' });
export const listConversations = () => request('/conversations');
export const getMessages = (conversationId) => request(`/conversations/${conversationId}/messages`);
export const sendMessage = (conversationId, body) =>
  request(`/conversations/${conversationId}/messages`, { method: 'POST', body: { body } });
