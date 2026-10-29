import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Platform,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
  useReducedMotion,
  cancelAnimation,
} from 'react-native-reanimated';
import { hapticFeedback } from '../../utils/haptics';
import { SiaVectorCat, SiaVectorMood } from './SiaVectorCat';
import { useCoachStore } from '../../stores/coachStore';

export interface SiaRoamingCompanionProps {
  onOpenCoach?: (initialQuery?: string) => void;
  enabled?: boolean;
}

type CompanionState =
  | 'sitting'
  | 'walking'
  | 'running'
  | 'jumping'
  | 'yawning'
  | 'sleeping'
  | 'dragged';

interface CornerPerch {
  id: string;
  x: number;
  y: number;
  isTop: boolean;
  isLeft: boolean;
}

const MASCOT_WIDTH = 76;
const MASCOT_HEIGHT = 64;

// Short energetic rest times (3.2s to 5.5s) to eliminate sluggish idle feeling
const REST_DURATION_MIN_MS = 3200;
const REST_DURATION_MAX_MS = 5500;

const SPEECH_PROMPTS = [
  'Purr... macros on track',
  'Prowling the corners',
  'Ready to leap high',
  'Agility at peak',
  'Tap for AI Coach',
  'Hydration check',
];

/**
 * SiaRoamingCompanion - High-Agility, Multi-Directional Living Mascot Cat.
 * Lives and perches strictly in the outer corners & edges (never blocking the middle).
 * Performs high vertical/diagonal leaps from bottom to top, downward pounces,
 * agile running sprints, and instant single-click AI chat opening.
 */
