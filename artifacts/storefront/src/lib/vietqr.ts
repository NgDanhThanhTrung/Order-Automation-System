/**
 * VietQR API Utility
 * 
 * Tạo mã QR thanh toán động qua API công khai của VietQR
 * Không cần thư viện render Canvas/JS - tối ưu bundle size
 * 
 * Tài liệu: https://vietqr.io/document/api
 */

export interface VietQRParams {
  bankId: string;
  accountNo: string;
  amount: number;
  orderCode: string;
  accountName: string;
}

/**
 * Sinh URL VietQR động
 * Format: https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-compact2.png
 *         ?amount={AMOUNT}&addInfo={ORDER_CODE}&accountName={NAME}
 */
export function buildVietQrUrl(params: VietQRParams): string {
  const { bankId, accountNo, amount, orderCode, accountName } = params;
  
  const encodedContent = encodeURIComponent(orderCode);
  const encodedName = encodeURIComponent(accountName);
  
  return (
    `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png` +
    `?amount=${amount}&addInfo=${encodedContent}&accountName=${encodedName}`
  );
}

/**
 * Lấy thông tin ngân hàng từ mã ngân hàng
 * (Dùng cho validation hoặc hiển thị)
 */
export const BANK_INFO: Record<string, { name: string; logo: string }> = {
  MB: { name: 'Ngân hàng Quân đội (MB)', logo: 'mb' },
  VCB: { name: 'Vietcombank', logo: 'vcb' },
  TCB: { name: 'Techcombank', logo: 'tcb' },
  BIDV: { name: 'BIDV', logo: 'bidv' },
  ACB: { name: 'ACB', logo: 'acb' },
  VIB: { name: 'VIB', logo: 'vib' },
  STB: { name: 'Sacombank', logo: 'stb' },
  VPB: { name: 'VPBank', logo: 'vpb' },
  OCB: { name: 'OCB', logo: 'ocb' },
  HDB: { name: 'HDBank', logo: 'hdb' },
  MBB: { name: 'MB Bank', logo: 'mbb' },
  SEA: { name: 'SeABank', logo: 'sea' },
  VAB: { name: 'Viet A Bank', logo: 'vab' },
  SGB: { name: 'Saigon Bank', logo: 'sgb' },
  NCB: { name: 'National Citizen Bank', logo: 'ncb' },
  BVB: { name: 'BVBank', logo: 'bvb' },
  ABB: { name: 'ABBank', logo: 'abb' },
};

/**
 * Validate mã ngân hàng
 */
export function isValidBankId(bankId: string): boolean {
  return bankId.toUpperCase() in BANK_INFO;
}

/**
 * Get bank name from bank ID
 */
export function getBankName(bankId: string): string {
  return BANK_INFO[bankId.toUpperCase()]?.name || 'Ngân hàng không xác định';
}
