import { Router } from 'express';
import { storage } from '../lib/storage.js';
import crypto from 'crypto';

const router = Router();

// Generate API key for workspace
router.post('/:workspaceId/api-keys', (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name } = req.body;
    
    // Verify workspace exists
    const workspace = storage.getWorkspace(workspaceId);
    if (!workspace) {
      return res.status(404).json({ 
        error: 'Workspace not found',
        details: `Workspace with ID ${workspaceId} does not exist`
      });
    }
    
    // Generate API key
    const apiKeyId = `ak_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const apiKey = `omni_${crypto.randomBytes(32).toString('hex')}`;
    
    const apiKeyData = {
      id: apiKeyId,
      workspaceId,
      key: apiKey,
      name: name || 'API Key',
      createdAt: new Date().toISOString(),
    };
    
    storage.saveApiKey(apiKeyData);
    
    res.status(201).json({
      id: apiKeyId,
      key: apiKey, // Only return the key once on creation
      name: apiKeyData.name,
      createdAt: apiKeyData.createdAt,
      workspaceId,
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({
      error: 'Failed to generate API key',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Get all API keys for a workspace
router.get('/:workspaceId/api-keys', (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    // Verify workspace exists
    const workspace = storage.getWorkspace(workspaceId);
    if (!workspace) {
      return res.status(404).json({ 
        error: 'Workspace not found',
        details: `Workspace with ID ${workspaceId} does not exist`
      });
    }
    
    const apiKeys = storage.getApiKeysByWorkspace(workspaceId);
    
    // Don't return the actual key values for security
    const safeApiKeys = apiKeys.map(ak => ({
      id: ak.id,
      name: ak.name,
      createdAt: ak.createdAt,
      lastUsed: ak.lastUsed,
      workspaceId: ak.workspaceId,
      // Show masked key
      key: `${ak.key.substring(0, 8)}...${ak.key.substring(ak.key.length - 4)}`,
    }));
    
    res.json(safeApiKeys);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({
      error: 'Failed to fetch API keys',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Delete workspace
router.delete('/:workspaceId', (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    // Verify workspace exists
    const workspace = storage.getWorkspace(workspaceId);
    if (!workspace) {
      return res.status(404).json({ 
        error: 'Workspace not found',
        details: `Workspace with ID ${workspaceId} does not exist`
      });
    }
    
    // Prevent deleting the default workspace
    if (workspaceId === 'ws_1') {
      return res.status(400).json({
        error: 'Cannot delete default workspace',
        details: 'The default workspace cannot be deleted'
      });
    }
    
    // Delete workspace and all associated data
    const deleted = storage.deleteWorkspace(workspaceId);
    
    if (!deleted) {
      return res.status(500).json({
        error: 'Failed to delete workspace',
        details: 'Workspace deletion failed'
      });
    }
    
    res.json({ 
      success: true,
      message: `Workspace ${workspaceId} and all associated data have been deleted`
    });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    res.status(500).json({
      error: 'Failed to delete workspace',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export { router as workspacesRouter };
