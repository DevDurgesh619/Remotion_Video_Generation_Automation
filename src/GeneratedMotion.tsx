import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const GeneratedMotion = () => {
const frame = useCurrentFrame();

// --- circle_1 ---
let circle_1_r = 255;
let circle_1_g = 255;
let circle_1_b = 255;
if (frame >= 0 && frame <= 45) {
  circle_1_r = interpolate(frame, [0, 45], [255, 255], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  circle_1_g = interpolate(frame, [0, 45], [255, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  circle_1_b = interpolate(frame, [0, 45], [255, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
} else if (frame >= 45 && frame <= 90) {
  circle_1_r = interpolate(frame, [45, 90], [255, 255], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  circle_1_g = interpolate(frame, [45, 90], [0, 165], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  circle_1_b = interpolate(frame, [45, 90], [0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
} else if (frame >= 90 && frame <= 135) {
  circle_1_r = interpolate(frame, [90, 135], [255, 255], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  circle_1_g = interpolate(frame, [90, 135], [165, 255], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  circle_1_b = interpolate(frame, [90, 135], [0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
} else if (frame >= 135 && frame <= 180) {
  circle_1_r = interpolate(frame, [135, 180], [255, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  circle_1_g = interpolate(frame, [135, 180], [255, 128], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  circle_1_b = interpolate(frame, [135, 180], [0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
} else if (frame >= 180 && frame <= 225) {
  circle_1_r = interpolate(frame, [180, 225], [0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  circle_1_g = interpolate(frame, [180, 225], [128, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  circle_1_b = interpolate(frame, [180, 225], [0, 255], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
} else if (frame >= 225 && frame <= 270) {
  circle_1_r = interpolate(frame, [225, 270], [0, 128], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  circle_1_g = interpolate(frame, [225, 270], [0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  circle_1_b = interpolate(frame, [225, 270], [255, 128], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}
const circle_1_color = "rgb(" + Math.round(circle_1_r) + "," + Math.round(circle_1_g) + "," + Math.round(circle_1_b) + ")";
const circle_1_x = -180;
const circle_1_y = 0;
const circle_1_opacity = 1;
const circle_1_scale = 1;
const circle_1_rotation = 0;

// --- square_1 ---
let square_1_r = 255;
let square_1_g = 255;
let square_1_b = 255;
if (frame >= 0 && frame <= 45) {
  square_1_r = interpolate(frame, [0, 45], [255, 255], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  square_1_g = interpolate(frame, [0, 45], [255, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  square_1_b = interpolate(frame, [0, 45], [255, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
} else if (frame >= 45 && frame <= 90) {
  square_1_r = interpolate(frame, [45, 90], [255, 255], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  square_1_g = interpolate(frame, [45, 90], [0, 165], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  square_1_b = interpolate(frame, [45, 90], [0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
} else if (frame >= 90 && frame <= 135) {
  square_1_r = interpolate(frame, [90, 135], [255, 255], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  square_1_g = interpolate(frame, [90, 135], [165, 255], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  square_1_b = interpolate(frame, [90, 135], [0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
} else if (frame >= 135 && frame <= 180) {
  square_1_r = interpolate(frame, [135, 180], [255, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  square_1_g = interpolate(frame, [135, 180], [255, 128], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  square_1_b = interpolate(frame, [135, 180], [0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
} else if (frame >= 180 && frame <= 225) {
  square_1_r = interpolate(frame, [180, 225], [0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  square_1_g = interpolate(frame, [180, 225], [128, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  square_1_b = interpolate(frame, [180, 225], [0, 255], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
} else if (frame >= 225 && frame <= 270) {
  square_1_r = interpolate(frame, [225, 270], [0, 128], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  square_1_g = interpolate(frame, [225, 270], [0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  square_1_b = interpolate(frame, [225, 270], [255, 128], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}
const square_1_color = "rgb(" + Math.round(square_1_r) + "," + Math.round(square_1_g) + "," + Math.round(square_1_b) + ")";
const square_1_x = 0;
const square_1_y = 0;
const square_1_opacity = 1;
const square_1_scale = 1;
const square_1_rotation = 0;

// --- triangle_1 ---
let triangle_1_r = 255;
let triangle_1_g = 255;
let triangle_1_b = 255;
if (frame >= 0 && frame <= 45) {
  triangle_1_r = interpolate(frame, [0, 45], [255, 255], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  triangle_1_g = interpolate(frame, [0, 45], [255, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  triangle_1_b = interpolate(frame, [0, 45], [255, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
} else if (frame >= 45 && frame <= 90) {
  triangle_1_r = interpolate(frame, [45, 90], [255, 255], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  triangle_1_g = interpolate(frame, [45, 90], [0, 165], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  triangle_1_b = interpolate(frame, [45, 90], [0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
} else if (frame >= 90 && frame <= 135) {
  triangle_1_r = interpolate(frame, [90, 135], [255, 255], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  triangle_1_g = interpolate(frame, [90, 135], [165, 255], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  triangle_1_b = interpolate(frame, [90, 135], [0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
} else if (frame >= 135 && frame <= 180) {
  triangle_1_r = interpolate(frame, [135, 180], [255, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  triangle_1_g = interpolate(frame, [135, 180], [255, 128], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  triangle_1_b = interpolate(frame, [135, 180], [0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
} else if (frame >= 180 && frame <= 225) {
  triangle_1_r = interpolate(frame, [180, 225], [0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  triangle_1_g = interpolate(frame, [180, 225], [128, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  triangle_1_b = interpolate(frame, [180, 225], [0, 255], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
} else if (frame >= 225 && frame <= 270) {
  triangle_1_r = interpolate(frame, [225, 270], [0, 128], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  triangle_1_g = interpolate(frame, [225, 270], [0, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  triangle_1_b = interpolate(frame, [225, 270], [255, 128], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}
const triangle_1_color = "rgb(" + Math.round(triangle_1_r) + "," + Math.round(triangle_1_g) + "," + Math.round(triangle_1_b) + ")";
const triangle_1_x = 180;
const triangle_1_y = 0;
const triangle_1_opacity = 1;
const triangle_1_scale = 1;
const triangle_1_rotation = 0;

return (
  <AbsoluteFill style={{ backgroundColor: "#D3D3D3", overflow: "hidden" }}>
    <div
      style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 140,
          height: 140,
          borderRadius: "50%",
          backgroundColor: "#FFFFFF",
          backgroundColor: circle_1_color,
          opacity: circle_1_opacity,
          transform: "translate(-50%, -50%) translateX(" + circle_1_x + "px) translateY(" + circle_1_y + "px) rotate(" + circle_1_rotation + "deg) scale(" + circle_1_scale + ")",
      }}
    />
    <div
      style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 140,
          height: 140,
          backgroundColor: "#FFFFFF",
          backgroundColor: square_1_color,
          opacity: square_1_opacity,
          transform: "translate(-50%, -50%) translateX(" + square_1_x + "px) translateY(" + square_1_y + "px) rotate(" + square_1_rotation + "deg) scale(" + square_1_scale + ")",
      }}
    />
    <div
      style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 140,
          height: 140,
          clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          backgroundColor: "#FFFFFF",
          backgroundColor: triangle_1_color,
          opacity: triangle_1_opacity,
          transform: "translate(-50%, -50%) translateX(" + triangle_1_x + "px) translateY(" + triangle_1_y + "px) rotate(" + triangle_1_rotation + "deg) scale(" + triangle_1_scale + ")",
      }}
    />
  </AbsoluteFill>
);
};
