import { prisma } from "../lib/prisma.js";

export interface DefaultWrestlerSeed {
  name: string;
  alias: string;
  tier: "Legend" | "Champion" | "Superstar";
  attack: number;
  defense: number;
  speed: number;
  hp: number;
  finisher: string;
  avatar?: string;
}

export const DUMMY_WRESTLERS: DefaultWrestlerSeed[] = [
  {
    name: "The Undertaker",
    alias: "The Deadman",
    tier: "Legend",
    attack: 96,
    defense: 95,
    speed: 78,
    hp: 110,
    finisher: "Tombstone Piledriver",
    avatar: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "The Rock",
    alias: "The People's Champion",
    tier: "Legend",
    attack: 97,
    defense: 91,
    speed: 90,
    hp: 100,
    finisher: "Rock Bottom",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Stone Cold Steve Austin",
    alias: "The Texas Rattlesnake",
    tier: "Legend",
    attack: 98,
    defense: 89,
    speed: 88,
    hp: 105,
    finisher: "Stone Cold Stunner",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "John Cena",
    alias: "The Leader of Cenation",
    tier: "Legend",
    attack: 95,
    defense: 94,
    speed: 85,
    hp: 115,
    finisher: "Attitude Adjustment",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Roman Reigns",
    alias: "The Tribal Chief",
    tier: "Champion",
    attack: 97,
    defense: 93,
    speed: 86,
    hp: 110,
    finisher: "Spear",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Brock Lesnar",
    alias: "The Beast Incarnate",
    tier: "Legend",
    attack: 99,
    defense: 96,
    speed: 87,
    hp: 120,
    finisher: "F-5",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Triple H",
    alias: "The Cerebral Assassin",
    tier: "Legend",
    attack: 94,
    defense: 92,
    speed: 82,
    hp: 105,
    finisher: "Pedigree",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Shawn Michaels",
    alias: "The Heartbreak Kid",
    tier: "Legend",
    attack: 93,
    defense: 88,
    speed: 95,
    hp: 98,
    finisher: "Sweet Chin Music",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Randy Orton",
    alias: "The Legend Killer",
    tier: "Champion",
    attack: 94,
    defense: 90,
    speed: 89,
    hp: 102,
    finisher: "RKO",
    avatar: "https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Rey Mysterio",
    alias: "The Master of 619",
    tier: "Champion",
    attack: 88,
    defense: 84,
    speed: 99,
    hp: 92,
    finisher: "619",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Kurt Angle",
    alias: "The Olympic Hero",
    tier: "Legend",
    attack: 95,
    defense: 93,
    speed: 91,
    hp: 100,
    finisher: "Angle Slam",
    avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Bret Hart",
    alias: "The Excellence of Execution",
    tier: "Legend",
    attack: 93,
    defense: 94,
    speed: 87,
    hp: 100,
    finisher: "Sharpshooter",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Mick Foley",
    alias: "Hardcore Legend",
    tier: "Champion",
    attack: 91,
    defense: 97,
    speed: 74,
    hp: 125,
    finisher: "Mandible Claw",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Edge",
    alias: "The Rated-R Superstar",
    tier: "Champion",
    attack: 92,
    defense: 89,
    speed: 90,
    hp: 99,
    finisher: "Spear",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Kane",
    alias: "The Big Red Machine",
    tier: "Champion",
    attack: 94,
    defense: 93,
    speed: 76,
    hp: 115,
    finisher: "Chokeslam",
    avatar: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Chris Jericho",
    alias: "The Ocho",
    tier: "Champion",
    attack: 91,
    defense: 89,
    speed: 88,
    hp: 97,
    finisher: "Codebreaker",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Eddie Guerrero",
    alias: "Latino Heat",
    tier: "Legend",
    attack: 92,
    defense: 87,
    speed: 93,
    hp: 96,
    finisher: "Frog Splash",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Batista",
    alias: "The Animal",
    tier: "Champion",
    attack: 96,
    defense: 92,
    speed: 83,
    hp: 108,
    finisher: "Batista Bomb",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Ric Flair",
    alias: "The Nature Boy",
    tier: "Legend",
    attack: 90,
    defense: 91,
    speed: 84,
    hp: 98,
    finisher: "Figure-Four Leglock",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "CM Punk",
    alias: "The Best in the World",
    tier: "Champion",
    attack: 93,
    defense: 88,
    speed: 90,
    hp: 100,
    finisher: "Go to Sleep (GTS)",
    avatar: "https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Seth Rollins",
    alias: "The Visionary",
    tier: "Superstar",
    attack: 94,
    defense: 89,
    speed: 94,
    hp: 98,
    finisher: "The Stomp",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80",
  },
  {
    name: "Cody Rhodes",
    alias: "The American Nightmare",
    tier: "Champion",
    attack: 95,
    defense: 91,
    speed: 90,
    hp: 104,
    finisher: "Cross Rhodes",
    avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=400&auto=format&fit=crop&q=80",
  },
];

