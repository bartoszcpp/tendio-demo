'use client';

import { useMemo, useState } from 'react';
import { matchPercent } from '@/lib/scoring';
import { AnalyzeTender } from '@/components/analyze-tender';

export type TenderItem = {
  id: string;
  title: string;
  description: string | null;
  cpvCodes: string;
  region: string | null;
  publicationDate: Date | string | null;
  url: string;
  source: string;
  aiSummary: string | null;
  aiDecision: string | null;
  aiReason: string | null;
  score: number;
  reasons: string[];
};

type Props = { items: TenderItem[]; remaining: number };

type SourceFilter = 'all' | 'ezamowienia' | 'ted';
type SortKey = 'match' | 'date';

const dateFormatter = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium' });

const formatDate = (date: Date | string | null) => {
  if (!date) return '—';
  const value = typeof date === 'string' ? new Date(date) : date;
  return Number.isNaN(value.getTime()) ? '—' : dateFormatter.format(value);
};

const toTime = (date: Date | string | null) => {
  if (!date) return 0;
  const value = typeof date === 'string' ? new Date(date) : date;
  return Number.isNaN(value.getTime()) ? 0 : value.getTime();
};

const splitList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
    {children}
  </span>
);

const sourceBadge: Record<string, { label: string; className: string }> = {
  ezamowienia: {
    label: 'e-Zamówienia',
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  },
  ted: {
    label: 'TED · UE',
    className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  },
};

const SourceBadge = ({ source }: { source: string }) => {
  const badge = sourceBadge[source] ?? sourceBadge.ezamowienia;
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badge.className}`}
    >
      {badge.label}
    </span>
  );
};

type MatchTier = { label: string; text: string; bar: string; accent: string };

const matchTier = (percent: number): MatchTier => {
  if (percent >= 60)
    return {
      label: 'Wysokie dopasowanie',
      text: 'text-emerald-700 dark:text-emerald-400',
      bar: 'bg-emerald-500',
      accent: 'border-l-emerald-500',
    };
  if (percent >= 30)
    return {
      label: 'Średnie dopasowanie',
      text: 'text-amber-700 dark:text-amber-500',
      bar: 'bg-amber-500',
      accent: 'border-l-amber-500',
    };
  return {
    label: 'Niskie dopasowanie',
    text: 'text-zinc-500 dark:text-zinc-400',
    bar: 'bg-zinc-400',
    accent: 'border-l-zinc-300 dark:border-l-zinc-700',
  };
};

const MatchMeter = ({ percent, tier }: { percent: number; tier: MatchTier }) => (
  <div className="shrink-0 text-right">
    <div className={`text-2xl font-semibold tabular-nums ${tier.text}`}>{percent}%</div>
    <div className={`text-[11px] font-medium uppercase tracking-wide ${tier.text}`}>dopasowanie</div>
    <div className="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div className={`h-full rounded-full ${tier.bar}`} style={{ width: `${percent}%` }} />
    </div>
  </div>
);

const selectClass =
  'rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200';

export const TenderList = ({ items, remaining }: Props) => {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<SourceFilter>('all');
  const [minMatch, setMinMatch] = useState(0);
  const [sort, setSort] = useState<SortKey>('match');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return items
      .filter((item) => {
        if (source !== 'all' && item.source !== source) return false;
        if (minMatch > 0 && matchPercent(item.score) < minMatch) return false;
        if (needle) {
          const haystack = `${item.title} ${item.description ?? ''} ${item.cpvCodes}`.toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) =>
        sort === 'match' ? b.score - a.score : toTime(b.publicationDate) - toTime(a.publicationDate),
      );
  }, [items, query, source, minMatch, sort]);

  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj w tytule, opisie, CPV…"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as SourceFilter)}
          className={selectClass}
        >
          <option value="all">Wszystkie źródła</option>
          <option value="ezamowienia">e-Zamówienia</option>
          <option value="ted">TED · UE</option>
        </select>
        <select
          value={minMatch}
          onChange={(e) => setMinMatch(Number(e.target.value))}
          className={selectClass}
        >
          <option value={0}>Każde dopasowanie</option>
          <option value={30}>≥ 30%</option>
          <option value={60}>≥ 60%</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className={selectClass}
        >
          <option value="match">Sortuj: dopasowanie</option>
          <option value="date">Sortuj: data</option>
        </select>
      </div>

      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Wyświetlono <span className="tabular-nums">{filtered.length}</span> z{' '}
        <span className="tabular-nums">{items.length}</span> ogłoszeń
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Brak ogłoszeń spełniających kryteria.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => {
            const percent = matchPercent(item.score);
            const tier = matchTier(percent);

            return (
              <li
                key={item.id}
                className={`rounded-xl border border-l-4 border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 ${tier.accent}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-1.5 flex items-center gap-2">
                      <SourceBadge source={item.source} />
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                    >
                      {item.title}
                    </a>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                      <time>{formatDate(item.publicationDate)}</time>
                      {item.region && <span>· {item.region}</span>}
                      {item.description && <span>· {item.description}</span>}
                    </div>
                  </div>
                  <MatchMeter percent={percent} tier={tier} />
                </div>

                {item.cpvCodes && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {splitList(item.cpvCodes).map((code) => (
                      <Chip key={code}>{code}</Chip>
                    ))}
                  </div>
                )}

                {item.reasons.length > 0 && (
                  <p className={`mt-3 text-xs font-medium ${tier.text}`}>
                    {tier.label} · {item.reasons.join(' · ')}
                  </p>
                )}

                <AnalyzeTender
                  tenderId={item.id}
                  aiSummary={item.aiSummary}
                  aiDecision={item.aiDecision}
                  aiReason={item.aiReason}
                  remaining={remaining}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
