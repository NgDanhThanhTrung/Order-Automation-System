import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Search,
  Image as ImageIcon,
  FileText,
  Calendar,
  Download,
  ExternalLink,
} from 'lucide-react';

function formatVND(amount: number) {
  return amount.toLocaleString('vi-VN') + '₫';
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type ReportStatus = 'matched' | 'unmatched' | 'all';

export default function AdminReports() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [reports, setReports] = useState<any[]>([]);

  // Mock data for now - replace with actual API call
  const loadReports = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/reports', {
      //   headers: {
      //     'X-Telegram-Chat-Id': adminChatId,
      //   },
      // });
      // const data = await response.json();
      
      // Mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      setReports([
        {
          id: '1',
          order_id: '123e4567-e89b-12d3-a456-426614174000',
          order_code: 'ORDLKZM4A8X2',
          bill_image_url: 'https://placehold.co/400x300/f97316/ffffff?text=Bill+Image',
          cloudinary_public_id: 'payment_reports/bill_123',
          note: 'Khách đã chuyển khoản',
          created_at: new Date().toISOString(),
          total_amount: 499000,
          customer_name: 'Nguyễn Văn A',
          order_status: 'paid',
        },
      ]);
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách báo cáo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load reports on mount
  useEffect(() => {
    loadReports();
  }, []);

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.order_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.note?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || report.order_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="font-semibold text-base">Báo cáo thanh toán</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Filters */}
        <div className="rounded-xl border bg-card p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo mã đơn, tên khách, ghi chú..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Tất cả
              </Button>
              <Button
                variant={statusFilter === 'matched' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('matched')}
              >
                Đã khớp
              </Button>
              <Button
                variant={statusFilter === 'unmatched' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('unmatched')}
              >
                Chưa khớp
              </Button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && filteredReports.length === 0 && (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium text-lg">Không có báo cáo nào</p>
            <p className="text-muted-foreground text-sm mt-1">
              {searchTerm || statusFilter !== 'all'
                ? 'Thử thay đổi bộ lọc tìm kiếm'
                : 'Chưa có báo cáo thanh toán nào'}
            </p>
          </div>
        )}

        {/* Reports grid */}
        {!isLoading && filteredReports.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Bill image */}
                <div className="relative w-full h-48 bg-muted overflow-hidden">
                  {report.bill_image_url ? (
                    <img
                      src={report.bill_image_url}
                      alt="Bill payment"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground/40" />
                    </div>
                  )}
                  <Badge
                    variant={report.order_status === 'paid' ? 'default' : 'secondary'}
                    className="absolute top-2 right-2"
                  >
                    {report.order_status === 'paid' ? 'Đã khớp' : 'Chưa khớp'}
                  </Badge>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-semibold truncate">
                        {report.order_code}
                      </p>
                      {report.customer_name && (
                        <p className="text-sm text-muted-foreground truncate">
                          {report.customer_name}
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-primary text-sm whitespace-nowrap">
                      {formatVND(report.total_amount)}
                    </span>
                  </div>

                  {report.note && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {report.note}
                    </p>
                  )}

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(report.created_at)}</span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(report.bill_image_url, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Xem ảnh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/orders/${report.order_id}`)}
                    >
                      Chi tiết
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
