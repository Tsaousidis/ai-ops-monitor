import asyncio
import json

from google import genai

from app.core.settings import settings
from app.db.models import Incident


def _fallback_insight(incident: Incident) -> dict[str, str]:
    return {
        "summary": (
            f"{incident.title}. Severity is {incident.severity} "
            f"and the incident is currently {incident.status}."
        ),
        "root_cause": (
            "Gemini is not configured yet. Review the affected service, "
            "recent response-time metrics, health-check failures, and "
            "deployment activity to isolate the most likely cause."
        ),
    }


def _build_prompt(incident: Incident) -> str:
    service_name = (
        incident.service.name
        if incident.service
        else f"service #{incident.service_id}"
    )

    return f"""
You are an AI operations analyst.
Analyze this production incident and return JSON only.

Incident:
- Service: {service_name}
- Severity: {incident.severity}
- Status: {incident.status}
- Title: {incident.title}
- Description: {incident.description}

JSON shape:
{{
  "summary": "one concise operational summary",
  "root_cause": "most likely root-cause hint with next diagnostic step"
}}
""".strip()


def _parse_json_response(text: str) -> dict[str, str]:
    cleaned_text = (
        text.strip()
        .removeprefix("```json")
        .removeprefix("```")
        .removesuffix("```")
        .strip()
    )
    parsed = json.loads(cleaned_text)

    return {
        "summary": str(parsed["summary"]),
        "root_cause": str(parsed["root_cause"]),
    }


def _generate_with_gemini(incident: Incident) -> dict[str, str]:
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=_build_prompt(incident),
    )

    if not response.text:
        return _fallback_insight(incident)

    return _parse_json_response(response.text)


async def generate_incident_insight(
    incident: Incident,
) -> dict[str, str]:
    if not settings.GEMINI_API_KEY:
        return _fallback_insight(incident)

    try:
        return await asyncio.to_thread(
            _generate_with_gemini,
            incident,
        )
    except Exception:
        return _fallback_insight(incident)
