import { NextRequest, NextResponse } from "next/server";

const DIRECTION_API = "http://tkacr-dev5.alphonso.tv:8082/content/direction";

export async function GET(req: NextRequest) {
    const x = req.nextUrl.searchParams.get("x") || "0";
    const y = req.nextUrl.searchParams.get("y") || "0";
    const dir = req.nextUrl.searchParams.get("dir") || "up";
    const radius = req.nextUrl.searchParams.get("radius") || "40";

    const url = `${DIRECTION_API}?x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}&dir=${encodeURIComponent(dir)}&radius=${encodeURIComponent(radius)}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 502 });
    }
}
