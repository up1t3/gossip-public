// frontend/src/features/sel/selService.ts
import { SelIntent, DvPEscrowContract, ZkSolvencyAttestation, SelCategory } from './types';
import { getBackendUrl } from '../../utils/url';

function resolveSelUrl(path: string): string {
  try {
    return getBackendUrl(path);
  } catch {
    return path;
  }
}

class SelService {
  /**
   * Поиск намерений в Sovereign Economic Layer
   */
  public async searchIntents(category?: SelCategory, query?: string): Promise<SelIntent[]> {
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (query) params.append('query', query);

      const res = await fetch(resolveSelUrl(`/api/v1/sel/intents/search?${params.toString()}`));
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.intents)) {
          return data.intents;
        }
      }
    } catch (err) {
      console.warn('[SelService] Ошибка поиска интентов:', err);
    }
    return [];
  }

  /**
   * Публикация нового намерения
   */
  public async publishIntent(intent: Partial<SelIntent>): Promise<{ ok: boolean; intent_id?: string; simhash?: string; message?: string }> {
    try {
      const res = await fetch(resolveSelUrl('/api/v1/sel/intents/publish'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intent),
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json();
      throw new Error(err.detail || 'Ошибка публикации намерения');
    } catch (e: any) {
      console.error('[SelService] Ошибка:', e);
      throw e;
    }
  }

  /**
   * Получение списка эскроу контрактов
   */
  public async getEscrows(): Promise<DvPEscrowContract[]> {
    try {
      const res = await fetch(resolveSelUrl('/api/v1/sel/escrows'));
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.escrows)) {
          return data.escrows;
        }
      }
    } catch (err) {
      console.warn('[SelService] Ошибка загрузки эскроу:', err);
    }
    return [];
  }

  /**
   * Создание нового DvP Smart-Escrow контракта
   */
  public async createEscrow(payload: {
    title: string;
    buyer_alias: string;
    seller_alias: string;
    amount_usdt: string;
    amount_ton: string;
    commodity: string;
    oracle_type: string;
    collateral_ton?: string;
  }): Promise<DvPEscrowContract> {
    const res = await fetch(resolveSelUrl('/api/v1/sel/escrows/create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      return data.escrow;
    }
    const err = await res.json();
    throw new Error(err.detail || 'Ошибка создания эскроу');
  }

  /**
   * Продвижение фазы эскроу по оракульному пруфу
   */
  public async advanceEscrowStage(escrowId: string, oracleProof?: string): Promise<DvPEscrowContract> {
    const res = await fetch(resolveSelUrl(`/api/v1/sel/escrows/${encodeURIComponent(escrowId)}/advance`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oracle_proof: oracleProof || 'SGS/AIS Oracle Auto-Attested' }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.escrow;
    }
    const err = await res.json();
    throw new Error(err.detail || 'Ошибка обновления фазы эскроу');
  }

  /**
   * Верификация ZK-Proof состоятельности (Halo2 Proof of Solvency)
   */
  public async verifyZkSolvency(payload: {
    min_amount_ton: string;
    min_deposit_age_days: number;
    proof_bytes_hex?: string;
  }): Promise<ZkSolvencyAttestation> {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const res = await fetch(resolveSelUrl('/api/v1/sel/zk/verify-solvency'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_commitment: `poseidon_comm_${randomHex.slice(0, 16)}`,
        merkle_root: `ton_root_${randomHex.slice(16, 32)}`,
        nullifier_hash: `nullifier_${randomHex.slice(32, 48)}`,
        min_amount_ton: payload.min_amount_ton,
        min_deposit_age_days: payload.min_deposit_age_days,
        proof_bytes_hex: payload.proof_bytes_hex || randomHex,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.attestation;
    }
    const err = await res.json();
    throw new Error(err.detail || 'Ошибка верификации ZK-пруфа');
  }

  /**
   * Анонимное подписание пороговой гражданской петиции
   */
  public async signCivicCampaign(campaignId: string): Promise<{ signed_count: number; quorum_reached: boolean }> {
    const res = await fetch(resolveSelUrl(`/api/v1/sel/civic/campaigns/${encodeURIComponent(campaignId)}/sign`), {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      return {
        signed_count: data.signed_count,
        quorum_reached: data.quorum_reached,
      };
    }
    const err = await res.json();
    throw new Error(err.detail || 'Ошибка подписания инициативы');
  }
}

export const selService = new SelService();
