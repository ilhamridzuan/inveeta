import type { TemplateDefinition } from '../types.js';

export const javaneseHeritage: TemplateDefinition = {
  id: 'javanese-heritage',
  name: 'Javanese Classic Heritage',
  description:
    'Sentuhan budaya klasik berwibawa dengan ornamen tradisional, palet emas terracotta, dan tipografi megah.',
  thumbnailUrl:
    'https://cdn.inveeta.com/templates/thumbnails/javanese-heritage.webp',
  tier: 'free',
  maxPhotos: 5,
  supportedFonts: ['cinzel-lato', 'cormorant-montserrat'],
  defaultFont: 'cinzel-lato',
  colorPresets: [
    {
      id: 'royal-gold',
      name: 'Royal Gold & Terracotta',
      primary: '#4A2E18',
      secondary: '#F4E8C1',
      accent: '#C59B27',
      background: '#FDFBF7',
    },
    {
      id: 'deep-mahogany',
      name: 'Deep Mahogany',
      primary: '#36190D',
      secondary: '#EBD4B4',
      accent: '#9E5727',
      background: '#F8F5F0',
    },
  ],
  defaultCustomization: {
    primaryColor: '#4A2E18',
    secondaryColor: '#F4E8C1',
    fontFamily: 'cinzel-lato',
    coverLayout: 'minimal-typography',
    sectionsOrder: [
      'cover',
      'quote',
      'couple',
      'sessions',
      'gallery',
      'rsvp',
      'wishes',
      'gift',
    ],
    hiddenSections: [],
  },
  allowedSections: [
    'cover',
    'quote',
    'couple',
    'sessions',
    'gallery',
    'rsvp',
    'wishes',
    'gift',
  ],
  requiredSections: ['cover', 'couple', 'sessions', 'rsvp'],
};
