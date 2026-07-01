import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Phone, User } from "lucide-react";
import { WalkinForm } from "@/forms/WalkinForm";
import {
  getAppointments,
  type Appointment,
} from "@/services/admin/appointment.api";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type WalkinAppointment = Appointment & {
  is_walkin: boolean;
};

function timeAgo(value: string): string {
  const date = new Date(value);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `about ${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `about ${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

function WalkInCard({ walkin }: { walkin: WalkinAppointment }) {
  const price = Number(walkin.price || 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-gray-900 text-sm">
                {walkin.customer.fullname ?? "Walk-in Customer"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm text-gray-500">
                {walkin.customer.contact_number ?? "N/A"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
            <span>Service: {walkin.service.name ?? "Unknown"}</span>
            <span className="text-gray-300">•</span>
            <span>Barber: {walkin.barber.fullname ?? "Unknown"}</span>
          </div>
          {walkin.notes ? (
            <p className="text-xs text-gray-500 mt-1">Notes: {walkin.notes}</p>
          ) : null}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>
              Completed {timeAgo(walkin.completed_at ?? walkin.created_at)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <p className="text-sm font-semibold text-gray-900">
            ₱
            {price.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <span className="flex-shrink-0 text-xs font-medium px-3 py-1 rounded-full bg-green-100 text-green-600 capitalize">
            {walkin.status.replace("_", " ")}
          </span>
        </div>
      </div>
    </div>
  );
}

export function Walkin() {
  const [walkins, setWalkins] = useState<WalkinAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.max(1, Math.ceil(walkins.length / pageSize));

  const paginatedWalkins = useMemo(() => {
    const start = (page - 1) * pageSize;
    return walkins.slice(start, start + pageSize);
  }, [walkins, page]);

  const loadWalkins = async () => {
    try {
      setLoading(true);
      const appointments = (await getAppointments()) as WalkinAppointment[];
      const walkinData = appointments.filter(
        (appointment) => appointment.is_walkin,
      );
      setWalkins(walkinData);
    } catch (error) {
      console.error("Failed to load walk-ins:", error);
      setWalkins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWalkins();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [walkins.length]);

  return (
    <div className="w-full bg-slate-100 p-4 sm:p-6 pb-12 sm:pb-10 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Walk-ins
        </h1>
        <p className="text-gray-500 mt-1">
          Record walk-in appointments and view history
        </p>
      </div>

      <WalkinForm onSuccess={loadWalkins} />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900">Walk-in History</h2>
        <p className="text-sm text-gray-400 mb-4">
          Recent walk-in appointments ({walkins.length} total)
        </p>

        {loading ? (
          <p className="text-sm text-gray-500">Loading walk-in history...</p>
        ) : walkins.length === 0 ? (
          <p className="text-sm text-gray-500">
            No walk-in appointments found.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {paginatedWalkins.map((walkin) => (
              <WalkInCard key={walkin.id} walkin={walkin} />
            ))}
          </div>
        )}

        {walkins.length > pageSize ? (
          <Pagination className="mt-4 overflow-hidden px-1">
            <PaginationContent className="flex-nowrap gap-0.5">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  className="h-8 w-8 sm:h-9 sm:w-auto"
                  text=""
                  onClick={(event) => {
                    event.preventDefault();
                    setPage((prev) => Math.max(1, prev - 1));
                  }}
                />
              </PaginationItem>
              {(() => {
                const pages: (number | "...")[] = [];
                const total = totalPages;
                const current = page;
                pages.push(1);
                if (current > 3) pages.push("...");
                const start = Math.max(2, current - 1);
                const end = Math.min(total - 1, current + 1);
                for (let i = start; i <= end; i++) pages.push(i);
                if (current < total - 2) pages.push("...");
                if (total > 1) pages.push(total);
                return pages.map((pageNo, idx) =>
                  pageNo === "..." ? (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis className="size-7 sm:size-8" />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={pageNo}>
                      <PaginationLink
                        href="#"
                        isActive={pageNo === current}
                        className="h-7 w-7 sm:h-8 sm:w-8 text-xs sm:text-sm font-medium rounded-lg"
                        onClick={(event) => {
                          event.preventDefault();
                          setPage(pageNo);
                        }}
                      >
                        {pageNo}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                );
              })()}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  className="h-8 w-8 sm:h-9 sm:w-auto"
                  text=""
                  onClick={(event) => {
                    event.preventDefault();
                    setPage((prev) => Math.min(totalPages, prev + 1));
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        ) : null}
      </div>
    </div>
  );
}
