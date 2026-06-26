import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';
import { useSparring } from '@/contexts/SparringContext';
import { ScenarioDisplay } from '@/components/sparring/ScenarioDisplay';
import { CountdownTimer } from '@/components/sparring/CountdownTimer';
import { Waveform } from '@/components/sparring/Waveform';
import { useMockTimer } from '@/hooks/sparring/useMockTimer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type RingState = 'preview' | 'preparing' | 'recording' | 'analyzing';

const ANALYZING_MESSAGES = [
  'Analizuję taktykę...',
  'Sprawdzam tonację...',
  'Porównuję do mistrzowskiego standardu...',
  'Oceniam reakcję...',
];

export default function SparringRing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentSession, addToHistory, setCurrentSession } = useSparring();
  const [state, setState] = useState<RingState>('preview');
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [analyzingMessage, setAnalyzingMessage] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const preparationTimer = useMockTimer(10, () => setState('recording'));
  const recordingTimer = useMockTimer(30, handleRecordingComplete);

  useEffect(() => {
    if (!currentSession || currentSession.id !== id) {
      navigate('/sparring');
    }
  }, [currentSession, id, navigate]);

  useEffect(() => {
    if (state === 'preparing') {
      preparationTimer.start();
    }
  }, [state]);

  useEffect(() => {
    if (state === 'recording') {
      recordingTimer.start();
      startRecording();
    }
  }, [state]);

  useEffect(() => {
    if (state === 'analyzing') {
      const interval = setInterval(() => {
        setAnalyzingMessage((prev) => (prev + 1) % ANALYZING_MESSAGES.length);
      }, 750);

      const timeout = setTimeout(() => {
        finishAnalyzing();
      }, 3000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [state]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
    } catch (error) {
      console.error('Mic permission denied or not available:', error);
    }
  }

  function handleRecordingComplete() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    setState('analyzing');
  }

  function handleStopRecording() {
    recordingTimer.stop();
    handleRecordingComplete();
  }

  function finishAnalyzing() {
    if (currentSession) {
      const sessionWithScore = {
        ...currentSession,
        score: Math.floor(Math.random() * 30) + 60,
        audioBlob: audioBlob || undefined,
      };
      setCurrentSession(sessionWithScore);
      addToHistory(sessionWithScore);
      navigate(`/sparring/result/${id}`);
    }
  }

  function handleQuit() {
    if (state === 'recording') {
      setShowQuitDialog(true);
    } else {
      navigate('/sparring');
    }
  }

  function confirmQuit() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    navigate('/sparring');
  }

  if (!currentSession) return null;

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8 lg:pl-60">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">🥊 RING</h1>
          <Button variant="ghost" size="icon" onClick={handleQuit}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {state === 'preview' && (
          <div className="space-y-6">
            <ScenarioDisplay
              scenario={currentSession.scenario}
              mentorName={currentSession.mentor.name}
            />
            <Button
              size="lg"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
              onClick={() => setState('preparing')}
            >
              GOTOWY → NAGRYWAM
            </Button>
          </div>
        )}

        {state === 'preparing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <h2 className="text-2xl font-bold">PRZYGOTUJ SIĘ...</h2>
            <CountdownTimer seconds={preparationTimer.seconds} />
            <p className="text-muted-foreground">Pomyśl: jak odpowiesz?</p>
          </div>
        )}

        {state === 'recording' && (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-2 text-red-600">
              <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
              <span className="font-semibold">NAGRYWASZ</span>
            </div>

            <Card className="p-6 bg-red-50/50 border-red-600">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">💬 KLIENT POWIEDZIAŁ:</h3>
              <p className="text-sm leading-relaxed">{currentSession.scenario.opening_line}</p>
            </Card>

            <div className="space-y-4">
              <div className="w-full bg-surface rounded-lg p-4">
                <div className="w-full bg-red-100 rounded-full h-2 mb-2">
                  <div
                    className="bg-red-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(recordingTimer.seconds / 30) * 100}%` }}
                  />
                </div>
                <div className="text-center font-mono text-sm">
                  {String(30 - recordingTimer.seconds).padStart(2, '0')}:{String(recordingTimer.seconds).padStart(2, '0')} / 00:30
                </div>
              </div>

              <Waveform />

              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleStopRecording}
              >
                STOP
              </Button>
            </div>
          </div>
        )}

        {state === 'analyzing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
            <h2 className="text-xl font-bold">{currentSession.mentor.name} ocenia Twój ruch...</h2>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${i <= analyzingMessage ? 'bg-red-600' : 'bg-gray-300'}`}
                />
              ))}
            </div>
            <p className="text-muted-foreground animate-pulse">{ANALYZING_MESSAGES[analyzingMessage]}</p>
          </div>
        )}
      </div>

      <AlertDialog open={showQuitDialog} onOpenChange={setShowQuitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Na pewno?</AlertDialogTitle>
            <AlertDialogDescription>
              Stracisz tę walkę. Nagranie nie zostanie zapisane.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kontynuuj</AlertDialogCancel>
            <AlertDialogAction onClick={confirmQuit} className="bg-red-600 hover:bg-red-700">
              Wyjdź
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
