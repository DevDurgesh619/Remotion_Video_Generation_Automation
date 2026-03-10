
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const GeneratedMotion = () => {
const frame = useCurrentFrame();
const circle_x_start = interpolate(frame, [0, 60], [-960, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const circle_x_endShift = interpolate(frame, [180, 240], [0, -150], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const circle_x = circle_x_start + circle_x_endShift;
const circle_y_up = interpolate(frame, [60, 120], [0, -40], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const circle_y_downDelta = interpolate(frame, [120, 180], [0, 40], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const circle_y = circle_y_up + circle_y_downDelta;
const circle_rot = interpolate(frame, [60, 120], [0, 360], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const circle_scale = interpolate(frame, [180, 240], [1, 1.05], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const circle_op_first = interpolate(frame, [120, 180], [1, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const circle_op_secondDelta = interpolate(frame, [180, 240], [0, -0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const circle_opacity = circle_op_first + circle_op_secondDelta;

const square_x_start = interpolate(frame, [0, 60], [960, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const square_x = square_x_start;
const square_y_down = interpolate(frame, [60, 120], [0, 40], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const square_y_upDelta = interpolate(frame, [120, 180], [0, -40], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const square_y = square_y_down + square_y_upDelta;
const square_rot = interpolate(frame, [60, 120], [0, 360], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const square_scale = interpolate(frame, [180, 240], [1, 1.05], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const square_op_first = interpolate(frame, [120, 180], [1, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const square_op_secondDelta = interpolate(frame, [180, 240], [0, -0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const square_opacity = square_op_first + square_op_secondDelta;

const triangle_y_start = interpolate(frame, [0, 60], [-540, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const triangle_x_end = interpolate(frame, [180, 240], [0, 150], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const triangle_x = triangle_x_end;
const triangle_y = triangle_y_start;
const triangle_rot = interpolate(frame, [60, 120], [0, 360], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const triangle_scale = interpolate(frame, [180, 240], [1, 1.05], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const triangle_op_first = interpolate(frame, [120, 180], [1, 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const triangle_op_secondDelta = interpolate(frame, [180, 240], [0, -0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
const triangle_opacity = triangle_op_first + triangle_op_secondDelta;

return (
<AbsoluteFill style={{ background: "linear-gradient(90deg, " + "#E3F2FD" + " 0%, " + "#BBDEFB" + " 100%)", overflow: "hidden" }}>
  <div style={{ position: "absolute", left: "calc(50% + " + circle_x + "px)", top: "calc(50% + " + circle_y + "px)", transform: "translateX(-100%) translateY(-50%)" }}>
    <div style={{ width: 120 + "px", height: 120 + "px", borderRadius: "50%", backgroundColor: "#E91E63", transform: "rotate(" + circle_rot + "deg) scale(" + circle_scale + "," + circle_scale + ")", transformOrigin: "50% 50%", opacity: circle_opacity }} />
  </div>

  <div style={{ position: "absolute", left: "calc(50% + " + square_x + "px)", top: "calc(50% + " + square_y + "px)", transform: "translateX(-100%) translateY(-50%)" }}>
    <div style={{ width: 120 + "px", height: 120 + "px", backgroundColor: "#E91E63", transform: "rotate(" + square_rot + "deg) scale(" + square_scale + "," + square_scale + ")", transformOrigin: "50% 50%", opacity: square_opacity }} />
  </div>

  <div style={{ position: "absolute", left: "calc(50% + " + triangle_x + "px)", top: "calc(50% + " + triangle_y + "px)", transform: "translateX(-100%) translateY(-50%)" }}>
    <div style={{ width: 120 + "px", height: 120 + "px", backgroundColor: "#E91E63", clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)", transform: "rotate(" + triangle_rot + "deg) scale(" + triangle_scale + "," + triangle_scale + ")", transformOrigin: "50% 50%", opacity: triangle_opacity }} />
  </div>
</AbsoluteFill>
);
};
