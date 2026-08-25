export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API routes
    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        message: "Akaz Worker is running"
      });
    }

    if (url.pathname === "/api/login" && request.method === "POST") {
      return handleLogin(request, env);
    }

    if (url.pathname === "/api/logout" && request.method === "POST") {
      return handleLogout();
    }

    if (url.pathname === "/api/me" && request.method === "GET") {
      return handleMe(request, env);
    }

    if (url.pathname === "/api/setup" && request.method === "POST") {
      return handleSetup(request, env);
    }

    // Serve current website files
    return env.ASSETS.fetch(request);
  }
};


/* =========================
   LOGIN
========================= */

async function handleLogin(request, env) {
  try {
    const body = await request.json();

    const employeeId =
      String(body.employeeId || "").trim();

    const password =
      String(body.password || "");

    if (!employeeId || !password) {
      return json(
        { ok: false, message: "أدخل الرقم الوظيفي والرمز السري." },
        400
      );
    }

    if (!/^\d{4,10}$/.test(employeeId)) {
      return json(
        { ok: false, message: "بيانات الدخول غير صحيحة." },
        401
      );
    }

    const user = await env.DB
      .prepare(`
        SELECT
          id,
          username,
          password_hash,
          role
        FROM users
        WHERE username = ?
        LIMIT 1
      `)
      .bind(employeeId)
      .first();

    if (!user) {
      return json(
        { ok: false, message: "بيانات الدخول غير صحيحة." },
        401
      );
    }

    const validPassword =
      await verifyPassword(
        password,
        user.password_hash
      );

    if (!validPassword) {
      return json(
        { ok: false, message: "بيانات الدخول غير صحيحة." },
        401
      );
    }

    if (!env.SESSION_SECRET) {
      return json(
        {
          ok: false,
          message: "SESSION_SECRET غير مضاف في إعدادات Cloudflare."
        },
        500
      );
    }

    const token = await createSessionToken(
      {
        userId: user.id,
        employeeId: user.username,
        role: user.role || "user"
      },
      env.SESSION_SECRET
    );

    return new Response(
      JSON.stringify({
        ok: true,
        employeeId: user.username,
        role: user.role || "user"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          "Set-Cookie":
            `akaz_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`
        }
      }
    );

  } catch (error) {
    console.error(error);

    return json(
      {
        ok: false,
        message: "حدث خطأ أثناء تسجيل الدخول."
      },
      500
    );
  }
}


/* =========================
   LOGOUT
========================= */

function handleLogout() {
  return new Response(
    JSON.stringify({
      ok: true
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "Set-Cookie":
          "akaz_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
      }
    }
  );
}


/* =========================
   CURRENT USER
========================= */

async function handleMe(request, env) {
  if (!env.SESSION_SECRET) {
    return json(
      { ok: false },
      401
    );
  }

  const token =
    getCookie(
      request,
      "akaz_session"
    );

  if (!token) {
    return json(
      { ok: false },
      401
    );
  }

  const session =
    await verifySessionToken(
      token,
      env.SESSION_SECRET
    );

  if (!session) {
    return json(
      { ok: false },
      401
    );
  }

  return json({
    ok: true,
    employeeId: session.employeeId,
    role: session.role
  });
}


/* =========================
   FIRST USER SETUP
========================= */

async function handleSetup(request, env) {
  try {
    if (!env.SETUP_SECRET) {
      return json(
        {
          ok: false,
          message: "SETUP_SECRET غير مضاف."
        },
        500
      );
    }

    const providedSecret =
      request.headers.get("X-Setup-Secret");

    if (
      !providedSecret ||
      providedSecret !== env.SETUP_SECRET
    ) {
      return json(
        {
          ok: false,
          message: "غير مصرح."
        },
        403
      );
    }

    const body =
      await request.json();

    const employeeId =
      String(body.employeeId || "").trim();

    const password =
      String(body.password || "");

    const role =
      String(body.role || "user").trim();

    if (!/^\d{4,10}$/.test(employeeId)) {
      return json(
        {
          ok: false,
          message: "الرقم الوظيفي غير صحيح."
        },
        400
      );
    }

    if (password.length < 8) {
      return json(
        {
          ok: false,
          message: "الرمز السري يجب أن يكون 8 خانات على الأقل."
        },
        400
      );
    }

    const passwordHash =
      await hashPassword(password);

    await env.DB
      .prepare(`
        INSERT INTO users (
          username,
          password_hash,
          role
        )
        VALUES (?, ?, ?)
        ON CONFLICT(username)
        DO UPDATE SET
          password_hash = excluded.password_hash,
          role = excluded.role
      `)
      .bind(
        employeeId,
        passwordHash,
        role
      )
      .run();

    return json({
      ok: true,
      message: "تم إنشاء المستخدم بنجاح."
    });

  } catch (error) {
    console.error(error);

    return json(
      {
        ok: false,
        message: "حدث خطأ أثناء إنشاء المستخدم."
      },
      500
    );
  }
}


