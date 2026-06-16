import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceRecorderProps {
  onTranscript: (transcript: string) => void;
  isProcessing: boolean;
}

export default function VoiceRecorder({ onTranscript, isProcessing }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const onTranscriptRef = useRef(onTranscript);
  const isRecordingRef = useRef(false);
  const accumulatedRef = useRef('');
  const interimRef = useRef('');
  const recognitionRef = useRef<any>(null);
  const isStartingRef = useRef(false);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // Initialize recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setErrorMessage("Voice support missing in this browser.");
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'en-US'; 

    recognitionInstance.onstart = () => {
      isRecordingRef.current = true;
      setIsRecording(true);
      isStartingRef.current = false;
      setErrorMessage(null);
      console.log("Mic turned on.");
    };

    recognitionInstance.onresult = (event: any) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        accumulatedRef.current += final;
      }
      interimRef.current = interim;
    };

    recognitionInstance.onerror = (event: any) => {
      console.error("Mic error:", event.error);
      if (event.error === 'aborted') return;
      
      isStartingRef.current = false;
      isRecordingRef.current = false;
      setIsRecording(false);
      
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setErrorMessage("Mic blocked! Please allow microphone access.");
      } else if (event.error === 'no-speech') {
        if (!accumulatedRef.current) {
          setErrorMessage("No speech detected.");
        }
      } else {
        setErrorMessage("Mic Error: " + event.error);
      }
    };

    recognitionInstance.onend = () => {
      console.log("Recognition ended.");
      const wasActuallyRecording = isRecordingRef.current;
      
      setIsRecording(false);
      isRecordingRef.current = false;
      isStartingRef.current = false;

      const finalFull = (accumulatedRef.current + ' ' + interimRef.current).trim();
      if (finalFull && wasActuallyRecording) {
        onTranscriptRef.current(finalFull);
      }
      
      accumulatedRef.current = '';
      interimRef.current = '';
    };

    recognitionRef.current = recognitionInstance;
    
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
    };
  }, []);

  const toggleRecording = () => {
    if (isProcessing) return;
    
    const recognition = recognitionRef.current;
    if (!recognition) {
      setErrorMessage("Please refresh the page.");
      return;
    }

    if (isRecordingRef.current) {
      try {
        recognition.stop();
      } catch (e) {
        setIsRecording(false);
        isRecordingRef.current = false;
      }
    } else {
      if (isStartingRef.current) return;
      
      try {
        accumulatedRef.current = '';
        interimRef.current = '';
        setErrorMessage(null);
        isStartingRef.current = true;
        recognition.start();
      } catch (err: any) {
        isStartingRef.current = false;
        setIsRecording(false);
        isRecordingRef.current = false;
        setErrorMessage("Failed to start mic.");
      }
    }
  };

  // Internal safety timeout for mic
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setTimeout(() => {
        toggleRecording();
      }, 45000); 
    }
    return () => clearTimeout(timer);
  }, [isRecording]);

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="relative group">
        {/* Hardware-like bezel */}
        <div className={`absolute -inset-4 rounded-full blur-xl transition-opacity duration-1000 ${
          isRecording ? 'bg-rose-500/30 opacity-100' : 'bg-blue-500/10 opacity-0'
        }`} />
        
        <div className={`relative w-32 h-32 rounded-full p-2 bg-[#1A1C1E] shadow-2xl border transition-colors duration-500 ${
            isRecording ? 'border-rose-500/50' : 'border-[#2D3035]'
        }`}>
          <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none" />
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleRecording}
            disabled={isProcessing}
            className={`w-full h-full rounded-full flex flex-col items-center justify-center transition-all duration-500 relative overflow-hidden ${
              isRecording 
                ? 'bg-rose-600 shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)] shadow-rose-500/40' 
                : 'bg-gradient-to-b from-[#2D3035] to-[#1A1C1E] shadow-[0_8px_24px_rgba(0,0,0,0.5)]'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-10 h-10 text-white/80 animate-spin" />
            ) : isRecording ? (
              <div className="flex flex-col items-center animate-pulse">
                <Square className="w-10 h-10 text-white fill-white" />
                <span className="text-[10px] font-black text-white mt-1 uppercase tracking-widest">STOP (Done)</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Mic className="w-10 h-10 text-white" />
                <span className="text-[10px] font-bold text-white/40 mt-1 uppercase tracking-tighter">Record Business</span>
              </div>
            )}
            
            {/* Gloss effect */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          </motion.button>
        </div>
      </div>

      <div className="text-center space-y-1">
        <p className={`text-sm font-bold tracking-tight ${errorMessage ? 'text-rose-400' : 'text-white'}`}>
          {errorMessage || (isRecording ? 'Listening Now...' : isProcessing ? 'COB is Processing...' : 'Tap to Start Speaking')}
        </p>
        <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
            {isRecording ? 'Bolte rahein (e.g. 500 ki sale)' : 'Urdu/English Business Ledger'}
            </p>
            {isRecording && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        // Force clean reload if stuck
                        window.location.reload();
                    }}
                    className="mt-4 text-[10px] bg-rose-500 text-white px-6 py-2 rounded-xl uppercase font-black shadow-xl shadow-rose-500/20 active:scale-95"
                >
                    EMERGENCY: Force Stop & Save
                </button>
            )}
        </div>
      </div>
      
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-1.5 h-6 items-center"
          >
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  height: [8, 24, 8],
                  backgroundColor: ['#ef4444', '#dc2626', '#ef4444']
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 0.6, 
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
                className="w-1.5 rounded-full"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
