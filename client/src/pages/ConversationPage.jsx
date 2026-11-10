import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../components/ui/Alert.jsx';
import Button from '../components/ui/Button.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import FormField from '../components/ui/FormField.jsx';
import PageLoader from '../components/ui/PageLoader.jsx';
import useAsync from '../hooks/useAsync.js';
import useAuth from '../hooks/useAuth.js';
import { getMessages, sendMessage } from '../services/messageService.js';
import { MESSAGE_MAX_LENGTH, ROLES, formatDateTime } from '../utils/constants.js';
import { getErrorMessage } from '../utils/errors.js';

export default function ConversationPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => getMessages(id), [id]);
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const messageCount = data?.messages.length ?? 0;

  // Keep the newest message in view after the thread loads or a message is sent.
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [messageCount]);

  // Only show the full-page loader the first time; a refresh keeps the thread on screen.
  if (loading && !data) return <PageLoader label="Loading conversation..." />;
  if (error && !data) {
    return (
      <ErrorState
        message={error.status === 404 ? 'This conversation does not exist or is no longer available.' : error.message}
        onRetry={error.status === 404 ? undefined : reload}
      />
    );
  }

  const { conversation, messages } = data;
  const counterpartPath =
    conversation.counterpart.role === ROLES.STUDENT
      ? `/students/${conversation.counterpart.id}`
      : `/posters/${conversation.counterpart.id}`;

  async function handleSend(event) {
    event.preventDefault();
    const body = text.trim();
    if (!body) {
      setSendError('Write a message first.');
      return;
    }
    if (body.length > MESSAGE_MAX_LENGTH) {
      setSendError(`Message must be at most ${MESSAGE_MAX_LENGTH} characters.`);
      return;
    }

    setSendError('');
    setSending(true);
    try {
      await sendMessage(id, body);
      setText('');
      reload();
    } catch (err) {
      setSendError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <Link to="/messages" className="text-sm text-brand-700 underline">
        ← Back to messages
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">
            <Link to={counterpartPath} className="hover:underline">
              {conversation.counterpart.name}
            </Link>
          </h1>
          <p className="text-sm text-muted">
            About{' '}
            <Link to={`/jobs/${conversation.job.id}`} className="underline">
              {conversation.job.title}
            </Link>
          </p>
        </div>
        <Button variant="secondary" onClick={reload} loading={loading}>
          Refresh
        </Button>
      </div>

      <section
        aria-label="Messages"
        className="mt-4 max-h-[28rem] min-h-40 space-y-3 overflow-y-auto rounded-lg border border-line bg-paper p-4"
      >
        {messages.length === 0 && <p className="text-sm text-muted">No messages yet. Say hello.</p>}
        {messages.map((message) => {
          const mine = message.sender === user.id;
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  mine ? 'bg-brand-600 text-white' : 'border border-line bg-white'
                }`}
              >
                <p className="whitespace-pre-line break-words">{message.body}</p>
                <p className={`mt-1 text-xs ${mine ? 'text-brand-100' : 'text-muted'}`}>
                  {mine ? 'You' : conversation.counterpart.name} · {formatDateTime(message.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </section>

      {conversation.canSend ? (
        <form onSubmit={handleSend} noValidate className="mt-4 space-y-3">
          {sendError && <Alert>{sendError}</Alert>}
          <FormField
            as="textarea"
            rows={3}
            label="Your message"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={MESSAGE_MAX_LENGTH}
            hint="Messages are not live. Use Refresh to check for a reply."
          />
          <Button type="submit" loading={sending}>
            Send
          </Button>
        </form>
      ) : (
        <Alert variant="info" className="mt-4">
          This conversation is read-only because the application is no longer active.
        </Alert>
      )}
    </div>
  );
}
