import { useState, useCallback, useRef, useEffect } from 'react';

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  // Prefer natural/enhanced voices
  const preferred = [
    'Google UK English Female',
    'Google US English',
    'Samantha', // macOS
    'Karen',    // macOS
    'Daniel',   // macOS
    'Microsoft Zira',
    'Microsoft David',
  ];
  for (const name of preferred) {
    const v = voices.find(v => v.name.includes(name));
    if (v) return v;
  }
  // Fallback: any English voice that isn't "default"
  const english = voices.find(v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('default'));
  return english || voices[0] || null;
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Load voices (they load async in some browsers)
  useEffect(() => {
    const loadVoice = () => { voiceRef.current = getBestVoice(); };
    loadVoice();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoice);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoice);
  }, []);

  const speak = useCallback((text: string) => {
    synthRef.current.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) utter.voice = voiceRef.current;
    utter.rate = 0.92;
    utter.pitch = 1.05;
    utter.volume = 1;
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    synthRef.current.speak(utter);
  }, []);

  const stop = useCallback(() => {
    synthRef.current.cancel();
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, speak, stop };
}
