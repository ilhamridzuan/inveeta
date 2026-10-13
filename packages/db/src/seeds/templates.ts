export interface TemplateDefinition {
  id: string;
  name: string;
  tier: 'free' | 'premium';
  maxPhotos: number;
  allowedSections: readonly string[];
}

export const DEFAULT_TEMPLATES: readonly TemplateDefinition[] = [
  {
    id: 'minimalist-elegance',
    name: 'Minimalist Elegance',
    tier: 'free',
    maxPhotos: 5,
    allowedSections: [
      'cover',
      'quote',
      'bride-groom',
      'sessions',
      'gallery',
      'rsvp',
      'wishes',
      'gift',
    ],
  },
  {
    id: 'rustic-garden',
    name: 'Rustic Garden Floral',
    tier: 'free',
    maxPhotos: 8,
    allowedSections: [
      'cover',
      'quote',
      'bride-groom',
      'story',
      'sessions',
      'gallery',
      'rsvp',
      'wishes',
      'gift',
    ],
  },
  {
    id: 'javanese-heritage',
    name: 'Javanese Classic Heritage',
    tier: 'free',
    maxPhotos: 6,
    allowedSections: [
      'cover',
      'quote',
      'bride-groom',
      'traditional-event',
      'sessions',
      'gallery',
      'rsvp',
      'wishes',
      'gift',
    ],
  },
] as const;
