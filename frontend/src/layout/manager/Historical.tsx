"use client";

import { useEffect, useMemo, useState } from "react";
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

type StatusFilter = "all" | "walkin" | AppointmentStatus;

type Row = {
  id: number;
  customer: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  price: number;
  created_at: string;
  cancellation_reason: string | null;
  is_walkin: boolean;
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

export function Historical() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const data = await getAppointments();
        const mapped = data
          .map((appt: Appointment) => ({
            id: appt.id,
            customer: appt.customer.fullname ?? "Unknown customer",
            service: appt.service.name ?? "Unknown service",
            barber: appt.barber.fullname ?? "Unknown barber",
            date: formatDate(appt.appointment_date),
            time: formatTime(appt.appointment_time),
            status: appt.status,
            price: Number(appt.price) || 0,
            created_at: appt.created_at,
            cancellation_reason: appt.cancellation_reason,
            is_walkin: appt.is_walkin,
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
    };

    fetchAppointments();
  }, []);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "walkin" ? row.is_walkin : row.status === statusFilter);
      const matchesSearch =
        !keyword ||
        row.customer.toLowerCase().includes(keyword) ||
        row.service.toLowerCase().includes(keyword) ||
        row.barber.toLowerCase().includes(keyword) ||
        String(row.id).includes(keyword);

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
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Appointment History</h1>
        <p className="text-gray-500 mt-1">
          Table view of current appointments (sorted by created date)
        </p>
      </div>

      <SectionCard title="Filters" className="mb-4 p-4">
        <div className="flex gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by booking ID, customer, service, barber"
            className="w-3/4"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <SelectTrigger className="w-1/4 border-gray-300">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="no_show">No-show</SelectItem>
              <SelectItem value="walkin">Walk-in</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      <div className="space-y-3">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Booking ID</TableHead>
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
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell className="text-gray-500" colSpan={8}>
                    No appointments found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow key={row.id} className="group relative">
                    <TableCell>#{row.id}</TableCell>
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

        {filteredRows.length > pageSize ? (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setPage((prev) => Math.max(1, prev - 1));
                  }}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNo) => (
                <PaginationItem key={pageNo}>
                  <PaginationLink
                    href="#"
                    isActive={pageNo === page}
                    onClick={(event) => {
                      event.preventDefault();
                      setPage(pageNo);
                    }}
                  >
                    {pageNo}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
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
