"use client";

import { useWebSocket } from "@/components/WebSocketProvider";
import { api } from "@/lib/apiClient";
import { useRoomJoin } from "@/websocket";
import { PresenceUser } from "@kanban/shared";
import { useEffect, useMemo, useState } from "react";

type Role = "viewer" | "editor" | "admin";

type WrestlingCard = {
    id: string;
    name: string;
    userId: string;
};

type User = {
    userId: string;
    name: string;
    role: string;
    email?: string;
    usersList?: WrestlingCard[];
    userData?: Record<string, unknown> | null;
};

type ThrownCardsByUser = Record<string, WrestlingCard[]>;

/**
 * All game-table state lives in ONE object, updated with ONE functional
 * setState. This is what guarantees the totals never drift: every read
 * (thrownCards, lastThrow, playerDecks) happens against `previous` inside
 * the same updater, never against a possibly-stale closure variable.
 */
type TableState = {
    playerDecks: Record<string, WrestlingCard[]>;
    thrownCards: ThrownCardsByUser;
    lastThrow: { userId: string; card: WrestlingCard } | null;
    winner: { userId: string; letter: string } | null;
};

const wrestlingCards = [
    "Randy Savage",
    "The Rock",
    "Stone Cold",
    "The Undertaker",
    "Shawn Michaels",
    "Bret Hart",
    "Triple H",
    "Mick Foley",
    "Kane",
    "Chris Jericho",
    "Hulk Hogan",
    "John Cena",
    "The Big Show",
    "Rey Mysterio",
    "Goldberg",
    "Kurt Angle",
    "Eddie Guerrero",
    "Edge",
    "Batista",
    "Ric Flair",
];

/**
 * Shuffle and create a private deck for a player.
 */
const createRandomDeck = (userId: string): WrestlingCard[] => {
    return [...wrestlingCards]
        .sort(() => Math.random() - 0.5)
        .map((name, index) => ({
            id: `${userId}-card-${index}`,
            name,
            userId,
        }));
};

