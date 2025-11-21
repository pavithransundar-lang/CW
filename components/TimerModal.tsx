import React, { useEffect, useState } from 'react';
import { ClockIcon } from './Icons';

interface Props {
  minutes: number;
  isOpen: boolean;
  onClose: () => void;
}

export const TimerModal: React.FC<Props> = ({ minutes, isOpen, onClose }) => {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isOpen && minutes > 0) {
      setSecondsLeft(minutes * 60);
      setIsActive(true);
    }
  }, [isOpen, minutes]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(s => s - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      // Optional: Play sound here
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);

  if (!isOpen) return null;

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = Math.max(0, secondsLeft / (minutes * 60)) * 100;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-gray-900 text-white">
      <div className="absolute top-6 right-6">
        <button onClick={onClose} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition">
          Exit Timer
        </button>
      </div>
      
      <div className="relative mb-12">
         {/* Simple circular visualizer could go here, keeping it minimal for now */}
         <ClockIcon className="w-24 h-24 text-emerald-400 animate-pulse" />
      </div>

      <div className="text-[120px] font-mono font-bold leading-none tracking-tighter">
        {formatTime(secondsLeft)}
      </div>
      
      <p className="mt-4 text-gray-400 text-xl animate-bounce">
        {secondsLeft > 0 ? "Enjoy your screen time!" : "Time's up!"}
      </p>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-4 bg-gray-800">
        <div 
          className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};