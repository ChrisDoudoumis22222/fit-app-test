"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"
import TrainerMenu from "../components/TrainerMenu"
import UserMenu from "../components/UserMenu"
// Remove this line:
// import { ArrowLeft, MapPin, Calendar, Dumbbell, User } from 'lucide-react'

const PLACEHOLDER = "/placeholder.svg?height=300&width=400&text=No+Image"
const AVATAR_PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar"

export default function TrainerPostsViewPage() {
  const { trainerId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [trainer, setTrainer] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (trainerId) {
      fetchTrainerAndPosts()
    }
  }, [trainerId])

  const fetchTrainerAndPosts = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch trainer profile
      const { data: trainerData, error: trainerError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", trainerId)
        .eq("role", "trainer")
        .single()

      if (trainerError) {
        throw new Error("Trainer not found")
      }

      setTrainer(trainerData)

      // Fetch all posts from this trainer
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("id, title, description, image_url, created_at")
        .eq("trainer_id", trainerId)
        .order("created_at", { ascending: false })

      if (postsError) {
        throw postsError
      }

      setPosts(postsData || [])
    } catch (err) {
      console.error("Error fetching trainer and posts:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatJoinDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    })
  }

  const handlePostClick = (postId) => {
    navigate(`/post/${postId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {profile?.role === "trainer" && <TrainerMenu />}
        {profile?.role === "user" && <UserMenu />}
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading trainer posts...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        {profile?.role === "trainer" && <TrainerMenu />}
        {profile?.role === "user" && <UserMenu />}
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <button
              onClick={() => navigate("/posts")}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Back to All Posts
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!trainer) {
    return (
      <div className="min-h-screen bg-gray-50">
        {profile?.role === "trainer" && <TrainerMenu />}
        {profile?.role === "user" && <UserMenu />}
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Trainer not found.</p>
            <button
              onClick={() => navigate("/posts")}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Back to All Posts
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {profile?.role === "trainer" && <TrainerMenu />}
      {profile?.role === "user" && <UserMenu />}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-8 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          Back
        </button>

        {/* Trainer Profile Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-shrink-0">
              <img
                src={trainer.avatar_url || AVATAR_PLACEHOLDER}
                alt={trainer.full_name}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {trainer.full_name || trainer.email}
              </h1>

              <div className="flex flex-wrap gap-4 mb-4">
                {trainer.specialty && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>🏋️</span>
                    <span className="text-sm">{trainer.specialty}</span>
                  </div>
                )}

                {trainer.experience_years && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>📅</span>
                    <span className="text-sm">{trainer.experience_years} years experience</span>
                  </div>
                )}

                {trainer.location && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>📍</span>
                    <span className="text-sm">{trainer.location}</span>
                  </div>
                )}
              </div>

              {trainer.bio && <p className="text-gray-700 leading-relaxed mb-4 max-w-2xl">{trainer.bio}</p>}

              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span>👤</span>
                  <span>Joined {formatJoinDate(trainer.created_at)}</span>
                </div>
                <div className="font-medium">
                  <span className="text-gray-900">{posts.length}</span> Posts
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Posts by {trainer.full_name || trainer.email}</h2>

          {posts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl text-gray-400">🏋️</span>
              </div>
              <p className="text-gray-600">This trainer hasn't published any posts yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <article
                  key={post.id}
                  onClick={() => handlePostClick(post.id)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer group hover:shadow-md hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.image_url || PLACEHOLDER}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>

                  <div className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-700 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-3 line-clamp-3">
                      {post.description.length > 120 ? `${post.description.substring(0, 120)}...` : post.description}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(post.created_at)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
