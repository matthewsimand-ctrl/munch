import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDbRecipes } from '@/hooks/useDbRecipes';
import { useStore } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { Button } from '@/components/ui/button';
import { ChefPath, CookingXpBar } from '@/components/ChefCompanion';
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Timer, Volume2, VolumeX, Mic, MicOff, FolderPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  const { savedApiRecipes, markRecipeCooked, recipeFolders, createFolder, addRecipeToFolder } = useStore();
  const recipe = dbRecipes.find(r => r.id === id) || savedApiRecipes[id || ''];
  const [isDone, setIsDone] = useState(false);
  const [showArchivePrompt, setShowArchivePrompt] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const { isSpeaking, speak, stop: stopSpeaking } = useSpeechSynthesis();

  const steps = recipe?.instructions ?? [];
  const totalSteps = steps.length;
  const stepTimer = steps[currentStep] ? parseTimerFromStep(steps[currentStep]) : null;

  // Timer logic
  useEffect(() => {
    if (timerRunning && timerRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimerRemaining(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
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
  }, [currentStep]);

  // Auto-read on step change
  useEffect(() => {
    if (steps[currentStep]) {
      speak(`Step ${currentStep + 1}. ${steps[currentStep]}`);
    }
    return () => { stopSpeaking(); };
  }, [currentStep, steps, speak, stopSpeaking]);

  const goNext = useCallback(() => {
    if (currentStep < totalSteps - 1) setCurrentStep(s => s + 1);
  }, [currentStep, totalSteps]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  }, [currentStep]);

  const repeatStep = useCallback(() => {
    if (steps[currentStep]) {
      speak(`Step ${currentStep + 1}. ${steps[currentStep]}`);
    }
  }, [currentStep, steps, speak]);

  const handleStartTimer = useCallback(() => {
    if (stepTimer && timerRemaining === 0) {
      setTimerRemaining(stepTimer);
      setTimerRunning(true);
    } else if (timerRemaining > 0 && !timerRunning) {
      setTimerRunning(true);
    }
  }, [stepTimer, timerRemaining, timerRunning]);

  const handlePauseTimer = useCallback(() => {
    if (timerRunning) setTimerRunning(false);
  }, [timerRunning]);

  const handleStopTimer = useCallback(() => {
    setTimerRunning(false);
    setTimerRemaining(0);
  }, []);

  // Voice commands
  const { isListening, isSupported: voiceSupported, lastCommand, commandStatus, error: voiceError, toggleListening } = useVoiceCommands({
    onNext: goNext,
    onPrevious: goPrev,
    onRepeat: repeatStep,
    onStartTimer: stepTimer ? handleStartTimer : undefined,
    onPauseTimer: timerRunning ? handlePauseTimer : undefined,
    onStopTimer: timerRemaining > 0 ? handleStopTimer : undefined,
  });

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
        <div className="flex items-center gap-3 mb-2">
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
          <div className="flex items-center gap-1">
            {voiceSupported && (
              <Button
                variant={isListening ? "default" : "ghost"}
                size="icon"
                onClick={toggleListening}
                className={cn(isListening && "animate-pulse")}
                title={isListening ? "Voice commands active" : "Enable voice commands"}
              >
                {isListening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => isSpeaking ? stopSpeaking() : speak(`Step ${currentStep + 1}. ${steps[currentStep]}`)}
            >
              {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Voice feedback */}
        <AnimatePresence>
          {lastCommand && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className={cn(
                "text-xs text-center font-semibold py-1.5 px-3 rounded-lg mx-auto w-fit",
                commandStatus === 'success'
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              🎤 {lastCommand}
            </motion.div>
          )}
        </AnimatePresence>
        {voiceError && (
          <p className="text-[11px] text-center text-destructive mt-1 px-2">{voiceError}</p>
        )}
        {isListening && !lastCommand && !voiceError && (
          <p className="text-[10px] text-center text-muted-foreground mt-1">
            🎤 Say "next", "back", "repeat", "start timer", "pause", or "stop timer"
          </p>
        )}

        {/* Chef path at top */}
        <div className="mt-3">
          <ChefPath
            currentStep={currentStep}
            totalSteps={totalSteps}
            timerRunning={timerRunning}
            isDone={isDone}
          />
        </div>
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
            className="w-full text-center space-y-5"
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
                  <span>Timer: {formatTime(stepTimer)}</span>
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
                  <Button onClick={() => { setTimerRemaining(stepTimer); setTimerRunning(true); }}>
                    <Play className="h-4 w-4 mr-1" /> Start Timer
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* XP bar at bottom */}
      <div className="px-4 pb-2 max-w-md mx-auto w-full">
        <CookingXpBar currentStep={currentStep} isDone={isDone} />
      </div>

      {/* Navigation */}
      <div className="px-6 pb-8 pt-3 max-w-md mx-auto w-full">
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
            <Button className="flex-1" onClick={() => {
              if (id) markRecipeCooked(id);
              setIsDone(true);
              toast.success('🎉 Recipe completed! Great cooking!');
              setTimeout(() => setShowArchivePrompt(true), 800);
            }}>
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
