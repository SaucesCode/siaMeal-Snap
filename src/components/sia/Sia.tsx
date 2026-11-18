import React, { useId } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { PUPILS, siaPose, type SiaExpression, type SiaPose } from './siaPose';
import {
  EAR_PIVOT,
  EXTRAS,
  EYE,
  HEAD_PIVOT,
  MINI,
  PATHS,
  SIA_COLORS as C,
  SIA_DETAIL_THRESHOLD,
  SIA_MINI_VIEWBOX,
  SIA_VIEWBOX,
  SPROUT_PIVOT,
} from './siaArt';

export interface SiaProps {
  expression: SiaExpression;
  /** Rendered width and height in px. Below 48 px Sia uses the simplified, static head. */
  size: number;
  /** Small purposeful motion for the expression (static when false or under reduced motion). */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}

type Point = { readonly x: number; readonly y: number };

// SVG transform strings work identically on iOS, Android and web (react-native-svg's
// rotation/origin props emit an invalid DOM attribute on web).
const rotateAbout = (deg: number, p: Point) => `rotate(${deg} ${p.x} ${p.y})`;
const scaleAbout = (k: number, p: Point) => `translate(${p.x} ${p.y}) scale(${k}) translate(${-p.x} ${-p.y})`;

/** SVG ids must be unique per instance (several Sias can share a screen on web). */
function useSvgIds() {
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return { leaf: `sia-leaf-${base}`, aperture: `sia-aperture-${base}` };
}

/** Head-only Sia. Decorative: always hidden from screen readers. */
export function Sia({ expression, size, animated = true, style }: SiaProps) {
  const simplified = size < SIA_DETAIL_THRESHOLD;
  return (
    <View
      testID="sia"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      pointerEvents="none"
      style={[{ width: size, height: size }, style]}
    >
      {simplified ? (
        <SiaMiniArt size={size} />
      ) : (
        <SiaFullArt pose={siaPose(expression)} size={size} animated={animated} />
      )}
    </View>
  );
}

function SiaFullArt({ pose, size }: { pose: SiaPose; size: number; animated: boolean }) {
  const ids = useSvgIds();
  return (
    <Svg width={size} height={size} viewBox={SIA_VIEWBOX} style={{ overflow: 'visible' }}>
      <Defs>
        <LinearGradient id={ids.leaf} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={C.leafFrom} />
          <Stop offset="100%" stopColor={C.leafTo} />
        </LinearGradient>
        <ClipPath id={ids.aperture}>
          <Circle cx={EYE.shutter.cx} cy={EYE.shutter.cy} r={EYE.apertureClipR} />
        </ClipPath>
      </Defs>

      <G transform={rotateAbout(pose.headTilt, HEAD_PIVOT)}>
        <Ears tilt={pose.earTilt} />
        <Sprout tilt={pose.sproutTilt} lift={pose.sproutLift} gradientId={ids.leaf} />
        <Path d={PATHS.head} fill={C.cream} stroke={C.outline} strokeWidth={6} strokeLinejoin="round" />
        <Path d={PATHS.chin} fill={C.chin} />
        <Path d={PATHS.mask} fill={C.mask} />

        <Eyes pose={pose} apertureClipId={ids.aperture} />

        <G testID="sia-whiskers" stroke={C.cream} strokeWidth={2.6} strokeLinecap="round" fill="none" opacity={0.95}>
          {PATHS.whiskers.map((d) => (
            <Path key={d} d={d} />
          ))}
        </G>

        <Path d={PATHS.nose} fill={C.nose} stroke={C.outline} strokeWidth={4.5} strokeLinejoin="round" />
        <Mouth variant={pose.mouth} />
        <Extras pose={pose} />
      </G>
      {pose.extras.includes('question') && <QuestionMark />}
    </Svg>
  );
}

function Ears({ tilt }: { tilt: number }) {
  return (
    <>
      <G transform={rotateAbout(-tilt, EAR_PIVOT.left)}>
        <Path d={PATHS.earLeft} fill={C.mask} stroke={C.outline} strokeWidth={6} strokeLinejoin="round" />
        <Path d={PATHS.earLeftInner} fill={C.innerEar} />
      </G>
      <G transform={rotateAbout(tilt, EAR_PIVOT.right)}>
        <Path d={PATHS.earRight} fill={C.mask} stroke={C.outline} strokeWidth={6} strokeLinejoin="round" />
        <Path d={PATHS.earRightInner} fill={C.innerEar} />
      </G>
    </>
  );
}

