
require('dotenv').config();

const CartesiaModule = require('@cartesia/cartesia-js');
const Cartesia = CartesiaModule.default || CartesiaModule;

const client = new Cartesia({
  token: process.env.CARTESIA_API_KEY
});

function createSTTSession(socket, config, onFinalTranscript,onEmptyTranscript) {
  const stt = client.stt.autoFinalize.websocket({
    model: 'ink-2',
    encoding: 'pcm_f32le',
    sample_rate: config.sampleRate
  });

  stt.on('error', (error) => {
    console.error('Cartesia STT error:', error);
    socket.emit('stt-error', {
      message: error.message || 'Cartesia STT error'
    });
  });

  // Consume Cartesia's transcript events asynchronously.
  (async () => {
    try {
      for await (const event of stt.stream()) {
        if (event.type === 'error') {
          console.error('STT stream error:', event.error);
          continue;
        }

        if (event.type !== 'message') continue;

        const message = event.message;

        if (message.type === 'connected') {
          console.log('Cartesia STT connected');
        }

        if (message.type === 'turn.update') {
          console.log('Partial transcript:', message.transcript);

          socket.emit('stt-partial', {
            text: message.transcript
          });
        }

                if (message.type === 'turn.end') {
          const text = (message.transcript || '').trim();

          if (!text) {
            console.log('Empty transcript (no sound)');
            onEmptyTranscript?.();
            continue;
          }

          console.log('Final transcript:', text);

          socket.emit('stt-final', { text });

          if (onFinalTranscript) {
            await onFinalTranscript(text);
          }
        }
      }
    } catch (error) {
      console.error('STT receive loop failed:', error);
    }
  })();

  return stt;
}

module.exports = { createSTTSession };
