import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '@/types';

// Cache for tracking last saved message count to avoid unnecessary saves
const lastSavedCountCache = new Map<string, number>();

/**
 * Save chat messages to Supabase (optimized with incremental updates)
 */
export async function saveChatMessages(
  userId: string,
  messages: ChatMessage[]
): Promise<void> {
  try {
    // Filter out welcome message and system messages
    const messagesToSave = messages
      .filter(msg => msg.id !== 'welcome' && msg.role !== 'system')
      .map(msg => ({
        user_id: userId,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        intent_id: msg.intentId || null,
        tool_calls: msg.toolCalls ? JSON.stringify(msg.toolCalls) : null,
      }));

    if (messagesToSave.length === 0) return;

    // Check if we need to save (avoid unnecessary operations)
    const lastCount = lastSavedCountCache.get(userId) || 0;
    if (lastCount === messagesToSave.length) {
      // Count matches, skip save (messages haven't changed)
      return;
    }

    // Use upsert instead of delete+insert for better performance
    // This will update existing messages and insert new ones
    const { error } = await supabase
      .from('chat_messages')
      .upsert(messagesToSave, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('Error saving chat messages:', error);
      // Fallback to delete+insert if upsert fails (for compatibility)
      await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userId);
      
      if (messagesToSave.length > 0) {
        const { error: insertError } = await supabase
          .from('chat_messages')
          .insert(messagesToSave);
        
        if (insertError) {
          throw insertError;
        }
      }
    } else {
      // Update cache
      lastSavedCountCache.set(userId, messagesToSave.length);
    }
  } catch (error) {
    console.error('Failed to save chat messages:', error);
    throw error;
  }
}

/**
 * Load chat messages from Supabase (optimized with limit and caching)
 */
export async function loadChatMessages(
  userId: string,
  options?: { limit?: number }
): Promise<ChatMessage[]> {
  try {
    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true });

    // Limit results for better performance (default: last 100 messages)
    const limit = options?.limit || 100;
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error loading chat messages:', error);
      return [];
    }

    if (!data) return [];

    const messages = data.map((msg: any) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      timestamp: msg.timestamp,
      intentId: msg.intent_id || undefined,
      toolCalls: msg.tool_calls ? JSON.parse(msg.tool_calls) : undefined,
    }));

    // Update cache
    lastSavedCountCache.set(userId, messages.length);

    return messages;
  } catch (error) {
    console.error('Failed to load chat messages:', error);
    return [];
  }
}

/**
 * Clear chat messages for a user
 */
export async function clearChatMessages(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing chat messages:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to clear chat messages:', error);
    throw error;
  }
}