/* =========================
   PASSWORD HASHING
========================= */

async function hashPassword(password) {
  const encoder =
    new TextEncoder();

  const salt =
    crypto.getRandomValues(
      new Uint8Array(16)
    );

  const keyMaterial =
    await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

  const derivedBits =
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: 210000,
        hash: "SHA-256"
      },
      keyMaterial,
      256
    );

  return (
    "pbkdf2$210000$" +
    bytesToBase64(salt) +
    "$" +
    bytesToBase64(
      new Uint8Array(derivedBits)
    )
  );
}


async function verifyPassword(
  password,
  storedHash
) {
  try {
    const parts =
      storedHash.split("$");

    if (
      parts.length !== 4 ||
      parts[0] !== "pbkdf2"
    ) {
      return false;
    }

    const iterations =
      Number(parts[1]);

    const salt =
      base64ToBytes(parts[2]);

    const expectedHash =
      base64ToBytes(parts[3]);

    const encoder =
      new TextEncoder();

    const keyMaterial =
      await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
      );

    const derivedBits =
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt,
          iterations,
          hash: "SHA-256"
        },
        keyMaterial,
        256
      );

    const actualHash =
      new Uint8Array(
        derivedBits
      );

    return timingSafeEqual(
      actualHash,
      expectedHash
    );

  } catch {
    return false;
  }
}


/* =========================
   SESSION TOKEN
========================= */

async function createSessionToken(
  data,
  secret
) {
  const payload = {
    ...data,
    exp:
      Math.floor(Date.now() / 1000) +
      60 * 60 * 8
  };

  const payloadEncoded =
    base64UrlEncode(
      JSON.stringify(payload)
    );

  const signature =
    await hmacSign(
      payloadEncoded,
      secret
    );

  return (
    payloadEncoded +
    "." +
    signature
  );
}


async function verifySessionToken(
  token,
  secret
) {
  try {
    const parts =
      token.split(".");

    if (parts.length !== 2) {
      return null;
    }

    const payloadEncoded =
      parts[0];

    const signature =
      parts[1];

    const expectedSignature =
      await hmacSign(
        payloadEncoded,
        secret
      );

    if (
      !constantTimeStringCompare(
        signature,
        expectedSignature
      )
    ) {
      return null;
    }

    const payload =
      JSON.parse(
        base64UrlDecode(
          payloadEncoded
        )
      );

    if (
      !payload.exp ||
      payload.exp <
        Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;

  } catch {
    return null;
  }
}


async function hmacSign(
  value,
  secret
) {
  const encoder =
    new TextEncoder();

  const key =
    await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(value)
    );

  return bytesToBase64Url(
    new Uint8Array(signature)
  );
}


/* =========================
   COOKIE
========================= */

function getCookie(
  request,
  name
) {
  const cookieHeader =
    request.headers.get("Cookie");

  if (!cookieHeader) {
    return null;
  }

  const cookies =
    cookieHeader.split(";");

  for (const cookie of cookies) {
    const parts =
      cookie.trim().split("=");

    const key =
      parts.shift();

    const value =
      parts.join("=");

    if (key === name) {
      return value;
    }
  }

  return null;
}


/* =========================
   HELPERS
========================= */

function json(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",
        "Cache-Control":
          "no-store"
      }
    }
  );
}


function timingSafeEqual(
  a,
  b
) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (
    let i = 0;
    i < a.length;
    i++
  ) {
    result |=
      a[i] ^ b[i];
  }

  return result === 0;
}


function constantTimeStringCompare(
  a,
  b
) {
  const encoder =
    new TextEncoder();

  return timingSafeEqual(
    encoder.encode(a),
    encoder.encode(b)
  );
}


function bytesToBase64(
  bytes
) {
  let binary = "";

  for (
    const byte of bytes
  ) {
    binary +=
      String.fromCharCode(byte);
  }

  return btoa(binary);
}


function base64ToBytes(
  base64
) {
  const binary =
    atob(base64);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return bytes;
}


function bytesToBase64Url(
  bytes
) {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}


function base64UrlEncode(
  text
) {
  const bytes =
    new TextEncoder()
      .encode(text);

  return bytesToBase64Url(
    bytes
  );
}


function base64UrlDecode(
  value
) {
  value =
    value
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  while (
    value.length % 4
  ) {
    value += "=";
  }

  const binary =
    atob(value);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {
    bytes[i] =
      binary.charCodeAt(i);
  }

  return new TextDecoder()
    .decode(bytes);
}
