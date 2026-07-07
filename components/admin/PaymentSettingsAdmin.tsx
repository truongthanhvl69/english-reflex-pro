import React, { useState } from "react";
import { Save, RefreshCw } from "lucide-react";

interface Props {
  settings: any;
  onRefresh: () => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function PaymentSettingsAdmin({ settings, onRefresh, showToast }: Props) {
  // Destructure settings with safe defaults
  const bank = settings.bank_transfer || {
    enabled: true,
    bank_name: "Techcombank",
    account_no: "19036789999018",
    account_name: "TRAN VAN TRUONG"
  };

  const stripe = settings.stripe || { enabled: true };
  const general = settings.general || { currency: "VND", order_expiry_minutes: 15 };
  
  const pricing = settings.plans_pricing || {
    basic_monthly: 49000,
    pro_monthly: 99000,
    pro_yearly: 948000,
    lifetime: 1999000
  };

  // State hooks
  const [bankEnabled, setBankEnabled] = useState(!!bank.enabled);
  const [bankName, setBankName] = useState(bank.bank_name || "");
  const [accountNo, setAccountNo] = useState(bank.account_no || "");
  const [accountName, setAccountName] = useState(bank.account_name || "");

  const [stripeEnabled, setStripeEnabled] = useState(!!stripe.enabled);

  const [currency, setCurrency] = useState(general.currency || "VND");
  const [expiryMinutes, setExpiryMinutes] = useState(general.order_expiry_minutes || 15);

  const [basicPrice, setBasicPrice] = useState(pricing.basic_monthly || 49000);
  const [proPrice, setProPrice] = useState(pricing.pro_monthly || 99000);
  const [proYearlyPrice, setProYearlyPrice] = useState(pricing.pro_yearly || 948000);
  const [lifetimePrice, setLifetimePrice] = useState(pricing.lifetime || 1999000);

  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      bank_transfer: {
        enabled: bankEnabled,
        bank_name: bankName,
        account_no: accountNo,
        account_name: accountName
      },
      stripe: {
        enabled: stripeEnabled
      },
      general: {
        currency,
        order_expiry_minutes: Number(expiryMinutes)
      },
      plans_pricing: {
        basic_monthly: Number(basicPrice),
        pro_monthly: Number(proPrice),
        pro_yearly: Number(proYearlyPrice),
        lifetime: Number(lifetimePrice)
      }
    };

    try {
      const res = await fetch("/api/admin/membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_settings", settings: payload })
      });

      if (res.ok) {
        showToast("Đã lưu thiết lập cấu hình thanh toán thành công.", "success");
        onRefresh();
      } else {
        const err = await res.json();
        showToast(err.error || "Không thể cập nhật cấu hình thanh toán.", "error");
      }
    } catch (e) {
      showToast("Lỗi kết nối máy chủ.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "16px", margin: 0, fontWeight: "800" }}>Cấu hình Cổng Thanh toán</h2>
          <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0 0" }}>
            Thiết lập thông tin tài khoản thụ hưởng, giá cả các gói dịch vụ và các cài đặt chung.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" className="button button-secondary" onClick={onRefresh} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <RefreshCw size={14} /> Tải lại
          </button>
          <button type="submit" className="button button-primary" disabled={saving} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <Save size={14} /> Lưu cấu hình
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        {/* Section 1: Bank Transfer Details */}
        <div className="profile-card-panel" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: "15px", fontWeight: "700", borderBottom: "1px solid var(--line)", paddingBottom: "10px", marginTop: 0 }}>
            🏦 Chuyển khoản ngân hàng (VietQR)
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
            <label className="switch-setting-row" style={{ padding: "0 0 10px 0" }}>
              <div className="switch-setting-label">
                <strong>Bật thanh toán chuyển khoản</strong>
                <p>Cho phép người dùng chọn chuyển khoản.</p>
              </div>
              <input 
                type="checkbox"
                className="toggle-switch"
                checked={bankEnabled}
                onChange={(e) => setBankEnabled(e.target.checked)}
              />
            </label>
            <div className="profile-field-group">
              <label>Ngân hàng nhận</label>
              <input 
                type="text" 
                className="profile-input-text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Techcombank"
                required={bankEnabled}
              />
            </div>
            <div className="profile-field-group">
              <label>Số tài khoản thụ hưởng</label>
              <input 
                type="text" 
                className="profile-input-text"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                placeholder="19036789999018"
                required={bankEnabled}
              />
            </div>
            <div className="profile-field-group">
              <label>Tên chủ tài khoản (Viết hoa không dấu)</label>
              <input 
                type="text" 
                className="profile-input-text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="TRAN VAN TRUONG"
                required={bankEnabled}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Stripe Gateways */}
        <div className="profile-card-panel" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: "15px", fontWeight: "700", borderBottom: "1px solid var(--line)", paddingBottom: "10px", marginTop: 0 }}>
            💳 Stripe Checkout Gateway
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
            <label className="switch-setting-row" style={{ padding: "0 0 10px 0" }}>
              <div className="switch-setting-label">
                <strong>Bật cổng thanh toán Stripe</strong>
                <p>Cho phép người dùng thanh toán qua Visa / Mastercard.</p>
              </div>
              <input 
                type="checkbox"
                className="toggle-switch"
                checked={stripeEnabled}
                onChange={(e) => setStripeEnabled(e.target.checked)}
              />
            </label>

            <div className="profile-field-group" style={{ marginTop: "10px" }}>
              <label>Mã tiền tệ mặc định (Currency)</label>
              <input 
                type="text" 
                className="profile-input-text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="VND"
                required
              />
            </div>

            <div className="profile-field-group">
              <label>Thời hạn thanh toán đơn hàng (Phút)</label>
              <input 
                type="number" 
                className="profile-input-text"
                value={expiryMinutes}
                onChange={(e) => setExpiryMinutes(Number(e.target.value))}
                placeholder="15"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 3: Product plans pricing details */}
        <div className="profile-card-panel" style={{ marginBottom: 0, gridColumn: "1 / -1" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "700", borderBottom: "1px solid var(--line)", paddingBottom: "10px", marginTop: 0 }}>
            🏷️ Cấu hình bảng giá gói dịch vụ (VND)
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginTop: "12px" }}>
            <div className="profile-field-group">
              <label>Gói BASIC Monthly (Tháng)</label>
              <input 
                type="number" 
                className="profile-input-text"
                value={basicPrice}
                onChange={(e) => setBasicPrice(Number(e.target.value))}
                required
              />
            </div>
            <div className="profile-field-group">
              <label>Gói PRO Monthly (Tháng)</label>
              <input 
                type="number" 
                className="profile-input-text"
                value={proPrice}
                onChange={(e) => setProPrice(Number(e.target.value))}
                required
              />
            </div>
            <div className="profile-field-group">
              <label>Gói PRO Yearly (Cả năm)</label>
              <input 
                type="number" 
                className="profile-input-text"
                value={proYearlyPrice}
                onChange={(e) => setProYearlyPrice(Number(e.target.value))}
                required
              />
            </div>
            <div className="profile-field-group">
              <label>Gói LIFETIME (Trọn đời)</label>
              <input 
                type="number" 
                className="profile-input-text"
                value={lifetimePrice}
                onChange={(e) => setLifetimePrice(Number(e.target.value))}
                required
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
export default PaymentSettingsAdmin;
