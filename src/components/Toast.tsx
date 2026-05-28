import React, { useEffect } from 'react';
import { useHydration } from '../store/HydrationContext';
import { AnimatePresence, motion } from 'motion/react';
import { Info } from 'lucide-react';

export function Toast() {
  const { toastMessage, setToastMessage } = useHydration();

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, setToastMessage]);

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="absolute top-12 left-1/2 -translate-x-1/2 w-[280px] bg-white/90 backdrop-blur-lg border border-red-100 rounded-2xl p-3 shadow-xl z-50 flex items-center gap-3"
        >
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-lg shrink-0">⚠️</div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-red-600">HYDRATION ALERT</p>
            <p className="text-[10px] text-slate-600 font-medium">{toastMessage}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
