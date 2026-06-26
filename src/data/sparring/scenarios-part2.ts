import { SparringScenario } from './scenarios';

export const SCENARIOS_PART2: SparringScenario[] = [
  // COMPETITION - EASY
  {
    id: 'competition-easy-fitness',
    category: 'competition',
    level: 1,
    context: 'Jesteś trenerem personalnym w klubie fitness, Gdańsk, poniedziałek wieczór. Klientka — Pani Ewa, 31, młoda mama — rozważa pakiet treningów za 600 zł/mies. Wspomina że jej koleżanka chodzi do konkurencyjnego klubu.',
    client_name: 'Ewa, 31',
    business_setting: 'Klub fitness, Gdańsk',
    client_emotional_state: 'Ciekawa, porównuje opcje',
    opening_line: 'Moja koleżanka chodzi do Calypso i jest mega zadowolona. Mówi że tam mają lepszy sprzęt i więcej zajęć grupowych. Dlaczego miałabym wybrać Was?',
    expected_winning_moves: [
      'Pytanie o to co konkretnie jest dla niej ważne',
      'Brak ataku na konkurencję',
      'Skupienie na unikalnych wartościach (lokalizacja, atmosfera, indywidualne podejście)',
      'Spokojny ton',
    ],
    expected_losing_moves: [
      'Atak na Calypso',
      'Defensive ton',
      'Listowanie features bez pytania o priorytety',
      'Pokazanie niepewności',
    ],
    mentor_responses: {
      voss: {
        verdict_quote: 'Dobry start. Nie zaatakowałeś konkurencji, to profesjonalne. Ale przegapiłeś kluczowy moment: ona Ci powiedziała że koleżanka jest "mega zadowolona". To jest data point. Zapytaj CO konkretnie ją zadowala. Wtedy dowiesz się czego naprawdę szuka Ewa.',
        what_worked: [
          'Nie zaatakowałeś Calypso',
          'Zachowałeś profesjonalizm',
          'Ton przyjazny',
        ],
        what_failed: [
          'Nie zapytałeś "co konkretnie ją zadowala?"',
          'Zacząłeś listować swoje features zamiast odkrywać jej priorytety',
          'Brak mirroringu',
        ],
        alternative_response: '"Mega zadowolona. Co konkretnie ją tak zadowala?" *(czekaj)* Ona wymienia 2-3 rzeczy. Teraz wiesz czego szuka. Możesz mówić o TYM, nie o wszystkim.',
        drill_recommendation: 'Drill: "Discovery questions" (5 min). Trening odkrywania priorytetów klienta.',
      },
    },
  },

  // COMPETITION - MEDIUM
  {
    id: 'competition-medium-software',
    category: 'competition',
    level: 2,
    context: 'Jesteś sales rep w firmie SaaS (CRM dla małych firm), Warszawa, demo call. Klient — Pan Jacek, 42, właściciel agencji marketingowej — porównuje Was z HubSpot. Macie 1/3 ceny HubSpot ale mniejszy brand.',
    client_name: 'Jacek, 42',
    business_setting: 'SaaS sales call, Warszawa',
    client_emotional_state: 'Analityczny, lekko sceptyczny',
    opening_line: 'OK, widzę że macie fajne funkcje. Ale szczerze? HubSpot to jest standard w branży. Wszyscy go znają, wszyscy mu ufają. Wy jesteście... no, mniejszy gracz. Jak mam być pewny że za rok nie znikniecie?',
    expected_winning_moves: [
      'Acknowledge obawy bez defensywy',
      'Reframe: mniejszy = bardziej elastyczny, lepszy support',
      'Social proof: konkretni klienci z branży',
      'Pytanie o to co w HubSpot go frustruje',
    ],
    expected_losing_moves: [
      'Atak na HubSpot',
      'Defensive ton ("ale my też jesteśmy duzi!")',
      'Ignorowanie obawy o stabilność',
      'Brak konkretnych przykładów klientów',
    ],
    mentor_responses: {
      belfort: {
        verdict_quote: 'Słuchaj, facet Ci powiedział "wszyscy znają HubSpot" i Ty zacząłeś się tłumaczyć. Błąd. To nie jest obiekcja. To jest buying signal. On mówi "przekonaj mnie że jesteście bezpieczni". Twoja robota: pokazać że bycie mniejszym to PRZEWAGA, nie wada.',
        what_worked: [
          'Nie zaatakowałeś HubSpot',
          'Wspomniałeś o klientach',
        ],
        what_failed: [
          'Ton defensywny — brzmiałeś jakbyś się usprawiedliwiał',
          'Nie zreframe\'owałeś "mniejszy" jako przewagi',
          'Brak konkretnego social proof (nazwałeś branże ale nie firmy)',
        ],
        alternative_response: '"Rozumiem. Pytanie: czy w HubSpot masz dedykowanego account managera który odbiera telefon?" *(nie ma)* "Właśnie. My mamy 50 klientów, nie 50 tysięcy. Każdy ma mojego komórkę. Agencja X przeszła z HubSpot do nas właśnie dlatego — support który faktycznie wspiera."',
        drill_recommendation: 'Drill: "Reframe weakness to strength" (5 min). Trening przekształcania wad w przewagi.',
      },
      hormozi: {
        verdict_quote: 'Widzę co zrobiłeś. Facet ma obiekcję o stabilności i Ty mu mówisz o features. To jest mismatch. On nie kupuje features. Kupuje PEWNOŚĆ. Twoja robota: dać mu pewność. Konkretne liczby, konkretne nazwy, konkretne gwarancje. Zero abstrakcji.',
        what_worked: [
          'Wspomniałeś o klientach',
          'Nie zaatakowałeś konkurencji',
        ],
        what_failed: [
          'Brak konkretnych liczb (ile klientów, jaki churn rate, ile lat na rynku)',
          'Brak nazwanych case studies',
          'Nie zaproponowałeś żadnej gwarancji/trial',
        ],
        alternative_response: '"Rozumiem obawę. Fakty: 3 lata na rynku, 180 klientów, 94% retention rate. Agencja Nowa Era, 40 osób, przeszła z HubSpot 8 miesięcy temu. Zadzwoń do ich CEO, dam Ci numer. Plus: 60 dni money-back, zero pytań. Ryzyko jest po mojej stronie, nie Pana."',
        drill_recommendation: 'Drill: "Concrete proof" (5 min). Trening używania konkretnych liczb i nazwisk.',
      },
    },
  },

  // COMPETITION - HARD
  {
    id: 'competition-hard-enterprise',
    category: 'competition',
    level: 3,
    context: 'Jesteś enterprise sales w firmie cybersecurity, Kraków, finalna prezentacja dla board. Klient — Pani Monika, 48, CTO dużej firmy finansowej — ma na stole ofertę od Cisco (gigant) i od Was (mniejszy gracz ale lepszy tech). Decyzja za tydzień.',
    client_name: 'Monika, 48',
    business_setting: 'Enterprise sales, fintech',
    client_emotional_state: 'Pod presją, ryzyko-awersyjna, sceptyczna',
    opening_line: 'Posłuchajcie. Wasza technologia jest lepsza, to widzę. Ale ja muszę to obronić przed board i audytorami. Cisco to jest bezpieczny wybór. Nikt mnie nie zwolni za wybór Cisco. A jeśli wybiorę Was i coś pójdzie nie tak? Moja głowa. Dlaczego miałabym ryzykować karierę?',
    expected_winning_moves: [
      'Acknowledge jej pozycji i ryzyka (tactical empathy)',
      'Reframe: ryzyko NIE-wyboru lepszej technologii',
      'Konkretny plan wsparcia dla board presentation',
      'Offer: rozmowa z Waszym CTO + referencje od podobnych firm',
      'Głęboki spokój, zero desperacji',
    ],
    expected_losing_moves: [
      'Minimalizowanie jej obawy',
      'Atak na Cisco',
      'Pokazanie desperacji',
      'Brak konkretnego planu jak ją wesprzeć',
      'Presja na szybką decyzję',
    ],
    mentor_responses: {
      voss: {
        verdict_quote: 'To był moment na tactical empathy i Ty go wykorzystałeś... częściowo. Nazwałeś jej obawę, to dobrze. Ale przegapiłeś accusation audit. Ona myśli "ci ludzie będą mnie pressować". Powinieneś to wyprzedzić: "Pewnie myśli Pani że teraz będę Panią pressował na decyzję." Boom. Deeskalacja.',
        what_worked: [
          'Nazwałeś jej obawę o karierę',
          'Nie zaatakowałeś Cisco',
          'Zachowałeś spokój',
        ],
        what_failed: [
          'Brak accusation audit — nie wyprzedziłeś jej obaw o pressure',
          'Za szybko przeszedłeś do rozwiązania',
          'Nie zapytałeś "co konkretnie musi Pani obronić przed board?"',
        ],
        alternative_response: '"Słyszę że jest Pani pod presją. Pewnie myśli Pani że teraz będę Panią pressował na szybką decyzję." *(pauza)* "Nie zrobię tego. Pytanie: co konkretnie musi Pani obronić przed board? Bezpieczeństwo? Koszt? Compliance?" Teraz masz mapę jej prawdziwych obaw.',
        drill_recommendation: 'Drill: "Accusation audit" (10 min). Trening wyprzedzania obiekcji klienta.',
      },
      belfort: {
        verdict_quote: 'OK, widzę błąd. Ona Ci powiedziała "nikt mnie nie zwolni za Cisco" i Ty zacząłeś mówić o technologii. Ona nie kupuje technologii. Kupuje OCHRONĘ KARIERY. Twoja robota: pokazać że wybór Cisco to WIĘKSZE ryzyko dla jej kariery niż wybór Was. Odwróć narrację.',
        what_worked: [
          'Nie zaatakowałeś Cisco bezpośrednio',
          'Zachowałeś profesjonalizm',
        ],
        what_failed: [
          'Nie zreframe\'owałeś Cisco jako ryzykownego wyboru',
          'Brak konkretnego scenariusza "co jeśli Cisco zawiedzie"',
          'Sprzedawałeś tech zamiast career protection',
        ],
        alternative_response: '"Rozumiem. Pytanie: co się stanie jeśli za 6 miesięcy Cisco nie zatrzyma ataku i board zapyta dlaczego nie wybrała Pani lepszej technologii? Nikt Pani nie zwolni za Cisco... dopóki Cisco działa. Ale jeśli nie działa? Wtedy board powie: była lepsza opcja, dlaczego jej nie wzięła?"',
        drill_recommendation: 'Drill: "Reverse risk frame" (10 min). Trening odwracania percepcji ryzyka.',
      },
    },
  },

  // ANGER - EASY
  {
    id: 'anger-easy-restaurant',
    category: 'anger',
    level: 1,
    context: 'Jesteś managerem w restauracji, Wrocław, piątek wieczór. Klient — Pan Adam, 35 — czeka na zamówienie 40 minut. Jest zirytowany ale nie wściekły. Podchodzisz do stolika.',
    client_name: 'Adam, 35',
    business_setting: 'Restauracja, Wrocław',
    client_emotional_state: 'Zirytowany, niecierpliwy',
    opening_line: 'Przepraszam, ale to jest niepoważne. 40 minut czekam na pizzę. Co się dzieje w tej kuchni?',
    expected_winning_moves: [
      'Acknowledge frustracji bez usprawiedliwień',
      'Konkretna informacja o statusie zamówienia',
      'Konkretna akcja (sprawdzam teraz, za 2 minuty wracam)',
      'Spokojny ton',
    ],
    expected_losing_moves: [
      'Usprawiedliwianie ("ale mamy dużo zamówień")',
      'Defensive ton',
      'Vague promises ("zaraz będzie")',
      'Ignorowanie emocji',
    ],
    mentor_responses: {
      robbins: {
        verdict_quote: 'Dobra robota z empatią. Widzę że rozumiesz jego frustrację. Ale brakuje Ci jednej rzeczy: ownership. Powiedziałeś "sprawdzę" ale nie powiedziałeś "to jest moja odpowiedzialność". Klient potrzebuje wiedzieć że ktoś BIERZE TO NA SIEBIE. Nie system. Nie kuchnia. TY.',
        what_worked: [
          'Nazwałeś jego frustrację',
          'Nie usprawiedliwiałeś się',
          'Ton spokojny',
        ],
        what_failed: [
          'Brak ownership — nie powiedziałeś "biorę to na siebie"',
          'Nie zaproponowałeś konkretnej rekompensaty',
          'Vague timeline ("zaraz sprawdzę")',
        ],
        alternative_response: '"Pan Adam, rozumiem frustrację. 40 minut to za długo. To jest moja odpowiedzialność. Idę do kuchni teraz, za 2 minuty wracam z konkretną informacją. I oczywiście ta pizza jest na koszt firmy."',
        drill_recommendation: 'Drill: "Ownership language" (5 min). Trening brania odpowiedzialności.',
      },
    },
  },

  // ANGER - MEDIUM
  {
    id: 'anger-medium-bank',
    category: 'anger',
    level: 2,
    context: 'Jesteś doradcą w banku, Poznań, środa rano. Klient — Pani Barbara, 51, właścicielka małej firmy — przyszła bo bank zablokował jej konto bez ostrzeżenia. Jest wściekła. Transakcja do kontrahenta nie przeszła, straciła kontrakt.',
    client_name: 'Barbara, 51',
    business_setting: 'Oddział banku, Poznań',
    client_emotional_state: 'Wściekła, głośna, agresywna',
    opening_line: 'Wy jesteście niesamowici! Zablokowaliście mi konto bez słowa! Straciłam kontrakt na 40 tysięcy przez Was! Kto mi to zwróci?! Chcę rozmawiać z dyrektorem TERAZ!',
    expected_winning_moves: [
      'Długa pauza (5+ sekund) żeby obniżyć temperaturę',
      'Tactical empathy: nazwanie emocji',
      'Brak usprawiedliwień, tylko fakty',
      'Konkretny plan działania (sprawdzam teraz, 10 minut)',
      'Głęboki spokój mimo agresji',
    ],
    expected_losing_moves: [
      'Defensive ton',
      'Usprawiedliwianie procedur',
      'Przyspieszenie tempa rozmowy',
      'Pokazanie strachu',
      'Vague promises',
    ],
    mentor_responses: {
      goggins: {
        verdict_quote: 'Widzę co się stało. Ona weszła jak huragan i Ty zacząłeś się tłumaczyć. To jest test. Ona testuje czy jesteś alpha czy beta. Jeśli się tłumaczysz — przegrałeś. Musisz WYTRZYMAĆ jej gniew. Cisza. Spokój. Zero reakcji. Wtedy ona się uspokaja.',
        what_worked: [
          'Nie uciekłeś od konfrontacji',
          'Zachowałeś profesjonalizm',
        ],
        what_failed: [
          'Za szybka odpowiedź — pokazałeś że jej gniew Cię dotknął',
          'Zacząłeś tłumaczyć procedury — defensive posture',
          'Brak długiej pauzy przed odpowiedzią',
        ],
        alternative_response: '*(pauza 6 sekund, głęboki spokój, kontakt wzrokowy)* "Pani Barbaro. Rozumiem. 40 tysięcy. To poważna strata." *(pauza 3 sekundy)* "Sprawdzam teraz co się stało. 10 minut. Proszę usiąść." Żadnych usprawiedliwień. Tylko fakty i akcja.',
        drill_recommendation: 'Drill: "Pressure test" (10 min). Trening wytrzymywania agresji bez reakcji.',
      },
      voss: {
        verdict_quote: 'To był tactical empathy moment i Ty go przegapiłeś. Ona jest wściekła nie przez blokadę konta. Jest wściekła bo czuje że ją zignorowaliście. Twoja praca: nazwać emocję. "Słyszę że jest Pani wściekła. Czuje się Pani zignorowana." Boom. Instant deeskalacja.',
        what_worked: [
          'Nie uciekłeś',
          'Zachowałeś spokój',
        ],
        what_failed: [
          'Zero tactical empathy — nie nazwałeś emocji',
          'Przeskoczyłeś do rozwiązania zamiast nazwać problem',
          'Brak accusation audit',
        ],
        alternative_response: '"Pani Barbaro. Słyszę że jest Pani wściekła. Czuje się Pani zignorowana. 40 tysięcy straty przez naszą blokadę." *(pauza)* "Pewnie myśli Pani że teraz będę Panią spławiał procedurami." *(pauza)* "Nie zrobię tego. Sprawdzam co się stało. 10 minut."',
        drill_recommendation: 'Drill: "Tactical Empathy under fire" (10 min). Trening nazywania emocji w konflikcie.',
      },
    },
  },

  // NO_URGENCY - EASY
  {
    id: 'no_urgency-easy-gym',
    category: 'no_urgency',
    level: 1,
    context: 'Jesteś trenerem personalnym, Katowice, konsultacja. Klient — Pan Michał, 33, programista — chce schudnąć 15 kg. Ma nadwagę od 5 lat. Mówi że "w końcu czas zacząć" ale nie widzi pilności.',
    client_name: 'Michał, 33',
    business_setting: 'Klub fitness, Katowice',
    client_emotional_state: 'Pozytywny ale bez urgency',
    opening_line: 'Tak, chcę zacząć treningi. Ale wiesz, nie spieszy mi się jakoś mega. Może od przyszłego miesiąca? Teraz mam dużo pracy, a za miesiąc będzie spokojniej.',
    expected_winning_moves: [
      'Pytanie o to co się stanie jeśli zacznie za miesiąc vs teraz',
      'Gentle reframe: koszt czekania',
      'Konkretny przykład (1 miesiąc = 0 kg vs 2-3 kg)',
      'Spokojny ton bez presji',
    ],
    expected_losing_moves: [
      'Hard pressure',
      'Straszenie zdrowiem',
      'Pokazanie frustracji',
      'Akceptacja "za miesiąc" bez pytań',
    ],
    mentor_responses: {
      hormozi: {
        verdict_quote: 'OK, widzę błąd. Facet Ci powiedział "za miesiąc będzie spokojniej" i Ty to zaakceptowałeś. To jest iluzja. Za miesiąc będzie kolejny powód. Twoja robota: pokazać mu koszt czekania. Nie sprzedajesz treningu. Sprzedajesz koszt NIE-trenowania.',
        what_worked: [
          'Nie pressowałeś agresywnie',
          'Ton przyjazny',
        ],
        what_failed: [
          'Zaakceptowałeś "za miesiąc" bez challenge',
          'Nie pokazałeś kosztu czekania',
          'Brak konkretnych liczb',
        ],
        alternative_response: '"Rozumiem. Pytanie: ile razy w ciągu tych 5 lat powiedziałeś sobie \'za miesiąc zacznę\'?" *(uśmiech, pauza)* "Miesiąc czekania to 0 kg zrzucone. Miesiąc treningów to 2-3 kg mniej. Za rok to różnica 24-36 kg. Który scenariusz wolisz?"',
        drill_recommendation: 'Drill: "Cost of waiting" (5 min). Trening pokazywania kosztu zwlekania.',
      },
    },
  },

  // NO_URGENCY - MEDIUM
  {
    id: 'no_urgency-medium-consulting',
    category: 'no_urgency',
    level: 2,
    context: 'Jesteś konsultantem IT, Warszawa, trzecie spotkanie z klientem. Klient — Pan Robert, 45, CEO średniej firmy produkcyjnej — wie że jego systemy są przestarzałe i ryzykowne. Ale "działa" więc nie widzi pilności modernizacji.',
    client_name: 'Robert, 45',
    business_setting: 'Konsulting IT, Warszawa',
    client_emotional_state: 'Zadowolony ze status quo, risk-blind',
    opening_line: 'Słuchajcie, rozumiem że nasze systemy są stare. Ale działają. Firma działa. Klienci są zadowoleni. Po co ryzykować przestój i wydawać 200 tysięcy teraz? Może za rok, jak będzie lepiej finansowo.',
    expected_winning_moves: [
      'Pytanie o to co się stanie KIEDY (nie "jeśli") system padnie',
      'Konkretny scenariusz: koszt przestoju',
      'Reframe: modernizacja to ubezpieczenie, nie koszt',
      'Pokazanie że "za rok" = większy koszt',
    ],
    expected_losing_moves: [
      'Straszenie bez konkretów',
      'Akceptacja "za rok"',
      'Brak liczb (koszt przestoju, prawdopodobieństwo awarii)',
      'Pokazanie desperacji',
    ],
    mentor_responses: {
      belfort: {
        verdict_quote: 'Dobra, słuchaj. Facet Ci powiedział "działa" i Ty zacząłeś mówić o ryzyku. Błąd. On nie kupuje ryzyka. Kupuje PEWNOŚĆ. Twoja robota: pokazać że status quo to NAJWIĘKSZE ryzyko. Odwróć narrację. "Działa" to nie jest bezpieczeństwo. To jest bomba zegarowa.',
        what_worked: [
          'Wspomniałeś o ryzyku',
          'Nie pressowałeś agresywnie',
        ],
        what_failed: [
          'Brak konkretnego scenariusza awarii',
          'Nie zapytałeś "ile kosztuje dzień przestoju?"',
          'Nie pokazałeś że "za rok" = drożej',
        ],
        alternative_response: '"Rozumiem. Pytanie: ile firma traci dziennie jeśli system padnie?" *(odpowiada: 50k)* "OK. Prawdopodobieństwo awarii w ciągu roku: 40%. To znaczy ryzykuje Pan 50k × 3 dni × 40% = 60k straty. Modernizacja to 200k. Ale to nie koszt. To ubezpieczenie za 200k które chroni przed stratą 60k rocznie."',
        drill_recommendation: 'Drill: "Risk reframe" (10 min). Trening przekształcania kosztu w ubezpieczenie.',
      },
    },
  },
];
