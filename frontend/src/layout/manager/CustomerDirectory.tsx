"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  getCustomerList,
  type CustomerItem,
  type CustomerMeta,
  type CustomerStats,
} from "@/services/manager/customers.api";
import { TablePagination } from "@/components/common/TablePagination";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { buildTableUrl, parsePage } from "@/lib/table-query";
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
  if (rating === null) return <span className="text-gray-400 text-sm">{"\u2014"}</span>;
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
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function CustomerDirectory() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const committedSearch = (searchParams.get("search") ?? "").slice(0, 100);
  const rawStatus = searchParams.get("status");
  const statusFilter =
    rawStatus === "active" || rawStatus === "inactive" ? rawStatus : "all";
  const rawSort = searchParams.get("sort");
  const sort = [
    "fullname",
    "total_visits",
    "lifetime_value",
    "last_visit_date",
    "average_rating",
  ].includes(rawSort ?? "")
    ? (rawSort as string)
    : "fullname";
  const dir = searchParams.get("dir") === "desc" ? "desc" : "asc";
  const page = parsePage(searchParams.get("page"));
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [meta, setMeta] = useState<CustomerMeta | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(committedSearch);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setSearch(committedSearch);
  }, [committedSearch]);

  useEffect(() => {
    const normalizedSearch = search.trim().slice(0, 100);
    if (normalizedSearch === committedSearch) return;

    const timer = window.setTimeout(() => {
      router.replace(
        buildTableUrl(pathname, searchParams, {
          search: normalizedSearch || null,
          page: null,
        }),
        { scroll: false },
      );
    }, 300);

    return () => window.clearTimeout(timer);
  }, [committedSearch, pathname, router, search, searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;

    const fetchCustomers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCustomerList(
          {
            search: committedSearch || undefined,
            status: statusFilter !== "all" ? statusFilter : undefined,
            sort,
            dir,
            page,
            per_page: 10,
          },
          controller.signal,
        );

        if (requestId !== requestIdRef.current) return;

        if (
          data.customers.length === 0 &&
          page > data.meta.last_page &&
          data.meta.last_page > 0
        ) {
          router.replace(
            buildTableUrl(pathname, searchParams, {
              page: data.meta.last_page === 1 ? null : data.meta.last_page,
            }),
            { scroll: false },
          );
          return;
        }

        setCustomers(data.customers);
        setMeta(data.meta);
        setStats(data.stats);
      } catch (fetchError) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }
        console.error("Failed to load customers:", fetchError);
        setError("Could not load customers. Please try again.");
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    };

    fetchCustomers();
    return () => controller.abort();
  }, [committedSearch, dir, page, pathname, router, searchParams, sort, statusFilter]);

  const setStatusFilter = (value: string) => {
    router.push(
      buildTableUrl(pathname, searchParams, {
        status: value === "all" ? null : value,
        page: null,
      }),
      { scroll: false },
    );
  };

  const setPage = (nextPage: number) => {
    router.push(
      buildTableUrl(pathname, searchParams, {
        page: nextPage === 1 ? null : nextPage,
      }),
      { scroll: false },
    );
  };

  const getPageHref = (nextPage: number) =>
    buildTableUrl(pathname, searchParams, {
      page: nextPage === 1 ? null : nextPage,
    });

  const toggleSort = (field: string) => {
    const nextDir = sort === field && dir === "desc" ? "asc" : "desc";
    router.push(
      buildTableUrl(pathname, searchParams, {
        sort: field === "fullname" ? null : field,
        dir: nextDir === "asc" ? null : nextDir,
        page: null,
      }),
      { scroll: false },
    );
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
          <ArrowUpDown className={cn("h-3 w-3", dir === "desc" ? "rotate-180" : "")} />
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

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
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
              maxLength={100}
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
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}
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
                onClick={() => router.push(`${pathname}/${customer.id}`)}
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
                    onClick={() => router.push(`${pathname}/${customer.id}`)}
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

        {meta ? (
          <TablePagination
            currentPage={meta.current_page}
            lastPage={meta.last_page}
            getPageHref={getPageHref}
            onPageChange={setPage}
            disabled={loading}
          />
        ) : null}
        <div className="h-10" />
      </div>
    </div>
  );
}
