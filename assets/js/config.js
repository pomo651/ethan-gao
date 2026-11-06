// Site settings. Edit here, nothing else needs to change.
window.SITE_CONFIG = {
  channelUrl: "https://www.youtube.com/@eethangaoo",

  // Supabase (family-fridge project) for kit orders, traffic stats (schema site) and the /game
  // "you beat X%" stats (schema coin_game). See supabase/migrations/. The publishable key is public by design.
  // Empty = nothing is saved: the checkout still runs, and the game shows only the player's own tries.
  supabase: { url: "https://yvzsdncrpccxqbswemnt.supabase.co", anonKey: "sb_publishable_Rn8_9zPggfMFJJMdPb32xA_ou4L5cGn" }
};
