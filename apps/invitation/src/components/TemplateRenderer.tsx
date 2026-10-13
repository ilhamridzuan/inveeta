import React from 'react';
import type { PublicEventDTO } from '@inveeta/shared';

import { CoverSection } from './static/CoverSection';
import { QuoteSection } from './static/QuoteSection';
import { CoupleSection } from './static/CoupleSection';
import { LoveStorySection } from './static/LoveStorySection';
import { PublicSessions } from './static/PublicSessions';
import { PhotoGallery } from './static/PhotoGallery';
import { DigitalGiftSection } from './static/DigitalGiftSection';

const SECTION_COMPONENTS: Record<
  string,
  React.ComponentType<{ event: PublicEventDTO }>
> = {
  cover: CoverSection,
  quote: QuoteSection,
  couple: CoupleSection,
  story: LoveStorySection,
  sessions: PublicSessions,
  gallery: PhotoGallery,
  gift: DigitalGiftSection,
};

interface TemplateRendererProps {
  event: PublicEventDTO;
}

/**
 * Dynamic Section Template Engine (TDD §10.2).
 * Menyuntikkan CSS Variables tema ke root element dan merender
 * urutan section berdasarkan konfigurasi visual Host.
 */
export function TemplateRenderer({ event }: TemplateRendererProps) {
  const { visualCustomization } = event;
  const sectionsOrder = visualCustomization?.sectionsOrder || [
    'cover',
    'quote',
    'couple',
    'sessions',
    'gallery',
    'gift',
  ];
  const hiddenSections = visualCustomization?.hiddenSections || [];
  const primaryColor = visualCustomization?.primaryColor || '#2D3748';
  const secondaryColor = visualCustomization?.secondaryColor || '#E2D9D2';
  const fontFamily = visualCustomization?.fontFamily || 'playfair-inter';

  const customStyles: React.CSSProperties = {
    '--color-primary': primaryColor,
    '--color-secondary': secondaryColor,
    '--font-theme': fontFamily,
  } as React.CSSProperties;

  return (
    <div
      className={`template-root min-h-screen text-[var(--color-primary)] font-${fontFamily}`}
      style={customStyles}
    >
      {sectionsOrder.map((sectionId) => {
        if (hiddenSections.includes(sectionId)) return null;

        const Component = SECTION_COMPONENTS[sectionId];
        if (!Component) return null;

        return <Component key={sectionId} event={event} />;
      })}
    </div>
  );
}
