'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { analyzeTender, type TenderAnalysis } from '@/actions/analyze';

type Decision = TenderAnalysis['recommendation'];

const decisionLabel: Record<Decision, string> = {
  GO: 'STARTOWAĆ',
  SKIP: 'ODPUŚCIĆ',
};

const decisionStyle: Record<Decision, string> = {
  GO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  SKIP: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
};

const isDecision = (value: string | null): value is Decision => value === 'GO' || value === 'SKIP';

type Props = {
  tenderId: string;
  aiSummary: string | null;
  aiDecision: string | null;
  aiReason: string | null;
  remaining: number;
};

export const AnalyzeTender = ({ tenderId, aiSummary, aiDecision, aiReason, remaining }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<TenderAnalysis | null>(
    isDecision(aiDecision) && aiSummary && aiReason
      ? { summary: aiSummary, recommendation: aiDecision, reason: aiReason }
      : null,
  );

  const run = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await analyzeTender(tenderId);
        setAnalysis(result);
        router.refresh();
      } catch {
        setError('Analiza AI nie powiodła się. Spróbuj ponownie.');
      }
    });
  };

  const blocked = remaining <= 0;

  if (!analysis) {
    return (
      <div className="mt-4">
        {blocked ? (
          <p className="text-sm text-zinc-400">Limit analiz AI wyczerpany.</p>
        ) : (
          <button
            type="button"
            onClick={run}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            {isPending && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {isPending ? 'Analizuję…' : 'Analizuj z AI'}
          </button>
        )}
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            Rekomendacja AI
          </span>
          <span
            className={`rounded-md px-2.5 py-1 text-sm font-bold ${decisionStyle[analysis.recommendation]}`}
          >
            {decisionLabel[analysis.recommendation]}
          </span>
        </div>
        {!blocked && (
          <button
            type="button"
            onClick={run}
            disabled={isPending}
            className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-800 disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {isPending ? 'Analizuję…' : 'Analizuj ponownie'}
          </button>
        )}
      </div>
      <p className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-100">{analysis.summary}</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{analysis.reason}</p>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};
