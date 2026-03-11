import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Picks the best English voice, strongly preferring local (on-device) voices
 * over network voices. Network voices (Google, Microsoft Online) are unreliable
 * in webview/iframe environments like Lovable and can fail silently.
 */
function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const english = voices.filter(v => v.lang.startsWith('en'));
  if (!english.length) return voices[0];

  const scored = english.map(v => {
    const n = v.name.toLowerCase();
    let score = 0;

    // ── Hard blocklist: robotic / novelty voices ──────────────────
    const isNovelty = [
      'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos',
      'good news', 'jester', 'junior', 'kathy', 'organ', 'ralph', 'superstar',
      'trinoids', 'whisper', 'wobble', 'zarvox', 'fred',
      'espeak', 'mbrola', 'compact', 'festival',
    ].some(bad => n.includes(bad));
    if (isNovelty) return { voice: v, score: -100 };

    // ── Non-local (network) voices: penalise heavily ──────────────
    // They fail silently in webview/iframe contexts (Lovable, Electron, etc.)
    if (!v.localService) {
      if (n.includes('google uk english female')) {
        score += 500; // Exception: User specifically likes this one and it's elegant
      } else {
        score -= 200;
      }
    }

    // ── British Premium voices (Elegant, Clean) ──────────────────
    if (v.lang === 'en-GB' || v.lang === 'en-UK') {
      score += 150; // Massively boost UK English

      // Give female British voices top priority
      if (/female|woman|girl/i.test(n)) score += 100;
    }

    // Specific elegant female voices (British/Scottish/Irish)
    if (/serena|stephanie|martha|fiona|moira/.test(n)) score += 200;

    // Penalize known male british voices since the user wants a female voice
    if (/daniel|oliver|arthur|george|rocko|grandpa/.test(n)) score -= 100;

    // ── Generic premium ──────────────────────────────────────────
    if (n.includes('premium') || n.includes('enhanced')) score += 80;

    // ── Local voices & fallback ──────────────────────────────────
    if (n.includes('samantha')) score += 40;
    if (/karen|tessa|alex/.test(n)) score += 30;
    if (/eddy|flo|reed|sandy|shelley|grandma|rishi/.test(n)) score += 20;

    if (v.localService && score === 0) score += 30;

    return { voice: v, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.voice ?? english.find((v) => v.lang === 'en-GB' && v.name.toLowerCase().includes('female')) ?? english.find((v) => v.lang === 'en-GB') ?? english[0];
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

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

    synthRef.current.cancel();

    const utter = new SpeechSynthesisUtterance(text);

    // Always resolve voice at call time in case voices loaded after mount
    const voice = voiceRef.current ?? getBestVoice();
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
      voiceRef.current = voice;
    } else {
      utter.lang = 'en-US';
    }

    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = (e) => {
      if (e.error !== 'interrupted') setIsSpeaking(false);
    };

    // ⚠️ Must be called synchronously within the user-gesture call stack.
    // Any setTimeout defer breaks Safari's activation policy.
    synthRef.current.speak(utter);
    setIsSpeaking(true);
  }, []);

  const stop = useCallback(() => {
    synthRef.current.cancel();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => { synthRef.current.cancel(); };
  }, []);

  return { isSpeaking, speak, stop };
}
