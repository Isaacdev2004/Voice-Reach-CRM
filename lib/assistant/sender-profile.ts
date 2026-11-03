import { clerkClient } from "@clerk/nextjs/server";
import { savedSettings } from "./reads";
import { AssistantFailure } from "./store";
import { resolveSenderDetails, type VerifiedSenderAccount } from "./sender-personalization";

type SenderServices = {
  settings: (owner: string) => Promise<unknown>;
  account: (owner: string) => Promise<VerifiedSenderAccount>;
};
/** Caller supplies only the requireUserId-derived owner, never a model/browser owner ID. */
export function createSenderDetailsLoader(services: SenderServices) {
  return async (owner: string) => {
    if (!owner) throw new AssistantFailure("Sign in to personalize your draft", 401);
    try {
      const [settings, account] = await Promise.all([services.settings(owner), services.account(owner)]);
      if (account.id !== owner || account.banned !== false || account.emailVerified !== true)
        throw new AssistantFailure("Verify your account before preparing personalized drafts", 403);
      return resolveSenderDetails(settings, account);
    } catch (error) {
      if (error instanceof AssistantFailure) throw error;
      throw new AssistantFailure("Your sender profile could not be verified. Retry before preparing a draft.", 503);
    }
  };
}
export const senderDetails = createSenderDetailsLoader({
  settings: savedSettings,
  account: async owner => {
    const client = await clerkClient();
    const user = await client.users.getUser(owner);
    const primary = user.emailAddresses.find(email => email.id === user.primaryEmailAddressId);
    return { id: user.id, name: [user.firstName, user.lastName].filter(Boolean).join(" "),
      emailVerified: primary?.verification?.status === "verified", banned: user.banned };
  },
});
