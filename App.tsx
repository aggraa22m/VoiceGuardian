import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { GuardianMode, Message, SessionState } from './types';
import { decode, encode, decodeAudioData, createPcmBlob } from './utils/audio';

// --- Types ---
type VoiceProvider = 'gemini' | 'elevenlabs';

// --- Visual Components ---

const RadialSpikes = ({ volume, active }: { volume: number; active: boolean }) => {
  const spikeCount = 32;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
      {Array.from({ length: spikeCount }).map((_, i) => {
        const rotation = (i * 360) / spikeCount;
        // Spikes extend further when talking
        const length = active ? 50 + volume * 220 : 15 + Math.sin(Date.now() / 1000 + i) * 5;
        const opacity = active ? 0.3 + volume * 0.7 : 0.1;
        const color = active ? 'rgba(255, 255, 255, ' + opacity + ')' : 'rgba(129, 140, 248, 0.2)';
        
        return (
          <div
            key={i}
            className="absolute origin-bottom transition-all duration-100 ease-out"
            style={{
              height: `${length}px`,
              width: active ? '2px' : '1px',
              bottom: '50%',
              transform: `rotate(${rotation}deg) translateY(-70px)`,
              background: `linear-gradient(to top, transparent, ${color}, white)`,
              boxShadow: active ? `0 0 15px ${color}` : 'none',
              borderRadius: '4px'
            }}
          />
        );
      })}
    </div>
  );
};

// Fix: Removed unused provider from prop type to resolve TS error
const GuardianAura = ({ state, inVol, outVol }: { state: SessionState; inVol: number; outVol: number }) => {
  const activeVol = state.isTalking ? outVol : inVol;
  const scale = 1 + activeVol * 2.0;
  
  const particles = Array.from({ length: 12 }).map((_, i) => (
    <div 
      key={i}
      className="absolute w-1.5 h-1.5 rounded-full bg-indigo-200/30 blur-[1px]"
      style={{
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        animation: `float-particle ${4 + Math.random() * 6}s infinite ease-in-out`,
        animationDelay: `${Math.random() * 4}s`
      }}
    />
  ));

  return (
    <div className="relative flex items-center justify-center w-full aspect-square max-w-[320px] mx-auto transition-all duration-700">
      {/* Background Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {particles}
      </div>

      {/* Radial Spikes - Reactive to Voice */}
      <RadialSpikes volume={outVol} active={state.isTalking} />

      {/* Main Ethereal Aura Layers */}
      <div 
        className={`absolute inset-0 rounded-full animate-soul transition-all duration-500 celestial-glow ${state.isTalking ? 'opacity-60' : 'opacity-30'}`}
        style={{ transform: `scale(${scale * 1.3})` }}
      />
      
      {/* Orbital Ring System */}
      <div 
        className="absolute inset-0 rounded-full border border-indigo-400/20 animate-orbit"
        style={{ transform: `scale(${scale * 1.1}) rotateX(65deg) rotateY(20deg)` }}
      />
      
      <div 
        className="absolute inset-0 rounded-full border border-purple-400/10 animate-orbit-reverse"
        style={{ transform: `scale(${scale * 1.15}) rotateX(-40deg) rotateY(-25deg)` }}
      />

      {/* The Core celestial Orb */}
      <div 
        className={`relative w-40 h-40 rounded-full transition-all duration-150 shadow-[0_0_80px_rgba(99,102,241,0.4)] border border-white/20 flex items-center justify-center overflow-hidden bg-gradient-to-tr from-slate-900 via-indigo-600 to-indigo-400 z-10`}
        style={{ transform: `scale(${scale})` }}
      >
        {/* Internal Glow Swirls */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.7),transparent_60%)] animate-flare" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(165,180,252,0.4),transparent_60%)]" />
        
        {/* Energy Pulse Center */}
        {state.isTalking && (
          <div className="absolute inset-4 rounded-full bg-white/10 blur-2xl animate-pulse" />
        )}

        {/* Mesh Grid Pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

        {/* Bright Highlight Flare */}
        <div className="absolute top-4 right-8 w-16 h-8 bg-white/40 blur-2xl rounded-full transform -rotate-45" />
      </div>

      {/* Outer Pulse Shell - User Input Feedback */}
      {state.isListening && inVol > 0.05 && (
        <div 
          className="absolute inset-0 rounded-full border-2 border-indigo-300/20 pointer-events-none animate-ping"
          style={{ transform: `scale(${1 + inVol * 4})` }}
        />
      )}
    </div>
  );
};

