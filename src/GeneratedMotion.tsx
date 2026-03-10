
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const GeneratedMotion = () => {
const frame = useCurrentFrame();
const f = frame;
const fps = 30;
const frame0 = 0;
const frame60 = 2 * fps;
const frame75 = 2.5 * fps;
const frame90 = 3 * fps;
const frame105 = 3.5 * fps;
const frame120 = 4 * fps;
const frame135 = 4.5 * fps;
const frame150 = 5 * fps;
const frame165 = 5.5 * fps;
const frame180 = 6 * fps;
const frame240 = 8 * fps;
const frame360 = 12 * fps;
// Circle animations
const scaleStart = interpolate(f, [frame0, frame60], [1, 1.1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const scaleEnd = interpolate(f, [frame240, frame360], [1.1, 1.0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
let circleScale = scaleStart;
if (f >= frame240) {
  circleScale = scaleEnd;
}
const circleRotate = interpolate(f, [frame240, frame360], [0, 360], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const circleOpacity = interpolate(f, [frame240, frame360], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const circleBorder = interpolate(f, [frame240, frame360], [4, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
// Triangles fade in (staggered)
const tri1Opacity = interpolate(f, [frame60, frame75], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const tri2Opacity = interpolate(f, [frame75, frame90], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const tri3Opacity = interpolate(f, [frame90, frame105], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const tri4Opacity = interpolate(f, [frame105, frame120], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const tri5Opacity = interpolate(f, [frame120, frame135], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const tri6Opacity = interpolate(f, [frame135, frame150], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const tri7Opacity = interpolate(f, [frame150, frame165], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const tri8Opacity = interpolate(f, [frame165, frame180], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
// Triangles rotate 0->180 between 6s and 8s
const triRotateAnim = interpolate(f, [frame180, frame240], [0, 180], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
// Triangle sizes and adjustments
const triW = 100;
const triH = 100;
const halfW = triW / 2;
const halfH = triH / 2;
// Positions (center offsets provided) and adjusted to top-left translation origin
const t1x = 240;
const t1y = 0;
const t1adjX = t1x - halfW;
const t1adjY = t1y - halfH;
const t1baseRot = 0;
const t1totalRot = t1baseRot + triRotateAnim;

const t2x = 169.7;
const t2y = 169.7;
const t2adjX = t2x - halfW;
const t2adjY = t2y - halfH;
const t2baseRot = 45;
const t2totalRot = t2baseRot + triRotateAnim;

const t3x = 0;
const t3y = 240;
const t3adjX = t3x - halfW;
const t3adjY = t3y - halfH;
const t3baseRot = 90;
const t3totalRot = t3baseRot + triRotateAnim;

const t4x = -169.7;
const t4y = 169.7;
const t4adjX = t4x - halfW;
const t4adjY = t4y - halfH;
const t4baseRot = 135;
const t4totalRot = t4baseRot + triRotateAnim;

const t5x = -240;
const t5y = 0;
const t5adjX = t5x - halfW;
const t5adjY = t5y - halfH;
const t5baseRot = 180;
const t5totalRot = t5baseRot + triRotateAnim;

const t6x = -169.7;
const t6y = -169.7;
const t6adjX = t6x - halfW;
const t6adjY = t6y - halfH;
const t6baseRot = 225;
const t6totalRot = t6baseRot + triRotateAnim;

const t7x = 0;
const t7y = -240;
const t7adjX = t7x - halfW;
const t7adjY = t7y - halfH;
const t7baseRot = 270;
const t7totalRot = t7baseRot + triRotateAnim;

const t8x = 169.7;
const t8y = -169.7;
const t8adjX = t8x - halfW;
const t8adjY = t8y - halfH;
const t8baseRot = 315;
const t8totalRot = t8baseRot + triRotateAnim;

return (
<AbsoluteFill style={{ backgroundColor: "#000000", overflow: "hidden" }}>
  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translateX(-100%) translateY(-50%)" }}>
    <div style={{
      width: 200 + "px",
      height: 200 + "px",
      borderRadius: "50%",
      borderStyle: "solid",
      borderColor: "#FFD700",
      borderWidth: circleBorder + "px",
      boxSizing: "border-box",
      transform: "rotate(" + circleRotate + "deg) scale(" + circleScale + ")",
      opacity: circleOpacity,
      margin: 0
    }} />
  </div>

  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translateX(-100%) translateY(-50%)" }}>
    <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      width: triW + "px",
      height: triH + "px",
      backgroundColor: "red",
      clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
      transform: "translateX(" + t1adjX + "px) translateY(" + t1adjY + "px) rotate(" + t1totalRot + "deg)",
      transformOrigin: "50% 50%",
      opacity: tri1Opacity
    }} />
  </div>

  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translateX(-100%) translateY(-50%)" }}>
    <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      width: triW + "px",
      height: triH + "px",
      backgroundColor: "orange",
      clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
      transform: "translateX(" + t2adjX + "px) translateY(" + t2adjY + "px) rotate(" + t2totalRot + "deg)",
      transformOrigin: "50% 50%",
      opacity: tri2Opacity
    }} />
  </div>

  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translateX(-100%) translateY(-50%)" }}>
    <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      width: triW + "px",
      height: triH + "px",
      backgroundColor: "yellow",
      clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
      transform: "translateX(" + t3adjX + "px) translateY(" + t3adjY + "px) rotate(" + t3totalRot + "deg)",
      transformOrigin: "50% 50%",
      opacity: tri3Opacity
    }} />
  </div>

  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translateX(-100%) translateY(-50%)" }}>
    <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      width: triW + "px",
      height: triH + "px",
      backgroundColor: "green",
      clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
      transform: "translateX(" + t4adjX + "px) translateY(" + t4adjY + "px) rotate(" + t4totalRot + "deg)",
      transformOrigin: "50% 50%",
      opacity: tri4Opacity
    }} />
  </div>

  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translateX(-100%) translateY(-50%)" }}>
    <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      width: triW + "px",
      height: triH + "px",
      backgroundColor: "blue",
      clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
      transform: "translateX(" + t5adjX + "px) translateY(" + t5adjY + "px) rotate(" + t5totalRot + "deg)",
      transformOrigin: "50% 50%",
      opacity: tri5Opacity
    }} />
  </div>

  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translateX(-100%) translateY(-50%)" }}>
    <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      width: triW + "px",
      height: triH + "px",
      backgroundColor: "indigo",
      clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
      transform: "translateX(" + t6adjX + "px) translateY(" + t6adjY + "px) rotate(" + t6totalRot + "deg)",
      transformOrigin: "50% 50%",
      opacity: tri6Opacity
    }} />
  </div>

  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translateX(-100%) translateY(-50%)" }}>
    <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      width: triW + "px",
      height: triH + "px",
      backgroundColor: "violet",
      clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
      transform: "translateX(" + t7adjX + "px) translateY(" + t7adjY + "px) rotate(" + t7totalRot + "deg)",
      transformOrigin: "50% 50%",
      opacity: tri7Opacity
    }} />
  </div>

  <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translateX(-100%) translateY(-50%)" }}>
    <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      width: triW + "px",
      height: triH + "px",
      backgroundColor: "purple",
      clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
      transform: "translateX(" + t8adjX + "px) translateY(" + t8adjY + "px) rotate(" + t8totalRot + "deg)",
      transformOrigin: "50% 50%",
      opacity: tri8Opacity
    }} />
  </div>
</AbsoluteFill>
);
};
