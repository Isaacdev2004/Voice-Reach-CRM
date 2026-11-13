export function managedSetupAllowed(owner: string, env: NodeJS.ProcessEnv = process.env) {
  return !!owner && env.MANAGED_MESSAGING_SETUP_ENABLED === "true" &&
    (env.MANAGED_MESSAGING_SETUP_OWNER_IDS ?? "").split(",").map(x => x.trim()).filter(Boolean).includes(owner);
}
