import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { memoryStore } from "@/lib/store";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status } = body;

    try {
      const updated = await prisma.rule.update({
        where: { id },
        data: { status },
      });
      return NextResponse.json({ success: true, data: updated });
    } catch {
      const updated = memoryStore.updateRule(id, { status });
      return NextResponse.json({ success: true, data: updated });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update rule" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    try {
      await prisma.rule.delete({ where: { id } });
    } catch {
      memoryStore.deleteRule(id);
    }
    return NextResponse.json({ success: true, message: "Rule deleted" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete rule" },
      { status: 500 }
    );
  }
}
