import { Link } from 'react-router-dom';
import { buttonClasses } from '../components/ui/Button.jsx';

const STEPS = [
  { title: 'Post', text: 'A poster describes the task, the pay, and the deadline.' },
  { title: 'Apply', text: 'Students send a short message and, if they like, a proposed amount.' },
  { title: 'Select', text: 'The poster shortlists applicants and chooses one student.' },
  { title: 'Work', text: 'The job moves to in progress and both sides can message each other.' },
  { title: 'Review', text: 'After completion, each side leaves one rating and a short comment.' },
];

const AUDIENCES = [
  {
    title: 'For students',
    points: [
      'Find short-term jobs that fit your timetable and skills.',
      'Build a profile with your skills, experience, and availability.',
      'Collect reviews that show future posters you are reliable.',
    ],
  },
  {
    title: 'For posters',
    points: [
      'Hire a student for a one-off task, an event, or a small project.',
      'Compare applicants by profile, skills, and past reviews.',
      'Report suspicious activity and let admins act on it.',
    ],
  },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-14 sm:pt-20">
        <h1 className="max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Trusted flexible work for university students.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">
          CampusGig connects students with individuals, businesses, and organizations that need short-term help.
          Every job runs through profiles, reviews, and moderation, so both sides know who they are working with.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/register?role=student" className={buttonClasses({ size: 'lg' })}>
            Create a student account
          </Link>
          <Link to="/register?role=poster" className={buttonClasses({ size: 'lg', variant: 'secondary' })}>
            Hire students
          </Link>
          <Link to="/jobs" className={buttonClasses({ size: 'lg', variant: 'ghost' })}>
            Browse open jobs
          </Link>
        </div>
      </section>

      <section className="border-y border-line bg-white" aria-labelledby="workflow-heading">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 id="workflow-heading" className="font-display text-2xl font-bold sm:text-3xl">
            How a job moves from post to review
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, index) => (
              <li key={step.title} className="border-t-4 border-ink pt-4">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-mark font-display font-bold">
                  {index + 1}
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 md:grid-cols-2">
          {AUDIENCES.map((audience) => (
            <div key={audience.title} className="rounded-lg border border-line bg-white p-6">
              <h2 className="font-display text-xl font-semibold">{audience.title}</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
                {audience.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
