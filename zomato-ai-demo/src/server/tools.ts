import { ORDERS, RESTAURANTS, CUSTOMERS, Order } from "../mock/data";

export interface ToolResult {
  tool: string;
  success: boolean;
  result?: any;
  error?: string;
}

export const ZOMATO_TOOLS = [
  {
    name: "get_order_status",
    description: "Get real-time tracking and delivery ETA for a food order",
    parameters: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "The order ID, e.g. ORD-1001" },
      },
      required: ["order_id"],
    },
  },
  {
    name: "get_order_details",
    description: "Get full itemized order details, amounts, restaurant, and delivery address",
    parameters: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "The order ID, e.g. ORD-1001" },
      },
      required: ["order_id"],
    },
  },
  {
    name: "cancel_order",
    description: "Cancel an eligible food order if it has not yet been prepared",
    parameters: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "The order ID to cancel, e.g. ORD-1003" },
        customer_id: { type: "string", description: "The requesting customer ID, e.g. cust_1001" },
        reason: { type: "string", description: "Reason for cancellation" },
      },
      required: ["order_id", "customer_id"],
    },
  },
  {
    name: "search_restaurants",
    description: "Search for restaurants by cuisine, location, or dish keyword",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Cuisine or restaurant name, e.g. Biryani or Pizza" },
        location: { type: "string", description: "Neighborhood or area, e.g. Indiranagar" },
      },
    },
  },
  {
    name: "get_restaurant_menu",
    description: "Get full menu items and pricing for a restaurant",
    parameters: {
      type: "object",
      properties: {
        restaurant_id: { type: "string", description: "Restaurant ID, e.g. rest_1" },
      },
      required: ["restaurant_id"],
    },
  },
  {
    name: "get_payment_status",
    description: "Retrieve payment verification and refund status for an order",
    parameters: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "The order ID, e.g. ORD-1001" },
      },
      required: ["order_id"],
    },
  },
];

export function executeZomatoTool(
  toolName: string,
  args: Record<string, any>,
  requestingCustomerId?: string
): ToolResult {
  switch (toolName) {
    case "get_order_status": {
      const orderId = String(args.order_id || "").trim().toUpperCase();
      const order = ORDERS.find((o) => o.id === orderId);
      if (!order) {
        return { tool: toolName, success: false, error: `Order ${orderId} not found` };
      }
      return {
        tool: toolName,
        success: true,
        result: {
          order_id: order.id,
          status: order.status,
          eta_minutes: order.eta_minutes,
          restaurant_name: order.restaurant_name,
          delivery_partner: order.delivery_partner || { name: "Assigning rider...", phone: "N/A" },
          updated_at: order.updated_at,
        },
      };
    }

    case "get_order_details": {
      const orderId = String(args.order_id || "").trim().toUpperCase();
      const order = ORDERS.find((o) => o.id === orderId);
      if (!order) {
        return { tool: toolName, success: false, error: `Order ${orderId} not found` };
      }
      return {
        tool: toolName,
        success: true,
        result: {
          order_id: order.id,
          customer_id: order.customer_id,
          customer_name: order.customer_name,
          restaurant_name: order.restaurant_name,
          items: order.items,
          total_amount: `₹${order.total_amount}`,
          status: order.status,
          payment_status: order.payment_status,
          delivery_address: order.delivery_address,
          created_at: order.created_at,
        },
      };
    }

    case "cancel_order": {
      const orderId = String(args.order_id || "").trim().toUpperCase();
      const callerCustomerId = args.customer_id || requestingCustomerId;
      const order = ORDERS.find((o) => o.id === orderId);

      if (!order) {
        return { tool: toolName, success: false, error: `Order ${orderId} not found` };
      }

      // SECURITY ENFORCEMENT: Customer Authorization Barrier
      if (callerCustomerId && order.customer_id !== callerCustomerId) {
        return {
          tool: toolName,
          success: false,
          error: `AUTHORIZATION_DENIED: Customer ${callerCustomerId} is not authorized to cancel order ${orderId} belonging to ${order.customer_id}`,
        };
      }

      if (order.status === "OUT_FOR_DELIVERY" || order.status === "DELIVERED") {
        return {
          tool: toolName,
          success: false,
          error: `Order ${orderId} is currently ${order.status} and cannot be cancelled automatically. Please contact support.`,
        };
      }

      // Successful cancellation
      order.status = "CANCELLED";
      order.payment_status = "REFUNDED";
      order.updated_at = new Date().toISOString();

      return {
        tool: toolName,
        success: true,
        result: {
          order_id: order.id,
          status: "CANCELLED",
          refund_status: "REFUNDED",
          refund_amount: `₹${order.total_amount}`,
          message: `Order ${orderId} has been successfully cancelled and 100% refund of ₹${order.total_amount} has been initiated.`,
        },
      };
    }

    case "search_restaurants": {
      const query = String(args.query || "").toLowerCase();
      const location = String(args.location || "").toLowerCase();

      const matches = RESTAURANTS.filter((r) => {
        const matchesQuery =
          !query ||
          r.name.toLowerCase().includes(query) ||
          r.cuisine.some((c) => c.toLowerCase().includes(query)) ||
          r.menu.some((m) => m.name.toLowerCase().includes(query));
        const matchesLocation = !location || r.location.toLowerCase().includes(location);
        return matchesQuery && matchesLocation;
      });

      return {
        tool: toolName,
        success: true,
        result: {
          total: matches.length,
          restaurants: matches.map((r) => ({
            id: r.id,
            name: r.name,
            cuisine: r.cuisine.join(", "),
            rating: r.rating,
            eta: `${r.eta_mins} mins`,
            location: r.location,
          })),
        },
      };
    }

    case "get_restaurant_menu": {
      const restId = String(args.restaurant_id || "").trim();
      const rest = RESTAURANTS.find(
        (r) => r.id.toLowerCase() === restId.toLowerCase() || r.name.toLowerCase() === restId.toLowerCase()
      );
      if (!rest) {
        return { tool: toolName, success: false, error: `Restaurant ${restId} not found` };
      }
      return {
        tool: toolName,
        success: true,
        result: {
          restaurant_id: rest.id,
          name: rest.name,
          cuisine: rest.cuisine,
          menu: rest.menu.map((m) => ({
            item: m.name,
            price: `₹${m.price}`,
            veg: m.is_veg,
            description: m.description,
          })),
        },
      };
    }

    case "get_payment_status": {
      const orderId = String(args.order_id || "").trim().toUpperCase();
      const order = ORDERS.find((o) => o.id === orderId);
      if (!order) {
        return { tool: toolName, success: false, error: `Order ${orderId} not found` };
      }
      return {
        tool: toolName,
        success: true,
        result: {
          order_id: order.id,
          payment_status: order.payment_status,
          payment_method: order.payment_method,
          total_amount: `₹${order.total_amount}`,
          // Masked payment instrument (Strict DLP compliance)
          card_last4: order.payment_method === "CREDIT_CARD" ? "****-****-****-4242" : undefined,
          upi_id: order.payment_method === "UPI" ? `${order.customer_id}@okhdfcbank` : undefined,
        },
      };
    }

    default:
      return { tool: toolName, success: false, error: `Unsupported tool: ${toolName}` };
  }
}
