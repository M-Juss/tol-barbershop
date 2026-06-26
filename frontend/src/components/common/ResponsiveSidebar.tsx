"use client";
import { useState, useEffect } from "react";
import { Menu, X, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badgeCount?: number;
};

interface ResponsiveSidebarProps {
  navItems: NavItem[];
}

export function ResponsiveSidebar({ navItems }: ResponsiveSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const sidebar = document.getElementById("mobile-sidebar");
      const backdrop = document.getElementById("sidebar-backdrop");
      const hamburger = document.getElementById("hamburger-button");

      if (
        isOpen &&
        isMobile &&
        sidebar &&
        !sidebar.contains(target) &&
        backdrop &&
        !backdrop.contains(target) &&
        hamburger &&
        !hamburger.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen && isMobile) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, isMobile]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, isMobile]);

  const totalBadgeCount = navItems.reduce((sum, item) => sum + (item.badgeCount ?? 0), 0);

  const handleNavClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const handleLogout = async () => {
    setShowLogoutDialog(false);
    setIsOpen(false);
    await logout();
    router.push("/");
  };

  return (
    <>
      {/* Hamburger Menu Button - Mobile Only */}
      <button
        id="hamburger-button"
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary text-primary-foreground hover:bg-slate-800 transition-colors shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
        {totalBadgeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white ring-2 ring-white">
            {totalBadgeCount > 99 ? "99+" : totalBadgeCount}
          </span>
        )}
      </button>

      {/* Mobile Backdrop */}
      {isOpen && isMobile && (
        <div
          id="sidebar-backdrop"
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="mobile-sidebar"
        className={`
          fixed md:sticky top-0 left-0 z-50 md:z-10
          h-dvh w-64 shrink-0 bg-primary text-sm
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          flex flex-col
        `}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between p-4 border-b border-slate-600">
          <div className="flex space-x-2 items-center">
            <Image src="/logo.svg" alt="Logo" height={40} width={40} />
            <h1 className="font-bold text-primary-foreground text-xl">
              Tols Barbershop
            </h1>
          </div>
          {/* Close Button - Mobile Only */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-800 text-primary-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overscroll-contain">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={handleNavClick}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${
                  pathname === item.href
                    ? "bg-slate-800 text-white"
                    : "text-gray-300 hover:bg-slate-800 hover:text-white"
                }
              `}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badgeCount && item.badgeCount > 0 ? (
                <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {item.badgeCount > 99 ? "99+" : item.badgeCount}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        {/* Logout Section */}
        <div className="p-3 border-t border-slate-600">
          <button
            type="button"
            onClick={() => setShowLogoutDialog(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-800 hover:text-white transition-colors w-full  "
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out of your account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleLogout}>
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
