'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { syncTenders, type SyncResult } from '@/actions/tender';

export const SyncTendersButton = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const data = await syncTenders();
        setResult(data);
        router.refresh();
      } catch {
        setError('Nie udało się pobrać ogłoszeń. Spróbuj ponownie.');
      }
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isPending && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {isPending ? 'Pobieranie…' : 'Pobierz najnowsze ogłoszenia'}
      </button>

      {result && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Pobrano {result.fetched}, dodano {result.added} nowych.
        </p>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};
