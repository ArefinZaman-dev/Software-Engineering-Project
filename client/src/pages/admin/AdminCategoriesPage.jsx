import { useState } from 'react';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import FormField from '../../components/ui/FormField.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import useAction from '../../hooks/useAction.js';
import useAsync from '../../hooks/useAsync.js';
import {
  createCategory,
  deleteCategory,
  listAdminCategories,
  updateCategory,
} from '../../services/adminService.js';
import { getErrorMessage, getFieldErrors } from '../../utils/errors.js';

export default function AdminCategoriesPage() {
  const { data, loading, error, reload } = useAsync(listAdminCategories, []);
  const { busy, error: actionError, run } = useAction(reload);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  async function handleCreate(event) {
    event.preventDefault();
    setCreateError('');
    if (newName.trim().length < 2) {
      setCreateError('Category name must be at least 2 characters.');
      return;
    }
    setCreating(true);
    try {
      await createCategory(newName.trim());
      setNewName('');
      reload();
    } catch (err) {
      setCreateError(getFieldErrors(err).name || getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(category) {
    setEditingId(category.id);
    setEditName(category.name);
  }

  async function saveEdit(category) {
    await run(category.id, () => updateCategory(category.id, { name: editName.trim() }));
    setEditingId(null);
  }

  const categories = data?.categories || [];

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Categories</h1>
      <p className="mt-1 text-muted">
        Job categories shown to posters and in the job filter. A category that jobs already use can be deactivated but not deleted.
      </p>

      <form onSubmit={handleCreate} noValidate className="mt-5 flex flex-wrap items-start gap-3">
        <FormField
          label="New category"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          error={createError}
          maxLength={60}
          placeholder="e.g. Video Editing"
          className="min-w-64 flex-1"
        />
        <Button type="submit" loading={creating} className="mt-6">
          Add category
        </Button>
      </form>

      {actionError && <Alert className="mt-4">{actionError}</Alert>}

      <div className="mt-5">
        {loading && !data && (
          <div className="space-y-3" role="status" aria-label="Loading">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        )}
        {error && <ErrorState message={error.message} onRetry={reload} />}
        {data && categories.length === 0 && <EmptyState title="No categories yet." description="Add the first one above." />}

        {data && categories.length > 0 && (
          <ul className="space-y-3">
            {categories.map((category) => (
              <li key={category.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-4">
                {editingId === category.id ? (
                  <div className="flex flex-1 flex-wrap items-end gap-2">
                    <FormField
                      label="Category name"
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      maxLength={60}
                      className="min-w-56 flex-1"
                    />
                    <Button loading={busy === category.id} onClick={() => saveEdit(category)}>
                      Save
                    </Button>
                    <Button variant="secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="font-display font-semibold">{category.name}</p>
                      <p className="text-xs text-muted">
                        {category.jobCount} {category.jobCount === 1 ? 'job' : 'jobs'} ·{' '}
                        <span className={category.isActive ? 'text-brand-700' : 'text-danger'}>{category.isActive ? 'Active' : 'Inactive'}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => startEdit(category)}>
                        Rename
                      </Button>
                      <Button
                        variant="secondary"
                        loading={busy === category.id}
                        onClick={() => run(category.id, () => updateCategory(category.id, { isActive: !category.isActive }))}
                      >
                        {category.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      {category.jobCount === 0 && (
                        <Button
                          variant="danger"
                          loading={busy === category.id}
                          onClick={() => run(category.id, () => deleteCategory(category.id), `Delete the category "${category.name}"?`)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
