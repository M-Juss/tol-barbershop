"use client";

import { useMemo, useState } from "react";

import { TablePagination } from "@/components/common/TablePagination";
import {
  type AppointmentHistoryStatusFilter,
  useAppointmentHistory,
} from "@/hooks/useAppointmentHistory";
import { type AppointmentStatus } from "@/services/customer/appointment.api";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBookingId } from "@/lib/booking";
import { cn } from "@/lib/utils";
import { Star, User as UserIcon } from "lucide-react";
import { formatTime12 } from "@/lib/time-slots";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Row = {
  id: number;
  service: string;
  barber: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  price: number;
  cancellation_reason: string | null;
  feedback: {
    rating: number | null;
    comment: string | null;
    submitted_at: string | null;
  } | null;
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MyAppointment() {
  const {
    appointments,
    meta,
    loading,
    refreshing,
    error,
    search,
    setSearch,
    status,
    setStatus,
    setPage,
    getPageHref,
  } = useAppointmentHistory();
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const rows = useMemo<Row[]>(
    () =>
      appointments.map((appointment) => ({
        id: appointment.id,
        service: appointment.customer_name
          ? `${appointment.service.name ?? "Unknown service"} (${appointment.customer_name})`
          : (appointment.service.name ?? "Unknown service"),
        barber: appointment.barber.fullname ?? "Unknown barber",
        date: formatDate(appointment.appointment_date),
        time: formatTime12(appointment.appointment_time),
        status: appointment.status,
        price: Number(appointment.price) || 0,
        cancellation_reason: appointment.cancellation_reason,
        feedback: appointment.feedback
          ? {
              rating: appointment.feedback.rating,
              comment: appointment.feedback.comment,
              submitted_at: appointment.feedback.submitted_at,
            }
          : null,
      })),
    [appointments],
  );

  return (
    <div className="w-full h-fit bg-slate-100 p-4 sm:p-6 font-sans">
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
            placeholder="Search by appointment ID, service, barber"
            className="w-full sm:w-3/4"
            maxLength={100}
          />
          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as AppointmentHistoryStatusFilter)
            }
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

      <div className="space-y-3" aria-busy={loading || refreshing}>
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}
        <div className="block md:hidden space-y-3">
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-400 text-sm">
              Loading appointments...
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-400 text-sm">
              No appointments found.
            </div>
          ) : (
            rows.map((row) => (
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
                <TableHead>Appointment ID</TableHead>
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
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell className="text-gray-500" colSpan={7}>
                    No appointments found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
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

        {meta ? (
          <TablePagination
            currentPage={meta.current_page}
            lastPage={meta.last_page}
            getPageHref={getPageHref}
            onPageChange={setPage}
            disabled={loading}
          />
        ) : null}
      </div>

      <Dialog open={selectedRow !== null} onOpenChange={(open) => { if (!open) setSelectedRow(null); }}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-[480px] sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Appointment Detail
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Appointment {formatBookingId(selectedRow?.id ?? 0)}
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
      <div className="h-10" />
    </div>
  );
}
