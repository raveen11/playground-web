"use client";

import React, { useState } from "react";
import type { WrestlingCardData, WrestlerData } from "@/lib/apiClient";

interface WrestlerCardDeckProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  cards?: WrestlingCardData[];
  wrestlersFallback?: WrestlerData[];
}

export default function WrestlerCardDeck({
  isOpen,
  onClose,
  userName,
  cards = [],
  wrestlersFallback = [],
}: WrestlerCardDeckProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("ALL");

  if (!isOpen) return null;

  // Extract wrestlers from cards or fallback
  const cardItems: Array<{
    id: string;
    wrestler: WrestlerData;
    title?: string | null;
  }> = [];

  if (cards && cards.length > 0) {
    cards.forEach((card) => {
      if (card.wrestler) {
        cardItems.push({
          id: card.id,
          wrestler: card.wrestler,
          title: card.title,
        });
      } else if (card.wrestlers && card.wrestlers.length > 0) {
        card.wrestlers.forEach((w) => {
          cardItems.push({
            id: `${card.id}-${w.id}`,
            wrestler: w,
            title: card.title,
          });
        });
      }
    });
  }

  // If no cardItems found, use fallback wrestlers
  if (cardItems.length === 0 && wrestlersFallback.length > 0) {
    wrestlersFallback.slice(0, 20).forEach((w) => {
      cardItems.push({
        id: w.id,
        wrestler: w,
        title: `${w.name} Card`,
      });
    });
  }

  const tiers = ["ALL", "Legend", "Champion", "Superstar"];

  const filteredCards = cardItems.filter((item) => {
    const matchesSearch =
      item.wrestler.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.wrestler.alias &&
        item.wrestler.alias.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.wrestler.finisher.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTier =
      selectedTier === "ALL" ||
      item.wrestler.tier.toLowerCase() === selectedTier.toLowerCase();

    return matchesSearch && matchesTier;
  });

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "legend":
        return {
          border: "border-amber-500/60 shadow-amber-500/20",
          badge: "bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 font-bold",
          glow: "from-amber-500/20 via-yellow-500/5 to-transparent",
        };
      case "champion":
        return {
          border: "border-rose-500/60 shadow-rose-500/20",
          badge: "bg-gradient-to-r from-rose-600 to-red-500 text-white font-bold",
          glow: "from-rose-500/20 via-red-500/5 to-transparent",
        };
      default:
        return {
          border: "border-purple-500/60 shadow-purple-500/20",
          badge: "bg-gradient-to-r from-purple-600 to-indigo-500 text-white font-bold",
          glow: "from-purple-500/20 via-indigo-500/5 to-transparent",
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 text-white font-black shadow-lg shadow-amber-500/20">
              ⚡
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-wide text-white">
                {userName}&apos;s Wrestling Deck
              </h2>
              <p className="text-xs text-slate-400">
                20 Official Roster Cards • Live Power Ratings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close Deck"
          >
            ✕
          </button>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-800/60 bg-slate-900/30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Tier:
            </span>
            <div className="flex gap-1.5">
              {tiers.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTier(t)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                    selectedTier === t
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                      : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search wrestler or finisher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3.5 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* Card Grid */}
        <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCards.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500">
              <p className="text-sm">No wrestler cards match your search.</p>
            </div>
          ) : (
            filteredCards.map((item, idx) => {
              const tierStyle = getTierColor(item.wrestler.tier);
              return (
                <div
                  key={`${item.id}-${idx}`}
                  className={`relative flex flex-col justify-between p-4 rounded-xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border ${tierStyle.border} shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl group`}
                >
                  {/* Subtle card glow overlay */}
                  <div
                    className={`absolute inset-0 rounded-xl bg-gradient-to-b ${tierStyle.glow} pointer-events-none`}
                  />

                  {/* Top Bar: Tier & Index */}
                  <div className="relative flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-md ${tierStyle.badge}`}
                    >
                      {item.wrestler.tier}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      #{String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Wrestler Info & Visual */}
                  <div className="relative my-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800 flex items-center justify-center shrink-0 shadow">
                        {item.wrestler.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.wrestler.avatar}
                            alt={item.wrestler.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-amber-400">
                            {item.wrestler.name[0]}
                          </span>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-extrabold text-sm text-white truncate group-hover:text-amber-400 transition-colors">
                          {item.wrestler.name}
                        </h3>
                        {item.wrestler.alias && (
                          <p className="text-[11px] italic text-slate-400 truncate">
                            &quot;{item.wrestler.alias}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Attributes Stats */}
                  <div className="relative my-3 space-y-1.5 text-[11px] font-medium">
                    {/* Attack */}
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">PWR</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-red-500 to-rose-400 rounded-full"
                            style={{ width: `${item.wrestler.attack}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold w-6 text-right">
                          {item.wrestler.attack}
                        </span>
                      </div>
                    </div>

                    {/* Defense */}
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">DEF</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                            style={{ width: `${item.wrestler.defense}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold w-6 text-right">
                          {item.wrestler.defense}
                        </span>
                      </div>
                    </div>

                    {/* Speed */}
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">SPD</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                            style={{ width: `${item.wrestler.speed}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold w-6 text-right">
                          {item.wrestler.speed}
                        </span>
                      </div>
                    </div>

                    {/* HP */}
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400">HP</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                            style={{
                              width: `${Math.min(100, item.wrestler.hp)}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono font-bold w-6 text-right">
                          {item.wrestler.hp}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Finisher Footer */}
                  <div className="relative pt-2.5 mt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-semibold uppercase text-[10px]">
                      Finisher:
                    </span>
                    <span className="font-bold text-amber-300 truncate max-w-[140px]">
                      {item.wrestler.finisher}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-900/50 text-xs text-slate-400">
          <span>
            Total: <strong className="text-white">{filteredCards.length}</strong> /{" "}
            {cardItems.length} Cards
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors shadow"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
