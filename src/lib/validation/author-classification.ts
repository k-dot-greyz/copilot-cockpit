import { KNOWN_TEAM_MEMBERS } from '../config/team';
import type { PR } from '../github';

/**
 * Classifies a GitHub account login and account type as 'bot', 'human', or 'external'.
 */
export function classifyAuthor(login: string, type: string): PR['authorType'] {
  if (type === 'Bot' || login.startsWith('app/') || login.includes('[bot]')) {
    return 'bot';
  }
  if (KNOWN_TEAM_MEMBERS.includes(login)) {
    return 'human';
  }
  return 'external';
}