/**
 * Seeds wrestlers table if empty or missing records.
 */
export async function ensureWrestlersSeeded() {
  const count = await prisma.wrestler.count();
  if (count >= 20) {
    return prisma.wrestler.findMany({ orderBy: { name: "asc" } });
  }

  console.log(`[WrestlingService] Seeding ${DUMMY_WRESTLERS.length} wrestlers...`);
  const seeded = [];
  for (const w of DUMMY_WRESTLERS) {
    const record = await prisma.wrestler.upsert({
      where: { name: w.name },
      update: {
        alias: w.alias,
        tier: w.tier,
        attack: w.attack,
        defense: w.defense,
        speed: w.speed,
        hp: w.hp,
        finisher: w.finisher,
        avatar: w.avatar,
      },
      create: {
        name: w.name,
        alias: w.alias,
        tier: w.tier,
        attack: w.attack,
        defense: w.defense,
        speed: w.speed,
        hp: w.hp,
        finisher: w.finisher,
        avatar: w.avatar,
      },
    });
    seeded.push(record);
  }
  return seeded;
}

/**
 * Ensures a user has the default 20 wrestler cards in their cardList.
 * Each WrestlingCard is created linking to a wrestler and with wrestlers[] connected.
 */
export async function assignDefaultCardsToUser(userId: string) {
  const existingCardsCount = await prisma.wrestlingCard.count({
    where: { userId },
  });

  if (existingCardsCount >= 20) {
    return prisma.wrestlingCard.findMany({
      where: { userId },
      include: {
        wrestler: true,
        wrestlers: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  // Ensure wrestlers exist in DB
  const allWrestlers = await ensureWrestlersSeeded();
  const targetWrestlers = allWrestlers.slice(0, 20);

  // Fetch already assigned wrestlerIds for this user
  const currentCards = await prisma.wrestlingCard.findMany({
    where: { userId },
    select: { wrestlerId: true },
  });
  const currentWrestlerIds = new Set(currentCards.map((c) => c.wrestlerId).filter(Boolean));
  const cardsToCreate = targetWrestlers.filter((w) => !currentWrestlerIds.has(w.id));
  if (cardsToCreate.length > 0) {
    await Promise.all(
      cardsToCreate.map((wrestler) =>
        prisma.wrestlingCard.create({
          data: {
            userId,
            title: `${wrestler.name} Card`,
            wrestlerId: wrestler.id,
            wrestlers: {
              connect: { id: wrestler.id },
            },
          },
        }),
      ),
    );
  }

  return prisma.wrestlingCard.findMany({
    where: { userId },
    include: {
      wrestler: true,
      wrestlers: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Retrieves all users with their cardList (auto-populating default 20 if missing).
 */
export async function getUsersWithCards() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      companyId: true,
      cardList: {
        include: {
          wrestler: true,
          wrestlers: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const usersNeedingCards = users.filter((u) => !u.cardList || u.cardList.length < 20);
  if (usersNeedingCards.length > 0) {
    await Promise.all(
      usersNeedingCards.map(async (u) => {
        u.cardList = await assignDefaultCardsToUser(u.id);
      }),
    );
  }

  return users;
}

/**
 * Returns all available wrestlers.
 */
export async function getAllWrestlers() {
  await ensureWrestlersSeeded();
  return prisma.wrestler.findMany({
    orderBy: { attack: "desc" },
  });
}
