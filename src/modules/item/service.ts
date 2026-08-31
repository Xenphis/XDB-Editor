import { invoke } from '@tauri-apps/api/core';
import type { ItemTemplate } from './item_template';

export interface ItemListResult {
  data: ItemTemplate[];
  total: number;
}

export async function getItems(
  search?: string,
  limit?: number,
  offset?: number
): Promise<ItemListResult> {
  return invoke('get_items', { search, limit, offset });
}

export async function getItem(entry: number): Promise<ItemTemplate> {
  return invoke('get_item', { entry });
}

export async function saveItem(item: ItemTemplate): Promise<void> {
  return invoke('save_item', { item });
}

export async function deleteItem(entry: number): Promise<void> {
  return invoke('delete_item', { entry });
}
