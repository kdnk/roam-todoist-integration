import {
  createBlock,
  createConfigObserver,
  createTagRegex,
  deleteBlock,
  getBlockUidByTextOnPage,
  getPageUidByPageTitle,
  getShallowTreeByParentUid,
} from "roamjs-components";

import { completeTask } from "./features/complete-task";
import { pullTasks } from "./features/pull-tasks";
import { getPullTasksConfig } from "./features/pull-tasks/get-pull-tasks-config";
import { pullQuickCapture } from "./features/quick-capture";
import { syncCompleted } from "./features/sync-completed";

import "../css/priority.css";
import "../css/complete-task-button.css";

window.Roamist = window.Roamist || {};

window.Roamist = {
  ...window.RTI,
  ...window.Roamist,
  completeTask,
  pullTasks,
  syncCompleted,
  pullQuickCapture,
};

window.RTI = {
  completeTask,
  pullTasks,
  syncCompleted,
  pullQuickCapture,
};

console.log(
  "<<<<<<<<<<<<<<<<<<<<< roamist >>>>>>>>>>>>>>>>>>>>> window.Roamist: ",
  window.Roamist
);

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
            type: "flag",
            title: "Hide priority",
            description: "Hide priority like #priority/p1 in block",
          },
          {
            type: "block",
            title: "filters",
            description: "Todoist's filters",
          },
        ],
      },
      {
        id: "quick-capture",
        fields: [
          {
            type: "text",
            title: "filter",
            description: "Todoist's filter",
          },
          {
            type: "text",
            title: "tag",
            description: "Tag for Quick Capture",
          },
        ],
      },
    ],
  },
});

export const getExistingWorkflows: () => { name: string; uid: string }[] = () =>
  window.roamAlphaAPI
    .q(
      `[:find ?s ?u :where [?r :block/uid ?u] [?r :block/string ?s] [?r :block/refs ?p] (or [?p :node/title "SmartBlock"] [?p :node/title "42SmartBlock"])]`
    )
    .map(([text, uid]: string[]) => ({
      uid,
      name: text
        .replace(createTagRegex("SmartBlock"), "")
        .replace(createTagRegex("42SmartBlock"), "")
        .trim(),
    }));

type RoamistWorkflow = { title: string; contents: string[] };
const createRoamistWorkflows = () => {
  const completeTaskWorkflows: RoamistWorkflow[] = [
    {
      title: "Roamist - complete task",
      contents: [
        "<%JAVASCRIPTASYNC:```javascript (async function () { await window.Roamist.completeTask(); })(); ```%>",
      ],
    },
  ];
  const completeTaskFromButtonWorkflows: RoamistWorkflow[] = [
    {
      title: "Roamist - complete task button",
      // https://roamresearch.com/#/app/Roam-En-Francais/page/LI60Siwa_
      contents: [
        "<%IFTRUE:<%HAS:tUid%>!=true%><%TRIGGERREF:tUid,false%><%NOBLOCKOUTPUT%>",
        "<%JAVASCRIPTASYNC:```javascript (async function () { await window.Roamist.completeTask(tUid); })(); ```%><%NOBLOCKOUTPUT%>",
      ],
    },
  ];
  const syncCompletedWorkflows: RoamistWorkflow[] = [
    {
      title: "Roamist - sync completed",
      contents: [
        "<%JAVASCRIPTASYNC:```javascript (async function () { await window.Roamist.syncCompleted(); })(); ```%><%NOBLOCKOUTPUT%>",
      ],
    },
  ];
  const pullQuickCaptureWorkflows: RoamistWorkflow[] = [
    {
      title: "Roamist - quick capture",
      contents: [
        "<%JAVASCRIPTASYNC:```javascript (async function () { await window.Roamist.pullQuickCapture(); })(); ```%>",
      ],
    },
  ];

  const getJs = (args: {
    onlyDiff: "true" | "false";
    todoistFilter: string;
  }) => {
    return `<%JAVASCRIPTASYNC:\`\`\`javascript (async function () { await window.Roamist.pullTasks({ todoistFilter: "${args.todoistFilter}", onlyDiff: ${args.onlyDiff} }); })(); \`\`\`%>`;
  };
  const getTitle = (name: string, diff: boolean) =>
    `Roamist - pull ${name}${diff ? " (only diff)" : ""}`;
  const configs = getPullTasksConfig("filters");
  const pullTasksWorkflows: { title: string; contents: string[] }[] =
    configs.flatMap((config) => {
      return [
        {
          title: getTitle(config.name, false),
          contents: [
            getJs({ onlyDiff: "false", todoistFilter: config.filter }),
          ],
        },
        {
          title: getTitle(config.name, true),
          contents: [getJs({ onlyDiff: "true", todoistFilter: config.filter })],
        },
      ];
    });
  return [
    ...completeTaskWorkflows,
    ...completeTaskFromButtonWorkflows,
    ...syncCompletedWorkflows,
    ...pullTasksWorkflows,
    ...pullQuickCaptureWorkflows,
  ];
};

const WORKFLOW_SECTION_NAME = "workflows";
const roamistWorkflows = createRoamistWorkflows();
const existingWorkflows = getExistingWorkflows();
const installWorkflow = async () => {
  let configWorkflowUid = getBlockUidByTextOnPage({
    text: WORKFLOW_SECTION_NAME,
    title: "roam/roamist",
  });
  if (!configWorkflowUid) {
    const pageUid = getPageUidByPageTitle("roam/roamist");
    configWorkflowUid = await createBlock({
      node: {
        text: WORKFLOW_SECTION_NAME,
      },
      parentUid: pageUid,
    });
  }

  for (const workflow of roamistWorkflows) {
    let workflowTitleUid = existingWorkflows.find((wf) => {
      return wf.name === workflow.title;
    })?.uid;
    if (!workflowTitleUid) {
      workflowTitleUid = await createBlock({
        node: {
          text: `#SmartBlock ${workflow.title}`,
        },
        parentUid: configWorkflowUid,
      });
    }
    await Promise.all(
      getShallowTreeByParentUid(workflowTitleUid).map(({ uid: childUid }) => {
        return deleteBlock(childUid);
      })
    );
    for (const [index, content] of workflow.contents.entries()) {
      await createBlock({
        parentUid: workflowTitleUid,
        node: {
          text: content,
        },
        order: index,
      });
    }
  }

  console.log(
    "<<<<<<<<<<<<<<<<<<<<< roamist >>>>>>>>>>>>>>>>>>>>> setup finished."
  );
};

installWorkflow();
