const { ROLES, ORGANIZATION_TYPES } = require('../constants');

const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

// Each item is one thing a person can fill in to make their profile more trustworthy.
function checklistFor(user) {
  if (user.role === ROLES.STUDENT) {
    const profile = user.studentProfile || {};
    return [
      { key: 'university', done: hasText(profile.university) },
      { key: 'department', done: hasText(profile.department) },
      { key: 'location', done: hasText(user.location) },
      { key: 'bio', done: hasText(user.bio) },
      { key: 'skills', done: Array.isArray(profile.skills) && profile.skills.length > 0 },
      { key: 'experience', done: hasText(profile.experience) },
    ];
  }

  if (user.role === ROLES.POSTER) {
    const profile = user.posterProfile || {};
    const items = [
      { key: 'location', done: hasText(user.location) },
      { key: 'bio', done: hasText(user.bio) },
    ];
    // Individuals do not have an organization name to fill in.
    if (profile.organizationType && profile.organizationType !== ORGANIZATION_TYPES.INDIVIDUAL) {
      items.push({ key: 'organizationName', done: hasText(profile.organizationName) });
    }
    return items;
  }

  return [];
}

function getProfileCompletion(user) {
  const items = checklistFor(user);
  if (items.length === 0) return { percentage: 100, missing: [] };

  const doneCount = items.filter((item) => item.done).length;
  return {
    percentage: Math.round((doneCount / items.length) * 100),
    missing: items.filter((item) => !item.done).map((item) => item.key),
  };
}

module.exports = { getProfileCompletion };
