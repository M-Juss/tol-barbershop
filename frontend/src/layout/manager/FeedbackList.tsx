"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  getFeedbackList,
  toggleFeature,
  type FeedbackItem,
  type FeedbackMeta,
} from "@/services/manager/feedback.api";
import { TablePagination } from "@/components/common/TablePagination";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/common/SectionCard";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { buildTableUrl, parsePage } from "@/lib/table-query";
import { Star, MessageSquareText, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn("h-4 w-4", star <= rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200")}
        />
      ))}
    </div>
  );
}

export function FeedbackList() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const committedSearch = (searchParams.get("search") ?? "").slice(0, 100);
  const rawRating = searchParams.get("rating");
  const ratingFilter = ["1", "2", "3", "4", "5"].includes(rawRating ?? "")
    ? (rawRating as string)
    : "all";
  const rawFeatured = searchParams.get("featured");
  const featuredFilter =
    rawFeatured === "featured" || rawFeatured === "not_featured"
      ? rawFeatured
      : "all";
  const page = parsePage(searchParams.get("page"));
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [meta, setMeta] = useState<FeedbackMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(committedSearch);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
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

  const setPage = useCallback(
    (nextPage: number) => {
      router.push(
        buildTableUrl(pathname, searchParams, {
          page: nextPage === 1 ? null : nextPage,
        }),
        { scroll: false },
      );
    },
    [pathname, router, searchParams],
  );

  const fetchFeedback = useCallback(async (signal?: AbortSignal) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getFeedbackList(
        {
          search: committedSearch || undefined,
          rating: ratingFilter !== "all" ? ratingFilter : undefined,
          featured: featuredFilter !== "all" ? featuredFilter : undefined,
          page,
          per_page: 10,
          sort: "created_at",
          dir: "desc",
        },
        signal,
      );

      if (requestId !== requestIdRef.current) return;

      if (
        data.feedback.length === 0 &&
        page > data.meta.last_page &&
        data.meta.last_page > 0
      ) {
        setPage(data.meta.last_page);
        return;
      }

      setFeedback(data.feedback);
      setMeta(data.meta);
    } catch (fetchError) {
      if (signal?.aborted || requestId !== requestIdRef.current) return;
      console.error("Failed to load feedback:", fetchError);
      setError("Could not load feedback. Please try again.");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [committedSearch, featuredFilter, page, ratingFilter, setPage]);

  useEffect(() => {
    const controller = new AbortController();
    fetchFeedback(controller.signal);
    return () => controller.abort();
  }, [fetchFeedback]);

  const setRatingFilter = (value: string) => {
    router.push(
      buildTableUrl(pathname, searchParams, {
        rating: value === "all" ? null : value,
        page: null,
      }),
      { scroll: false },
    );
  };

  const setFeaturedFilter = (value: string) => {
    router.push(
      buildTableUrl(pathname, searchParams, {
        featured: value === "all" ? null : value,
        page: null,
      }),
      { scroll: false },
    );
  };

  const getPageHref = (nextPage: number) =>
    buildTableUrl(pathname, searchParams, {
      page: nextPage === 1 ? null : nextPage,
    });

  const handleToggleFeature = async (id: number) => {
    setTogglingIds((prev) => new Set(prev).add(id));
    try {
      const updated = await toggleFeature(id);
      setSelectedFeedback((current) =>
        current?.id === id
          ? { ...current, is_featured: updated.is_featured }
          : current,
      );
      await fetchFeedback();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Failed to update featured status";
      toast.error(msg);
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 pb-12 sm:pb-10 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Customer Feedback
        </h1>
        <p className="text-gray-500 mt-1">
          View all ratings and reviews submitted by customers
        </p>
      </div>

      <SectionCard title="Filters" className="mb-4 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, service, or comment"
            className="w-full sm:flex-1"
            maxLength={100}
          />
          <Select
            value={ratingFilter}
            onValueChange={(value) => setRatingFilter(value)}
          >
            <SelectTrigger className="w-full sm:w-[140px] border-gray-300">
              <SelectValue placeholder="All Ratings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={featuredFilter}
            onValueChange={(value) => setFeaturedFilter(value)}
          >
            <SelectTrigger className="w-full sm:w-[160px] border-gray-300">
              <SelectValue placeholder="All Items" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="not_featured">Not Featured</SelectItem>
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
              Loading feedback...
            </div>
          ) : feedback.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-400 text-sm">
              No feedback found.
            </div>
          ) : (
            feedback.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer active:bg-gray-50 transition"
                    onClick={() => setSelectedFeedback(item)}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                      {item.customer_initials}
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">
                      {item.customer_name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFeature(item.id);
                    }}
                    disabled={togglingIds.has(item.id)}
                    className="p-1 shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                    title={item.is_featured ? "Unfeature" : "Feature on landing page"}
                  >
                    {item.is_featured ? (
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ) : (
                      <Star className="h-5 w-5 text-gray-300 hover:text-yellow-400 transition-colors" />
                    )}
                  </button>
                </div>
                <div
                  className="cursor-pointer active:bg-gray-50 transition"
                  onClick={() => setSelectedFeedback(item)}
                >
                  <p className="text-xs text-gray-500">{item.service_name}</p>
                  <StarRating rating={item.rating} />
                  {item.comment ? (
                    <p className="text-sm text-gray-700 italic truncate">
                      &ldquo;{item.comment}&rdquo;
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No comment</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {formatDateTime(item.submitted_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="max-w-xs">Comment</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="text-gray-500" colSpan={6}>
                    Loading feedback...
                  </TableCell>
                </TableRow>
              ) : feedback.length === 0 ? (
                <TableRow>
                  <TableCell className="text-gray-500" colSpan={6}>
                    No feedback found.
                  </TableCell>
                </TableRow>
              ) : (
                feedback.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => handleToggleFeature(item.id)}
                        disabled={togglingIds.has(item.id)}
                        className="p-1 disabled:cursor-not-allowed disabled:opacity-50"
                        title={item.is_featured ? "Unfeature" : "Feature on landing page"}
                      >
                        {item.is_featured ? (
                          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <Star className="h-5 w-5 text-gray-300 hover:text-yellow-400 transition-colors" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell onClick={() => setSelectedFeedback(item)}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                          {item.customer_initials}
                        </div>
                        <span className="font-medium text-gray-900">
                          {item.customer_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600" onClick={() => setSelectedFeedback(item)}>
                      {item.service_name}
                    </TableCell>
                    <TableCell onClick={() => setSelectedFeedback(item)}>
                      <StarRating rating={item.rating} />
                    </TableCell>
                    <TableCell className="max-w-xs text-gray-600" onClick={() => setSelectedFeedback(item)}>
                      {item.comment ? (
                        <div className="flex items-start gap-1.5">
                          <MessageSquareText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                          <span className="italic text-sm truncate">
                            &ldquo;{item.comment}&rdquo;
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm italic">
                          No comment
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm whitespace-nowrap" onClick={() => setSelectedFeedback(item)}>
                      {formatDateTime(item.submitted_at)}
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

      <Dialog
        open={!!selectedFeedback}
        onOpenChange={(open) => {
          if (!open) setSelectedFeedback(null);
        }}
      >
        <DialogContent className="max-w-[calc(100%-3rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Feedback Details</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700 shrink-0">
                    {selectedFeedback.customer_initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {selectedFeedback.customer_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {selectedFeedback.service_name}
                    </p>
                    {selectedFeedback.barber_name && (
                      <p className="text-xs text-gray-400 truncate">
                        by {selectedFeedback.barber_name}
                      </p>
                    )}
                  </div>
                </div>
                <StarRating rating={selectedFeedback.rating} />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(selectedFeedback.submitted_at)}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(selectedFeedback.submitted_at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-500 mb-1.5">
                  Comment
                </p>
                {selectedFeedback.comment ? (
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {selectedFeedback.comment}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No comment provided.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
