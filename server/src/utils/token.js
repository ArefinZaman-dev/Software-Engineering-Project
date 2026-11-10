const jwt = require('jsonwebtoken');
const config = require('../config/env');

// The token only stores the user id (the "subject"). Role and status are always
// read fresh from the database, so a suspension takes effect immediately.
function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = { signToken, verifyToken };
