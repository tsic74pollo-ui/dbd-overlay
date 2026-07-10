import { useState } from "react";
import { Upload } from "lucide-react";
import { PRESET_ICONS } from "@/lib/defaults";
import { readImageFileScaled } from "@/lib/imageFile";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/cn";

type Props = {
  iconImage: string;
  onChange: (image: string) => void;
};

export function IconPicker({ iconImage, onChange }: Props) {
  const [imgNote, setImgNote] = useState<string | null>(null);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = await readImageFileScaled(file);
    if (r.ok) {
      onChange(r.dataUrl);
      setImgNote(r.scaled ? "配信同期のため画像を自動縮小しました" : null);
    } else {
      setImgNote(r.error);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-white">アイコン画像</Label>
      <div className="grid grid-cols-3 gap-2">
        {PRESET_ICONS.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => onChange(src)}
            className={cn(
              "p-2 border-2 rounded transition",
              iconImage === src
                ? "border-orange-500 bg-orange-500/20"
                : "border-gray-600 hover:border-gray-400",
            )}
          >
            <img
              src={src}
              alt={`Icon ${i + 1}`}
              className="w-full h-16 object-contain"
            />
          </button>
        ))}
      </div>
      <div>
        <input
          type="file"
          id="icon-upload"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        <label
          htmlFor="icon-upload"
          className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded border border-gray-600 px-4 text-sm font-medium text-gray-100 transition-colors hover:border-gray-400 hover:bg-gray-800"
        >
          <Upload className="w-4 h-4" />
          カスタム画像をアップロード
        </label>
        {imgNote && <p className="mt-1 text-xs text-amber-300">{imgNote}</p>}
      </div>
      {iconImage && !PRESET_ICONS.includes(iconImage) && (
        <div className="p-2 border border-gray-600 rounded">
          <img src={iconImage} alt="Custom icon" className="w-full h-20 object-contain" />
        </div>
      )}
    </div>
  );
}
