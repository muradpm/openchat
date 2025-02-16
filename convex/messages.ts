import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const deleteTrailingMessages = mutation({
  args: { messageId: v.string() },
  handler: async (ctx, { messageId }) => {
    console.log("Server: Starting deletion for messageId:", messageId);

    // Get the target message first
    const message = await ctx.db
      .query("messages")
      .withIndex("by_message_id")
      .filter((q) => q.eq(q.field("id"), messageId))
      .first();

    if (!message) {
      console.error("Server: Message not found for ID:", messageId);
      throw new Error(`Message not found with id: ${messageId}`);
    }

    console.log("Server: Found message to delete:", {
      id: message.id,
      chatId: message.chatId,
      createdAt: message.createdAt,
    });

    // Get all messages after this one in the chat
    const messagesToDelete = await ctx.db
      .query("messages")
      .withIndex("by_chat")
      .filter((q) =>
        q.and(
          q.eq(q.field("chatId"), message.chatId),
          q.gte(q.field("createdAt"), message.createdAt)
        )
      )
      .collect();

    console.log("Server: Messages to delete:", messagesToDelete.length);

    // Delete votes first
    for (const msg of messagesToDelete) {
      const votes = await ctx.db
        .query("votes")
        .filter((q) =>
          q.and(
            q.eq(q.field("chatId"), message.chatId),
            q.eq(q.field("messageId"), msg.id)
          )
        )
        .collect();

      if (votes.length > 0) {
        await Promise.all(votes.map((vote) => ctx.db.delete(vote._id)));
      }
    }

    // Then delete messages
    await Promise.all(messagesToDelete.map((msg) => ctx.db.delete(msg._id)));

    return { success: true };
  },
});

export const saveMessages = mutation({
  args: {
    messages: v.array(
      v.object({
        id: v.string(),
        chatId: v.string(),
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        userId: v.id("users"),
        state: v.union(v.literal("complete"), v.literal("in_progress")),
        createdAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Check for existing messages first
    const existingMessages = await ctx.db
      .query("messages")
      .withIndex("by_message_id")
      .filter((q) => q.or(...args.messages.map((msg) => q.eq(q.field("id"), msg.id))))
      .collect();

    // Only insert messages that don't already exist
    const messagesToInsert = args.messages.filter(
      (msg) => !existingMessages.some((existing) => existing.id === msg.id)
    );

    console.log(
      "Server: Saving new messages:",
      messagesToInsert.map((m) => m.id)
    );

    if (messagesToInsert.length > 0) {
      return await Promise.all(
        messagesToInsert.map((message) => ctx.db.insert("messages", message))
      );
    }
    return [];
  },
});

export const getMessagesByChatId = query({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    console.log("Server: Fetching messages for chatId:", args.chatId);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat")
      .filter((q) => q.eq(q.field("chatId"), args.chatId))
      .order("asc")
      .collect();

    console.log(
      "Server: Found messages:",
      messages.map((m) => ({
        id: m.id,
        chatId: m.chatId,
        role: m.role,
        content: m.content.slice(0, 50) + "...",
      }))
    );

    return messages;
  },
});
