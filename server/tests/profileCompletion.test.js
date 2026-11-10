// Pure logic test: needs no database, so it runs without any setup.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { getProfileCompletion } = require('../src/utils/profileCompletion');

describe('getProfileCompletion', () => {
  it('reports every student item as missing for an empty profile', () => {
    const result = getProfileCompletion({ role: 'STUDENT', location: '', bio: '', studentProfile: { skills: [] } });
    assert.equal(result.percentage, 0);
    assert.deepEqual(result.missing, ['university', 'department', 'location', 'bio', 'skills', 'experience']);
  });

  it('reports 100 percent for a fully filled student profile', () => {
    const result = getProfileCompletion({
      role: 'STUDENT',
      location: 'Dhaka',
      bio: 'Hello',
      studentProfile: { university: 'BUBT', department: 'CSE', skills: ['React'], experience: 'Tutoring' },
    });
    assert.equal(result.percentage, 100);
    assert.deepEqual(result.missing, []);
  });

  it('rounds partial progress and lists what is missing', () => {
    const result = getProfileCompletion({
      role: 'STUDENT',
      location: 'Dhaka',
      bio: '',
      studentProfile: { university: 'BUBT', department: 'CSE', skills: ['Excel'], experience: '' },
    });
    assert.equal(result.percentage, 67); // 4 of 6 items
    assert.deepEqual(result.missing, ['bio', 'experience']);
  });

  it('treats whitespace-only text as empty', () => {
    const result = getProfileCompletion({ role: 'STUDENT', location: '   ', bio: '\n', studentProfile: { skills: [] } });
    assert.ok(result.missing.includes('location'));
    assert.ok(result.missing.includes('bio'));
  });

  it('does not ask individual posters for an organization name', () => {
    const result = getProfileCompletion({
      role: 'POSTER',
      location: 'Dhaka',
      bio: 'Parent',
      posterProfile: { organizationType: 'INDIVIDUAL', organizationName: '' },
    });
    assert.equal(result.percentage, 100);
  });

  it('asks businesses and organizations for an organization name', () => {
    const result = getProfileCompletion({
      role: 'POSTER',
      location: 'Dhaka',
      bio: 'Studio',
      posterProfile: { organizationType: 'BUSINESS', organizationName: '' },
    });
    assert.deepEqual(result.missing, ['organizationName']);
    assert.equal(result.percentage, 67);
  });

  it('returns 100 for roles with no profile checklist (admin)', () => {
    assert.deepEqual(getProfileCompletion({ role: 'ADMIN' }), { percentage: 100, missing: [] });
  });
});
