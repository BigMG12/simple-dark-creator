'use client';

import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const DESKTOP = { itemSize: 48, containerSize: 250 };
const MOBILE = { itemSize: 44, containerSize: 200 };
const TIMING = { openStagger: 0.02, closeStagger: 0.07 };

const STYLES = {
  trigger: {
    container:
      'rounded-full flex items-center bg-foreground justify-center cursor-pointer outline-none ring-0 hover:brightness-125 transition-all duration-100 z-50',
    active: 'bg-foreground',
  },
  item: {
    container:
      'rounded-full flex items-center justify-center absolute bg-muted hover:bg-muted/50 cursor-pointer',
    label:
      'pointer-events-none text-[10px] font-medium text-foreground absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap max-w-[80px] text-center',
  },
};

const pointOnCircle = (i: number, n: number, r: number, cx = 0, cy = 0) => {
  const theta = (2 * Math.PI * i) / n - Math.PI / 2;
  const x = cx + r * Math.cos(theta);
  const y = cy + r * Math.sin(theta);
  return { x, y };
};

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  index: number;
  totalItems: number;
  isOpen: boolean;
  onSelect?: (href: string) => void;
  itemSize: number;
  containerSize: number;
  showLabelAlways: boolean;
  skipInitial: boolean;
}

const MenuItem = ({
  icon,
  label,
  href,
  index,
  totalItems,
  isOpen,
  onSelect,
  itemSize,
  containerSize,
  showLabelAlways,
  skipInitial,
}: MenuItemProps) => {
  const { x, y } = pointOnCircle(index, totalItems, containerSize / 2);
  const [hovering, setHovering] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.a
          href={href}
          onClick={(e) => {
            if (onSelect) {
              e.preventDefault();
              onSelect(href);
            }
          }}
          initial={skipInitial ? false : { x: 0, y: 0, opacity: 0, scale: 0.5 }}
          animate={{ x, y, opacity: 1, scale: 1 }}
          exit={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
          transition={{
            delay: skipInitial ? 0 : index * TIMING.openStagger,
            type: 'spring',
            stiffness: 260,
            damping: 22,
          }}
          style={{ height: itemSize, width: itemSize }}
          className={STYLES.item.container}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          {icon}
          {(showLabelAlways || hovering) && (
            <span className={STYLES.item.label}>{label}</span>
          )}
        </motion.a>
      )}
    </AnimatePresence>
  );
};

interface MenuTriggerProps {
  setIsOpen: (isOpen: boolean) => void;
  isOpen: boolean;
  itemsLength: number;
  closeAnimationCallback: () => void;
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
  itemSize: number;
}

const MenuTrigger = ({
  setIsOpen,
  isOpen,
  itemsLength,
  closeAnimationCallback,
  openIcon,
  closeIcon,
  itemSize,
}: MenuTriggerProps) => {
  const animate = useAnimationControls();
  const shakeAnimation = useAnimationControls();

  const scaleTransition = Array.from({ length: Math.max(itemsLength - 1, 1) })
    .map((_, index) => index + 1)
    .reduce((acc, _, index) => {
      acc.push(1 + index * 0.15);
      return acc;
    }, [] as number[]);

  const closeAnimation = async () => {
    shakeAnimation.start({
      translateX: [0, 2, -2, 0, 2, -2, 0],
      transition: {
        duration: TIMING.closeStagger,
        ease: 'linear',
        repeat: Infinity,
        repeatType: 'loop',
      },
    });

    for (let i = 0; i < scaleTransition.length; i++) {
      await animate.start({
        height: Math.min(itemSize * scaleTransition[i], itemSize + itemSize / 2),
        width: Math.min(itemSize * scaleTransition[i], itemSize + itemSize / 2),
        transition: { duration: TIMING.closeStagger / 2, ease: 'linear' },
      });
      if (i !== scaleTransition.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, TIMING.closeStagger * 1000));
      }
    }

    shakeAnimation.stop();
    shakeAnimation.start({ translateX: 0, transition: { duration: 0 } });

    animate.start({
      height: itemSize,
      width: itemSize,
      transition: { duration: 0.1, ease: 'backInOut' },
    });
  };

  return (
    <motion.div animate={shakeAnimation} className="z-50">
      <motion.button
        animate={animate}
        style={{ height: itemSize, width: itemSize }}
        className={cn(STYLES.trigger.container, isOpen && STYLES.trigger.active)}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            closeAnimationCallback();
            closeAnimation();
          } else {
            setIsOpen(true);
          }
        }}
      >
        <AnimatePresence mode="popLayout">
          {isOpen ? (
            <motion.span
              key="menu-close"
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(10px)' }}
              transition={{ duration: 0.2 }}
            >
              {closeIcon}
            </motion.span>
          ) : (
            <motion.span
              key="menu-open"
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(10px)' }}
              transition={{ duration: 0.2 }}
            >
              {openIcon}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
};

interface CircleMenuProps {
  items: Array<{ label: string; icon: React.ReactNode; href: string }>;
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
  onSelect?: (href: string) => void;
  defaultOpen?: boolean;
}

const CircleMenu = ({
  items,
  openIcon = <Menu size={18} className="text-background" />,
  closeIcon = <X size={18} className="text-background" />,
  onSelect,
  defaultOpen = false,
}: CircleMenuProps) => {
  const isMobile = useIsMobile();
  const sizes = isMobile ? MOBILE : DESKTOP;

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [hasInteracted, setHasInteracted] = useState(false);
  const animate = useAnimationControls();

  const closeAnimationCallback = async () => {
    await animate.start({
      rotate: -360,
      transition: {
        duration: TIMING.closeStagger * (items.length + 2),
        ease: 'linear',
      },
    });
    await animate.start({
      rotate: 0,
      transition: { duration: 0 },
    });
  };

  const skipInitial = defaultOpen && !hasInteracted;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height: sizes.containerSize, width: sizes.containerSize }}
    >
      <MenuTrigger
        isOpen={isOpen}
        setIsOpen={(v) => {
          setHasInteracted(true);
          setIsOpen(v);
        }}
        itemsLength={items.length}
        closeAnimationCallback={closeAnimationCallback}
        openIcon={openIcon}
        closeIcon={closeIcon}
        itemSize={sizes.itemSize}
      />
      <motion.div animate={animate} className="absolute inset-0 flex items-center justify-center">
        {items.map((item, index) => (
          <MenuItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            href={item.href}
            index={index}
            totalItems={items.length}
            isOpen={isOpen}
            onSelect={onSelect}
            itemSize={sizes.itemSize}
            containerSize={sizes.containerSize}
            showLabelAlways={isMobile}
            skipInitial={skipInitial}
          />
        ))}
      </motion.div>
    </div>
  );
};

export { CircleMenu };
