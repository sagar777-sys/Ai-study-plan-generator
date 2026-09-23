import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  composedByValidator,
  fuzzySummaryValidator,
  planInputsValidator,
  planWeekValidator,
} from "../lib/validators";
import { mutation, query } from "./_generated/server";

/**
 * File a freshly composed plan under the signed-in user.
 * The client passes exactly what the generate action returned.
 */
export const savePlan = mutation({
  args: {
    inputs: planInputsValidator,
    fuzzy: fuzzySummaryValidator,
    weeks: v.array(planWeekValidator),
    composedBy: composedByValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("You must be signed in to file a plan.");
    return await ctx.db.insert("plans", {
      userId,
      inputs: args.inputs,
      fuzzy: args.fuzzy,
      weeks: args.weeks,
      composedBy: args.composedBy,
      createdAt: Date.now(),
    });
  },
});

/** The signed-in user's filed plans, newest first. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(24);
  },
});

/** Remove a filed plan; only its owner may delete it. */
export const remove = mutation({
  args: { id: v.id("plans") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    const plan = await ctx.db.get(id);
    if (userId === null || plan === null || plan.userId !== userId) {
      throw new Error("This plan could not be found.");
    }
    await ctx.db.delete(id);
  },
});
