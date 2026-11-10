import { Link } from 'react-router-dom';
import { buttonClasses } from './ui/Button.jsx';

const MISSING_LABELS = {
  university: 'Add your university',
  department: 'Add your department',
  location: 'Add your location',
  bio: 'Write a short introduction',
  skills: 'Add at least one skill',
  experience: 'Describe your experience',
  organizationName: 'Add your organization name',
};

export default function ProfileCompletionCard({ completion, profilePath }) {
  const { percentage, missing } = completion;

  return (
    <section className="rounded-lg border border-line bg-white p-5" aria-labelledby="completion-heading">
      <h2 id="completion-heading" className="font-display text-lg font-semibold">
        Profile completeness
      </h2>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-paper"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-label="Profile completeness"
      >
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-2 text-sm text-muted">{percentage}% complete</p>

      {missing.length === 0 ? (
        <p className="mt-3 text-sm">Your profile is complete. People can see everything they need to trust it.</p>
      ) : (
        <>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {missing.map((key) => (
              <li key={key}>{MISSING_LABELS[key]}</li>
            ))}
          </ul>
          <Link to={profilePath} className={buttonClasses({ variant: 'secondary', className: 'mt-4' })}>
            Complete your profile
          </Link>
        </>
      )}
    </section>
  );
}
