// IMPORTANT: this must be the first thing a test file requires, because it switches the
// app into test mode (test database, fast password hashing) before any config is read.
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../src/app');
const { connectDB, disconnectDB } = require('../../src/config/db');
const User = require('../../src/models/User');
const Category = require('../../src/models/Category');
const Job = require('../../src/models/Job');
const Application = require('../../src/models/Application');
const Review = require('../../src/models/Review');
const Conversation = require('../../src/models/Conversation');
const Message = require('../../src/models/Message');
const Report = require('../../src/models/Report');
const { hashPassword } = require('../../src/utils/password');
const { signToken } = require('../../src/utils/token');
const { JOB_STATUS, WORK_TYPE } = require('../../src/constants');

const TEST_PASSWORD = 'Test@12345';
let counter = 0;

async function setupDatabase() {
  await connectDB();
  await User.init(); // wait until the unique email index exists
  await Category.init();
  await Job.init();
  await Application.init(); // wait until the unique (job, student) index exists
  await Review.init(); // unique (job, reviewer)
  await Conversation.init(); // unique (application)
  await Message.init();
  await Report.init(); // partial unique index on active reports
}

async function clearDatabase() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

async function teardownDatabase() {
  await disconnectDB();
}

// Creates a user directly in the database and returns it with a valid login token.
async function createUser(overrides = {}) {
  counter += 1;
  const role = overrides.role || 'STUDENT';
  const account = {
    name: `Test ${role.toLowerCase()} ${counter}`,
    email: `${role.toLowerCase()}${counter}@campusgig.test`,
    passwordHash: await hashPassword(TEST_PASSWORD),
    role,
    ...overrides,
  };
  if (role === 'STUDENT' && !account.studentProfile) account.studentProfile = {};
  if (role === 'POSTER' && !account.posterProfile) account.posterProfile = {};

  const user = await User.create(account);
  return { user, token: signToken(user._id), password: TEST_PASSWORD };
}

async function createCategory(overrides = {}) {
  counter += 1;
  const name = overrides.name || `Category ${counter}`;
  return Category.create({ name, slug: Category.slugify(name), ...overrides });
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// Creates a job directly in the database (bypassing the API), for tests that need one to
// already exist. `overrides.poster` and `overrides.category` should be ids.
async function createJob(overrides = {}) {
  counter += 1;
  const category = overrides.category || (await createCategory())._id;
  const poster = overrides.poster || (await createUser({ role: 'POSTER' })).user._id;

  return Job.create({
    title: `Sample job ${counter}`,
    description: 'A sample job description that is long enough to pass validation rules.',
    budget: 1000,
    duration: '1 week',
    location: 'Dhaka',
    workType: WORK_TYPE.REMOTE,
    deadline: daysFromNow(10),
    status: JOB_STATUS.OPEN,
    ...overrides,
    poster,
    category,
  });
}

// Creates an application directly in the database (bypassing the API), for tests that need
// one to already exist in a specific status.
async function createApplication(overrides = {}) {
  const job = overrides.job || (await createJob())._id;
  const student = overrides.student || (await createUser({ role: 'STUDENT' })).user._id;

  return Application.create({
    coverMessage: 'I would love to help with this job. I have relevant experience.',
    status: 'PENDING',
    ...overrides,
    job,
    student,
  });
}

// Builds a complete "hire": a poster, a student, a job and an application for it, wired together
// the way the accept flow leaves them (job.acceptedApplication set). Defaults to the state right
// after the poster accepted: job IN_PROGRESS, application ACCEPTED. Pass `poster` / `student`
// (the objects returned by createUser) to reuse the same people across several jobs.
async function createHire({ jobStatus = 'IN_PROGRESS', applicationStatus = 'ACCEPTED', poster, student } = {}) {
  const category = await createCategory();
  const posterAuth = poster || (await createUser({ role: 'POSTER' }));
  const studentAuth = student || (await createUser({ role: 'STUDENT' }));
  const job = await createJob({ poster: posterAuth.user._id, category: category._id, status: jobStatus });
  const application = await createApplication({
    job: job._id,
    student: studentAuth.user._id,
    status: applicationStatus,
  });
  job.acceptedApplication = application._id;
  await job.save();

  return {
    job,
    application,
    poster: posterAuth.user,
    posterToken: posterAuth.token,
    student: studentAuth.user,
    studentToken: studentAuth.token,
    posterAuth,
    studentAuth,
  };
}

const api = () => request(app);
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = {
  api,
  bearer,
  createUser,
  createCategory,
  createJob,
  createApplication,
  createHire,
  daysFromNow,
  setupDatabase,
  clearDatabase,
  teardownDatabase,
  TEST_PASSWORD,
};
