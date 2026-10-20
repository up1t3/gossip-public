// frontend/src/features/reputation/types.ts

export type TrustLevel = 'elite' | 'high' | 'medium' | 'neutral' | 'low';

export interface ReputationScore {
  user_alias: string;
  score: number;
  rating_display: string;
  total_reviews: number;
  verified_deals_count: number;
  total_volume_ton: number;
  trust_level: TrustLevel;
  trust_percentage: number;
  zk_badge: string;
  top_tags: string[];
}

export interface ReviewItem {
  score: number;
  weight: number;
  volume_ton: number;
  deposit_age_days: number;
  tags: string[];
  timestamp: number;
  nullifier_hash: string;
  verified: boolean;
}

export interface InteractionVoucher {
  interaction_id: string;
  party_a_alias: string;
  party_b_alias: string;
  volume_ton: number;
  interaction_type: string;
  voucher_secret: string;
  issued_at: number;
  expires_at: number;
}

export interface ZkReputationBadgeProof {
  proof_id: string;
  user_alias: string;
  badge_name: string;
  criteria_proven: {
    min_score: number;
    min_deals: number;
    min_volume_ton: number;
  };
  proof_hex: string;
  zk_prover: string;
  generated_at: number;
  expires_in_days: number;
}
