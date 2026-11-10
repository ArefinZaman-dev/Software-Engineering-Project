const STYLES = {
  error: 'border-danger bg-danger-soft text-danger',
  success: 'border-brand-600 bg-brand-50 text-brand-700',
  info: 'border-mark bg-mark-soft text-ink',
};

export default function Alert({ variant = 'error', children, className = '' }) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-md border-l-4 px-4 py-3 text-sm ${STYLES[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
