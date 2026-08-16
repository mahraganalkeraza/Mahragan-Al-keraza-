import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, HelpCircle, X } from 'lucide-react';

export type AlertDialogType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface CustomAlertDialogProps {
  isOpen: boolean;
  type?: AlertDialogType;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const CustomAlertDialog: React.FC<CustomAlertDialogProps> = ({
  isOpen,
  type = 'info',
  title,
  message,
  confirmText = 'موافق',
  cancelText = 'إلغاء',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-50 dark:ring-emerald-950/40">
            <CheckCircle2 className="w-10 h-10" />
          </div>
        );
      case 'error':
        return (
          <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 ring-8 ring-rose-50 dark:ring-rose-950/40">
            <AlertCircle className="w-10 h-10" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 ring-8 ring-amber-50 dark:ring-amber-950/40">
            <AlertTriangle className="w-10 h-10" />
          </div>
        );
      case 'confirm':
        return (
          <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 ring-8 ring-indigo-50 dark:ring-indigo-950/40">
            <HelpCircle className="w-10 h-10" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 ring-8 ring-blue-50 dark:ring-blue-950/40">
            <Info className="w-10 h-10" />
          </div>
        );
    }
  };

  const getDefaultTitle = () => {
    if (title) return title;
    switch (type) {
      case 'success':
        return 'تم بنجاح';
      case 'error':
        return 'خطأ';
      case 'warning':
        return 'تنبيه';
      case 'confirm':
        return 'تأكيد الإجراء';
      case 'info':
      default:
        return 'إشعار';
    }
  };

  const getConfirmBtnColor = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20';
      case 'error':
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20';
      case 'confirm':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20';
      case 'info':
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 dir-rtl overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel || onConfirm}
          className="fixed inset-0 backdrop-blur-md bg-slate-900/60 transition-opacity"
        />

        {/* Dialog Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 text-center z-10 my-auto"
        >
          {/* Close Icon Button */}
          <button
            onClick={onCancel || onConfirm}
            className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={20} />
          </button>

          {/* Icon Badge */}
          <div className="flex justify-center mb-5">{renderIcon()}</div>

          {/* Title */}
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
            {getDefaultTitle()}
          </h3>

          {/* Message */}
          <p className="text-slate-600 dark:text-slate-300 text-base font-medium whitespace-pre-line mb-6 leading-relaxed">
            {message}
          </p>

          {/* Buttons */}
          <div className={`flex items-center gap-3 ${type === 'confirm' ? 'justify-stretch' : 'justify-center'}`}>
            {type === 'confirm' && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-all active:scale-95"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 ${getConfirmBtnColor()}`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
