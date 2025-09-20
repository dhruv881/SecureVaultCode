import { useState } from "react";
import { Calendar, FileText, Tag, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import UploadZone from "@/components/upload-zone";
import OcrInfo from "@/components/ocr-info";
import { Document } from "@shared/schema";

export default function Upload() {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  const createReminderMutation = useMutation({
    mutationFn: async (reminderData: any) => {
      const response = await apiRequest("POST", "/api/reminders", reminderData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reminder created",
        description: "You'll be notified when this document needs attention.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
    },
  });

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleUploadSuccess = (document: Document) => {
    setUploadedDocuments([document, ...uploadedDocuments]);
    
    // Create automatic reminders if expiry date is set
    if (expiryDate) {
      const expiryDateTime = new Date(expiryDate);
      const reminderDates = [
        { days: 90, label: "3 months" },
        { days: 30, label: "1 month" },
        { days: 7, label: "1 week" },
      ];

      reminderDates.forEach(({ days, label }) => {
        const reminderDate = new Date(expiryDateTime);
        reminderDate.setDate(reminderDate.getDate() - days);

        if (reminderDate > new Date()) {
          createReminderMutation.mutate({
            documentId: document.id,
            reminderDate: reminderDate.toISOString(),
            message: `${document.originalName} expires in ${label}`,
          });
        }
      });
    }

    // Reset form
    setSelectedCategory("");
    setExpiryDate("");
    setTags([]);
    setNotes("");
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="page-title">Upload Documents</h1>
          <p className="text-muted-foreground mt-1">
            Securely upload and organize your important documents
          </p>
        </div>
      </header>

      {/* Upload Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Upload Zone */}
          <UploadZone 
            onUploadSuccess={handleUploadSuccess}
            category={selectedCategory}
            expiryDate={expiryDate}
            tags={tags}
          />

          {/* Upload Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Selection */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger data-testid="category-select">
                      <SelectValue placeholder="Select category (auto-detected)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category: any) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Expiry Date */}
                <div className="space-y-2">
                  <Label htmlFor="expiry-date">Expiry Date (Optional)</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="expiry-date"
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="pl-10"
                      data-testid="expiry-date-input"
                    />
                  </div>
                </div>

                {/* OCR Info */}
                <OcrInfo />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Add a tag..."
                      className="pl-10"
                      data-testid="tag-input"
                    />
                  </div>
                  <Button onClick={addTag} size="sm" data-testid="add-tag-button">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes about this document..."
                  className="min-h-[100px]"
                  data-testid="notes-textarea"
                />
              </div>
            </CardContent>
          </Card>

          {/* Recently Uploaded */}
          {uploadedDocuments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recently Uploaded</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {uploadedDocuments.slice(0, 5).map((document) => (
                    <div key={document.id} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="bg-green-100 p-2 rounded-md">
                        <FileText className="text-green-600 w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{document.originalName}</p>
                        <p className="text-sm text-muted-foreground">{document.category}</p>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Uploaded
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
