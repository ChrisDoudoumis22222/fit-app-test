"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clock3,
  Heart,
  RefreshCw,
} from "lucide-react";
import { supabase } from "../../../supabaseClient";
import TrainerBookingNotificationDetails from "./TrainerBookingNotificationDetails";

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
  const profile = entity?.profiles;

  const fullName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    profile?.display_name ||
    profile?.username ||
    fullName ||
    entity?.trainer_name ||
    entity?.display_name ||
    entity?.username ||
    entity?.name ||
    ""
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

function getLikeActorId(like) {
  return (
    like?.user_id ||
    like?.userId ||
    like?.trainer_id ||
    like?.trainerId ||
    like?.profile_id ||
    like?.profileId ||
    like?.owner_id ||
    like?.ownerId ||
    like?.liked_by ||
    like?.likedBy ||
    like?.author_id ||
    like?.authorId ||
    null
  );
}

/* ---------------- MAPPERS ---------------- */

function mapPendingBookingNotification(b) {
  return {
    ...b,
    type: "booking",
    trainer_name: getDisplayName(b),
    subtitle: "Υπάρχει νέα κράτηση σε εκκρεμότητα που χρειάζεται ενέργεια.",
    target_id: b.id,
    target_type: "booking",
  };
}

function mapFavoriteTrainerPostNotification(p) {
  const trainerName = getDisplayName(p);

  const baseText = trainerName
    ? `ο/η "${trainerName}" ανέβασε αυτή τη δημοσίευση`
    : "Νέα δημοσίευση";

  return {
    ...p,
    type: "post",
    trainer_name: trainerName,
    subtitle:
      truncateText(
        p?.caption ||
        p?.content ||
        p?.description ||
        p?.title ||
        baseText
      ) || baseText,
    target_id: p.id,
    target_type: "post",
    post_id: p.id,
  };
}



/* ---------------- CARD ---------------- */

