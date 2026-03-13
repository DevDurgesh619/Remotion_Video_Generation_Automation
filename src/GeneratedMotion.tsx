import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { Asset } from "./assets/Asset";

export const GeneratedMotion = () => {
const frame = useCurrentFrame();

const progressFinalWidth = 800;
const progressHalf = progressFinalWidth / 2;

const wSeg1 = interpolate(frame, [0, 90], [0, 266.67], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const wSeg2 = interpolate(frame, [90, 210], [266.67, 533.33], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const wSeg3 = interpolate(frame, [210, 300], [533.33, 800], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
let progressFillWidth = wSeg1;
if (wSeg2 > progressFillWidth) {
  progressFillWidth = wSeg2;
}
if (wSeg3 > progressFillWidth) {
  progressFillWidth = wSeg3;
}

const circle1Opacity = interpolate(frame, [90, 105], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const check1Opacity = interpolate(frame, [90, 105], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});

const circle2Opacity = interpolate(frame, [210, 225], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const check2Opacity = interpolate(frame, [210, 225], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});

const circle3Opacity = interpolate(frame, [300, 315], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});
const check3Opacity = interpolate(frame, [300, 315], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp"
});

const labelCommonStyle = {
  position: "absolute",
  left: "50%",
  top: "50%",
  color: "#333333",
  fontSize: 24 + "px",
  fontWeight: 400,
  fontFamily: "Arial",
  whiteSpace: "nowrap",
  lineHeight: "1",
  letterSpacing: 0 + "px",
  textAlign: "center",
  textTransform: "none",
  userSelect: "none",
  pointerEvents: "none"
};

return (
  <AbsoluteFill style={{ backgroundColor: "#F5F5F5", overflow: "hidden" }}>
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 800 + "px",
        height: 40 + "px",
        backgroundColor: "#E0E0E0",
        borderRadius: 20 + "px",
        transform: "translate(-50%, -50%) translateX(" + 0 + "px) translateY(" + 0 + "px)"
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: progressFillWidth + "px",
        height: 40 + "px",
        backgroundColor: "#4CAF50",
        borderRadius: 20 + "px",
        transformOrigin: "0% 50%",
        transform: "translateX(-" + progressHalf + "px) translateY(-50%)"
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%) translateX(" + -400 + "px) translateY(" + 60 + "px)",
        color: "#333333",
        fontSize: 24 + "px",
        fontWeight: 400,
        fontFamily: "Arial",
        whiteSpace: "nowrap",
        lineHeight: "1",
        letterSpacing: 0 + "px",
        textAlign: "center",
        textTransform: "none",
        userSelect: "none",
        pointerEvents: "none"
      }}
    >
      Order Placed
    </div>
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%) translateX(" + 0 + "px) translateY(" + 60 + "px)",
        color: "#333333",
        fontSize: 24 + "px",
        fontWeight: 400,
        fontFamily: "Arial",
        whiteSpace: "nowrap",
        lineHeight: "1",
        letterSpacing: 0 + "px",
        textAlign: "center",
        textTransform: "none",
        userSelect: "none",
        pointerEvents: "none"
      }}
    >
      Order Processing
    </div>
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%) translateX(" + 400 + "px) translateY(" + 60 + "px)",
        color: "#333333",
        fontSize: 24 + "px",
        fontWeight: 400,
        fontFamily: "Arial",
        whiteSpace: "nowrap",
        lineHeight: "1",
        letterSpacing: 0 + "px",
        textAlign: "center",
        textTransform: "none",
        userSelect: "none",
        pointerEvents: "none"
      }}
    >
      Order Completed
    </div>
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 20 + "px",
        height: 20 + "px",
        backgroundColor: "#4CAF50",
        borderRadius: "50%",
        transform: "translate(-50%, -50%) translateX(" + -400 + "px) translateY(" + 0 + "px)",
        opacity: circle1Opacity
      }}
    />
    <Asset
      id={"checkmark"}
      width={12}
      height={12}
      color={"#FFFFFF"}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%) translateX(" + -400 + "px) translateY(" + 0 + "px)",
        opacity: check1Opacity
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 20 + "px",
        height: 20 + "px",
        backgroundColor: "#4CAF50",
        borderRadius: "50%",
        transform: "translate(-50%, -50%) translateX(" + 0 + "px) translateY(" + 0 + "px)",
        opacity: circle2Opacity
      }}
    />
    <Asset
      id={"checkmark"}
      width={12}
      height={12}
      color={"#FFFFFF"}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%) translateX(" + 0 + "px) translateY(" + 0 + "px)",
        opacity: check2Opacity
      }}
    />
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: 20 + "px",
        height: 20 + "px",
        backgroundColor: "#4CAF50",
        borderRadius: "50%",
        transform: "translate(-50%, -50%) translateX(" + 400 + "px) translateY(" + 0 + "px)",
        opacity: circle3Opacity
      }}
    />
    <Asset
      id={"checkmark"}
      width={12}
      height={12}
      color={"#FFFFFF"}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%) translateX(" + 400 + "px) translateY(" + 0 + "px)",
        opacity: check3Opacity
      }}
    />
  </AbsoluteFill>
);
};
