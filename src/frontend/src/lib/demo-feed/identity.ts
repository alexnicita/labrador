import type { DemoActor } from "@/lib/demo-feed/types";

const actorColors = ["green", "purple", "amber", "blue", "rose", "gray"] as const;
const actorColorSet = new Set<string>(actorColors);

const dogPrefixes = [
  "Agile",
  "Astro",
  "Bouncy",
  "Brave",
  "Bright",
  "Clever",
  "Cosmic",
  "Curious",
  "Dapper",
  "Daring",
  "Electric",
  "Fancy",
  "Fizzy",
  "Fluffy",
  "Friendly",
  "Golden",
  "Happy",
  "Heroic",
  "Jazzy",
  "Kind",
  "Loyal",
  "Lucky",
  "Lunar",
  "Merry",
  "Mighty",
  "Nimble",
  "Noble",
  "Pixel",
  "Quick",
  "Rally",
  "Rapid",
  "Shiny",
  "Silly",
  "Snappy",
  "Solar",
  "Sparkly",
  "Speedy",
  "Spicy",
  "Sunny",
  "Swift",
  "Tidy",
  "Tiny",
  "Turbo",
  "Velvet",
  "Wild",
  "Wise",
  "Zesty",
  "Zoomy",
] as const;

const dogCallNames = [
  "Atlas",
  "Banjo",
  "Barkley",
  "Basil",
  "Beans",
  "Beagle",
  "Biscuit",
  "Bolt",
  "Bowie",
  "Bruno",
  "Bubbles",
  "Cedar",
  "Churro",
  "Clover",
  "Comet",
  "Cricket",
  "Dash",
  "Doodle",
  "Echo",
  "Finn",
  "Fizz",
  "Freckles",
  "Gizmo",
  "Goose",
  "Hazel",
  "Indie",
  "Juno",
  "Kirby",
  "Kona",
  "Latte",
  "Luma",
  "Maple",
  "Maxx",
  "Milo",
  "Mochi",
  "Moxie",
  "Noodle",
  "Nova",
  "Olive",
  "Orbit",
  "Pancake",
  "Pebble",
  "Pepper",
  "Pickle",
  "Pippin",
  "Pixel",
  "Pretzel",
  "Radar",
  "Remy",
  "Rocket",
  "Rolo",
  "Roo",
  "Sage",
  "Scout",
  "Sunny",
  "Taco",
  "Tango",
  "Tater",
  "Toffee",
  "Tofu",
  "Truffle",
  "Waffle",
  "Wrigley",
  "Ziggy",
] as const;

const dogLineages = [
  "Akita",
  "Basenji",
  "Beagle",
  "Bichon",
  "Boxer",
  "Cavapoo",
  "Collie",
  "Corgi",
  "Dachshund",
  "Dane",
  "Heeler",
  "Hound",
  "Husky",
  "Labrador",
  "Malamute",
  "Mastiff",
  "Papillon",
  "Pointer",
  "Pomsky",
  "Poodle",
  "Retriever",
  "Ridgeback",
  "Samoyed",
  "Schnauzer",
  "Setter",
  "Sheepdog",
  "Shepherd",
  "Shiba",
  "Spaniel",
  "Terrier",
  "Vizsla",
  "Westie",
  "Whippet",
  "Yorkie",
] as const;

export function hashText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

export function dogNameForId(id: string) {
  const prefixHash = hashText(`${id}:prefix`);
  const nameHash = hashText(`${id}:name`);
  const lineageHash = hashText(`${id}:lineage`);
  const prefix = dogPrefixes[prefixHash % dogPrefixes.length];
  const callName = dogCallNames[nameHash % dogCallNames.length];
  const lineage = dogLineages[lineageHash % dogLineages.length];

  return `${prefix} ${callName} ${lineage}`;
}

export function initialsForName(name: string) {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "LB"
  );
}

export function colorForId(id: string): DemoActor["color"] {
  return actorColors[hashText(id) % actorColors.length];
}

export function normalizeDemoActor(
  actor: Partial<DemoActor> | null | undefined,
): DemoActor {
  const id = normalizeToken(actor?.id, "dog_guest");

  if (id === "ai") {
    return {
      id,
      name: "Labrador AI",
      initials: "AI",
      color: "gray",
    };
  }

  if (id === "labrador") {
    return {
      id,
      name: "Labrador",
      initials: "LB",
      color: "green",
    };
  }

  const name = dogNameForId(id);

  return {
    id,
    name,
    initials: initialsForName(name),
    color: actorColorSet.has(actor?.color ?? "") ? actor?.color ?? "gray" : colorForId(id),
  };
}

function normalizeToken(value: unknown, fallback: string) {
  const token = typeof value === "string" ? value.trim() : "";
  return (token || fallback).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96) || fallback;
}
