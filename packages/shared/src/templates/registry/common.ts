import type { TemplateSectionIdentifier } from '../types.js';

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

