import { Link, useLocation } from "wouter";
import { Shield, BarChart3, Upload, FolderOpen, Bell, IdCard, Receipt, Heart, Plane, ShieldCheck, FileText, Settings, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

export default function Sidebar() {
  const [location] = useLocation();
  
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  const { data: reminders = [] } = useQuery<any[]>({
    queryKey: ['/api/reminders', { upcoming: 30 }],
  });

  const activeRemindersCount = reminders.length;

  const navigationItems = [
    { path: "/", label: "Dashboard", icon: BarChart3 },
    { path: "/upload", label: "Upload Documents", icon: Upload },
    { path: "/documents", label: "All Documents", icon: FolderOpen },
    { path: "/reminders", label: "Reminders", icon: Bell, badge: activeRemindersCount > 0 ? activeRemindersCount : undefined },
  ];

  const categoryIcons: Record<string, any> = {
    "Identity Documents": IdCard,
    "Bills & Utilities": FileText,
    "Medical Records": Heart,
    "Receipts": Receipt,
    "Travel Documents": Plane,
    "Insurance": ShieldCheck,
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col" data-testid="sidebar">
      {/* Logo & Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Shield className="text-primary-foreground w-4 h-4" />
          </div>
          <span className="font-semibold text-lg">SecureVault</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                data-testid={`nav-${item.path.replace('/', '') || 'dashboard'}`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
                {item.badge && (
                  <Badge variant="destructive" className="ml-auto text-xs">
                    {item.badge}
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}

        {/* Categories */}
        <div className="pt-4">
          <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Categories
          </h3>
          <div className="space-y-1">
            {categories.map((category: any) => {
              const Icon = categoryIcons[category.name] || FileText;
              
              return (
                <Link key={category.id} href={`/documents?category=${encodeURIComponent(category.name)}`}>
                  <div
                    className="flex items-center gap-3 px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors cursor-pointer"
                    data-testid={`category-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Icon className="w-4 h-4" />
                    {category.name}
                    <span className="ml-auto text-xs">{category.documentCount || 0}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-medium">JD</span>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">John Doe</div>
            <div className="text-xs text-muted-foreground">john@example.com</div>
          </div>
          <button className="text-muted-foreground hover:text-foreground" data-testid="settings-button">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
