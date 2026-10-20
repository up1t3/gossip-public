import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Server,
  Users,
  Shield,
  Send,
  RefreshCw,
  X,
  Lock,
  CheckCircle2,
  HardDrive,
  Building2,
  Smartphone,
  Radio,
  Sparkles,
  LogOut,
  Search,
  Filter,
  Key,
  Fingerprint,
  Check,
  Award,
  CreditCard,
  Coins,
  Trash2,
  Bot,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { GlassButton, GlassInput } from '../../ui';
import { getBackendUrl } from '../../utils/url';

const apiUrl = (path: string) => getBackendUrl(path);

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light' | 'coffee';
  username?: string;
}

interface PaymentOrderItem {
  id: string;
  user_id: string | null;
  payment_id: string;
  amount: number;
  currency: string;
  plan: string;
  plan_days: number;
  status: string;
  payment_method: string;
  created_at: string | null;
  username: string;
}

interface GatewayStatusData {
  yookassa: {
    shop_id: string;
    masked_secret_key: string;
    fallback_url: string;
    send_receipt: boolean;
    live_status: {
      ok: boolean;
      status: string;
      account_id?: string;
      test?: boolean;
      fiscalization_enabled?: boolean;
      payment_methods?: string[];
      error?: string;
    };
  };
  ton: {
    wallet_address: string;
    plans: Record<string, any>;
    status: string;
  };
}

interface LicenseInfo {
  license_id: string;
  licensee: string;
  license_type: string;
  max_seats: number;
  issued_at: number;
  valid_until: number;
  features: Record<string, boolean>;
  status: string;
  is_enterprise: boolean;
  days_remaining: number;
}

interface AttestationStatus {
  guard_active: boolean;
  status: string;
  official_cert_sha256: string;
  total_verified_sessions: number;
  stats_by_platform: Record<string, number>;
  suspicious_clones_blocked: number;
  last_attestation_ts: number;
}

interface OverviewData {
  status: string;
  cluster: {
    version: string;
    version_code?: number;
    uptime_hours: number;
    architecture: string;
    services: Record<string, string>;
  };
  metrics: {
    total_users: number;
    online_users: number;
    premium_users: number;
    mls_groups: number;
    total_leads: number;
    new_leads: number;
    encrypted_storage_mb: number;
    encrypted_files_count?: number;
    e2ee_prekeys_count?: number;
    active_sessions_count?: number;
    disk_used_gb?: number;
    disk_total_gb?: number;
    disk_percent?: number;
    ram_used_mb?: number;
    ram_total_mb?: number;
    ram_percent?: number;
    protocol: string;
  };
  platforms: {
    android_apk: number;
    ios_pwa: number;
    web_pwa: number;
    desktop_electron: number;
  };
  license?: LicenseInfo;
  attestation?: AttestationStatus;
}

interface LeadItem {
  id: number;
  company_name: string;
  contact_name: string;
  contact_info: string;
  team_size: string;
  deployment_type: string;
  notes: string;
  status: string;
  created_at: string;
}

interface UserItem {
  id: string;
  username: string;
  is_premium: boolean;
  premium_until?: string | null;
  prekeys_count?: number;
  active_sessions?: number;
  status: string;
  created_at: string;
}

interface BroadcastHistoryItem {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  target_type: string;
  target_value: string;
  target_count: number | string;
  timestamp: number;
}

