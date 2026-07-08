"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRealtimeEvent } from "@/contexts/RealtimeContext";
import {
  getAppointments,
  type Appointment,
  type AppointmentStatus,
} from "@/services/customer/appointment.api";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/common/SectionCard";
import { AppointmentStatusBadge } from "@/components/common/AppointmentStatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { formatBookingId } from "@/lib/booking";
import { cn } from "@/lib/utils";
import { Star, User as UserIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type StatusFilter = "all" | AppointmentStatus;

type Row = {
  id: number;
  service: string;
  barber: string;
  barber_id: number | null;
  date: string;
  time: string;
  status: AppointmentStatus;
  price: number;
  created_at: string;
  cancellation_reason: string | null;
  feedback: {
    rating: number | null;
    comment: string | null;
    submitted_at: string | null;
  } | null;
  customer_name: string | null;
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function MyAppointment() {
  const { user: authUser } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const pageSize = 10;

  const fetchAppointments = useCallback(async () => {
    try {
      const currentUserId = authUser?.id;
      const data = await getAppointments();

      const mapped = data
        .filter((appt) =>
          currentUserId ? appt.customer.id === currentUserId : true,
        )
        .map((appt: Appointment) => ({
          id: appt.id,
          service: appt.customer_name
            ? `${appt.service.name ?? "Unknown service"} (${appt.customer_name})`
            : (appt.service.name ?? "Unknown service"),
          barber: appt.barber.fullname ?? "Unknown barber",
          barber_id: appt.barber.id,
          date: formatDate(appt.appointment_date),
          time: formatTime(appt.appointment_time),
          status: appt.status,
          price: Number(appt.price) || 0,
          created_at: appt.created_at,
          cancellation_reason: appt.cancellation_reason,
          feedback: appt.feedback
            ? {
                rating: appt.feedback.rating,
                comment: appt.feedback.comment,
                submitted_at: appt.feedback.submitted_at,
              }
            : null,
          customer_name: appt.customer_name ?? null,
        }))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

      setRows(mapped);
    } catch (error) {
      console.error("Failed to load appointments:", error);
    } finally {
      setLoading(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  useRealtimeEvent('appointments', fetchAppointments);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus =
        statusFilter === "all" || row.status === statusFilter;
      const matchesSearch =
        !keyword ||
        row.service.toLowerCase().includes(keyword) ||
        row.barber.toLowerCase().includes(keyword) ||
        String(row.id).includes(keyword) ||
        (row.customer_name ?? "").toLowerCase().includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 pb-24 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Appointments</h1>
        <p className="text-gray-500 mt-1">
          View and manage your appointments
        </p>
      </div>

      <SectionCard title="Filters" className="mb-4 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by booking ID, service, barber"
            className="w-full sm:w-3/4"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-full sm:w-1/4 border-gray-300">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="no_show">No-show</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      <div className="space-y-3">
        <div className="block md:hidden space-y-3">
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-400 text-sm">
              Loading appointments...
            </div>
          ) : paginatedRows.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-400 text-sm">
              No appointments found.
            </div>
          ) : (
            paginatedRows.map((row) => (
              <div
                key={row.id}
                onClick={() => setSelectedRow(row)}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2 cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 text-sm">
                    {formatBookingId(row.id)}
                  </span>
                  <AppointmentStatusBadge status={row.status} />
                </div>
                <p className="text-sm text-gray-900 font-medium">{row.service}</p>
                <p className="text-xs text-gray-500">Barber: {row.barber}</p>
                <p className="text-xs text-gray-500">
                  {row.date} · {row.time}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">
                    ₱{row.price.toFixed(2)}
                  </span>
                  {row.cancellation_reason ? (
                    <span className="text-xs text-gray-500 truncate max-w-[150px]" title={row.cancellation_reason}>
                      {row.cancellation_reason}
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Barber</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="text-gray-500" colSpan={7}>
                    Loading appointments...
                  </TableCell>
                </TableRow>
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell className="text-gray-500" colSpan={7}>
                    No appointments found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow key={row.id} className="group relative cursor-pointer" onClick={() => setSelectedRow(row)}>
                    <TableCell>{formatBookingId(row.id)}</TableCell>
                    <TableCell>{row.service}</TableCell>
                    <TableCell>{row.barber}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.time}</TableCell>
                    <TableCell>₱{row.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="relative inline-block">
                        <AppointmentStatusBadge status={row.status} />
                        {row.cancellation_reason ? (
                          <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-max max-w-64 -translate-x-1/2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 shadow-md group-hover:block">
                            Reason: {row.cancellation_reason}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredRows.length > pageSize ? (
          <Pagination className="overflow-hidden px-1">
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

      <Dialog open={selectedRow !== null} onOpenChange={(open) => { if (!open) setSelectedRow(null); }}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-[480px] sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Appointment Detail
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Booking {formatBookingId(selectedRow?.id ?? 0)}
            </DialogDescription>
          </DialogHeader>

          {selectedRow && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="bg-primary/10 rounded-full p-3">
                  <UserIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Barber</p>
                  <p className="font-semibold text-gray-900 text-lg">{selectedRow.barber}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Service</p>
                  <p className="font-medium text-gray-900">{selectedRow.service}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Price</p>
                  <p className="font-medium text-gray-900">₱{selectedRow.price.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Date</p>
                  <p className="font-medium text-gray-900">{selectedRow.date}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Time</p>
                  <p className="font-medium text-gray-900">{selectedRow.time}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Status</p>
                <AppointmentStatusBadge status={selectedRow.status} />
              </div>

              {selectedRow.feedback && (
                <div className="space-y-3 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">Your Feedback</p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn("w-4 h-4", star <= (selectedRow.feedback?.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "fill-white text-gray-300")}
                        />
                      ))}
                    </div>
                  </div>
                  {selectedRow.feedback.comment && (
                    <p className="text-sm text-gray-600 italic">&quot;{selectedRow.feedback.comment}&quot;</p>
                  )}
                  <p className="text-xs text-gray-400">
                    Submitted {selectedRow.feedback.submitted_at ? new Date(selectedRow.feedback.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
