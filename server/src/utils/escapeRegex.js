// Makes user-typed text safe to use inside a MongoDB $regex (so "c++" is searched literally).
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = escapeRegex;
