import { useState } from "react";
import { Bell, Calendar, Plus, Clock, AlertTriangle, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isToday, isTomorrow, addDays } from "date-fns";

export default function Reminders() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [reminderMessage, setReminderMessage] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [selectedDocument, setSelectedDocument] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading: remindersLoading } = useQuery<any[]>({
    queryKey: ['/api/reminders'],
  });

  const { data: documents = [] } = useQuery<any[]>({
    queryKey: ['/api/documents'],
  });

  const createReminderMutation = useMutation({
    mutationFn: async (reminderData: any) => {
      const response = await apiRequest("POST", "/api/reminders", reminderData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reminder created",
        description: "Your reminder has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
      setIsCreateDialogOpen(false);
      setReminderMessage("");
      setReminderDate("");
      setSelectedDocument("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create reminder",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateReminderMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/reminders/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reminder updated",
        description: "The reminder has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reminders'] });
    },
  });

  const handleCreateReminder = () => {
    if (!reminderMessage.trim() || !reminderDate) {
      toast({
        title: "Missing information",
        description: "Please provide both a message and date for the reminder.",
        variant: "destructive",
      });
      return;
    }

    createReminderMutation.mutate({
      message: reminderMessage,
      reminderDate: new Date(reminderDate).toISOString(),
      documentId: selectedDocument || null,
    });
  };

  const handleMarkAsRead = (reminderId: string) => {
    updateReminderMutation.mutate({
      id: reminderId,
      updates: { isActive: false },
    });
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "MMM d, yyyy");
  };

  const getUrgencyBadge = (reminderDate: Date) => {
    const now = new Date();
    const diffInDays = Math.ceil((reminderDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays < 0) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else if (diffInDays === 0) {
      return <Badge variant="destructive">Due Today</Badge>;
    } else if (diffInDays <= 7) {
      return <Badge variant="secondary">Due Soon</Badge>;
    }

    return <Badge variant="outline">Upcoming</Badge>;
  };

  // Group reminders by urgency
  const now = new Date();
  const overdueReminders = reminders.filter((r: any) => new Date(r.reminderDate) < now && r.isActive);
  const todayReminders = reminders.filter((r: any) => isToday(new Date(r.reminderDate)) && r.isActive);
  const upcomingReminders = reminders.filter((r: any) => 
    new Date(r.reminderDate) > addDays(now, 0) && r.isActive
  );

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="page-title">Reminders</h1>
            <p className="text-muted-foreground mt-1">
              Manage your document reminders and notifications
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-reminder-button">
                <Plus className="w-4 h-4 mr-2" />
                Create Reminder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Reminder</DialogTitle>
                <DialogDescription>
                  Set up a reminder to keep track of important document-related tasks.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reminder-message">Reminder Message</Label>
                  <Textarea
                    id="reminder-message"
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    placeholder="What would you like to be reminded about?"
                    data-testid="reminder-message-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reminder-date">Reminder Date</Label>
                  <Input
                    id="reminder-date"
                    type="datetime-local"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    data-testid="reminder-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document-select">Associated Document (Optional)</Label>
                  <select
                    id="document-select"
                    value={selectedDocument}
                    onChange={(e) => setSelectedDocument(e.target.value)}
                    className="w-full p-2 border border-border rounded-md bg-background"
                    data-testid="document-select"
                  >
                    <option value="">Select a document...</option>
                    {documents.map((doc: any) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.originalName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateReminder}
                  disabled={createReminderMutation.isPending}
                  data-testid="save-reminder-button"
                >
                  {createReminderMutation.isPending ? "Creating..." : "Create Reminder"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Reminders Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {remindersLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-muted rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Overdue Reminders */}
              {overdueReminders.length > 0 && (
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      Overdue ({overdueReminders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {overdueReminders.map((reminder: any) => (
                      <div key={reminder.id} className="flex items-start gap-4 p-4 border rounded-lg bg-destructive/5">
                        <div className="bg-destructive/10 p-2 rounded-md">
                          <Bell className="text-destructive w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{reminder.message}</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {getDateLabel(new Date(reminder.reminderDate))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getUrgencyBadge(new Date(reminder.reminderDate))}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsRead(reminder.id)}
                            data-testid={`mark-read-${reminder.id}`}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Today's Reminders */}
              {todayReminders.length > 0 && (
                <Card className="border-amber-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-700">
                      <Clock className="w-5 h-5" />
                      Due Today ({todayReminders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {todayReminders.map((reminder: any) => (
                      <div key={reminder.id} className="flex items-start gap-4 p-4 border rounded-lg bg-amber-50">
                        <div className="bg-amber-100 p-2 rounded-md">
                          <Bell className="text-amber-600 w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{reminder.message}</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {format(new Date(reminder.reminderDate), "h:mm a")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getUrgencyBadge(new Date(reminder.reminderDate))}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsRead(reminder.id)}
                            data-testid={`mark-read-${reminder.id}`}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Upcoming Reminders */}
              {upcomingReminders.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Upcoming ({upcomingReminders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {upcomingReminders.map((reminder: any) => (
                      <div key={reminder.id} className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="bg-primary/10 p-2 rounded-md">
                          <Bell className="text-primary w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{reminder.message}</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {getDateLabel(new Date(reminder.reminderDate))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getUrgencyBadge(new Date(reminder.reminderDate))}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkAsRead(reminder.id)}
                            data-testid={`mark-read-${reminder.id}`}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {reminders.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No reminders set</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first reminder to keep track of important document tasks.
                    </p>
                    <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="create-first-reminder">
                      Create Your First Reminder
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
