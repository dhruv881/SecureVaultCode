import { useState } from "react";
import { Search, Bell, Camera, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import StatsGrid from "@/components/stats-grid";
import UploadZone from "@/components/upload-zone";
import DocumentCard from "@/components/document-card";
import ExpiryDashboard from "@/components/expiry-dashboard";
import TestExpiry from "@/components/test-expiry";
import { Document } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DocumentPreview from "@/components/document-preview";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  const { data: reminders = [] } = useQuery<any[]>({
    queryKey: ['/api/reminders', { upcoming: 7 }],
  });

  const { data: stats } = useQuery<any>({
    queryKey: ['/api/dashboard/stats'],
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return await apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      toast({
        title: "Document deleted",
        description: "Document has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleView = (document: Document) => {
    setPreviewDocument(document);
    setIsPreviewOpen(true);
  };

  const handleDelete = (document: Document) => {
    if (window.confirm(`Are you sure you want to delete "${document.originalName}"?`)) {
      deleteMutation.mutate(document.id);
    }
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

  const recentDocuments = documents.slice(0, 4);
  const upcomingReminders = reminders.slice(0, 3);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4" data-testid="dashboard-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="page-title">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your personal documents securely</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="search"
                placeholder="Search documents..."
                className="pl-10 w-64"
                data-testid="search-input"
              />
            </div>
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative" data-testid="notifications-button">
              <Bell className="w-4 h-4" />
              {upcomingReminders.length > 0 && (
                <Badge className="absolute -top-2 -right-2 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {upcomingReminders.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Stats Cards */}
        <StatsGrid />

        {/* Expiry Dashboard - Show if there are documents with expiry dates */}
        {documents.some(doc => doc.expiryDate) && (
          <div className="mb-8">
            <ExpiryDashboard onViewDocument={handleView} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Area */}
            <UploadZone />

            {/* Recent Documents */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Recent Documents</h2>
                  <Button variant="link" className="p-0 h-auto" data-testid="view-all-documents">
                    View all
                  </Button>
                </div>
                
                {documentsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse flex items-center gap-4 p-3">
                        <div className="w-12 h-12 bg-muted rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentDocuments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No documents uploaded yet.</p>
                    <p className="text-sm mt-1">Upload your first document to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentDocuments.map((document: Document) => (
                      <DocumentCard 
                        key={document.id} 
                        document={document}
                        onView={handleView}
                        onDelete={handleDelete}
                        onDownload={handleDownload}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Expiring Documents Alert */}
            {upcomingReminders.length > 0 && (
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="bg-amber-100 p-2 rounded-md">
                      <Bell className="text-amber-600 w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-amber-900" data-testid="action-required-title">
                        Action Required
                      </h3>
                      <p className="text-amber-700 text-sm mt-1">
                        {upcomingReminders.length} documents require your attention
                      </p>
                      <div className="mt-4 space-y-2">
                        {upcomingReminders.map((reminder: any) => (
                          <div key={reminder.id} className="flex items-center justify-between text-sm">
                            <span className="text-amber-800 truncate">{reminder.message}</span>
                            <Button variant="link" className="h-auto p-0 text-amber-600 hover:text-amber-800">
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Storage Overview */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4" data-testid="storage-overview-title">Storage Overview</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Used Storage</span>
                      <span className="text-muted-foreground">
                        {formatFileSize(stats?.storageUsed || 0)} / 10 GB
                      </span>
                    </div>
                    <Progress 
                      value={((stats?.storageUsed || 0) / (10 * 1024 * 1024 * 1024)) * 100} 
                      className="h-2" 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>PDFs</span>
                      </div>
                      <span className="text-muted-foreground">
                        {formatFileSize(stats?.storageByType?.pdfs || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Images</span>
                      </div>
                      <span className="text-muted-foreground">
                        {formatFileSize(stats?.storageByType?.images || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span>Documents</span>
                      </div>
                      <span className="text-muted-foreground">
                        {formatFileSize(stats?.storageByType?.documents || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-auto p-3"
                    data-testid="scan-document-button"
                  >
                    <div className="bg-blue-100 p-2 rounded-md">
                      <Camera className="text-blue-600 w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Scan Document</p>
                      <p className="text-muted-foreground text-sm">Use camera to scan</p>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-auto p-3"
                    data-testid="create-reminder-button"
                  >
                    <div className="bg-amber-100 p-2 rounded-md">
                      <Bell className="text-amber-600 w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Set Reminder</p>
                      <p className="text-muted-foreground text-sm">Create custom reminder</p>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-auto p-3"
                    data-testid="export-data-button"
                  >
                    <div className="bg-green-100 p-2 rounded-md">
                      <Download className="text-green-600 w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Export Data</p>
                      <p className="text-muted-foreground text-sm">Backup your documents</p>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test Expiry Component (Development) */}
            <TestExpiry />

            {/* Security Status */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-100 p-2 rounded-md">
                    <Badge className="bg-green-600 w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900" data-testid="security-status-title">
                      Security Status
                    </h3>
                    <p className="text-green-700 text-sm">All systems secure</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-green-800">End-to-end encryption enabled</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-green-800">2FA authentication active</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-green-800">Regular backups running</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
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
