// frontend/src/core/voip/useGroupWebRTCCall.ts
// Release Train R5 (v2.2.0): React Hook for Janus SFU Group Calls and Screen Share

import { useState, useEffect, useRef, useCallback } from 'react';
import { JanusSFUClient } from '../call/janus-sfu-client';
import { GroupCallParticipant, GroupCallSession } from '../../types';

export interface UseGroupWebRTCCallProps {
  chatId: string;
  callId?: string;
  currentUser?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  onEndCall?: () => void;
}

export function useGroupWebRTCCall({
  chatId,
  callId = 'group_' + chatId,
  currentUser = { id: 'me', name: 'Вы' },
  onEndCall
}: UseGroupWebRTCCallProps) {
  const [participants, setParticipants] = useState<GroupCallParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeSpeakerFeedId, setActiveSpeakerFeedId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<Error | null>(null);


  const clientRef = useRef<JanusSFUClient | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsConnecting(true);
    setError(null);

    const client = new JanusSFUClient({
      chatId,
      callId,
      userId: currentUser.id,
      displayName: currentUser.name,
      avatarUrl: currentUser.avatarUrl,
      onParticipantsChange: (updatedParticipants) => {
        if (mounted) {
          setParticipants([...updatedParticipants]);
        }
      },
      onActiveSpeakerChange: (speakerFeedId) => {
        if (mounted) {
          setActiveSpeakerFeedId(speakerFeedId);
        }
      },
      onScreenShareChange: (sharing) => {
        if (mounted) {
          setIsScreenSharing(sharing);
        }
      },
      onError: (err) => {
        if (mounted) {
          setError(err);
          setIsConnecting(false);
        }
      }
    });

    clientRef.current = client;

    client.start().then((stream) => {
      if (mounted) {
        setLocalStream(stream);
        setIsConnecting(false);
        setParticipants(client.getParticipants());
      }
    }).catch((err) => {
      if (mounted) {
        setError(err);
        setIsConnecting(false);
      }
    });

    return () => {
      mounted = false;
      client.destroy().catch(() => {});
      clientRef.current = null;
    };
  }, [chatId, callId, currentUser.id, currentUser.name, currentUser.avatarUrl]);


  const toggleMute = useCallback(() => {
    if (clientRef.current) {
      const muted = clientRef.current.toggleMute();
      setIsMuted(muted);
      return muted;
    }
    return false;
  }, []);

  const toggleVideo = useCallback(() => {
    if (clientRef.current) {
      const off = clientRef.current.toggleVideo();
      setIsVideoOff(off);
      return off;
    }
    return false;
  }, []);

  const startScreenShare = useCallback(async () => {
    if (clientRef.current) {
      const success = await clientRef.current.startScreenShare();
      setIsScreenSharing(success);
      return success;
    }
    return false;
  }, []);

  const stopScreenShare = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.stopScreenShare();
      setIsScreenSharing(false);
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      return false;
    } else {
      return await startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  const leaveCall = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.destroy();
      clientRef.current = null;
    }
    if (onEndCall) {
      onEndCall();
    }
  }, [onEndCall]);

  const session: GroupCallSession = {
    callId,
    chatId,
    roomId: clientRef.current?.roomId || 1234,
    title: 'Групповой звонок',
    isActive: !isConnecting,
    participants,
    isScreenSharing,
    isMuted,
    isVideoOff,
    activeSpeakerFeedId
  };

  return {
    session,
    participants,
    localStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    activeSpeakerFeedId,
    isConnecting,
    error,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    toggleScreenShare,
    leaveCall
  };
}
