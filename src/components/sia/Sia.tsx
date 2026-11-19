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
import Animated, { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import { PUPILS, siaPose, type SiaExpression, type SiaPose } from './siaPose';
import { useSiaMotion, type SiaMotionValues } from './useSiaMotion';
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
  return {
    leaf: `sia-leaf-${base}`,
    aperture: `sia-aperture-${base}`,
    overlayLeaf: `sia-oleaf-${base}`,
    overlayAperture: `sia-oaperture-${base}`,
  };
}

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

type Box = { x: number; y: number; w: number; h: number };

/** Viewbox regions of the parts that animate as their own layer (each centred on its pivot). */
const OVERLAY_BOX = {
  blades: { x: 135, y: 118, w: 32, h: 32 },
  heart: { x: 190, y: 60, w: 24, h: 24 },
  starBig: { x: 176, y: 58, w: 26, h: 26 },
  starSmall: { x: 36, y: 70, w: 20, h: 20 },
  zz: { x: 178, y: 40, w: 36, h: 44 },
  sprout: { x: 92, y: 28, w: 56, h: 44 },
} as const;

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

function SiaFullArt({ pose, size, animated }: { pose: SiaPose; size: number; animated: boolean }) {
  const ids = useSvgIds();
  const m = useSiaMotion(pose, animated);

  // Looping parts animate as separate layers over the drawing. Only when the head is upright
  // (a tilted head would misalign them) and nothing is drawn on top of them.
  const layers = m.isAnimating && pose.headTilt === 0;
  const bladesLayer = layers && pose.eye !== 'closed' && pose.lids === 'none';
  const sproutLayer = layers && pose.motion === 'sway';
  const heartLayer = layers && pose.motion === 'heartbeat';
  const starsLayer = layers && pose.motion === 'twinkle';
  const zzLayer = layers && pose.motion === 'drift';

  const hopStyle = useAnimatedStyle(() => ({ transform: [{ translateY: m.hopY.get() }] }));
  const bladesStyle = useAnimatedStyle(() => {
    const t = m.loop.get();
    const focusing = pose.motion === 'focus';
    const scale = m.aperture.get() * (focusing ? 1 - 0.3 * Math.sin(Math.PI * t) : 1);
    return { transform: [{ rotate: `${focusing ? t * 120 : 0}deg` }, { scale }] };
  });
  const heartStyle = useAnimatedStyle(() => {
    const t = m.loop.get();
    const bump = t < 0.3 ? t / 0.3 : (1 - t) / 0.7;
    return { transform: [{ scale: 0.9 + 0.25 * bump }] };
  });
  const starBigStyle = useAnimatedStyle(() => twinkle(m.loop.get()));
  const starSmallStyle = useAnimatedStyle(() => twinkle((m.loop.get() + 0.5) % 1));
  const zzStyle = useAnimatedStyle(() => {
    const t = m.loop.get();
    return {
      opacity: t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7,
      transform: [{ translateX: 10 * t * (size / 192) }, { translateY: -18 * t * (size / 192) }],
    };
  });
  const sproutStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${pose.sproutTilt + 5 * Math.sin(2 * Math.PI * m.loop.get())}deg` }],
  }));

  const skip = new Set<string>([
    ...(heartLayer ? ['heart'] : []),
    ...(starsLayer ? ['stars'] : []),
    ...(zzLayer ? ['zz'] : []),
  ]);

  return (
    <Animated.View style={[{ width: size, height: size }, hopStyle]}>
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
          {!sproutLayer && <Sprout tilt={pose.sproutTilt} lift={pose.sproutLift} gradientId={ids.leaf} />}
          <Path d={PATHS.head} fill={C.cream} stroke={C.outline} strokeWidth={6} strokeLinejoin="round" />
          <Path d={PATHS.chin} fill={C.chin} />
          <Path d={PATHS.mask} fill={C.mask} />

          <Eyes pose={pose} apertureClipId={ids.aperture} motion={m} bladesInline={!bladesLayer} />

          <G testID="sia-whiskers" stroke={C.cream} strokeWidth={2.6} strokeLinecap="round" fill="none" opacity={0.95}>
            {PATHS.whiskers.map((d) => (
              <Path key={d} d={d} />
            ))}
          </G>

          <Path d={PATHS.nose} fill={C.nose} stroke={C.outline} strokeWidth={4.5} strokeLinejoin="round" />
          <Mouth variant={pose.mouth} />
          <Extras pose={pose} skip={skip} />
        </G>
        {pose.extras.includes('question') && <QuestionMark />}
      </Svg>

      {bladesLayer && (
        <PartLayer size={size} box={OVERLAY_BOX.blades} style={bladesStyle}>
          <Defs>
            <ClipPath id={ids.overlayAperture}>
              <Circle cx={EYE.shutter.cx} cy={EYE.shutter.cy} r={EYE.apertureClipR} />
            </ClipPath>
          </Defs>
          <G clipPath={`url(#${ids.overlayAperture})`}>
            <Blades />
          </G>
        </PartLayer>
      )}
      {sproutLayer && (
        <PartLayer size={size} box={OVERLAY_BOX.sprout} style={sproutStyle} pivotBottom>
          <Defs>
            <LinearGradient id={ids.overlayLeaf} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={C.leafFrom} />
              <Stop offset="100%" stopColor={C.leafTo} />
            </LinearGradient>
          </Defs>
          <SproutArt gradientId={ids.overlayLeaf} stemFromY={69} />
        </PartLayer>
      )}
      {heartLayer && (
        <PartLayer size={size} box={OVERLAY_BOX.heart} style={heartStyle}>
          <Path testID="sia-extra-heart" d={PATHS.heart} fill={C.nose} stroke={C.outline} strokeWidth={2.5} />
        </PartLayer>
      )}
      {starsLayer && (
        <>
          <PartLayer size={size} box={OVERLAY_BOX.starBig} style={starBigStyle}>
            <Star x={EXTRAS.stars[0].x} y={EXTRAS.stars[0].y} size={EXTRAS.stars[0].size} />
          </PartLayer>
          <PartLayer size={size} box={OVERLAY_BOX.starSmall} style={starSmallStyle}>
            <Star x={EXTRAS.stars[1].x} y={EXTRAS.stars[1].y} size={EXTRAS.stars[1].size} />
          </PartLayer>
        </>
      )}
      {zzLayer && (
        <PartLayer size={size} box={OVERLAY_BOX.zz} style={zzStyle}>
          <ZzText />
        </PartLayer>
      )}
    </Animated.View>
  );
}

