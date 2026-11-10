const bcrypt = require('bcryptjs');
const config = require('../config/env');

// Used when an email is not found, so login takes about the same time either way
// and an attacker cannot tell which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('campusgig-dummy-password', config.bcryptRounds);

function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, config.bcryptRounds);
}

function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash || DUMMY_HASH);
}

module.exports = { hashPassword, comparePassword };
