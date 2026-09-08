import { lazy } from "react";

/** 遅延ロードするルート定義。
 *
 *  OverlayPage は **意図的にここに含めない**。OBS が配信中に読むのは
 *  /overlay なので、放送中にチャンク取得へ依存させない(取得に失敗すると
 *  画面が消える = CLAUDE.md の禁止事項)。
 *  エディタとリモートは配信者の手元操作なので遅延で問題ない。
 *
 *  main.tsx ではなくこのファイルに置いているのは、コンポーネント以外の
 *  export が混ざると react-refresh/only-export-components に触れるため。 */
export const EditorPage = lazy(() =>
  import("@/routes/EditorPage").then((m) => ({ default: m.EditorPage })),
);

export const RemotePage = lazy(() =>
  import("@/routes/RemotePage").then((m) => ({ default: m.RemotePage })),
);
