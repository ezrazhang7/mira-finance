import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  children: ReactNode;
}

export function Card({ title, children, className, ...rest }: CardProps) {
  const classes = ['card', className ?? ''].filter(Boolean).join(' ');
  return (
    <section className={classes} {...rest}>
      {title ? <h2 className="card__title">{title}</h2> : null}
      {children}
    </section>
  );
}
