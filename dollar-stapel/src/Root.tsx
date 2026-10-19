import { Composition } from "remotion";
import { DollarStapel } from "./Video.tsx";
import { DAUER, FPS, H, W } from "./world.ts";

export const RemotionRoot: React.FC = () => (
  <Composition id="DollarStapel" component={DollarStapel} durationInFrames={DAUER} fps={FPS} width={W} height={H} />
);
