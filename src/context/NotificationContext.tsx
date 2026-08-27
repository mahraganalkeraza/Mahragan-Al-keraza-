import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X, 
  HelpCircle,
  BellRing
} from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationBubble {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ConfirmDialogConfig {
  isOpen: boolean;
  type?: 'confirm' | 'warning' | 'error' | 'info' | 'success';
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface NotificationContextValue {
  showBubble: (options: {
    type?: NotificationType;
    title?: string;
    message: string;
    duration?: number;
  }) => string;
  showSuccess: (message: string, title?: string, duration?: number) => string;
  showError: (message: string, title?: string, duration?: number) => string;
  showWarning: (message: string, title?: string, duration?: number) => string;
  showInfo: (message: string, title?: string, duration?: number) => string;
  removeBubble: (id: string) => void;
  clearBubbles: () => void;
  showConfirmDialog: (options: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'confirm' | 'warning' | 'error' | 'info' | 'success';
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
  confirmAsync: (options: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'confirm' | 'warning' | 'error' | 'info' | 'success';
  }) => Promise<boolean>;
  alertAsync: (
    message: string,
    title?: string,
    type?: NotificationType
  ) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const useNotificationBubble = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationBubble must be used within a NotificationProvider');
  }
  return context;
};

// Aliases for developer convenience
export const useNotification = useNotificationBubble;
export const useToast = useNotificationBubble;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bubbles, setBubbles] = useState<NotificationBubble[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogConfig | null>(null);

  const removeBubble = useCallback((id: string) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
  }, []);

  const clearBubbles = useCallback(() => {
    setBubbles([]);
  }, []);

  const showBubble = useCallback(({
    type = 'info',
    title,
    message,
    duration = 4000
  }: {
    type?: NotificationType;
    title?: string;
    message: string;
    duration?: number;
  }) => {
    const id = `bubble_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Auto-generate title if missing
    let defaultTitle = title;
    if (!defaultTitle) {
      switch (type) {
        case 'success':
          defaultTitle = 'تم بنجاح';
          break;
        case 'error':
          defaultTitle = 'تنبيه خطأ';
          break;
        case 'warning':
          defaultTitle = 'تحذير هام';
          break;
        case 'info':
        default:
          defaultTitle = 'إشعار النظام';
          break;
      }
    }

    const newBubble: NotificationBubble = {
      id,
      type,
      title: defaultTitle,
      message,
      duration
    };

    setBubbles(prev => [newBubble, ...prev.slice(0, 4)]); // Keep maximum 5 stacked

    if (duration > 0) {
      setTimeout(() => {
        removeBubble(id);
      }, duration);
    }

    return id;
  }, [removeBubble]);

  const showSuccess = useCallback((message: string, title?: string, duration?: number) => {
    return showBubble({ type: 'success', title: title || 'تم بنجاح', message, duration });
  }, [showBubble]);

  const showError = useCallback((message: string, title?: string, duration?: number) => {
    return showBubble({ type: 'error', title: title || 'خطأ في العملية', message, duration: duration || 5000 });
  }, [showBubble]);

  const showWarning = useCallback((message: string, title?: string, duration?: number) => {
    return showBubble({ type: 'warning', title: title || 'تنبيه', message, duration });
  }, [showBubble]);

  const showInfo = useCallback((message: string, title?: string, duration?: number) => {
    return showBubble({ type: 'info', title: title || 'إشعار', message, duration });
  }, [showBubble]);

  const showConfirmDialog = useCallback((options: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'confirm' | 'warning' | 'error' | 'info' | 'success';
    onConfirm: () => void;
    onCancel?: () => void;
  }) => {
    setConfirmDialog({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || 'موافق',
      cancelText: options.cancelText || 'إلغاء',
      type: options.type || 'confirm',
      onConfirm: () => {
        setConfirmDialog(null);
        options.onConfirm();
      },
      onCancel: () => {
        setConfirmDialog(null);
        if (options.onCancel) options.onCancel();
      }
    });
  }, []);

  const confirmAsync = useCallback((options: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'confirm' | 'warning' | 'error' | 'info' | 'success';
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      showConfirmDialog({
        ...options,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  }, [showConfirmDialog]);

  const alertAsync = useCallback((
    message: string,
    title?: string,
    type: NotificationType = 'info'
  ): Promise<void> => {
    return new Promise((resolve) => {
      showConfirmDialog({
        title: title || (type === 'error' ? 'خطأ' : type === 'warning' ? 'تنبيه' : 'إشعار'),
        message,
        confirmText: 'حسناً',
        type: type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info',
        onConfirm: () => resolve(),
        onCancel: () => resolve()
      });
    });
  }, [showConfirmDialog]);

  return (
    <NotificationContext.Provider
      value={{
        showBubble,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        removeBubble,
        clearBubbles,
        showConfirmDialog,
        confirmAsync,
        alertAsync
      }}
    >
      {children}

      {/* Floating System Notification Bubbles Container */}
      <div 
        id="system-notification-bubbles-container"
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[99999] flex flex-col gap-3 pointer-events-none max-w-sm sm:max-w-md w-full px-4 sm:px-0"
        dir="rtl"
      >
        <AnimatePresence mode="sync">
          {bubbles.map(bubble => (
            <NotificationBubbleItem
              key={bubble.id}
              bubble={bubble}
              onClose={() => removeBubble(bubble.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Custom Confirmation / Alert Dialog Modal */}
      <AnimatePresence>
        {confirmDialog && confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 dir-rtl overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={confirmDialog.onCancel || confirmDialog.onConfirm}
              className="fixed inset-0 backdrop-blur-md bg-slate-950/70"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center z-10 my-auto pointer-events-auto"
            >
              <button
                onClick={confirmDialog.onCancel || confirmDialog.onConfirm}
                className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex justify-center mb-4">
                {confirmDialog.type === 'success' && (
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-50 dark:ring-emerald-950/30">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                )}
                {confirmDialog.type === 'error' && (
                  <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 ring-8 ring-rose-50 dark:ring-rose-950/30">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                )}
                {confirmDialog.type === 'warning' && (
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 ring-8 ring-amber-50 dark:ring-amber-950/30">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                )}
                {confirmDialog.type === 'confirm' && (
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 ring-8 ring-indigo-50 dark:ring-indigo-950/30">
                    <HelpCircle className="w-8 h-8" />
                  </div>
                )}
                {(!confirmDialog.type || confirmDialog.type === 'info') && (
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 ring-8 ring-blue-50 dark:ring-blue-950/30">
                    <Info className="w-8 h-8" />
                  </div>
                )}
              </div>

              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                {confirmDialog.title || 'إشعار'}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm font-medium whitespace-pre-line mb-6 leading-relaxed">
                {confirmDialog.message}
              </p>

              <div className="flex items-center gap-3 justify-center">
                {confirmDialog.onCancel && confirmDialog.cancelText && (
                  <button
                    type="button"
                    onClick={confirmDialog.onCancel}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer"
                  >
                    {confirmDialog.cancelText}
                  </button>
                )}
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className={`flex-1 py-3 px-5 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer ${
                    confirmDialog.type === 'error'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : confirmDialog.type === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                      : confirmDialog.type === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                  }`}
                >
                  {confirmDialog.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};

const NotificationBubbleItem: React.FC<{
  bubble: NotificationBubble;
  onClose: () => void;
}> = ({ bubble, onClose }) => {
  const getTheme = () => {
    switch (bubble.type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
          bg: 'bg-white/95 dark:bg-slate-900/95',
          border: 'border-emerald-500/30 dark:border-emerald-500/40',
          shadow: 'shadow-[0_12px_30px_rgba(16,185,129,0.15)]',
          badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
          accentBar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
          timerColor: 'bg-emerald-500'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
          bg: 'bg-white/95 dark:bg-slate-900/95',
          border: 'border-rose-500/30 dark:border-rose-500/40',
          shadow: 'shadow-[0_12px_30px_rgba(244,63,94,0.15)]',
          badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
          accentBar: 'bg-gradient-to-r from-rose-500 to-red-600',
          timerColor: 'bg-rose-500'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
          bg: 'bg-white/95 dark:bg-slate-900/95',
          border: 'border-amber-500/30 dark:border-amber-500/40',
          shadow: 'shadow-[0_12px_30px_rgba(245,158,11,0.15)]',
          badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
          accentBar: 'bg-gradient-to-r from-amber-500 to-yellow-400',
          timerColor: 'bg-amber-500'
        };
      case 'info':
      default:
        return {
          icon: <BellRing className="w-5 h-5 text-indigo-500 shrink-0" />,
          bg: 'bg-white/95 dark:bg-slate-900/95',
          border: 'border-indigo-500/30 dark:border-indigo-500/40',
          shadow: 'shadow-[0_12px_30px_rgba(99,102,241,0.15)]',
          badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
          accentBar: 'bg-gradient-to-r from-indigo-500 to-blue-500',
          timerColor: 'bg-indigo-500'
        };
    }
  };

  const theme = getTheme();
  const duration = bubble.duration || 4000;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.92, x: 20 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -15, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', damping: 24, stiffness: 320 }}
      className={`pointer-events-auto relative overflow-hidden backdrop-blur-xl ${theme.bg} ${theme.border} ${theme.shadow} border rounded-2xl p-4 transition-all hover:shadow-xl group`}
    >
      {/* Top Accent Strip */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${theme.accentBar}`} />

      <div className="flex items-start gap-3 pt-0.5">
        <div className="p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 flex items-center justify-center shrink-0">
          {theme.icon}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm tracking-tight truncate">
              {bubble.title}
            </h4>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${theme.badgeBg}`}>
              {bubble.type === 'success' ? 'نجاح' : bubble.type === 'error' ? 'خطأ' : bubble.type === 'warning' ? 'تنبيه' : 'إشعار'}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed break-words">
            {bubble.message}
          </p>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors shrink-0 cursor-pointer"
          title="إغلاق الإشعار"
        >
          <X size={16} />
        </button>
      </div>

      {/* Auto-dismiss countdown line */}
      {duration > 0 && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          className={`absolute bottom-0 right-0 h-0.5 opacity-60 ${theme.timerColor}`}
        />
      )}
    </motion.div>
  );
};
