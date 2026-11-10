const { api, bearer, createUser, setupDatabase, clearDatabase, teardownDatabase } = require('./helpers/testApp');
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../src/models/User');

describe('Profiles', () => {
  before(setupDatabase);
  beforeEach(clearDatabase);
  after(teardownDatabase);

  describe('PUT /api/students/:id', () => {
    it('updates the profile and reports 100% completion when everything is filled', async () => {
      const { user, token } = await createUser({ role: 'STUDENT' });

      const res = await api()
        .put(`/api/students/${user.id}`)
        .set(bearer(token))
        .send({
          name: 'Tanvir Ahmed',
          location: 'Mirpur, Dhaka',
          bio: 'CSE student who enjoys building small websites.',
          university: 'BUBT',
          department: 'Computer Science and Engineering',
          skills: ['React', 'JavaScript'],
          availability: 'EVENINGS',
          experience: 'Built a portfolio site for a family business.',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.name, 'Tanvir Ahmed');
      assert.equal(res.body.data.user.studentProfile.availability, 'EVENINGS');
      assert.equal(res.body.data.user.profileCompletion.percentage, 100);

      const stored = await User.findById(user._id);
      assert.deepEqual([...stored.studentProfile.skills], ['React', 'JavaScript']);
    });

    it('removes duplicate skills regardless of letter case', async () => {
      const { user, token } = await createUser({ role: 'STUDENT' });
      const res = await api()
        .put(`/api/students/${user.id}`)
        .set(bearer(token))
        .send({ skills: ['React', 'react', ' Excel ', 'Excel'] });

      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data.user.studentProfile.skills, ['React', 'Excel']);
    });

    it('rejects invalid input with field details', async () => {
      const { user, token } = await createUser({ role: 'STUDENT' });
      const url = `/api/students/${user.id}`;

      const badAvailability = await api().put(url).set(bearer(token)).send({ availability: 'ALWAYS' });
      const tooManySkills = await api()
        .put(url)
        .set(bearer(token))
        .send({ skills: Array.from({ length: 21 }, (_, i) => `Skill ${i}`) });
      const longBio = await api().put(url).set(bearer(token)).send({ bio: 'a'.repeat(1001) });
      const emptyBody = await api().put(url).set(bearer(token)).send({});

      assert.equal(badAvailability.status, 400);
      assert.ok(badAvailability.body.errors.some((e) => e.field === 'availability'));
      assert.equal(tooManySkills.status, 400);
      assert.equal(longBio.status, 400);
      assert.equal(emptyBody.status, 400);
    });

    it('requires authentication', async () => {
      const { user } = await createUser({ role: 'STUDENT' });
      const res = await api().put(`/api/students/${user.id}`).send({ bio: 'x' });
      assert.equal(res.status, 401);
    });
  });

  describe('PUT /api/posters/:id', () => {
    it('updates organization details', async () => {
      const { user, token } = await createUser({ role: 'POSTER' });

      const res = await api()
        .put(`/api/posters/${user.id}`)
        .set(bearer(token))
        .send({
          location: 'Banani, Dhaka',
          bio: 'A small design studio.',
          organizationType: 'BUSINESS',
          organizationName: 'Riverline Design Studio',
          website: 'https://example.com',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.posterProfile.organizationType, 'BUSINESS');
      assert.equal(res.body.data.user.posterProfile.website, 'https://example.com');
      assert.equal(res.body.data.user.profileCompletion.percentage, 100);
    });

    it('rejects a website that is not http(s)', async () => {
      const { user, token } = await createUser({ role: 'POSTER' });
      const res = await api()
        .put(`/api/posters/${user.id}`)
        .set(bearer(token))
        .send({ website: 'javascript:alert(1)' });

      assert.equal(res.status, 400);
      assert.ok(res.body.errors.some((e) => e.field === 'website'));
    });
  });

  describe('Public profile views', () => {
    it('shows a student profile to another logged-in user without private fields', async () => {
      const student = await createUser({
        role: 'STUDENT',
        studentProfile: { university: 'BUBT', skills: ['Excel'] },
      });
      const viewer = await createUser({ role: 'POSTER' });

      const res = await api().get(`/api/students/${student.user.id}`).set(bearer(viewer.token));

      assert.equal(res.status, 200);
      const profile = res.body.data.profile;
      assert.equal(profile.name, student.user.name);
      assert.equal(profile.studentProfile.university, 'BUBT');
      assert.equal(profile.email, undefined);
      assert.equal(profile.status, undefined);
      assert.equal(profile.passwordHash, undefined);
    });

    it('requires login to view a profile', async () => {
      const student = await createUser({ role: 'STUDENT' });
      const res = await api().get(`/api/students/${student.user.id}`);
      assert.equal(res.status, 401);
    });

    it('returns 404 when the id belongs to a different role', async () => {
      const student = await createUser({ role: 'STUDENT' });
      const viewer = await createUser({ role: 'STUDENT' });
      const res = await api().get(`/api/posters/${student.user.id}`).set(bearer(viewer.token));
      assert.equal(res.status, 404);
    });

    it('returns 400 for a malformed id and 404 for an unknown id', async () => {
      const viewer = await createUser({ role: 'STUDENT' });
      const malformed = await api().get('/api/students/123').set(bearer(viewer.token));
      const unknown = await api().get('/api/students/64b7f0c2a1b2c3d4e5f60718').set(bearer(viewer.token));

      assert.equal(malformed.status, 400);
      assert.equal(unknown.status, 404);
    });

    it('hides the profile of a suspended user', async () => {
      const student = await createUser({ role: 'STUDENT', status: 'SUSPENDED' });
      const viewer = await createUser({ role: 'POSTER' });
      const res = await api().get(`/api/students/${student.user.id}`).set(bearer(viewer.token));
      assert.equal(res.status, 404);
    });
  });
});
