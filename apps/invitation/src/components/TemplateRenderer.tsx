import React from 'react';
import type { PublicEventDTO } from '@inveeta/shared';

import { CoverSection } from './static/CoverSection';
import { QuoteSection } from './static/QuoteSection';
import { CoupleSection } from './static/CoupleSection';
import { LoveStorySection } from './static/LoveStorySection';
import { PublicSessions } from './static/PublicSessions';
import { PhotoGallery } from './static/PhotoGallery';
import { DigitalGiftSection } from './static/DigitalGiftSection';

// Client Component Islands
import { CoverModal } from './dynamic/CoverModal';
import { BgmPlayerIsland } from './dynamic/BgmPlayerIsland';
import { GuestGreetingIsland } from './dynamic/GuestGreetingIsland';
import { RsvpInteractiveForm } from './dynamic/RsvpInteractiveForm';
import { LiveWishesIsland } from './dynamic/LiveWishesIsland';

interface SectionProps {
  readonly event: PublicEventDTO;
  readonly token?: string;
}

function RsvpSectionWrapper({ event, token }: Readonly<SectionProps>) {
  return (
    <RsvpInteractiveForm
      slug={event.slug}
      token={token || ''}
      eventId={event.id}
    />
  );
}

function WishesSectionWrapper({ event }: Readonly<SectionProps>) {
  return <LiveWishesIsland eventId={event.id} slug={event.slug} />;
}

const SECTION_COMPONENTS: Record<
  string,
  React.ComponentType<SectionProps>
> = {
  cover: CoverSection,
  quote: QuoteSection,
  couple: CoupleSection,
  story: LoveStorySection,
  sessions: PublicSessions,
  gallery: PhotoGallery,
  gift: DigitalGiftSection,
  rsvp: RsvpSectionWrapper,
  wishes: WishesSectionWrapper,
};

interface TemplateRendererProps {
  readonly event: PublicEventDTO;
  readonly token?: string;
}

/**
 * Dynamic Section Template Engine (TDD §7.4, §10.2).
 * Menyuntikkan CSS Variables tema ke root element, memuat Server Component statis (0 KB JS),
 * dan menyisipkan Client Component Islands untuk fitur interaktif & personal.
 */
export function TemplateRenderer({
  event,
  token,
}: Readonly<TemplateRendererProps>) {
  const { visualCustomization } = event;
  const sectionsOrder = visualCustomization?.sectionsOrder || [
    'cover',
    'quote',
    'couple',
    'sessions',
    'gallery',
    'rsvp',
    'wishes',
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

  const musicMedia = event.media.find((m) => m.mediaType === 'audio');

  return (
    <div
      className={`template-root min-h-screen text-[var(--color-primary)] font-${fontFamily}`}
      style={customStyles}
    >
      {/* 1. Modal Pembuka Layar Penuh (Autoplay Policy Workaround) */}
      <CoverModal event={event} />

      {/* 2. Floating Audio Player Island */}
      <BgmPlayerIsland musicUrl={musicMedia?.fileUrl} />

      {/* 3. Render Dinamis Urutan Section Acara */}
      {sectionsOrder.map((sectionId) => {
        if (hiddenSections.includes(sectionId)) return null;

        if (sectionId === 'cover') {
          return (
            <React.Fragment key="cover">
              <CoverSection event={event} />
              {token && <GuestGreetingIsland slug={event.slug} token={token} />}
            </React.Fragment>
          );
        }

        const Component = SECTION_COMPONENTS[sectionId];
        if (!Component) return null;

        return <Component key={sectionId} event={event} token={token} />;
      })}
    </div>
  );
}
