import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:shadow-sm active:bg-primary/95',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 hover:shadow-sm',
        outline:
          'border border-border/90 bg-card text-foreground shadow-2xs hover:bg-accent hover:text-accent-foreground hover:border-border',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'text-foreground/80 hover:bg-accent hover:text-accent-foreground',
        link:
          'text-primary underline-offset-4 hover:underline p-0 h-auto active:scale-100',
      },
      size: {
        default: 'h-10 px-4 py-2 gap-2 min-h-[40px]',
        sm: 'h-8 rounded-md px-3 text-xs gap-1.5 min-h-[32px]',
        lg: 'h-11 rounded-lg px-6 text-base gap-2.5 min-h-[44px]',
        icon: 'h-10 w-10 min-h-[40px] min-w-[40px] p-0',
        'icon-sm': 'h-8 w-8 min-h-[32px] min-w-[32px] p-0 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
