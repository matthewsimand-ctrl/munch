import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Picks the highest-quality English voice available.
 */
function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const english = voices.filter(v => v.lang.startsWith('en'));
  if (!english.length) return voices[0];

  const scored = english.map(v => {
    const n = v.name.toLowerCase();
    let score = 0;

    if (n.includes('espeak') || n.includes('mbrola') || n.includes('compact') || n.includes('festival')) {
      return { voice: v, score: -100 };
    }

    if (/samantha|karen|daniel|moira|tessa|fiona|alex/.test(n)) score += 95;
    if (n.includes('premium') || n.includes('enhanced') || n.includes('natural')) score += 100;
    if (n.includes('google uk english female')) score += 92;
    if (n.includes('google us english')) score += 90;
    if (n.includes('google')) score += 85;
    if (n.includes('online') && n.includes('natural')) score += 82;
    if (n.includes('neural')) score += 80;
    if (n.includes('online')) score += 72;
    if (n.includes('microsoft') && score === 0) score += 55;
    if (v.localService && score < 90) score += 25;
    if (!v.localService && score === 0) score += 20;
    if (score === 0) score = 30;

    return { voice: v, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.voice ?? english[0];
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Load voices eagerly and keep them fresh
  useEffect(() => {
    const load = () => {
      voiceRef.current = getBestVoice();
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window) || !text.trim()) return;

    // Cancel anything currently playing
    synthRef.current.cancel();

    const utter = new SpeechSynthesisUtterance(text);

    // Use best available voice — if voices haven't loaded yet, the browser
    // will use its default. Never delay speak() into a setTimeout; doing so
    // breaks the user-gesture requirement on Safari and some Chrome contexts.
    const voice = voiceRef.current ?? getBestVoice();
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
      voiceRef.current = voice; // cache for next call
    } else {
      utter.lang = 'en-US'; // browser picks default voice
    }

    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend   = () => setIsSpeaking(false);
    utter.onerror = (e) => {
      // 'interrupted' fires when we cancel() before the next speak — not a real error
      if (e.error !== 'interrupted') setIsSpeaking(false);
    };

    // ⚠️ CRITICAL: call speak() synchronously here — NOT inside a setTimeout.
    // Any async defer (even setTimeout 0) can break the browser's user-gesture
    // policy, causing speech to be silently blocked on Safari / iOS webviews.
    synthRef.current.speak(utter);
    setIsSpeaking(true);
  }, []);

  const stop = useCallback(() => {
    synthRef.current.cancel();
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { synthRef.current.cancel(); };
  }, []);

  return { isSpeaking, speak, stop };
}
