import type { CSSProperties } from 'react';

const meteorStyles = [
  { top: '8%', left: '82%', width: '116px', color: '#7dd3fc', delay: '-1.2s', duration: '9.6s' },
  { top: '22%', left: '64%', width: '152px', color: '#f472b6', delay: '-4.2s', duration: '12.4s' },
  { top: '36%', left: '92%', width: '96px', color: '#a78bfa', delay: '-7.6s', duration: '10.8s' },
  { top: '58%', left: '72%', width: '132px', color: '#34d399', delay: '-2.8s', duration: '13.6s' },
  { top: '14%', left: '38%', width: '108px', color: '#facc15', delay: '-9.2s', duration: '14.2s' },
  { top: '72%', left: '48%', width: '164px', color: '#fb7185', delay: '-0.4s', duration: '11.8s' },
  { top: '48%', left: '18%', width: '88px', color: '#60a5fa', delay: '-10.6s', duration: '13.2s' },
  { top: '4%', left: '12%', width: '140px', color: '#22d3ee', delay: '-5.8s', duration: '10.2s' },
  { top: '82%', left: '88%', width: '104px', color: '#c084fc', delay: '-12.4s', duration: '14.8s' },
  { top: '30%', left: '8%', width: '126px', color: '#f59e0b', delay: '-3.6s', duration: '12.2s' },
  { top: '64%', left: '26%', width: '118px', color: '#2dd4bf', delay: '-8.4s', duration: '11.2s' },
  { top: '18%', left: '54%', width: '176px', color: '#e879f9', delay: '-14s', duration: '15.6s' },
];

export function TopBarMeteorBackdrop() {
  return (
    <div className="topbar-meteor-layer" aria-hidden="true">
      {meteorStyles.map((meteor, index) => (
        <span
          key={`${meteor.color}-${index}`}
          className="topbar-meteor"
          style={
            {
              '--meteor-top': meteor.top,
              '--meteor-left': meteor.left,
              '--meteor-width': meteor.width,
              '--meteor-color': meteor.color,
              '--meteor-delay': meteor.delay,
              '--meteor-duration': meteor.duration,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
