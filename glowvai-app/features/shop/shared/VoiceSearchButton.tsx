import React, { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';

// Browser speech recognition, when the browser has it. Chrome and Edge expose it as webkitSpeechRecognition.
function getRecognitionCtor(): (new () => any) | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// Short, plain messages for the errors a user can act on. 'aborted' is our own stop and is not shown.
function errorMessage(code: string | undefined): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access is blocked. Allow it in your browser settings.';
    case 'network':
      return 'Voice search needs a connection. Try again.';
    case 'no-speech':
    case 'audio-capture':
      return "Didn't catch that. Tap the mic to try again.";
    default:
      return 'Voice search stopped. Try again.';
  }
}

// Mic button for the home search. Hidden when the browser has no speech recognition. A recognised phrase goes to onResult,
// which runs the same search the search field runs.
export function VoiceSearchButton({ onResult }: { onResult: (text: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const recognitionRef = useRef<any>(null);

  // Checked after mount so the server render and the first client render match.
  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    return () => {
      recognitionRef.current?.abort?.();
      recognitionRef.current = null;
    };
  }, []);

  const stop = () => {
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    setListening(false);
  };

  const toggle = () => {
    if (listening) {
      stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    setMessage('');
    let recognition: any;
    try {
      recognition = new Ctor();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event: any) => {
        const text = String(event?.results?.[0]?.[0]?.transcript ?? '').trim();
        recognitionRef.current = null;
        setListening(false);
        if (text) onResult(text.slice(0, 100));
        else setMessage("Didn't catch that. Tap the mic to try again.");
      };
      recognition.onerror = (event: any) => {
        recognitionRef.current = null;
        setListening(false);
        if (event?.error !== 'aborted') setMessage(errorMessage(event?.error));
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setListening(false);
      };
      recognitionRef.current = recognition;
      setListening(true);
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setMessage(errorMessage(undefined));
    }
  };

  if (!supported) return null;

  return (
    <span className="shop-home-voice-wrap">
      <button
        type="button"
        className={`shop-home-voice${listening ? ' is-listening' : ''}`}
        onClick={toggle}
        aria-pressed={listening}
        aria-label={listening ? 'Voice search, listening' : 'Voice search'}
      >
        <Mic size={16} aria-hidden="true" />
        {listening && <span className="shop-home-voice-label">Listening...</span>}
      </button>
      {message && (
        <p className="shop-home-voice-msg" role="status">
          {message}
        </p>
      )}
    </span>
  );
}
