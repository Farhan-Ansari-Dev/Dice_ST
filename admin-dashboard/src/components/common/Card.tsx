import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  hoverable?: boolean;
}

export default function Card({
  children,
  header,
  footer,
  className = '',
  style = {},
  onClick,
  hoverable = false,
}: CardProps) {
  const baseStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    transition: 'var(--transition)',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverable || onClick) {
      e.currentTarget.style.borderColor = 'var(--border-light)';
      e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverable || onClick) {
      e.currentTarget.style.borderColor = 'var(--border)';
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.transform = 'translateY(0)';
    }
  };

  return (
    <div
      className={className}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {header && (
        <div
          style={{
            padding: '18px 20px 14px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {header}
        </div>
      )}
      <div style={{ padding: header ? '14px 20px' : '20px' }}>
        {children}
      </div>
      {footer && (
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

export function CardContent({ children, style, className }: { children: React.ReactNode, style?: React.CSSProperties, className?: string }) {
  return <div className={className} style={style}>{children}</div>;
}

export { Card };
