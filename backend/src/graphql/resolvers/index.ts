import { DateTimeResolver, JSONResolver } from "graphql-scalars";
import { productResolvers } from "./product.js";
import { vendorResolvers } from "./vendor.js";
import { cartResolvers } from "./cart.js";
import { orderResolvers } from "./order.js";
import { couponResolvers } from "./coupon.js";

const DecimalResolver = {
  serialize: (value: any) => parseFloat(value),
  parseValue: (value: any) => parseFloat(value),
  parseLiteral: (ast: any) => parseFloat(ast.value),
};

export const resolvers = {
  DateTime: DateTimeResolver,
  JSON: JSONResolver,
  Decimal: DecimalResolver,

  Query: {
    _health: () => "CartPlex API is running",
    ...vendorResolvers.Query,
    ...productResolvers.Query,
    ...cartResolvers.Query,
    ...orderResolvers.Query,
    ...couponResolvers.Query,
  },

  Mutation: {
    ...vendorResolvers.Mutation,
    ...productResolvers.Mutation,
    ...cartResolvers.Mutation,
    ...orderResolvers.Mutation,
    ...couponResolvers.Mutation,
  },

  Product: productResolvers.Product,
  ProductVariant: productResolvers.ProductVariant,
  Vendor: vendorResolvers.Vendor,
  User: vendorResolvers.User,
  Order: orderResolvers.Order,
  OrderItem: orderResolvers.OrderItem,
  Payout: orderResolvers.Payout,
};
