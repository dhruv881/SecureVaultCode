import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { CloudUpload, FileText, Image, FileIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UploadZoneProps {
  onUploadSuccess?: (document: any) => void;
  category?: string;
  expiryDate?: string;
  tags?: string[];
}

export default function UploadZone({ onUploadSuccess, category, expiryDate, tags }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/documents/upload", formData);
      return response.json();
    },
    onSuccess: (document) => {
      toast({
        title: "Document uploaded successfully",
        description: `${document.originalName} has been uploaded and categorized.`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      
      onUploadSuccess?.(document);
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add metadata if provided
      if (category) {
        formData.append('category', category);
      }
      if (expiryDate) {
        formData.append('expiryDate', expiryDate);
      }
      if (tags && tags.length > 0) {
        formData.append('tags', JSON.stringify(tags));
      }
      
      uploadMutation.mutate(formData);
    });
  }, [uploadMutation, category, expiryDate, tags]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDragEnter: () => setIsDragOver(true),
    onDragLeave: () => setIsDragOver(false),
    onDropAccepted: () => setIsDragOver(false),
    onDropRejected: () => setIsDragOver(false),
  });

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Upload</h2>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive || isDragOver
              ? "border-primary bg-primary/5 drag-over"
              : "border-border hover:border-primary hover:bg-primary/5"
          }`}
          data-testid="upload-zone"
        >
          <input {...getInputProps()} />
          <div className="space-y-4">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <CloudUpload className="text-primary w-8 h-8" />
            </div>
            <div>
              <p className="text-foreground font-medium">
                {uploadMutation.isPending
                  ? "Uploading..."
                  : "Drag & drop your documents here"}
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                {uploadMutation.isPending
                  ? "Please wait while we process your files"
                  : "or click to browse files"}
              </p>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4 text-red-500" />
                PDF
              </span>
              <span className="flex items-center gap-1">
                <Image className="w-4 h-4 text-green-500" />
                Images
              </span>
              <span className="flex items-center gap-1">
                <FileIcon className="w-4 h-4 text-blue-500" />
                Documents
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
