import { NextResponse } from "next/server";
import { appendFile } from "fs/promises";
import { join } from "path";

export async function POST(req: Request) {
  try {
    const { entry } = await req.json();
    const logPath = join(process.cwd(), "log.txt");
    await appendFile(logPath, entry + "\n");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
