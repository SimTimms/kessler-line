// Tiny standalone ref so MessageStore can check buffer status without
// importing CommsBufferStore (which imports MessageStore → circular).

/** When false, no comms buffer is installed and incoming messages should be dropped. */
export const commsBufferInstalledRef = { current: true };