function twinkle(t: number) {
  'worklet';
  const wave = Math.sin(Math.PI * t);
  return { opacity: 0.5 + 0.5 * wave, transform: [{ scale: 0.6 + 0.55 * wave }] };
}

/**
 * Renders part of Sia's drawing as its own animated layer, positioned exactly over the same
 * viewbox region of the main drawing (viewBox 30 20 180 192, letterboxed into a square).
 */
function PartLayer({
  size,
  box,
  style,
  pivotBottom = false,
  children,
}: {
  size: number;
  box: Box;
  style: React.ComponentProps<typeof Animated.View>['style'];
  pivotBottom?: boolean;
  children: React.ReactNode;
}) {
  const k = size / 192;
  const left = size / 32 + (box.x - 30) * k;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left,
          top: (box.y - 20) * k,
          width: box.w * k,
          height: box.h * k,
          transformOrigin: pivotBottom ? ['50%', '100%', 0] : ['50%', '50%', 0],
        },
        style,
      ]}
    >
      <Svg width={box.w * k} height={box.h * k} viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} style={{ overflow: 'visible' }}>
        {children}
      </Svg>
    </Animated.View>
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
        <SproutArt gradientId={gradientId} />
      </G>
    </G>
  );
}

/** stemFromY: the animated layer sits above the head, so its stem stops at the head outline. */
function SproutArt({ gradientId, stemFromY = SPROUT_PIVOT.y }: { gradientId: string; stemFromY?: number }) {
  return (
    <>
      <Path d={`M 120 ${stemFromY} L 120 55`} stroke={C.stem} strokeWidth={5} strokeLinecap="round" />
      <Path d={PATHS.leafLeft} fill={`url(#${gradientId})`} stroke={C.leafStroke} strokeWidth={2} />
      <Path d={PATHS.leafRight} fill={`url(#${gradientId})`} stroke={C.leafStroke} strokeWidth={2} />
    </>
  );
}

