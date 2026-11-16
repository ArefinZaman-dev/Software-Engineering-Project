const {
  api,
  bearer,
  createUser,
  createJob,
  createCategory,
  createResource,
  setupDatabase,
  clearDatabase,
  teardownDatabase,
} = require('./helpers/testApp');
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const Job = require('../src/models/Job');
const LearningResource = require('../src/models/LearningResource');

const validBody = {
  title: 'React crash course',
  type: 'VIDEO',
  url: 'https://www.youtube.com/watch?v=abc123',
  description: 'A two-hour introduction. Watch the first hour before applying.',
  skill: 'React',
};

async function setupJob(overrides = {}) {
  const category = await createCategory();
  const poster = await createUser({ role: 'POSTER' });
  const job = await createJob({ poster: poster.user._id, category: category._id, ...overrides });
  return { job, poster, category };
}

describe('Learning resources', () => {
  before(setupDatabase);
  beforeEach(clearDatabase);
  after(teardownDatabase);

  describe('GET /api/jobs/:id/resources (public)', () => {
    it('lists the job resources in the order they were added, without logging in', async () => {
      const { job } = await setupJob();
      const first = await createResource({ job: job._id, title: 'First lesson' });
      const second = await createResource({ job: job._id, title: 'Second lesson' });

      const res = await api().get(`/api/jobs/${job.id}/resources`);

      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data.resources.map((r) => r.title), ['First lesson', 'Second lesson']);
      assert.equal(res.body.data.resources[0].id, first.id);
      assert.equal(res.body.data.resources[1].id, second.id);
    });

    it('returns id (not _id), and never reveals who added it', async () => {
      const { job } = await setupJob();
      await createResource({ job: job._id, skill: 'React', description: 'Start here.' });

      const res = await api().get(`/api/jobs/${job.id}/resources`);
      const [item] = res.body.data.resources;

      assert.ok(item.id);
      assert.equal(item._id, undefined);
      assert.equal(item.addedBy, undefined);
      assert.equal(item.job.toString(), job.id);
      assert.equal(item.type, 'ARTICLE');
      assert.equal(item.skill, 'React');
    });

    it('returns an empty list for a job with no resources', async () => {
      const { job } = await setupJob();
      const res = await api().get(`/api/jobs/${job.id}/resources`);
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data.resources, []);
    });

    it('only returns the resources of the requested job', async () => {
      const { job } = await setupJob();
      const other = await setupJob();
      await createResource({ job: job._id, title: 'Mine' });
      await createResource({ job: other.job._id, title: 'Not mine' });

      const res = await api().get(`/api/jobs/${job.id}/resources`);
      assert.deepEqual(res.body.data.resources.map((r) => r.title), ['Mine']);
    });

    it('answers 404 for a job an admin removed', async () => {
      const { job } = await setupJob({ removedByAdmin: true });
      await createResource({ job: job._id });
      const res = await api().get(`/api/jobs/${job.id}/resources`);
      assert.equal(res.status, 404);
    });

    it('answers 404 when the poster is suspended', async () => {
      const category = await createCategory();
      const poster = await createUser({ role: 'POSTER', status: 'SUSPENDED' });
      const job = await createJob({ poster: poster.user._id, category: category._id });
      await createResource({ job: job._id });
      const res = await api().get(`/api/jobs/${job.id}/resources`);
      assert.equal(res.status, 404);
    });

    it('answers 404 for an unknown job and 400 for a malformed id', async () => {
      const unknown = await api().get('/api/jobs/64b64c9a7f1e8c0012345678/resources');
      assert.equal(unknown.status, 404);
      const malformed = await api().get('/api/jobs/not-an-id/resources');
      assert.equal(malformed.status, 400);
    });
  });

  describe('POST /api/admin/jobs/:id/resources', () => {
    it('lets an admin add a resource to a job', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job } = await setupJob();

      const res = await api().post(`/api/admin/jobs/${job.id}/resources`).set(bearer(admin.token)).send(validBody);

      assert.equal(res.status, 201);
      const { resource } = res.body.data;
      assert.ok(resource.id);
      assert.equal(resource._id, undefined);
      assert.equal(resource.title, 'React crash course');
      assert.equal(resource.type, 'VIDEO');
      assert.equal(resource.url, validBody.url);
      assert.equal(resource.skill, 'React');
      assert.equal(resource.job.toString(), job.id);

      const stored = await LearningResource.findById(resource.id);
      assert.equal(stored.addedBy.toString(), admin.user.id); // the server records who added it
    });

    it('takes the job from the URL and ignores a job or addedBy in the body', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job } = await setupJob();
      const other = await setupJob();

      const res = await api()
        .post(`/api/admin/jobs/${job.id}/resources`)
        .set(bearer(admin.token))
        .send({ ...validBody, job: other.job.id, addedBy: other.poster.user.id });

      assert.equal(res.status, 201);
      const stored = await LearningResource.findById(res.body.data.resource.id);
      assert.equal(stored.job.toString(), job.id);
      assert.equal(stored.addedBy.toString(), admin.user.id);
    });

    it('accepts a NOTE with text and no link', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job } = await setupJob();

      const res = await api()
        .post(`/api/admin/jobs/${job.id}/resources`)
        .set(bearer(admin.token))
        .send({ title: 'Before you apply', type: 'NOTE', description: 'You only need the basics.' });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.resource.url, '');
    });

    it('rejects a link-type resource without a link and a NOTE without text', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job } = await setupJob();

      const noLink = await api()
        .post(`/api/admin/jobs/${job.id}/resources`)
        .set(bearer(admin.token))
        .send({ title: 'A video', type: 'VIDEO' });
      assert.equal(noLink.status, 400);
      assert.equal(noLink.body.errors[0].field, 'url');

      const noText = await api()
        .post(`/api/admin/jobs/${job.id}/resources`)
        .set(bearer(admin.token))
        .send({ title: 'A note', type: 'NOTE' });
      assert.equal(noText.status, 400);
      assert.equal(noText.body.errors[0].field, 'description');
    });

    it('rejects a javascript: link, an unknown type and a short title', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job } = await setupJob();
      const post = (body) => api().post(`/api/admin/jobs/${job.id}/resources`).set(bearer(admin.token)).send(body);

      assert.equal((await post({ ...validBody, url: 'javascript:alert(1)' })).status, 400);
      assert.equal((await post({ ...validBody, type: 'PODCAST' })).status, 400);
      assert.equal((await post({ ...validBody, title: 'ab' })).status, 400);
      assert.equal(await LearningResource.countDocuments(), 0);
    });

    it('stops at 20 resources per job', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job } = await setupJob();
      await LearningResource.insertMany(
        Array.from({ length: 20 }, (_, i) => ({
          job: job._id,
          addedBy: admin.user._id,
          title: `Lesson ${i + 1}`,
          type: 'ARTICLE',
          url: 'https://example.com/learn',
        }))
      );

      const res = await api().post(`/api/admin/jobs/${job.id}/resources`).set(bearer(admin.token)).send(validBody);
      assert.equal(res.status, 409);
      assert.equal(await LearningResource.countDocuments({ job: job._id }), 20);
    });

    it('can add to a removed job (so it is ready when the job is restored)', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job } = await setupJob({ removedByAdmin: true });
      const res = await api().post(`/api/admin/jobs/${job.id}/resources`).set(bearer(admin.token)).send(validBody);
      assert.equal(res.status, 201);
    });

    it('answers 404 for an unknown job and 400 for a malformed id', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const unknown = await api()
        .post('/api/admin/jobs/64b64c9a7f1e8c0012345678/resources')
        .set(bearer(admin.token))
        .send(validBody);
      assert.equal(unknown.status, 404);

      const malformed = await api().post('/api/admin/jobs/nope/resources').set(bearer(admin.token)).send(validBody);
      assert.equal(malformed.status, 400);
    });

    it('is closed to posters, students and visitors', async () => {
      const { job, poster } = await setupJob();
      const student = await createUser({ role: 'STUDENT' });

      const asPoster = await api().post(`/api/admin/jobs/${job.id}/resources`).set(bearer(poster.token)).send(validBody);
      assert.equal(asPoster.status, 403); // even the poster of this very job

      const asStudent = await api().post(`/api/admin/jobs/${job.id}/resources`).set(bearer(student.token)).send(validBody);
      assert.equal(asStudent.status, 403);

      const anonymous = await api().post(`/api/admin/jobs/${job.id}/resources`).send(validBody);
      assert.equal(anonymous.status, 401);

      assert.equal(await LearningResource.countDocuments(), 0);
    });
  });

  describe('GET /api/admin/jobs/:id/resources', () => {
    it('returns the job title and its resources, also for a removed job', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job } = await setupJob({ title: 'Landing page for a studio', removedByAdmin: true });
      await createResource({ job: job._id, title: 'Lesson A' });

      const res = await api().get(`/api/admin/jobs/${job.id}/resources`).set(bearer(admin.token));

      assert.equal(res.status, 200);
      assert.equal(res.body.data.job.id, job.id);
      assert.equal(res.body.data.job.title, 'Landing page for a studio');
      assert.deepEqual(res.body.data.resources.map((r) => r.title), ['Lesson A']);
    });

    it('answers 404 for an unknown job and is closed to non-admins', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const unknown = await api().get('/api/admin/jobs/64b64c9a7f1e8c0012345678/resources').set(bearer(admin.token));
      assert.equal(unknown.status, 404);

      const { job, poster } = await setupJob();
      const forbidden = await api().get(`/api/admin/jobs/${job.id}/resources`).set(bearer(poster.token));
      assert.equal(forbidden.status, 403);
      const anonymous = await api().get(`/api/admin/jobs/${job.id}/resources`);
      assert.equal(anonymous.status, 401);
    });
  });

  describe('PATCH /api/admin/resources/:id', () => {
    it('updates only the fields that were sent', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const resource = await createResource({ title: 'Old title', skill: 'React' });

      const res = await api()
        .patch(`/api/admin/resources/${resource.id}`)
        .set(bearer(admin.token))
        .send({ title: 'New title' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.resource.title, 'New title');
      assert.equal(res.body.data.resource.skill, 'React');
      assert.equal(res.body.data.resource.url, 'https://example.com/learn');
    });

    it('cannot move a resource to another job or change who added it', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const resource = await createResource();
      const other = await setupJob();

      const moveJob = await api()
        .patch(`/api/admin/resources/${resource.id}`)
        .set(bearer(admin.token))
        .send({ job: other.job.id });
      assert.equal(moveJob.status, 400);

      const changeOwner = await api()
        .patch(`/api/admin/resources/${resource.id}`)
        .set(bearer(admin.token))
        .send({ addedBy: admin.user.id });
      assert.equal(changeOwner.status, 400);

      const stored = await LearningResource.findById(resource.id);
      assert.equal(stored.job.toString(), resource.job.toString());
    });

    it('rejects an empty update', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const resource = await createResource();
      const res = await api().patch(`/api/admin/resources/${resource.id}`).set(bearer(admin.token)).send({});
      assert.equal(res.status, 400);
    });

    it('checks the type rule on the merged result', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const note = await createResource({ type: 'NOTE', url: '', description: 'Some text.' });
      const video = await createResource({ type: 'VIDEO', url: 'https://example.com/v' });

      // A NOTE turned into a VIDEO still has no link.
      const needsLink = await api().patch(`/api/admin/resources/${note.id}`).set(bearer(admin.token)).send({ type: 'VIDEO' });
      assert.equal(needsLink.status, 400);
      assert.equal(needsLink.body.errors[0].field, 'url');

      // Clearing the link of a VIDEO is not allowed.
      const clearLink = await api().patch(`/api/admin/resources/${video.id}`).set(bearer(admin.token)).send({ url: '' });
      assert.equal(clearLink.status, 400);

      // Turning a NOTE into a VIDEO is fine when a link is sent in the same request.
      const ok = await api()
        .patch(`/api/admin/resources/${note.id}`)
        .set(bearer(admin.token))
        .send({ type: 'VIDEO', url: 'https://example.com/new' });
      assert.equal(ok.status, 200);
      assert.equal(ok.body.data.resource.type, 'VIDEO');

      const stored = await LearningResource.findById(video.id);
      assert.equal(stored.url, 'https://example.com/v'); // the rejected update changed nothing
    });

    it('answers 404 for an unknown resource and is closed to non-admins', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const unknown = await api()
        .patch('/api/admin/resources/64b64c9a7f1e8c0012345678')
        .set(bearer(admin.token))
        .send({ title: 'Whatever title' });
      assert.equal(unknown.status, 404);

      const resource = await createResource();
      const student = await createUser({ role: 'STUDENT' });
      const forbidden = await api()
        .patch(`/api/admin/resources/${resource.id}`)
        .set(bearer(student.token))
        .send({ title: 'Hacked title' });
      assert.equal(forbidden.status, 403);
    });
  });

  describe('DELETE /api/admin/resources/:id', () => {
    it('removes the resource', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const resource = await createResource();

      const res = await api().delete(`/api/admin/resources/${resource.id}`).set(bearer(admin.token));
      assert.equal(res.status, 200);
      assert.equal(await LearningResource.countDocuments(), 0);

      const again = await api().delete(`/api/admin/resources/${resource.id}`).set(bearer(admin.token));
      assert.equal(again.status, 404);
    });

    it('is closed to posters, students and visitors', async () => {
      const resource = await createResource();
      const poster = await createUser({ role: 'POSTER' });
      const student = await createUser({ role: 'STUDENT' });

      assert.equal((await api().delete(`/api/admin/resources/${resource.id}`).set(bearer(poster.token))).status, 403);
      assert.equal((await api().delete(`/api/admin/resources/${resource.id}`).set(bearer(student.token))).status, 403);
      assert.equal((await api().delete(`/api/admin/resources/${resource.id}`)).status, 401);
      assert.equal(await LearningResource.countDocuments(), 1);
    });
  });

  describe('Connected behaviour', () => {
    it('deleting a job (by its poster) deletes its resources too', async () => {
      const { job, poster } = await setupJob();
      const other = await setupJob();
      await createResource({ job: job._id });
      await createResource({ job: other.job._id });

      const res = await api().delete(`/api/jobs/${job.id}`).set(bearer(poster.token));
      assert.equal(res.status, 200);

      assert.equal(await Job.countDocuments({ _id: job._id }), 0);
      assert.equal(await LearningResource.countDocuments({ job: job._id }), 0);
      assert.equal(await LearningResource.countDocuments({ job: other.job._id }), 1); // untouched
    });

    it('closing or removing a job keeps its resources', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job } = await setupJob();
      await createResource({ job: job._id });

      await api().post(`/api/admin/jobs/${job.id}/remove`).set(bearer(admin.token));
      await api().post(`/api/admin/jobs/${job.id}/restore`).set(bearer(admin.token));

      const res = await api().get(`/api/jobs/${job.id}/resources`);
      assert.equal(res.body.data.resources.length, 1);
    });

    it('the admin job list shows how many resources each job has', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const withTwo = await setupJob({ title: 'Job with two resources' });
      const withNone = await setupJob({ title: 'Job with no resources' });
      await createResource({ job: withTwo.job._id });
      await createResource({ job: withTwo.job._id });

      const res = await api().get('/api/admin/jobs').set(bearer(admin.token));
      const byTitle = Object.fromEntries(res.body.data.jobs.map((j) => [j.title, j.resourceCount]));

      assert.equal(byTitle['Job with two resources'], 2);
      assert.equal(byTitle['Job with no resources'], 0);
      assert.ok(withNone.job);
    });

    it('the admin statistics count the learning resources', async () => {
      const admin = await createUser({ role: 'ADMIN' });
      const { job } = await setupJob();
      await createResource({ job: job._id });
      await createResource({ job: job._id });

      const res = await api().get('/api/admin/stats').set(bearer(admin.token));
      assert.equal(res.body.data.stats.learningResources, 2);
    });
  });
});
