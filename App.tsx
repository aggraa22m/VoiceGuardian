
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { GuardianMode, Message, SessionState } from './types';
import { decode, encode, decodeAudioData, createPcmBlob } from './utils/audio';

// --- Visual Components ---

const RadialSpikes = ({ volume, active }: { volume: number; active: boolean }) => {
  const spikeCount = 32;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
      {Array.from({ length: spikeCount }).map((_, i) => {
        const rotation = (i * 360) / spikeCount;
        const length = active ? 50 + volume * 220 : 15 + Math.sin(Date.now() / 1000 + i) * 5;
        const opacity = active ? 0.3 + volume * 0.7 : 0.1;
        const color = active ? 'rgba(255, 255, 255, ' + opacity + ')' : 'rgba(255, 255, 255, 0.1)';
        
        return (
          <div
            key={i}
            className="absolute origin-bottom transition-all duration-100 ease-out"
            style={{
              height: `${length}px`,
              width: active ? '3px' : '1px',
              bottom: '50%',
              transform: `rotate(${rotation}deg) translateY(-70px)`,
              background: `linear-gradient(to top, transparent, ${color}, white)`,
              boxShadow: active ? `0 0 15px white` : 'none',
              borderRadius: '4px'
            }}
          />
        );
      })}
    </div>
  );
};

