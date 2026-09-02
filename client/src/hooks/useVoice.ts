import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Voice in and out via the Web Speech API.
 *
 * Both halves are progressive enhancement: recognition is Chromium-only behind
 * a vendor prefix, and synthesis voices load asynchronously. When either is
 * missing the hook reports it as unsupported and the HUD falls back to typing.
 */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useVoice({ lang = 'en-US' }: { lang?: string } = {}) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceOut, setVoiceOut] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef('');

  const recognitionSupported = Boolean(getRecognitionCtor());
  const synthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  /**
   * Starts a dictation session. `onFinal` fires once when the user stops
   * talking, with the complete utterance.
   */
  const startListening = useCallback(
    (onFinal: (text: string) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return;

      recognitionRef.current?.abort();
      finalRef.current = '';
      setTranscript('');

      const recognition = new Ctor();
      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) finalRef.current += result[0].transcript;
          else interim += result[0].transcript;
        }
        setTranscript(finalRef.current + interim);
      };

      recognition.onerror = () => setListening(false);
      recognition.onend = () => {
        setListening(false);
        const text = finalRef.current.trim();
        if (text) onFinal(text);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    },
    [lang],
  );

  /** Speaks text, preferring a UK English voice for the obvious reason. */
  const speak = useCallback(
    (text: string) => {
      if (!synthesisSupported || !voiceOut || !text.trim()) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text.replace(/[*_`#]/g, ''));
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find(v => /en-GB/i.test(v.lang) && /male|daniel|arthur/i.test(v.name)) ??
        voices.find(v => /en-GB/i.test(v.lang)) ??
        voices.find(v => v.lang.startsWith(lang.slice(0, 2)));
      if (preferred) utterance.voice = preferred;
      utterance.rate = 1.05;
      utterance.pitch = 0.9;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [lang, synthesisSupported, voiceOut],
  );

  const shush = useCallback(() => {
    if (synthesisSupported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [synthesisSupported]);

  // Don't leave a recogniser running or a sentence half-spoken on unmount.
  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    [],
  );

  return {
    listening,
    speaking,
    transcript,
    voiceOut,
    setVoiceOut,
    startListening,
    stopListening,
    speak,
    shush,
    recognitionSupported,
    synthesisSupported,
  };
}
