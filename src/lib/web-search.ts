// Web search helper - wraps coze-coding-dev-sdk SearchClient
import { SearchClient, Config } from "coze-coding-dev-sdk";

let cachedClient: SearchClient | null = null;

function getClient(): SearchClient {
  if (cachedClient) return cachedClient;
  const config = new Config();
  cachedClient = new SearchClient(config);
  return cachedClient;
}

export interface WebItem {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  date?: string;
}

export interface WebSearchResult {
  items: WebItem[];
  summary?: string;
}

export async function webSearch(
  query: string,
  count = 5,
): Promise<WebSearchResult> {
  const client = getClient();
  const response = await client.webSearch(query, count);
  const items: WebItem[] = [];
  if (response.web_items) {
    for (const item of response.web_items) {
      items.push({
        title: item.title ?? "",
        url: item.url ?? "",
        snippet: item.snippet ?? "",
        source: (item as { source?: string }).source,
        date: (item as { date?: string }).date,
      });
    }
  }
  return {
    items,
    summary: (response as { summary?: string }).summary,
  };
}
