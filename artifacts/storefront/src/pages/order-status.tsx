import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { useGetOrder, getGetOrderQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  Copy,
  Check,
} from 'lucide-react';

function formatVND(amount: number) {
  return amount.toLocaleString('vi-VN') + '₫';
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

type OrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled';

export default function OrderStatus() {
  const { id: orderId } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [expired, setExpired] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load QR URL from sessionStorage
  useEffect(() => {
    if (orderId) {
      const stored = sessionStorage.getItem(`qr_${orderId}`);
      if (stored) setQrUrl(stored);
    }
  }, [orderId]);

  const { data: resp, isLoading, isError } = useGetOrder(orderId ?? '', {
    query: {
      enabled: !!orderId,
      queryKey: getGetOrderQueryKey(orderId ?? ''),
      refetchInterval: (query) => {
        const status = (query.state.data as any)?.data?.order_status as OrderStatus | undefined;
        if (!status || status === 'pending') return 5000;
        return false; // stop polling once paid/shipped/cancelled
      },
    },
  });

  const order = resp?.data;
  const status = order?.order_status as OrderStatus | undefined;

  // Countdown timer
  useEffect(() => {
    if (!order?.expires_at || status !== 'pending') return;

    function tick() {
      const diff = new Date(order!.expires_at).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(0);
        setExpired(true);
        // Stop polling on expiry — force a final fetch
        queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId ?? '') });
      } else {
        setTimeLeft(diff);
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [order?.expires_at, status, orderId, queryClient]);

  const copyOrderCode = useCallback(async () => {
    if (!order?.order_code) return;
    try {
      await navigator.clipboard.writeText(order.order_code);
      setCopied(true);
      toast({ title: 'Đã sao chép', description: `Mã đơn: ${order.order_code}` });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Lỗi', description: 'Không thể sao chép', variant: 'destructive' });
    }
  }, [order?.order_code, toast]);

  if (!orderId) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-base">Trạng thái đơn hàng</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-5">
        {/* Loading */}
        {isLoading && (
          <div className="space-y-5">
            <div className="rounded-xl border bg-card p-6 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="w-64 h-64 mx-auto rounded-xl" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
            <XCircle className="w-10 h-10 text-destructive mx-auto" />
            <p className="font-medium">Không tìm thấy đơn hàng</p>
            <Button variant="outline" onClick={() => navigate('/')}>
              Về trang chủ
            </Button>
          </div>
        )}

        {order && (
          <>
            {/* Order info card */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Mã đơn hàng</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="font-mono font-bold text-lg tracking-wider"
                      data-testid="text-order-code"
                    >
                      {order.order_code}
                    </span>
                    <button
                      onClick={copyOrderCode}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors"
                      data-testid="button-copy-order-code"
                      title="Sao chép mã đơn"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Sản phẩm</p>
                  <p className="font-medium mt-0.5" data-testid="text-product-name">
                    {order.product_name}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Số lượng</p>
                  <p className="font-medium mt-0.5">{order.quantity}</p>
                </div>
                {order.customer_name && (
                  <div>
                    <p className="text-muted-foreground">Khách hàng</p>
                    <p className="font-medium mt-0.5">{order.customer_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Tổng tiền</p>
                  <p
                    className="font-bold text-primary mt-0.5"
                    data-testid="text-total-amount"
                  >
                    {formatVND(order.total_amount)}
                  </p>
                </div>
              </div>
            </div>

            {/* ── PENDING: show QR + countdown ── */}
            {status === 'pending' && (
              <div className="rounded-xl border bg-card p-6 space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="font-semibold text-base">Quét mã QR để thanh toán</h2>
                  <p className="text-muted-foreground text-sm">
                    Dùng ứng dụng ngân hàng hoặc ví điện tử để quét
                  </p>
                </div>

                {qrUrl ? (
                  <div className="flex justify-center">
                    <img
                      src={qrUrl}
                      alt="VietQR payment code"
                      className="w-64 h-64 object-contain rounded-xl border bg-white p-2"
                      data-testid="img-qr-code"
                    />
                  </div>
                ) : (
                  <Skeleton className="w-64 h-64 mx-auto rounded-xl" />
                )}

                {/* Transfer reminder */}
                <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                  <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
                    Nội dung chuyển khoản
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold">{order.order_code}</span>
                    <button
                      onClick={copyOrderCode}
                      className="p-1 rounded hover:bg-background transition-colors"
                      data-testid="button-copy-code-reminder"
                    >
                      {copied ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Countdown */}
                {expired ? (
                  <div className="flex items-center justify-center gap-2 text-destructive text-sm font-medium">
                    <XCircle className="w-4 h-4" />
                    <span>Đơn hàng đã hết hạn</span>
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center gap-2 text-sm"
                    data-testid="text-countdown"
                  >
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Hết hạn sau</span>
                    <span className="font-mono font-bold text-base tabular-nums">
                      {formatCountdown(timeLeft)}
                    </span>
                  </div>
                )}

                <p className="text-center text-xs text-muted-foreground">
                  Trang sẽ tự động cập nhật khi nhận được thanh toán
                </p>
              </div>
            )}

            {/* ── PAID ── */}
            {status === 'paid' && (
              <div
                className="rounded-xl border border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20 p-8 text-center space-y-4"
                data-testid="status-paid"
              >
                <CheckCircle className="w-14 h-14 text-green-600 mx-auto" />
                <div>
                  <h2 className="text-xl font-bold text-green-700 dark:text-green-400">
                    Thanh toán thành công
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Đơn hàng đã được xác nhận. Chúng tôi sẽ liên hệ sớm!
                  </p>
                </div>
                {order.paid_at && (
                  <p className="text-xs text-muted-foreground">
                    Thanh toán lúc{' '}
                    {new Date(order.paid_at).toLocaleString('vi-VN', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                    })}
                  </p>
                )}
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  data-testid="button-back-home"
                >
                  Tiếp tục mua sắm
                </Button>
              </div>
            )}

            {/* ── SHIPPED ── */}
            {status === 'shipped' && (
              <div
                className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20 p-8 text-center space-y-4"
                data-testid="status-shipped"
              >
                <Truck className="w-14 h-14 text-blue-600 mx-auto" />
                <div>
                  <h2 className="text-xl font-bold text-blue-700 dark:text-blue-400">
                    Đơn hàng đã được giao
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cảm ơn bạn đã mua hàng!
                  </p>
                </div>
                {order.shipped_at && (
                  <p className="text-xs text-muted-foreground">
                    Giao lúc{' '}
                    {new Date(order.shipped_at).toLocaleString('vi-VN', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                    })}
                  </p>
                )}
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  data-testid="button-back-home"
                >
                  Về trang chủ
                </Button>
              </div>
            )}

            {/* ── CANCELLED ── */}
            {(status === 'cancelled' || (status === 'pending' && expired)) && (
              <div
                className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center space-y-4"
                data-testid="status-cancelled"
              >
                <XCircle className="w-14 h-14 text-destructive mx-auto" />
                <div>
                  <h2 className="text-xl font-bold text-destructive">Đơn hàng đã hủy</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {status === 'cancelled'
                      ? 'Đơn hàng đã bị hủy.'
                      : 'Đã hết thời gian thanh toán.'}
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/')}
                  data-testid="button-back-home"
                >
                  Đặt lại đơn hàng
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus | undefined }) {
  if (!status) return null;

  const map: Record<OrderStatus, { label: string; className: string }> = {
    pending: { label: 'Chờ thanh toán', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
    paid:    { label: 'Đã thanh toán',  className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    shipped: { label: 'Đã giao',        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    cancelled: { label: 'Đã hủy',      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  };

  const { label, className } = map[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
      data-testid="status-badge"
    >
      {label}
    </span>
  );
}
