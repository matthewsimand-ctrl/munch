import { useEffect, useRef, useState, useCallback } from 'react';

interface VoiceCommandHandlers {
  onNext: () => void;
  onPrevious: () => void;
  onRepeat: () => void;
  onStartTimer?: () => void;
  onPauseTimer?: () => void;
  onStopTimer?: () => void;
}

export function useVoiceCommands({ onNext, onPrevious, onRepeat, onStartTimer, onPauseTimer, onStopTimer }: VoiceCommandHandlers) {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [commandStatus, setCommandStatus] = useState<'success' | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const handlersRef = useRef({ onNext, onPrevious, onRepeat, onStartTimer, onPauseTimer, onStopTimer });
  handlersRef.current = { onNext, onPrevious, onRepeat, onStartTimer, onPauseTimer, onStopTimer };
  const restartAttempts = useRef(0);

  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const showCommand = useCallback((label: string, status: 'success' | 'error') => {
    setLastCommand(label);
    setCommandStatus(status);
    setTimeout(() => { setLastCommand(null); setCommandStatus(null); }, 2500);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Voice commands are not supported in this browser. Try Chrome on desktop or Android.');
      return;
    }
    if (recognitionRef.current) return;

    setError(null);
    restartAttempts.current = 0;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
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
          showCommand('Timer started ⏱️', 'success');
          handlersRef.current.onStartTimer();
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
        setError('Microphone access denied. Please allow microphone permission and try again.');
        recognitionRef.current = null;
        setIsListening(false);
        return;
      }
      if (event.error === 'network') return;
      console.warn('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        restartAttempts.current += 1;
        if (restartAttempts.current > 5) {
          setError('Voice recognition keeps stopping. Your browser may not fully support this feature.');
          recognitionRef.current = null;
          setIsListening(false);
          return;
        }
        try {
          setTimeout(() => {
            if (recognitionRef.current) recognition.start();
          }, 300);
        } catch {}
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      setError('Failed to start voice recognition. Please try again.');
      recognitionRef.current = null;
    }
  }, [isSupported, showCommand]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      try { r.stop(); } catch {}
      setIsListening(false);
    }
    setError(null);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => { stopListening(); };
  }, [stopListening]);

  return { isListening, isSupported, lastCommand, commandStatus, error, toggleListening, startListening, stopListening };
}
