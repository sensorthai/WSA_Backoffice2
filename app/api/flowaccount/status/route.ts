import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { testConnection } from "@/lib/flowaccount";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await testConnection();
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error("FlowAccount Status Error:", error);
    return NextResponse.json(
      {
        success: false,
        status: "error",
        error: error.message || "Failed to connect to FlowAccount"
      },
      { status: 500 }
    );
  }
}
