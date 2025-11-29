#!/usr/bin/env python3
"""
Load testing script for HTTP endpoints.

This script performs concurrent HTTP requests to a specified URL and measures
response times, success rates, and throughput.

Usage:
    python scripts/loadtest.py <url> [options]

Examples:
    python scripts/loadtest.py http://localhost:5000/health
    python scripts/loadtest.py http://localhost:5000/api/endpoint -n 1000 -c 50
    python scripts/loadtest.py http://localhost:5000/chat -m POST -d '{"message": "test"}'
"""

import argparse
import asyncio
import json
import statistics
import sys
import time
from dataclasses import dataclass, field
from typing import Optional

import aiohttp


@dataclass
class LoadTestResult:
    """Stores the results of a load test run."""

    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    response_times: list[float] = field(default_factory=list)
    status_codes: dict[int, int] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)
    start_time: float = 0.0
    end_time: float = 0.0

    @property
    def duration(self) -> float:
        """Total duration of the test in seconds."""
        return self.end_time - self.start_time

    @property
    def requests_per_second(self) -> float:
        """Average requests per second."""
        return self.total_requests / self.duration if self.duration > 0 else 0

    @property
    def success_rate(self) -> float:
        """Percentage of successful requests."""
        return (self.successful_requests / self.total_requests * 100) if self.total_requests > 0 else 0

    @property
    def avg_response_time(self) -> float:
        """Average response time in milliseconds."""
        return statistics.mean(self.response_times) * 1000 if self.response_times else 0

    @property
    def min_response_time(self) -> float:
        """Minimum response time in milliseconds."""
        return min(self.response_times) * 1000 if self.response_times else 0

    @property
    def max_response_time(self) -> float:
        """Maximum response time in milliseconds."""
        return max(self.response_times) * 1000 if self.response_times else 0

    @property
    def p50_response_time(self) -> float:
        """50th percentile (median) response time in milliseconds."""
        return statistics.median(self.response_times) * 1000 if self.response_times else 0

    @property
    def p95_response_time(self) -> float:
        """95th percentile response time in milliseconds."""
        if not self.response_times:
            return 0
        sorted_times = sorted(self.response_times)
        index = int(len(sorted_times) * 0.95)
        return sorted_times[index] * 1000

    @property
    def p99_response_time(self) -> float:
        """99th percentile response time in milliseconds."""
        if not self.response_times:
            return 0
        sorted_times = sorted(self.response_times)
        index = int(len(sorted_times) * 0.99)
        return sorted_times[index] * 1000


async def make_request(
    session: aiohttp.ClientSession,
    url: str,
    method: str,
    headers: Optional[dict],
    data: Optional[str],
    result: LoadTestResult,
    semaphore: asyncio.Semaphore,
) -> None:
    """Make a single HTTP request and record the result."""
    async with semaphore:
        start_time = time.perf_counter()
        try:
            async with session.request(method, url, headers=headers, data=data) as response:
                await response.read()
                elapsed = time.perf_counter() - start_time
                result.response_times.append(elapsed)
                result.status_codes[response.status] = result.status_codes.get(response.status, 0) + 1
                if 200 <= response.status < 400:
                    result.successful_requests += 1
                else:
                    result.failed_requests += 1
        except Exception as e:
            elapsed = time.perf_counter() - start_time
            result.response_times.append(elapsed)
            result.failed_requests += 1
            result.errors.append(str(e))
        finally:
            result.total_requests += 1


async def run_load_test(
    url: str,
    num_requests: int,
    concurrency: int,
    method: str = "GET",
    headers: Optional[dict] = None,
    data: Optional[str] = None,
    timeout: int = 30,
) -> LoadTestResult:
    """Run the load test with the specified parameters."""
    result = LoadTestResult()
    semaphore = asyncio.Semaphore(concurrency)

    connector = aiohttp.TCPConnector(limit=concurrency, limit_per_host=concurrency)
    timeout_config = aiohttp.ClientTimeout(total=timeout)

    async with aiohttp.ClientSession(connector=connector, timeout=timeout_config) as session:
        result.start_time = time.perf_counter()
        tasks = [
            make_request(session, url, method, headers, data, result, semaphore) for _ in range(num_requests)
        ]
        await asyncio.gather(*tasks)
        result.end_time = time.perf_counter()

    return result


