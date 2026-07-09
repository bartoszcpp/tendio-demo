import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { scoreTender, matchPercent } from '@/lib/scoring';
import { getCurrentUser, getRemainingAiUses, AI_LIMIT } from '@/lib/auth';
import { logout } from '@/actions/auth';
import { SyncTendersButton } from '@/components/sync-tenders-button';
import { AnalyzeTender } from '@/components/analyze-tender';

export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium' });
const budgetFormatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  maximumFractionDigits: 0,
});

const formatDate = (date: Date | null) => (date ? dateFormatter.format(date) : '—');

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

const Home = async () => {
  const username = await getCurrentUser();
  if (!username) redirect('/login');

  const [profile, tenders, remainingAiUses] = await Promise.all([
    prisma.profile.findFirst(),
    prisma.tender.findMany({ orderBy: { publicationDate: 'desc' } }),
    getRemainingAiUses(username),
  ]);

  const scored = tenders
    .map((tender) => ({
      tender,
      breakdown: profile ? scoreTender(tender, profile) : { score: 0, reasons: [] as string[] },
    }))
    .sort((a, b) => b.breakdown.score - a.breakdown.score);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:py-16">
      <header className="mb-10">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
            Tendio
          </p>
          <div className="flex items-center gap-3">
            <span
              className={`hidden rounded-full px-3 py-1 text-xs font-medium sm:inline ${
                remainingAiUses === 0
                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                  : remainingAiUses === 1
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              Analizy AI: <span className="tabular-nums">{remainingAiUses}/{AI_LIMIT}</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900">
                {username.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-sm text-zinc-700 dark:text-zinc-200">{username}</span>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Wyloguj
              </button>
            </form>
          </div>
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Przetargi dopasowane do Twojej firmy
        </h1>
      </header>

      {profile ? (
        <section className="mb-12 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {profile.companyName}
            </h2>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {budgetFormatter.format(profile.minBudget)} – {budgetFormatter.format(profile.maxBudget)}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{profile.industry}</p>

          <dl className="mt-5 space-y-4">
            <div>
              <dt className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                Słowa kluczowe
              </dt>
              <dd className="flex flex-wrap gap-2">
                {splitList(profile.keywords).map((keyword) => (
                  <Chip key={keyword}>{keyword}</Chip>
                ))}
              </dd>
            </div>
            <div>
              <dt className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                Kody CPV
              </dt>
              <dd className="flex flex-wrap gap-2">
                {splitList(profile.cpvCodes).map((code) => (
                  <Chip key={code}>{code}</Chip>
                ))}
              </dd>
            </div>
            <div>
              <dt className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                Regiony
              </dt>
              <dd className="flex flex-wrap gap-2">
                {splitList(profile.regions).map((region) => (
                  <Chip key={region}>{region}</Chip>
                ))}
              </dd>
            </div>
          </dl>
        </section>
      ) : (
        <section className="mb-12 rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Brak profilu firmy. Uruchom seed bazy danych, aby dodać profil.
        </section>
      )}

      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Ogłoszenia{' '}
            <span className="text-zinc-400">({tenders.length})</span>
          </h2>
          <SyncTendersButton />
        </div>

        {tenders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Brak zapisanych ogłoszeń. Użyj przycisków powyżej, aby pobrać dane z e-Zamówień lub TED.
          </div>
        ) : (
          <ul className="space-y-3">
            {scored.map(({ tender, breakdown }) => {
              const percent = matchPercent(breakdown.score);
              const tier = matchTier(percent);

              return (
                <li
                  key={tender.id}
                  className={`rounded-xl border border-l-4 border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 ${tier.accent}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-1.5 flex items-center gap-2">
                        <SourceBadge source={tender.source} />
                      </div>
                      <a
                        href={tender.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                      >
                        {tender.title}
                      </a>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                        <time>{formatDate(tender.publicationDate)}</time>
                        {tender.region && <span>· {tender.region}</span>}
                        {tender.description && <span>· {tender.description}</span>}
                      </div>
                    </div>
                    <MatchMeter percent={percent} tier={tier} />
                  </div>

                  {tender.cpvCodes && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {splitList(tender.cpvCodes).map((code) => (
                        <Chip key={code}>{code}</Chip>
                      ))}
                    </div>
                  )}

                  {breakdown.reasons.length > 0 && (
                    <p className={`mt-3 text-xs font-medium ${tier.text}`}>
                      {tier.label} · {breakdown.reasons.join(' · ')}
                    </p>
                  )}

                  <AnalyzeTender
                    tenderId={tender.id}
                    aiSummary={tender.aiSummary}
                    aiDecision={tender.aiDecision}
                    aiReason={tender.aiReason}
                    remaining={remainingAiUses}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
};

export default Home;
