import { Plus, X } from "lucide-react";
import type { SetEntry, SetsLine } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";

type Props = {
  label: string;
  line: SetsLine;
  onChange: (patch: Partial<SetsLine>) => void;
};

export function SetsEditor({ label, line, onChange }: Props) {
  const updateEntry = (idx: number, patch: Partial<SetEntry>) => {
    const sets = line.sets.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ sets });
  };

  const addEntry = () => {
    const next =
      line.sets.length > 0 ? Math.max(...line.sets.map((s) => s.setNumber)) + 1 : 1;
    onChange({
      sets: [...line.sets, { setNumber: next, killerName: "", playerName: "Player Name" }],
    });
  };

  const removeEntry = (idx: number) => {
    onChange({ sets: line.sets.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3 p-4 bg-gray-800 rounded">
      <div className="flex items-center justify-between">
        <Label className="text-white font-semibold">{label}</Label>
        <div className="flex items-center gap-2">
          <Label className="text-white text-sm">表示</Label>
          <Switch
            checked={line.visible}
            onCheckedChange={(v) => onChange({ visible: v })}
          />
        </div>
      </div>

      {line.visible && (
        <>
          <div className="flex items-center gap-2">
            <Label className="text-white text-sm">文字色:</Label>
            <input
              type="color"
              value={line.color || "#FFFFFF"}
              onChange={(e) => onChange({ color: e.target.value })}
              className="w-12 h-8 rounded cursor-pointer"
            />
            <Input
              type="text"
              value={line.color || "#FFFFFF"}
              onChange={(e) => onChange({ color: e.target.value })}
              placeholder="#FFFFFF"
            />
          </div>

          <div className="space-y-3">
            {line.sets.map((s, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-gray-700 rounded">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-white text-xs w-20">SET番号:</Label>
                    <Input
                      type="number"
                      value={s.setNumber}
                      onChange={(e) =>
                        updateEntry(i, { setNumber: parseInt(e.target.value) || 1 })
                      }
                      min={1}
                      className="bg-gray-600 border-gray-500 w-20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-white text-xs w-20">Killer名:</Label>
                    <Input
                      value={s.killerName}
                      onChange={(e) => updateEntry(i, { killerName: e.target.value })}
                      placeholder="Killer Name"
                      className="bg-gray-600 border-gray-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-white text-xs w-20">Player名:</Label>
                    <Input
                      value={s.playerName}
                      onChange={(e) => updateEntry(i, { playerName: e.target.value })}
                      placeholder="Player Name"
                      className="bg-gray-600 border-gray-500"
                    />
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeEntry(i)}
                  className="mt-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addEntry} className="w-full">
              <Plus className="w-4 h-4" />
              セット追加
            </Button>
          </div>

          <div className="space-y-2 p-3 bg-gray-750 rounded">
            <div className="flex items-center justify-between">
              <Label className="text-white text-sm">背景表示</Label>
              <Switch
                checked={line.showBackground !== false}
                onCheckedChange={(v) => onChange({ showBackground: v })}
              />
            </div>
            {line.showBackground !== false && (
              <>
                <div className="flex items-center gap-2">
                  <Label className="text-white text-sm">背景色:</Label>
                  <input
                    type="color"
                    value={line.backgroundColor || "#2D2D2D"}
                    onChange={(e) => onChange({ backgroundColor: e.target.value })}
                    className="w-12 h-8 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={line.backgroundColor || "#2D2D2D"}
                    onChange={(e) => onChange({ backgroundColor: e.target.value })}
                    placeholder="#2D2D2D"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-sm">
                    透過値: {Math.round((line.backgroundOpacity ?? 1) * 100)}%
                  </Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={line.backgroundOpacity ?? 1}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!Number.isNaN(v)) onChange({ backgroundOpacity: v });
                    }}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
