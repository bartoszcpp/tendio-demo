'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getPreset, type ProfileInput } from '@/lib/presets';

const clean = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .join(',');

const normalize = (input: ProfileInput): ProfileInput => ({
  companyName: input.companyName.trim(),
  industry: input.industry.trim(),
  keywords: clean(input.keywords),
  cpvCodes: clean(input.cpvCodes),
  regions: clean(input.regions).toLowerCase(),
  minBudget: Number.isFinite(input.minBudget) ? Math.max(0, input.minBudget) : 0,
  maxBudget: Number.isFinite(input.maxBudget) ? Math.max(0, input.maxBudget) : 0,
});

export const saveProfile = async (input: ProfileInput): Promise<void> => {
  const username = await getCurrentUser();
  if (!username) throw new Error('Musisz być zalogowany.');

  const data = normalize(input);
  if (!data.companyName) throw new Error('Podaj nazwę firmy.');

  const existing = await prisma.profile.findFirst({ select: { id: true } });

  if (existing) {
    await prisma.profile.update({ where: { id: existing.id }, data });
  } else {
    await prisma.profile.create({ data });
  }

  revalidatePath('/');
};

export const applyPreset = async (id: string): Promise<void> => {
  const preset = getPreset(id);
  if (!preset) throw new Error('Nieznany preset.');
  await saveProfile(preset.profile);
};