function Sprout({ tilt, lift, gradientId }: { tilt: number; lift: number; gradientId: string }) {
  return (
    <G transform={`translate(0 ${-lift})`}>
      <G transform={rotateAbout(tilt, SPROUT_PIVOT)}>
        <Path d={PATHS.sproutStem} stroke={C.stem} strokeWidth={5} strokeLinecap="round" />
        <Path d={PATHS.leafLeft} fill={`url(#${gradientId})`} stroke={C.leafStroke} strokeWidth={2} />
        <Path d={PATHS.leafRight} fill={`url(#${gradientId})`} stroke={C.leafStroke} strokeWidth={2} />
      </G>
    </G>
  );
}

function Eyes({ pose, apertureClipId }: { pose: SiaPose; apertureClipId: string }) {
  if (pose.eye === 'closed') {
    return (
      <G testID="sia-eye-closed" fill="none" strokeLinecap="round">
        <Path d={PATHS.closedNatural} stroke={C.outline} strokeWidth={6.5} />
        <Path d={PATHS.closedShutter} stroke={C.outline} strokeWidth={10} />
        <Path d={PATHS.closedShutter} stroke={C.shutter} strokeWidth={4.5} />
      </G>
    );
  }

  const pupil = pose.pupil ? PUPILS[pose.pupil] : PUPILS.medium;
  return (
    <>
      {pose.eye === 'wink' ? (
        <Path testID="sia-eye-wink" d={PATHS.wink} stroke={C.outline} strokeWidth={6.5} strokeLinecap="round" fill="none" />
      ) : (
        <NaturalEye pupil={pupil} gaze={pose.gaze} />
      )}
      <G testID="sia-shutter">
        <Circle cx={EYE.shutter.cx} cy={EYE.shutter.cy} r={EYE.shutter.r} fill={C.shutter} stroke={C.outline} strokeWidth={3} />
        <Circle cx={EYE.shutterHighlight.cx} cy={EYE.shutterHighlight.cy} r={EYE.shutterHighlight.r} fill={C.shutterHighlight} opacity={0.45} />
        <G clipPath={`url(#${apertureClipId})`}>
          <G transform={scaleAbout(pupil.apertureScale, { x: EYE.shutter.cx, y: EYE.shutter.cy })}>
            <Polygon points={PATHS.bladeHex} fill={C.blade} />
            {PATHS.bladeLines.map(([x1, y1, x2, y2]) => (
              <Line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.blade} strokeWidth={3} strokeLinecap="round" />
            ))}
          </G>
        </G>
      </G>
      {pose.lids === 'worried' && (
        <G testID="sia-lids-worried">
          <Path d={PATHS.lidLeft} fill={C.mask} />
          <Path d={PATHS.lidLeftLine} stroke={C.outline} strokeWidth={4} strokeLinecap="round" fill="none" />
          <Path d={PATHS.lidRight} fill={C.mask} />
          <Path d={PATHS.lidRightLine} stroke={C.outline} strokeWidth={4} strokeLinecap="round" fill="none" />
        </G>
      )}
    </>
  );
}

function NaturalEye({ pupil, gaze }: { pupil: (typeof PUPILS)[keyof typeof PUPILS]; gaze: SiaPose['gaze'] }) {
  const cx = EYE.natural.cx + gaze.dx;
  const cy = EYE.natural.cy + gaze.dy;
  return (
    <G testID="sia-eye-open">
      <Circle cx={EYE.natural.cx} cy={EYE.natural.cy} r={EYE.natural.r} fill={C.blue} stroke={C.outline} strokeWidth={3} />
      <Ellipse testID="sia-pupil" cx={cx} cy={cy} rx={pupil.rx} ry={pupil.ry} fill={C.ink} />
      <Circle cx={cx + EYE.shineOffset.dx} cy={cy + EYE.shineOffset.dy} r={pupil.rx > 5 ? 4 : 3.4} fill={C.white} />
      <Circle cx={EYE.lowerShine.cx} cy={EYE.lowerShine.cy} r={EYE.lowerShine.r} fill={C.white} opacity={0.8} />
    </G>
  );
}

