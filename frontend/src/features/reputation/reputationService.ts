// frontend/src/features/reputation/reputationService.ts
import { ReputationScore, ReviewItem, ZkReputationBadgeProof } from './types';
import { getBackendUrl } from '../../utils/url';

function resolveRepUrl(path: string): string {
  try {
    return getBackendUrl(path);
  } catch {
    return path;
  }
}

class ReputationService {
  /**
   * Получение агрегированного рейтинга и ZK-бейджа пользователя
   */
  public async getUserReputation(alias: string): Promise<ReputationScore> {
    try {
      const res = await fetch(resolveRepUrl(`/api/v1/reputation/score/${encodeURIComponent(alias)}`));
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.reputation) {
          return data.reputation;
        }
      }
    } catch (err) {
      console.warn('[ReputationService] Ошибка запроса скора:', err);
    }

    return {
      user_alias: alias,
      score: 0.0,
      rating_display: 'Newbie / Unrated',
      total_reviews: 0,
      verified_deals_count: 0,
      total_volume_ton: 0.0,
      trust_level: 'neutral',
      trust_percentage: 0,
      zk_badge: 'Unverified',
      top_tags: [],
    };
  }

  /**
   * Получение списка анонимизированных отзывов пользователя
   */
  public async getRecentReviews(alias: string, limit: number = 10): Promise<ReviewItem[]> {
    try {
      const res = await fetch(resolveRepUrl(`/api/v1/reputation/recent-reviews/${encodeURIComponent(alias)}?limit=${limit}`));
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.reviews)) {
          return data.reviews;
        }
      }
    } catch (err) {
      console.warn('[ReputationService] Ошибка загрузки отзывов:', err);
    }
    return [];
  }

  /**
   * Отправка отзыва по 2-фазной схеме Dual-Blind Commit-Reveal
   */
  public async submitDualBlindFeedback(params: {
    interactionId: string;
    targetAlias: string;
    score: number;
    tags: string[];
    depositAgeDays?: number;
  }): Promise<{ ok: boolean; score: number; weight: number }> {
    const { interactionId, targetAlias, score, tags, depositAgeDays = 14 } = params;

    // Генерируем соль и ZK Nullifier
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const userSecret = (typeof localStorage !== 'undefined' ? localStorage.getItem('username') : null) || 'anon_seed';
    const encoder = new TextEncoder();
    const nullifierBuffer = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(`${interactionId}_${userSecret}_nullifier_v1`)
    );
    const nullifierHex = Array.from(new Uint8Array(nullifierBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Считаем запечатанное обязательство: sha256(score_salt_nullifier)
    const commitBuffer = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(`${score}_${salt}_${nullifierHex}`)
    );
    const sealedCommitment = Array.from(new Uint8Array(commitBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // 1. Фаза Commit
    const commitRes = await fetch(resolveRepUrl('/api/v1/reputation/feedback/commit'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interaction_id: interactionId,
        author_nullifier: nullifierHex,
        target_alias: targetAlias,
        sealed_commitment: sealedCommitment,
      }),
    });

    if (!commitRes.ok) {
      const err = await commitRes.json();
      throw new Error(err.detail || 'Ошибка отправки запечатанного отзыва');
    }

    const commitData = await commitRes.json();
    const commitId = commitData.commit_id;

    // 2. Фаза Reveal
    const revealRes = await fetch(resolveRepUrl('/api/v1/reputation/feedback/reveal'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commit_id: commitId,
        score,
        salt,
        tags,
        deposit_age_days: depositAgeDays,
      }),
    });

    if (!revealRes.ok) {
      const err = await revealRes.json();
      throw new Error(err.detail || 'Ошибка раскрытия отзыва');
    }

    const revealData = await revealRes.json();
    return {
      ok: true,
      score: revealData.score,
      weight: revealData.weight,
    };
  }

  /**
   * Запрос генерации ZK-доказательства бейджа репутации
   */
  public async generateZkBadge(params: {
    userAlias: string;
    minScore?: number;
    minDeals?: number;
    minVolumeTon?: number;
  }): Promise<ZkReputationBadgeProof> {
    const res = await fetch(resolveRepUrl('/api/v1/reputation/zk/generate-badge'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_alias: params.userAlias,
        min_score: params.minScore || 4.5,
        min_deals: params.minDeals || 3,
        min_volume_ton: params.minVolumeTon || 100.0,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Ошибка генерации ZK-бейджа репутации');
    }

    return await res.json();
  }
}

export const reputationService = new ReputationService();
