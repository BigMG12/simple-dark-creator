import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import { useSparring } from '@/contexts/SparringContext';
import { ScoreCircle } from '@/components/sparring/ScoreCircle';
import { MentorVerdict } from '@/components/sparring/MentorVerdict';
import { AlternativeResponse } from '@/components/sparring/AlternativeResponse';
import { toast } from 'sonner';

export default function SparringResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentSession, sessionHistory } = useSparring();
  const [session, setSession] = useState(currentSession);

  useEffect(() => {
    if (currentSession && currentSession.id === id) {
      setSession(currentSession);
    } else {
      const historySession = sessionHistory.find(s => s.id === id);
      if (historySession) {
        setSession(historySession);
      } else {
        console.log('Session not found, redirecting to hub');
        navigate('/sparring');
      }
    }
  }, [currentSession, id, sessionHistory, navigate]);

  if (!session) {
    return (
      <div className="min-h-screen bg-background pb-24 lg:pb-8 lg:pl-60 flex items-center justify-center">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  if (!session.score) {
    return (
      <div className="min-h-screen bg-background pb-24 lg:pb-8 lg:pl-60 flex items-center justify-center">
        <p className="text-muted-foreground">Brak wyniku dla tej sesji</p>
      </div>
    );
  }

  let mentorResponse = session.scenario.mentor_responses[
    session.mentor.id as keyof typeof session.scenario.mentor_responses
  ];

  // Fallback: jeśli wybrany mentor nie ma odpowiedzi, użyj pierwszego dostępnego
  if (!mentorResponse) {
    const availableMentors = Object.keys(session.scenario.mentor_responses);
    if (availableMentors.length > 0) {
      const fallbackMentorId = availableMentors[0];
      mentorResponse = session.scenario.mentor_responses[
        fallbackMentorId as keyof typeof session.scenario.mentor_responses
      ];
      console.log(`Mentor ${session.mentor.id} nie ma odpowiedzi, używam ${fallbackMentorId}`);
    }
  }

  if (!mentorResponse) {
    return (
      <div className="min-h-screen bg-background pb-24 lg:pb-8 lg:pl-60 flex items-center justify-center">
        <p className="text-muted-foreground">Brak feedbacku dla tego scenariusza</p>
      </div>
    );
  }

  const dimensionScores = {
    tactical: Math.floor(Math.random() * 30) + 60,
    emotional: Math.floor(Math.random() * 30) + 50,
    linguistic: Math.floor(Math.random() * 30) + 65,
    mentorStyle: Math.floor(Math.random() * 30) + 55,
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8 lg:pl-60">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">WYNIK</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate('/sparring')}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Score */}
          <div className="flex justify-center py-8">
            <ScoreCircle score={session.score} />
          </div>

          {/* Dimension Breakdown */}
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
              Breakdown
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Tactical</span>
                  <span className="font-mono">{dimensionScores.tactical}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${dimensionScores.tactical}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Emotional</span>
                  <span className="font-mono">{dimensionScores.emotional}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${dimensionScores.emotional}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Linguistic</span>
                  <span className="font-mono">{dimensionScores.linguistic}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${dimensionScores.linguistic}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Mentor-style</span>
                  <span className="font-mono">{dimensionScores.mentorStyle}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full"
                    style={{ width: `${dimensionScores.mentorStyle}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Mentor Verdict */}
          <MentorVerdict quote={mentorResponse.verdict_quote} mentorName={session.mentor.name} />

          {/* What Worked */}
          <Card className="p-6 bg-green-50/50 border-green-600">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">✅ CO ZAGRAŁEŚ DOBRZE:</h3>
            <ul className="space-y-2 text-sm">
              {mentorResponse.what_worked.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </Card>

          {/* What Failed */}
          <Card className="p-6 bg-red-50/50 border-red-600">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">❌ GDZIE BYŁA DZIURA:</h3>
            <ul className="space-y-2 text-sm">
              {mentorResponse.what_failed.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </Card>

          {/* Alternative Response */}
          <AlternativeResponse response={mentorResponse.alternative_response} mentorName={session.mentor.name} />

          {/* Next Step */}
          <Card className="p-6 bg-blue-50/50 border-blue-600">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">🎯 NASTĘPNY KROK:</h3>
            <p className="text-sm">{mentorResponse.drill_recommendation}</p>
          </Card>

          {/* CTAs */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                toast.info('Drill mocked — funkcja dostępna wkrótce');
              }}
            >
              ZACZYNAM DRILL
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/sparring/setup', {
                state: {
                  preselectedCategory: session.category,
                  preselectedLevel: session.level,
                }
              })}
            >
              JESZCZE RAZ
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/sparring/setup')}
            >
              INNA KATEGORIA
            </Button>
            <Button
              onClick={() => navigate('/sparring')}
            >
              POWRÓT
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
