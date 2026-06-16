import { useEffect, useMemo, useRef, useState } from "react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import type { LottieAnimation } from "@/lib/types";

type Props = {
  animation: LottieAnimation;
  /** 親側で計算済みの「再生トリガーが今発火したか」 のシグナル。
   *  数値を毎回インクリメントすると useEffect が走って再生される設計。 */
  playSignal: number;
};

/**
 * Lottie JSON を解釈して、playSignal が変わるたびに再生する。
 *
 * - loop: true なら playSignal 関係なく enabled 中は常時ループ
 * - loop: false なら playSignal の度に頭から 1 回再生 → fadeOutMs でフェードアウト
 * - json が空 / 解析不能なら何も描画しない
 */
export function LottiePlayer({ animation, playSignal }: Props) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [isVisible, setIsVisible] = useState(animation.loop);
  const fadeTimerRef = useRef<number | null>(null);

  // JSON を安全にパース。失敗したら null。
  const animData = useMemo(() => {
    if (!animation.json) return null;
    try {
      return JSON.parse(animation.json);
    } catch {
      return null;
    }
  }, [animation.json]);

  // playSignal の変化を検知して再生(単発モード時のみ)
  useEffect(() => {
    if (!animData) return;
    if (animation.loop) {
      setIsVisible(true);
      return;
    }
    if (playSignal <= 0) return;
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setIsVisible(true);
    // 再生を頭から
    const ref = lottieRef.current;
    if (ref) {
      ref.stop();
      ref.play();
    }
  }, [playSignal, animation.loop, animData]);

  // ループモードの enabled 変化に追従
  useEffect(() => {
    if (animation.loop) setIsVisible(true);
  }, [animation.loop]);

  const handleComplete = () => {
    if (animation.loop) return;
    // 再生完了 → フェードアウト
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = window.setTimeout(() => {
      setIsVisible(false);
    }, Math.max(50, animation.fadeOutMs));
  };

  if (!animData) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: `${animation.x}%`,
        top: `${animation.y}%`,
        width: `${animation.width}%`,
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${Math.max(50, animation.fadeOutMs)}ms ease-out`,
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animData}
        loop={animation.loop}
        autoplay={animation.loop} // 単発なら autoplay 無効、play() で開始
        onComplete={handleComplete}
        // クリックスルー
        style={{ width: "100%", pointerEvents: "none" }}
      />
    </div>
  );
}
