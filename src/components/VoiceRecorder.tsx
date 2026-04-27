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

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && !recognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'ur-PK';

      recognitionInstance.onstart = () => {
        setIsRecording(true);
      };

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onTranscriptRef.current(transcript);
        }
      };

      recognitionInstance.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          setErrorMessage("Mic permission deni pare gi.");
        } else if (event.error === 'network') {
          setErrorMessage("Internet ka masla lag raha hai.");
        } else {
          setErrorMessage("Mic mein masla hai. Refresh karein.");
        }
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
    }
  }, [recognition]); // Run once or if recognition is lost

  // Manual fallback for stuck states
  useEffect(() => {
    const checkState = setInterval(() => {
      if (isRecording && recognition && !('state' in recognition || true)) {
         // Some browsers might need active polling if events fail
      }
    }, 1000);
    return () => clearInterval(checkState);
  }, [isRecording, recognition]);

  // Cleanup/timeout if recording hangs
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setTimeout(() => {
        if (recognition) {
          recognition.stop();
          setIsRecording(false);
        }
      }, 15000); // 15 seconds max listen
    }
    return () => clearTimeout(timer);
  }, [isRecording, recognition]);

  const toggleRecording = () => {
    if (isRecording) {
      try {
        recognition?.stop();
        setIsRecording(false);
      } catch (e) {
        console.error("Stop failed:", e);
        setIsRecording(false);
      }
    } else {
      if (!recognition) {
        console.error("Recognition not initialized");
        return;
      }
      try {
        setErrorMessage(null);
        recognition.start();
      } catch (err) {
        console.error("Recognition start failed:", err);
        setIsRecording(false);
        try { recognition.stop(); } catch(e) {}
        setErrorMessage("Mic start nahi ho raha.");
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
          {errorMessage || (isRecording ? 'LISTENING TO URDU/ENGLISH...' : isProcessing ? 'CONVERTING TO RECORDS...' : 'TAP TO RECORD VOICE')}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
          {isRecording ? 'Speak your sales or debts clearly' : 'Voice-First Business Logic'}
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
