const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const authService = require('../services/authService');

const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body);
  sendSuccess(res, { user, token }, { status: 201, message: 'Account created successfully.' });
});

const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body.email, req.body.password);
  sendSuccess(res, { user, token }, { message: 'Logged in successfully.' });
});

const me = asyncHandler(async (req, res) => {
  sendSuccess(res, { user: req.user });
});

// Tokens are stateless, so logging out means the browser forgets its token.
// This endpoint exists so the frontend has one consistent place to call.
const logout = asyncHandler(async (_req, res) => {
  sendSuccess(res, null, { message: 'Logged out successfully.' });
});

module.exports = { register, login, me, logout };