export default function GamePage() {
    const { client, connected } = useWebSocket();

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [presence, setPresence] = useState<PresenceUser[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [lobbyInput, setLobbyInput] = useState("");
    const [activeLobbyId, setActiveLobbyId] = useState("");

    const [table, setTable] = useState<TableState>({
        playerDecks: {},
        thrownCards: {},
        lastThrow: null,
        winner: null,
    });

    // ---------------------------------------------------------
    // Authentication
    // ---------------------------------------------------------

    useEffect(() => {
        async function initUser() {
            try {
                const meRes = await api.auth.me();

                if (meRes?.user) {
                    setUser({
                        userId: meRes.user.id,
                        name: meRes.user.name,
                        role:
                            meRes.user.role === "company_admin" ||
                                meRes.user.role === "super_admin"
                                ? "admin"
                                : "editor",
                        email: meRes.user.email,
                        usersList: createRandomDeck(meRes.user.id),
                    });
                }
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        }

        initUser();
    }, []);

    useRoomJoin(client, connected, user, activeLobbyId);

    // ---------------------------------------------------------
    // Presence
    // ---------------------------------------------------------

    useEffect(() => {
        if (!client) return;

        const unsubs = [
            client.on("presence:update", (msg) => {
                setPresence(msg.users);
            }),

            client.on("error", (msg) => {
                setError(msg.message ?? "Something went wrong.");
            }),
        ];

        return () => unsubs.forEach((unsubscribe) => unsubscribe());
    }, [client]);

    // ---------------------------------------------------------
    // Create a random deck for every player
    // ---------------------------------------------------------

    useEffect(() => {
        if (presence.length === 0) return;

        setTable((previous) => {
            const nextDecks = { ...previous.playerDecks };

            presence.forEach((player) => {
                if (!nextDecks[player.userId]) {
                    nextDecks[player.userId] = createRandomDeck(player.userId);
                }
            });

            Object.keys(nextDecks).forEach((userId) => {
                const stillPresent = presence.some(
                    (player) => player.userId === userId
                );

                if (!stillPresent) {
                    delete nextDecks[userId];
                }
            });

            return { ...previous, playerDecks: nextDecks };
        });
    }, [presence]);

    // ---------------------------------------------------------
    // Apply a thrown card — the ONLY place thrownCards/playerDecks/lastThrow
    // change. Everything is read from `previous`, so this is safe even if
    // two "game:throw-card" events arrive before a re-render.
    // ---------------------------------------------------------

    const applyThrownCard = (userId: string, card: WrestlingCard) => {
        setTable((previous) => {
            // Ignore duplicate delivery of the same card
            if (previous.thrownCards[userId]?.some((c) => c.id === card.id)) {
                return previous;
            }

            const isMatch =
                previous.lastThrow &&
                previous.lastThrow.userId !== userId &&
                previous.lastThrow.card.name.charAt(0).toLowerCase() ===
                card.name.charAt(0).toLowerCase();

            if (isMatch && previous.lastThrow) {
                // Whoever just threw the matching card wins the round
                const winnerId = userId;
                const loserId = previous.lastThrow.userId;

                // Winner's own pile + loser's pile + this matching card -> winner's deck
                const wonCards = [
                    ...(previous.thrownCards[winnerId] ?? []),
                    ...(previous.thrownCards[loserId] ?? []),
                    card,
                ];

                return {
                    ...previous,
                    playerDecks: {
                        ...previous.playerDecks,
                        [winnerId]: [
                            ...(previous.playerDecks[winnerId] ?? []),
                            ...wonCards,
                        ],
                    },
                    thrownCards: {
                        ...previous.thrownCards,
                        [winnerId]: [],
                        [loserId]: [],
                    },
                    lastThrow: null,
                    winner: { userId: winnerId, letter: card.name.charAt(0) },
                };
            }

            return {
                ...previous,
                thrownCards: {
                    ...previous.thrownCards,
                    [userId]: [...(previous.thrownCards[userId] ?? []), card],
                },
                lastThrow: { userId, card },
            };
        });
    };

    // Show the win popup once, then clear it
    useEffect(() => {
        if (!table.winner) return;

        const winnerName =
            presence.find((p) => p.userId === table.winner!.userId)?.name ??
            "A player";

        alert(`${winnerName} wins the match! Matching "${table.winner!.letter}" card.`);

        setTable((previous) => ({ ...previous, winner: null }));
    }, [table.winner]);

    // ---------------------------------------------------------
    // Throw card
    // ---------------------------------------------------------

    const handleThrowCard = (userId: string) => {
        if (!user || user.userId !== userId) return;

        const deck = table.playerDecks[userId] ?? [];
        if (deck.length === 0) return;

        // Turn rule: can't throw twice in a row
        if (table.lastThrow?.userId === userId) return;

        const topCard = deck[0];

        setTable((previous) => ({
            ...previous,
            playerDecks: {
                ...previous.playerDecks,
                [userId]: (previous.playerDecks[userId] ?? []).slice(1),
            },
        }));

        if (client) {
            client.send({
                type: "game:throw-card",
                boardId: activeLobbyId,
                userId,
                card: topCard,
            });
        }
    };

    useEffect(() => {
        if (!client) return;

        const unsubs = [
            client.on("presence:update", (msg) => {
                setPresence(msg.users);
            }),

            client.on("game:throw-card", (msg) => {
                if (activeLobbyId !== msg.boardId) return;
                applyThrownCard(msg.userId, msg.card);
            }),

            client.on("error", (msg) => {
                setError(msg.message ?? "Something went wrong.");
            }),
        ];

        return () => unsubs.forEach((unsubscribe) => unsubscribe());
    }, [client, activeLobbyId]);

    // ---------------------------------------------------------
    // Join lobby
    // ---------------------------------------------------------

    const handleJoinLobby = (e: React.FormEvent) => {
        e.preventDefault();

        if (lobbyInput.trim()) {
            setActiveLobbyId(lobbyInput.trim());
            setError(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-slate-600 text-sm">
                    Initializing Game...
                </p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-slate-600 text-sm">
                    Please log in from the main dashboard first.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 p-6">
            <div className="max-w-5xl mx-auto">

                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h1 className="text-2xl font-bold text-slate-800 text-center">
                        Wrestling Card Game
                    </h1>

                    {!activeLobbyId ? (
                        <form
                            onSubmit={handleJoinLobby}
                            className="max-w-md mx-auto mt-6 space-y-3"
                        >
                            <input
                                value={lobbyInput}
                                onChange={(e) =>
                                    setLobbyInput(e.target.value)
                                }
                                placeholder="Enter Lobby ID"
                                className="w-full rounded-lg border border-slate-300 px-4 py-2"
                            />

                            <button
                                type="submit"
                                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium"
                            >
                                Join / Create Lobby
                            </button>
                        </form>
                    ) : (
                        <>
                            <div className="mt-5 rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-emerald-800">
                                        Lobby: {activeLobbyId}
                                    </p>

                                    <p className="text-xs text-emerald-600">
                                        {presence.length} players
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div
                                        className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"
                                            }`}
                                    />

                                    <span className="text-xs">
                                        {connected ? "Connected" : "Disconnected"}
                                    </span>
                                </div>
                            </div>

                            {/* ------------------------------------------------ */}
                            {/* GAME TABLE — one pile per user, mine styled differently */}
                            {/* ------------------------------------------------ */}

                            <div className="mt-6 rounded-2xl bg-green-100 border-4 border-green-300 p-6 min-h-[280px]">
                                <h2 className="text-center font-bold text-green-900 mb-5">
                                    Game Table
                                </h2>

                                {Object.values(table.thrownCards).every(
                                    (cards) => cards.length === 0
                                ) ? (
                                    <div className="flex items-center justify-center h-40">
                                        <p className="text-green-700 text-sm">
                                            Throw a card to start the game
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {Object.entries(table.thrownCards).map(
                                            ([userId, cards]) => {
                                                if (cards.length === 0) return null;
                                                const isMe = userId === user.userId;

                                                return (
                                                    <div key={userId}>
                                                        <p className="text-xs font-semibold text-green-800 mb-2">
                                                            {presence.find(
                                                                (p) => p.userId === userId
                                                            )?.name}
                                                            {isMe ? " (You)" : ""}
                                                        </p>

                                                        <div className="flex flex-wrap gap-3">
                                                            {cards.map((card, index) => (
                                                                <div
                                                                    key={card.id}
                                                                    className={`w-24 h-32 rounded-lg border-2 shadow-md p-3 flex flex-col justify-between ${isMe
                                                                        ? "bg-blue-50 border-blue-400"
                                                                        : "bg-white border-slate-300"
                                                                        }`}
                                                                >
                                                                    <span className="text-[10px] text-slate-400">
                                                                        #{index + 1}
                                                                    </span>
                                                                    <span className="text-sm font-bold text-slate-800 text-center">
                                                                        {card.name}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ------------------------------------------------ */}
                            {/* PLAYERS */}
                            {/* ------------------------------------------------ */}

                            <div className="mt-6">
                                <h2 className="text-lg font-bold text-slate-800 mb-4">
                                    Players
                                </h2>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                                    {presence.map((player) => {
                                        const deck = table.playerDecks[player.userId] ?? [];
                                        const isMe = player.userId === user.userId;

                                        const canThrow =
                                            isMe && table.lastThrow?.userId !== player.userId;

                                        return (
                                            <div
                                                key={player.userId}
                                                className={`rounded-xl border p-4 ${isMe
                                                    ? "border-blue-400 bg-blue-50"
                                                    : "border-slate-200 bg-white"
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full bg-green-500" />

                                                        <span className="font-semibold text-slate-800">
                                                            {player.name}
                                                        </span>

                                                        {isMe && (
                                                            <span className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded-full">
                                                                YOU
                                                            </span>
                                                        )}
                                                    </div>

                                                    <span className="text-xs text-slate-500">
                                                        {deck.length} cards
                                                    </span>
                                                </div>

                                                <div className="flex justify-center mb-4">
                                                    {deck.length > 0 ? (
                                                        <div className="relative w-24 h-32">
                                                            <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-lg bg-slate-300 border border-slate-400" />
                                                            <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg bg-slate-400 border border-slate-500" />
                                                            <div className="absolute inset-0 rounded-lg bg-slate-800 border-2 border-slate-600 flex items-center justify-center">
                                                                <span className="text-white text-xs font-bold text-center">
                                                                    WRESTLING
                                                                    <br />
                                                                    CARD
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-24 h-32 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center">
                                                            <span className="text-xs text-slate-400">
                                                                Empty
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    disabled={!isMe || deck.length === 0 || !canThrow}
                                                    onClick={() => handleThrowCard(player.userId)}
                                                    className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition ${isMe && deck.length > 0 && canThrow
                                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                                        }`}
                                                >
                                                    {isMe
                                                        ? canThrow
                                                            ? "Throw Card"
                                                            : "Wait your turn"
                                                        : "Waiting for player"}
                                                </button>
                                            </div>
                                        );
                                    })}

                                </div>
                            </div>
                        </>
                    )}

                    {error && (
                        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}