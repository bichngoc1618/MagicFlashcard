import axios from 'axios';

async function run() {
  try {
    const res = await axios.post('http://localhost:3000/api/study/sync', {
      userId: 1,
      sessionId: 18
    });
    console.log('Response:', res.data);
  } catch (err) {
    console.error('Request failed:', err.response ? err.response.data : err.message);
  }
}

run();
