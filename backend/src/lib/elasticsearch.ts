import { Client } from "@elastic/elasticsearch";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

export const esClient = new Client({ node: config.elasticsearch.url });

export async function pingElasticsearch(): Promise<void> {
  try {
    const info = await esClient.info();
    logger.info(
      `Elasticsearch connected — cluster: ${info.cluster_name}, version: ${info.version.number}`,
    );
  } catch (err) {
    logger.error("Elasticsearch connection failed", { err });
    throw err;
  }
}
