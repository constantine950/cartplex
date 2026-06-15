import { DateTimeResolver, JSONResolver } from "graphql-scalars";
import { productResolvers } from "./product.js";
import { vendorResolvers } from "./vendor.js";

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
  },

  Mutation: {
    ...vendorResolvers.Mutation,
    ...productResolvers.Mutation,
  },

  Product: productResolvers.Product,
  ProductVariant: productResolvers.ProductVariant,
  Vendor: vendorResolvers.Vendor,
  User: vendorResolvers.User,
};
