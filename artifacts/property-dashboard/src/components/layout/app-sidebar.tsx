import { Link, useRoute, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Wrench, 
  Hammer,
  PoundSterling,
  LogOut
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Properties", url: "/properties", icon: Building2 },
  { title: "Tenants", url: "/tenants", icon: Users },
  { title: "Rent Accounts", url: "/rent", icon: PoundSterling },
  { title: "Maintenance", url: "/maintenance", icon: Wrench },
  { title: "Refurb Tracker", url: "/refurb", icon: Hammer },
];

function NavLink({ item }: { item: typeof navItems[0] }) {
  const [isActive] = useRoute(item.url);
  
  return (
    <SidebarMenuItem>
      <SidebarMenuButton 
        asChild 
        isActive={isActive} 
        tooltip={item.title}
        className="transition-all duration-200"
      >
        <Link href={item.url}>
          <item.icon className="h-4 w-4" />
          <span className="font-medium">{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { logout, user } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="flex h-16 items-center justify-center border-b border-sidebar-border/50 px-4 py-0">
        <div className="flex w-full items-center gap-3">
          <img 
            src={`${import.meta.env.BASE_URL}images/logo.png`} 
            alt="Logo" 
            className="h-8 w-8 rounded-md bg-white p-1"
          />
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="truncate font-display font-bold leading-none text-sidebar-foreground">BlackRidge</span>
            <span className="truncate text-[10px] text-sidebar-foreground/60">Portfolio Manager</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-sidebar-foreground/50">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <NavLink key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/50 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="group-data-[collapsible=icon]:hidden px-2 py-1 mb-1">
              <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40">Signed in as</p>
              <p className="text-xs font-medium text-sidebar-foreground/70 capitalize">{user?.username}</p>
            </div>
            <SidebarMenuButton
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
