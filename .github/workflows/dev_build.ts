#!/usr/bin/env -S node --no-warnings

import YAML from "yaml";
import { workflow } from "@jlarky/gha-ts/workflow-types";
import { checkout, setupNode } from "@jlarky/gha-ts/actions";
import { generateWorkflow } from "@jlarky/gha-ts/cli";

const wf = workflow({
  name: "Build backend and frontend",
  on: {
    push: { branches: ["develop"]},
  },

  jobs: {
    buildBackAndFront: {
      "runs-on": "ubuntu-latest",
      steps: [
        checkout({"fetch-depth": 0}),
        setupNode({"node-version": "24"}),
        { name: "Install frontend dependencies", run: "cd frontend && npm install" },
        { name: "Build Web", run: "cd frontend && npm run build" },
        { name: "Install frontend dependencies", run: "cd backend && npm install" },
        { name: "Build Web", run: "cd backend && npm run build" },
      ],
    },
  },
});

await generateWorkflow(wf, YAML.stringify, import.meta.url);
