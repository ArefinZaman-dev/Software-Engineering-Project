const {
  api,
  bearer,
  createUser,
  createCategory,
  createJob,
  daysFromNow,
  setupDatabase,
  clearDatabase,
  teardownDatabase,
} = require('./helpers/testApp');
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const Job = require('../src/models/Job');

function validPayload(category, overrides = {}) {
  return {
    title: 'Weekend Poster Design for a Café',
    description: 'We need a single A3 poster designed for our café weekend brunch promotion.',
    category: String(category._id),
    skills: ['Graphic Design'],
    budget: 1500,
    duration: '3 days',
    location: 'Dhanmondi, Dhaka',
    workType: 'REMOTE',
    deadline: daysFromNow(7).toISOString(),
    ...overrides,
  };
}

describe('Jobs', () => {
  before(setupDatabase);
  beforeEach(clearDatabase);
  after(teardownDatabase);

  describe('POST /api/jobs', () => {
    it('lets a poster create a job', async () => {
      const category = await createCategory({ name: 'Graphic Design' });
      const { token, user } = await createUser({ role: 'POSTER' });

      const res = await api().post('/api/jobs').set(bearer(token)).send(validPayload(category));

      assert.equal(res.status, 201);
      assert.equal(res.body.data.job.status, 'OPEN');
      assert.equal(res.body.data.job.poster.id, user.id);
      assert.equal(res.body.data.job.category.name, 'Graphic Design');
      // Regression guard: the job and its populated category must each expose `id`, not `_id`.
      // A missing `virtuals: true` on the model's toJSON options would silently drop this field,
      // breaking every job link and the category dropdown on the frontend.
      assert.match(res.body.data.job.id, /^[a-f\d]{24}$/i);
      assert.match(res.body.data.job.category.id, /^[a-f\d]{24}$/i);
      assert.equal(res.body.data.job._id, undefined);
      assert.equal(res.body.data.job.category._id, undefined);
    });

    it('rejects a student trying to create a job', async () => {
      const category = await createCategory();
      const { token } = await createUser({ role: 'STUDENT' });

      const res = await api().post('/api/jobs').set(bearer(token)).send(validPayload(category));

      assert.equal(res.status, 403);
    });

    it('requires authentication', async () => {
      const category = await createCategory();
      const res = await api().post('/api/jobs').send(validPayload(category));
      assert.equal(res.status, 401);
    });

    it('rejects a deadline in the past', async () => {
      const category = await createCategory();
      const { token } = await createUser({ role: 'POSTER' });

      const res = await api()
        .post('/api/jobs')
        .set(bearer(token))
        .send(validPayload(category, { deadline: daysFromNow(-1).toISOString() }));

      assert.equal(res.status, 400);
      assert.ok(res.body.errors.some((e) => e.field === 'deadline'));
    });

    it('rejects a non-existent or inactive category', async () => {
      const { token } = await createUser({ role: 'POSTER' });
      const activeCategory = await createCategory();
      const inactive = await createCategory({ isActive: false });

      const unknown = await api()
        .post('/api/jobs')
        .set(bearer(token))
        .send(validPayload(activeCategory, { category: '64b7f0c2a1b2c3d4e5f60718' }));
      const inactiveRes = await api()
        .post('/api/jobs')
        .set(bearer(token))
        .send(validPayload(activeCategory, { category: String(inactive._id) }));

      assert.equal(unknown.status, 400);
      assert.equal(inactiveRes.status, 400);
    });

    it('rejects a negative or zero budget, and a too-short description', async () => {
      const category = await createCategory();
      const { token } = await createUser({ role: 'POSTER' });

      const badBudget = await api()
        .post('/api/jobs')
        .set(bearer(token))
        .send(validPayload(category, { budget: 0 }));
      const shortDescription = await api()
        .post('/api/jobs')
        .set(bearer(token))
        .send(validPayload(category, { description: 'Too short' }));

      assert.equal(badBudget.status, 400);
      assert.equal(shortDescription.status, 400);
    });

    it('removes duplicate skills, ignoring letter case', async () => {
      const category = await createCategory();
      const { token } = await createUser({ role: 'POSTER' });

      const res = await api()
        .post('/api/jobs')
        .set(bearer(token))
        .send(validPayload(category, { skills: ['React', 'react', 'Node'] }));

      assert.equal(res.status, 201);
      assert.deepEqual(res.body.data.job.skills, ['React', 'Node']);
    });
  });

  describe('GET /api/jobs (public discovery)', () => {
    it('is public and lists only open jobs', async () => {
      const category = await createCategory();
      const poster = (await createUser({ role: 'POSTER' })).user;
      await createJob({ poster: poster._id, category: category._id, status: 'OPEN', title: 'Open one' });
      await createJob({ poster: poster._id, category: category._id, status: 'CLOSED', title: 'Closed one' });

      const res = await api().get('/api/jobs');

      assert.equal(res.status, 200);
      assert.equal(res.body.data.jobs.length, 1);
      assert.equal(res.body.data.jobs[0].title, 'Open one');
      assert.match(res.body.data.jobs[0].id, /^[a-f\d]{24}$/i);
    });
    it('hides jobs from a suspended poster', async () => {
      const category = await createCategory();
      const poster = (await createUser({ role: 'POSTER', status: 'SUSPENDED' })).user;
      await createJob({ poster: poster._id, category: category._id });

      const res = await api().get('/api/jobs');
      assert.equal(res.body.data.jobs.length, 0);
    });

    it('never exposes the poster account status field', async () => {
      const category = await createCategory();
      const poster = (await createUser({ role: 'POSTER' })).user;
      await createJob({ poster: poster._id, category: category._id });

      const res = await api().get('/api/jobs');
      assert.equal(res.body.data.jobs[0].poster.status, undefined);
    });

    it('filters by category, location, work type, and budget range', async () => {
      const design = await createCategory({ name: 'Design' });
      const writing = await createCategory({ name: 'Writing' });
      const poster = (await createUser({ role: 'POSTER' })).user;

      await createJob({ poster: poster._id, category: design._id, location: 'Dhaka', workType: 'ON_SITE', budget: 5000 });
      await createJob({ poster: poster._id, category: writing._id, location: 'Chittagong', workType: 'REMOTE', budget: 500 });

      const byCategory = await api().get(`/api/jobs?category=${design._id}`);
      const byLocation = await api().get('/api/jobs?location=dhaka');
      const byWorkType = await api().get('/api/jobs?workType=REMOTE');
      const byBudget = await api().get('/api/jobs?minBudget=1000&maxBudget=10000');

      assert.equal(byCategory.body.data.jobs.length, 1);
      assert.equal(byLocation.body.data.jobs.length, 1);
      assert.equal(byWorkType.body.data.jobs.length, 1);
      assert.equal(byBudget.body.data.jobs.length, 1);
      assert.equal(byBudget.body.data.jobs[0].budget, 5000);
    });

    it('searches title and description by keyword', async () => {
      const category = await createCategory();
      const poster = (await createUser({ role: 'POSTER' })).user;
      await createJob({ poster: poster._id, category: category._id, title: 'Need a React developer' });
      await createJob({ poster: poster._id, category: category._id, title: 'Need a tutor for algebra' });

      const res = await api().get('/api/jobs?search=React');
      assert.equal(res.body.data.jobs.length, 1);
      assert.match(res.body.data.jobs[0].title, /React/);
    });

    it('sorts by budget, high to low', async () => {
      const category = await createCategory();
      const poster = (await createUser({ role: 'POSTER' })).user;
      await createJob({ poster: poster._id, category: category._id, budget: 1000, title: 'Cheap' });
      await createJob({ poster: poster._id, category: category._id, budget: 9000, title: 'Expensive' });

      const res = await api().get('/api/jobs?sort=budget_high');
      assert.equal(res.body.data.jobs[0].title, 'Expensive');
    });

    it('paginates results', async () => {
      const category = await createCategory();
      const poster = (await createUser({ role: 'POSTER' })).user;
      await Promise.all(
        Array.from({ length: 5 }, (_, i) => createJob({ poster: poster._id, category: category._id, title: `Job ${i}` }))
      );

      const res = await api().get('/api/jobs?page=1&limit=2');

      assert.equal(res.status, 200);
      assert.equal(res.body.data.jobs.length, 2);
      assert.deepEqual(res.body.data.pagination, { page: 1, limit: 2, total: 5, totalPages: 3 });
    });

    it('rejects an invalid query value', async () => {
      const res = await api().get('/api/jobs?workType=FLYING');
      assert.equal(res.status, 400);
    });
  });

  describe('GET /api/jobs/:id', () => {
    it('is public and returns full job details', async () => {
      const category = await createCategory();
      const poster = (await createUser({ role: 'POSTER' })).user;
      const job = await createJob({ poster: poster._id, category: category._id });

      const res = await api().get(`/api/jobs/${job.id}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.job.title, job.title);
      assert.equal(res.body.data.job.poster.name, poster.name);
      assert.equal(res.body.data.job.id, job.id);
      assert.equal(res.body.data.job.category.id, String(category._id));
    });

    it('returns 404 for an unknown id and 400 for a malformed id', async () => {
      const unknown = await api().get('/api/jobs/64b7f0c2a1b2c3d4e5f60718');
      const malformed = await api().get('/api/jobs/not-an-id');
      assert.equal(unknown.status, 404);
      assert.equal(malformed.status, 400);
    });

    it('returns 404 for a job from a suspended poster', async () => {
      const category = await createCategory();
      const poster = (await createUser({ role: 'POSTER', status: 'SUSPENDED' })).user;
      const job = await createJob({ poster: poster._id, category: category._id });

      const res = await api().get(`/api/jobs/${job.id}`);
      assert.equal(res.status, 404);
    });
  });

  describe('GET /api/jobs/mine', () => {
    it('lists a poster’s own jobs regardless of status', async () => {
      const category = await createCategory();
      const { token, user } = await createUser({ role: 'POSTER' });
      const other = (await createUser({ role: 'POSTER' })).user;
      await createJob({ poster: user._id, category: category._id, status: 'OPEN' });
      await createJob({ poster: user._id, category: category._id, status: 'CLOSED' });
      await createJob({ poster: other._id, category: category._id, status: 'OPEN' });

      const res = await api().get('/api/jobs/mine').set(bearer(token));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.jobs.length, 2);
    });

    it('rejects a student', async () => {
      const { token } = await createUser({ role: 'STUDENT' });
      const res = await api().get('/api/jobs/mine').set(bearer(token));
      assert.equal(res.status, 403);
    });
  });

  describe('PUT /api/jobs/:id (edit)', () => {
    it('lets the owner edit an open job', async () => {
      const category = await createCategory();
      const { token, user } = await createUser({ role: 'POSTER' });
      const job = await createJob({ poster: user._id, category: category._id });

      const res = await api().put(`/api/jobs/${job.id}`).set(bearer(token)).send({ budget: 9999 });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.job.budget, 9999);
    });

    it('rejects editing a job that is not open', async () => {
      const category = await createCategory();
      const { token, user } = await createUser({ role: 'POSTER' });
      const job = await createJob({ poster: user._id, category: category._id, status: 'CLOSED' });

      const res = await api().put(`/api/jobs/${job.id}`).set(bearer(token)).send({ budget: 9999 });
      assert.equal(res.status, 409);
    });

    it('rejects editing another poster’s job (404, not revealing it exists)', async () => {
      const category = await createCategory();
      const owner = (await createUser({ role: 'POSTER' })).user;
      const attacker = await createUser({ role: 'POSTER' });
      const job = await createJob({ poster: owner._id, category: category._id });

      const res = await api().put(`/api/jobs/${job.id}`).set(bearer(attacker.token)).send({ budget: 1 });
      assert.equal(res.status, 404);

      const stored = await Job.findById(job._id);
      assert.equal(stored.budget, job.budget);
    });

    it('rejects a student', async () => {
      const category = await createCategory();
      const poster = (await createUser({ role: 'POSTER' })).user;
      const job = await createJob({ poster: poster._id, category: category._id });
      const { token } = await createUser({ role: 'STUDENT' });

      const res = await api().put(`/api/jobs/${job.id}`).set(bearer(token)).send({ budget: 1 });
      assert.equal(res.status, 403);
    });
  });

  describe('DELETE /api/jobs/:id', () => {
    it('lets the owner delete an open job', async () => {
      const category = await createCategory();
      const { token, user } = await createUser({ role: 'POSTER' });
      const job = await createJob({ poster: user._id, category: category._id });

      const res = await api().delete(`/api/jobs/${job.id}`).set(bearer(token));

      assert.equal(res.status, 200);
      assert.equal(await Job.findById(job._id), null);
    });

    it('rejects deleting a job that is not open', async () => {
      const category = await createCategory();
      const { token, user } = await createUser({ role: 'POSTER' });
      const job = await createJob({ poster: user._id, category: category._id, status: 'CANCELLED' });

      const res = await api().delete(`/api/jobs/${job.id}`).set(bearer(token));
      assert.equal(res.status, 409);
    });
  });

  describe('POST /api/jobs/:id/close and /cancel', () => {
    it('closes an open job', async () => {
      const category = await createCategory();
      const { token, user } = await createUser({ role: 'POSTER' });
      const job = await createJob({ poster: user._id, category: category._id });

      const res = await api().post(`/api/jobs/${job.id}/close`).set(bearer(token));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.job.status, 'CLOSED');
    });

    it('cannot close a job twice', async () => {
      const category = await createCategory();
      const { token, user } = await createUser({ role: 'POSTER' });
      const job = await createJob({ poster: user._id, category: category._id, status: 'CLOSED' });

      const res = await api().post(`/api/jobs/${job.id}/close`).set(bearer(token));
      assert.equal(res.status, 409);
    });

    it('cancels an open job', async () => {
      const category = await createCategory();
      const { token, user } = await createUser({ role: 'POSTER' });
      const job = await createJob({ poster: user._id, category: category._id });

      const res = await api().post(`/api/jobs/${job.id}/cancel`).set(bearer(token));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.job.status, 'CANCELLED');
    });

    it('rejects closing another poster’s job', async () => {
      const category = await createCategory();
      const owner = (await createUser({ role: 'POSTER' })).user;
      const attacker = await createUser({ role: 'POSTER' });
      const job = await createJob({ poster: owner._id, category: category._id });

      const res = await api().post(`/api/jobs/${job.id}/close`).set(bearer(attacker.token));
      assert.equal(res.status, 404);
    });
  });
});
