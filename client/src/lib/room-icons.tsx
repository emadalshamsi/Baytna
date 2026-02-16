import {
  DoorOpen, Sofa, CookingPot, Car, Tent, Flower2, Package, Home, type LucideIcon,
  Fence, GripVertical, Armchair, Bath,
} from "lucide-react";
import stairsImagePath from "@assets/image_1771201557923.png";

function StairsIcon({ className }: { className?: string }) {
  return (
    <img
      src={stairsImagePath}
      alt="stairs"
      className={`${className || ""} dark:invert`}
      style={{ display: "inline-block" }}
    />
  ) as unknown as React.ReactSVGElement;
}

export const ROOM_ICON_OPTIONS: { key: string; Icon: LucideIcon | typeof StairsIcon }[] = [
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
  { key: "stairs", Icon: StairsIcon },
];

type IconComponent = LucideIcon | typeof StairsIcon;

const iconMap: Record<string, IconComponent> = Object.fromEntries(
  ROOM_ICON_OPTIONS.map(({ key, Icon }) => [key, Icon])
);

export function getRoomIcon(iconKey?: string | null): IconComponent {
  return iconMap[iconKey || "door"] || DoorOpen;
}

export { GripVertical };
