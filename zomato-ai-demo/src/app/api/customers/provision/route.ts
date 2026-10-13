import { NextRequest, NextResponse } from "next/server";
import { projectServiceTokenService } from "@/server/service-tokens";
import { addCustomer, createWelcomeOrder } from "@/mock/data";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      service_token,
      name,
      email,
      phone,
      city,
      tier,
      monthly_budget_usd,
      requests_per_minute,
      allowed_models,
      create_welcome_order = true,
      expires_in_days,
      department,
      external_user_id,
    } = body;

    if (!name || String(name).trim() === "") {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    const assignedId = external_user_id || `cust_${Math.floor(1000 + Math.random() * 9000)}`;

    const provResult = await projectServiceTokenService.provisionCustomerToken({
      service_token,
      external_user_id: assignedId,
      name: String(name).trim(),
      email: email || `${assignedId}@partner.zomato.local`,
      phone: phone || "+91-98765" + Math.floor(10000 + Math.random() * 90000),
      city: city || "Bengaluru",
      tier: tier || "prime",
      department: department || `${(tier || "prime").toUpperCase()} Customer`,
      monthly_budget_usd: monthly_budget_usd !== undefined ? Number(monthly_budget_usd) : 25.0,
      requests_per_minute: requests_per_minute !== undefined ? Number(requests_per_minute) : 60,
      allowed_models: allowed_models || ["mock/gpt-5-mini", "gpt-4o"],
      expires_in_days: expires_in_days || 30,
    });

    const newCustomer = addCustomer({
      id: assignedId,
      name: String(name).trim(),
      email: email || `${assignedId}@partner.zomato.local`,
      phone: phone || "+91-98765" + Math.floor(10000 + Math.random() * 90000),
      city: city || "Bengaluru",
      tier: (tier as any) || "prime",
      member_id: provResult.member_id,
      api_key: provResult.api_key,
      key_id: provResult.id,
      key_prefix: provResult.key_prefix,
      masked_identifier: provResult.masked_identifier,
      monthly_budget_usd: provResult.monthly_budget_usd,
      requests_per_minute: provResult.requests_per_minute,
      allowed_models: provResult.allowed_models,
      status: provResult.status,
      provisioned_at: provResult.created_at,
      provisioned_by_service_token: provResult.provisioned_by_token,
    });

    let welcomeOrder = null;
    if (create_welcome_order) {
      welcomeOrder = createWelcomeOrder(newCustomer);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Customer '${newCustomer.name}' provisioned successfully via Master Service Token`,
        customer: newCustomer,
        provision_result: provResult,
        welcome_order: welcomeOrder,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
