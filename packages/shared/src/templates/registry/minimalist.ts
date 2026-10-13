import type { TemplateDefinition } from '../types.js';
import { createFreeTemplate } from './common.js';

export const minimalistElegance: TemplateDefinition = createFreeTemplate({
  id: 'minimalist-elegance',
  name: 'Minimalist Elegance',
  description:
    'Desain bersih, modern, dan anggun dengan tipografi serif elegan dan fokus pada foto potret.',
  thumbnailSlug: 'minimalist-elegance',
  supportedFonts: ['playfair-inter', 'cormorant-montserrat'],
  defaultFont: 'playfair-inter',
  defaultCoverLayout: 'fullscreen-image',
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
});
