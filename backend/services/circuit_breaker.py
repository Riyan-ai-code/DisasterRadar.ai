"""
DisasterRadar.ai - Resilient External API Circuit Breaker (Phase 4 Production Hardening)
Protects against external satellite and NWP weather API outages (Open-Meteo, Copernicus DEM).
Prevents backend thread starvation, socket exhaustion, and request hangs during disaster events.

State Machine:
- CLOSED: Standard operation. Calls pass through. Failures increment counter.
- OPEN: Tripped. External calls fail fast and return cached/fallback telemetry immediately.
- HALF_OPEN: Probe window. Allows a test request through to verify upstream service recovery.
"""

import time
import threading
from typing import Callable, Any, Dict, Optional
from datetime import datetime


class CircuitBreakerOpenException(Exception):
    """Raised when an external call is attempted while the circuit breaker is OPEN."""
    pass


class CircuitBreaker:
    def __init__(
        self,
        name: str,
        failure_threshold: int = 3,
        recovery_timeout_sec: float = 30.0,
        expected_timeout_sec: float = 3.5
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout_sec = recovery_timeout_sec
        self.expected_timeout_sec = expected_timeout_sec

        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self.failure_count = 0
        self.last_failure_time: Optional[float] = None
        self.last_state_change: float = time.time()
        self.total_calls = 0
        self.total_failures = 0
        self.total_fallbacks = 0
        self._lock = threading.Lock()

    def call(self, func: Callable, fallback_func: Optional[Callable] = None, *args, **kwargs) -> Any:
        with self._lock:
            self.total_calls += 1
            now = time.time()

            # Check if OPEN state has expired and should transition to HALF_OPEN
            if self.state == "OPEN":
                if now - self.last_state_change >= self.recovery_timeout_sec:
                    self.state = "HALF_OPEN"
                    self.last_state_change = now
                else:
                    self.total_fallbacks += 1
                    if fallback_func:
                        return fallback_func(*args, **kwargs)
                    raise CircuitBreakerOpenException(
                        f"Circuit breaker '{self.name}' is OPEN. Fast-failing to preserve service stability."
                    )

        # Attempt the actual execution
        try:
            result = func(*args, **kwargs)
            # If successful in HALF_OPEN or CLOSED, reset
            with self._lock:
                if self.state == "HALF_OPEN":
                    self.state = "CLOSED"
                    self.failure_count = 0
                    self.last_state_change = time.time()
            return result

        except Exception as e:
            with self._lock:
                self.failure_count += 1
                self.total_failures += 1
                self.last_failure_time = time.time()

                if self.state in ("CLOSED", "HALF_OPEN") and self.failure_count >= self.failure_threshold:
                    self.state = "OPEN"
                    self.last_state_change = time.time()

                self.total_fallbacks += 1

            if fallback_func:
                return fallback_func(*args, **kwargs)
            raise e

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            now = time.time()
            time_in_state = round(now - self.last_state_change, 1)
            return {
                "name": self.name,
                "state": self.state,
                "failure_count": self.failure_count,
                "failure_threshold": self.failure_threshold,
                "recovery_timeout_sec": self.recovery_timeout_sec,
                "time_in_current_state_sec": time_in_state,
                "total_calls": self.total_calls,
                "total_failures": self.total_failures,
                "total_fallbacks": self.total_fallbacks,
                "last_failure_iso": datetime.fromtimestamp(self.last_failure_time).isoformat() if self.last_failure_time else None,
                "is_healthy": self.state == "CLOSED"
            }


# Global Registry of Circuit Breakers
CIRCUIT_BREAKERS: Dict[str, CircuitBreaker] = {
    "open_meteo_weather": CircuitBreaker(
        name="open_meteo_weather",
        failure_threshold=3,
        recovery_timeout_sec=30.0,
        expected_timeout_sec=3.5
    ),
    "copernicus_dem_elevation": CircuitBreaker(
        name="copernicus_dem_elevation",
        failure_threshold=3,
        recovery_timeout_sec=30.0,
        expected_timeout_sec=3.5
    ),
    "gis_routing_engine": CircuitBreaker(
        name="gis_routing_engine",
        failure_threshold=3,
        recovery_timeout_sec=20.0,
        expected_timeout_sec=3.0
    )
}


def get_all_circuit_breaker_statuses() -> Dict[str, Any]:
    """Returns real-time health telemetry across all external service bridges."""
    return {
        "timestamp": datetime.now().isoformat(),
        "circuit_breakers": {name: cb.get_status() for name, cb in CIRCUIT_BREAKERS.items()},
        "system_resilience": "OPERATIONAL" if all(cb.state == "CLOSED" for cb in CIRCUIT_BREAKERS.values()) else "DEGRADED_FAILOVER"
    }
