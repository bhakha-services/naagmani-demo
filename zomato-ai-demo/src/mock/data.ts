export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: "standard" | "gold" | "prime";
  city: string;
  // B2B Partner / Service Token provisioned fields
  member_id?: string;
  api_key?: string;
  key_id?: string;
  key_prefix?: string;
  masked_identifier?: string;
  monthly_budget_usd?: number;
  requests_per_minute?: number;
  allowed_models?: string[];
  status?: "active" | "revoked";
  provisioned_at?: string;
  provisioned_by_service_token?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  is_veg: boolean;
  description: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string[];
  location: string;
  rating: number;
  eta_mins: number;
  menu: MenuItem[];
}

export type OrderStatus =
  | "PLACED"
  | "CONFIRMED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  restaurant_id: string;
  restaurant_name: string;
  items: OrderItem[];
  total_amount: number;
  status: OrderStatus;
  eta_minutes: number;
  delivery_partner?: {
    name: string;
    phone: string;
    vehicle_number: string;
  };
  payment_status: "SUCCESS" | "PENDING" | "REFUNDED" | "FAILED";
  payment_method: "UPI" | "CREDIT_CARD" | "CASH_ON_DELIVERY";
  created_at: string;
  updated_at: string;
  delivery_address: string;
}

export interface SupportPolicy {
  topic: string;
  title: string;
  content: string;
  conditions: string[];
}

// ----------------------------------------------------------------------
// 1. Five Customers
// ----------------------------------------------------------------------
export const CUSTOMERS: Customer[] = [
  {
    id: "cust_1001",
    name: "Rahul Sharma",
    email: "rahul.sharma@example.com",
    phone: "+91-9876543210",
    tier: "prime",
    city: "Bangalore",
  },
  {
    id: "cust_1002",
    name: "Priya Patel",
    email: "priya.patel@example.com",
    phone: "+91-9876543211",
    tier: "gold",
    city: "Mumbai",
  },
  {
    id: "cust_1003",
    name: "Amit Verma",
    email: "amit.verma@example.com",
    phone: "+91-9876543212",
    tier: "standard",
    city: "Delhi",
  },
  {
    id: "cust_1004",
    name: "Sneha Reddy",
    email: "sneha.reddy@example.com",
    phone: "+91-9876543213",
    tier: "gold",
    city: "Hyderabad",
  },
  {
    id: "cust_1005",
    name: "Vikram Malhotra",
    email: "vikram.malhotra@example.com",
    phone: "+91-9876543214",
    tier: "standard",
    city: "Pune",
  },
];

