import { prisma } from '@/lib/prisma';
import { SyncTendersButton } from '@/components/sync-tenders-button';

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

const Home = async () => {
  const [profile, tenders] = await Promise.all([
    prisma.profile.findFirst(),
    prisma.tender.findMany({ orderBy: { publicationDate: 'desc' } }),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:py-16">
      <header className="mb-10">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-400">Tendio</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
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
            Brak zapisanych ogłoszeń. Kliknij „Pobierz najnowsze ogłoszenia”, aby zasilić bazę.
          </div>
        ) : (
          <ul className="space-y-3">
            {tenders.map((tender) => (
              <li
                key={tender.id}
                className="rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-4">
                  <a
                    href={tender.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                  >
                    {tender.title}
                  </a>
                  <time className="shrink-0 text-xs text-zinc-400">
                    {formatDate(tender.publicationDate)}
                  </time>
                </div>
                {tender.description && (
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {tender.description}
                  </p>
                )}
                {tender.cpvCodes && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {splitList(tender.cpvCodes).map((code) => (
                      <Chip key={code}>{code}</Chip>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};

export default Home;
