const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, '..', 'public');
const dataFile = path.join(__dirname, 'profiles.json');

app.use(express.json());
app.use((req, res, next) => {
  if (req.path.startsWith('/public/')) {
    req.url = req.url.replace(/^\/public/, '');
  }
  next();
});
app.use('/public', express.static(publicDir));
app.use(express.static(publicDir));

async function readData() {
  try {
    const raw = await fs.readFile(dataFile, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return { profiles: [] };
    throw err;
  }
}

async function writeData(data) {
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/api/users/:userId/profiles', async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const data = await readData();
    const profiles = (data.profiles || []).filter((profile) => profile.userId === userId);
    return res.json({ profiles });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to load profiles' });
  }
});

app.post('/api/users/:userId/profiles', async (req, res) => {
  const { userId } = req.params;
  const { name, icon, isKids } = req.body;

  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Profile name is required' });

  try {
    const data = await readData();
    const profile = {
      userId,
      profileId: `${Date.now()}`,
      name: name.trim(),
      icon: icon || 'default',
      isKids: !!isKids,
      createdAt: new Date().toISOString(),
    };

    data.profiles = data.profiles || [];
    data.profiles.push(profile);
    await writeData(data);

    return res.status(201).json({ profile });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Failed to save profile' });
  }
});

app.get('*', (req, res) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(publicDir, 'index.html'));
  }
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Cinexa local server running at http://localhost:${PORT}`);
  console.log('Profile API available at http://localhost:%d/api/users/:userId/profiles', PORT);
});
