import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type WebSocketMessage = {
    type: string;
    data: unknown;
    timestamp: number;
};

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useWebSocket() {
    const queryClient = useQueryClient();
    const wsRef = useRef<WebSocket | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        try {
            setStatus('connecting');
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('WebSocket connected');
                setStatus('connected');
                reconnectAttemptsRef.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    handleMessage(message);
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected');
                setStatus('disconnected');
                wsRef.current = null;

                // Attempt to reconnect
                if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttemptsRef.current++;
                        connect();
                    }, delay);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setStatus('error');
            };

            wsRef.current = ws;
        } catch (error) {
            console.error('Failed to create WebSocket:', error);
            setStatus('error');
        }
    }, []);

    const handleMessage = useCallback((message: WebSocketMessage) => {
        const { type } = message;

        // Invalidate relevant queries based on message type
        switch (type) {
            case 'task_created':
            case 'task_updated':
            case 'task_deleted':
            case 'task_archived':
            case 'task_restored':
            case 'tasks_reordered':
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
                break;

            case 'subtask_created':
            case 'subtask_updated':
            case 'subtask_deleted':
                queryClient.invalidateQueries({ queryKey: ['subtasks'] });
                break;

            case 'comment_created':
                queryClient.invalidateQueries({ queryKey: ['comments'] });
                queryClient.invalidateQueries({ queryKey: ['unreadCounts'] });
                break;

            case 'payout_updated':
            case 'payee_added':
            case 'payee_updated':
            case 'payee_deleted':
                queryClient.invalidateQueries({ queryKey: ['payout'] });
                queryClient.invalidateQueries({ queryKey: ['unpaid-payouts'] });
                break;

            case 'dashboard_created':
            case 'dashboard_updated':
            case 'dashboard_deleted':
                queryClient.invalidateQueries({ queryKey: ['dashboards'] });
                break;

            case 'column_created':
            case 'column_updated':
            case 'column_deleted':
                queryClient.invalidateQueries({ queryKey: ['columns'] });
                break;

            case 'receivable_created':
            case 'receivable_updated':
            case 'receivable_deleted':
                queryClient.invalidateQueries({ queryKey: ['receivables'] });
                break;

            case 'team_member_created':
            case 'team_member_updated':
            case 'team_member_deleted':
                queryClient.invalidateQueries({ queryKey: ['team-members'] });
                break;

            case 'notification':
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
                break;

            case 'connected':
                console.log('WebSocket connection confirmed');
                break;

            default:
                console.log('Unknown WebSocket message type:', type);
        }
    }, [queryClient]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setStatus('disconnected');
    }, []);

    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        status,
        isConnected: status === 'connected',
        reconnect: connect,
        disconnect,
    };
}

// Provider component that initializes WebSocket connection
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const { status } = useWebSocket();

    // Optionally show connection status indicator
    return (
        <>
            {children}
            {status === 'connecting' && (
                <div className="fixed bottom-4 right-4 px-3 py-1.5 bg-amber-500 text-white text-xs rounded-full animate-pulse">
                    Connecting...
                </div>
            )}
            {status === 'error' && (
                <div className="fixed bottom-4 right-4 px-3 py-1.5 bg-red-500 text-white text-xs rounded-full">
                    Connection error
                </div>
            )}
        </>
    );
}
