import { request } from './apiClient.js';

export const applyToJob = (jobId, values) => request(`/jobs/${jobId}/applications`, { method: 'POST', body: values });
export const listApplicantsForJob = (jobId) => request(`/jobs/${jobId}/applications`);
export const listMyApplications = () => request('/applications/mine');
export const shortlistApplication = (id) => request(`/applications/${id}/shortlist`, { method: 'POST' });
export const rejectApplication = (id) => request(`/applications/${id}/reject`, { method: 'POST' });
export const acceptApplication = (id) => request(`/applications/${id}/accept`, { method: 'POST' });
export const withdrawApplication = (id) => request(`/applications/${id}/withdraw`, { method: 'POST' });
