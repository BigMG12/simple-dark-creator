export type SparringCategory = 'price_objection' | 'indecision' | 'competition' | 'anger' | 'no_urgency';

export interface MockMentorResponse {
  verdict_quote: string;
  what_worked: string[];
  what_failed: string[];
  alternative_response: string;
  drill_recommendation: string;
}

export interface SparringScenario {
  id: string;
  category: SparringCategory;
  level: 1 | 2 | 3;
  context: string;
  client_name: string;
  business_setting: string;
  client_emotional_state: string;
  opening_line: string;
  expected_winning_moves: string[];
  expected_losing_moves: string[];
  mentor_responses: {
    goggins?: MockMentorResponse;
    belfort?: MockMentorResponse;
    voss?: MockMentorResponse;
    hormozi?: MockMentorResponse;
    robbins?: MockMentorResponse;
  };
}

export const SCENARIOS: SparringScenario[] = [
  // PRICE OBJECTION - EASY
  {
    id: 'price-easy-rtv',
    category: 'price_objection',
    level: 1,
    context: 'Jesteś sprzedawcą w sklepie RTV Euro AGD, Kraków, piątek wieczór. Klientka — Pani Anna, 34, młoda mama — przyszła po pralkę za 2200 zł. Ma budżet ale szuka okazji.',
    client_name: 'Anna, 34',
    business_setting: 'Sklep RTV, Kraków',
    client_emotional_state: 'Pozytywna, otwarta na rozmowę',
    opening_line: 'Ta pralka wygląda super, ale widziałam podobną w Media Markt za 1900 zł. Czy możecie mi zrobić jakąś zniżkę?',
    expected_winning_moves: [
      'Pytanie o konkretny model z Media Markt',
      'Skupienie na wartości dodanej (gwarancja, transport, instalacja)',
      'Spokojny ton bez defensywy',
      'Pauza przed odpowiedzią',
    ],
    expected_losing_moves: [
      'Natychmiastowe obniżenie ceny',
      'Atak na konkurencję',
      'Tłumaczenie się',
      'Mówienie "może" lub "spróbuję"',
    ],
    mentor_responses: {
      goggins: {
        verdict_quote: 'OK, nie najgorzej. Zachowałeś spokój, to dobry start. Ale widzę że brakuje Ci pewności siebie. Klient to czuje. Musisz WIEDZIEĆ że Twoja oferta jest warta każdej złotówki. Nie "może", nie "spróbuję". WIESZ.',
        what_worked: [
          'Nie obniżyłeś ceny od razu',
          'Zadałeś pytanie zamiast bronić się',
          'Ton spokojny',
        ],
        what_failed: [
          'Za szybka odpowiedź — brak pauzy',
          'Użyłeś słowa "może" — klient słyszy niepewność',
          'Nie zapytałeś o konkretny model konkurencji',
        ],
        alternative_response: '"Podobną za 1900. Który dokładnie model?" *(czekaj 3 sekundy)* Klient zaczyna opisywać. Wtedy masz dane żeby pokazać różnicę. Nigdy nie porównuj w ciemno.',
        drill_recommendation: 'Drill: "Pewność w głosie" (5 min). Trening eliminacji słów niepewności.',
      },
      voss: {
        verdict_quote: 'Zauważyłem coś interesującego. Powiedziałeś "możemy zrobić zniżkę" zanim w ogóle zrozumiałeś czego ona naprawdę potrzebuje. To klasyczny błąd. Najpierw zbierz informacje. Dopiero potem negocjuj.',
        what_worked: [
          'Nie zaatakowałeś konkurencji',
          'Zachowałeś profesjonalizm',
          'Ton przyjazny',
        ],
        what_failed: [
          'Brak calibrated questions — nie zapytałeś "jak ważna jest dla Pani gwarancja?"',
          'Nie użyłeś mirroringu',
          'Za szybko przeszedłeś do rozwiązania',
        ],
        alternative_response: '"Podobną za 1900?" *(mirroring + pauza)* Ona wtedy wyjaśnia różnice. "Jak ważna jest dla Pani gwarancja?" Teraz masz mapę jej priorytetów.',
        drill_recommendation: 'Drill: "Calibrated Questions" (5 min). Trening pytań otwartych.',
      },
    },
  },

  // PRICE OBJECTION - MEDIUM
  {
    id: 'price-medium-meble',
    category: 'price_objection',
    level: 2,
    context: 'Jesteś sprzedawcą w salonie meblowym Black Red White, Warszawa, sobota popołudnie. Klient — Pan Marek, 47, CFO w średniej polskiej firmie — przyszedł po kanapę za 8500 zł. Już był u konkurencji.',
    client_name: 'Marek, 47',
    business_setting: 'Salon meblowy, Warszawa',
    client_emotional_state: 'Sceptyczny ale gotowy do rozmowy',
    opening_line: 'Wie Pan co, to jest piękna kanapa, ale 8500 to dla mnie za dużo. W Agacie identyczny model jest za 6300. Dwa tysiące dwieście różnicy — co takiego u Państwa robi tę różnicę?',
    expected_winning_moves: [
      'Pauza 3-5 sekund przed odpowiedzią',
      'Powtórzenie kwoty różnicy dla podkreślenia',
      'Pytanie "Co konkretnie u nich się Panu spodobało?" zamiast tłumaczenia',
      'Framing wartości a nie listy features',
      'Spokojny ton, brak defensive posture',
    ],
    expected_losing_moves: [
      'Tłumaczenie features ("u nas materiał jest...")',
      'Obniżanie ceny od razu',
      'Defensive ton ("ale u nas jest jakość!")',
      'Powiedzenie "może" lub "rozumiem ale"',
      'Brak pauzy, szybka odpowiedź',
    ],
    mentor_responses: {
      goggins: {
        verdict_quote: 'Słuchaj, koleś. Zacząłeś OK ale w sekundzie 12 zacząłeś tłumaczyć cenę. To była dziura. Klient poczuł że się bronisz. Beta posture = klient wygrywa. Nigdy. NIGDY nie tłumacz ceny. Defenduj WARTOŚĆ. Różnica wszystko.',
        what_worked: [
          'Nie obniżyłeś ceny od razu (good)',
          'Zacząłeś pytaniem, nie odpowiedzią',
          'Zachowałeś spokój',
        ],
        what_failed: [
          'Sekunda 12: zacząłeś listować features. Klient się znudził.',
          'Brak pauzy po jego obiekcji. Powinieneś czekać 3s.',
          'Powiedziałeś "może" 2 razy — klient czuje że się wahasz.',
        ],
        alternative_response: '"Dwa tysiące dwieście różnicy. Słucham." *(pauza 4 sekundy)* Klient zaczyna wyjaśniać CO go niepokoi. Wtedy TY masz informację potrzebną żeby wygrać. Nigdy nie odpowiadasz pierwszy.',
        drill_recommendation: 'Drill: "Pauza po obiekcji" (5 min). Atakuje Twoją słabość: brak komfortu w ciszy.',
      },
      voss: {
        verdict_quote: 'Zauważyłem coś. Powiedziałeś "u nas jakość jest..." — czy zdawałeś sobie sprawę co przed chwilą zrobiłeś? Zaprosiłeś go do dyskusji której nigdy nie wygrasz. Każdy sprzedawca mówi że ma jakość. Twój klient już to słyszał 50 razy. Zamiast tego — mirroring. Powtórz jego słowa.',
        what_worked: [
          'Tonacja spokojna — dobry mid-game',
          'Nie obniżyłeś ceny',
          'Zachowałeś profesjonalizm',
        ],
        what_failed: [
          'Listowałeś argumenty zamiast zadawać pytania',
          'Brak żadnego mirroringa',
          'Odpowiadałeś na poziomie features, klient był na poziomie wartości',
        ],
        alternative_response: '"Dwa tysiące dwieście różnicy?" *(czekaj. Pozwól że on wypełni ciszę.)* Klient zwykle odpowiada wtedy: "No tak, bo..." i sam ujawni co naprawdę go martwi. Wtedy masz dane.',
        drill_recommendation: 'Drill: "Mirroring 30s" (5 min). Trening zwierciadła — najpotężniejsza technika negocjacyjna.',
      },
      belfort: {
        verdict_quote: 'Dobra, słuchaj. Masz przed sobą CFO. Facet który codziennie analizuje ROI. A Ty mu sprzedajesz kanapę jak sprzedawca z Ikei. Błąd. CFO kupuje INWESTYCJĘ. Pokaż mu liczby: 10 lat użytkowania, koszt dziennie, wartość rezydualna. Mów jego językiem.',
        what_worked: [
          'Nie spanikował przy kwocie',
          'Zachowałeś kontrolę rozmowy',
          'Nie zaatakowałeś konkurencji',
        ],
        what_failed: [
          'Nie zidentyfikowałeś że to CFO — mówisz do niego jak do zwykłego klienta',
          'Brak framingu finansowego (ROI, koszt dzienny, wartość w czasie)',
          'Sprzedajesz produkt zamiast inwestycji',
        ],
        alternative_response: '"Dwa tysiące dwieście. Rozumiem. Przeliczmy to: 10 lat użytkowania, to 60 groszy dziennie różnicy. Pytanie brzmi: czy komfort Pana rodziny przez następną dekadę jest wart 60 groszy dziennie?"',
        drill_recommendation: 'Drill: "Reframe do wartości" (5 min). Trening przekształcania ceny w inwestycję.',
      },
    },
  },

  // PRICE OBJECTION - HARD
  {
    id: 'price-hard-telekom',
    category: 'price_objection',
    level: 3,
    context: 'Jesteś doradcą w salonie Orange, Poznań, środa rano. Klient — Pan Krzysztof, 52, właściciel małej firmy budowlanej — przyszedł po pakiet biznesowy za 450 zł/mies. Jest wściekły bo konkurencja oferuje 320 zł.',
    client_name: 'Krzysztof, 52',
    business_setting: 'Salon Orange, Poznań',
    client_emotional_state: 'Zirytowany, niecierpliwy, gotowy wyjść',
    opening_line: 'Panie, ja nie mam czasu na te gierki. Play daje mi to samo za 320. Wy chcecie 450. To jest 130 złotych miesięcznie, prawie 1600 rocznie. Albo dorównujecie cenie albo dziękuję, do widzenia.',
    expected_winning_moves: [
      'Acknowledge emocji bez defensywy',
      'Długa pauza (5+ sekund) żeby obniżyć temperaturę',
      'Pytanie o to co konkretnie dostaje w Play',
      'Framing różnicy jako inwestycji w ciągłość biznesu',
      'Brak paniki, głęboki spokój',
    ],
    expected_losing_moves: [
      'Natychmiastowe dopasowanie ceny',
      'Defensive ton',
      'Przyspieszenie tempa rozmowy',
      'Atak na Play',
      'Pokazanie strachu przed utratą klienta',
    ],
    mentor_responses: {
      goggins: {
        verdict_quote: 'Widzę co się stało. Facet wszedł agresywnie i Ty się cofnąłeś. To jest test. On testuje czy jesteś alpha czy beta. Jeśli się cofniesz — przegrałeś. Musisz WYTRZYMAĆ jego presję. Cisza. Spokój. Zero reakcji na jego gniew. Wtedy on się łamie, nie Ty.',
        what_worked: [
          'Nie obniżyłeś ceny natychmiast',
          'Zachowałeś profesjonalizm mimo agresji',
        ],
        what_failed: [
          'Tempo Twojej odpowiedzi — za szybkie. Pokazałeś że jego gniew Cię dotknął.',
          'Brak długiej pauzy. Powinieneś czekać 6-7 sekund.',
          'Ton obronny — klient usłyszał strach w Twoim głosie.',
        ],
        alternative_response: '*(pauza 7 sekund, głęboki spokój)* "130 złotych miesięcznie. Rozumiem." *(kolejna pauza 4 sekundy)* Wtedy on zaczyna się uspokajać. Jego gniew potrzebuje oporu żeby żyć. Nie daj mu oporu.',
        drill_recommendation: 'Drill: "Pressure test" (10 min). Trening wytrzymywania agresji klienta bez reakcji.',
      },
      voss: {
        verdict_quote: 'To był tactical empathy moment i Ty go przegapiłeś. Facet jest wściekły nie przez cenę. Jest wściekły bo czuje że go oszukują. Twoja praca: nazwać jego emocję. "Słyszę że jest Pan sfrustrowany." Boom. Instant deeskalacja. Nie rozwiązujesz problemu. Nazywasz emocję.',
        what_worked: [
          'Nie zaatakowałeś Play',
          'Zachowałeś spokój',
        ],
        what_failed: [
          'Zero tactical empathy — nie nazwałeś jego frustracji',
          'Przeskoczyłeś od razu do argumentów',
          'Brak accusation audit — nie wyprzedziłeś jego obiekcji',
        ],
        alternative_response: '"Słyszę że jest Pan sfrustrowany. Pewnie myśli Pan że próbuję Pana naciągnąć na wyższą cenę." *(pauza)* "1600 rocznie to poważna różnica dla małej firmy." Nazwałeś emocję + accusation audit. Teraz on czuje że go rozumiesz.',
        drill_recommendation: 'Drill: "Tactical Empathy" (5 min). Trening nazywania emocji klienta.',
      },
    },
  },

  // INDECISION - EASY
  {
    id: 'indecision-easy-ubezpieczenia',
    category: 'indecision',
    level: 1,
    context: 'Jesteś agentem ubezpieczeniowym, spotkanie online. Klientka — Pani Paulina, 29, młoda specjalistka IT — rozważa ubezpieczenie na życie za 180 zł/mies. Ma wszystkie informacje ale nie może się zdecydować.',
    client_name: 'Paulina, 29',
    business_setting: 'Spotkanie online, ubezpieczenia',
    client_emotional_state: 'Niepewna, potrzebuje gentle push',
    opening_line: 'Wszystko brzmi dobrze, ale... nie wiem. To dużo pieniędzy miesięcznie. Może poczekam jeszcze miesiąc, przemyślę to spokojnie?',
    expected_winning_moves: [
      'Pytanie o to co konkretnie musi przemyśleć',
      'Gentle reframe: koszt czekania',
      'Spokojny ton bez presji',
      'Pokazanie że rozumiesz wahanie',
    ],
    expected_losing_moves: [
      'Hard pressure ("musi Pani zdecydować dziś")',
      'Straszenie',
      'Dodawanie nowych informacji (overload)',
      'Pokazanie frustracji',
    ],
    mentor_responses: {
      robbins: {
        verdict_quote: 'Dobra robota z empatią. Widzę że rozumiesz jej wahanie. Ale brakuje Ci jednej rzeczy: clarity. Ona nie wie co przemyśleć bo nie wie CZEGO nie wie. Twoja praca: pomóc jej zobaczyć że już ma wszystkie informacje. Decyzja jest prosta. Ona tylko potrzebuje pozwolenia żeby ją podjąć.',
        what_worked: [
          'Nie pressowałeś agresywnie',
          'Ton empatyczny',
          'Zachowałeś spokój',
        ],
        what_failed: [
          'Nie zapytałeś "co konkretnie chce Pani przemyśleć?"',
          'Brak reframe kosztu czekania',
          'Nie dałeś jej pozwolenia na decyzję',
        ],
        alternative_response: '"Co konkretnie chce Pani przemyśleć?" *(czekaj)* Ona wymienia 1-2 rzeczy. "OK, to są dobre pytania. Odpowiedzmy na nie teraz. Bo za miesiąc będzie Pani miała te same pytania, tylko będzie Pani miesiąc starsza i ubezpieczenie będzie droższe."',
        drill_recommendation: 'Drill: "Clarity questions" (5 min). Trening wyciągania konkretnych obiekcji.',
      },
    },
  },

  // INDECISION - MEDIUM
  {
    id: 'indecision-medium-ecommerce',
    category: 'indecision',
    level: 2,
    context: 'Jesteś account managerem w agencji e-commerce, Wrocław, call z klientem. Klient — Pan Tomasz, 38, właściciel sklepu online z odzieżą — rozważa pakiet usług za 8000 zł/mies. Trzecie spotkanie, wciąż się waha.',
    client_name: 'Tomasz, 38',
    business_setting: 'Agencja e-commerce, Wrocław',
    client_emotional_state: 'Analityczny, ostrożny, boi się błędu',
    opening_line: 'Słuchajcie, to wszystko brzmi świetnie, ale to jest duża inwestycja. Muszę to jeszcze raz przeanalizować z żoną. Ona prowadzi finanse. Odezwę się za tydzień, OK?',
    expected_winning_moves: [
      'Pytanie o konkretne obawy',
      'Reframe: co się stanie jeśli NIE zacznie teraz',
      'Offer: krótka rozmowa z żoną (włącz ją do procesu)',
      'Pokazanie że rozumiesz wagę decyzji',
    ],
    expected_losing_moves: [
      'Akceptacja "odezwę się" bez konkretnej daty',
      'Dodawanie nowych argumentów (overload)',
      'Pokazanie desperacji',
      'Ignorowanie żony jako decision maker',
    ],
    mentor_responses: {
      hormozi: {
        verdict_quote: 'OK, widzę błąd. Facet Ci powiedział "muszę z żoną" i Ty to zaakceptowałeś. To jest smoke screen. Prawdziwy problem: on nie widzi kosztu NIE-działania. Twoja robota: pokazać mu ile traci KAŻDEGO dnia czekając. Nie sprzedajesz usługi. Sprzedajesz koszt oportunistyczny czekania.',
        what_worked: [
          'Nie pressowałeś agresywnie',
          'Uznałeś żonę jako decision maker',
        ],
        what_failed: [
          'Zaakceptowałeś "za tydzień" bez konkretnej daty',
          'Nie pokazałeś kosztu czekania (ile traci dziennie)',
          'Nie zaproponowałeś rozmowy z żoną teraz',
        ],
        alternative_response: '"Rozumiem. Pytanie: ile Pana sklep robi dziennie obrotu?" *(odpowiada)* "OK, więc tydzień czekania to X złotych potencjalnego wzrostu który Pan traci. Może zróbmy tak: 15 minut call z Panem i żoną jutro? Odpowiem na jej pytania, zdecydujecie razem."',
        drill_recommendation: 'Drill: "Koszt czekania" (5 min). Trening pokazywania opportunity cost.',
      },
    },
  },

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
];

export function getScenariosByCategory(category: SparringCategory): SparringScenario[] {
  return SCENARIOS.filter(s => s.category === category);
}

export function getScenariosByCategoryAndLevel(category: SparringCategory, level: 1 | 2 | 3): SparringScenario[] {
  return SCENARIOS.filter(s => s.category === category && s.level === level);
}

export function getRandomScenario(category?: SparringCategory, level?: 1 | 2 | 3): SparringScenario {
  let filtered = SCENARIOS;

  if (category) {
    filtered = filtered.filter(s => s.category === category);
  }

  if (level) {
    const byLevel = filtered.filter(s => s.level === level);
    // Fallback: if no scenarios for this level, keep category-filtered list
    if (byLevel.length > 0) filtered = byLevel;
  }

  // Final safety: if still empty (unknown category), fall back to all scenarios
  if (filtered.length === 0) filtered = SCENARIOS;

  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex];
}
