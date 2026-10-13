import type { TemplateDefinition } from '../types.js';

export const rusticGarden: TemplateDefinition = {
  id: 'rustic-garden',
  name: 'Rustic Garden Floral',
  description:
    'Nuansa hangat pedesaan dan botani sage dengan aksen flora alami dan tata letak organik.',
  thumbnailUrl:
    'https://cdn.inveeta.com/templates/thumbnails/rustic-garden.webp',
  tier: 'free',
  maxPhotos: 5,
  supportedFonts: ['cormorant-montserrat', 'playfair-inter'],
  defaultFont: 'cormorant-montserrat',
  colorPresets: [
    {
      id: 'sage-botanical',
      name: 'Sage Botanical',
      primary: '#2F3E46',
      secondary: '#CAD2C5',
      accent: '#52796F',
      background: '#F4F7F5',
    },
    {
      id: 'terracotta-earth',
      name: 'Terracotta Earth',
      primary: '#5C3D2E',
      secondary: '#E0C097',
      accent: '#B85D19',
      background: '#FAF7F2',
    },
  ],
  defaultCustomization: {
    primaryColor: '#2F3E46',
    secondaryColor: '#CAD2C5',
    fontFamily: 'cormorant-montserrat',
    coverLayout: 'split-card',
    sectionsOrder: [
      'cover',
      'quote',
      'couple',
      'story',
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
    'story',
    'sessions',
    'gallery',
    'rsvp',
    'wishes',
    'gift',
  ],
  requiredSections: ['cover', 'couple', 'sessions', 'rsvp'],
};
