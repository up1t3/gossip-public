// frontend/src/core/call/janus-sfu-client.ts
// Release Train R5 (v2.2.0): Janus SFU VideoRoom Client for Multi-Party Calls & Screen Share

import { VoIPClient, getJanusRoomId } from '../voip/voipClient';
import { tdlib } from '../tdlib/tdlib-adapter';
import { GroupCallParticipant } from '../../types';

export interface JanusSFUClientOptions {
  chatId: string;
  callId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  onWebSocketClose?: () => void;
  onParticipantsChange?: (participants: GroupCallParticipant[]) => void;
  onActiveSpeakerChange?: (speakerFeedId: number | null, audioLevels?: Map<number, number>) => void;
  onScreenShareChange?: (isSharing: boolean) => void;
  onError?: (error: Error) => void;
}

export class JanusSFUClient {
  public chatId: string;
  public callId: string;
  public userId: string;
  public displayName: string;
  public avatarUrl?: string;
  public roomId: number;

  private sessionId: string | null = null;
  private publisherHandleId: string | null = null;
  private publisherPc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  private isScreenSharing = false;
  private myFeedId: number | null = null;

  private subscribers = new Map<number, { handleId: string; pc: RTCPeerConnection; stream: MediaStream }>();
  private participants = new Map<number, GroupCallParticipant>();
  private activeSpeakerFeedId: number | null = null;

  private audioContext: AudioContext | null = null;
  private audioAnalysers = new Map<number, { source: MediaStreamAudioSourceNode; analyser: AnalyserNode }>();
  private audioMonitoringInterval: any = null;
  private pollingInterval: any = null;
  private isDestroyed = false;

  private onParticipantsChange?: (participants: GroupCallParticipant[]) => void;
  private onActiveSpeakerChange?: (speakerFeedId: number | null, audioLevels?: Map<number, number>) => void;
  private onScreenShareChange?: (isSharing: boolean) => void;
  private onError?: (error: Error) => void;

  constructor(options: JanusSFUClientOptions) {
    this.chatId = options.chatId;
    this.callId = options.callId;
    this.userId = options.userId;
    this.displayName = options.displayName;
    this.avatarUrl = options.avatarUrl;
    this.roomId = getJanusRoomId(options.chatId);

    this.onParticipantsChange = options.onParticipantsChange;
    this.onActiveSpeakerChange = options.onActiveSpeakerChange;
    this.onScreenShareChange = options.onScreenShareChange;
    this.onError = options.onError;
  }

