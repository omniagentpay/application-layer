import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '@/types';

/**
 * Save chat messages to Supabase
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

    // Delete existing messages for this user and insert new ones
    // This ensures we always have the latest chat history
    await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', userId);

    if (messagesToSave.length > 0) {
      const { error } = await supabase
        .from('chat_messages')
        .insert(messagesToSave);

      if (error) {
        console.error('Error saving chat messages:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Failed to save chat messages:', error);
    throw error;
  }
}

/**
 * Load chat messages from Supabase
 */
export async function loadChatMessages(userId: string): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error loading chat messages:', error);
      return [];
    }

    if (!data) return [];

    return data.map((msg: any) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      timestamp: msg.timestamp,
      intentId: msg.intent_id || undefined,
      toolCalls: msg.tool_calls ? JSON.parse(msg.tool_calls) : undefined,
    }));
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
