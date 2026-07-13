const cheerio = require("cheerio-without-node-native");
const fetch = require("node-fetch");

const PROVIDER_NAME = "PikaHD";
const BASE_URL = "https://new.pikahd.co";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
};

async function fetchHtml(url) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    return cheerio.load(await res.text());
  } catch (e) {
    console.log("Fetch error:", e.message);
    return null;
  }
}

async function searchByTitle(query) {
  const url = `\( {BASE_URL}/?s= \){encodeURIComponent(query)}`;
  console.log("[PikaHD] Searching:", url);

  const $ = await fetchHtml(url);
  if (!$) return [];

  const results = [];
  $("article, .post, .entry, .movie-card").each((_, el) => {
    const $el = $(el);
    const title = $el.find("h1, h2, h3, .entry-title").first().text().trim();
    const link = $el.find("a").first().attr("href");

    if (title && link) {
      results.push({
        title: title.replace(/Download|Watch|Full/gi, "").trim(),
        link: link.startsWith("http") ? link : BASE_URL + link
      });
    }
  });

  return results;
}

async function extractLinks(pageUrl) {
  const $ = await fetchHtml(pageUrl);
  if (!$) return [];

  const streams = [];
  $('a[href*="drive.google"], a[href*=".mp4"], a[href*="cloud"], a[href*="gdrive"], a[href*="pixeldrain"]').each((_, el) => {
    let href = $(el).attr("href");
    const text = $(el).text().trim();

    if (href) {
      if (!href.startsWith("http")) href = BASE_URL + href;
      streams.push({
        name: PROVIDER_NAME,
        title: text || "PikaHD Stream",
        url: href,
        quality: "HD"
      });
    }
  });

  return streams;
}

async function handler(req) {
  const { type, id } = req.query || req;
  console.log(`[PikaHD] Request: ${type} ${id}`);

  // For testing - replace with real TMDB title fetch later
  const query = "Inception"; // Change this to real title

  const searchResults = await searchByTitle(query);
  let allStreams = [];

  for (const result of searchResults.slice(0, 3)) {
    const links = await extractLinks(result.link);
    allStreams = allStreams.concat(links);
  }

  console.log(`[PikaHD] Found ${allStreams.length} streams`);
  return { streams: allStreams };
}

const manifest = {
  id: "com.pikahd.plugin",
  name: "PikaHD",
  description: "Streams from new.pikahd.co",
  version: "1.0.0",
  resources: ["stream"],
  types: ["movie", "series"],
  catalogs: []
};

module.exports = { manifest, handler };