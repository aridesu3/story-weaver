import { supabase } from '@/integrations/supabase/client';
import type { Character, World, ChatSession, Message, MemoryEntry, Profile, RPGState, RPGStats, DiceResult } from '@/types/database';
import type { Json } from '@/integrations/supabase/types';

// Profile helpers
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data as unknown as Profile;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { error } = await supabase
    .from('profiles')
    .update(updates as Record<string, unknown>)
    .eq('id', userId);
  
  if (error) throw error;
}

// Character helpers
export async function getCharacters(userId: string): Promise<Character[]> {
  const { data, error } = await supabase
    .from('characters')
    .select('*, world:worlds(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching characters:', error);
    return [];
  }
  return (data || []).map(c => ({
    ...c,
    base_stats: c.base_stats as unknown as RPGStats,
    world: c.world as unknown as World | null,
  })) as Character[];
}

export async function getCharacter(characterId: string): Promise<Character | null> {
  const { data, error } = await supabase
    .from('characters')
    .select('*, world:worlds(*)')
    .eq('id', characterId)
    .single();
  
  if (error) {
    console.error('Error fetching character:', error);
    return null;
  }
  return {
    ...data,
    base_stats: data.base_stats as unknown as RPGStats,
    world: data.world as unknown as World | null,
  } as Character;
}

export async function createCharacter(character: Omit<Character, 'id' | 'created_at' | 'updated_at'>) {
  const insertData = {
    ...character,
    base_stats: character.base_stats as unknown as Json,
  };
  const { data, error } = await supabase
    .from('characters')
    .insert(insertData)
    .select()
    .single();
  
  if (error) throw error;
  return {
    ...data,
    base_stats: data.base_stats as unknown as RPGStats,
  } as Character;
}

export async function updateCharacter(characterId: string, updates: Partial<Character>) {
  const updateData = {
    ...updates,
    base_stats: updates.base_stats ? (updates.base_stats as unknown as Json) : undefined,
  };
  const { error } = await supabase
    .from('characters')
    .update(updateData)
    .eq('id', characterId);
  
  if (error) throw error;
}

export async function deleteCharacter(characterId: string) {
  const { error } = await supabase
    .from('characters')
    .delete()
    .eq('id', characterId);
  
  if (error) throw error;
}

// World helpers
export async function getWorlds(userId: string): Promise<World[]> {
  const { data, error } = await supabase
    .from('worlds')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching worlds:', error);
    return [];
  }
  return data as World[];
}

export async function createWorld(world: Omit<World, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('worlds')
    .insert(world)
    .select()
    .single();
  
  if (error) throw error;
  return data as World;
}

export async function updateWorld(worldId: string, updates: Partial<World>) {
  const { error } = await supabase
    .from('worlds')
    .update(updates)
    .eq('id', worldId);
  
  if (error) throw error;
}

export async function deleteWorld(worldId: string) {
  const { error } = await supabase
    .from('worlds')
    .delete()
    .eq('id', worldId);
  
  if (error) throw error;
}

// Chat session helpers
export async function getChatSessions(characterId: string): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*, character:characters(*)')
    .eq('character_id', characterId)
    .order('updated_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching chat sessions:', error);
    return [];
  }
  return (data || []).map(s => ({
    ...s,
    rpg_state: s.rpg_state as unknown as RPGState,
    character: s.character ? {
      ...s.character,
      base_stats: s.character.base_stats as unknown as RPGStats,
    } : undefined,
  })) as ChatSession[];
}

export async function getChatSession(sessionId: string): Promise<ChatSession | null> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*, character:characters(*, world:worlds(*))')
    .eq('id', sessionId)
    .single();
  
  if (error) {
    console.error('Error fetching chat session:', error);
    return null;
  }
  return {
    ...data,
    rpg_state: data.rpg_state as unknown as RPGState,
    character: data.character ? {
      ...data.character,
      base_stats: data.character.base_stats as unknown as RPGStats,
      world: data.character.world as unknown as World | null,
    } : undefined,
  } as ChatSession;
}

export async function createChatSession(session: Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>) {
  const insertData = {
    ...session,
    rpg_state: session.rpg_state as unknown as Json,
    character: undefined,
  };
  delete (insertData as any).character;
  
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert(insertData)
    .select()
    .single();
  
  if (error) throw error;
  return {
    ...data,
    rpg_state: data.rpg_state as unknown as RPGState,
  } as ChatSession;
}

export async function updateChatSession(sessionId: string, updates: Partial<ChatSession>) {
  const updateData = {
    ...updates,
    rpg_state: updates.rpg_state ? (updates.rpg_state as unknown as Json) : undefined,
    character: undefined,
  };
  delete (updateData as any).character;
  
  const { error } = await supabase
    .from('chat_sessions')
    .update(updateData)
    .eq('id', sessionId);
  
  if (error) throw error;
}

export async function deleteChatSession(sessionId: string) {
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId);
  
  if (error) throw error;
}

// Message helpers
export async function getMessages(sessionId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
  return (data || []).map(m => ({
    ...m,
    role: m.role as 'user' | 'assistant' | 'system',
    dice_result: m.dice_result as unknown as DiceResult | null,
  })) as Message[];
}

export async function createMessage(message: Omit<Message, 'id' | 'created_at'>) {
  const insertData = {
    ...message,
    dice_result: message.dice_result as unknown as Json,
  };
  const { data, error } = await supabase
    .from('messages')
    .insert(insertData)
    .select()
    .single();
  
  if (error) throw error;
  return {
    ...data,
    role: data.role as 'user' | 'assistant' | 'system',
    dice_result: data.dice_result as unknown as DiceResult | null,
  } as Message;
}

// Memory helpers
export async function getMemories(characterId?: string, worldId?: string): Promise<MemoryEntry[]> {
  let query = supabase
    .from('memory_entries')
    .select('*')
    .eq('is_pinned', true);
  
  if (characterId) {
    query = query.eq('character_id', characterId);
  }
  if (worldId) {
    query = query.eq('world_id', worldId);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching memories:', error);
    return [];
  }
  return data as MemoryEntry[];
}

export async function createMemory(memory: Omit<MemoryEntry, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('memory_entries')
    .insert(memory)
    .select()
    .single();
  
  if (error) throw error;
  return data as MemoryEntry;
}

export async function deleteMemory(memoryId: string) {
  const { error } = await supabase
    .from('memory_entries')
    .delete()
    .eq('id', memoryId);
  
  if (error) throw error;
}

// Dice rolling utility
export function rollDice(diceNotation: string): { dice: string; rolls: number[]; total: number } {
  const match = diceNotation.match(/(\d+)d(\d+)([+-]\d+)?/i);
  if (!match) {
    return { dice: diceNotation, rolls: [], total: 0 };
  }

  const numDice = parseInt(match[1]);
  const numSides = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;

  const rolls: number[] = [];
  for (let i = 0; i < numDice; i++) {
    rolls.push(Math.floor(Math.random() * numSides) + 1);
  }

  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;

  return { dice: diceNotation, rolls, total };
}
