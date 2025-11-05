// functions/latest-posts.js
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const delay = ms => new Promise(res => setTimeout(res, ms));

exports.handler = async (event) => {
  const limit = parseInt(event.queryStringParameters?.limit) || 5;
  const baseUrl = 'https://mrboost.lk/blog';

  try {
    const res = await fetch(baseUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) throw new Error('Failed to fetch blog');

    const $ = cheerio.load(await res.text());
    const posts = [];
    const seenLinks = new Set();

    // Find all post containers (h2/h3 with <a>)
    $('h2 a, h3 a').each(async (i, a) => {
      if (posts.length >= limit) return;

      const link = new URL($(a).attr('href') || '', baseUrl).href;
      if (seenLinks.has(link)) return;
      seenLinks.add(link);

      const title = $(a).text().trim();
      if (!title || title.length < 10) return;

      // Get parent container for excerpt
      const container = $(a).closest('article, .post, .entry, div');
      let excerpt = '';
      const p = container.find('p').first();
      if (p.length) {
        excerpt = p.text().trim();
        if (excerpt.length > 300) excerpt = excerpt.substring(0, 300) + '...';
      }

      // Visit post page for image
      let imageUrl = '';
      try {
        await delay(800); // Rate limit
        const postRes = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const post$ = cheerio.load(await postRes.text());

        // 1. og:image
        const og = post$('meta[property="og:image"]');
        if (og.length && og.attr('content')) {
          imageUrl = og.attr('content');
        } else {
          // 2. First <img> in content
          const img = post$('img').first();
          if (img.length && img.attr('src')) {
            imageUrl = new URL(img.attr('src'), link).href;
          }
        }
      } catch (e) {
        console.error(`Image fetch failed for ${link}: ${e.message}`);
      }

      posts.push({
        title,
        image_url: imageUrl,
        link,
        excerpt: excerpt || "No excerpt available"
      });
    });

    // Wait for all async image fetches (simulate with Promise.all if needed)
    // For simplicity, we'll run sequentially in loop above

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: true,
        creator: "Chathura hansaka",
        posts
      }, null, 2)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: false,
        creator: "Chathura hansaka",
        error: error.message,
        posts: []
      }, null, 2)
    };
  }
};