interface SecurityAuditData {
  active_admin_sessions_count: number;
  active_admin_sessions: Array<{
    token_prefix: string;
    username: string;
    ip: string;
    ttl_seconds: number;
    is_current: boolean;
  }>;
  blocked_ips: Array<{
    ip: string;
    attempts: number;
    ttl_seconds: number;
  }>;
  custom_password_configured: boolean;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  theme,
  username
}) => {
  const [adminToken, setAdminToken] = useState<string>(() => localStorage.getItem('gossip_admin_token') || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'metrics' | 'orders' | 'leads' | 'users' | 'broadcast' | 'license' | 'security'>('metrics');
  
  // Данные метрик
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isPushingClusterUpdate, setIsPushingClusterUpdate] = useState(false);

  // Смена мастер-пароля и аудит безопасности
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  const [securityAudit, setSecurityAudit] = useState<SecurityAuditData | null>(null);
  const [isLoadingSecurityAudit, setIsLoadingSecurityAudit] = useState(false);

  // Данные заказов и платежей
  const [orders, setOrders] = useState<PaymentOrderItem[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [gatewaysData, setGatewaysData] = useState<GatewayStatusData | null>(null);
  const [isGatewayConfigOpen, setIsGatewayConfigOpen] = useState(false);
  const [ykShopIdInput, setYkShopIdInput] = useState('');
  const [ykSecretKeyInput, setYkSecretKeyInput] = useState('');
  const [ykFallbackUrlInput, setYkFallbackUrlInput] = useState('');
  const [ykSendReceiptInput, setYkSendReceiptInput] = useState(false);
  const [tonWalletInput, setTonWalletInput] = useState('');
  const [isSavingGateways, setIsSavingGateways] = useState(false);

  // Данные лицензии и ключа
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [isActivatingLicense, setIsActivatingLicense] = useState(false);

  // Данные лидов
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [newLeadCompany, setNewLeadCompany] = useState('');
  const [newLeadContact, setNewLeadContact] = useState('');
  const [newLeadInfo, setNewLeadInfo] = useState('');
  const [newLeadSize, setNewLeadSize] = useState('25-100');
  const [newLeadType, setNewLeadType] = useState('on-premise');
  const [newLeadNotes, setNewLeadNotes] = useState('');
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [editingLeadNotesId, setEditingLeadNotesId] = useState<number | null>(null);
  const [editingLeadNotesText, setEditingLeadNotesText] = useState<string>('');

  // Данные пользователей
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userQuickFilter, setUserQuickFilter] = useState<'all' | 'online' | 'premium' | 'free' | 'no_keys'>('all');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Состояние бродкаста и таргетинга
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'info' | 'warning' | 'critical' | 'success'>('info');
  const [broadcastTargetType, setBroadcastTargetType] = useState<'all' | 'online' | 'premium' | 'free' | 'platform' | 'contour' | 'users'>('all');
  const [broadcastPlatform, setBroadcastPlatform] = useState<'android' | 'ios' | 'web' | 'desktop'>('android');
  const [broadcastContour, setBroadcastContour] = useState<'safe' | 'standard'>('safe');
  const [broadcastSpecificUsers, setBroadcastSpecificUsers] = useState<string>('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccessInfo, setBroadcastSuccessInfo] = useState<{ message: string; target_count: number | string } | null>(null);
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastHistoryItem[]>([]);
  const [isLoadingBroadcasts, setIsLoadingBroadcasts] = useState(false);

  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Смена мастер-пароля администратора
  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPasswordInput.trim() || !newPasswordInput.trim() || !confirmPasswordInput.trim()) {
      setChangePasswordError('Заполните все поля формы');
      return;
    }
    if (newPasswordInput.trim().length < 8) {
      setChangePasswordError('Новый мастер-ключ должен содержать минимум 8 символов');
      return;
    }
    if (newPasswordInput.trim() !== confirmPasswordInput.trim()) {
      setChangePasswordError('Новый пароль и подтверждение не совпадают');
      return;
    }
    setIsChangingPassword(true);
    setChangePasswordError('');
    setChangePasswordSuccess('');
    try {
      const token = adminToken || localStorage.getItem('gossip_admin_token');
      const res = await fetch(apiUrl('/api/v1/admin/change-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPasswordInput.trim(),
          new_password: newPasswordInput.trim(),
          confirm_password: confirmPasswordInput.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setChangePasswordSuccess(data.message || 'Мастер-ключ администратора успешно обновлён!');
        if (data.token) {
          setAdminToken(data.token);
          localStorage.setItem('gossip_admin_token', data.token);
        }
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        showToast('Мастер-пароль администратора успешно изменен!', 'success');
      } else {
        setChangePasswordError(data.detail || 'Не удалось сменить мастер-пароль');
      }
    } catch (err) {
      setChangePasswordError('Ошибка подключения к серверу управления');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Авторизация администратора
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setIsLoggingIn(true);
    setLoginError('');

    try {
      const rawUser = (username || localStorage.getItem('username') || localStorage.getItem('gossip_username') || '').trim();
      const loginUser = ['up1t3r', 'up1t3', 'merlin'].includes(rawUser.toLowerCase()) ? rawUser : 'Up1t3r';
      const res = await fetch(apiUrl('/api/v1/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: passwordInput.trim(),
          username: loginUser
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAdminToken(data.token);
        localStorage.setItem('gossip_admin_token', data.token);
        setPasswordInput('');
        fetchOverview(data.token);
        fetchOrders(data.token);
        fetchGateways(data.token);
      } else {
        const errData = await res.json().catch(() => ({}));
        setLoginError(errData.detail || 'Доступ разрешён только создателю');
      }
    } catch (err) {
      setLoginError('Ошибка подключения к серверу управления');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogout = () => {
    setAdminToken('');
    localStorage.removeItem('gossip_admin_token');
    setOverview(null);
    setOrders([]);
    setLeads([]);
    setUsersList([]);
  };

  // Загрузка сводных метрик
  const fetchOverview = useCallback(async (tokenParam?: string) => {
    const token = tokenParam || adminToken || localStorage.getItem('gossip_admin_token');
    if (!token) return;
    setIsLoadingOverview(true);
    try {
      const res = await fetch(apiUrl('/api/v1/admin/overview'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      } else if (res.status === 401 || res.status === 403) {
        handleAdminLogout();
      }
    } catch (err) {
      console.error('[Admin] Error fetching overview:', err);
    } finally {
      setIsLoadingOverview(false);
    }
  }, [adminToken]);

  // Загрузка заказов и платежей
  const fetchOrders = useCallback(async (tokenParam?: string) => {
    const token = tokenParam || adminToken || localStorage.getItem('gossip_admin_token');
    if (!token) return;
    setIsLoadingOrders(true);
    try {
      const url = orderStatusFilter === 'all'
        ? apiUrl('/api/v1/admin/orders')
        : apiUrl(`/api/v1/admin/orders?status_filter=${orderStatusFilter}`);
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('[Admin] Error fetching orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [adminToken, orderStatusFilter]);

  // Загрузка статуса платежных шлюзов (ЮKassa & TON)
  const fetchGateways = useCallback(async (tokenParam?: string) => {
    const token = tokenParam || adminToken || localStorage.getItem('gossip_admin_token');
    if (!token) return;
    try {
      const res = await fetch(apiUrl('/api/v1/admin/payments/gateways'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data: GatewayStatusData = await res.json();
        setGatewaysData(data);
        setYkShopIdInput(data.yookassa?.shop_id || '');
        setYkFallbackUrlInput(data.yookassa?.fallback_url || '');
        setYkSendReceiptInput(Boolean(data.yookassa?.send_receipt));
        setTonWalletInput(data.ton?.wallet_address || '');
      }
    } catch (err) {
      console.error('[Admin] Error fetching payment gateways:', err);
    }
  }, [adminToken]);

  // Сохранение настроек платежных шлюзов
  const handleSaveGateways = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGateways(true);
    try {
      const res = await fetch(apiUrl('/api/v1/admin/payments/gateways'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          yookassa_shop_id: ykShopIdInput.trim(),
          yookassa_secret_key: ykSecretKeyInput.trim() || undefined,
          yookassa_fallback_url: ykFallbackUrlInput.trim(),
          yookassa_send_receipt: ykSendReceiptInput,
          ton_wallet_address: tonWalletInput.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Настройки шлюзов обновлены', 'success');
        setYkSecretKeyInput('');
        fetchGateways();
      } else {
        showToast(data.detail || 'Ошибка сохранения настроек шлюзов', 'error');
      }
    } catch (err) {
      showToast('Ошибка связи с сервером', 'error');
    } finally {
      setIsSavingGateways(false);
    }
  };

  // Рассылка сигнала об обновлении APK всем клиентам
  const handlePushClusterUpdate = async () => {
    setIsPushingClusterUpdate(true);
    try {
      const res = await fetch(apiUrl('/api/v1/admin/cluster/push-update'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Сигнал обновления v${data.version} разослан!`, 'success');
        fetchOverview();
      } else {
        showToast(data.detail || 'Ошибка рассылки сигнала обновления', 'error');
      }
    } catch (err) {
      showToast('Ошибка связи с сервером', 'error');
    } finally {
      setIsPushingClusterUpdate(false);
    }
  };

  // Ручное подтверждение заказа (выдача Premium, включая @guest заказы)
  const handleApproveOrder = async (orderId: string, ordUsername: string) => {
    let targetUserParam = '';
    if (!ordUsername || ordUsername === 'guest') {
      const prompted = window.prompt(
        `Счет ${orderId} был создан без авторизации (@guest).\nУкажите логин пользователя (например, Up1t3r), которому нужно активировать Gossip Premium:`,
        ''
      );
      if (prompted === null) return;
      const cleanPrompted = prompted.trim().replace(/^@/, '');
      if (!cleanPrompted) {
        showToast('Для подтверждения гостевого счета укажите логин получателя', 'error');
        return;
      }
      targetUserParam = `?username=${encodeURIComponent(cleanPrompted)}`;
    } else {
      if (!window.confirm(`Подтвердить оплату заказа ${orderId} и активировать Gossip Premium для @${ordUsername}?`)) return;
    }

    try {
      const res = await fetch(apiUrl(`/api/v1/admin/orders/${orderId}/approve${targetUserParam}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Заказ ${orderId} подтвержден!`, 'success');
        fetchOrders();
        fetchUsers();
        fetchOverview();
      } else {
        showToast(data.detail || 'Ошибка подтверждения заказа', 'error');
      }
    } catch (err) {
      showToast('Ошибка связи с сервером', 'error');
    }
  };

  // Загрузка B2B заявок
  const fetchLeads = useCallback(async (tokenParam?: string) => {
    const token = tokenParam || adminToken || localStorage.getItem('gossip_admin_token');
    if (!token) return;
    setIsLoadingLeads(true);
    try {
      const url = leadStatusFilter === 'all' 
        ? apiUrl('/api/v1/admin/leads')
        : apiUrl(`/api/v1/admin/leads?status_filter=${leadStatusFilter}`);
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error('[Admin] Error fetching leads:', err);
    } finally {
      setIsLoadingLeads(false);
    }
  }, [adminToken, leadStatusFilter]);

  // Ручное добавление B2B заявки из админки
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadCompany.trim() || !newLeadContact.trim() || !newLeadInfo.trim()) {
      showToast('Заполните компанию, контактное лицо и способ связи', 'error');
      return;
    }
    setIsCreatingLead(true);
    try {
      const res = await fetch(apiUrl('/api/v1/leads/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: newLeadCompany.trim(),
          contact_name: newLeadContact.trim(),
          contact_info: newLeadInfo.trim(),
          team_size: newLeadSize,
          deployment_type: newLeadType,
          notes: newLeadNotes.trim()
        })
      });
      if (res.ok) {
        showToast('Корпоративная B2B заявка добавлена', 'success');
        setNewLeadCompany('');
        setNewLeadContact('');
        setNewLeadInfo('');
        setNewLeadNotes('');
        setIsCreateLeadOpen(false);
        fetchLeads();
        fetchOverview();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.detail || 'Ошибка создания заявки', 'error');
      }
    } catch (err) {
      showToast('Ошибка связи с сервером', 'error');
    } finally {
      setIsCreatingLead(false);
    }
  };

  // Сохранение заметки по B2B лиду
  const handleSaveLeadNotes = async (leadId: number) => {
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/leads/${leadId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ notes: editingLeadNotesText })
      });
      if (res.ok) {
        showToast(`Заметка для заявки #${leadId} сохранена`, 'success');
        setEditingLeadNotesId(null);
        fetchLeads();
      } else {
        showToast('Ошибка сохранения заметки', 'error');
      }
    } catch (err) {
      showToast('Ошибка связи с сервером', 'error');
    }
  };

  // Загрузка пользователей
  const fetchUsers = useCallback(async (tokenParam?: string) => {
    const token = tokenParam || adminToken || localStorage.getItem('gossip_admin_token');
    if (!token) return;
    setIsLoadingUsers(true);
    try {
      const url = userSearchQuery.trim()
        ? apiUrl(`/api/v1/admin/users?search=${encodeURIComponent(userSearchQuery.trim())}`)
        : apiUrl('/api/v1/admin/users?limit=200');
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error('[Admin] Error fetching users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [adminToken, userSearchQuery]);

  // Загрузка истории системных оповещений
  const fetchBroadcastHistory = useCallback(async (tokenParam?: string) => {
    const token = tokenParam || adminToken || localStorage.getItem('gossip_admin_token');
    if (!token) return;
    setIsLoadingBroadcasts(true);
    try {
      const res = await fetch(apiUrl('/api/v1/admin/broadcasts'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBroadcastHistory(data.broadcasts || []);
      }
    } catch (err) {
      console.error('[Admin] Error fetching broadcast history:', err);
    } finally {
      setIsLoadingBroadcasts(false);
    }
  }, [adminToken]);

  // Удаление системного оповещения из истории и активной раздачи
  const handleDeleteBroadcast = async (broadcastId: string) => {
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/broadcasts/${encodeURIComponent(broadcastId)}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        showToast('Оповещение отозвано из активной раздачи', 'success');
        fetchBroadcastHistory();
      } else {
        showToast('Не удалось удалить оповещение', 'error');
      }
    } catch (err) {
      showToast('Ошибка связи с сервером', 'error');
    }
  };

  // Загрузка аудита безопасности
  const fetchSecurityAudit = useCallback(async (tokenParam?: string) => {
    const token = tokenParam || adminToken || localStorage.getItem('gossip_admin_token');
    if (!token) return;
    setIsLoadingSecurityAudit(true);
    try {
      const res = await fetch(apiUrl('/api/v1/admin/security/audit'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSecurityAudit(data);
      }
    } catch (err) {
      console.error('[Admin] Error fetching security audit:', err);
    } finally {
      setIsLoadingSecurityAudit(false);
    }
  }, [adminToken]);

  // Завершение всех других админ-сессий
  const handleRevokeOtherAdminSessions = async () => {
    try {
      const res = await fetch(apiUrl('/api/v1/admin/security/revoke-other-sessions'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Другие сессии завершены', 'success');
        fetchSecurityAudit();
      } else {
        showToast(data.detail || 'Ошибка отзыва сессий', 'error');
      }
    } catch (err) {
      showToast('Ошибка связи с сервером', 'error');
    }
  };

  // Смена статуса лида
  const handleUpdateLeadStatus = async (leadId: number, newStatus: string) => {
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/leads/${leadId}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast(`Статус заявки #${leadId} изменен на ${newStatus}`, 'success');
        fetchLeads();
        fetchOverview();
      }
    } catch (err) {
      showToast('Ошибка обновления статуса', 'error');
    }
  };

  // Отзыв сессий пользователя
  const handleRevokeSessions = async (userId: string, targetUsername: string) => {
    if (!window.confirm(`Вы уверены, что хотите принудительно сбросить все сессии пользователя ${targetUsername}?`)) return;
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/users/${userId}/revoke-sessions`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'Сессии успешно отозваны', 'success');
        fetchUsers();
      }
    } catch (err) {
      showToast('Ошибка сброса сессий', 'error');
    }
  };

  // Переключение Premium статуса
  const handleTogglePremium = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/users/${userId}/set-premium?is_premium=${!currentStatus}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        showToast(!currentStatus ? 'Gossip Premium активирован (30 дней)' : 'Статус Gossip Premium снят', 'success');
        fetchUsers();
        fetchOverview();
      }
    } catch (err) {
      showToast('Ошибка обновления статуса', 'error');
    }
  };

  // Удаление пользователя
  const handleDeleteUser = async (userId: string, targetUsername: string) => {
    if (!window.confirm(`Вы уверены, что хотите НАВСЕГДА УДАЛИТЬ пользователя @${targetUsername} (ID: #${userId})?\n\nВсе сессии, сообщения, ключи и данные будут безвозвратно стерты.`)) return;
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/users/${userId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Пользователь @${targetUsername} успешно удален`, 'success');
        fetchUsers();
        fetchOverview();
      } else {
        showToast(data.detail || 'Ошибка удаления пользователя', 'error');
      }
    } catch (err) {
      showToast('Ошибка связи с сервером при удалении', 'error');
    }
  };

  // Очистка тестовых ботов
  const [isCleaningBots, setIsCleaningBots] = useState(false);
  const handleCleanupBots = async () => {
    const detectedBots = usersList.filter(u => /^(audit_user_|stress_worker_|Alice_[0-9]+|Bob_[0-9]+|qa_remote_test_)/i.test(u.username));
    if (detectedBots.length === 0) {
      showToast('Тестовые боты не обнаружены', 'success');
      return;
    }

    if (!window.confirm(`Обнаружено тестовых ботов: ${detectedBots.length}.\n\nОчистить всех тестовых ботов (audit_*, stress_*, Alice_*, Bob_*, qa_*)?\nРеальные пользователи (@Merlin, @Up1t3r, @Данечка, @Elena и др.) затронуты НЕ будут.`)) return;

    setIsCleaningBots(true);
    try {
      const res = await fetch(apiUrl('/api/v1/admin/users/cleanup-bots'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Удалено ${data.deleted_count} тестовых ботов`, 'success');
        fetchUsers();
        fetchOverview();
      } else {
        showToast(data.detail || 'Ошибка очистки ботов', 'error');
      }
    } catch (err) {
      showToast('Ошибка связи с сервером при очистке', 'error');
    } finally {
      setIsCleaningBots(false);
    }
  };

  // Удаление заказа
  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm(`Удалить запись заказа ${orderId}?`)) return;
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/orders/${orderId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Заказ ${orderId} удален`, 'success');
        fetchOrders();
      } else {
        showToast(data.detail || 'Ошибка удаления заказа', 'error');
      }
    } catch (err) {
      showToast('Ошибка связи с сервером', 'error');
    }
  };

  // Очистка всех неоплаченных/отмененных заказов
  const [isCleaningOrders, setIsCleaningOrders] = useState(false);
  const handleCleanupPendingOrders = async () => {
    const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'canceled').length;
    if (pendingCount === 0) {
      showToast('Нет неоплаченных или отмененных заявок', 'success');
      return;
    }

    if (!window.confirm(`Очистить все ${pendingCount} неоплаченных и отмененных заявок?\nУспешно оплаченные заказы (succeeded) затронуты НЕ будут.`)) return;

    setIsCleaningOrders(true);
    try {
      const res = await fetch(apiUrl('/api/v1/admin/orders/cleanup-pending'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Очищено ${data.deleted_count} заявок`, 'success');
        fetchOrders();
      } else {
        showToast(data.detail || 'Ошибка очистки заявок', 'error');
      }
    } catch (err) {
      showToast('Ошибка связи с сервером', 'error');
    } finally {
      setIsCleaningOrders(false);
    }
  };

  // Удаление B2B заявки
  const handleDeleteLead = async (leadId: number, companyName: string) => {
    if (!window.confirm(`Удалить заявку #${leadId} от «${companyName}»?`)) return;
    try {
      const res = await fetch(apiUrl(`/api/v1/admin/leads/${leadId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Заявка #${leadId} удалена`, 'success');
        fetchLeads();
        fetchOverview();
      } else {
        showToast(data.detail || 'Ошибка удаления заявки', 'error');
      }
    } catch (err) {
      showToast('Ошибка связи с сервером', 'error');
    }
  };

  // Очистка тестовых B2B заявок
  const [isCleaningLeads, setIsCleaningLeads] = useState(false);
  const handleCleanupTestLeads = async () => {
    if (!window.confirm('Очистить все тестовые QA заявки формы (QA стресс-тесты)?')) return;

    setIsCleaningLeads(true);
    try {
      const res = await fetch(apiUrl('/api/v1/admin/leads/cleanup-tests'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Очищено ${data.deleted_count} тестовых заявок`, 'success');
        fetchLeads();
        fetchOverview();
      } else {
        showToast(data.detail || 'Ошибка очистки тестовых заявок', 'error');
      }
    } catch (err) {
      showToast('Ошибка связи с сервером', 'error');
    } finally {
      setIsCleaningLeads(false);
    }
  };

  // Отправка системного оповещения с таргетингом
  const handleBroadcast = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      showToast('Заполните заголовок и текст системного оповещения', 'error');
      return;
    }

    let targetValue = '';
    if (broadcastTargetType === 'platform') targetValue = broadcastPlatform;
    else if (broadcastTargetType === 'contour') targetValue = broadcastContour;
    else if (broadcastTargetType === 'users') targetValue = broadcastSpecificUsers.trim();

    if (broadcastTargetType === 'users' && !targetValue) {
      showToast('Укажите никнеймы пользователей через запятую', 'error');
      return;
    }

    setIsBroadcasting(true);
    setBroadcastSuccessInfo(null);
    try {
      const res = await fetch(apiUrl('/api/v1/admin/broadcast'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          severity: broadcastSeverity,
          target_type: broadcastTargetType,
          target_value: targetValue
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBroadcastSuccessInfo({
          message: data.message || 'Оповещение успешно отправлено',
          target_count: data.target_count || 'ALL'
        });
        setBroadcastTitle('');
        setBroadcastMessage('');
        showToast('Системное оповещение доставлено и сохранено в журнале', 'success');
        fetchBroadcastHistory();
        setTimeout(() => setBroadcastSuccessInfo(null), 8000);
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.detail || 'Ошибка отправки оповещения', 'error');
      }
    } catch (err) {
      showToast('Ошибка отправки оповещения', 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Активация On-Premise Ed25519 лицензии
  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) return;
    setIsActivatingLicense(true);
    try {
      const res = await fetch(apiUrl('/api/v1/admin/license/activate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ license_key: licenseKeyInput.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Лицензия успешно активирована', 'success');
        setLicenseKeyInput('');
        fetchOverview();
      } else {
        showToast(data.detail || 'Ошибка активации лицензии', 'error');
      }
    } catch (err) {
      showToast('Ошибка связи с сервером при активации', 'error');
    } finally {
      setIsActivatingLicense(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !adminToken) return;

    if (activeTab === 'metrics' || activeTab === 'license') fetchOverview();
    if (activeTab === 'orders') {
      fetchOrders();
      fetchGateways();
    }
    if (activeTab === 'leads') fetchLeads();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'broadcast') fetchBroadcastHistory();
    if (activeTab === 'security') fetchSecurityAudit();

    // Автоматическое обновление статусов и метрик в реальном времени
    const pollTimer = setInterval(() => {
      if (activeTab === 'metrics') fetchOverview();
      if (activeTab === 'users') fetchUsers();
      if (activeTab === 'orders') fetchOrders();
      if (activeTab === 'broadcast') fetchBroadcastHistory();
      if (activeTab === 'security') fetchSecurityAudit();
    }, 10000);
    return () => clearInterval(pollTimer);
  }, [isOpen, adminToken, activeTab, fetchOverview, fetchOrders, fetchGateways, fetchLeads, fetchUsers, fetchBroadcastHistory, fetchSecurityAudit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-1.5 sm:p-3 md:p-4 bg-black/80 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        style={{
          height: '94dvh',
          maxHeight: '94dvh',
          boxShadow: theme === 'light'
            ? '0 0 40px -10px rgba(37,99,235,0.15), 0 8px 32px 0 rgba(0,0,0,0.25)'
            : '0 0 40px -10px rgba(16,185,129,0.18), 0 8px 32px 0 rgba(0,0,0,0.45)'
        }}
        className={`w-full max-w-[97vw] 2xl:max-w-[1480px] flex flex-col min-h-0 rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden relative ${
          theme === 'light'
            ? 'bg-white/95 border-slate-200 text-slate-900'
            : (theme === 'coffee'
                ? 'bg-[#1A120B]/95 border-[#D5CEA3]/20 text-[#E5E5CB]'
                : 'bg-[#0D0E15]/95 border-white/10 text-slate-100')
        }`}
      >
        {/* Toast уведомление */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-bold shadow-lg border ${
                toastMsg.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}
            >
              {toastMsg.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Шапка модалки */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${
              theme === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight truncate">Gossip Zero-Knowledge Console</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                  System Owner
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">Панель телеметрии и B2B управления кластером</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
            {adminToken && (
              <button
                type="button"
                onClick={handleAdminLogout}
                title="Выйти из консоли"
                className="p-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Тело модалки: Экран авторизации или Дашборд */}
        {!adminToken ? (
          <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-4 sm:p-6 admin-custom-scrollbar">
            <div className="w-full max-w-md space-y-6 text-center my-auto">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold">Вход в консоль администратора</h3>
                <p className="text-xs text-slate-400">
                  Введите мастер-пароль владельца системы для доступа к метрикам и управлению
                </p>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4 text-left">
                <div>
                  <div className="mb-1">
                    <label className="block text-xs font-bold text-slate-400">Мастер-ключ администратора</label>
                  </div>
                  <GlassInput
                    type="password"
                    placeholder="••••••••••••••••"
                    value={passwordInput}
                    onChange={(e: any) => setPasswordInput(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <GlassButton
                  variant="primary"
                  type="submit"
                  fullWidth
                  disabled={isLoggingIn}
                  className={`py-3 text-xs font-bold ${
                    theme === 'light' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isLoggingIn ? 'Проверка ключа...' : 'Войти в панель управления'}
                </GlassButton>
              </form>

              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-2">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero-Knowledge: доступ к чужим перепискам исключен</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 grid grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
            {/* Вкладки навигации */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 border-b border-white/10 overflow-x-auto shrink-0 admin-custom-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('metrics')}
                className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  activeTab === 'metrics'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-glass-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span>Метрики и Кластер</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  activeTab === 'orders'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-glass-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 shrink-0" />
                <span>Платежи (ЮKassa & TON)</span>
                {orders.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500 text-white">
                    {orders.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('leads')}
                className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 relative shrink-0 whitespace-nowrap ${
                  activeTab === 'leads'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-glass-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>B2B Заявки (Leads)</span>
                {overview && overview.metrics.new_leads > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white animate-pulse">
                    {overview.metrics.new_leads}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  activeTab === 'users'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-glass-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>Пользователи (IAM)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('broadcast')}
                className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  activeTab === 'broadcast'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-glass-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Radio className="w-3.5 h-3.5 shrink-0" />
                <span>Оповещения (Broadcast)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('license')}
                className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  activeTab === 'license'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-glass-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Key className="w-3.5 h-3.5 shrink-0" />
                <span>Лицензия & Защита Ядра</span>
                {overview?.license?.is_enterprise && (
                  <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black bg-purple-500 text-white">
                    PRO
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  activeTab === 'security'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-glass-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span>Безопасность & Ключ</span>
              </button>

              <div className="ml-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'metrics' || activeTab === 'license') fetchOverview();
                    if (activeTab === 'orders') {
                      fetchOrders();
                      fetchGateways();
                    }
                    if (activeTab === 'leads') fetchLeads();
                    if (activeTab === 'users') fetchUsers();
                    if (activeTab === 'broadcast') fetchBroadcastHistory();
                    if (activeTab === 'security') fetchSecurityAudit();
                  }}
                  title="Обновить данные"
                  className="p-2 rounded-xl border border-white/5 hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOverview || isLoadingOrders || isLoadingLeads || isLoadingUsers || isLoadingBroadcasts || isLoadingSecurityAudit ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Контент активной вкладки — честная полоса прокрутки на всю высоту */}
            <div className="h-full min-h-0 overflow-y-scroll overscroll-contain p-4 sm:p-6 pb-24 space-y-5 sm:space-y-6 admin-custom-scrollbar">
                {activeTab === 'metrics' && (
                  <div className="space-y-5 sm:space-y-6">
                    {/* Ключевые карточки метрик */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                      <div className="p-3.5 sm:p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">Пользователей</span>
                        <div className="text-xl sm:text-2xl font-black text-slate-100">
                          {overview?.metrics.total_users ?? '...'}
                        </div>
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <Users className="w-3 h-3 shrink-0" /> В базе ({overview?.metrics.active_sessions_count ?? 0} сессий)
                        </span>
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block truncate">Онлайн (Live)</span>
                        <div className="text-xl sm:text-2xl font-black text-emerald-300">
                          {overview?.metrics.online_users ?? '...'}
                        </div>
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <Activity className="w-3 h-3 animate-pulse shrink-0" /> WebSocket
                        </span>
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">MLS & Ключи</span>
                        <div className="text-xl sm:text-2xl font-black text-slate-100">
                          {overview?.metrics.mls_groups ?? '...'}
                        </div>
                        <span className="text-[10px] text-teal-400 font-semibold flex items-center gap-1">
                          <Key className="w-3 h-3 shrink-0" /> {overview?.metrics.e2ee_prekeys_count ?? 0} PreKeys
                        </span>
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">Хранилище</span>
                        <div className="text-xl sm:text-2xl font-black text-slate-100">
                          {overview?.metrics.encrypted_storage_mb ?? '0'} <span className="text-xs font-normal">MB</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                          <HardDrive className="w-3 h-3 shrink-0" /> {overview?.metrics.encrypted_files_count ?? 0} блобов AES
                        </span>
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">Premium / Corp</span>
                        <div className="text-xl sm:text-2xl font-black text-amber-400">
                          {overview?.metrics.premium_users ?? '...'}
                        </div>
                        <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 shrink-0" /> Лицензии
                        </span>
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-2xl border border-purple-500/30 bg-purple-950/20 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block truncate">B2B Заявки</span>
                        <div className="text-xl sm:text-2xl font-black text-purple-200">
                          {overview?.metrics.total_leads ?? '...'}
                        </div>
                        <span className="text-[10px] text-purple-300 font-semibold flex items-center gap-1">
                          <Building2 className="w-3 h-3 shrink-0" /> {overview?.metrics.new_leads ?? 0} новых
                        </span>
                      </div>
                    </div>

                    {/* Матрица здоровья микросервисов кластера и управление релизом */}
                    <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4 text-emerald-400 shrink-0" />
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                            Состояние микросервисов кластера
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-slate-300 font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                            Uptime: {overview?.cluster.uptime_hours ?? 0}ч • v{overview?.cluster.version ?? '2.2.26'} (build {overview?.cluster.version_code ?? 386})
                          </span>
                          <button
                            type="button"
                            onClick={handlePushClusterUpdate}
                            disabled={isPushingClusterUpdate}
                            className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center gap-1.5"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>{isPushingClusterUpdate ? 'Рассылка...' : 'Разослать сигнал обновления APK'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                        {overview && Object.entries(overview.cluster.services).map(([service, statusStr]) => {
                          const isOk = statusStr.toLowerCase().includes('healthy') || statusStr.toLowerCase().includes('active');
                          return (
                            <div
                              key={service}
                              className={`p-3 rounded-xl border flex items-center justify-between ${
                                isOk
                                  ? 'bg-emerald-950/10 border-emerald-500/20 text-slate-200'
                                  : 'bg-rose-950/10 border-rose-500/30 text-rose-300'
                              }`}
                            >
                              <div className="space-y-0.5 min-w-0 pr-2">
                                <div className="text-[11px] font-bold uppercase truncate">{service}</div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">{statusStr}</div>
                              </div>
                              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOk ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                            </div>
                          );
                        })}
                      </div>

                      {/* Аппаратные ресурсы сервера (Диск & ОЗУ) */}
                      {(overview?.metrics.disk_total_gb || overview?.metrics.ram_total_mb) ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs">
                          <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-semibold">Дисковый массив сервера (NVMe)</span>
                              <span className="font-mono font-bold text-slate-200">
                                {overview?.metrics.disk_used_gb ?? 0} / {overview?.metrics.disk_total_gb ?? 0} GB ({overview?.metrics.disk_percent ?? 0}%)
                              </span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  (overview?.metrics.disk_percent ?? 0) > 85 ? 'bg-rose-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, overview?.metrics.disk_percent ?? 0)}%` }}
                              />
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-semibold">Оперативная память (RAM)</span>
                              <span className="font-mono font-bold text-slate-200">
                                {overview?.metrics.ram_used_mb ?? 0} / {overview?.metrics.ram_total_mb ?? 0} MB ({overview?.metrics.ram_percent ?? 0}%)
                              </span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  (overview?.metrics.ram_percent ?? 0) > 85 ? 'bg-amber-500' : 'bg-sky-500'
                                }`}
                                style={{ width: `${Math.min(100, overview?.metrics.ram_percent ?? 0)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Платформы и распределение клиентов */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                            Распределение клиентов
                          </h3>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span>Android (Нативный APK)</span>
                              <span className="font-bold text-emerald-400">{overview?.platforms.android_apk ?? 48}%</span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${overview?.platforms.android_apk ?? 48}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span>iOS (Safari PWA / APNs)</span>
                              <span className="font-bold text-sky-400">{overview?.platforms.ios_pwa ?? 26}%</span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                              <div className="bg-sky-500 h-full rounded-full" style={{ width: `${overview?.platforms.ios_pwa ?? 26}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span>Web Browser PWA</span>
                              <span className="font-bold text-purple-400">{overview?.platforms.web_pwa ?? 18}%</span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${overview?.platforms.web_pwa ?? 18}%` }} />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] mb-1">
                              <span>Desktop Electron (Win/macOS/Linux)</span>
                              <span className="font-bold text-amber-400">{overview?.platforms.desktop_electron ?? 8}%</span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${overview?.platforms.desktop_electron ?? 8}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 flex flex-col justify-between space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                            <Shield className="w-4 h-4 shrink-0" />
                            <span>Zero-Knowledge Архитектура Подтверждена</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed font-medium">
                            Консоль отображает исключительно агрегированные телеметрические данные кластера. Закрытые ключи пользователей генерируются на устройствах и никогда не передаются на сервер. Доступ к текстам переписок и файлам пользователей математически невозможен.
                          </p>
                        </div>
                        <div className="pt-2 text-[10px] text-slate-400 font-mono border-t border-white/5">
                          Крипто-протокол: MLS IETF draft + X25519 Double Ratchet + SQLCipher AES-256
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'orders' && (
                  <div className="space-y-4">
                    {/* Сводные показатели выручки и транзакций */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                      <div className="p-3.5 sm:p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Всего заказов</span>
                        <div className="text-xl sm:text-2xl font-black text-slate-100">
                          {orders.length}
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">ЮKassa + TON</span>
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Оплачено</span>
                        <div className="text-xl sm:text-2xl font-black text-emerald-300">
                          {orders.filter(o => o.status === 'succeeded').length}
                        </div>
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" /> Активные подписки
                        </span>
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Выручка (ЮKassa)</span>
                        <div className="text-xl sm:text-2xl font-black text-emerald-400">
                          {orders.filter(o => o.status === 'succeeded' && o.currency === 'RUB').reduce((sum, o) => sum + o.amount, 0).toLocaleString()} ₽
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">СБП / МИР / Карты</span>
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-2xl border border-sky-500/30 bg-sky-950/20 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Выручка (TON)</span>
                        <div className="text-xl sm:text-2xl font-black text-sky-300">
                          {orders.filter(o => o.status === 'succeeded' && (o.currency === 'TON' || o.payment_method === 'ton')).reduce((sum, o) => sum + o.amount, 0)} TON
                        </div>
                        <span className="text-[10px] text-sky-400 font-semibold flex items-center gap-1">
                          <Coins className="w-3 h-3 shrink-0" /> Блокчейн TON
                        </span>
                      </div>
                    </div>

                    {/* Состояние и настройка платежных шлюзов (ЮKassa & TON) */}
                    <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Settings className="w-4 h-4 text-emerald-400 shrink-0" />
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                            Состояние платежных шлюзов (ЮKassa & TON)
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsGatewayConfigOpen(!isGatewayConfigOpen)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 transition-colors w-fit"
                        >
                          {isGatewayConfigOpen ? 'Скрыть настройки шлюзов' : '⚙️ Настроить ключи ЮKassa и TON'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Статус ЮKassa */}
                        <div className={`p-3 rounded-xl border flex flex-col justify-between gap-1.5 ${
                          gatewaysData?.yookassa?.live_status?.status === 'enabled'
                            ? 'bg-emerald-950/15 border-emerald-500/30'
                            : 'bg-amber-950/15 border-amber-500/30'
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-200 flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ЮKassa (Shop ID: {gatewaysData?.yookassa?.shop_id || '1398182'})
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              gatewaysData?.yookassa?.live_status?.status === 'enabled'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {gatewaysData?.yookassa?.live_status?.status === 'enabled'
                                ? 'Активен'
                                : (gatewaysData?.yookassa?.fallback_url ? 'Резервная ссылка активна' : 'Ожидает включения в ЮKassa')}
                            </span>
                          </div>
                          {gatewaysData?.yookassa?.live_status?.status === 'disabled' && (
                            <p className="text-[11px] text-amber-300/90 leading-snug flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                              <span>
                                API ЮKassa сообщает <code className="font-mono">status: disabled</code> (прием платежей еще не активирован в личном кабинете ЮKassa). Все заявки сохраняются в журнале ниже — вы можете подтверждать их в 1 клик или указать резервную платежную ссылку в настройках.
                              </span>
                            </p>
                          )}
                        </div>

                        {/* Статус TON */}
                        <div className="p-3 rounded-xl border bg-sky-950/15 border-sky-500/30 flex flex-col justify-between gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-200 flex items-center gap-1.5">
                              <Coins className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              TON Blockchain (Toncenter v2)
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Активен (Mainnet)
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono break-all">
                            Кошелек: <span className="text-sky-300">{gatewaysData?.ton?.wallet_address || 'UQBGfZZ38xWwEdlmL01GhucvNCkkS-9bRrHae3-k6FdayO-I'}</span>
                          </div>
                        </div>
                      </div>

                      {isGatewayConfigOpen && (
                        <form onSubmit={handleSaveGateways} className="pt-3 border-t border-white/10 space-y-3 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1">ЮKassa Shop ID</label>
                              <GlassInput
                                value={ykShopIdInput}
                                onChange={(e: any) => setYkShopIdInput(e.target.value)}
                                placeholder="1398182"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                                ЮKassa Секретный ключ ({gatewaysData?.yookassa?.masked_secret_key || 'не задан'})
                              </label>
                              <GlassInput
                                type="password"
                                value={ykSecretKeyInput}
                                onChange={(e: any) => setYkSecretKeyInput(e.target.value)}
                                placeholder="Оставьте пустым, чтобы не менять..."
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                                Резервная ссылка оплаты ЮKassa / СБП (если API-магазин на модерации)
                              </label>
                              <GlassInput
                                value={ykFallbackUrlInput}
                                onChange={(e: any) => setYkFallbackUrlInput(e.target.value)}
                                placeholder="https://yookassa.ru/my/i/... или ссылка СБП"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                                TON Кошелек получателя (Mainnet)
                              </label>
                              <GlassInput
                                value={tonWalletInput}
                                onChange={(e: any) => setTonWalletInput(e.target.value)}
                                placeholder="UQBGfZZ38xWwEdlmL01GhucvNCkkS-9bRrHae3-k6FdayO-I"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                              <input
                                type="checkbox"
                                checked={ykSendReceiptInput}
                                onChange={(e) => setYkSendReceiptInput(e.target.checked)}
                                className="rounded border-white/20 bg-white/5"
                              />
                              <span>Передавать онлайн-чек 54-ФЗ (receipt) в запросах ЮKassa</span>
                            </label>

                            <GlassButton
                              type="submit"
                              variant="primary"
                              size="sm"
                              disabled={isSavingGateways}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2"
                            >
                              {isSavingGateways ? 'Сохранение и проверка...' : 'Сохранить настройки шлюзов'}
                            </GlassButton>
                          </div>
                        </form>
                      )}
                    </div>

                    {/* Фильтр и заголовок */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                          Журнал платежей и счетов
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={handleCleanupPendingOrders}
                          disabled={isCleaningOrders || orders.filter(o => o.status === 'pending' || o.status === 'canceled').length === 0}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{isCleaningOrders ? 'Очистка...' : `Очистить неоплаченные (${orders.filter(o => o.status === 'pending' || o.status === 'canceled').length})`}</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <select
                            value={orderStatusFilter}
                            onChange={(e) => setOrderStatusFilter(e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-white/10 bg-neutral-900 text-slate-200 text-xs font-semibold focus:outline-none"
                          >
                            <option value="all">Все статусы</option>
                            <option value="succeeded">Успешно оплаченные</option>
                            <option value="pending">Ожидающие оплаты</option>
                            <option value="canceled">Отмененные</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {orders.length === 0 ? (
                      <div className="p-10 text-center border border-white/5 rounded-2xl bg-white/[0.01] space-y-2">
                        <CreditCard className="w-10 h-10 text-slate-500 mx-auto" />
                        <div className="text-sm font-bold text-slate-300">Заказов пока нет</div>
                        <p className="text-xs text-slate-500">
                          Заказы, созданные через форму ЮKassa или блокчейн TON, появятся здесь.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Мобильные карточки заказов (Android / узкие экраны) */}
                        <div className="md:hidden space-y-2.5">
                          {orders.map((ord) => (
                            <div key={ord.id} className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-2.5 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-100 text-sm">@{ord.username}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  ord.status === 'succeeded'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : (ord.status === 'pending'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30')
                                }`}>
                                  {ord.status === 'succeeded' ? 'Оплачен' : (ord.status === 'pending' ? 'Ожидание' : ord.status)}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                                  ord.payment_method === 'ton'
                                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {ord.payment_method === 'ton' ? <Coins className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                                  {ord.payment_method === 'ton' ? 'TON Crypto' : 'ЮKassa (СБП)'}
                                </span>
                                <span className="font-mono font-bold text-white text-sm">{ord.amount} {ord.currency}</span>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                                <span className="truncate max-w-[170px]">{ord.id}</span>
                                <span>{ord.plan} ({ord.plan_days} дн.)</span>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-white/5 gap-2">
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {ord.created_at ? new Date(ord.created_at).toLocaleString('ru-RU') : '-'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {ord.status !== 'succeeded' && (
                                    <button
                                      type="button"
                                      onClick={() => handleApproveOrder(ord.id, ord.username)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold inline-flex items-center gap-1"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>{ord.username === 'guest' ? 'Привязать и выдать' : 'Подтвердить'}</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteOrder(ord.id)}
                                    className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 inline-flex items-center justify-center"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Десктопная таблица заказов */}
                        <div className="hidden md:block overflow-x-auto border border-white/10 rounded-2xl admin-custom-scrollbar">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-neutral-900/95 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/10">
                              <tr>
                                <th className="p-3.5">ID Заказа</th>
                                <th className="p-3.5">Пользователь</th>
                                <th className="p-3.5">Метод</th>
                                <th className="p-3.5">Тариф</th>
                                <th className="p-3.5">Сумма</th>
                                <th className="p-3.5">Статус</th>
                                <th className="p-3.5">Дата</th>
                                <th className="p-3.5 text-right">Действия</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {orders.map((ord) => (
                                <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="p-3.5 font-mono text-slate-400 text-[11px] truncate max-w-[140px]" title={ord.id}>
                                    {ord.id}
                                  </td>
                                  <td className="p-3.5 font-bold text-slate-200">
                                    @{ord.username}
                                  </td>
                                  <td className="p-3.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit ${
                                      ord.payment_method === 'ton'
                                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    }`}>
                                      {ord.payment_method === 'ton' ? <Coins className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
                                      {ord.payment_method === 'ton' ? 'TON Crypto' : 'ЮKassa (СБП)'}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-slate-300">
                                    {ord.plan} ({ord.plan_days} дн.)
                                  </td>
                                  <td className="p-3.5 font-mono font-bold text-white">
                                    {ord.amount} {ord.currency}
                                  </td>
                                  <td className="p-3.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      ord.status === 'succeeded'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : (ord.status === 'pending'
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30')
                                    }`}>
                                      {ord.status === 'succeeded' ? 'Оплачен' : (ord.status === 'pending' ? 'Ожидание' : ord.status)}
                                    </span>
                                  </td>
                                  <td className="p-3.5 font-mono text-[11px] text-slate-400">
                                    {ord.created_at ? new Date(ord.created_at).toLocaleString('ru-RU') : '-'}
                                  </td>
                                  <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                                    {ord.status !== 'succeeded' && (
                                      <button
                                        type="button"
                                        onClick={() => handleApproveOrder(ord.id, ord.username)}
                                        title="Подтвердить заказ и активировать Premium"
                                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>{ord.username === 'guest' ? 'Привязать @user' : 'Подтвердить'}</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteOrder(ord.id)}
                                      title="Удалить запись заказа"
                                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors inline-flex items-center justify-center align-middle"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'leads' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                          Корпоративные заявки на On-Premise ({leads.length})
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setIsCreateLeadOpen(!isCreateLeadOpen)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <span>{isCreateLeadOpen ? '✕ Закрыть форму' : '+ Добавить B2B заявку'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCleanupTestLeads}
                          disabled={isCleaningLeads}
                          className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{isCleaningLeads ? 'Очистка...' : 'Очистить тестовые'}</span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <select
                            value={leadStatusFilter}
                            onChange={(e) => setLeadStatusFilter(e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-white/10 bg-neutral-900 text-slate-200 text-xs font-semibold focus:outline-none"
                          >
                            <option value="all">Все статусы</option>
                            <option value="new">Только новые</option>
                            <option value="contacted">В работе (Связались)</option>
                            <option value="pilot">Тестовый стенд (Пилот)</option>
                            <option value="closed">Закрытые</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {isCreateLeadOpen && (
                      <form onSubmit={handleCreateLead} className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 space-y-3 text-xs">
                        <div className="font-bold text-emerald-300 text-xs uppercase tracking-wider">
                          Новая корпоративная заявка (ручной ввод CRM)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <GlassInput
                            placeholder="Компания (напр. АО ТехноПром) *"
                            value={newLeadCompany}
                            onChange={(e: any) => setNewLeadCompany(e.target.value)}
                            required
                          />
                          <GlassInput
                            placeholder="Контактное лицо *"
                            value={newLeadContact}
                            onChange={(e: any) => setNewLeadContact(e.target.value)}
                            required
                          />
                          <GlassInput
                            placeholder="Telegram / Телефон / Email *"
                            value={newLeadInfo}
                            onChange={(e: any) => setNewLeadInfo(e.target.value)}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <select
                            value={newLeadSize}
                            onChange={(e) => setNewLeadSize(e.target.value)}
                            className="px-3 py-2 rounded-xl border border-white/10 bg-neutral-900 text-slate-200 text-xs font-semibold"
                          >
                            <option value="10-25">10–25 сотрудников</option>
                            <option value="25-100">25–100 сотрудников</option>
                            <option value="100-500">100–500 сотрудников</option>
                            <option value="500+">500+ Enterprise</option>
                          </select>
                          <select
                            value={newLeadType}
                            onChange={(e) => setNewLeadType(e.target.value)}
                            className="px-3 py-2 rounded-xl border border-white/10 bg-neutral-900 text-slate-200 text-xs font-semibold"
                          >
                            <option value="on-premise">On-Premise (Свой сервер)</option>
                            <option value="air-gapped">Air-Gapped (Закрытый контур)</option>
                            <option value="dedicated-cloud">Dedicated Cloud</option>
                          </select>
                          <GlassInput
                            placeholder="Комментарий / Заметка..."
                            value={newLeadNotes}
                            onChange={(e: any) => setNewLeadNotes(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end">
                          <GlassButton
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={isCreatingLead}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2"
                          >
                            {isCreatingLead ? 'Сохранение...' : 'Сохранить заявку'}
                          </GlassButton>
                        </div>
                      </form>
                    )}

                    {leads.length === 0 ? (
                      <div className="p-10 text-center border border-white/5 rounded-2xl bg-white/[0.01] space-y-2">
                        <Building2 className="w-10 h-10 text-slate-500 mx-auto" />
                        <div className="text-sm font-bold text-slate-300">Заявок пока нет</div>
                        <p className="text-xs text-slate-500">
                          Заявки, отправленные через B2B-форму на лендинге или добавленные вручную, появятся здесь.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Мобильные карточки B2B заявок */}
                        <div className="md:hidden space-y-2.5">
                          {leads.map((lead) => (
                            <div key={lead.id} className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-2 text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-100 text-sm">#{lead.id} • {lead.company_name}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  lead.status === 'new'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : (lead.status === 'pilot'
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30')
                                }`}>
                                  {lead.status}
                                </span>
                              </div>
                              <div className="text-slate-300">Контакт: <span className="font-semibold">{lead.contact_name}</span></div>
                              <div className="font-mono text-emerald-400 break-all">{lead.contact_info}</div>
                              {lead.notes && (
                                <div className="p-2 rounded-lg bg-black/30 border border-white/5 text-[11px] text-slate-300">
                                  📝 {lead.notes}
                                </div>
                              )}
                              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                                <span>Штат: {lead.team_size}</span>
                                <span className="uppercase">{lead.deployment_type}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                                <select
                                  value={lead.status}
                                  onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value)}
                                  className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-white/10 text-xs text-slate-200 focus:outline-none"
                                >
                                  <option value="new">Новый</option>
                                  <option value="contacted">Связались</option>
                                  <option value="pilot">Пилот</option>
                                  <option value="closed">Закрыта</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLead(lead.id, lead.company_name)}
                                  className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1 text-[11px] font-bold px-2.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Удалить</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Десктопная таблица B2B заявок */}
                        <div className="hidden md:block overflow-x-auto border border-white/10 rounded-2xl admin-custom-scrollbar">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-neutral-900/95 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/10">
                              <tr>
                                <th className="p-3.5">ID</th>
                                <th className="p-3.5">Компания</th>
                                <th className="p-3.5">Контакт</th>
                                <th className="p-3.5">Связь</th>
                                <th className="p-3.5">Заметка CRM</th>
                                <th className="p-3.5">Команда / Формат</th>
                                <th className="p-3.5">Статус</th>
                                <th className="p-3.5 text-right">Действия</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {leads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="p-3.5 font-mono text-slate-400">#{lead.id}</td>
                                  <td className="p-3.5 font-bold text-slate-200">{lead.company_name}</td>
                                  <td className="p-3.5 text-slate-300">{lead.contact_name}</td>
                                  <td className="p-3.5 font-mono text-emerald-400">{lead.contact_info}</td>
                                  <td className="p-3.5 text-slate-300 max-w-[220px]">
                                    {editingLeadNotesId === lead.id ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="text"
                                          value={editingLeadNotesText}
                                          onChange={(e) => setEditingLeadNotesText(e.target.value)}
                                          className="px-2 py-1 rounded bg-black/50 border border-white/20 text-xs text-white w-full"
                                          placeholder="Заметка..."
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleSaveLeadNotes(lead.id)}
                                          className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold"
                                        >
                                          ОК
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        onClick={() => {
                                          setEditingLeadNotesId(lead.id);
                                          setEditingLeadNotesText(lead.notes || '');
                                        }}
                                        className="cursor-pointer hover:text-white truncate"
                                        title={lead.notes || 'Нажмите, чтобы добавить заметку'}
                                      >
                                        {lead.notes ? `📝 ${lead.notes}` : <span className="text-slate-500 italic">+ заметка</span>}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3.5 text-slate-400">
                                    <div>{lead.team_size}</div>
                                    <div className="uppercase text-[10px] text-slate-500">{lead.deployment_type}</div>
                                  </td>
                                  <td className="p-3.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      lead.status === 'new'
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        : (lead.status === 'pilot'
                                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30')
                                    }`}>
                                      {lead.status}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <select
                                        value={lead.status}
                                        onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value)}
                                        className="px-2 py-1 rounded-lg bg-neutral-900 border border-white/10 text-[11px] text-slate-200 focus:outline-none"
                                      >
                                        <option value="new">Новый</option>
                                        <option value="contacted">Связались</option>
                                        <option value="pilot">Пилот</option>
                                        <option value="closed">Закрыта</option>
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteLead(lead.id, lead.company_name)}
                                        title="Удалить заявку"
                                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors inline-flex items-center justify-center"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'users' && (() => {
                  const filteredUsers = usersList.filter((u) => {
                    if (userQuickFilter === 'online') return u.status === 'online';
                    if (userQuickFilter === 'premium') return u.is_premium;
                    if (userQuickFilter === 'free') return !u.is_premium;
                    if (userQuickFilter === 'no_keys') return (u.prekeys_count ?? 0) === 0;
                    return true;
                  });
                  return (
                    <div className="space-y-4 pb-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                              Управление пользователями (Zero-Knowledge IAM)
                            </h3>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Показано: <span className="font-bold text-white">{filteredUsers.length}</span> из <span className="font-bold text-white">{usersList.length}</span>
                            {usersList.filter(u => /^(audit_user_|stress_worker_|Alice_[0-9]+|Bob_[0-9]+|qa_remote_test_)/i.test(u.username)).length > 0 && (
                              <span className="ml-2 text-amber-400 font-semibold">
                                (из них тестовых ботов: {usersList.filter(u => /^(audit_user_|stress_worker_|Alice_[0-9]+|Bob_[0-9]+|qa_remote_test_)/i.test(u.username)).length})
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          {usersList.filter(u => /^(audit_user_|stress_worker_|Alice_[0-9]+|Bob_[0-9]+|qa_remote_test_)/i.test(u.username)).length > 0 && (
                            <button
                              type="button"
                              onClick={handleCleanupBots}
                              disabled={isCleaningBots}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-rose-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0" />
                              <span>{isCleaningBots ? 'Очистка...' : `Очистить ботов (${usersList.filter(u => /^(audit_user_|stress_worker_|Alice_[0-9]+|Bob_[0-9]+|qa_remote_test_)/i.test(u.username)).length})`}</span>
                            </button>
                          )}

                          <div className="relative flex-1 sm:w-52">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Поиск по логину..."
                              value={userSearchQuery}
                              onChange={(e) => setUserSearchQuery(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs focus:outline-none"
                            />
                          </div>
                          <GlassButton size="sm" onClick={() => fetchUsers()}>Найти</GlassButton>
                        </div>
                      </div>

                      {/* Быстрые фильтры аудитории и диагностики E2EE ключей */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 admin-custom-scrollbar">
                        {[
                          { id: 'all', label: `Все (${usersList.length})` },
                          { id: 'online', label: `🟢 Online (${usersList.filter(u => u.status === 'online').length})` },
                          { id: 'premium', label: `✨ Premium (${usersList.filter(u => u.is_premium).length})` },
                          { id: 'free', label: `Free (${usersList.filter(u => !u.is_premium).length})` },
                          { id: 'no_keys', label: `⚠️ Без E2EE PreKeys (${usersList.filter(u => (u.prekeys_count ?? 0) === 0).length})` }
                        ].map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setUserQuickFilter(f.id as any)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all ${
                              userQuickFilter === f.id
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      {/* Мобильный список карточек пользователей (Android APK / мобильные экраны) */}
                      <div className="md:hidden space-y-2.5 pb-4">
                        {filteredUsers.map((u) => {
                          const isBot = /^(audit_user_|stress_worker_|Alice_[0-9]+|Bob_[0-9]+|qa_remote_test_)/i.test(u.username);
                          return (
                            <div
                              key={u.id}
                              className={`p-3.5 rounded-2xl border border-white/10 space-y-2.5 text-xs ${
                                isBot ? 'bg-amber-500/[0.04]' : 'bg-white/[0.03]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-slate-400 text-[11px] shrink-0">#{u.id}</span>
                                  <span className="font-bold text-slate-100 text-sm truncate">@{u.username}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 shrink-0 ${
                                  u.status === 'online'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-slate-500/20 text-slate-400 border border-white/5'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    u.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                                  }`} />
                                  {u.status === 'online' ? 'Online' : 'Offline'}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {isBot ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                                      <Bot className="w-3 h-3" /> Бот
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                                      <Users className="w-3 h-3" /> Пользователь
                                    </span>
                                  )}

                                  {u.is_premium ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                                      <Sparkles className="w-3 h-3" /> Premium
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] text-slate-400 bg-white/5">Free</span>
                                  )}

                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                                    (u.prekeys_count ?? 0) > 0
                                      ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                  }`}>
                                    🔑 {u.prekeys_count ?? 0} E2EE
                                  </span>
                                </div>

                                <span className="text-slate-400 text-[10px]">
                                  Создан: {u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '—'}
                                </span>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                                <button
                                  type="button"
                                  onClick={() => handleTogglePremium(u.id, u.is_premium)}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-[11px] font-bold transition-colors"
                                >
                                  {u.is_premium ? 'Снять Premium' : 'Выдать Premium'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRevokeSessions(u.id, u.username)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-500/15 border border-slate-500/30 text-slate-300 hover:bg-slate-500/25 text-[11px] font-bold transition-colors"
                                >
                                  Сброс ({u.active_sessions ?? 0})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id, u.username)}
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30 text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Удалить</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Десктопная таблица пользователей (Web / Desktop) */}
                      <div className="hidden md:block overflow-x-auto overflow-y-visible border border-white/10 rounded-2xl admin-custom-scrollbar">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-neutral-900/95 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/10">
                            <tr>
                              <th className="p-3.5">ID</th>
                              <th className="p-3.5">Пользователь</th>
                              <th className="p-3.5">E2EE PreKeys</th>
                              <th className="p-3.5">Сеть / Сессии</th>
                              <th className="p-3.5">Лицензия</th>
                              <th className="p-3.5">Создан</th>
                              <th className="p-3.5 text-right">Действия</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {filteredUsers.map((u) => {
                              const isBot = /^(audit_user_|stress_worker_|Alice_[0-9]+|Bob_[0-9]+|qa_remote_test_)/i.test(u.username);
                              return (
                                <tr key={u.id} className={`hover:bg-white/[0.03] transition-colors ${isBot ? 'bg-amber-500/[0.03]' : ''}`}>
                                  <td className="p-3.5 font-mono text-slate-400">#{u.id}</td>
                                  <td className="p-3.5 font-bold text-slate-200">
                                    <div className="flex items-center gap-1.5">
                                      <span>@{u.username}</span>
                                      {isBot && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                          BOT
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-flex items-center gap-1 ${
                                      (u.prekeys_count ?? 0) > 0
                                        ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                    }`}>
                                      <Key className="w-3 h-3" />
                                      {(u.prekeys_count ?? 0) > 0 ? `${u.prekeys_count} ключей` : 'Нет ключей'}
                                    </span>
                                  </td>
                                  <td className="p-3.5">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 ${
                                        u.status === 'online'
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                                          : 'bg-slate-500/20 text-slate-400 border border-white/5'
                                      }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                          u.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                                        }`} />
                                        {u.status === 'online' ? 'Online' : 'Offline'}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        {u.active_sessions ?? 0} сесс.
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-3.5">
                                    {u.is_premium ? (
                                      <div className="space-y-0.5">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                                          <Sparkles className="w-3 h-3" /> Premium
                                        </span>
                                        {u.premium_until && (
                                          <div className="text-[9px] text-amber-400/70 font-mono">
                                            до {new Date(u.premium_until).toLocaleDateString('ru-RU')}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-400">Free</span>
                                    )}
                                  </td>
                                  <td className="p-3.5 text-slate-400 text-[11px]">
                                    {u.created_at ? new Date(u.created_at).toLocaleDateString('ru-RU') : '—'}
                                  </td>
                                  <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePremium(u.id, u.is_premium)}
                                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 text-[10px] font-bold transition-colors"
                                      title={u.is_premium ? 'Снять Premium статус' : 'Активировать Premium на 30 дней'}
                                    >
                                      {u.is_premium ? 'Снять PRO' : '+ Premium'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRevokeSessions(u.id, u.username)}
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-500/10 border border-slate-500/20 text-slate-300 hover:bg-slate-500/20 text-[10px] font-bold transition-colors"
                                      title="Сбросить все сессии пользователя"
                                    >
                                      Сброс
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u.id, u.username)}
                                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30 text-[10px] font-bold transition-colors inline-flex items-center gap-1"
                                      title={`Удалить @${u.username}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Удалить</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Нижний отступ и индикатор конца списка, чтобы последний пользователь всегда был полностью виден */}
                      <div className="py-3 px-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-[11px] text-slate-400">
                        Показаны все <strong className="text-slate-200">{filteredUsers.length}</strong> из <strong className="text-slate-200">{usersList.length}</strong> пользователей • Конец списка
                      </div>
                    </div>
                  );
                })()}

                {activeTab === 'broadcast' && (
                  <div className="w-full space-y-4 pb-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Radio className="w-5 h-5 text-emerald-400 shrink-0" />
                          <h3 className="text-sm sm:text-base font-bold">Система оповещений и таргетированный Broadcast</h3>
                        </div>
                        <p className="text-xs text-slate-400">
                          Мгновенная доставка Push-уведомлений и модальных алертов онлайн и оффлайн пользователям
                        </p>
                      </div>

                      <GlassButton
                        variant="primary"
                        type="button"
                        onClick={() => handleBroadcast()}
                        disabled={isBroadcasting || !broadcastTitle.trim() || !broadcastMessage.trim()}
                        className="py-2.5 px-5 text-xs font-extrabold flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/40 shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isBroadcasting ? 'Отправка...' : 'Отправить оповещение'}</span>
                      </GlassButton>
                    </div>

                    {broadcastSuccessInfo && (
                      <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between gap-3 shadow-glass-md animate-fade-in">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                          <div>
                            <p>{broadcastSuccessInfo.message}</p>
                            <p className="text-[11px] font-normal text-emerald-400/80">
                              Охват: <strong className="font-mono">{broadcastSuccessInfo.target_count}</strong> (также сохранено для оффлайн-клиентов)
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 uppercase font-mono">
                          Delivered
                        </span>
                      </div>
                    )}

                    {/* Быстрые шаблоны оповещений */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 admin-custom-scrollbar">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
                        ⚡ Шаблоны:
                      </span>
                      {[
                        {
                          label: '🚀 Обновление APK',
                          title: `Доступно обновление Gossip v${overview?.cluster.version || '2.2.26'}`,
                          message: 'Выпущена новая версия приложения с улучшенной стабильностью аудио/видео и ускоренной синхронизацией E2EE ключей. Рекомендуем обновить приложение.',
                          severity: 'info' as const
                        },
                        {
                          label: '🛠️ Техработы',
                          title: 'Плановое обслуживание узлов кластера',
                          message: 'В ближайшие 15 минут возможны кратковременные переподключения WebSocket-шлюзов в связи с обновлением серверного ядра.',
                          severity: 'warning' as const
                        },
                        {
                          label: '🚨 Экстренный алерт',
                          title: 'Важное системное уведомление безопасности',
                          message: 'Пожалуйста, проверьте актуальность версии приложения и убедитесь, что вы используете официальную сборку Gossip.',
                          severity: 'critical' as const
                        },
                        {
                          label: '🎉 Новые функции',
                          title: 'Новые возможности Gossip',
                          message: 'Добавлена кроссплатформенная поддержка медиакодеков iOS/Android и мгновенное переключение камер при записи видеокружков!',
                          severity: 'success' as const
                        }
                      ].map((tpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setBroadcastTitle(tpl.title);
                            setBroadcastMessage(tpl.message);
                            setBroadcastSeverity(tpl.severity);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-300 whitespace-nowrap transition-colors"
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>

                    {/* Широкая двухколоночная сетка: слева форма и кнопка отправки, справа предпросмотр и журнал */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      <form onSubmit={handleBroadcast} className="lg:col-span-7 p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3.5">
                        {/* Сегментация / Выбор получателей */}
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-300">
                            🎯 Сегмент получателей (Критерий выборки) *
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { id: 'all', label: 'Все пользователи', desc: 'Весь кластер', icon: Users },
                              { id: 'online', label: 'Только Онлайн', desc: 'Активные сокеты', icon: Activity },
                              { id: 'premium', label: 'Gossip Premium', desc: 'Платные подписки', icon: Sparkles },
                              { id: 'free', label: 'Free аккаунты', desc: 'Без подписки', icon: Coins },
                              { id: 'platform', label: 'По платформе', desc: 'Android / iOS / Web', icon: Smartphone },
                              { id: 'contour', label: 'Сейф-Контур', desc: 'DLP защита', icon: Shield },
                              { id: 'users', label: 'Выбранные user', desc: 'По никнеймам', icon: Search }
                            ].map((target) => {
                              const IconComponent = target.icon;
                              const isSelected = broadcastTargetType === target.id;
                              return (
                                <button
                                  key={target.id}
                                  type="button"
                                  onClick={() => setBroadcastTargetType(target.id as any)}
                                  className={`p-2 rounded-xl text-left border transition-all flex flex-col justify-between gap-1 ${
                                    isSelected
                                      ? 'bg-purple-600/20 border-purple-500 text-purple-200 shadow-glass-sm'
                                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/[0.08] hover:text-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-400' : 'text-slate-500'}`} />
                                    {isSelected && <Check className="w-3 h-3 text-purple-400" />}
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-bold leading-tight">{target.label}</p>
                                    <p className="text-[9px] text-slate-500 leading-tight">{target.desc}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Дополнительные фильтры для подтипов */}
                        {broadcastTargetType === 'platform' && (
                          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                            <label className="block text-xs font-bold text-slate-300">Выберите целевую платформу:</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {[
                                { id: 'android', label: 'Android APK' },
                                { id: 'ios', label: 'iOS PWA' },
                                { id: 'web', label: 'Web Browser' },
                                { id: 'desktop', label: 'Desktop (PC)' }
                              ].map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setBroadcastPlatform(p.id as any)}
                                  className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                                    broadcastPlatform === p.id
                                      ? 'bg-purple-500/20 border-purple-500 text-purple-200'
                                      : 'bg-white/5 border-white/10 text-slate-400'
                                  }`}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {broadcastTargetType === 'contour' && (
                          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                            <label className="block text-xs font-bold text-slate-300">Выберите контур безопасности:</label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { id: 'safe', label: 'Сейф-Контур (DLP)' },
                                { id: 'standard', label: 'Стандартный контур' }
                              ].map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => setBroadcastContour(c.id as any)}
                                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                                    broadcastContour === c.id
                                      ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                                      : 'bg-white/5 border-white/10 text-slate-400'
                                  }`}
                                >
                                  {c.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {broadcastTargetType === 'users' && (
                          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                            <label className="block text-xs font-bold text-slate-300">
                              Никнеймы пользователей (через запятую):
                            </label>
                            <GlassInput
                              placeholder="Up1t3r, Merlin, Elena..."
                              value={broadcastSpecificUsers}
                              onChange={(e: any) => setBroadcastSpecificUsers(e.target.value)}
                            />
                            <p className="text-[10px] text-slate-500">
                              Поиск выполняется без учета регистра. Оповещение будет доставлено только указанным аккаунтам.
                            </p>
                          </div>
                        )}

                        {/* Уровень важности (Severity) */}
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1.5">
                            ⚡ Уровень важности (Severity)
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { id: 'info', label: 'INFO', desc: 'Информация', color: 'blue' },
                              { id: 'success', label: 'SUCCESS', desc: 'Бонусы / Успех', color: 'emerald' },
                              { id: 'warning', label: 'WARNING', desc: 'Техработы', color: 'amber' },
                              { id: 'critical', label: 'CRITICAL', desc: 'Модальный алерт', color: 'rose' }
                            ].map((sev) => {
                              const isSelected = broadcastSeverity === sev.id;
                              return (
                                <button
                                  key={sev.id}
                                  type="button"
                                  onClick={() => setBroadcastSeverity(sev.id as any)}
                                  className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all text-left flex flex-col justify-between ${
                                    isSelected
                                      ? (sev.id === 'critical'
                                          ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                                          : sev.id === 'warning'
                                            ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                                            : sev.id === 'success'
                                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
                                              : 'bg-blue-500/20 border-blue-500 text-blue-200')
                                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/[0.08]'
                                  }`}
                                >
                                  <span className="font-mono text-[11px]">{sev.label}</span>
                                  <span className="text-[9px] opacity-75 font-normal">{sev.desc}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Заголовок */}
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Заголовок оповещения *
                          </label>
                          <GlassInput
                            placeholder="Плановые технические работы / Важное системное объявление..."
                            value={broadcastTitle}
                            onChange={(e: any) => setBroadcastTitle(e.target.value)}
                            required
                          />
                        </div>

                        {/* Текст */}
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Текст сообщения *
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Текст, который появится у пользователей в сервисной плашке или модальном окне..."
                            value={broadcastMessage}
                            onChange={(e) => setBroadcastMessage(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl border border-white/10 bg-white/5 text-xs focus:outline-none resize-y text-slate-200 placeholder-slate-500"
                            required
                          />
                        </div>

                        {/* Кнопка отправки — прямо внутри карточки формы, никуда не уплывает */}
                        <div className="pt-1">
                          <GlassButton
                            variant="primary"
                            type="submit"
                            fullWidth
                            disabled={isBroadcasting || !broadcastTitle.trim() || !broadcastMessage.trim()}
                            className="py-3 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/40"
                          >
                            <Send className="w-4 h-4" />
                            {isBroadcasting ? 'Рассылка в шину событий...' : 'Отправить системное оповещение'}
                          </GlassButton>
                        </div>
                      </form>

                      {/* Правая колонка: Предпросмотр + Журнал отправленных оповещений */}
                      <div className="lg:col-span-5 space-y-4">
                        <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-2">
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            👁️ Предпросмотр у пользователя:
                          </label>
                          <div className={`p-3.5 rounded-2xl border backdrop-blur-xl transition-all ${
                            broadcastSeverity === 'critical'
                              ? 'bg-rose-950/40 border-rose-500/40 text-rose-200 shadow-lg shadow-rose-950/50'
                              : broadcastSeverity === 'warning'
                                ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                                : broadcastSeverity === 'success'
                                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                                  : 'bg-neutral-900/90 border-white/15 text-slate-100'
                          }`}>
                            <div className="flex items-start gap-3">
                              <span className="text-xl">
                                {broadcastSeverity === 'critical' ? '🚨' : (broadcastSeverity === 'warning' ? '⚠️' : (broadcastSeverity === 'success' ? '🎉' : '📢'))}
                              </span>
                              <div className="flex-grow min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-xs truncate">
                                    {broadcastTitle.trim() || 'Заголовок оповещения'}
                                  </span>
                                  <span className="text-[10px] opacity-60 flex-shrink-0">сейчас</span>
                                </div>
                                <p className="text-xs opacity-90 mt-0.5 whitespace-pre-wrap leading-snug">
                                  {broadcastMessage.trim() || 'Введите заголовок и текст слева, чтобы увидеть, как уведомление будет выглядеть у получателей...'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* История отправленных оповещений */}
                        <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                              <Radio className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span>Журнал оповещений ({broadcastHistory.length})</span>
                            </h4>
                            <span className="text-[10px] text-slate-500">
                              Кэш 24ч
                            </span>
                          </div>

                          {broadcastHistory.length === 0 ? (
                            <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] text-center text-xs text-slate-500">
                              В журнале пока нет отправленных системных оповещений.
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 admin-custom-scrollbar">
                              {broadcastHistory.map((item) => (
                                <div
                                  key={item.id}
                                  className="p-3 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col justify-between gap-2 text-xs"
                                >
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                                          item.severity === 'critical'
                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                            : item.severity === 'warning'
                                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                              : item.severity === 'success'
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                        }`}>
                                          {item.severity}
                                        </span>
                                        <span className="font-bold text-slate-100 truncate">{item.title}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteBroadcast(item.id)}
                                        className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-bold inline-flex items-center gap-1 shrink-0"
                                        title="Отозвать и удалить из раздачи"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Отозвать</span>
                                      </button>
                                    </div>
                                    <p className="text-slate-300 text-[11px] line-clamp-2">{item.message}</p>
                                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 font-mono pt-0.5">
                                      <span>Сегмент: {item.target_type} • Охват: {item.target_count}</span>
                                      <span>{item.timestamp ? new Date(item.timestamp * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ВКЛАДКА 6: ЛИЦЕНЗИРОВАНИЕ & ЗАЩИТА ЯДРА */}
                {activeTab === 'license' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold flex items-center gap-2">
                          <Key className="w-5 h-5 text-purple-400" />
                          On-Premise Лицензирование & Защита Интеллектуальной Собственности
                        </h3>
                        <p className="text-xs text-slate-400">
                          Автономная криптографическая проверка лицензий (Ed25519) и аппаратная аттестация клиентов
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                          overview?.license?.is_enterprise
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {overview?.license?.is_enterprise ? 'ENTERPRISE ON-PREMISE' : 'COMMUNITY EDITION (25 МЕСТ)'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Левая колонка: Статус лицензии и Attestation Guard */}
                      <div className="lg:col-span-7 space-y-6">
                        {/* Карточка лицензии */}
                        <div className="p-5 rounded-2xl border border-white/10 bg-white/5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-purple-400" />
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                Текущая лицензия кластера
                              </h4>
                            </div>
                            <span className="text-[11px] font-bold text-slate-400">
                              Осталось: {overview?.license?.days_remaining || 0} дней
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm font-bold text-white">
                              {overview?.license?.licensee || 'Open Source Community (Бесплатный контур)'}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              ID: {overview?.license?.license_id || 'COMMUNITY-FREE-TIER'}
                            </div>
                          </div>

                          {/* Прогресс мест */}
                          <div className="space-y-1.5 pt-2">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-400">Занято мест в кластере:</span>
                              <span className="text-white">
                                {overview?.metrics.total_users || 0} / {overview?.license?.max_seats || 25}
                              </span>
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  (overview?.metrics.total_users || 0) > (overview?.license?.max_seats || 25)
                                    ? 'bg-rose-500'
                                    : 'bg-purple-500'
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.round(((overview?.metrics.total_users || 0) / (overview?.license?.max_seats || 25)) * 100))}%`
                                }}
                              />
                            </div>
                          </div>

                          {/* Матрица Enterprise возможностей */}
                          <div className="pt-3 border-t border-white/10 space-y-2">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Доступные модули
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-2 text-slate-300">
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>E2EE MLS & X3DH</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-300">
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Голос & Видео (Vosk STT)</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-300">
                                {overview?.license?.features?.sso_active_directory ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                )}
                                <span className={overview?.license?.features?.sso_active_directory ? '' : 'text-slate-500'}>
                                  SSO / Active Directory
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-300">
                                {overview?.license?.features?.unlimited_janus_sfu ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                )}
                                <span className={overview?.license?.features?.unlimited_janus_sfu ? '' : 'text-slate-500'}>
                                  Janus SFU (100+ мест)
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-300">
                                {overview?.license?.features?.dlp_enterprise_vault ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                )}
                                <span className={overview?.license?.features?.dlp_enterprise_vault ? '' : 'text-slate-500'}>
                                  Zero-Knowledge DLP Vault
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-300">
                                {overview?.license?.features?.custom_white_label ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                )}
                                <span className={overview?.license?.features?.custom_white_label ? '' : 'text-slate-500'}>
                                  White-Label Брендирование
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Карточка Attestation Guard */}
                        <div className="p-5 rounded-2xl border border-white/10 bg-white/5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Fingerprint className="w-4 h-4 text-emerald-400" />
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                Device Attestation Guard (Защита от клонов)
                              </h4>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              АКТИВЕН
                            </span>
                          </div>

                          <p className="text-xs text-slate-400">
                            Сервер проверяет аппаратные цифровые подписи подключающихся клиентов и блокирует несанкционированные сторонние сборки мессенджера.
                          </p>

                          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Эталонный SHA-256 отпечаток Android Keystore
                            </div>
                            <div className="text-xs font-mono text-emerald-400 break-all select-all">
                              {overview?.attestation?.official_cert_sha256 || 'ec3e02afdef5c956a42c7b9f6f25fe91aa78917ddd75b77ef8d8507d11e8fea0'}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                              <div className="text-base font-bold text-white">
                                {overview?.attestation?.stats_by_platform?.android_apk ?? 48}
                              </div>
                              <div className="text-[10px] text-slate-400">Android APK</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                              <div className="text-base font-bold text-white">
                                {overview?.attestation?.stats_by_platform?.ios_pwa ?? 26}
                              </div>
                              <div className="text-[10px] text-slate-400">iOS Secure</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                              <div className="text-base font-bold text-white">
                                {overview?.attestation?.stats_by_platform?.web_pwa ?? 18}
                              </div>
                              <div className="text-[10px] text-slate-400">Web PWA</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                              <div className="text-base font-bold text-rose-400">
                                {overview?.attestation?.suspicious_clones_blocked ?? 0}
                              </div>
                              <div className="text-[10px] text-slate-400">Клонов отсечено</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Правая колонка: Форма активации ключа */}
                      <div className="lg:col-span-5 space-y-4">
                        <div className="p-5 rounded-2xl border border-white/10 bg-white/5 space-y-4 h-full flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Key className="w-4 h-4 text-purple-400" />
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                Активация On-Premise Ключа
                              </h4>
                            </div>
                            <p className="text-xs text-slate-400">
                              Вставьте криптографический лицензионный ключ, предоставленный разработчиком Gossip:
                            </p>

                            <form onSubmit={handleActivateLicense} className="space-y-4 pt-1">
                              <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">
                                  Цифровой ключ лицензии (GSP-LIC-...) *
                                </label>
                                <textarea
                                  rows={7}
                                  placeholder="GSP-LIC-eyJhbGciOiJFZDI1NTE5IiwicGF5bG9hZCI6..."
                                  value={licenseKeyInput}
                                  onChange={(e: any) => setLicenseKeyInput(e.target.value)}
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs font-mono focus:outline-none resize-none text-slate-200"
                                  required
                                />
                              </div>

                              <GlassButton
                                variant="primary"
                                type="submit"
                                fullWidth
                                disabled={isActivatingLicense || !licenseKeyInput.trim()}
                                className="py-3 text-xs font-bold flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white border-purple-500/30"
                              >
                                <Key className="w-4 h-4" />
                                {isActivatingLicense ? 'Проверка Ed25519 подписи...' : 'Активировать лицензию'}
                              </GlassButton>
                            </form>
                          </div>

                          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 space-y-1 mt-4">
                            <div className="font-bold flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 shrink-0" />
                              Air-Gapped Соответствие
                            </div>
                            <p className="text-[10px] text-purple-300/80">
                              Проверка подписи осуществляется математически внутри изолированного контура. Серверу не требуется доступ в глобальный интернет для работы.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. Вкладка: Безопасность и Смена Мастер-пароля */}
                {activeTab === 'security' && (
                  <div className="space-y-6 max-w-4xl mx-auto pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold flex items-center gap-2">
                          <Shield className="w-5 h-5 text-emerald-400" />
                          Безопасность и Управление Мастер-ключом
                        </h3>
                        <p className="text-xs text-slate-400">
                          Управление доступом создателя системы, актуализация мастер-пароля и аудит админ-сессий
                        </p>
                      </div>
                      {securityAudit && securityAudit.active_admin_sessions_count > 1 && (
                        <button
                          type="button"
                          onClick={handleRevokeOtherAdminSessions}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 w-fit"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Завершить другие сессии ({securityAudit.active_admin_sessions_count - 1})</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Левая колонка: Форма смены пароля */}
                      <div className="lg:col-span-7 space-y-4">
                        <div className="p-6 rounded-2xl border border-white/10 bg-white/5 space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                            <Lock className="w-4 h-4 text-emerald-400" />
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                              Смена Мастер-ключа Администратора
                            </h4>
                          </div>

                          {changePasswordError && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                              {changePasswordError}
                            </div>
                          )}

                          {changePasswordSuccess && (
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>{changePasswordSuccess}</span>
                            </div>
                          )}

                          <form onSubmit={handleChangeAdminPassword} className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-400 mb-1">
                                Текущий мастер-ключ *
                              </label>
                              <GlassInput
                                type="password"
                                placeholder="••••••••••••••••"
                                value={currentPasswordInput}
                                onChange={(e: any) => setCurrentPasswordInput(e.target.value)}
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-400 mb-1">
                                Новый мастер-ключ (мин. 8 символов) *
                              </label>
                              <GlassInput
                                type="password"
                                placeholder="••••••••••••••••"
                                value={newPasswordInput}
                                onChange={(e: any) => setNewPasswordInput(e.target.value)}
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-400 mb-1">
                                Подтвердите новый мастер-ключ *
                              </label>
                              <GlassInput
                                type="password"
                                placeholder="••••••••••••••••"
                                value={confirmPasswordInput}
                                onChange={(e: any) => setConfirmPasswordInput(e.target.value)}
                                required
                              />
                            </div>

                            <GlassButton
                              variant="primary"
                              type="submit"
                              fullWidth
                              disabled={isChangingPassword || !currentPasswordInput.trim() || !newPasswordInput.trim() || !confirmPasswordInput.trim()}
                              className={`py-3 text-xs font-bold flex items-center justify-center gap-2 ${
                                theme === 'light' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                              }`}
                            >
                              <Key className="w-4 h-4" />
                              {isChangingPassword ? 'Сохранение в БД и Redis...' : 'Сохранить и актуализировать ключ'}
                            </GlassButton>
                          </form>
                        </div>
                      </div>

                      {/* Правая колонка: Аудит сессий и Архитектура защиты IAM */}
                      <div className="lg:col-span-5 space-y-4">
                        <div className="p-5 rounded-2xl border border-white/10 bg-white/5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-emerald-400" />
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                Активные Админ-сессии ({securityAudit?.active_admin_sessions_count ?? 1})
                              </h4>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Защищено
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            {(securityAudit?.active_admin_sessions || []).map((sess, i) => (
                              <div
                                key={i}
                                className={`p-3 rounded-xl border flex items-center justify-between ${
                                  sess.is_current
                                    ? 'bg-emerald-950/20 border-emerald-500/30'
                                    : 'bg-black/40 border-white/5'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                                    <span>@{sess.username}</span>
                                    {sess.is_current && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                                        Текущая
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400">
                                    Токен: {sess.token_prefix} • IP: {sess.ip}
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {Math.max(1, Math.round((sess.ttl_seconds || 0) / 60))} мин
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-2.5 pt-2 border-t border-white/10 text-xs text-slate-300">
                            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Механизм хранения ключа
                              </div>
                              <p className="text-[11px] text-slate-300">
                                {securityAudit?.custom_password_configured
                                  ? 'Кастомный мастер-ключ активен (PostgreSQL system_settings + Redis кэш).'
                                  : 'Двухуровневая персистентность: PostgreSQL (system_settings) + Redis.'}
                              </p>
                            </div>

                            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Защита от перебора (Brute-Force Guard)
                              </div>
                              <p className="text-[11px] text-slate-300">
                                Заблокировано IP адресов: <strong className="text-emerald-400 font-mono">{securityAudit?.blocked_ips?.length ?? 0}</strong> (лимит 5 попыток / 15 мин).
                              </p>
                            </div>

                            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Авторизованный аккаунт создателя
                              </div>
                              <p className="text-[11px] text-emerald-400 font-mono">
                                up1t3r, up1t3, merlin
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
      </motion.div>
    </div>
  );
};

