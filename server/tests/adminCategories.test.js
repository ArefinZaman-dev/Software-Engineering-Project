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
const Category = require('../src/models/Category');

function jobPayload(category) {
  return {
    title: 'Weekend Poster Design for a Café',
    description: 'We need a single A3 poster designed for our café weekend brunch promotion.',
    category: String(category._id),
    skills: [],
    budget: 1500,
    duration: '3 days',
    location: 'Dhanmondi, Dhaka',
    workType: 'REMOTE',
    deadline: daysFromNow(7).toISOString(),
  };
}

describe('Admin: categories', () => {
  before(setupDatabase);
  beforeEach(clearDatabase);
  after(teardownDatabase);

  describe('GET /api/admin/categories', () => {
    it('lists active and inactive categories with their job counts', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const used = await createCategory({ name: 'Web Development' });
      await createCategory({ name: 'Old Category', isActive: false });
      const poster = await createUser({ role: 'POSTER' });
      await createJob({ poster: poster.user._id, category: used._id });
      await createJob({ poster: poster.user._id, category: used._id });

      const res = await api().get('/api/admin/categories').set(bearer(admin.token));

      assert.equal(res.status, 200);
      const byName = Object.fromEntries(res.body.data.categories.map((c) => [c.name, c]));
      assert.equal(byName['Web Development'].jobCount, 2);
      assert.equal(byName['Web Development'].isActive, true);
      assert.equal(byName['Old Category'].isActive, false);
      assert.equal(byName['Old Category'].jobCount, 0);
      assert.ok(byName['Web Development'].id);
    });

    it('requires an admin', async () => {
      const anonymous = await api().get('/api/admin/categories');
      assert.equal(anonymous.status, 401);
      const { token } = await createUser({ role: 'POSTER' });
      const res = await api().get('/api/admin/categories').set(bearer(token));
      assert.equal(res.status, 403);
    });
  });

  describe('POST /api/admin/categories', () => {
    it('creates a category with a slug, visible to the public', async () => {
      const admin = await createUser({ role: 'ADMIN' });

      const res = await api().post('/api/admin/categories').set(bearer(admin.token)).send({ name: '  Video Editing  ' });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.category.name, 'Video Editing');
      assert.equal(res.body.data.category.slug, 'video-editing');
      assert.equal(res.body.data.category.isActive, true);
      assert.equal(res.body.data.category.jobCount, 0);

      const publicList = await api().get('/api/categories');
      assert.ok(publicList.body.data.categories.some((c) => c.name === 'Video Editing'));
    });

    it('rejects a duplicate name, even with different capital letters', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      await createCategory({ name: 'Tutoring' });

      const res = await api().post('/api/admin/categories').set(bearer(admin.token)).send({ name: 'tutoring' });
      assert.equal(res.status, 409);
      assert.equal(await Category.countDocuments({}), 1);
    });

    it('rejects a name that is too short, missing, or has no English letters or digits', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      for (const body of [{}, { name: 'a' }, { name: '   ' }, { name: '!!!' }, { name: 'x'.repeat(61) }]) {
        const res = await api().post('/api/admin/categories').set(bearer(admin.token)).send(body);
        assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(body).slice(0, 30)}`);
        assert.ok(res.body.errors.some((e) => e.field === 'name'));
      }
      assert.equal(await Category.countDocuments({}), 0);
    });

    it('is not available to non-admins', async () => {
      const { token } = await createUser({ role: 'POSTER' });
      const res = await api().post('/api/admin/categories').set(bearer(token)).send({ name: 'Sneaky' });
      assert.equal(res.status, 403);
    });
  });

  describe('PATCH /api/admin/categories/:id', () => {
    it('renames a category and updates its slug', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const category = await createCategory({ name: 'Writing' });

      const res = await api().patch(`/api/admin/categories/${category.id}`).set(bearer(admin.token)).send({ name: 'Content Writing' });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.category.name, 'Content Writing');
      assert.equal(res.body.data.category.slug, 'content-writing');
    });

    it('rejects renaming to a name another category already has', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      await createCategory({ name: 'Writing' });
      const other = await createCategory({ name: 'Research' });

      const res = await api().patch(`/api/admin/categories/${other.id}`).set(bearer(admin.token)).send({ name: 'Writing' });
      assert.equal(res.status, 409);
    });

    it('deactivating hides a category from the public list and from new jobs, but existing jobs stay visible', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const category = await createCategory({ name: 'Photography' });
      const poster = await createUser({ role: 'POSTER' });
      const existing = await createJob({ poster: poster.user._id, category: category._id });

      const res = await api().patch(`/api/admin/categories/${category.id}`).set(bearer(admin.token)).send({ isActive: false });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.category.isActive, false);
      assert.equal(res.body.data.category.jobCount, 1);

      const publicList = await api().get('/api/categories');
      assert.ok(!publicList.body.data.categories.some((c) => c.name === 'Photography'));

      const newJob = await api().post('/api/jobs').set(bearer(poster.token)).send(jobPayload(category));
      assert.equal(newJob.status, 400);

      const details = await api().get(`/api/jobs/${existing.id}`);
      assert.equal(details.status, 200);

      await api().patch(`/api/admin/categories/${category.id}`).set(bearer(admin.token)).send({ isActive: true });
      const again = await api().post('/api/jobs').set(bearer(poster.token)).send(jobPayload(category));
      assert.equal(again.status, 201);
    });

    it('rejects an empty update, unknown fields, and a non-boolean isActive', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const category = await createCategory();
      for (const body of [{}, { slug: 'hacked' }, { isActive: 'no' }]) {
        const res = await api().patch(`/api/admin/categories/${category.id}`).set(bearer(admin.token)).send(body);
        assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(body)}`);
      }
    });

    it('returns 404 for an unknown category', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const res = await api().patch('/api/admin/categories/507f1f77bcf86cd799439011').set(bearer(admin.token)).send({ isActive: false });
      assert.equal(res.status, 404);
    });
  });

  describe('DELETE /api/admin/categories/:id', () => {
    it('deletes a category that no job uses', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const category = await createCategory();

      const res = await api().delete(`/api/admin/categories/${category.id}`).set(bearer(admin.token));
      assert.equal(res.status, 200);
      assert.equal(await Category.countDocuments({}), 0);
    });

    it('refuses to delete a category that jobs use, and tells the admin to deactivate it', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const category = await createCategory();
      const poster = await createUser({ role: 'POSTER' });
      await createJob({ poster: poster.user._id, category: category._id });

      const res = await api().delete(`/api/admin/categories/${category.id}`).set(bearer(admin.token));
      assert.equal(res.status, 409);
      assert.match(res.body.message, /deactivate/i);
      assert.equal(await Category.countDocuments({}), 1);
    });

    it('returns 404 for an unknown category and 403 for non-admins', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const unknown = await api().delete('/api/admin/categories/507f1f77bcf86cd799439011').set(bearer(admin.token));
      assert.equal(unknown.status, 404);

      const category = await createCategory();
      const { token } = await createUser({ role: 'POSTER' });
      const forbidden = await api().delete(`/api/admin/categories/${category.id}`).set(bearer(token));
      assert.equal(forbidden.status, 403);
      assert.equal(await Category.countDocuments({}), 1);
    });
  });
});
