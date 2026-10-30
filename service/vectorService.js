
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { MongoDBAtlasVectorSearch } = require('@langchain/mongodb');
const { connectDB } = require('../config/db');

const embeddings = new OpenAIEmbeddings({
  model: 'text-embedding-3-small',
  apiKey: process.env.OPENAI_API_KEY
});

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 150
});

async function vectorizeAndStore({ text, fileName, sourceType }) {
  if (!text || !text.trim()) {
    throw new Error('Text is required for vectorization');
  }

  const db = await connectDB();
  const collection = db.collection('document_chunks');

  const docs = await splitter.createDocuments(
    [text],
    [{ fileName, sourceType, createdAt: new Date() }]
  );

  const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
    collection,
    indexName: 'chunks_vector_index',
    textKey: 'text',
    embeddingKey: 'embedding'
  });

  await vectorStore.addDocuments(docs);

  return {
    chunksStored: docs.length
  };
}

module.exports = { vectorizeAndStore };
