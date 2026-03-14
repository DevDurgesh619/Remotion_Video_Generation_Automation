import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const GeneratedMotion = () => {
const frame = useCurrentFrame();
const bodyStart = 0;
const bodyEnd = 15;
const bodyScale = interpolate(frame, [bodyStart, bodyEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const bodyOpacity = interpolate(frame, [bodyStart, bodyEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// Left leg rotations
const ll_segA_start = 15;
const ll_segA_end = 75;
const ll_segB_start = 45;
const ll_segB_end = 75;
const ll_rotA = interpolate(frame, [ll_segA_start, ll_segA_end], [0, 15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const ll_rotB = interpolate(frame, [ll_segB_start, ll_segB_end], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
let leftLegRot = 0;
if (frame < ll_segB_start) {
  leftLegRot = ll_rotA;
} else {
  leftLegRot = ll_rotB;
}

// Right leg rotations
const rl_segA_start = 15;
const rl_segA_end = 75;
const rl_segB_start = 45;
const rl_segB_end = 75;
const rl_rotA = interpolate(frame, [rl_segA_start, rl_segA_end], [0, -15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const rl_rotB = interpolate(frame, [rl_segB_start, rl_segB_end], [-15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
let rightLegRot = 0;
if (frame < rl_segB_start) {
  rightLegRot = rl_rotA;
} else {
  rightLegRot = rl_rotB;
}

// Left arm rotations
const la_segA_start = 15;
const la_segA_end = 75;
const la_segB_start = 45;
const la_segB_end = 75;
const la_rotA = interpolate(frame, [la_segA_start, la_segA_end], [0, -15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const la_rotB = interpolate(frame, [la_segB_start, la_segB_end], [-15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
let leftArmRot = 0;
if (frame < la_segB_start) {
  leftArmRot = la_rotA;
} else {
  leftArmRot = la_rotB;
}

// Right arm rotations (multiple segments)
const ra_segA_start = 15;
const ra_segA_end = 75;
const ra_segB_start = 45;
const ra_segB_end = 75;
const ra_segC_start = 75;
const ra_segC_end = 90;
const ra_segD_start = 90;
const ra_segD_end = 105;
const ra_segE_start = 105;
const ra_segE_end = 120;
const ra_rotA = interpolate(frame, [ra_segA_start, ra_segA_end], [0, 15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const ra_rotB = interpolate(frame, [ra_segB_start, ra_segB_end], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const ra_rotC = interpolate(frame, [ra_segC_start, ra_segC_end], [0, 30], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const ra_rotD = interpolate(frame, [ra_segD_start, ra_segD_end], [30, -30], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const ra_rotE = interpolate(frame, [ra_segE_start, ra_segE_end], [-30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
let rightArmRot = 0;
if (frame < ra_segB_start) {
  rightArmRot = ra_rotA;
} else if (frame < ra_segA_end) {
  // between 45 and 75
  rightArmRot = ra_rotB;
} else if (frame < ra_segC_end) {
  rightArmRot = ra_rotC;
} else if (frame < ra_segD_end) {
  rightArmRot = ra_rotD;
} else {
  rightArmRot = ra_rotE;
}

// Parent (body) position
const bodyPosX = 0;
const bodyPosY = 0;

return (
  <AbsoluteFill style={{ backgroundColor: "#F5F5DC", overflow: "hidden" }}>
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform:
          "translate(-50%, -50%) translateX(" + bodyPosX + "px) translateY(" + bodyPosY + "px) scale(" + bodyScale + ")",
        opacity: bodyOpacity,
        display: "block"
      }}
    >
      {/* body rectangle */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "20px",
          height: "100px",
          backgroundColor: "#333333",
          transform: "translate(-50%, -50%)"
        }}
      />
      {/* head */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "40px",
          height: "40px",
          backgroundColor: "#333333",
          borderRadius: "50%",
          transform: "translate(-50%, -50%) translateX(" + 0 + "px) translateY(" + -70 + "px)"
        }}
      />
      {/* left arm */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "10px",
          height: "60px",
          backgroundColor: "#333333",
          transform:
            "translate(-50%, -50%) translateX(" + -15 + "px) translateY(" + -20 + "px) rotate(" + leftArmRot + "deg)",
          transformOrigin: "50% 0%"
        }}
      />
      {/* right arm */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "10px",
          height: "60px",
          backgroundColor: "#333333",
          transform:
            "translate(-50%, -50%) translateX(" + 15 + "px) translateY(" + -20 + "px) rotate(" + rightArmRot + "deg)",
          transformOrigin: "50% 0%"
        }}
      />
      {/* left leg */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "10px",
          height: "80px",
          backgroundColor: "#333333",
          transform:
            "translate(-50%, -50%) translateX(" + -10 + "px) translateY(" + 50 + "px) rotate(" + leftLegRot + "deg)",
          transformOrigin: "50% 0%"
        }}
      />
      {/* right leg */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "10px",
          height: "80px",
          backgroundColor: "#333333",
          transform:
            "translate(-50%, -50%) translateX(" + 10 + "px) translateY(" + 50 + "px) rotate(" + rightLegRot + "deg)",
          transformOrigin: "50% 0%"
        }}
      />
    </div>
  </AbsoluteFill>
);
};
