import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, CheckSquare, Square } from 'lucide-react';

export interface ColumnDefinition {
  key: string;
  label: string;
  defaultSelected?: boolean;
}

export interface ExportColumnSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnDefinition[];
  onConfirm: (selectedColumns: ColumnDefinition[]) => void;
  title?: string;
}

const ExportColumnSelector: React.FC<ExportColumnSelectorProps> = ({
  isOpen,
  onClose,
  columns,
  onConfirm,
  title = 'تصدير جدول البيانات (PDF / طباعة)'
}) => {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    new Set(columns.filter(c => c.defaultSelected !== false).map(c => c.key))
  );

  const toggleColumn = (key: string) => {
    const newFilters = new Set(selectedKeys);
    if (newFilters.has(key)) {
      newFilters.delete(key);
    } else {
      newFilters.add(key);
    }
    setSelectedKeys(newFilters);
  };

  const selectAll = () => {
    setSelectedKeys(new Set(columns.map(c => c.key)));
  };

  const deselectAll = () => {
    setSelectedKeys(new Set());
  };

  const handlePrint = () => {
    const selectedColsList = columns.filter(c => selectedKeys.has(c.key));
    if (selectedColsList.length === 0) {
      alert("يرجى اختيار عمود واحد على الأقل للطباعة");
      return;
    }
    onConfirm(selectedColsList);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center font-arabic p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col"
        >
          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Printer className="text-coptic-blue" /> {title}
            </h2>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-sm font-bold text-slate-600 mb-6">
              اختر الأعمدة التي تود تضمينها في الملف الجاهز للطباعة:
            </p>

            <div className="flex gap-2 mb-4">
              <button 
                onClick={selectAll}
                className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100"
              >
                تحديد الكل
              </button>
              <button 
                onClick={deselectAll}
                className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg hover:bg-rose-100"
              >
                إلغاء التحديد
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {columns.map((col) => {
                const isSelected = selectedKeys.has(col.key);
                return (
                  <div 
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="text-primary flex-shrink-0" size={18} />
                    ) : (
                      <Square className="text-slate-300 flex-shrink-0" size={18} />
                    )}
                    <span className="font-bold text-sm w-full truncate select-none">{col.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-100 p-6">
            <button
              onClick={handlePrint}
              disabled={selectedKeys.size === 0}
              className={`w-full py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 transition-all ${
                selectedKeys.size === 0 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white hover:shadow-xl hover:scale-[1.02]'
              }`}
            >
              <Printer size={18} /> 
              معاينة وتصدير PDF ({selectedKeys.size} أعمدة)
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ExportColumnSelector;
