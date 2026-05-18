// Hotdog Water Murder Mystery — Archipelago item/location IDs
// Generated to match worlds/hdw_murder/items.py + locations.py

const PERSONS = ["Av", "Jeff", "Vlad", "Ethan", "Yacob", "Aero", "Snow", "Kirby", "Iapg"];

const HINT_TEMPLATES = [
  "Location Investigation 1",
  "Location Investigation 2",
  "Person Investigation 1",
  "Person Investigation 2",
  "Weapon Investigation 1",
  "Weapon Investigation 2",
];

const HINT_CATEGORIES = {
  "Location Investigation 1": "location",
  "Location Investigation 2": "location",
  "Person Investigation 1":   "person",
  "Person Investigation 2":   "person",
  "Weapon Investigation 1":   "weapon",
  "Weapon Investigation 2":   "weapon",
};

// AP slot the bot logs in as to read HDWMurder's received items and to send
// location checks back out.
const MM_SLOT_NAME = "HDWMurder";

// Discord user IDs for each player. Fill these in before running a game.
const PLAYER_DISCORD_IDS = {
  "Av":    "156110247004471296",
  "Jeff":  "122568101995872256",
  "Vlad":  "129721859783524352",
  "Ethan": "331821722594443274",
  "Yacob": "143091697096720384",
  "Aero":  "487747924361478155",
  "Snow":  "269546196723302409",
  "Kirby": "331639497454256130",
  "Iapg":  "449314134387982347",
};

// Placeholder pools used by /mm-start to pick the real solution.
const LOCATION_POOL = [
  "The Kitchen", "The Library", "The Conservatory", "The Ballroom",
  "The Study", "The Billiard Room", "The Dining Room", "The Lounge", "The Cellar",
];

const WEAPON_POOL = [
  "Rope", "Lead Pipe", "Knife", "Wrench",
  "Candlestick", "Revolver", "Poison", "Spanner", "Crowbar",
];

// ---------------------------------------------------------------------------
// Items (64 total)
// ---------------------------------------------------------------------------
const ITEM_NAME_TO_ID = {
  "Location Investigation 1 - Av": 1,
  "Location Investigation 2 - Av": 2,
  "Person Investigation 1 - Av": 3,
  "Person Investigation 2 - Av": 4,
  "Weapon Investigation 1 - Av": 5,
  "Weapon Investigation 2 - Av": 6,
  "Progressive Share - Av": 7,
  "Location Investigation 1 - Jeff": 8,
  "Location Investigation 2 - Jeff": 9,
  "Person Investigation 1 - Jeff": 10,
  "Person Investigation 2 - Jeff": 11,
  "Weapon Investigation 1 - Jeff": 12,
  "Weapon Investigation 2 - Jeff": 13,
  "Progressive Share - Jeff": 14,
  "Location Investigation 1 - Vlad": 15,
  "Location Investigation 2 - Vlad": 16,
  "Person Investigation 1 - Vlad": 17,
  "Person Investigation 2 - Vlad": 18,
  "Weapon Investigation 1 - Vlad": 19,
  "Weapon Investigation 2 - Vlad": 20,
  "Progressive Share - Vlad": 21,
  "Location Investigation 1 - Ethan": 22,
  "Location Investigation 2 - Ethan": 23,
  "Person Investigation 1 - Ethan": 24,
  "Person Investigation 2 - Ethan": 25,
  "Weapon Investigation 1 - Ethan": 26,
  "Weapon Investigation 2 - Ethan": 27,
  "Progressive Share - Ethan": 28,
  "Location Investigation 1 - Yacob": 29,
  "Location Investigation 2 - Yacob": 30,
  "Person Investigation 1 - Yacob": 31,
  "Person Investigation 2 - Yacob": 32,
  "Weapon Investigation 1 - Yacob": 33,
  "Weapon Investigation 2 - Yacob": 34,
  "Progressive Share - Yacob": 35,
  "Location Investigation 1 - Aero": 36,
  "Location Investigation 2 - Aero": 37,
  "Person Investigation 1 - Aero": 38,
  "Person Investigation 2 - Aero": 39,
  "Weapon Investigation 1 - Aero": 40,
  "Weapon Investigation 2 - Aero": 41,
  "Progressive Share - Aero": 42,
  "Location Investigation 1 - Snow": 43,
  "Location Investigation 2 - Snow": 44,
  "Person Investigation 1 - Snow": 45,
  "Person Investigation 2 - Snow": 46,
  "Weapon Investigation 1 - Snow": 47,
  "Weapon Investigation 2 - Snow": 48,
  "Progressive Share - Snow": 49,
  "Location Investigation 1 - Kirby": 50,
  "Location Investigation 2 - Kirby": 51,
  "Person Investigation 1 - Kirby": 52,
  "Person Investigation 2 - Kirby": 53,
  "Weapon Investigation 1 - Kirby": 54,
  "Weapon Investigation 2 - Kirby": 55,
  "Progressive Share - Kirby": 56,
  "Location Investigation 1 - Iapg": 57,
  "Location Investigation 2 - Iapg": 58,
  "Person Investigation 1 - Iapg": 59,
  "Person Investigation 2 - Iapg": 60,
  "Weapon Investigation 1 - Iapg": 61,
  "Weapon Investigation 2 - Iapg": 62,
  "Progressive Share - Iapg": 63,
  "Red Herring": 64,
};

