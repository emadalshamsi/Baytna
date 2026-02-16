import {
  DoorOpen, Sofa, CookingPot, Car, Tent, Flower2, Package, Home, type LucideIcon,
  Fence, GripVertical, Armchair, Bath, ChartNoAxesGantt,
} from "lucide-react";

export const ROOM_ICON_OPTIONS = [
  { key: "door", Icon: DoorOpen },
  { key: "sofa", Icon: Sofa },
  { key: "kitchen", Icon: CookingPot },
  { key: "garage", Icon: Car },
  { key: "outdoor", Icon: Tent },
  { key: "garden", Icon: Flower2 },
  { key: "storage", Icon: Package },
  { key: "courtyard", Icon: Fence },
  { key: "home", Icon: Home },
  { key: "bathroom", Icon: Bath },
  { key: "armchair", Icon: Armchair },
  { key: "stairs", Icon: ChartNoAxesGantt },
] as const;

const iconMap: Record<string, LucideIcon> = Object.fromEntries(
  ROOM_ICON_OPTIONS.map(({ key, Icon }) => [key, Icon])
);

export function getRoomIcon(iconKey?: string | null): LucideIcon {
  return iconMap[iconKey || "door"] || DoorOpen;
}

export { GripVertical };
