import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const GeneratedMotion = () => {
const frame = useCurrentFrame();

const circleStartScaleFrameA = 0;
const circleEndScaleFrameA = 30;
const circleStartScaleFrameB = 30;
const circleEndScaleFrameB = 60;
let circleScale;
if (frame <= circleEndScaleFrameA) {
  circleScale = interpolate(frame, [circleStartScaleFrameA, circleEndScaleFrameA], [1, 1.1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
} else {
  circleScale = interpolate(frame, [circleStartScaleFrameB, circleEndScaleFrameB], [1.1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
}
const circleOpacity = interpolate(frame, [300, 360], [1, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});

// Triangle 1
const tri1InitialX = 0;
const tri1InitialY = -240;
const tri1FadeInStart = 60;
const tri1FadeInEnd = 75;
const tri1FadeIn = interpolate(frame, [tri1FadeInStart, tri1FadeInEnd], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri1FadeOut = interpolate(frame, [300, 360], [1, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri1Opacity = Math.min(tri1FadeIn, tri1FadeOut);
const tri1Rot = interpolate(frame, [180, 240], [0, 180], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri1OrbitAngle = interpolate(frame, [240, 300], [270, 360], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri1Radians = tri1OrbitAngle * Math.PI / 180;
const tri1OrbX = 0 + 240 * Math.cos(tri1Radians);
const tri1OrbY = 0 + 240 * Math.sin(tri1Radians);
const tri1ToCenterX = interpolate(frame, [300, 360], [tri1InitialX, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri1ToCenterY = interpolate(frame, [300, 360], [tri1InitialY, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
let tri1PosX;
let tri1PosY;
if (frame >= 240 && frame <= 300) {
  tri1PosX = tri1OrbX;
  tri1PosY = tri1OrbY;
} else if (frame >= 300) {
  tri1PosX = tri1ToCenterX;
  tri1PosY = tri1ToCenterY;
} else {
  tri1PosX = tri1InitialX;
  tri1PosY = tri1InitialY;
}

// Triangle 2
const tri2InitialX = 169.71;
const tri2InitialY = -169.71;
const tri2FadeInStart = 75;
const tri2FadeInEnd = 90;
const tri2FadeIn = interpolate(frame, [tri2FadeInStart, tri2FadeInEnd], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri2FadeOut = interpolate(frame, [300, 360], [1, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri2Opacity = Math.min(tri2FadeIn, tri2FadeOut);
const tri2Rot = interpolate(frame, [180, 240], [45, 225], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri2OrbitAngle = interpolate(frame, [240, 300], [315, 405], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri2Radians = tri2OrbitAngle * Math.PI / 180;
const tri2OrbX = 0 + 240 * Math.cos(tri2Radians);
const tri2OrbY = 0 + 240 * Math.sin(tri2Radians);
const tri2ToCenterX = interpolate(frame, [300, 360], [tri2InitialX, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri2ToCenterY = interpolate(frame, [300, 360], [tri2InitialY, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
let tri2PosX;
let tri2PosY;
if (frame >= 240 && frame <= 300) {
  tri2PosX = tri2OrbX;
  tri2PosY = tri2OrbY;
} else if (frame >= 300) {
  tri2PosX = tri2ToCenterX;
  tri2PosY = tri2ToCenterY;
} else {
  tri2PosX = tri2InitialX;
  tri2PosY = tri2InitialY;
}

// Triangle 3
const tri3InitialX = 240;
const tri3InitialY = 0;
const tri3FadeInStart = 90;
const tri3FadeInEnd = 105;
const tri3FadeIn = interpolate(frame, [tri3FadeInStart, tri3FadeInEnd], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri3FadeOut = interpolate(frame, [300, 360], [1, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri3Opacity = Math.min(tri3FadeIn, tri3FadeOut);
const tri3Rot = interpolate(frame, [180, 240], [90, 270], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri3OrbitAngle = interpolate(frame, [240, 300], [0, 90], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri3Radians = tri3OrbitAngle * Math.PI / 180;
const tri3OrbX = 0 + 240 * Math.cos(tri3Radians);
const tri3OrbY = 0 + 240 * Math.sin(tri3Radians);
const tri3ToCenterX = interpolate(frame, [300, 360], [tri3InitialX, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri3ToCenterY = interpolate(frame, [300, 360], [tri3InitialY, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
let tri3PosX;
let tri3PosY;
if (frame >= 240 && frame <= 300) {
  tri3PosX = tri3OrbX;
  tri3PosY = tri3OrbY;
} else if (frame >= 300) {
  tri3PosX = tri3ToCenterX;
  tri3PosY = tri3ToCenterY;
} else {
  tri3PosX = tri3InitialX;
  tri3PosY = tri3InitialY;
}

// Triangle 4
const tri4InitialX = 169.71;
const tri4InitialY = 169.71;
const tri4FadeInStart = 105;
const tri4FadeInEnd = 120;
const tri4FadeIn = interpolate(frame, [tri4FadeInStart, tri4FadeInEnd], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri4FadeOut = interpolate(frame, [300, 360], [1, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri4Opacity = Math.min(tri4FadeIn, tri4FadeOut);
const tri4Rot = interpolate(frame, [180, 240], [135, 315], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri4OrbitAngle = interpolate(frame, [240, 300], [45, 135], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri4Radians = tri4OrbitAngle * Math.PI / 180;
const tri4OrbX = 0 + 240 * Math.cos(tri4Radians);
const tri4OrbY = 0 + 240 * Math.sin(tri4Radians);
const tri4ToCenterX = interpolate(frame, [300, 360], [tri4InitialX, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri4ToCenterY = interpolate(frame, [300, 360], [tri4InitialY, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
let tri4PosX;
let tri4PosY;
if (frame >= 240 && frame <= 300) {
  tri4PosX = tri4OrbX;
  tri4PosY = tri4OrbY;
} else if (frame >= 300) {
  tri4PosX = tri4ToCenterX;
  tri4PosY = tri4ToCenterY;
} else {
  tri4PosX = tri4InitialX;
  tri4PosY = tri4InitialY;
}

// Triangle 5
const tri5InitialX = 0;
const tri5InitialY = 240;
const tri5FadeInStart = 120;
const tri5FadeInEnd = 135;
const tri5FadeIn = interpolate(frame, [tri5FadeInStart, tri5FadeInEnd], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri5FadeOut = interpolate(frame, [300, 360], [1, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri5Opacity = Math.min(tri5FadeIn, tri5FadeOut);
const tri5Rot = interpolate(frame, [180, 240], [180, 360], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri5OrbitAngle = interpolate(frame, [240, 300], [90, 180], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri5Radians = tri5OrbitAngle * Math.PI / 180;
const tri5OrbX = 0 + 240 * Math.cos(tri5Radians);
const tri5OrbY = 0 + 240 * Math.sin(tri5Radians);
const tri5ToCenterX = interpolate(frame, [300, 360], [tri5InitialX, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri5ToCenterY = interpolate(frame, [300, 360], [tri5InitialY, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
let tri5PosX;
let tri5PosY;
if (frame >= 240 && frame <= 300) {
  tri5PosX = tri5OrbX;
  tri5PosY = tri5OrbY;
} else if (frame >= 300) {
  tri5PosX = tri5ToCenterX;
  tri5PosY = tri5ToCenterY;
} else {
  tri5PosX = tri5InitialX;
  tri5PosY = tri5InitialY;
}

// Triangle 6
const tri6InitialX = -169.71;
const tri6InitialY = 169.71;
const tri6FadeInStart = 135;
const tri6FadeInEnd = 150;
const tri6FadeIn = interpolate(frame, [tri6FadeInStart, tri6FadeInEnd], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri6FadeOut = interpolate(frame, [300, 360], [1, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri6Opacity = Math.min(tri6FadeIn, tri6FadeOut);
const tri6Rot = interpolate(frame, [180, 240], [225, 405], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri6OrbitAngle = interpolate(frame, [240, 300], [135, 225], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri6Radians = tri6OrbitAngle * Math.PI / 180;
const tri6OrbX = 0 + 240 * Math.cos(tri6Radians);
const tri6OrbY = 0 + 240 * Math.sin(tri6Radians);
const tri6ToCenterX = interpolate(frame, [300, 360], [tri6InitialX, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri6ToCenterY = interpolate(frame, [300, 360], [tri6InitialY, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
let tri6PosX;
let tri6PosY;
if (frame >= 240 && frame <= 300) {
  tri6PosX = tri6OrbX;
  tri6PosY = tri6OrbY;
} else if (frame >= 300) {
  tri6PosX = tri6ToCenterX;
  tri6PosY = tri6ToCenterY;
} else {
  tri6PosX = tri6InitialX;
  tri6PosY = tri6InitialY;
}

// Triangle 7
const tri7InitialX = -240;
const tri7InitialY = 0;
const tri7FadeInStart = 150;
const tri7FadeInEnd = 165;
const tri7FadeIn = interpolate(frame, [tri7FadeInStart, tri7FadeInEnd], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri7FadeOut = interpolate(frame, [300, 360], [1, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri7Opacity = Math.min(tri7FadeIn, tri7FadeOut);
const tri7Rot = interpolate(frame, [180, 240], [270, 450], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri7OrbitAngle = interpolate(frame, [240, 300], [180, 270], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri7Radians = tri7OrbitAngle * Math.PI / 180;
const tri7OrbX = 0 + 240 * Math.cos(tri7Radians);
const tri7OrbY = 0 + 240 * Math.sin(tri7Radians);
const tri7ToCenterX = interpolate(frame, [300, 360], [tri7InitialX, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri7ToCenterY = interpolate(frame, [300, 360], [tri7InitialY, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
let tri7PosX;
let tri7PosY;
if (frame >= 240 && frame <= 300) {
  tri7PosX = tri7OrbX;
  tri7PosY = tri7OrbY;
} else if (frame >= 300) {
  tri7PosX = tri7ToCenterX;
  tri7PosY = tri7ToCenterY;
} else {
  tri7PosX = tri7InitialX;
  tri7PosY = tri7InitialY;
}

// Triangle 8
const tri8InitialX = -169.71;
const tri8InitialY = -169.71;
const tri8FadeInStart = 165;
const tri8FadeInEnd = 180;
const tri8FadeIn = interpolate(frame, [tri8FadeInStart, tri8FadeInEnd], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri8FadeOut = interpolate(frame, [300, 360], [1, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri8Opacity = Math.min(tri8FadeIn, tri8FadeOut);
const tri8Rot = interpolate(frame, [180, 240], [315, 495], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri8OrbitAngle = interpolate(frame, [240, 300], [225, 315], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri8Radians = tri8OrbitAngle * Math.PI / 180;
const tri8OrbX = 0 + 240 * Math.cos(tri8Radians);
const tri8OrbY = 0 + 240 * Math.sin(tri8Radians);
const tri8ToCenterX = interpolate(frame, [300, 360], [tri8InitialX, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const tri8ToCenterY = interpolate(frame, [300, 360], [tri8InitialY, 0], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
let tri8PosX;
let tri8PosY;
if (frame >= 240 && frame <= 300) {
  tri8PosX = tri8OrbX;
  tri8PosY = tri8OrbY;
} else if (frame >= 300) {
  tri8PosX = tri8ToCenterX;
  tri8PosY = tri8ToCenterY;
} else {
  tri8PosX = tri8InitialX;
  tri8PosY = tri8InitialY;
}

return (
  <AbsoluteFill style={{ backgroundColor: "#000000", overflow: "hidden" }}>
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: "transparent",
        border: 4 + "px solid " + "#FFD700",
        boxSizing: "border-box",
        transform:
          "translate(-50%, -50%) translateX(" +
          0 +
          "px) translateY(" +
          0 +
          "px) scale(" +
          circleScale +
          ")",
        opacity: circleOpacity
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 100,
        height: 100,
        backgroundColor: "#FF0000",
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
        transform:
          "translate(-50%, -50%) translateX(" +
          tri1PosX +
          "px) translateY(" +
          tri1PosY +
          "px) rotate(" +
          tri1Rot +
          "deg)",
        opacity: tri1Opacity
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 100,
        height: 100,
        backgroundColor: "#FF7F00",
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
        transform:
          "translate(-50%, -50%) translateX(" +
          tri2PosX +
          "px) translateY(" +
          tri2PosY +
          "px) rotate(" +
          tri2Rot +
          "deg)",
        opacity: tri2Opacity
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 100,
        height: 100,
        backgroundColor: "#FFFF00",
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
        transform:
          "translate(-50%, -50%) translateX(" +
          tri3PosX +
          "px) translateY(" +
          tri3PosY +
          "px) rotate(" +
          tri3Rot +
          "deg)",
        opacity: tri3Opacity
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 100,
        height: 100,
        backgroundColor: "#00FF00",
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
        transform:
          "translate(-50%, -50%) translateX(" +
          tri4PosX +
          "px) translateY(" +
          tri4PosY +
          "px) rotate(" +
          tri4Rot +
          "deg)",
        opacity: tri4Opacity
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 100,
        height: 100,
        backgroundColor: "#0000FF",
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
        transform:
          "translate(-50%, -50%) translateX(" +
          tri5PosX +
          "px) translateY(" +
          tri5PosY +
          "px) rotate(" +
          tri5Rot +
          "deg)",
        opacity: tri5Opacity
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 100,
        height: 100,
        backgroundColor: "#4B0082",
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
        transform:
          "translate(-50%, -50%) translateX(" +
          tri6PosX +
          "px) translateY(" +
          tri6PosY +
          "px) rotate(" +
          tri6Rot +
          "deg)",
        opacity: tri6Opacity
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 100,
        height: 100,
        backgroundColor: "#8B00FF",
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
        transform:
          "translate(-50%, -50%) translateX(" +
          tri7PosX +
          "px) translateY(" +
          tri7PosY +
          "px) rotate(" +
          tri7Rot +
          "deg)",
        opacity: tri7Opacity
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 100,
        height: 100,
        backgroundColor: "#FF1493",
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
        transform:
          "translate(-50%, -50%) translateX(" +
          tri8PosX +
          "px) translateY(" +
          tri8PosY +
          "px) rotate(" +
          tri8Rot +
          "deg)",
        opacity: tri8Opacity
      }}
    />
  </AbsoluteFill>
);
};
