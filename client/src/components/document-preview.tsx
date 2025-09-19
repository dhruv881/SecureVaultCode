import { useState } from "react";
import { X, Download, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Document } from "@shared/schema";

interface DocumentPreviewProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (document: Document) => void;
}

export default function DocumentPreview({ document, isOpen, onClose, onDownload }: DocumentPreviewProps) {
  const [imageError, setImageError] = useState(false);

  if (!document) return null;

  const getFileUrl = (filename: string) => `/uploads/${filename}`;

  const renderPreview = () => {
    const fileUrl = getFileUrl(document.filename);
    
    if (document.mimeType.includes('pdf')) {
      return (
        <div className="w-full h-[600px] bg-muted rounded-lg">
          <object
            data={fileUrl}
            type="application/pdf"
            className="w-full h-full rounded-lg"
            title={`Preview of ${document.originalName}`}
          >
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="space-y-4">
                <div className="text-lg font-medium">PDF Preview</div>
                <p className="text-muted-foreground">
                  Your browser doesn't support PDF viewing. Use the buttons below to open or download.
                </p>
              </div>
            </div>
          </object>
        </div>
      );
    }
    
    if (document.mimeType.includes('image')) {
      return (
        <div className="w-full max-h-[600px] bg-muted rounded-lg flex items-center justify-center">
          {imageError ? (
            <div className="text-center p-8">
              <p className="text-muted-foreground">Unable to display image. Use the buttons below to open or download.</p>
            </div>
          ) : (
            <img
              src={fileUrl}
              alt={document.originalName}
              className="max-w-full max-h-[600px] object-contain rounded-lg"
              onError={() => setImageError(true)}
            />
          )}
        </div>
      );
    }
    
    // For other file types, show info and download option
    return (
      <div className="text-center p-12 bg-muted rounded-lg">
        <div className="space-y-4">
          <div className="text-lg font-medium">{document.originalName}</div>
          <p className="text-muted-foreground">
            This file type cannot be previewed in the browser.
          </p>
          <p className="text-muted-foreground mt-2">Use the buttons below to open or download.</p>
        </div>
      </div>
    );
  };

  const getExpiryStatus = (expiryDate: Date | null) => {
    if (!expiryDate) return null;
    
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffInDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) {
      return { label: "Expired", variant: "destructive" as const };
    } else if (diffInDays <= 7) {
      return { label: "Expires in 1 week", variant: "destructive" as const };
    } else if (diffInDays <= 30) {
      return { label: `Expires in ${diffInDays} days`, variant: "secondary" as const };
    } else if (diffInDays <= 90) {
      return { label: `Expires in ${Math.ceil(diffInDays / 30)} months`, variant: "outline" as const };
    }
    
    return { label: "Active", variant: "outline" as const };
  };

  const expiryStatus = getExpiryStatus(document.expiryDate);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto" data-testid="document-preview-modal">
        <DialogHeader>
          <div className="space-y-2">
            <DialogTitle className="text-xl" data-testid="preview-document-title">
              {document.originalName}
            </DialogTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{document.category}</Badge>
              <span>•</span>
              <span>Uploaded {format(new Date(document.uploadedAt), "MMM d, yyyy")}</span>
              {expiryStatus && (
                <>
                  <span>•</span>
                  <Badge variant={expiryStatus.variant}>{expiryStatus.label}</Badge>
                </>
              )}
            </div>
            {document.tags && document.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {document.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </DialogHeader>
        
        <div className="mt-6">
          {renderPreview()}
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button 
            variant="outline" 
            onClick={() => window.open(getFileUrl(document.filename), '_blank')}
            data-testid="open-external-button"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in new tab
          </Button>
          {onDownload && (
            <Button 
              onClick={() => onDownload(document)}
              data-testid="download-from-preview-button"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}