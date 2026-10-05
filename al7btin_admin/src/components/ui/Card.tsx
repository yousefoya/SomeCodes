import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, hover = false, className = '', ...props }) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-surface-200/80 p-5 shadow-card transition-all duration-200 ${
        hover ? 'hover:shadow-card-hover hover:border-brand-200' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
