import { format } from "date-fns";
import { FileText, Image, FileIcon, MoreVertical, Calendar, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Document } from "@shared/schema";

interface DocumentCardProps {
  document: Document;
  onView?: (document: Document) => void;
  onDelete?: (document: Document) => void;
  onDownload?: (document: Document) => void;
}

export default function DocumentCard({ document, onView, onDelete, onDownload }: DocumentCardProps) {
  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="w-6 h-6 text-red-600" />;
    if (mimeType.includes('image')) return <Image className="w-6 h-6 text-green-600" />;
    return <FileIcon className="w-6 h-6 text-blue-600" />;
  };

  const getFileIconBg = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'bg-red-100';
    if (mimeType.includes('image')) return 'bg-green-100';
    return 'bg-blue-100';
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
    <Card className="document-card hover:shadow-md transition-all duration-200" data-testid={`document-card-${document.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`${getFileIconBg(document.mimeType)} p-3 rounded-lg flex-shrink-0`}>
            {getFileIcon(document.mimeType)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 
                  className="font-medium truncate cursor-pointer hover:text-primary"
                  onClick={() => onView?.(document)}
                  data-testid={`document-title-${document.id}`}
                >
                  {document.originalName}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <span>{document.category}</span>
                  <span>•</span>
                  <span>{format(new Date(document.uploadedAt), "MMM d, yyyy")}</span>
                  {document.expiryDate && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span className="text-orange-600 font-medium">
                          Expires: {format(new Date(document.expiryDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`document-menu-${document.id}`}>
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onView?.(document)}>
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDownload?.(document)}>
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(document)}
                    className="text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex items-center gap-2 mt-3">
              {expiryStatus && (
                <Badge variant={expiryStatus.variant} className="text-xs">
                  {expiryStatus.label}
                </Badge>
              )}
              
              {document.tags && document.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {document.tags.slice(0, 2).join(", ")}
                    {document.tags.length > 2 && ` +${document.tags.length - 2}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
