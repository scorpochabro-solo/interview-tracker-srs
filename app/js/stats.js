import { STATUSES } from './constants.js';
import { interviewStart, isTaskOverdue } from './model.js';

export function percent(part, total) {
  return total === 0 ? null : Math.round((part / total) * 100);
}

const everHad = (app, status) => app.history.some((entry) => entry.status === status);

export function summarize(state, now = new Date()) {
  const apps = state.applications;
  const withInterviews = new Set(state.interviews.map((item) => item.applicationId));

  const reachedInterview = apps.filter((app) => withInterviews.has(app.id) || everHad(app, 'interview'));
  const reachedOffer = apps.filter((app) => everHad(app, 'offer'));

  return {
    total: apps.length,
    byStatus: Object.fromEntries(
      STATUSES.map((status) => [status.id, apps.filter((app) => app.status === status.id).length]),
    ),
    interviewRate: percent(reachedInterview.length, apps.length),
    offerRate: percent(reachedOffer.length, apps.length),
    upcomingInterviews: state.interviews.filter((item) => interviewStart(item) >= now).length,
    overdueTasks: state.tasks.filter((task) => isTaskOverdue(task, now)).length,
  };
}
