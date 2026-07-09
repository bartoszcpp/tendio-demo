'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveProfile, applyPreset } from '@/actions/profile';
import { PRESETS, type ProfileInput } from '@/lib/presets';

const budgetFormatter = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  maximumFractionDigits: 0,
});

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

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
      {label}
      {hint && <span className="ml-2 normal-case tracking-normal text-zinc-400">{hint}</span>}
    </span>
    {children}
  </label>
);

const inputClass =
  'rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50';

type Props = { profile: ProfileInput | null };

export const ProfilePanel = ({ profile }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(!profile);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ProfileInput>({
    companyName: profile?.companyName ?? '',
    industry: profile?.industry ?? '',
    keywords: profile?.keywords ?? '',
    cpvCodes: profile?.cpvCodes ?? '',
    regions: profile?.regions ?? '',
    minBudget: profile?.minBudget ?? 0,
    maxBudget: profile?.maxBudget ?? 0,
  });

  const update = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const startNew = () => {
    setError(null);
    setForm({
      companyName: '',
      industry: '',
      keywords: '',
      cpvCodes: '',
      regions: '',
      minBudget: 0,
      maxBudget: 0,
    });
    setEditing(true);
  };

  const runPreset = (id: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await applyPreset(id);
        router.refresh();
        setEditing(false);
      } catch {
        setError('Nie udało się wczytać presetu.');
      }
    });
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        await saveProfile(form);
        router.refresh();
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nie udało się zapisać.');
      }
    });
  };

  return (
    <section className="mb-12 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Zapisane wyszukiwania
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const active = profile?.companyName === preset.profile.companyName;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => runPreset(preset.id)}
                disabled={isPending}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
                  active
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                    : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={startNew}
            disabled={isPending}
            className="rounded-full border border-dashed border-zinc-400 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            + Nowe wyszukiwanie
          </button>
        </div>
      </div>

      {!editing && profile ? (
        <>
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

          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Edytuj profil
          </button>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Firma">
            <input
              className={inputClass}
              value={form.companyName}
              onChange={(e) => update('companyName', e.target.value)}
              placeholder="Nazwa firmy"
            />
          </Field>
          <Field label="Branża">
            <input
              className={inputClass}
              value={form.industry}
              onChange={(e) => update('industry', e.target.value)}
              placeholder="np. Instalacje elektryczne"
            />
          </Field>
          <Field label="Słowa kluczowe" hint="po przecinku">
            <input
              className={inputClass}
              value={form.keywords}
              onChange={(e) => update('keywords', e.target.value)}
              placeholder="fotowoltaika, pompa ciepła"
            />
          </Field>
          <Field label="Kody CPV" hint="po przecinku">
            <input
              className={inputClass}
              value={form.cpvCodes}
              onChange={(e) => update('cpvCodes', e.target.value)}
              placeholder="09331200, 45311000"
            />
          </Field>
          <Field label="Regiony" hint="po przecinku">
            <input
              className={inputClass}
              value={form.regions}
              onChange={(e) => update('regions', e.target.value)}
              placeholder="wielkopolskie, łódzkie"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Budżet od">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.minBudget || ''}
                onChange={(e) => update('minBudget', Number(e.target.value))}
              />
            </Field>
            <Field label="Budżet do">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.maxBudget || ''}
                onChange={(e) => update('maxBudget', Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="flex items-center gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={submit}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isPending && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              Zapisz i szukaj
            </button>
            {profile && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                disabled={isPending}
                className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Anuluj
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
};
