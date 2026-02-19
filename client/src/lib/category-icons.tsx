import * as icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

const fallbackIcon = icons.CircleDot;
const defaultIcon = icons.Package;

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

const aliasMap: Record<string, string> = {
  dairy: "Milk",
  fruit: "Apple",
  fruits: "Apple",
  vegetables: "Carrot",
  veggies: "Carrot",
  meat: "Beef",
  eggs: "Egg",
  cookies: "Cookie",
  drinks: "CupSoda",
  water: "Droplets",
  cleaning: "Sparkles",
  clothes: "Shirt",
  medicine: "Pill",
  bread: "Sandwich",
  bakery: "Sandwich",
  nuts: "Nut",
  icecream: "IceCreamCone",
  "ice-cream": "IceCreamCone",
  grocery: "ShoppingBasket",
  groceries: "ShoppingBasket",
  snacks: "Popcorn",
  pasta: "Wheat",
  rice: "Wheat",
  grains: "Wheat",
  juice: "GlassWater",
  tea: "Coffee",
  spices: "Flame",
  sauce: "Droplets",
  frozen: "Snowflake",
  canned: "Package",
  pet: "PawPrint",
  pets: "PawPrint",
  tools: "Wrench",
  electronics: "Smartphone",
  home: "Home",
  kitchen: "CookingPot",
  bathroom: "Bath",
  laundry: "WashingMachine",
  garden: "TreePine",
  office: "Briefcase",
  sport: "Dumbbell",
  sports: "Dumbbell",
  toys: "ToyBrick",
  books: "BookOpen",
  beauty: "Sparkles",
  health: "HeartPulse",
  pharmacy: "Pill",
};

export function getIcon(iconName?: string | null): LucideIcon {
  if (!iconName) return defaultIcon;

  const name = iconName.trim();

  const pascalName = toPascalCase(name);
  if ((icons as any)[pascalName]) return (icons as any)[pascalName];

  const lowerName = name.toLowerCase();
  if (aliasMap[lowerName]) {
    const aliasIcon = (icons as any)[aliasMap[lowerName]];
    if (aliasIcon) return aliasIcon;
  }

  for (const key of Object.keys(icons)) {
    if (key.toLowerCase() === lowerName) {
      return (icons as any)[key];
    }
  }

  return fallbackIcon;
}

export function getAllIconNames(): string[] {
  return Object.keys(icons).filter(
    key => key !== "default" && key !== "createLucideIcon" && key !== "icons" && typeof (icons as any)[key] === "object"
  );
}
