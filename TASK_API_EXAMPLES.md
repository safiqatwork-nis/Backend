# Task API test examples

Use the JWT returned by `/api/auth/register` or `/api/auth/login`.

Header for every task request:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

## GET /api/tasks

```bash
curl -H "Authorization: Bearer <token>" http://localhost:5001/api/tasks
```

## POST /api/tasks

```json
{
  "localId": "local-001",
  "title": "Follow up with vendor",
  "description": "Confirm updated quote",
  "dueDate": "2026-06-05T00:00:00.000",
  "dueHour": 15,
  "dueMinute": 30,
  "priority": "High",
  "category": "Follow-ups",
  "tags": ["vendor"],
  "reminders": ["15 min before"],
  "completed": false,
  "repeatType": "None",
  "snoozedUntil": null,
  "activityLogs": ["Task created"],
  "subtasks": [{ "title": "Send WhatsApp", "completed": false }]
}
```

## PUT /api/tasks/:id

`:id` can be Mongo `_id` or Flutter `localId`.

```json
{
  "localId": "local-001",
  "title": "Follow up with vendor",
  "description": "Confirm final quote",
  "dueDate": "2026-06-05T00:00:00.000",
  "dueHour": 16,
  "dueMinute": 0,
  "priority": "Critical",
  "category": "Follow-ups",
  "tags": ["vendor", "quote"],
  "reminders": ["30 min before"],
  "completed": false,
  "repeatType": "Weekly",
  "snoozedUntil": null,
  "activityLogs": ["Task edited"],
  "subtasks": [{ "title": "Send WhatsApp", "completed": true }]
}
```

## DELETE /api/tasks/:id

```bash
curl -X DELETE -H "Authorization: Bearer <token>" http://localhost:5001/api/tasks/local-001
```

## POST /api/tasks/sync

Upserts each task by `localId`; it does not delete all remote tasks.

```json
{
  "tasks": [
    {
      "id": "local-001",
      "localId": "local-001",
      "title": "Follow up with vendor",
      "description": "Confirm final quote",
      "dueDate": "2026-06-05T00:00:00.000",
      "dueHour": 16,
      "dueMinute": 0,
      "priority": "Critical",
      "category": "Follow-ups",
      "tags": ["vendor", "quote"],
      "reminders": ["30 min before"],
      "completed": true,
      "repeatType": "Weekly",
      "snoozedUntil": null,
      "activityLogs": ["Task completed"],
      "subtasks": [{ "title": "Send WhatsApp", "completed": true }]
    }
  ]
}
```

## PATCH /api/tasks/:id/complete

```json
{
  "completed": true,
  "activityLogs": ["Task completed"]
}
```

## PATCH /api/tasks/:id/subtasks/:subtaskIndex

```json
{
  "title": "Send WhatsApp",
  "completed": true,
  "activityLogs": ["Subtask updated"]
}
```

## PATCH /api/tasks/:id/snooze

```json
{
  "snoozedUntil": "2026-06-05T16:30:00.000",
  "activityLogs": ["Reminder snoozed"]
}
```
