import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays, isAfter, isBefore, addDays } from "date-fns";
import { AlertTriangle, Calendar, Clock, FileText, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Document } from "@shared/schema";

interface ExpiryDashboardProps {
  onViewDocument?: (document: Document) => void;
}

export default function ExpiryDashboard({ onViewDocument }: ExpiryDashboardProps) {
  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  // Filter documents with expiry dates
  const documentsWithExpiry = documents.filter(doc => doc.expiryDate);

  // Categorize by expiry status
  const now = new Date();
  const thirtyDaysFromNow = addDays(now, 30);
  const ninetyDaysFromNow = addDays(now, 90);

  const expired = documentsWithExpiry.filter(doc => 
    isBefore(new Date(doc.expiryDate!), now)
  );

  const expiringSoon = documentsWithExpiry.filter(doc => {
    const expiryDate = new Date(doc.expiryDate!);
    return isAfter(expiryDate, now) && isBefore(expiryDate, thirtyDaysFromNow);
  });

  const expiringIn90Days = documentsWithExpiry.filter(doc => {
    const expiryDate = new Date(doc.expiryDate!);
    return isAfter(expiryDate, thirtyDaysFromNow) && isBefore(expiryDate, ninetyDaysFromNow);
  });

  const getDocumentTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'passport':
        return '🛂';
      case 'brp':
        return '🆔';
      case 'driving_license':
      case 'license':
        return '🚗';
      case 'visa':
        return '✈️';
      default:
        return '📄';
    }
  };

  const getUrgencyColor = (daysUntilExpiry: number) => {
    if (daysUntilExpiry < 0) return 'text-red-600 bg-red-50';
    if (daysUntilExpiry <= 7) return 'text-red-600 bg-red-50';
    if (daysUntilExpiry <= 30) return 'text-orange-600 bg-orange-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const DocumentExpiryCard = ({ document, urgency }: { document: Document; urgency: 'expired' | 'critical' | 'warning' }) => {
    const daysUntilExpiry = differenceInDays(new Date(document.expiryDate!), now);
    const urgencyConfig = {
      expired: { color: 'destructive', icon: AlertTriangle, label: 'EXPIRED' },
      critical: { color: 'destructive', icon: Clock, label: 'URGENT' },
      warning: { color: 'secondary', icon: Calendar, label: 'SOON' }
    };
    
    const config = urgencyConfig[urgency];
    const Icon = config.icon;

    return (
      <Card className={`${getUrgencyColor(daysUntilExpiry)} border-l-4 ${urgency === 'expired' ? 'border-l-red-500' : urgency === 'critical' ? 'border-l-orange-500' : 'border-l-yellow-500'}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">
              {getDocumentTypeIcon(document.metadata?.documentType as string)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium truncate text-sm">{document.originalName}</h4>
                <Badge variant={config.color as any} className="text-xs">
                  <Icon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{document.category}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">
                  {daysUntilExpiry < 0 
                    ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
                    : daysUntilExpiry === 0 
                    ? 'Expires today'
                    : `Expires in ${daysUntilExpiry} days`
                  }
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(document.expiryDate!), 'dd MMM yyyy')}
                </span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => onViewDocument?.(document)}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (documentsWithExpiry.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Document Expiry Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No documents with expiry dates found.</p>
            <p className="text-sm mt-1">Upload BRP, Passport, or License documents to track expiry dates.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Document Expiry Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{expired.length}</div>
              <div className="text-sm text-red-700">Expired</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{expiringSoon.length}</div>
              <div className="text-sm text-orange-700">Next 30 Days</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{expiringIn90Days.length}</div>
              <div className="text-sm text-yellow-700">Next 90 Days</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{documentsWithExpiry.length}</div>
              <div className="text-sm text-green-700">Total Tracked</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expired Documents */}
      {expired.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Expired Documents ({expired.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expired.map(document => (
              <DocumentExpiryCard 
                key={document.id} 
                document={document} 
                urgency="expired"
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Expiring Soon */}
      {expiringSoon.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <Clock className="w-5 h-5" />
              Expiring Soon ({expiringSoon.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiringSoon.map(document => (
              <DocumentExpiryCard 
                key={document.id} 
                document={document} 
                urgency="critical"
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Expiring in 90 Days */}
      {expiringIn90Days.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <Calendar className="w-5 h-5" />
              Expiring in Next 90 Days ({expiringIn90Days.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiringIn90Days.map(document => (
              <DocumentExpiryCard 
                key={document.id} 
                document={document} 
                urgency="warning"
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
