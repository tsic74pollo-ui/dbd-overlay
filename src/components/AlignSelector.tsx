import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import type { Align } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Label } from "@/components/ui/Label";

type Props = {
  value: Align;
  onChange: (a: Align) => void;
};

const options: { value: Align; label: string; Icon: typeof AlignLeft }[] = [
  { value: "left", label: "左揃え", Icon: AlignLeft },
  { value: "center", label: "中央揃え", Icon: AlignCenter },
  { value: "right", label: "右揃え", Icon: AlignRight },
];

export function AlignSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label className="text-white">整列</Label>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          const Icon = opt.Icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 rounded border-2 transition text-xs",
                active
                  ? "border-orange-500 bg-orange-500/20 text-white"
                  : "border-gray-600 text-gray-300 hover:border-gray-400",
              )}
            >
              <Icon className="w-5 h-5" />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
