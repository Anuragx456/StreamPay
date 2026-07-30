import type { TransactionFeedback as Feedback } from '@/lib/types';
import { explorerTxUrl } from '@/lib/stellar';
import { IconExternal } from './icons';

const LABELS: Record<Feedback['state'], string> = {
  idle: 'Ready',
  awaiting_signature: 'Awaiting wallet signature…',
  submitting: 'Submitting transaction…',
  pending: 'Pending network confirmation…',
  success: 'Transaction confirmed',
  failed: 'Transaction failed',
};

export function TransactionFeedback({ feedback }: { feedback?: Feedback }) {
  if (!feedback || feedback.state === 'idle') return null;
  const isFailed = feedback.state === 'failed';
  return (
    <div
      className={`mt-4 rounded-md border p-3 text-sm ${
        isFailed ? 'border-danger/40' : 'border-line'
      }`}
      role="status"
    >
      <div className={isFailed ? 'font-medium text-danger' : 'text-ink'}>
        {LABELS[feedback.state]}
        {isFailed && feedback.hash && (
          <span className="ml-1.5 font-mono text-xs font-normal text-muted">
            (tx sent — see hash below)
          </span>
        )}
      </div>
      {feedback.message && <p className="mt-1 break-words text-muted">{feedback.message}</p>}
      {feedback.hash && (
        <a
          className={`mt-1 inline-flex items-center gap-1 break-all font-mono text-xs hover:underline ${
            isFailed ? 'text-muted' : 'text-accent'
          }`}
          href={explorerTxUrl(feedback.hash)}
          target="_blank"
          rel="noreferrer"
        >
          {feedback.hash}
          <IconExternal className="h-3.5 w-3.5 shrink-0" />
        </a>
      )}
    </div>
  );
}
