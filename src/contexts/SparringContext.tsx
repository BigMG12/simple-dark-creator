import { createContext, useContext, useState, ReactNode } from 'react';
import { SparringScenario } from '@/data/sparring/scenarios';

export interface SparringSession {
  id: string;
  scenario: SparringScenario;
  mentor: {
    id: string;
    name: string;
  };
  category: string;
  level: 1 | 2 | 3;
  timestamp: Date;
  score?: number;
  audioBlob?: Blob;
}

interface SparringContextType {
  currentSession: SparringSession | null;
  sessionHistory: SparringSession[];
  setCurrentSession: (session: SparringSession | null) => void;
  addToHistory: (session: SparringSession) => void;
}

const SparringContext = createContext<SparringContextType | undefined>(undefined);

export function SparringProvider({ children }: { children: ReactNode }) {
  const [currentSession, setCurrentSession] = useState<SparringSession | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SparringSession[]>([]);

  const addToHistory = (session: SparringSession) => {
    setSessionHistory(prev => [session, ...prev].slice(0, 20)); // max 20 items
  };

  return (
    <SparringContext.Provider
      value={{
        currentSession,
        sessionHistory,
        setCurrentSession,
        addToHistory,
      }}
    >
      {children}
    </SparringContext.Provider>
  );
}

export function useSparring() {
  const context = useContext(SparringContext);
  if (!context) {
    throw new Error('useSparring must be used within SparringProvider');
  }
  return context;
}
