
const { Server } = require('socket.io');
const { createSTTSession } = require('./../service/cartesiaSTT.js');
const {
  generateResponse,
  clearConversation
} = require('../service/llm.js');
const {
  enqueueSentence,
  clearTTSQueue,
} = require('../service/cartesiaTTS');
const liveConnections = new Map();
const sttSessions = new Map();

function initializeWebSocket(server) {
  const websocketServer = new Server(server, {
    cors: { origin: '*' }
  });

  websocketServer.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    liveConnections.set(socket.id, socket);

    let stt = null;
    let pendingAudio = Buffer.alloc(0);
    let samplesPerChunk = 0;

    socket.on('audio-start', (config) => {
      try {
        if (stt) {
          stt.send({ type: 'close' });
        }

        pendingAudio = Buffer.alloc(0);

       stt = createSTTSession(socket, config, async (text) => {
  console.log('Completed STT utterance:', text);

  await generateResponse(socket, text, (sentence) => {
    enqueueSentence(socket, sentence);
  });
},
          () => {
            socket.emit('stt-empty');
          });
        
        sttSessions.set(socket.id, stt);

        // Buffer approximately 100 ms of audio per STT message.
        samplesPerChunk = Math.floor(config.sampleRate / 10);

        console.log('Starting Cartesia STT:', config);
      } catch (error) {
        console.error('Could not start STT:', error);
        socket.emit('stt-error', {
          message: error.message
        });
      }
    });

    // text input handling

        socket.on('user-text', async ({ text } = {}) => {
      if (!text || !text.trim()) return;

      await generateResponse(socket, text, (sentence) => {
        enqueueSentence(socket, sentence);
      });
    });

    socket.on('audio-chunk', (chunk) => {
      if (!stt) return;

      try {
        const incoming = Buffer.from(chunk);
        pendingAudio = Buffer.concat([pendingAudio, incoming]);

        const bytesPerChunk = samplesPerChunk * 4;

        while (bytesPerChunk > 0 &&
               pendingAudio.length >= bytesPerChunk) {
          const audio = pendingAudio.subarray(0, bytesPerChunk);

          stt.sendRaw(audio);

          pendingAudio = pendingAudio.subarray(bytesPerChunk);
        }
      } catch (error) {
        console.error('Audio forwarding failed:', error);
      }
    });

    socket.on('audio-stop', () => {
      if (!stt) return;

      try {
        // Send any remaining samples before closing.
        if (pendingAudio.length > 0) {
          stt.sendRaw(pendingAudio);
          pendingAudio = Buffer.alloc(0);
        }

        stt.send({ type: 'close' });

        console.log('Stopped Cartesia STT');
      } catch (error) {
        console.error('Error stopping STT:', error);
      }

      stt = null;
      sttSessions.delete(socket.id);
    });
    
    socket.on('stt-final', async ({ text }) => {
    console.log('Completed STT utterance:', text);

    
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);

      if (stt) {
        try {
          stt.send({ type: 'close' });
        } catch (error) {
          console.error('STT cleanup error:', error);
        }
      }

      sttSessions.delete(socket.id);
      liveConnections.delete(socket.id);
       
       clearTTSQueue(socket.id);
        clearConversation(socket.id);
    });
  });

  return websocketServer;
}

module.exports = {
  initializeWebSocket,
  liveConnections,
  sttSessions
};
