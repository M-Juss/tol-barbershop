"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Bell,
  CalendarPlus,
  History,
  House,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type CustomerBottomNavigationProps = {
  unreadCount: number;
  scrollContainerRef: RefObject<HTMLElement | null>;
};

const items = [
  {
    key: "history",
    href: "/customer/history",
    label: "History",
    icon: History,
  },
  {
    key: "home",
    href: "/customer",
    label: "Home",
    icon: House,
  },
  {
    key: "booking",
    href: "/customer/appointment",
    label: "Booking",
    icon: CalendarPlus,
    primary: true,
  },
  {
    key: "notification",
    href: "/customer/notification",
    label: "Notification",
    icon: Bell,
    hasBadge: true,
  },
  {
    key: "profile",
    href: "/customer/profile",
    label: "Profile",
    icon: UserRound,
  },
];

export function CustomerBottomNavigation({
  unreadCount,
  scrollContainerRef,
}: CustomerBottomNavigationProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let animationFrame = 0;
    lastScrollTopRef.current = scrollContainer.scrollTop;

    const handleScroll = () => {
      if (animationFrame) return;

      animationFrame = window.requestAnimationFrame(() => {
        const currentScrollTop = scrollContainer.scrollTop;
        const difference = currentScrollTop - lastScrollTopRef.current;
        const maximumScrollTop =
          scrollContainer.scrollHeight - scrollContainer.clientHeight;
        const isAtBottom =
          maximumScrollTop > 16 && currentScrollTop >= maximumScrollTop - 2;

        if (isAtBottom) {
          setIsVisible(false);
          lastScrollTopRef.current = currentScrollTop;
        } else if (currentScrollTop <= 16) {
          setIsVisible(true);
          lastScrollTopRef.current = currentScrollTop;
        } else if (difference > 8) {
          setIsVisible(false);
          lastScrollTopRef.current = currentScrollTop;
        } else if (difference < -8) {
          setIsVisible(true);
          lastScrollTopRef.current = currentScrollTop;
        }

        animationFrame = 0;
      });
    };

    scrollContainer.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [scrollContainerRef]);

  const isActive = (href: string) =>
    href === "/customer"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div
      className={cn(
        "fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md transition-transform duration-300 ease-out motion-reduce:transition-none md:hidden",
        isVisible
          ? "translate-y-0"
          : "translate-y-[calc(100%+2rem+env(safe-area-inset-bottom))]",
      )}
    >
      <nav
        aria-label="Customer navigation"
        className="grid h-[4.5rem] grid-cols-5 rounded-2xl bg-primary px-1 shadow-2xl shadow-slate-950/30 ring-1 ring-white/10"
      >
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          if (item.primary) {
            return (
              <div
                key={item.key}
                className="relative flex h-full items-center justify-center"
              >
                <Link
                  href={item.href}
                  onClick={() => setIsVisible(true)}
                  aria-current={active ? "page" : undefined}
                  className="absolute -top-5 flex min-w-16 flex-col items-center gap-1 text-primary-foreground"
                >
                  <span
                    className={cn(
                      "flex size-16 items-center justify-center rounded-full border-4 border-slate-100 bg-accent text-accent-foreground shadow-lg shadow-black/25 transition-transform active:scale-95",
                      active && "ring-2 ring-accent ring-offset-2 ring-offset-primary",
                    )}
                  >
                    <Icon className="size-6" strokeWidth={2.2} />
                  </span>
                  <span className="text-[10px] font-semibold leading-none">
                    {item.label}
                  </span>
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setIsVisible(true)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-primary-foreground/60 transition-colors",
                active && "text-white",
              )}
            >
              <span className="relative">
                <Icon className="size-5" strokeWidth={active ? 2.4 : 1.9} />
                {item.hasBadge && unreadCount > 0 ? (
                  <span className="absolute -right-3 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-accent px-1 py-0.5 text-[8px] font-bold leading-none text-accent-foreground ring-2 ring-primary">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </span>
              <span className="max-w-full truncate text-[9px] font-medium leading-none">
                {item.label}
              </span>
              {active ? (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
