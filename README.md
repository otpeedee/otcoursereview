# OT Course Review

A static course-review site for browsing Penn courses by department and course type, and searching by course code, title, or instructor.

Run `python3 -m http.server 8000` from the repository root and open `http://localhost:8000`.

`reviews.json` starts empty. To populate an authorized deployment, supply a JSON array of review objects. Use string fields `code`, `title`, `instructor`, `year`, `term`, and `review`, plus a `types` array of strings. Supported types are `Core`, `Technical Elective`, and `SSH Elective`.
