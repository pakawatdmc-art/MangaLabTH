"""HTML email templates for MangaLabTH transactional emails.

All templates use inline CSS for maximum email client compatibility.
Design follows MangaLabTH's modern dark/gold branding.
"""


def _base_layout(content: str, preview_text: str = "") -> str:
    """Wrap content in a responsive email base layout."""
    return f"""<!DOCTYPE html>
<html lang="th" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>MangaLabTH</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    {f'<div style="display:none;max-height:0;overflow:hidden;">{preview_text}</div>' if preview_text else ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#050505;padding:40px 0;">
        <tr>
            <td align="center" style="padding:0 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#121212;border-radius:24px;border:1px solid #222222;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.5);">
                    <!-- Header -->
                    <tr>
                        <td style="padding:40px 32px 24px;text-align:center;">
                            <a href="https://mangalab-th.com" style="display:inline-block;text-decoration:none;">
                                <img src="https://mangalab-th.com/logo.webp" alt="MangaLabTH" height="48" style="display:block;border:0;height:48px;width:auto;margin:0 auto;">
                            </a>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding:0 40px 40px;">
                            {content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding:32px 40px;background-color:#0a0a0a;border-top:1px solid #222222;text-align:center;">
                            <p style="margin:0 0 16px;font-size:13px;color:#888888;font-weight:500;">
                                © MangaLabTH — แพลตฟอร์มอ่านการ์ตูนออนไลน์คุณภาพสูง
                            </p>
                            <div style="margin-bottom:16px;">
                                <a href="https://www.facebook.com/Mangalabth" style="color:#fbbd23;text-decoration:none;font-size:13px;margin:0 10px;font-weight:600;">Facebook</a>
                                <span style="color:#444;">|</span>
                                <a href="https://mangalab-th.com" style="color:#fbbd23;text-decoration:none;font-size:13px;margin:0 10px;font-weight:600;">Website</a>
                            </div>
                            <p style="margin:0;font-size:11px;color:#444444;">
                                อีเมลนี้ถูกส่งอัตโนมัติจากระบบ กรุณาอย่าตอบกลับ
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""


def welcome_email_html(display_name: str, site_url: str) -> str:
    """Generate Welcome Email HTML for new users."""
    content = f"""
    <div style="text-align:center;margin-bottom:32px;">
        <img src="https://mangalab-th.com/og-default.png" alt="Welcome to MangaLabTH" style="width:100%;max-width:400px;border-radius:16px;box-shadow:0 4px 20px rgba(251,189,35,0.15);">
    </div>

    <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#ffffff;text-align:center;letter-spacing:-0.5px;">
        ยินดีต้อนรับสู่ <span style="color:#fbbd23;">MangaLabTH</span>
    </h1>
    <p style="margin:0 0 32px;font-size:16px;color:#a0a0a0;text-align:center;line-height:1.5;">
        สวัสดีคุณ <strong style="color:#ffffff;">{display_name}</strong> 🎉<br>
        ขอบคุณที่เข้ามาร่วมเป็นส่วนหนึ่งของแพลตฟอร์มเรา
    </p>

    <div style="background:linear-gradient(145deg,#1a1a1a,#111111);border-radius:16px;padding:28px;margin-bottom:32px;border:1px solid #2a2a2a;">
        <p style="margin:0 0 20px;font-size:15px;color:#ffffff;font-weight:600;">เริ่มต้นใช้งาน MangaLabTH:</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td width="32" valign="top" style="padding-bottom:16px;font-size:20px;">📖</td>
                <td style="padding-bottom:16px;font-size:15px;color:#cccccc;line-height:1.4;">
                    <strong style="color:#ffffff;">อ่านการ์ตูนคุณภาพสูง</strong><br>
                    อัปเดตตอนใหม่ทุกวัน ภาพคมชัด แปลภาษาไทยสละสลวย
                </td>
            </tr>
            <tr>
                <td width="32" valign="top" style="padding-bottom:16px;font-size:20px;">🪙</td>
                <td style="padding-bottom:16px;font-size:15px;color:#cccccc;line-height:1.4;">
                    <strong style="color:#ffffff;">ปลดล็อกตอนพิเศษ</strong><br>
                    อ่านล่วงหน้าก่อนใคร ด้วยระบบเหรียญที่คุ้มค่า
                </td>
            </tr>
            <tr>
                <td width="32" valign="top" style="font-size:20px;">💬</td>
                <td style="font-size:15px;color:#cccccc;line-height:1.4;">
                    <strong style="color:#ffffff;">ขอเรื่องที่อยากอ่าน</strong><br>
                    ถ้าไม่มีเรื่องที่หาอยู่ ทักมาขอแอดมินได้เลยที่ <a href="https://www.facebook.com/Mangalabth" target="_blank" style="color:#fbbd23;text-decoration:none;">Facebook Page</a>
                </td>
            </tr>
        </table>
    </div>

    <!-- CTA Button -->
    <div style="text-align:center;">
        <a href="{site_url}" target="_blank" style="display:inline-block;background-color:#fbbd23;color:#000000;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:100px;box-shadow:0 4px 15px rgba(251,189,35,0.3);">
            เริ่มต้นอ่านการ์ตูนเลย
        </a>
    </div>
    """
    return _base_layout(content, preview_text="ยินดีต้อนรับสู่ MangaLabTH! เริ่มอ่านมังงะสุดมันส์ได้เลย")


def payment_confirmation_email_html(
    display_name: str,
    package_name: str,
    coins: int,
    price_thb: int,
    new_balance: int,
    reference_no: str,
    site_url: str,
) -> str:
    """Generate Payment Confirmation Email HTML."""
    content = f"""
    <div style="text-align:center;margin-bottom:32px;">
        <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
            ชำระเงินสำเร็จ!
        </h1>
        <p style="margin:0;font-size:16px;color:#a0a0a0;line-height:1.5;">
            ขอบคุณที่สนับสนุนเรา คุณ <strong style="color:#ffffff;">{display_name}</strong>
        </p>
    </div>

    <!-- Receipt card -->
    <div style="background-color:#111111;border-radius:16px;padding:32px;margin-bottom:32px;border:1px solid #2a2a2a;">
        <p style="margin:0 0 24px;font-size:14px;font-weight:700;color:#fbbd23;text-transform:uppercase;letter-spacing:1px;text-align:center;">
            ใบเสร็จรับเงิน
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;">
            <tr>
                <td style="padding-bottom:16px;color:#a0a0a0;">แพ็กเกจที่เลือก</td>
                <td style="padding-bottom:16px;color:#ffffff;text-align:right;font-weight:600;">{package_name}</td>
            </tr>
            <tr>
                <td style="padding-bottom:16px;color:#a0a0a0;">ยอดชำระเงิน</td>
                <td style="padding-bottom:16px;color:#ffffff;text-align:right;font-weight:600;">฿{price_thb:,}</td>
            </tr>
            <tr>
                <td style="padding-bottom:24px;color:#a0a0a0;border-bottom:2px dashed #2a2a2a;">หมายเลขอ้างอิง</td>
                <td style="padding-bottom:24px;color:#666666;text-align:right;font-family:ui-monospace,monospace;font-size:13px;border-bottom:2px dashed #2a2a2a;">{reference_no}</td>
            </tr>
            <tr>
                <td style="padding-top:24px;color:#ffffff;font-weight:600;font-size:16px;">เหรียญที่ได้รับ</td>
                <td style="padding-top:24px;color:#fbbd23;text-align:right;font-weight:800;font-size:22px;">+{coins:,} <span style="font-size:16px;">🪙</span></td>
            </tr>
        </table>
    </div>

    <!-- Balance summary -->
    <div style="text-align:center;margin-bottom:32px;">
        <p style="margin:0 0 8px;font-size:14px;color:#888888;font-weight:500;">ยอดเหรียญคงเหลือของคุณ</p>
        <p style="margin:0;font-size:42px;font-weight:900;color:#ffffff;letter-spacing:-1px;line-height:1;">
            {new_balance:,} <span style="font-size:20px;font-weight:700;color:#fbbd23;">เหรียญ</span>
        </p>
    </div>

    <!-- CTA Button -->
    <div style="text-align:center;">
        <a href="{site_url}/coins" target="_blank" style="display:inline-block;background-color:#fbbd23;color:#000000;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:100px;box-shadow:0 4px 15px rgba(251,189,35,0.3);">
            อ่านการ์ตูนเรื่องโปรดต่อเลย
        </a>
    </div>
    """
    return _base_layout(
        content,
        preview_text=f"เติมเหรียญสำเร็จ! +{coins:,} เหรียญ — ยอดคงเหลือ {new_balance:,} เหรียญ",
    )
