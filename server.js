import express from 'express';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB limit

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;
const THREAD_ID = process.env.THREAD_ID;
const PORT = process.env.PORT || 4000;

if (!OPENAI_KEY) {
  console.error('Missing OPENAI_API_KEY in environment');
}

app.use(express.json());

app.post('/api/chat', upload.single('image'), async (req, res) => {
  try {
    if (!OPENAI_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY missing on server' });
    if (!ASSISTANT_ID || !THREAD_ID) return res.status(500).json({ error: 'ASSISTANT_ID or THREAD_ID missing on server' });

    const { text } = req.body;
    let fileId = null;

    if (req.file) {
      const form = new FormData();
      // Append buffer as file
      form.append('file', req.file.buffer, {
        filename: req.file.originalname || 'image.jpg',
        contentType: req.file.mimetype || 'application/octet-stream',
      });
      form.append('purpose', 'vision');

      const uploadResp = await fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: Object.assign({ Authorization: `Bearer ${OPENAI_KEY}` }, form.getHeaders()),
        body: form,
      });

      const uploadJson = await uploadResp.json();
      if (!uploadResp.ok) {
        console.error('File upload failed', uploadJson);
        return res.status(uploadResp.status).json({ error: uploadJson });
      }

      fileId = uploadJson.id;
    }

    const content = [];
    if (fileId) content.push({ type: 'image_file', image_file: { file_id: fileId } });
    if (text) content.push({ type: 'text', text });

    if (content.length === 0) return res.status(400).json({ error: 'No text or image provided' });

    // Create message in thread
    const messageResp = await fetch(`https://api.openai.com/v1/beta/threads/${encodeURIComponent(THREAD_ID)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ role: 'user', content }),
    });

    const messageJson = await messageResp.json();
    if (!messageResp.ok) {
      console.error('Create message failed', messageJson);
      return res.status(messageResp.status).json({ error: messageJson });
    }

    // Start run
    const runResp = await fetch(`https://api.openai.com/v1/beta/threads/${encodeURIComponent(THREAD_ID)}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ assistant_id: ASSISTANT_ID }),
    });

    const runJson = await runResp.json();
    if (!runResp.ok) {
      console.error('Start run failed', runJson);
      return res.status(runResp.status).json({ error: runJson });
    }

    // Poll run status
    const runId = runJson.id;
    let finalRun = runJson;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const statusResp = await fetch(`https://api.openai.com/v1/beta/threads/${encodeURIComponent(THREAD_ID)}/runs/${encodeURIComponent(runId)}`, {
          headers: { Authorization: `Bearer ${OPENAI_KEY}` },
        });
        const statusJson = await statusResp.json();
        finalRun = statusJson;
        if (['succeeded', 'completed', 'failed', 'cancelled'].includes(statusJson.status)) break;
      } catch (err) {
        console.warn('Run status poll error', err.message || err);
      }
    }

    // Fetch latest messages in thread
    const threadMessagesResp = await fetch(`https://api.openai.com/v1/beta/threads/${encodeURIComponent(THREAD_ID)}/messages`, {
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    });
    const threadMessagesJson = await threadMessagesResp.json();

    return res.json({ message: messageJson, run: finalRun, threadMessages: threadMessagesJson });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
