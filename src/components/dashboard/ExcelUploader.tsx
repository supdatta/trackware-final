import { useState, useRef } from 'react';
import { Upload, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseExcelFile, type WorkLogEntry } from '@/lib/excelParser';
import { useWorkLogs } from '@/hooks/useWorkLogs';
import { useAuth } from '@/hooks/useAuth';

interface ExcelUploaderProps {
  projectId: string;
  onUploadSuccess: (entriesCount: number) => void;
}

export const ExcelUploader = ({ projectId, onUploadSuccess }: ExcelUploaderProps) => {
  const { user } = useAuth();
  const { uploadWorkLogs, progress } = useWorkLogs();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setFileName(file.name);

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setParseError('Please upload a valid Excel file (.xlsx, .xls) or CSV file');
      return;
    }

    try {
      const entries = await parseExcelFile(file);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const result = await uploadWorkLogs(projectId, user.id, entries);

      if (result.success) {
        onUploadSuccess(result.count);
        setFileName(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setParseError(result.error || 'Failed to upload work logs');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse Excel file';
      setParseError(message);
    }
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Upload Work Log</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upload an Excel file with: Week no, Day of the week, Hours, Work Done
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          disabled={progress.isLoading}
          className="hidden"
        />

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={progress.isLoading}
          variant="outline"
          className="w-full"
        >
          {progress.isLoading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {fileName ? `Replace "${fileName}"` : 'Select Excel File'}
            </>
          )}
        </Button>

        {progress.success && (
          <Alert className="border-health-green/30 bg-health-green/5">
            <CheckCircle className="h-4 w-4 text-health-green" />
            <AlertDescription className="text-health-green ml-2">
              Work logs uploaded successfully
            </AlertDescription>
          </Alert>
        )}

        {(parseError || progress.error) && (
          <Alert className="border-health-red/30 bg-health-red/5">
            <AlertCircle className="h-4 w-4 text-health-red" />
            <AlertDescription className="text-health-red ml-2">
              {parseError || progress.error}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg space-y-1">
        <p className="font-medium">Expected Excel format:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Column A: Week no (e.g., 1, 2, 3)</li>
          <li>Column B: Day of the week (Monday-Sunday)</li>
          <li>Column C: Hours (0-24)</li>
          <li>Column D: Work Done (description)</li>
        </ul>
      </div>
    </div>
  );
};
