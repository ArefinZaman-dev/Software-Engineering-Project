import Skeleton from './ui/Skeleton.jsx';
import useAsync from '../hooks/useAsync.js';
import { listJobResources } from '../services/resourceService.js';
import { RESOURCE_TYPE_BADGES } from '../utils/constants.js';

// One resource card. A resource with a link opens in a new tab (rel="noopener noreferrer" so the
// other site cannot reach back into this one); a NOTE is plain text with no link.
function ResourceCard({ resource }) {
  return (
    <li className="rounded-md border border-line bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
          {RESOURCE_TYPE_BADGES[resource.type] || 'Link'}
        </span>
        {resource.skill && <span className="rounded-full bg-mark-soft px-2.5 py-0.5 text-xs text-ink">{resource.skill}</span>}
      </div>

      <p className="mt-2 font-display font-semibold">
        {resource.url ? (
          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">
            {resource.title}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          resource.title
        )}
      </p>
      {resource.description && <p className="mt-1 whitespace-pre-line text-sm text-ink">{resource.description}</p>}
    </li>
  );
}

function ResourceList({ resources }) {
  return (
    <ul className="space-y-3">
      {resources.map((resource) => (
        <ResourceCard key={resource.id} resource={resource} />
      ))}
    </ul>
  );
}

// "Need to learn this skill first?" Shown on the job page and, collapsed, on the apply page.
// It shows nothing when the job has no resources or the request fails: learning help is an extra,
// so it must never get in the way of reading the job or applying for it.
export default function LearningResources({ jobId, compact = false }) {
  const { data, loading } = useAsync(() => listJobResources(jobId), [jobId]);

  if (loading && !data) {
    return compact ? null : <Skeleton className="mt-6 h-24" />;
  }
  const resources = data?.resources || [];
  if (resources.length === 0) return null;

  if (compact) {
    return (
      <details className="mt-6 rounded-lg border border-line bg-white p-4">
        <summary className="cursor-pointer font-medium text-brand-700">
          Not sure you have the skills? See learning resources ({resources.length})
        </summary>
        <div className="mt-4">
          <ResourceList resources={resources} />
        </div>
      </details>
    );
  }

  return (
    <section className="mt-6" aria-labelledby="learning-heading">
      <h2 id="learning-heading" className="font-display text-lg font-semibold">
        Need to learn this skill first?
      </h2>
      <p className="mt-1 text-sm text-muted">
        Our admin picked these to help you get ready. Learn the basics, then come back and apply.
      </p>
      <div className="mt-3">
        <ResourceList resources={resources} />
      </div>
    </section>
  );
}
