import type { Profile, Tender } from '@prisma/client';

type ScorableTender = Pick<Tender, 'title' | 'description' | 'cpvCodes' | 'region'>;
type ScorableProfile = Pick<Profile, 'keywords' | 'cpvCodes' | 'regions'>;

export type ScoreBreakdown = { score: number; reasons: string[] };

export const POINTS = {
  cpvExact: 50,
  cpvRelated: 15,
  keywordTitle: 20,
  keywordDescription: 8,
  region: 30,
} as const;

export const MATCH_REFERENCE = 100;

export const matchPercent = (score: number) =>
  Math.max(0, Math.min(100, Math.round((score / MATCH_REFERENCE) * 100)));

const splitList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const extractCpvCodes = (value: string): string[] => value.match(/\d{8}/g) ?? [];

export const scoreTender = (
  tender: ScorableTender,
  profile: ScorableProfile,
): ScoreBreakdown => {
  const reasons: string[] = [];
  let score = 0;

  const tenderCpv = extractCpvCodes(tender.cpvCodes);
  const tenderClasses = new Set(tenderCpv.map((code) => code.slice(0, 4)));

  for (const code of extractCpvCodes(profile.cpvCodes)) {
    if (tenderCpv.includes(code)) {
      score += POINTS.cpvExact;
      reasons.push(`Trafiony CPV ${code} (+${POINTS.cpvExact})`);
      continue;
    }
    if (tenderClasses.has(code.slice(0, 4))) {
      score += POINTS.cpvRelated;
      reasons.push(`Zbliżony CPV ${code.slice(0, 4)}xxxx (+${POINTS.cpvRelated})`);
    }
  }

  const title = tender.title.toLowerCase();
  const description = (tender.description ?? '').toLowerCase();

  for (const keyword of splitList(profile.keywords)) {
    if (title.includes(keyword)) {
      score += POINTS.keywordTitle;
      reasons.push(`Słowo „${keyword}" w tytule (+${POINTS.keywordTitle})`);
      continue;
    }
    if (description.includes(keyword)) {
      score += POINTS.keywordDescription;
      reasons.push(`Słowo „${keyword}" w opisie (+${POINTS.keywordDescription})`);
    }
  }

  const region = tender.region?.toLowerCase();
  if (region && splitList(profile.regions).includes(region)) {
    score += POINTS.region;
    reasons.push(`Region ${region} (+${POINTS.region})`);
  }

  return { score, reasons };
};
