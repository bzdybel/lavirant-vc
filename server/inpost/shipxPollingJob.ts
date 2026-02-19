/**
 * @deprecated This file has been refactored
 * Import from server/jobs/ShipXPollingJob.ts instead
 */

import { ShipXPollingJob } from "../jobs/ShipXPollingJob";

// Create job instance
const shipxPollingJob = new ShipXPollingJob();

/**
 * Starts the ShipX polling job
 * @deprecated Use ShipXPollingJob class instance instead
 */
export function startShipXPollingJob(): void {
  shipxPollingJob.start();
}

// Re-export for backward compatibility
export { ShipXPollingJob } from "../jobs/ShipXPollingJob";
