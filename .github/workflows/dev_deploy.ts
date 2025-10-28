#!/usr/bin/env -S node --no-warnings

import YAML from "yaml";
import { workflow } from "@jlarky/gha-ts/workflow-types";
import { checkout } from "@jlarky/gha-ts/actions";
import { generateWorkflow } from "@jlarky/gha-ts/cli";

const imageNameFrontend = "ghcr.io/phone-link-org/phone-link/frontend"
const imageNameBackend = "ghcr.io/phone-link-org/phone-link/backend"
const wf = workflow({
  name: "Deploy backend and frontend",
  on: {
    push: { branches: ["develop"]},
  },

  jobs: {
    deployBackAndFront: {
      "runs-on": "ubuntu-latest",
      steps: [
        checkout({ "fetch-depth": 0}),
        { name: "Set up QEMU", uses: "docker/setup-qemu-action@v3" },
        { name: "Set up Buildx", uses: "docker/setup-buildx-action@v3" },
        { 
          name: "Login to ghcr",
          uses: "docker/login-action@v3",
          with: { 
            "registry": "ghcr.io",
            "username": "${{ github.actor }}",
            "password": "${{ secrets.GH_PAT }}",
          },
        },
        // 동적 태그 생성을 위한 메타데이터 스텝
        {
          name: "Extract Docker metadata for frontend",
          id: "meta",
          uses: "docker/metadata-action@v5",
          with: {
            "images": imageNameFrontend,
            // YAML에서 멀티라인 문자열(|)이 되도록 .join('\n') 사용
            "tags": [
              "type=raw,value=latest,enable={{is_default_branch}}",
              "type=sha,prefix=",
              "type=raw,value=1.0.${{ github.run_number }}"
            ].join("\n"),
          },
        },
        { 
          name: "Build and Push", 
          uses: "docker/build-push-action@v5",
          with: { 
            "context": ".",
            "file": "./frontend/Dockerfile",
            "push": true,
            "platforms": "linux/amd64, linux/arm64",
            // 'meta' 스텝의 출력을 사용
            "tags": "${{ steps.meta.outputs.tags }}",
            "labels": "${{ steps.meta.outputs.labels }}",
            "cache-from": "type=gha",
            "cache-to": "type=gha,mode=max",
          },
        },
        {
          name: "Extract Docker metadata for backend",
          id: "meta",
          uses: "docker/metadata-action@v5",
          with: {
            "images": imageNameBackend,
            // YAML에서 멀티라인 문자열(|)이 되도록 .join('\n') 사용
            "tags": [
              "type=raw,value=latest,enable={{is_default_branch}}",
              "type=sha,prefix=",
              "type=raw,value=1.0.${{ github.run_number }}"
            ].join("\n"),
          },
        },
        { 
          name: "Build and Push", 
          uses: "docker/build-push-action@v5",
          with: { 
            "context": ".",
            "file": "./backend/Dockerfile",
            "push": true,
            "platforms": "linux/amd64, linux/arm64",
            // 'meta' 스텝의 출력을 사용
            "tags": "${{ steps.meta.outputs.tags }}",
            "labels": "${{ steps.meta.outputs.labels }}",
            "cache-from": "type=gha",
            "cache-to": "type=gha,mode=max",
          },
        },
      ],
    },
  },
});

await generateWorkflow(wf, YAML.stringify, import.meta.url);
