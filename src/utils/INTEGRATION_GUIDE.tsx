/**
 * INTEGRATION GUIDE: Request Deduplicator
 * 
 * This file shows how to integrate the request deduplicator into AgentChatPage.tsx
 * to prevent Gemini hallucinations and duplicate responses.
 * 
 * MANUAL STEPS REQUIRED:
 * 1. Open src/pages/app/AgentChatPage.tsx
 * 2. Add the import at the top (around line 15-20)
 * 3. Wrap both handleSend and handleQuickAction with the deduplication logic
 */

// ===== STEP 1: ADD IMPORT =====
// Add this import near the top of the file, with other imports:

import { requestDeduplicator } from '@/utils/requestDeduplicator';

// ===== STEP 2: UPDATE handleQuickAction =====
// Find the handleQuickAction function (around line 307) and wrap it like this:

const handleQuickAction = useCallback(async (messageText: string) => {
    if (isTyping || !geminiService.isConfigured()) return;

    // ADD THIS: Check for duplicate requests
    const requestKey = requestDeduplicator.generateKey(messageText);
    if (!requestDeduplicator.shouldProcess(requestKey)) {
        console.log('[AgentChat] Duplicate request blocked (handleQuickAction)');
        return;
    }

    setIsTyping(true);

    try {
        const userMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            role: 'user',
            content: messageText,
            timestamp: new Date().toISOString(),
        };

        // Rest of the existing code...
        // ... (keep all the existing implementation)

    } catch (error) {
        // ... existing error handling ...
    } finally {
        setIsTyping(false);
        // ADD THIS: Mark request as complete
        requestDeduplicator.complete(requestKey);
    }
}, [messages, isTyping, loadPendingIntent, defaultWalletId, defaultChain, privyWalletAddresses, user?.id, queryClient]);

// ===== STEP 3: UPDATE handleSend =====
// Find the handleSend function (around line 485) and wrap it like this:

const handleSend = useCallback(async () => {
    const messageText = input.trim();
    if (!messageText || isTyping) return;

    // Check if Gemini is configured
    if (!geminiService.isConfigured()) {
        toast.error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your environment.');
        return;
    }

    // ADD THIS: Check for duplicate requests
    const requestKey = requestDeduplicator.generateKey(messageText);
    if (!requestDeduplicator.shouldProcess(requestKey)) {
        console.log('[AgentChat] Duplicate request blocked (handleSend)');
        return;
    }

    const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: messageText,
        timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
        // Rest of the existing code...
        // ... (keep all the existing implementation)

    } catch (error) {
        // ... existing error handling ...
    } finally {
        setIsTyping(false);
        // ADD THIS: Mark request as complete
        requestDeduplicator.complete(requestKey);
    }
}, [/* existing dependencies */]);

// ===== TESTING =====
// After integration, test by:
// 1. Sending the same message twice in quick succession
// 2. Check console for: "[RequestDeduplicator] Duplicate request blocked"
// 3. Verify only one Gemini response is generated

// ===== DONE! =====
// The integration is complete. The request deduplicator will now prevent duplicate
// Gemini API calls that cause hallucinations and multiple responses.
