export type ProfileInput = {
  companyName: string;
  industry: string;
  keywords: string;
  cpvCodes: string;
  regions: string;
  minBudget: number;
  maxBudget: number;
};

export type Preset = { id: string; label: string; profile: ProfileInput };

export const PRESETS: Preset[] = [
  {
    id: 'nexor',
    label: 'Nexor · OZE / PV',
    profile: {
      companyName: 'Nexor Sp. z o.o.',
      industry: 'Instalacje elektryczne i fotowoltaika (OZE)',
      keywords: 'fotowoltaika,instalacja elektryczna,panele PV,pompa ciepła,oświetlenie,przyłącze',
      cpvCodes: '09331200,45311000,45315300,09332000',
      regions: 'wielkopolskie,lubuskie,łódzkie,kujawsko-pomorskie,dolnośląskie,opolskie',
      minBudget: 50000,
      maxBudget: 2000000,
    },
  },
  {
    id: 'it',
    label: 'IT · oprogramowanie',
    profile: {
      companyName: 'Codex Systems Sp. z o.o.',
      industry: 'Usługi IT i wdrożenia oprogramowania',
      keywords: 'oprogramowanie,system informatyczny,wdrożenie,licencje,integracja,serwery',
      cpvCodes: '72000000,48000000,72263000,72267000',
      regions: 'mazowieckie,małopolskie,dolnośląskie,pomorskie',
      minBudget: 100000,
      maxBudget: 5000000,
    },
  },
  {
    id: 'road',
    label: 'Budownictwo drogowe',
    profile: {
      companyName: 'ViaBud S.A.',
      industry: 'Roboty drogowe i infrastruktura',
      keywords: 'droga,nawierzchnia,chodnik,roboty drogowe,asfalt,most',
      cpvCodes: '45233000,45233120,45233140,45111000',
      regions: 'wielkopolskie,łódzkie,śląskie,mazowieckie',
      minBudget: 500000,
      maxBudget: 20000000,
    },
  },
];

export const getPreset = (id: string): Preset | undefined =>
  PRESETS.find((preset) => preset.id === id);
