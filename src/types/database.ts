export interface Profile {
  id: string;
  display_name: string | null;
  safe_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface World {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  lore: string | null;
  rules: string | null;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  user_id: string;
  world_id: string | null;
  name: string;
  avatar_url: string | null;
  description: string | null;
  personality: string | null;
  backstory: string | null;
  speaking_style: string | null;
  rules: string | null;
  example_messages: string | null;
  is_rpg_enabled: boolean;
  base_stats: RPGStats;
  created_at: string;
  updated_at: string;
  world?: World | null;
}

export interface ChatSession {
  id: string;
  user_id: string;
  character_id: string;
  title: string | null;
  is_rpg_mode: boolean;
  rpg_state: RPGState;
  created_at: string;
  updated_at: string;
  character?: Character;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  is_dice_roll: boolean;
  dice_result: DiceResult | null;
  created_at: string;
}

export interface MemoryEntry {
  id: string;
  user_id: string;
  character_id: string | null;
  world_id: string | null;
  content: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
}

export interface RPGStats {
  hp: number;
  max_hp: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  charisma: number;
}

export interface RPGState {
  hp: number;
  max_hp: number;
  inventory: string[];
  skills: string[];
  status_effects: string[];
}

export interface DiceResult {
  dice: string;
  rolls: number[];
  total: number;
  modifier?: number;
}
