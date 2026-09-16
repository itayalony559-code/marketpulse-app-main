import { AlertCircle } from 'lucide-react';

type Props = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = 'Something went wrong',
  message = 'Unable to load data. Please try again.',
  onRetry,
}: Props) {
  return (
    <div className="surface flex flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bear/10">
        <AlertCircle className="h-6 w-6 text-bear" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-200">{title}</p>
        <p className="mt-1 text-xs text-slate-400">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-lg border border-ink-600 bg-ink-800 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-ink-700"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      <p className="max-w-xs text-xs text-slate-400">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2 rounded-lg border border-ink-600 bg-ink-800 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-ink-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
