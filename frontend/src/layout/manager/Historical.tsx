"use client";

import { useMemo } from "react";

import { TablePagination } from "@/components/common/TablePagination";
import {
  type AppointmentHistoryStatusFilter,
  useAppointmentHistory,
} from "@/hooks/useAppointmentHistory";
import { type AppointmentStatus } from "@/services/customer/appointment.api";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/common/SectionCard";
import { AppointmentStatusBadge } from "@/components/common/AppointmentStatusBadge";
import { formatBookingId } from "@/lib/booking";
import { formatTime12 } from "@/lib/time-slots";
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

type Row = {
  id: number;
  customer: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  price: number;
  cancellation_reason: string | null;
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function Historical() {
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
  const rows = useMemo<Row[]>(
    () =>
      appointments.map((appointment) => ({
        id: appointment.id,
        customer: appointment.customer.fullname ?? "Unknown customer",
        service: appointment.service.name ?? "Unknown service",
        barber: appointment.barber.fullname ?? "Unknown barber",
        date: formatDate(appointment.appointment_date),
        time: formatTime12(appointment.appointment_time),
        status: appointment.status,
        price: Number(appointment.price) || 0,
        cancellation_reason: appointment.cancellation_reason,
      })),
    [appointments],
  );

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 pb-12 sm:pb-10 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Appointment History</h1>
        <p className="text-gray-500 mt-1">
          Appointments are ordered by last updated, latest first
        </p>
      </div>

      <SectionCard title="Filters" className="mb-4 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by appointment ID, customer, service, barber"
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
              <SelectItem value="walkin">Walk-in</SelectItem>
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
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 text-sm">
                    {formatBookingId(row.id)}
                  </span>
                  <AppointmentStatusBadge status={row.status} />
                </div>
                <p className="text-sm text-gray-900 font-medium">{row.customer}</p>
                <p className="text-xs text-gray-500">
                  {row.service} · {row.barber}
                </p>
                <p className="text-xs text-gray-500">
                  {row.date} · {row.time}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">
                    ₱{row.price.toFixed(2)}
                  </span>
                  {row.cancellation_reason ? (
                    <span className="text-xs text-red-500 truncate max-w-[150px]" title={row.cancellation_reason}>
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
                <TableHead>Customer</TableHead>
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
                  <TableCell className="text-gray-500" colSpan={8}>
                    Loading appointments...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell className="text-gray-500" colSpan={8}>
                    No appointments found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} className="group relative">
                    <TableCell>{formatBookingId(row.id)}</TableCell>
                    <TableCell>{row.customer}</TableCell>
                    <TableCell>{row.service}</TableCell>
                    <TableCell>{row.barber}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.time}</TableCell>
                    <TableCell>₱{row.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="relative inline-block">
                        <AppointmentStatusBadge status={row.status} />
                        {row.cancellation_reason ? (
                          <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-max max-w-64 -translate-x-1/2 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs text-red-600 shadow-md group-hover:block">
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

        <div className="h-5" />
      </div>
    </div>
  );
}
