import type {
  TemplateDefinition,
  TemplateSectionIdentifier,
  ColorPreset,
  SupportedFontFamily,
  CoverLayoutType,
} from '../types.js';

export const BASE_FREE_SECTIONS_ORDER: TemplateSectionIdentifier[] = [
  'cover',
  'quote',
  'couple',
  'sessions',
  'gallery',
  'rsvp',
  'wishes',
  'gift',
];

export const BASE_FREE_ALLOWED_SECTIONS: TemplateSectionIdentifier[] = [
  ...BASE_FREE_SECTIONS_ORDER,
];

export const BASE_FREE_REQUIRED_SECTIONS: TemplateSectionIdentifier[] = [
  'cover',
  'couple',
  'sessions',
  'rsvp',
];

export const RUSTIC_SECTIONS_ORDER: TemplateSectionIdentifier[] = [
  'cover',
  'quote',
  'couple',
  'story',
  'sessions',
  'gallery',
  'rsvp',
  'wishes',
  'gift',
];

export const RUSTIC_ALLOWED_SECTIONS: TemplateSectionIdentifier[] = [
  ...RUSTIC_SECTIONS_ORDER,
];

export interface FreeTemplateConfig {
  id: string;
  name: string;
  description: string;
  thumbnailSlug: string;
  supportedFonts: SupportedFontFamily[];
  defaultFont: SupportedFontFamily;
  colorPresets: ColorPreset[];
  defaultCoverLayout: CoverLayoutType;
  sectionsOrder?: TemplateSectionIdentifier[];
  allowedSections?: TemplateSectionIdentifier[];
}

export function createFreeTemplate(config: FreeTemplateConfig): TemplateDefinition {
  const primaryPreset = config.colorPresets[0];

  return {
    id: config.id,
    name: config.name,
    description: config.description,
    thumbnailUrl: `https://cdn.inveeta.com/templates/thumbnails/${config.thumbnailSlug}.webp`,
    tier: 'free',
    maxPhotos: 5,
    supportedFonts: config.supportedFonts,
    defaultFont: config.defaultFont,
    colorPresets: config.colorPresets,
    defaultCustomization: {
      primaryColor: primaryPreset ? primaryPreset.primary : '#000000',
      secondaryColor: primaryPreset ? primaryPreset.secondary : '#FFFFFF',
      fontFamily: config.defaultFont,
      coverLayout: config.defaultCoverLayout,
      sectionsOrder: config.sectionsOrder ?? [...BASE_FREE_SECTIONS_ORDER],
      hiddenSections: [],
    },
    allowedSections: config.allowedSections ?? BASE_FREE_ALLOWED_SECTIONS,
    requiredSections: BASE_FREE_REQUIRED_SECTIONS,
  };
}
