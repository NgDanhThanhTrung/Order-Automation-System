import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useGetProduct, getGetProductQueryKey, useCreateOrder } from '@workspace/api-client-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useCsrfToken } from '@/hooks/useCsrfToken';
import { ArrowLeft, ShoppingCart, Package } from 'lucide-react';
import { buildVietQrUrl } from '@/lib/vietqr';

function formatVND(amount: number) {
  return amount.toLocaleString('vi-VN') + '₫';
}

const checkoutSchema = z.object({
  quantity: z.coerce.number().int().min(1, 'Tối thiểu 1').max(100, 'Tối đa 100'),
  customer_name: z.string().min(1, 'Vui lòng nhập tên').max(255),
  customer_email: z
    .string()
    .email('Email không hợp lệ')
    .optional()
    .or(z.literal('')),
  customer_phone: z
    .string()
    .regex(/^(0|\+84)\d{9,10}$/, 'Số điện thoại không hợp lệ')
    .optional()
    .or(z.literal('')),
  customer_note: z.string().max(500).optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const productId = params.get('product_id') ?? '';

  const { toast } = useToast();
  const { csrfToken } = useCsrfToken();
  const [totalAmount, setTotalAmount] = useState(0);

  const { data: productResp, isLoading: productLoading, isError: productError } = useGetProduct(
    productId,
    { query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId) } },
  );
  const product = productResp?.data;

  const createOrder = useCreateOrder();

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      quantity: 1,
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_note: '',
    },
  });

  const quantity = form.watch('quantity');
  useEffect(() => {
    if (product?.price && quantity > 0) {
      setTotalAmount(product.price * quantity);
    }
  }, [product?.price, quantity]);

  if (!productId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Package className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="font-medium">Không tìm thấy sản phẩm</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            Quay lại cửa hàng
          </Button>
        </div>
      </div>
    );
  }

  function onSubmit(values: CheckoutForm) {
    // Disable submit if CSRF token not loaded
    if (!csrfToken) {
      toast({ 
        title: 'Lỗi bảo mật', 
        description: 'CSRF token chưa được tải. Vui lòng tải lại trang.', 
        variant: 'destructive' 
      });
      return;
    }

    createOrder.mutate(
      {
        data: {
          product_id: productId,
          quantity: values.quantity,
          customer_name: values.customer_name,
          customer_email: values.customer_email || undefined,
          customer_phone: values.customer_phone || undefined,
          customer_note: values.customer_note || undefined,
        },
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      },
      {
        onSuccess: (resp) => {
          const orderData = resp?.data;
          if (!orderData) return;
          
          // Use QR URL from backend response if available, otherwise generate
          const qrUrl = orderData.qr_code_url || buildVietQrUrl({
            bankId: import.meta.env.VITE_PUBLIC_BANK_ID || 'MB',
            accountNo: import.meta.env.VITE_PUBLIC_BANK_ACCOUNT_NO || '',
            amount: orderData.order.total_amount,
            orderCode: orderData.order.order_code,
            accountName: import.meta.env.VITE_PUBLIC_BANK_ACCOUNT_NAME || '',
          });
          
          // Store QR URL in sessionStorage so order-status page can display it
          sessionStorage.setItem(`qr_${orderData.order.id}`, qrUrl);
          navigate(`/orders/${orderData.order.id}`);
        },
        onError: (err: unknown) => {
          const message =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            'Không thể tạo đơn hàng. Vui lòng thử lại.';
          toast({ title: 'Lỗi', description: message, variant: 'destructive' });
        },
      },
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <span className="font-semibold text-base">Đặt hàng</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Product summary */}
        {productLoading && (
          <div className="rounded-xl border bg-card p-4 flex gap-4">
            <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        )}

        {productError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
            <p className="text-destructive text-sm">Không thể tải thông tin sản phẩm</p>
          </div>
        )}

        {product && (
          <div
            className="rounded-xl border bg-card p-4 flex gap-4 items-start"
            data-testid="product-summary"
          >
            <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-7 h-7 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base truncate" data-testid="text-product-name">
                {product.name}
              </p>
              <p className="text-primary font-bold text-lg mt-0.5">
                {formatVND(product.price)} / sản phẩm
              </p>
              {product.stock_quantity > 0 && (
                <p className="text-muted-foreground text-xs mt-1">
                  Còn {product.stock_quantity} trong kho
                </p>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="rounded-xl border bg-card p-6 space-y-5"
        >
          <h2 className="font-semibold text-base border-b pb-3">Thông tin đặt hàng</h2>

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label htmlFor="quantity">Số lượng *</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={product?.stock_quantity ?? 100}
              {...form.register('quantity')}
              data-testid="input-quantity"
            />
            {form.formState.errors.quantity && (
              <p className="text-xs text-destructive">{form.formState.errors.quantity.message}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="customer_name">Họ và tên *</Label>
            <Input
              id="customer_name"
              placeholder="Nguyễn Văn A"
              {...form.register('customer_name')}
              data-testid="input-customer-name"
            />
            {form.formState.errors.customer_name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.customer_name.message}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="customer_phone">
              Số điện thoại <span className="text-muted-foreground text-xs">(tùy chọn)</span>
            </Label>
            <Input
              id="customer_phone"
              type="tel"
              placeholder="0912 345 678"
              {...form.register('customer_phone')}
              data-testid="input-customer-phone"
            />
            {form.formState.errors.customer_phone && (
              <p className="text-xs text-destructive">
                {form.formState.errors.customer_phone.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="customer_email">
              Email <span className="text-muted-foreground text-xs">(tùy chọn)</span>
            </Label>
            <Input
              id="customer_email"
              type="email"
              placeholder="example@email.com"
              {...form.register('customer_email')}
              data-testid="input-customer-email"
            />
            {form.formState.errors.customer_email && (
              <p className="text-xs text-destructive">
                {form.formState.errors.customer_email.message}
              </p>
            )}
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="customer_note">
              Ghi chú <span className="text-muted-foreground text-xs">(tùy chọn)</span>
            </Label>
            <Input
              id="customer_note"
              placeholder="Yêu cầu đặc biệt..."
              {...form.register('customer_note')}
              data-testid="input-customer-note"
            />
          </div>

          {/* Total + Submit */}
          <div className="border-t pt-4 space-y-4">
            {totalAmount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  Tổng cộng ({quantity} sản phẩm)
                </span>
                <span
                  className="text-xl font-bold text-primary"
                  data-testid="text-total-amount"
                >
                  {formatVND(totalAmount)}
                </span>
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={createOrder.isPending || !product}
              data-testid="button-submit-order"
            >
              {createOrder.isPending ? 'Đang xử lý...' : 'Đặt hàng'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
