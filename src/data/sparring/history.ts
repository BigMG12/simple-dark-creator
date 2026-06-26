export interface HistorySession {
  id: string;
  timestamp: Date;
  category: string;
  level: string;
  mentor: string;
  score: number;
  verdict_preview: string;
}

export const MOCKED_HISTORY: HistorySession[] = [
  {
    id: 'hist-1',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 17), // wczoraj 17:32
    category: 'Obiekcja cenowa',
    level: 'Hard',
    mentor: 'Goggins',
    score: 82,
    verdict_preview: 'Słuchaj, koleś. Zagrałeś mocno. Widziałem pewność...',
  },
  {
    id: 'hist-2',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 dni temu
    category: 'Niezdecydowanie',
    level: 'Medium',
    mentor: 'Voss',
    score: 65,
    verdict_preview: 'Twój problem to brak pauzy. Klient potrzebował...',
  },
  {
    id: 'hist-3',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // tydzień temu
    category: 'Gniew klienta',
    level: 'Easy',
    mentor: 'Robbins',
    score: 88,
    verdict_preview: 'Świetna robota z empatią. Nazwałeś emocję i...',
  },
  {
    id: 'hist-4',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
    category: 'Konkurencja',
    level: 'Medium',
    mentor: 'Belfort',
    score: 71,
    verdict_preview: 'Dobry start ale brakło Ci reframe. Pokazałeś...',
  },
  {
    id: 'hist-5',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    category: 'Brak pilności',
    level: 'Easy',
    mentor: 'Hormozi',
    score: 78,
    verdict_preview: 'Widzę że pokazałeś koszt czekania. To dobry ruch...',
  },
];
