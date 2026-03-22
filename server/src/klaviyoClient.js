const axios = require('axios');

const BASE_URL = 'https://a.klaviyo.com/api';
const REVISION = '2024-10-15';

function createClient(apiKey) {
  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      revision: REVISION,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
    // Explicit serializer so bracket-notation keys like page[size] are never
    // percent-encoded to page%5Bsize%5D, which Klaviyo would reject.
    paramsSerializer: function serializeParams(params) {
      return Object.entries(params)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join('&');
    },
  });

  // Retry logic for rate limits
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const { config, response } = error;
      if (!config || config._retryCount >= 3) return Promise.reject(error);

      if (response && response.status === 429) {
        config._retryCount = (config._retryCount || 0) + 1;
        const delay = Math.pow(2, config._retryCount) * 1000;
        await new Promise((res) => setTimeout(res, delay));
        return client(config);
      }
      return Promise.reject(error);
    }
  );

  return client;
}

async function paginateAll(client, url, params = {}) {
  const results = [];
  let nextUrl = url;
  let queryParams = { ...params };

  while (nextUrl) {
    const response = await client.get(nextUrl, { params: queryParams });
    const data = response.data;

    if (Array.isArray(data.data)) {
      results.push(...data.data);
    }

    const nextCursor = data.links?.next;
    if (nextCursor) {
      // next link is a full URL, use it directly
      nextUrl = nextCursor.replace(BASE_URL, '');
      queryParams = {};
    } else {
      nextUrl = null;
    }
  }

  return results;
}

module.exports = { createClient, paginateAll };