export function SiaRoamingCompanion({
  onOpenCoach,
  enabled = true,
}: SiaRoamingCompanionProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const [activeMood, setActiveMood] = useState<SiaVectorMood>('sitting');
  const [speechPrompt, setSpeechPrompt] = useState('Purr... macros on track');
  const [speechVisible, setSpeechVisible] = useState(false);

  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 28);
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 34 : 16);
  const tabHeight = 60; // bottom tab bar clearance

  // Elevation coordinates
  const topY = topInset + 44; // Top corner under header
  const bottomY = screenHeight - bottomInset - tabHeight - MASCOT_HEIGHT + 14; // Bottom tab ledge
  const midY = screenHeight * 0.44; // Mid-height edge perch

  const leftX = 14;
  const rightX = Math.max(leftX + 40, screenWidth - MASCOT_WIDTH - 14);

  // Compute 6 strict outer corner & edge perches (ZERO middle perches)
  const getCornerPerches = useCallback((): CornerPerch[] => {
    return [
      { id: 'bottom-right', x: rightX, y: bottomY, isTop: false, isLeft: false },
      { id: 'bottom-left', x: leftX, y: bottomY, isTop: false, isLeft: true },
      { id: 'top-right', x: rightX, y: topY, isTop: true, isLeft: false },
      { id: 'top-left', x: leftX, y: topY, isTop: true, isLeft: true },
      { id: 'mid-right', x: rightX + 2, y: midY, isTop: false, isLeft: false },
      { id: 'mid-left', x: leftX - 2, y: midY, isTop: false, isLeft: true },
    ];
  }, [bottomY, leftX, midY, rightX, topY]);

  // Reanimated shared values
  const posX = useSharedValue(rightX);
  const posY = useSharedValue(bottomY);
  const hopY = useSharedValue(0);
  const scaleX = useSharedValue(1); // 1 = facing right, -1 = facing left
  const scaleY = useSharedValue(1);
  const rotation = useSharedValue(0);
  const idleBob = useSharedValue(0);
  const speechScale = useSharedValue(0);
  const speechOpacity = useSharedValue(0);

  // Mutable refs
  const stateRef = useRef<CompanionState>('sitting');
  const currentPerchIdRef = useRef<string>('bottom-right');
  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMountedRef = useRef<boolean>(true);

  // Keep Y synced on dimension changes
  useEffect(() => {
    if (stateRef.current !== 'dragged') {
      const perches = getCornerPerches();
      const current = perches.find((p) => p.id === currentPerchIdRef.current) || perches[0];
      posY.set(current.y);
      posX.set(current.x);
    }
  }, [getCornerPerches, posX, posY]);

  // Hide floating thought pill
  const dismissSpeech = useCallback(() => {
    speechScale.set(withTiming(0, { duration: 150 }));
    speechOpacity.set(
      withTiming(0, { duration: 150 }, () => {
        runOnJS(setSpeechVisible)(false);
      })
    );
  }, [speechOpacity, speechScale]);

  // Show floating thought pill
  const showSpeech = useCallback(
    (promptText?: string) => {
      const text =
        promptText ||
        SPEECH_PROMPTS[Math.floor(Math.random() * SPEECH_PROMPTS.length)];
      setSpeechPrompt(text);
      setSpeechVisible(true);
      speechScale.set(withSpring(1, { damping: 12, stiffness: 180 }));
      speechOpacity.set(withTiming(1, { duration: 160 }));

      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      speechTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) dismissSpeech();
      }, 2800);
    },
    [dismissSpeech, speechOpacity, speechScale]
  );

  // Switch companion behavior state
  const setCompanionState = useCallback(
    (newState: CompanionState) => {
      stateRef.current = newState;
      switch (newState) {
        case 'walking':
          setActiveMood('walking');
          break;
        case 'running':
          setActiveMood('running');
          break;
        case 'jumping':
          setActiveMood('jumping');
          break;
        case 'yawning':
          setActiveMood('yawning');
          break;
        case 'sleeping':
          setActiveMood('sleeping');
          break;
        case 'dragged':
          setActiveMood('walking');
          break;
        case 'sitting':
        default:
          setActiveMood('sitting');
          break;
      }
    },
    []
  );

  // Gentle harmonic idle breathing
  useEffect(() => {
    if (reducedMotion) return;

    idleBob.set(
      withRepeat(
        withSequence(
          withTiming(-2.2, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
          withTiming(2.2, { duration: 1500, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );

    return () => {
      cancelAnimation(idleBob);
    };
  }, [idleBob, reducedMotion]);

  // Cat yawn and spine stretch
  const performYawnAndStretch = useCallback(
    (onComplete?: () => void) => {
      if (!isMountedRef.current || !enabled) return;

      setCompanionState('yawning');
      const facing = scaleX.get();

      if (reducedMotion) {
        setTimeout(() => {
          setCompanionState('sitting');
          onComplete?.();
        }, 900);
        return;
      }

      // Front paws stretch forward
      scaleX.set(withTiming(facing * 1.2, { duration: 340, easing: Easing.out(Easing.quad) }));
      scaleY.set(withTiming(0.85, { duration: 340, easing: Easing.out(Easing.quad) }));
      hopY.set(withTiming(3, { duration: 340 }));

      setTimeout(() => {
        if (!isMountedRef.current) return;
        // Spine arches up
        scaleY.set(withTiming(1.15, { duration: 420, easing: Easing.inOut(Easing.quad) }));
        scaleX.set(withTiming(facing * 0.92, { duration: 420 }));
        hopY.set(withTiming(-4, { duration: 420 }));
        rotation.set(withTiming(facing * -6, { duration: 420 }));

        setTimeout(() => {
          if (!isMountedRef.current) return;
          // Quick ear shake and settle
          rotation.set(
            withSequence(
              withTiming(facing * 4, { duration: 90 }),
              withTiming(facing * -3, { duration: 90 }),
              withSpring(0, { damping: 12, stiffness: 180 })
            )
          );
          scaleX.set(withSpring(facing * 1, { damping: 11, stiffness: 160 }));
          scaleY.set(withSpring(1, { damping: 11, stiffness: 160 }));
          hopY.set(withSpring(0, { damping: 11, stiffness: 160 }));
          setCompanionState('sitting');
          onComplete?.();
        }, 460);
      }, 360);
    },
    [enabled, hopY, reducedMotion, rotation, scaleX, scaleY, setCompanionState]
  );

  // High Vertical / Diagonal Ballistic Leap from Bottom to Top (or vice versa)
  const jumpToPerch = useCallback(
    (targetPerch: CornerPerch, onArrival?: () => void) => {
      if (!isMountedRef.current || !enabled) return;

      const currentX = posX.get();
      const currentY = posY.get();
      const deltaX = targetPerch.x - currentX;
      const deltaY = targetPerch.y - currentY;
      const isUpward = deltaY < -40; // jumping high towards top
      const isDownward = deltaY > 40; // downward pounce towards bottom

      const facing = targetPerch.x >= currentX ? 1 : -1;
      scaleX.set(withTiming(facing, { duration: 120 }));

      if (reducedMotion) {
        posX.set(targetPerch.x);
        posY.set(targetPerch.y);
        currentPerchIdRef.current = targetPerch.id;
        setCompanionState('sitting');
        onArrival?.();
        return;
      }

      // 1. Anticipation crouch before launching
      scaleY.set(withTiming(0.72, { duration: 150, easing: Easing.out(Easing.quad) }));
      scaleX.set(withTiming(facing * 1.18, { duration: 150, easing: Easing.out(Easing.quad) }));
      hopY.set(withTiming(4, { duration: 150 }));

      setTimeout(() => {
        if (!isMountedRef.current) return;

        setCompanionState('jumping');
        // High jump duration calibrated to vertical distance
        const totalDist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const jumpDuration = Math.max(680, Math.min(880, Math.round((totalDist / 420) * 800)));

        // Apex height: curves high above the higher perch
        const apexY = Math.min(currentY, targetPerch.y) - (isUpward ? 70 : 45);

        // Horizontal traversal
        posX.set(withTiming(targetPerch.x, { duration: jumpDuration, easing: Easing.linear }));

        // Parabolic vertical arc
        posY.set(
          withSequence(
            withTiming(apexY, { duration: jumpDuration * 0.44, easing: Easing.out(Easing.quad) }),
            withTiming(targetPerch.y, { duration: jumpDuration * 0.56, easing: Easing.in(Easing.quad) })
          )
        );

        // Vector airborne flight angle and body stretch
        hopY.set(withTiming(0, { duration: 80 }));
        scaleY.set(
          withSequence(
            withTiming(1.28, { duration: jumpDuration * 0.35 }),
            withTiming(0.96, { duration: jumpDuration * 0.55 })
          )
        );
        scaleX.set(withTiming(facing * 0.86, { duration: jumpDuration * 0.4 }));

        // Dynamic body angle: tilts upward when leaping up, downward when pouncing
        const flightTilt = isUpward ? -18 : isDownward ? 14 : -8;
        rotation.set(
          withSequence(
            withTiming(facing * flightTilt, { duration: jumpDuration * 0.42, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: jumpDuration * 0.58 })
          )
        );

        // Landing squash on the target corner
        setTimeout(() => {
          if (!isMountedRef.current) return;
          currentPerchIdRef.current = targetPerch.id;
          hapticFeedback.light();

          rotation.set(withSpring(0, { damping: 10, stiffness: 180 }));
          scaleY.set(
            withSequence(
              withTiming(0.74, { duration: 75 }),
              withSpring(1, { damping: 9, stiffness: 200 })
            )
          );
          scaleX.set(
            withSequence(
              withTiming(facing * 1.18, { duration: 75 }),
              withSpring(facing * 1, { damping: 9, stiffness: 200 })
            )
          );

          setCompanionState('sitting');
          if (onArrival) onArrival();
        }, jumpDuration);
      }, 160);
    },
    [enabled, hopY, posX, posY, reducedMotion, rotation, scaleX, scaleY, setCompanionState]
  );

  // Fast Corner Sprint (Horizontal Dash along top header or bottom ledge)
  const sprintToPerch = useCallback(
    (targetPerch: CornerPerch, onArrival?: () => void) => {
      if (!isMountedRef.current || !enabled) return;

      const currentX = posX.get();
      const distance = Math.abs(targetPerch.x - currentX);
      if (distance < 16) {
        currentPerchIdRef.current = targetPerch.id;
        onArrival?.();
        return;
      }

      const facing = targetPerch.x > currentX ? 1 : -1;
      scaleX.set(withTiming(facing, { duration: 120 }));
      setCompanionState('running');

      if (!reducedMotion) {
        rotation.set(withTiming(facing * 10, { duration: 160 }));
      }

      const sprintDuration = Math.max(900, Math.min(2200, Math.round((distance / 160) * 1000)));

      if (reducedMotion) {
        posX.set(targetPerch.x);
        currentPerchIdRef.current = targetPerch.id;
        setCompanionState('sitting');
        onArrival?.();
      } else {
        posX.set(
          withTiming(targetPerch.x, { duration: sprintDuration, easing: Easing.linear }, () => {
            rotation.set(withSpring(0, { damping: 10, stiffness: 160 }));
            currentPerchIdRef.current = targetPerch.id;
            runOnJS(setCompanionState)('sitting');
            if (onArrival) runOnJS(onArrival)();
          })
        );
      }
    },
    [enabled, posX, reducedMotion, rotation, scaleX, setCompanionState]
  );

  // Autonomous high-energy action director
  const scheduleNextAction = useCallback(() => {
    if (!isMountedRef.current || !enabled || isDraggingRef.current) return;

    if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    // Short energetic rest duration (3.2s to 5.5s)
    const restTime =
      REST_DURATION_MIN_MS +
      Math.random() * (REST_DURATION_MAX_MS - REST_DURATION_MIN_MS);

    actionTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current || !enabled || isDraggingRef.current) return;

      const perches = getCornerPerches();
      const currentPerch =
        perches.find((p) => p.id === currentPerchIdRef.current) || perches[0];

      // Eligible destination perches (exclude current perch)
      const otherPerches = perches.filter((p) => p.id !== currentPerch.id);
      const roll = Math.random();

      // 1. Quick Stretch & Yawn (18% chance)
      if (roll < 0.18) {
        performYawnAndStretch(() => {
          scheduleNextAction();
        });
        return;
      }

      // 2. Quick Cat Nap (18% chance, short 3.8s nap then jumps)
      if (roll >= 0.18 && roll < 0.36) {
        setCompanionState('sleeping');
        actionTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current || isDraggingRef.current) return;
          performYawnAndStretch(() => {
            scheduleNextAction();
          });
        }, 3800);
        return;
      }

      // 3. High Vertical/Diagonal Leap between Bottom and Top Corners (44% chance)
      if (roll >= 0.36 && roll < 0.8) {
        // If at bottom, prioritize leaping to a high top corner!
        // If at top, prioritize pouncing down to a bottom corner!
        let targetPerch: CornerPerch;
        if (!currentPerch.isTop) {
          const topPerches = otherPerches.filter((p) => p.isTop || p.id.startsWith('mid'));
          targetPerch =
            topPerches[Math.floor(Math.random() * topPerches.length)] || otherPerches[0];
        } else {
          const bottomPerches = otherPerches.filter((p) => !p.isTop);
          targetPerch =
            bottomPerches[Math.floor(Math.random() * bottomPerches.length)] || otherPerches[0];
        }

        jumpToPerch(targetPerch, () => {
          scheduleNextAction();
        });
        return;
      }

      // 4. Horizontal Corner Sprint (20% chance)
      // Same elevation sprint: left corner to right corner or vice versa
      const sameLevelPerches = otherPerches.filter(
        (p) => Math.abs(p.y - currentPerch.y) < 30
      );
      if (sameLevelPerches.length > 0) {
        const targetPerch = sameLevelPerches[0];
        sprintToPerch(targetPerch, () => {
          scheduleNextAction();
        });
        return;
      }

      // Fallback: pick any other corner perch and leap
      const randomPerch = otherPerches[Math.floor(Math.random() * otherPerches.length)];
      jumpToPerch(randomPerch, () => {
        scheduleNextAction();
      });
    }, restTime);
  }, [
    enabled,
    getCornerPerches,
    jumpToPerch,
    performYawnAndStretch,
    setCompanionState,
    sprintToPerch,
  ]);

  // Initialize lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    setCompanionState('sitting');
    scheduleNextAction();

    return () => {
      isMountedRef.current = false;
      if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    };
  }, [scheduleNextAction, setCompanionState]);

  // Movable PanResponder with instant single-tap AI Chat opening and corner gravity snap
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6,

      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        if (actionTimerRef.current) clearTimeout(actionTimerRef.current);

        dragStartPosRef.current = {
          x: posX.get(),
          y: posY.get(),
        };

        hapticFeedback.light();
        setCompanionState('dragged');
        scaleY.set(withSpring(1.12, { damping: 9, stiffness: 200 }));
        scaleX.set(withSpring(scaleX.get() > 0 ? 0.92 : -0.92, { damping: 9, stiffness: 200 }));
        hopY.set(withSpring(-6, { damping: 9, stiffness: 180 }));
      },

      onPanResponderMove: (_, gesture) => {
        const nextX = Math.max(leftX, Math.min(rightX, dragStartPosRef.current.x + gesture.dx));
        const nextY = Math.max(topY, Math.min(bottomY, dragStartPosRef.current.y + gesture.dy));

        posX.set(nextX);
        posY.set(nextY);
      },

      onPanResponderRelease: (_, gesture) => {
        isDraggingRef.current = false;
        hopY.set(withSpring(0, { damping: 10, stiffness: 180 }));

        // Check if gesture was a TAP (not a drag)
        const isTap = Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8;
        if (isTap) {
          // Immediate Single-Tap Reaction: Purr + Hop + Immediate AI Chat Opening (No Text Popup)
          hapticFeedback.purr();
          dismissSpeech();

          hopY.set(
            withSequence(
              withTiming(-16, { duration: 120, easing: Easing.out(Easing.quad) }),
              withSpring(0, { damping: 9, stiffness: 180 })
            )
          );
          scaleY.set(
            withSequence(
              withTiming(0.84, { duration: 75 }),
              withSpring(1.16, { damping: 7, stiffness: 220 }),
              withSpring(1, { damping: 11, stiffness: 160 })
            )
          );

          // Open Sia AI Coach immediately on click (0ms delay, zero text popup)
          if (onOpenCoach) {
            onOpenCoach();
          } else {
            useCoachStore.getState().openCoach();
          }
          return;
        }

        // Cat Gravity Snap: Drop smoothly into the closest corner perch (never in the middle)
        const droppedX = posX.get();
        const droppedY = posY.get();
        const perches = getCornerPerches();

        let nearestPerch = perches[0];
        let minDistanceSq = Number.MAX_VALUE;

        for (const p of perches) {
          const distSq = (p.x - droppedX) ** 2 + (p.y - droppedY) ** 2;
          if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            nearestPerch = p;
          }
        }

        currentPerchIdRef.current = nearestPerch.id;

        posX.set(withSpring(nearestPerch.x, { damping: 13, stiffness: 160 }));
        posY.set(
          withSpring(nearestPerch.y, { damping: 13, stiffness: 160 }, () => {
            runOnJS(setCompanionState)('sitting');
          })
        );

        hapticFeedback.light();
        const facing = scaleX.get() > 0 ? 1 : -1;
        scaleY.set(
          withSequence(
            withTiming(0.76, { duration: 80 }),
            withSpring(1, { damping: 9, stiffness: 190 })
          )
        );
        scaleX.set(
          withSequence(
            withTiming(facing * 1.16, { duration: 80 }),
            withSpring(facing * 1, { damping: 9, stiffness: 190 })
          )
        );

        scheduleNextAction();
      },

      onPanResponderTerminate: () => {
        isDraggingRef.current = false;
        hopY.set(withSpring(0, { damping: 10, stiffness: 180 }));
        setCompanionState('sitting');
        scheduleNextAction();
      },
    })
  ).current;

  // Animated style for companion
  const mascotAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: posX.get() },
        {
          translateY:
            posY.get() +
            hopY.get() +
            (stateRef.current === 'walking' ||
            stateRef.current === 'running' ||
            stateRef.current === 'jumping' ||
            stateRef.current === 'dragged'
              ? 0
              : idleBob.get()),
        },
        { rotate: `${rotation.get()}deg` },
        { scaleX: scaleX.get() },
        { scaleY: scaleY.get() },
      ],
    };
  });

  // Animated style for thought bubble
  const speechAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: speechScale.get() }],
      opacity: speechOpacity.get(),
    };
  });

  if (!enabled) return null;

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      <Animated.View
        {...panResponder.panHandlers}
        accessibilityRole="button"
        accessibilityLabel="Sia Companion Cat"
        accessibilityHint="Tap to open AI Coach, or drag to move"
        style={[styles.mascotAnchor, mascotAnimatedStyle]}
        pointerEvents="auto"
      >
        {/* Playful Floating Speech Bubble */}
        {speechVisible && (
          <Animated.View
            pointerEvents="box-none"
            style={[styles.speechBubble, speechAnimatedStyle]}
          >
            <Pressable
              onPress={() => {
                hapticFeedback.medium();
                if (onOpenCoach) {
                  onOpenCoach();
                } else {
                  useCoachStore.getState().openCoach();
                }
              }}
              style={styles.speechPill}
            >
              <View style={styles.statusDot} />
              <Text style={styles.speechText}>{speechPrompt}</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Whole-Body Living Cat Body */}
        <View style={styles.touchArea}>
          <SiaVectorCat
            size={MASCOT_WIDTH}
            mood={activeMood}
            animation={
              activeMood === 'walking' || activeMood === 'running'
                ? 'walk'
                : 'breathe'
            }
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
  mascotAnchor: {
    position: 'absolute',
    width: MASCOT_WIDTH,
    height: MASCOT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchArea: {
    width: MASCOT_WIDTH,
    height: MASCOT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speechBubble: {
    position: 'absolute',
    top: -34,
    alignSelf: 'center',
    zIndex: 999,
  },
  speechPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  speechText: {
    color: '#e4e4e7',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