const TranscriptView = ({ messages }: { messages: Message[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-5 no-scrollbar">
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-indigo-300/30 text-center tracking-widest font-light">
          <p className="text-[10px] uppercase">Awaiting your presence</p>
        </div>
      )}
      {messages.map((msg, idx) => (
        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-700`}>
          <div className={`max-w-[85%] rounded-3xl px-6 py-3.5 glass-surface border-white/5 ${
            msg.role === 'user' ? 'bg-indigo-500/10' : 'bg-white/[0.02]'
          }`}>
            <p className="text-sm leading-relaxed font-light text-indigo-100/90">{msg.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [mode, setMode] = useState<GuardianMode>(GuardianMode.EMPATHETIC);
  const [messages, setMessages] = useState<Message[]>([]);
  const [session, setSession] = useState<SessionState>({
    isActive: false,
    isConnecting: false,
    isTalking: false,
    isListening: false,
  });
  
  const [inVol, setInVol] = useState(0);
  const [outVol, setOutVol] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const activeSessionRef = useRef<any>(null);
  const outAnalyserRef = useRef<AnalyserNode | null>(null);

  const systemInstruction = `
    You are VoiceGuardian — a celestial, empathetic AI companion.
    Current Mode: ${mode}.
    
    CORE RULES:
    1. BE CONCISE: Limit every response to ONE or TWO brief, impactful sentences.
    2. DO NOT REPEAT: Never restate what you just said or what the user just said. 
    3. BE PATIENT: Wait for the user to finish their thought completely. Do not rush to answer.
    4. NO REPETITION: If the user repeats themselves, acknowledge it briefly ("I hear you saying that again...") and offer a fresh perspective or move forward.
    5. NATURAL TONE: Speak like a wise friend, not a robot. 
    6. NO MARKDOWN: Output plain text only.
  `;

  const resetAll = () => {
    stopSession();
    setMessages([]);
  };

  const stopSession = () => {
    if (activeSessionRef.current) {
      activeSessionRef.current.close();
      activeSessionRef.current = null;
    }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setSession({ isActive: false, isConnecting: false, isTalking: false, isListening: false });
    setInVol(0);
    setOutVol(0);
  };

  const startSession = async () => {
    if (session.isActive || session.isConnecting) return;
    setSession(prev => ({ ...prev, isConnecting: true }));
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      const outAnalyser = outputCtx.createAnalyser();
      outAnalyser.fftSize = 64;
      outAnalyserRef.current = outAnalyser;
      outAnalyser.connect(outputCtx.destination);

      await inputCtx.resume();
      await outputCtx.resume();
      
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setSession({ isActive: true, isConnecting: false, isTalking: false, isListening: true });
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              setInVol(Math.sqrt(sum / inputData.length));
              // CRITICAL: Solely rely on sessionPromise resolves and then call session.sendRealtimeInput
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: createPcmBlob(inputData) });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
            
            const pollOutput = () => {
              if (!outAnalyserRef.current) return;
              const dataArray = new Uint8Array(outAnalyserRef.current.frequencyBinCount);
              outAnalyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
              setOutVol(sum / (dataArray.length * 255));
              // Use sessionPromise to ensure loop only continues while session is alive
              sessionPromise.then(() => {
                requestAnimationFrame(pollOutput);
              }).catch(() => {});
            };
            pollOutput();
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              if (text) setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'user') return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                return [...prev, { role: 'user', text, timestamp: new Date() }];
              });
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              if (text) setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'guardian') return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                return [...prev, { role: 'guardian', text, timestamp: new Date() }];
              });
            }
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setSession(prev => ({ ...prev, isTalking: true, isListening: false }));
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outAnalyserRef.current!);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setSession(prev => ({ ...prev, isTalking: false, isListening: true }));
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setSession(prev => ({ ...prev, isTalking: false, isListening: true }));
            }
          },
          onclose: () => stopSession(),
          onerror: () => stopSession(),
        },
      });
      activeSessionRef.current = await sessionPromise;
    } catch (err) {
      setSession({ isActive: false, isConnecting: false, isTalking: false, isListening: false });
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#020617] font-sans relative overflow-hidden text-indigo-100">
      {/* Background Celestial Pattern */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none" />

      {/* Header */}
      <header className="px-8 pt-8 pb-4 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center shadow-inner">
             <i className="fa-solid fa-star-of-life text-indigo-300 text-sm animate-spin" style={{ animationDuration: '8s' }} />
           </div>
           <div>
             <h1 className="text-sm font-bold tracking-wider text-white glow-text uppercase">Guardian Presence</h1>
             <p className="text-[8px] text-indigo-400 uppercase tracking-widest font-black">Celestial Intelligence v2</p>
           </div>
        </div>
        
        <button 
          onClick={resetAll}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5 text-indigo-400 transition-colors"
          title="Reset"
        >
          <i className="fa-solid fa-wind text-xs" />
        </button>
      </header>

      {/* Main Experience */}
      <main className="flex-1 flex flex-col items-center justify-between px-6 py-4 z-10">
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <GuardianAura state={session} inVol={inVol} outVol={outVol} />
          
          <div className="w-full max-w-xs mt-8">
             <div className="grid grid-cols-2 gap-3">
                {Object.values(GuardianMode).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    disabled={session.isActive}
                    className={`px-3 py-3 rounded-2xl text-[9px] font-bold border tracking-widest transition-all duration-500 ${
                      mode === m 
                        ? 'border-indigo-400 bg-indigo-500/10 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                        : 'border-white/5 bg-white/[0.02] text-indigo-300/40 hover:text-indigo-200'
                    } ${session.isActive ? 'opacity-20 cursor-not-allowed' : ''}`}
                  >
                    {m.split(' ')[0].toUpperCase()}
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Transcript Area */}
        <div className="w-full h-40 mt-6 bg-slate-900/40 rounded-[40px] border border-white/5 flex flex-col overflow-hidden backdrop-blur-xl shadow-2xl">
           <TranscriptView messages={messages} />
        </div>
      </main>

      {/* Control Area */}
      <footer className="p-10 flex flex-col items-center z-20">
        {!session.isActive ? (
          <button
            onClick={startSession}
            disabled={session.isConnecting}
            className="group relative flex flex-col items-center"
          >
            <div className="absolute -inset-12 bg-indigo-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-[#0a0f1e] border border-indigo-400/20 hover:border-indigo-400/50 w-24 h-24 rounded-full flex items-center justify-center text-indigo-300 shadow-2xl transition-all transform active:scale-95 duration-500">
              {session.isConnecting ? (
                <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-300 rounded-full animate-spin" />
              ) : (
                <i className="fa-solid fa-microphone text-3xl" />
              )}
            </div>
            <span className="mt-5 text-indigo-400/50 text-[8px] font-black uppercase tracking-[0.6em] group-hover:text-indigo-300 transition-colors">
              {session.isConnecting ? 'Aligning Spirit...' : 'Begin Communion'}
            </span>
          </button>
        ) : (
          <button
            onClick={stopSession}
            className="group relative flex flex-col items-center"
          >
             <div className="absolute -inset-10 bg-indigo-500/5 blur-3xl opacity-50" />
             <div className="relative bg-slate-950/60 border border-white/10 hover:border-indigo-400/30 w-16 h-16 rounded-full flex items-center justify-center text-indigo-500/40 hover:text-indigo-300 transition-all transform active:scale-95">
              <i className="fa-solid fa-stop text-sm" />
            </div>
            <span className="mt-4 text-indigo-900 text-[8px] font-black uppercase tracking-[0.6em]">Rest Presence</span>
          </button>
        )}
      </footer>

      {/* Footer Branding */}
      <div className="pb-8 text-center opacity-30">
        <span className="text-[7px] text-indigo-400 font-bold uppercase tracking-[0.5em]">Celestial Encryption Active</span>
      </div>
    </div>
  );
}