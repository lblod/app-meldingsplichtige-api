# Explanation

The automatic submission flow consists of multiple services transforming a piece of information or file. It starts with the automatic-submission service that creates a Job with one subtask for its own processing. When that task is finished, the delta-notifier will notice the download-url-service to start downloading some remote data object. While that is processing and finishing, the delta-notifier will notice the automatic-submission-service again to create and manage a download task. After the download is complete, the job-controller service can be used for the rest of the submission flow.

We have to do it this way for now, because the download-url-service cannot be easily adapted to adopt the new Job and Task model. Another service will have to jump in and take care of that instead. We chose to do that in the automatic-submission-service.

The following is a configuration snippet that is left out, exactly to make sure the automatic-submission-service can do its job to manage the download task as well:

```json
{
  "currentOperation": null,
  "nextOperation": "http://lblod.data.gift/id/jobs/concept/TaskOperation/register",
  "nextIndex": "0"
},
{
  "currentOperation": "http://lblod.data.gift/id/jobs/concept/TaskOperation/register",
  "nextOperation": "http://lblod.data.gift/id/jobs/concept/TaskOperation/download",
  "nextIndex": "1"
},
```
