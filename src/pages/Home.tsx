import { useEffect, useState, useRef, useCallback } from "react";
import { formatDistanceToNow, format } from "date-fns";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";

// Global toast tracking
const shownToastIds = new Set<string>();

type Post = {
  id: string;
  text: string;
  time: string | Date;
  notified?: boolean;
  color?: string;
};

const COLORS = [
  "bg-indigo-500",
  "bg-pink-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-purple-500",
];

export default function Home() {
  const alarmSoundRef = useRef<HTMLAudioElement | null>(null);
  const [input, setInput] = useState("");
  const [time, setTime] = useState<Date | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Load from localStorage
  useEffect(() => {
    const loadPosts = () => {
      const stored = localStorage.getItem("scheduled-posts");
      if (stored) {
        try {
          const parsed: Post[] = JSON.parse(stored);
          const now = new Date();

          const withColors = parsed.map((p) => ({
            ...p,
            color: p.color || COLORS[Math.floor(Math.random() * COLORS.length)],
            notified: false,
          }));

          const upcoming = withColors
            .filter((p) => new Date(p.time) > now)
            .sort(
              (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
            );

          setPosts(upcoming);
        } catch (err) {
          console.error("Failed to parse stored posts", err);
          toast.error("Failed to load saved posts");
        }
      }
      setIsLoading(false);
    };

    loadPosts();
  }, []);

  // Save to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem("scheduled-posts", JSON.stringify(posts));
    }, 500);
    return () => clearTimeout(timer);
  }, [posts]);

  // Load and preload alarm sound
  useEffect(() => {
    const audio = new Audio("/reminder.mp3");
    audio.volume = 0.7;
    // Preload the audio file
    audio.load();
    alarmSoundRef.current = audio;

    return () => {
      if (alarmSoundRef.current) {
        alarmSoundRef.current.pause();
      }
    };
  }, []);

  // Alarm checker with synchronized toast and sound
  const checkAlarms = useCallback(() => {
    const now = new Date();

    setPosts((prevPosts) => {
      const updatedPosts = prevPosts.map((post) => {
        const postTime = new Date(post.time);
        const minutesDiff = Math.floor(
          (postTime.getTime() - now.getTime()) / 60000
        );

        const alreadyShown = shownToastIds.has(post.id);

        if (minutesDiff === 1 && !alreadyShown) {
          shownToastIds.add(post.id);

          // Prepare sound first
          if (alarmSoundRef.current) {
            alarmSoundRef.current.pause();
            alarmSoundRef.current.currentTime = 0;
          }

          // Show toast
          toast.custom(
            (t) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`${post.color} text-white px-6 py-4 shadow-lg rounded-lg flex items-center`}
              >
                <div className="flex-1">
                  <p className="font-bold">⏰ Reminder!</p>
                  <p>"{post.text}" is due in 1 minute</p>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="ml-4 p-1 rounded-full hover:bg-white/20"
                >
                  ✕
                </button>
              </motion.div>
            ),
            { duration: 10000 }
          );

          // Play sound immediately after toast creation
          if (alarmSoundRef.current) {
            const playPromise = alarmSoundRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                console.warn("Audio playback prevented");
              });
            }
          }

          return { ...post, notified: true };
        }

        return post;
      });

      // Only update state if something changed
      if (JSON.stringify(updatedPosts) !== JSON.stringify(prevPosts)) {
        return updatedPosts;
      }
      return prevPosts;
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(checkAlarms, 30000);
    return () => clearInterval(interval);
  }, [checkAlarms]);

  // Handle new/edit post
  const handleSubmit = () => {
    if (!input.trim()) {
      toast.error("Post content cannot be empty");
      return;
    }

    if (!time) {
      toast.error("Please select a date and time");
      return;
    }

    if (time < new Date()) {
      toast.error("Please select a future date and time");
      return;
    }

    if (editingPostId) {
      setPosts(
        posts.map((post) =>
          post.id === editingPostId
            ? {
                ...post,
                text: input,
                time: time.toISOString(),
                notified: false,
              }
            : post
        )
      );
      setEditingPostId(null);
      toast.success("Post updated successfully");
    } else {
      const newPost: Post = {
        id: uuidv4(),
        text: input,
        time: time.toISOString(),
        notified: false,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
      setPosts([newPost, ...posts]);
      toast.success("Post scheduled successfully");
    }

    setInput("");
    setTime(null);
  };

  const handleEdit = (post: Post) => {
    setInput(post.text);
    setTime(new Date(post.time));
    setEditingPostId(post.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    toast.custom((t) => (
      <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow-xl">
        <p className="font-medium mb-3">
          Are you sure you want to delete this post?
        </p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setPosts(posts.filter((p) => p.id !== id));
              toast.success("Post deleted");
              toast.dismiss(t.id);
            }}
            className="px-3 py-1 rounded bg-red-600 hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    ));
  };

  const clearAll = () => {
    toast.custom((t) => (
      <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow-xl">
        <p className="font-medium mb-3">
          Are you sure you want to delete ALL posts?
        </p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1 rounded bg-gray-600 hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setPosts([]);
              localStorage.removeItem("scheduled-posts");
              toast.success("All posts cleared");
              toast.dismiss(t.id);
            }}
            className="px-3 py-1 rounded bg-red-600 hover:bg-red-500"
          >
            Clear All
          </button>
        </div>
      </div>
    ));
  };

  const now = new Date();
  const upcomingPosts = posts.filter((post) => new Date(post.time) > now);
  const pastPosts = posts.filter((post) => new Date(post.time) <= now);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h1 className="text-5xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-400">
            Post Scheduler
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            Schedule your posts with precision. Timezone-aware, accessible, and
            with delightful micro-interactions. Currently using{" "}
            <span className="font-medium text-indigo-300">{timezone}</span>.
          </p>
        </motion.header>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700 shadow-xl mb-12"
        >
          <h2 className="text-2xl font-semibold mb-6 flex items-center">
            {editingPostId ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit Post
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Schedule New Post
              </>
            )}
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Post Content
              </label>
              <textarea
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                rows={3}
                placeholder="What do you want to remember?..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-400">
                {input.length}/500 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Schedule Date & Time
              </label>
              <DatePicker
                selected={time}
                onChange={(date) => setTime(date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMMM d, yyyy h:mm aa"
                placeholderText="Select date and time"
                minDate={new Date()}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                wrapperClassName="w-full"
                popperClassName="z-50"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || !time}
                className={`px-6 py-2 rounded-lg font-medium flex items-center ${
                  !input.trim() || !time
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-500"
                } transition`}
              >
                {editingPostId ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                    </svg>
                    Update Post
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Schedule Post
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Posts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Your Scheduled Posts</h2>
            {posts.length > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab("upcoming")}
                  className={`px-4 py-1 rounded-full text-sm ${
                    activeTab === "upcoming"
                      ? "bg-indigo-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setActiveTab("past")}
                  className={`px-4 py-1 rounded-full text-sm ${
                    activeTab === "past"
                      ? "bg-indigo-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  Past
                </button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-gray-800/50 rounded-xl p-8 text-center border border-gray-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto text-gray-500 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h3 className="text-lg font-medium mb-2">No posts scheduled</h3>
              <p className="text-gray-400">
                Create your first scheduled post above
              </p>
            </div>
          ) : (
            <>
              <AnimatePresence>
                {(activeTab === "upcoming" ? upcomingPosts : pastPosts).map(
                  (post) => (
                    <motion.div
                      key={post.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className={`mb-4 rounded-xl overflow-hidden border ${
                        new Date(post.time) <= now
                          ? "border-gray-700 bg-gray-800/30"
                          : "border-gray-600 bg-gray-800/50"
                      }`}
                    >
                      <div className={`h-2 ${post.color}`}></div>
                      <div className="p-5">
                        <div className="flex justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-lg truncate">
                              {post.text}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center text-sm text-gray-400">
                              <span className="flex items-center mr-4">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 mr-1"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                {format(
                                  new Date(post.time),
                                  "MMM d, yyyy h:mm a"
                                )}
                              </span>
                              <span className="flex items-center">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 mr-1"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                                {timezone}
                              </span>
                            </div>
                            <p className="mt-2 text-sm italic text-gray-500">
                              {formatDistanceToNow(new Date(post.time), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => handleEdit(post)}
                              className="p-2 rounded-full hover:bg-gray-700 transition"
                              aria-label="Edit post"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(post.id)}
                              className="p-2 rounded-full hover:bg-gray-700 transition"
                              aria-label="Delete post"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                )}
              </AnimatePresence>

              {posts.length > 0 && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={clearAll}
                    className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 flex items-center transition"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Clear All Posts
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
