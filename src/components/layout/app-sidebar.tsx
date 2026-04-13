"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  FileText,
  Receipt,
  Phone,
  Repeat,
  LogOut,
  Plus,
  ChevronUp,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const navItems = [
  {
    title: "Home",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Orders",
    href: "/orders",
    icon: ShoppingCart,
  },
  {
    title: "Leads",
    href: "/leads",
    icon: Users,
  },
  {
    title: "Quotations",
    href: "/quotations",
    icon: FileText,
    highlight: true,
  },
  {
    title: "Invoices",
    href: "/invoices",
    icon: Receipt,
  },
  {
    title: "Call Log",
    href: "/calls",
    icon: Phone,
  },
  {
    title: "Rentals",
    href: "/rentals",
    icon: Repeat,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <Sidebar className="border-r-0" style={{ "--sidebar-width": "15rem" } as React.CSSProperties}>
      {/* Logo / Brand */}
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500 shadow-lg">
            <span className="text-xs font-bold text-white tracking-tight">PP</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold leading-tight text-sidebar-foreground">
              Pulse Pilates
            </span>
            <span className="text-xs leading-tight" style={{ color: "var(--sidebar-muted-foreground)" }}>
              Dashboard
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={<Link href={item.href} />}
                      className={[
                        "relative h-9 rounded-lg px-3 text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-full before:bg-indigo-400"
                          : "text-slate-400 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        item.highlight && !isActive
                          ? "text-indigo-300"
                          : "",
                      ].join(" ")}
                    >
                      <item.icon
                        className={[
                          "h-4 w-4 flex-shrink-0",
                          isActive ? "text-white" : item.highlight ? "text-indigo-400" : "text-slate-400",
                        ].join(" ")}
                      />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick-add CTA */}
        <div className="mt-4 px-1">
          <Link
            href="/quotations"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-indigo-600 hover:shadow-md active:scale-95"
          >
            <Plus className="h-4 w-4" />
            New Quotation
          </Link>
        </div>
      </SidebarContent>

      {/* User footer */}
      <SidebarFooter className="px-2 py-3 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full">
                <SidebarMenuButton className="h-10 w-full rounded-lg px-3 text-sm font-medium text-slate-400 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-150">
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarFallback className="text-xs bg-indigo-500 text-white font-semibold">
                      M
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col text-left min-w-0 flex-1">
                    <span className="text-sm font-medium leading-tight text-sidebar-foreground">Michelle</span>
                    <span className="text-xs leading-tight" style={{ color: "var(--sidebar-muted-foreground)" }}>Owner</span>
                  </div>
                  <ChevronUp className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-48 mb-1">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
