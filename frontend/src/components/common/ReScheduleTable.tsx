import { useMemo, useState } from "react";
import { type ReScheduleItem } from "@/services/re.schedule.api";
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

type ReScheduleTableProps = {
  items: ReScheduleItem[];
  formatShortDate: (date: string) => string;
  formatTime: (time: string) => string;
};

export function ReScheduleTable({ items, formatShortDate, formatTime }: ReScheduleTableProps) {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page]);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-200">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Barber</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Decision</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell className="text-gray-500" colSpan={6}>
                  No re-schedule suggestions yet.
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.customer_name ?? "-"}</TableCell>
                  <TableCell>{item.service_name ?? "-"}</TableCell>
                  <TableCell>{item.barber_name ?? "-"}</TableCell>
                  <TableCell>{formatShortDate(item.appointment_date)}</TableCell>
                  <TableCell>{formatTime(item.appointment_time)}</TableCell>
                  <TableCell className="capitalize">{item.decision}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {items.length > pageSize ? (
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
  );
}
