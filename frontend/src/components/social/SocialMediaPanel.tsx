"use client";

import { useEffect, useState } from "react";
import { api, type SocialMediaData } from "@/lib/apiClient";

export default function SocialMediaPanel() {
  const [items, setItems] = useState<SocialMediaData[]>([]);
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState("Twitter / X");
  const [username, setUsername] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSocialMedia = async () => {
    try {
      setLoading(true);
      const data = await api.socialMedia.list();
      setItems(data);
    } catch {
      // Ignored if unauthenticated or network error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocialMedia();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platform.trim()) return;

    try {
      setError(null);
      const created = await api.socialMedia.create({
        platform: platform.trim(),
        username: username.trim() || undefined,
        profileUrl: profileUrl.trim() || undefined,
        accessToken: accessToken.trim() || undefined,
      });
      setItems((prev) => [...prev, created]);
      setUsername("");
      setProfileUrl("");
      setAccessToken("");
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add social media");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.socialMedia.delete(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Company Social Media
          </h2>
          <p className="text-xs text-slate-500">
            Connected brand profiles in PostgreSQL
          </p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          {isOpen ? "Cancel" : "+ Add"}
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded-2xl bg-rose-50 p-2.5 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      {isOpen ? (
        <form onSubmit={handleAdd} className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
          <div>
            <label className="block text-xs font-medium text-slate-700">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
            >
              <option value="Twitter / X">Twitter / X</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="GitHub">GitHub</option>
              <option value="YouTube">YouTube</option>
              <option value="Facebook">Facebook</option>
              <option value="Instagram">Instagram</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Username / Handle</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@company"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Profile URL</label>
            <input
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder="https://x.com/company"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Access Token (Stored safely, not exposed on GET)
            </label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Optional API token"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            Save to PostgreSQL
          </button>
        </form>
      ) : null}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-xs text-slate-400">Loading accounts...</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-400">No social media accounts connected.</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-700"
            >
              <div>
                <span className="font-semibold text-slate-900">{item.platform}</span>
                {item.username ? (
                  <span className="ml-1 text-slate-500">({item.username})</span>
                ) : null}
                {item.profileUrl ? (
                  <a
                    href={item.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    view
                  </a>
                ) : null}
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-slate-400 transition hover:text-rose-600"
                title="Delete"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
