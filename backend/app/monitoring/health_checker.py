import time

import httpx


async def check_service_health(
    url: str,
):
    start_time = time.perf_counter()

    try:
        async with httpx.AsyncClient(
            timeout=10,
        ) as client:

            response = await client.get(url)

            response_time = (
                time.perf_counter() - start_time
            ) * 1000

            return {
                "success": response.is_success,
                "status_code": response.status_code,
                "response_time": round(
                    response_time,
                    2,
                ),
            }

    except Exception:
        response_time = (
            time.perf_counter() - start_time
        ) * 1000

        return {
            "success": False,
            "status_code": 0,
            "response_time": round(
                response_time,
                2,
            ),
        }
