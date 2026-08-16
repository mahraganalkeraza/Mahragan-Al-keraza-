import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Widget error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed bottom-4 right-4 z-[9999] w-[350px] bg-white rounded-2xl shadow-xl border border-red-200 p-4 text-center" dir="rtl">
           <p className="text-red-700 font-bold mb-3 text-sm">حدث خطأ في جلب البيانات، إضغط لإعادة المحاولة</p>
           <button 
             onClick={() => this.setState({ hasError: false })} 
             className="flex items-center gap-2 mx-auto py-2 px-4 bg-red-100 text-red-800 rounded-lg text-sm font-bold"
           >
             <RotateCcw size={16}/> إعادة محاولة التشغيل
           </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default WidgetErrorBoundary;
