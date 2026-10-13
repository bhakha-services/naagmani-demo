import { NextRequest, NextResponse } from "next/server";
import { getCustomer } from "@/mock/data";
import { projectServiceTokenService } from "@/server/service-tokens";

export async function GET(
  _req: NextRequest,
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
        { error: "Customer was not provisioned via Service Token (no key_id)" },
        { status: 400 }
      );
    }
    const usage = await projectServiceTokenService.getCustomerTokenUsage(cust.key_id);
    return NextResponse.json(usage);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
