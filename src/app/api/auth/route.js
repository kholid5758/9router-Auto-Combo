import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";

export const dynamic = "force-dynamic";

const nodeRequire = typeof __non_webpack_require__ !== "undefined" ? __non_webpack_require__ : eval("require");

function getStorage() {
  const dir = path.resolve(process.cwd(), "src/lib/autoFree");
  return nodeRequire(path.join(dir, "storage.js"));
}

export async function GET(request) {
  const token = request.cookies.get("session_token")?.value;
  const storage = getStorage();
  const isValid = storage.verifySessionToken ? storage.verifySessionToken(token) : false;

  return NextResponse.json({
    authenticated: isValid,
    requireLogin: true,
  });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, password } = body;
    const storage = getStorage();

    if (action === "logout") {
      const response = NextResponse.json({ success: true, message: "Logged out" });
      response.cookies.set("session_token", "", {
        httpOnly: true,
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    const isOk = storage.verify9routerPassword ? storage.verify9routerPassword(password) : false;
    if (!isOk) {
      return NextResponse.json({ success: false, error: "Password salah!" }, { status: 401 });
    }

    const token = storage.createSessionToken ? storage.createSessionToken() : "token";
    const response = NextResponse.json({ success: true, message: "Login berhasil" });
    response.cookies.set("session_token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
