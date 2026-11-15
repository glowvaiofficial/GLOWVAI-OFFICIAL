import React from 'react';

// The real GlowVai wordmark (files in public/brand). Use `white` on blue or dark backgrounds, the blue one on light.
// The image is 760x202, so the width follows from the height.
const RATIO = 760 / 202;

export const BrandLogo: React.FC<{ height?: number; white?: boolean; className?: string; style?: React.CSSProperties }> = ({ height = 28, white = false, className, style }) => (
  <img
    src={white ? '/brand/glowvai-wordmark-white.png' : '/brand/glowvai-wordmark.png'}
    alt="GlowVai"
    width={Math.round(height * RATIO)}
    height={height}
    className={className}
    style={{ display: 'block', height, width: 'auto', ...style }}
    draggable={false}
  />
);
