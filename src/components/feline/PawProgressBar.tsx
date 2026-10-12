import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';

interface PawProgressBarProps {
  /** Progress ratio from 0.0 to 1.0 (or percentage 0 to 100) */
  progress: number;
  /** Primary accent color for fill and active paws (Default: #10b981) */
  color?: string;
  /** Optional label on left (e.g. "Protein Target") */
  label?: string;
  /** Optional telemetry readouts (e.g. "120g / 150g") */
  readout?: string;
  /** Height of the track bar (Default: 8) */
  trackHeight?: number;
  /** Whether to show feline paw milestone markers (Default: true) */
  showPaws?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Feline Paw SVG Icon Helper
 */
function PawIcon({ size = 14, color = '#10b981', active = true }: { size?: number; color?: string; active?: boolean }) {
  const opacity = active ? 1 : 0.25;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Main bottom pad */}
      <Path
        d="M12 11.5 C8.5 11.5, 6 14.5, 7.5 18 C8.5 20.2, 15.5 20.2, 16.5 18 C18 14.5, 15.5 11.5, 12 11.5 Z"
        fill={color}
        fillOpacity={opacity}
      />
      {/* Toe 1 (far left) */}
      <Circle cx="5" cy="11.5" r="2.2" fill={color} fillOpacity={opacity} />
      {/* Toe 2 (center left) */}
      <Circle cx="9" cy="7.5" r="2.5" fill={color} fillOpacity={opacity} />
      {/* Toe 3 (center right) */}
      <Circle cx="15" cy="7.5" r="2.5" fill={color} fillOpacity={opacity} />
      {/* Toe 4 (far right) */}
      <Circle cx="19" cy="11.5" r="2.2" fill={color} fillOpacity={opacity} />
    </Svg>
  );
}

/**
 * PawProgressBar - Track progress adorned with glowing feline paw-print checkpoints.
 */
export function PawProgressBar({
  progress,
  color = '#10b981',
  label,
  readout,
  trackHeight = 8,
  showPaws = true,
  style,
}: PawProgressBarProps) {
  // Normalize progress between 0 and 1
  const normalized = Math.min(1, Math.max(0, progress > 1 ? progress / 100 : progress));
  const percentStr = `${Math.round(normalized * 100)}%`;

  return (
    <View style={style} className="w-full">
      {/* Top Header Labels */}
      {(label || readout) && (
        <View className="flex-row items-center justify-between mb-1.5">
          <View className="flex-row items-center gap-1.5">
            <PawIcon size={12} color={color} active={normalized > 0} />
            {label && (
              <Text className="text-zinc-300 text-xs font-bold tracking-wide">
                {label}
              </Text>
            )}
          </View>
          {readout ? (
            <Text
              style={{ fontVariant: ['tabular-nums'] }}
              className="text-zinc-400 text-xs font-semibold"
            >
              {readout}
            </Text>
          ) : (
            <Text
              style={{ fontVariant: ['tabular-nums'] }}
              className="text-zinc-400 text-xs font-bold"
            >
              {percentStr}
            </Text>
          )}
        </View>
      )}

      {/* Progress Track & Paw Checkpoints */}
      <View className="relative justify-center py-1.5">
        {/* Background Track */}
        <View
          style={{ height: trackHeight, borderRadius: trackHeight / 2 }}
          className="w-full bg-zinc-950 border border-zinc-800/80 overflow-hidden"
        >
          {/* Active Fill Bar */}
          <View
            style={{
              width: `${normalized * 100}%`,
              height: '100%',
              backgroundColor: color,
              borderRadius: trackHeight / 2,
            }}
          />
        </View>

        {/* Paw Milestones (25%, 50%, 75%, 100%) */}
        {showPaws && (
          <View
            pointerEvents="none"
            className="absolute left-0 right-0 flex-row justify-between px-2"
          >
            {[0.25, 0.5, 0.75, 1.0].map((step, idx) => {
              const isPassed = normalized >= step;
              return (
                <View
                  key={idx}
                  style={{
                    backgroundColor: isPassed ? '#18181b' : '#09090b',
                    borderColor: isPassed ? color : '#27272a',
                  }}
                  className="w-5 h-5 rounded-full items-center justify-center border shadow-xs"
                >
                  <PawIcon size={11} color={isPassed ? color : '#71717a'} active={isPassed} />
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

export default PawProgressBar;
