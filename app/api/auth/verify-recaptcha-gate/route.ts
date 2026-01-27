import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { recaptchaToken } = await req.json();

    if (!recaptchaToken) {
      return new NextResponse("reCAPTCHA token is required", { status: 400 });
    }

    const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!recaptchaSecretKey) {
      console.error("RECAPTCHA_SECRET_KEY is not set");
      return new NextResponse("Server configuration error", { status: 500 });
    }

    // Verify the reCAPTCHA token with Google
    const recaptchaVerificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecretKey}&response=${recaptchaToken}`;
    const recaptchaResponse = await fetch(recaptchaVerificationUrl, {
      method: "POST",
    });

    const recaptchaData = await recaptchaResponse.json();

    if (!recaptchaData.success) {
      return NextResponse.json(
        { success: false, error: "reCAPTCHA verification failed" },
        { status: 400 }
      );
    }

    // Additional check: verify score if using reCAPTCHA v3 (optional)
    // For v2, we just check if success is true
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VERIFY_RECAPTCHA_GATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

