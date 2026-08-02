import { useListProducts } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, Package, Settings } from 'lucide-react';

function formatVND(amount: number) {
  return amount.toLocaleString('vi-VN') + '₫';
}

function ProductSkeleton() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Skeleton className="w-full h-52" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  const { data: resp, isLoading, isError } = useListProducts();
  const products = resp?.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-none">Cửa hàng trực tuyến</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Thanh toán chuyển khoản tự động</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/reports')}
            className="text-xs"
          >
            <Settings className="w-4 h-4 mr-1" />
            Admin
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Sản phẩm</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Chọn sản phẩm, đặt hàng và quét mã QR để thanh toán ngay
          </p>
        </div>

        {/* Error */}
        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-destructive font-medium">Không thể tải danh sách sản phẩm</p>
            <p className="text-muted-foreground text-sm mt-1">Vui lòng thử lại sau</p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && products.length === 0 && (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium text-lg">Chưa có sản phẩm</p>
            <p className="text-muted-foreground text-sm mt-1">Quay lại sau nhé!</p>
          </div>
        )}

        {/* Product grid */}
        {!isLoading && !isError && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((product) => (
              <div
                key={product.id}
                data-testid={`card-product-${product.id}`}
                className="rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Product image */}
                <div className="relative w-full h-52 bg-muted overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      data-testid={`img-product-${product.id}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground/40" />
                    </div>
                  )}
                  {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                    <Badge
                      variant="secondary"
                      className="absolute top-2 right-2 text-xs"
                    >
                      Còn {product.stock_quantity}
                    </Badge>
                  )}
                  {product.stock_quantity === 0 && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                      <Badge variant="secondary" className="text-sm">Hết hàng</Badge>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col flex-1 gap-2">
                  <h3
                    className="font-semibold text-base leading-snug"
                    data-testid={`text-product-name-${product.id}`}
                  >
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-muted-foreground text-sm line-clamp-2 flex-1">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <span
                      className="text-lg font-bold text-primary"
                      data-testid={`text-price-${product.id}`}
                    >
                      {formatVND(product.price)}
                    </span>
                    <Button
                      size="sm"
                      disabled={product.stock_quantity === 0}
                      onClick={() =>
                        navigate(`/checkout?product_id=${product.id}`)
                      }
                      data-testid={`button-buy-${product.id}`}
                    >
                      Mua ngay
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
