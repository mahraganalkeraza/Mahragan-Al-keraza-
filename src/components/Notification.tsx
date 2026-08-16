import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';

interface NotificationProps {
  message: string;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-4 right-4 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-4 z-50"
      >
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Bell className="text-primary" size={24} />
        </div>
        <div className="flex-1">
          <h4 className="font-black text-slate-900">إشعار جديد</h4>
          <p className="text-sm text-slate-600">{message}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default Notification;
