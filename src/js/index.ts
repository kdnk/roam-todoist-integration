import { createConfigObserver } from "roamjs-components";
import { completeTask } from "./features/complete-task";
import { pullTasks } from "./features/pull-tasks";
import { syncCompleted } from "./features/sync-completed";

window.Roamist = window.Roamist || {};

window.Roamist = {
  ...window.RTI,
  ...window.Roamist,
  completeTask,
  pullTasks,
  syncCompleted,
};

window.RTI = {
  completeTask,
  pullTasks,
  syncCompleted,
};

console.log("<<< roamist >>> window.Roamist: ", window.Roamist);

createConfigObserver({
  title: "roam/roamist",
  config: {
    tabs: [
      {
        id: "home",
        fields: [
          {
            type: "text",
            title: "token",
            description:
              "todoist's token. Get in todoist.com/prefs/integrations.",
          },
          {
            type: "text",
            title: "tag",
            description: "tag",
          },
          {
            type: "flag",
            title: "[Not Implemented] show date",
            description: "[Not Implemented] show date",
          },
        ],
      },
      {
        id: "pull-tasks",
        fields: [
          {
            type: "block",
            title: "filters",
            description: "Todoist's filters",
          },
        ],
      },
    ],
  },
});

console.log("<<< roamist >>> setup compoleted.");
