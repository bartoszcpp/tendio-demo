'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { syncTenders, syncTed, type SyncResult } from '@/actions/tender';

type Source = 'ezamowienia' | 'ted';

const actions: Record<Source, () => Promise<SyncResult>> = {
  ezamowienia: syncTenders,
  ted: syncTed,
};

const labels: Record<Source, { idle: string; busy: string }> = {
  ezamowienia: { idle: 'Pobierz z e-Zamówień', busy: 'Pobieranie…' },
  ted: { idle: 'Pobierz z TED (UE)', busy: 'Pobieranie…' },
};

export const SyncTendersButton = () => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [active, setActive] = useState<Source | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (source: Source) => {
    setError(null);
    setResult(null);
    setActive(source);
    startTransition(async () => {
      try {
        const data = await actions[source]();
        setResult(`Pobrano ${data.fetched}, dodano ${data.added} nowych.`);
        router.refresh();
      } catch {
        setError('Nie udało się pobrać ogłoszeń. Spróbuj ponownie.');
      }
    });
  };

  const buttonBase =
    'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => run('ezamowienia')}
          disabled={isPending}
          className={`${buttonBase} bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200`}
        >
          {isPending && active === 'ezamowienia' && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {isPending && active === 'ezamowienia'
            ? labels.ezamowienia.busy
            : labels.ezamowienia.idle}
        </button>

        <button
          type="button"
          onClick={() => run('ted')}
          disabled={isPending}
          className={`${buttonBase} border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900`}
        >
          {isPending && active === 'ted' && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {isPending && active === 'ted' ? labels.ted.busy : labels.ted.idle}
        </button>
      </div>

      {result && <p className="text-sm text-zinc-500 dark:text-zinc-400">{result}</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};
