import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CHAR_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';

function ScrambleWord({ text, duration = 1200 }) {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    let iteration = 0;
    const interval = 35;
    const totalIterations = Math.floor(duration / interval);
    
    const timer = setInterval(() => {
      setDisplayText((prev) =>
        text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            if (index < (iteration / totalIterations) * text.length) {
              return text[index];
            }
            return CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)];
          })
          .join('')
      );

      iteration += 1;
      if (iteration > totalIterations) {
        clearInterval(timer);
        setDisplayText(text);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [text, duration]);

  return <span>{displayText}</span>;
}

export default function KineticScrambleHeadline({ phrases = [], interval = 3500 }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!phrases.length) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % phrases.length);
    }, interval);
    return () => clearInterval(timer);
  }, [phrases.length, interval]);

  if (!phrases.length) return null;

  return (
    <div className="kinetic-scramble-wrapper" style={{ display: 'inline-block', position: 'relative' }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="kinetic-scramble-word"
        >
          <ScrambleWord text={phrases[currentIndex]} />
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
