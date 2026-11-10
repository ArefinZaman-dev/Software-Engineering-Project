import { useId } from 'react';

// A label, an input/textarea/select, an optional hint, and an error message, wired together
// for screen readers (htmlFor, aria-invalid, aria-describedby).
export default function FormField({ label, error, hint, as: Control = 'input', className = '', children, ...props }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
  const height = Control === 'textarea' ? 'py-2' : 'h-10';

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <Control
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`block w-full rounded-md border bg-white px-3 text-sm ${height} ${
          error ? 'border-danger' : 'border-line'
        }`}
        {...props}
      >
        {children}
      </Control>
      {hint && !error && (
        <p id={hintId} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
