import { NextResponse } from "next/server";
import { appendFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const LOG_PATH = join(homedir(), "Desktop", "alphathon", "frontend.log");

export async function POST(req: Request) {
  try {
    const { entry } = await req.json();
    const now = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const line = `[${now}] ${entry}`;
    console.log(line);
    await appendFile(LOG_PATH, line + "\n");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
