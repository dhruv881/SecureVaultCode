import { useState } from "react";
import { Calendar, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExpiryDashboard from "@/components/expiry-dashboard";
import DocumentPreview from "@/components/document-preview";
import { Document } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ExpiryPage() {
  const { toast } = useToast();
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  const handleView = (document: Document) => {
    setPreviewDocument(document);
    setIsPreviewOpen(true);
  };

  const handleDownload = (doc: Document) => {
    toast({
      title: "Download Started",
      description: `Downloading ${doc.originalName}...`,
    });
    // Create download link
    const link = document.createElement('a');
    link.href = `/uploads/${doc.filename}`;
    link.download = doc.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewDocument(null);
  };

  const documentsWithExpiry = documents.filter(doc => doc.expiryDate);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Document Expiry Tracker
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor your BRP, Passport, and other important document expiry dates
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {documentsWithExpiry.length} documents tracked
            </div>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {documentsWithExpiry.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold mb-2">No Documents to Track</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Upload documents like BRP, Passport, or Driving License to automatically track their expiry dates. 
              Our AI will scan and extract expiry information for you.
            </p>
            <Button className="gap-2">
              <Calendar className="w-4 h-4" />
              Upload Identity Documents
            </Button>
          </div>
        ) : (
          <ExpiryDashboard onViewDocument={handleView} />
        )}
      </div>

      {/* Document Preview Modal */}
      <DocumentPreview
        document={previewDocument}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        onDownload={handleDownload}
      />
    </div>
  );
}
