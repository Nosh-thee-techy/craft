/**
 * Purpose: Render a scan-to-verify QR image for a trust URL.
 * Inputs: data URL from lib/trust/qr.ts, alt label, optional size.
 * Outputs: accessible QR <img> for clients to scan.
 */
type VerifyQrProps = {
  dataUrl: string;
  label?: string;
  size?: number;
};

/**
 * Show the QR the client scans to open /t/[slug].
 */
export function VerifyQr({ dataUrl, label = "Scan to verify this creative", size = 160 }: VerifyQrProps) {
  return (
    <figure className="inline-flex flex-col items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- local PNG data URL from qrcode */}
      <img
        src={dataUrl}
        alt={label}
        width={size}
        height={size}
        className="rounded-2xl border border-border/70 bg-white/90 p-2"
      />
      <figcaption className="max-w-[12rem] text-center text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </figcaption>
    </figure>
  );
}
