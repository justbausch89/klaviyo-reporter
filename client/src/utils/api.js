const BASE = '/api';

async function fetchJSON(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

export async function checkAccount() {
  return fetchJSON(`${BASE}/account`);
}

export async function fetchMetrics(startDate, endDate) {
  return fetchJSON(`${BASE}/metrics?startDate=${startDate}&endDate=${endDate}`);
}

export async function fetchCampaigns(startDate, endDate) {
  return fetchJSON(`${BASE}/campaigns?startDate=${startDate}&endDate=${endDate}`);
}

export async function fetchFlows(startDate, endDate) {
  return fetchJSON(`${BASE}/flows?startDate=${startDate}&endDate=${endDate}`);
}

export async function fetchDeliverability(startDate, endDate) {
  return fetchJSON(`${BASE}/deliverability?startDate=${startDate}&endDate=${endDate}`);
}

export async function fetchSegments() {
  return fetchJSON(`${BASE}/segments`);
}
