import { z } from 'zod';
import { createWishSchema } from '../schemas/wish.schema.js';

export type CreateWishInput = z.infer<typeof createWishSchema>;

export interface WishDTO {
  id: string;
  senderName: string;
  message: string;
  senderRelation: string | null;
  createdAt: string;
}

export interface PaginatedWishesDTO {
  wishes: WishDTO[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ManageWishItemDTO {
  id: string;
  eventId: string;
  guestId: string | null;
  senderName: string;
  message: string;
  senderRelation: string | null;
  isHidden: boolean;
  createdAt: string;
}

export interface PaginatedManageWishesDTO {
  items: ManageWishItemDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
