import { useState, useCallback, useRef, useEffect } from 'react';

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  console.log('[TTS] getVoices() returned:', voices.length, 'voices');
  if (!voices.length) return null;

  const english = voices.filter(v => v.lang.startsWith('en'));
  console.log('[TTS] English voices:', english.map(v => `${v.name} (local:${v.localService})`));
  if (!english.length) return voices[0];

  const scored = english.map(v => {
    const n = v.name.toLowerCase();
    let score = 0;
    if (n.includes('espeak') || n.includes('mbrola') || n.includes('compact') || n.includes('festival')) return { voice: v, score: -100 };
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
  console.log('[TTS] Selected voice:', scored[0]?.voice?.name, 'score:', scored[0]?.score);
  return scored[0]?.voice ?? english[0];
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef(window.speechSynthesis);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    console.log('[TTS] hook mounted, speechSynthesis available:', 'speechSynthesis' in window);
    console.log('[TTS] initial speaking state:', window.speechSynthesis.speaking);
    const load = () => {
      voiceRef.current = getBestVoice();
      console.log('[TTS] voiceschanged fired, voice set to:', voiceRef.current?.name ?? 'none');
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const speak = useCallback((text: string) => {
    console.log('[TTS] speak() called with text:', text.slice(0, 60));
    console.log('[TTS] speechSynthesis in window:', 'speechSynthesis' in window);
    console.log('[TTS] voice at call time:', voiceRef.current?.name ?? 'none (will use browser default)');
    console.log('[TTS] synth.speaking:', synthRef.current.speaking, 'synth.pending:', synthRef.current.pending);

    if (!('speechSynthesis' in window) || !text.trim()) {
      console.warn('[TTS] aborting: no speechSynthesis or empty text');
      return;
    }

    synthRef.current.cancel();
    console.log('[TTS] cancel() called');

    const utter = new SpeechSynthesisUtterance(text);
    const voice = voiceRef.current ?? getBestVoice();

    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
      voiceRef.current = voice;
      console.log('[TTS] utterance voice set to:', voice.name);
    } else {
      utter.lang = 'en-US';
      console.warn('[TTS] no voice available, using browser default');
    }

    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    utter.onstart = () => {
      console.log('[TTS] ✅ onstart fired — speech is playing');
      setIsSpeaking(true);
    };
    utter.onend = () => {
      console.log('[TTS] onend fired — speech finished');
      setIsSpeaking(false);
    };
    utter.onerror = (e) => {
      console.error('[TTS] ❌ onerror fired:', e.error, e);
      if (e.error !== 'interrupted') setIsSpeaking(false);
    };

    console.log('[TTS] calling synthRef.current.speak(utter) NOW');
    synthRef.current.speak(utter);
    console.log('[TTS] speak() returned. synth.speaking:', synthRef.current.speaking, 'synth.pending:', synthRef.current.pending);

    setIsSpeaking(true);
  }, []);

  const stop = useCallback(() => {
    console.log('[TTS] stop() called');
    synthRef.current.cancel();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => { synthRef.current.cancel(); };
  }, []);

  return { isSpeaking, speak, stop };
}
