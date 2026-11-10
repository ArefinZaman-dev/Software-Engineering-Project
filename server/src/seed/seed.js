const config = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const { hashPassword } = require('../utils/password');
const logger = require('../utils/logger');
const Category = require('../models/Category');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Review = require('../models/Review');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Report = require('../models/Report');
const { ROLES, AVAILABILITY, ORGANIZATION_TYPES, DEFAULT_CATEGORIES, JOB_STATUS, WORK_TYPE } = require('../constants');

// DEVELOPMENT / DEMO ONLY. These are fake accounts with a publicly documented password.
const ADMIN_PASSWORD = 'Admin@12345';
const DEMO_PASSWORD = 'Demo@12345';

const admins = [{ name: 'CampusGig Admin', email: 'admin@campusgig.demo' }];

const students = [
  {
    name: 'Nusrat Jahan',
    email: 'nusrat.jahan@campusgig.demo',
    location: 'Mirpur, Dhaka',
    bio: 'Third-year CSE student who enjoys visual design. I take on posters, social media graphics, and simple branding work.',
    studentProfile: {
      university: 'Bangladesh University of Business and Technology',
      department: 'Computer Science and Engineering',
      skills: ['Graphic Design', 'Canva', 'Content Writing'],
      availability: AVAILABILITY.WEEKENDS,
      experience: 'Designed event posters for two university club programs and a small online clothing shop.',
    },
  },
  {
    name: 'Tanvir Ahmed',
    email: 'tanvir.ahmed@campusgig.demo',
    location: 'Mirpur, Dhaka',
    bio: 'CSE student who likes building small websites and explaining maths to school students.',
    studentProfile: {
      university: 'Bangladesh University of Business and Technology',
      department: 'Computer Science and Engineering',
      skills: ['React', 'JavaScript', 'Math Tutoring'],
      availability: AVAILABILITY.EVENINGS,
      experience: 'Built a portfolio website for a family business and tutored two Class 8 students.',
    },
  },
  {
    // Deliberately incomplete, so the dashboard shows a partially filled profile.
    name: 'Farhana Akter',
    email: 'farhana.akter@campusgig.demo',
    location: '',
    bio: '',
    studentProfile: {
      university: 'Bangladesh University of Business and Technology',
      department: 'Business Administration',
      skills: ['Data Entry', 'Excel'],
      availability: AVAILABILITY.FLEXIBLE,
      experience: '',
    },
  },
];

const posters = [
  {
    name: 'Rafiq Hasan',
    email: 'rafiq.hasan@campusgig.demo',
    location: 'Mirpur, Dhaka',
    bio: 'Parent looking for reliable tutors and helpers for short home-based tasks.',
    posterProfile: { organizationType: ORGANIZATION_TYPES.INDIVIDUAL, organizationName: '', website: '' },
  },
  {
    name: 'Sadia Rahman',
    email: 'sadia.rahman@campusgig.demo',
    location: 'Banani, Dhaka',
    bio: 'We are a small design studio that regularly needs help with social media content and data entry.',
    posterProfile: {
      organizationType: ORGANIZATION_TYPES.BUSINESS,
      organizationName: 'Riverline Design Studio (demo)',
      website: 'https://example.com',
    },
  },
  {
    name: 'Imran Hossain',
    email: 'imran.hossain@campusgig.demo',
    location: 'Uttara, Dhaka',
    bio: 'A youth volunteer group that runs weekend events and needs student helpers.',
    posterProfile: {
      organizationType: ORGANIZATION_TYPES.ORGANIZATION,
      organizationName: 'Green Valley Youth Foundation (demo)',
      website: '',
    },
  },
];

