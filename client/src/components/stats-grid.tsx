import { FileText, AlertTriangle, HardDrive, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export default function StatsGrid() {
  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ['/api/dashboard/stats'],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-8 bg-muted rounded w-12"></div>
                </div>
                <div className="w-12 h-12 bg-muted rounded-lg"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const statsData = [
    {
      title: "Total Documents",
      value: stats?.totalDocuments || 0,
      icon: FileText,
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      title: "Expiring Soon",
      value: stats?.expiringSoon || 0,
      icon: AlertTriangle,
      bgColor: "bg-amber-100",
      iconColor: "text-amber-600",
      valueColor: "text-amber-600",
    },
    {
      title: "Storage Used",
      value: formatFileSize(stats?.storageUsed || 0),
      icon: HardDrive,
      bgColor: "bg-accent/10",
      iconColor: "text-accent",
    },
    {
      title: "Security Score",
      value: "98%",
      icon: Shield,
      bgColor: "bg-accent/10",
      iconColor: "text-accent",
      valueColor: "text-accent",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsData.map((stat, index) => {
        const Icon = stat.icon;
        
        return (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm" data-testid={`stat-title-${index}`}>
                    {stat.title}
                  </p>
                  <p 
                    className={`text-2xl font-semibold mt-1 ${stat.valueColor || ""}`}
                    data-testid={`stat-value-${index}`}
                  >
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className={`${stat.iconColor} w-6 h-6`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
