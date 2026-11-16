import { request } from './apiClient.js';

// Public: the learning help for one job (shown on the job page and the apply page).
export const listJobResources = (jobId) => request(`/jobs/${jobId}/resources`, { auth: false });
