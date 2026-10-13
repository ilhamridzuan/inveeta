import type { TemplateTier } from '../constants/categories.js';

export type TemplateSectionIdentifier =
  | 'cover'
  | 'quote'
  | 'couple'
  | 'story'
  | 'sessions'
  | 'gallery'
  | 'rsvp'
  | 'wishes'
  | 'gift';

export interface ColorPreset {
  id: string;
  name: string;
  primary: string; // HEX code (mis. #4A5568)
  secondary: string; // HEX code (mis. #E2E8F0)
  accent: string; // HEX code (mis. #D69E2E)
  background: string; // HEX code (mis. #F7FAFC)
}

export type SupportedFontFamily =
  | 'playfair-inter'
  | 'cormorant-montserrat'
  | 'cinzel-lato';

export type CoverLayoutType =
  | 'fullscreen-image'
  | 'split-card'
  | 'minimal-typography';

export interface TemplateCustomization {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: SupportedFontFamily;
  coverLayout: CoverLayoutType;
  sectionsOrder: TemplateSectionIdentifier[];
  hiddenSections: TemplateSectionIdentifier[];
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  tier: TemplateTier;
  maxPhotos: number;
  supportedFonts: SupportedFontFamily[];
  defaultFont: SupportedFontFamily;
  colorPresets: ColorPreset[];
  defaultCustomization: TemplateCustomization;
  allowedSections: TemplateSectionIdentifier[];
  requiredSections: TemplateSectionIdentifier[];
}
