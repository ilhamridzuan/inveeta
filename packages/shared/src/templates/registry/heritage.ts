import type { TemplateDefinition } from '../types.js';
import { createFreeTemplate } from './common.js';

export const javaneseHeritage: TemplateDefinition = createFreeTemplate({
  id: 'javanese-heritage',
  name: 'Javanese Classic Heritage',
  description:
    'Sentuhan budaya klasik berwibawa dengan ornamen tradisional, palet emas terracotta, dan tipografi megah.',
  thumbnailSlug: 'javanese-heritage',
  supportedFonts: ['cinzel-lato', 'cormorant-montserrat'],
  defaultFont: 'cinzel-lato',
  defaultCoverLayout: 'minimal-typography',
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
});
