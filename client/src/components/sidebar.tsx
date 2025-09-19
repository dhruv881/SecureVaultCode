import { Link, useLocation } from "wouter";
import { Shield, BarChart3, Upload, FolderOpen, Bell, IdCard, Receipt, Heart, Plane, ShieldCheck, FileText, Settings, User, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Sidebar() {
  const [location] = useLocation();
  
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  const { data: reminders = [] } = useQuery<any[]>({
    queryKey: ['/api/reminders', { upcoming: 30 }],
  });

  // Use centralized auth hook
  const { data: user } = useAuth();

  const activeRemindersCount = reminders.length;

  // Helper functions for user display
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/auth/logout');
      queryClient.clear();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout by clearing cache and redirecting anyway
      queryClient.clear();
      window.location.href = '/login';
    }
  };

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
                    <span className="ml-auto text-xs">{category.count || 0}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-0 h-auto hover:bg-muted" data-testid="user-profile-dropdown">
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-medium">
                    {user ? getUserInitials(user.displayName || user.name || 'User') : 'U'}
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">
                    {user?.displayName || user?.name || 'Loading...'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user?.email || 'Loading...'}
                  </div>
                </div>
                <Settings className="w-4 h-4 text-muted-foreground" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} data-testid="logout-button">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
