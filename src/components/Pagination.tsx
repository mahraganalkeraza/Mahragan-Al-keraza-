import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ 
  currentPage, 
  totalItems, 
  itemsPerPage, 
  onPageChange 
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-6 py-4 border-t border-slate-100">
      <button 
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl disabled:opacity-30 transition-all cursor-pointer"
        type="button"
      >
        <ChevronRight size={18} className="text-slate-600" />
      </button>
      <span className="text-sm font-black text-slate-800">
        صفحة {currentPage} من {totalPages}
      </span>
      <button 
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl disabled:opacity-30 transition-all cursor-pointer"
        type="button"
      >
        <ChevronLeft size={18} className="text-slate-600" />
      </button>
    </div>
  );
};

export default Pagination;