// ----------------------------------------------------------------------
// 2. Ten Restaurants
// ----------------------------------------------------------------------
export const RESTAURANTS: Restaurant[] = [
  {
    id: "rest_1",
    name: "Pizza Palace",
    cuisine: ["Italian", "Pizza", "Fast Food"],
    location: "Indiranagar, Bangalore",
    rating: 4.6,
    eta_mins: 25,
    menu: [
      { id: "m_1", name: "Margherita Pizza", price: 349, is_veg: true, description: "Classic cheese with basil" },
      { id: "m_2", name: "Farmhouse Deluxe", price: 449, is_veg: true, description: "Loaded veggies & mozzarella" },
      { id: "m_3", name: "Garlic Breadsticks", price: 149, is_veg: true, description: "Baked with herbs & butter" },
    ],
  },
  {
    id: "rest_2",
    name: "Biryani Blues",
    cuisine: ["Hyderabadi", "Mughlai", "Biryani"],
    location: "Koramangala, Bangalore",
    rating: 4.7,
    eta_mins: 35,
    menu: [
      { id: "m_4", name: "Dum Chicken Biryani", price: 399, is_veg: false, description: "Slow-cooked saffron rice" },
      { id: "m_5", name: "Paneer Nawabi Biryani", price: 349, is_veg: true, description: "Cottage cheese aromatic biryani" },
      { id: "m_6", name: "Mirchi Ka Salan", price: 99, is_veg: true, description: "Spicy peanut & chili curry" },
    ],
  },
  {
    id: "rest_3",
    name: "Burger King",
    cuisine: ["American", "Burgers", "Fast Food"],
    location: "HSR Layout, Bangalore",
    rating: 4.3,
    eta_mins: 20,
    menu: [
      { id: "m_7", name: "Whopper Veg", price: 199, is_veg: true, description: "Flame-grilled signature burger" },
      { id: "m_8", name: "Crispy Chicken Meal", price: 299, is_veg: false, description: "Burger + fries + drink" },
      { id: "m_9", name: "Peri Peri Fries", price: 119, is_veg: true, description: "Fries with piquant peri spice" },
    ],
  },
  {
    id: "rest_4",
    name: "Dosa Junction",
    cuisine: ["South Indian", "Breakfast"],
    location: "Jayanagar, Bangalore",
    rating: 4.8,
    eta_mins: 15,
    menu: [
      { id: "m_10", name: "Ghee Roast Masala Dosa", price: 120, is_veg: true, description: "Crisp crepe with potato masala" },
      { id: "m_11", name: "Idli Vada Combo", price: 90, is_veg: true, description: "Steamed rice cakes & lentil fritters" },
      { id: "m_12", name: "Filter Coffee", price: 45, is_veg: true, description: "Traditional decoction brew" },
    ],
  },
  {
    id: "rest_5",
    name: "Tokyo Sushi Bar",
    cuisine: ["Japanese", "Asian"],
    location: "MG Road, Bangalore",
    rating: 4.5,
    eta_mins: 40,
    menu: [
      { id: "m_13", name: "Salmon Nigiri (4pcs)", price: 549, is_veg: false, description: "Fresh Atlantic salmon" },
      { id: "m_14", name: "Avocado Cucumber Roll", price: 399, is_veg: true, description: "Seaweed wrapped sushi" },
      { id: "m_15", name: "Miso Soup", price: 149, is_veg: true, description: "Traditional dashi soy broth" },
    ],
  },
  {
    id: "rest_6",
    name: "Taco Fiesta",
    cuisine: ["Mexican", "Tex-Mex"],
    location: "Whitefield, Bangalore",
    rating: 4.2,
    eta_mins: 30,
    menu: [
      { id: "m_16", name: "Loaded Nachos", price: 249, is_veg: true, description: "Jalapenos, queso & salsa" },
      { id: "m_17", name: "Grilled Burrito Bowl", price: 329, is_veg: true, description: "Beans, corn, cilantro rice" },
    ],
  },
  {
    id: "rest_7",
    name: "Wok Express",
    cuisine: ["Chinese", "Thai", "Asian"],
    location: "Marathahalli, Bangalore",
    rating: 4.4,
    eta_mins: 25,
    menu: [
      { id: "m_18", name: "Hakka Noodles", price: 219, is_veg: true, description: "Wok-tossed noodles with veggies" },
      { id: "m_19", name: "Kung Pao Chicken", price: 349, is_veg: false, description: "Spicy chicken with peanuts" },
    ],
  },
  {
    id: "rest_8",
    name: "Sweet Tooth Bakery",
    cuisine: ["Desserts", "Bakery"],
    location: "Bellandur, Bangalore",
    rating: 4.9,
    eta_mins: 20,
    menu: [
      { id: "m_20", name: "Belgian Chocolate Truffle", price: 189, is_veg: true, description: "Rich chocolate ganache slice" },
      { id: "m_21", name: "Red Velvet Jar", price: 159, is_veg: true, description: "Cream cheese layered cake" },
    ],
  },
  {
    id: "rest_9",
    name: "Pasta Fresca",
    cuisine: ["Italian", "Continental"],
    location: "Lavelle Road, Bangalore",
    rating: 4.7,
    eta_mins: 35,
    menu: [
      { id: "m_22", name: "Penne Alfredo", price: 389, is_veg: true, description: "Creamy parmesan white sauce" },
      { id: "m_23", name: "Spaghetti Bolognese", price: 459, is_veg: false, description: "Minced lamb ragout" },
    ],
  },
  {
    id: "rest_10",
    name: "Punjab Grill",
    cuisine: ["North Indian", "Tandoori"],
    location: "Electronic City, Bangalore",
    rating: 4.5,
    eta_mins: 30,
    menu: [
      { id: "m_24", name: "Butter Chicken", price: 429, is_veg: false, description: "Tandoori chicken in tomato cream" },
      { id: "m_25", name: "Dal Makhani", price: 299, is_veg: true, description: "Slow-simmered black lentils" },
      { id: "m_26", name: "Garlic Butter Naan", price: 65, is_veg: true, description: "Clay-oven baked flatbread" },
    ],
  },
];

