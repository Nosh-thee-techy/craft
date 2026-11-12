/**
 * Purpose: Build scan-to-verify QR codes for public trust URLs.
 * Inputs: absolute trust page URL (APP_URL + /t/slug).
 * Outputs: a PNG data URL the UI can render as an <img>.
 *
 * WHY local qrcode: clients must be able to scan offline demos without a third-party QR CDN.
 */
import "server-only";
import QRCode from "qrcode";

/**
 * Encode a trust/verify URL as a PNG data URL.
 */
export async function trustQrDataUrl(trustUrl: string): Promise<string> {
  return QRCode.toDataURL(trustUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 280,
    color: { dark: "#1a1510", light: "#ffffff" },
  });
}
