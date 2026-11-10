// Read-only star display. The visible stars are decorative; the label is what screen readers use.
export default function RatingStars({ rating }) {
  return (
    <span className="whitespace-nowrap" role="img" aria-label={`${rating} out of 5`}>
      <span className="text-mark" aria-hidden="true">
        {'★'.repeat(rating)}
      </span>
      <span className="text-line" aria-hidden="true">
        {'★'.repeat(5 - rating)}
      </span>
    </span>
  );
}
