import type { Room } from "./types";

const SNAPSHOTS_KEY = "dbd-overlay-snapshots";
const MAX_SNAPSHOTS = 10;

type Snapshot = {
  savedAt: string;
  rooms: Room[];
  activeRoomId: string;
};

type BackupBundle = {
  type: "dbd-overlay-backup";
  version: 1;
  exportedAt: string;
  rooms: Room[];
  activeRoomId?: string;
};

export function readSnapshots(): Snapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function pushSnapshot(rooms: Room[], activeRoomId: string) {
  const snaps = readSnapshots();
  // 直前と内容同じならスキップ（無駄な書き込み防止）
  const last = snaps[snaps.length - 1];
  const nextRoomsJson = JSON.stringify(rooms);
  if (last && JSON.stringify(last.rooms) === nextRoomsJson) return;

  snaps.push({ savedAt: new Date().toISOString(), rooms, activeRoomId });
  while (snaps.length > MAX_SNAPSHOTS) snaps.shift();

  const writeWith = (arr: Snapshot[]) => {
    try {
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(arr));
      return true;
    } catch {
      return false;
    }
  };

  // QuotaExceededError の場合は古いものから捨ててリトライ
  if (!writeWith(snaps)) {
    while (snaps.length > 3 && !writeWith(snaps)) snaps.shift();
  }
}

const isoStamp = () =>
  new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

export function exportRoomsToFile(rooms: Room[], activeRoomId: string) {
  const bundle: BackupBundle = {
    type: "dbd-overlay-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    rooms,
    activeRoomId,
  };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dbd-overlay-backup-${isoStamp()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importRoomsFromFile(file: File): Promise<{
  rooms: Room[];
  activeRoomId?: string;
}> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSON として読み込めませんでした");
  }
  const b = parsed as Partial<BackupBundle>;
  if (b?.type !== "dbd-overlay-backup" || !Array.isArray(b.rooms)) {
    throw new Error("dbd-overlay のバックアップファイルではありません");
  }
  // 軽量バリデーション: 各 room に id/name/settings があること
  for (const r of b.rooms) {
    if (!r || typeof (r as Room).id !== "string" || typeof (r as Room).name !== "string" || !(r as Room).settings) {
      throw new Error("rooms の中身が壊れています");
    }
  }
  return { rooms: b.rooms as Room[], activeRoomId: b.activeRoomId };
}

/** rooms[] を id でマージ。既存にあれば上書き、なければ追加。 */
export function mergeRoomsById(existing: Room[], incoming: Room[]): Room[] {
  const map = new Map<string, Room>();
  for (const r of existing) map.set(r.id, r);
  for (const r of incoming) map.set(r.id, r);
  return [...map.values()];
}
