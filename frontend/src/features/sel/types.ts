// frontend/src/features/sel/types.ts
/**
 * Sovereign Economic Layer (SEL) & Universal Pulse Engine — Types
 * Сохраняет полную обратную совместимость с legacy SEL типами
 * и реэкспортирует унифицированные типы Universal Pulse Engine.
 */

export * from '../pulse/types';

export type SelCategory = 'p2p' | 'trade' | 'civic' | 'hr' | 'aid';

export interface SelIntent {
  id: string;
  category: SelCategory;
  role: 'maker' | 'taker' | 'buyer' | 'seller' | 'initiator' | 'seeker' | 'donor';
  title: string;
  description: string;
  amount?: string;
  currency?: string;
  rate?: string;
  city?: string;
  location_h3?: string;
  min_solvency_ton?: string;
  commodity?: string;
  oracle_type?: string;
  is_anonymous: boolean;
  creator_alias: string;
  simhash: string;
  created_at: number;
  target_quorum?: number;
  signed_count?: number;
}

export interface EscrowPhase {
  id: string;
  name: string;
  status: 'completed' | 'active' | 'pending';
  completed_at?: number;
  oracle?: string;
  oracle_proof?: string;
  description?: string;
  amount_percent?: number;
}

export interface DvPEscrowContract {
  id: string;
  title: string;
  buyer: string;
  seller: string;
  amount_usdt: string;
  amount_ton: string;
  commodity: string;
  current_phase: string;
  phases: EscrowPhase[];
  collateral_seller_ton?: string;
  collateral_buyer_ton?: string;
  created_at: number;
}

export interface ZkSolvencyAttestation {
  attestation_id: string;
  verified: boolean;
  min_amount_ton: string;
  min_deposit_age_days: number;
  nullifier_hash: string;
  verified_at: number;
  signature_scheme: string;
  expires_in_hours: number;
}
