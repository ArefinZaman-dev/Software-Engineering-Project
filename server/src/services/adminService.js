const User = require('../models/User');
const { ROLES } = require('../constants');

// Increment 6 will add job, application, and report counts here.
async function getStats() {
  const [totalUsers, students, posters] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: ROLES.STUDENT }),
    User.countDocuments({ role: ROLES.POSTER }),
  ]);
  return { totalUsers, students, posters };
}

module.exports = { getStats };
