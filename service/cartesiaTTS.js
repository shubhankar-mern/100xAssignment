
require('dotenv').config();

const CartesiaModule = require('@cartesia/cartesia-js');
const Cartesia = CartesiaModule.default || CartesiaModule;
const WebSocket = require('ws');

const client = new Cartesia({
  token: process.env.CARTESIA_API_KEY,
});

const SAMPLE_RATE = 44100;

// One TTS queue per user socket, so sentences play in order.
const queues = new Map();

async function synthesizeSentence(socket, text) {
  if (!text || !text.trim()) return;

  let ws;

  try {
    ws = await client.tts.websocket({
      WebSocket,
    });

    ws.on('error', (error) => {
      console.error('Cartesia TTS WebSocket error:', error);
    });

    const ctx = ws.context({
      model_id: 'sonic-latest',
      voice: 'e07c00bc-4134-4eae-9ea4-1a55fb45746b',
      output_format: {
        container: 'raw',
        encoding: 'pcm_f32le',
        sample_rate: SAMPLE_RATE,
      },
      language: 'en',
    });

    console.log('Generating speech:', text);

    await ctx.push({
      transcript: text,
    });

    await ctx.no_more_inputs();

    for await (const event of ctx.receive()) {
      if (event.type === 'chunk' && event.audio) {
        // Send raw PCM audio to this browser.
        socket.emit(
          'tts-audio',
          Buffer.from(event.audio),
          { sampleRate: SAMPLE_RATE }
        );
      } else if (event.type === 'error') {
        console.error(
          'Cartesia TTS error:',
          event.message || event.title
        );
      }
    }

    socket.emit('tts-sentence-end');
  } catch (error) {
    console.error('TTS generation failed:', error);
    socket.emit('tts-error', {
      message: 'Could not generate speech.',
    });
  } finally {
    if (ws) {
      try {
        ws.close();
      } catch (error) {
        console.error('TTS WebSocket cleanup failed:', error);
      }
    }
  }
}

function enqueueSentence(socket, text) {
  const previous = queues.get(socket.id) || Promise.resolve();

  const next = previous
    .catch(() => {})
    .then(() => synthesizeSentence(socket, text));

  queues.set(socket.id, next);

  next.finally(() => {
    if (queues.get(socket.id) === next) {
      queues.delete(socket.id);
    }
  });

  return next;
}

function clearTTSQueue(socketId) {
  queues.delete(socketId);
}

module.exports = {
  enqueueSentence,
  clearTTSQueue,
};