function Mouth({ variant }: { variant: SiaPose['mouth'] }) {
  const stroke = { stroke: C.outline, strokeWidth: 5.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (variant) {
    case 'wOpen':
      return (
        <G testID="sia-mouth-wOpen">
          <Path d={PATHS.mouthWOpen} fill={C.mouthInside} {...stroke} />
          <Ellipse cx={120} cy={175} rx={7.5} ry={4} fill={C.nose} />
        </G>
      );
    case 'o':
      return (
        <G testID="sia-mouth-o">
          <Path d={PATHS.mouthOStem} {...stroke} />
          <Ellipse cx={120} cy={170} rx={5} ry={5.5} fill={C.mouthInside} stroke={C.outline} strokeWidth={5} />
        </G>
      );
    case 'wSmall':
      return <Path testID="sia-mouth-wSmall" d={PATHS.mouthWSmall} fill="none" {...stroke} />;
    case 'wDown':
      return <Path testID="sia-mouth-wDown" d={PATHS.mouthWDown} fill="none" {...stroke} />;
    case 'w':
    default:
      return <Path testID="sia-mouth-w" d={PATHS.mouthW} fill="none" {...stroke} />;
  }
}

function Extras({ pose }: { pose: SiaPose }) {
  return (
    <>
      {pose.extras.includes('blush') && (
        <G testID="sia-extra-blush">
          {EXTRAS.blush.map(({ cx, cy }) => (
            <Ellipse key={cx} cx={cx} cy={cy} rx={9} ry={5} fill={C.nose} opacity={0.55} />
          ))}
        </G>
      )}
      {pose.extras.includes('heart') && (
        <Path testID="sia-extra-heart" d={PATHS.heart} fill={C.nose} stroke={C.outline} strokeWidth={2.5} />
      )}
      {pose.extras.includes('stars') && (
        <G testID="sia-extra-stars">
          {EXTRAS.stars.map(({ x, y, size }) => (
            <G key={x} transform={`translate(${x} ${y}) scale(${size / 20})`}>
              <Path d={PATHS.star} fill={C.star} stroke={C.outline} strokeWidth={1.6} />
            </G>
          ))}
        </G>
      )}
      {pose.extras.includes('zz') && (
        <G testID="sia-extra-zz">
          {EXTRAS.zz.map(({ x, y, fontSize }) => (
            <SvgText key={x} x={x} y={y} fontSize={fontSize} fontWeight="800" fill={C.extraText}>
              z
            </SvgText>
          ))}
        </G>
      )}
    </>
  );
}

/** Drawn outside the head tilt so it stays upright, as in the approved mockup. */
function QuestionMark() {
  return (
    <SvgText testID="sia-extra-question" x={EXTRAS.question.x} y={EXTRAS.question.y} fontSize={EXTRAS.question.fontSize} fontWeight="800" fill={C.outline}>
      ?
    </SvgText>
  );
}

function SiaMiniArt({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox={SIA_MINI_VIEWBOX}>
      <G testID="sia-simplified">
        <Path d={MINI.earLeft} fill={C.mask} stroke={C.outline} strokeWidth={10} strokeLinejoin="round" />
        <Path d={MINI.earRight} fill={C.mask} stroke={C.outline} strokeWidth={10} strokeLinejoin="round" />
        <Path d={MINI.stem} stroke={C.stem} strokeWidth={9} strokeLinecap="round" />
        <Path d={MINI.leaves} fill={MINI.leafFill} stroke={C.leafStroke} strokeWidth={4} />
        <Path d={MINI.head} fill={C.cream} stroke={C.outline} strokeWidth={10} strokeLinejoin="round" />
        <Path d={MINI.mask} fill={C.mask} />
        <Path d={MINI.wink} stroke={C.ink} strokeWidth={13} strokeLinecap="round" fill="none" />
        <Circle cx={EYE.shutter.cx} cy={EYE.shutter.cy} r={19} fill={C.shutter} stroke={C.blade} strokeWidth={5} />
        <Polygon points={MINI.shutterHex} fill={C.blade} />
        <Path d={MINI.nose} fill={C.nose} />
      </G>
    </Svg>
  );
}
