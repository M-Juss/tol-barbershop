"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getCustomerList,
  type CustomerItem,
  type CustomerMeta,
  type CustomerStats,
} from "@/services/manager/customers.api";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/common/SectionCard";
import { StatCard } from "@/components/common/StatCard";
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
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Search,
  Star,
  ArrowUpDown,
} from "lucide-react";

function formatDate(date: string | null): string {
  if (!date) return "\u2014";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-gray-400 text-sm">\u2014</span>;
  return (
    <div className="flex items-center gap-1">
      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
      <span className="text-sm font-medium text-gray-700">{rating}</span>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        active
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-500"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function CustomerDirectory() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [meta, setMeta] = useState<CustomerMeta | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("fullname");
  const [dir, setDir] = useState("asc");

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const data = await getCustomerList({
          search: search.trim() || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          sort,
          dir,
          page,
          per_page: 10,
        });
        setCustomers(data.customers);
        setMeta(data.meta);
        setStats(data.stats);
      } catch (error) {
        console.error("Failed to load customers:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchCustomers, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [search, statusFilter, sort, dir, page]);

  const toggleSort = (field: string) => {
    if (sort === field) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setDir("desc");
    }
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: string;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer select-none"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sort === field && (
          <ArrowUpDown className={`h-3 w-3 ${dir === "desc" ? "rotate-180" : ""}`} />
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 pb-12 sm:pb-10 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Customers
        </h1>
        <p className="text-gray-500 mt-1">
          View and manage all registered customers
        </p>
      </div>

      {/* KPI Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatCard
            label="Total Customers"
            value={stats.total_customers.toLocaleString()}
            icon={Users}
            iconContainerClassName="bg-blue-100"
            iconClassName="text-blue-500"
          />
          <StatCard
            label="New This Month"
            value={stats.new_this_month.toLocaleString()}
            icon={UserPlus}
            iconContainerClassName="bg-green-100"
            iconClassName="text-green-500"
          />
          <StatCard
            label="Active"
            value={stats.active_count.toLocaleString()}
            icon={UserCheck}
            iconContainerClassName="bg-green-100"
            iconClassName="text-green-500"
          />
          <StatCard
            label="Inactive"
            value={stats.inactive_count.toLocaleString()}
            icon={UserX}
            iconContainerClassName="bg-gray-100"
            iconClassName="text-gray-500"
          />
        </div>
      )}

      <SectionCard title="Filters" className="mb-4 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-3/4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or contact number"
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-full sm:w-1/4 border-gray-300">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      <div className="space-y-3">
        {/* Mobile card view */}
        <div className="block md:hidden space-y-3">
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-400 text-sm">
              Loading customers...
            </div>
          ) : customers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-400 text-sm">
              No customers found.
            </div>
          ) : (
            customers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => router.push(`/manager/customers/${customer.id}`)}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2 cursor-pointer active:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                      {customer.initials}
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">
                      {customer.fullname}
                    </span>
                  </div>
                  <StatusBadge active={customer.is_active} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 pt-1">
                  <div>
                    <span className="block font-medium text-gray-700">{customer.total_visits}</span>
                    Completed
                  </div>
                  <div>
                    <span className="block font-medium text-gray-700">{customer.no_show_count}</span>
                    No-show
                  </div>
                  <div>
                    <span className="block font-medium text-gray-700">{customer.cancelled_count}</span>
                    Cancelled
                  </div>
                  <div>
                    <span className="block font-medium text-gray-700">{formatCurrency(customer.lifetime_value)}</span>
                    LTV
                  </div>
                  <div>
                    <span className="block font-medium text-gray-700">{formatDate(customer.last_visit_date)}</span>
                    Last Visit
                  </div>
                  <div>
                    <span className="block font-medium text-gray-700">
                      {customer.average_rating !== null ? `${customer.average_rating}\u2605` : "\u2014"}
                    </span>
                    Rating
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop table view */}
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <SortableHeader field="fullname">Name</SortableHeader>
                <TableHead>Completed</TableHead>
                <TableHead>No-show</TableHead>
                <TableHead>Cancelled</TableHead>
                <SortableHeader field="lifetime_value">LTV</SortableHeader>
                <SortableHeader field="last_visit_date">Last Visit</SortableHeader>
                <SortableHeader field="average_rating">Rating</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="text-gray-500" colSpan={7}>
                    Loading customers...
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell className="text-gray-500" colSpan={7}>
                    No customers found.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    onClick={() => router.push(`/manager/customers/${customer.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                            {customer.initials}
                          </div>
                          <span className="font-medium text-gray-900">
                            {customer.fullname}
                          </span>
                        </div>
                        <StatusBadge active={customer.is_active} />
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700 font-medium">
                      {customer.total_visits}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {customer.no_show_count}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {customer.cancelled_count}
                    </TableCell>
                    <TableCell className="text-gray-700 font-medium">
                      {formatCurrency(customer.lifetime_value)}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                      {formatDate(customer.last_visit_date)}
                    </TableCell>
                    <TableCell>
                      <StarRating rating={customer.average_rating} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {meta && meta.last_page > 1 ? (
          <Pagination className="overflow-hidden px-1">
            <PaginationContent className="flex-nowrap gap-0.5">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  className="h-8 w-8 sm:h-9 sm:w-auto"
                  text=""
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.max(1, p - 1));
                  }}
                />
              </PaginationItem>
              {(() => {
                const pages: (number | "...")[] = [];
                const total = meta.last_page;
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
                        onClick={(e) => {
                          e.preventDefault();
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
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.min(meta.last_page, p + 1));
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
