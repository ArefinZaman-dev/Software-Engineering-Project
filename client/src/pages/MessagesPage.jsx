import { Link } from 'react-router-dom';
import Avatar from '../components/ui/Avatar.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import useAsync from '../hooks/useAsync.js';
import useAuth from '../hooks/useAuth.js';
import { listConversations } from '../services/messageService.js';
import { ROLES, formatDateTime } from '../utils/constants.js';

export default function MessagesPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(listConversations, []);

  const emptyHint =
    user.role === ROLES.POSTER
      ? 'Shortlist or accept an applicant, then use the Message button next to their name.'
      : 'When a poster shortlists or accepts your application, you can message them from My applications.';

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Messages</h1>
      <p className="mt-1 text-muted">Conversations about your jobs. Open a thread to read new messages.</p>

      <div className="mt-6">
        {loading && (
          <div className="space-y-3" aria-label="Loading conversations" role="status">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        )}

        {error && <ErrorState message={error.message} onRetry={reload} />}

        {data && data.conversations.length === 0 && (
          <EmptyState title="No conversations yet." description={emptyHint} />
        )}

        {data && data.conversations.length > 0 && (
          <ul className="space-y-3">
            {data.conversations.map((conversation) => (
              <li key={conversation.id}>
                <Link
                  to={`/messages/${conversation.id}`}
                  className="flex items-start gap-3 rounded-lg border border-line bg-white p-4 hover:bg-brand-50"
                >
                  <Avatar name={conversation.counterpart.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-display font-semibold">{conversation.counterpart.name}</p>
                      {conversation.unreadCount > 0 && (
                        <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">
                          {conversation.unreadCount} new
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted">{conversation.job.title}</p>
                    <p className="mt-1 truncate text-sm">
                      {conversation.lastMessage ? (
                        <>
                          {conversation.lastMessage.sentByMe && <span className="text-muted">You: </span>}
                          {conversation.lastMessage.body}
                        </>
                      ) : (
                        <span className="text-muted">No messages yet. Say hello.</span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatDateTime(conversation.lastMessage?.createdAt || conversation.lastMessageAt)}
                      {!conversation.canSend && ' · Read-only'}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
