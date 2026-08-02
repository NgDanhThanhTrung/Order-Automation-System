import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <p className="text-7xl font-black text-primary/20 select-none">404</p>
        <h1 className="text-xl font-bold">Trang không tồn tại</h1>
        <p className="text-muted-foreground text-sm">
          Đường dẫn này không hợp lệ hoặc đã bị xóa.
        </p>
        <Button onClick={() => navigate('/')} className="gap-2">
          <Home className="w-4 h-4" />
          Về trang chủ
        </Button>
      </div>
    </div>
  );
}
