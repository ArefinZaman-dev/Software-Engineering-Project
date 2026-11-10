import { Link } from 'react-router-dom';
import { buttonClasses } from '../components/ui/Button.jsx';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">How CampusGig works</h1>
      <p className="mt-3 text-muted">
        CampusGig is a marketplace with two sides. Posters offer short-term jobs and tasks. Students apply for them.
        An admin team keeps the platform safe.
      </p>

      <section className="mt-10" aria-labelledby="students-heading">
        <h2 id="students-heading" className="font-display text-xl font-semibold">If you are a student</h2>
        <p className="mt-2 text-muted">
          Create a profile with your university, skills, and availability. Apply to jobs with a short message. If a
          poster chooses you, the job moves to in progress. When the work is done, you and the poster review each other.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="posters-heading">
        <h2 id="posters-heading" className="font-display text-xl font-semibold">If you are a poster</h2>
        <p className="mt-2 text-muted">
          Describe the job, the pay, and the deadline. Review applicants, shortlist the ones you like, and accept one.
          Each job hires exactly one student. Mark the job complete when the work is finished.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="trust-heading">
        <h2 id="trust-heading" className="font-display text-xl font-semibold">How trust is built</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-muted">
          <li>Every account has a clear role, and profiles show who you are dealing with.</li>
          <li>Only the poster and the student who worked together can review each other, once per job.</li>
          <li>Anyone can report a suspicious job or user, and admins review each report.</li>
          <li>Admins can suspend accounts and remove inappropriate jobs.</li>
        </ul>
        <p className="mt-3 text-muted">
          These tools reduce risk, but they cannot remove it completely. Take normal care when you meet someone or
          agree on a task.
        </p>
      </section>

      <section className="mt-8" aria-labelledby="scope-heading">
        <h2 id="scope-heading" className="font-display text-xl font-semibold">What Version 1 does not include</h2>
        <p className="mt-2 text-muted">
          CampusGig does not handle payments yet. Poster and student agree on payment between themselves. Real-time
          chat, identity verification, and job recommendations are planned for later versions.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/register?role=student" className={buttonClasses()}>
          Join as a student
        </Link>
        <Link to="/register?role=poster" className={buttonClasses({ variant: 'secondary' })}>
          Join as a poster
        </Link>
      </div>
    </div>
  );
}
