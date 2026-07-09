import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { scoreTender } from '@/lib/scoring';
import { getCurrentUser, getRemainingAiUses, AI_LIMIT } from '@/lib/auth';
import { logout } from '@/actions/auth';
import { SyncTendersButton } from '@/components/sync-tenders-button';
import { ProfilePanel } from '@/components/profile-panel';
import { TenderList, type TenderItem } from '@/components/tender-list';
import { type ProfileInput } from '@/lib/presets';

export const dynamic = 'force-dynamic';

const Home = async () => {
  const username = await getCurrentUser();
  if (!username) redirect('/login');

  const [profile, tenders, remainingAiUses] = await Promise.all([
    prisma.profile.findFirst(),
    prisma.tender.findMany({ orderBy: { publicationDate: 'desc' } }),
    getRemainingAiUses(username),
  ]);

  const profileInput: ProfileInput | null = profile
    ? {
        companyName: profile.companyName,
        industry: profile.industry,
        keywords: profile.keywords,
        cpvCodes: profile.cpvCodes,
        regions: profile.regions,
        minBudget: profile.minBudget,
        maxBudget: profile.maxBudget,
      }
    : null;

  const items: TenderItem[] = tenders.map((tender) => {
    const breakdown = profile
      ? scoreTender(tender, profile)
      : { score: 0, reasons: [] as string[] };

    return {
      id: tender.id,
      title: tender.title,
      description: tender.description,
      cpvCodes: tender.cpvCodes,
      region: tender.region,
      publicationDate: tender.publicationDate,
      url: tender.url,
      source: tender.source,
      aiSummary: tender.aiSummary,
      aiDecision: tender.aiDecision,
      aiReason: tender.aiReason,
      score: breakdown.score,
      reasons: breakdown.reasons,
    };
  });

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

      <ProfilePanel profile={profileInput} />

      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Ogłoszenia <span className="text-zinc-400">({tenders.length})</span>
          </h2>
          <SyncTendersButton />
        </div>

        {tenders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Brak zapisanych ogłoszeń. Użyj przycisków powyżej, aby pobrać dane z e-Zamówień lub TED.
          </div>
        ) : (
          <TenderList items={items} remaining={remainingAiUses} />
        )}
      </section>
    </main>
  );
};

export default Home;
