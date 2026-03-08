import { useEffect, useRef, useState, useCallback } from 'react';

interface VoiceCommandHandlers {
  onNext: () => void;
  onPrevious: () => void;
  onRepeat: () => void;
}

export function useVoiceCommands({ onNext, onPrevious, onRepeat }: VoiceCommandHandlers) {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const handlersRef = useRef({ onNext, onPrevious, onRepeat });
  handlersRef.current = { onNext, onPrevious, onRepeat };

  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!isSupported || recognitionRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

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
      }

      // Clear command indicator after 2s
      setTimeout(() => setLastCommand(null), 2000);
    };

    recognition.onerror = (event: any) => {
      // Silently restart on network/no-speech errors
      if (event.error === 'no-speech' || event.error === 'network') return;
      console.warn('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
      if (recognitionRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.warn('Failed to start speech recognition', e);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      try { r.stop(); } catch {}
      setIsListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopListening(); };
  }, [stopListening]);

  return { isListening, isSupported, lastCommand, toggleListening, startListening, stopListening };
}