// ----------------------------------------------------------------------
// 3. Twenty Orders
// ----------------------------------------------------------------------
export const ORDERS: Order[] = [
  {
    id: "ORD-1001",
    customer_id: "cust_1001",
    customer_name: "Rahul Sharma",
    restaurant_id: "rest_1",
    restaurant_name: "Pizza Palace",
    items: [
      { name: "Margherita Pizza", quantity: 1, price: 349 },
      { name: "Garlic Breadsticks", quantity: 1, price: 149 },
    ],
    total_amount: 498,
    status: "OUT_FOR_DELIVERY",
    eta_minutes: 15,
    delivery_partner: {
      name: "Ramesh Kumar",
      phone: "+91-9876500001",
      vehicle_number: "KA-01-EQ-4050",
    },
    payment_status: "SUCCESS",
    payment_method: "UPI",
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    delivery_address: "Flat 402, Green View Apts, Indiranagar, Bangalore",
  },
  {
    id: "ORD-1002",
    customer_id: "cust_1001",
    customer_name: "Rahul Sharma",
    restaurant_id: "rest_2",
    restaurant_name: "Biryani Blues",
    items: [
      { name: "Dum Chicken Biryani", quantity: 2, price: 399 },
    ],
    total_amount: 798,
    status: "DELIVERED",
    eta_minutes: 0,
    delivery_partner: {
      name: "Sunil Gowda",
      phone: "+91-9876500002",
      vehicle_number: "KA-03-AB-1234",
    },
    payment_status: "SUCCESS",
    payment_method: "CREDIT_CARD",
    created_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 140 * 60 * 1000).toISOString(),
    delivery_address: "Flat 402, Green View Apts, Indiranagar, Bangalore",
  },
  {
    id: "ORD-1003",
    customer_id: "cust_1001",
    customer_name: "Rahul Sharma",
    restaurant_id: "rest_3",
    restaurant_name: "Burger King",
    items: [
      { name: "Whopper Veg", quantity: 1, price: 199 },
      { name: "Peri Peri Fries", quantity: 1, price: 119 },
    ],
    total_amount: 318,
    status: "PLACED",
    eta_minutes: 30,
    payment_status: "SUCCESS",
    payment_method: "UPI",
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    delivery_address: "Flat 402, Green View Apts, Indiranagar, Bangalore",
  },
  {
    id: "ORD-1004",
    customer_id: "cust_1002",
    customer_name: "Priya Patel",
    restaurant_id: "rest_5",
    restaurant_name: "Tokyo Sushi Bar",
    items: [
      { name: "Salmon Nigiri (4pcs)", quantity: 1, price: 549 },
      { name: "Miso Soup", quantity: 1, price: 149 },
    ],
    total_amount: 698,
    status: "PREPARING",
    eta_minutes: 25,
    payment_status: "SUCCESS",
    payment_method: "CREDIT_CARD",
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    delivery_address: "12B Sea Face View, Bandra West, Mumbai",
  },
  {
    id: "ORD-1005",
    customer_id: "cust_1002",
    customer_name: "Priya Patel",
    restaurant_id: "rest_8",
    restaurant_name: "Sweet Tooth Bakery",
    items: [
      { name: "Belgian Chocolate Truffle", quantity: 2, price: 189 },
    ],
    total_amount: 378,
    status: "CANCELLED",
    eta_minutes: 0,
    payment_status: "REFUNDED",
    payment_method: "UPI",
    created_at: new Date(Date.now() - 300 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 290 * 60 * 1000).toISOString(),
    delivery_address: "12B Sea Face View, Bandra West, Mumbai",
  },
  {
    id: "ORD-1006",
    customer_id: "cust_1003",
    customer_name: "Amit Verma",
    restaurant_id: "rest_10",
    restaurant_name: "Punjab Grill",
    items: [
      { name: "Butter Chicken", quantity: 1, price: 429 },
      { name: "Garlic Butter Naan", quantity: 3, price: 65 },
    ],
    total_amount: 624,
    status: "CONFIRMED",
    eta_minutes: 35,
    payment_status: "SUCCESS",
    payment_method: "UPI",
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    delivery_address: "House 54, Sector 15, Rohini, Delhi",
  },
  {
    id: "ORD-1007",
    customer_id: "cust_1003",
    customer_name: "Amit Verma",
    restaurant_id: "rest_4",
    restaurant_name: "Dosa Junction",
    items: [
      { name: "Ghee Roast Masala Dosa", quantity: 2, price: 120 },
      { name: "Filter Coffee", quantity: 2, price: 45 },
    ],
    total_amount: 330,
    status: "DELIVERED",
    eta_minutes: 0,
    payment_status: "SUCCESS",
    payment_method: "CASH_ON_DELIVERY",
    created_at: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 210 * 60 * 1000).toISOString(),
    delivery_address: "House 54, Sector 15, Rohini, Delhi",
  },
  {
    id: "ORD-1008",
    customer_id: "cust_1004",
    customer_name: "Sneha Reddy",
    restaurant_id: "rest_2",
    restaurant_name: "Biryani Blues",
    items: [
      { name: "Paneer Nawabi Biryani", quantity: 1, price: 349 },
      { name: "Mirchi Ka Salan", quantity: 1, price: 99 },
    ],
    total_amount: 448,
    status: "OUT_FOR_DELIVERY",
    eta_minutes: 10,
    delivery_partner: {
      name: "Mohammad Ali",
      phone: "+91-9876500003",
      vehicle_number: "TS-09-CD-5678",
    },
    payment_status: "SUCCESS",
    payment_method: "UPI",
    created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    delivery_address: "Plot 88, Jubilee Hills, Hyderabad",
  },
  {
    id: "ORD-1009",
    customer_id: "cust_1004",
    customer_name: "Sneha Reddy",
    restaurant_id: "rest_6",
    restaurant_name: "Taco Fiesta",
    items: [
      { name: "Loaded Nachos", quantity: 1, price: 249 },
    ],
    total_amount: 249,
    status: "DELIVERED",
    eta_minutes: 0,
    payment_status: "SUCCESS",
    payment_method: "CREDIT_CARD",
    created_at: new Date(Date.now() - 480 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 440 * 60 * 1000).toISOString(),
    delivery_address: "Plot 88, Jubilee Hills, Hyderabad",
  },
  {
    id: "ORD-1010",
    customer_id: "cust_1005",
    customer_name: "Vikram Malhotra",
    restaurant_id: "rest_7",
    restaurant_name: "Wok Express",
    items: [
      { name: "Hakka Noodles", quantity: 1, price: 219 },
      { name: "Kung Pao Chicken", quantity: 1, price: 349 },
    ],
    total_amount: 568,
    status: "PREPARING",
    eta_minutes: 20,
    payment_status: "SUCCESS",
    payment_method: "UPI",
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    delivery_address: "Tower 2, Kothrud Woods, Pune",
  },
  {
    id: "ORD-1011",
    customer_id: "cust_1001",
    customer_name: "Rahul Sharma",
    restaurant_id: "rest_9",
    restaurant_name: "Pasta Fresca",
    items: [
      { name: "Penne Alfredo", quantity: 1, price: 389 },
    ],
    total_amount: 389,
    status: "DELIVERED",
    eta_minutes: 0,
    payment_status: "SUCCESS",
    payment_method: "UPI",
    created_at: new Date(Date.now() - 720 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 680 * 60 * 1000).toISOString(),
    delivery_address: "Flat 402, Green View Apts, Indiranagar, Bangalore",
  },
  {
    id: "ORD-1012",
    customer_id: "cust_1002",
    customer_name: "Priya Patel",
    restaurant_id: "rest_1",
    restaurant_name: "Pizza Palace",
    items: [
      { name: "Farmhouse Deluxe", quantity: 1, price: 449 },
    ],
    total_amount: 449,
    status: "PLACED",
    eta_minutes: 35,
    payment_status: "SUCCESS",
    payment_method: "CREDIT_CARD",
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    delivery_address: "12B Sea Face View, Bandra West, Mumbai",
  },
  {
    id: "ORD-1013",
    customer_id: "cust_1003",
    customer_name: "Amit Verma",
    restaurant_id: "rest_3",
    restaurant_name: "Burger King",
    items: [
      { name: "Crispy Chicken Meal", quantity: 1, price: 299 },
    ],
    total_amount: 299,
    status: "OUT_FOR_DELIVERY",
    eta_minutes: 18,
    delivery_partner: {
      name: "Deepak Saini",
      phone: "+91-9876500004",
      vehicle_number: "DL-04-GH-9012",
    },
    payment_status: "SUCCESS",
    payment_method: "UPI",
    created_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    delivery_address: "House 54, Sector 15, Rohini, Delhi",
  },
  {
    id: "ORD-1014",
    customer_id: "cust_1004",
    customer_name: "Sneha Reddy",
    restaurant_id: "rest_8",
    restaurant_name: "Sweet Tooth Bakery",
    items: [
      { name: "Red Velvet Jar", quantity: 2, price: 159 },
    ],
    total_amount: 318,
    status: "CONFIRMED",
    eta_minutes: 25,
    payment_status: "SUCCESS",
    payment_method: "UPI",
    created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    delivery_address: "Plot 88, Jubilee Hills, Hyderabad",
  },
  {
    id: "ORD-1015",
    customer_id: "cust_1005",
    customer_name: "Vikram Malhotra",
    restaurant_id: "rest_4",
    restaurant_name: "Dosa Junction",
    items: [
      { name: "Ghee Roast Masala Dosa", quantity: 1, price: 120 },
      { name: "Idli Vada Combo", quantity: 1, price: 90 },
    ],
    total_amount: 210,
    status: "DELIVERED",
    eta_minutes: 0,
    payment_status: "SUCCESS",
    payment_method: "UPI",
    created_at: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 330 * 60 * 1000).toISOString(),
    delivery_address: "Tower 2, Kothrud Woods, Pune",
  },
  {
    id: "ORD-1016",
    customer_id: "cust_1001",
    customer_name: "Rahul Sharma",
    restaurant_id: "rest_10",
    restaurant_name: "Punjab Grill",
    items: [
      { name: "Dal Makhani", quantity: 1, price: 299 },
      { name: "Garlic Butter Naan", quantity: 2, price: 65 },
    ],
    total_amount: 429,
    status: "PREPARING",
    eta_minutes: 22,
    payment_status: "SUCCESS",
    payment_method: "UPI",
    created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    delivery_address: "Flat 402, Green View Apts, Indiranagar, Bangalore",
  },
  {
    id: "ORD-1017",
    customer_id: "cust_1002",
    customer_name: "Priya Patel",
    restaurant_id: "rest_7",
    restaurant_name: "Wok Express",
    items: [
      { name: "Hakka Noodles", quantity: 2, price: 219 },
    ],
    total_amount: 438,
    status: "OUT_FOR_DELIVERY",
    eta_minutes: 12,
    delivery_partner: {
      name: "Ganesh Shinde",
      phone: "+91-9876500005",
      vehicle_number: "MH-02-JK-3456",
    },
    payment_status: "SUCCESS",
    payment_method: "UPI",
    created_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    delivery_address: "12B Sea Face View, Bandra West, Mumbai",
  },
  {
    id: "ORD-1018",
    customer_id: "cust_1003",
    customer_name: "Amit Verma",
    restaurant_id: "rest_9",
    restaurant_name: "Pasta Fresca",
    items: [
      { name: "Spaghetti Bolognese", quantity: 1, price: 459 },
    ],
    total_amount: 459,
    status: "CANCELLED",
    eta_minutes: 0,
    payment_status: "REFUNDED",
    payment_method: "UPI",
    created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    delivery_address: "House 54, Sector 15, Rohini, Delhi",
  },
  {
    id: "ORD-1019",
    customer_id: "cust_1004",
    customer_name: "Sneha Reddy",
    restaurant_id: "rest_1",
    restaurant_name: "Pizza Palace",
    items: [
      { name: "Margherita Pizza", quantity: 2, price: 349 },
    ],
    total_amount: 698,
    status: "DELIVERED",
    eta_minutes: 0,
    payment_status: "SUCCESS",
    payment_method: "UPI",
    created_at: new Date(Date.now() - 600 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 565 * 60 * 1000).toISOString(),
    delivery_address: "Plot 88, Jubilee Hills, Hyderabad",
  },
  {
    id: "ORD-1020",
    customer_id: "cust_1005",
    customer_name: "Vikram Malhotra",
    restaurant_id: "rest_2",
    restaurant_name: "Biryani Blues",
    items: [
      { name: "Dum Chicken Biryani", quantity: 1, price: 399 },
    ],
    total_amount: 399,
    status: "OUT_FOR_DELIVERY",
    eta_minutes: 16,
    delivery_partner: {
      name: "Santosh Patil",
      phone: "+91-9876500006",
      vehicle_number: "MH-12-LM-7890",
    },
    payment_status: "SUCCESS",
    payment_method: "UPI",
    created_at: new Date(Date.now() - 36 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    delivery_address: "Tower 2, Kothrud Woods, Pune",
  },
];