function Eyes({
  pose,
  apertureClipId,
  motion,
  bladesInline,
}: {
  pose: SiaPose;
  apertureClipId: string;
  motion: SiaMotionValues;
  bladesInline: boolean;
}) {
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
        <NaturalEye pupil={pupil} gaze={pose.gaze} motion={motion} />
      )}
      <G testID="sia-shutter">
        <Circle cx={EYE.shutter.cx} cy={EYE.shutter.cy} r={EYE.shutter.r} fill={C.shutter} stroke={C.outline} strokeWidth={3} />
        <Circle cx={EYE.shutterHighlight.cx} cy={EYE.shutterHighlight.cy} r={EYE.shutterHighlight.r} fill={C.shutterHighlight} opacity={0.45} />
        {bladesInline && (
          <G clipPath={`url(#${apertureClipId})`}>
            <G transform={scaleAbout(pupil.apertureScale, { x: EYE.shutter.cx, y: EYE.shutter.cy })}>
              <Blades />
            </G>
          </G>
        )}
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

function Blades() {
  return (
    <>
      <Polygon points={PATHS.bladeHex} fill={C.blade} />
      {PATHS.bladeLines.map(([x1, y1, x2, y2]) => (
        <Line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.blade} strokeWidth={3} strokeLinecap="round" />
      ))}
    </>
  );
}

function NaturalEye({
  pupil,
  gaze,
  motion,
}: {
  pupil: (typeof PUPILS)[keyof typeof PUPILS];
  gaze: SiaPose['gaze'];
  motion: SiaMotionValues;
}) {
  const cx = EYE.natural.cx + gaze.dx;
  const cy = EYE.natural.cy + gaze.dy;
  // Blink squashes the iris and pupil; pupil radii ease between wide / medium / slit.
  const irisProps = useAnimatedProps(() => ({ ry: EYE.natural.r * motion.blink.get() }));
  const pupilProps = useAnimatedProps(() => ({
    rx: motion.pupilRx.get(),
    ry: motion.pupilRy.get() * motion.blink.get(),
  }));
  const shineProps = useAnimatedProps(() => ({ opacity: motion.blink.get() > 0.5 ? 1 : 0 }));
  return (
    <G testID="sia-eye-open">
      <AnimatedEllipse
        cx={EYE.natural.cx}
        cy={EYE.natural.cy}
        rx={EYE.natural.r}
        ry={EYE.natural.r}
        fill={C.blue}
        stroke={C.outline}
        strokeWidth={3}
        animatedProps={irisProps}
      />
      <AnimatedEllipse testID="sia-pupil" cx={cx} cy={cy} rx={pupil.rx} ry={pupil.ry} fill={C.ink} animatedProps={pupilProps} />
      <AnimatedEllipse
        cx={cx + EYE.shineOffset.dx}
        cy={cy + EYE.shineOffset.dy}
        rx={pupil.rx > 5 ? 4 : 3.4}
        ry={pupil.rx > 5 ? 4 : 3.4}
        fill={C.white}
        animatedProps={shineProps}
      />
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

function Extras({ pose, skip }: { pose: SiaPose; skip: ReadonlySet<string> }) {
  return (
    <>
      {pose.extras.includes('blush') && (
        <G testID="sia-extra-blush">
          {EXTRAS.blush.map(({ cx, cy }) => (
            <Ellipse key={cx} cx={cx} cy={cy} rx={9} ry={5} fill={C.nose} opacity={0.55} />
          ))}
        </G>
      )}
      {pose.extras.includes('heart') && !skip.has('heart') && (
        <Path testID="sia-extra-heart" d={PATHS.heart} fill={C.nose} stroke={C.outline} strokeWidth={2.5} />
      )}
      {pose.extras.includes('stars') && !skip.has('stars') && (
        <G testID="sia-extra-stars">
          {EXTRAS.stars.map(({ x, y, size }) => (
            <Star key={x} x={x} y={y} size={size} />
          ))}
        </G>
      )}
      {pose.extras.includes('zz') && !skip.has('zz') && <ZzText />}
    </>
  );
}

function Star({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${size / 20})`}>
      <Path d={PATHS.star} fill={C.star} stroke={C.outline} strokeWidth={1.6} />
    </G>
  );
}

function ZzText() {
  return (
    <G testID="sia-extra-zz">
      {EXTRAS.zz.map(({ x, y, fontSize }) => (
        <SvgText key={x} x={x} y={y} fontSize={fontSize} fontWeight="800" fill={C.extraText}>
          z
        </SvgText>
      ))}
    </G>
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
