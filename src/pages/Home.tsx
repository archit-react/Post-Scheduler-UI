import { useEffect, useState, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { v4 as uuidv4 } from "uuid";

type Post = {
  id: string;
  text: string;
  time: string | Date;
  notified?: boolean;
};

export default function Home() {
  const alarmSoundRef = useRef<HTMLAudioElement | null>(null);
  const [input, setInput] = useState("");
  const [time, setTime] = useState<Date | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("scheduled-posts");
    if (stored) {
      const parsed: Post[] = JSON.parse(stored);
      const reset = parsed.map((p) => ({
        ...p,
        notified: false,
      }));

      const now = new Date();
      const upcoming = reset
        .filter((p) => new Date(p.time) > now)
        .sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
        );
      setPosts(upcoming);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("scheduled-posts", JSON.stringify(posts));
  }, [posts]);

  // Load alarm sound
  useEffect(() => {
    const audio = new Audio("/reminder.mp3");
    audio.volume = 1;
    audio.load();
    alarmSoundRef.current = audio;
  }, []);

  // Alarm trigger loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();

      const updated = posts.map((post) => {
        const postTime = new Date(post.time);
        const minutesDiff = Math.floor(
          (postTime.getTime() - now.getTime()) / 60000
        );

        // 🔥 Logging for debug
        console.log("🕒 Now:", now.toISOString());
        console.log("📅 Post:", post.text);
        console.log("⏳ Scheduled:", postTime.toISOString());
        console.log("🔁 Minutes left:", minutesDiff);
        console.log("🔔 Already Notified:", post.notified);

        if (minutesDiff === 1 && !post.notified) {
          toast(`⏰ Reminder: “${post.text}” is due in 1 min`);

          if (alarmSoundRef.current) {
            alarmSoundRef.current.pause();
            alarmSoundRef.current.currentTime = 0;
            alarmSoundRef.current.load();

            if (document.visibilityState === "visible") {
              alarmSoundRef.current
                .play()
                .then(() => console.log("✅ Alarm Played"))
                .catch((err) => console.error("❌ Alarm Failed to Play:", err));
            } else {
              console.warn("🚫 Tab not visible. Alarm skipped.");
            }
          }

          return { ...post, notified: true };
        }

        return post;
      });

      setPosts(updated);
    }, 30000);

    return () => clearInterval(interval);
  }, [posts]);

  // Handle new/edit post
  const handleSubmit = () => {
    if (!input.trim()) return toast.error("Enter some content.");
    if (!time) return toast.error("Please choose a date and time.");

    if (editingPostId) {
      const updated = posts.map((post) =>
        post.id === editingPostId
          ? {
              ...post,
              text: input,
              time: time.toISOString(),
              notified: false,
            }
          : post
      );
      setPosts(updated);
      setEditingPostId(null);
      toast.success("Post updated.");
    } else {
      const newPost: Post = {
        id: uuidv4(),
        text: input,
        time: time.toISOString(),
        notified: false,
      };
      setPosts([newPost, ...posts]);
      toast.success("Post scheduled.");
    }

    setInput("");
    setTime(null);
  };

  const handleEdit = (post: Post) => {
    setInput(post.text);
    setTime(new Date(post.time));
    setEditingPostId(post.id);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this post?")) {
      setPosts(posts.filter((p) => p.id !== id));
      toast.success("Deleted.");
    }
  };

  const clearAll = () => {
    if (window.confirm("Clear all posts?")) {
      setPosts([]);
      localStorage.removeItem("scheduled-posts");
      toast.success("All posts cleared.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-slate-900 to-gray-800 text-white">
      <div className="w-full max-w-3xl space-y-12">
        {/* Heading */}
        <div className="text-center">
          <h1 className="text-5xl font-extrabold tracking-tight mb-2">
            📅 Post Scheduler
          </h1>
          <p className="text-gray-400 text-lg">
            Create & manage scheduled content with{" "}
            <span className="font-medium text-white">{timezone}</span> time
            support
          </p>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">
              Post Content
            </label>
            <textarea
              className="w-full rounded-md p-3 bg-gray-800 text-white placeholder:text-gray-400"
              rows={3}
              placeholder="What's on your mind?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">
              Schedule Date & Time
            </label>
            <DatePicker
              selected={time}
              onChange={(date) => setTime(date)}
              showTimeSelect
              timeFormat="hh:mm aa"
              timeIntervals={15}
              dateFormat="MMMM d, yyyy h:mm aa"
              placeholderText="Pick a date and time"
              className="w-full rounded-md p-3 bg-gray-800 text-white placeholder:text-gray-400"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-2 bg-blue-600 rounded-md hover:bg-blue-700 font-semibold transition"
          >
            {editingPostId ? "Update Post" : "Schedule Post"}
          </button>
        </div>

        {/* Posts */}
        <div>
          <h2 className="text-3xl font-semibold mb-4">📌 Scheduled Posts</h2>
          {posts.length === 0 ? (
            <p className="text-gray-400 italic">Nothing scheduled.</p>
          ) : (
            <ul className="space-y-4">
              {posts.map((post) => (
                <li
                  key={post.id}
                  className="bg-white/5 p-5 rounded-lg border border-white/10 flex justify-between items-start"
                >
                  <div>
                    <p className="font-medium text-white">{post.text}</p>
                    <p className="text-sm text-gray-300 mt-1">
                      Scheduled for:{" "}
                      <span className="font-semibold">
                        {new Date(post.time).toLocaleString(undefined, {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      </span>
                      <br />
                      <span className="italic text-xs text-gray-400">
                        (
                        {formatDistanceToNow(new Date(post.time), {
                          addSuffix: true,
                        })}
                        )
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 ml-4">
                    <button
                      onClick={() => handleEdit(post)}
                      className="text-yellow-400 hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-red-400 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {posts.length > 0 && (
            <button
              onClick={clearAll}
              className="mt-6 w-full py-2 bg-red-600 rounded-md hover:bg-red-700 font-semibold transition"
            >
              Clear All Posts
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
