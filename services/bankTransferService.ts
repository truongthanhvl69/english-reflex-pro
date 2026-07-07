import { supabaseAdmin } from "./paymentService";
import { QRCodeService } from "./qrCodeService";

export const BankTransferService = {
  async getBankConfig() {
    const { data } = await supabaseAdmin
      .from("payment_settings")
      .select("value")
      .eq("key", "bank_transfer")
      .maybeSingle();

    return data?.value || {
      enabled: true,
      bank_name: "Techcombank",
      account_no: "19036789999018",
      account_name: "TRAN VAN TRUONG"
    };
  },

  async generateOrderQR(amount: number, transferContent: string): Promise<string> {
    const bank = await this.getBankConfig();
    return QRCodeService.generateVietQR(
      bank.bank_name,
      bank.account_no,
      bank.account_name,
      amount,
      transferContent
    );
  }
};
export default BankTransferService;