def print_results(result: LoadTestResult, url: str) -> None:
    """Print the load test results in a formatted way."""
    print("\n" + "=" * 60)
    print("LOAD TEST RESULTS")
    print("=" * 60)
    print(f"URL: {url}")
    print("-" * 60)
    print(f"Total Requests:      {result.total_requests}")
    print(f"Successful:          {result.successful_requests}")
    print(f"Failed:              {result.failed_requests}")
    print(f"Success Rate:        {result.success_rate:.2f}%")
    print("-" * 60)
    print(f"Total Duration:      {result.duration:.2f}s")
    print(f"Requests/Second:     {result.requests_per_second:.2f}")
    print("-" * 60)
    print("Response Times:")
    print(f"  Min:               {result.min_response_time:.2f}ms")
    print(f"  Avg:               {result.avg_response_time:.2f}ms")
    print(f"  Max:               {result.max_response_time:.2f}ms")
    print(f"  P50 (Median):      {result.p50_response_time:.2f}ms")
    print(f"  P95:               {result.p95_response_time:.2f}ms")
    print(f"  P99:               {result.p99_response_time:.2f}ms")
    print("-" * 60)
    print("Status Codes:")
    for code, count in sorted(result.status_codes.items()):
        print(f"  {code}: {count}")
    if result.errors:
        print("-" * 60)
        print(f"Unique Errors ({len(set(result.errors))}):")
        for error in set(result.errors):
            print(f"  - {error}")
    print("=" * 60)


def parse_headers(header_strings: Optional[list[str]]) -> Optional[dict]:
    """Parse header strings in 'Key: Value' format into a dictionary."""
    if not header_strings:
        return None
    headers = {}
    for header in header_strings:
        if ":" in header:
            key, value = header.split(":", 1)
            headers[key.strip()] = value.strip()
    return headers


def main() -> int:
    """Main entry point for the load test script."""
    parser = argparse.ArgumentParser(
        description="Load testing script for HTTP endpoints.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s http://localhost:5000/health
  %(prog)s http://localhost:5000/api/endpoint -n 1000 -c 50
  %(prog)s http://localhost:5000/chat -m POST -d '{"message": "test"}'
  %(prog)s http://localhost:5000/api -H "Authorization: Bearer token123"
        """,
    )
    parser.add_argument("url", help="Target URL to test")
    parser.add_argument(
        "-n", "--num-requests", type=int, default=100, help="Total number of requests to make (default: 100)"
    )
    parser.add_argument(
        "-c", "--concurrency", type=int, default=10, help="Number of concurrent requests (default: 10)"
    )
    parser.add_argument("-m", "--method", default="GET", help="HTTP method to use (default: GET)")
    parser.add_argument("-d", "--data", help="Request body data (for POST/PUT requests)")
    parser.add_argument(
        "-H", "--header", action="append", dest="headers", help="HTTP header in 'Key: Value' format (can be repeated)"
    )
    parser.add_argument("-t", "--timeout", type=int, default=30, help="Request timeout in seconds (default: 30)")
    parser.add_argument("--json", action="store_true", help="Output results as JSON")

    args = parser.parse_args()

    headers = parse_headers(args.headers)

    # Add Content-Type header for POST/PUT with data
    if args.data and args.method.upper() in ("POST", "PUT", "PATCH"):
        if headers is None:
            headers = {}
        if "Content-Type" not in headers:
            # Try to detect if data is JSON
            try:
                json.loads(args.data)
                headers["Content-Type"] = "application/json"
            except json.JSONDecodeError:
                headers["Content-Type"] = "application/x-www-form-urlencoded"

    print(f"Starting load test...")
    print(f"URL: {args.url}")
    print(f"Requests: {args.num_requests}, Concurrency: {args.concurrency}")
    print(f"Method: {args.method.upper()}")

    result = asyncio.run(
        run_load_test(
            url=args.url,
            num_requests=args.num_requests,
            concurrency=args.concurrency,
            method=args.method.upper(),
            headers=headers,
            data=args.data,
            timeout=args.timeout,
        )
    )

    if args.json:
        output = {
            "url": args.url,
            "total_requests": result.total_requests,
            "successful_requests": result.successful_requests,
            "failed_requests": result.failed_requests,
            "success_rate": result.success_rate,
            "duration_seconds": result.duration,
            "requests_per_second": result.requests_per_second,
            "response_times_ms": {
                "min": result.min_response_time,
                "avg": result.avg_response_time,
                "max": result.max_response_time,
                "p50": result.p50_response_time,
                "p95": result.p95_response_time,
                "p99": result.p99_response_time,
            },
            "status_codes": result.status_codes,
            "errors": list(set(result.errors)),
        }
        print(json.dumps(output, indent=2))
    else:
        print_results(result, args.url)

    return 0 if result.success_rate == 100 else 1


if __name__ == "__main__":
    sys.exit(main())

