import { Task, TodoistApi } from "@doist/todoist-api-typescript";
import { render as renderToast } from "roamjs-components/components/Toast";
import deleteBlock from "roamjs-components/writes/deleteBlock";
import getPageUidByPageTitle from "roamjs-components/queries/getPageUidByPageTitle";
import getBasicTreeByParentUid from "roamjs-components/queries/getBasicTreeByParentUid";
import { OnloadArgs } from "roamjs-components/types";

import { CONFIG } from "../../constants";
import { createDescriptionBlock } from "../../utils/create-description-block";
import { createLogger } from "../../utils/create-loagger";
import { createSiblingBlock } from "../../utils/createSiblingBlock";
import { getTodoistToken } from "../../utils/get-todoist-token";

const tagName = getTag();

const logger = createLogger("quick-capture");

export const pullQuickCapture = async ({
  extensionAPI,
  targetUid,
}: {
  extensionAPI: OnloadArgs["extensionAPI"];
  targetUid: string;
}) => {
  try {
    const token = getTodoistToken(extensionAPI);
    const api = new TodoistApi(token);

    console.log("[index.ts:15] tagName: ", tagName);
    const filter = getFilter();
    if (!filter) {
      logger("no filter");
      return;
    }
    const tasks = await api.getTasks({ filter });

    let taskBlockUid: string = targetUid;
    for (const [index, task] of tasks.entries()) {
      taskBlockUid = await createSiblingBlock({
        fromUid: taskBlockUid,
        text: createTaskString(task),
      });
      if (index === 0) {
        await deleteBlock(targetUid);
      }
      // add description
      if (task.description) {
        await createDescriptionBlock({
          description: task.description,
          taskBlockUid,
        });
      }
    }

    await Promise.all(
      tasks.map((task) => {
        return api.closeTask(task.id);
      })
    );
    logger("succeeded");
    renderToast({
      id: "roamist-toast-complete-task",
      content: "Success: quick-capture",
      timeout: 1000,
      intent: "success",
    });
  } catch (e) {
    logger("failed");
    logger(e);
    renderToast({
      id: "roamist-toast-complete-task",
      content: `Failed: quick-capture. Error: ${e}`,
      intent: "warning",
    });
  }
};

function getFilter() {
  const pageUid = getPageUidByPageTitle(CONFIG);
  const config = getBasicTreeByParentUid(pageUid);
  const filter = config
    .find((node) => {
      return node.text === "quick-capture";
    })
    ?.children.find((node) => {
      return node.text === "filter";
    })?.children[0]?.text;
  return filter;
}

function getTag() {
  const pageUid = getPageUidByPageTitle(CONFIG);
  const config = getBasicTreeByParentUid(pageUid);
  const tag = config
    .find((node) => {
      return node.text === "quick-capture";
    })
    ?.children.find((node) => {
      return node.text === "tag";
    })?.children[0]?.text;
  return tag;
}

function createTaskString(task: Task) {
  const date = window.roamAlphaAPI.util.dateToPageTitle(
    new Date(task.created.split("T")[0])
  );

  let taskString = task.content;
  if (date) {
    taskString += ` created_at: [[${date}]]`;
  }
  if (tagName) {
    taskString += ` #[[tagName]]`;
  }
  taskString += ` #[[Quick Capture]]`;
  return taskString;
}
