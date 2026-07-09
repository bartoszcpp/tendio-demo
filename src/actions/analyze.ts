'use server';

import { revalidatePath } from 'next/cache';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const analysisSchema = z.object({
  summary: z.string().describe('Zwięzłe streszczenie przedmiotu przetargu po polsku, maksymalnie 2 zdania.'),
  recommendation: z
    .enum(['GO', 'SKIP'])
    .describe('GO gdy firma powinna startować, SKIP gdy powinna odpuścić.'),
  reason: z.string().describe('Krótkie uzasadnienie rekomendacji po polsku, odwołujące się do profilu firmy.'),
});

export type TenderAnalysis = z.infer<typeof analysisSchema>;

export const analyzeTender = async (tenderId: string): Promise<TenderAnalysis> => {
  const [tender, profile] = await Promise.all([
    prisma.tender.findUnique({ where: { id: tenderId } }),
    prisma.profile.findFirst(),
  ]);

  if (!tender) throw new Error('Nie znaleziono przetargu.');
  if (!profile) throw new Error('Brak profilu firmy.');

  const system = `Jesteś doświadczonym analitykiem zamówień publicznych. Oceniasz, czy dany przetarg pasuje do profilu firmy i czy firma powinna w nim wystartować.

Profil firmy:
- Nazwa: ${profile.companyName}
- Branża: ${profile.industry}
- Słowa kluczowe: ${profile.keywords}
- Kody CPV: ${profile.cpvCodes}
- Regiony działania: ${profile.regions}
- Budżet realizowanych projektów: ${profile.minBudget}–${profile.maxBudget} PLN

Rekomenduj GO tylko gdy przetarg realnie mieści się w kompetencjach firmy. W innym wypadku rekomenduj SKIP. Odpowiadaj wyłącznie po polsku, konkretnie i bez lania wody.`;

  const prompt = `Oceń poniższy przetarg:
Tytuł: ${tender.title}
Kody CPV: ${tender.cpvCodes || 'brak'}
Region: ${tender.region ?? 'brak'}
Zamawiający: ${tender.description ?? 'brak'}`;

  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: analysisSchema,
    system,
    prompt,
  });

  await prisma.tender.update({
    where: { id: tenderId },
    data: {
      aiSummary: object.summary,
      aiDecision: object.recommendation,
      aiReason: object.reason,
    },
  });

  revalidatePath('/');
  return object;
};
