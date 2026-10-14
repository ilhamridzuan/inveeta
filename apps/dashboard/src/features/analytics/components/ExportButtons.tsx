import React from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, FileText } from 'lucide-react';

interface ExportButtonsProps {
  eventId: string;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'secondary' | 'default';
  className?: string;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  eventId,
  size = 'sm',
  variant = 'outline',
  className = '',
}) => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const xlsxUrl = `${apiUrl}/api/v1/manage/events/${eventId}/export/xlsx`;
  const csvUrl = `${apiUrl}/api/v1/manage/events/${eventId}/export/csv`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Excel Download Button */}
      <Button asChild variant={variant} size={size} className="gap-1.5 shadow-2xs font-medium">
        <a
          href={xlsxUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Unduh rekap tamu format Microsoft Excel (.xlsx) dengan streaming zero-heap spike"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Ekspor Excel (.xlsx)</span>
        </a>
      </Button>

      {/* CSV Download Button */}
      <Button asChild variant={variant} size={size} className="gap-1.5 shadow-2xs font-medium">
        <a
          href={csvUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Unduh rekap tamu format CSV dengan UTF-8 BOM"
        >
          <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <span>Ekspor CSV</span>
        </a>
      </Button>
    </div>
  );
};