// ----------------------------------------------------------------------
// 4. Support Policies (RAG Knowledge Base)
// ----------------------------------------------------------------------
export const SUPPORT_POLICIES: SupportPolicy[] = [
  {
    topic: "cancellation",
    title: "Order Cancellation Policy",
    content:
      "Customers can cancel their food order within 60 seconds of placing it for a 100% full refund with zero fees. Once the restaurant marks the order as PREPARING, cancellations incur a 100% food preparation fee unless approved by customer support due to severe restaurant delays. If the order is PLACED or CONFIRMED, cancellation is free.",
    conditions: [
      "Cancellation within 60 seconds: 100% automatic refund",
      "Order in PLACED or CONFIRMED state: 100% refund",
      "Order in PREPARING state: Non-refundable unless restaurant delay exceeds 30 minutes",
      "Order in OUT_FOR_DELIVERY: Cannot be cancelled",
    ],
  },
  {
    topic: "refund",
    title: "Refund & Compensation Policy",
    content:
      "Refunds are processed instantly for UPI payments and within 3-5 banking days for Credit Cards. Full refunds are granted for wrong items delivered, missing orders, or spoiled food with photo evidence. Partial refunds or Zomato credits are issued for minor item omissions.",
    conditions: [
      "Wrong or missing items: Full item refund within 2 hours",
      "Order not delivered: 100% full refund to original payment source",
      "UPI refunds: Settled within 2 hours",
      "Card refunds: 3-5 business days",
    ],
  },
  {
    topic: "late_delivery",
    title: "Late Delivery & Delay Policy",
    content:
      "If delivery exceeds the promised estimated time of arrival (ETA) by more than 20 minutes due to delivery partner or kitchen delay, the customer is eligible for an automatic ₹100 Zomato On-Time Guarantee credit voucher or a 50% refund upon request. If delay exceeds 45 minutes, customer can cancel the order for a 100% refund.",
    conditions: [
      "Delay 20–44 minutes past ETA: ₹100 Zomato On-Time credit or 50% refund",
      "Delay 45+ minutes past ETA: Right to cancel with 100% full refund",
      "Severe weather / force majeure: ETA adjusted dynamically, credit given on case-by-case basis",
    ],
  },
  {
    topic: "payment_failure",
    title: "Payment Failure & Double Deduction Policy",
    content:
      "In case money is deducted from the customer's bank account but the order is not placed or marked as FAILED, the banking gateway automatically reverses the transaction within 24 to 48 hours. Customers can check payment status using their transaction ID.",
    conditions: [
      "Debited but order failed: Auto-reversal in 24-48 hours",
      "Duplicate charge: Instant credit or refund within 2 business days",
    ],
  },
  {
    topic: "data_privacy",
    title: "Customer Privacy & Sensitive Data Policy",
    content:
      "Zomato strictly adheres to PCI-DSS and Enterprise DLP standards. Complete credit card numbers, CVVs, and banking passwords are never stored or displayed in chat, invoices, or agent logs. Only the last 4 digits of payment instruments are shown.",
    conditions: [
      "Full credit card numbers: Strictly forbidden and masked",
      "CVVs: Never stored under any circumstances",
      "Customer phone numbers: Masked via virtual number proxy for delivery partners",
    ],
  },
];

