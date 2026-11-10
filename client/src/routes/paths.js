import { ROLES } from '../utils/constants.js';

const HOME = { [ROLES.STUDENT]: '/student', [ROLES.POSTER]: '/poster', [ROLES.ADMIN]: '/admin' };
const PROFILE = { [ROLES.STUDENT]: '/student/profile', [ROLES.POSTER]: '/poster/profile' };

export const roleHome = (role) => HOME[role] || '/';
export const roleProfilePath = (role) => PROFILE[role] || '/';
