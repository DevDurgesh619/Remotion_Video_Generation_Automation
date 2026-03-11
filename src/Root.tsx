import { Composition } from "remotion";
import { SpecPlayer } from "./specvm/SpecPlayer";
import type { MotionSpec } from "./specvm/types";

export const RemotionRoot = () => {
  const specFile = process.env.REMOTION_APP_SPEC_FILE || "spec_148.json";
  const specVersion = process.env.REMOTION_APP_SPEC_VERSION || "v2";

  let spec: MotionSpec;

  if (specVersion === "v1") {
    const ctx = (require as any).context("../machine_specs", false, /\.json$/);
    spec = ctx("./" + specFile);
  } else {
    const ctx = (require as any).context("../machine_specs_v2", false, /\.json$/);
    spec = ctx("./" + specFile);
  }

  const fps = spec.fps || 30;

  const durationInFrames =
    process.env.REMOTION_APP_DURATION_FRAMES
      ? parseInt(process.env.REMOTION_APP_DURATION_FRAMES, 10)
      : Math.round(spec.duration * fps);

  const videoWidth =
    process.env.REMOTION_APP_VIDEO_WIDTH
      ? parseInt(process.env.REMOTION_APP_VIDEO_WIDTH, 10)
      : spec.canvas?.w ?? 720;

  const videoHeight =
    process.env.REMOTION_APP_VIDEO_HEIGHT
      ? parseInt(process.env.REMOTION_APP_VIDEO_HEIGHT, 10)
      : spec.canvas?.h ?? 720;

  return (
    <Composition
      id="GeneratedMotion"
      component={() => <SpecPlayer spec={spec} />}
      durationInFrames={durationInFrames}
      fps={fps}
      width={videoWidth}
      height={videoHeight}
    />
  );
};