  public async start(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24 } }
      });
      const vTracks = this.localStream.getVideoTracks();
      if (vTracks.length > 0) {
        this.cameraTrack = vTracks[0];
      }

      this.myFeedId = Math.floor(Math.random() * 899999) + 100000;
      this.participants.set(this.myFeedId, {
        feedId: this.myFeedId,
        userId: this.userId,
        displayName: this.displayName + ' (Вы)',
        avatarUrl: this.avatarUrl,
        stream: this.localStream,
        isMuted: false,
        isVideoOff: false,
        isSpeaking: false,
        isScreenSharing: false,
        audioLevel: 0
      });
      this.emitParticipants();

      await this.initJanusPublisher();
      this.startAudioMonitoring();
      this.startParticipantsPolling();
      await this.notifyJoinREST();

      return this.localStream;
    } catch (err: any) {
      if (this.onError) this.onError(err);
      throw err;
    }
  }

  private async getIceServers(): Promise<RTCIceServer[]> {
    try {
      const creds = await VoIPClient.getTurnCredentials();
      const servers: RTCIceServer[] = [
        { urls: ['stun:skuf-net.ru:3478', 'stun:stun.l.google.com:19302'] }
      ];
      if (creds && (creds as any).uris && Array.isArray((creds as any).uris)) {
        servers.push({
          urls: (creds as any).uris,
          username: creds.username,
          credential: creds.credential || (creds as any).password
        });
      }
      return servers;
    } catch {
      return [{ urls: 'stun:stun.l.google.com:19302' }];
    }
  }

  /**
   * Шлюз возвращает {session_id, sessionId} (без обертки data.id, как сырой Janus).
   * Поддерживаем оба формата для совместимости.
   */
  private extractId(res: any, key: 'session_id' | 'handle_id'): string | null {
    if (!res) return null;
    return res[key] ?? res[`${key}Id`] ?? res.data?.id ?? null;
  }

  /** Trickle ICE через поддерживаемый шлюзом путь: message + JSON-кандидат в поле sdp. */
  private sendTrickle(handleId: string, candidate: RTCIceCandidate | null): void {
    if (!this.sessionId || !handleId) return;
    const payload = candidate ? JSON.stringify(candidate) : JSON.stringify({ completed: true });
    VoIPClient.janusRequest('message', this.sessionId, handleId, payload)
      .catch((e) => console.warn('[JanusSFUClient] Trickle candidate error:', e));
  }

  private async initJanusPublisher(): Promise<void> {
    try {
      const createRes = await VoIPClient.janusRequest('create');
      const createdSessionId = this.extractId(createRes, 'session_id');
      if (!createdSessionId) {
        throw new Error(`Janus session creation failed: ${JSON.stringify(createRes)?.slice(0, 200)}`);
      }
      this.sessionId = createdSessionId;
      const attachRes = await VoIPClient.janusRequest('attach', createdSessionId);
      const attachedHandleId = this.extractId(attachRes, 'handle_id');
      if (!attachedHandleId) {
        throw new Error(`Janus handle attach failed: ${JSON.stringify(attachRes)?.slice(0, 200)}`);
      }
      this.publisherHandleId = attachedHandleId;

      const iceServers = await this.getIceServers();
      this.publisherPc = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 4 });

      if (this.localStream) {
        const audioTrack = this.localStream.getAudioTracks()[0];
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (audioTrack && this.publisherPc && this.localStream) {
          this.publisherPc.addTrack(audioTrack, this.localStream);
        }
        // Видео публикуем с simulcast-слоями, чтобы SFU мог подстраивать качество под получателей
        if (videoTrack && this.publisherPc && this.localStream) {
          this.publisherPc.addTransceiver(videoTrack, {
            direction: 'sendonly',
            streams: [this.localStream],
            sendEncodings: [
              { rid: 'h', maxBitrate: 1200000, scaleResolutionDownBy: 1.0 },
              { rid: 'm', maxBitrate: 400000, scaleResolutionDownBy: 2.0 },
              { rid: 'l', maxBitrate: 120000, scaleResolutionDownBy: 4.0 }
            ]
          });
        }
      }

      this.publisherPc!.onicecandidate = (event) => {
        if (this.publisherHandleId) {
          this.sendTrickle(this.publisherHandleId, event.candidate);
        }
      };

      // Мониторинг ICE-состояния издателя: без него обрыв сети замораживает публикацию молча
      this.publisherPc!.oniceconnectionstatechange = () => {
        const state = this.publisherPc?.iceConnectionState;
        console.log(`[JanusSFUClient] Publisher ICE state: ${state}`);
        if ((state === 'failed' || state === 'disconnected') && !this.isDestroyed) {
          this.triggerIceRestart();
        } else if (state === 'connected' || state === 'completed') {
          // Соединение восстановлено — разрешаем будущие рестарты
          this.restartAttempted = false;
        }
      };

      const joinRes = await VoIPClient.janusRequest(
        'message',
        this.sessionId || undefined,
        this.publisherHandleId || undefined,
        undefined,
        {
          request: 'join',
          ptype: 'publisher',
          room: this.roomId,
          id: this.myFeedId,
          display: this.displayName
        }
      );

      if (joinRes && joinRes.plugindata && joinRes.plugindata.data && joinRes.plugindata.data.publishers) {
        for (const pub of joinRes.plugindata.data.publishers) {
          await this.subscribeToFeed(pub.id, pub.display, pub.user_id);
        }
      }

      const offer = await this.publisherPc!.createOffer();
      await this.publisherPc!.setLocalDescription(offer);

      const pubRes = await VoIPClient.janusRequest(
        'message',
        this.sessionId || undefined,
        this.publisherHandleId || undefined,
        offer.sdp,
        {
          request: 'publish',
          audio: true,
          video: true,
          simulcast: true,
          bitrate: 1200000
        }
      );

      // Шлюз для sdp-сообщений возвращает расплющенный {sdp, feedId, plugindata}
      const answerSdp = pubRes?.sdp || pubRes?.jsep?.sdp;
      if (answerSdp) {
        await this.publisherPc!.setRemoteDescription(new RTCSessionDescription({
          type: 'answer',
          sdp: answerSdp
        }));
        // Janus назначает feed_id сам — синхронизируем наш идентификатор участника
        const assignedFeedId = pubRes?.feedId ?? pubRes?.plugindata?.data?.id;
        if (typeof assignedFeedId === 'number' && assignedFeedId !== this.myFeedId) {
          const me = this.participants.get(this.myFeedId as number);
          this.myFeedId = assignedFeedId;
          if (me) {
            this.participants.delete(me.feedId);
            me.feedId = assignedFeedId;
            this.participants.set(assignedFeedId, me);
          }
          this.emitParticipants();
        }
      } else {
        throw new Error(`Janus publish failed: ${JSON.stringify(pubRes)?.slice(0, 200)}`);
      }
    } catch (e: any) {
      console.error('[JanusSFUClient] Publisher init failed:', e?.message || e);
      if (this.onError) this.onError(new Error(`Публикация в группу не удалась: ${e?.message || e}`));
    }
  }

  private restartAttempted = false;

  /** Однократный ICE-restart публикации при обрыве (без сигналинг-шторма). */
  private async triggerIceRestart(): Promise<void> {
    if (this.isDestroyed || this.restartAttempted) return;
    if (!this.publisherPc || !this.sessionId || !this.publisherHandleId) return;
    this.restartAttempted = true;
    try {
      const offer = await this.publisherPc.createOffer({ iceRestart: true });
      await this.publisherPc.setLocalDescription(offer);
      const res = await VoIPClient.janusRequest(
        'message',
        this.sessionId,
        this.publisherHandleId,
        offer.sdp,
        { request: 'configure', restart: true },
        undefined,
        undefined,
        { jsepType: 'offer' }
      );
      const answerSdp = res?.sdp || res?.jsep?.sdp;
      if (answerSdp) {
        await this.publisherPc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }));
        console.log('[JanusSFUClient] Publisher ICE restart выполнен');
      }
    } catch (e) {
      console.error('[JanusSFUClient] Publisher ICE restart error:', e);
    }
  }

  private async subscribeToFeed(feedId: number, displayName?: string, userId?: string): Promise<void> {
    if (this.subscribers.has(feedId) || feedId === this.myFeedId || !this.sessionId) return;

    try {
      const attachRes = await VoIPClient.janusRequest('attach', this.sessionId);
      const subHandleId = this.extractId(attachRes, 'handle_id');
      if (!subHandleId) return;

      const iceServers = await this.getIceServers();
      const subPc = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 4 });
      const remoteStream = new MediaStream();

      subPc.ontrack = (event) => {
        if (event.track) {
          remoteStream.addTrack(event.track);
          const p = this.participants.get(feedId);
          if (p) {
            p.stream = remoteStream;
            this.emitParticipants();
          }
        }
      };

      subPc.onicecandidate = (event) => {
        this.sendTrickle(subHandleId, event.candidate);
      };

      // Мониторинг ICE подписчика: заморозка медиа должна быть видимой и восстановимой
      subPc.oniceconnectionstatechange = () => {
        const state = subPc.iceConnectionState;
        console.log(`[JanusSFUClient] Subscriber ${feedId} ICE state: ${state}`);
      };

      this.subscribers.set(feedId, { handleId: subHandleId, pc: subPc, stream: remoteStream });

      this.participants.set(feedId, {
        feedId,
        userId: userId || 'user_' + feedId,
        displayName: displayName || ('Участник ' + feedId),
        avatarUrl: undefined,
        stream: remoteStream,
        isMuted: false,
        isVideoOff: false,
        isSpeaking: false,
        isScreenSharing: false,
        audioLevel: 0
      });
      this.emitParticipants();

      const joinRes = await VoIPClient.janusRequest(
        'message',
        this.sessionId,
        subHandleId,
        undefined,
        {
          request: 'join',
          ptype: 'subscriber',
          room: this.roomId,
          feed: feedId
        }
      );

      if (joinRes?.jsep) {
        await subPc.setRemoteDescription(new RTCSessionDescription(joinRes.jsep));
        const answer = await subPc.createAnswer();
        await subPc.setLocalDescription(answer);

        await VoIPClient.janusRequest(
          'message',
          this.sessionId,
          subHandleId,
          answer.sdp,
          { request: 'start', room: this.roomId }
        );
      }

      this.attachAudioAnalyser(feedId, remoteStream);
    } catch (err) {
      console.error(`[JanusSFUClient] Subscription error for feed ${feedId}:`, err);
    }
  }

  public async startScreenShare(): Promise<boolean> {
    if (this.isScreenSharing) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      console.warn('[JanusSFUClient] getDisplayMedia is not supported');
      return false;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 }
      });
      const s0Track = displayStream.getVideoTracks()[0];
      if (!s0Track) return false;

      this.screenTrack = s0Track;
      this.isScreenSharing = true;

      s0Track.onended = () => {
        this.stopScreenShare().catch(() => {});
      };

      if (this.publisherPc) {
        const senders = this.publisherPc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(s0Track);
        }
      }

      if (this.localStream) {
        const oldTrack = this.localStream.getVideoTracks()[0];
        if (oldTrack) {
          this.localStream.removeTrack(oldTrack);
        }
        this.localStream.addTrack(s0Track);
      }

      if (this.myFeedId) {
        const me = this.participants.get(this.myFeedId);
        if (me) {
          me.isScreenSharing = true;
          me.stream = this.localStream || undefined;
          this.emitParticipants();
        }
      }

      if (this.onScreenShareChange) {
        this.onScreenShareChange(true);
      }

      await this.notifyScreenShareREST(true);
      return true;
    } catch (err: any) {
      console.error('[JanusSFUClient] Error starting screen share:', err);
      return false;
    }
  }

  public async stopScreenShare(): Promise<void> {
    if (!this.isScreenSharing) return;

    if (this.screenTrack) {
      this.screenTrack.stop();
      this.screenTrack = null;
    }

    this.isScreenSharing = false;

    if (this.cameraTrack && this.publisherPc) {
      const senders = this.publisherPc.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(this.cameraTrack);
      }
    }

    if (this.localStream && this.cameraTrack) {
      const currentVTrack = this.localStream.getVideoTracks()[0];
      if (currentVTrack) {
        this.localStream.removeTrack(currentVTrack);
      }
      this.localStream.addTrack(this.cameraTrack);
    }

    if (this.myFeedId) {
      const me = this.participants.get(this.myFeedId);
      if (me) {
        me.isScreenSharing = false;
        me.stream = this.localStream || undefined;
        this.emitParticipants();
      }
    }

    if (this.onScreenShareChange) {
      this.onScreenShareChange(false);
    }

    await this.notifyScreenShareREST(false);
  }

  public toggleMute(): boolean {
    if (!this.localStream) return false;
    const aTrack = this.localStream.getAudioTracks()[0];
    if (!aTrack) return false;
    aTrack.enabled = !aTrack.enabled;
    const isMuted = !aTrack.enabled;

    if (this.myFeedId) {
      const me = this.participants.get(this.myFeedId);
      if (me) {
        me.isMuted = isMuted;
        this.emitParticipants();
      }
    }

    if (this.sessionId && this.publisherHandleId) {
      VoIPClient.janusRequest(
        'message',
        this.sessionId,
        this.publisherHandleId,
        undefined,
        {
          request: 'configure',
          audio: !isMuted
        }
      ).catch(() => {});
    }

    return isMuted;
  }

  public toggleVideo(): boolean {
    if (!this.localStream) return false;
     const vTrack = this.localStream.getVideoTracks()[0];
    if (!vTrack) return false;
    vTrack.enabled = !vTrack.enabled;
    const isVideoOff = !vTrack.enabled;

    if (this.myFeedId) {
      const me = this.participants.get(this.myFeedId);
      if (me) {
        me.isVideoOff = isVideoOff;
        this.emitParticipants();
      }
    }

    if (this.sessionId && this.publisherHandleId) {
      VoIPClient.janusRequest(
        'message',
        this.sessionId,
        this.publisherHandleId,
        undefined,
        {
          request: 'configure',
          video: !isVideoOff
        }
      ).catch(() => {});
    }

    return isVideoOff;
  }

  private startAudioMonitoring(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.audioContext = new AudioCtx();
      if (this.localStream && this.myFeedId) {
        this.attachAudioAnalyser(this.myFeedId, this.localStream);
      }
      this.audioMonitoringInterval = setInterval(() => {
        this.calculateActiveSpeaker();
      }, 120);
    } catch (e) {}
  }

  private attachAudioAnalyser(feedId: number, stream: MediaStream): void {
    if (!this.audioContext || !stream.getAudioTracks().length) return;
    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      this.audioAnalysers.set(feedId, { source, analyser });
    } catch (e) {}
  }

  private calculateActiveSpeaker(): void {
    const audioLevels = new Map<number, number>();
    let maxLevel = 0;
    let speakerFeedId: number | null = null;
    let hasChanged = false;

    this.audioAnalysers.forEach((config, feedId) => {
      const buffer = new Uint8Array(config.analyser.frequencyBinCount);
      config.analyser.getByteFrequencyData(buffer);

      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
      }
      const rms = Math.sqrt(sum / buffer.length) / 255;
      audioLevels.set(feedId, rms);

      const isSpeaking = rms > 0.06;
      const p = this.participants.get(feedId);
      if (p) {
        if (p.isSpeaking !== isSpeaking || Math.abs((p.audioLevel || 0) - rms) > 0.1) {
          p.isSpeaking = isSpeaking;
          p.audioLevel = rms;
          hasChanged = true;
        }
      }

      if (rms > maxLevel && rms > 0.06) {
        maxLevel = rms;
        speakerFeedId = feedId;
      }
    });

    if (this.activeSpeakerFeedId !== speakerFeedId) {
      this.activeSpeakerFeedId = speakerFeedId;
      if (this.onActiveSpeakerChange) {
        this.onActiveSpeakerChange(speakerFeedId, audioLevels);
      }
    }

    if (hasChanged) {
      this.emitParticipants();
    }
  }

  private startParticipantsPolling(): void {
    this.pollingInterval = setInterval(async () => {
      if (this.isDestroyed || !this.sessionId || !this.publisherHandleId) return;
      try {
        const res = await VoIPClient.janusRequest(
          'message',
          this.sessionId,
          this.publisherPc ? this.publisherHandleId : undefined,
          undefined,
          {
            request: 'listparticipants',
            room: this.roomId
          }
        );

        if (res && res.plugindata && res.plugindata.data && Array.isArray(res.plugindata.data.participants)) {
          for (const pub of res.plugindata.data.participants) {
            const fId = pub.id || pub.feed_id;
            if (fId && fId !== this.myFeedId && !this.subscribers.has(fId) && pub.publisher !== false) {
              await this.subscribeToFeed(fId, pub.display, pub.user_id);
            }
          }
        }
      } catch (e) {}
    }, 3000);
  }

  private async notifyJoinREST(): Promise<void> {
    try {
      if (typeof fetch !== 'undefined') {
        await fetch('/api/v1/calls/group/' + this.callId + '/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: this.userId,
            display_name: this.displayName,
            avatar_url: this.avatarUrl,
            chat_id: this.chatId
          })
        }).catch(() => {});
      }
    } catch (e) {}
  }

  private async notifyLeaveREST(): Promise<void> {
    try {
      if (typeof fetch !== 'undefined') {
        await fetch('/api/v1/calls/group/' + this.callId + '/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: this.userId })
        }).catch(() => {});
      }
    } catch (e) {}
  }

  private async notifyScreenShareREST(isSharing: boolean): Promise<void> {
    try {
      if (typeof fetch !== 'undefined') {
        await fetch('/api/v1/calls/group/' + this.callId + '/screen-share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: this.userId,
            is_sharing: isSharing
          })
        }).catch(() => {});
      }

      tdlib.send('voip_group_call_screen_share', {
        callId: this.callId,
        chatId: this.chatId,
        isSharing
      }).catch(() => {});
    } catch (e) {}
  }

  private emitParticipants(): void {
    if (this.onParticipantsChange) {
      this.onParticipantsChange(Array.from(this.participants.values()));
    }
  }

  public async destroy(): Promise<void> {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    if (this.audioMonitoringInterval) {
      clearInterval(this.audioMonitoringInterval);
      this.audioMonitoringInterval = null;
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.isScreenSharing) {
      await this.stopScreenShare().catch(() => {});
    }

    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }
    this.audioAnalysers.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    if (this.publisherPc) {
      this.publisherPc.close();
      this.publisherPc = null;
    }

    this.subscribers.forEach((config) => {
      config.stream.getTracks().forEach((t) => t.stop());
      config.pc.close();
    });
    this.subscribers.clear();
    this.participants.clear();

    await this.notifyLeaveREST();

    if (this.sessionId) {
      VoIPClient.janusRequest('destroy', this.sessionId).catch(() => {});
      this.sessionId = null;
    }

    this.emitParticipants();
  }

  public getParticipants(): GroupCallParticipant[] {
    return Array.from(this.participants.values());
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }
}
