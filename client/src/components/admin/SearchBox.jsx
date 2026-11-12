import { useState } from 'react';
import Button from '../ui/Button.jsx';

// A search field that searches when you press Enter or the button (not on every keystroke).
export default function SearchBox({ label, placeholder, onSearch }) {
  const [text, setText] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    onSearch(text.trim());
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="flex flex-1 items-end gap-2">
      <div className="flex-1">
        <label htmlFor="admin-search" className="mb-1 block text-sm font-medium">
          {label}
        </label>
        <input
          id="admin-search"
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={placeholder}
          maxLength={100}
          className="block h-10 w-full rounded-md border border-line bg-white px-3 text-sm"
        />
      </div>
      <Button type="submit" variant="secondary">
        Search
      </Button>
    </form>
  );
}
