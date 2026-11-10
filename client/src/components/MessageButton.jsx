import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { openConversation } from '../services/messageService.js';
import { getErrorMessage } from '../utils/errors.js';
import Button from './ui/Button.jsx';

// Opens (or finds) the conversation for an application, then goes to it. Either person on the
// application can use it; the server decides whether messaging is allowed for its status.
export default function MessageButton({ applicationId, onError, variant = 'secondary', children = 'Message' }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    onError?.('');
    setLoading(true);
    try {
      const { conversation } = await openConversation(applicationId);
      navigate(`/messages/${conversation.id}`);
    } catch (err) {
      onError?.(getErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <Button variant={variant} loading={loading} onClick={handleClick}>
      {children}
    </Button>
  );
}
