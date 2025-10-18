import dotenv from 'dotenv';
import { Application } from './app.js';

dotenv.config({ path: '.env.local' });

const PORT = 3001;
const app = new Application();

app.start(PORT);