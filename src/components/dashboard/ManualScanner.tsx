import { useState, useRef } from "react";
import { Upload, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, X, FileUp, Loader } from "lucide-react";
import { parseExcelFile, WorkLogEntry } from "../../lib/excelParser";
import { supabase } from "../../integrations/supabase/client";

interface ScannerProps {
  projectId: string;
  onDataProcessed?: (workLogs: any[]) => void;
}

interface UploadedFile {
  file: File;
  teamMemberName: string;
  entries: WorkLogEntry[];
  error: string | null;
  isLoading: boolean;
  isProcessing: boolean;
}

export const ManualScanner = ({ projectId, onDataProcessed }: ScannerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
        alert('Please upload Excel files (.xlsx, .xls) or CSV files');
        continue;
      }

      const newUpload: UploadedFile = {
        file,
        teamMemberName: '',
        entries: [],
        error: null,
        isLoading: true,
        isProcessing: false,
      };

      setUploadedFiles(prev => [...prev, newUpload]);

      try {
        const entries = await parseExcelFile(file);
        setUploadedFiles(prev =>
          prev.map(u =>
            u.file === file
              ? {
                  ...u,
                  teamMemberName: 'Team Member',
                  entries,
                  error: null,
                  isLoading: false,
                }
              : u
          )
        );
      } catch (error) {
        setUploadedFiles(prev =>
          prev.map(u =>
            u.file === file
              ? {
                  ...u,
                  error: (error as Error).message,
                  isLoading: false,
                }
              : u
          )
        );
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAll = async () => {
    const filesToProcess = uploadedFiles.filter(u => !u.isLoading && u.entries.length > 0);
    if (filesToProcess.length === 0) {
      alert('No valid files to process');
      return;
    }

    setIsSubmitting(true);

    try {
      const allWorkLogs = [];

      for (const upload of filesToProcess) {
        setUploadedFiles(prev =>
          prev.map(u =>
            u.file === upload.file ? { ...u, isProcessing: true } : u
          )
        );

        const teamMemberName = upload.teamMemberName || `Team Member - ${upload.file.name}`;

        const { data: existingTeamMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('project_id', projectId)
          .eq('name', teamMemberName)
          .maybeSingle();

        let teamMemberId: string;

        if (existingTeamMember) {
          teamMemberId = existingTeamMember.id;
        } else {
          const { data: newTeamMember, error: createError } = await supabase
            .from('team_members')
            .insert({
              project_id: projectId,
              name: teamMemberName,
              role: 'Developer',
            })
            .select('id')
            .single();

          if (createError) throw createError;
          teamMemberId = newTeamMember.id;
        }

        const workLogsToInsert = upload.entries.map(entry => ({
          project_id: projectId,
          team_member_id: teamMemberId,
          week_number: entry.weekNumber,
          day_of_week: entry.dayOfWeek,
          hours_worked: entry.hoursWorked,
          work_done: entry.workDone,
        }));

        const { data: insertedLogs, error: insertError } = await supabase
          .from('work_logs')
          .insert(workLogsToInsert)
          .select();

        if (insertError) throw insertError;
        allWorkLogs.push(...(insertedLogs || []));

        setUploadedFiles(prev =>
          prev.map(u =>
            u.file === upload.file ? { ...u, isProcessing: false } : u
          )
        );
      }

      setUploadedFiles([]);
      if (onDataProcessed) {
        onDataProcessed(allWorkLogs);
      }
    } catch (error) {
      alert(`Error processing files: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasValidFiles = uploadedFiles.some(u => !u.isLoading && u.entries.length > 0);
  const totalEntries = uploadedFiles.reduce((sum, u) => sum + u.entries.length, 0);

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <FileUp className="w-4 h-4 text-primary" /> Manual Work Log Scanner
        </h3>
      </div>

      {uploadedFiles.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <Upload className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Upload Excel files</p>
          <p className="text-xs text-muted-foreground mt-1">
            Drag and drop Excel files or click to select
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Each file should contain: Week No, Day of Week, Hours, Work Done
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {uploadedFiles.map((upload, idx) => (
            <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {upload.isLoading ? (
                      <Loader className="w-4 h-4 animate-spin text-primary" />
                    ) : upload.error ? (
                      <AlertTriangle className="w-4 h-4 text-health-red" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-health-green" />
                    )}
                    <span className="font-medium text-foreground">{upload.file.name}</span>
                  </div>
                  {!upload.isLoading && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {upload.entries.length > 0 ? (
                        <>
                          {upload.entries.length} entries · {upload.entries.reduce((sum, e) => sum + e.hoursWorked, 0).toFixed(1)} hours
                        </>
                      ) : (
                        'No valid entries'
                      )}
                    </p>
                  )}
                </div>
                {!upload.isLoading && !upload.isProcessing && (
                  <button
                    onClick={() => handleRemoveFile(idx)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {upload.isProcessing && (
                  <Loader className="w-4 h-4 animate-spin text-primary" />
                )}
              </div>

              {upload.error && (
                <div className="bg-health-red/10 border border-health-red/20 rounded p-2">
                  <p className="text-xs text-health-red">{upload.error}</p>
                </div>
              )}

              {upload.entries.length > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded p-2">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">{upload.entries.length}</span> valid entries ready to import
                  </p>
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-3 py-2 rounded-lg bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors text-sm font-medium"
            >
              <FileUp className="w-4 h-4 mr-2 inline" />
              Add More Files
            </button>
            <button
              onClick={handleSubmitAll}
              disabled={!hasValidFiles || isSubmitting}
              className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground border border-primary/20 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 inline animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 inline" />
                  Import All ({totalEntries} entries)
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  );
};
