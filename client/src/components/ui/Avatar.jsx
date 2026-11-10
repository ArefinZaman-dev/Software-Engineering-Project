function initialsOf(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

// Profile photos need file storage, which is planned for Version 2. Initials are used for now.
export default function Avatar({ name, size = 'md' }) {
  const dimensions = size === 'lg' ? 'h-16 w-16 text-xl' : 'h-9 w-9 text-sm';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-display font-bold text-brand-700 ${dimensions}`}
      aria-hidden="true"
    >
      {initialsOf(name || '?')}
    </span>
  );
}
