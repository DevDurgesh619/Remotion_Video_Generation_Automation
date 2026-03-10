import { Composition } from "remotion";
import { GeneratedMotion } from "./GeneratedMotion";

// Read duration from environment variable, fallback to 120 frames (4s)
const durationInFrames = parseInt(
  process.env.REMOTION_APP_DURATION_FRAMES || "120",
  10
);

const videoWidth = parseInt(
  process.env.REMOTION_APP_VIDEO_WIDTH || "720",
  10
);

const videoHeight = parseInt(
  process.env.REMOTION_APP_VIDEO_HEIGHT || "720",
  10
);

export const RemotionRoot = () => {
  console.log("Duration received:", durationInFrames);
  return (
    <>
      <Composition
        id="GeneratedMotion"
        component={GeneratedMotion}
        durationInFrames={durationInFrames}
        fps={30}
        width={videoWidth}
        height={videoHeight}
      />
    </>
  );
};
