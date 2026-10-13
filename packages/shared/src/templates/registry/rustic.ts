import type { TemplateDefinition } from '../types.js';
import {
  createFreeTemplate,
  RUSTIC_SECTIONS_ORDER,
  RUSTIC_ALLOWED_SECTIONS,
} from './common.js';

export const rusticGarden: TemplateDefinition = createFreeTemplate({
  id: 'rustic-garden',
  name: 'Rustic Garden Floral',
  description:
    'Nuansa hangat pedesaan dan botani sage dengan aksen flora alami dan tata letak organik.',
  thumbnailSlug: 'rustic-garden',
  supportedFonts: ['cormorant-montserrat', 'playfair-inter'],
  defaultFont: 'cormorant-montserrat',
  defaultCoverLayout: 'split-card',
  sectionsOrder: RUSTIC_SECTIONS_ORDER,
  allowedSections: RUSTIC_ALLOWED_SECTIONS,
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
});
