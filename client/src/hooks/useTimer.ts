import { useState, useEffect } from 'react';

export const useTimer = (startTime: string | Date | null) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setDuration(0);
      return;
    }

    const start = new Date(startTime).getTime();
    
    const tick = () => {
      const now = new Date().getTime();
      setDuration(Math.floor((now - start) / 1000));
    };

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return { duration, formattedTime: formatTime(duration) };
};
