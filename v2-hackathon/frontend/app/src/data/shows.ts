/**
 * Mock show data — 50 per category, generated from seed titles.
 * Will be replaced by backend API responses.
 */

import type { Show, CategoryKey, ShowSize } from "@/types";
import { SHOWS_PER_CATEGORY } from "@/config/galaxy";

// --- Seed titles per category (real shows) ---

const SEED_TITLES: Record<CategoryKey, string[]> = {
  drama: [
    "Breaking Bad", "The Crown", "Succession", "Better Call Saul", "The Wire",
    "Mad Men", "Ozark", "The Sopranos", "Downton Abbey", "This Is Us",
    "Suits", "House of Cards", "The Good Wife", "Billions", "The West Wing",
    "Friday Night Lights", "Six Feet Under", "The Leftovers", "Rectify", "Bloodline",
  ],
  "sci-fi": [
    "Stranger Things", "Black Mirror", "The Expanse", "Westworld", "Altered Carbon",
    "Dark", "Foundation", "Severance", "Devs", "Love Death & Robots",
    "The 100", "Fringe", "Battlestar Galactica", "Star Trek: Strange New Worlds", "Raised by Wolves",
    "Humans", "Electric Dreams", "Counterpart", "The OA", "Tales from the Loop",
  ],
  comedy: [
    "The Office", "Brooklyn Nine-Nine", "Schitt's Creek", "Ted Lasso", "Arrested Development",
    "Parks and Recreation", "The Good Place", "Fleabag", "What We Do in the Shadows", "Abbott Elementary",
    "Modern Family", "Community", "Veep", "Silicon Valley", "The Marvelous Mrs. Maisel",
    "Curb Your Enthusiasm", "30 Rock", "Derry Girls", "Only Murders in the Building", "Ghosts",
  ],
  action: [
    "Jack Reacher", "The Mandalorian", "24", "Peaky Blinders", "Vikings",
    "Spartacus", "Into the Badlands", "Strike Back", "The Punisher", "Warrior",
    "Banshee", "Daredevil", "The Boys", "Gangs of London", "Shogun",
    "Reacher", "The Terminal List", "Extraction", "Jack Ryan", "Fauda",
  ],
  thriller: [
    "Mindhunter", "You", "Homeland", "The Americans", "True Detective",
    "Bodyguard", "Hannibal", "Killing Eve", "Mr. Robot", "Dexter",
    "The Night Manager", "Sharp Objects", "The Sinner", "Ozark", "Gone Girl",
    "Prisoners", "Wind River", "Sicario", "Shutter Island", "Zodiac",
  ],
  romance: [
    "Bridgerton", "Normal People", "Outlander", "Pride and Prejudice", "Emily in Paris",
    "Virgin River", "Heartstopper", "Love Actually", "About Time", "One Day",
    "The Time Traveler's Wife", "Atonement", "Call Me by Your Name", "Before Sunrise", "La La Land",
    "Crazy Rich Asians", "To All the Boys", "The Notebook", "A Walk to Remember", "Notting Hill",
  ],
  crime: [
    "Narcos", "Fargo", "Sherlock", "Line of Duty", "The Blacklist",
    "Luther", "Broadchurch", "Mare of Easttown", "Bosch", "Money Heist",
    "Lupin", "Top Boy", "The Night Of", "Gomorrah", "Snowfall",
    "Justified", "Animal Kingdom", "Prisoners of War", "City on a Hill", "ZeroZeroZero",
  ],
  fantasy: [
    "Game of Thrones", "The Witcher", "His Dark Materials", "Shadow and Bone", "Wheel of Time",
    "Rings of Power", "The Magicians", "Merlin", "Once Upon a Time", "The Sandman",
    "Carnival Row", "American Gods", "Good Omens", "Willow", "House of the Dragon",
    "The Dark Crystal", "Cursed", "See", "Ragnarok", "The Shannara Chronicles",
  ],
  horror: [
    "The Haunting of Hill House", "American Horror Story", "Midnight Mass", "The Walking Dead", "Lovecraft Country",
    "Penny Dreadful", "Marianne", "The Strain", "Bates Motel", "Castle Rock",
    "Chernobyl", "From", "Yellowjackets", "The Terror", "Servant",
    "Archive 81", "Chapelwaite", "Brand New Cherry Flavor", "Them", "Ratched",
  ],
};

