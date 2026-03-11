import { useEffect, useRef, useState, useCallback } from 'react';

interface VoiceCommandHandlers {
  onNext: () => void;
  onPrevious: () => void;
  onRepeat: () => void;
  onStartTimer?: (seconds?: number) => void;
  onPauseTimer?: () => void;
  onStopTimer?: () => void;
}

export function useVoiceCommands({ onNext, onPrevious, onRepeat, onStartTimer, onPauseTimer, onStopTimer }: VoiceCommandHandlers) {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [commandStatus, setCommandStatus] = useState<'success' | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const commandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmountedRef = useRef(false);
  const handlersRef = useRef({ onNext, onPrevious, onRepeat, onStartTimer, onPauseTimer, onStopTimer });
  handlersRef.current = { onNext, onPrevious, onRepeat, onStartTimer, onPauseTimer, onStopTimer };
  const restartAttempts = useRef(0);

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const safeSetState = useCallback((fn: () => void) => {
    if (isUnmountedRef.current) return;
    fn();
  }, []);

  const showCommand = useCallback((label: string, status: 'success' | 'error') => {
    safeSetState(() => {
      setLastCommand(label);
      setCommandStatus(status);
    });

    if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
    commandTimeoutRef.current = setTimeout(() => {
      safeSetState(() => {
        setLastCommand(null);
        setCommandStatus(null);
      });
    }, 2500);
  }, [safeSetState]);

  const stopListening = useCallback((suppressState = false) => {
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      try { r.stop(); } catch { }
    }

    if (!suppressState) {
      safeSetState(() => {
        setIsListening(false);
        setError(null);
      });
    }
  }, [safeSetState]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      safeSetState(() => {
        setError('Voice commands are not supported in this browser. Try Chrome on desktop or Android.');
      });
      return;
    }
    if (recognitionRef.current) return;

    safeSetState(() => {
      setError(null);
    });
    restartAttempts.current = 0;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      safeSetState(() => {
        setIsListening(true);
      });
      restartAttempts.current = 0;
    };

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      if (!last.isFinal) return;
      const transcript = last[0].transcript.toLowerCase().trim();

      if (transcript.includes('next') || transcript.includes('continue') || transcript.includes('forward')) {
        showCommand('Next step ▶', 'success');
        handlersRef.current.onNext();
      } else if (transcript.includes('previous') || transcript.includes('back') || transcript.includes('go back')) {
        showCommand('Previous step ◀', 'success');
        handlersRef.current.onPrevious();
      } else if (transcript.includes('repeat') || transcript.includes('again') || transcript.includes('read')) {
        showCommand('Repeating step 🔁', 'success');
        handlersRef.current.onRepeat();
      } else if (transcript.includes('start timer') || transcript.includes('begin timer') || transcript.includes('set timer')) {
        if (handlersRef.current.onStartTimer) {
          let durationSeconds = 0;
          const matchMinutes = transcript.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty|forty|fifty|sixty)\s+minute/i);
          const matchSeconds = transcript.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty|forty|fifty|sixty)\s+second/i);

          const wordToNumber: Record<string, number> = {
            one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
            eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, twenty: 20, thirty: 30,
            forty: 40, fifty: 50, sixty: 60
          };

          const parseAmount = (match: RegExpMatchArray | null): number => {
            if (!match) return 0;
            const val = match[1].toLowerCase();
            return parseInt(val, 10) || wordToNumber[val] || 0;
          };

          const mins = parseAmount(matchMinutes);
          const secs = parseAmount(matchSeconds);

          if (mins > 0 || secs > 0) {
            durationSeconds = mins * 60 + secs;
          }

          if (durationSeconds > 0) {
            showCommand(`Timer started for ${mins > 0 ? mins + 'm ' : ''}${secs > 0 ? secs + 's ' : ''}⏱️`.trim(), 'success');
            handlersRef.current.onStartTimer(durationSeconds);
          } else {
            showCommand('Timer started ⏱️', 'success');
            handlersRef.current.onStartTimer(); // Start default timer
          }
        } else {
          showCommand('No timer on this step', 'error');
        }
      } else if (transcript.includes('pause timer') || transcript.includes('pause')) {
        if (handlersRef.current.onPauseTimer) {
          showCommand('Timer paused ⏸️', 'success');
          handlersRef.current.onPauseTimer();
        } else {
          showCommand('No timer running', 'error');
        }
      } else if (transcript.includes('stop timer') || transcript.includes('end timer') || transcript.includes('cancel timer') || transcript.includes('reset timer')) {
        if (handlersRef.current.onStopTimer) {
          showCommand('Timer stopped ⏹️', 'success');
          handlersRef.current.onStopTimer();
        } else {
          showCommand('No timer to stop', 'error');
        }
      } else {
        showCommand(`"${transcript}" — didn't catch that`, 'error');
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        safeSetState(() => {
          setError('Microphone access denied. Please allow microphone permission and try again.');
          setIsListening(false);
        });
        recognitionRef.current = null;
        return;
      }
      if (event.error === 'network') return;
      console.warn('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        restartAttempts.current += 1;
        if (restartAttempts.current > 5) {
          safeSetState(() => {
            setError('Voice recognition keeps stopping. Your browser may not fully support this feature.');
            setIsListening(false);
          });
          recognitionRef.current = null;
          return;
        }
        try {
          setTimeout(() => {
            if (recognitionRef.current && !isUnmountedRef.current) recognition.start();
          }, 300);
        } catch { }
      } else {
        safeSetState(() => {
          setIsListening(false);
        });
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      safeSetState(() => {
        setError('Failed to start voice recognition. Please try again.');
      });
      recognitionRef.current = null;
    }
  }, [isSupported, safeSetState, showCommand]);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
      stopListening(true);
    };
  }, [stopListening]);

  return { isListening, isSupported, lastCommand, commandStatus, error, toggleListening, startListening, stopListening: () => stopListening() };
}
