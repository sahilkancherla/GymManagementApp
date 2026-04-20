import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { APP_NAME } from '@acuo/shared';
import { errorHandler } from './middleware/errors';
import { profileRoutes } from './routes/profiles';
import { gymRoutes } from './routes/gyms';
import { planRoutes } from './routes/plans';
import { programRoutes } from './routes/programs';
import { workoutRoutes } from './routes/workouts';
import { workoutStatRoutes } from './routes/workout-stats';
import { classRoutes } from './routes/classes';
import { classOccurrenceRoutes } from './routes/class-occurrences';
import { classSignupRoutes } from './routes/class-signups';
import { webhookRoutes } from './routes/webhooks';
import { announcementRoutes } from './routes/announcements';

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api', profileRoutes);
app.use('/api', gymRoutes);
app.use('/api', planRoutes);
app.use('/api', programRoutes);
app.use('/api', workoutRoutes);
app.use('/api', workoutStatRoutes);
app.use('/api', classRoutes);
app.use('/api', classOccurrenceRoutes);
app.use('/api', classSignupRoutes);
app.use('/api', webhookRoutes);
app.use('/api', announcementRoutes);

// Error handling
app.use(errorHandler);

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`${APP_NAME} API server running on port ${port}`);
});

export default app;
