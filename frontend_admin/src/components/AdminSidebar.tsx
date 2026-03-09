"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Car,
  Receipt,
  MapPinned,
  Settings,
  LogOut,
  Shield,
  ChevronDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Users",
    icon: Users,
    href: "/dashboard/users",
  },
  {
    title: "Vehicles",
    icon: Car,
    href: "/dashboard/vehicles",
  },
  {
    title: "Transactions",
    icon: Receipt,
    href: "/dashboard/transactions",
  },
  {
    title: "Toll Zones",
    icon: MapPinned,
    href: "/dashboard/toll-zones",
  },
  {
    title: "Vehicle Rates",
    icon: Settings,
    href: "/dashboard/vehicle-rates",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { admin, logout } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Shield className="h-4 w-4" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold tracking-tight">Smart Toll</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Admin Panel</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>

          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                    className="text-base h-11 rounded-lg px-3 gap-3 transition-all duration-150 hover:bg-sidebar-accent"
                  >
                    <Link href={item.href}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full h-12 rounded-lg px-3 gap-3 text-base hover:bg-sidebar-accent transition-all duration-150">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-sm font-semibold bg-primary text-primary-foreground">
                      {admin?.username?.charAt(0).toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="truncate text-sm font-semibold leading-tight">{admin?.username || "Admin"}</span>
                    <span className="text-xs text-muted-foreground leading-tight">Administrator</span>
                  </div>
                  <ChevronDown className="ml-auto h-5 w-5 shrink-0 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-dropdown-menu-trigger-width] p-1"
              >
                <DropdownMenuItem onClick={logout} className="text-destructive text-base h-10 gap-2 rounded-md cursor-pointer">
                  <LogOut className="h-5 w-5" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
