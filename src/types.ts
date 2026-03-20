export interface User {
  id: string;
  username: string;
  first_name: string;
  is_admin: boolean;
  is_blocked?: boolean;
  telegram_id?: string;
  balance?: number;
  photo_url?: string;
}

export interface UnitMetadata {
  title?: string;
  image_url?: string;
  link?: string;
  description?: string;
  is_for_sale?: boolean;
  group?: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface Unit {
  id: number;
  x: number;
  y: number;
  owner_id: string | null;
  current_price: number;
  sale_price: number;
  metadata: UnitMetadata;
}
