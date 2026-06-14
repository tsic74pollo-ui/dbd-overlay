import { Plus, X } from "lucide-react";
import type { Line, Segment, TextLine } from "@/lib/types";
import { isSetsLine } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";

type Props = {
  label: string;
  line: Line;
  onChange: (patch: Partial<Line>) => void;
};

export function LineEditor({ label, line, onChange }: Props) {
  if (isSetsLine(line)) return null;

  const t = line as TextLine;

  const toggleSegments = () => {
    if (t.segments) {
      onChange({
        segments: undefined,
        text: t.segments.map((s) => s.text).join(""),
        color: t.segments[0]?.color || "#FFFFFF",
      } as Partial<TextLine>);
    } else {
      onChange({
        segments: [{ text: t.text || "", color: t.color || "#FFFFFF" }],
        text: undefined,
        color: undefined,
      } as Partial<TextLine>);
    }
  };

  const updateSegment = (idx: number, patch: Partial<Segment>) => {
    const segs = (t.segments || []).map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ segments: segs } as Partial<TextLine>);
  };

  const addSegment = () => {
    onChange({
      segments: [...(t.segments || []), { text: "", color: "#FFFFFF" }],
    } as Partial<TextLine>);
  };

  const removeSegment = (idx: number) => {
    const segs = (t.segments || []).filter((_, i) => i !== idx);
    if (segs.length === 0) return;
    onChange({ segments: segs } as Partial<TextLine>);
  };

  return (
    <div className="space-y-3 p-4 bg-gray-800 rounded">
      <div className="flex items-center justify-between">
        <Label className="text-white font-semibold">{label}</Label>
        <div className="flex items-center gap-2">
          <Label className="text-white text-sm">表示</Label>
          <Switch
            checked={t.visible}
            onCheckedChange={(v) => onChange({ visible: v })}
          />
        </div>
      </div>

      {t.visible && (
        <>
          <Button variant="outline" size="sm" onClick={toggleSegments} className="w-full">
            {t.segments ? "通常モードに切り替え" : "複数色モードに切り替え"}
          </Button>

          {!t.segments && (
            <>
              <textarea
                value={t.text || ""}
                onChange={(e) => onChange({ text: e.target.value } as Partial<TextLine>)}
                placeholder={`${label}を入力`}
                className="bg-gray-700 text-white border border-gray-600 w-full px-3 py-2 rounded resize-none text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                rows={3}
              />
              <div className="flex items-center gap-2">
                <Label className="text-white text-sm">文字色:</Label>
                <input
                  type="color"
                  value={t.color || "#FFFFFF"}
                  onChange={(e) =>
                    onChange({ color: e.target.value } as Partial<TextLine>)
                  }
                  className="w-12 h-8 rounded cursor-pointer"
                />
                <Input
                  type="text"
                  value={t.color || "#FFFFFF"}
                  onChange={(e) =>
                    onChange({ color: e.target.value } as Partial<TextLine>)
                  }
                  placeholder="#FFFFFF"
                />
              </div>
            </>
          )}

          {t.segments && (
            <div className="space-y-3">
              {t.segments.map((seg, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-gray-700 rounded">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={seg.text}
                      onChange={(e) => updateSegment(i, { text: e.target.value })}
                      placeholder="セグメントテキスト"
                      className="bg-gray-600 border-gray-500 text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <Label className="text-white text-xs w-12">色:</Label>
                      <input
                        type="color"
                        value={seg.color}
                        onChange={(e) => updateSegment(i, { color: e.target.value })}
                        className="w-10 h-8 rounded cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={seg.color}
                        onChange={(e) => updateSegment(i, { color: e.target.value })}
                        placeholder="#FFFFFF"
                        className="bg-gray-600 border-gray-500 text-sm"
                      />
                    </div>
                  </div>
                  {t.segments && t.segments.length > 1 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeSegment(i)}
                      className="mt-1"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addSegment} className="w-full">
                <Plus className="w-4 h-4" />
                セグメント追加
              </Button>
            </div>
          )}

          <BackgroundEditor line={t} onChange={onChange} />
        </>
      )}
    </div>
  );
}

function BackgroundEditor({
  line,
  onChange,
}: {
  line: Line;
  onChange: (patch: Partial<Line>) => void;
}) {
  return (
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
  );
}
