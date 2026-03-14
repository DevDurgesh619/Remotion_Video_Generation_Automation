import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const GeneratedMotion = () => {
const frame = useCurrentFrame();
const totalFrames = 90;
const opacityStartFrame = 0;
const opacityEndFrame = 15;
const opacity = interpolate(frame, [opacityStartFrame, opacityEndFrame], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// Bounce timeline frames
const bounceStart = 15;
const seg1End = 35;
const seg2End = 43;
const seg3End = 49;
const seg4End = 54;
const bounceEnd = 60;

// Bounce heights and floor
const floorY = 540;
const h1 = 180;
const h2 = 60;
const peak1 = floorY - h1;
const peak2 = floorY - h2;

// Segment interpolations
const y_drop1 = interpolate(frame, [bounceStart, seg1End], [-540, floorY], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const y_rise1 = interpolate(frame, [seg1End, seg2End], [floorY, peak1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const y_drop2 = interpolate(frame, [seg2End, seg3End], [peak1, floorY], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const y_rise2 = interpolate(frame, [seg3End, seg4End], [floorY, peak2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const y_drop3 = interpolate(frame, [seg4End, bounceEnd], [peak2, floorY], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// Compose final y value based on current frame
let yVal = -540;
if (frame < bounceStart) {
  yVal = -540;
} else if (frame <= seg1End) {
  yVal = y_drop1;
} else if (frame <= seg2End) {
  yVal = y_rise1;
} else if (frame <= seg3End) {
  yVal = y_drop2;
} else if (frame <= seg4End) {
  yVal = y_rise2;
} else if (frame <= bounceEnd) {
  yVal = y_drop3;
} else {
  yVal = floorY;
}

const triWidth = 140;
const triHeight = 140;
const posX = 0;
const posY = -540;

return (
  <AbsoluteFill style={{ backgroundColor: "#E0F7FA", overflow: "hidden" }}>
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: triWidth + "px",
        height: triHeight + "px",
        backgroundColor: "#4CAF50",
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
        transform:
          "translate(-50%, -50%) translateX(" +
          posX +
          "px) translateY(" +
          yVal +
          "px)",
        opacity: opacity,
        pointerEvents: "none",
        userSelect: "none"
      }}
    />
  </AbsoluteFill>
);
};
