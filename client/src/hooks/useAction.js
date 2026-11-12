import { useState } from 'react';
import { getErrorMessage } from '../utils/errors.js';

// Runs one admin action (suspend, remove, resolve...) with a confirmation, a "busy" key so only
// the clicked button shows a spinner, and a shared error message. `onDone` refreshes the list.
export default function useAction(onDone) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function run(key, action, confirmMessage) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setError('');
    setBusy(key);
    try {
      await action();
      onDone?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  }

  return { busy, error, run };
}
