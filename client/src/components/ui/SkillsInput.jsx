import { useId, useState } from 'react';
import Button from './Button.jsx';

// Type a skill and press Enter (or the Add button). Each skill appears as a removable tag.
export default function SkillsInput({ label = 'Skills', value, onChange, error, max = 20 }) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');

  function addSkill() {
    const skill = draft.trim().replace(/,+$/, '').trim();
    if (!skill) return;
    if (skill.length > 40) return setNotice('Each skill must be at most 40 characters.');
    if (value.some((existing) => existing.toLowerCase() === skill.toLowerCase())) {
      setDraft('');
      return setNotice('');
    }
    if (value.length >= max) return setNotice(`You can add up to ${max} skills.`);
    onChange([...value, skill]);
    setDraft('');
    return setNotice('');
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addSkill();
    }
  }

  const message = error || notice;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {value.map((skill) => (
            <li
              key={skill}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pl-3 pr-1 text-sm text-brand-700"
            >
              {skill}
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== skill))}
                aria-label={`Remove ${skill}`}
                className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-brand-100"
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="For example: Graphic Design"
          aria-describedby={`${id}-help`}
          className={`block h-10 w-full rounded-md border bg-white px-3 text-sm ${message ? 'border-danger' : 'border-line'}`}
        />
        <Button variant="secondary" onClick={addSkill}>
          Add
        </Button>
      </div>
      <p id={`${id}-help`} className={`mt-1 text-sm ${message ? 'text-danger' : 'text-muted'}`}>
        {message || 'Press Enter to add a skill. You can add up to 20.'}
      </p>
    </div>
  );
}
