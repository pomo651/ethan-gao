// Site settings. Edit here, nothing else needs to change.
window.SITE_CONFIG = {
  channelUrl: "https://www.youtube.com/@eethangaoo",

  // Where kit orders (name + email) are sent. Any endpoint that accepts a JSON POST works,
  // e.g. a Formspree form URL ("https://formspree.io/f/xxxxxxx").
  // Empty = orders are NOT saved anywhere; the checkout still runs end to end.
  orderEndpoint: "",

  // Shared stats for /game ("you beat X% of players"). Lives in the family-fridge Supabase project,
  // schema coin_game (see supabase/migrations/). The publishable key is public by design.
  // Empty = each player only sees their own tries and wins.
  gameStats: { url: "https://yvzsdncrpccxqbswemnt.supabase.co", anonKey: "sb_publishable_Rn8_9zPggfMFJJMdPb32xA_ou4L5cGn" }
};
