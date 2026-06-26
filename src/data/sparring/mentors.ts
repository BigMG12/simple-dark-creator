export interface FallbackMentor {
  id: string;
  name: string;
  short_description: string;
  accent_color: string;
}

export const FALLBACK_MENTORS: FallbackMentor[] = [
  {
    id: 'goggins',
    name: 'David Goggins',
    short_description: 'Goggins powie Ci brutalnie co spieprzyłeś. Zero litości.',
    accent_color: 'hsl(0 72% 51%)', // krwawy czerwony
  },
  {
    id: 'belfort',
    name: 'Jordan Belfort',
    short_description: 'Belfort nauczy Cię sprzedawać jak wilk z Wall Street.',
    accent_color: 'hsl(142 76% 36%)', // zielony (pieniądze)
  },
  {
    id: 'voss',
    name: 'Chris Voss',
    short_description: 'Voss pokaże Ci techniki negocjacyjne FBI.',
    accent_color: 'hsl(221 83% 53%)', // niebieski (FBI)
  },
  {
    id: 'hormozi',
    name: 'Alex Hormozi',
    short_description: 'Hormozi nauczy Cię framować wartość jak nikt inny.',
    accent_color: 'hsl(24 95% 53%)', // pomarańczowy
  },
  {
    id: 'robbins',
    name: 'Tony Robbins',
    short_description: 'Robbins pomoże Ci zrozumieć psychologię klienta.',
    accent_color: 'hsl(280 67% 55%)', // fioletowy
  },
];
