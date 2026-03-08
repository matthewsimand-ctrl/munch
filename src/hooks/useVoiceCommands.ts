import { useEffect, useRef, useState, useCallback } from 'react';

interface VoiceCommandHandlers {
  onNext: () => void;
  onPrevious: () => void;
  onRepeat: () => void;
}

export function useVoiceCommands({ onNext, onPrevious, onRepeat }: VoiceCommandHandlers) {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const handlersRef = useRef({ onNext, onPrevious, onRepeat });
  handlersRef.current = { onNext, onPrevious, onRepeat };
  const restartAttempts = useRef(0);

  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

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
        setLastCommand('next');
        handlersRef.current.onNext();
      } else if (transcript.includes('previous') || transcript.includes('back') || transcript.includes('go back')) {
        setLastCommand('previous');
        handlersRef.current.onPrevious();
      } else if (transcript.includes('repeat') || transcript.includes('again') || transcript.includes('read')) {
        setLastCommand('repeat');
        handlersRef.current.onRepeat();
      } else {
        setLastCommand(`"${transcript}" — try "next", "back", or "repeat"`);
      }

      setTimeout(() => setLastCommand(null), 2500);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return; // Normal, just no audio detected
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access denied. Please allow microphone permission and try again.');
        recognitionRef.current = null;
        setIsListening(false);
        return;
      }
      if (event.error === 'network') {
        // Network issue, will try restart in onend
        return;
      }
      console.warn('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
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
  }, [isSupported]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopListening(); };
  }, [stopListening]);

  return { isListening, isSupported, lastCommand, error, toggleListening, startListening, stopListening };
}
