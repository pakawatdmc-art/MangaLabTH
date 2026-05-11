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
            <td align="center" style="padding:0 8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#121212;border-radius:24px;border:1px solid #222222;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.5);">
                    <!-- Header -->
                    <tr>
                        <td style="padding:32px 20px 24px;text-align:center;">
                            <a href="https://mangalab-th.com" style="display:inline-block;text-decoration:none;">
                                <div style="width:48px;height:48px;border-radius:50%;overflow:hidden;display:inline-block;">
                                    <img src="https://mangalab-th.com/logo.webp" alt="MangaLabTH" width="48" height="48" style="display:block;border:0;width:48px;height:48px;object-fit:cover;">
                                </div>
                            </a>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding:0 20px 32px;">
                            {content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding:24px 20px;background-color:#0a0a0a;border-top:1px solid #222222;text-align:center;">
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
        <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
            ยินดีต้อนรับสู่ MangaLabTH!
        </h1>
        <p style="margin:0;font-size:16px;color:#a0a0a0;line-height:1.5;">
            ขอบคุณที่สมัครสมาชิก คุณ <strong style="color:#ffffff;">{display_name}</strong>
        </p>
    </div>

    <!-- Welcome Badge -->
    <div style="background-color:#111111;border-radius:16px;padding:24px 20px;margin-bottom:24px;border:1px solid #2a2a2a;text-align:center;">
        <p style="margin:0 0 8px;font-size:48px;line-height:1;">🎉</p>
        <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#fbbd23;text-transform:uppercase;letter-spacing:1px;">
            สมาชิกใหม่
        </p>
        <p style="margin:0;font-size:15px;color:#a0a0a0;line-height:1.6;">
            คุณเป็นส่วนหนึ่งของครอบครัว MangaLabTH แล้ว!<br>
            เริ่มสำรวจการ์ตูนหลากหลายเรื่องได้เลย
        </p>
    </div>

    <!-- Features Card -->
    <div style="background-color:#111111;border-radius:16px;padding:24px 20px;margin-bottom:32px;border:1px solid #2a2a2a;">
        <p style="margin:0 0 24px;font-size:14px;font-weight:700;color:#fbbd23;text-transform:uppercase;letter-spacing:1px;text-align:center;">
            สิ่งที่คุณทำได้
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;">
            <tr>
                <td style="padding-bottom:20px;border-bottom:1px solid #1e1e1e;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td width="44" valign="top">
                                <div style="width:36px;height:36px;border-radius:10px;background-color:#fbbd23;background:linear-gradient(135deg,#fbbd23,#d4a843);text-align:center;line-height:36px;font-size:18px;">📖</div>
                            </td>
                            <td style="padding-left:12px;">
                                <p style="margin:0 0 2px;font-size:15px;font-weight:700;color:#ffffff;">อ่านการ์ตูนคุณภาพสูง</p>
                                <p style="margin:0;font-size:13px;color:#888888;line-height:1.4;">อัปเดตตอนใหม่ทุกวัน ภาพคมชัด แปลไทยสละสลวย</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding:20px 0;border-bottom:1px solid #1e1e1e;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td width="44" valign="top">
                                <div style="width:36px;height:36px;border-radius:10px;background-color:#fbbd23;background:linear-gradient(135deg,#fbbd23,#d4a843);text-align:center;line-height:36px;font-size:18px;">🪙</div>
                            </td>
                            <td style="padding-left:12px;">
                                <p style="margin:0 0 2px;font-size:15px;font-weight:700;color:#ffffff;">ปลดล็อกตอนพิเศษ</p>
                                <p style="margin:0;font-size:13px;color:#888888;line-height:1.4;">อ่านล่วงหน้าก่อนใคร ด้วยระบบเหรียญสุดคุ้มค่า</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding-top:20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td width="44" valign="top">
                                <div style="width:36px;height:36px;border-radius:10px;background-color:#fbbd23;background:linear-gradient(135deg,#fbbd23,#d4a843);text-align:center;line-height:36px;font-size:18px;">💬</div>
                            </td>
                            <td style="padding-left:12px;">
                                <p style="margin:0 0 2px;font-size:15px;font-weight:700;color:#ffffff;">ขอเรื่องที่อยากอ่าน</p>
                                <p style="margin:0;font-size:13px;color:#888888;line-height:1.4;">ไม่มีเรื่องที่หา? ทักมาขอแอดมินได้ที่ <a href="https://www.facebook.com/Mangalabth" target="_blank" style="color:#fbbd23;text-decoration:none;font-weight:600;">Facebook Page</a></p>
                            </td>
                        </tr>
                    </table>
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
    <div style="background-color:#111111;border-radius:16px;padding:24px 20px;margin-bottom:32px;border:1px solid #2a2a2a;">
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


def new_chapter_notification_email_html(
    display_name: str,
    manga_title: str,
    manga_slug: str,
    cover_url: str,
    chapters: list[dict],
    site_url: str,
) -> str:
    """Generate New Chapter Notification Email HTML.

    Parameters
    ----------
    chapters : list[dict]
        Each dict has keys: number (float), title (str), is_free (bool), coin_price (int)
    """
    chapter_count = len(chapters)
    subject_hint = f"ตอนที่ {chapters[0]['number']:.0f}" if chapter_count == 1 else f"{chapter_count} ตอนใหม่"

    # Build chapter list rows
    chapter_rows = ""
    for i, ch in enumerate(sorted(chapters, key=lambda c: c["number"])):
        num = ch["number"]
        # Format number: show .5 if needed, otherwise integer
        num_str = f"{num:.0f}" if num == int(num) else f"{num}"
        title = ch.get("title", "")
        is_free = ch.get("is_free", False)
        coin_price = ch.get("coin_price", 0)

        badge = '<span style="display:inline-block;background-color:#1a3a1a;color:#4ade80;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;margin-left:8px;">ฟรี</span>' if is_free else f'<span style="display:inline-block;background-color:#3a2a0a;color:#fbbd23;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;margin-left:8px;">{coin_price} 🪙</span>'

        title_text = f' — {title}' if title else ''
        border_bottom = 'border-bottom:1px solid #1e1e1e;' if i < chapter_count - 1 else ''

        chapter_rows += f"""
            <tr>
                <td style="padding:12px 0;{border_bottom}">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td width="36" valign="top">
                                <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#fbbd23,#d4a843);text-align:center;line-height:32px;font-size:14px;font-weight:800;color:#000000;">{num_str}</div>
                            </td>
                            <td style="padding-left:12px;vertical-align:middle;">
                                <p style="margin:0;font-size:14px;color:#ffffff;font-weight:600;">ตอนที่ {num_str}{title_text}{badge}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>"""

    # Build first chapter URL for the CTA
    first_ch = sorted(chapters, key=lambda c: c["number"])[0]
    first_num = first_ch["number"]
    first_num_str = f"{first_num:.0f}" if first_num == int(first_num) else f"{first_num}"
    read_url = f"{site_url}/{manga_slug}/ตอนที่-{first_num_str}"

    content = f"""
    <!-- Hero section with cover -->
    <div style="text-align:center;margin-bottom:24px;">
        <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
            📢 มีตอนใหม่มาแล้ว!
        </h1>
        <p style="margin:0;font-size:15px;color:#a0a0a0;line-height:1.5;">
            สวัสดีคุณ <strong style="color:#ffffff;">{display_name}</strong> มังงะที่คุณติดตามมีอัปเดตใหม่
        </p>
    </div>

    <!-- Manga Card -->
    <div style="background-color:#111111;border-radius:16px;padding:24px 20px;margin-bottom:24px;border:1px solid #2a2a2a;text-align:center;">
        {"<img src='" + cover_url + "' alt='" + manga_title + "' style='display:block;width:180px;height:auto;border-radius:12px;margin:0 auto 20px;border:2px solid #2a2a2a;box-shadow:0 8px 24px rgba(0,0,0,0.4);' />" if cover_url else ""}
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#ffffff;">{manga_title}</p>
        <p style="margin:0;font-size:13px;color:#fbbd23;font-weight:600;">
            อัปเดต {subject_hint}
        </p>
    </div>

    <!-- Chapter List -->
    <div style="background-color:#111111;border-radius:16px;padding:20px;margin-bottom:32px;border:1px solid #2a2a2a;">
        <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#fbbd23;text-transform:uppercase;letter-spacing:1px;text-align:center;">
            ตอนใหม่ที่อัปเดต
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            {chapter_rows}
        </table>
    </div>

    <!-- CTA Button -->
    <div style="text-align:center;">
        <a href="{read_url}" target="_blank" style="display:inline-block;background-color:#fbbd23;color:#000000;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:100px;box-shadow:0 4px 15px rgba(251,189,35,0.3);">
            อ่านตอนใหม่เลย
        </a>
    </div>
    """
    preview = f"{manga_title} มีตอนใหม่! {subject_hint} — อ่านได้แล้ววันนี้ที่ MangaLabTH"
    return _base_layout(content, preview_text=preview)

