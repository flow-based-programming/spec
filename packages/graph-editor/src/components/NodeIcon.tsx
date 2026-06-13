import React from 'react';
import {
  FiArrowRight,
  FiArrowLeft,
  FiSettings,
  FiFile,
  FiFileText,
  FiType,
  FiSquare,
  FiHash,
  FiPlus,
  FiMinus,
  FiX,
  FiCircle,
  FiZap,
  FiLink,
  FiMail,
  FiGlobe,
  FiGitMerge,
  FiScissors,
  FiShield,
  FiRepeat,
  FiToggleLeft,
  FiCpu,
  FiCode,
  FiSend,
  FiBox,
  FiLayers,
  FiFilter,
  FiDatabase,
  FiTerminal,
} from 'react-icons/fi';
import { SiGraphql } from 'react-icons/si';
import { TbBraces, TbQuote, TbCursorText } from 'react-icons/tb';

interface NodeIconProps {
  icon: string;
  size?: number;
  className?: string;
}

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'arrow-right': FiArrowRight,
  'arrow-left': FiArrowLeft,
  'settings': FiSettings,
  'file': FiFile,
  'file-text': FiFileText,
  'text-cursor': TbCursorText,
  'square': FiSquare,
  'type': FiType,
  'hash': FiHash,
  'plus': FiPlus,
  'minus': FiMinus,
  'x': FiX,
  'circle': FiCircle,
  'braces': TbBraces,
  'zap': FiZap,
  'quote': TbQuote,
  'link': FiLink,
  'graphql': SiGraphql,
  'mail': FiMail,
  'globe': FiGlobe,
  'git-merge': FiGitMerge,
  'scissors': FiScissors,
  'shield': FiShield,
  'repeat': FiRepeat,
  'toggle': FiToggleLeft,
  'cpu': FiCpu,
  'code': FiCode,
  'send': FiSend,
  'box': FiBox,
  'layers': FiLayers,
  'filter': FiFilter,
  'database': FiDatabase,
  'terminal': FiTerminal,
};

export function NodeIcon({ icon, size = 14, className = '' }: NodeIconProps) {
  const IconComponent = iconMap[icon];
  
  if (!IconComponent) {
    return <span className={className}>{icon}</span>;
  }
  
  return <IconComponent size={size} className={className} />;
}

export function NodeIconSvg({ icon, size = 11 }: { icon: string; size?: number }) {
  const iconPaths: Record<string, string> = {
    'arrow-right': 'M5 12h14M12 5l7 7-7 7',
    'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
    'settings': 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z',
    'file': 'M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z M13 2v7h7',
    'file-text': 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
    'text-cursor': 'M6 4v16 M18 4v16 M6 12h12',
    'square': 'M3 3h18v18H3z',
    'type': 'M4 7V4h16v3 M9 20h6 M12 4v16',
    'hash': 'M4 9h16 M4 15h16 M10 3v18 M14 3v18',
    'plus': 'M12 5v14 M5 12h14',
    'minus': 'M5 12h14',
    'x': 'M18 6L6 18 M6 6l12 12',
    'circle': 'M12 12m-10 0a10 10 0 1020 0 10 10 0 10-20 0',
    'braces': 'M8 3H7a2 2 0 00-2 2v5a2 2 0 01-2 2 2 2 0 012 2v5a2 2 0 002 2h1 M16 3h1a2 2 0 012 2v5a2 2 0 002 2 2 2 0 00-2 2v5a2 2 0 01-2 2h-1',
    'zap': 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
    'quote': 'M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z',
    'link': 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71 M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
    'graphql': 'M12 2L2 7v10l10 5 10-5V7L12 2z M12 22V12 M2 7l10 5 10-5',
    'mail': 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
    'globe': 'M12 12m-10 0a10 10 0 1020 0 10 10 0 10-20 0 M2 12h20 M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z',
    'git-merge': 'M18 18m-3 0a3 3 0 106 0 3 3 0 10-6 0 M6 6m-3 0a3 3 0 106 0 3 3 0 10-6 0 M6 21V9a9 9 0 009 9',
    'scissors': 'M6 9m-3 0a3 3 0 106 0 3 3 0 10-6 0 M6 15m-3 0a3 3 0 106 0 3 3 0 10-6 0 M20 4L8.12 15.88 M14.47 14.48L20 20 M8.12 8.12L12 12',
    'shield': 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    'repeat': 'M17 1l4 4-4 4 M3 11V9a4 4 0 014-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 01-4 4H3',
    'toggle': 'M16 5H8a7 7 0 100 14h8a7 7 0 100-14z M8 12m-3 0a3 3 0 106 0 3 3 0 10-6 0',
    'cpu': 'M6 6h12v12H6z M9 1v3 M15 1v3 M9 20v3 M15 20v3 M20 9h3 M20 14h3 M1 9h3 M1 14h3',
    'code': 'M16 18l6-6-6-6 M8 6l-6 6 6 6',
    'send': 'M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z',
    'box': 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12',
    'layers': 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
    'filter': 'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
    'database': 'M12 2C6.48 2 2 4.02 2 6.5v11C2 19.98 6.48 22 12 22s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2z M2 6.5C2 8.98 6.48 11 12 11s10-2.02 10-4.5 M2 12c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5',
    'terminal': 'M4 17l6-5-6-5 M12 19h8',
  };

  const path = iconPaths[icon];
  
  if (!path) {
    return (
      <text
        dominantBaseline="middle"
        fill="rgba(255,255,255,0.7)"
        fontSize={size}
        fontFamily="system-ui, sans-serif"
      >
        {icon}
      </text>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: 'rgba(255,255,255,0.7)' }}
    >
      <path d={path} />
    </svg>
  );
}
