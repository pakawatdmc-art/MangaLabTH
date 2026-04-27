import re

with open("frontend/src/app/admin/AdminLayoutClient.tsx", "r") as f:
    content = f.read()

new_links = """const SIDEBAR_LINKS = [
    { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard },
    { href: "/admin/analytics", label: "ยอดเข้าชม", icon: Sparkles },
    { href: "/admin/analytics/coins", label: "ยอดเติมเหรียญ", icon: Coins },
    { href: "/admin/analytics/users", label: "สถิติผู้ใช้งาน", icon: Users },
    { href: "/admin/manga", label: "จัดการมังงะ", icon: BookOpen },
    { href: "/admin/chapters", label: "จัดการตอน", icon: Layers },
    { href: "/admin/users", label: "จัดการบัญชีผู้ใช้", icon: Users },
    { href: "/admin/transactions", label: "จัดการธุรกรรม", icon: Coins },
];"""

content = re.sub(r'const SIDEBAR_LINKS = \[.*?\];', new_links, content, flags=re.DOTALL)

with open("frontend/src/app/admin/AdminLayoutClient.tsx", "w") as f:
    f.write(content)
print("Updated sidebar")