async function seed() {
  if (config.isProduction) {
    throw new Error('Refusing to seed demo data when NODE_ENV=production.');
  }

  await connectDB();
  await User.init();
  await Category.init();
  await Job.init();
  // Everything that points at users or jobs is cleared too, so no application, review, message,
  // or report is left behind referring to a user or job that no longer exists.
  await Promise.all([
    Application.init(),
    Review.init(),
    Conversation.init(),
    Message.init(),
    Report.init(),
  ]);
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Job.deleteMany({}),
    Application.deleteMany({}),
    Review.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    Report.deleteMany({}),
  ]);

  const adminHash = await hashPassword(ADMIN_PASSWORD);
  const demoHash = await hashPassword(DEMO_PASSWORD);

  await User.create([
    ...admins.map((a) => ({ ...a, role: ROLES.ADMIN, passwordHash: adminHash })),
    ...students.map((s) => ({ ...s, role: ROLES.STUDENT, passwordHash: demoHash })),
    ...posters.map((p) => ({ ...p, role: ROLES.POSTER, passwordHash: demoHash })),
  ]);

  const categories = await Category.insertMany(
    DEFAULT_CATEGORIES.map((name) => ({ name, slug: Category.slugify(name) }))
  );
  const categoryByName = Object.fromEntries(categories.map((c) => [c.name, c]));

  // Look posters up by email. Sorting by createdAt is not reliable: users saved together can
  // end up in any order, which previously gave jobs to the wrong poster.
  const posterDocs = await User.find({ role: ROLES.POSTER });
  const posterByEmail = Object.fromEntries(posterDocs.map((doc) => [doc.email, doc]));
  const rafiq = posterByEmail['rafiq.hasan@campusgig.demo'];
  const sadia = posterByEmail['sadia.rahman@campusgig.demo'];
  const imran = posterByEmail['imran.hossain@campusgig.demo'];

  const inDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const jobs = [
    {
      poster: rafiq._id,
      title: 'Weekend Math Tutor for a Class 9 Student',
      description:
        'Looking for a patient CSE or Math student to tutor my son in algebra and geometry twice a week. Sessions are at our home in Mirpur, about 90 minutes each. Please share a bit about your tutoring experience when you apply.',
      category: categoryByName.Tutoring._id,
      skills: ['Math Tutoring', 'Patience with beginners'],
      budget: 4000,
      duration: 'Ongoing, 2 sessions/week',
      location: 'Mirpur, Dhaka',
      workType: WORK_TYPE.ON_SITE,
      deadline: inDays(14),
      status: JOB_STATUS.OPEN,
    },
    {
      poster: sadia._id,
      title: 'Instagram Post Designs for a Spring Collection',
      description:
        'We need 10 square Instagram post designs for our spring clothing collection launch. We will share the product photos and brand colors. Canva or Figma files are both fine, as long as source files are included.',
      category: categoryByName['Graphic Design']._id,
      skills: ['Graphic Design', 'Canva', 'Social Media'],
      budget: 3500,
      duration: '1 week',
      location: 'Remote',
      workType: WORK_TYPE.REMOTE,
      deadline: inDays(10),
      status: JOB_STATUS.OPEN,
    },
    {
      poster: sadia._id,
      title: 'Landing Page for a Small Design Studio',
      description:
        'We want a clean one-page website with our portfolio, services, and a contact form. React or plain HTML/CSS is fine. This could turn into ongoing work if it goes well.',
      category: categoryByName['Web Development']._id,
      skills: ['React', 'HTML', 'CSS'],
      budget: 8000,
      duration: '2 weeks',
      location: 'Remote',
      workType: WORK_TYPE.REMOTE,
      deadline: inDays(21),
      status: JOB_STATUS.OPEN,
    },
    {
      poster: imran._id,
      title: 'Student Volunteers for a Weekend Tree-Planting Event',
      description:
        'We need 5 energetic student helpers for a Saturday morning tree-planting drive in Uttara. Duties include registration, guiding participants, and handing out saplings. Breakfast and a certificate provided.',
      category: categoryByName['Event Staffing']._id,
      skills: ['Event Staffing', 'Communication'],
      budget: 1000,
      duration: 'One day (4 hours)',
      location: 'Uttara, Dhaka',
      workType: WORK_TYPE.ON_SITE,
      deadline: inDays(7),
      status: JOB_STATUS.OPEN,
    },
    {
      poster: imran._id,
      title: 'Data Entry for a Volunteer Database',
      description:
        'We have about 600 paper registration forms from past events that need to be entered into a Google Sheet. We will share the template and a scanned copy of each form.',
      category: categoryByName['Data Entry']._id,
      skills: ['Data Entry', 'Excel'],
      budget: 2500,
      duration: '5 days',
      location: 'Remote',
      workType: WORK_TYPE.REMOTE,
      deadline: inDays(12),
      status: JOB_STATUS.OPEN,
    },
    {
      // Deliberately closed, so the seed shows more than one job status.
      poster: rafiq._id,
      title: 'Help Moving Furniture This Saturday',
      description:
        'Needed one or two students to help carry furniture from a second-floor apartment to a moving truck. Should take about 3 hours on Saturday morning.',
      category: categoryByName['Delivery/Helper']._id,
      skills: [],
      budget: 1200,
      duration: 'Half a day',
      location: 'Mirpur, Dhaka',
      workType: WORK_TYPE.ON_SITE,
      deadline: inDays(-2),
      status: JOB_STATUS.CLOSED,
    },
  ];

  await Job.insertMany(jobs);

  logger.info('Seed complete. Demo accounts (development only):');
  logger.info(`  Admin            admin@campusgig.demo             ${ADMIN_PASSWORD}`);
  [...students, ...posters].forEach((u) =>
    logger.info(`  ${u.name.padEnd(16)} ${u.email.padEnd(32)} ${DEMO_PASSWORD}`)
  );
  logger.info(`Seeded ${categories.length} categories and ${jobs.length} jobs.`);
}

seed()
  .catch((error) => {
    logger.error('Seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
