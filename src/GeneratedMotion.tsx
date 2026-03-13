import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";


export const GeneratedMotion = () => {
const frame = useCurrentFrame();
const circle1OpacityStart = 0;
const circle1OpacityEnd = 2 * 30;
const circle1OpacityStartValue = 0;
const circle1OpacityEndValue = 1;
const circle1Opacity = interpolate(frame, [circle1OpacityStart, circle1OpacityEnd], [circle1OpacityStartValue, circle1OpacityEndValue], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });


const circle1FadeOutStart = 2 * 30;
const circle1FadeOutEnd = 3.5 * 30;
const circle1FadeOutValueStart = 1;
const circle1FadeOutValueEnd = 0;
const circle1FadeOut = interpolate(frame, [circle1FadeOutStart, circle1FadeOutEnd], [circle1FadeOutValueStart, circle1FadeOutValueEnd], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });


const circle2OpacityStart = 2 * 30;
const circle2OpacityEnd = 3.5 * 30;
const circle2OpacityStartValue = 0;
const circle2OpacityEndValue = 1;
const circle2Opacity = interpolate(frame, [circle2OpacityStart, circle2OpacityEnd], [circle2OpacityStartValue, circle2OpacityEndValue], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });


const circle3OpacityStart = 2 * 30;
const circle3OpacityEnd = 3.5 * 30;
const circle3OpacityStartValue = 0;
const circle3OpacityEndValue = 1;
const circle3Opacity = interpolate(frame, [circle3OpacityStart, circle3OpacityEnd], [circle3OpacityStartValue, circle3OpacityEndValue], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });


const circle2MoveXStart = 3.5 * 30;
const circle2MoveXEnd = 5 * 30;
const circle2MoveXStartValue = -40;
const circle2MoveXEndValue = -80;
const circle2MoveX = interpolate(frame, [circle2MoveXStart, circle2MoveXEnd], [circle2MoveXStartValue, circle2MoveXEndValue], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });


const circle3MoveXStart = 3.5 * 30;
const circle3MoveXEnd = 5 * 30;
const circle3MoveXStartValue = 40;
const circle3MoveXEndValue = 80;
const circle3MoveX = interpolate(frame, [circle3MoveXStart, circle3MoveXEnd], [circle3MoveXStartValue, circle3MoveXEndValue], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });


const circle2ReturnXStart = 5 * 30;
const circle2ReturnXEnd = 6 * 30;
const circle2ReturnXStartValue = -80;
const circle2ReturnXEndValue = 0;
const circle2ReturnX = interpolate(frame, [circle2ReturnXStart, circle2ReturnXEnd], [circle2ReturnXStartValue, circle2ReturnXEndValue], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });


const circle3ReturnXStart = 5 * 30;
const circle3ReturnXEnd = 6 * 30;
const circle3ReturnXStartValue = 80;
const circle3ReturnXEndValue = 0;
const circle3ReturnX = interpolate(frame, [circle3ReturnXStart, circle3ReturnXEnd], [circle3ReturnXStartValue, circle3ReturnXEndValue], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });


const circle2FadeOutStart = 5 * 30;
const circle2FadeOutEnd = 6 * 30;
const circle2FadeOutStartValue = 1;
const circle2FadeOutEndValue = 0;
const circle2FadeOut = interpolate(frame, [circle2FadeOutStart, circle2FadeOutEnd], [circle2FadeOutStartValue, circle2FadeOutEndValue], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });


const circle3FadeOutStart = 5 * 30;
const circle3FadeOutEnd = 6 * 30;
const circle3FadeOutStartValue = 1;
const circle3FadeOutEndValue = 0;
const circle3FadeOut = interpolate(frame, [circle3FadeOutStart, circle3FadeOutEnd], [circle3FadeOutStartValue, circle3FadeOutEndValue], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });


const circle1FinalFadeInStart = 5 * 30;
const circle1FinalFadeInEnd = 6 * 30;
const circle1FinalFadeInStartValue = 0;
const circle1FinalFadeInEndValue = 1;
const circle1FinalFadeIn = interpolate(frame, [circle1FinalFadeInStart, circle1FinalFadeInEnd], [circle1FinalFadeInStartValue, circle1FinalFadeInEndValue], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });


return (
  <AbsoluteFill style={{ backgroundColor: "#263238", overflow: "hidden" }}>
    <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: 180,
      height: 180,
      borderRadius: "50%",
      backgroundColor: "#AB47BC",
      opacity: circle1FadeOut > 0 ? circle1Opacity : circle1FinalFadeIn
    }} />
    
    <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%) translateX(" + circle2MoveX + "px)",
      width: 120,
      height: 120,
      borderRadius: "50%",
      backgroundColor: "#AB47BC",
      opacity: circle2Opacity * circle2FadeOut
    }} />
    
    <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%) translateX(" + circle3MoveX + "px)",
      width: 120,
      height: 120,
      borderRadius: "50%",
      backgroundColor: "#AB47BC",
      opacity: circle3Opacity * circle3FadeOut
    }} />
  </AbsoluteFill>
);
};

