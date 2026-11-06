// Site settings. Edit here, nothing else needs to change.
window.SITE_CONFIG = {
  channelUrl: "https://www.youtube.com/@eethangaoo",

  // Where kit orders (name + email) are sent. Any endpoint that accepts a JSON POST works,
  // e.g. a Formspree form URL ("https://formspree.io/f/xxxxxxx").
  // Empty = orders are NOT saved anywhere; the checkout still runs end to end.
  orderEndpoint: "",

  // Shared stats for /game ("you beat X% of players"). Supabase project URL + anon (public) key.
  // Empty = each player only sees their own tries and wins.
  gameStats: { url: "", anonKey: "" }
};
