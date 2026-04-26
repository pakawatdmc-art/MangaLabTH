import { ScaleUp, FadeUp } from "@/components/MotionWrappers";
import { Mail, MessageCircle, ShieldCheck, Zap, Ban, Rocket } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "เกี่ยวกับเรา | MangaLabTH",
  description: "ทำความรู้จักกับ MangaLabTH แพลตฟอร์มอ่านมังงะออนไลน์ที่เกิดมาเพื่อแก้ปัญหาเว็บอ่านการ์ตูนแบบเดิมๆ ไร้โฆษณาขยะ โหลดไว อัปเดตตอนล่าสุดก่อนใคร",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-surface-300 py-12 px-4 sm:px-6">
      {/* Hero Section */}
      <div className="relative z-10 mx-auto max-w-4xl text-center mb-12">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-full max-w-[600px] bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.1),transparent_70%)] -z-10" />
        <FadeUp delay={0.1}>
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl drop-shadow-sm">
            ทำไมต้อง <span className="text-gold">MangaLabTH</span> ?
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            แพลตฟอร์มที่เกิดมาเพื่อ "แก้ปัญหา" เว็บอ่านการ์ตูนแบบเดิมๆ คืนความสุขในการอ่านมังงะให้คุณ
          </p>
        </FadeUp>
      </div>

      <div className="mx-auto max-w-4xl space-y-8">
        {/* Main Content Card */}
        <ScaleUp delay={0.2} className="overflow-hidden rounded-[2rem] bg-surface-200/40 shadow-2xl ring-1 ring-white/5 backdrop-blur-md p-8 sm:p-10">
          <div className="space-y-6 text-gray-300 leading-relaxed">
            <p className="text-lg">
              เคยเบื่อไหม? เวลาเข้าเว็บอ่านการ์ตูนแล้วต้องเจอ <strong>โฆษณาเว็บพนันเด้งรบกวน</strong> หน้าเว็บโหลดช้า หมวดหมู่ปะปนกันมั่วไปหมด ทั้งนิยาย มังงะ มังฮวา หรือแม้แต่คอนเทนต์ 18+ จนหาเรื่องที่อยากอ่านไม่เจอ 
            </p>
            <p>
              <strong className="text-gold">MangaLabTH</strong> ถูกสร้างขึ้นมาเพื่อทลายปัญหาเหล่านั้น! เราออกแบบแพลตฟอร์มให้ <strong>สะอาด ใช้งานง่าย โฟกัสเฉพาะมังงะและมังฮวาคุณภาพ</strong> ไม่มีแบนเนอร์ขยะมากวนใจ ให้คุณได้ดื่มด่ำกับลายเส้นและเนื้อเรื่องแบบเต็ม 100%
            </p>
            <div className="mt-6 rounded-xl bg-gold/10 border border-gold/20 p-5 text-gold-light font-medium">
              💡 <span className="text-white">ทริคการอ่าน:</span> คุณอาจจะไปหาอ่านตอนเก่าๆ จากที่อื่นเพื่อปูเนื้อเรื่อง แต่ถ้าเป็น <strong>"ตอนล่าสุด"</strong> ต้องมาที่ MangaLabTH เท่านั้น! เพราะเราอัปเดตตอนใหม่ล่าสุดไวที่สุด ทันใจสายมังงะแน่นอน
            </div>
          </div>
        </ScaleUp>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ScaleUp delay={0.3} className="rounded-[1.5rem] bg-surface-200/40 ring-1 ring-white/5 p-6 flex items-start gap-4 hover:bg-surface-200 transition">
            <div className="bg-red-500/10 p-3 rounded-xl shrink-0">
              <Ban className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-2">คลีน 100% ไร้โฆษณาขยะ</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                บอกลาแบนเนอร์เว็บพนันและป๊อปอัปน่ารำคาญ เว็บของเราออกแบบมาให้สะอาดตา จัดหมวดหมู่ชัดเจน ไม่งง ไม่หลง
              </p>
            </div>
          </ScaleUp>

          <ScaleUp delay={0.4} className="rounded-[1.5rem] bg-surface-200/40 ring-1 ring-white/5 p-6 flex items-start gap-4 hover:bg-surface-200 transition">
            <div className="bg-gold/10 p-3 rounded-xl shrink-0">
              <Rocket className="h-6 w-6 text-gold" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg mb-2">อัปเดตตอนล่าสุด โคตรไว</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                ตามเก็บตอนเก่าที่อื่นมา แล้วมารออ่านตอนล่าสุดที่เรา! เสิร์ฟตอนใหม่ด้วยความไวแสง โหลดภาพลื่นไหลด้วยเทคโนโลยี WebP
              </p>
            </div>
          </ScaleUp>
        </div>

        {/* Contact Section */}
        <ScaleUp delay={0.5} className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-surface-200/40 to-surface-100/20 shadow-2xl ring-1 ring-white/5 backdrop-blur-md p-8 sm:p-10 mt-8 text-center border-t border-gold/10">
          <h2 className="text-2xl font-bold text-white mb-6">ติดต่อเรา</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            มีข้อเสนอแนะ แจ้งปัญหาการใช้งาน หรืออยากให้เรานำเข้าเรื่องไหนเป็นพิเศษ? สามารถพูดคุยกับทีมงานแอดมินของเราได้เลย!
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <a 
              href="https://facebook.com/mangalabth" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white px-6 py-3 rounded-xl font-medium transition w-full sm:w-auto justify-center shadow-lg shadow-[#1877F2]/20"
            >
              <MessageCircle className="h-5 w-5" />
              Facebook Fanpage
            </a>
            <a 
              href="mailto:support@mangalabth.com" 
              className="flex items-center gap-2 bg-surface-100 hover:bg-surface-50 ring-1 ring-white/10 text-white px-6 py-3 rounded-xl font-medium transition w-full sm:w-auto justify-center"
            >
              <Mail className="h-5 w-5" />
              support@mangalabth.com
            </a>
          </div>
        </ScaleUp>
      </div>
    </div>
  );
}