// ---------------------------------------------------------------------------
// Locations (72 total)
// ---------------------------------------------------------------------------
const LOCATION_NAME_TO_ID = {
  "Location Investigation 1 - Av": 1,
  "Location Investigation 2 - Av": 2,
  "Person Investigation 1 - Av": 3,
  "Person Investigation 2 - Av": 4,
  "Weapon Investigation 1 - Av": 5,
  "Weapon Investigation 2 - Av": 6,
  "Share 1 - Av": 7,
  "Share 2 - Av": 8,
  "Location Investigation 1 - Jeff": 9,
  "Location Investigation 2 - Jeff": 10,
  "Person Investigation 1 - Jeff": 11,
  "Person Investigation 2 - Jeff": 12,
  "Weapon Investigation 1 - Jeff": 13,
  "Weapon Investigation 2 - Jeff": 14,
  "Share 1 - Jeff": 15,
  "Share 2 - Jeff": 16,
  "Location Investigation 1 - Vlad": 17,
  "Location Investigation 2 - Vlad": 18,
  "Person Investigation 1 - Vlad": 19,
  "Person Investigation 2 - Vlad": 20,
  "Weapon Investigation 1 - Vlad": 21,
  "Weapon Investigation 2 - Vlad": 22,
  "Share 1 - Vlad": 23,
  "Share 2 - Vlad": 24,
  "Location Investigation 1 - Ethan": 25,
  "Location Investigation 2 - Ethan": 26,
  "Person Investigation 1 - Ethan": 27,
  "Person Investigation 2 - Ethan": 28,
  "Weapon Investigation 1 - Ethan": 29,
  "Weapon Investigation 2 - Ethan": 30,
  "Share 1 - Ethan": 31,
  "Share 2 - Ethan": 32,
  "Location Investigation 1 - Yacob": 33,
  "Location Investigation 2 - Yacob": 34,
  "Person Investigation 1 - Yacob": 35,
  "Person Investigation 2 - Yacob": 36,
  "Weapon Investigation 1 - Yacob": 37,
  "Weapon Investigation 2 - Yacob": 38,
  "Share 1 - Yacob": 39,
  "Share 2 - Yacob": 40,
  "Location Investigation 1 - Aero": 41,
  "Location Investigation 2 - Aero": 42,
  "Person Investigation 1 - Aero": 43,
  "Person Investigation 2 - Aero": 44,
  "Weapon Investigation 1 - Aero": 45,
  "Weapon Investigation 2 - Aero": 46,
  "Share 1 - Aero": 47,
  "Share 2 - Aero": 48,
  "Location Investigation 1 - Snow": 49,
  "Location Investigation 2 - Snow": 50,
  "Person Investigation 1 - Snow": 51,
  "Person Investigation 2 - Snow": 52,
  "Weapon Investigation 1 - Snow": 53,
  "Weapon Investigation 2 - Snow": 54,
  "Share 1 - Snow": 55,
  "Share 2 - Snow": 56,
  "Location Investigation 1 - Kirby": 57,
  "Location Investigation 2 - Kirby": 58,
  "Person Investigation 1 - Kirby": 59,
  "Person Investigation 2 - Kirby": 60,
  "Weapon Investigation 1 - Kirby": 61,
  "Weapon Investigation 2 - Kirby": 62,
  "Share 1 - Kirby": 63,
  "Share 2 - Kirby": 64,
  "Location Investigation 1 - Iapg": 65,
  "Location Investigation 2 - Iapg": 66,
  "Person Investigation 1 - Iapg": 67,
  "Person Investigation 2 - Iapg": 68,
  "Weapon Investigation 1 - Iapg": 69,
  "Weapon Investigation 2 - Iapg": 70,
  "Share 1 - Iapg": 71,
  "Share 2 - Iapg": 72,
};

// ---------------------------------------------------------------------------
// Reverse lookups (id → name)
// ---------------------------------------------------------------------------
const ITEM_ID_TO_NAME = Object.fromEntries(
  Object.entries(ITEM_NAME_TO_ID).map(([name, id]) => [id, name])
);
const LOCATION_ID_TO_NAME = Object.fromEntries(
  Object.entries(LOCATION_NAME_TO_ID).map(([name, id]) => [id, name])
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function itemId(template, person) {
  return ITEM_NAME_TO_ID[`${template} - ${person}`];
}
function shareItemId(person) {
  return ITEM_NAME_TO_ID[`Progressive Share - ${person}`];
}
function investigationLocationId(template, person) {
  return LOCATION_NAME_TO_ID[`${template} - ${person}`];
}
function shareLocationId(level, person) {
  return LOCATION_NAME_TO_ID[`Share ${level} - ${person}`];
}

module.exports = {
  PERSONS,
  HINT_TEMPLATES,
  HINT_CATEGORIES,
  MM_SLOT_NAME,
  PLAYER_DISCORD_IDS,
  LOCATION_POOL,
  WEAPON_POOL,
  ITEM_NAME_TO_ID,
  LOCATION_NAME_TO_ID,
  ITEM_ID_TO_NAME,
  LOCATION_ID_TO_NAME,
  itemId,
  shareItemId,
  investigationLocationId,
  shareLocationId,
};