// ----------------------------------------------------------------------
// Dynamic Customer & Order Management for Demo and Provisioning
// ----------------------------------------------------------------------
const INITIAL_CUSTOMERS_COPY: Customer[] = JSON.parse(JSON.stringify(CUSTOMERS));
const INITIAL_ORDERS_COPY: Order[] = JSON.parse(JSON.stringify(ORDERS));

export function getAllCustomers(): Customer[] {
  return CUSTOMERS;
}

export function getCustomer(id: string): Customer | undefined {
  return CUSTOMERS.find((c) => c.id === id || c.member_id === id);
}

export function addCustomer(customer: Customer): Customer {
  const existingIdx = CUSTOMERS.findIndex((c) => c.id === customer.id);
  if (existingIdx !== -1) {
    CUSTOMERS[existingIdx] = { ...CUSTOMERS[existingIdx], ...customer };
    return CUSTOMERS[existingIdx];
  }
  CUSTOMERS.push(customer);
  return customer;
}

export function updateCustomer(id: string, updates: Partial<Customer>): Customer | undefined {
  const customer = CUSTOMERS.find((c) => c.id === id || c.member_id === id);
  if (!customer) return undefined;
  Object.assign(customer, updates);
  return customer;
}

export function createWelcomeOrder(customer: Customer): Order {
  const orderNum = 1000 + ORDERS.length + 1;
  const newOrderId = `ORD-${orderNum}`;
  const now = new Date();
  const rest = RESTAURANTS[0];

  const welcomeOrder: Order = {
    id: newOrderId,
    customer_id: customer.id,
    customer_name: customer.name,
    restaurant_id: rest.id,
    restaurant_name: rest.name,
    items: [
      { name: "Farmhouse Deluxe", quantity: 1, price: 449 },
      { name: "Garlic Breadsticks", quantity: 1, price: 149 },
    ],
    total_amount: 598,
    status: "OUT_FOR_DELIVERY",
    eta_minutes: 20,
    delivery_partner: {
      name: "Suresh Patil",
      phone: "+91-9876599112",
      vehicle_number: "KA-05-AB-7890",
    },
    payment_status: "SUCCESS",
    payment_method: "UPI",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    delivery_address: `${customer.city || "Bengaluru"}, Near Central Park`,
  };

  ORDERS.unshift(welcomeOrder);
  return welcomeOrder;
}

export function resetCustomers(): void {
  CUSTOMERS.length = 0;
  CUSTOMERS.push(...JSON.parse(JSON.stringify(INITIAL_CUSTOMERS_COPY)));
}

export function resetOrders(): void {
  ORDERS.length = 0;
  ORDERS.push(...JSON.parse(JSON.stringify(INITIAL_ORDERS_COPY)));
}
