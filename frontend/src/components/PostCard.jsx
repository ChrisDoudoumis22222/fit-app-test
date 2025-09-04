import React from 'react';

const PLACEHOLDER = '/placeholder.jpg';

/**
 * Compact post card. Accepts the same object shape returned by the `posts`
 * table (title, description, created_at, image_url or image_urls).
 *
 * Props:
 * ────
 * post : { title, description, created_at, image_url?, image_urls? }
 * style: (optional) override outer card style
 */
export default function PostCard({ post, style = {} }) {
  if (!post) return null;

  const {
    title,
    description,
    created_at,
    image_url,
    image_urls = [],
  } = post;

  const hero = image_url || image_urls[0] || PLACEHOLDER;
  const date = created_at
    ? new Date(created_at).toLocaleDateString('el-GR', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  return (
    <article
      className="rounded-2xl bg-white/80 shadow-lg ring-1 ring-gray-200/50 
                 backdrop-blur-sm transition-all duration-300 hover:shadow-xl 
                 hover:ring-gray-300/50 overflow-hidden"
      style={style}
    >
      {/* Hero Image */}
      <div className="relative overflow-hidden">
        <img
          src={hero || "/placeholder.svg"}
          alt={title || 'Post image'}
          className="h-64 w-full object-cover transition-transform duration-500 
                     hover:scale-105"
          onError={(e) => {
            e.target.src = PLACEHOLDER;
          }}
        />
        {/* Image overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      {/* Content */}
      <div className="space-y-4 p-6">
        {/* Date */}
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-blue-500" />
          <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
            {date}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 leading-tight line-clamp-2">
          {title || 'Untitled Post'}
        </h3>

        {/* Description */}
        <p className="text-gray-600 leading-relaxed line-clamp-4">
          {description || 'No description available.'}
        </p>

        {/* Bottom accent */}
        <div className="pt-2 border-t border-gray-100">
          <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
        </div>
      </div>
    </article>
  );
}