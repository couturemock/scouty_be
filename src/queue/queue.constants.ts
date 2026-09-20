/** Queue names — shared between the web process (producer) and the worker (consumer). */
export const INGESTION_QUEUE = 'ingestion';
export const WAITLIST_QUEUE = 'waitlist';

export const INGESTION_JOB = 'run-ingestion';
export const WAITLIST_EXPIRE_JOB = 'expire-invites';

/** Fixed id so `queue.add(..., {repeat})` is idempotent across restarts/processes. */
export const WEEKLY_INGESTION_REPEAT_ID = 'weekly-ingestion-repeat';
export const WAITLIST_EXPIRE_REPEAT_ID = 'waitlist-expire-repeat';
