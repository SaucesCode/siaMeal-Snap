/**
 * Client-Side Circuit Breaker Pattern for Mobile AI & Network Resilience.
 * Prevents UI freezes and endless spinning wheels when upstream APIs degrade.
 */

export enum CircuitState {
  CLOSED = 'CLOSED',       // Normal healthy operation
  OPEN = 'OPEN',           // Tripped: Fails fast in 0ms to protect mobile thread
  HALF_OPEN = 'HALF_OPEN', // Canary probe test after cooldown
}

export class CircuitBreaker {
  private failureCount = 0;
  private state: CircuitState = CircuitState.CLOSED;
  private nextAttempt = 0;

  constructor(
    private failureThreshold = 3,
    private cooldownMs = 30000,
    public readonly name = 'DefaultService'
  ) {}

  /**
   * Executes an asynchronous task with circuit breaker protection.
   * If the circuit is open, fails fast in 0ms and executes the fallback.
   */
  public async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T> | T
  ): Promise<T> {
    const now = Date.now();

    // 1. Check if circuit is currently OPEN
    if (this.state === CircuitState.OPEN) {
      if (now >= this.nextAttempt) {
        // Cooldown has elapsed: allow single canary probe
        this.state = CircuitState.HALF_OPEN;
      } else {
        // Circuit is still OPEN: fail fast in 0ms without hitting network
        if (fallback) {
          return await fallback();
        }
        throw new Error(
          `[${this.name}] Service temporarily paused to prevent device hangs. Please try again shortly.`
        );
      }
    }

    // 2. Execute task
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err: any) {
      this.onFailure(err);
      if (fallback) {
        return await fallback();
      }
      throw err;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
    }
  }

  private onFailure(err: any) {
    this.failureCount += 1;

    if (this.failureCount >= this.failureThreshold || this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.cooldownMs;
    }
  }

  public getState(): CircuitState {
    return this.state;
  }

  public reset(): void {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
    this.nextAttempt = 0;
  }
}

// Global AI Circuit Breaker instance
export const aiCircuitBreaker = new CircuitBreaker(3, 30000, 'AICoachVision');
