import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'muted' | 'outline';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variantStyles = {
    default: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    muted: 'bg-surface-muted text-muted border-border',
    outline: 'border border-border text-muted bg-transparent',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: 'EASY' | 'MEDIUM' | 'HARD' }) {
  if (difficulty === 'EASY') return <Badge variant="success">Easy</Badge>;
  if (difficulty === 'MEDIUM') return <Badge variant="warning">Medium</Badge>;
  return <Badge variant="danger">Hard</Badge>;
}

export function StatusBadge({ status }: { status: 'WAITING' | 'ACTIVE' | 'COMPLETED' }) {
  if (status === 'WAITING') return <Badge variant="warning">Waiting for candidate</Badge>;
  if (status === 'ACTIVE') return <Badge variant="success">Active</Badge>;
  return <Badge variant="muted">Completed</Badge>;
}