const GuardianAura = ({ state, inVol, outVol, minimal = false }: { state: SessionState; inVol: number; outVol: number; minimal?: boolean }) => {
  const activeVol = state.isTalking ? outVol : inVol;
  const scale = 1 + activeVol * 2.0;
  
  const particles = !minimal && Array.from({ length: 12 }).map((_, i) => (
    <div 
      key={i}
      className="absolute w-1.5 h-1.5 rounded-full bg-white/20 blur-[1px]"
      style={{
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        animation: `float-particle ${4 + Math.random() * 6}s infinite ease-in-out`,
        animationDelay: `${Math.random() * 4}s`
      }}
    />
  ));

  return (
    <div className={`relative flex items-center justify-center w-full aspect-square ${minimal ? 'max-w-[180px]' : 'max-w-[280px] sm:max-w-[320px]'} mx-auto transition-all duration-700`}>
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {particles}
      </div>

      {!minimal && <RadialSpikes volume={outVol} active={state.isTalking} />}

      <div 
        className={`absolute inset-0 rounded-full animate-soul transition-all duration-500 celestial-glow ${state.isTalking ? 'opacity-60' : 'opacity-30'}`}
        style={{ transform: `scale(${scale * 1.3})` }}
      />
      
      <div 
        className="absolute inset-0 rounded-full border border-white/10 animate-orbit"
        style={{ transform: `scale(${scale * 1.1}) rotateX(65deg) rotateY(20deg)` }}
      />
      
      <div 
        className="absolute inset-0 rounded-full border border-white/5 animate-orbit-reverse"
        style={{ transform: `scale(${scale * 1.15}) rotateX(-40deg) rotateY(-25deg)` }}
      />

      <div 
        className={`relative ${minimal ? 'w-20 h-20' : 'w-32 h-32 sm:w-40 sm:h-40'} rounded-full transition-all duration-150 shadow-[0_0_80px_rgba(255,255,255,0.1)] border border-white/30 flex items-center justify-center overflow-hidden bg-gradient-to-tr from-slate-950 via-indigo-950 to-indigo-800 z-10`}
        style={{ transform: `scale(${scale})` }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.6),transparent_60%)] animate-flare" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(255,255,255,0.2),transparent_60%)]" />
        
        {state.isTalking && (
          <div className="absolute inset-4 rounded-full bg-white/10 blur-2xl animate-pulse" />
        )}

        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        <div className="absolute top-4 right-8 w-16 h-8 bg-white/30 blur-2xl rounded-full transform -rotate-45" />
      </div>

      {state.isListening && inVol > 0.05 && (
        <div 
          className="absolute inset-0 rounded-full border-2 border-white/20 pointer-events-none animate-ping"
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
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-5 no-scrollbar">
      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-center tracking-[0.4em]">
          <p className="text-sm font-black text-white uppercase animate-pulse">Awaiting for your presence</p>
        </div>
      )}
      {messages.map((msg, idx) => (
        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-700`}>
          <div className={`max-w-[90%] rounded-2xl px-6 py-4 glass-surface ${
            msg.role === 'user' ? 'bg-indigo-500/10' : 'bg-white/5'
          }`}>
            <p className="text-base sm:text-lg leading-relaxed font-bold text-white">{msg.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- Intro Animation ---

const IntroSplash = ({ onFinish }: { onFinish: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 4500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020617] p-8">
      <div className="animate-splash flex flex-col items-center gap-12">
        <GuardianAura 
          state={{ isActive: false, isConnecting: false, isTalking: false, isListening: false }} 
          inVol={0} 
          outVol={0}
          minimal={true}
        />
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-black tracking-[0.8em] text-white uppercase glow-text">VoiceGuardian</h2>
          <p className="text-indigo-400 text-xs font-bold tracking-[0.4em] uppercase opacity-60">Awakening Presence...</p>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
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
    4. NATURAL TONE: Speak like a wise friend, not a robot. 
    5. NO MARKDOWN: Output plain text only.
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

  if (!hasStarted) {
    return <IntroSplash onFinish={() => setHasStarted(true)} />;
  }

  return (
    <div className="celestial-bg flex flex-col h-screen max-w-lg mx-auto font-sans relative overflow-hidden">
      {/* Decorative stardust overlay */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none" />

      {/* Header */}
      <header className="px-6 sm:px-10 pt-8 sm:pt-10 pb-4 flex justify-between items-center z-20">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]">
             <i className="fa-solid fa-star-of-life text-white text-base animate-spin" style={{ animationDuration: '10s' }} />
           </div>
           <div>
             <h1 className="text-sm font-black tracking-widest text-white glow-text uppercase">Guardian Presence</h1>
             <p className="text-[9px] text-indigo-300 uppercase tracking-widest font-black">Celestial Intelligence v2</p>
           </div>
        </div>
        
        <button 
          onClick={resetAll}
          className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-white/10 text-white transition-colors"
          title="Reset"
        >
          <i className="fa-solid fa-wind text-sm" />
        </button>
      </header>

      {/* Main Experience */}
      <main className="flex-1 flex flex-col items-center justify-between px-6 py-4 z-10 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <GuardianAura state={session} inVol={inVol} outVol={outVol} />
          
          <div className="w-full max-w-sm mt-8 sm:mt-12">
             <div className="grid grid-cols-2 gap-4">
                {Object.values(GuardianMode).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    disabled={session.isActive}
                    className={`px-4 py-4 rounded-2xl text-[10px] sm:text-xs font-black border tracking-widest transition-all duration-500 ${
                      mode === m 
                        ? 'border-white bg-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                        : 'border-white/10 bg-white/[0.03] text-white/50 hover:text-white/90 hover:bg-white/5'
                    } ${session.isActive ? 'opacity-20 cursor-not-allowed' : ''}`}
                  >
                    {m.split(' ')[0].toUpperCase()}
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Transcript Area */}
        <div className="w-full h-48 sm:h-56 mt-8 glass-surface rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
           <TranscriptView messages={messages} />
        </div>
      </main>

      {/* Control Area */}
      <footer className="p-8 sm:p-12 flex flex-col items-center z-20">
        {!session.isActive ? (
          <button
            onClick={startSession}
            disabled={session.isConnecting}
            className="group relative flex flex-col items-center"
          >
            <div className="absolute -inset-16 bg-white/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-white/10 border-2 border-white/20 hover:border-white/80 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-white shadow-2xl transition-all transform active:scale-90 duration-500">
              {session.isConnecting ? (
                <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <i className="fa-solid fa-microphone text-4xl" />
              )}
            </div>
            <span className="mt-6 text-white text-[10px] font-black uppercase tracking-[0.5em] group-hover:glow-text transition-all">
              {session.isConnecting ? 'Aligning Spirit...' : 'Begin Communion'}
            </span>
          </button>
        ) : (
          <button
            onClick={stopSession}
            className="group relative flex flex-col items-center"
          >
             <div className="absolute -inset-10 bg-white/5 blur-3xl opacity-50" />
             <div className="relative bg-slate-950/60 border border-white/30 hover:border-white/80 w-20 h-20 rounded-full flex items-center justify-center text-white transition-all transform active:scale-90">
              <i className="fa-solid fa-stop text-lg" />
            </div>
            <span className="mt-5 text-white/60 text-[9px] font-black uppercase tracking-[0.5em]">Rest Presence</span>
          </button>
        )}
      </footer>

      <div className="pb-8 text-center opacity-40">
        <span className="text-[8px] text-white font-black uppercase tracking-[0.6em]">Celestial Encryption Active</span>
      </div>
    </div>
  );
}
