"use client";
import { useState, useEffect } from "react";
import { Menu, X, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PushNotificationControl } from "@/components/common/PushNotificationControl";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badgeCount?: number;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

type ResponsiveSidebarProps = {
  sections: NavSection[];
  mobileMode?: "drawer" | "desktop-only";
};

export function ResponsiveSidebar({
  sections,
  mobileMode = "drawer",
}: ResponsiveSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const hasMobileDrawer = mobileMode === "drawer";

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

    if (hasMobileDrawer && isOpen && isMobile) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [hasMobileDrawer, isOpen, isMobile]);

  useEffect(() => {
    if (hasMobileDrawer && isOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [hasMobileDrawer, isOpen, isMobile]);

  const totalBadgeCount = sections.reduce(
    (sum, section) =>
      sum + section.items.reduce((s, item) => s + (item.badgeCount ?? 0), 0),
    0,
  );

  const handleNavClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      setIsLoggingOut(false);
      toast.error("Logout failed. Please try again.");
    }
  };

  return (
    <>
      {hasMobileDrawer && (
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
      )}

      {hasMobileDrawer && isOpen && isMobile && (
        <div
          id="sidebar-backdrop"
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        id="mobile-sidebar"
        className={`
          fixed md:sticky top-0 left-0 z-50 md:z-10
          h-dvh w-64 shrink-0 bg-primary text-sm
          transform transition-transform duration-300 ease-in-out
          ${
            hasMobileDrawer
              ? isOpen
                ? "flex translate-x-0"
                : "flex -translate-x-full md:translate-x-0"
              : "hidden md:flex md:translate-x-0"
          }
          flex-col
        `}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-600">
          <div className="flex space-x-2 items-center">
            <Image
              src="/tol-rounded-logo.png"
              alt="TOL Barbershop logo"
              height={35}
              width={35}
              className="rounded-3xl shadow-md shadow-black/20"
            />
            <h1 className="font-bold text-primary-foreground text-xl">
              TOL Barbershop
            </h1>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-800 text-primary-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto overscroll-contain">
          {sections.map((section) => (
            <div key={section.label} className="mb-4 last:mb-0">
              <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {section.label}
              </p>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={handleNavClick}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors
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
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-600">
          <PushNotificationControl />
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

      <Dialog
        open={showLogoutDialog}
        onOpenChange={(open) => {
          if (!isLoggingOut) setShowLogoutDialog(open);
        }}
      >
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
              disabled={isLoggingOut}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
