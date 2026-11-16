import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ResourceForm from '../../components/admin/ResourceForm.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import PageLoader from '../../components/ui/PageLoader.jsx';
import useAction from '../../hooks/useAction.js';
import useAsync from '../../hooks/useAsync.js';
import { createResource, deleteResource, listAdminJobResources, updateResource } from '../../services/adminService.js';
import { MAX_RESOURCES_PER_JOB, RESOURCE_TYPE_BADGES } from '../../utils/constants.js';

export default function AdminJobResourcesPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useAsync(() => listAdminJobResources(id), [id]);
  const { busy, error: actionError, run } = useAction(reload);
  const [editingId, setEditingId] = useState(null);

  if (loading && !data) return <PageLoader label="Loading learning resources..." />;
  if (error) {
    return (
      <div>
        <Link to="/admin/jobs" className="text-sm text-brand-700 underline">
          ← Back to jobs
        </Link>
        <div className="mt-4">
          <ErrorState message={error.status === 404 ? 'This job does not exist.' : error.message} onRetry={error.status === 404 ? undefined : reload} />
        </div>
      </div>
    );
  }

  const { job, resources } = data;
  const isFull = resources.length >= MAX_RESOURCES_PER_JOB;

  async function handleCreate(values) {
    await createResource(id, values);
    reload();
  }

  async function handleUpdate(resource, values) {
    await updateResource(resource.id, values);
    setEditingId(null);
    reload();
  }

  return (
    <div>
      <Link to="/admin/jobs" className="text-sm text-brand-700 underline">
        ← Back to jobs
      </Link>
      <h1 className="mt-3 font-display text-3xl font-bold">Learning resources</h1>
      <p className="mt-1 text-muted">
        For the job <span className="font-medium text-ink">{job.title}</span>. Students see these on the job page and can use them to learn a
        missing skill before they apply.
      </p>

      <section className="mt-6" aria-labelledby="add-heading">
        <h2 id="add-heading" className="mb-3 font-display text-lg font-semibold">
          Add a resource
        </h2>
        {isFull ? (
          <Alert variant="info">This job already has {MAX_RESOURCES_PER_JOB} resources, the maximum. Remove one to add another.</Alert>
        ) : (
          <ResourceForm submitLabel="Add resource" onSubmit={handleCreate} />
        )}
      </section>

      {actionError && <Alert className="mt-6">{actionError}</Alert>}

      <section className="mt-8" aria-labelledby="list-heading">
        <h2 id="list-heading" className="mb-3 font-display text-lg font-semibold">
          Added so far ({resources.length})
        </h2>

        {resources.length === 0 ? (
          <EmptyState title="No resources yet." description="Add the first one above. Students will see it on the job page." />
        ) : (
          <ul className="space-y-3">
            {resources.map((resource) => (
              <li key={resource.id}>
                {editingId === resource.id ? (
                  <ResourceForm
                    initial={resource}
                    submitLabel="Save changes"
                    onSubmit={(values) => handleUpdate(resource, values)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line bg-white p-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                          {RESOURCE_TYPE_BADGES[resource.type] || 'Link'}
                        </span>
                        {resource.skill && <span className="rounded-full bg-mark-soft px-2.5 py-0.5 text-xs text-ink">{resource.skill}</span>}
                      </div>
                      <p className="mt-2 font-display font-semibold">{resource.title}</p>
                      {resource.url && (
                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-brand-700 underline">
                          {resource.url}
                        </a>
                      )}
                      {resource.description && <p className="mt-1 whitespace-pre-line text-sm text-muted">{resource.description}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => setEditingId(resource.id)}>
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        loading={busy === resource.id}
                        onClick={() => run(resource.id, () => deleteResource(resource.id), `Remove "${resource.title}" from this job?`)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
