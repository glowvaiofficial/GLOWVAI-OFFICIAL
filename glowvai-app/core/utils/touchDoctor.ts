/**
 * Terminal Touch & Action Doctor for GlowVAI V2
 * 
 * Provides real-time, high-visibility terminal logs for every single
 * phone touch, tap event, screen mount, and button interaction.
 */

export interface TouchEventDetails {
  screen?: string;
  component?: string;
  coords?: { x: number; y: number };
  extra?: Record<string, any>;
}

let touchCounter = 0;

/**
 * Logs every single touch/click event to terminal console in real-time
 */
export const logTouch = (actionName: string, details?: TouchEventDetails) => {
  touchCounter++;
  const timestamp = new Date().toLocaleTimeString();
  const screenInfo = details?.screen ? `[Screen: ${details.screen}]` : '';
  const componentInfo = details?.component ? `[Component: ${details.component}]` : '';
  const extraInfo = details?.extra ? ` | ${JSON.stringify(details.extra)}` : '';

  console.log(
    `\x1b[36m[TOUCH DOCTOR #${touchCounter}]\x1b[0m 👆 \x1b[32mTOUCH REGISTERED\x1b[0m ➔ "\x1b[1m${actionName}\x1b[0m" ${screenInfo} ${componentInfo} at ${timestamp}${extraInfo}`
  );
};

/**
 * Logs screen mount events to monitor route changes and startup state
 */
export const logScreenMount = (screenName: string, params?: Record<string, any>) => {
  const timestamp = new Date().toLocaleTimeString();
  const paramsInfo = params ? ` | Params: ${JSON.stringify(params)}` : '';

  console.log(
    `\x1b[35m[SCREEN DOCTOR]\x1b[0m 📺 \x1b[33mSCREEN MOUNTED\x1b[0m ➔ "\x1b[1m${screenName}\x1b[0m" at ${timestamp}${paramsInfo}`
  );
};

/**
 * Measure touch-to-navigation response latency
 */
export const measureTouchLatency = (actionName: string, startTimeMs: number) => {
  const duration = Date.now() - startTimeMs;
  const color = duration < 100 ? '\x1b[32m' : duration < 300 ? '\x1b[33m' : '\x1b[31m';
  console.log(
    `\x1b[36m[LATENCY DOCTOR]\x1b[0m ⚡ Action "\x1b[1m${actionName}\x1b[0m" responded in ${color}${duration}ms\x1b[0m`
  );
};

export default {
  logTouch,
  logScreenMount,
  measureTouchLatency,
};