const SHOW_DESCRIPTIONS: Record<CategoryKey, string> = {
  drama: "A gripping tale of human emotions and complex relationships.",
  "sci-fi": "A mind-bending journey through science and the unknown.",
  comedy: "A hilarious adventure that will keep you laughing.",
  action: "High-octane thrills and non-stop excitement.",
  thriller: "A suspenseful story that keeps you on the edge of your seat.",
  romance: "A heartwarming story of love and connection.",
  crime: "A gritty dive into the criminal underworld.",
  fantasy: "An epic adventure in a world of magic and wonder.",
  horror: "A terrifying descent into darkness and fear.",
};

const LANGUAGES = ["English", "Spanish", "Korean", "Japanese", "French", "German"];
const TAGS_POOL = ["binge-worthy", "award-winning", "cult-classic", "trending", "hidden-gem", "new-release", "critically-acclaimed", "fan-favorite"];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function pickSize(rand: () => number): ShowSize {
  const r = rand();
  if (r < 0.15) return "l";
  if (r < 0.45) return "m";
  return "s";
}

function generateShowsForCategory(
  categoryKey: CategoryKey,
  count: number,
  seed: number,
): Omit<Show, "worldX" | "worldY">[] {
  const rand = seededRandom(seed);
  const titles = SEED_TITLES[categoryKey];
  const shows: Omit<Show, "worldX" | "worldY">[] = [];

  for (let i = 0; i < count; i++) {
    const title = i < titles.length
      ? titles[i]
      : `${titles[i % titles.length]} ${Math.floor(i / titles.length) + 1}`;

    // Fibonacci sunflower distribution — uniform spread across subregion
    const golden = (1 + Math.sqrt(5)) / 2;
    const theta = 2 * Math.PI * i / (golden * golden);
    const r = 0.12 + 0.36 * Math.sqrt(i / count); // 0.12–0.48 from center
    const jitter = 0.03; // small randomness to avoid perfect grid feel
    const relX = 0.5 + Math.cos(theta) * r + (rand() - 0.5) * jitter;
    const relY = 0.5 + Math.sin(theta) * r + (rand() - 0.5) * jitter;

    shows.push({
      id: `${categoryKey}-${i}`,
      title,
      year: 2015 + Math.floor(rand() * 11),
      runtime: `${20 + Math.floor(rand() * 40)}m`,
      genres: categoryKey,
      description: SHOW_DESCRIPTIONS[categoryKey],
      match: 60 + Math.floor(rand() * 40),
      category: categoryKey,
      relX: Math.max(0, Math.min(1, relX)),
      relY: Math.max(0, Math.min(1, relY)),
      size: pickSize(rand),
      poster: "",
      gradient: `linear-gradient(135deg, ${CATEGORY_GRADIENTS[categoryKey][0]}, ${CATEGORY_GRADIENTS[categoryKey][1]})`,
      language: LANGUAGES[Math.floor(rand() * LANGUAGES.length)],
      actors: [],
      tags: [TAGS_POOL[Math.floor(rand() * TAGS_POOL.length)]],
    });
  }

  return shows;
}

const CATEGORY_GRADIENTS: Record<CategoryKey, [string, string]> = {
  drama: ["#7b2ff2", "#b56cff"],
  "sci-fi": ["#2563eb", "#6fa8e8"],
  comedy: ["#059669", "#3fb89e"],
  action: ["#d97706", "#ff9f43"],
  thriller: ["#dc2626", "#ff7a6c"],
  romance: ["#ca8a04", "#e6b04a"],
  crime: ["#475569", "#7c8a99"],
  fantasy: ["#a21caf", "#e056a0"],
  horror: ["#991b1b", "#c44040"],
};

// Generate all mock shows
const CATEGORY_KEYS: CategoryKey[] = [
  "drama", "sci-fi", "comedy", "action", "thriller",
  "romance", "crime", "fantasy", "horror",
];

export const MOCK_SHOWS_BY_CATEGORY: Record<CategoryKey, Omit<Show, "worldX" | "worldY">[]> =
  Object.fromEntries(
    CATEGORY_KEYS.map((key, i) => [
      key,
      generateShowsForCategory(key, SHOWS_PER_CATEGORY, 1000 + i * 100),
    ])
  ) as Record<CategoryKey, Omit<Show, "worldX" | "worldY">[]>;

export const ALL_MOCK_SHOWS: Omit<Show, "worldX" | "worldY">[] =
  CATEGORY_KEYS.flatMap((key) => MOCK_SHOWS_BY_CATEGORY[key]);
