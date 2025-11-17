import React from 'react';
import { Check, Save, AlertCircle } from 'lucide-react';

interface SaveIndicatorProps {
  status: 'saved' | 'saving' | 'error';
  pendingCount?: number;
}

export const SaveIndicator: React.FC<SaveIndicatorProps> = ({
  status,
  pendingCount = 0
}) => {
  if (status === 'saved' && pendingCount === 0) {
    return (
      <div className="flex items-center space-x-2 text-green-600 text-sm">
        <Check className="h-4 w-4" />
        <span>Saved</span>
      </div>
    );
  }

  if (status === 'saving') {
    return (
      <div className="flex items-center space-x-2 text-blue-600 text-sm">
        <Save className="h-4 w-4 animate-pulse" />
        <span>Saving...</span>
        {pendingCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center space-x-2 text-red-600 text-sm">
        <AlertCircle className="h-4 w-4" />
        <span>Save failed</span>
      </div>
    );
  }

  return null;
};
