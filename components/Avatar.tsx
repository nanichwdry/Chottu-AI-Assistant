import React, { useState, useEffect } from 'react';

interface AvatarProps {
  audioLevel: number;
  isListening: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ audioLevel, isListening }) => {
  const [eyesOpen, setEyesOpen] = useState(true);
  const [mouthState, setMouthState] = useState(0);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyesOpen(false);
      setTimeout(() => setEyesOpen(true), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
    if (audioLevel < 0.1) setMouthState(0);
    else if (audioLevel < 0.5) setMouthState(1);
    else setMouthState(2);
  }, [audioLevel]);

  return (
    <div className="relative w-64 h-64">
      <img src="/chottu_head.png" alt="Chottu" className="absolute inset-0" />
      <img src={eyesOpen ? "/eyes_open.png" : "/eyes_closed.png"} alt="Eyes" className="absolute inset-0" />
      <img src={`/mouth_${mouthState}.png`} alt="Mouth" className="absolute inset-0" />
    </div>
  );
};

export default Avatar;
