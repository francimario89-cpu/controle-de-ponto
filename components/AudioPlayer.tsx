
import React, { useState, useRef, useEffect } from 'react';
import { decodeBase64, decodeAudioData } from '../geminiService';

interface AudioPlayerProps {
  audioData?: string;
  status: 'idle' | 'generating' | 'ready';
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioData, status }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const [duration, setDuration] = useState(0);

  const cleanup = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current = null;
    }
  };

  const playAudio = async () => {
    if (!audioData) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const ctx = audioContextRef.current;
      const rawBytes = decodeBase64(audioData);
      const audioBuffer = await decodeAudioData(rawBytes, ctx, 24000, 1);
      setDuration(audioBuffer.duration);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setIsPlaying(false);
        setProgress(0);
      };

      startTimeRef.current = ctx.currentTime - pausedAtRef.current;
      source.start(0, pausedAtRef.current);
      sourceRef.current = source;
      setIsPlaying(true);
    } catch (e) {
      console.error("Audio playback error:", e);
    }
  };

  const pauseAudio = () => {
    if (sourceRef.current && audioContextRef.current) {
      pausedAtRef.current = audioContextRef.current.currentTime - startTimeRef.current;
      sourceRef.current.stop();
      sourceRef.current = null;
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  useEffect(() => {
    let interval: any;
    if (isPlaying && audioContextRef.current) {
      interval = setInterval(() => {
        const current = audioContextRef.current!.currentTime - startTimeRef.current;
        setProgress((current / duration) * 100);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  useEffect(() => {
    return cleanup;
  }, []);

  if (status !== 'ready') return null;

  return (
    <div className="flex items-center gap-3 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-200">
      <button 
        onClick={togglePlay}
        className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden relative">
        <div 
          className="absolute inset-0 bg-indigo-500 transition-all duration-100" 
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-gray-500 min-w-[40px]">
        {Math.floor(duration * (progress/100)).toString().padStart(2, '0')}:{Math.floor(duration).toString().padStart(2, '0')}
      </span>
    </div>
  );
};

export default AudioPlayer;
