export const QRCodeService = {
  generateVietQR(bankName: string, accountNo: string, accountName: string, amount: number, content: string): string {
    const bankId = bankName.toLowerCase().replace(/\s+/g, "");
    const nameEncoded = encodeURIComponent(accountName);
    return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${nameEncoded}`;
  }
};
export default QRCodeService;
