import React, { useState, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceRecorderProps {
  onTranscript: (transcript: string) => void;
  isProcessing: boolean;
}

export default function VoiceRecorder({ onTranscript, isProcessing }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const onTranscriptRef = React.useRef(onTranscript);
  const isRecordingRef = React.useRef(false);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const accumulatedRef = React.useRef('');
  const interimRef = React.useRef('');
  const recognitionRef = React.useRef<any>(null);
  const isStartingRef = React.useRef(false);

  // Re-initialize recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage("Voice support missing.");
      return;
    }
    
    // Stop and clear old instance if exists
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    // Fallback language chain: Hindi/India is best for Roman Urdu comprehension
    recognitionInstance.lang = 'hi-IN'; 

    recognitionInstance.onstart = () => {
      isRecordingRef.current = true;
      setIsRecording(true);
      isStartingRef.current = false;
      setErrorMessage(null);
      console.log("Mic turned on. Aap bol sakte hain.");
    };

    recognitionInstance.onresult = (event: any) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        }
      }
      if (final) {
        accumulatedRef.current += final;
      }
    };

    recognitionInstance.onerror = (event: any) => {
      console.error("Mic error:", event.error);
      if (event.error === 'aborted') return;
      
      isStartingRef.current = false;
      isRecordingRef.current = false;
      setIsRecording(false);
      
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setErrorMessage("Mic blocked! Please allow microphone access in settings.");
      } else if (event.error === 'no-speech') {
        setErrorMessage("Aap bole nahi. Dobara koshish karein.");
      } else {
        setErrorMessage("Masla: " + event.error + ". Refresh karein.");
      }
    };

    recognitionInstance.onend = () => {
      console.log("Recognition ended.");
      const wasActuallyRecording = isRecordingRef.current;
      
      setIsRecording(false);
      isRecordingRef.current = false;
      isStartingRef.current = false;

      if (wasActuallyRecording) {
        const finalFull = (accumulatedRef.current + ' ' + interimRef.current).trim();
        if (finalFull) {
          onTranscriptRef.current(finalFull);
        }
        accumulatedRef.current = '';
        interimRef.current = '';
      }
    };

    recognitionRef.current = recognitionInstance;
    setRecognition(recognitionInstance);
  }, []);

  const toggleRecording = () => {
    if (isProcessing) return;
    
    if (isRecordingRef.current) {
      console.log("Stopping recording manually...");
      isRecordingRef.current = false;
      setIsRecording(false);
      isStartingRef.current = false;
      try {
        recognition?.stop();
        // Use timeout to ensure state has updated from final result
        setTimeout(() => {
          const finalFull = (accumulatedRef.current + ' ' + interimRef.current).trim();
          if (finalFull) {
            onTranscriptRef.current(finalFull);
          }
          accumulatedRef.current = '';
          interimRef.current = '';
        }, 300);
      } catch (e) {
        console.error("Stop failed:", e);
      }
    } else {
      if (!recognition) {
        setErrorMessage("Restart the app please.");
        return;
      }
      if (isStartingRef.current || isProcessing) return;
      
      try {
        accumulatedRef.current = '';
        interimRef.current = '';
        setErrorMessage(null);
        isStartingRef.current = true;
        isRecordingRef.current = true;
        recognition.start();
      } catch (err) {
        isStartingRef.current = false;
        isRecordingRef.current = false;
        setIsRecording(false);
        setErrorMessage("Mic start nahi ho raha. Refresh karein.");
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="relative group">
        {/* Hardware-like bezel */}
        <div className={`absolute -inset-4 rounded-full blur-xl transition-opacity duration-1000 ${
          isRecording ? 'bg-red-500/30 opacity-100' : 'bg-blue-500/10 opacity-0'
        }`} />
        
        <div className="relative w-32 h-32 rounded-full p-2 bg-[#1A1C1E] shadow-2xl border border-[#2D3035]">
          <div className="absolute inset-0 rounded-full border border-white/5 pointer-events-none" />
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleRecording}
            disabled={isProcessing}
            className={`w-full h-full rounded-full flex flex-col items-center justify-center transition-all duration-500 relative overflow-hidden ${
              isRecording 
                ? 'bg-red-600 shadow-[inset_0_4px_12px_rgba(0,0,0,0.4)]' 
                : 'bg-gradient-to-b from-[#2D3035] to-[#1A1C1E] shadow-[0_8px_24px_rgba(0,0,0,0.5)]'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-10 h-10 text-white/80 animate-spin" />
            ) : isRecording ? (
              <div className="flex flex-col items-center">
                <Square className="w-10 h-10 text-white fill-white" />
                <span className="text-[10px] font-bold text-white/60 mt-1 uppercase tracking-tighter">Stop</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Mic className="w-10 h-10 text-white" />
                <span className="text-[10px] font-bold text-white/40 mt-1 uppercase tracking-tighter">Record</span>
              </div>
            )}
            
            {/* Gloss effect */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          </motion.button>
        </div>
      </div>

      <div className="text-center space-y-1">
        <p className={`text-sm font-bold tracking-tight ${errorMessage ? 'text-rose-400' : 'text-white'}`}>
          {errorMessage || (isRecording ? 'Listening...' : isProcessing ? 'Processing Business Input...' : 'Tap for Voice Input')}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
          {isRecording ? 'Speak clearly (Sale, Expense, Debt)' : 'Multilingual Business AI'}
        </p>
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
