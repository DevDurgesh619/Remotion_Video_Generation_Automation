
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const GeneratedMotion = () => {
const frame = useCurrentFrame();
const circle_start1 = 0;
const circle_end1 = 60;
const square_start1 = 0;
const square_end1 = 60;
const triangle_start1 = 0;
const triangle_end1 = 60;
const rotate_start = 60;
const rotate_end = 120;
const scale_up_start = 120;
const scale_up_end = 150;
const scale_down_start = 150;
const scale_down_end = 180;
const fade_start = 150;
const fade_end = 180;

const circle_x = interpolate(frame, [circle_start1, circle_end1], [-960, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
const circle_y = interpolate(frame, [circle_start1, circle_end1], [0, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
const circle_rotate = interpolate(frame, [rotate_start, rotate_end], [0, 180], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
const circle_scale_up = interpolate(frame, [scale_up_start, scale_up_end], [1.0, 1.1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
const circle_scale_down = interpolate(frame, [scale_down_start, scale_down_end], [1.1, 1.0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
let circle_scale = 1.0;
if (frame >= scale_up_start && frame <= scale_up_end) {
  circle_scale = circle_scale_up;
} else if (frame > scale_down_start) {
  circle_scale = circle_scale_down;
}
let circle_opacity = 1.0;
if (frame >= fade_start) {
  circle_opacity = interpolate(frame, [fade_start, fade_end], [1.0, 0.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

const square_x = interpolate(frame, [square_start1, square_end1], [960, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
const square_y = 0;
const square_rotate = interpolate(frame, [rotate_start, rotate_end], [0, 180], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
const square_scale_up = interpolate(frame, [scale_up_start, scale_up_end], [1.0, 1.1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
const square_scale_down = interpolate(frame, [scale_down_start, scale_down_end], [1.1, 1.0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
let square_scale = 1.0;
if (frame >= scale_up_start && frame <= scale_up_end) {
  square_scale = square_scale_up;
} else if (frame > scale_down_start) {
  square_scale = square_scale_down;
}
let square_opacity = 1.0;
if (frame >= fade_start) {
  square_opacity = interpolate(frame, [fade_start, fade_end], [1.0, 0.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

const triangle_x = 0;
const triangle_y = interpolate(frame, [triangle_start1, triangle_end1], [-540, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
const triangle_rotate = interpolate(frame, [rotate_start, rotate_end], [0, 180], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
const triangle_scale_up = interpolate(frame, [scale_up_start, scale_up_end], [1.0, 1.1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
const triangle_scale_down = interpolate(frame, [scale_down_start, scale_down_end], [1.1, 1.0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
let triangle_scale = 1.0;
if (frame >= scale_up_start && frame <= scale_up_end) {
  triangle_scale = triangle_scale_up;
} else if (frame > scale_down_start) {
  triangle_scale = triangle_scale_down;
}
let triangle_opacity = 1.0;
if (frame >= fade_start) {
  triangle_opacity = interpolate(frame, [fade_start, fade_end], [1.0, 0.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

return (
  <AbsoluteFill style={{ backgroundColor: "#FFFFFF", overflow: "hidden" }}>
    <div
      style={{
        position: "absolute",
        left: "calc(50% + " + circle_x + "px)",
        top: "calc(50% + " + circle_y + "px)",
        width: 140 + "px",
        height: 140 + "px",
        transform: "translateX(-100%) translateY(-50%)",
        opacity: circle_opacity,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#F44336",
          borderRadius: "50%",
          transform: "rotate(" + circle_rotate + "deg) scale(" + circle_scale + ")",
          transformOrigin: "50% 50%",
        }}
      />
    </div>

    <div
      style={{
        position: "absolute",
        left: "calc(50% + " + square_x + "px)",
        top: "calc(50% + " + square_y + "px)",
        width: 140 + "px",
        height: 140 + "px",
        transform: "translateX(-100%) translateY(-50%)",
        opacity: square_opacity,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#2196F3",
          transform: "rotate(" + square_rotate + "deg) scale(" + square_scale + ")",
          transformOrigin: "50% 50%",
        }}
      />
    </div>

    <div
      style={{
        position: "absolute",
        left: "calc(50% + " + triangle_x + "px)",
        top: "calc(50% + " + triangle_y + "px)",
        width: 140 + "px",
        height: 140 + "px",
        transform: "translateX(-100%) translateY(-50%)",
        opacity: triangle_opacity,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#4CAF50",
          clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          transform: "rotate(" + triangle_rotate + "deg) scale(" + triangle_scale + ")",
          transformOrigin: "50% 50%",
        }}
      />
    </div>
  </AbsoluteFill>
);
};
