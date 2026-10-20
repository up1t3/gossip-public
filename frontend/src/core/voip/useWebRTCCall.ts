// E:\Boltalka\frontend\src\core\voip\useWebRTCCall.ts
import { useState, useEffect, useRef } from 'react';
import { VoIPClient, getJanusRoomId } from './voipClient';
import { voipAudio } from './voipAudio';
import { Capacitor } from '@capacitor/core';
import { BoltalkaVoIP } from './voipPlugin';
import { AudioSessionPlugin } from './audioSessionPlugin';

/**
 * Статусы VoIP звонка.
 */
export type CallStatus = 'idle' | 'connecting' | 'active' | 'failed' | 'disconnected' | 'ended';

/**
 * Хук для управления WebRTC звонком.
 */
export function useWebRTCCall() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const nativeIceListenerRef = useRef<any>(null);
  const callIdRef = useRef<string | null>(null);
  const iceRestartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const handleIdRef = useRef<string | null>(null);

  const subPcRef = useRef<RTCPeerConnection | null>(null);
  const subHandleIdRef = useRef<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const chatIdRef = useRef<string | null>(null);

  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSubstreamRef = useRef<0 | 1 | 2>(2);
  const lastPacketsLostRef = useRef<number>(0);
  const lastPacketsReceivedRef = useRef<number>(0);

  const pendingIceCandidatesRef = useRef<any[]>([]);
  const isSignalingReadyRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const myFeedIdRef = useRef<number | null>(null);
  const subscribedFeedsRef = useRef<Set<number>>(new Set());
  const connectionWatchdogRef = useRef<NodeJS.Timeout | null>(null);
  const subRetryCountRef = useRef<Map<number, number>>(new Map());

  console.log(`[useWebRTCCall LOG] Rendered: callStatus=${callStatus}, hasLocal=${!!localStream}, hasRemote=${!!remoteStream}, callId=${callIdRef.current}`);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      endCall();
    };
  }, []);

  const setRemoteSubstream = async (substream: 0 | 1 | 2) => {
    // substream: 0 = low, 1 = medium, 2 = high
    if (Capacitor.isNativePlatform()) {
      try {
        await BoltalkaVoIP.setRemoteSubstream({ substream });
        console.log(`[VoIP] Нативное переключение substream: ${substream}`);
      } catch (err) {
        console.error('Ошибка нативного переключения substream:', err);
      }
    }
    // Simulcast-слои выбираются на ПРИЕМНИКЕ: configure уходит в subscriber-handle Janus,
    // а не в publisher-handle (иначе Janus игнорирует запрос на издателе).
    const sessionId = sessionIdRef.current;
    const subHandleId = subHandleIdRef.current;
    if (sessionId && subHandleId) {
      try {
        await VoIPClient.janusRequest('message', sessionId, subHandleId, undefined, {
          request: "configure",
          substream: substream
        });
        console.log(`[VoIP] Динамическое переключение substream: ${substream}`);
      } catch (err) {
        console.error('Ошибка переключения substream:', err);
      }
    }
  };

  useEffect(() => {
    if (callStatus === 'active' || callStatus === 'failed' || callStatus === 'ended' || callStatus === 'disconnected') {
      try {
        voipAudio.stopRingback();
        voipAudio.stopRingtone();
      } catch (err) {}
    }
    if (callStatus === 'active') {
      lastPacketsLostRef.current = 0;
      lastPacketsReceivedRef.current = 0;
      currentSubstreamRef.current = 2; // high
      
      const interval = setInterval(async () => {
        // Входящее видео приходит через subscriber-PC; у publisher-PC (send-only)
        // нет inbound-rtp видеопотока, поэтому loss/RTT читаем оттуда, где есть прием.
        const pc = subPcRef.current || pcRef.current;
        if (!pc) return;

        try {
          const stats = await pc.getStats();
          let rtt: number | null = null;
          let packetsLost = 0;
          let packetsReceived = 0;

          stats.forEach((report) => {
            if (report.type === 'remote-inbound-rtp' && report.kind === 'video') {
              if (typeof report.roundTripTime === 'number') {
                rtt = report.roundTripTime * 1000; // переводим в мс
              }
            }
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
              if (typeof report.packetsReceived === 'number') {
                packetsReceived = report.packetsReceived;
              }
              if (typeof report.packetsLost === 'number') {
                packetsLost = report.packetsLost;
              }
            }
          });
          
          const diffLost = packetsLost - lastPacketsLostRef.current;
          const diffReceived = packetsReceived - lastPacketsReceivedRef.current;
          const totalPackets = diffLost + diffReceived;
          const lossRate = totalPackets > 0 ? (diffLost / totalPackets) * 100 : 0;
          
          lastPacketsLostRef.current = packetsLost;
          lastPacketsReceivedRef.current = packetsReceived;
          
          // Проверяем пороговые значения
          let targetSubstream: 0 | 1 | 2 = currentSubstreamRef.current;
          if ((rtt !== null && rtt > 350) || lossRate > 5) {
            if (currentSubstreamRef.current === 2) {
              targetSubstream = 1;
            } else if (currentSubstreamRef.current === 1) {
              targetSubstream = 0;
            }
          } else if ((rtt === null || rtt < 150) && lossRate < 1) {
            if (currentSubstreamRef.current === 0) {
              targetSubstream = 1;
            } else if (currentSubstreamRef.current === 1) {
              targetSubstream = 2;
            }
          }
          
          if (targetSubstream !== currentSubstreamRef.current) {
            currentSubstreamRef.current = targetSubstream;
            // Переключение слоя simulcast выполняется на subscriber-handle
            const sid = sessionIdRef.current;
            const targetHandle = subHandleIdRef.current || handleIdRef.current;
            if (sid && targetHandle) {
              VoIPClient.janusRequest('message', sid, targetHandle, undefined, {
                request: "configure",
                substream: targetSubstream
              }).then(() => {
                console.log(`[VoIP] Адаптивное авто-переключение substream на: ${targetSubstream}`);
              }).catch(err => {
                console.error('Ошибка адаптивного переключения substream:', err);
              });
            }
          }
        } catch (e) {
          console.warn('Ошибка опроса getStats:', e);
        }
      }, 2000);
      
      statsIntervalRef.current = interval;
    } else {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    }
  }, [callStatus]);

  const handleIceCandidate = (candidate: any) => {
    const sessionId = sessionIdRef.current;
    const handleId = handleIdRef.current;
    // null-кандидат означает конец сбора: Janus требует маркер {"completed":true}
    const payload = candidate ? candidate : { completed: true };
    if (!sessionId || !handleId) {
      console.warn('[WebRTC] Накопление ICE-кандидата: сессия или хэндл не инициализированы.');
      pendingIceCandidatesRef.current.push(payload);
      return;
    }

    if (isSignalingReadyRef.current) {
      VoIPClient.janusRequest('message', sessionId, handleId, JSON.stringify(payload))
        .catch(err => console.error('Ошибка отправки ICE-кандидата:', err));
    } else {
      console.log('[WebRTC] Накопление ICE-кандидата в очереди до завершения сигнализации.');
      pendingIceCandidatesRef.current.push(payload);
    }
  };

  const flushPendingIceCandidates = () => {
    const sessionId = sessionIdRef.current;
    const handleId = handleIdRef.current;
    if (!sessionId || !handleId) return;

    console.log(`[WebRTC] Отправка ${pendingIceCandidatesRef.current.length} накопленных ICE-кандидатов из очереди.`);
    while (pendingIceCandidatesRef.current.length > 0) {
      const candidate = pendingIceCandidatesRef.current.shift();
      VoIPClient.janusRequest('message', sessionId, handleId, JSON.stringify(candidate))
        .catch(err => console.error('Ошибка отправки накопленного ICE-кандидата:', err));
    }
  };
  const stopParticipantsPolling = () => {
    if (pollingIntervalRef.current) {
      console.log('[VoIP] Остановка поллинга участников.');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const subscribeToFeed = async (feedId: number, sessionId: string) => {
    try {
      console.log(`[VoIP] Запуск подписки на feedId: ${feedId}`);
      
      const attachRes = await VoIPClient.janusRequest('attach', sessionId);
      const subHandleId = attachRes.handle_id;
      subHandleIdRef.current = subHandleId;
      
      console.log(`[VoIP] Создан handle для подписчика: ${subHandleId}`);
      
      let turnConfig: RTCConfiguration = {};
      try {
        const turnCreds = await VoIPClient.getTurnCredentials();
        const uris = (turnCreds && turnCreds.uris && turnCreds.uris.length > 0)
          ? turnCreds.uris
          : ['turn:skuf-net.ru:3478?transport=udp', 'turn:skuf-net.ru:3478?transport=tcp', 'turns:skuf-net.ru:5349?transport=tcp'];
        turnConfig = {
          iceTransportPolicy: 'all',
          iceCandidatePoolSize: 4,
          iceServers: [
            {
              urls: uris,
              username: turnCreds.username,
              credential: turnCreds.credential || turnCreds.password
            },
            {
              urls: ['stun:skuf-net.ru:3478', 'stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302']
            }
          ]
        };
      } catch (e) {
        console.warn('[VoIP] Не удалось получить TURN-серверы для подписчика, используем дефолтные:', e);
        turnConfig = {
          iceTransportPolicy: 'all',
          iceCandidatePoolSize: 4,
          iceServers: [
            { urls: ['stun:skuf-net.ru:3478', 'stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
          ]
        };
      }

      const subPc = new RTCPeerConnection(turnConfig);
      // Закрываем предыдущий subscriber-PC, иначе его transports остаются жить (утечка)
      if (subPcRef.current && subPcRef.current !== subPc) {
        try { subPcRef.current.close(); } catch (e) { console.warn('[VoIP] Ошибка закрытия старого subscriber-PC:', e); }
      }
      subPcRef.current = subPc;

      const remote = new MediaStream();
      remoteStreamRef.current = remote;

      subPc.ontrack = (event) => {
        console.log('[VoIP Subscriber] ontrack triggered!', event.track.kind, event.track.id);
        remote.addTrack(event.track);

        const newStream = new MediaStream(remote.getTracks());
        setRemoteStream(newStream);
        setCallStatus('active');
        subRetryCountRef.current.delete(feedId);
        if (connectionWatchdogRef.current) {
          clearTimeout(connectionWatchdogRef.current);
          connectionWatchdogRef.current = null;
        }
      };

      subPc.onicecandidate = (event) => {
        if (event.candidate) {
          VoIPClient.janusRequest('message', sessionId, subHandleId, JSON.stringify(event.candidate))
            .catch(err => console.error('[VoIP Subscriber] Ошибка отправки ICE кандидата:', err));
        } else {
          // end-of-candidates: маркер completed для ускорения ICE-checks на Janus
          VoIPClient.janusRequest('message', sessionId, subHandleId, JSON.stringify({ completed: true }))
            .catch(err => console.error('[VoIP Subscriber] Ошибка отправки completed-маркера:', err));
        }
      };

      subPc.oniceconnectionstatechange = () => {
        const state = subPc.iceConnectionState;
        console.log(`[VoIP Subscriber] ICE Connection State: ${state}`);
        if (state === 'connected' || state === 'completed') {
          const tracks = remote.getTracks();
          if (tracks.length > 0) {
            setRemoteStream(new MediaStream(tracks));
          }
          setCallStatus('active');
          if (connectionWatchdogRef.current) {
            clearTimeout(connectionWatchdogRef.current);
            connectionWatchdogRef.current = null;
          }
        } else if (state === 'failed') {
          // Без пересоздания подписки медиа после обрыва сети не восстанавливается
          scheduleSubscriberResubscribe(feedId, sessionId);
        }
      };
      
      const currentCallId = callIdRef.current || '';
      const roomId = getJanusRoomId(currentCallId);
      
      const joinRes = await VoIPClient.janusRequest('message', sessionId, subHandleId, undefined, {
        request: "join",
        room: roomId,
        ptype: "subscriber",
        feed: feedId,
        offer_audio: true,
        offer_video: true
      }, currentCallId, roomId);
      
      console.log('[VoIP Subscriber] Результат join:', joinRes);
      
      if (joinRes && joinRes.jsep && joinRes.jsep.sdp) {
        await subPc.setRemoteDescription(new RTCSessionDescription({
          type: 'offer',
          sdp: joinRes.jsep.sdp
        }));
        
        const answer = await subPc.createAnswer();
        await subPc.setLocalDescription(answer);
        
        // Ждем локальных кандидатов подписчика с таймаутом 400мс
        if (subPc.iceGatheringState !== 'complete') {
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              subPc.removeEventListener('icegatheringstatechange', checkState);
              resolve();
            }, 400);
            const checkState = () => {
              if (subPc.iceGatheringState === 'complete') {
                clearTimeout(timeout);
                subPc.removeEventListener('icegatheringstatechange', checkState);
                resolve();
              }
            };
            subPc.addEventListener('icegatheringstatechange', checkState);
          });
        }

        const completeAnswerSdp = subPc.localDescription?.sdp || answer.sdp;
        const startRes = await VoIPClient.janusRequest('message', sessionId, subHandleId, completeAnswerSdp, {
          request: "start",
          room: roomId
        }, currentCallId, roomId);
        console.log('[VoIP Subscriber] Результат start:', startRes);
      } else {
        throw new Error('Не удалось получить SDP Offer от Janus для подписчика');
      }
    } catch (err) {
      console.error('[VoIP] Ошибка при подписке на поток:', err);
      subscribedFeedsRef.current.delete(feedId);
    }
  };

  /**
   * Перезапускает подписку на feed после ICE-failure у subscriber-PC.
   * Ограничено двумя попытками на feed за звонок, чтобы не устроить сигналинг-шторм.
   */
  const scheduleSubscriberResubscribe = (feedId: number, sessionId: string) => {
    const attempts = subRetryCountRef.current.get(feedId) || 0;
    if (attempts >= 2) {
      console.warn(`[VoIP Subscriber] Исчерпаны попытки переподписки на feed ${feedId}`);
      return;
    }
    subRetryCountRef.current.set(feedId, attempts + 1);
    setTimeout(() => {
      if (callIdRef.current && sessionIdRef.current === sessionId) {
        subscribedFeedsRef.current.delete(feedId);
        subscribeToFeed(feedId, sessionId);
      }
    }, 1500);
  };

  const startParticipantsPolling = (targetChatId: string, sessionId: string, handleId: string) => {
    stopParticipantsPolling();
    
    console.log(`[VoIP] Запуск поллинга участников для chatId: ${targetChatId}`);
    const currentCallId = callIdRef.current || '';
    const roomId = getJanusRoomId(currentCallId);
    
    const poll = async () => {
      try {
        if (!sessionIdRef.current || !handleIdRef.current) return;
        
        const res = await VoIPClient.janusRequest('message', sessionId, handleId, undefined, {
          request: "listparticipants",
          room: roomId
        }, currentCallId, roomId);
        
        if (res && res.plugindata && res.plugindata.data && res.plugindata.data.participants) {
          const participants = res.plugindata.data.participants;
          console.log('[VoIP] Список участников комнаты:', participants);
          
          // Все активные издатели кроме нас самих
          const otherPublishers = participants.filter((p: any) => 
            p.publisher === true && (!myFeedIdRef.current || p.id !== myFeedIdRef.current)
          );
          
          // 1. Ищем по точному display или без учета регистра
          let target = otherPublishers.find((p: any) => 
            p.display === targetChatId || 
            (typeof p.display === 'string' && typeof targetChatId === 'string' && p.display.toLowerCase() === targetChatId.toLowerCase())
          );
          
          // 2. Если по display не нашли, но в комнате есть другой издатель — это наш собеседник!
          if (!target && otherPublishers.length > 0) {
            console.log('[VoIP] Собеседник найден по списку издателей комнаты:', otherPublishers[0]);
            target = otherPublishers[0];
          }

          if (target && !subscribedFeedsRef.current.has(target.id)) {
            console.log(`[VoIP] Собеседник найден! feedId: ${target.id}. Подписываемся.`);
            subscribedFeedsRef.current.add(target.id);
            stopParticipantsPolling();
            subscribeToFeed(target.id, sessionId);
          }
        }
      } catch (err) {
        console.error('[VoIP] Ошибка поллинга участников:', err);
      }
    };
    
    poll();
    pollingIntervalRef.current = setInterval(poll, 1200);
  };

  /**
   * Запускает VoIP-звонок.
   */
  const startCall = async (
    callId: string,
    isOutgoing: boolean = false,
    chatId?: string,
    callerName?: string,
    mediaType: 'audio' | 'video' = 'video',
    constraints: MediaStreamConstraints = {
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: true
    }
  ) => {
    if (!callId || !callId.trim()) {
      console.warn('[useWebRTCCall] startCall вызван с пустым callId, пропускаем');
      return;
    }

    if (isStartingRef.current || (callIdRef.current === callId && (callStatus === 'connecting' || callStatus === 'active'))) {
      console.log(`[useWebRTCCall] startCall уже выполняется или активен для callId=${callId}, пропускаем повторный запуск`);
      return;
    }
    isStartingRef.current = true;

    try {
      setCallStatus('connecting');
      callIdRef.current = callId;
      chatIdRef.current = chatId || null;
      isSignalingReadyRef.current = false;
      pendingIceCandidatesRef.current = [];

      const isNative = Capacitor.isNativePlatform();
      if (isNative) {
        await AudioSessionPlugin.setCommunicationMode().catch(e => console.error(e));
      }

      if (isOutgoing) {
        voipAudio.startRingback();
      }

      if (isOutgoing && chatId) {
        const myUsername = localStorage.getItem("username") || "Пользователь";
        const myAvatar = localStorage.getItem("avatar") || "";
        console.log(`[VoIP] Отправка приглашения к звонку: callId=${callId}, chatId=${chatId}, callerName=${myUsername}, hasAvatar=${!!myAvatar}`);
        await VoIPClient.inviteCall(chatId, callId, myUsername, mediaType, myAvatar).catch(e => console.error(e));
      }

      // Форсируем стандартный WebRTC в WebView для полноценного аудио/видео
      const useNativeVoIP = false;
      if (useNativeVoIP) {
        // Получаем TURN credentials для мобильных
        let iceServersList: any[] = [];
        try {
          const turnCreds = await VoIPClient.getTurnCredentials();
          iceServersList = [
            {
              urls: turnCreds.uris,
              username: turnCreds.username,
              credential: turnCreds.credential || turnCreds.password
            }
          ];
        } catch (e) {
          console.warn('Не удалось получить TURN-серверы для нативного WebRTC, используем дефолт:', e);
        }

        await BoltalkaVoIP.initialize({ callId, mediaType, iceServers: iceServersList });
        const session = await VoIPClient.janusRequest('create');
        sessionIdRef.current = session.session_id;
        const handle = await VoIPClient.janusRequest('attach', session.session_id);
        handleIdRef.current = handle.handle_id;

        const nativeIceListener = await BoltalkaVoIP.addListener('iceCandidate', (data) => {
          if (data.candidate) {
            handleIceCandidate(data.candidate);
          }
        });
        nativeIceListenerRef.current = nativeIceListener;

        const { sdp: offerSdp } = await BoltalkaVoIP.createOffer({ callId });
        const answerRes = await VoIPClient.janusRequest('message', sessionIdRef.current || undefined, handleIdRef.current || undefined, offerSdp);
        if (answerRes && answerRes.sdp) {
          await BoltalkaVoIP.setRemoteDescription({ callId, sdp: answerRes.sdp });
          isSignalingReadyRef.current = true;
          flushPendingIceCandidates();
          setCallStatus('active');
        } else {
          throw new Error('Не удалось получить SDP Answer от Janus');
        }
        return;
      }

      // 1-3. TURN-креденшелы, локальный медиапоток и Janus-сессия независимы друг от друга
      // и запрашиваются ПАРАЛЛЕЛЬНО — это убирает 1-2 сетевых round-trip из времени соединения.
      const turnConfigPromise = (async (): Promise<RTCConfiguration> => {
        try {
          const turnCreds = await VoIPClient.getTurnCredentials();
          const uris = (turnCreds && turnCreds.uris && turnCreds.uris.length > 0)
            ? turnCreds.uris
            : ['turn:skuf-net.ru:3478?transport=udp', 'turn:skuf-net.ru:3478?transport=tcp', 'turns:skuf-net.ru:5349?transport=tcp'];
          return {
            iceTransportPolicy: 'all',
            iceCandidatePoolSize: 4,
            iceServers: [
              {
                urls: uris,
                username: turnCreds.username,
                credential: turnCreds.credential || turnCreds.password
              },
              {
                urls: ['stun:skuf-net.ru:3478', 'stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302']
              }
            ]
          };
        } catch (e) {
          console.warn('Не удалось получить TURN-серверы, используем дефолтные:', e);
          return {
            iceTransportPolicy: 'all',
            iceCandidatePoolSize: 4,
            iceServers: [
              { urls: ['stun:skuf-net.ru:3478', 'stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
            ]
          };
        }
      })();

      const mediaPromise = (async (): Promise<MediaStream> => {
        let actualConstraints: MediaStreamConstraints = { ...constraints };

        // Если mediaType равен 'audio', принудительно отключаем видео
        if (mediaType === 'audio') {
          actualConstraints.video = false;
        }

        try {
          return await navigator.mediaDevices.getUserMedia(actualConstraints);
        } catch (mediaErr: any) {
          console.warn('[useWebRTCCall] Не удалось получить медиапоток с исходными constraints:', mediaErr);

          // Фоллбек 1: Если просили видео, пробуем базовые constraints
          if (actualConstraints.video) {
            try {
              console.log('[useWebRTCCall] Пробуем базовые видео/аудио constraints...');
              return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            } catch (e2) {
              console.log('[useWebRTCCall] Пробуем фоллбек: только аудио...');
              try {
                const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                console.log('[useWebRTCCall] Фоллбек на аудио-поток успешен.');
                return audioOnly;
              } catch (audioErr: any) {
                console.error('[useWebRTCCall] Ошибка даже при запросе только аудио:', audioErr);
                throw new Error('Не удалось получить доступ к микрофону или камере.');
              }
            }
          } else {
            // Если сразу просили только аудио и упало
            throw new Error('Не удалось получить доступ к микрофону.');
          }
        }
      })();

      const sessionPromise = VoIPClient.janusRequest('create').then((s: any) => {
        if (s?.session_id) {
          sessionIdRef.current = s.session_id;
        }
        return s;
      });

      const [turnConfig, stream, session] = await Promise.all([turnConfigPromise, mediaPromise, sessionPromise]);
      if (!session?.session_id) {
        throw new Error('Janus: пустой session_id при создании сессии');
      }
      sessionIdRef.current = session.session_id;
      const handle = await VoIPClient.janusRequest('attach', session.session_id);
      handleIdRef.current = handle.handle_id;

      console.log('[useWebRTCCall LOG] getUserMedia success. Stream id:', stream.id, 'tracks:', stream.getTracks().map(t => `${t.kind}:${t.id}:${t.enabled}`));
      setLocalStream(stream);

      // 4. Создаем RTCPeerConnection
      const pc = new RTCPeerConnection(turnConfig);
      pcRef.current = pc;

      // Добавляем локальные треки (аудио стандартно, видео с Simulcast)
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      if (audioTrack) {
        pc.addTrack(audioTrack, stream);
      }

      if (videoTrack) {
        pc.addTransceiver(videoTrack, {
          direction: 'sendonly',
          streams: [stream],
          sendEncodings: [
            { rid: 'h', maxBitrate: 1200000, scaleResolutionDownBy: 1.0 },
            { rid: 'm', maxBitrate: 400000, scaleResolutionDownBy: 2.0 },
            { rid: 'l', maxBitrate: 120000, scaleResolutionDownBy: 4.0 }
          ]
        });
      }

      // Обработка удаленного потока
      const remote = new MediaStream();
      pc.ontrack = (event) => {
        console.log('[useWebRTCCall LOG] pc.ontrack triggered!', event.track.kind, event.track.id);
        
        // Аккумулируем треки напрямую через event.track
        remote.addTrack(event.track);
        
        // Создаем новую копию MediaStream, чтобы React обновил ссылку и перерисовал UI
        const newStream = new MediaStream(remote.getTracks());
        setRemoteStream(newStream);
        setCallStatus('active');
      };

      // Обработка кандидатов ICE (включая null -> completed-маркер для Janus)
      pc.onicecandidate = (event) => {
        handleIceCandidate(event.candidate);
      };

      // Мониторинг состояния ICE соединения для перезапуска за 4 секунды
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log(`[WebRTC] ICE Connection State: ${state}`);

        if (state === 'failed') {
          setCallStatus('failed');
          triggerIceRestart();
        } else if (state === 'disconnected') {
          setCallStatus('disconnected');
          if (!iceRestartTimerRef.current) {
            iceRestartTimerRef.current = setTimeout(() => {
              if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                console.log('[WebRTC] Быстрый автоматический ICE Restart после выхода из сна...');
                triggerIceRestart();
              }
            }, 1200);
          }
        } else if (state === 'connected' || state === 'completed') {
          console.log('[useWebRTCCall LOG] ICE connected/completed. Setting callStatus to active.');
          setCallStatus('active');
          clearIceRestartTimer();
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Ждем сбора локальных кандидатов с таймаутом 600мс, чтобы не зависать в gathering
      if (pc.iceGatheringState !== 'complete') {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            pc.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }, 600);
          const checkState = () => {
            if (pc.iceGatheringState === 'complete') {
              clearTimeout(timeout);
              pc.removeEventListener('icegatheringstatechange', checkState);
              resolve();
            }
          };
          pc.addEventListener('icegatheringstatechange', checkState);
        });
      }

      const completeSdp = pc.localDescription?.sdp || offer.sdp;

      if (sessionIdRef.current && handleIdRef.current) {
        const currentCallId = callIdRef.current || '';
        const roomId = getJanusRoomId(currentCallId);
        const answerRes = await VoIPClient.janusRequest('message', sessionIdRef.current, handleIdRef.current, completeSdp, undefined, currentCallId, roomId);
        if (answerRes && answerRes.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription({
            type: 'answer',
            sdp: answerRes.sdp
          }));
          isSignalingReadyRef.current = true;
          flushPendingIceCandidates();

          if (answerRes.feedId) {
            myFeedIdRef.current = answerRes.feedId;
          }

          // Если в комнате уже есть другие активные издатели, подписываемся сразу
          if (answerRes.publishers && Array.isArray(answerRes.publishers) && answerRes.publishers.length > 0) {
            const otherPubs = answerRes.publishers.filter((p: any) => !myFeedIdRef.current || p.id !== myFeedIdRef.current);
            if (otherPubs.length > 0) {
              const peerFeed = otherPubs[0];
              if (!subscribedFeedsRef.current.has(peerFeed.id)) {
                console.log(`[VoIP] Собеседник уже в комнате при подключении! feedId: ${peerFeed.id}`);
                subscribedFeedsRef.current.add(peerFeed.id);
                subscribeToFeed(peerFeed.id, sessionIdRef.current);
              }
            }
          }

          // Всегда запускаем поллинг участников для надежного обнаружения собеседника в комнате
          startParticipantsPolling(chatId || '', sessionIdRef.current, handleIdRef.current);

          if (connectionWatchdogRef.current) {
            clearTimeout(connectionWatchdogRef.current);
          }
          connectionWatchdogRef.current = setTimeout(() => {
            // Проверяем по ref, а не по замкнутому callStatus (тот всегда 'idle' из рендера старта)
            if (!remoteStreamRef.current) {
              console.warn('[VoIP Watchdog] Медиа собеседника отсутствует спустя 15 секунд. Автоматический опрос участников и ICE-восстановление...');
              if (sessionIdRef.current && handleIdRef.current) {
                startParticipantsPolling(chatId || '', sessionIdRef.current, handleIdRef.current);
              }
              triggerIceRestart();
              // Эскалация: если медиа так и не появилось — фиксируем failed по единому таймауту 45 секунд
              connectionWatchdogRef.current = setTimeout(() => {
                if (!remoteStreamRef.current) {
                  console.error('[VoIP Watchdog] Собеседник так и не подключился за 45 секунд. Помечаем звонок как failed.');
                  setCallStatus('failed');
                }
              }, 30000);
            }
          }, 15000);
        }
      } else {
        throw new Error('Сессия или хэндл Janus не инициализированы перед отправкой SDP');
      }

    } catch (error) {
      console.error('Ошибка при запуске WebRTC звонка:', error);
      // Если Janus-сессия успела создаться до сбоя (медиа/TURN) — уничтожаем её,
      // иначе она проживет на шлюзе до закрытия сокета
      const orphanSessionId = sessionIdRef.current;
      if (orphanSessionId) {
        VoIPClient.janusRequest('destroy', orphanSessionId).catch(() => {});
      }
      try {
        voipAudio.stopRingback();
        voipAudio.stopRingtone();
      } catch (e) {}
      setCallStatus('failed');
      endCall(true);
    } finally {
      isStartingRef.current = false;
    }
  };

  /**
   * Очищает таймер перезапуска ICE.
   */
  const clearIceRestartTimer = () => {
    if (iceRestartTimerRef.current) {
      clearTimeout(iceRestartTimerRef.current);
      iceRestartTimerRef.current = null;
    }
  };

  /**
   * Инициирует ICE Restart.
   */
  const triggerIceRestart = async () => {
    const pc = pcRef.current;
    const callId = callIdRef.current;
    if (!pc || !callId) return;

    console.log('[WebRTC] Запуск процедуры ICE Restart...');
    setCallStatus('connecting');

    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);

      // Ждем завершения сбора локальных кандидатов при перезапуске ICE с таймаутом 600мс
      if (pc.iceGatheringState !== 'complete') {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            pc.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }, 600);
          const checkState = () => {
            if (pc.iceGatheringState === 'complete') {
              clearTimeout(timeout);
              pc.removeEventListener('icegatheringstatechange', checkState);
              resolve();
            }
          };
          pc.addEventListener('icegatheringstatechange', checkState);
        });
      }

      // Отправляем ICE Restart offer на Janus.
      // VideoRoom требует полноценный configure-запрос с restart:true; без поля `request`
      // Janus отвергает тело, а без jsepType='offer' шлюз пометит offer как answer.
      if (sessionIdRef.current && handleIdRef.current) {
        const restartRes = await VoIPClient.janusRequest(
          'message',
          sessionIdRef.current,
          handleIdRef.current,
          offer.sdp,
          { request: 'configure', restart: true },
          undefined,
          undefined,
          { jsepType: 'offer' }
        );

        if (restartRes && (restartRes.sdp || restartRes.jsep?.sdp)) {
          await pc.setRemoteDescription(new RTCSessionDescription({
            type: 'answer',
            sdp: restartRes.sdp || restartRes.jsep.sdp
          }));
          console.log('[WebRTC] ICE Restart успешно выполнен!');
          setCallStatus('active');
        } else {
          console.warn('[WebRTC] ICE Restart: Janus не вернул SDP answer', restartRes);
        }
      }
    } catch (err) {
      console.error('[WebRTC] Ошибка при процедуре ICE Restart:', err);
    }
  };

  /**
   * Завершает WebRTC-вызов и освобождает ресурсы.
   */
  const endCall = (keepStatus: boolean = false) => {
    console.log('[useWebRTCCall LOG] endCall triggered. localStream exists:', !!localStream, 'keepStatus:', keepStatus);
    isStartingRef.current = false;
    
    // 1. Гарантированно глушим гудки вызова и рингтон
    try {
      voipAudio.stopRingback();
      voipAudio.stopRingtone();
    } catch (err) {
      console.warn('[useWebRTCCall] Ошибка остановки voipAudio:', err);
    }

    clearIceRestartTimer();
    subscribedFeedsRef.current.clear();
    subRetryCountRef.current.clear();
    myFeedIdRef.current = null;
    
    if (connectionWatchdogRef.current) {
      clearTimeout(connectionWatchdogRef.current);
      connectionWatchdogRef.current = null;
    }
    
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (nativeIceListenerRef.current) {
      nativeIceListenerRef.current.remove();
      nativeIceListenerRef.current = null;
    }

    const currentCallId = callIdRef.current;
    if (Capacitor.isNativePlatform()) {
      AudioSessionPlugin.setNormalMode().catch((e: any) => console.error(e));
      if (currentCallId) {
        BoltalkaVoIP.endCall({ callId: currentCallId }).catch((e: any) => console.error(e));
      }
    }

    if (currentCallId) {
      console.log(`[VoIP] Отправка decline для callId=${currentCallId}`);
      VoIPClient.declineCall(currentCallId).catch((e: any) => console.warn(e));
    }
    
    try {
      if (pcRef.current) {
        // Останавливаем все локальные и удаленные треки в PeerConnection
        pcRef.current.getSenders().forEach((s) => {
          try { s.track?.stop(); } catch (err) {}
        });
        pcRef.current.getReceivers().forEach((r) => {
          try { r.track?.stop(); } catch (err) {}
        });
        pcRef.current.close();
        pcRef.current = null;
      }
    } catch (e) {
      console.warn('[VoIP] Error closing pcRef:', e);
    }

    try {
      if (subPcRef.current) {
        subPcRef.current.getSenders().forEach((s) => {
          try { s.track?.stop(); } catch (err) {}
        });
        subPcRef.current.getReceivers().forEach((r) => {
          try { r.track?.stop(); } catch (err) {}
        });
        subPcRef.current.close();
        subPcRef.current = null;
      }
    } catch (e) {
      console.warn('[VoIP] Error closing subPcRef:', e);
    }
    subHandleIdRef.current = null;

    try {
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          try { track.stop(); } catch (err) {}
        });
        setLocalStream(null);
      }
    } catch (e) {
      console.warn('[VoIP] Error stopping local tracks:', e);
    }

    try {
      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach((track) => {
          try { track.stop(); } catch (err) {}
        });
      }
    } catch (e) {
      console.warn('[VoIP] Error stopping remote tracks:', e);
    }

    setRemoteStream(null);
    remoteStreamRef.current = null;
    if (!keepStatus) {
      setCallStatus('ended');
    }
    callIdRef.current = null;

    // Явно уничтожаем Janus-сессию: иначе она висит на шлюзе до истечения TTL (1 час)
    const janusSessionId = sessionIdRef.current;
    sessionIdRef.current = null;
    handleIdRef.current = null;
    if (janusSessionId) {
      VoIPClient.janusRequest('destroy', janusSessionId).catch(() => {});
    }
  };

  /**
   * Включает/выключает микрофон.
   */
  const toggleMute = () => {
    console.log('[useWebRTCCall LOG] toggleMute called. localStream exists:', !!localStream);
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    } else {
      console.warn('[useWebRTCCall LOG] localStream is null during toggleMute');
      setIsMuted(prev => !prev);
    }
  };

  /**
   * Включает/выключает камеру.
   */
  const toggleCamera = () => {
    console.log('[useWebRTCCall LOG] toggleCamera called. localStream exists:', !!localStream);
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      console.log('[useWebRTCCall LOG] localStream video tracks count:', videoTracks.length);
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];
        console.log('[useWebRTCCall LOG] videoTrack initial enabled state:', videoTrack.enabled);
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
        console.log('[useWebRTCCall LOG] videoTrack new enabled state:', videoTrack.enabled, 'isCameraOff state:', !videoTrack.enabled);
      } else {
        console.warn('[useWebRTCCall LOG] No video track found in localStream');
        setIsCameraOff(prev => !prev);
      }
    } else {
      console.warn('[useWebRTCCall LOG] localStream is null during toggleCamera');
      setIsCameraOff(prev => !prev);
    }
  };

  return {
    localStream,
    remoteStream,
    callStatus,
    isMuted,
    isCameraOff,
    startCall,
    endCall,
    toggleMute,
    toggleCamera,
    setRemoteSubstream
  };
}
