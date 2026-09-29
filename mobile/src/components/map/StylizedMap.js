import React from 'react';
import Svg, { Rect, Path, Line, Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { colors } from '../../theme/tokens';
import { FONT_INTER } from '../../theme/fonts';

export default function StylizedMap({ userX = 75, userY = 250 }) {
  const c = colors;

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 300 340"
      preserveAspectRatio="xMidYMid slice"
    >
      <Rect width="300" height="340" fill={c.surface} />
      <Path
        d="M190 0 C175 100 215 200 195 340"
        stroke={c.accentBg}
        strokeWidth="40"
        fill="none"
      />
      <Line x1="0" y1="140" x2="300" y2="110" stroke={c.borderStrong} strokeWidth="6" />
      <Line x1="60" y1="0" x2="80" y2="340" stroke={c.borderStrong} strokeWidth="5" />
      <Line x1="0" y1="250" x2="300" y2="262" stroke={c.borderStrong} strokeWidth="5" />
      <Line x1="160" y1="124" x2="222" y2="118" stroke={c.accent} strokeWidth="7" />
      <Circle
        cx="191"
        cy="121"
        r="62"
        fill="none"
        stroke={c.accentBorder}
        strokeWidth="1"
        strokeDasharray="4,4"
      />
      <Polyline
        points="75,250 68,133 160,124"
        fill="none"
        stroke={c.accentText}
        strokeWidth="2"
        strokeDasharray="2,5"
        strokeLinecap="round"
      />
      <Circle cx={userX} cy={userY} r="14" fill={c.accentBg} />
      <Circle
        cx={userX}
        cy={userY}
        r="7"
        fill={c.accent}
        stroke={c.surface2}
        strokeWidth="2"
      />
      <SvgText
        x="191"
        y="86"
        textAnchor="middle"
        fontSize="11"
        fontFamily={FONT_INTER}
        fill={c.text}
      >
        Habibganj Overbridge
      </SvgText>
    </Svg>
  );
}
