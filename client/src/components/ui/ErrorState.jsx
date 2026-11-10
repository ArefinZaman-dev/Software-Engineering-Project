import Button from './Button.jsx';

export default function ErrorState({ message = 'Something went wrong. Please try again.', onRetry }) {
  return (
    <div role="alert" className="rounded-lg border border-danger bg-danger-soft px-6 py-8 text-center">
      <p className="text-danger">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
