const {
  api,
  bearer,
  createUser,
  createJob,
  createCategory,
  createApplication,
  createHire,
  setupDatabase,
  clearDatabase,
  teardownDatabase,
} = require('./helpers/testApp');
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const Report = require('../src/models/Report');
const Review = require('../src/models/Review');

describe('Admin: statistics', () => {
  before(setupDatabase);
  beforeEach(clearDatabase);
  after(teardownDatabase);

  it('returns all zeros (apart from the admin) on an empty platform', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const res = await api().get('/api/admin/stats').set(bearer(admin.token));

    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.stats, {
      totalUsers: 1,
      students: 0,
      posters: 0,
      suspendedUsers: 0,
      totalJobs: 0,
      openJobs: 0,
      inProgressJobs: 0,
      completedJobs: 0,
      removedJobs: 0,
      totalApplications: 0,
      totalReviews: 0,
      openReports: 0,
    });
  });

  it('counts users, jobs, applications, reviews and open reports', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const category = await createCategory();
    const poster = await createUser({ role: 'POSTER' });
    const student = await createUser({ role: 'STUDENT' });
    await createUser({ role: 'STUDENT', status: 'SUSPENDED' });

    await createJob({ poster: poster.user._id, category: category._id }); // open
    await createJob({ poster: poster.user._id, category: category._id, removedByAdmin: true }); // open but removed
    const open = await createJob({ poster: poster.user._id, category: category._id });
    await createApplication({ job: open._id, student: student.user._id });
    await createHire(); // in progress, with its own poster, student and application
    const done = await createHire({ jobStatus: 'COMPLETED', applicationStatus: 'COMPLETED' });
    await Review.create({
      job: done.job._id,
      application: done.application._id,
      reviewer: done.poster._id,
      reviewee: done.student._id,
      rating: 5,
    });
    await Review.create({
      job: done.job._id,
      application: done.application._id,
      reviewer: done.student._id,
      reviewee: done.poster._id,
      rating: 4,
      removedByAdmin: true,
    });
    await Report.create({ reporter: student.user._id, targetType: 'JOB', targetJob: open._id, reason: 'SPAM' });
    await Report.create({
      reporter: done.student._id,
      targetType: 'JOB',
      targetJob: open._id,
      reason: 'SPAM',
      status: 'RESOLVED',
    });

    const res = await api().get('/api/admin/stats').set(bearer(admin.token));
    const { stats } = res.body.data;

    assert.equal(stats.totalUsers, 1 + 1 + 1 + 1 + 2 + 2); // admin, poster, student, suspended, hire x2 people
    assert.equal(stats.suspendedUsers, 1);
    assert.equal(stats.totalJobs, 5);
    assert.equal(stats.openJobs, 2); // the removed open job is not counted
    assert.equal(stats.inProgressJobs, 1);
    assert.equal(stats.completedJobs, 1);
    assert.equal(stats.removedJobs, 1);
    assert.equal(stats.totalApplications, 3);
    assert.equal(stats.totalReviews, 1); // the removed review is not counted
    assert.equal(stats.openReports, 1); // the resolved report is not counted
  });

  it('is admin only', async () => {
    const anonymous = await api().get('/api/admin/stats');
    assert.equal(anonymous.status, 401);
    const { token } = await createUser({ role: 'STUDENT' });
    const res = await api().get('/api/admin/stats').set(bearer(token));
    assert.equal(res.status, 403);
  });
});
