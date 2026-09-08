"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import type { PresenceUser } from "@kanban/shared";
import type { UserWithCards, WrestlerData, WrestlingCardData } from "@/lib/apiClient";
import WrestlerCardDeck from "./WrestlerCardDeck";

interface RoundTableLobbyProps {
  connectedUsers: PresenceUser[];
  currentUserId?: string;
  currentUserName?: string;
  dbUsers: UserWithCards[];
  wrestlers: WrestlerData[];
  wsConnected: boolean;
}


export default function RoundTableLobby({
  connectedUsers,
  currentUserId,
  currentUserName,
  dbUsers,
  wrestlers,
  wsConnected,
}: RoundTableLobbyProps) {
  const [selectedUserForDeck, setSelectedUserForDeck] = useState<{
    name: string;
    cards?: WrestlingCardData[];
  } | null>(null);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showUserListDrawer, setShowUserListDrawer] = useState(false);
  const [competitionDeck, setCompetitionDeck] = useState({})

  // Minimum 8 seats around the table for a rich round-table visual
  const totalSeats = Math.max(8, connectedUsers.length);

  // Map each connected user to a seat around the circle
  const seatedUsers = useMemo(() => {
    return connectedUsers.map((user, index) => {
      // Angle in radians, starting from top (-PI / 2)
      const angle = (2 * Math.PI * index) / totalSeats - Math.PI / 2;
      // Radius percent from center (50%)
      const radius = 38; // 38% radius
      const x = 50 + radius * Math.cos(angle);
      const y = 50 + radius * Math.sin(angle);

      // Find user in dbUsers to get real cardList if available
      const dbUserMatch = dbUsers.find(
        (u) =>
          u.id === user.userId ||
          u.email?.toLowerCase() === user.name.toLowerCase(),
      );

      return {
        ...user,
        x,
        y,
        angle,
        cardList: dbUserMatch?.cardList ?? user.cardList,
        isCurrentUser:
          user.userId === currentUserId ||
          user.name.toLowerCase() === currentUserName?.toLowerCase(),
      };
    });
  }, [connectedUsers, totalSeats, dbUsers, currentUserId, currentUserName]);
  // Generate empty placeholder seats to complete the round table
  const emptySeats = useMemo(() => {
    const empties = [];
    for (let i = connectedUsers.length; i < totalSeats; i++) {
      const angle = (2 * Math.PI * i) / totalSeats - Math.PI / 2;
      const radius = 38;
      const x = 50 + radius * Math.cos(angle);
      const y = 50 + radius * Math.sin(angle);
      empties.push({ index: i, x, y });
    }
    return empties;
  }, [connectedUsers.length, totalSeats]);

  // Current user's cards
  const currentUserCards = useMemo(() => {
    const me = dbUsers.find(
      (u) =>
        u.id === currentUserId ||
        u.name.toLowerCase() === currentUserName?.toLowerCase(),
    );
    return me?.cardList;
  }, [dbUsers, currentUserId, currentUserName]);
  console.log('ABCD-seatedUsers', competitionDeck, seatedUsers, currentUserCards)


  const DeckOfCardsView = ({ userName, selectedUserForDeck, wrestlers }: { userName: string; selectedUserForDeck: { name: string; cards?: WrestlingCardData[] | undefined; } | null; wrestlers: WrestlerData[]; }) => {
    const submitCardForCompetition = (card: WrestlingCardData) => {
      setCompetitionDeck(
        (prevDeck: { [key: string]: WrestlingCardData[] }) => {
          const userId = card.userId;

          return {
            ...prevDeck,
            [userId]: [
              card,
              ...(prevDeck[userId] ?? []),
            ],
          };
        }
      );
    }
    return (
      <div>
        {selectedUserForDeck?.cards?.length && <div className="relative h-56 w-40">
          {selectedUserForDeck?.cards?.map((card, index) => (
            <div
              key={card.id}
              onClick={() => submitCardForCompetition(card)}
              className="absolute inset-0 rounded-xl border bg-gray-700 shadow-md"
              style={{
                transform: `translateY(${index * 3}px)`,
                zIndex: index,
              }}
            >
              {/* Card content */}

            </div>
          ))}
        </div>}
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            ← Back to Board
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${wsConnected ? "bg-emerald-400" : "bg-rose-400"
                  }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${wsConnected ? "bg-emerald-500" : "bg-rose-500"
                  }`}
              />
            </span>
            <span className="text-xs font-medium text-slate-300">
              {wsConnected ? "WebSocket Connected" : "Connecting..."}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setSelectedUserForDeck({
                name: currentUserName || "My Deck",
                cards: currentUserCards,
              })
            }
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <span>🎴</span> My 20 Cards
          </button>

          <button
            onClick={() => setShowRosterModal(true)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer"
          >
            All Wrestlers ({wrestlers.length})
          </button>

          <button
            onClick={() => setShowUserListDrawer(!showUserListDrawer)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 cursor-pointer"
          >
            Users List ({connectedUsers.length})
          </button>
        </div>
      </header>

      {/* Main Arena Table Section */}
      <main className="relative flex-1 flex flex-col items-center justify-center p-4">
        {/* Arena Title Badge */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1 shadow-sm">
            <span>⚔️</span> Arena 1 • Grand Wrestling Council
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Wrestling Lobby
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Round Table • Live Connected Users & 20-Card Decks
          </p>
        </div>

        {/* Circular Round Table Container */}
        <div className="relative w-[340px] h-[340px] sm:w-[500px] sm:h-[500px] md:w-[580px] md:h-[580px] lg:w-[640px] lg:h-[640px] mt-16 sm:mt-12 flex items-center justify-center">
          {/* Outer Ring boundary */}
          <div className="absolute inset-0 rounded-full border border-slate-800/80 bg-slate-900/10 pointer-events-none" />

          {/* Glowing Table Top (The Round Table) */}
          <div className="relative w-[68%] h-[68%] rounded-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-4 border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col items-center justify-center p-6 text-center group">
            {/* Table inner ring rope details */}
            <div className="absolute inset-3 rounded-full border border-dashed border-amber-500/20 pointer-events-none" />
            <div className="absolute inset-8 rounded-full border border-slate-800/80 pointer-events-none" />

            {/* Center Table Emblem */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 p-0.5 shadow-xl shadow-amber-500/20 mb-2 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl">
                  🏆
                </div>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide uppercase">
                Round Table
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] sm:text-xs font-semibold text-emerald-400">
                  {connectedUsers.length}{" "}
                  {connectedUsers.length === 1 ? "User" : "Users"} Seated
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[160px] hidden sm:block">
                Click any seated challenger to inspect their 20 wrestling cards
              </p>
            </div>
          </div>

          {/* Empty Seats (Dashed rings around the table) */}
          {emptySeats.map((seat) => (
            <div
              key={`empty-${seat.index}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none opacity-30 transition-opacity"
              style={{
                left: `${seat.x}%`,
                top: `${seat.y}%`,
              }}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-dashed border-slate-700 bg-slate-900/40 flex items-center justify-center text-slate-600 text-lg">
                🪑
              </div>
              <span className="text-[9px] text-slate-600 font-medium mt-1">
                Empty
              </span>
            </div>
          ))}

          {/* Seated Users around the Round Table */}
          {seatedUsers.map((user) => (
            <div
              key={user.userId}
              onClick={() =>
                // console.log('ABCD-sele', connectedUsers, currentUserId, user)
                currentUserId == user.userId && setSelectedUserForDeck({
                  name: user.name,
                  cards: user.cardList,
                })
              }
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-all duration-300 hover:scale-110 z-20 group"
              style={{
                left: `${user.x}%`,
                top: `${user.y}%`,
              }}
            >
              {/* Chair / Avatar circle with user presence color */}
              <div className="relative">
                <div
                  className="w-13 h-13 sm:w-16 sm:h-16 rounded-full p-1 transition-transform shadow-xl flex items-center justify-center"
                  style={{
                    backgroundColor: user.color,
                    boxShadow: `0 0 20px ${user.color}40`,
                  }}
                >
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden border-2 border-slate-900">
                    {user.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-base sm:text-lg font-black text-white">
                        {user.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Online Status Beacon */}
                <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center shadow">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>

                {/* Deck Card Count Badge */}
                <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black shadow flex items-center gap-0.5">
                  <span>🎴</span>
                  <span>{user.cardCount ?? 20}</span>
                </div>
              </div>

              {/* Name Tag & Badges */}
              <div className="mt-1.5 flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-extrabold text-white group-hover:text-amber-400 transition-colors drop-shadow-md text-center max-w-[90px] sm:max-w-[110px] truncate">
                    {user.name}
                  </span>
                  {user.isCurrentUser && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500 text-[9px] font-bold text-slate-950">
                      YOU
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.2 rounded bg-slate-900/90 border border-slate-800">
                    {user.role}
                  </span>
                  <span className="text-[9px] text-amber-400/90 font-medium">
                    View Deck →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main >

      {/* Slide-out / Bottom Drawer: List of Users & Default Cards */}
      {
        showUserListDrawer && (
          <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-950 border-l border-slate-800 shadow-2xl z-40 flex flex-col p-6 overflow-hidden animate-slide-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Connected & Registered Users
                </h3>
                <p className="text-xs text-slate-400">
                  All users with their default 20 card decks
                </p>
              </div>
              <button
                onClick={() => setShowUserListDrawer(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {dbUsers.map((user) => {
                const isWsConnected = connectedUsers.some(
                  (cu) =>
                    cu.userId === user.id ||
                    cu.name.toLowerCase() === user.name.toLowerCase(),
                );

                return (
                  <div
                    key={user.id}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400">
                        {user.name[0]}
                        {isWsConnected && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">
                            {user.name}
                          </span>
                          {isWsConnected && (
                            <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                              Live
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {user.cardList?.length ?? 20} Wrestling Cards
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        setSelectedUserForDeck({
                          name: user.name,
                          cards: user.cardList,
                        })
                      }
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-amber-400 hover:bg-slate-700 border border-slate-700 cursor-pointer"
                    >
                      View Deck
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )
      }


      <DeckOfCardsView
        userName={currentUserName || ""}
        selectedUserForDeck={{ name: currentUserName || "", cards: currentUserCards }}
        wrestlers={wrestlers}
      />

      {/* Selected User's 20 Cards Modal */}
      <WrestlerCardDeck
        isOpen={Boolean(selectedUserForDeck)}
        onClose={() => setSelectedUserForDeck(null)}
        userName={selectedUserForDeck?.name || "Challenger"}
        cards={selectedUserForDeck?.cards}
        wrestlersFallback={wrestlers}
      />

      {/* All Available Wrestlers Roster Modal */}
      <WrestlerCardDeck
        isOpen={showRosterModal}
        onClose={() => setShowRosterModal(false)}
        userName="Grand Roster"
        wrestlersFallback={wrestlers}
      />
    </div >
  );
}
