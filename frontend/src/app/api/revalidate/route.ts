import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        const secret = process.env.REVALIDATION_SECRET || "super-secret-mangalabth";

        if (authHeader !== `Bearer ${secret}`) {
            return NextResponse.json({ message: "Invalid token" }, { status: 401 });
        }

        const { path } = await req.json();

        if (!path) {
            return NextResponse.json({ message: "Path is required" }, { status: 400 });
        }

        revalidatePath(path);
        return NextResponse.json({ revalidated: true, path, now: Date.now() });
    } catch (err) {
        return NextResponse.json({ message: "Error revalidating" }, { status: 500 });
    }
}
