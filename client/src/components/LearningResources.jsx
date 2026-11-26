import { useId, useState } from 'react';
import Skeleton from './ui/Skeleton.jsx';
import useAsync from '../hooks/useAsync.js';
import { listJobResources } from '../services/resourceService.js';
import { RESOURCE_TYPE_BADGES } from '../utils/constants.js';

// Small inline icons (no icon library needed). Each is decorative, so aria-hidden.
const ICON_PATHS = {
  VIDEO: 'M5 4.5v11l10-5.5-10-5.5z',
  ARTICLE: 'M5 3h7l3 3v11H5V3zm2 6h6M7 12h6M7 15h4',
  COURSE: 'M2 8l8-4 8 4-8 4-8-4zm3 2.5V14c0 1 2.2 2 5 2s5-1 5-2v-3.5',
  DOCUMENT: 'M6 3h6l3 3v11H6V3zm6 0v3h3',
  NOTE: 'M10 9v5m0-8.5v.01M10 18a8 8 0 100-16 8 8 0 000 16z',
  OTHER: 'M8 12l4-4m-2.5-2.5l1-1a3 3 0 014.2 4.2l-1 1M10.5 14.5l-1 1a3 3 0 01-4.2-4.2l1-1',
};

function Icon({ d, className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function Chevron({ open }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true">
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}

// One resource card. A resource with a link opens in a new tab (rel="noopener noreferrer" so the
// other site cannot reach back into this one); a NOTE is plain text with no link.
function ResourceCard({ resource }) {
  const iconPath = ICON_PATHS[resource.type] || ICON_PATHS.OTHER;
  return (
    <li className="flex gap-3 rounded-lg border border-line bg-white p-4 transition-shadow hover:shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Icon d={iconPath} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            {RESOURCE_TYPE_BADGES[resource.type] || 'Link'}
          </span>
          {resource.skill && <span className="rounded-full bg-mark-soft px-2.5 py-0.5 text-xs text-ink">{resource.skill}</span>}
        </div>

        <p className="mt-1.5 font-display font-semibold">{resource.title}</p>
        {resource.description && <p className="mt-1 whitespace-pre-line text-sm text-muted">{resource.description}</p>}

        {resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50"
          >
            Open resource
            <span aria-hidden="true">↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
    </li>
  );
}

// "Need to learn this skill first?" Shown on the job page and on the apply page.
// Nothing is listed until the student presses the button, so the page stays clean for students who
// already have the skill. It shows nothing at all when the job has no resources or the request
// fails: learning help is an extra, so it must never get in the way of reading the job or applying.
export default function LearningResources({ jobId, compact = false }) {
  const { data, loading } = useAsync(() => listJobResources(jobId), [jobId]);
  const [open, setOpen] = useState(false);
  const panelId = useId();

  if (loading && !data) {
    return compact ? null : <Skeleton className="mt-6 h-20" />;
  }
  const resources = data?.resources || [];
  if (resources.length === 0) return null;

  const count = resources.length;
  const countLabel = `${count} ${count === 1 ? 'resource' : 'resources'}`;

  return (
    <section className="mt-6 rounded-lg border border-brand-100 bg-brand-50/60 p-4" aria-label="Learning resources">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-700">
            <Icon d={ICON_PATHS.COURSE} />
          </span>
          <div>
            <h2 className="font-display text-base font-semibold">
              {compact ? 'Not sure you have the skills yet?' : 'Need to learn this skill first?'}
            </h2>
            <p className="text-sm text-muted">
              Interested but not ready? Our admin picked {countLabel} to help you get ready.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          {open ? 'Hide learning resources' : `Show learning resources (${count})`}
          <Chevron open={open} />
        </button>
      </div>

      {open && (
        <div id={panelId} className="resources-reveal mt-4">
          <ul className="space-y-3">
            {resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">Learn the basics, then come back and apply.</p>
        </div>
      )}
    </section>
  );
}
