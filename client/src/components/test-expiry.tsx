import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Document } from "@shared/schema";

export default function TestExpiry() {
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [expiryDate, setExpiryDate] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  const addExpiryMutation = useMutation({
    mutationFn: async ({ docId, expiry }: { docId: string; expiry: string }) => {
      return await apiRequest("POST", `/api/documents/${docId}/test-expiry`, {
        expiryDate: expiry
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Success",
        description: "Expiry date added to document for testing",
      });
      setSelectedDocId("");
      setExpiryDate("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add expiry date",
        variant: "destructive",
      });
    },
  });

  const handleAddExpiry = () => {
    if (!selectedDocId || !expiryDate) {
      toast({
        title: "Error",
        description: "Please select a document and enter an expiry date",
        variant: "destructive",
      });
      return;
    }
    addExpiryMutation.mutate({ docId: selectedDocId, expiry: expiryDate });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-sm">🧪 Test Expiry Dates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Select Document:</label>
          <select 
            className="w-full mt-1 p-2 border rounded"
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
          >
            <option value="">Choose a document...</option>
            {documents.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.originalName} {doc.expiryDate ? '(Has expiry)' : ''}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="text-sm font-medium">Expiry Date:</label>
          <Input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="mt-1"
          />
        </div>
        
        <Button 
          onClick={handleAddExpiry}
          disabled={addExpiryMutation.isPending}
          className="w-full"
          size="sm"
        >
          {addExpiryMutation.isPending ? "Adding..." : "Add Test Expiry"}
        </Button>
        
        <p className="text-xs text-muted-foreground">
          This is for testing the expiry dashboard functionality
        </p>
      </CardContent>
    </Card>
  );
}
