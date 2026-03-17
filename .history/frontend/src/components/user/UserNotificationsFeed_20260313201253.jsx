"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  FileText,
  Heart,
  XCircle,
  Ban,
  RefreshCw,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import UserBookingNotificationDetails from "./notifications/UserBookingNotificationDetails";

const POST_TABLE_CANDIDATES = ["trainer_posts", "posts"];
const LIKE_TABLE_CANDIDATES = ["post_likes", "likes", "trainer_post_likes"];

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/* ---------------- HELPERS ---------------- */

function formatDateTime(value) {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function toTs(value) {
  const t = new Date(value || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function truncateText(value, max = 80) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function isMissingTableError(error) {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code === "42p01" ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("schema cache") ||
    details.includes("does not exist")
  );
}

async function queryFirstWorkingTable(candidates, buildQuery) {
  let lastError = null;

  for (const table of candidates) {
    try {
      const { data, error } = await buildQuery(supabase.from(table));
      if (error) {
        if (isMissingTableError(error)) continue;
        lastError = error;
        continue;
      }

      return {
        table,
        data: Array.isArray(data) ? data : [],
        error: null,
      };
    } catch (err) {
      if (isMissingTableError(err)) continue;
      lastError = err;
    }
  }

  return {
    table: null,
    data: [],
    error: lastError,
  };
}

function dedupeAndSortNotifications(items) {
  const seen = new Set();

  return [...items]
    .sort((a, b) => toTs(b.created_at) - toTs(a.created_at))
    .filter((item) => {
      const key = `${item.type}-${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getDisplayName(entity) {
  return (
    entity?.trainer_name ||
    entity?.author_name ||
    entity?.user_name ||
    entity?.full_name ||
    entity?.client_name ||
    entity?.customer_name ||
    entity?.name ||
    "Ενημέρωση"
  );
}

function getPostOwnerId(post) {
  return (
    post?.trainer_id ||
    post?.trainerId ||
    post?.user_id ||
    post?.userId ||
    post?.author_id ||
    post?.authorId ||
    post?.owner_id ||
    post?.ownerId ||
    post?.profile_id ||
    post?.profileId ||
    null
  );
}

function getLikePostId(like) {
  return (
    like?.post_id ||
    like?.postId ||
    like?.trainer_post_id ||
    like?.trainerPostId ||
    like?.content_id ||
    like?.contentId ||
    null
  );
}

/* ---------------- STATUS STYLE ---------------- */

function getStatusMeta(status) {
  const s = String(status || "").toLowerCase();

  if (s === "accepted") {
    return {
      label: "Αποδεκτή",
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/[0.05]",
      border: "border-emerald-500/20",
      hover: "hover:bg-emerald-500/[0.07]",
    };
  }

  if (s === "pending") {
    return {
      label: "Εκκρεμής",
      icon: Clock3,
      color: "text-amber-400",
      bg: "bg-amber-500/[0.05]",
      border: "border-amber-500/20",
      hover: "hover:bg-amber-500/[0.07]",
    };
  }

  if (s === "declined") {
    return {
      label: "Απορρίφθηκε",
      icon: XCircle,
      color: "text-rose-400",
      bg: "bg-rose-500/[0.05]",
      border: "border-rose-500/20",
      hover: "hover:bg-rose-500/[0.07]",
    };
  }

  if (s === "cancelled") {
    return {
      label: "Ακυρώθηκε",
      icon: Ban,
      color: "text-zinc-400",
      bg: "bg-zinc-500/[0.05]",
      border: "border-zinc-500/20",
      hover: "hover:bg-zinc-500/[0.07]",
    };
  }

  return {
    label: "Κράτηση",
    icon: Clock3,
    color: "text-zinc-300",
    bg: "bg-zinc-500/[0.05]",
    border: "border-zinc-500/20",
    hover: "hover:bg-zinc-500/[0.07]",
  };
}

/* ---------------- MAPPERS ---------------- */

function mapBookingNotification(b) {
  const trainerName = getDisplayName(b);
  const status = String(b?.status || "").toLowerCase();

  let subtitle = "Υπάρχει ενημέρωση για την κράτησή σου.";
  if (status === "accepted") subtitle = "Η κράτησή σου έγινε αποδεκτή.";
  if (status === "pending") subtitle = "Η κράτησή σου είναι σε εκκρεμότητα.";
  if (status === "declined") subtitle = "Η κράτησή σου απορρίφθηκε.";
  if (status === "cancelled") subtitle = "Η κράτησή σου ακυρώθηκε.";

  return {
    ...b,
    type: "booking",
    trainer_name: trainerName,
    subtitle,
    target_id: b.id,
    target_type: "booking",
  };
}

function mapPostNotification(p) {
  const trainerName = getDisplayName(p);
  const safeTrainerName =
    trainerName && trainerName !== "Ενημέρωση" ? trainerName : "Trainer";

  return {
    ...p,
    type: "post",
    trainer_name: safeTrainerName,
    subtitle: safeTrainerName,
    target_id: p.id,
    target_type: "post",
    post_id: p.id,
  };
}
function mapLikeNotification(like, postMap) {
  const postId = getLikePostId(like);
  const relatedPost = postId ? postMap.get(String(postId)) : null;

  return {
    ...like,
    type: "like",
    trainer_name: getDisplayName(like) || "Κάποιος",
    subtitle: relatedPost
      ? `Έγινε like σε ${truncateText(
          relatedPost?.title ||
            relatedPost?.caption ||
            relatedPost?.headline ||
            "ανάρτηση",
          45
        )}.`
      : "Έγινε like σε μία ανάρτηση.",
    target_id: postId || like.id,
    target_type: "like",
    post_id: postId || null,
    related_post: relatedPost || null,
  };
}

/* ---------------- CARD ---------------- */

function NotificationCard({ item, isActive, onClick }) {
  if (item.type === "booking") {
    const meta = getStatusMeta(item.status);
    const Icon = meta.icon;

    return (
      <button
        type="button"
        onClick={() => onClick?.(item)}
        className="w-[240px] min-w-[240px] flex-shrink-0 snap-start text-left"
      >
        <div
          className={cn(
            "rounded-lg border p-3 backdrop-blur-md transition min-h-[120px]",
            meta.bg,
            meta.border,
            meta.hover,
            isActive && "ring-1 ring-white/15"
          )}
        >
          <div className="flex items-start gap-2">
            <Icon className={cn("mt-[2px] h-5 w-5 shrink-0", meta.color)} />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-200">
                {meta.label}
              </p>

              <p className="mt-[2px] truncate text-xs font-medium text-zinc-400">
                {item.trainer_name || "Trainer"}
              </p>

              <p className="mt-[4px] line-clamp-2 text-[11px] leading-4 text-zinc-500">
                {item.subtitle}
              </p>

              <p className="mt-[6px] text-[11px] text-zinc-500">
                {formatDateTime(item.created_at)}
              </p>
            </div>
          </div>
        </div>
      </button>
    );
  }

  if (item.type === "post") {
    return (
      <button
        type="button"
        onClick={() => onClick?.(item)}
        className="w-[240px] min-w-[240px] flex-shrink-0 snap-start text-left"
      >
        <div
          className={cn(
            "rounded-lg border p-3 backdrop-blur-md transition min-h-[120px]",
            "border-blue-500/20 bg-blue-500/[0.04] hover:bg-blue-500/[0.06]",
            isActive && "ring-1 ring-white/15"
          )}
        >
          <div className="flex items-start gap-2">
            <FileText className="mt-[2px] h-5 w-5 shrink-0 text-blue-400" />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-200">
                Νέα ανάρτηση
              </p>

              <p className="mt-[2px] truncate text-xs font-medium text-zinc-400">
                {item.trainer_name || "Trainer"}
              </p>

              <p className="mt-[4px] line-clamp-2 text-[11px] leading-4 text-zinc-500">
                {item.subtitle}
              </p>

              <p className="mt-[6px] text-[11px] text-zinc-500">
                {formatDateTime(item.created_at)}
              </p>
            </div>
          </div>
        </div>
      </button>
    );
  }

  if (item.type === "like") {
    return (
      <button
        type="button"
        onClick={() => onClick?.(item)}
        className="w-[240px] min-w-[240px] flex-shrink-0 snap-start text-left"
      >
        <div
          className={cn(
            "rounded-lg border p-3 backdrop-blur-md transition min-h-[120px]",
            "border-rose-500/20 bg-rose-500/[0.04] hover:bg-rose-500/[0.06]",
            isActive && "ring-1 ring-white/15"
          )}
        >
          <div className="flex items-start gap-2">
            <Heart className="mt-[2px] h-5 w-5 shrink-0 text-rose-400" />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-200">
                Νέο like
              </p>

              <p className="mt-[2px] truncate text-xs font-medium text-zinc-400">
                {item.trainer_name || "Κάποιος"}
              </p>

              <p className="mt-[4px] line-clamp-2 text-[11px] leading-4 text-zinc-500">
                {item.subtitle}
              </p>

              <p className="mt-[6px] text-[11px] text-zinc-500">
                {formatDateTime(item.created_at)}
              </p>
            </div>
          </div>
        </div>
      </button>
    );
  }

  return null;
}

/* ---------------- SKELETON ---------------- */

function NotificationSkeleton() {
  return (
    <div className="w-[240px] min-w-[240px] flex-shrink-0 snap-start rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-start gap-2">
        <div className="skeleton-shimmer mt-[2px] h-4 w-4 rounded-full bg-white/[0.06]" />

        <div className="flex-1">
          <div className="skeleton-shimmer h-3 w-24 rounded-md bg-white/[0.06]" />
          <div className="skeleton-shimmer mt-2 h-3 w-20 rounded-md bg-white/[0.05]" />
          <div className="skeleton-shimmer mt-2 h-2.5 w-28 rounded-md bg-white/[0.04]" />
          <div className="skeleton-shimmer mt-2 h-2.5 w-16 rounded-md bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}

/* ---------------- COMPONENT ---------------- */

export default function UserNotificationsFeed({
  userId,
  pageSize = 8,
  onNotificationClick,
  onBookingClick,
  onPostClick,
  onLikeClick,
}) {
  const [items, setItems] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activePostTable, setActivePostTable] = useState(null);
  const [activeLikeTable, setActiveLikeTable] = useState(null);

  const scrollContainerRef = useRef(null);
  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  const hasMoreRef = useRef(true);
  const fetchingRef = useRef(false);
  const loadedCountRef = useRef(0);
  const itemsRef = useRef([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const fetchMergedNotifications = useCallback(
    async (targetCount) => {
      const sourceFetchLimit = Math.max(targetCount * 4, 24);

      const { data: bookingRows, error: bookingError } = await supabase
        .from("trainer_bookings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(sourceFetchLimit);

      if (bookingError) throw bookingError;

      const rawBookings = Array.isArray(bookingRows) ? bookingRows : [];
      const bookingItems = rawBookings.map(mapBookingNotification);

      const relatedTrainerIds = [
        ...new Set(
          rawBookings
            .map((b) => b?.trainer_id || b?.trainerId || b?.provider_id || null)
            .filter(Boolean)
            .map(String)
        ),
      ];

      let postItems = [];
      let likeItems = [];
      let resolvedPostTable = null;
      let resolvedLikeTable = null;

      if (relatedTrainerIds.length > 0) {
        const postsResult = await queryFirstWorkingTable(
          POST_TABLE_CANDIDATES,
          (q) =>
            q
              .select("*")
              .order("created_at", { ascending: false })
              .limit(sourceFetchLimit)
        );

        resolvedPostTable = postsResult.table;

        const filteredPosts = (postsResult.data || []).filter((post) => {
          const ownerId = getPostOwnerId(post);
          return ownerId && relatedTrainerIds.includes(String(ownerId));
        });

        const postMap = new Map(
          filteredPosts.map((post) => [String(post.id), post])
        );

        postItems = filteredPosts.map(mapPostNotification);

        if (filteredPosts.length > 0) {
          const relevantPostIds = new Set(filteredPosts.map((p) => String(p.id)));

          const likesResult = await queryFirstWorkingTable(
            LIKE_TABLE_CANDIDATES,
            (q) =>
              q
                .select("*")
                .order("created_at", { ascending: false })
                .limit(Math.max(targetCount * 6, 32))
          );

          resolvedLikeTable = likesResult.table;

          const filteredLikes = (likesResult.data || []).filter((like) => {
            const postId = getLikePostId(like);
            return postId && relevantPostIds.has(String(postId));
          });

          likeItems = filteredLikes.map((like) =>
            mapLikeNotification(like, postMap)
          );
        }
      }

      return {
        merged: dedupeAndSortNotifications([
          ...bookingItems,
          ...postItems,
          ...likeItems,
        ]),
        resolvedPostTable,
        resolvedLikeTable,
      };
    },
    [userId]
  );

  const loadNotifications = useCallback(
    async ({ reset = false } = {}) => {
      if (!userId) {
        setItems([]);
        setSelectedKey("");
        setSelectedBooking(null);
        setInitialLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        setHasMore(false);
        setErrorText("");
        setActivePostTable(null);
        setActiveLikeTable(null);
        hasMoreRef.current = false;
        loadedCountRef.current = 0;
        return;
      }

      if (fetchingRef.current) return;
      if (!reset && !hasMoreRef.current) return;

      fetchingRef.current = true;
      setErrorText("");

      const targetCount = reset
        ? pageSize
        : loadedCountRef.current + pageSize;

      try {
        if (reset) {
          if (itemsRef.current.length > 0) {
            setRefreshing(true);
          } else {
            setInitialLoading(true);
          }
        } else {
          setLoadingMore(true);
        }

        const { merged, resolvedPostTable, resolvedLikeTable } =
          await fetchMergedNotifications(targetCount);

        const nextItems = merged.slice(0, targetCount);
        const nextHasMore = merged.length > nextItems.length;

        setItems(nextItems);
        setHasMore(nextHasMore);
        setActivePostTable(resolvedPostTable || null);
        setActiveLikeTable(resolvedLikeTable || null);

        hasMoreRef.current = nextHasMore;
        loadedCountRef.current = nextItems.length;
      } catch (err) {
        console.error("Notifications fetch error:", err);
        setErrorText(err?.message || "Κάτι πήγε στραβά στη φόρτωση.");
      } finally {
        fetchingRef.current = false;
        setInitialLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [userId, pageSize, fetchMergedNotifications]
  );

  useEffect(() => {
    setItems([]);
    setSelectedKey("");
    setSelectedBooking(null);
    setErrorText("");
    setInitialLoading(true);
    setRefreshing(false);
    setLoadingMore(false);
    setHasMore(true);

    hasMoreRef.current = true;
    loadedCountRef.current = 0;

    loadNotifications({ reset: true });
  }, [userId, pageSize, loadNotifications]);

  useEffect(() => {
    const root = scrollContainerRef.current;
    const target = sentinelRef.current;

    if (!root || !target || !hasMore) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry?.isIntersecting && !fetchingRef.current && hasMoreRef.current) {
          loadNotifications({ reset: false });
        }
      },
      {
        root,
        rootMargin: "0px 160px 0px 0px",
        threshold: 0.1,
      }
    );

    observerRef.current.observe(target);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, items.length, loadNotifications]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(
      `user-notifications-${userId}-${activePostTable || "posts"}-${activeLikeTable || "likes"}`
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "trainer_bookings",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        loadNotifications({ reset: true });
      }
    );

    if (activePostTable) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: activePostTable,
        },
        () => {
          loadNotifications({ reset: true });
        }
      );
    }

    if (activeLikeTable) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: activeLikeTable,
        },
        () => {
          loadNotifications({ reset: true });
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activePostTable, activeLikeTable, loadNotifications]);

  const handleNotificationClick = useCallback(
    (item) => {
      const key = `${item.type}-${item.id}`;
      setSelectedKey(key);

      if (item.type === "booking") {
        setSelectedBooking(item);
        onBookingClick?.(item);
      } else if (item.type === "post") {
        onPostClick?.(item);
      } else if (item.type === "like") {
        onLikeClick?.(item);
      }

      onNotificationClick?.(item);

      if (
        !onNotificationClick &&
        !onBookingClick &&
        !onPostClick &&
        !onLikeClick &&
        item.type !== "booking" &&
        typeof window !== "undefined"
      ) {
        window.dispatchEvent(
          new CustomEvent("user-notification:open", {
            detail: item,
          })
        );
      }
    },
    [onNotificationClick, onBookingClick, onPostClick, onLikeClick]
  );

  const count = useMemo(() => items.length, [items]);

  return (
    <>
<section className="
w-screen -mx-4 px-4 py-4
sm:w-screen sm:-mx-4 sm:px-4
">
        <div className="mb-4 flex items-center justify-between">
<div className="flex items-center gap-2 sm:gap-3">
  <h3 className="text-[16px] font-medium tracking-[-0.02em] text-white sm:text-[26px] sm:font-semibold">
    Οι ενημερώσεις μου
  </h3>

  <span className="text-[15px] font-medium text-white/50 sm:text-[26px] sm:font-semibold sm:text-white/60">
    ({count})
  </span>
</div>

          <button
            type="button"
            onClick={() => loadNotifications({ reset: true })}
            disabled={refreshing || initialLoading}
            className="flex items-center justify-center disabled:opacity-50"
            aria-label="Ανανέωση ενημερώσεων"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5 text-zinc-400 transition",
                (refreshing || initialLoading) && "animate-spin"
              )}
            />
          </button>
        </div>

        {initialLoading ? (
          <div className="flex gap-2 overflow-x-auto pb-2 subtle-scroll">
            {Array.from({ length: 4 }).map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : errorText ? (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.05] px-3 py-4 text-xs text-rose-300">
            {errorText}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-4 text-xs text-zinc-500">
            Δεν υπάρχουν ενημερώσεις ακόμη.
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            className="flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 subtle-scroll -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            {items.map((item) => (
              <NotificationCard
                key={`${item.type}-${item.id}`}
                item={item}
                isActive={selectedKey === `${item.type}-${item.id}`}
                onClick={handleNotificationClick}
              />
            ))}

            {loadingMore &&
              Array.from({ length: 2 }).map((_, i) => (
                <NotificationSkeleton key={`more-${i}`} />
              ))}

            {hasMore && (
              <div
                ref={sentinelRef}
                className="w-4 min-w-[16px] flex-shrink-0"
                aria-hidden="true"
              />
            )}
          </div>
        )}

        <style>{`
          .subtle-scroll::-webkit-scrollbar {
            height: 4px;
          }

          .subtle-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .subtle-scroll::-webkit-scrollbar-thumb {
            background: rgba(160, 160, 160, 0.22);
            border-radius: 999px;
          }

          .subtle-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(190, 190, 190, 0.32);
          }

          .skeleton-shimmer {
            position: relative;
            overflow: hidden;
          }

          .skeleton-shimmer::after {
            content: "";
            position: absolute;
            inset: 0;
            transform: translateX(-100%);
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.08),
              transparent
            );
            animation: skeleton-slide 1.15s ease-in-out infinite;
          }

          @keyframes skeleton-slide {
            100% {
              transform: translateX(100%);
            }
          }
        `}</style>
      </section>

      <UserBookingNotificationDetails
        open={!!selectedBooking}
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </>
  );
}