import React, { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { WeightEntry } from '../stores/weightStore';
import { palette, space, type } from '../theme';

const HEIGHT = 130;
const KG_TO_LB = 2.20462;

interface WeightTrendChartProps {
  entries: WeightEntry[];
  unit: 'kg' | 'lbs';
}

/** The last 14 weigh-ins as a smooth line, with today's weight and the change over that span. */
export function WeightTrendChart({ entries, unit }: WeightTrendChartProps) {
  const [width, setWidth] = useState(0);

  if (!entries.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No weigh-ins yet</Text>
        <Text style={styles.emptyBody}>Log your weight to see your trend here.</Text>
      </View>
    );
  }

  const factor = unit === 'lbs' ? KG_TO_LB : 1;
  const recent = entries.slice(-14);
  const weights = recent.map((e) => e.weight_kg * factor);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const pad = Math.max(1, (max - min) * 0.2);
  const lo = Math.max(0, min - pad);
  const span = max + pad - lo || 1;

  const points = weights.map((w, i) => ({
    x: recent.length === 1 ? width / 2 : (i / (recent.length - 1)) * (width - 30) + 15,
    y: HEIGHT - ((w - lo) / span) * (HEIGHT - 30) - 15,
  }));
  let line = points.length === 1 ? `M ${points[0].x - 10} ${points[0].y} L ${points[0].x + 10} ${points[0].y}` : `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const mid = a.x + (b.x - a.x) / 2;
    line += ` C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`;
  }
  const area = points.length > 1 ? `${line} L ${points[points.length - 1].x} ${HEIGHT} L ${points[0].x} ${HEIGHT} Z` : '';

  const latest = weights[weights.length - 1];
  const change = Math.round((latest - weights[0]) * 10) / 10;

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.latest}>
          {latest.toFixed(1)}
          <Text style={styles.unit}> {unit}</Text>
        </Text>
        <Text style={styles.change}>
          {change === 0 ? 'No change' : `${change > 0 ? '+' : ''}${change.toFixed(1)} ${unit}`} over {recent.length} weigh-ins
        </Text>
      </View>
      <View style={styles.canvas} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            <Defs>
              <LinearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={palette.leafOnLight} stopOpacity="0.25" />
                <Stop offset="100%" stopColor={palette.leafOnLight} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Line x1="10" y1={HEIGHT / 2} x2={width - 10} y2={HEIGHT / 2} stroke={palette.line} strokeDasharray="4 4" strokeWidth="1" />
            {area ? <Path d={area} fill="url(#weightFill)" /> : null}
            <Path d={line} fill="none" stroke={palette.leafOnLight} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, i) => (
              <Circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={i === points.length - 1 ? 5 : 3.5}
                fill={palette.leafOnLight}
                stroke={palette.surface}
                strokeWidth="2"
              />
            ))}
          </Svg>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { height: 120, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: type.bodyBold, fontSize: type.size.body, color: palette.text },
  emptyBody: { fontFamily: type.body, fontSize: type.size.secondary, color: palette.textMuted, marginTop: space[1] },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space[2] },
  latest: { fontFamily: type.display, fontSize: type.size.title, color: palette.text, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: type.bodySemibold, fontSize: type.size.secondary, color: palette.textMuted },
  change: { fontFamily: type.bodySemibold, fontSize: type.size.caption, color: palette.textMuted, fontVariant: ['tabular-nums'] },
  canvas: { height: HEIGHT, width: '100%' },
});
