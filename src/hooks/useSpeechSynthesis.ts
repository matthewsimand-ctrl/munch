import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Picks the highest-quality English voice available.
 * The browser exposes many voices — some are high-quality neural/premium voices
 * and others are robotic system voices. We score each voice and pick the best.
 */
function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const english = voices.filter(v => v.lang.startsWith('en'));
  if (!english.length) return voices[0];

  // Score each voice — higher = better quality
  const scored = english.map(v => {
    const n = v.name.toLowerCase();
    let score = 0;

    // ---- BLOCKLIST: robotic / low-quality voices ----
    if (n.includes('espeak') || n.includes('mbrola') || n.includes('compact') || n.includes('festival')) {
      return { voice: v, score: -100 };
    }

    // ---- BOOST: known high-quality voices ----
    // Apple premium (macOS / iOS)
    if (/samantha|karen|daniel|moira|tessa|fiona|alex/.test(n)) score += 95;
    // Apple "enhanced" or "premium" variants
    if (n.includes('premium') || n.includes('enhanced') || n.includes('natural')) score += 100;
    // Google voices (Chrome)
    if (n.includes('google uk english female')) score += 92;
    if (n.includes('google us english')) score += 90;
    if (n.includes('google')) score += 85;
    // Microsoft Online / Neural (Edge)
    if (n.includes('online') && n.includes('natural')) score += 82;
    if (n.includes('neural')) score += 80;
    if (n.includes('online')) score += 72;
    // Microsoft desktop voices (okay but not great)
    if (n.includes('microsoft') && score === 0) score += 55;

    // Prefer local voices for reliability (some cloud voices fail silently on mobile/webviews)
    if (v.localService && score < 90) score += 25;
    // If no other signal, still allow non-local as fallback
    if (!v.localService && score === 0) score += 20;
    // Generic English fallback
    if (score === 0) score = 30;

    return { voice: v, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Debug: uncomment to see voice selection
  // console.log('Voice scores:', scored.map(s => `${s.voice.name} (${s.score})`));

  return scored[0]?.voice ?? english[0];
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const voiceLockedRef = useRef(false);

  const getFallbackVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const english = voices.filter(v => v.lang.startsWith('en'));
    return english.find(v => v.localService) ?? english[0] ?? voices[0] ?? null;
  }, []);

  useEffect(() => {
    const loadVoice = () => {
      if (voiceLockedRef.current) return;
      voiceRef.current = getBestVoice();
    };
    loadVoice();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoice);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoice);
  }, []);

  const speak = useCallback((text: string) => {
    synthRef.current.cancel();
    synthRef.current.resume();

    if (!voiceRef.current) voiceRef.current = getBestVoice();
    if (!voiceRef.current) {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current = voices[0] ?? null;
    }
    if (voiceRef.current) voiceLockedRef.current = true;

    const createUtterance = (voice?: SpeechSynthesisVoice | null) => {
      const utter = new SpeechSynthesisUtterance(text);
      if (voice) utter.voice = voice;
      utter.rate = 0.95;
      utter.pitch = 1.0;
      utter.volume = 1;
      return utter;
    };

    const primary = createUtterance(voiceRef.current);
    primary.onend = () => setIsSpeaking(false);
    primary.onerror = () => {
      const fallbackVoice = getFallbackVoice();
      if (!fallbackVoice || fallbackVoice.name === primary.voice?.name) {
        setIsSpeaking(false);
        return;
      }

      voiceRef.current = fallbackVoice;
      const fallback = createUtterance(fallbackVoice);
      fallback.onend = () => setIsSpeaking(false);
      fallback.onerror = () => setIsSpeaking(false);
      synthRef.current.speak(fallback);
    };

    setIsSpeaking(true);
    // Small defer improves reliability in Safari/webviews after cancel().
    setTimeout(() => {
      synthRef.current.speak(primary);
    }, 0);
  }, [getFallbackVoice]);

  const stop = useCallback(() => {
    synthRef.current.cancel();
    synthRef.current.resume();
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, speak, stop };
}
