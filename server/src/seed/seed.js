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
const LearningResource = require('../models/LearningResource');
const {
  ROLES,
  AVAILABILITY,
  ORGANIZATION_TYPES,
  DEFAULT_CATEGORIES,
  JOB_STATUS,
  WORK_TYPE,
  RESOURCE_TYPE,
} = require('../constants');

// DEVELOPMENT / DEMO ONLY. These are fake accounts with a publicly documented password.
const ADMIN_PASSWORD = 'Admin@12345';
const DEMO_PASSWORD = 'Demo@12345';

const admins = [{ name: 'CampusGig Admin', email: 'admin@campusgig.demo' }];

const students = [
  {
    name: 'Shaikh Arefin Zaman',
    email: 'arefin.zaman@campusgig.demo',
    location: 'Mirpur, Dhaka',
    bio: 'Third-year CSE student who likes building full-stack web apps and explaining maths to school students.',
    studentProfile: {
      university: 'Bangladesh University of Business and Technology',
      department: 'Computer Science and Engineering',
      skills: ['React', 'JavaScript', 'Math Tutoring'],
      availability: AVAILABILITY.EVENINGS,
      experience: 'Built a portfolio website for a family business and tutored two Class 8 students.',
    },
  },
  {
    name: 'Adnan Alam Sagar',
    email: 'adnan.sagar@campusgig.demo',
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
    // Deliberately incomplete, so the dashboard shows a partially filled profile.
    name: 'Nanziba Anzum Moon',
    email: 'nanziba.moon@campusgig.demo',
    location: '',
    bio: '',
    studentProfile: {
      university: 'Bangladesh University of Business and Technology',
      department: 'Computer Science and Engineering',
      skills: ['Data Entry', 'Excel'],
      availability: AVAILABILITY.FLEXIBLE,
      experience: '',
    },
  },
];

const posters = [
  {
    name: 'Anika Anjum',
    email: 'anika.anjum@campusgig.demo',
    location: 'Mirpur, Dhaka',
    bio: 'Looking for reliable tutors and student helpers for short home-based and community tasks.',
    posterProfile: { organizationType: ORGANIZATION_TYPES.INDIVIDUAL, organizationName: '', website: '' },
  },
  {
    name: 'Arpona Rani Bristy',
    email: 'arpona.bristy@campusgig.demo',
    location: 'Banani, Dhaka',
    bio: 'We are a small design studio that regularly needs help with social media content and data entry.',
    posterProfile: {
      organizationType: ORGANIZATION_TYPES.BUSINESS,
      organizationName: 'Riverline Design Studio (demo)',
      website: 'https://example.com',
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
    LearningResource.init(),
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
    LearningResource.deleteMany({}),
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
  const anika = posterByEmail['anika.anjum@campusgig.demo'];
  const bristy = posterByEmail['arpona.bristy@campusgig.demo'];

  const inDays = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const jobs = [
    {
      poster: anika._id,
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
      poster: bristy._id,
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
      poster: bristy._id,
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
      poster: anika._id,
      title: 'Student Volunteers for a Weekend Tree-Planting Event',
      description:
        'I am organising a neighbourhood tree-planting drive and need 5 energetic student helpers on a Saturday morning in Uttara. Duties include registration, guiding participants, and handing out saplings. Breakfast and a certificate provided.',
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
      poster: anika._id,
      title: 'Data Entry for a Client Enquiry Database',
      description:
        'We have about 600 paper client enquiry forms from past projects that need to be entered into a Google Sheet. We will share the template and a scanned copy of each form.',
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
      poster: anika._id,
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

  const createdJobs = await Job.insertMany(jobs);

  // A few demo learning resources (Increment 8) so the "Need to learn this skill?" section and the
  // admin screen have something to show. They point at well-known public sites; an admin replaces
  // them with specific, checked lessons in real use.
  const adminDoc = await User.findOne({ role: ROLES.ADMIN });
  const jobByTitle = Object.fromEntries(createdJobs.map((job) => [job.title, job]));
  const resources = [
    {
      job: jobByTitle['Landing Page for a Small Design Studio']._id,
      title: 'HTML basics: Learn web development (MDN)',
      type: RESOURCE_TYPE.ARTICLE,
      url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development',
      description: 'Start here if you have never written HTML or CSS. Free, step by step.',
      skill: 'HTML & CSS',
    },
    {
      job: jobByTitle['Landing Page for a Small Design Studio']._id,
      title: 'Quick Start: the official React tutorial',
      type: RESOURCE_TYPE.COURSE,
      url: 'https://react.dev/learn',
      description: 'The official guide. Read Quick Start and Describing the UI first.',
      skill: 'React',
    },
    {
      job: jobByTitle['Landing Page for a Small Design Studio']._id,
      title: 'freeCodeCamp.org on YouTube (full web development courses)',
      type: RESOURCE_TYPE.VIDEO,
      url: 'https://www.youtube.com/@freecodecamp',
      description: 'Long, free video courses on HTML, CSS, and React.',
      skill: 'React',
    },
    {
      job: jobByTitle['Landing Page for a Small Design Studio']._id,
      title: 'Before you apply',
      type: RESOURCE_TYPE.NOTE,
      description: 'You only need a clean one-page layout. If you can build a responsive page with a contact form, you are ready to apply.',
      skill: '',
    },
    {
      job: jobByTitle['Instagram Post Designs for a Spring Collection']._id,
      title: 'Canva Design School',
      type: RESOURCE_TYPE.COURSE,
      url: 'https://www.canva.com/designschool/',
      description: 'Free lessons on layouts, colors, and social media graphics.',
      skill: 'Canva',
    },
    {
      job: jobByTitle['Weekend Math Tutor for a Class 9 Student']._id,
      title: 'Khan Academy: Algebra basics',
      type: RESOURCE_TYPE.COURSE,
      url: 'https://www.khanacademy.org/math/algebra-basics',
      description: 'Revise the algebra topics a Class 9 student works on before your first session.',
      skill: 'Math Tutoring',
    },
  ].map((resource) => ({ ...resource, addedBy: adminDoc._id }));
  await LearningResource.insertMany(resources);

  logger.info('Seed complete. Demo accounts (development only):');
  logger.info(`  Admin            admin@campusgig.demo             ${ADMIN_PASSWORD}`);
  [...students, ...posters].forEach((u) =>
    logger.info(`  ${u.name.padEnd(16)} ${u.email.padEnd(32)} ${DEMO_PASSWORD}`)
  );
  logger.info(`Seeded ${categories.length} categories, ${jobs.length} jobs and ${resources.length} learning resources.`);
}

seed()
  .catch((error) => {
    logger.error('Seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