function NotificationCard({ item, isActive, onClick }) {
  if (item.type === "booking") {
    return (
      <button
        type="button"
        onClick={() => onClick?.(item)}
        className="w-[260px] min-w-[260px] flex-shrink-0 snap-start text-left"
      >
        <div
          className={cn(
            "rounded-lg border p-3 backdrop-blur-md transition min-h-[120px]",
            "border-amber-500/20 bg-amber-500/[0.05] hover:bg-amber-500/[0.07]",
            isActive && "ring-1 ring-white/15"
          )}
        >
          <div className="flex items-start gap-2">
            <Clock3 className="mt-[2px] h-5 w-5 shrink-0 text-amber-400" />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-200">
                Εκκρεμής κράτηση
              </p>

              <p className="mt-[2px] truncate text-xs font-medium text-zinc-400">
                {item.user_name || item.client_name || item.customer_name || "Νέος πελάτης"}
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
      className="w-[260px] min-w-[260px] flex-shrink-0 snap-start text-left"
    >
      <div
        className={cn(
          "rounded-lg border p-3 backdrop-blur-md transition min-h-[120px]",
          "border-blue-500/20 bg-blue-500/[0.04] hover:bg-blue-500/[0.06]",
          isActive && "ring-1 ring-white/15"
        )}
      >
        <div className="flex items-start gap-2">
          <Heart className="mt-[2px] h-5 w-5 shrink-0 text-blue-400" />

          <div className="min-w-0 flex-1">
<p className="text-sm font-semibold text-zinc-200">
  {item.trainer_name || item.username || item.user_name || "Χρήστης"}
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
    <div className="w-[260px] min-w-[260px] flex-shrink-0 snap-start rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-start gap-2">
        <div className="skeleton-shimmer mt-[2px] h-4 w-4 rounded-full bg-white/[0.06]" />

        <div className="flex-1">
          <div className="skeleton-shimmer h-3 w-28 rounded-md bg-white/[0.06]" />
          <div className="skeleton-shimmer mt-2 h-3 w-20 rounded-md bg-white/[0.05]" />
          <div className="skeleton-shimmer mt-2 h-2.5 w-28 rounded-md bg-white/[0.04]" />
          <div className="skeleton-shimmer mt-2 h-2.5 w-16 rounded-md bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}

/* ---------------- COMPONENT ---------------- */

export default function TrainerNotificationsFeed({
  trainerId,
  pageSize = 8,
  onNotificationClick,
  onBookingClick,
  onPostClick,
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
      const sourceFetchLimit = Math.max(targetCount * 5, 30);

      /* 1) PENDING BOOKINGS FOR THIS TRAINER */
      const { data: bookingRows, error: bookingError } = await supabase
        .from("trainer_bookings")
        .select("*")
        .eq("trainer_id", trainerId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(sourceFetchLimit);

      if (bookingError) throw bookingError;

      const rawBookings = Array.isArray(bookingRows) ? bookingRows : [];
      const bookingItems = rawBookings.map(mapPendingBookingNotification);

      /* 2) FIND POSTS THIS TRAINER HAS LIKED -> DERIVE FAVORITE TRAINERS */
      const likesResult = await queryFirstWorkingTable(
        LIKE_TABLE_CANDIDATES,
        (q) =>
          q
            .select("*")
            .order("created_at", { ascending: false })
            .limit(Math.max(targetCount * 10, 60))
      );

      if (likesResult.error && !likesResult.table) {
        throw likesResult.error;
      }

      const resolvedLikeTable = likesResult.table;

      const myLikes = (likesResult.data || []).filter((like) => {
        const actorId = getLikeActorId(like);
        return actorId && String(actorId) === String(trainerId);
      });

      const likedPostIds = [
        ...new Set(myLikes.map(getLikePostId).filter(Boolean).map(String)),
      ];

      let postItems = [];
      let resolvedPostTable = null;

      if (likedPostIds.length > 0) {
const postsResult = await queryFirstWorkingTable(
  POST_TABLE_CANDIDATES,
  (q) =>
    q
      .select(`
        *,
        profiles:trainer_id (
          username,
          display_name,
          first_name,
          last_name
        )
      `)
      .order("created_at", { ascending: false })
      .limit(Math.max(targetCount * 12, 80))
);

        if (postsResult.error && !postsResult.table) {
          throw postsResult.error;
        }

        resolvedPostTable = postsResult.table;

        const allPosts = postsResult.data || [];

        const likedPostsMap = new Map(
          allPosts
            .filter((post) => likedPostIds.includes(String(post.id)))
            .map((post) => [String(post.id), post])
        );

        const favoriteTrainerIds = [
          ...new Set(
            [...likedPostsMap.values()]
              .map((post) => getPostOwnerId(post))
              .filter(Boolean)
              .map(String)
          ),
        ];

        const favoriteTrainerPosts = allPosts.filter((post) => {
          const ownerId = getPostOwnerId(post);
          return ownerId && favoriteTrainerIds.includes(String(ownerId));
        });

        postItems = favoriteTrainerPosts.map(mapFavoriteTrainerPostNotification);
      }

      return {
        merged: dedupeAndSortNotifications([...bookingItems, ...postItems]),
        resolvedPostTable,
        resolvedLikeTable,
      };
    },
    [trainerId]
  );

  const loadNotifications = useCallback(
    async ({ reset = false } = {}) => {
      if (!trainerId) {
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
        console.error("Trainer notifications fetch error:", err);
        setErrorText(err?.message || "Κάτι πήγε στραβά στη φόρτωση.");
      } finally {
        fetchingRef.current = false;
        setInitialLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [trainerId, pageSize, fetchMergedNotifications]
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
  }, [trainerId, pageSize, loadNotifications]);

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
    if (!trainerId) return;

    const channel = supabase.channel(
      `trainer-notifications-${trainerId}-${activePostTable || "posts"}-${activeLikeTable || "likes"}`
    );

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "trainer_bookings",
        filter: `trainer_id=eq.${trainerId}`,
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
  }, [trainerId, activePostTable, activeLikeTable, loadNotifications]);

  const handleBookingStatusChange = useCallback(
    async (booking, nextStatus) => {
      if (!booking?.id) {
        throw new Error("Δεν βρέθηκε ID κράτησης.");
      }

      const updatePayload = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("trainer_bookings")
        .update(updatePayload)
        .eq("id", booking.id)
        .eq("trainer_id", trainerId)
        .select("*")
        .single();

      if (error) throw error;

      const updatedBooking = {
        ...booking,
        ...(data || {}),
        type: "booking",
      };

      setSelectedBooking(updatedBooking);

      setItems((prev) =>
        prev.filter(
          (item) => !(item.type === "booking" && String(item.id) === String(booking.id))
        )
      );

      setSelectedKey((prev) =>
        prev === `booking-${booking.id}` ? "" : prev
      );

      hasMoreRef.current = true;
      loadNotifications({ reset: true });

      return updatedBooking;
    },
    [trainerId, loadNotifications]
  );

  const handleNotificationClick = useCallback(
    (item) => {
      const key = `${item.type}-${item.id}`;
      setSelectedKey(key);

      if (item.type === "booking") {
        setSelectedBooking(item);
        onBookingClick?.(item);
      } else if (item.type === "post") {
        onPostClick?.(item);
      }

      onNotificationClick?.(item);

      if (
        !onNotificationClick &&
        !onBookingClick &&
        !onPostClick &&
        item.type !== "booking" &&
        typeof window !== "undefined"
      ) {
        window.dispatchEvent(
          new CustomEvent("trainer-notification:open", {
            detail: item,
          })
        );
      }
    },
    [onNotificationClick, onBookingClick, onPostClick]
  );

  const count = useMemo(() => items.length, [items]);

  return (
    <>
      <section className="w-full py-4">
        <div className="mb-5 flex items-center justify-between">
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
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-3 subtle-scroll"
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

      <TrainerBookingNotificationDetails
        open={!!selectedBooking}
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onStatusChange={handleBookingStatusChange}
        onBookingUpdated={(updatedBooking) => {
          setSelectedBooking(updatedBooking || null);
        }}
      />
    </>
  );
}