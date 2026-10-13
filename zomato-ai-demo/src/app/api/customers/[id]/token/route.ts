import { NextRequest, NextResponse } from "next/server";
import { getCustomer } from "@/mock/data";
import { projectServiceTokenService } from "@/server/service-tokens";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cust = getCustomer(id);
    if (!cust) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    if (!cust.key_id) {
      return NextResponse.json(
        { error: "Customer was not provisioned via Service Token" },
        { status: 400 }
      );
    }
    const { searchParams } = new URL(req.url);
    const reason = searchParams.get("reason") || "customer token revocation via demo UI";
    const result = await projectServiceTokenService.revokeCustomerToken(cust.key_id, reason);
    cust.status = "revoked";
    return NextResponse.json({ success: true, customer: cust, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
