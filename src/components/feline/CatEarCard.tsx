import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface CatEarCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  badge?: string;
  rightElement?: React.ReactNode;
  borderColor?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * CatEarCard - Modern Obsidian card topped with sleek feline ear silhouettes.
 * Gives screens a signature playful yet dark-tech feline brand identity.
 */
export function CatEarCard({
  children,
  title,
  subtitle,
  badge,
  rightElement,
  borderColor = '#27272a',
  className = '',
  style,
}: CatEarCardProps) {
  return (
    <View style={style} className={`relative pt-2.5 ${className}`}>
      {/* Left Feline Ear Silhouette Tab */}
      <View
        style={{ position: 'absolute', top: 0, left: 16, zIndex: 1 }}
        className="overflow-hidden"
      >
        <Svg width={24} height={11} viewBox="0 0 24 11" fill="none">
          <Path
            d="M2 11 L10 2 C11.5 0.5, 12.5 0.5, 14 2 L22 11"
            fill="#18181b"
            stroke={borderColor}
            strokeWidth={1.5}
          />
          {/* Inner Ear Peach Accent */}
          <Path
            d="M7 11 L11 4 C11.5 3.5, 12.5 3.5, 13 4 L17 11"
            fill="#f43f5e"
            fillOpacity={0.18}
          />
        </Svg>
      </View>

      {/* Right Feline Ear Silhouette Tab */}
      <View
        style={{ position: 'absolute', top: 0, right: 16, zIndex: 1 }}
        className="overflow-hidden"
      >
        <Svg width={24} height={11} viewBox="0 0 24 11" fill="none">
          <Path
            d="M2 11 L10 2 C11.5 0.5, 12.5 0.5, 14 2 L22 11"
            fill="#18181b"
            stroke={borderColor}
            strokeWidth={1.5}
          />
          {/* Inner Ear Peach Accent */}
          <Path
            d="M7 11 L11 4 C11.5 3.5, 12.5 3.5, 13 4 L17 11"
            fill="#f43f5e"
            fillOpacity={0.18}
          />
        </Svg>
      </View>

      {/* Main Card Body */}
      <View
        style={{ borderColor }}
        className="bg-zinc-900/90 border rounded-2xl p-4 shadow-sm relative overflow-hidden"
      >
        {/* Optional Header Row */}
        {(title || rightElement || badge) && (
          <View className="flex-row items-center justify-between mb-3 pb-2.5 border-b border-zinc-800/60">
            <View className="flex-1 pr-2">
              <View className="flex-row items-center gap-2">
                {title && (
                  <Text
                    style={{ fontFamily: 'Outfit_700Bold' }}
                    className="text-white text-base"
                  >
                    {title}
                  </Text>
                )}
                {badge && (
                  <View className="bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <Text className="text-emerald-400 text-[10px] font-bold">
                      {badge}
                    </Text>
                  </View>
                )}
              </View>
              {subtitle && (
                <Text className="text-zinc-400 text-xs mt-0.5">{subtitle}</Text>
              )}
            </View>
            {rightElement}
          </View>
        )}

        {/* Card Content */}
        {children}
      </View>
    </View>
  );
}

export default CatEarCard;
