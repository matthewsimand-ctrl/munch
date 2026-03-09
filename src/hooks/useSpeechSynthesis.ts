import { useState, useCallback, useRef, useEffect } from 'react';

function getQualityScore(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  // Premium / neural voices (highest quality)
  if (name.includes('premium') || name.includes('enhanced') || name.includes('natural')) return 100;
  // Apple high-quality voices
  if (name.includes('samantha') || name.includes('karen') || name.includes('daniel') || name.includes('moira')) return 90;
  // Google voices (good quality)
  if (name.includes('google')) return 80;
  // Microsoft Online / Neural voices
  if (name.includes('online') || name.includes('neural')) return 75;
  // Microsoft desktop voices
  if (name.includes('microsoft')) return 60;
  // Anything with "compact" or "espeak" is robotic
  if (name.includes('compact') || name.includes('espeak') || name.includes('mbrola')) return 10;
  // Generic english fallback
  if (voice.lang.startsWith('en')) return 40;
  return 20;
}

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Filter to English voices, then sort by quality
  const english = voices.filter(v => v.lang.startsWith('en'));
  if (english.length === 0) return voices[0];

  english.sort((a, b) => getQualityScore(b) - getQualityScore(a));
  return english[0];
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const loadVoice = () => { voiceRef.current = getBestVoice(); };
    loadVoice();
    // Voices load async in Chrome
    window.speechSynthesis.addEventListener('voiceschanged', loadVoice);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoice);
  }, []);

  const speak = useCallback((text: string) => {
    synthRef.current.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) utter.voice = voiceRef.current;
    utter.rate = 0.95;
    utter.pitch = 1.0;
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
