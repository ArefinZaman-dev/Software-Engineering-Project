const User = require('../models/User');
const AppError = require('../utils/AppError');
const { USER_STATUS } = require('../constants');

// Fields stored directly on the user; every other field belongs to the role-specific profile.
const SHARED_FIELDS = ['name', 'location', 'bio'];

async function getPublicProfile(id, role) {
  const user = await User.findOne({ _id: id, role, status: USER_STATUS.ACTIVE });
  if (!user) throw new AppError('Profile not found.', 404);
  return user.toPublicProfile();
}

// `profileKey` is 'studentProfile' or 'posterProfile'. The validators already limited `data`
// to the fields that role is allowed to change.
async function updateProfile(user, profileKey, data) {
  if (!user[profileKey]) user[profileKey] = {};

  Object.entries(data).forEach(([field, value]) => {
    if (SHARED_FIELDS.includes(field)) {
      user[field] = value;
    } else {
      user[profileKey][field] = value;
    }
  });

  await user.save();
  return user;
}

module.exports = { getPublicProfile, updateProfile };
