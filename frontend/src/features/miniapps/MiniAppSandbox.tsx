import React, { useEffect, useRef, useState } from 'react';

interface MiniAppUser {
  id: string;
  username: string;
  name: string;
}

interface MiniAppSandboxProps {
  src: string;
  currentUser: MiniAppUser;
  onClose: () => void;
  onShareMessage: (text: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

interface MiniAppRequest {
  id: string;
  method: string;
  params?: any;
}

// Белый список обычных методов (разрешены без подтверждения)
const ALLOWED_METHODS = ['share_message', 'get_user_info', 'close_app', 'searchMessages', 'getUser'];

// Список чувствительных методов (требуют подтверждения пользователя)
const SENSITIVE_METHODS = ['sendMessage', 'sharePhoneNumber', 'openInvoice'];

export const MiniAppSandbox: React.FC<MiniAppSandboxProps> = ({
  src,
  currentUser,
  onClose,
  onShareMessage,
  className,
  style
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [confirmRequest, setConfirmRequest] = useState<{
    id: string;
    method: string;
    origin: string;
    params?: any;
  } | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Проверяем, что сообщение пришло от нашего iframe
      if (!iframeRef.current || !iframeRef.current.contentWindow || event.source !== iframeRef.current.contentWindow) {
        return;
      }

      const source = iframeRef.current.contentWindow;

      const data = event.data as MiniAppRequest;
      if (!data || typeof data !== 'object' || !data.id || !data.method) {
        return;
      }

      const { id, method, params } = data;

      // 1. Проверяем обычные разрешенные методы
      if (ALLOWED_METHODS.includes(method)) {
        try {
          switch (method) {
            case 'get_user_info':
            case 'getUser':
              source.postMessage(
                { id, result: currentUser },
                { targetOrigin: event.origin }
              );
              break;

            case 'share_message':
              if (params && typeof params.text === 'string') {
                onShareMessage(params.text);
                source.postMessage(
                  { id, result: { success: true } },
                  { targetOrigin: event.origin }
                );
              } else {
                source.postMessage(
                  { id, error: 'Invalid parameters: text is required' },
                  { targetOrigin: event.origin }
                );
              }
              break;

            case 'close_app':
              onClose();
              source.postMessage(
                { id, result: { success: true } },
                { targetOrigin: event.origin }
              );
              break;

            case 'searchMessages':
              // Имитируем успешный поиск сообщений
              source.postMessage(
                { id, result: { messages: [] } },
                { targetOrigin: event.origin }
              );
              break;

            default:
              source.postMessage(
                { id, error: 'Method not implemented' },
                { targetOrigin: event.origin }
              );
          }
        } catch (error: any) {
          source.postMessage(
            { id, error: error.message || 'Internal sandbox error' },
            { targetOrigin: event.origin }
          );
        }
        return;
      }

      // 2. Проверяем чувствительные методы (требуют подтверждения)
      if (SENSITIVE_METHODS.includes(method)) {
        setConfirmRequest({
          id,
          method,
          origin: event.origin,
          params
        });
        return;
      }

      // 3. Метод не разрешен
      source.postMessage(
        { id, error: 'Method not allowed' },
        { targetOrigin: event.origin }
      );
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [currentUser, onClose, onShareMessage]);

  const handleConfirm = () => {
    if (!confirmRequest || !iframeRef.current || !iframeRef.current.contentWindow) return;
    
    const source = iframeRef.current.contentWindow;
    const { id, method, origin } = confirmRequest;
    
    // Имитируем успешное выполнение чувствительного действия
    source.postMessage(
      { id, result: { success: true, method, confirmed: true } },
      { targetOrigin: origin }
    );
    setConfirmRequest(null);
  };

  const handleCancel = () => {
    if (!confirmRequest || !iframeRef.current || !iframeRef.current.contentWindow) return;
    
    const source = iframeRef.current.contentWindow;
    const { id, origin } = confirmRequest;
    
    source.postMessage(
      { id, error: 'User rejected the request' },
      { targetOrigin: origin }
    );
    setConfirmRequest(null);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <iframe
        ref={iframeRef}
        src={src}
        sandbox="allow-scripts allow-forms allow-same-origin"
        className={className}
        style={{
          border: 'none',
          width: '100%',
          height: '100%',
          backgroundColor: '#fff',
          ...style
        }}
        title="Mini App Sandbox"
      />

      {/* GlassModal-подобный оверлей для подтверждения чувствительных действий */}
      {confirmRequest && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '320px',
            width: '100%',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#111', fontWeight: 600 }}>
              Запрос разрешения
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#444', lineHeight: 1.5 }}>
              Приложение запрашивает доступ к функции <strong>{confirmRequest.method}</strong>. Разрешить это действие?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Отклонить
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#007aff',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Разрешить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
