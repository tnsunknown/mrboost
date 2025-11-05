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
    if (!res.ok) throw new Error(`Failed to fetch blog: ${res.status}`);

    const $ = cheerio.load(await res.text());
    const postPromises = [];

    // Collect all post links first
    const links = new Set();
    $('h2 a, h3 a').each((i, a) => {
      if (links.size >= limit) return;
      const href = $(a).attr('href');
      if (href) {
        const fullLink = new URL(href, baseUrl).href;
        if (!links.has(fullLink)) {
          links.add(fullLink);
          postPromises.push({ link: fullLink, title: $(a).text().trim() });
        }
      }
    });

    // Scrape each post in parallel
    const posts = await Promise.all(
      Array.from(links).slice(0, limit).map(async (link, idx) => {
        const title = postPromises.find(p => p.link === link)?.title || 'No title';
        if (!title || title.length < 10) return null;

        let excerpt = '';
        let imageUrl = '';

        try {
          await delay(600 * (idx + 1)); // Rate limit
          const postRes = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          const post$ = cheerio.load(await postRes.text());

          // Excerpt: First <p> in content
          const p = post$('article p, .entry-content p, .post-content p').first();
          if (p.length) {
            excerpt = p.text().trim();
            if (excerpt.length > 300) excerpt = excerpt.substring(0, 300) + '...';
          }

          // Image: og:image or first img
          const og = post$('meta[property="og:image"]');
          if (og.length && og.attr('content')) {
            imageUrl = og.attr('content');
          } else {
            const img = post$('img').first();
            if (img.length && img.attr('src')) {
              imageUrl = new URL(img.attr('src'), link).href;
            }
          }
        } catch (e) {
          console.error(`Failed to scrape ${link}: ${e.message}`);
        }

        return {
          title,
          image_url: imageUrl,
          link,
          excerpt: excerpt || "No excerpt available"
        };
      })
    );

    const validPosts = posts.filter(p => p !== null);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: true,
        creator: "Chathura hansaka",
        posts: validPosts
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
