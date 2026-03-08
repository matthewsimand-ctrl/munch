import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDbRecipes } from '@/hooks/useDbRecipes';
import { useStore } from '@/lib/store';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Timer, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

function parseTimerFromStep(step: string): number | null {
  const patterns = [
    /(\d+)\s*[-–]\s*(\d+)\s*min/i,
    /(\d+)\s*min/i,
    /(\d+)\s*[-–]\s*(\d+)\s*second/i,
    /(\d+)\s*second/i,
  ];
  for (const pat of patterns) {
    const m = step.match(pat);
    if (m) {
      if (pat.source.includes('second')) {
        return m[2] ? Math.round((parseInt(m[1]) + parseInt(m[2])) / 2) : parseInt(m[1]);
      }
      const mins = m[2] ? Math.round((parseInt(m[1]) + parseInt(m[2])) / 2) : parseInt(m[1]);
      return mins * 60;
    }
  }
  return null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CookMode() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dbRecipes = [] } = useDbRecipes();
  const { savedApiRecipes } = useStore();
  const recipe = dbRecipes.find(r => r.id === id) || savedApiRecipes[id || ''];

  const [currentStep, setCurrentStep] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const { isSpeaking, speak, stop: stopSpeaking } = useSpeechSynthesis();

  const steps = recipe?.instructions ?? [];
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
  const stepTimer = steps[currentStep] ? parseTimerFromStep(steps[currentStep]) : null;

  // Timer logic
  useEffect(() => {
    if (timerRunning && timerRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimerRemaining(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            // Play alarm
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 880;
              gain.gain.value = 0.3;
              osc.start();
              setTimeout(() => { osc.stop(); ctx.close(); }, 1000);
            } catch {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning, timerRemaining]);

  // Reset timer when step changes
  useEffect(() => {
    setTimerRunning(false);
    setTimerRemaining(0);
    setTimerSeconds(stepTimer);
  }, [currentStep, stepTimer]);

  // Speech
  const speak = useCallback((text: string) => {
    synthRef.current.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9;
    utter.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    synthRef.current.speak(utter);
  }, []);

  const stopSpeaking = useCallback(() => {
    synthRef.current.cancel();
    setIsSpeaking(false);
  }, []);

  // Auto-read on step change
  useEffect(() => {
    if (steps[currentStep]) {
      speak(`Step ${currentStep + 1}. ${steps[currentStep]}`);
    }
    return () => { synthRef.current.cancel(); };
  }, [currentStep, steps, speak]);

  const goNext = () => {
    if (currentStep < totalSteps - 1) setCurrentStep(s => s + 1);
  };
  const goPrev = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const startTimer = (secs: number) => {
    setTimerRemaining(secs);
    setTimerRunning(true);
  };

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Recipe not found</p>
          <Button onClick={() => navigate('/saved')}>Back to Saved</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-2 max-w-md mx-auto w-full">
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/saved')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-lg font-bold text-foreground truncate">
              {recipe.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => isSpeaking ? stopSpeaking() : speak(`Step ${currentStep + 1}. ${steps[currentStep]}`)}
          >
            {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Step Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="w-full text-center space-y-6"
          >
            <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto">
              {currentStep + 1}
            </div>
            <p className="text-xl leading-relaxed text-foreground font-medium">
              {steps[currentStep]}
            </p>

            {/* Timer section */}
            {stepTimer && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                  <Timer className="h-4 w-4" />
                  <span>Timer detected: {formatTime(stepTimer)}</span>
                </div>

                {timerRemaining > 0 ? (
                  <div className="space-y-3">
                    <p className={cn(
                      "text-4xl font-mono font-bold tabular-nums",
                      timerRemaining <= 10 ? "text-destructive animate-pulse" : "text-primary"
                    )}>
                      {formatTime(timerRemaining)}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant={timerRunning ? "outline" : "default"}
                        onClick={() => setTimerRunning(!timerRunning)}
                      >
                        {timerRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                        {timerRunning ? 'Pause' : 'Resume'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setTimerRunning(false); setTimerRemaining(0); }}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" /> Reset
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => startTimer(stepTimer)}>
                    <Play className="h-4 w-4 mr-1" /> Start Timer
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-6 pb-8 pt-4 max-w-md mx-auto w-full">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="flex-1"
            disabled={currentStep === 0}
            onClick={goPrev}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          {currentStep === totalSteps - 1 ? (
            <Button className="flex-1" onClick={() => navigate('/saved')}>
              🎉 Done!
            </Button>
          ) : (
            <Button className="flex-1" onClick={goNext}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
