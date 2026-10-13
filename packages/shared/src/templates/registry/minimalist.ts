import type { TemplateDefinition } from '../types.js';

export const minimalistElegance: TemplateDefinition = {
  id: 'minimalist-elegance',
  name: 'Minimalist Elegance',
  description:
    'Desain bersih, modern, dan anggun dengan tipografi serif elegan dan fokus pada foto potret.',
  thumbnailUrl:
    'https://cdn.inveeta.com/templates/thumbnails/minimalist-elegance.webp',
  tier: 'free',
  maxPhotos: 5,
  supportedFonts: ['playfair-inter', 'cormorant-montserrat'],
  defaultFont: 'playfair-inter',
  colorPresets: [
    {
      id: 'warm-sand',
      name: 'Warm Sand',
      primary: '#2D3748',
      secondary: '#E2D9D2',
      accent: '#B7791F',
      background: '#FDFBF7',
    },
    {
      id: 'monochrome',
      name: 'Monochrome Classic',
      primary: '#1A202C',
      secondary: '#EDF2F7',
      accent: '#4A5568',
      background: '#FFFFFF',
    },
  ],
  defaultCustomization: {
    primaryColor: '#2D3748',
    secondaryColor: '#E2D9D2',
    fontFamily: 'playfair-inter',
    coverLayout: 'fullscreen-image',
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
