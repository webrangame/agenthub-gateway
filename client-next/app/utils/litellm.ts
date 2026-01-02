// LiteLLM API utilities for fetching user keys and information
// Note: Direct API calls should go through backend proxy for security

const LITELLM_API_BASE = process.env.NEXT_PUBLIC_LITELLM_API_URL || 'https://swzissb82u.us-east-1.awsapprunner.com';

export interface LiteLLMKeyInfo {
  key?: string;
  keyName?: string;
  tpmLimit?: number;
  rpmLimit?: number;
  spent?: number;
  user_id?: string;
}

export interface LiteLLMUserInfo {
  user_id: string;
  keys?: Array<{
    key: string;
    key_name?: string;
    tpm_limit?: number;
    rpm_limit?: number;
    spend?: number;
  }>;
  spend?: number;
}

/**
 * Fetch LiteLLM user information via backend proxy
 * The backend will use the master key to fetch user info from LiteLLM API
 */
export async function fetchLiteLLMUserInfo(userId: string): Promise<LiteLLMUserInfo | null> {
  try {
    const response = await fetch(`/api/litellm/user-info?user_id=${encodeURIComponent(userId)}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[fetchLiteLLMUserInfo] Failed to fetch:', response.status);
      return null;
    }

    const data = await response.json();
    return data as LiteLLMUserInfo;
  } catch (error) {
    console.error('[fetchLiteLLMUserInfo] Error:', error);
    return null;
  }
}

/**
 * Convert LiteLLM API response to our key info format
 */
export function convertLiteLLMKeysToKeyInfo(userInfo: LiteLLMUserInfo): LiteLLMKeyInfo[] {
  if (!userInfo?.keys || userInfo.keys.length === 0) {
    return [];
  }

  return userInfo.keys.map((key) => ({
    key: key.key,
    keyName: key.key_name || 'API Key',
    tpmLimit: key.tpm_limit,
    rpmLimit: key.rpm_limit,
    spent: key.spend,
    user_id: userInfo.user_id,
  }));
}
