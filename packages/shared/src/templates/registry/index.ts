import type { TemplateDefinition } from '../types.js';
import { minimalistElegance } from './minimalist.js';
import { rusticGarden } from './rustic.js';
import { javaneseHeritage } from './heritage.js';

export { minimalistElegance, rusticGarden, javaneseHeritage };
export * from './common.js';

export const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = {
  [minimalistElegance.id]: minimalistElegance,
  [rusticGarden.id]: rusticGarden,
  [javaneseHeritage.id]: javaneseHeritage,
};

export const TEMPLATE_IDS = [
  minimalistElegance.id,
  rusticGarden.id,
  javaneseHeritage.id,
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const DEFAULT_TEMPLATE_ID: TemplateId = 'minimalist-elegance';

export function getTemplate(id: string): TemplateDefinition | undefined {
  return TEMPLATE_REGISTRY[id];
}

export function isTemplateId(id: string): id is TemplateId {
  return id in TEMPLATE_REGISTRY;
}

export function getAllTemplates(): TemplateDefinition[] {
  return Object.values(TEMPLATE_REGISTRY);
}
