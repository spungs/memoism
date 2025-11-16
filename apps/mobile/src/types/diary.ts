/**
 * Diary 관련 타입 정의
 */

import { Location } from './location';

export interface Diary {
  id: string;
  title: string | null;
  content: string;
  images: string[];
  location: Location | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDiaryRequest {
  title?: string;
  content: string;
  images?: string[];
  location?: Location;
}

export interface UpdateDiaryRequest {
  id: string;
  title?: string;
  content?: string;
  images?: string[];
  location?: Location;
}
