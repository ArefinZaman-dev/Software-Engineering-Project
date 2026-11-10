const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const profileService = require('../services/profileService');
const { ROLES } = require('../constants');

const getProfile = asyncHandler(async (req, res) => {
  const profile = await profileService.getPublicProfile(req.params.id, ROLES.POSTER);
  sendSuccess(res, { profile });
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await profileService.updateProfile(req.user, 'posterProfile', req.body);
  sendSuccess(res, { user }, { message: 'Profile updated.' });
});

module.exports = { getProfile, updateProfile };
