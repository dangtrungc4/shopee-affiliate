import axios from 'axios';

/**
 * Resolve Shopee short link (s.shopee.vn) to long URL
 */
async function resolveShopeeUrl(url) {
  try {
    if (url.includes("s.shopee.vn")) {
      const res = await axios.get(url, {
        maxRedirects: 0,
        validateStatus: status => status >= 300 && status < 400,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      return res.headers.location;
    }
    return url;
  } catch (err) {
    if (err.response && err.response.headers && err.response.headers.location) {
      return err.response.headers.location;
    }
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    return res.request.res.responseUrl || url;
  }
}

/**
 * Extract shop_id and product_id from long URL
 */
function extractIds(url) {
  const patterns = [
    /i\.(\d+)\.(\d+)/,
    /product\/(\d+)\/(\d+)/,
    /\/(\d+)\/(\d+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        shopid: match[1],
        itemid: match[2]
      };
    }
  }

  return { shopid: null, itemid: null };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Missing URL' });
  }

  try {
    const resolvedUrl = await resolveShopeeUrl(url);
    const { shopid, itemid } = extractIds(resolvedUrl);

    if (!shopid || !itemid) {
      return res.status(404).json({ error: 'Could not extract IDs from resolved URL' });
    }

    res.status(200).json({
      shopid,
      itemid,
      resolvedUrl
    });
  } catch (error) {
    console.error('Conversion error:', error.message);
    res.status(500).json({ error: 'Failed to resolve URL' });
  }
}
