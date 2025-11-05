const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event) => {
  const limit = parseInt(event.queryStringParameters?.limit) || 5;
  const baseUrl = 'https://mrboost.lk/blog';

  try {
    // Fetch blog page
    const response = await fetch(baseUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);
    const posts = [];

    // Find post titles with links (h2/h3 with <a>)
    $('h2, h3').each((i, el) => {
      if (posts.length >= limit) return;

      const a = $(el).find('a');
      if (!a.length) return;

      const title = a.text().trim();
      if (!title || title.length < 10) return;

      const relativeLink = a.attr('href') || '';
      const link = new URL(relativeLink, baseUrl).href;

      // Excerpt: next <p> after title
      let excerpt = '';
      const nextP = $(el).next('p');
      if (nextP.length) {
        excerpt = nextP.text().trim().substring(0, 300) + (nextP.text().length > 300 ? '...' : '');
      }

      // Image: Visit post for og:image
      let imageUrl = '';
      // For demo, simulate (in real, async fetch post page)
      // Actual implementation would fetch each link and extract og:image

      posts.push({
        title,
        image_url: imageUrl,
        link,
        excerpt
      });
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        status: true,
        creator: "Chathura hansaka",
        posts
      }, null, 2)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: false,
        creator: "Chathura hansaka",
        error: error.message,
        posts: []
      }, null, 2)
    };
  }
};
