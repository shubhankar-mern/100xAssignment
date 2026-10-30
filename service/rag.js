
const { OpenAIEmbeddings } = require('@langchain/openai');
const { MongoDBAtlasVectorSearch } = require('@langchain/mongodb');
const { connectDB } = require('../config/db');

const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-small',
  apiKey: process.env.OPENAI_API_KEY
});

async function getRelevantContext(query) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('A valid question is required');
  }

  const db = await connectDB();
  const collection = db.collection('document_chunks');

  const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
    collection,
    indexName: 'chunks_vector_index',
    textKey: 'text',
    embeddingKey: 'embedding'
  });

  const results = await vectorStore.similaritySearch(query.trim(), 4);

  if (!results.length) {
    return '';
  }

  return results
    .map((doc, index) =>
      `[Context ${index + 1} — ${doc.metadata.fileName || 'Document'}]\n${doc.pageContent}`
    )
    .join('\n\n');
}

module.exports = { getRelevantContext };
