import {
  DoorOpen, Sofa, CookingPot, Car, Tent, Flower2, Package, Home, type LucideIcon,
  Fence, GripVertical, Armchair, Bath,
} from "lucide-react";

function StairsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <text
        x="12"
        y="18"
        textAnchor="middle"
        fontSize="20"
        fill="currentColor"
        stroke="none"
        fontFamily="serif"
      >𓊍</text>
    </svg>
  );
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
